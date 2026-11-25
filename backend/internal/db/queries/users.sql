-- name: CreateUser :one
INSERT INTO users (
    role, first_name, last_name, country_code, email, phone, password_hash, pd_consent_at, rules_consent_at
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, NOW(), NOW()
)
RETURNING *;

-- name: GetUserByID :one
SELECT * FROM users
WHERE id = $1 AND deleted_at IS NULL;

-- name: GetUserByEmail :one
SELECT * FROM users
WHERE email = $1 AND deleted_at IS NULL;

-- name: GetUserByPhone :one
SELECT * FROM users
WHERE phone = $1 AND deleted_at IS NULL;

-- name: SetUserVerified :one
UPDATE users
SET is_verified = $2
WHERE id = $1 AND deleted_at IS NULL
RETURNING *;

-- name: SetUserBanned :one
UPDATE users
SET is_banned = $2
WHERE id = $1 AND deleted_at IS NULL
RETURNING *;

-- name: SoftDeleteUser :exec
UPDATE users
SET
    deleted_at = NOW(),
    avatar_url = NULL,
    email = CASE WHEN email IS NOT NULL THEN 'deleted_' || id::text || '@deleted.tripdrip' ELSE NULL END,
    phone = CASE WHEN email IS NULL AND phone IS NOT NULL THEN 'del_' || left(id::text, 24) ELSE NULL END
WHERE id = $1 AND deleted_at IS NULL;

-- name: CreateProfile :one
INSERT INTO profiles (
    user_id, trip_purpose, trip_start_date, trip_end_date, vibe_preference,
    hobbies, languages, city, district, expectations, ready_for_networking, can_host_guests
) VALUES (
    $1, $2, $3, $4, $5,
    $6, $7, $8, $9, $10, $11, $12
)
RETURNING *;

-- name: GetProfileByUserID :one
SELECT * FROM profiles
WHERE user_id = $1;

-- name: DeleteProfileByUserID :exec
DELETE FROM profiles
WHERE user_id = $1;

-- name: UpdateProfile :one
UPDATE profiles
SET
    trip_purpose = COALESCE(sqlc.narg('trip_purpose'), trip_purpose),
    trip_start_date = COALESCE(sqlc.narg('trip_start_date'), trip_start_date),
    trip_end_date = COALESCE(sqlc.narg('trip_end_date'), trip_end_date),
    vibe_preference = COALESCE(sqlc.narg('vibe_preference'), vibe_preference),
    hobbies = COALESCE(sqlc.narg('hobbies'), hobbies),
    languages = COALESCE(sqlc.narg('languages'), languages),
    city = COALESCE(sqlc.narg('city'), city),
    district = COALESCE(sqlc.narg('district'), district),
    expectations = COALESCE(sqlc.narg('expectations'), expectations),
    ready_for_networking = COALESCE(sqlc.narg('ready_for_networking'), ready_for_networking),
    can_host_guests = COALESCE(sqlc.narg('can_host_guests'), can_host_guests),
    updated_at = NOW()
WHERE user_id = $1
RETURNING *;

-- name: UpdateUserAvatar :one
UPDATE users
SET avatar_url = $2
WHERE id = $1 AND deleted_at IS NULL
RETURNING *;

-- name: GetUserWithProfile :one
SELECT
    u.id, u.role, u.first_name, u.last_name, u.country_code, u.email, u.phone,
    u.avatar_url, u.is_verified, u.is_banned, u.created_at,
    p.trip_purpose, p.trip_start_date, p.trip_end_date, p.vibe_preference,
    p.hobbies, p.languages, p.city, p.district, p.expectations,
    p.ready_for_networking, p.can_host_guests, p.qonaq_completed_count,
    p.rating_avg, p.rating_count, p.updated_at
FROM users u
JOIN profiles p ON p.user_id = u.id
WHERE u.id = $1 AND u.deleted_at IS NULL;
