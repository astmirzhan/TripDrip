package domain

import (
	"math"
	"strings"
)

const earthRadiusMeters = 6371000.0

type Coord struct {
	Lat float64
	Lng float64
}

var cityCentroids = map[string]Coord{
	"almaty":    {Lat: 43.238949, Lng: 76.889709},
	"astana":    {Lat: 51.169392, Lng: 71.449074},
	"shymkent":  {Lat: 42.341700, Lng: 69.590100},
	"karaganda": {Lat: 49.804700, Lng: 73.109400},
	"aktau":     {Lat: 43.653200, Lng: 51.197500},
	"atyrau":    {Lat: 47.094500, Lng: 51.923800},
	"turkestan": {Lat: 43.297300, Lng: 68.251700},
	"burabay":   {Lat: 53.083600, Lng: 70.289400},
	"kolsay":    {Lat: 42.987700, Lng: 78.324700},
	"charyn":    {Lat: 43.352200, Lng: 79.078900},
	"aktobe":    {Lat: 50.283900, Lng: 57.167000},
	"pavlodar":  {Lat: 52.287300, Lng: 76.967400},
	"oskemen":   {Lat: 49.948300, Lng: 82.628500},
	"taraz":     {Lat: 42.900000, Lng: 71.366700},
	"semey":     {Lat: 50.411100, Lng: 80.227500},
	"kostanay":    {Lat: 53.214400, Lng: 63.624600},
	"kyzylorda":   {Lat: 44.852800, Lng: 65.509200},
	"oral":        {Lat: 51.227100, Lng: 51.367300},
	"petropavl":   {Lat: 54.872800, Lng: 69.143000},
	"taldykorgan": {Lat: 45.017100, Lng: 78.373300},
	"kokshetau":   {Lat: 53.283300, Lng: 69.396400},
	"zhezkazgan":  {Lat: 47.804300, Lng: 67.713900},
	"konaev":      {Lat: 43.866700, Lng: 77.063100},
	"baikonur":    {Lat: 45.616700, Lng: 63.316700},
}

var districtCentroids = map[string]Coord{
	// Almaty districts
	"almaty:bostandyk":  {Lat: 43.2145, Lng: 76.8998},
	"almaty:medeu":      {Lat: 43.2220, Lng: 76.9630},
	"almaty:almaly":     {Lat: 43.2525, Lng: 76.9255},
	"almaty:auezov":     {Lat: 43.2311, Lng: 76.8430},
	"almaty:nauryzbay":  {Lat: 43.1842, Lng: 76.8095},
	"almaty:turksib":    {Lat: 43.3292, Lng: 76.9690},
	"almaty:zhetysu":    {Lat: 43.2835, Lng: 76.9245},
	"almaty:alatau":     {Lat: 43.2750, Lng: 76.8210},
	// Astana districts
	"astana:esil":       {Lat: 51.1282, Lng: 71.4304},
	"astana:almaty":     {Lat: 51.1585, Lng: 71.4820},
	"astana:saryarka":   {Lat: 51.1780, Lng: 71.4040},
	"astana:baikonur":   {Lat: 51.1870, Lng: 71.4530},
	"astana:nura":       {Lat: 51.1160, Lng: 71.3880},
	// Shymkent districts
	"shymkent:abay":     {Lat: 42.3490, Lng: 69.5690},
	"shymkent:al-farabi": {Lat: 42.3170, Lng: 69.5960},
	"shymkent:enbekshi": {Lat: 42.3260, Lng: 69.6340},
	"shymkent:karatau":  {Lat: 42.3710, Lng: 69.6220},
}

// ResolveCentroid returns the safe approximate centroid for a Kazakhstan city/district.
// Exact user GPS coordinates are never accepted or persisted in map_presence.
func ResolveCentroid(city, district string) (Coord, bool) {
	cKey := normalizeGeoKey(city)
	dKey := normalizeGeoKey(district)
	if dKey != "" {
		if coord, ok := districtCentroids[cKey+":"+dKey]; ok {
			return coord, true
		}
	}
	if coord, ok := cityCentroids[cKey]; ok {
		return coord, true
	}
	return Coord{}, false
}

func normalizeGeoKey(s string) string {
	s = strings.ToLower(strings.TrimSpace(s))
	aliases := map[string]string{
		"алматы":              "almaty",
		"астана":              "astana",
		"нур-султан":          "astana",
		"шымкент":             "shymkent",
		"караганда":           "karaganda",
		"актау":               "aktau",
		"атырау":              "atyrau",
		"туркестан":           "turkestan",
		"бурабай":             "burabay",
		"боровое":             "burabay",
		"кольсай":             "kolsay",
		"чарын":               "charyn",
		"бостандыкский":       "bostandyk",
		"медеуский":           "medeu",
		"алмалинский":         "almaly",
		"ауэзовский":          "auezov",
		"наурызбайский":       "nauryzbay",
		"турксибский":         "turksib",
		"жетысуский":          "zhetysu",
		"алатауский":          "alatau",
		"есиль":               "esil",
		"есильский":           "esil",
		"алматы район":        "almaty",
		"сарыарка":            "saryarka",
		"сарыаркинский":       "saryarka",
		"байконур":            "baikonur",
		"нура":                "nura",
		"костанай":            "kostanay",
		"кызылорда":           "kyzylorda",
		"уральск":             "oral",
		"uralsk":              "oral",
		"петропавловск":       "petropavl",
		"petropavlovsk":       "petropavl",
		"талдыкорган":         "taldykorgan",
		"кокшетау":            "kokshetau",
		"жезказган":           "zhezkazgan",
		"конаев":              "konaev",
		"капчагай":            "konaev",
		"kapchagay":           "konaev",
	}
	if mapped, ok := aliases[s]; ok {
		return mapped
	}
	return s
}

// HaversineMeters calculates the great-circle distance between two coordinates in meters.
func HaversineMeters(lat1, lng1, lat2, lng2 float64) float64 {
	rad := math.Pi / 180.0
	dLat := (lat2 - lat1) * rad
	dLng := (lng2 - lng1) * rad

	a := math.Sin(dLat/2)*math.Sin(dLat/2) +
		math.Cos(lat1*rad)*math.Cos(lat2*rad)*math.Sin(dLng/2)*math.Sin(dLng/2)
	c := 2 * math.Atan2(math.Sqrt(a), math.Sqrt(1-a))
	return earthRadiusMeters * c
}

// DistanceToSegmentMeters computes approximate shortest distance from point P to segment AB in meters.
func DistanceToSegmentMeters(pLat, pLng, aLat, aLng, bLat, bLng float64) float64 {
	meanLatRad := ((aLat + bLat) / 2.0) * math.Pi / 180.0
	metersPerLat := 111132.0
	metersPerLng := 111320.0 * math.Cos(meanLatRad)

	ax, ay := aLng*metersPerLng, aLat*metersPerLat
	bx, by := bLng*metersPerLng, bLat*metersPerLat
	px, py := pLng*metersPerLng, pLat*metersPerLat

	dx, dy := bx-ax, by-ay
	lenSq := dx*dx + dy*dy
	if lenSq == 0 {
		return math.Hypot(px-ax, py-ay)
	}

	t := ((px-ax)*dx + (py-ay)*dy) / lenSq
	if t < 0 {
		t = 0
	} else if t > 1 {
		t = 1
	}
	projX := ax + t*dx
	projY := ay + t*dy
	return math.Hypot(px-projX, py-projY)
}
