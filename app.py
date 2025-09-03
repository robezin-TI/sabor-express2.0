from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import requests
import os

app = Flask(__name__)
CORS(app)  # Permitir requisições de diferentes origens

# Servir a página principal
@app.route('/')
def serve_index():
    return send_from_directory('.', 'index.html')

# Servir arquivos estáticos (CSS, JS, etc)
@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory('.', path)

# API para geocodificação
@app.route('/api/geocode', methods=['GET'])
def geocode():
    address = request.args.get('address')
    if not address:
        return jsonify({"error": "Endereço não fornecido"}), 400
    
    try:
        # Usar Nominatim para geocodificação
        response = requests.get(
            f"https://nominatim.openstreetmap.org/search?format=json&q={address}&limit=1",
            headers={'User-Agent': 'SaborExpressApp/1.0'}
        )
        data = response.json()
        
        if data:
            return jsonify({
                "lat": float(data[0]['lat']),
                "lon": float(data[0]['lon']),
                "name": data[0]['display_name']
            })
        else:
            return jsonify({"error": "Endereço não encontrado"}), 404
            
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# API para otimização de rota
@app.route('/api/optimize-route', methods=['POST'])
def optimize_route():
    try:
        data = request.json
        points = data.get('points', [])
        
        if len(points) < 2:
            return jsonify({"error": "Pelo menos 2 pontos são necessários"}), 400
        
        # Formatar coordenadas para OSRM
        coords = ";".join([f"{point['lon']},{point['lat']}" for point in points])
        
        # Tentar diferentes servidores OSRM
        servers = [
            'https://router.project-osrm.org',
            'https://osrm.saas.work', 
            'https://routing.openstreetmap.de'
        ]
        
        for server in servers:
            try:
                response = requests.get(
                    f"{server}/trip/v1/driving/{coords}?source=first&roundtrip=false&annotations=true&geometries=geojson"
                )
                
                if response.status_code == 200:
                    data = response.json()
                    if data.get('code') == 'Ok':
                        # Retornar pontos otimizados
                        optimized_points = [
                            [waypoint['location'][1], waypoint['location'][0]] 
                            for waypoint in data['trips'][0]['waypoints']
                        ]
                        return jsonify({"optimized_route": optimized_points})
                
            except requests.RequestException:
                continue  # Tentar próximo servidor
        
        return jsonify({"error": "Todos os servidores de roteamento indisponíveis"}), 503
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
