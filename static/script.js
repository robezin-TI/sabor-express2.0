// === MAPA ===
const map = L.map('map').setView([-23.55052, -46.633308], 12);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

// === ESTADO ===
let markers = [];            // Leaflet markers
let clusterHalos = [];       // circleMarkers coloridos do KMeans
let routeControl = null;     // LRM control
const listEl = document.getElementById('list');

// === DRAG & DROP (ordena a lista e atualiza a rota) ===
Sortable.create(listEl, {
  animation: 150,
  onEnd() {
    const newOrder = [];
    const newLabels = [];
    [...listEl.children].forEach(item => {
      const idx = parseInt(item.dataset.index, 10);
      newOrder.push(markers[idx]);
      newLabels.push(item.querySelector('.label').textContent);
    });
    markers = newOrder;
    // reindexa dataset dos itens
    [...listEl.children].forEach((el, i) => (el.dataset.index = i));
    updateRoute();
  }
});

// === UI helpers ===
function addListItem(label) {
  const div = document.createElement('div');
  div.className = 'stop';
  div.dataset.index = markers.length - 1;
  div.innerHTML = `
    <div class="left">
      <span class="label">${label}</span>
    </div>
    <button class="x" title="Remover">×</button>
  `;
  // remover
  div.querySelector('.x').addEventListener('click', () => {
    const idx = parseInt(div.dataset.index, 10);
    removeMarkerAt(idx);
  });
  listEl.appendChild(div);
  // reindexa
  [...listEl.children].forEach((el, i) => (el.dataset.index = i));
}

function removeMarkerAt(idx) {
  if (markers[idx]) map.removeLayer(markers[idx]);
  markers.splice(idx, 1);
  listEl.children[idx]?.remove();
  // reindexa
  [...listEl.children].forEach((el, i) => (el.dataset.index = i));
  clearKMeansHalos();
  updateRoute();
}

function clearAll() {
  markers.forEach(m => map.removeLayer(m));
  markers = [];
  listEl.innerHTML = '';
  clearKMeansHalos();
  if (routeControl) { map.removeControl(routeControl); routeControl = null; }
  document.getElementById('directions').classList.add('hidden');
  document.getElementById('dir-steps').innerHTML = '';
  document.getElementById('dir-summary').textContent = '—';
}

// === MARCADORES ===
function addMarker(latlng, label) {
  const marker = L.marker(latlng, { draggable: true })
    .addTo(map)
    .bindPopup(label);

  marker.on('dragend', () => {
    clearKMeansHalos();
    updateRoute();
  });

  markers.push(marker);
  addListItem(label);
  updateRoute();
}

// clique no mapa
map.on('click', e => addMarker(e.latlng, `Ponto ${markers.length + 1}`));

// adicionar por endereço
async function geocode(address) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.length) return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
  return null;
}

document.getElementById('add').addEventListener('click', async () => {
  const input = document.getElementById('search');
  const address = input.value.trim();
  if (!address) return;
  const latlng = await geocode(address);
  if (latlng) {
    addMarker(latlng, address);
    map.setView(latlng, 14);
    input.value = '';
  } else {
    alert('Endereço não encontrado!');
  }
});

// === ROTA + PAINEL DE DIREÇÕES ===
function updateRoute() {
  if (markers.length < 2) {
    if (routeControl) { map.removeControl(routeControl); routeControl = null; }
    document.getElementById('directions').classList.add('hidden');
    document.getElementById('dir-steps').innerHTML = '';
    document.getElementById('dir-summary').textContent = '—';
    return;
  }

  const waypoints = markers.map(m => L.latLng(m.getLatLng()));

  if (routeControl) { map.removeControl(routeControl); routeControl = null; }

  routeControl = L.Routing.control({
    waypoints,
    addWaypoints: false,
    draggableWaypoints: false,
    fitSelectedRoutes: true,
    show: false,
    lineOptions: { styles: [{ color: '#2563eb', weight: 5 }] },
    router: L.Routing.osrmv1({ profile: 'driving', language: 'pt-BR' })
  }).addTo(map);

  routeControl.once('routesfound', (e) => {
    const route = e.routes[0];

    const summary = `${(route.summary.totalDistance/1000).toFixed(2)} km, ${(route.summary.totalTime/60).toFixed(0)} min`;
    document.getElementById('dir-summary').innerText = summary;

    const stepsEl = document.getElementById('dir-steps');
    stepsEl.innerHTML = '';
    // route.instructions pode vir em inglês (LRM). Mantemos a UI, só exibimos.
    route.instructions.forEach((step, i) => {
      const li = document.createElement('li');
      li.className = 'dir-step';
      li.innerHTML = `
        <div class="dir-ico">${i+1}</div>
        <div class="dir-txt">
          <div class="dir-inst">${step.text}</div>
          ${step.distance ? `<div class="dir-minor">${(step.distance/1000).toFixed(2)} km</div>` : ''}
        </div>
      `;
      stepsEl.appendChild(li);
    });

    document.getElementById('directions').classList.remove('hidden');
  });
}

document.getElementById('route').addEventListener('click', updateRoute);
document.getElementById('close-directions').addEventListener('click', () => {
  document.getElementById('directions').classList.add('hidden');
});
document.getElementById('clear').addEventListener('click', clearAll);

// === OTIMIZAR (OSRM) ou AGRUPAR (K-MEANS com Shift) ===
document.getElementById('optimize').addEventListener('click', async (e) => {
  if (e.shiftKey) { runKMeans(); return; }  // Shift + clique = KMeans
  if (markers.length < 3) { updateRoute(); return; }

  const coords = markers.map(m => `${m.getLatLng().lng},${m.getLatLng().lat}`).join(';');
  const url = `https://router.project-osrm.org/trip/v1/driving/${coords}?source=first&roundtrip=false&overview=full&geometries=geojson`;

  try {
    const res = await fetch(url);
    const data = await res.json();
    if (data.code !== 'Ok') throw new Error('OSRM indisponível');

    // aplica nova ordem
    const order = data.trips[0].waypoint_order;
    const newMarkers = order.map(i => markers[i]);

    // re-render de lista mantendo labels
    const labels = [...listEl.children].map(el => el.querySelector('.label').textContent);
    // limpa lista e recoloca na nova ordem
    listEl.innerHTML = '';
    markers = [];
    newMarkers.forEach((m, idx) => {
      markers.push(m);
      addListItem(labels[idx] || `Ponto ${idx+1}`);
    });
    // reindexa
    [...listEl.children].forEach((el, i) => (el.dataset.index = i));

    clearKMeansHalos();
    updateRoute();
  } catch (err) {
    alert('Não foi possível otimizar a rota agora.');
  }
});

// Atalho de teclado para KMeans (K)
window.addEventListener('keydown', (e) => {
  if (e.key.toLowerCase() === 'k') runKMeans();
});

// === K-MEANS (somente visual: pinta um halo colorido sob cada marcador) ===
function clearKMeansHalos() {
  clusterHalos.forEach(h => map.removeLayer(h));
  clusterHalos = [];
}

function runKMeans() {
  if (markers.length < 2) { alert('Adicione pelo menos 2 pontos.'); return; }

  let k = parseInt(prompt('Quantos clusters deseja (ex.: 2, 3, 4)?', '2'), 10);
  if (!Number.isInteger(k) || k < 1 || k > markers.length) {
    alert('Número de clusters inválido.');
    return;
  }

  // dados: [lat, lng]
  const data = markers.map(m => {
    const ll = m.getLatLng();
    return [ll.lat, ll.lng];
  });

  // executa kmeans
  const result = mlKMeans(data, k);

  // limpa halos anteriores
  clearKMeansHalos();

  const colors = ['#ef4444','#3b82f6','#22c55e','#a855f7','#f59e0b','#06b6d4','#f43f5e'];

  // cria halo colorido sob cada marcador (não altera o pin padrão)
  result.clusters.forEach((clusterIdx, i) => {
    const color = colors[clusterIdx % colors.length];
    const ll = markers[i].getLatLng();
    const halo = L.circleMarker(ll, {
      radius: 10,
      color,
      weight: 6,
      opacity: 0.9,
      fillOpacity: 0,
      className: 'cluster-halo'
    }).addTo(map);
    clusterHalos.push(halo);
  });
}
