package service

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/tripdrip/backend/internal/db/sqlc"
	"github.com/tripdrip/backend/internal/domain"
	"github.com/tripdrip/backend/internal/transport/http/dto"
)

type NetworkingService struct {
	pool *pgxpool.Pool
	q    *sqlc.Queries
}

func NewNetworkingService(pool *pgxpool.Pool, q *sqlc.Queries) *NetworkingService {
	return &NetworkingService{pool: pool, q: q}
}

func (s *NetworkingService) SendRequest(ctx context.Context, senderID uuid.UUID, req dto.CreateNetworkRequest) (*sqlc.NetworkRequest, error) {
	if senderID == req.ReceiverID {
		return nil, domain.BadRequest(domain.ErrCodeValidation, "cannot send network request to yourself")
	}
	receiver, err := s.q.GetUserByID(ctx, req.ReceiverID)
	if err != nil {
		if isNotFound(err) {
			return nil, domain.NotFound("Target user not found")
		}
		return nil, domain.Internal(err)
	}
	if !receiver.IsVerified || receiver.IsBanned {
		return nil, domain.Forbidden(domain.ErrCodeForbidden, "Target user is unavailable")
	}

	blocked, err := s.q.IsBlockedBetween(ctx, sqlc.IsBlockedBetweenParams{
		BlockerID: senderID,
		BlockedID: req.ReceiverID,
	})
	if err != nil {
		return nil, domain.Internal(err)
	}
	if blocked {
		return nil, domain.Forbidden(domain.ErrCodeBlockedUsers, "Cannot connect with a blocked user")
	}

	nr, err := s.q.CreateNetworkRequest(ctx, sqlc.CreateNetworkRequestParams{
		SenderID:     senderID,
		ReceiverID:   req.ReceiverID,
		IntroMessage: toPgText(req.IntroMessage),
	})
	if err != nil {
		if isUniqueViolation(err) {
			return nil, domain.Conflict(domain.ErrCodeNetworkRequestExists, "Network request already exists")
		}
		return nil, domain.Internal(err)
	}
	return &nr, nil
}

func (s *NetworkingService) ListMyRequests(ctx context.Context, userID uuid.UUID) ([]sqlc.ListNetworkRequestsForUserRow, error) {
	items, err := s.q.ListNetworkRequestsForUser(ctx, userID)
	if err != nil {
		return nil, domain.Internal(err)
	}
	return items, nil
}

type RespondNetworkResult struct {
	Request sqlc.NetworkRequest `json:"request"`
	Chat    *sqlc.Chat          `json:"chat,omitempty"`
}

func (s *NetworkingService) Respond(ctx context.Context, receiverID, requestID uuid.UUID, req dto.RespondNetworkRequest) (*RespondNetworkResult, error) {
	var decision sqlc.RequestDecisionEnum
	switch sqlc.RequestDecisionEnum(req.Decision) {
	case sqlc.RequestDecisionEnumAccepted, sqlc.RequestDecisionEnumDeclined:
		decision = sqlc.RequestDecisionEnum(req.Decision)
	default:
		return nil, domain.BadRequest(domain.ErrCodeValidation, "decision must be accepted or declined")
	}

	var result RespondNetworkResult
	err := RunInTx(ctx, s.pool, s.q, func(qtx *sqlc.Queries, _ pgx.Tx) error {
		nr, err := qtx.GetNetworkRequestByIDForUpdate(ctx, requestID)
		if err != nil {
			if isNotFound(err) {
				return domain.NotFound("Network request not found")
			}
			return domain.Internal(err)
		}
		if nr.ReceiverID != receiverID {
			return domain.Forbidden(domain.ErrCodeForbidden, "Only receiver can respond to this request")
		}
		if nr.Status != sqlc.RequestDecisionEnumPending {
			return domain.Conflict(domain.ErrCodeConflict, "Network request already responded")
		}

		updated, err := qtx.RespondNetworkRequest(ctx, sqlc.RespondNetworkRequestParams{
			ID:     nr.ID,
			Status: decision,
		})
		if err != nil {
			return domain.Internal(err)
		}
		result.Request = updated

		// Mutual consent invariant: chat opens strictly when accepted.
		if decision == sqlc.RequestDecisionEnumAccepted {
			chat, err := qtx.CreateChat(ctx, sqlc.CreateChatParams{
				ContextType:      sqlc.ChatContextEnumNetworking,
				NetworkRequestID: &nr.ID,
				User1ID:          nr.SenderID,
				User2ID:          nr.ReceiverID,
			})
			if err != nil {
				return domain.Internal(err)
			}
			result.Chat = &chat
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	return &result, nil
}
