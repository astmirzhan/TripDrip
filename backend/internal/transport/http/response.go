package httptransport

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"

	"github.com/tripdrip/backend/internal/domain"
)

type ErrorBody struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

type ErrorEnvelope struct {
	Error ErrorBody `json:"error"`
}

func WriteJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	if payload != nil {
		if err := json.NewEncoder(w).Encode(payload); err != nil {
			slog.Error("failed to write json response", "err", err)
		}
	}
}

func WriteError(w http.ResponseWriter, err error) {
	if appErr, ok := domain.AsAppError(err); ok {
		if appErr.HTTPStatus >= 500 {
			slog.Error("internal application error", "code", appErr.Code, "err", appErr.Err)
		}
		WriteJSON(w, appErr.HTTPStatus, ErrorEnvelope{
			Error: ErrorBody{
				Code:    appErr.Code,
				Message: appErr.Message,
			},
		})
		return
	}

	slog.Error("unhandled error", "err", err)
	WriteJSON(w, http.StatusInternalServerError, ErrorEnvelope{
		Error: ErrorBody{
			Code:    domain.ErrCodeInternal,
			Message: "Internal server error",
		},
	})
}

func DecodeJSON(r *http.Request, dst any) error {
	if r.Body == nil {
		return domain.BadRequest(domain.ErrCodeValidation, "Request body is required")
	}
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	if err := dec.Decode(dst); err != nil {
		var syntaxErr *json.SyntaxError
		if errors.As(err, &syntaxErr) {
			return domain.BadRequest(domain.ErrCodeValidation, "Malformed JSON payload")
		}
		return domain.BadRequest(domain.ErrCodeValidation, "Invalid JSON payload: "+err.Error())
	}
	return nil
}
