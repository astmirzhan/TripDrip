package service

import (
	"context"
	"strings"

	"github.com/google/uuid"
	"github.com/tripdrip/backend/internal/db/sqlc"
	"github.com/tripdrip/backend/internal/domain"
	"github.com/tripdrip/backend/internal/transport/http/dto"
)

type MapService struct {
	q *sqlc.Queries
}

func NewMapService(q *sqlc.Queries) *MapService {
	return &MapService{q: q}
}

// UpdatePresence enforces the strict privacy invariant: only city/district centroids are ever stored.
func (s *MapService) UpdatePresence(ctx context.Context, userID uuid.UUID, req dto.UpdateMapPresenceRequest) (*dto.MapPresenceResponse, error) {
	city := strings.TrimSpace(req.City)
	if city == "" {
		return nil, domain.BadRequest(domain.ErrCodeValidation, "city is required")
	}

	centroid, ok := domain.ResolveCentroid(city, derefStr(req.District))
	if !ok {
		return nil, domain.BadRequest(domain.ErrCodeValidation, "unsupported city or district for map centroid")
	}

	mp, err := s.q.UpsertMapPresence(ctx, sqlc.UpsertMapPresenceParams{
		UserID:       userID,
		City:         city,
		District:     toPgText(req.District),
		ApproxLat:    centroid.Lat,
		ApproxLng:    centroid.Lng,
		IsVisible:    req.IsVisible,
		VisibleUntil: req.VisibleUntil,
	})
	if err != nil {
		return nil, domain.Internal(err)
	}

	return &dto.MapPresenceResponse{
		UserID:             mp.UserID,
		City:               mp.City,
		District:           fromPgText(mp.District),
		ApproxLat:          mp.ApproxLat,
		ApproxLng:          mp.ApproxLng,
		IsVisible:          mp.IsVisible,
		HiddenByModeration: mp.HiddenByModeration,
		VisibleUntil:       mp.VisibleUntil,
		UpdatedAt:          mp.UpdatedAt,
	}, nil
}

type MapFilter struct {
	Layer    string
	City     string
	Hobby    string
	Language string
	Vibe     string
	Country  string
}

func (s *MapService) GetEntities(ctx context.Context, viewerID uuid.UUID, filter MapFilter) (*dto.MapEntitiesResponse, error) {
	res := &dto.MapEntitiesResponse{
		People:   []dto.MapPersonEntity{},
		Partners: []dto.MapPartnerEntity{},
	}

	includePeople := filter.Layer == "" || filter.Layer == "tourists" || filter.Layer == "locals_networking" || filter.Layer == "locals_hosting"
	includePartners := filter.Layer == "" || filter.Layer == "partners"

	if includePeople {
		rows, err := s.q.ListVisiblePeopleOnMap(ctx, sqlc.ListVisiblePeopleOnMapParams{
			ViewerID: viewerID,
			Layer:    filter.Layer,
			City:     filter.City,
			Hobby:    filter.Hobby,
			Language: filter.Language,
			Vibe:     filter.Vibe,
			Country:  filter.Country,
		})
		if err != nil {
			return nil, domain.Internal(err)
		}
		for _, r := range rows {
			hobbies := r.Hobbies
			if hobbies == nil {
				hobbies = []string{}
			}
			res.People = append(res.People, dto.MapPersonEntity{
				UserID:              r.UserID,
				Role:                string(r.Role),
				FirstName:           r.FirstName,
				LastName:            r.LastName,
				CountryCode:         r.CountryCode,
				AvatarURL:           fromPgText(r.AvatarUrl),
				VibePreference:      string(r.VibePreference),
				Hobbies:             hobbies,
				Languages:           decodeLanguages(r.Languages),
				Expectations:        fromPgText(r.Expectations),
				ReadyForNetworking:  r.ReadyForNetworking,
				CanHostGuests:       r.CanHostGuests,
				QonaqCompletedCount: r.QonaqCompletedCount,
				RatingAvg:           numericToString(r.RatingAvg),
				RatingCount:         r.RatingCount,
				City:                r.City,
				District:            fromPgText(r.District),
				ApproxLat:           r.ApproxLat,
				ApproxLng:           r.ApproxLng,
			})
		}
	}

	if includePartners {
		rows, err := s.q.ListVisiblePartnersOnMap(ctx, sqlc.ListVisiblePartnersOnMapParams{
			City: filter.City,
			Vibe: filter.Vibe,
		})
		if err != nil {
			return nil, domain.Internal(err)
		}
		for _, r := range rows {
			res.Partners = append(res.Partners, dto.MapPartnerEntity{
				PartnerID:   r.PartnerID,
				BrandName:   r.BrandName,
				Category:    r.Category,
				LogoURL:     fromPgText(r.LogoUrl),
				LocationID:  r.LocationID,
				BranchName:  r.BranchName,
				City:        r.City,
				Address:     r.Address,
				Lat:         r.Lat,
				Lng:         r.Lng,
				PointID:     r.PointID,
				Vibe:        string(r.Vibe),
				RewardCoins: r.RewardCoins,
				IsBoosted:   r.IsBoosted,
			})
		}
	}

	return res, nil
}
