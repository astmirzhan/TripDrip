package service

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/tripdrip/backend/internal/db/sqlc"
)

// RunInTx executes fn inside an explicit pgx.Tx transaction.
// It rolls back automatically on error or panic and commits on nil error.
func RunInTx(ctx context.Context, pool *pgxpool.Pool, queries *sqlc.Queries, fn func(q *sqlc.Queries, tx pgx.Tx) error) error {
	tx, err := pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return fmt.Errorf("begin tx: %w", err)
	}

	defer func() {
		if r := recover(); r != nil {
			_ = tx.Rollback(ctx)
			panic(r)
		}
	}()

	qtx := queries.WithTx(tx)
	if err := fn(qtx, tx); err != nil {
		_ = tx.Rollback(ctx)
		return err
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit tx: %w", err)
	}
	return nil
}
