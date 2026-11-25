-- name: CreateVerification :one
INSERT INTO verifications (
    user_id, doc_type, doc_number_hash, doc_photo_url, selfie_url
) VALUES (
    $1, $2, $3, $4, $5
)
RETURNING *;

-- name: GetLatestVerificationByUser :one
SELECT * FROM verifications
WHERE user_id = $1
ORDER BY created_at DESC
LIMIT 1;

-- name: HasActiveOrApprovedVerification :one
SELECT EXISTS (
    SELECT 1 FROM verifications
    WHERE user_id = $1 AND status IN ('pending', 'approved')
);

-- name: GetVerificationByIDForUpdate :one
SELECT * FROM verifications
WHERE id = $1
FOR UPDATE;

-- name: ReviewVerification :one
UPDATE verifications
SET
    status = $2,
    rejection_reason = $3,
    reviewed_by = $4,
    reviewed_at = NOW(),
    doc_photo_url = NULL,
    selfie_url = NULL
WHERE id = $1
RETURNING *;

-- name: ListPendingVerifications :many
SELECT
    v.id, v.user_id, v.doc_type, v.doc_photo_url, v.selfie_url, v.status, v.created_at,
    u.first_name, u.last_name, u.role, u.country_code
FROM verifications v
JOIN users u ON u.id = v.user_id
WHERE v.status = 'pending' AND u.deleted_at IS NULL
ORDER BY v.created_at ASC
LIMIT $1 OFFSET $2;

-- name: DeleteVerificationsByUser :exec
DELETE FROM verifications
WHERE user_id = $1;
