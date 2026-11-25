-- +goose Up
-- +goose StatementBegin
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==========================================
-- 1. ENUMS
-- ==========================================
CREATE TYPE user_role_enum AS ENUM ('tourist', 'local', 'partner', 'admin');
CREATE TYPE verification_doc_enum AS ENUM ('passport', 'iin');
CREATE TYPE verification_status_enum AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE trip_purpose_enum AS ENUM ('leisure', 'work', 'study', 'family');
CREATE TYPE vibe_pref_enum AS ENUM ('nature', 'megapolis', 'both');

CREATE TYPE help_type_enum AS ENUM ('directions', 'translation_call', 'city_tour', 'dastarkhan', 'host_stay');
CREATE TYPE help_status_enum AS ENUM ('open', 'has_responses', 'matched', 'completed', 'cancelled', 'expired');
CREATE TYPE request_decision_enum AS ENUM ('pending', 'accepted', 'declined');
CREATE TYPE chat_context_enum AS ENUM ('qonaq', 'networking');

CREATE TYPE point_type_enum AS ENUM ('landmark', 'partner');
CREATE TYPE route_status_enum AS ENUM ('active', 'completed', 'abandoned');
CREATE TYPE coin_reason_enum AS ENUM ('landmark_checkin', 'partner_visit', 'route_completed', 'qonaq_help', 'promo_exchange');
CREATE TYPE promo_status_enum AS ENUM ('active', 'redeemed', 'expired');
CREATE TYPE report_status_enum AS ENUM ('open', 'resolved', 'dismissed');

-- ==========================================
-- 2. USERS, PROFILES, VERIFICATION, MAP PRESENCE
-- ==========================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role user_role_enum NOT NULL,
    first_name VARCHAR(80) NOT NULL,
    last_name VARCHAR(80) NOT NULL,
    country_code CHAR(2) NOT NULL,
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(32) UNIQUE,
    password_hash TEXT NOT NULL,
    avatar_url TEXT,
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    is_banned BOOLEAN NOT NULL DEFAULT FALSE,
    pd_consent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    rules_consent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    CONSTRAINT chk_contact_present CHECK (email IS NOT NULL OR phone IS NOT NULL)
);

CREATE TABLE profiles (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    trip_purpose trip_purpose_enum,
    trip_start_date DATE,
    trip_end_date DATE,
    vibe_preference vibe_pref_enum NOT NULL DEFAULT 'both',
    hobbies TEXT[] NOT NULL DEFAULT '{}',
    languages JSONB NOT NULL DEFAULT '[]',
    city VARCHAR(100) NOT NULL,
    district VARCHAR(120),
    expectations VARCHAR(240),
    ready_for_networking BOOLEAN NOT NULL DEFAULT FALSE,
    can_host_guests BOOLEAN NOT NULL DEFAULT FALSE,
    qonaq_completed_count INT NOT NULL DEFAULT 0 CHECK (qonaq_completed_count >= 0),
    rating_avg NUMERIC(3,2) NOT NULL DEFAULT 0.00,
    rating_count INT NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_trip_dates CHECK (trip_end_date IS NULL OR trip_start_date IS NULL OR trip_end_date >= trip_start_date)
);

CREATE INDEX idx_profiles_hobbies_gin ON profiles USING GIN (hobbies);
CREATE INDEX idx_profiles_languages_gin ON profiles USING GIN (languages jsonb_path_ops);
CREATE INDEX idx_profiles_city ON profiles (city);

CREATE TABLE verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    doc_type verification_doc_enum NOT NULL,
    doc_number_hash TEXT NOT NULL,
    doc_photo_url TEXT,
    selfie_url TEXT,
    status verification_status_enum NOT NULL DEFAULT 'pending',
    rejection_reason TEXT,
    reviewed_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ
);

CREATE INDEX idx_verifications_status ON verifications (status, created_at);

CREATE TABLE map_presence (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    city VARCHAR(100) NOT NULL,
    district VARCHAR(120),
    approx_lat DOUBLE PRECISION NOT NULL,
    approx_lng DOUBLE PRECISION NOT NULL,
    is_visible BOOLEAN NOT NULL DEFAULT FALSE,
    hidden_by_moderation BOOLEAN NOT NULL DEFAULT FALSE,
    visible_until TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_map_presence_active ON map_presence (city)
    WHERE is_visible = TRUE AND hidden_by_moderation = FALSE;

-- ==========================================
-- 3. PARTNERS (1:N LOCATIONS) & OFFERS
-- ==========================================
CREATE TABLE partners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE RESTRICT,
    brand_name VARCHAR(150) NOT NULL,
    category VARCHAR(60) NOT NULL,
    bin CHAR(12) NOT NULL UNIQUE,
    logo_url TEXT,
    is_approved BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE partner_locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    branch_name VARCHAR(150) NOT NULL,
    city VARCHAR(100) NOT NULL,
    address TEXT NOT NULL,
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_partner_locations_partner ON partner_locations (partner_id);
CREATE INDEX idx_partner_locations_city ON partner_locations (city) WHERE is_active = TRUE;

CREATE TABLE offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    description TEXT,
    discount_percent SMALLINT NOT NULL CHECK (discount_percent BETWEEN 1 AND 100),
    coin_cost INT NOT NULL CHECK (coin_cost > 0),
    total_limit INT NOT NULL CHECK (total_limit > 0),
    remaining_limit INT NOT NULL CHECK (remaining_limit >= 0),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_offer_limits CHECK (remaining_limit <= total_limit)
);

-- ==========================================
-- 4. MAP POINTS, UNIQUE ROUTES & ANTI-FRAUD CHECK-INS
-- ==========================================
CREATE TABLE map_points (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    point_type point_type_enum NOT NULL,
    partner_location_id UUID UNIQUE REFERENCES partner_locations(id) ON DELETE CASCADE,
    name VARCHAR(160) NOT NULL,
    description TEXT,
    city VARCHAR(100) NOT NULL,
    vibe vibe_pref_enum NOT NULL DEFAULT 'both',
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    radius_meters INT NOT NULL DEFAULT 100 CHECK (radius_meters > 0),
    reward_coins INT NOT NULL DEFAULT 10 CHECK (reward_coins >= 0),
    is_boosted BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    CONSTRAINT chk_point_partner_link CHECK (
        (point_type = 'partner' AND partner_location_id IS NOT NULL) OR
        (point_type = 'landmark' AND partner_location_id IS NULL)
    )
);

CREATE INDEX idx_map_points_city_active ON map_points (city, point_type) WHERE is_active = TRUE;

CREATE TABLE user_routes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    city VARCHAR(100) NOT NULL,
    origin_lat DOUBLE PRECISION NOT NULL,
    origin_lng DOUBLE PRECISION NOT NULL,
    dest_lat DOUBLE PRECISION NOT NULL,
    dest_lng DOUBLE PRECISION NOT NULL,
    vibe_preference vibe_pref_enum NOT NULL,
    status route_status_enum NOT NULL DEFAULT 'active',
    completion_reward_coins INT NOT NULL DEFAULT 30,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE TABLE user_route_stops (
    route_id UUID NOT NULL REFERENCES user_routes(id) ON DELETE CASCADE,
    point_id UUID NOT NULL REFERENCES map_points(id) ON DELETE RESTRICT,
    stop_order SMALLINT NOT NULL CHECK (stop_order > 0),
    is_visited BOOLEAN NOT NULL DEFAULT FALSE,
    visited_at TIMESTAMPTZ,
    PRIMARY KEY (route_id, stop_order),
    UNIQUE (route_id, point_id)
);

CREATE TABLE point_checkins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    point_id UUID NOT NULL REFERENCES map_points(id) ON DELETE RESTRICT,
    point_type point_type_enum NOT NULL,
    partner_id UUID REFERENCES partners(id),
    route_id UUID REFERENCES user_routes(id),
    user_lat DOUBLE PRECISION NOT NULL,
    user_lng DOUBLE PRECISION NOT NULL,
    checkin_date DATE NOT NULL DEFAULT CURRENT_DATE,
    checked_in_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX uq_checkin_landmark_once
    ON point_checkins (user_id, point_id)
    WHERE point_type = 'landmark';

CREATE UNIQUE INDEX uq_checkin_partner_daily
    ON point_checkins (user_id, partner_id, checkin_date)
    WHERE point_type = 'partner';

CREATE INDEX idx_checkins_user_latest ON point_checkins (user_id, checked_in_at DESC);

-- ==========================================
-- 5. QONAQ, NETWORKING & UNIFIED CHATS
-- ==========================================
CREATE TABLE help_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tourist_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_local_id UUID REFERENCES users(id) ON DELETE SET NULL,
    selected_local_id UUID REFERENCES users(id) ON DELETE SET NULL,
    help_type help_type_enum NOT NULL,
    description VARCHAR(300) NOT NULL,
    city VARCHAR(100) NOT NULL,
    district VARCHAR(120),
    needed_at TIMESTAMPTZ NOT NULL,
    people_count SMALLINT NOT NULL DEFAULT 1 CHECK (people_count BETWEEN 1 AND 20),
    status help_status_enum NOT NULL DEFAULT 'open',
    tourist_confirmed_done BOOLEAN NOT NULL DEFAULT FALSE,
    local_confirmed_done BOOLEAN NOT NULL DEFAULT FALSE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_help_requests_feed ON help_requests (city, status, expires_at)
    WHERE status IN ('open', 'has_responses');

CREATE TABLE help_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES help_requests(id) ON DELETE CASCADE,
    local_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    decision request_decision_enum NOT NULL,
    message VARCHAR(200),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (request_id, local_id)
);

CREATE TABLE network_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    intro_message VARCHAR(240),
    status request_decision_enum NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    responded_at TIMESTAMPTZ,
    CONSTRAINT chk_network_not_self CHECK (sender_id <> receiver_id),
    UNIQUE (sender_id, receiver_id)
);

CREATE TABLE chats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    context_type chat_context_enum NOT NULL,
    help_request_id UUID UNIQUE REFERENCES help_requests(id) ON DELETE CASCADE,
    network_request_id UUID UNIQUE REFERENCES network_requests(id) ON DELETE CASCADE,
    user1_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user2_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_chat_users_diff CHECK (user1_id <> user2_id),
    CONSTRAINT chk_chat_context_fk CHECK (
        (context_type = 'qonaq' AND help_request_id IS NOT NULL AND network_request_id IS NULL) OR
        (context_type = 'networking' AND network_request_id IS NOT NULL AND help_request_id IS NULL)
    )
);

CREATE INDEX idx_chats_user1 ON chats (user1_id);
CREATE INDEX idx_chats_user2 ON chats (user2_id);

CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    body TEXT NOT NULL,
    flagged_commercial BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_messages_chat_time ON messages (chat_id, created_at ASC);

CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    help_request_id UUID NOT NULL REFERENCES help_requests(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reviewee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_review_not_self CHECK (reviewer_id <> reviewee_id),
    UNIQUE (help_request_id, reviewer_id)
);

-- ==========================================
-- 6. ATOMIC WALLETS, LEDGER & PROMO CODES
-- ==========================================
CREATE TABLE wallets (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    balance INT NOT NULL DEFAULT 0 CHECK (balance >= 0),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE coin_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount INT NOT NULL CHECK (amount <> 0),
    reason coin_reason_enum NOT NULL,
    reference_id UUID,
    idempotency_key VARCHAR(120) NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_coin_tx_user ON coin_transactions (user_id, created_at DESC);

CREATE TABLE promo_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(32) NOT NULL UNIQUE,
    offer_id UUID NOT NULL REFERENCES offers(id) ON DELETE RESTRICT,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status promo_status_enum NOT NULL DEFAULT 'active',
    expires_at TIMESTAMPTZ NOT NULL,
    redeemed_at TIMESTAMPTZ,
    redeemed_location_id UUID REFERENCES partner_locations(id),
    redeemed_by_user_id UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_promo_codes_user ON promo_codes (user_id, status);

-- ==========================================
-- 7. SAFETY & MODERATION
-- ==========================================
CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reason VARCHAR(120) NOT NULL,
    details TEXT,
    status report_status_enum NOT NULL DEFAULT 'open',
    reviewed_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    CONSTRAINT chk_report_not_self CHECK (reporter_id <> target_user_id),
    UNIQUE (reporter_id, target_user_id)
);

CREATE INDEX idx_reports_open ON reports (status, created_at) WHERE status = 'open';

CREATE TABLE blocks (
    blocker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    blocked_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (blocker_id, blocked_id),
    CONSTRAINT chk_block_not_self CHECK (blocker_id <> blocked_id)
);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS blocks;
DROP TABLE IF EXISTS reports;
DROP TABLE IF EXISTS promo_codes;
DROP TABLE IF EXISTS coin_transactions;
DROP TABLE IF EXISTS wallets;
DROP TABLE IF EXISTS reviews;
DROP TABLE IF EXISTS messages;
DROP TABLE IF EXISTS chats;
DROP TABLE IF EXISTS network_requests;
DROP TABLE IF EXISTS help_responses;
DROP TABLE IF EXISTS help_requests;
DROP TABLE IF EXISTS point_checkins;
DROP TABLE IF EXISTS user_route_stops;
DROP TABLE IF EXISTS user_routes;
DROP TABLE IF EXISTS map_points;
DROP TABLE IF EXISTS offers;
DROP TABLE IF EXISTS partner_locations;
DROP TABLE IF EXISTS partners;
DROP TABLE IF EXISTS map_presence;
DROP TABLE IF EXISTS verifications;
DROP TABLE IF EXISTS profiles;
DROP TABLE IF EXISTS users;

DROP TYPE IF EXISTS report_status_enum;
DROP TYPE IF EXISTS promo_status_enum;
DROP TYPE IF EXISTS coin_reason_enum;
DROP TYPE IF EXISTS route_status_enum;
DROP TYPE IF EXISTS point_type_enum;
DROP TYPE IF EXISTS chat_context_enum;
DROP TYPE IF EXISTS request_decision_enum;
DROP TYPE IF EXISTS help_status_enum;
DROP TYPE IF EXISTS help_type_enum;
DROP TYPE IF EXISTS vibe_pref_enum;
DROP TYPE IF EXISTS trip_purpose_enum;
DROP TYPE IF EXISTS verification_status_enum;
DROP TYPE IF EXISTS verification_doc_enum;
DROP TYPE IF EXISTS user_role_enum;
-- +goose StatementEnd
