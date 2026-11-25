-- name: UpsertMapPresence :one
INSERT INTO map_presence (
    user_id, city, district, approx_lat, approx_lng, is_visible, visible_until, updated_at
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, NOW()
)
ON CONFLICT (user_id) DO UPDATE SET
    city = EXCLUDED.city,
    district = EXCLUDED.district,
    approx_lat = EXCLUDED.approx_lat,
    approx_lng = EXCLUDED.approx_lng,
    is_visible = EXCLUDED.is_visible,
    visible_until = EXCLUDED.visible_until,
    updated_at = NOW()
RETURNING *;

-- name: GetMapPresenceByUser :one
SELECT * FROM map_presence
WHERE user_id = $1;

-- name: SetMapHiddenByModeration :exec
UPDATE map_presence
SET hidden_by_moderation = $2, updated_at = NOW()
WHERE user_id = $1;

-- name: DeleteMapPresenceByUser :exec
DELETE FROM map_presence
WHERE user_id = $1;

-- name: ListVisiblePeopleOnMap :many
SELECT
    u.id AS user_id,
    u.role,
    u.first_name,
    u.last_name,
    u.country_code,
    u.avatar_url,
    p.vibe_preference,
    p.hobbies,
    p.languages,
    p.expectations,
    p.ready_for_networking,
    p.can_host_guests,
    p.qonaq_completed_count,
    p.rating_avg,
    p.rating_count,
    mp.city,
    mp.district,
    mp.approx_lat,
    mp.approx_lng
FROM map_presence mp
JOIN users u ON u.id = mp.user_id
JOIN profiles p ON p.user_id = u.id
WHERE mp.is_visible = TRUE
  AND mp.hidden_by_moderation = FALSE
  AND u.is_verified = TRUE
  AND u.is_banned = FALSE
  AND u.deleted_at IS NULL
  AND u.id <> sqlc.arg('viewer_id')
  AND (
      u.role <> 'tourist'
      OR p.trip_end_date IS NULL
      OR p.trip_end_date >= CURRENT_DATE
  )
  AND NOT EXISTS (
      SELECT 1 FROM blocks b
      WHERE (b.blocker_id = sqlc.arg('viewer_id') AND b.blocked_id = u.id)
         OR (b.blocker_id = u.id AND b.blocked_id = sqlc.arg('viewer_id'))
  )
  AND (
      sqlc.arg('layer')::text = ''
      OR (sqlc.arg('layer')::text = 'tourists' AND u.role = 'tourist')
      OR (sqlc.arg('layer')::text = 'locals_networking' AND u.role = 'local' AND p.ready_for_networking = TRUE)
      OR (sqlc.arg('layer')::text = 'locals_hosting' AND u.role = 'local' AND p.can_host_guests = TRUE)
  )
  AND (sqlc.arg('city')::text = '' OR LOWER(mp.city) = LOWER(sqlc.arg('city')::text))
  AND (sqlc.arg('hobby')::text = '' OR sqlc.arg('hobby')::text = ANY(p.hobbies))
  AND (
      sqlc.arg('language')::text = ''
      OR p.languages @> jsonb_build_array(jsonb_build_object('code', sqlc.arg('language')::text))
  )
  AND (
      sqlc.arg('vibe')::text = ''
      OR p.vibe_preference::text = sqlc.arg('vibe')::text
      OR p.vibe_preference = 'both'
  )
  AND (sqlc.arg('country')::text = '' OR UPPER(u.country_code) = UPPER(sqlc.arg('country')::text))
ORDER BY p.rating_avg DESC, p.qonaq_completed_count DESC
LIMIT 200;

-- name: ListVisiblePartnersOnMap :many
SELECT
    pt.id AS partner_id,
    pt.brand_name,
    pt.category,
    pt.logo_url,
    pl.id AS location_id,
    pl.branch_name,
    pl.city,
    pl.address,
    pl.lat,
    pl.lng,
    mp.id AS point_id,
    mp.vibe,
    mp.reward_coins,
    mp.is_boosted
FROM partner_locations pl
JOIN partners pt ON pt.id = pl.partner_id
JOIN map_points mp ON mp.partner_location_id = pl.id
WHERE pt.is_approved = TRUE
  AND pl.is_active = TRUE
  AND mp.is_active = TRUE
  AND (sqlc.arg('city')::text = '' OR LOWER(pl.city) = LOWER(sqlc.arg('city')::text))
  AND (
      sqlc.arg('vibe')::text = ''
      OR mp.vibe::text = sqlc.arg('vibe')::text
      OR mp.vibe = 'both'
  )
ORDER BY mp.is_boosted DESC, pt.brand_name ASC
LIMIT 200;
