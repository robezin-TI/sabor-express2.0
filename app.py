from flask import Flask, request, jsonify, send_from_directory
from api.geocode import geocode_address
from api.optimizer import optimize_route
from api.clustering import cluster_points
from api.ml_model import predict_demand

app = Flask(__name__, static_folder="static")

@app.route("/")
def index():
    return send_from_directory("static", "index.html")

@app.route("/geocode", methods=["POST"])
def geocode():
    data = request.json
    return jsonify(geocode_address(data["address"]))

@app.route("/optimize", methods=["POST"])
def optimize():
    data = request.json
    return jsonify(optimize_route(data["points"]))

@app.route("/cluster", methods=["POST"])
def cluster():
    data = request.json
    return jsonify(cluster_points(data["points"], data.get("k", 3)))

@app.route("/predict", methods=["POST"])
def predict():
    data = request.json
    return jsonify(predict_demand(data["historical_data"]))

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000, debug=True)
