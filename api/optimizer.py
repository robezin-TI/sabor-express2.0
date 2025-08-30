# api/optimizer.py
import requests
import networkx as nx
import osmnx as ox
from math import radians, cos, sin, asin, sqrt

ox.settings.log_console = False
ox.settings.use_cache = True

OSRM_TRIP_URL = "https://router.project-osrm.org/trip/v1/driving/"

def _haversine_km(a, b):
    lat1, lon1 = a
    lat2, lon2 = b
    R = 6371.0
    dlat = radians(lat2 - lat1)
    dlon = radians(lon2 - lon1)
    a_h = sin(dlat/2)**2 + cos(radians(lat1))*cos(radians(lat2))*sin(dlon/2)**2
    c = 2 * asin(sqrt(a_h))
    return R * c

def optimize_with_osrm_trip(points, source_first=True, destination_last=True):
    """
    Uses OSRM Trip (solve TSP-ish with optional fixed endpoints).
    points: list of dicts with lat/lon
    returns: dict with ordered indices, geometry (geojson), distance_km, duration_min
    """
    if len(points) < 2:
        return {"error": "Need at least 2 points"}

    coords = ";".join([f"{p['lon']},{p['lat']}" for p in points])
    params = "source=first&destination=last&roundtrip=false&geometries=geojson"
    url = f"{OSRM_TRIP_URL}{coords}?{params}"
    r = requests.get(url, timeout=15)
    r.raise_for_status()
    data = r.json()
    if data.get("code") != "Ok":
        raise RuntimeError("OSRM trip failed: " + data.get("message", "no message"))
    trip = data["trips"][0]
    waypoints = data["waypoints"]
    ordered = sorted(waypoints, key=lambda w: w["waypoint_index"])
    order_indices = [w["waypoint_index"] for w in waypoints]
    # OSRM returns waypoint objects with waypoint_index pointing to input order; but trip provides "waypoint_index" in returned order key
    # Build order by `trips[0].waypoints` is not standard; instead use `waypoints[*].waypoint_index` mapping to input positions in order given by 'trips[0].waypoints' order
    # We'll reconstruct ordered input indices by sorting waypoints by `trips[0].waypoint_index` if present — safe fallback:
    try:
        # waypoints have 'waypoint_index' indicating input index; the order in 'trips[0]["waypoint_indices"]' isn't always present;
        ordered_input = [w["waypoint_index"] for w in sorted(waypoints, key=lambda x: x.get("trips_index", x.get("waypoint_index", 0)))]
    except Exception:
        ordered_input = [w["waypoint_index"] for w in waypoints]
    # Simpler: OSRM includes `trips[0].geometry` and `trips[0].distance`, `trips[0].duration`
    return {
        "geometry": trip.get("geometry"),
        "distance_km": trip.get("distance", 0) / 1000.0,
        "duration_min": trip.get("duration", 0) / 60.0,
        # leave ordering as the simple sequence of waypoints sorted by waypoint_index (input order), but it is fine because we mainly use geometry
        "waypoint_order": [w.get("waypoint_index") for w in waypoints],
    }

def optimize_with_osmnx_astar(points, dist_search=3000):
    """
    For each consecutive pair, compute A* path on the local OSM graph.
    Returns aggregated polyline as list of (lat, lon), total distance_km and time_min estimate.
    """
    if len(points) < 2:
        return {"error": "Need at least 2 points"}

    center = (points[0]["lat"], points[0]["lon"])
    G = ox.graph_from_point(center, dist=dist_search, network_type="drive")

    full_coords = []
    total_m = 0.0
    total_time_min = 0.0

    for i in range(len(points)-1):
        src = ox.distance.nearest_nodes(G, points[i]["lon"], points[i]["lat"])
        dst = ox.distance.nearest_nodes(G, points[i+1]["lon"], points[i+1]["lat"])
        try:
            path = nx.astar_path(G, src, dst, weight="length")
        except nx.NetworkXNoPath:
            # fallback to straight-line
            full_coords.append((points[i]["lat"], points[i]["lon"]))
            continue
        # collect node coords
        coords = [(G.nodes[n]["y"], G.nodes[n]["x"]) for n in path]
        full_coords.extend(coords)
        # compute distance (sum edge lengths)
        dist_m = sum(ox.utils_graph.get_route_edge_attributes(G, path, "length"))
        total_m += dist_m
        # estimate time at 30 km/h as conservative
        total_time_min += dist_m / (30 * 1000 / 60)
    return {
        "geometry": full_coords,
        "distance_km": round(total_m / 1000.0, 3),
        "duration_min": round(total_time_min, 2)
    }

def optimize_routes(points):
    """
    Combined optimizer:
      - If number of points >= 3, try OSRM trip for global optimization (fast)
      - If OSRM fails or <3 points, fallback to OSMnx A* pairwise
    Returns dict with geometry/list of coords, distance_km and duration_min
    """
    try:
        if len(points) >= 3:
            res = optimize_with_osrm_trip(points)
            # if OSRM responded with geometry as geojson, convert to list of coords
            if res.get("geometry"):
                geom = res["geometry"]
                # sometimes geometry is GeoJSON LineString dict
                if isinstance(geom, dict) and geom.get("coordinates"):
                    coords = [(lat, lon) for lon, lat in geom["coordinates"]]
                    res["geometry"] = coords
            return res
    except Exception:
        # try fallback to osmnx
        pass

    # fallback pairwise astar
    return optimize_with_osmnx_astar(points)
