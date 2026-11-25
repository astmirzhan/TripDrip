package dto

import (
	"time"

	"github.com/google/uuid"
)

// ========== AUTH & PROFILE ==========

type RegisterRequest struct {
	FirstName    string  `json:"first_name"`
	LastName     string  `json:"last_name"`
	CountryCode  string  `json:"country_code"`
	Email        *string `json:"email,omitempty"`
	Phone        *string `json:"phone,omitempty"`
	Password     string  `json:"password"`
	City         string  `json:"city"`
	District     *string `json:"district,omitempty"`
	Role         *string `json:"role,omitempty"` // Optional: "partner" when registering business, otherwise auto-assigned
	BrandName    *string `json:"brand_name,omitempty"`
	Category     *string `json:"category,omitempty"`
	BIN          *string `json:"bin,omitempty"`
	LogoURL      *string `json:"logo_url,omitempty"`
	PDConsent    bool    `json:"pd_consent"`
	RulesConsent bool    `json:"rules_consent"`
}

type LoginRequest struct {
	Email    *string `json:"email,omitempty"`
	Phone    *string `json:"phone,omitempty"`
	Password string  `json:"password"`
}

type RefreshTokenRequest struct {
	RefreshToken string `json:"refresh_token"`
}

type LanguageSkill struct {
	Code  string `json:"code"`
	Level string `json:"level"`
}

type ProfileUpdateRequest struct {
	TripPurpose        *string         `json:"trip_purpose,omitempty"`
	TripStartDate      *string         `json:"trip_start_date,omitempty"` // YYYY-MM-DD
	TripEndDate        *string         `json:"trip_end_date,omitempty"`   // YYYY-MM-DD
	VibePreference     *string         `json:"vibe_preference,omitempty"`
	Hobbies            []string        `json:"hobbies,omitempty"`
	Languages          []LanguageSkill `json:"languages,omitempty"`
	City               *string         `json:"city,omitempty"`
	District           *string         `json:"district,omitempty"`
	Expectations       *string         `json:"expectations,omitempty"`
	ReadyForNetworking *bool           `json:"ready_for_networking,omitempty"`
	CanHostGuests      *bool           `json:"can_host_guests,omitempty"`
	AvatarURL          *string         `json:"avatar_url,omitempty"`
}

type AuthResponse struct {
	User         UserProfileResponse `json:"user"`
	AccessToken  string              `json:"access_token"`
	RefreshToken string              `json:"refresh_token"`
	ExpiresIn    int64               `json:"expires_in"`
}

type UserProfileResponse struct {
	ID                  uuid.UUID       `json:"id"`
	Role                string          `json:"role"`
	FirstName           string          `json:"first_name"`
	LastName            string          `json:"last_name"`
	CountryCode         string          `json:"country_code"`
	Email               *string         `json:"email,omitempty"`
	Phone               *string         `json:"phone,omitempty"`
	AvatarURL           *string         `json:"avatar_url,omitempty"`
	IsVerified          bool            `json:"is_verified"`
	IsBanned            bool            `json:"is_banned"`
	TripPurpose         *string         `json:"trip_purpose,omitempty"`
	TripStartDate       *string         `json:"trip_start_date,omitempty"`
	TripEndDate         *string         `json:"trip_end_date,omitempty"`
	VibePreference      string          `json:"vibe_preference"`
	Hobbies             []string        `json:"hobbies"`
	Languages           []LanguageSkill `json:"languages"`
	City                string          `json:"city"`
	District            *string         `json:"district,omitempty"`
	Expectations        *string         `json:"expectations,omitempty"`
	ReadyForNetworking  bool            `json:"ready_for_networking"`
	CanHostGuests       bool            `json:"can_host_guests"`
	QonaqCompletedCount int32           `json:"qonaq_completed_count"`
	RatingAvg           string          `json:"rating_avg"`
	RatingCount         int32           `json:"rating_count"`
	CreatedAt           time.Time       `json:"created_at"`
}

// ========== VERIFICATION ==========

type SubmitVerificationRequest struct {
	DocType     string `json:"doc_type"` // passport | iin
	DocNumber   string `json:"doc_number"`
	DocPhotoURL string `json:"doc_photo_url"`
	SelfieURL   string `json:"selfie_url"`
}

type VerificationResponse struct {
	ID              uuid.UUID  `json:"id"`
	UserID          uuid.UUID  `json:"user_id"`
	DocType         string     `json:"doc_type"`
	DocPhotoURL     *string    `json:"doc_photo_url,omitempty"`
	SelfieURL       *string    `json:"selfie_url,omitempty"`
	Status          string     `json:"status"`
	RejectionReason *string    `json:"rejection_reason,omitempty"`
	CreatedAt       time.Time  `json:"created_at"`
	ReviewedAt      *time.Time `json:"reviewed_at,omitempty"`
}

// ========== MAP & NETWORKING ==========

type UpdateMapPresenceRequest struct {
	City         string     `json:"city"`
	District     *string    `json:"district,omitempty"`
	IsVisible    bool       `json:"is_visible"`
	VisibleUntil *time.Time `json:"visible_until,omitempty"`
}

type MapPresenceResponse struct {
	UserID             uuid.UUID  `json:"user_id"`
	City               string     `json:"city"`
	District           *string    `json:"district,omitempty"`
	ApproxLat          float64    `json:"approx_lat"`
	ApproxLng          float64    `json:"approx_lng"`
	IsVisible          bool       `json:"is_visible"`
	HiddenByModeration bool       `json:"hidden_by_moderation"`
	VisibleUntil       *time.Time `json:"visible_until,omitempty"`
	UpdatedAt          time.Time  `json:"updated_at"`
}

type MapPersonEntity struct {
	UserID              uuid.UUID       `json:"user_id"`
	Role                string          `json:"role"`
	FirstName           string          `json:"first_name"`
	LastName            string          `json:"last_name"`
	CountryCode         string          `json:"country_code"`
	AvatarURL           *string         `json:"avatar_url,omitempty"`
	VibePreference      string          `json:"vibe_preference"`
	Hobbies             []string        `json:"hobbies"`
	Languages           []LanguageSkill `json:"languages"`
	Expectations        *string         `json:"expectations,omitempty"`
	ReadyForNetworking  bool            `json:"ready_for_networking"`
	CanHostGuests       bool            `json:"can_host_guests"`
	QonaqCompletedCount int32           `json:"qonaq_completed_count"`
	RatingAvg           string          `json:"rating_avg"`
	RatingCount         int32           `json:"rating_count"`
	City                string          `json:"city"`
	District            *string         `json:"district,omitempty"`
	ApproxLat           float64         `json:"approx_lat"`
	ApproxLng           float64         `json:"approx_lng"`
}

type MapPartnerEntity struct {
	PartnerID   uuid.UUID `json:"partner_id"`
	BrandName   string    `json:"brand_name"`
	Category    string    `json:"category"`
	LogoURL     *string   `json:"logo_url,omitempty"`
	LocationID  uuid.UUID `json:"location_id"`
	BranchName  string    `json:"branch_name"`
	City        string    `json:"city"`
	Address     string    `json:"address"`
	Lat         float64   `json:"lat"`
	Lng         float64   `json:"lng"`
	PointID     uuid.UUID `json:"point_id"`
	Vibe        string    `json:"vibe"`
	RewardCoins int32     `json:"reward_coins"`
	IsBoosted   bool      `json:"is_boosted"`
}

type MapEntitiesResponse struct {
	People   []MapPersonEntity  `json:"people"`
	Partners []MapPartnerEntity `json:"partners"`
}

type CreateNetworkRequest struct {
	ReceiverID   uuid.UUID `json:"receiver_id"`
	IntroMessage *string   `json:"intro_message,omitempty"`
}

type RespondNetworkRequest struct {
	Decision string `json:"decision"` // accepted | declined
}

// ========== QONAQ & CHATS ==========

type CreateQonaqRequest struct {
	TargetLocalID *uuid.UUID `json:"target_local_id,omitempty"`
	HelpType      string     `json:"help_type"`
	Description   string     `json:"description"`
	City          string     `json:"city"`
	District      *string    `json:"district,omitempty"`
	NeededAt      time.Time  `json:"needed_at"`
	PeopleCount   int16      `json:"people_count"`
}

type RespondQonaqRequest struct {
	Decision string  `json:"decision"` // accepted | declined
	Message  *string `json:"message,omitempty"`
}

type SelectHostRequest struct {
	LocalID uuid.UUID `json:"local_id"`
}

type CreateReviewRequest struct {
	Rating  int16   `json:"rating"`
	Comment *string `json:"comment,omitempty"`
}

type SendMessageRequest struct {
	Body string `json:"body"`
}

// ========== ROUTES & CHECKINS ==========

type GenerateRouteRequest struct {
	City           string  `json:"city"`
	OriginLat      float64 `json:"origin_lat"`
	OriginLng      float64 `json:"origin_lng"`
	DestLat        float64 `json:"dest_lat"`
	DestLng        float64 `json:"dest_lng"`
	VibePreference string  `json:"vibe_preference"`
}

type RouteStopResponse struct {
	PointID           uuid.UUID  `json:"point_id"`
	StopOrder         int16      `json:"stop_order"`
	PointType         string     `json:"point_type"`
	PartnerLocationID *uuid.UUID `json:"partner_location_id,omitempty"`
	Name              string     `json:"name"`
	Description       *string    `json:"description,omitempty"`
	City              string     `json:"city"`
	Vibe              string     `json:"vibe"`
	Lat               float64    `json:"lat"`
	Lng               float64    `json:"lng"`
	RadiusMeters      int32      `json:"radius_meters"`
	RewardCoins       int32      `json:"reward_coins"`
	IsBoosted         bool       `json:"is_boosted"`
	IsVisited         bool       `json:"is_visited"`
	VisitedAt         *time.Time `json:"visited_at,omitempty"`
}

type RouteResponse struct {
	ID                    uuid.UUID           `json:"id"`
	UserID                uuid.UUID           `json:"user_id"`
	City                  string              `json:"city"`
	OriginLat             float64             `json:"origin_lat"`
	OriginLng             float64             `json:"origin_lng"`
	DestLat               float64             `json:"dest_lat"`
	DestLng               float64             `json:"dest_lng"`
	VibePreference        string              `json:"vibe_preference"`
	Status                string              `json:"status"`
	CompletionRewardCoins int32               `json:"completion_reward_coins"`
	Stops                 []RouteStopResponse `json:"stops"`
	CreatedAt             time.Time           `json:"created_at"`
	CompletedAt           *time.Time          `json:"completed_at,omitempty"`
}

type CheckinRequest struct {
	UserLat float64 `json:"user_lat"`
	UserLng float64 `json:"user_lng"`
}

type CheckinResponse struct {
	CheckinID      uuid.UUID `json:"checkin_id"`
	CoinsAwarded   int32     `json:"coins_awarded"`
	RouteCompleted bool      `json:"route_completed"`
	RouteBonus     int32     `json:"route_bonus"`
	NewBalance     int32     `json:"new_balance"`
}

// ========== WALLET & PROMOS ==========

type ExchangeOfferRequest struct {
	IdempotencyKey *string `json:"idempotency_key,omitempty"`
}

// ========== PARTNER ==========

type CreatePartnerProfileRequest struct {
	BrandName string  `json:"brand_name"`
	Category  string  `json:"category"`
	BIN       string  `json:"bin"`
	LogoURL   *string `json:"logo_url,omitempty"`
}

type CreatePartnerLocationRequest struct {
	BranchName   string  `json:"branch_name"`
	City         string  `json:"city"`
	Address      string  `json:"address"`
	Lat          float64 `json:"lat"`
	Lng          float64 `json:"lng"`
	Vibe         string  `json:"vibe"`
	Description  *string `json:"description,omitempty"`
	RadiusMeters int32   `json:"radius_meters"`
	IsBoosted    bool    `json:"is_boosted"`
}

type CreateOfferRequest struct {
	Title           string  `json:"title"`
	Description     *string `json:"description,omitempty"`
	DiscountPercent int16   `json:"discount_percent"`
	CoinCost        int32   `json:"coin_cost"`
	TotalLimit      int32   `json:"total_limit"`
}

type RedeemPromoRequest struct {
	Code       string    `json:"code"`
	LocationID uuid.UUID `json:"location_id"`
}

type ConfirmVisitRequest struct {
	UserID     uuid.UUID `json:"user_id"`
	LocationID uuid.UUID `json:"location_id"`
	PointID    uuid.UUID `json:"point_id"`
}

// ========== SAFETY & ADMIN ==========

type CreateReportRequest struct {
	TargetUserID uuid.UUID `json:"target_user_id"`
	Reason       string    `json:"reason"`
	Details      *string   `json:"details,omitempty"`
}

type CreateBlockRequest struct {
	BlockedID uuid.UUID `json:"blocked_id"`
}

type ReviewVerificationRequest struct {
	Decision        string  `json:"decision"` // approved | rejected
	RejectionReason *string `json:"rejection_reason,omitempty"`
}

type ResolveReportRequest struct {
	Status  string `json:"status"` // resolved | dismissed
	BanUser bool   `json:"ban_user"`
}
