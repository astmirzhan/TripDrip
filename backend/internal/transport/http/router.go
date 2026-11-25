package httptransport

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/tripdrip/backend/internal/db/sqlc"
	"github.com/tripdrip/backend/internal/domain"
)

func NewRouter(h *Handler, tokens *domain.TokenManager, q *sqlc.Queries, corsOrigins []string) http.Handler {
	r := chi.NewRouter()

	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(SlogLogger)
	r.Use(middleware.Recoverer)
	r.Use(CORS(corsOrigins))

	r.Get("/healthz", func(w http.ResponseWriter, _ *http.Request) {
		WriteJSON(w, http.StatusOK, map[string]string{"status": "ok"})
	})

	r.Route("/api/v1", func(api chi.Router) {
		// Public auth & offers catalog
		api.Post("/auth/register", h.Register)
		api.Post("/auth/login", h.Login)
		api.Post("/auth/refresh", h.RefreshToken)
		api.Get("/offers", h.ListOffers)

		// Authenticated routes
		api.Group(func(authed chi.Router) {
			authed.Use(Authenticate(tokens, q))

			// Profile & Verification (available prior to verification approval)
			authed.Get("/me", h.GetMe)
			authed.Patch("/me/profile", h.UpdateMyProfile)
			authed.Delete("/me", h.DeleteMe)

			authed.Post("/verifications", h.SubmitVerification)
			authed.Get("/verifications/me", h.GetMyVerification)

			// Verified-only user routes (Tourist / Local)
			authed.Group(func(verified chi.Router) {
				verified.Use(RequireVerified())

				// Map & Networking
				verified.Get("/map/entities", h.GetMapEntities)
				verified.Patch("/me/map-presence", h.UpdateMapPresence)
				verified.Post("/network-requests", h.CreateNetworkRequest)
				verified.Get("/network-requests", h.ListMyNetworkRequests)
				verified.Post("/network-requests/{id}/respond", h.RespondNetworkRequest)

				// Qonaq & Chats
				verified.With(RequireRoles("tourist")).Post("/qonaq/requests", h.CreateQonaqRequest)
				verified.With(RequireRoles("local")).Get("/qonaq/feed", h.GetQonaqFeed)
				verified.Get("/qonaq/requests/me", h.ListMyQonaqRequests)
				verified.Get("/qonaq/requests/{id}/responses", h.ListQonaqResponses)
				verified.With(RequireRoles("local")).Post("/qonaq/requests/{id}/respond", h.RespondQonaqRequest)
				verified.With(RequireRoles("tourist")).Post("/qonaq/requests/{id}/select-host", h.SelectQonaqHost)
				verified.Post("/qonaq/requests/{id}/confirm", h.ConfirmQonaqDone)
				verified.Post("/qonaq/requests/{id}/reviews", h.CreateQonaqReview)

				verified.Get("/chats", h.ListChats)
				verified.Get("/chats/{id}/messages", h.ListChatMessages)
				verified.Post("/chats/{id}/messages", h.SendChatMessage)

				// Routes & Check-ins
				verified.Post("/routes/generate", h.GenerateRoute)
				verified.Get("/routes/active", h.GetActiveRoute)
				verified.Post("/routes/{id}/stops/{pointId}/checkin", h.CheckinRouteStop)

				// Wallet & Promos
				verified.Get("/wallet", h.GetWallet)
				verified.Post("/offers/{id}/exchange", h.ExchangeOffer)
				verified.Get("/promocodes/me", h.ListMyPromoCodes)

				// Safety
				verified.Post("/reports", h.CreateReport)
				verified.Post("/blocks", h.CreateBlock)
				verified.Delete("/blocks/{userId}", h.DeleteBlock)
				verified.Get("/blocks", h.ListBlockedUsers)
			})

			// Partner Cabinet
			authed.Route("/partner", func(pr chi.Router) {
				pr.Use(RequireRoles("partner"))
				pr.Get("/profile", h.GetPartnerProfile)
				pr.Post("/profile", h.CreatePartnerProfile)
				pr.Post("/locations", h.AddPartnerLocation)
				pr.Post("/offers", h.CreatePartnerOffer)
				pr.Post("/promocodes/redeem", h.RedeemPartnerPromo)
				pr.Post("/visits/confirm", h.ConfirmPartnerVisit)
				pr.Get("/stats", h.GetPartnerStats)
			})

			// Admin Moderation Panel
			authed.Route("/admin", func(adm chi.Router) {
				adm.Use(RequireRoles("admin"))
				adm.Get("/verifications", h.AdminListVerifications)
				adm.Post("/verifications/{id}/review", h.AdminReviewVerification)
				adm.Get("/reports", h.AdminListReports)
				adm.Post("/reports/{id}/resolve", h.AdminResolveReport)
				adm.Get("/partners", h.AdminListPendingPartners)
				adm.Post("/partners/{id}/approve", h.AdminApprovePartner)
			})
		})
	})

	return r
}
