package seed

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/tripdrip/backend/internal/db/sqlc"
	"github.com/tripdrip/backend/internal/domain"
	"github.com/tripdrip/backend/internal/service"
)

// Run populates demo data idempotently if the database is empty.
func Run(ctx context.Context, pool *pgxpool.Pool) error {
	var userCount int64
	if err := pool.QueryRow(ctx, `SELECT COUNT(*) FROM users`).Scan(&userCount); err != nil {
		return fmt.Errorf("check seed users count: %w", err)
	}
	if userCount > 0 {
		slog.Info("seed skipped: users table already populated", "count", userCount)
		return nil
	}

	q := sqlc.New(pool)
	pwHash, err := domain.HashPassword("TripDrip2026!")
	if err != nil {
		return err
	}

	return service.RunInTx(ctx, pool, q, func(qtx *sqlc.Queries, _ pgx.Tx) error {
		// 1. Admins (2)
		admins := []struct {
			email, first, last, city string
		}{
			{"admin@tripdrip.kz", "Aibek", "Moderator", "Almaty"},
			{"support@tripdrip.kz", "Dana", "Adminova", "Astana"},
		}
		for _, a := range admins {
			u, err := createSeedUser(ctx, qtx, sqlc.UserRoleEnumAdmin, a.first, a.last, "KZ", a.email, pwHash, true)
			if err != nil {
				return err
			}
			if _, err := qtx.CreateProfile(ctx, sqlc.CreateProfileParams{
				UserID: u.ID, VibePreference: sqlc.VibePrefEnumBoth,
				Hobbies: []string{"travel"}, Languages: mustLangJSON("ru", "C2", "en", "C1"), City: a.city,
			}); err != nil {
				return err
			}
			if _, err := qtx.CreateWallet(ctx, u.ID); err != nil {
				return err
			}
		}

		// 2. Tourists (6) across Almaty, Astana, Shymkent
		now := time.Now().UTC()
		tripStart := now.Add(-2 * 24 * time.Hour)
		tripEnd := now.Add(14 * 24 * time.Hour)

		tourists := []struct {
			email, first, last, country, city, district string
			vibe                                        sqlc.VibePrefEnum
			hobbies                                     []string
			langs                                       []byte
			verified                                    bool
			coins                                       int32
		}{
			{"emma.us@demo.tripdrip", "Emma", "Watson", "US", "Almaty", "Medeu", sqlc.VibePrefEnumNature, []string{"hiking", "coffee", "photography"}, mustLangJSON("en", "C2", "ru", "A2"), true, 120},
			{"kenji.jp@demo.tripdrip", "Kenji", "Takahashi", "JP", "Almaty", "Bostandyk", sqlc.VibePrefEnumBoth, []string{"ramen", "mountains", "architecture"}, mustLangJSON("ja", "C2", "en", "B2"), true, 60},
			{"lukas.de@demo.tripdrip", "Lukas", "Weber", "DE", "Astana", "Esil", sqlc.VibePrefEnumMegapolis, []string{"cycling", "history", "museums"}, mustLangJSON("de", "C2", "en", "C1"), true, 50},
			{"soojin.kr@demo.tripdrip", "Soojin", "Park", "KR", "Almaty", "Almaly", sqlc.VibePrefEnumBoth, []string{"food", "tea", "nature"}, mustLangJSON("ko", "C2", "en", "B2"), true, 0},
			{"oliver.gb@demo.tripdrip", "Oliver", "Brown", "GB", "Shymkent", "Abay", sqlc.VibePrefEnumNature, []string{"gastronomy", "trekking"}, mustLangJSON("en", "C2"), true, 100},
			{"claire.fr@demo.tripdrip", "Claire", "Dubois", "FR", "Almaty", "Medeu", sqlc.VibePrefEnumNature, []string{"photography", "art"}, mustLangJSON("fr", "C2", "en", "B2"), false, 0},
		}

		for i, t := range tourists {
			u, err := createSeedUser(ctx, qtx, sqlc.UserRoleEnumTourist, t.first, t.last, t.country, t.email, pwHash, t.verified)
			if err != nil {
				return err
			}
			if _, err := qtx.CreateProfile(ctx, sqlc.CreateProfileParams{
				UserID:             u.ID,
				TripPurpose:        sqlc.NullTripPurposeEnum{TripPurposeEnum: sqlc.TripPurposeEnumLeisure, Valid: true},
				TripStartDate:      &tripStart,
				TripEndDate:        &tripEnd,
				VibePreference:     t.vibe,
				Hobbies:            t.hobbies,
				Languages:          t.langs,
				City:               t.city,
				District:           pgtype.Text{String: t.district, Valid: true},
				Expectations:       pgtype.Text{String: "Looking for authentic local culture and mountain hikes", Valid: true},
				ReadyForNetworking: true,
			}); err != nil {
				return err
			}
			if _, err := qtx.CreateWallet(ctx, u.ID); err != nil {
				return err
			}
			if t.coins > 0 {
				if _, err := qtx.UpdateWalletBalance(ctx, sqlc.UpdateWalletBalanceParams{Delta: t.coins, UserID: u.ID}); err != nil {
					return err
				}
				if _, err := qtx.CreateCoinTransaction(ctx, sqlc.CreateCoinTransactionParams{
					UserID: u.ID, Amount: t.coins, Reason: sqlc.CoinReasonEnumRouteCompleted,
					IdempotencyKey: fmt.Sprintf("seed:tourist:%d", i),
				}); err != nil {
					return err
				}
			}
			coord, _ := domain.ResolveCentroid(t.city, t.district)
			if _, err := qtx.UpsertMapPresence(ctx, sqlc.UpsertMapPresenceParams{
				UserID: u.ID, City: t.city, District: pgtype.Text{String: t.district, Valid: true},
				ApproxLat: coord.Lat, ApproxLng: coord.Lng, IsVisible: t.verified,
			}); err != nil {
				return err
			}
			if !t.verified {
				if _, err := qtx.CreateVerification(ctx, sqlc.CreateVerificationParams{
					UserID: u.ID, DocType: sqlc.VerificationDocEnumPassport,
					DocNumberHash: domain.HashDocNumber("passport", "FR99887766"),
					DocPhotoUrl:   pgtype.Text{String: "https://cdn.tripdrip.kz/mock/passport_claire.jpg", Valid: true},
					SelfieUrl:     pgtype.Text{String: "https://cdn.tripdrip.kz/mock/selfie_claire.jpg", Valid: true},
				}); err != nil {
					return err
				}
			}
		}

		// 3. Locals (6) across Almaty, Astana, Shymkent, Turkestan
		locals := []struct {
			email, first, last, city, district string
			vibe                               sqlc.VibePrefEnum
			hobbies                            []string
			langs                              []byte
			completed                          int32
			canHost                            bool
		}{
			{"arman.kz@demo.tripdrip", "Arman", "Suleimenov", "Almaty", "Medeu", sqlc.VibePrefEnumNature, []string{"hiking", "tea", "photography"}, mustLangJSON("kk", "C2", "ru", "C2", "en", "B2"), 4, true},
			{"madina.kz@demo.tripdrip", "Madina", "Nurlanova", "Almaty", "Bostandyk", sqlc.VibePrefEnumBoth, []string{"coffee", "art", "music"}, mustLangJSON("kk", "C1", "ru", "C2", "en", "C1"), 2, false},
			{"timur.kz@demo.tripdrip", "Timur", "Kassymov", "Astana", "Esil", sqlc.VibePrefEnumMegapolis, []string{"cycling", "architecture", "history"}, mustLangJSON("kk", "B2", "ru", "C2", "en", "B2"), 1, false},
			{"aigerim.kz@demo.tripdrip", "Aigerim", "Bekova", "Almaty", "Almaly", sqlc.VibePrefEnumBoth, []string{"cooking", "dastarkhan", "languages"}, mustLangJSON("kk", "C2", "ru", "C2", "en", "C1"), 5, true},
			{"dias.kz@demo.tripdrip", "Dias", "Serikov", "Shymkent", "Al-Farabi", sqlc.VibePrefEnumNature, []string{"gastronomy", "mountains"}, mustLangJSON("kk", "C2", "ru", "C1", "en", "B1"), 0, false},
			{"sara.kz@demo.tripdrip", "Sara", "Zhumabayeva", "Turkestan", "", sqlc.VibePrefEnumBoth, []string{"history", "tea"}, mustLangJSON("kk", "C2", "ru", "C2", "en", "B2"), 1, false},
		}

		for _, l := range locals {
			u, err := createSeedUser(ctx, qtx, sqlc.UserRoleEnumLocal, l.first, l.last, "KZ", l.email, pwHash, true)
			if err != nil {
				return err
			}
			if _, err := qtx.CreateProfile(ctx, sqlc.CreateProfileParams{
				UserID: u.ID, VibePreference: l.vibe, Hobbies: l.hobbies, Languages: l.langs,
				City: l.city, District: toPgStr(l.district),
				Expectations:       pgtype.Text{String: "Happy to show around and practice languages", Valid: true},
				ReadyForNetworking: true, CanHostGuests: l.canHost,
			}); err != nil {
				return err
			}
			if l.completed > 0 {
				for c := int32(0); c < l.completed; c++ {
					if err := qtx.IncrementQonaqCompletedCount(ctx, u.ID); err != nil {
						return err
					}
				}
			}
			if _, err := qtx.CreateWallet(ctx, u.ID); err != nil {
				return err
			}
			coord, ok := domain.ResolveCentroid(l.city, l.district)
			if !ok {
				coord = domain.Coord{Lat: 43.238949, Lng: 76.889709}
			}
			if _, err := qtx.UpsertMapPresence(ctx, sqlc.UpsertMapPresenceParams{
				UserID: u.ID, City: l.city, District: toPgStr(l.district),
				ApproxLat: coord.Lat, ApproxLng: coord.Lng, IsVisible: true,
			}); err != nil {
				return err
			}
		}

		// 4. Partners (4 brands, including Okadzaki chain with 3 branches)
		partnerDefs := []struct {
			email, first, last, brand, category, bin string
			approved                                 bool
			branches                                 []struct {
				name, city, address string
				lat, lng            float64
				vibe                sqlc.VibePrefEnum
				boosted             bool
			}
			offers []struct {
				title, desc string
				discount    int16
				cost, limit int32
			}
		}{
			{
				email: "okadzaki@demo.tripdrip", first: "Renat", last: "Okadzaki",
				brand: "Okadzaki", category: "restaurant", bin: "180440012340", approved: true,
				branches: []struct {
					name, city, address string
					lat, lng            float64
					vibe                sqlc.VibePrefEnum
					boosted             bool
				}{
					{"Okadzaki Dostyk", "Almaty", "Dostyk Ave 105", 43.2356, 76.9562, sqlc.VibePrefEnumMegapolis, true},
					{"Okadzaki Mega Alma-Ata", "Almaty", "Rozybakiev St 247A", 43.2015, 76.8926, sqlc.VibePrefEnumMegapolis, false},
					{"Okadzaki Arbat", "Almaty", "Zhibek Zholy 115", 43.2612, 76.9428, sqlc.VibePrefEnumBoth, true},
				},
				offers: []struct {
					title, desc string
					discount    int16
					cost, limit int32
				}{
					{"10% off Sushi & Ramen", "Valid across all Okadzaki Almaty branches", 10, 50, 500},
					{"20% off Signature Sets", "Special TripDrip traveler reward", 20, 100, 200},
				},
			},
			{
				email: "coffeeboom@demo.tripdrip", first: "Alina", last: "Coffee",
				brand: "Coffee Boom", category: "cafe", bin: "190540023454", approved: true,
				branches: []struct {
					name, city, address string
					lat, lng            float64
					vibe                sqlc.VibePrefEnum
					boosted             bool
				}{
					{"Coffee Boom Panfilova", "Almaty", "Panfilov St 92", 43.2551, 76.9472, sqlc.VibePrefEnumMegapolis, true},
					{"Coffee Boom Khan Shatyr", "Astana", "Turan Ave 37", 51.1325, 71.4038, sqlc.VibePrefEnumMegapolis, false},
				},
				offers: []struct {
					title, desc string
					discount    int16
					cost, limit int32
				}{
					{"15% off Specialty Coffee & Breakfast", "Valid for dine-in and takeaway", 15, 60, 300},
				},
			},
			{
				email: "nomadgear@demo.tripdrip", first: "Ruslan", last: "Mountain",
				brand: "Steppe Nomad Gear", category: "outdoor", bin: "200640034561", approved: true,
				branches: []struct {
					name, city, address string
					lat, lng            float64
					vibe                sqlc.VibePrefEnum
					boosted             bool
				}{
					{"Steppe Nomad Almaty", "Almaty", "Abay Ave 52", 43.2404, 76.9235, sqlc.VibePrefEnumNature, true},
				},
				offers: []struct {
					title, desc string
					discount    int16
					cost, limit int32
				}{
					{"20% off Hiking Gear Rental", "Trekking poles, backpacks, and sleeping bags", 20, 100, 150},
				},
			},
			{
				email: "plovhouse@demo.tripdrip", first: "Bakhtiyar", last: "Shym",
				brand: "Shymkent Plov House", category: "restaurant", bin: "210740045670", approved: false,
				branches: []struct {
					name, city, address string
					lat, lng            float64
					vibe                sqlc.VibePrefEnum
					boosted             bool
				}{
					{"Plov House Center", "Shymkent", "Tauke Khan Ave 44", 42.3155, 69.5965, sqlc.VibePrefEnumBoth, false},
				},
				offers: nil,
			},
		}

		for _, pd := range partnerDefs {
			u, err := createSeedUser(ctx, qtx, sqlc.UserRoleEnumPartner, pd.first, pd.last, "KZ", pd.email, pwHash, pd.approved)
			if err != nil {
				return err
			}
			if _, err := qtx.CreateProfile(ctx, sqlc.CreateProfileParams{
				UserID: u.ID, VibePreference: sqlc.VibePrefEnumBoth, Hobbies: []string{}, Languages: []byte("[]"), City: "Almaty",
			}); err != nil {
				return err
			}
			if _, err := qtx.CreateWallet(ctx, u.ID); err != nil {
				return err
			}

			partner, err := qtx.CreatePartner(ctx, sqlc.CreatePartnerParams{
				OwnerUserID: u.ID,
				BrandName:   pd.brand,
				Category:    pd.category,
				Bin:         pd.bin,
			})
			if err != nil {
				return err
			}
			if pd.approved {
				if _, err := qtx.ApprovePartner(ctx, partner.ID); err != nil {
					return err
				}
			}

			for _, br := range pd.branches {
				loc, err := qtx.CreatePartnerLocation(ctx, sqlc.CreatePartnerLocationParams{
					PartnerID:  partner.ID,
					BranchName: br.name,
					City:       br.city,
					Address:    br.address,
					Lat:        br.lat,
					Lng:        br.lng,
				})
				if err != nil {
					return err
				}
				if _, err := qtx.CreatePartnerMapPoint(ctx, sqlc.CreatePartnerMapPointParams{
					PartnerLocationID: &loc.ID,
					Name:              br.name,
					Description:       pgtype.Text{String: pd.brand + " partner location", Valid: true},
					City:              br.city,
					Vibe:              br.vibe,
					Lat:               br.lat,
					Lng:               br.lng,
					RadiusMeters:      100,
					RewardCoins:       20,
					IsBoosted:         br.boosted,
				}); err != nil {
					return err
				}
			}

			for _, off := range pd.offers {
				if _, err := qtx.CreateOffer(ctx, sqlc.CreateOfferParams{
					PartnerID:       partner.ID,
					Title:           off.title,
					Description:     pgtype.Text{String: off.desc, Valid: true},
					DiscountPercent: off.discount,
					CoinCost:        off.cost,
					TotalLimit:      off.limit,
				}); err != nil {
					return err
				}
			}
		}

		// 5. Landmark map_points (8 iconic spots across KZ)
		landmarks := []struct {
			name, desc, city string
			vibe             sqlc.VibePrefEnum
			lat, lng         float64
			boosted          bool
		}{
			{"Medeu High-Mountain Skating Rink", "Historic alpine sports complex at 1,691m elevation", "Almaty", sqlc.VibePrefEnumNature, 43.1575, 77.0589, true},
			{"Kok-Tobe Hill", "Panoramic viewpoint and recreation park above Almaty", "Almaty", sqlc.VibePrefEnumBoth, 43.2340, 76.9756, false},
			{"Panfilov Park & Zenkov Cathedral", "Wooden cathedral in the heart of Almaty", "Almaty", sqlc.VibePrefEnumMegapolis, 43.2588, 76.9531, false},
			{"First President's Park", "Scenic park with Tian Shan mountain backdrop", "Almaty", sqlc.VibePrefEnumNature, 43.1920, 76.8856, true},
			{"Green Bazaar (Zelyony Bazaar)", "Traditional Central Asian market with local delicacies", "Almaty", sqlc.VibePrefEnumBoth, 43.2642, 76.9547, false},
			{"Baiterek Monument", "Iconic observation tower in central Astana", "Astana", sqlc.VibePrefEnumMegapolis, 51.1282, 71.4304, true},
			{"Charyn Canyon", "Valley of Castles natural landmark", "Almaty", sqlc.VibePrefEnumNature, 43.3522, 79.0789, true},
			{"Mausoleum of Khoja Ahmed Yasawi", "UNESCO World Heritage monument in Turkestan", "Turkestan", sqlc.VibePrefEnumBoth, 43.2977, 68.2711, true},
		}

		for _, lm := range landmarks {
			if _, err := qtx.CreateLandmarkMapPoint(ctx, sqlc.CreateLandmarkMapPointParams{
				Name:         lm.name,
				Description:  pgtype.Text{String: lm.desc, Valid: true},
				City:         lm.city,
				Vibe:         lm.vibe,
				Lat:          lm.lat,
				Lng:          lm.lng,
				RadiusMeters: 150,
				RewardCoins:  10,
				IsBoosted:    lm.boosted,
			}); err != nil {
				return err
			}
		}

		slog.Info("database seeded successfully")
		return nil
	})
}

func createSeedUser(
	ctx context.Context,
	qtx *sqlc.Queries,
	role sqlc.UserRoleEnum,
	first, last, country, email, pwHash string,
	verified bool,
) (sqlc.User, error) {
	u, err := qtx.CreateUser(ctx, sqlc.CreateUserParams{
		Role:         role,
		FirstName:    first,
		LastName:     last,
		CountryCode:  country,
		Email:        pgtype.Text{String: email, Valid: true},
		PasswordHash: pwHash,
	})
	if err != nil {
		return sqlc.User{}, err
	}
	if verified {
		u, err = qtx.SetUserVerified(ctx, sqlc.SetUserVerifiedParams{
			ID:         u.ID,
			IsVerified: true,
		})
		if err != nil {
			return sqlc.User{}, err
		}
	}
	return u, nil
}

func toPgStr(s string) pgtype.Text {
	if s == "" {
		return pgtype.Text{Valid: false}
	}
	return pgtype.Text{String: s, Valid: true}
}

func mustLangJSON(pairs ...string) []byte {
	type lang struct {
		Code  string `json:"code"`
		Level string `json:"level"`
	}
	out := make([]lang, 0, len(pairs)/2)
	for i := 0; i+1 < len(pairs); i += 2 {
		out = append(out, lang{Code: pairs[i], Level: pairs[i+1]})
	}
	b, _ := json.Marshal(out)
	return b
}

// Keep unused uuid import avoided if needed
var _ = uuid.Nil
