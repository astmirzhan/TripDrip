package domain

import "time"

const (
	DefaultCheckinRadiusMeters = 100
	MaxTravelSpeedKmh          = 180.0
)

// ValidateCheckinRange ensures user GPS is within allowed point radius.
func ValidateCheckinRange(userLat, userLng, pointLat, pointLng float64, radiusMeters int) (float64, bool) {
	if radiusMeters <= 0 {
		radiusMeters = DefaultCheckinRadiusMeters
	}
	dist := HaversineMeters(userLat, userLng, pointLat, pointLng)
	return dist, dist <= float64(radiusMeters)
}

// ValidateTravelSpeed rejects impossible jumps (> 180 km/h) between consecutive check-ins.
func ValidateTravelSpeed(prevLat, prevLng float64, prevAt time.Time, curLat, curLng float64, curAt time.Time) (float64, bool) {
	delta := curAt.Sub(prevAt)
	if delta <= 0 {
		// Same instant check-in at different locations (> 500m) is impossible.
		distMeters := HaversineMeters(prevLat, prevLng, curLat, curLng)
		if distMeters > 500 {
			return 99999, false
		}
		return 0, true
	}

	distKm := HaversineMeters(prevLat, prevLng, curLat, curLng) / 1000.0
	hours := delta.Hours()
	if hours < 1e-6 {
		hours = 1e-6
	}
	speedKmh := distKm / hours

	// Ignore tiny GPS jitter within 300m even if delta is very short.
	if distKm <= 0.3 {
		return speedKmh, true
	}
	return speedKmh, speedKmh <= MaxTravelSpeedKmh
}
