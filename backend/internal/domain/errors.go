package domain

import (
	"errors"
	"fmt"
	"net/http"
)

// Error codes standardized across all REST responses.
const (
	ErrCodeValidation            = "VALIDATION_ERROR"
	ErrCodeUnauthorized          = "UNAUTHORIZED"
	ErrCodeInvalidCredentials    = "AUTH_INVALID_CREDENTIALS"
	ErrCodeForbidden             = "FORBIDDEN"
	ErrCodeUserNotVerified       = "USER_NOT_VERIFIED"
	ErrCodeUserBanned            = "USER_BANNED"
	ErrCodeNotFound              = "NOT_FOUND"
	ErrCodeConflict              = "CONFLICT"
	ErrCodeVerificationPending   = "VERIFICATION_PENDING"
	ErrCodeVerificationApproved  = "VERIFICATION_ALREADY_APPROVED"
	ErrCodePartnerNotApproved    = "PARTNER_NOT_APPROVED"
	ErrCodeCheckinOutOfRange     = "CHECKIN_OUT_OF_RANGE"
	ErrCodeCheckinSpeedAnomaly   = "CHECKIN_SPEED_ANOMALY"
	ErrCodeCheckinDuplicate      = "CHECKIN_DUPLICATE"
	ErrCodeInsufficientCoins     = "INSUFFICIENT_COINS"
	ErrCodeOfferExhausted        = "OFFER_EXHAUSTED"
	ErrCodeOfferInactive         = "OFFER_INACTIVE"
	ErrCodePromoAlreadyRedeemed  = "PROMO_ALREADY_REDEEMED"
	ErrCodePromoExpired          = "PROMO_EXPIRED"
	ErrCodePromoInvalid          = "PROMO_INVALID"
	ErrCodeQonaqLimitExceeded    = "QONAQ_LIMIT_EXCEEDED"
	ErrCodeQonaqAlreadyResponded = "QONAQ_ALREADY_RESPONDED"
	ErrCodeQonaqInvalidState     = "QONAQ_INVALID_STATE"
	ErrCodeNetworkRequestExists  = "NETWORK_REQUEST_EXISTS"
	ErrCodeBlockedUsers          = "USER_BLOCKED"
	ErrCodeReportDuplicate       = "REPORT_DUPLICATE"
	ErrCodeReportSelf            = "REPORT_SELF"
	ErrCodeBlockSelf             = "BLOCK_SELF"
	ErrCodeChatAccessDenied      = "CHAT_ACCESS_DENIED"
	ErrCodeCannotHostNoRating    = "CANNOT_HOST_NO_RATING"
	ErrCodeInternal              = "INTERNAL_ERROR"
)

// AppError represents a domain error mapped cleanly to an HTTP response.
type AppError struct {
	HTTPStatus int
	Code       string
	Message    string
	Err        error
}

func (e *AppError) Error() string {
	if e.Err != nil {
		return fmt.Sprintf("%s: %s (%v)", e.Code, e.Message, e.Err)
	}
	return fmt.Sprintf("%s: %s", e.Code, e.Message)
}

func (e *AppError) Unwrap() error {
	return e.Err
}

func NewAppError(status int, code, message string) *AppError {
	return &AppError{
		HTTPStatus: status,
		Code:       code,
		Message:    message,
	}
}

func WrapAppError(status int, code, message string, err error) *AppError {
	return &AppError{
		HTTPStatus: status,
		Code:       code,
		Message:    message,
		Err:        err,
	}
}

func BadRequest(code, message string) *AppError {
	return NewAppError(http.StatusBadRequest, code, message)
}

func Unauthorized(code, message string) *AppError {
	return NewAppError(http.StatusUnauthorized, code, message)
}

func Forbidden(code, message string) *AppError {
	return NewAppError(http.StatusForbidden, code, message)
}

func NotFound(message string) *AppError {
	return NewAppError(http.StatusNotFound, ErrCodeNotFound, message)
}

func Conflict(code, message string) *AppError {
	return NewAppError(http.StatusConflict, code, message)
}

func Internal(err error) *AppError {
	return WrapAppError(http.StatusInternalServerError, ErrCodeInternal, "Internal server error", err)
}

func AsAppError(err error) (*AppError, bool) {
	var appErr *AppError
	if errors.As(err, &appErr) {
		return appErr, true
	}
	return nil, false
}
