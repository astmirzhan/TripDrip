-- name: CreateWallet :one
INSERT INTO wallets (user_id, balance)
VALUES ($1, 0)
ON CONFLICT (user_id) DO NOTHING
RETURNING *;

-- name: GetWalletByUserID :one
SELECT * FROM wallets
WHERE user_id = $1;

-- name: GetWalletForUpdate :one
SELECT * FROM wallets
WHERE user_id = $1
FOR UPDATE;

-- name: UpdateWalletBalance :one
UPDATE wallets
SET balance = balance + sqlc.arg('delta'), updated_at = NOW()
WHERE user_id = sqlc.arg('user_id')
RETURNING *;

-- name: CreateCoinTransaction :one
INSERT INTO coin_transactions (
    user_id, amount, reason, reference_id, idempotency_key
) VALUES (
    $1, $2, $3, $4, $5
)
RETURNING *;

-- name: GetCoinTransactionByIdempotencyKey :one
SELECT * FROM coin_transactions
WHERE idempotency_key = $1;

-- name: ListCoinTransactionsByUser :many
SELECT * FROM coin_transactions
WHERE user_id = $1
ORDER BY created_at DESC
LIMIT $2 OFFSET $3;

-- name: CreatePromoCode :one
INSERT INTO promo_codes (
    code, offer_id, user_id, expires_at
) VALUES (
    $1, $2, $3, $4
)
RETURNING *;

-- name: ListPromoCodesByUser :many
SELECT
    pc.id, pc.code, pc.offer_id, pc.user_id, pc.status, pc.expires_at,
    pc.redeemed_at, pc.redeemed_location_id, pc.created_at,
    o.title AS offer_title, o.discount_percent, o.coin_cost,
    p.id AS partner_id, p.brand_name, p.logo_url
FROM promo_codes pc
JOIN offers o ON o.id = pc.offer_id
JOIN partners p ON p.id = o.partner_id
WHERE pc.user_id = $1
ORDER BY pc.created_at DESC;

-- name: GetPromoCodeByCode :one
SELECT
    pc.*,
    o.partner_id,
    o.title AS offer_title,
    o.discount_percent
FROM promo_codes pc
JOIN offers o ON o.id = pc.offer_id
WHERE pc.code = $1;

-- name: RedeemPromoCodeAtomic :one
UPDATE promo_codes pc
SET
    status = 'redeemed',
    redeemed_at = NOW(),
    redeemed_location_id = sqlc.arg('location_id'),
    redeemed_by_user_id = sqlc.arg('redeemed_by_user_id')
FROM offers o
WHERE pc.offer_id = o.id
  AND pc.code = sqlc.arg('code')
  AND o.partner_id = sqlc.arg('partner_id')
  AND pc.status = 'active'
  AND pc.expires_at > NOW()
RETURNING pc.*;
