import math
from typing import List, Dict, Any
import networkx as nx
import osmnx as ox

# Config do OSMnx
ox.settings.log_console = False
ox.settings.use_cache = True

def _build_graph(points: List[Dict[str, float]]) -> nx.MultiDiGraph:
    """
    Gera um grafo OSM cobrindo todos os pontos com uma margem dinâmica.
    """
    lats = [p["lat"] for p in points]
    lons = [p["lon"] for p in points]
    north = max(lats) + 0.02
    south = min(lats) - 0.02
    east  = max(lons) + 0.02
    west  = min(lons) - 0.02
    G = ox.graph_from_bbox(north, south, east, west, network_type="drive")
    # garante comprimento nas arestas
    G = ox.distance.add_edge_lengths(G)
    return G

def _nearest_node(G: nx.MultiDiGraph, lat: float, lon: float) -> int:
    # OSMnx espera (x=lon, y=lat)
    return ox.distance.nearest_nodes(G, lon, lat)

def _path_length_m(G: nx.MultiDiGraph, path: List[int]) -> float:
    """
    Soma o comprimento (em metros) das arestas ao longo de um caminho.
    Trabalha mesmo com paralelismo de arestas (MultiDiGraph).
    """
    if not path or len(path) < 2:
        return 0.0
    total = 0.0
    for u, v in zip(path[:-1], path[1:]):
        # pega a menor aresta entre u-v (se houver paralelas)
        edges = G.get_edge_data(u, v)
        if not edges:
            # pode ser grafo direcionado: tenta v->u
            edges = G.get_edge_data(v, u)
        if edges:
            lengths = []
            for k, edata in edges.items():
                length = edata.get("length", 0.0)
                if length is None:
                    length = 0.0
                lengths.append(length)
            if lengths:
                total += min(lengths)
    return float(total)

def optimize_routes(points: List[Dict[str, float]], speed_kmh: float = 40.0) -> Dict[str, Any]:
    """
    Calcula a melhor rota entre pontos já ordenados (1->2->3...) usando A* em grafo OSM.
    - points: [{"lat":..., "lon":...}, ...] (ordem desejada)
    Retorna: route_nodes, route_coords, distance_km, time_min
    """
    if len(points) < 2:
        return {"error": "Mínimo de 2 pontos necessários"}

    # Constrói grafo cobrindo todos os pontos
    G = _build_graph(points)

    # Nós mais próximos p/ cada ponto
    node_ids = [_nearest_node(G, p["lat"], p["lon"]) for p in points]

    full_path_nodes: List[int] = []
    full_coords: List[Dict[str, float]] = []
    total_m = 0.0

    for i in range(len(node_ids) - 1):
        src = node_ids[i]
        dst = node_ids[i + 1]

        # A* com peso 'length' (metros). Heurística opcional: None (Dijkstra)
        try:
            segment = nx.astar_path(G, src, dst, weight="length")
        except nx.NetworkXNoPath:
            return {"error": f"Sem caminho entre os pontos {i} e {i+1}."}

        # concatena (evita duplicar o nó de junção)
        if full_path_nodes and segment:
            full_path_nodes.extend(segment[1:])
        else:
            full_path_nodes.extend(segment)

        # distancia do segmento
        total_m += _path_length_m(G, segment)

    # extrai coordenadas dos nós do caminho
    for n in full_path_nodes:
        data = G.nodes[n]
        full_coords.append({"lat": float(data["y"]), "lon": float(data["x"])})

    distance_km = round(total_m / 1000.0, 3)
    # tempo estimado em min
    time_min = round((total_m / 1000.0) / max(speed_kmh, 1e-3) * 60.0, 2)

    return {
        "route_nodes": full_path_nodes,
        "route_coords": full_coords,
        "distance_km": distance_km,
        "time_min": time_min
    }
