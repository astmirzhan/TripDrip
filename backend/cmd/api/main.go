package main

import (
	"context"
	"errors"
	"flag"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/tripdrip/backend/internal/config"
	"github.com/tripdrip/backend/internal/db"
	"github.com/tripdrip/backend/internal/db/sqlc"
	"github.com/tripdrip/backend/internal/domain"
	"github.com/tripdrip/backend/internal/seed"
	"github.com/tripdrip/backend/internal/service"
	httptransport "github.com/tripdrip/backend/internal/transport/http"
)

func main() {
	seedOnly := flag.Bool("seed-only", false, "Run migrations and seed demo data, then exit")
	flag.Parse()

	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo}))
	slog.SetDefault(logger)

	cfg, err := config.Load()
	if err != nil {
		slog.Error("configuration load failed", "err", err)
		os.Exit(1)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	pool, err := pgxpool.New(ctx, cfg.DatabaseURL)
	if err != nil {
		cancel()
		slog.Error("postgres connection failed", "err", err)
		os.Exit(1)
	}
	if err := pool.Ping(ctx); err != nil {
		cancel()
		slog.Error("postgres ping failed", "err", err)
		os.Exit(1)
	}
	defer pool.Close()

	if cfg.AutoMigrate || *seedOnly {
		if err := db.RunMigrations(ctx, pool); err != nil {
			cancel()
			slog.Error("migrations failed", "err", err)
			os.Exit(1)
		}
		slog.Info("migrations applied")
	}

	if cfg.RunSeed || *seedOnly {
		if err := seed.Run(ctx, pool); err != nil {
			cancel()
			slog.Error("seeding failed", "err", err)
			os.Exit(1)
		}
		if err := seed.EnsureDemoPeople(ctx, pool); err != nil {
			cancel()
			slog.Error("demo people seeding failed", "err", err)
			os.Exit(1)
		}
	}
	cancel()

	if *seedOnly {
		slog.Info("seed-only mode completed")
		return
	}

	queries := sqlc.New(pool)
	tokens := domain.NewTokenManager(cfg.JWTSecret, cfg.JWTAccessTTL, cfg.JWTRefreshTTL)

	authSvc := service.NewAuthService(pool, queries, tokens)
	verSvc := service.NewVerificationService(queries)
	if cfg.AutoApproveVerification {
		verSvc.WithAutoApprove(pool)
		slog.Info("verification auto-approve is ON (demo mode)")
	}
	mapSvc := service.NewMapService(queries)
	partnerSvc := service.NewPartnerService(pool, queries)
	routeSvc := service.NewRouteService(pool, queries)
	walletSvc := service.NewWalletService(pool, queries)
	qonaqSvc := service.NewQonaqService(pool, queries)
	networkSvc := service.NewNetworkingService(pool, queries)
	chatSvc := service.NewChatService(queries)
	safetyAdminSvc := service.NewSafetyAdminService(pool, queries)

	handler := httptransport.NewHandler(
		authSvc, verSvc, mapSvc, partnerSvc, routeSvc,
		walletSvc, qonaqSvc, networkSvc, chatSvc, safetyAdminSvc,
	)

	router := httptransport.NewRouter(handler, tokens, queries, cfg.CORSOrigins)

	srv := &http.Server{
		Addr:              ":" + cfg.ServerPort,
		Handler:           router,
		ReadHeaderTimeout: 10 * time.Second,
		ReadTimeout:       15 * time.Second,
		WriteTimeout:      15 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	errCh := make(chan error, 1)
	go func() {
		slog.Info("starting tripdrip api server", "port", cfg.ServerPort)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			errCh <- err
		}
	}()

	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)

	select {
	case sig := <-sigCh:
		slog.Info("shutdown signal received", "signal", sig.String())
	case err := <-errCh:
		slog.Error("http server error", "err", err)
	}

	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer shutdownCancel()
	if err := srv.Shutdown(shutdownCtx); err != nil {
		slog.Error("graceful shutdown failed", "err", err)
	}
	slog.Info("server stopped cleanly")
}
