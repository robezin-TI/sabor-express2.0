from flask import Flask, request, jsonify, send_from_directory
from api.geocode import geocode_address
from api.optimizer import optimize_route
from api.clustering import cluster_points
from api.ml_model import DeliveryTimePredictor

app = Flask(__name__, static_folder="static", static_url_path="")

# Modelo ML global
predictor = DeliveryTimePredictor("rf")

@app.route("/")
def index():
    return send_from_directory("static", "index.html")

@app.route("/geocode", methods=["POST"])
def geocode():
    data = request.json
    address = data.get("address")
    coords = geocode_address(address)
    return jsonify(coords)

@app.route("/optimize", methods=["POST"])
def optimize():
    data = request.json
    points = data.get("points", [])
    route = optimize_route(points)
    return jsonify(route)

@app.route("/cluster", methods=["POST"])
def cluster():
    data = request.json
    points = data.get("points", [])
    clusters, centers = cluster_points(points, n_clusters=3)
    return jsonify({"clusters": clusters, "centers": centers})

@app.route("/train", methods=["POST"])
def train():
    data = request.json
    X = data.get("X", [])
    y = data.get("y", [])
    predictor.train(X, y)
    return jsonify({"status": "modelo treinado com sucesso"})

@app.route("/predict", methods=["POST"])
def predict():
    data = request.json
    X = data.get("X", [])
    preds = predictor.predict(X)
    return jsonify({"predictions": preds})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
