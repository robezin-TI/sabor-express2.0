import networkx as nx
import osmnx as ox

def optimize_route(points):
    """
    Usa A* em grafo OSMnx para encontrar caminho mais curto
    """
    if len(points) < 2:
        return {"error": "Precisa de pelo menos 2 pontos"}

    G = ox.graph_from_point((points[0]["lat"], points[0]["lon"]), dist=3000, network_type="drive")
    
    route = []
    for i in range(len(points)-1):
        orig = ox.distance.nearest_nodes(G, points[i]["lon"], points[i]["lat"])
        dest = ox.distance.nearest_nodes(G, points[i+1]["lon"], points[i+1]["lat"])
        path = nx.astar_path(G, orig, dest, weight="length")
        coords = [(G.nodes[n]["y"], G.nodes[n]["x"]) for n in path]
        route.extend(coords)
    
    return {"route": route}
