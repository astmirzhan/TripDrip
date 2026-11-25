package httptransport

import (
	"context"
	"log/slog"
	"net/http"
	"slices"
	"strings"
	"time"

	"github.com/go-chi/chi/v5/middleware"
	"github.com/google/uuid"
	"github.com/tripdrip/backend/internal/db/sqlc"
	"github.com/tripdrip/backend/internal/domain"
)

type contextKey string

const authUserContextKey contextKey = "auth_user"

type AuthUser struct {
	ID         uuid.UUID
	Role       string
	IsVerified bool
}

func UserFromContext(ctx context.Context) (AuthUser, bool) {
	u, ok := ctx.Value(authUserContextKey).(AuthUser)
	return u, ok
}

func CORS(allowedOrigins []string) func(http.Handler) http.Handler {
	allowAll := slices.Contains(allowedOrigins, "*")
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			origin := r.Header.Get("Origin")
			if allowAll {
				w.Header().Set("Access-Control-Allow-Origin", "*")
			} else if origin != "" && slices.Contains(allowedOrigins, origin) {
				w.Header().Set("Access-Control-Allow-Origin", origin)
				w.Header().Set("Vary", "Origin")
			}
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PATCH, PUT, DELETE, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Authorization, Content-Type, Idempotency-Key")
			w.Header().Set("Access-Control-Max-Age", "86400")

			if r.Method == http.MethodOptions {
				w.WriteHeader(http.StatusNoContent)
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

func SlogLogger(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		ww := middleware.NewWrapResponseWriter(w, r.ProtoMajor)
		next.ServeHTTP(ww, r)
		slog.Info("http_request",
			"method", r.Method,
			"path", r.URL.Path,
			"status", ww.Status(),
			"duration_ms", time.Since(start).Milliseconds(),
			"req_id", middleware.GetReqID(r.Context()),
		)
	})
}

func Authenticate(tokens *domain.TokenManager, q *sqlc.Queries) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			authHeader := strings.TrimSpace(r.Header.Get("Authorization"))
			if !strings.HasPrefix(strings.ToLower(authHeader), "bearer ") {
				WriteError(w, domain.Unauthorized(domain.ErrCodeUnauthorized, "Missing or invalid Authorization header"))
				return
			}
			tokenStr := strings.TrimSpace(authHeader[7:])
			claims, err := tokens.Parse(tokenStr, domain.TokenTypeAccess)
			if err != nil {
				WriteError(w, domain.Unauthorized(domain.ErrCodeUnauthorized, "Invalid or expired access token"))
				return
			}

			user, err := q.GetUserByID(r.Context(), claims.UserID)
			if err != nil {
				WriteError(w, domain.Unauthorized(domain.ErrCodeUnauthorized, "User account not found"))
				return
			}
			if user.IsBanned {
				WriteError(w, domain.Forbidden(domain.ErrCodeUserBanned, "Account is banned"))
				return
			}

			ctx := context.WithValue(r.Context(), authUserContextKey, AuthUser{
				ID:         user.ID,
				Role:       string(user.Role),
				IsVerified: user.IsVerified,
			})
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func RequireRoles(roles ...string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			u, ok := UserFromContext(r.Context())
			if !ok {
				WriteError(w, domain.Unauthorized(domain.ErrCodeUnauthorized, "Unauthorized"))
				return
			}
			if !slices.Contains(roles, u.Role) {
				WriteError(w, domain.Forbidden(domain.ErrCodeForbidden, "Insufficient role permissions"))
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

func RequireVerified() func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			u, ok := UserFromContext(r.Context())
			if !ok {
				WriteError(w, domain.Unauthorized(domain.ErrCodeUnauthorized, "Unauthorized"))
				return
			}
			if !u.IsVerified {
				WriteError(w, domain.Forbidden(domain.ErrCodeUserNotVerified, "Account verification is required to access this feature"))
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}
