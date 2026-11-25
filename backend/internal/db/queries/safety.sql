-- name: CreateReport :one
INSERT INTO reports (
    reporter_id, target_user_id, reason, details
) VALUES (
    $1, $2, $3, $4
)
RETURNING *;

-- name: CountOpenReportsByTarget :one
SELECT COUNT(*)::bigint FROM reports
WHERE target_user_id = $1 AND status = 'open';

-- name: ListOpenReports :many
SELECT
    r.*,
    ru.first_name AS reporter_first_name, ru.last_name AS reporter_last_name,
    tu.first_name AS target_first_name, tu.last_name AS target_last_name, tu.is_banned AS target_is_banned
FROM reports r
JOIN users ru ON ru.id = r.reporter_id
JOIN users tu ON tu.id = r.target_user_id
WHERE r.status = 'open'
ORDER BY r.created_at ASC
LIMIT $1 OFFSET $2;

-- name: GetReportByIDForUpdate :one
SELECT * FROM reports
WHERE id = $1
FOR UPDATE;

-- name: ResolveReport :one
UPDATE reports
SET status = $2, reviewed_by = $3, resolved_at = NOW()
WHERE id = $1
RETURNING *;

-- name: CreateBlock :one
INSERT INTO blocks (blocker_id, blocked_id)
VALUES ($1, $2)
ON CONFLICT (blocker_id, blocked_id) DO NOTHING
RETURNING *;

-- name: DeleteBlock :exec
DELETE FROM blocks
WHERE blocker_id = $1 AND blocked_id = $2;

-- name: IsBlockedBetween :one
SELECT EXISTS (
    SELECT 1 FROM blocks
    WHERE (blocker_id = $1 AND blocked_id = $2)
       OR (blocker_id = $2 AND blocked_id = $1)
);

-- name: ListBlockedUsers :many
SELECT
    b.blocked_id, b.created_at,
    u.first_name, u.last_name, u.avatar_url
FROM blocks b
JOIN users u ON u.id = b.blocked_id
WHERE b.blocker_id = $1 AND u.deleted_at IS NULL
ORDER BY b.created_at DESC;
