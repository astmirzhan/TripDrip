-- name: CreateNetworkRequest :one
INSERT INTO network_requests (
    sender_id, receiver_id, intro_message
) VALUES (
    $1, $2, $3
)
RETURNING *;

-- name: GetNetworkRequestByID :one
SELECT * FROM network_requests
WHERE id = $1;

-- name: GetNetworkRequestByIDForUpdate :one
SELECT * FROM network_requests
WHERE id = $1
FOR UPDATE;

-- name: ListNetworkRequestsForUser :many
SELECT
    nr.*,
    su.first_name AS sender_first_name, su.last_name AS sender_last_name, su.avatar_url AS sender_avatar_url,
    ru.first_name AS receiver_first_name, ru.last_name AS receiver_last_name, ru.avatar_url AS receiver_avatar_url
FROM network_requests nr
JOIN users su ON su.id = nr.sender_id
JOIN users ru ON ru.id = nr.receiver_id
WHERE nr.sender_id = $1 OR nr.receiver_id = $1
ORDER BY nr.created_at DESC
LIMIT 100;

-- name: RespondNetworkRequest :one
UPDATE network_requests
SET status = $2, responded_at = NOW()
WHERE id = $1 AND status = 'pending'
RETURNING *;
