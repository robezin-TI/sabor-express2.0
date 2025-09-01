// Inicializa o mapa
const map = L.map('map').setView([-23.55052, -46.633308], 12);

// Tile layer do OpenStreetMap
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// Array para marcadores e rota
let markers = [];
let routeControl = null;

// Função para adicionar marcador
function addMarker(latlng, label) {
  const marker = L.marker(latlng, { draggable: true })
    .addTo(map)
    .bindPopup(label)
    .openPopup();

  marker.on('dragend', updateRoute); // Atualiza rota ao arrastar
  markers.push(marker);
  updateRoute();
}

// Função para limpar marcadores e rota
function clearMarkers() {
  markers.forEach(m => map.removeLayer(m));
  markers = [];
  if (routeControl) {
    map.removeControl(routeControl);
    routeControl = null;
  }
  document.getElementById('dir-steps').innerHTML = '';
  document.getElementById('directions').classList.add('hidden');
}

// Função de geocoding via Nominatim
async function geocode(address) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.length > 0) {
    return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
  }
  return null;
}

// Atualiza a rota usando Leaflet Routing Machine + OSRM
function updateRoute() {
  if (markers.length < 2) {
    if (routeControl) {
      map.removeControl(routeControl);
      routeControl = null;
    }
    document.getElementById('directions').classList.add('hidden');
    document.getElementById('dir-steps').innerHTML = '';
    return;
  }

  const waypoints = markers.map(m => L.latLng(m.getLatLng()));

  if (routeControl) {
    map.removeControl(routeControl);
  }

  routeControl = L.Routing.control({
    waypoints: waypoints,
    lineOptions: { styles: [{ color: '#2563eb', weight: 5 }] },
    addWaypoints: false,
    draggableWaypoints: false,
    fitSelectedRoutes: true,
    show: false
  }).addTo(map);

  // Atualiza painel de direções
  routeControl.on('routesfound', function(e) {
    const route = e.routes[0];
    const summary = `${(route.summary.totalDistance / 1000).toFixed(2)} km, ${(route.summary.totalTime/60).toFixed(0)} min`;
    document.getElementById('dir-summary').innerText = summary;
    const stepsContainer = document.getElementById('dir-steps');
    stepsContainer.innerHTML = '';
    route.instructions.forEach((step, i) => {
      const li = document.createElement('li');
      li.className = 'dir-step';
      li.innerHTML = `<div class="dir-ico">${i+1}</div><div class="dir-txt">${step.text}</div>`;
      stepsContainer.appendChild(li);
    });
    document.getElementById('directions').classList.remove('hidden');
  });
}

// Evento clique no mapa
map.on('click', e => addMarker(e.latlng, `Ponto ${markers.length + 1}`));

// Botão Adicionar endereço
document.getElementById('add').addEventListener('click', async () => {
  const input = document.getElementById('search');
  const address = input.value.trim();
  if (address === '') return;

  const latlng = await geocode(address);
  if (latlng) {
    addMarker(latlng, address);
    map.setView(latlng, 14);
    input.value = '';
  } else {
    alert('Endereço não encontrado!');
  }
});

// Botão Limpar tudo
document.getElementById('clear').addEventListener('click', clearMarkers);

// Botão Fechar painel
document.getElementById('close-directions').addEventListener('click', () => {
  document.getElementById('directions').classList.add('hidden');
});

// Botão Traçar rota
document.getElementById('route').addEventListener('click', updateRoute);

// Botão Otimizar rota (simples: apenas reordena marcadores pela distância)
document.getElementById('optimize').addEventListener('click', () => {
  if (markers.length < 3) return; // pouca coisa pra otimizar

  // Ordena por longitude (exemplo simples de “otimização”)
  markers.sort((a,b) => a.getLatLng().lng - b.getLatLng().lng);

  updateRoute();
});
