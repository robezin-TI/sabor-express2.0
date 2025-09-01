// Inicializa o mapa
const map = L.map('map').setView([-23.55052, -46.633308], 12); // São Paulo como exemplo

// Adiciona o tile layer do OpenStreetMap
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

// Array para armazenar marcadores
let markers = [];

// Função para adicionar marcador no mapa
function addMarker(latlng, label) {
  const marker = L.marker(latlng, {
    draggable: true
  }).addTo(map)
    .bindPopup(label)
    .openPopup();

  markers.push(marker);
  updateRoute();
}

// Função para limpar todos os marcadores
function clearMarkers() {
  markers.forEach(m => map.removeLayer(m));
  markers = [];
  updateRoute();
}

// Função para atualizar a rota (placeholder)
// Aqui você conectaria com a lógica do OSRM ou seu painel de direções
function updateRoute() {
  // TODO: lógica de rotas e preenchimento do painel de direções
  if (markers.length > 1) {
    document.getElementById('directions').classList.remove('hidden');
    document.getElementById('dir-summary').innerText = `${markers.length} pontos na rota`;
  } else {
    document.getElementById('directions').classList.add('hidden');
  }
}

// Evento de clique no mapa para adicionar ponto
map.on('click', function(e) {
  addMarker(e.latlng, `Ponto ${markers.length + 1}`);
});

// Eventos dos botões
document.getElementById('add').addEventListener('click', () => {
  const input = document.getElementById('search');
  if (input.value.trim() !== '') {
    // Aqui você faria geocoding real (ex: Nominatim)
    // Para teste, adiciona marcador central
    addMarker(map.getCenter(), input.value);
    input.value = '';
  }
});

document.getElementById('clear').addEventListener('click', () => {
  clearMarkers();
  document.getElementById('dir-steps').innerHTML = '';
});

// Fechar painel de direções
document.getElementById('close-directions').addEventListener('click', () => {
  document.getElementById('directions').classList.add('hidden');
});

// Aqui você pode adicionar as funções de "Traçar rota" e "Otimizar rota" conectando com OSRM
document.getElementById('route').addEventListener('click', () => {
  updateRoute();
});

document.getElementById('optimize').addEventListener('click', () => {
  updateRoute();
});
