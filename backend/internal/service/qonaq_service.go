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
	"github.com/tripdrip/backend/internal/transport/http/dto"
)

const (
	MaxActiveQonaqRequests       int64 = 3
	QonaqHelpRewardCoins         int32 = 30
	MaxDailyQonaqRewardsPerLocal int64 = 3
)

type QonaqService struct {
	pool *pgxpool.Pool
	q    *sqlc.Queries
}

func NewQonaqService(pool *pgxpool.Pool, q *sqlc.Queries) *QonaqService {
	return &QonaqService{pool: pool, q: q}
}

func (s *QonaqService) CreateRequest(ctx context.Context, touristID uuid.UUID, req dto.CreateQonaqRequest) (*sqlc.HelpRequest, error) {
	req.Description = strings.TrimSpace(req.Description)
	req.City = strings.TrimSpace(req.City)
	if req.Description == "" || len([]rune(req.Description)) > 300 {
		return nil, domain.BadRequest(domain.ErrCodeValidation, "description is required and max 300 chars")
	}
	if req.City == "" {
		return nil, domain.BadRequest(domain.ErrCodeValidation, "city is required")
	}
	if req.PeopleCount < 1 || req.PeopleCount > 20 {
		return nil, domain.BadRequest(domain.ErrCodeValidation, "people_count must be between 1 and 20")
	}

	var helpType sqlc.HelpTypeEnum
	switch sqlc.HelpTypeEnum(req.HelpType) {
	case sqlc.HelpTypeEnumDirections, sqlc.HelpTypeEnumTranslationCall, sqlc.HelpTypeEnumCityTour, sqlc.HelpTypeEnumDastarkhan, sqlc.HelpTypeEnumHostStay:
		helpType = sqlc.HelpTypeEnum(req.HelpType)
	default:
		return nil, domain.BadRequest(domain.ErrCodeValidation, "invalid help_type")
	}

	if helpType == sqlc.HelpTypeEnumHostStay {
		if req.TargetLocalID == nil {
			return nil, domain.Forbidden(domain.ErrCodeCannotHostNoRating, "Host stay is locked in MVP unless targeting a qualified high-rated host")
		}
		targetProfile, err := s.q.GetProfileByUserID(ctx, *req.TargetLocalID)
		if err != nil || !targetProfile.CanHostGuests {
			return nil, domain.Forbidden(domain.ErrCodeCannotHostNoRating, "Target local is not eligible to host guests yet")
		}
	}

	if req.TargetLocalID != nil {
		if *req.TargetLocalID == touristID {
			return nil, domain.BadRequest(domain.ErrCodeValidation, "cannot target yourself")
		}
		blocked, err := s.q.IsBlockedBetween(ctx, sqlc.IsBlockedBetweenParams{
			BlockerID: touristID,
			BlockedID: *req.TargetLocalID,
		})
		if err != nil {
			return nil, domain.Internal(err)
		}
		if blocked {
			return nil, domain.Forbidden(domain.ErrCodeBlockedUsers, "Cannot send request to blocked user")
		}
	}

	activeCount, err := s.q.CountActiveHelpRequestsByTourist(ctx, touristID)
	if err != nil {
		return nil, domain.Internal(err)
	}
	if activeCount >= MaxActiveQonaqRequests {
		return nil, domain.BadRequest(domain.ErrCodeQonaqLimitExceeded, "Maximum 3 active Qonaq requests allowed")
	}

	neededAt := req.NeededAt
	if neededAt.IsZero() {
		neededAt = time.Now().UTC().Add(2 * time.Hour)
	}
	expiresAt := neededAt.Add(24 * time.Hour)
	if expiresAt.Before(time.Now().UTC().Add(2 * time.Hour)) {
		expiresAt = time.Now().UTC().Add(24 * time.Hour)
	}

	hr, err := s.q.CreateHelpRequest(ctx, sqlc.CreateHelpRequestParams{
		TouristID:     touristID,
		TargetLocalID: req.TargetLocalID,
		HelpType:      helpType,
		Description:   req.Description,
		City:          req.City,
		District:      toPgText(req.District),
		NeededAt:      neededAt,
		PeopleCount:   req.PeopleCount,
		ExpiresAt:     expiresAt,
	})
	if err != nil {
		return nil, domain.Internal(err)
	}
	return &hr, nil
}

func (s *QonaqService) GetFeed(ctx context.Context, localID uuid.UUID, city string) ([]sqlc.ListOpenHelpFeedForLocalRow, error) {
	items, err := s.q.ListOpenHelpFeedForLocal(ctx, sqlc.ListOpenHelpFeedForLocalParams{
		City:    strings.TrimSpace(city),
		LocalID: &localID,
	})
	if err != nil {
		return nil, domain.Internal(err)
	}
	return items, nil
}

func (s *QonaqService) ListMyRequests(ctx context.Context, userID uuid.UUID) ([]sqlc.HelpRequest, error) {
	items, err := s.q.ListHelpRequestsByUser(ctx, userID)
	if err != nil {
		return nil, domain.Internal(err)
	}
	return items, nil
}

func (s *QonaqService) ListResponses(ctx context.Context, userID, requestID uuid.UUID) ([]sqlc.ListHelpResponsesByRequestRow, error) {
	hr, err := s.q.GetHelpRequestByID(ctx, requestID)
	if err != nil {
		if isNotFound(err) {
			return nil, domain.NotFound("Help request not found")
		}
		return nil, domain.Internal(err)
	}
	if hr.TouristID != userID && (hr.SelectedLocalID == nil || *hr.SelectedLocalID != userID) {
		return nil, domain.Forbidden(domain.ErrCodeForbidden, "Access denied")
	}
	resps, err := s.q.ListHelpResponsesByRequest(ctx, requestID)
	if err != nil {
		return nil, domain.Internal(err)
	}
	return resps, nil
}

type RespondQonaqResult struct {
	Response sqlc.HelpResponse `json:"response"`
	Chat     *sqlc.Chat        `json:"chat,omitempty"`
}

func (s *QonaqService) Respond(ctx context.Context, localID, requestID uuid.UUID, req dto.RespondQonaqRequest) (*RespondQonaqResult, error) {
	var decision sqlc.RequestDecisionEnum
	switch sqlc.RequestDecisionEnum(req.Decision) {
	case sqlc.RequestDecisionEnumAccepted, sqlc.RequestDecisionEnumDeclined:
		decision = sqlc.RequestDecisionEnum(req.Decision)
	default:
		return nil, domain.BadRequest(domain.ErrCodeValidation, "decision must be accepted or declined")
	}

	var result RespondQonaqResult
	err := RunInTx(ctx, s.pool, s.q, func(qtx *sqlc.Queries, _ pgx.Tx) error {
		hr, err := qtx.GetHelpRequestByIDForUpdate(ctx, requestID)
		if err != nil {
			if isNotFound(err) {
				return domain.NotFound("Help request not found")
			}
			return domain.Internal(err)
		}
		if hr.TouristID == localID {
			return domain.BadRequest(domain.ErrCodeValidation, "cannot respond to own request")
		}
		if hr.TargetLocalID != nil && *hr.TargetLocalID != localID {
			return domain.Forbidden(domain.ErrCodeForbidden, "This request is addressed to a specific local")
		}
		if hr.Status != sqlc.HelpStatusEnumOpen && hr.Status != sqlc.HelpStatusEnumHasResponses {
			return domain.BadRequest(domain.ErrCodeQonaqInvalidState, "Request is no longer accepting responses")
		}
		if hr.ExpiresAt.Before(time.Now().UTC()) {
			return domain.BadRequest(domain.ErrCodeQonaqInvalidState, "Request has expired")
		}

		resp, err := qtx.CreateHelpResponse(ctx, sqlc.CreateHelpResponseParams{
			RequestID: hr.ID,
			LocalID:   localID,
			Decision:  decision,
			Message:   toPgText(req.Message),
		})
		if err != nil {
			if isUniqueViolation(err) {
				return domain.Conflict(domain.ErrCodeQonaqAlreadyResponded, "Already responded to this request")
			}
			return domain.Internal(err)
		}
		result.Response = resp

		if decision == sqlc.RequestDecisionEnumAccepted {
			if hr.Status == sqlc.HelpStatusEnumOpen {
				if _, err := qtx.SetHelpRequestHasResponses(ctx, hr.ID); err != nil && !isNotFound(err) {
					return domain.Internal(err)
				}
			}
			// Personal Qonaq from map: local's acceptance directly matches and opens the chat
			if hr.TargetLocalID != nil && *hr.TargetLocalID == localID {
				if _, err := qtx.SelectHelpRequestHost(ctx, sqlc.SelectHelpRequestHostParams{
					ID:              hr.ID,
					SelectedLocalID: &localID,
				}); err != nil {
					return domain.Internal(err)
				}
				chat, err := qtx.CreateChat(ctx, sqlc.CreateChatParams{
					ContextType:   sqlc.ChatContextEnumQonaq,
					HelpRequestID: &hr.ID,
					User1ID:       hr.TouristID,
					User2ID:       localID,
				})
				if err != nil {
					return domain.Internal(err)
				}
				result.Chat = &chat
			}
		}
		// Declining does not close the general request for other locals.
		return nil
	})
	if err != nil {
		return nil, err
	}
	return &result, nil
}

type SelectHostResult struct {
	HelpRequest sqlc.HelpRequest `json:"help_request"`
	Chat        sqlc.Chat        `json:"chat"`
}

func (s *QonaqService) SelectHost(ctx context.Context, touristID, requestID, localID uuid.UUID) (*SelectHostResult, error) {
	var result SelectHostResult
	err := RunInTx(ctx, s.pool, s.q, func(qtx *sqlc.Queries, _ pgx.Tx) error {
		hr, err := qtx.GetHelpRequestByIDForUpdate(ctx, requestID)
		if err != nil {
			if isNotFound(err) {
				return domain.NotFound("Help request not found")
			}
			return domain.Internal(err)
		}
		if hr.TouristID != touristID {
			return domain.Forbidden(domain.ErrCodeForbidden, "Only request creator can select a host")
		}
		if hr.Status != sqlc.HelpStatusEnumOpen && hr.Status != sqlc.HelpStatusEnumHasResponses {
			return domain.BadRequest(domain.ErrCodeQonaqInvalidState, "Host already selected or request closed")
		}

		resp, err := qtx.GetHelpResponseByRequestAndLocal(ctx, sqlc.GetHelpResponseByRequestAndLocalParams{
			RequestID: hr.ID,
			LocalID:   localID,
		})
		if err != nil || resp.Decision != sqlc.RequestDecisionEnumAccepted {
			return domain.BadRequest(domain.ErrCodeValidation, "Selected local has not accepted this request")
		}

		updated, err := qtx.SelectHelpRequestHost(ctx, sqlc.SelectHelpRequestHostParams{
			ID:              hr.ID,
			SelectedLocalID: &localID,
		})
		if err != nil {
			return domain.Internal(err)
		}
		result.HelpRequest = updated

		chat, err := qtx.CreateChat(ctx, sqlc.CreateChatParams{
			ContextType:   sqlc.ChatContextEnumQonaq,
			HelpRequestID: &hr.ID,
			User1ID:       hr.TouristID,
			User2ID:       localID,
		})
		if err != nil {
			return domain.Internal(err)
		}
		result.Chat = chat
		return nil
	})
	if err != nil {
		return nil, err
	}
	return &result, nil
}

type ConfirmQonaqResult struct {
	HelpRequest  sqlc.HelpRequest `json:"help_request"`
	CoinsAwarded int32            `json:"coins_awarded"`
}

func (s *QonaqService) ConfirmDone(ctx context.Context, actorID, requestID uuid.UUID) (*ConfirmQonaqResult, error) {
	var result ConfirmQonaqResult
	err := RunInTx(ctx, s.pool, s.q, func(qtx *sqlc.Queries, _ pgx.Tx) error {
		hr, err := qtx.GetHelpRequestByIDForUpdate(ctx, requestID)
		if err != nil {
			if isNotFound(err) {
				return domain.NotFound("Help request not found")
			}
			return domain.Internal(err)
		}
		if hr.Status != sqlc.HelpStatusEnumMatched {
			return domain.BadRequest(domain.ErrCodeQonaqInvalidState, "Request must be in matched state to confirm completion")
		}

		isTourist := hr.TouristID == actorID
		isSelectedLocal := hr.SelectedLocalID != nil && *hr.SelectedLocalID == actorID
		if !isTourist && !isSelectedLocal {
			return domain.Forbidden(domain.ErrCodeForbidden, "Only matched participants can confirm completion")
		}

		updated, err := qtx.ConfirmHelpRequestDone(ctx, sqlc.ConfirmHelpRequestDoneParams{
			ID:        hr.ID,
			IsTourist: isTourist,
		})
		if err != nil {
			return domain.Internal(err)
		}
		result.HelpRequest = updated

		// Mutual confirmation achieved -> increment completed count & award +30 coins to local (up to 3/day)
		if updated.Status == sqlc.HelpStatusEnumCompleted && updated.SelectedLocalID != nil {
			localID := *updated.SelectedLocalID
			if err := qtx.IncrementQonaqCompletedCount(ctx, localID); err != nil {
				return domain.Internal(err)
			}

			dailyCount, err := qtx.CountDailyQonaqRewardsByLocal(ctx, localID)
			if err != nil {
				return domain.Internal(err)
			}
			if dailyCount < MaxDailyQonaqRewardsPerLocal {
				if _, err := qtx.GetWalletForUpdate(ctx, localID); err != nil {
					return domain.Internal(err)
				}
				idemKey := fmt.Sprintf("qonaq_help:%s:%s", localID, updated.ID)
				if _, err := qtx.CreateCoinTransaction(ctx, sqlc.CreateCoinTransactionParams{
					UserID:         localID,
					Amount:         QonaqHelpRewardCoins,
					Reason:         sqlc.CoinReasonEnumQonaqHelp,
					ReferenceID:    &updated.ID,
					IdempotencyKey: idemKey,
				}); err != nil {
					if !isUniqueViolation(err) {
						return domain.Internal(err)
					}
				} else {
					if _, err := qtx.UpdateWalletBalance(ctx, sqlc.UpdateWalletBalanceParams{
						Delta:  QonaqHelpRewardCoins,
						UserID: localID,
					}); err != nil {
						return domain.Internal(err)
					}
					result.CoinsAwarded = QonaqHelpRewardCoins
				}
			}
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	return &result, nil
}

func (s *QonaqService) CreateReview(ctx context.Context, reviewerID, requestID uuid.UUID, req dto.CreateReviewRequest) (*sqlc.Review, error) {
	if req.Rating < 1 || req.Rating > 5 {
		return nil, domain.BadRequest(domain.ErrCodeValidation, "rating must be between 1 and 5")
	}

	var review sqlc.Review
	err := RunInTx(ctx, s.pool, s.q, func(qtx *sqlc.Queries, _ pgx.Tx) error {
		hr, err := qtx.GetHelpRequestByID(ctx, requestID)
		if err != nil {
			if isNotFound(err) {
				return domain.NotFound("Help request not found")
			}
			return domain.Internal(err)
		}
		if hr.Status != sqlc.HelpStatusEnumCompleted {
			return domain.BadRequest(domain.ErrCodeQonaqInvalidState, "Reviews can only be submitted after mutual completion")
		}
		if hr.SelectedLocalID == nil {
			return domain.BadRequest(domain.ErrCodeQonaqInvalidState, "No host assigned")
		}

		var revieweeID uuid.UUID
		switch reviewerID {
		case hr.TouristID:
			revieweeID = *hr.SelectedLocalID
		case *hr.SelectedLocalID:
			revieweeID = hr.TouristID
		default:
			return domain.Forbidden(domain.ErrCodeForbidden, "Only participants can review this request")
		}

		created, err := qtx.CreateReview(ctx, sqlc.CreateReviewParams{
			HelpRequestID: hr.ID,
			ReviewerID:    reviewerID,
			RevieweeID:    revieweeID,
			Rating:        req.Rating,
			Comment:       toPgText(req.Comment),
		})
		if err != nil {
			if isUniqueViolation(err) {
				return domain.Conflict(domain.ErrCodeConflict, "You have already reviewed this request")
			}
			return domain.Internal(err)
		}
		review = created

		if err := qtx.RecalculateUserRating(ctx, revieweeID); err != nil {
			return domain.Internal(err)
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	return &review, nil
}
