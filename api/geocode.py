import requests

def geocode_address(address):
    url = "https://nominatim.openstreetmap.org/search"
    params = {"q": address, "format": "json"}
    response = requests.get(url, params=params)
    data = response.json()
    if data:
        return {"lat": float(data[0]["lat"]), "lon": float(data[0]["lon"])}
    return {"error": "Endereço não encontrado"}
