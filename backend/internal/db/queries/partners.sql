-- name: CreatePartner :one
INSERT INTO partners (
    owner_user_id, brand_name, category, bin, logo_url
) VALUES (
    $1, $2, $3, $4, $5
)
RETURNING *;

-- name: GetPartnerByOwnerID :one
SELECT * FROM partners
WHERE owner_user_id = $1;

-- name: GetPartnerByID :one
SELECT * FROM partners
WHERE id = $1;

-- name: ApprovePartner :one
UPDATE partners
SET is_approved = TRUE
WHERE id = $1
RETURNING *;

-- name: ListPendingPartners :many
SELECT * FROM partners
WHERE is_approved = FALSE
ORDER BY created_at ASC
LIMIT $1 OFFSET $2;

-- name: CreatePartnerLocation :one
INSERT INTO partner_locations (
    partner_id, branch_name, city, address, lat, lng
) VALUES (
    $1, $2, $3, $4, $5, $6
)
RETURNING *;

-- name: GetPartnerLocationByID :one
SELECT * FROM partner_locations
WHERE id = $1;

-- name: ListLocationsByPartner :many
SELECT * FROM partner_locations
WHERE partner_id = $1
ORDER BY created_at ASC;

-- name: CreatePartnerMapPoint :one
INSERT INTO map_points (
    point_type, partner_location_id, name, description, city, vibe, lat, lng, radius_meters, reward_coins, is_boosted
) VALUES (
    'partner', $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
)
RETURNING *;

-- name: CreateLandmarkMapPoint :one
INSERT INTO map_points (
    point_type, partner_location_id, name, description, city, vibe, lat, lng, radius_meters, reward_coins, is_boosted
) VALUES (
    'landmark', NULL, $1, $2, $3, $4, $5, $6, $7, $8, $9
)
RETURNING *;

-- name: CreateOffer :one
INSERT INTO offers (
    partner_id, title, description, discount_percent, coin_cost, total_limit, remaining_limit
) VALUES (
    $1, $2, $3, $4, $5, $6, $6
)
RETURNING *;

-- name: GetOfferByID :one
SELECT * FROM offers
WHERE id = $1;

-- name: GetOfferByIDForUpdate :one
SELECT * FROM offers
WHERE id = $1
FOR UPDATE;

-- name: DecrementOfferLimit :one
UPDATE offers
SET remaining_limit = remaining_limit - 1
WHERE id = $1 AND remaining_limit > 0
RETURNING *;

-- name: ListOffersByPartner :many
SELECT * FROM offers
WHERE partner_id = $1
ORDER BY created_at DESC;

-- name: ListActiveOffers :many
SELECT
    o.id, o.partner_id, o.title, o.description, o.discount_percent,
    o.coin_cost, o.total_limit, o.remaining_limit, o.created_at,
    p.brand_name, p.category, p.logo_url
FROM offers o
JOIN partners p ON p.id = o.partner_id
WHERE o.is_active = TRUE
  AND o.remaining_limit > 0
  AND p.is_approved = TRUE
ORDER BY o.coin_cost ASC, o.created_at DESC;

-- name: GetPartnerRedemptionTotal :one
SELECT COUNT(*)::bigint AS total_redeemed
FROM promo_codes pc
JOIN offers o ON o.id = pc.offer_id
WHERE o.partner_id = $1 AND pc.status = 'redeemed';

-- name: GetPartnerStatsByLocation :many
SELECT
    pl.id AS location_id,
    pl.branch_name,
    pl.city,
    COUNT(pc.id)::bigint AS redeemed_count
FROM partner_locations pl
LEFT JOIN promo_codes pc ON pc.redeemed_location_id = pl.id AND pc.status = 'redeemed'
WHERE pl.partner_id = $1
GROUP BY pl.id, pl.branch_name, pl.city
ORDER BY redeemed_count DESC, pl.branch_name ASC;

-- name: GetPartnerStatsByCountry :many
SELECT
    u.country_code,
    COUNT(pc.id)::bigint AS redeemed_count
FROM promo_codes pc
JOIN offers o ON o.id = pc.offer_id
JOIN users u ON u.id = pc.user_id
WHERE o.partner_id = $1 AND pc.status = 'redeemed'
GROUP BY u.country_code
ORDER BY redeemed_count DESC;

-- name: GetPartnerVisitsCount :one
SELECT COUNT(*)::bigint AS total_visits
FROM point_checkins
WHERE partner_id = $1 AND point_type = 'partner';
