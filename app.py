# app.py
from flask import Flask, request, jsonify, send_from_directory
from api.geocode import geocode_address
from api.optimizer import optimize_routes
from api.clustering import cluster_points
from api.ml_model import DeliveryTimeModel
import os

app = Flask(__name__, static_folder="static", static_url_path="")

# in-memory ML model (keeps state while container runs)
ml_model = DeliveryTimeModel(model_type="rf")

@app.route("/")
def index():
    return send_from_directory("static", "index.html")

@app.route("/geocode", methods=["POST"])
def geocode():
    data = request.json or {}
    address = data.get("address")
    if not address:
        return jsonify({"error": "address missing"}), 400
    try:
        res = geocode_address(address)
        return jsonify(res)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/optimize", methods=["POST"])
def optimize():
    """
    Expects JSON: { "points": [ {"lat":..., "lon":..., "label":...}, ... ] }
    Returns geometry (list of [lat, lon]), distance_km and duration_min
    """
    data = request.json or {}
    points = data.get("points", [])
    if not isinstance(points, list) or len(points) < 2:
        return jsonify({"error": "points must be a list of at least 2 points"}), 400
    try:
        res = optimize_routes(points)
        return jsonify(res)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/cluster", methods=["POST"])
def cluster():
    data = request.json or {}
    points = data.get("points", [])
    k = int(data.get("k", 3))
    if not isinstance(points, list) or not points:
        return jsonify({"error": "points missing"}), 400
    try:
        clustered, centers = cluster_points(points, n_clusters=k)
        return jsonify({"clusters": clustered, "centers": centers})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/train", methods=["POST"])
def train():
    """
    Expects { "X": [[dist_km, cluster], ...], "y": [time_min, ...], "model": "rf"|"linear" }
    """
    data = request.json or {}
    X = data.get("X", [])
    y = data.get("y", [])
    model_type = data.get("model", "rf")
    if not X or not y:
        return jsonify({"error": "X and y required"}), 400
    try:
        global ml_model
        ml_model = DeliveryTimeModel(model_type=model_type)
        info = ml_model.train(X, y)
        return jsonify({"trained": True, "info": info})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/predict", methods=["POST"])
def predict():
    data = request.json or {}
    X = data.get("X", [])
    if not X:
        return jsonify({"error": "X required"}), 400
    try:
        preds = ml_model.predict(X)
        return jsonify({"predictions": preds})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    # ensure static folder exists (safety)
    if not os.path.isdir("static"):
        print("Warning: static/ folder not found")
    app.run(host="0.0.0.0", port=port, debug=True)
