"""Builds a pixel-art map of Kazakhstan from Natural Earth (public domain) data.

Usage (from frontend/):
  python3 scripts/make_kz_map.py <geo_dir> src/assets/map/kz-pixel-map.svg src/pages/map/kzProjection.ts

<geo_dir> must contain these Natural Earth GeoJSON files (github.com/nvkelso/natural-earth-vector/geojson):
ne_50m_admin_0_countries, ne_50m_lakes, ne_10m_rivers_lake_centerlines.
"""
import json
import math
import sys

GEO, OUT_SVG, OUT_TS = sys.argv[1], sys.argv[2], sys.argv[3]

# Map frame (degrees) and projection: equirectangular, x scaled by cos(48°).
LON0, LON1, LAT0, LAT1 = 46.0, 88.0, 40.3, 56.1
PHI = math.radians(48)
CELL = 5
COLS = 132
SCALE = COLS * CELL / ((LON1 - LON0) * math.cos(PHI))
ROWS = math.ceil((LAT1 - LAT0) * SCALE / CELL)
W, H = COLS * CELL, ROWS * CELL


def project(lon, lat):
    return (lon - LON0) * math.cos(PHI) * SCALE, (LAT1 - lat) * SCALE


def cell_center(c, r):
    x, y = (c + 0.5) * CELL, (r + 0.5) * CELL
    lon = x / (math.cos(PHI) * SCALE) + LON0
    lat = LAT1 - y / SCALE
    return lon, lat


def polys_of(geom):
    if geom["type"] == "Polygon":
        return [geom["coordinates"]]
    if geom["type"] == "MultiPolygon":
        return geom["coordinates"]
    return []


def in_ring(lon, lat, ring):
    inside = False
    j = len(ring) - 1
    for i in range(len(ring)):
        xi, yi = ring[i][0], ring[i][1]
        xj, yj = ring[j][0], ring[j][1]
        if (yi > lat) != (yj > lat) and lon < (xj - xi) * (lat - yi) / (yj - yi + 1e-12) + xi:
            inside = not inside
        j = i
    return inside


def in_polys(lon, lat, polys):
    for poly in polys:
        if in_ring(lon, lat, poly[0]) and not any(in_ring(lon, lat, hole) for hole in poly[1:]):
            return True
    return False


def bbox(polys):
    xs = [p[0] for poly in polys for p in poly[0]]
    ys = [p[1] for poly in polys for p in poly[0]]
    return min(xs), min(ys), max(xs), max(ys)


countries = json.load(open(f"{GEO}/ne_50m_admin_0_countries.geojson"))
lakes = json.load(open(f"{GEO}/ne_50m_lakes.geojson"))
rivers = json.load(open(f"{GEO}/ne_10m_rivers_lake_centerlines.geojson"))

NEIGHBOURS = ["Russia", "China", "Uzbekistan", "Kyrgyzstan", "Turkmenistan", "Mongolia", "Tajikistan", "Azerbaijan", "Iran", "Afghanistan"]
shapes = {}
for f in countries["features"]:
    name = f["properties"]["ADMIN"]
    if name == "Kazakhstan" or name in NEIGHBOURS:
        polys = polys_of(f["geometry"])
        shapes[name] = (polys, [bbox([p]) for p in polys])


def country_at(lon, lat):
    for name, (polys, boxes) in shapes.items():
        for poly, (x0, y0, x1, y1) in zip(polys, boxes):
            if x0 <= lon <= x1 and y0 <= lat <= y1 and in_polys(lon, lat, [poly]):
                return name
    return None


LAKE_NAMES = {"Lake Balkhash", "Lake Zaysan", "Alaköl", "North Aral Sea", "South Aral Sea", "Tengiz Köli", "Shardara Bögeni", "Issyk-Kul", "Sarygamysh Köli"}
lake_polys = [polys_of(f["geometry"]) for f in lakes["features"] if f["properties"].get("name") in LAKE_NAMES]
lake_boxes = [bbox(p) for p in lake_polys]


def is_lake(lon, lat):
    return any(x0 <= lon <= x1 and y0 <= lat <= y1 and in_polys(lon, lat, p) for p, (x0, y0, x1, y1) in zip(lake_polys, lake_boxes))


# Base grid: 'K' Kazakhstan, 'N:<name>' neighbour, 'W' water.
grid = [[None] * COLS for _ in range(ROWS)]
for r in range(ROWS):
    for c in range(COLS):
        lon, lat = cell_center(c, r)
        name = country_at(lon, lat)
        if is_lake(lon, lat):
            # Lakes touching Kazakhstan are drawn as water without the country outline around them.
            grid[r][c] = "L" if name == "Kazakhstan" or name is None else "W"
            continue
        grid[r][c] = "W" if name is None else ("K" if name == "Kazakhstan" else "N:" + name)

# Rivers: rasterize centerlines (Bresenham between projected vertices).
RIVERS = {"Ural", "Ertis", "Irtysh", "Ertix", "Esil", "Ishim", "Ile", "Syr  Darya", "Tobol"}
river_cells = set()
for f in rivers["features"]:
    if f["properties"].get("name") not in RIVERS or not f["geometry"]:
        continue
    g = f["geometry"]
    for line in g["coordinates"] if g["type"] == "MultiLineString" else [g["coordinates"]]:
        pts = [project(lon, lat) for lon, lat in line]
        for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
            steps = int(max(abs(x1 - x0), abs(y1 - y0)) / (CELL / 2)) + 1
            for s in range(steps + 1):
                x = x0 + (x1 - x0) * s / steps
                y = y0 + (y1 - y0) * s / steps
                c, r = int(x // CELL), int(y // CELL)
                if 0 <= r < ROWS and 0 <= c < COLS:
                    river_cells.add((r, c))

INK = "#2e1b5b"
COLORS = {
    "water": "#3fb8d0",
    "river": "#2a8fb0",
    "neighbour": "#dfe4fa",
    "neighbour_edge": "#bcc5ef",
    "north": "#a6d86a",
    "steppe": "#c8dc84",
    "desert": "#e9d9a6",
    "mountain": "#9aa7e6",
    "snow": "#ffffff",
    "outline": INK,
}


def hash01(c, r):
    return ((c * 73856093) ^ (r * 19349663)) % 1000 / 1000


def land_tone(lon, lat, c, r):
    """North → green, middle → steppe, south and west → desert, with dithered wavy borders."""
    jitter = (hash01(c, r) - 0.5) * 0.7
    north = 51.0 + 0.5 * math.sin((lon - 46) / 5.0) + jitter
    desert = 47.6 + 1.1 * math.sin((lon - 44) / 7.5) + jitter
    if lat > north:
        return "north"
    if lat > desert:
        return "steppe"
    return "desert"


def neighbour(r, c, dr, dc):
    rr, cc = r + dr, c + dc
    return grid[rr][cc] if 0 <= rr < ROWS and 0 <= cc < COLS else "W"


LANDISH = ("K", "L")
paint = [[None] * COLS for _ in range(ROWS)]
for r in range(ROWS):
    for c in range(COLS):
        v = grid[r][c]
        lon, lat = cell_center(c, r)
        if v in ("W", "L"):
            paint[r][c] = "water"
        elif v == "K":
            edge = any(neighbour(r, c, dr, dc) not in LANDISH for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)))
            if edge:
                paint[r][c] = "outline"
            elif (r, c) in river_cells:
                paint[r][c] = "river"
            else:
                paint[r][c] = land_tone(lon, lat, c, r)
        else:
            edge = any(neighbour(r, c, dr, dc) not in (v, "W", "K", "L") for dr, dc in ((1, 0), (0, 1)))
            paint[r][c] = "neighbour_edge" if edge else "neighbour"
# One <path> per colour built from horizontal runs keeps the file small.
paths = {k: [] for k in COLORS}
for r in range(ROWS):
    c = 0
    while c < COLS:
        k = paint[r][c]
        start = c
        while c < COLS and paint[r][c] == k:
            c += 1
        paths[k].append(f"M{start * CELL} {r * CELL}h{(c - start) * CELL}v{CELL}h-{(c - start) * CELL}z")

svg = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}" shape-rendering="crispEdges">']
for k in ["water", "neighbour", "neighbour_edge", "north", "steppe", "desert", "mountain", "snow", "river", "outline"]:
    if paths[k]:
        svg.append(f'<path fill="{COLORS[k]}" d="{"".join(paths[k])}"/>')
svg.append("</svg>")
open(OUT_SVG, "w").write("\n".join(svg) + "\n")

ts = f"""// Generated by scripts/make_kz_map.py from Natural Earth data (public domain). Do not edit by hand.
// Equirectangular projection, x scaled by cos(48°), matching kz-pixel-map.svg.

export const MAP_WIDTH = {W}
export const MAP_HEIGHT = {H}

const LON0 = {LON0}
const LAT1 = {LAT1}
const SCALE = {SCALE:.6f}
const COS_PHI = {math.cos(PHI):.6f}

/** Projects longitude/latitude to map units (0..MAP_WIDTH, 0..MAP_HEIGHT). */
export function project(lat: number, lng: number): {{ x: number; y: number }} {{
  return {{ x: (lng - LON0) * COS_PHI * SCALE, y: (LAT1 - lat) * SCALE }}
}}
"""
open(OUT_TS, "w").write(ts)
print("grid", COLS, ROWS, "size", W, H, "svg bytes", sum(len(s) for s in svg), "river cells", len(river_cells))
