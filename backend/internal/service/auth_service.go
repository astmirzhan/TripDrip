package service

import (
	"context"
	"encoding/json"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/tripdrip/backend/internal/db/sqlc"
	"github.com/tripdrip/backend/internal/domain"
	"github.com/tripdrip/backend/internal/transport/http/dto"
)

type AuthService struct {
	pool   *pgxpool.Pool
	q      *sqlc.Queries
	tokens *domain.TokenManager
}

func NewAuthService(pool *pgxpool.Pool, q *sqlc.Queries, tokens *domain.TokenManager) *AuthService {
	return &AuthService{pool: pool, q: q, tokens: tokens}
}

func (s *AuthService) Register(ctx context.Context, req dto.RegisterRequest) (*dto.AuthResponse, error) {
	if !req.PDConsent || !req.RulesConsent {
		return nil, domain.BadRequest(domain.ErrCodeValidation, "Personal data and community rules consents are required")
	}
	req.FirstName = strings.TrimSpace(req.FirstName)
	req.LastName = strings.TrimSpace(req.LastName)
	req.City = strings.TrimSpace(req.City)
	req.CountryCode = strings.ToUpper(strings.TrimSpace(req.CountryCode))

	if req.FirstName == "" || req.LastName == "" || req.City == "" {
		return nil, domain.BadRequest(domain.ErrCodeValidation, "first_name, last_name, and city are required")
	}
	if !domain.ValidateCountryCode(req.CountryCode) {
		return nil, domain.BadRequest(domain.ErrCodeValidation, "country_code must be ISO 3166-1 alpha-2")
	}
	if !domain.ValidatePassword(req.Password) {
		return nil, domain.BadRequest(domain.ErrCodeValidation, "password must be at least 8 chars with letters and digits")
	}

	var emailVal, phoneVal pgtype.Text
	if req.Email != nil && strings.TrimSpace(*req.Email) != "" {
		em := strings.ToLower(strings.TrimSpace(*req.Email))
		if !domain.ValidateEmail(em) {
			return nil, domain.BadRequest(domain.ErrCodeValidation, "invalid email address")
		}
		emailVal = pgtype.Text{String: em, Valid: true}
	}
	if req.Phone != nil && strings.TrimSpace(*req.Phone) != "" {
		ph := strings.TrimSpace(*req.Phone)
		if !domain.ValidatePhone(ph) {
			return nil, domain.BadRequest(domain.ErrCodeValidation, "invalid phone format")
		}
		phoneVal = pgtype.Text{String: ph, Valid: true}
	}
	if !emailVal.Valid && !phoneVal.Valid {
		return nil, domain.BadRequest(domain.ErrCodeValidation, "email or phone is required")
	}

	role := sqlc.UserRoleEnumTourist
	if req.CountryCode == "KZ" {
		role = sqlc.UserRoleEnumLocal
	}
	isPartnerReg := req.Role != nil && strings.ToLower(strings.TrimSpace(*req.Role)) == "partner"
	if isPartnerReg {
		role = sqlc.UserRoleEnumPartner
		if req.BrandName == nil || strings.TrimSpace(*req.BrandName) == "" ||
			req.Category == nil || strings.TrimSpace(*req.Category) == "" ||
			req.BIN == nil || !domain.ValidateKZNumber12(*req.BIN) {
			return nil, domain.BadRequest(domain.ErrCodeValidation, "partner registration requires valid brand_name, category, and 12-digit KZ BIN")
		}
	}

	pwHash, err := domain.HashPassword(req.Password)
	if err != nil {
		return nil, domain.Internal(err)
	}

	centroid, ok := domain.ResolveCentroid(req.City, derefStr(req.District))
	if !ok {
		centroid = domain.Coord{Lat: 43.238949, Lng: 76.889709}
	}

	var userID uuid.UUID
	err = RunInTx(ctx, s.pool, s.q, func(qtx *sqlc.Queries, _ pgx.Tx) error {
		user, err := qtx.CreateUser(ctx, sqlc.CreateUserParams{
			Role:         role,
			FirstName:    req.FirstName,
			LastName:     req.LastName,
			CountryCode:  req.CountryCode,
			Email:        emailVal,
			Phone:        phoneVal,
			PasswordHash: pwHash,
		})
		if err != nil {
			if isUniqueViolation(err) {
				return domain.Conflict(domain.ErrCodeConflict, "Account with this email or phone already exists")
			}
			return domain.Internal(err)
		}
		userID = user.ID

		if _, err := qtx.CreateProfile(ctx, sqlc.CreateProfileParams{
			UserID:         user.ID,
			VibePreference: sqlc.VibePrefEnumBoth,
			Hobbies:        []string{},
			Languages:      []byte("[]"),
			City:           req.City,
			District:       toPgText(req.District),
		}); err != nil {
			return domain.Internal(err)
		}

		if _, err := qtx.CreateWallet(ctx, user.ID); err != nil {
			return domain.Internal(err)
		}

		if _, err := qtx.UpsertMapPresence(ctx, sqlc.UpsertMapPresenceParams{
			UserID:    user.ID,
			City:      req.City,
			District:  toPgText(req.District),
			ApproxLat: centroid.Lat,
			ApproxLng: centroid.Lng,
			IsVisible: false,
		}); err != nil {
			return domain.Internal(err)
		}

		if isPartnerReg {
			if _, err := qtx.CreatePartner(ctx, sqlc.CreatePartnerParams{
				OwnerUserID: user.ID,
				BrandName:   strings.TrimSpace(*req.BrandName),
				Category:    strings.TrimSpace(*req.Category),
				Bin:         strings.TrimSpace(*req.BIN),
				LogoUrl:     toPgText(req.LogoURL),
			}); err != nil {
				if isUniqueViolation(err) {
					return domain.Conflict(domain.ErrCodeConflict, "Partner with this BIN already exists")
				}
				return domain.Internal(err)
			}
		}
		return nil
	})
	if err != nil {
		return nil, err
	}

	return s.buildAuthResponse(ctx, userID)
}

func (s *AuthService) Login(ctx context.Context, req dto.LoginRequest) (*dto.AuthResponse, error) {
	if req.Password == "" {
		return nil, domain.BadRequest(domain.ErrCodeValidation, "password is required")
	}

	var user sqlc.User
	var err error
	if req.Email != nil && strings.TrimSpace(*req.Email) != "" {
		user, err = s.q.GetUserByEmail(ctx, pgtype.Text{String: strings.ToLower(strings.TrimSpace(*req.Email)), Valid: true})
	} else if req.Phone != nil && strings.TrimSpace(*req.Phone) != "" {
		user, err = s.q.GetUserByPhone(ctx, pgtype.Text{String: strings.TrimSpace(*req.Phone), Valid: true})
	} else {
		return nil, domain.BadRequest(domain.ErrCodeValidation, "email or phone is required")
	}

	if err != nil {
		if isNotFound(err) {
			return nil, domain.Unauthorized(domain.ErrCodeInvalidCredentials, "Invalid credentials")
		}
		return nil, domain.Internal(err)
	}

	if user.IsBanned {
		return nil, domain.Forbidden(domain.ErrCodeUserBanned, "Account is banned")
	}
	if !domain.CheckPassword(user.PasswordHash, req.Password) {
		return nil, domain.Unauthorized(domain.ErrCodeInvalidCredentials, "Invalid credentials")
	}

	return s.buildAuthResponse(ctx, user.ID)
}

func (s *AuthService) Refresh(ctx context.Context, refreshToken string) (*dto.AuthResponse, error) {
	if strings.TrimSpace(refreshToken) == "" {
		return nil, domain.BadRequest(domain.ErrCodeValidation, "refresh_token is required")
	}
	claims, err := s.tokens.Parse(refreshToken, domain.TokenTypeRefresh)
	if err != nil {
		return nil, domain.Unauthorized(domain.ErrCodeUnauthorized, "Invalid or expired refresh token")
	}
	user, err := s.q.GetUserByID(ctx, claims.UserID)
	if err != nil {
		if isNotFound(err) {
			return nil, domain.Unauthorized(domain.ErrCodeUnauthorized, "User not found")
		}
		return nil, domain.Internal(err)
	}
	if user.IsBanned {
		return nil, domain.Forbidden(domain.ErrCodeUserBanned, "Account is banned")
	}
	return s.buildAuthResponse(ctx, user.ID)
}

func (s *AuthService) GetMe(ctx context.Context, userID uuid.UUID) (*dto.UserProfileResponse, error) {
	row, err := s.q.GetUserWithProfile(ctx, userID)
	if err != nil {
		if isNotFound(err) {
			return nil, domain.NotFound("User not found")
		}
		return nil, domain.Internal(err)
	}
	res := mapUserWithProfile(row)
	return &res, nil
}

func (s *AuthService) UpdateProfile(ctx context.Context, userID uuid.UUID, req dto.ProfileUpdateRequest) (*dto.UserProfileResponse, error) {
	current, err := s.q.GetUserWithProfile(ctx, userID)
	if err != nil {
		if isNotFound(err) {
			return nil, domain.NotFound("Profile not found")
		}
		return nil, domain.Internal(err)
	}

	params := sqlc.UpdateProfileParams{UserID: userID}

	if req.TripPurpose != nil {
		tp := sqlc.TripPurposeEnum(*req.TripPurpose)
		switch tp {
		case sqlc.TripPurposeEnumLeisure, sqlc.TripPurposeEnumWork, sqlc.TripPurposeEnumStudy, sqlc.TripPurposeEnumFamily:
			params.TripPurpose = sqlc.NullTripPurposeEnum{TripPurposeEnum: tp, Valid: true}
		default:
			return nil, domain.BadRequest(domain.ErrCodeValidation, "invalid trip_purpose")
		}
	}

	if req.TripStartDate != nil {
		t, err := time.Parse("2006-01-02", *req.TripStartDate)
		if err != nil {
			return nil, domain.BadRequest(domain.ErrCodeValidation, "trip_start_date must be YYYY-MM-DD")
		}
		params.TripStartDate = &t
	}
	if req.TripEndDate != nil {
		t, err := time.Parse("2006-01-02", *req.TripEndDate)
		if err != nil {
			return nil, domain.BadRequest(domain.ErrCodeValidation, "trip_end_date must be YYYY-MM-DD")
		}
		params.TripEndDate = &t
	}
	effectiveStart := current.TripStartDate
	if params.TripStartDate != nil {
		effectiveStart = params.TripStartDate
	}
	effectiveEnd := current.TripEndDate
	if params.TripEndDate != nil {
		effectiveEnd = params.TripEndDate
	}
	if effectiveStart != nil && effectiveEnd != nil && effectiveEnd.Before(*effectiveStart) {
		return nil, domain.BadRequest(domain.ErrCodeValidation, "trip_end_date cannot be before trip_start_date")
	}

	if req.VibePreference != nil {
		vp, err := validateVibe(*req.VibePreference)
		if err != nil {
			return nil, err
		}
		params.VibePreference = sqlc.NullVibePrefEnum{VibePrefEnum: vp, Valid: true}
	}
	if req.Hobbies != nil {
		params.Hobbies = req.Hobbies
	}
	if req.Languages != nil {
		b, err := json.Marshal(req.Languages)
		if err != nil {
			return nil, domain.BadRequest(domain.ErrCodeValidation, "invalid languages format")
		}
		params.Languages = b
	}
	if req.City != nil {
		city := strings.TrimSpace(*req.City)
		if city == "" {
			return nil, domain.BadRequest(domain.ErrCodeValidation, "city cannot be empty")
		}
		params.City = pgtype.Text{String: city, Valid: true}
	}
	if req.District != nil {
		params.District = toPgText(req.District)
	}
	if req.Expectations != nil {
		if len([]rune(*req.Expectations)) > 240 {
			return nil, domain.BadRequest(domain.ErrCodeValidation, "expectations max length is 240 chars")
		}
		params.Expectations = toPgText(req.Expectations)
	}
	if req.ReadyForNetworking != nil {
		params.ReadyForNetworking = pgtype.Bool{Bool: *req.ReadyForNetworking, Valid: true}
	}
	if req.CanHostGuests != nil {
		if *req.CanHostGuests {
			// MVP policy: hosting guests is locked until local accumulates sufficient rating & completed Qonaq helps.
			if current.Role != sqlc.UserRoleEnumLocal || current.QonaqCompletedCount < 3 || numericToFloat(current.RatingAvg) < 4.5 {
				return nil, domain.Forbidden(domain.ErrCodeCannotHostNoRating, "Hosting guests is locked until 3+ completed Qonaq helps and 4.5+ rating")
			}
		}
		params.CanHostGuests = pgtype.Bool{Bool: *req.CanHostGuests, Valid: true}
	}

	err = RunInTx(ctx, s.pool, s.q, func(qtx *sqlc.Queries, _ pgx.Tx) error {
		if _, err := qtx.UpdateProfile(ctx, params); err != nil {
			return domain.Internal(err)
		}
		if req.AvatarURL != nil {
			if _, err := qtx.UpdateUserAvatar(ctx, sqlc.UpdateUserAvatarParams{
				ID:        userID,
				AvatarUrl: toPgText(req.AvatarURL),
			}); err != nil {
				return domain.Internal(err)
			}
		}
		return nil
	})
	if err != nil {
		return nil, err
	}

	return s.GetMe(ctx, userID)
}

func (s *AuthService) DeleteMe(ctx context.Context, userID uuid.UUID) error {
	return RunInTx(ctx, s.pool, s.q, func(qtx *sqlc.Queries, _ pgx.Tx) error {
		if err := qtx.DeleteVerificationsByUser(ctx, userID); err != nil {
			return domain.Internal(err)
		}
		if err := qtx.DeleteMapPresenceByUser(ctx, userID); err != nil {
			return domain.Internal(err)
		}
		if err := qtx.DeleteProfileByUserID(ctx, userID); err != nil {
			return domain.Internal(err)
		}
		if err := qtx.SoftDeleteUser(ctx, userID); err != nil {
			return domain.Internal(err)
		}
		return nil
	})
}

func (s *AuthService) buildAuthResponse(ctx context.Context, userID uuid.UUID) (*dto.AuthResponse, error) {
	row, err := s.q.GetUserWithProfile(ctx, userID)
	if err != nil {
		return nil, domain.Internal(err)
	}
	pair, err := s.tokens.GeneratePair(row.ID, string(row.Role), row.IsVerified)
	if err != nil {
		return nil, domain.Internal(err)
	}
	return &dto.AuthResponse{
		User:         mapUserWithProfile(row),
		AccessToken:  pair.AccessToken,
		RefreshToken: pair.RefreshToken,
		ExpiresIn:    pair.ExpiresIn,
	}, nil
}

func derefStr(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}
