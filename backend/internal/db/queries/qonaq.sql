-- name: CountActiveHelpRequestsByTourist :one
SELECT COUNT(*)::bigint FROM help_requests
WHERE tourist_id = $1
  AND status IN ('open', 'has_responses', 'matched')
  AND expires_at > NOW();

-- name: CreateHelpRequest :one
INSERT INTO help_requests (
    tourist_id, target_local_id, help_type, description, city, district, needed_at, people_count, expires_at
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9
)
RETURNING *;

-- name: GetHelpRequestByID :one
SELECT * FROM help_requests
WHERE id = $1;

-- name: GetHelpRequestByIDForUpdate :one
SELECT * FROM help_requests
WHERE id = $1
FOR UPDATE;

-- name: ListOpenHelpFeedForLocal :many
SELECT
    hr.*,
    u.first_name AS tourist_first_name,
    u.last_name AS tourist_last_name,
    u.country_code AS tourist_country_code,
    u.avatar_url AS tourist_avatar_url
FROM help_requests hr
JOIN users u ON u.id = hr.tourist_id
WHERE hr.status IN ('open', 'has_responses')
  AND hr.expires_at > NOW()
  AND u.deleted_at IS NULL
  AND u.is_banned = FALSE
  AND (sqlc.arg('city')::text = '' OR LOWER(hr.city) = LOWER(sqlc.arg('city')::text))
  AND (hr.target_local_id IS NULL OR hr.target_local_id = sqlc.arg('local_id'))
  AND NOT EXISTS (
      SELECT 1 FROM help_responses resp
      WHERE resp.request_id = hr.id AND resp.local_id = sqlc.arg('local_id')
  )
  AND NOT EXISTS (
      SELECT 1 FROM blocks b
      WHERE (b.blocker_id = sqlc.arg('local_id') AND b.blocked_id = hr.tourist_id)
         OR (b.blocker_id = hr.tourist_id AND b.blocked_id = sqlc.arg('local_id'))
  )
ORDER BY hr.created_at DESC
LIMIT 100;

-- name: ListHelpRequestsByUser :many
SELECT * FROM help_requests
WHERE tourist_id = $1 OR selected_local_id = $1 OR target_local_id = $1
ORDER BY created_at DESC
LIMIT 50;

-- name: CreateHelpResponse :one
INSERT INTO help_responses (
    request_id, local_id, decision, message
) VALUES (
    $1, $2, $3, $4
)
RETURNING *;

-- name: ListHelpResponsesByRequest :many
SELECT
    resp.*,
    u.first_name, u.last_name, u.avatar_url,
    p.rating_avg, p.rating_count, p.qonaq_completed_count, p.languages
FROM help_responses resp
JOIN users u ON u.id = resp.local_id
JOIN profiles p ON p.user_id = u.id
WHERE resp.request_id = $1 AND resp.decision = 'accepted'
ORDER BY resp.created_at ASC;

-- name: GetHelpResponseByRequestAndLocal :one
SELECT * FROM help_responses
WHERE request_id = $1 AND local_id = $2;

-- name: SetHelpRequestHasResponses :one
UPDATE help_requests
SET status = 'has_responses', updated_at = NOW()
WHERE id = $1 AND status = 'open'
RETURNING *;

-- name: SelectHelpRequestHost :one
UPDATE help_requests
SET selected_local_id = $2, status = 'matched', updated_at = NOW()
WHERE id = $1
RETURNING *;

-- name: ConfirmHelpRequestDone :one
UPDATE help_requests
SET
    tourist_confirmed_done = CASE WHEN sqlc.arg('is_tourist')::boolean THEN TRUE ELSE tourist_confirmed_done END,
    local_confirmed_done = CASE WHEN NOT sqlc.arg('is_tourist')::boolean THEN TRUE ELSE local_confirmed_done END,
    status = CASE
        WHEN (CASE WHEN sqlc.arg('is_tourist')::boolean THEN TRUE ELSE tourist_confirmed_done END)
         AND (CASE WHEN NOT sqlc.arg('is_tourist')::boolean THEN TRUE ELSE local_confirmed_done END)
        THEN 'completed'::help_status_enum
        ELSE status
    END,
    updated_at = NOW()
WHERE id = $1
RETURNING *;

-- name: CountDailyQonaqRewardsByLocal :one
SELECT COUNT(*)::bigint FROM coin_transactions
WHERE user_id = $1
  AND reason = 'qonaq_help'
  AND created_at >= DATE_TRUNC('day', NOW());

-- name: CreateReview :one
INSERT INTO reviews (
    help_request_id, reviewer_id, reviewee_id, rating, comment
) VALUES (
    $1, $2, $3, $4, $5
)
RETURNING *;

-- name: RecalculateUserRating :exec
UPDATE profiles
SET
    rating_avg = COALESCE((SELECT ROUND(AVG(r1.rating)::numeric, 2)::numeric(3,2) FROM reviews r1 WHERE r1.reviewee_id = profiles.user_id), 0.00),
    rating_count = (SELECT COUNT(*)::int FROM reviews r2 WHERE r2.reviewee_id = profiles.user_id),
    updated_at = NOW()
WHERE profiles.user_id = $1;

-- name: IncrementQonaqCompletedCount :exec
UPDATE profiles
SET qonaq_completed_count = qonaq_completed_count + 1, updated_at = NOW()
WHERE user_id = $1;
