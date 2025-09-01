// Inicializa mapa
const map = L.map('map').setView([-23.5505, -46.6333], 12);

// Tile OSM
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap'
}).addTo(map);

let waypoints = [];
let markers = [];
let routingControl = null;

// Função para atualizar letras dos marcadores
function updateMarkers() {
  markers.forEach((m, i) => {
    m.setIcon(L.divIcon({
      className: 'custom-marker',
      html: String.fromCharCode(65 + i), // A, B, C...
      iconSize: [30, 30],
      iconAnchor: [15, 30]
    }));
  });
}

// Clique no mapa para adicionar ponto
map.on('click', (e) => {
  addPoint(e.latlng);
});

function addPoint(latlng) {
  const marker = L.marker(latlng, {
    draggable: true
  }).addTo(map);

  marker.on('dragend', () => {
    const idx = markers.indexOf(marker);
    if (idx >= 0) {
      waypoints[idx] = marker.getLatLng();
    }
  });

  markers.push(marker);
  waypoints.push(latlng);
  updateMarkers();
  renderList();
}

// Renderiza lista lateral
function renderList() {
  const list = document.getElementById('list');
  list.innerHTML = '';
  waypoints.forEach((wp, i) => {
    const item = document.createElement('div');
    item.className = 'list-item';
    item.textContent = `${String.fromCharCode(65 + i)}: ${wp.lat.toFixed(5)}, ${wp.lng.toFixed(5)}`;
    list.appendChild(item);
  });

  Sortable.create(list, {
    onEnd: (evt) => {
      const [moved] = waypoints.splice(evt.oldIndex, 1);
      waypoints.splice(evt.newIndex, 0, moved);

      const [movedMarker] = markers.splice(evt.oldIndex, 1);
      markers.splice(evt.newIndex, 0, movedMarker);

      updateMarkers();
      renderList();
    }
  });
}

// Botão limpar
document.getElementById('clear').onclick = () => {
  markers.forEach(m => map.removeLayer(m));
  markers = [];
  waypoints = [];
  if (routingControl) {
    map.removeControl(routingControl);
    routingControl = null;
  }
  document.getElementById('directions').classList.add('hidden');
};

// Botão traçar rota
document.getElementById('route').onclick = () => {
  if (routingControl) {
    map.removeControl(routingControl);
  }
  routingControl = L.Routing.control({
    waypoints: waypoints,
    lineOptions: { styles: [{ color: 'blue', weight: 4 }] },
    createMarker: () => null
  }).addTo(map);

  routingControl.on('routesfound', (e) => {
    const routes = e.routes[0];
    const summary = `${(routes.summary.totalDistance / 1000).toFixed(1)} km, ${(routes.summary.totalTime / 60).toFixed(0)} min`;
    document.getElementById('dir-summary').textContent = summary;

    const steps = document.getElementById('dir-steps');
    steps.innerHTML = '';
    routes.instructions.forEach(inst => {
      const li = document.createElement('li');
      li.textContent = inst.text;
      steps.appendChild(li);
    });

    document.getElementById('directions').classList.remove('hidden');
  });
};

// Fechar painel
document.getElementById('close-directions').onclick = () => {
  document.getElementById('directions').classList.add('hidden');
};
