from flask import Flask, request, jsonify, send_from_directory
from api.geocode import geocode_address
from api.optimizer import optimize_routes
from api.clustering import cluster_points
from api.ml_model import predict_demand

app = Flask(__name__, static_folder="static", static_url_path="")

@app.route("/")
def index():
    return send_from_directory("static", "index.html")

# --- Geocoding (Nominatim) ---
@app.route("/geocode", methods=["POST"])
def geocode():
    data = request.get_json(force=True)
    address = data.get("address", "").strip()
    if not address:
        return jsonify({"error": "Informe um endereço."}), 400
    return jsonify(geocode_address(address))

# --- Roteamento local com A* em grafo OSM (ordem já fornecida) ---
@app.route("/optimize", methods=["POST"])
def optimize():
    data = request.get_json(force=True)
    points = data.get("points", [])
    if not isinstance(points, list) or len(points) < 2:
        return jsonify({"error": "Mínimo de 2 pontos necessários"}), 400
    result = optimize_routes(points, speed_kmh=40.0)
    return jsonify(result)

# --- Agrupamento KMeans (para análises) ---
@app.route("/cluster", methods=["POST"])
def cluster():
    data = request.get_json(force=True)
    points = data.get("points", [])
    k = int(data.get("k", 3))
    if not isinstance(points, list) or len(points) < 1:
        return jsonify({"error": "Envie uma lista de pontos {lat, lon}"}), 400
    return jsonify(cluster_points(points, k))

# --- Exemplo ML simples (previsão de demanda) ---
@app.route("/predict", methods=["POST"])
def predict():
    data = request.get_json(force=True)
    series = data.get("historical_data", [])
    if not series or not isinstance(series, list):
        return jsonify({"error": "Envie historical_data como lista numérica"}), 400
    return jsonify(predict_demand(series, horizon=3))

if __name__ == "__main__":
    # Porta 8000 p/ harmonizar com Docker/Actions
    app.run(host="0.0.0.0", port=8000, debug=True)
