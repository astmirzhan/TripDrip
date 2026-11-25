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

const PartnerVisitRewardCoins int32 = 20

type PartnerService struct {
	pool *pgxpool.Pool
	q    *sqlc.Queries
}

func NewPartnerService(pool *pgxpool.Pool, q *sqlc.Queries) *PartnerService {
	return &PartnerService{pool: pool, q: q}
}

type PartnerProfileDetails struct {
	Partner   sqlc.Partner           `json:"partner"`
	Locations []sqlc.PartnerLocation `json:"locations"`
	Offers    []sqlc.Offer           `json:"offers"`
}

func (s *PartnerService) GetProfile(ctx context.Context, ownerUserID uuid.UUID) (*PartnerProfileDetails, error) {
	partner, err := s.q.GetPartnerByOwnerID(ctx, ownerUserID)
	if err != nil {
		if isNotFound(err) {
			return nil, domain.NotFound("Partner profile not found")
		}
		return nil, domain.Internal(err)
	}
	locs, err := s.q.ListLocationsByPartner(ctx, partner.ID)
	if err != nil {
		return nil, domain.Internal(err)
	}
	offers, err := s.q.ListOffersByPartner(ctx, partner.ID)
	if err != nil {
		return nil, domain.Internal(err)
	}
	return &PartnerProfileDetails{
		Partner:   partner,
		Locations: locs,
		Offers:    offers,
	}, nil
}

func (s *PartnerService) CreateProfile(ctx context.Context, ownerUserID uuid.UUID, req dto.CreatePartnerProfileRequest) (*sqlc.Partner, error) {
	req.BrandName = strings.TrimSpace(req.BrandName)
	req.Category = strings.TrimSpace(req.Category)
	req.BIN = strings.TrimSpace(req.BIN)
	if req.BrandName == "" || req.Category == "" || !domain.ValidateKZNumber12(req.BIN) {
		return nil, domain.BadRequest(domain.ErrCodeValidation, "brand_name, category, and valid 12-digit KZ BIN are required")
	}
	p, err := s.q.CreatePartner(ctx, sqlc.CreatePartnerParams{
		OwnerUserID: ownerUserID,
		BrandName:   req.BrandName,
		Category:    req.Category,
		Bin:         req.BIN,
		LogoUrl:     toPgText(req.LogoURL),
	})
	if err != nil {
		if isUniqueViolation(err) {
			return nil, domain.Conflict(domain.ErrCodeConflict, "Partner profile or BIN already exists")
		}
		return nil, domain.Internal(err)
	}
	return &p, nil
}

func (s *PartnerService) AddLocation(ctx context.Context, ownerUserID uuid.UUID, req dto.CreatePartnerLocationRequest) (*sqlc.PartnerLocation, error) {
	partner, err := s.q.GetPartnerByOwnerID(ctx, ownerUserID)
	if err != nil {
		if isNotFound(err) {
			return nil, domain.NotFound("Partner profile not found")
		}
		return nil, domain.Internal(err)
	}

	req.BranchName = strings.TrimSpace(req.BranchName)
	req.City = strings.TrimSpace(req.City)
	req.Address = strings.TrimSpace(req.Address)
	if req.BranchName == "" || req.City == "" || req.Address == "" {
		return nil, domain.BadRequest(domain.ErrCodeValidation, "branch_name, city, and address are required")
	}
	if req.Vibe == "" {
		req.Vibe = "both"
	}
	vibe, err := validateVibe(req.Vibe)
	if err != nil {
		return nil, err
	}
	radius := req.RadiusMeters
	if radius <= 0 {
		radius = domain.DefaultCheckinRadiusMeters
	}

	var created sqlc.PartnerLocation
	err = RunInTx(ctx, s.pool, s.q, func(qtx *sqlc.Queries, _ pgx.Tx) error {
		loc, err := qtx.CreatePartnerLocation(ctx, sqlc.CreatePartnerLocationParams{
			PartnerID:  partner.ID,
			BranchName: req.BranchName,
			City:       req.City,
			Address:    req.Address,
			Lat:        req.Lat,
			Lng:        req.Lng,
		})
		if err != nil {
			return domain.Internal(err)
		}
		created = loc

		pointName := fmt.Sprintf("%s — %s", partner.BrandName, loc.BranchName)
		if _, err := qtx.CreatePartnerMapPoint(ctx, sqlc.CreatePartnerMapPointParams{
			PartnerLocationID: &loc.ID,
			Name:              pointName,
			Description:       toPgText(req.Description),
			City:              loc.City,
			Vibe:              vibe,
			Lat:               loc.Lat,
			Lng:               loc.Lng,
			RadiusMeters:      radius,
			RewardCoins:       PartnerVisitRewardCoins,
			IsBoosted:         req.IsBoosted,
		}); err != nil {
			return domain.Internal(err)
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	return &created, nil
}

func (s *PartnerService) CreateOffer(ctx context.Context, ownerUserID uuid.UUID, req dto.CreateOfferRequest) (*sqlc.Offer, error) {
	partner, err := s.q.GetPartnerByOwnerID(ctx, ownerUserID)
	if err != nil {
		if isNotFound(err) {
			return nil, domain.NotFound("Partner profile not found")
		}
		return nil, domain.Internal(err)
	}
	if !partner.IsApproved {
		return nil, domain.Forbidden(domain.ErrCodePartnerNotApproved, "Partner must be approved by admin before publishing offers")
	}

	req.Title = strings.TrimSpace(req.Title)
	if req.Title == "" || req.DiscountPercent < 1 || req.DiscountPercent > 100 || req.CoinCost <= 0 || req.TotalLimit <= 0 {
		return nil, domain.BadRequest(domain.ErrCodeValidation, "invalid offer fields")
	}

	offer, err := s.q.CreateOffer(ctx, sqlc.CreateOfferParams{
		PartnerID:       partner.ID,
		Title:           req.Title,
		Description:     toPgText(req.Description),
		DiscountPercent: req.DiscountPercent,
		CoinCost:        req.CoinCost,
		TotalLimit:      req.TotalLimit,
	})
	if err != nil {
		return nil, domain.Internal(err)
	}
	return &offer, nil
}

func (s *PartnerService) RedeemPromo(ctx context.Context, partnerUserID uuid.UUID, req dto.RedeemPromoRequest) (*sqlc.PromoCode, error) {
	partner, err := s.q.GetPartnerByOwnerID(ctx, partnerUserID)
	if err != nil {
		if isNotFound(err) {
			return nil, domain.NotFound("Partner profile not found")
		}
		return nil, domain.Internal(err)
	}
	if !partner.IsApproved {
		return nil, domain.Forbidden(domain.ErrCodePartnerNotApproved, "Partner is not approved")
	}

	loc, err := s.q.GetPartnerLocationByID(ctx, req.LocationID)
	if err != nil || loc.PartnerID != partner.ID {
		return nil, domain.Forbidden(domain.ErrCodeForbidden, "Location does not belong to this partner")
	}

	code := strings.ToUpper(strings.TrimSpace(req.Code))
	if code == "" {
		return nil, domain.BadRequest(domain.ErrCodeValidation, "promo code is required")
	}

	redeemed, err := s.q.RedeemPromoCodeAtomic(ctx, sqlc.RedeemPromoCodeAtomicParams{
		LocationID:       &loc.ID,
		RedeemedByUserID: &partnerUserID,
		Code:             code,
		PartnerID:        partner.ID,
	})
	if err != nil {
		if isNotFound(err) {
			// Distinguish exact failure reason for helpful UX
			existing, lookupErr := s.q.GetPromoCodeByCode(ctx, code)
			if lookupErr != nil || existing.PartnerID != partner.ID {
				return nil, domain.BadRequest(domain.ErrCodePromoInvalid, "Promo code is invalid for this partner")
			}
			if existing.Status == sqlc.PromoStatusEnumRedeemed {
				return nil, domain.Conflict(domain.ErrCodePromoAlreadyRedeemed, "Promo code has already been redeemed")
			}
			return nil, domain.BadRequest(domain.ErrCodePromoExpired, "Promo code has expired")
		}
		return nil, domain.Internal(err)
	}

	return &redeemed, nil
}

type ConfirmVisitResult struct {
	CheckinID    uuid.UUID `json:"checkin_id"`
	CoinsAwarded int32     `json:"coins_awarded"`
	NewBalance   int32     `json:"new_balance"`
}

func (s *PartnerService) ConfirmVisit(ctx context.Context, partnerUserID uuid.UUID, req dto.ConfirmVisitRequest) (*ConfirmVisitResult, error) {
	partner, err := s.q.GetPartnerByOwnerID(ctx, partnerUserID)
	if err != nil {
		if isNotFound(err) {
			return nil, domain.NotFound("Partner profile not found")
		}
		return nil, domain.Internal(err)
	}
	if !partner.IsApproved {
		return nil, domain.Forbidden(domain.ErrCodePartnerNotApproved, "Partner is not approved")
	}

	loc, err := s.q.GetPartnerLocationByID(ctx, req.LocationID)
	if err != nil || loc.PartnerID != partner.ID {
		return nil, domain.Forbidden(domain.ErrCodeForbidden, "Location does not belong to this partner")
	}

	point, err := s.q.GetMapPointByID(ctx, req.PointID)
	if err != nil {
		if isNotFound(err) {
			return nil, domain.NotFound("Map point not found")
		}
		return nil, domain.Internal(err)
	}
	if point.PointType != sqlc.PointTypeEnumPartner || point.PartnerLocationID == nil || *point.PartnerLocationID != loc.ID {
		return nil, domain.BadRequest(domain.ErrCodeValidation, "Point does not match the specified partner location")
	}

	var result ConfirmVisitResult
	err = RunInTx(ctx, s.pool, s.q, func(qtx *sqlc.Queries, _ pgx.Tx) error {
		guest, err := qtx.GetUserByID(ctx, req.UserID)
		if err != nil {
			if isNotFound(err) {
				return domain.NotFound("Guest user not found")
			}
			return domain.Internal(err)
		}
		if guest.IsBanned || !guest.IsVerified {
			return domain.Forbidden(domain.ErrCodeUserNotVerified, "Guest user is not verified or is banned")
		}

		if _, err := qtx.GetWalletForUpdate(ctx, guest.ID); err != nil {
			return domain.Internal(err)
		}

		checkin, err := qtx.CreatePointCheckin(ctx, sqlc.CreatePointCheckinParams{
			UserID:    guest.ID,
			PointID:   point.ID,
			PointType: sqlc.PointTypeEnumPartner,
			PartnerID: &partner.ID,
			UserLat:   loc.Lat,
			UserLng:   loc.Lng,
		})
		if err != nil {
			if isUniqueViolation(err) {
				return domain.Conflict(domain.ErrCodeCheckinDuplicate, "Partner visit already confirmed today for this brand")
			}
			return domain.Internal(err)
		}

		reward := PartnerVisitRewardCoins
		if point.RewardCoins > 0 {
			reward = point.RewardCoins
		}

		today := time.Now().UTC().Format("2006-01-02")
		idemKey := fmt.Sprintf("partner_visit:%s:%s:%s", guest.ID, partner.ID, today)
		if _, err := qtx.CreateCoinTransaction(ctx, sqlc.CreateCoinTransactionParams{
			UserID:         guest.ID,
			Amount:         reward,
			Reason:         sqlc.CoinReasonEnumPartnerVisit,
			ReferenceID:    &checkin.ID,
			IdempotencyKey: idemKey,
		}); err != nil {
			return domain.Internal(err)
		}

		wallet, err := qtx.UpdateWalletBalance(ctx, sqlc.UpdateWalletBalanceParams{
			Delta:  reward,
			UserID: guest.ID,
		})
		if err != nil {
			return domain.Internal(err)
		}

		result = ConfirmVisitResult{
			CheckinID:    checkin.ID,
			CoinsAwarded: reward,
			NewBalance:   wallet.Balance,
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	return &result, nil
}

type PartnerStatsResponse struct {
	TotalRedeemed int64                           `json:"total_redeemed"`
	TotalVisits   int64                           `json:"total_visits"`
	ByLocation    []sqlc.GetPartnerStatsByLocationRow `json:"by_location"`
	ByCountry     []sqlc.GetPartnerStatsByCountryRow  `json:"by_country"`
}

func (s *PartnerService) GetStats(ctx context.Context, partnerUserID uuid.UUID) (*PartnerStatsResponse, error) {
	partner, err := s.q.GetPartnerByOwnerID(ctx, partnerUserID)
	if err != nil {
		if isNotFound(err) {
			return nil, domain.NotFound("Partner profile not found")
		}
		return nil, domain.Internal(err)
	}

	totalRedeemed, err := s.q.GetPartnerRedemptionTotal(ctx, partner.ID)
	if err != nil {
		return nil, domain.Internal(err)
	}
	totalVisits, err := s.q.GetPartnerVisitsCount(ctx, &partner.ID)
	if err != nil {
		return nil, domain.Internal(err)
	}
	byLoc, err := s.q.GetPartnerStatsByLocation(ctx, partner.ID)
	if err != nil {
		return nil, domain.Internal(err)
	}
	byCountry, err := s.q.GetPartnerStatsByCountry(ctx, partner.ID)
	if err != nil {
		return nil, domain.Internal(err)
	}

	return &PartnerStatsResponse{
		TotalRedeemed: totalRedeemed,
		TotalVisits:   totalVisits,
		ByLocation:    byLoc,
		ByCountry:     byCountry,
	}, nil
}
