-- name: CreateChat :one
INSERT INTO chats (
    context_type, help_request_id, network_request_id, user1_id, user2_id
) VALUES (
    $1, $2, $3, $4, $5
)
RETURNING *;

-- name: GetChatByID :one
SELECT * FROM chats
WHERE id = $1;

-- name: ListChatsByUser :many
SELECT
    c.id, c.context_type, c.help_request_id, c.network_request_id,
    c.user1_id, c.user2_id, c.created_at,
    u1.first_name AS user1_first_name, u1.last_name AS user1_last_name, u1.avatar_url AS user1_avatar_url,
    u2.first_name AS user2_first_name, u2.last_name AS user2_last_name, u2.avatar_url AS user2_avatar_url,
    COALESCE((SELECT m.body FROM messages m WHERE m.chat_id = c.id ORDER BY m.created_at DESC LIMIT 1), '')::text AS last_message,
    COALESCE((SELECT m.created_at FROM messages m WHERE m.chat_id = c.id ORDER BY m.created_at DESC LIMIT 1), c.created_at) AS last_message_at
FROM chats c
JOIN users u1 ON u1.id = c.user1_id
JOIN users u2 ON u2.id = c.user2_id
WHERE c.user1_id = $1 OR c.user2_id = $1
ORDER BY COALESCE((SELECT m.created_at FROM messages m WHERE m.chat_id = c.id ORDER BY m.created_at DESC LIMIT 1), c.created_at) DESC;

-- name: CreateMessage :one
INSERT INTO messages (
    chat_id, sender_id, body, flagged_commercial
) VALUES (
    $1, $2, $3, $4
)
RETURNING *;

-- name: ListMessagesByChat :many
SELECT * FROM messages
WHERE chat_id = $1
  AND (sqlc.narg('before')::timestamptz IS NULL OR created_at < sqlc.narg('before')::timestamptz)
ORDER BY created_at DESC
LIMIT $2;
