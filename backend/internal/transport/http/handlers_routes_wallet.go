package httptransport

import (
	"net/http"
	"strconv"

	"github.com/tripdrip/backend/internal/transport/http/dto"
)

// ========== ROUTES & CHECK-INS ==========

func (h *Handler) GenerateRoute(w http.ResponseWriter, r *http.Request) {
	u, _ := UserFromContext(r.Context())
	var req dto.GenerateRouteRequest
	if err := DecodeJSON(r, &req); err != nil {
		WriteError(w, err)
		return
	}
	res, err := h.route.GenerateRoute(r.Context(), u.ID, req)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusCreated, res)
}

func (h *Handler) GetActiveRoute(w http.ResponseWriter, r *http.Request) {
	u, _ := UserFromContext(r.Context())
	res, err := h.route.GetActiveRoute(r.Context(), u.ID)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, res)
}

func (h *Handler) CheckinRouteStop(w http.ResponseWriter, r *http.Request) {
	u, _ := UserFromContext(r.Context())
	routeID, err := parseUUIDParam(r, "id")
	if err != nil {
		WriteError(w, err)
		return
	}
	pointID, err := parseUUIDParam(r, "pointId")
	if err != nil {
		WriteError(w, err)
		return
	}
	var req dto.CheckinRequest
	if err := DecodeJSON(r, &req); err != nil {
		WriteError(w, err)
		return
	}
	res, err := h.route.CheckIn(r.Context(), u.ID, routeID, pointID, req)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, res)
}

// ========== WALLET & PROMOS ==========

func (h *Handler) GetWallet(w http.ResponseWriter, r *http.Request) {
	u, _ := UserFromContext(r.Context())
	limit := int32(50)
	offset := int32(0)
	if v, err := strconv.Atoi(r.URL.Query().Get("limit")); err == nil {
		limit = int32(v)
	}
	if v, err := strconv.Atoi(r.URL.Query().Get("offset")); err == nil {
		offset = int32(v)
	}
	res, err := h.wallet.GetWallet(r.Context(), u.ID, limit, offset)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, res)
}

func (h *Handler) ListOffers(w http.ResponseWriter, r *http.Request) {
	res, err := h.wallet.ListActiveOffers(r.Context())
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, map[string]any{"items": res})
}

func (h *Handler) ExchangeOffer(w http.ResponseWriter, r *http.Request) {
	u, _ := UserFromContext(r.Context())
	offerID, err := parseUUIDParam(r, "id")
	if err != nil {
		WriteError(w, err)
		return
	}
	idemKey := r.Header.Get("Idempotency-Key")
	if r.ContentLength > 0 {
		var req dto.ExchangeOfferRequest
		if err := DecodeJSON(r, &req); err != nil {
			WriteError(w, err)
			return
		}
		if idemKey == "" && req.IdempotencyKey != nil {
			idemKey = *req.IdempotencyKey
		}
	}
	res, err := h.wallet.ExchangeOffer(r.Context(), u.ID, offerID, idemKey)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusCreated, res)
}

func (h *Handler) ListMyPromoCodes(w http.ResponseWriter, r *http.Request) {
	u, _ := UserFromContext(r.Context())
	res, err := h.wallet.ListMyPromoCodes(r.Context(), u.ID)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, map[string]any{"items": res})
}
