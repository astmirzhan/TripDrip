package service

import (
	"context"
	"strings"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/tripdrip/backend/internal/db/sqlc"
	"github.com/tripdrip/backend/internal/domain"
	"github.com/tripdrip/backend/internal/transport/http/dto"
)

const AutoHideReportThreshold int64 = 3

type SafetyAdminService struct {
	pool *pgxpool.Pool
	q    *sqlc.Queries
}

func NewSafetyAdminService(pool *pgxpool.Pool, q *sqlc.Queries) *SafetyAdminService {
	return &SafetyAdminService{pool: pool, q: q}
}

type FileReportResult struct {
	Report             sqlc.Report `json:"report"`
	OpenReportsCount   int64       `json:"open_reports_count"`
	HiddenByModeration bool        `json:"hidden_by_moderation"`
}

func (s *SafetyAdminService) FileReport(ctx context.Context, reporterID uuid.UUID, req dto.CreateReportRequest) (*FileReportResult, error) {
	if reporterID == req.TargetUserID {
		return nil, domain.BadRequest(domain.ErrCodeReportSelf, "Cannot report yourself")
	}
	reason := strings.TrimSpace(req.Reason)
	if reason == "" || len([]rune(reason)) > 120 {
		return nil, domain.BadRequest(domain.ErrCodeValidation, "reason is required (max 120 chars)")
	}

	var result FileReportResult
	err := RunInTx(ctx, s.pool, s.q, func(qtx *sqlc.Queries, _ pgx.Tx) error {
		if _, err := qtx.GetUserByID(ctx, req.TargetUserID); err != nil {
			if isNotFound(err) {
				return domain.NotFound("Target user not found")
			}
			return domain.Internal(err)
		}

		report, err := qtx.CreateReport(ctx, sqlc.CreateReportParams{
			ReporterID:   reporterID,
			TargetUserID: req.TargetUserID,
			Reason:       reason,
			Details:      toPgText(req.Details),
		})
		if err != nil {
			if isUniqueViolation(err) {
				return domain.Conflict(domain.ErrCodeReportDuplicate, "You have already reported this user")
			}
			return domain.Internal(err)
		}
		result.Report = report

		openCount, err := qtx.CountOpenReportsByTarget(ctx, req.TargetUserID)
		if err != nil {
			return domain.Internal(err)
		}
		result.OpenReportsCount = openCount

		// Invariant: >= 3 unique open reports automatically hide user from map until admin review.
		if openCount >= AutoHideReportThreshold {
			if err := qtx.SetMapHiddenByModeration(ctx, sqlc.SetMapHiddenByModerationParams{
				UserID:             req.TargetUserID,
				HiddenByModeration: true,
			}); err != nil {
				return domain.Internal(err)
			}
			result.HiddenByModeration = true
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	return &result, nil
}

func (s *SafetyAdminService) BlockUser(ctx context.Context, blockerID, blockedID uuid.UUID) error {
	if blockerID == blockedID {
		return domain.BadRequest(domain.ErrCodeBlockSelf, "Cannot block yourself")
	}
	if _, err := s.q.GetUserByID(ctx, blockedID); err != nil {
		if isNotFound(err) {
			return domain.NotFound("User not found")
		}
		return domain.Internal(err)
	}
	_, err := s.q.CreateBlock(ctx, sqlc.CreateBlockParams{
		BlockerID: blockerID,
		BlockedID: blockedID,
	})
	if err != nil && !isNotFound(err) {
		return domain.Internal(err)
	}
	return nil
}

func (s *SafetyAdminService) UnblockUser(ctx context.Context, blockerID, blockedID uuid.UUID) error {
	if err := s.q.DeleteBlock(ctx, sqlc.DeleteBlockParams{
		BlockerID: blockerID,
		BlockedID: blockedID,
	}); err != nil {
		return domain.Internal(err)
	}
	return nil
}

func (s *SafetyAdminService) ListBlockedUsers(ctx context.Context, blockerID uuid.UUID) ([]sqlc.ListBlockedUsersRow, error) {
	items, err := s.q.ListBlockedUsers(ctx, blockerID)
	if err != nil {
		return nil, domain.Internal(err)
	}
	return items, nil
}

// ========== ADMIN QUEUES ==========

func (s *SafetyAdminService) ListPendingVerifications(ctx context.Context, limit, offset int32) ([]sqlc.ListPendingVerificationsRow, error) {
	if limit <= 0 || limit > 100 {
		limit = 50
	}
	items, err := s.q.ListPendingVerifications(ctx, sqlc.ListPendingVerificationsParams{
		Limit:  limit,
		Offset: offset,
	})
	if err != nil {
		return nil, domain.Internal(err)
	}
	return items, nil
}

// ReviewVerification sets status, updates users.is_verified, and clears doc_photo_url & selfie_url to NULL inside pgx.Tx.
func (s *SafetyAdminService) ReviewVerification(ctx context.Context, adminID, verificationID uuid.UUID, req dto.ReviewVerificationRequest) (*dto.VerificationResponse, error) {
	var status sqlc.VerificationStatusEnum
	switch sqlc.VerificationStatusEnum(req.Decision) {
	case sqlc.VerificationStatusEnumApproved, sqlc.VerificationStatusEnumRejected:
		status = sqlc.VerificationStatusEnum(req.Decision)
	default:
		return nil, domain.BadRequest(domain.ErrCodeValidation, "decision must be approved or rejected")
	}
	if status == sqlc.VerificationStatusEnumRejected && (req.RejectionReason == nil || strings.TrimSpace(*req.RejectionReason) == "") {
		return nil, domain.BadRequest(domain.ErrCodeValidation, "rejection_reason is required when rejecting")
	}

	var updated sqlc.Verification
	err := RunInTx(ctx, s.pool, s.q, func(qtx *sqlc.Queries, _ pgx.Tx) error {
		v, err := qtx.GetVerificationByIDForUpdate(ctx, verificationID)
		if err != nil {
			if isNotFound(err) {
				return domain.NotFound("Verification record not found")
			}
			return domain.Internal(err)
		}
		if v.Status != sqlc.VerificationStatusEnumPending {
			return domain.Conflict(domain.ErrCodeConflict, "Verification has already been reviewed")
		}

		// SQL sets doc_photo_url = NULL, selfie_url = NULL unconditionally.
		rev, err := qtx.ReviewVerification(ctx, sqlc.ReviewVerificationParams{
			ID:              v.ID,
			Status:          status,
			RejectionReason: toPgText(req.RejectionReason),
			ReviewedBy:      &adminID,
		})
		if err != nil {
			return domain.Internal(err)
		}
		updated = rev

		if _, err := qtx.SetUserVerified(ctx, sqlc.SetUserVerifiedParams{
			ID:         v.UserID,
			IsVerified: status == sqlc.VerificationStatusEnumApproved,
		}); err != nil {
			return domain.Internal(err)
		}
		return nil
	})
	if err != nil {
		return nil, err
	}

	res := mapVerification(updated)
	return &res, nil
}

func (s *SafetyAdminService) ListOpenReports(ctx context.Context, limit, offset int32) ([]sqlc.ListOpenReportsRow, error) {
	if limit <= 0 || limit > 100 {
		limit = 50
	}
	items, err := s.q.ListOpenReports(ctx, sqlc.ListOpenReportsParams{
		Limit:  limit,
		Offset: offset,
	})
	if err != nil {
		return nil, domain.Internal(err)
	}
	return items, nil
}

func (s *SafetyAdminService) ResolveReport(ctx context.Context, adminID, reportID uuid.UUID, req dto.ResolveReportRequest) (*sqlc.Report, error) {
	var status sqlc.ReportStatusEnum
	switch sqlc.ReportStatusEnum(req.Status) {
	case sqlc.ReportStatusEnumResolved, sqlc.ReportStatusEnumDismissed:
		status = sqlc.ReportStatusEnum(req.Status)
	default:
		return nil, domain.BadRequest(domain.ErrCodeValidation, "status must be resolved or dismissed")
	}

	var updated sqlc.Report
	err := RunInTx(ctx, s.pool, s.q, func(qtx *sqlc.Queries, _ pgx.Tx) error {
		rep, err := qtx.GetReportByIDForUpdate(ctx, reportID)
		if err != nil {
			if isNotFound(err) {
				return domain.NotFound("Report not found")
			}
			return domain.Internal(err)
		}
		if rep.Status != sqlc.ReportStatusEnumOpen {
			return domain.Conflict(domain.ErrCodeConflict, "Report already resolved")
		}

		res, err := qtx.ResolveReport(ctx, sqlc.ResolveReportParams{
			ID:         rep.ID,
			Status:     status,
			ReviewedBy: &adminID,
		})
		if err != nil {
			return domain.Internal(err)
		}
		updated = res

		if req.BanUser {
			if _, err := qtx.SetUserBanned(ctx, sqlc.SetUserBannedParams{
				ID:       rep.TargetUserID,
				IsBanned: true,
			}); err != nil {
				return domain.Internal(err)
			}
			if err := qtx.SetMapHiddenByModeration(ctx, sqlc.SetMapHiddenByModerationParams{
				UserID:             rep.TargetUserID,
				HiddenByModeration: true,
			}); err != nil {
				return domain.Internal(err)
			}
		} else if status == sqlc.ReportStatusEnumDismissed {
			openCount, err := qtx.CountOpenReportsByTarget(ctx, rep.TargetUserID)
			if err != nil {
				return domain.Internal(err)
			}
			if openCount < AutoHideReportThreshold {
				if err := qtx.SetMapHiddenByModeration(ctx, sqlc.SetMapHiddenByModerationParams{
					UserID:             rep.TargetUserID,
					HiddenByModeration: false,
				}); err != nil {
					return domain.Internal(err)
				}
			}
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	return &updated, nil
}

func (s *SafetyAdminService) ListPendingPartners(ctx context.Context, limit, offset int32) ([]sqlc.Partner, error) {
	if limit <= 0 || limit > 100 {
		limit = 50
	}
	items, err := s.q.ListPendingPartners(ctx, sqlc.ListPendingPartnersParams{
		Limit:  limit,
		Offset: offset,
	})
	if err != nil {
		return nil, domain.Internal(err)
	}
	return items, nil
}

func (s *SafetyAdminService) ApprovePartner(ctx context.Context, partnerID uuid.UUID) (*sqlc.Partner, error) {
	var partner sqlc.Partner
	err := RunInTx(ctx, s.pool, s.q, func(qtx *sqlc.Queries, _ pgx.Tx) error {
		p, err := qtx.ApprovePartner(ctx, partnerID)
		if err != nil {
			if isNotFound(err) {
				return domain.NotFound("Partner not found")
			}
			return domain.Internal(err)
		}
		partner = p
		if _, err := qtx.SetUserVerified(ctx, sqlc.SetUserVerifiedParams{
			ID:         p.OwnerUserID,
			IsVerified: true,
		}); err != nil {
			return domain.Internal(err)
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	return &partner, nil
}
