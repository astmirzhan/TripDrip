package httptransport

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/tripdrip/backend/internal/domain"
	"github.com/tripdrip/backend/internal/service"
	"github.com/tripdrip/backend/internal/transport/http/dto"
)

type Handler struct {
	auth         *service.AuthService
	verification *service.VerificationService
	mapSvc       *service.MapService
	partner      *service.PartnerService
	route        *service.RouteService
	wallet       *service.WalletService
	qonaq        *service.QonaqService
	network      *service.NetworkingService
	chat         *service.ChatService
	safetyAdmin  *service.SafetyAdminService
}

func NewHandler(
	auth *service.AuthService,
	verification *service.VerificationService,
	mapSvc *service.MapService,
	partner *service.PartnerService,
	route *service.RouteService,
	wallet *service.WalletService,
	qonaq *service.QonaqService,
	network *service.NetworkingService,
	chat *service.ChatService,
	safetyAdmin *service.SafetyAdminService,
) *Handler {
	return &Handler{
		auth:         auth,
		verification: verification,
		mapSvc:       mapSvc,
		partner:      partner,
		route:        route,
		wallet:       wallet,
		qonaq:        qonaq,
		network:      network,
		chat:         chat,
		safetyAdmin:  safetyAdmin,
	}
}

func parseUUIDParam(r *http.Request, param string) (uuid.UUID, error) {
	raw := chi.URLParam(r, param)
	id, err := uuid.Parse(raw)
	if err != nil {
		return uuid.Nil, domain.BadRequest(domain.ErrCodeValidation, "invalid UUID parameter: "+param)
	}
	return id, nil
}

// ========== AUTH & PROFILE ==========

func (h *Handler) Register(w http.ResponseWriter, r *http.Request) {
	var req dto.RegisterRequest
	if err := DecodeJSON(r, &req); err != nil {
		WriteError(w, err)
		return
	}
	res, err := h.auth.Register(r.Context(), req)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusCreated, res)
}

func (h *Handler) Login(w http.ResponseWriter, r *http.Request) {
	var req dto.LoginRequest
	if err := DecodeJSON(r, &req); err != nil {
		WriteError(w, err)
		return
	}
	res, err := h.auth.Login(r.Context(), req)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, res)
}

func (h *Handler) RefreshToken(w http.ResponseWriter, r *http.Request) {
	var req dto.RefreshTokenRequest
	if err := DecodeJSON(r, &req); err != nil {
		WriteError(w, err)
		return
	}
	res, err := h.auth.Refresh(r.Context(), req.RefreshToken)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, res)
}

func (h *Handler) GetMe(w http.ResponseWriter, r *http.Request) {
	u, _ := UserFromContext(r.Context())
	res, err := h.auth.GetMe(r.Context(), u.ID)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, res)
}

func (h *Handler) UpdateMyProfile(w http.ResponseWriter, r *http.Request) {
	u, _ := UserFromContext(r.Context())
	var req dto.ProfileUpdateRequest
	if err := DecodeJSON(r, &req); err != nil {
		WriteError(w, err)
		return
	}
	res, err := h.auth.UpdateProfile(r.Context(), u.ID, req)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, res)
}

func (h *Handler) DeleteMe(w http.ResponseWriter, r *http.Request) {
	u, _ := UserFromContext(r.Context())
	if err := h.auth.DeleteMe(r.Context(), u.ID); err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, map[string]string{"status": "deleted"})
}

// ========== VERIFICATION ==========

func (h *Handler) SubmitVerification(w http.ResponseWriter, r *http.Request) {
	u, _ := UserFromContext(r.Context())
	var req dto.SubmitVerificationRequest
	if err := DecodeJSON(r, &req); err != nil {
		WriteError(w, err)
		return
	}
	res, err := h.verification.Submit(r.Context(), u.ID, u.Role, req)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusCreated, res)
}

func (h *Handler) GetMyVerification(w http.ResponseWriter, r *http.Request) {
	u, _ := UserFromContext(r.Context())
	res, err := h.verification.GetMyStatus(r.Context(), u.ID)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, res)
}
