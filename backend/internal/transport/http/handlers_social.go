package httptransport

import (
	"net/http"
	"strconv"
	"time"

	"github.com/tripdrip/backend/internal/domain"
	"github.com/tripdrip/backend/internal/service"
	"github.com/tripdrip/backend/internal/transport/http/dto"
)

// ========== MAP & NETWORKING ==========

func (h *Handler) GetMapEntities(w http.ResponseWriter, r *http.Request) {
	u, _ := UserFromContext(r.Context())
	q := r.URL.Query()
	res, err := h.mapSvc.GetEntities(r.Context(), u.ID, service.MapFilter{
		Layer:    q.Get("layer"),
		City:     q.Get("city"),
		Hobby:    q.Get("hobby"),
		Language: q.Get("language"),
		Vibe:     q.Get("vibe"),
		Country:  q.Get("country"),
	})
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, res)
}

func (h *Handler) UpdateMapPresence(w http.ResponseWriter, r *http.Request) {
	u, _ := UserFromContext(r.Context())
	var req dto.UpdateMapPresenceRequest
	if err := DecodeJSON(r, &req); err != nil {
		WriteError(w, err)
		return
	}
	res, err := h.mapSvc.UpdatePresence(r.Context(), u.ID, req)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, res)
}

func (h *Handler) CreateNetworkRequest(w http.ResponseWriter, r *http.Request) {
	u, _ := UserFromContext(r.Context())
	var req dto.CreateNetworkRequest
	if err := DecodeJSON(r, &req); err != nil {
		WriteError(w, err)
		return
	}
	res, err := h.network.SendRequest(r.Context(), u.ID, req)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusCreated, res)
}

func (h *Handler) ListMyNetworkRequests(w http.ResponseWriter, r *http.Request) {
	u, _ := UserFromContext(r.Context())
	res, err := h.network.ListMyRequests(r.Context(), u.ID)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, map[string]any{"items": res})
}

func (h *Handler) RespondNetworkRequest(w http.ResponseWriter, r *http.Request) {
	u, _ := UserFromContext(r.Context())
	reqID, err := parseUUIDParam(r, "id")
	if err != nil {
		WriteError(w, err)
		return
	}
	var req dto.RespondNetworkRequest
	if err := DecodeJSON(r, &req); err != nil {
		WriteError(w, err)
		return
	}
	res, err := h.network.Respond(r.Context(), u.ID, reqID, req)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, res)
}

// ========== QONAQ & CHATS ==========

func (h *Handler) CreateQonaqRequest(w http.ResponseWriter, r *http.Request) {
	u, _ := UserFromContext(r.Context())
	var req dto.CreateQonaqRequest
	if err := DecodeJSON(r, &req); err != nil {
		WriteError(w, err)
		return
	}
	res, err := h.qonaq.CreateRequest(r.Context(), u.ID, req)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusCreated, res)
}

func (h *Handler) GetQonaqFeed(w http.ResponseWriter, r *http.Request) {
	u, _ := UserFromContext(r.Context())
	city := r.URL.Query().Get("city")
	res, err := h.qonaq.GetFeed(r.Context(), u.ID, city)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, map[string]any{"items": res})
}

func (h *Handler) ListMyQonaqRequests(w http.ResponseWriter, r *http.Request) {
	u, _ := UserFromContext(r.Context())
	res, err := h.qonaq.ListMyRequests(r.Context(), u.ID)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, map[string]any{"items": res})
}

func (h *Handler) ListQonaqResponses(w http.ResponseWriter, r *http.Request) {
	u, _ := UserFromContext(r.Context())
	reqID, err := parseUUIDParam(r, "id")
	if err != nil {
		WriteError(w, err)
		return
	}
	res, err := h.qonaq.ListResponses(r.Context(), u.ID, reqID)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, map[string]any{"items": res})
}

func (h *Handler) RespondQonaqRequest(w http.ResponseWriter, r *http.Request) {
	u, _ := UserFromContext(r.Context())
	reqID, err := parseUUIDParam(r, "id")
	if err != nil {
		WriteError(w, err)
		return
	}
	var req dto.RespondQonaqRequest
	if err := DecodeJSON(r, &req); err != nil {
		WriteError(w, err)
		return
	}
	res, err := h.qonaq.Respond(r.Context(), u.ID, reqID, req)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, res)
}

func (h *Handler) SelectQonaqHost(w http.ResponseWriter, r *http.Request) {
	u, _ := UserFromContext(r.Context())
	reqID, err := parseUUIDParam(r, "id")
	if err != nil {
		WriteError(w, err)
		return
	}
	var req dto.SelectHostRequest
	if err := DecodeJSON(r, &req); err != nil {
		WriteError(w, err)
		return
	}
	res, err := h.qonaq.SelectHost(r.Context(), u.ID, reqID, req.LocalID)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, res)
}

func (h *Handler) ConfirmQonaqDone(w http.ResponseWriter, r *http.Request) {
	u, _ := UserFromContext(r.Context())
	reqID, err := parseUUIDParam(r, "id")
	if err != nil {
		WriteError(w, err)
		return
	}
	res, err := h.qonaq.ConfirmDone(r.Context(), u.ID, reqID)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, res)
}

func (h *Handler) CreateQonaqReview(w http.ResponseWriter, r *http.Request) {
	u, _ := UserFromContext(r.Context())
	reqID, err := parseUUIDParam(r, "id")
	if err != nil {
		WriteError(w, err)
		return
	}
	var req dto.CreateReviewRequest
	if err := DecodeJSON(r, &req); err != nil {
		WriteError(w, err)
		return
	}
	res, err := h.qonaq.CreateReview(r.Context(), u.ID, reqID, req)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusCreated, res)
}

func (h *Handler) ListChats(w http.ResponseWriter, r *http.Request) {
	u, _ := UserFromContext(r.Context())
	res, err := h.chat.ListMyChats(r.Context(), u.ID)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, map[string]any{"items": res})
}

func (h *Handler) ListChatMessages(w http.ResponseWriter, r *http.Request) {
	u, _ := UserFromContext(r.Context())
	chatID, err := parseUUIDParam(r, "id")
	if err != nil {
		WriteError(w, err)
		return
	}
	var before *time.Time
	if rawBefore := r.URL.Query().Get("before"); rawBefore != "" {
		t, err := time.Parse(time.RFC3339, rawBefore)
		if err != nil {
			WriteError(w, domain.BadRequest(domain.ErrCodeValidation, "before must be RFC3339 timestamp"))
			return
		}
		before = &t
	}
	limit := int32(50)
	if rawLimit := r.URL.Query().Get("limit"); rawLimit != "" {
		if v, err := strconv.Atoi(rawLimit); err == nil {
			limit = int32(v)
		}
	}
	res, err := h.chat.GetMessages(r.Context(), u.ID, chatID, before, limit)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusOK, map[string]any{"items": res})
}

func (h *Handler) SendChatMessage(w http.ResponseWriter, r *http.Request) {
	u, _ := UserFromContext(r.Context())
	chatID, err := parseUUIDParam(r, "id")
	if err != nil {
		WriteError(w, err)
		return
	}
	var req dto.SendMessageRequest
	if err := DecodeJSON(r, &req); err != nil {
		WriteError(w, err)
		return
	}
	res, err := h.chat.SendMessage(r.Context(), u.ID, chatID, req)
	if err != nil {
		WriteError(w, err)
		return
	}
	WriteJSON(w, http.StatusCreated, res)
}
