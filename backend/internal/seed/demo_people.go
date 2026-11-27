package seed

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/tripdrip/backend/internal/db/sqlc"
	"github.com/tripdrip/backend/internal/domain"
	"github.com/tripdrip/backend/internal/service"
)

type demoPerson struct {
	email, first, last, country, city string
	role                              sqlc.UserRoleEnum
	vibe                              sqlc.VibePrefEnum
	hobbies                           []string
	langs                             []string // code, level pairs
	expectations                      string
	canHost                           bool
	completed                         int32
	tripDays                          int // tourists only: days left in the trip
}

// demoPeople spreads verified guests and locals over Kazakhstan so the map looks alive.
// Hobby and language names match the filters on the map screen.
var demoPeople = []demoPerson{
	// Almaty and around
	{email: "nurlan.kz@demo.tripdrip", first: "Nurlan", last: "Abenov", country: "KZ", city: "Almaty", role: sqlc.UserRoleEnumLocal, vibe: sqlc.VibePrefEnumNature, hobbies: []string{"hiking", "photography"}, langs: []string{"kk", "C2", "ru", "C2", "en", "B2"}, expectations: "Weekend hikes to Big Almaty Lake and Kok-Zhailau", canHost: true, completed: 7},
	{email: "zhanna.kz@demo.tripdrip", first: "Zhanna", last: "Omarova", country: "KZ", city: "Almaty", role: sqlc.UserRoleEnumLocal, vibe: sqlc.VibePrefEnumMegapolis, hobbies: []string{"local food", "music"}, langs: []string{"kk", "C2", "ru", "C2", "fr", "B1"}, expectations: "Happy to practise French over baursaks", completed: 3},
	{email: "marco.it@demo.tripdrip", first: "Marco", last: "Rossi", country: "IT", city: "Almaty", role: sqlc.UserRoleEnumTourist, vibe: sqlc.VibePrefEnumNature, hobbies: []string{"hiking", "local food"}, langs: []string{"it", "C2", "en", "B2"}, expectations: "Looking for a hiking buddy for Charyn", tripDays: 9},
	{email: "ana.es@demo.tripdrip", first: "Ana", last: "García", country: "ES", city: "Almaty", role: sqlc.UserRoleEnumTourist, vibe: sqlc.VibePrefEnumBoth, hobbies: []string{"photography", "music"}, langs: []string{"es", "C2", "en", "C1"}, expectations: "Want to see a real dastarkhan", tripDays: 6},
	{email: "yerlan.kz@demo.tripdrip", first: "Yerlan", last: "Tokayev", country: "KZ", city: "Konaev", role: sqlc.UserRoleEnumLocal, vibe: sqlc.VibePrefEnumNature, hobbies: []string{"football", "hiking"}, langs: []string{"kk", "C2", "ru", "C2", "en", "A2"}, expectations: "Can show the Kapchagay shore and Altyn-Emel", canHost: true, completed: 2},
	{email: "saule.kz@demo.tripdrip", first: "Saule", last: "Iskakova", country: "KZ", city: "Taldykorgan", role: sqlc.UserRoleEnumLocal, vibe: sqlc.VibePrefEnumNature, hobbies: []string{"local food", "photography"}, langs: []string{"kk", "C2", "ru", "C2", "en", "B1"}, expectations: "Kolsay lakes and home-made kymyz", canHost: true, completed: 4},
	{email: "tom.au@demo.tripdrip", first: "Tom", last: "Wilson", country: "AU", city: "Kolsay", role: sqlc.UserRoleEnumTourist, vibe: sqlc.VibePrefEnumNature, hobbies: []string{"hiking", "photography"}, langs: []string{"en", "C2"}, expectations: "Camping by the lakes, no signal up here", tripDays: 4},
	{email: "lea.ch@demo.tripdrip", first: "Lea", last: "Meier", country: "CH", city: "Charyn", role: sqlc.UserRoleEnumTourist, vibe: sqlc.VibePrefEnumNature, hobbies: []string{"hiking"}, langs: []string{"de", "C2", "en", "C1", "fr", "B2"}, expectations: "Sunrise at the Valley of Castles", tripDays: 5},

	// Astana and the north
	{email: "aliya.kz@demo.tripdrip", first: "Aliya", last: "Sarsenova", country: "KZ", city: "Astana", role: sqlc.UserRoleEnumLocal, vibe: sqlc.VibePrefEnumMegapolis, hobbies: []string{"photography", "music"}, langs: []string{"kk", "C2", "ru", "C2", "en", "C1"}, expectations: "Evening walks from Baiterek to Khan Shatyr", canHost: true, completed: 6},
	{email: "ruslan.kz@demo.tripdrip", first: "Ruslan", last: "Akhmetov", country: "KZ", city: "Astana", role: sqlc.UserRoleEnumLocal, vibe: sqlc.VibePrefEnumMegapolis, hobbies: []string{"football", "local food"}, langs: []string{"kk", "C1", "ru", "C2", "en", "B2"}, expectations: "Astana Arena match and plov after", completed: 2},
	{email: "sophie.fr@demo.tripdrip", first: "Sophie", last: "Martin", country: "FR", city: "Astana", role: sqlc.UserRoleEnumTourist, vibe: sqlc.VibePrefEnumMegapolis, hobbies: []string{"photography"}, langs: []string{"fr", "C2", "en", "B2"}, expectations: "Architecture tour, any tips?", tripDays: 7},
	{email: "wei.cn@demo.tripdrip", first: "Wei", last: "Zhang", country: "CN", city: "Astana", role: sqlc.UserRoleEnumTourist, vibe: sqlc.VibePrefEnumBoth, hobbies: []string{"local food"}, langs: []string{"zh", "C2", "en", "B1", "ru", "A2"}, expectations: "Business trip, free evenings", tripDays: 3},
	{email: "asel.kz@demo.tripdrip", first: "Asel", last: "Mukanova", country: "KZ", city: "Burabay", role: sqlc.UserRoleEnumLocal, vibe: sqlc.VibePrefEnumNature, hobbies: []string{"hiking", "local food"}, langs: []string{"kk", "C2", "ru", "C2", "en", "B1"}, expectations: "Guesthouse by Lake Borovoe, horse rides", canHost: true, completed: 5},
	{email: "jan.pl@demo.tripdrip", first: "Jan", last: "Kowalski", country: "PL", city: "Burabay", role: sqlc.UserRoleEnumTourist, vibe: sqlc.VibePrefEnumNature, hobbies: []string{"hiking"}, langs: []string{"pl", "C2", "en", "B2", "ru", "B1"}, expectations: "Climbing Okzhetpes", tripDays: 5},
	{email: "daniyar.kz@demo.tripdrip", first: "Daniyar", last: "Ospanov", country: "KZ", city: "Kokshetau", role: sqlc.UserRoleEnumLocal, vibe: sqlc.VibePrefEnumNature, hobbies: []string{"football"}, langs: []string{"kk", "C2", "ru", "C2", "en", "A2"}, expectations: "Can help with buses to Burabay", completed: 1},
	{email: "olga.kz@demo.tripdrip", first: "Olga", last: "Petrova", country: "KZ", city: "Petropavl", role: sqlc.UserRoleEnumLocal, vibe: sqlc.VibePrefEnumBoth, hobbies: []string{"music", "photography"}, langs: []string{"ru", "C2", "kk", "B2", "en", "B2"}, expectations: "Practise English, show the old town", completed: 1},
	{email: "bekzat.kz@demo.tripdrip", first: "Bekzat", last: "Zhakupov", country: "KZ", city: "Pavlodar", role: sqlc.UserRoleEnumLocal, vibe: sqlc.VibePrefEnumNature, hobbies: []string{"football", "hiking"}, langs: []string{"kk", "C2", "ru", "C2", "en", "B1"}, expectations: "Irtysh embankment and Bayanaul trips", canHost: true, completed: 3},
	{email: "igor.kz@demo.tripdrip", first: "Igor", last: "Smirnov", country: "KZ", city: "Kostanay", role: sqlc.UserRoleEnumLocal, vibe: sqlc.VibePrefEnumMegapolis, hobbies: []string{"music"}, langs: []string{"ru", "C2", "kk", "B1", "en", "B2"}, expectations: "Local gigs and coffee spots", completed: 0},

	// Centre and east
	{email: "gulnara.kz@demo.tripdrip", first: "Gulnara", last: "Baimukhanova", country: "KZ", city: "Karaganda", role: sqlc.UserRoleEnumLocal, vibe: sqlc.VibePrefEnumBoth, hobbies: []string{"photography", "local food"}, langs: []string{"kk", "C2", "ru", "C2", "en", "B2"}, expectations: "Karlag museum and the best beshbarmak in town", canHost: true, completed: 4},
	{email: "mark.us@demo.tripdrip", first: "Mark", last: "Johnson", country: "US", city: "Karaganda", role: sqlc.UserRoleEnumTourist, vibe: sqlc.VibePrefEnumMegapolis, hobbies: []string{"football"}, langs: []string{"en", "C2"}, expectations: "Here for work, want to see a local match", tripDays: 10},
	{email: "erbol.kz@demo.tripdrip", first: "Erbol", last: "Nurtazin", country: "KZ", city: "Zhezkazgan", role: sqlc.UserRoleEnumLocal, vibe: sqlc.VibePrefEnumNature, hobbies: []string{"hiking"}, langs: []string{"kk", "C2", "ru", "C2", "en", "A2"}, expectations: "Ulytau trips and steppe stories", canHost: true, completed: 1},
	{email: "alexei.kz@demo.tripdrip", first: "Alexei", last: "Kim", country: "KZ", city: "Oskemen", role: sqlc.UserRoleEnumLocal, vibe: sqlc.VibePrefEnumNature, hobbies: []string{"hiking", "photography"}, langs: []string{"ru", "C2", "kk", "B2", "en", "B2"}, expectations: "Altai and Belukha, I know every trail", canHost: true, completed: 6},
	{email: "hanna.de@demo.tripdrip", first: "Hanna", last: "Schmidt", country: "DE", city: "Oskemen", role: sqlc.UserRoleEnumTourist, vibe: sqlc.VibePrefEnumNature, hobbies: []string{"hiking"}, langs: []string{"de", "C2", "en", "C1"}, expectations: "Trekking in the Altai", tripDays: 12},
	{email: "aidana.kz@demo.tripdrip", first: "Aidana", last: "Dzhaksybekova", country: "KZ", city: "Semey", role: sqlc.UserRoleEnumLocal, vibe: sqlc.VibePrefEnumBoth, hobbies: []string{"music", "local food"}, langs: []string{"kk", "C2", "ru", "C2", "en", "B1"}, expectations: "Abai museum and home cooking", completed: 2},

	// South
	{email: "bauyrzhan.kz@demo.tripdrip", first: "Bauyrzhan", last: "Alimov", country: "KZ", city: "Shymkent", role: sqlc.UserRoleEnumLocal, vibe: sqlc.VibePrefEnumBoth, hobbies: []string{"local food", "football"}, langs: []string{"kk", "C2", "ru", "C2", "en", "B2"}, expectations: "Shymkent bazaar and real plov", canHost: true, completed: 5},
	{email: "emre.tr@demo.tripdrip", first: "Emre", last: "Yılmaz", country: "TR", city: "Shymkent", role: sqlc.UserRoleEnumTourist, vibe: sqlc.VibePrefEnumBoth, hobbies: []string{"local food"}, langs: []string{"tr", "C2", "en", "B1"}, expectations: "Food tour across the south", tripDays: 6},
	{email: "madi.kz@demo.tripdrip", first: "Madi", last: "Sultanov", country: "KZ", city: "Taraz", role: sqlc.UserRoleEnumLocal, vibe: sqlc.VibePrefEnumBoth, hobbies: []string{"photography"}, langs: []string{"kk", "C2", "ru", "C2", "en", "B1"}, expectations: "Aisha Bibi mausoleum and old Taraz", completed: 2},
	{email: "akmaral.kz@demo.tripdrip", first: "Akmaral", last: "Tleubayeva", country: "KZ", city: "Turkestan", role: sqlc.UserRoleEnumLocal, vibe: sqlc.VibePrefEnumBoth, hobbies: []string{"photography", "local food"}, langs: []string{"kk", "C2", "ru", "C2", "en", "B2"}, expectations: "Yasawi mausoleum at sunset, Otrar tomorrow", canHost: true, completed: 3},
	{email: "ahmed.ae@demo.tripdrip", first: "Ahmed", last: "Al-Mansouri", country: "AE", city: "Turkestan", role: sqlc.UserRoleEnumTourist, vibe: sqlc.VibePrefEnumMegapolis, hobbies: []string{"photography"}, langs: []string{"ar", "C2", "en", "C1"}, expectations: "Silk Road history", tripDays: 4},
	{email: "zhandos.kz@demo.tripdrip", first: "Zhandos", last: "Kenzhebek", country: "KZ", city: "Kyzylorda", role: sqlc.UserRoleEnumLocal, vibe: sqlc.VibePrefEnumNature, hobbies: []string{"football"}, langs: []string{"kk", "C2", "ru", "C2", "en", "A2"}, expectations: "Can help with trips to the Aral Sea", completed: 1},
	{email: "nikolai.ru@demo.tripdrip", first: "Nikolai", last: "Ivanov", country: "RU", city: "Baikonur", role: sqlc.UserRoleEnumTourist, vibe: sqlc.VibePrefEnumBoth, hobbies: []string{"photography"}, langs: []string{"ru", "C2", "en", "B1"}, expectations: "Watching a launch, looking for company", tripDays: 3},

	// West
	{email: "aizhan.kz@demo.tripdrip", first: "Aizhan", last: "Utegenova", country: "KZ", city: "Aktau", role: sqlc.UserRoleEnumLocal, vibe: sqlc.VibePrefEnumNature, hobbies: []string{"hiking", "photography"}, langs: []string{"kk", "C2", "ru", "C2", "en", "B2"}, expectations: "Bozzhyra and the Caspian shore", canHost: true, completed: 4},
	{email: "liam.ie@demo.tripdrip", first: "Liam", last: "Murphy", country: "IE", city: "Aktau", role: sqlc.UserRoleEnumTourist, vibe: sqlc.VibePrefEnumNature, hobbies: []string{"hiking"}, langs: []string{"en", "C2"}, expectations: "Mangystau road trip", tripDays: 8},
	{email: "murat.kz@demo.tripdrip", first: "Murat", last: "Zhaksylykov", country: "KZ", city: "Atyrau", role: sqlc.UserRoleEnumLocal, vibe: sqlc.VibePrefEnumMegapolis, hobbies: []string{"football", "local food"}, langs: []string{"kk", "C2", "ru", "C2", "en", "B2"}, expectations: "Walk across the bridge from Europe to Asia", completed: 2},
	{email: "pieter.nl@demo.tripdrip", first: "Pieter", last: "de Vries", country: "NL", city: "Atyrau", role: sqlc.UserRoleEnumTourist, vibe: sqlc.VibePrefEnumMegapolis, hobbies: []string{"football"}, langs: []string{"nl", "C2", "en", "C2"}, expectations: "Oil project rotation, free weekends", tripDays: 14},
	{email: "dinara.kz@demo.tripdrip", first: "Dinara", last: "Seitova", country: "KZ", city: "Aktobe", role: sqlc.UserRoleEnumLocal, vibe: sqlc.VibePrefEnumBoth, hobbies: []string{"music"}, langs: []string{"kk", "C2", "ru", "C2", "en", "B1"}, expectations: "Practise English, show the city", completed: 1},
	{email: "artem.kz@demo.tripdrip", first: "Artem", last: "Volkov", country: "KZ", city: "Oral", role: sqlc.UserRoleEnumLocal, vibe: sqlc.VibePrefEnumNature, hobbies: []string{"hiking", "football"}, langs: []string{"ru", "C2", "kk", "B1", "en", "B2"}, expectations: "Ural river and Pushkin museum", completed: 1},
}

// EnsureDemoPeople adds any missing demo people (matched by email), so it is safe to run on a
// database that was seeded earlier.
func EnsureDemoPeople(ctx context.Context, pool *pgxpool.Pool) error {
	q := sqlc.New(pool)
	missing := make([]demoPerson, 0, len(demoPeople))
	for _, p := range demoPeople {
		_, err := q.GetUserByEmail(ctx, pgtype.Text{String: p.email, Valid: true})
		if errors.Is(err, pgx.ErrNoRows) {
			missing = append(missing, p)
			continue
		}
		if err != nil {
			return fmt.Errorf("look up demo user %s: %w", p.email, err)
		}
	}
	if len(missing) == 0 {
		return nil
	}

	pwHash, err := domain.HashPassword("TripDrip2026!")
	if err != nil {
		return err
	}
	today := time.Now().UTC().Truncate(24 * time.Hour)

	err = service.RunInTx(ctx, pool, q, func(qtx *sqlc.Queries, _ pgx.Tx) error {
		for _, p := range missing {
			u, err := createSeedUser(ctx, qtx, p.role, p.first, p.last, p.country, p.email, pwHash, true)
			if err != nil {
				return fmt.Errorf("create demo user %s: %w", p.email, err)
			}
			params := sqlc.CreateProfileParams{
				UserID:             u.ID,
				VibePreference:     p.vibe,
				Hobbies:            p.hobbies,
				Languages:          mustLangJSON(p.langs...),
				City:               p.city,
				Expectations:       toPgStr(p.expectations),
				ReadyForNetworking: true,
				CanHostGuests:      p.canHost,
			}
			if p.role == sqlc.UserRoleEnumTourist {
				start := today.Add(-2 * 24 * time.Hour)
				end := today.Add(time.Duration(p.tripDays) * 24 * time.Hour)
				params.TripPurpose = sqlc.NullTripPurposeEnum{TripPurposeEnum: sqlc.TripPurposeEnumLeisure, Valid: true}
				params.TripStartDate = &start
				params.TripEndDate = &end
			}
			if _, err := qtx.CreateProfile(ctx, params); err != nil {
				return err
			}
			for c := int32(0); c < p.completed; c++ {
				if err := qtx.IncrementQonaqCompletedCount(ctx, u.ID); err != nil {
					return err
				}
			}
			if _, err := qtx.CreateWallet(ctx, u.ID); err != nil {
				return err
			}
			coord, ok := domain.ResolveCentroid(p.city, "")
			if !ok {
				return fmt.Errorf("no centroid for demo city %q", p.city)
			}
			if _, err := qtx.UpsertMapPresence(ctx, sqlc.UpsertMapPresenceParams{
				UserID: u.ID, City: p.city, ApproxLat: coord.Lat, ApproxLng: coord.Lng, IsVisible: true,
			}); err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		return err
	}
	slog.Info("demo people added", "count", len(missing))
	return nil
}
