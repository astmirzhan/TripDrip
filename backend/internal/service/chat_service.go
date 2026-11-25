package service

import (
	"context"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/tripdrip/backend/internal/db/sqlc"
	"github.com/tripdrip/backend/internal/domain"
	"github.com/tripdrip/backend/internal/transport/http/dto"
)

type ChatService struct {
	q *sqlc.Queries
}

func NewChatService(q *sqlc.Queries) *ChatService {
	return &ChatService{q: q}
}

func (s *ChatService) ListMyChats(ctx context.Context, userID uuid.UUID) ([]sqlc.ListChatsByUserRow, error) {
	chats, err := s.q.ListChatsByUser(ctx, userID)
	if err != nil {
		return nil, domain.Internal(err)
	}
	return chats, nil
}

func (s *ChatService) GetMessages(ctx context.Context, userID, chatID uuid.UUID, before *time.Time, limit int32) ([]sqlc.Message, error) {
	chat, err := s.q.GetChatByID(ctx, chatID)
	if err != nil {
		if isNotFound(err) {
			return nil, domain.NotFound("Chat not found")
		}
		return nil, domain.Internal(err)
	}
	if chat.User1ID != userID && chat.User2ID != userID {
		return nil, domain.Forbidden(domain.ErrCodeChatAccessDenied, "You are not a participant of this chat")
	}

	if limit <= 0 || limit > 100 {
		limit = 50
	}
	msgs, err := s.q.ListMessagesByChat(ctx, sqlc.ListMessagesByChatParams{
		ChatID: chatID,
		Limit:  limit,
		Before: before,
	})
	if err != nil {
		return nil, domain.Internal(err)
	}
	return msgs, nil
}

func (s *ChatService) SendMessage(ctx context.Context, senderID, chatID uuid.UUID, req dto.SendMessageRequest) (*sqlc.Message, error) {
	body := strings.TrimSpace(req.Body)
	if body == "" || len([]rune(body)) > 2000 {
		return nil, domain.BadRequest(domain.ErrCodeValidation, "message body is required and max 2000 chars")
	}

	chat, err := s.q.GetChatByID(ctx, chatID)
	if err != nil {
		if isNotFound(err) {
			return nil, domain.NotFound("Chat not found")
		}
		return nil, domain.Internal(err)
	}
	if chat.User1ID != senderID && chat.User2ID != senderID {
		return nil, domain.Forbidden(domain.ErrCodeChatAccessDenied, "You are not a participant of this chat")
	}

	otherID := chat.User1ID
	if otherID == senderID {
		otherID = chat.User2ID
	}
	blocked, err := s.q.IsBlockedBetween(ctx, sqlc.IsBlockedBetweenParams{
		BlockerID: senderID,
		BlockedID: otherID,
	})
	if err != nil {
		return nil, domain.Internal(err)
	}
	if blocked {
		return nil, domain.Forbidden(domain.ErrCodeBlockedUsers, "Cannot send messages to blocked user")
	}

	flagged := domain.IsCommercialSpam(body)
	msg, err := s.q.CreateMessage(ctx, sqlc.CreateMessageParams{
		ChatID:            chat.ID,
		SenderID:          senderID,
		Body:              body,
		FlaggedCommercial: flagged,
	})
	if err != nil {
		return nil, domain.Internal(err)
	}
	return &msg, nil
}
