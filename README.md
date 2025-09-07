# README.md
cat > README.md << 'EOF'
# Sabor Express 2.0

Sistema de otimização de rotas de entrega com clusterização geográfica utilizando algoritmos K-means e integração com serviços de mapas.

## Funcionalidades

- Geocodificação de endereços via Nominatim (OpenStreetMap)
- Clusterização de pontos de entrega usando algoritmo K-means
- Otimização de rotas usando OSRM (Open Source Routing Machine)
- Interface interativa com mapa Leaflet
- Reordenamento manual de pontos via drag and drop
- Visualização de rotas por cluster

## Tecnologias Utilizadas

- Backend: Python Flask
- Frontend: HTML5, CSS3, JavaScript
- Mapas: Leaflet.js
- Roteamento: Leaflet Routing Machine
- Geocodificação: Nominatim API
- Otimização: OSRM API
- Containerização: Docker

## Pré-requisitos

- Python 3.8+
- pip
- Docker (opcional)

## Instalação e Execução

### Método 1: Com Docker (Recomendado)

```bash
# Clone o repositório
git clone https://github.com/robezin-TI/sabor-express2.0.git
cd sabor-express2.0

# Build da imagem Docker
docker build -t sabor-express .

# Executar container
docker run -p 5000:5000 sabor-express
