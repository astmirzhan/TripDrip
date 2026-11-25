package service

import (
	"context"
	"fmt"
	"math/rand/v2"
	"sort"
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
	RouteCompletionRewardCoins int32 = 30
	MinRouteStops                    = 3
	MaxRouteStops                    = 5
)

type RouteService struct {
	pool *pgxpool.Pool
	q    *sqlc.Queries
}

func NewRouteService(pool *pgxpool.Pool, q *sqlc.Queries) *RouteService {
	return &RouteService{pool: pool, q: q}
}

func (s *RouteService) GenerateRoute(ctx context.Context, userID uuid.UUID, req dto.GenerateRouteRequest) (*dto.RouteResponse, error) {
	req.City = strings.TrimSpace(req.City)
	if req.City == "" {
		return nil, domain.BadRequest(domain.ErrCodeValidation, "city is required")
	}
	if req.VibePreference == "" {
		req.VibePreference = "both"
	}
	vibe, err := validateVibe(req.VibePreference)
	if err != nil {
		return nil, err
	}

	candidates, err := s.q.ListRouteCandidatePoints(ctx, sqlc.ListRouteCandidatePointsParams{
		City: req.City,
		Vibe: string(vibe),
	})
	if err != nil {
		return nil, domain.Internal(err)
	}
	if len(candidates) == 0 {
		return nil, domain.NotFound("No map points available in this city yet")
	}

	visitedLandmarks, err := s.q.ListVisitedLandmarkIDsByUser(ctx, userID)
	if err != nil {
		return nil, domain.Internal(err)
	}
	visitedSet := make(map[uuid.UUID]struct{}, len(visitedLandmarks))
	for _, id := range visitedLandmarks {
		visitedSet[id] = struct{}{}
	}

	todayPartners, err := s.q.ListTodayCheckedInPartnerIDsByUser(ctx, userID)
	if err != nil {
		return nil, domain.Internal(err)
	}
	checkedPartnerSet := make(map[uuid.UUID]struct{}, len(todayPartners))
	for _, id := range todayPartners {
		if id != nil {
			checkedPartnerSet[*id] = struct{}{}
		}
	}

	type scoredCandidate struct {
		point        sqlc.ListRouteCandidatePointsRow
		corridorDist float64
		originDist   float64
		score        float64
	}

	var scored []scoredCandidate
	for _, pt := range candidates {
		if pt.PointType == sqlc.PointTypeEnumLandmark {
			if _, visited := visitedSet[pt.ID]; visited {
				continue
			}
		} else if pt.PointType == sqlc.PointTypeEnumPartner && pt.PartnerID != nil {
			if _, visitedToday := checkedPartnerSet[*pt.PartnerID]; visitedToday {
				continue
			}
		}
		corridor := domain.DistanceToSegmentMeters(pt.Lat, pt.Lng, req.OriginLat, req.OriginLng, req.DestLat, req.DestLng)
		origDist := domain.HaversineMeters(req.OriginLat, req.OriginLng, pt.Lat, pt.Lng)

		// Lower score is better; boosted points and partner points get a priority bonus,
		// plus controlled jitter to spread tourist traffic across different stops.
		score := corridor + rand.Float64()*800.0
		if pt.IsBoosted {
			score -= 1200.0
		}
		if pt.PointType == sqlc.PointTypeEnumPartner {
			score -= 400.0
		}
		scored = append(scored, scoredCandidate{
			point:        pt,
			corridorDist: corridor,
			originDist:   origDist,
			score:        score,
		})
	}

	// Fallback: if all unvisited stops were exhausted, allow remaining candidates
	if len(scored) == 0 {
		for _, pt := range candidates {
			corridor := domain.DistanceToSegmentMeters(pt.Lat, pt.Lng, req.OriginLat, req.OriginLng, req.DestLat, req.DestLng)
			origDist := domain.HaversineMeters(req.OriginLat, req.OriginLng, pt.Lat, pt.Lng)
			score := corridor + rand.Float64()*800.0
			if pt.IsBoosted {
				score -= 1200.0
			}
			scored = append(scored, scoredCandidate{point: pt, corridorDist: corridor, originDist: origDist, score: score})
		}
	}

	sort.Slice(scored, func(i, j int) bool {
		return scored[i].score < scored[j].score
	})

	targetCount := MaxRouteStops
	if len(scored) < targetCount {
		targetCount = len(scored)
	}

	// Select up to targetCount stops while enforcing at most one branch per partner brand.
	selected := make([]scoredCandidate, 0, targetCount)
	usedBrands := make(map[uuid.UUID]struct{})
	hasPartner := false
	for _, c := range scored {
		if len(selected) >= targetCount {
			break
		}
		if c.point.PointType == sqlc.PointTypeEnumPartner && c.point.PartnerID != nil {
			if _, exists := usedBrands[*c.point.PartnerID]; exists {
				continue
			}
			usedBrands[*c.point.PartnerID] = struct{}{}
			hasPartner = true
		}
		selected = append(selected, c)
	}

	// Ensure at least one partner stop is included if available
	if !hasPartner && len(selected) > 0 {
		for _, c := range scored {
			if c.point.PointType == sqlc.PointTypeEnumPartner && c.point.PartnerID != nil {
				if _, exists := usedBrands[*c.point.PartnerID]; !exists {
					selected[len(selected)-1] = c
					break
				}
			}
		}
	}

	// Order selected stops naturally from origin toward destination
	sort.Slice(selected, func(i, j int) bool {
		return selected[i].originDist < selected[j].originDist
	})

	var routeID uuid.UUID
	err = RunInTx(ctx, s.pool, s.q, func(qtx *sqlc.Queries, _ pgx.Tx) error {
		if err := qtx.AbandonActiveRoutesByUser(ctx, userID); err != nil {
			return domain.Internal(err)
		}
		route, err := qtx.CreateUserRoute(ctx, sqlc.CreateUserRouteParams{
			UserID:                userID,
			City:                  req.City,
			OriginLat:             req.OriginLat,
			OriginLng:             req.OriginLng,
			DestLat:               req.DestLat,
			DestLng:               req.DestLng,
			VibePreference:        vibe,
			CompletionRewardCoins: RouteCompletionRewardCoins,
		})
		if err != nil {
			return domain.Internal(err)
		}
		routeID = route.ID

		for idx, item := range selected {
			if _, err := qtx.CreateUserRouteStop(ctx, sqlc.CreateUserRouteStopParams{
				RouteID:   route.ID,
				PointID:   item.point.ID,
				StopOrder: int16(idx + 1),
			}); err != nil {
				return domain.Internal(err)
			}
		}
		return nil
	})
	if err != nil {
		return nil, err
	}

	return s.GetRouteByID(ctx, routeID)
}

func (s *RouteService) GetActiveRoute(ctx context.Context, userID uuid.UUID) (*dto.RouteResponse, error) {
	route, err := s.q.GetActiveRouteByUser(ctx, userID)
	if err != nil {
		if isNotFound(err) {
			return nil, domain.NotFound("No active route found")
		}
		return nil, domain.Internal(err)
	}
	return s.buildRouteResponse(ctx, route)
}

func (s *RouteService) GetRouteByID(ctx context.Context, routeID uuid.UUID) (*dto.RouteResponse, error) {
	// Read using GetActiveRoute or direct list; using active route check via stops
	var route sqlc.UserRoute
	err := s.pool.QueryRow(ctx,
		`SELECT id, user_id, city, origin_lat, origin_lng, dest_lat, dest_lng, vibe_preference, status, completion_reward_coins, created_at, completed_at FROM user_routes WHERE id = $1`,
		routeID,
	).Scan(
		&route.ID, &route.UserID, &route.City, &route.OriginLat, &route.OriginLng,
		&route.DestLat, &route.DestLng, &route.VibePreference, &route.Status,
		&route.CompletionRewardCoins, &route.CreatedAt, &route.CompletedAt,
	)
	if err != nil {
		if isNotFound(err) {
			return nil, domain.NotFound("Route not found")
		}
		return nil, domain.Internal(err)
	}
	return s.buildRouteResponse(ctx, route)
}

func (s *RouteService) buildRouteResponse(ctx context.Context, route sqlc.UserRoute) (*dto.RouteResponse, error) {
	stops, err := s.q.ListStopsWithPointByRoute(ctx, route.ID)
	if err != nil {
		return nil, domain.Internal(err)
	}
	stopDTOs := make([]dto.RouteStopResponse, 0, len(stops))
	for _, st := range stops {
		stopDTOs = append(stopDTOs, dto.RouteStopResponse{
			PointID:           st.PointID,
			StopOrder:         st.StopOrder,
			PointType:         string(st.PointType),
			PartnerLocationID: st.PartnerLocationID,
			Name:              st.Name,
			Description:       fromPgText(st.Description),
			City:              st.City,
			Vibe:              string(st.Vibe),
			Lat:               st.Lat,
			Lng:               st.Lng,
			RadiusMeters:      st.RadiusMeters,
			RewardCoins:       st.RewardCoins,
			IsBoosted:         st.IsBoosted,
			IsVisited:         st.IsVisited,
			VisitedAt:         st.VisitedAt,
		})
	}
	return &dto.RouteResponse{
		ID:                    route.ID,
		UserID:                route.UserID,
		City:                  route.City,
		OriginLat:             route.OriginLat,
		OriginLng:             route.OriginLng,
		DestLat:               route.DestLat,
		DestLng:               route.DestLng,
		VibePreference:        string(route.VibePreference),
		Status:                string(route.Status),
		CompletionRewardCoins: route.CompletionRewardCoins,
		Stops:                 stopDTOs,
		CreatedAt:             route.CreatedAt,
		CompletedAt:           route.CompletedAt,
	}, nil
}

func (s *RouteService) CheckIn(ctx context.Context, userID, routeID, pointID uuid.UUID, req dto.CheckinRequest) (*dto.CheckinResponse, error) {
	var resp dto.CheckinResponse

	err := RunInTx(ctx, s.pool, s.q, func(qtx *sqlc.Queries, _ pgx.Tx) error {
		route, err := qtx.GetUserRouteByIDForUpdate(ctx, routeID)
		if err != nil {
			if isNotFound(err) {
				return domain.NotFound("Route not found")
			}
			return domain.Internal(err)
		}
		if route.UserID != userID {
			return domain.Forbidden(domain.ErrCodeForbidden, "Route belongs to another user")
		}
		if route.Status != sqlc.RouteStatusEnumActive {
			return domain.BadRequest(domain.ErrCodeValidation, "Route is not active")
		}

		pointInfo, err := qtx.GetMapPointPartnerInfo(ctx, pointID)
		if err != nil {
			if isNotFound(err) {
				return domain.NotFound("Map point not found")
			}
			return domain.Internal(err)
		}
		if !pointInfo.IsActive {
			return domain.BadRequest(domain.ErrCodeValidation, "Map point is inactive")
		}

		// 1. Anti-fraud: Haversine radius check
		if dist, ok := domain.ValidateCheckinRange(req.UserLat, req.UserLng, pointInfo.Lat, pointInfo.Lng, int(pointInfo.RadiusMeters)); !ok {
			return domain.BadRequest(domain.ErrCodeCheckinOutOfRange, fmt.Sprintf("Too far from point (%.0fm away, max %dm)", dist, pointInfo.RadiusMeters))
		}

		// 2. Anti-fraud: Speed anomaly check against last check-in
		now := time.Now().UTC()
		if lastCheckin, err := qtx.GetLatestCheckinByUser(ctx, userID); err == nil {
			if speedKmh, ok := domain.ValidateTravelSpeed(lastCheckin.UserLat, lastCheckin.UserLng, lastCheckin.CheckedInAt, req.UserLat, req.UserLng, now); !ok {
				return domain.BadRequest(domain.ErrCodeCheckinSpeedAnomaly, fmt.Sprintf("Impossible travel speed detected (%.0f km/h)", speedKmh))
			}
		} else if !isNotFound(err) {
			return domain.Internal(err)
		}

		// 3. Mark stop visited (must belong to route and not already visited)
		if _, err := qtx.MarkRouteStopVisited(ctx, sqlc.MarkRouteStopVisitedParams{
			RouteID: route.ID,
			PointID: pointInfo.ID,
		}); err != nil {
			if isNotFound(err) {
				return domain.Conflict(domain.ErrCodeCheckinDuplicate, "Stop is not part of this route or already visited")
			}
			return domain.Internal(err)
		}

		// Lock wallet before awarding coins
		if _, err := qtx.GetWalletForUpdate(ctx, userID); err != nil {
			return domain.Internal(err)
		}

		// 4. Insert point_checkin (partial unique indexes enforce once-per-landmark and once-daily-per-partner)
		var partnerID *uuid.UUID
		if pointInfo.PointType == sqlc.PointTypeEnumPartner && pointInfo.PartnerID != nil {
			partnerID = pointInfo.PartnerID
		}
		checkin, err := qtx.CreatePointCheckin(ctx, sqlc.CreatePointCheckinParams{
			UserID:    userID,
			PointID:   pointInfo.ID,
			PointType: pointInfo.PointType,
			PartnerID: partnerID,
			RouteID:   &route.ID,
			UserLat:   req.UserLat,
			UserLng:   req.UserLng,
		})
		if err != nil {
			if isUniqueViolation(err) {
				return domain.Conflict(domain.ErrCodeCheckinDuplicate, "Already checked in at this point/partner")
			}
			return domain.Internal(err)
		}

		// 5. Award coins for point check-in
		pointReward := pointInfo.RewardCoins
		reason := sqlc.CoinReasonEnumLandmarkCheckin
		var idemKey string
		if pointInfo.PointType == sqlc.PointTypeEnumPartner {
			reason = sqlc.CoinReasonEnumPartnerVisit
			if pointReward <= 0 {
				pointReward = PartnerVisitRewardCoins
			}
			idemKey = fmt.Sprintf("partner_visit:%s:%v:%s", userID, partnerID, now.Format("2006-01-02"))
		} else {
			if pointReward <= 0 {
				pointReward = 10
			}
			idemKey = fmt.Sprintf("landmark_checkin:%s:%s", userID, pointInfo.ID)
		}

		var totalDelta int32
		if pointReward > 0 {
			if _, err := qtx.CreateCoinTransaction(ctx, sqlc.CreateCoinTransactionParams{
				UserID:         userID,
				Amount:         pointReward,
				Reason:         reason,
				ReferenceID:    &checkin.ID,
				IdempotencyKey: idemKey,
			}); err != nil {
				return domain.Internal(err)
			}
			totalDelta += pointReward
		}

		// 6. Check if all route stops are visited -> complete route & award completion bonus
		unvisited, err := qtx.CountUnvisitedStopsByRoute(ctx, route.ID)
		if err != nil {
			return domain.Internal(err)
		}
		var routeCompleted bool
		var routeBonus int32
		if unvisited == 0 {
			if _, err := qtx.CompleteUserRoute(ctx, route.ID); err != nil {
				return domain.Internal(err)
			}
			routeCompleted = true
			routeBonus = route.CompletionRewardCoins
			if routeBonus > 0 {
				if _, err := qtx.CreateCoinTransaction(ctx, sqlc.CreateCoinTransactionParams{
					UserID:         userID,
					Amount:         routeBonus,
					Reason:         sqlc.CoinReasonEnumRouteCompleted,
					ReferenceID:    &route.ID,
					IdempotencyKey: fmt.Sprintf("route_completed:%s:%s", userID, route.ID),
				}); err != nil {
					return domain.Internal(err)
				}
				totalDelta += routeBonus
			}
		}

		wallet, err := qtx.UpdateWalletBalance(ctx, sqlc.UpdateWalletBalanceParams{
			Delta:  totalDelta,
			UserID: userID,
		})
		if err != nil {
			return domain.Internal(err)
		}

		resp = dto.CheckinResponse{
			CheckinID:      checkin.ID,
			CoinsAwarded:   pointReward,
			RouteCompleted: routeCompleted,
			RouteBonus:     routeBonus,
			NewBalance:     wallet.Balance,
		}
		return nil
	})
	if err != nil {
		return nil, err
	}
	return &resp, nil
}
