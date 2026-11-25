-- name: ListRouteCandidatePoints :many
SELECT
    mp.id, mp.point_type, mp.partner_location_id, mp.name, mp.description,
    mp.city, mp.vibe, mp.lat, mp.lng, mp.radius_meters, mp.reward_coins, mp.is_boosted,
    pl.partner_id AS partner_id
FROM map_points mp
LEFT JOIN partner_locations pl ON pl.id = mp.partner_location_id
LEFT JOIN partners pt ON pt.id = pl.partner_id
WHERE mp.is_active = TRUE
  AND LOWER(mp.city) = LOWER(sqlc.arg('city')::text)
  AND (
      mp.point_type = 'landmark'
      OR (mp.point_type = 'partner' AND pl.is_active = TRUE AND pt.is_approved = TRUE)
  )
  AND (
      sqlc.arg('vibe')::text = 'both'
      OR mp.vibe = 'both'
      OR mp.vibe::text = sqlc.arg('vibe')::text
  );

-- name: ListVisitedLandmarkIDsByUser :many
SELECT point_id FROM point_checkins
WHERE user_id = $1 AND point_type = 'landmark';

-- name: ListTodayCheckedInPartnerIDsByUser :many
SELECT DISTINCT partner_id FROM point_checkins
WHERE user_id = $1
  AND point_type = 'partner'
  AND checkin_date = CURRENT_DATE
  AND partner_id IS NOT NULL;

-- name: GetMapPointByID :one
SELECT * FROM map_points
WHERE id = $1;

-- name: GetMapPointPartnerInfo :one
SELECT
    mp.*,
    pl.partner_id AS partner_id
FROM map_points mp
LEFT JOIN partner_locations pl ON pl.id = mp.partner_location_id
WHERE mp.id = $1;

-- name: AbandonActiveRoutesByUser :exec
UPDATE user_routes
SET status = 'abandoned'
WHERE user_id = $1 AND status = 'active';

-- name: CreateUserRoute :one
INSERT INTO user_routes (
    user_id, city, origin_lat, origin_lng, dest_lat, dest_lng, vibe_preference, completion_reward_coins
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8
)
RETURNING *;

-- name: CreateUserRouteStop :one
INSERT INTO user_route_stops (
    route_id, point_id, stop_order
) VALUES (
    $1, $2, $3
)
RETURNING *;

-- name: GetActiveRouteByUser :one
SELECT * FROM user_routes
WHERE user_id = $1 AND status = 'active'
ORDER BY created_at DESC
LIMIT 1;

-- name: GetUserRouteByIDForUpdate :one
SELECT * FROM user_routes
WHERE id = $1
FOR UPDATE;

-- name: CompleteUserRoute :one
UPDATE user_routes
SET status = 'completed', completed_at = NOW()
WHERE id = $1
RETURNING *;

-- name: ListStopsWithPointByRoute :many
SELECT
    urs.route_id, urs.point_id, urs.stop_order, urs.is_visited, urs.visited_at,
    mp.point_type, mp.partner_location_id, mp.name, mp.description,
    mp.city, mp.vibe, mp.lat, mp.lng, mp.radius_meters, mp.reward_coins, mp.is_boosted
FROM user_route_stops urs
JOIN map_points mp ON mp.id = urs.point_id
WHERE urs.route_id = $1
ORDER BY urs.stop_order ASC;

-- name: MarkRouteStopVisited :one
UPDATE user_route_stops
SET is_visited = TRUE, visited_at = NOW()
WHERE route_id = $1 AND point_id = $2 AND is_visited = FALSE
RETURNING *;

-- name: CountUnvisitedStopsByRoute :one
SELECT COUNT(*)::bigint FROM user_route_stops
WHERE route_id = $1 AND is_visited = FALSE;

-- name: GetLatestCheckinByUser :one
SELECT * FROM point_checkins
WHERE user_id = $1
ORDER BY checked_in_at DESC
LIMIT 1;

-- name: CreatePointCheckin :one
INSERT INTO point_checkins (
    user_id, point_id, point_type, partner_id, route_id, user_lat, user_lng, checkin_date, checked_in_at
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, CURRENT_DATE, NOW()
)
RETURNING *;
