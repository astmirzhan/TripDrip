package service

import (
	"encoding/json"
	"errors"
	"fmt"
	"math"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/tripdrip/backend/internal/db/sqlc"
	"github.com/tripdrip/backend/internal/domain"
	"github.com/tripdrip/backend/internal/transport/http/dto"
)

func toPgText(s *string) pgtype.Text {
	if s == nil {
		return pgtype.Text{Valid: false}
	}
	trimmed := strings.TrimSpace(*s)
	if trimmed == "" {
		return pgtype.Text{Valid: false}
	}
	return pgtype.Text{String: trimmed, Valid: true}
}

func toPgTextVal(s string) pgtype.Text {
	trimmed := strings.TrimSpace(s)
	if trimmed == "" {
		return pgtype.Text{Valid: false}
	}
	return pgtype.Text{String: trimmed, Valid: true}
}

func fromPgText(t pgtype.Text) *string {
	if !t.Valid {
		return nil
	}
	v := t.String
	return &v
}

func numericToString(n pgtype.Numeric) string {
	if !n.Valid || n.Int == nil {
		return "0.00"
	}
	f, err := n.Float64Value()
	if err != nil || !f.Valid {
		return "0.00"
	}
	return fmt.Sprintf("%.2f", f.Float64)
}

func numericToFloat(n pgtype.Numeric) float64 {
	if !n.Valid || n.Int == nil {
		return 0
	}
	f, err := n.Float64Value()
	if err != nil || !f.Valid {
		return 0
	}
	return math.Round(f.Float64*100) / 100
}

func decodeLanguages(raw []byte) []dto.LanguageSkill {
	if len(raw) == 0 {
		return []dto.LanguageSkill{}
	}
	var out []dto.LanguageSkill
	if err := json.Unmarshal(raw, &out); err != nil || out == nil {
		return []dto.LanguageSkill{}
	}
	return out
}

func isUniqueViolation(err error) bool {
	var pgErr *pgconn.PgError
	return errors.As(err, &pgErr) && pgErr.Code == "23505"
}

func isNotFound(err error) bool {
	return errors.Is(err, pgx.ErrNoRows)
}

func mapUserWithProfile(row sqlc.GetUserWithProfileRow) dto.UserProfileResponse {
	var tripPurpose *string
	if row.TripPurpose.Valid {
		s := string(row.TripPurpose.TripPurposeEnum)
		tripPurpose = &s
	}
	var startDate, endDate *string
	if row.TripStartDate != nil {
		s := row.TripStartDate.Format("2006-01-02")
		startDate = &s
	}
	if row.TripEndDate != nil {
		s := row.TripEndDate.Format("2006-01-02")
		endDate = &s
	}
	hobbies := row.Hobbies
	if hobbies == nil {
		hobbies = []string{}
	}

	return dto.UserProfileResponse{
		ID:                  row.ID,
		Role:                string(row.Role),
		FirstName:           row.FirstName,
		LastName:            row.LastName,
		CountryCode:         row.CountryCode,
		Email:               fromPgText(row.Email),
		Phone:               fromPgText(row.Phone),
		AvatarURL:           fromPgText(row.AvatarUrl),
		IsVerified:          row.IsVerified,
		IsBanned:            row.IsBanned,
		TripPurpose:         tripPurpose,
		TripStartDate:       startDate,
		TripEndDate:         endDate,
		VibePreference:      string(row.VibePreference),
		Hobbies:             hobbies,
		Languages:           decodeLanguages(row.Languages),
		City:                row.City,
		District:            fromPgText(row.District),
		Expectations:        fromPgText(row.Expectations),
		ReadyForNetworking:  row.ReadyForNetworking,
		CanHostGuests:       row.CanHostGuests,
		QonaqCompletedCount: row.QonaqCompletedCount,
		RatingAvg:           numericToString(row.RatingAvg),
		RatingCount:         row.RatingCount,
		CreatedAt:           row.CreatedAt,
	}
}

func validateVibe(v string) (sqlc.VibePrefEnum, error) {
	switch sqlc.VibePrefEnum(v) {
	case sqlc.VibePrefEnumNature, sqlc.VibePrefEnumMegapolis, sqlc.VibePrefEnumBoth:
		return sqlc.VibePrefEnum(v), nil
	default:
		return "", domain.BadRequest(domain.ErrCodeValidation, "vibe must be one of: nature, megapolis, both")
	}
}
