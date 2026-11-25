package httptransport

import (
	"net/http"
	"strconv"

	"github.com/tripdrip/backend/internal/transport/http/dto"
)

// ========== PARTNER CABINET ==========

func (h *Handler) GetPartnerProfile(w http.ResponseWriter, r *http.Request) {
	u, _ := UserFromContext(r.Context())
	res, err := h.partner.GetProfile(r.Context(), u.ID)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, res)
}

func (h *Handler) CreatePartnerProfile(w http.ResponseWriter, r *http.Request) {
	u, _ := UserFromContext(r.Context())
	var req dto.CreatePartnerProfileRequest
	if err := DecodeJSON(r, &req); err != nil {
		WriteError(w, err)
		return
	}
	res, err := h.partner.CreateProfile(r.Context(), u.ID, req)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusCreated, res)
}

func (h *Handler) AddPartnerLocation(w http.ResponseWriter, r *http.Request) {
	u, _ := UserFromContext(r.Context())
	var req dto.CreatePartnerLocationRequest
	if err := DecodeJSON(r, &req); err != nil {
		WriteError(w, err)
		return
	}
	res, err := h.partner.AddLocation(r.Context(), u.ID, req)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusCreated, res)
}

func (h *Handler) CreatePartnerOffer(w http.ResponseWriter, r *http.Request) {
	u, _ := UserFromContext(r.Context())
	var req dto.CreateOfferRequest
	if err := DecodeJSON(r, &req); err != nil {
		WriteError(w, err)
		return
	}
	res, err := h.partner.CreateOffer(r.Context(), u.ID, req)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusCreated, res)
}

func (h *Handler) RedeemPartnerPromo(w http.ResponseWriter, r *http.Request) {
	u, _ := UserFromContext(r.Context())
	var req dto.RedeemPromoRequest
	if err := DecodeJSON(r, &req); err != nil {
		WriteError(w, err)
		return
	}
	res, err := h.partner.RedeemPromo(r.Context(), u.ID, req)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, res)
}

func (h *Handler) ConfirmPartnerVisit(w http.ResponseWriter, r *http.Request) {
	u, _ := UserFromContext(r.Context())
	var req dto.ConfirmVisitRequest
	if err := DecodeJSON(r, &req); err != nil {
		WriteError(w, err)
		return
	}
	res, err := h.partner.ConfirmVisit(r.Context(), u.ID, req)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, res)
}

func (h *Handler) GetPartnerStats(w http.ResponseWriter, r *http.Request) {
	u, _ := UserFromContext(r.Context())
	res, err := h.partner.GetStats(r.Context(), u.ID)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, res)
}

// ========== SAFETY & ADMIN ==========

func (h *Handler) CreateReport(w http.ResponseWriter, r *http.Request) {
	u, _ := UserFromContext(r.Context())
	var req dto.CreateReportRequest
	if err := DecodeJSON(r, &req); err != nil {
		WriteError(w, err)
		return
	}
	res, err := h.safetyAdmin.FileReport(r.Context(), u.ID, req)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusCreated, res)
}

func (h *Handler) CreateBlock(w http.ResponseWriter, r *http.Request) {
	u, _ := UserFromContext(r.Context())
	var req dto.CreateBlockRequest
	if err := DecodeJSON(r, &req); err != nil {
		WriteError(w, err)
		return
	}
	if err := h.safetyAdmin.BlockUser(r.Context(), u.ID, req.BlockedID); err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusCreated, map[string]string{"status": "blocked"})
}

func (h *Handler) DeleteBlock(w http.ResponseWriter, r *http.Request) {
	u, _ := UserFromContext(r.Context())
	targetID, err := parseUUIDParam(r, "userId")
	if err != nil {
		WriteError(w, err)
		return
	}
	if err := h.safetyAdmin.UnblockUser(r.Context(), u.ID, targetID); err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, map[string]string{"status": "unblocked"})
}

func (h *Handler) ListBlockedUsers(w http.ResponseWriter, r *http.Request) {
	u, _ := UserFromContext(r.Context())
	res, err := h.safetyAdmin.ListBlockedUsers(r.Context(), u.ID)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, map[string]any{"items": res})
}

func parseLimitOffset(r *http.Request) (int32, int32) {
	limit := int32(50)
	offset := int32(0)
	if v, err := strconv.Atoi(r.URL.Query().Get("limit")); err == nil && v > 0 {
		limit = int32(v)
	}
	if v, err := strconv.Atoi(r.URL.Query().Get("offset")); err == nil && v >= 0 {
		offset = int32(v)
	}
	return limit, offset
}

func (h *Handler) AdminListVerifications(w http.ResponseWriter, r *http.Request) {
	limit, offset := parseLimitOffset(r)
	res, err := h.safetyAdmin.ListPendingVerifications(r.Context(), limit, offset)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, map[string]any{"items": res})
}

func (h *Handler) AdminReviewVerification(w http.ResponseWriter, r *http.Request) {
	u, _ := UserFromContext(r.Context())
	id, err := parseUUIDParam(r, "id")
	if err != nil {
		WriteError(w, err)
		return
	}
	var req dto.ReviewVerificationRequest
	if err := DecodeJSON(r, &req); err != nil {
		WriteError(w, err)
		return
	}
	res, err := h.safetyAdmin.ReviewVerification(r.Context(), u.ID, id, req)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, res)
}

func (h *Handler) AdminListReports(w http.ResponseWriter, r *http.Request) {
	limit, offset := parseLimitOffset(r)
	res, err := h.safetyAdmin.ListOpenReports(r.Context(), limit, offset)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, map[string]any{"items": res})
}

func (h *Handler) AdminResolveReport(w http.ResponseWriter, r *http.Request) {
	u, _ := UserFromContext(r.Context())
	id, err := parseUUIDParam(r, "id")
	if err != nil {
		WriteError(w, err)
		return
	}
	var req dto.ResolveReportRequest
	if err := DecodeJSON(r, &req); err != nil {
		WriteError(w, err)
		return
	}
	res, err := h.safetyAdmin.ResolveReport(r.Context(), u.ID, id, req)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, res)
}

func (h *Handler) AdminListPendingPartners(w http.ResponseWriter, r *http.Request) {
	limit, offset := parseLimitOffset(r)
	res, err := h.safetyAdmin.ListPendingPartners(r.Context(), limit, offset)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, map[string]any{"items": res})
}

func (h *Handler) AdminApprovePartner(w http.ResponseWriter, r *http.Request) {
	id, err := parseUUIDParam(r, "id")
	if err != nil {
		WriteError(w, err)
		return
	}
	res, err := h.safetyAdmin.ApprovePartner(r.Context(), id)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, res)
}
