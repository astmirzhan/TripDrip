package service

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/tripdrip/backend/internal/db/sqlc"
	"github.com/tripdrip/backend/internal/domain"
)

type WalletService struct {
	pool *pgxpool.Pool
	q    *sqlc.Queries
}

func NewWalletService(pool *pgxpool.Pool, q *sqlc.Queries) *WalletService {
	return &WalletService{pool: pool, q: q}
}

type WalletSummary struct {
	Balance      int32                  `json:"balance"`
	UpdatedAt    time.Time              `json:"updated_at"`
	Transactions []sqlc.CoinTransaction `json:"transactions"`
}

func (s *WalletService) GetWallet(ctx context.Context, userID uuid.UUID, limit, offset int32) (*WalletSummary, error) {
	if limit <= 0 || limit > 100 {
		limit = 50
	}
	if offset < 0 {
		offset = 0
	}
	w, err := s.q.GetWalletByUserID(ctx, userID)
	if err != nil {
		if isNotFound(err) {
			return nil, domain.NotFound("Wallet not found")
		}
		return nil, domain.Internal(err)
	}
	txs, err := s.q.ListCoinTransactionsByUser(ctx, sqlc.ListCoinTransactionsByUserParams{
		UserID: userID,
		Limit:  limit,
		Offset: offset,
	})
	if err != nil {
		return nil, domain.Internal(err)
	}
	return &WalletSummary{
		Balance:      w.Balance,
		UpdatedAt:    w.UpdatedAt,
		Transactions: txs,
	}, nil
}

func (s *WalletService) ListActiveOffers(ctx context.Context) ([]sqlc.ListActiveOffersRow, error) {
	offers, err := s.q.ListActiveOffers(ctx)
	if err != nil {
		return nil, domain.Internal(err)
	}
	return offers, nil
}

func (s *WalletService) ListMyPromoCodes(ctx context.Context, userID uuid.UUID) ([]sqlc.ListPromoCodesByUserRow, error) {
	promos, err := s.q.ListPromoCodesByUser(ctx, userID)
	if err != nil {
		return nil, domain.Internal(err)
	}
	return promos, nil
}

// ExchangeOffer atomically deducts coins, decrements offer limit, records an idempotent coin transaction, and mints a promo code.
func (s *WalletService) ExchangeOffer(ctx context.Context, userID, offerID uuid.UUID, idempotencyKey string) (*sqlc.PromoCode, error) {
	idempotencyKey = strings.TrimSpace(idempotencyKey)
	if idempotencyKey == "" {
		idempotencyKey = fmt.Sprintf("promo_exchange:%s:%s:%s", userID, offerID, uuid.NewString())
	} else {
		idempotencyKey = "promo_exchange:" + userID.String() + ":" + idempotencyKey
	}

	var promo sqlc.PromoCode
	err := RunInTx(ctx, s.pool, s.q, func(qtx *sqlc.Queries, _ pgx.Tx) error {
		// Check idempotency key first
		if existingTx, err := qtx.GetCoinTransactionByIdempotencyKey(ctx, idempotencyKey); err == nil {
			if existingTx.ReferenceID != nil {
				// Return the promo code created earlier for this idempotency key if any
				promos, pErr := qtx.ListPromoCodesByUser(ctx, userID)
				if pErr == nil {
					for _, p := range promos {
						if p.OfferID == *existingTx.ReferenceID {
							promo = sqlc.PromoCode{
								ID:        p.ID,
								Code:      p.Code,
								OfferID:   p.OfferID,
								UserID:    p.UserID,
								Status:    p.Status,
								ExpiresAt: p.ExpiresAt,
								CreatedAt: p.CreatedAt,
							}
							return nil
						}
					}
				}
			}
			return domain.Conflict(domain.ErrCodeConflict, "Duplicate exchange request")
		}

		// Lock wallet and offer inside pgx.Tx
		wallet, err := qtx.GetWalletForUpdate(ctx, userID)
		if err != nil {
			if isNotFound(err) {
				return domain.NotFound("Wallet not found")
			}
			return domain.Internal(err)
		}

		offer, err := qtx.GetOfferByIDForUpdate(ctx, offerID)
		if err != nil {
			if isNotFound(err) {
				return domain.NotFound("Offer not found")
			}
			return domain.Internal(err)
		}
		if !offer.IsActive {
			return domain.BadRequest(domain.ErrCodeOfferInactive, "Offer is no longer active")
		}
		if offer.RemainingLimit <= 0 {
			return domain.Conflict(domain.ErrCodeOfferExhausted, "Offer limit exhausted")
		}
		if wallet.Balance < offer.CoinCost {
			return domain.BadRequest(domain.ErrCodeInsufficientCoins, "Not enough coins for this offer")
		}

		// Calculate promo code expiration:
		// tourist -> end of trip_end_date (or +30 days if trip_end_date is unset);
		// local (or any non-tourist) -> fixed 30 days from issuance.
		userWithProfile, err := qtx.GetUserWithProfile(ctx, userID)
		if err != nil {
			return domain.Internal(err)
		}
		now := time.Now().UTC()
		expiresAt := now.Add(30 * 24 * time.Hour)
		if userWithProfile.Role == sqlc.UserRoleEnumTourist && userWithProfile.TripEndDate != nil {
			endOfTrip := time.Date(
				userWithProfile.TripEndDate.Year(),
				userWithProfile.TripEndDate.Month(),
				userWithProfile.TripEndDate.Day(),
				23, 59, 59, 0, time.UTC,
			)
			if endOfTrip.After(now) {
				expiresAt = endOfTrip
			}
		}

		if _, err := qtx.UpdateWalletBalance(ctx, sqlc.UpdateWalletBalanceParams{
			Delta:  -offer.CoinCost,
			UserID: userID,
		}); err != nil {
			return domain.Internal(err)
		}

		if _, err := qtx.DecrementOfferLimit(ctx, offer.ID); err != nil {
			return domain.Internal(err)
		}

		if _, err := qtx.CreateCoinTransaction(ctx, sqlc.CreateCoinTransactionParams{
			UserID:         userID,
			Amount:         -offer.CoinCost,
			Reason:         sqlc.CoinReasonEnumPromoExchange,
			ReferenceID:    &offer.ID,
			IdempotencyKey: idempotencyKey,
		}); err != nil {
			if isUniqueViolation(err) {
				return domain.Conflict(domain.ErrCodeConflict, "Duplicate exchange request")
			}
			return domain.Internal(err)
		}

		code, err := domain.GeneratePromoCode()
		if err != nil {
			return domain.Internal(err)
		}

		created, err := qtx.CreatePromoCode(ctx, sqlc.CreatePromoCodeParams{
			Code:      code,
			OfferID:   offer.ID,
			UserID:    userID,
			ExpiresAt: expiresAt,
		})
		if err != nil {
			return domain.Internal(err)
		}
		promo = created
		return nil
	})
	if err != nil {
		return nil, err
	}
	return &promo, nil
}
