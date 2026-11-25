package httptransport_test

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/tripdrip/backend/internal/db"
	"github.com/tripdrip/backend/internal/db/sqlc"
	"github.com/tripdrip/backend/internal/domain"
	"github.com/tripdrip/backend/internal/seed"
	"github.com/tripdrip/backend/internal/service"
	httptransport "github.com/tripdrip/backend/internal/transport/http"
)

func setupTestServer(t *testing.T) (*httptest.Server, *pgxpool.Pool) {
	t.Helper()
	dsn := os.Getenv("TEST_DATABASE_URL")
	if dsn == "" {
		dsn = "postgres://postgres@localhost:5432/tripdrip_test?sslmode=disable"
	}

	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	pool, err := pgxpool.New(ctx, dsn)
	if err != nil {
		t.Skipf("skipping e2e test: postgres unavailable: %v", err)
	}
	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		t.Skipf("skipping e2e test: postgres ping failed: %v", err)
	}

	// Reset schema cleanly via goose down + up
	_ = db.RollbackAll(ctx, pool)
	if err := db.RunMigrations(ctx, pool); err != nil {
		pool.Close()
		t.Fatalf("migrations failed: %v", err)
	}
	if err := seed.Run(ctx, pool); err != nil {
		pool.Close()
		t.Fatalf("seed failed: %v", err)
	}

	queries := sqlc.New(pool)
	tokens := domain.NewTokenManager("test-jwt-secret-key-at-least-32-chars", 15*time.Minute, 24*time.Hour)

	h := httptransport.NewHandler(
		service.NewAuthService(pool, queries, tokens),
		service.NewVerificationService(queries),
		service.NewMapService(queries),
		service.NewPartnerService(pool, queries),
		service.NewRouteService(pool, queries),
		service.NewWalletService(pool, queries),
		service.NewQonaqService(pool, queries),
		service.NewNetworkingService(pool, queries),
		service.NewChatService(queries),
		service.NewSafetyAdminService(pool, queries),
	)

	srv := httptest.NewServer(httptransport.NewRouter(h, tokens, queries, []string{"*"}))
	t.Cleanup(func() {
		srv.Close()
		pool.Close()
	})
	return srv, pool
}

func doReq(t *testing.T, srv *httptest.Server, method, path, token string, body any, headers ...string) (int, map[string]any) {
	t.Helper()
	var buf bytes.Buffer
	if body != nil {
		if err := json.NewEncoder(&buf).Encode(body); err != nil {
			t.Fatalf("encode body: %v", err)
		}
	}
	req, err := http.NewRequest(method, srv.URL+path, &buf)
	if err != nil {
		t.Fatalf("new request: %v", err)
	}
	req.Header.Set("Content-Type", "application/json")
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}
	for i := 0; i+1 < len(headers); i += 2 {
		req.Header.Set(headers[i], headers[i+1])
	}

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("http do %s %s: %v", method, path, err)
	}
	defer resp.Body.Close()

	var out map[string]any
	_ = json.NewDecoder(resp.Body).Decode(&out)
	return resp.StatusCode, out
}

func TestEndToEndDemoFlowAndInvariants(t *testing.T) {
	srv, pool := setupTestServer(t)
	ctx := context.Background()

	// 0. Healthcheck
	code, _ := doReq(t, srv, http.MethodGet, "/healthz", "", nil)
	if code != http.StatusOK {
		t.Fatalf("healthz expected 200, got %d", code)
	}

	// 1. Register new tourist (country_code=US -> auto role=tourist, is_verified=false)
	email := fmt.Sprintf("alice.%d@test.tripdrip", time.Now().UnixNano())
	code, regResp := doReq(t, srv, http.MethodPost, "/api/v1/auth/register", "", map[string]any{
		"first_name":    "Alice",
		"last_name":     "Traveler",
		"country_code":  "US",
		"email":         email,
		"password":      "SecurePass123",
		"city":          "Almaty",
		"district":      "Medeu",
		"pd_consent":    true,
		"rules_consent": true,
	})
	if code != http.StatusCreated {
		t.Fatalf("register tourist failed: %d %v", code, regResp)
	}
	touristToken := regResp["access_token"].(string)
	touristID := regResp["user"].(map[string]any)["id"].(string)
	if regResp["user"].(map[string]any)["role"] != "tourist" {
		t.Fatalf("expected tourist role, got %v", regResp["user"].(map[string]any)["role"])
	}

	// Update trip dates so tourist promo expires at trip_end_date
	tripStart := time.Now().UTC().Format("2006-01-02")
	tripEnd := time.Now().UTC().AddDate(0, 0, 10).Format("2006-01-02")
	code, _ = doReq(t, srv, http.MethodPatch, "/api/v1/me/profile", touristToken, map[string]any{
		"trip_purpose":    "leisure",
		"trip_start_date": tripStart,
		"trip_end_date":   tripEnd,
		"vibe_preference": "nature",
		"hobbies":         []string{"hiking", "coffee"},
	})
	if code != http.StatusOK {
		t.Fatalf("update profile failed: %d", code)
	}

	// Unverified tourist cannot access map or qonaq
	code, errResp := doReq(t, srv, http.MethodGet, "/api/v1/map/entities", touristToken, nil)
	if code != http.StatusForbidden {
		t.Fatalf("expected 403 before verification, got %d %v", code, errResp)
	}

	// 2. Submit mock KYC verification
	code, verResp := doReq(t, srv, http.MethodPost, "/api/v1/verifications", touristToken, map[string]any{
		"doc_type":      "passport",
		"doc_number":    "US55443322",
		"doc_photo_url": "https://mock.cdn/passport.jpg",
		"selfie_url":    "https://mock.cdn/selfie.jpg",
	})
	if code != http.StatusCreated {
		t.Fatalf("submit verification failed: %d %v", code, verResp)
	}
	verID := verResp["id"].(string)

	// Login as seeded admin and approve verification
	code, admLogin := doReq(t, srv, http.MethodPost, "/api/v1/auth/login", "", map[string]any{
		"email":    "admin@tripdrip.kz",
		"password": "TripDrip2026!",
	})
	if code != http.StatusOK {
		t.Fatalf("admin login failed: %d", code)
	}
	adminToken := admLogin["access_token"].(string)

	code, revResp := doReq(t, srv, http.MethodPost, "/api/v1/admin/verifications/"+verID+"/review", adminToken, map[string]any{
		"decision": "approved",
	})
	if code != http.StatusOK {
		t.Fatalf("admin review failed: %d %v", code, revResp)
	}

	// Verify DB invariant: doc_photo_url and selfie_url must be NULL after admin review
	var docPhoto, selfie *string
	if err := pool.QueryRow(ctx, `SELECT doc_photo_url, selfie_url FROM verifications WHERE id = $1`, verID).Scan(&docPhoto, &selfie); err != nil {
		t.Fatalf("query verification: %v", err)
	}
	if docPhoto != nil || selfie != nil {
		t.Fatalf("expected verification photo URLs to be cleared to NULL, got %v / %v", docPhoto, selfie)
	}

	// 3. Map presence centroid privacy + visibility
	code, mpResp := doReq(t, srv, http.MethodPatch, "/api/v1/me/map-presence", touristToken, map[string]any{
		"city":       "Almaty",
		"district":   "Medeu",
		"is_visible": true,
	})
	if code != http.StatusOK {
		t.Fatalf("map presence update failed: %d %v", code, mpResp)
	}

	code, mapEnt := doReq(t, srv, http.MethodGet, "/api/v1/map/entities?city=Almaty", touristToken, nil)
	if code != http.StatusOK {
		t.Fatalf("get map entities failed: %d %v", code, mapEnt)
	}

	// 4. Qonaq flow: tourist creates request -> local accepts -> tourist selects host -> chat + spam flag -> mutual confirm (+30 coins) -> review
	code, qReq := doReq(t, srv, http.MethodPost, "/api/v1/qonaq/requests", touristToken, map[string]any{
		"help_type":    "city_tour",
		"description":  "Looking for a walk around Panfilov Park and Kok-Tobe",
		"city":         "Almaty",
		"district":     "Medeu",
		"needed_at":    time.Now().UTC().Add(3 * time.Hour).Format(time.RFC3339),
		"people_count": 2,
	})
	if code != http.StatusCreated {
		t.Fatalf("create qonaq request failed: %d %v", code, qReq)
	}
	qonaqReqID := qReq["id"].(string)

	// Login as seeded local (arman.kz@demo.tripdrip)
	code, locLogin := doReq(t, srv, http.MethodPost, "/api/v1/auth/login", "", map[string]any{
		"email":    "arman.kz@demo.tripdrip",
		"password": "TripDrip2026!",
	})
	if code != http.StatusOK {
		t.Fatalf("local login failed: %d", code)
	}
	localToken := locLogin["access_token"].(string)
	localID := locLogin["user"].(map[string]any)["id"].(string)

	code, feed := doReq(t, srv, http.MethodGet, "/api/v1/qonaq/feed?city=Almaty", localToken, nil)
	if code != http.StatusOK || len(feed["items"].([]any)) == 0 {
		t.Fatalf("expected qonaq feed to include request, got %d %v", code, feed)
	}

	code, _ = doReq(t, srv, http.MethodPost, "/api/v1/qonaq/requests/"+qonaqReqID+"/respond", localToken, map[string]any{
		"decision": "accepted",
		"message":  "Happy to show you around!",
	})
	if code != http.StatusOK {
		t.Fatalf("local respond failed: %d", code)
	}

	code, selResp := doReq(t, srv, http.MethodPost, "/api/v1/qonaq/requests/"+qonaqReqID+"/select-host", touristToken, map[string]any{
		"local_id": localID,
	})
	if code != http.StatusOK {
		t.Fatalf("select host failed: %d %v", code, selResp)
	}
	chatID := selResp["chat"].(map[string]any)["id"].(string)

	// Send normal and commercial spam messages
	code, msg1 := doReq(t, srv, http.MethodPost, "/api/v1/chats/"+chatID+"/messages", touristToken, map[string]any{
		"body": "Hi Arman, see you at 3pm!",
	})
	if code != http.StatusCreated || msg1["flagged_commercial"].(bool) {
		t.Fatalf("normal message unexpected result: %d %v", code, msg1)
	}
	code, msg2 := doReq(t, srv, http.MethodPost, "/api/v1/chats/"+chatID+"/messages", localToken, map[string]any{
		"body": "оплата 15000 тг на каспи +7 777 123 45 67",
	})
	if code != http.StatusCreated || !msg2["flagged_commercial"].(bool) {
		t.Fatalf("expected commercial spam flag=true, got %d %v", code, msg2)
	}

	// Mutual confirmation -> +30 coins to local
	code, conf1 := doReq(t, srv, http.MethodPost, "/api/v1/qonaq/requests/"+qonaqReqID+"/confirm", touristToken, nil)
	if code != http.StatusOK || conf1["coins_awarded"].(float64) != 0 {
		t.Fatalf("first confirm should not award coins yet: %d %v", code, conf1)
	}
	code, conf2 := doReq(t, srv, http.MethodPost, "/api/v1/qonaq/requests/"+qonaqReqID+"/confirm", localToken, nil)
	if code != http.StatusOK || conf2["coins_awarded"].(float64) != 30 {
		t.Fatalf("mutual confirm should award 30 coins: %d %v", code, conf2)
	}

	// Review recalculates rating
	code, _ = doReq(t, srv, http.MethodPost, "/api/v1/qonaq/requests/"+qonaqReqID+"/reviews", touristToken, map[string]any{
		"rating":  5,
		"comment": "Awesome tour!",
	})
	if code != http.StatusCreated {
		t.Fatalf("review failed: %d", code)
	}

	// 5. Route generation, anti-fraud check-ins, and completion bonus
	code, routeResp := doReq(t, srv, http.MethodPost, "/api/v1/routes/generate", touristToken, map[string]any{
		"city":            "Almaty",
		"origin_lat":      43.2550,
		"origin_lng":      76.9450,
		"dest_lat":        43.1575,
		"dest_lng":        77.0589,
		"vibe_preference": "both",
	})
	if code != http.StatusCreated {
		t.Fatalf("route generate failed: %d %v", code, routeResp)
	}
	routeID := routeResp["id"].(string)
	stops := routeResp["stops"].([]any)
	if len(stops) < 3 {
		t.Fatalf("expected at least 3 stops, got %d", len(stops))
	}

	firstStop := stops[0].(map[string]any)
	// Out-of-range check-in must fail
	code, _ = doReq(t, srv, http.MethodPost, "/api/v1/routes/"+routeID+"/stops/"+firstStop["point_id"].(string)+"/checkin", touristToken, map[string]any{
		"user_lat": 43.0000,
		"user_lng": 76.0000,
	})
	if code != http.StatusBadRequest {
		t.Fatalf("expected out-of-range 400, got %d", code)
	}

	// Simulate check-in at all stops with anti-fraud speed check verification
	var finalBalance float64
	for i, rawStop := range stops {
		st := rawStop.(map[string]any)
		if i == 1 {
			// Immediate check-in at a distant stop (<1s later) should trigger speed anomaly
			sCode, sErr := doReq(t, srv, http.MethodPost, "/api/v1/routes/"+routeID+"/stops/"+st["point_id"].(string)+"/checkin", touristToken, map[string]any{
				"user_lat": st["lat"].(float64),
				"user_lng": st["lng"].(float64),
			})
			if sCode == http.StatusOK {
				t.Fatalf("expected speed anomaly rejection for instant jump, got 200")
			}
			_ = sErr
		}
		if i > 0 {
			_, _ = pool.Exec(ctx, `UPDATE point_checkins SET checked_in_at = NOW() - INTERVAL '2 hours' WHERE user_id = $1`, touristID)
		}
		code, chkResp := doReq(t, srv, http.MethodPost, "/api/v1/routes/"+routeID+"/stops/"+st["point_id"].(string)+"/checkin", touristToken, map[string]any{
			"user_lat": st["lat"].(float64),
			"user_lng": st["lng"].(float64),
		})
		if code != http.StatusOK {
			t.Fatalf("checkin stop %d failed: %d %v", i, code, chkResp)
		}
		finalBalance = chkResp["new_balance"].(float64)
		if i == len(stops)-1 && !chkResp["route_completed"].(bool) {
			t.Fatalf("expected route_completed=true on last stop")
		}
	}
	if finalBalance < 60 {
		t.Fatalf("expected >= 60 coins after completing route, got %v", finalBalance)
	}

	// Networking flow + hosting lock check
	code, hostLockResp := doReq(t, srv, http.MethodPatch, "/api/v1/me/profile", localToken, map[string]any{
		"can_host_guests": true,
	})
	// arman has completed count 5 and rating 5.00 after review, so test lock on dias.kz (0 completed)
	_, diasLog := doReq(t, srv, http.MethodPost, "/api/v1/auth/login", "", map[string]any{
		"email":    "dias.kz@demo.tripdrip",
		"password": "TripDrip2026!",
	})
	diasTok := diasLog["access_token"].(string)
	code, hostLockResp = doReq(t, srv, http.MethodPatch, "/api/v1/me/profile", diasTok, map[string]any{
		"can_host_guests": true,
	})
	if code != http.StatusForbidden {
		t.Fatalf("expected 403 CANNOT_HOST_NO_RATING for unrated local, got %d %v", code, hostLockResp)
	}

	code, netReq := doReq(t, srv, http.MethodPost, "/api/v1/network-requests", touristToken, map[string]any{
		"receiver_id":   diasLog["user"].(map[string]any)["id"].(string),
		"intro_message": "Hi Dias, visiting Shymkent next week!",
	})
	if code != http.StatusCreated {
		t.Fatalf("create network request failed: %d %v", code, netReq)
	}
	netID := netReq["id"].(string)
	code, netResp := doReq(t, srv, http.MethodPost, "/api/v1/network-requests/"+netID+"/respond", diasTok, map[string]any{
		"decision": "accepted",
	})
	if code != http.StatusOK || netResp["chat"] == nil {
		t.Fatalf("expected networking chat created on accept: %d %v", code, netResp)
	}

	// 6. Exchange coins for QR promo code (Okadzaki 10% for 50 coins)
	code, offersResp := doReq(t, srv, http.MethodGet, "/api/v1/offers", "", nil)
	if code != http.StatusOK {
		t.Fatalf("list offers failed: %d", code)
	}
	var okadzakiOfferID string
	for _, rawOff := range offersResp["items"].([]any) {
		off := rawOff.(map[string]any)
		if off["brand_name"] == "Okadzaki" && off["coin_cost"].(float64) == 50 {
			okadzakiOfferID = off["id"].(string)
			break
		}
	}
	if okadzakiOfferID == "" {
		t.Fatalf("okadzaki 50-coin offer not found")
	}

	code, promoResp := doReq(t, srv, http.MethodPost, "/api/v1/offers/"+okadzakiOfferID+"/exchange", touristToken, nil, "Idempotency-Key", "demo-exchange-1")
	if code != http.StatusCreated {
		t.Fatalf("exchange offer failed: %d %v", code, promoResp)
	}
	promoCode := promoResp["code"].(string)

	// 7. Partner redeems QR promo at specific location and checks stats
	code, partLogin := doReq(t, srv, http.MethodPost, "/api/v1/auth/login", "", map[string]any{
		"email":    "okadzaki@demo.tripdrip",
		"password": "TripDrip2026!",
	})
	if code != http.StatusOK {
		t.Fatalf("partner login failed: %d", code)
	}
	partnerToken := partLogin["access_token"].(string)

	code, partProf := doReq(t, srv, http.MethodGet, "/api/v1/partner/profile", partnerToken, nil)
	if code != http.StatusOK {
		t.Fatalf("get partner profile failed: %d", code)
	}
	locID := partProf["locations"].([]any)[0].(map[string]any)["id"].(string)

	code, redeemResp := doReq(t, srv, http.MethodPost, "/api/v1/partner/promocodes/redeem", partnerToken, map[string]any{
		"code":        promoCode,
		"location_id": locID,
	})
	if code != http.StatusOK || redeemResp["status"] != "redeemed" {
		t.Fatalf("redeem promo failed: %d %v", code, redeemResp)
	}

	// Second redeem attempt must fail
	code, _ = doReq(t, srv, http.MethodPost, "/api/v1/partner/promocodes/redeem", partnerToken, map[string]any{
		"code":        promoCode,
		"location_id": locID,
	})
	if code != http.StatusConflict {
		t.Fatalf("expected 409 on double redeem, got %d", code)
	}

	code, statsResp := doReq(t, srv, http.MethodGet, "/api/v1/partner/stats", partnerToken, nil)
	if code != http.StatusOK || statsResp["total_redeemed"].(float64) != 1 {
		t.Fatalf("unexpected partner stats: %d %v", code, statsResp)
	}

	// 8. Safety: 3 unique reports trigger hidden_by_moderation = true
	reporterEmails := []string{"kenji.jp@demo.tripdrip", "lukas.de@demo.tripdrip", "soojin.kr@demo.tripdrip"}
	for idx, rEmail := range reporterEmails {
		_, rLog := doReq(t, srv, http.MethodPost, "/api/v1/auth/login", "", map[string]any{
			"email":    rEmail,
			"password": "TripDrip2026!",
		})
		rTok := rLog["access_token"].(string)
		code, repResp := doReq(t, srv, http.MethodPost, "/api/v1/reports", rTok, map[string]any{
			"target_user_id": touristID,
			"reason":         "spam",
			"details":        "test report",
		})
		if code != http.StatusCreated {
			t.Fatalf("report %d failed: %d %v", idx, code, repResp)
		}
		if idx == 2 && !repResp["hidden_by_moderation"].(bool) {
			t.Fatalf("expected hidden_by_moderation=true on 3rd unique report")
		}
	}

	// 9. Account deletion cascades profile, verifications, map_presence
	code, _ = doReq(t, srv, http.MethodDelete, "/api/v1/me", touristToken, nil)
	if code != http.StatusOK {
		t.Fatalf("delete /me failed: %d", code)
	}
	var profCnt int
	_ = pool.QueryRow(ctx, `SELECT COUNT(*) FROM profiles WHERE user_id = $1`, uuid.MustParse(touristID)).Scan(&profCnt)
	if profCnt != 0 {
		t.Fatalf("expected profile deleted after DELETE /me")
	}
}
