package service

import (
	"context"
	"strings"

	"github.com/google/uuid"
	"github.com/tripdrip/backend/internal/db/sqlc"
	"github.com/tripdrip/backend/internal/domain"
	"github.com/tripdrip/backend/internal/transport/http/dto"
)

type VerificationService struct {
	q *sqlc.Queries
}

func NewVerificationService(q *sqlc.Queries) *VerificationService {
	return &VerificationService{q: q}
}

func (s *VerificationService) Submit(ctx context.Context, userID uuid.UUID, role string, req dto.SubmitVerificationRequest) (*dto.VerificationResponse, error) {
	req.DocNumber = strings.TrimSpace(req.DocNumber)
	req.DocPhotoURL = strings.TrimSpace(req.DocPhotoURL)
	req.SelfieURL = strings.TrimSpace(req.SelfieURL)

	if req.DocNumber == "" || req.DocPhotoURL == "" || req.SelfieURL == "" {
		return nil, domain.BadRequest(domain.ErrCodeValidation, "doc_number, doc_photo_url, and selfie_url are required")
	}

	var docType sqlc.VerificationDocEnum
	switch sqlc.VerificationDocEnum(req.DocType) {
	case sqlc.VerificationDocEnumPassport:
		if role == string(sqlc.UserRoleEnumLocal) {
			return nil, domain.BadRequest(domain.ErrCodeValidation, "Kazakhstan residents must verify with IIN")
		}
		if len(req.DocNumber) < 5 || len(req.DocNumber) > 32 {
			return nil, domain.BadRequest(domain.ErrCodeValidation, "invalid passport number length")
		}
		docType = sqlc.VerificationDocEnumPassport
	case sqlc.VerificationDocEnumIin:
		if !domain.ValidateKZNumber12(req.DocNumber) {
			return nil, domain.BadRequest(domain.ErrCodeValidation, "invalid 12-digit KZ IIN checksum")
		}
		docType = sqlc.VerificationDocEnumIin
	default:
		return nil, domain.BadRequest(domain.ErrCodeValidation, "doc_type must be passport or iin")
	}

	exists, err := s.q.HasActiveOrApprovedVerification(ctx, userID)
	if err != nil {
		return nil, domain.Internal(err)
	}
	if exists {
		return nil, domain.Conflict(domain.ErrCodeVerificationPending, "Verification is already pending or approved")
	}

	docHash := domain.HashDocNumber(string(docType), req.DocNumber)
	v, err := s.q.CreateVerification(ctx, sqlc.CreateVerificationParams{
		UserID:        userID,
		DocType:       docType,
		DocNumberHash: docHash,
		DocPhotoUrl:   toPgTextVal(req.DocPhotoURL),
		SelfieUrl:     toPgTextVal(req.SelfieURL),
	})
	if err != nil {
		return nil, domain.Internal(err)
	}

	res := mapVerification(v)
	return &res, nil
}

func (s *VerificationService) GetMyStatus(ctx context.Context, userID uuid.UUID) (*dto.VerificationResponse, error) {
	v, err := s.q.GetLatestVerificationByUser(ctx, userID)
	if err != nil {
		if isNotFound(err) {
			return nil, domain.NotFound("No verification submitted yet")
		}
		return nil, domain.Internal(err)
	}
	res := mapVerification(v)
	return &res, nil
}

func mapVerification(v sqlc.Verification) dto.VerificationResponse {
	return dto.VerificationResponse{
		ID:              v.ID,
		UserID:          v.UserID,
		DocType:         string(v.DocType),
		DocPhotoURL:     fromPgText(v.DocPhotoUrl),
		SelfieURL:       fromPgText(v.SelfieUrl),
		Status:          string(v.Status),
		RejectionReason: fromPgText(v.RejectionReason),
		CreatedAt:       v.CreatedAt,
		ReviewedAt:      v.ReviewedAt,
	}
}
