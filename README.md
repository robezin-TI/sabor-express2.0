# README.md

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
```

### Método 2: Sem Docker

# Clone o repositório
git clone https://github.com/robezin-TI/sabor-express2.0.git
cd sabor-express2.0

# Instalar dependências
pip install -r requirements.txt

# Executar aplicação
python app.py

### Estrutura do Projeto

```bash
sabor-express2.0/
├── api/
│   ├── __init__.py
│   ├── clustering.py
│   ├── geocode.py
│   ├── ml_model.py
│   ├── optimize.py
├── Dockerfile
├── README.md
├── app.py
├── index.html
└── requirements.txt
```

### Uso

1. Acesse http://localhost:5000
   
2. Adicione pontos de entrega digitando endereços ou clicando no mapa
  
3. Configure o número de clusters desejado
   
4. Clique em "Agrupar Entregas" para clusterizar os pontos
   
5. Use "Otimizar Rota" para calcular a melhor rota
    
6. Use "Traçar Rota" ou "Rota por Cluster" para visualização

### APIs

### GET /api/geocode

Converte endereço em coordenadas geográficas

Parâmetros:

address: Endereço a ser geocodificado

Resposta:

```bash
{
  "lat": -23.5505,
  "lon": -46.6333,
  "name": "São Paulo, SP"
}
```

###POST /api/optimize-route

Otimiza rota entre múltiplos pontos

Body: 

```bash
{
  "points": [
    {"lat": -23.5505, "lon": -46.6333},
    {"lat": -23.5630, "lon": -46.6524}
  ]
}
```

Resposta:

```bash
{
  "optimized_route": [
    [-23.5505, -46.6333],
    [-23.5630, -46.6524]
  ]
}
```

### Licença

Este projeto está sob a licença MIT. Veja o arquivo LICENSE para detalhes.

### Bibliografia

OPENSTREETMAP CONTRIBUTORS. Nominatim API Documentation. Disponível em: https://nominatim.org/release-docs/develop/api/Overview/

OSRM PROJECT. Open Source Routing Machine API Documentation. Disponível em: http://project-osrm.org/docs/v5.24.0/api/

LEAFLET JS. Leaflet - an open-source JavaScript library for interactive maps. Disponível em: https://leafletjs.com/reference.html

FLASK PROJECT. Flask Web Development Documentation. Disponível em: https://flask.palletsprojects.com/en/2.3.x/

LEAFLET ROUTING MACHINE. Leaflet Routing Machine Plugin. Disponível em: https://www.liedman.net/leaflet-routing-machine/

SORTABLE JS. Sortable - JavaScript library for reorderable drag-and-drop lists. Disponível em: https://github.com/SortableJS/Sortable




