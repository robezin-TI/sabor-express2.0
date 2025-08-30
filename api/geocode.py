import requests

USER_AGENT = "sabor-express/1.0 (contato: dev@saborexpress.local)"

def geocode_address(address: str):
    """
    Consulta Nominatim (OSM) para obter coordenadas de um endereço.
    Retorna: {"lat": float, "lon": float} ou {"error": "..."}
    """
    url = "https://nominatim.openstreetmap.org/search"
    params = {"q": address, "format": "json", "limit": 1}
    try:
        r = requests.get(url, params=params, headers={"User-Agent": USER_AGENT}, timeout=15)
        r.raise_for_status()
        data = r.json()
        if data:
            return {"lat": float(data[0]["lat"]), "lon": float(data[0]["lon"])}
        return {"error": "Endereço não encontrado"}
    except requests.RequestException as e:
        return {"error": f"Falha na geocodificação: {e}"}
