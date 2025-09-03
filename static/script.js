// Inicializa o mapa
const map = L.map('map').setView([-23.55052, -46.633308], 13);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

let markers = [];
let routeLine = null;

// Inicializa Sortable (drag & drop)
const listEl = document.getElementById('list');
Sortable.create(listEl, {
  animation: 150,
  onEnd: updateRoute
});

// Adiciona marcador
function addMarker(latlng, label) {
  const marker = L.marker(latlng, { draggable: true })
    .addTo(map)
    .bindPopup(label);

  marker.on('dragend', updateRoute);
  markers.push(marker);

  addListItem(label);
  updateRoute();
}

// Adiciona item na lista
function addListItem(label) {
  const div = document.createElement('div');
  div.className = 'stop';
  div.innerHTML = `
    <div class="handle">≡</div>
    <input value="${label}" />
    <button class="x">×</button>
  `;
  listEl.appendChild(div);

  // Remover
  div.querySelector('.x').addEventListener('click', () => {
    const idx = Array.from(listEl.children).indexOf(div);
    map.removeLayer(markers[idx]);
    markers.splice(idx, 1);
    div.remove();
    updateRoute();
  });
}

// Geocoding
async function geocode(address) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.length > 0) return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
  return null;
}

// Atualizar rota
async function updateRoute() {
  if (markers.length < 2) {
    if (routeLine) { map.removeLayer(routeLine); routeLine = null; }
    document.getElementById('directions').classList.add('hidden');
    return;
  }

  const coords = markers.map(m => `${m.getLatLng().lng},${m.getLatLng().lat}`).join(';');
  const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson&steps=true`;

  const res = await fetch(url);
  const data = await res.json();

  if (data.code === 'Ok') {
    const route = data.routes[0];
    const latlngs = route.geometry.coordinates.map(c => [c[1], c[0]]);

    if (routeLine) map.removeLayer(routeLine);
    routeLine = L.polyline(latlngs, { color: '#2563eb', weight: 5 }).addTo(map);
    map.fitBounds(routeLine.getBounds(), { padding: [50, 50] });

    // resumo
    const summary = `${(route.distance/1000).toFixed(2)} km, ${(route.duration/60).toFixed(0)} min`;
    document.getElementById('dir-summary').innerText = summary;

    const stepsContainer = document.getElementById('dir-steps');
    stepsContainer.innerHTML = '';
    route.legs.forEach(leg => {
      leg.steps.forEach((step, i) => {
        const li = document.createElement('li');
        li.className = 'dir-step';
        li.innerHTML = `
          <div class="dir-ico">${i+1}</div>
          <div class="dir-txt">${step.maneuver.instruction}</div>
        `;
        stepsContainer.appendChild(li);
      });
    });

    document.getElementById('directions').classList.remove('hidden');
  }
}

// K-Means
document.getElementById('kmeans').addEventListener('click', () => {
  if (markers.length < 2) return;

  const data = markers.map(m => [m.getLatLng().lat, m.getLatLng().lng]);
  const nClusters = Math.min(3, markers.length); // até 3 clusters
  const result = mlKmeans(data, nClusters);

  const colors = ['red', 'green', 'blue'];

  markers.forEach((m, i) => {
    const cluster = result.clusters[i];
    const color = colors[cluster % colors.length];
    const icon = L.divIcon({
      className: 'cluster-halo',
      html: `<div style="background:${color};width:28px;height:28px;border-radius:50%;opacity:0.5"></div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14]
    });
    m.setIcon(icon);
  });
});

// Eventos
map.on('click', e => addMarker(e.latlng, `Ponto ${markers.length + 1}`));

document.getElementById('add').addEventListener('click', async () => {
  const input = document.getElementById('search');
  const address = input.value.trim();
  if (!address) return;
  const latlng = await geocode(address);
  if (latlng) {
    addMarker(latlng, address);
    map.setView(latlng, 14);
    input.value = '';
  } else alert('Endereço não encontrado!');
});

document.getElementById('route').addEventListener('click', updateRoute);
document.getElementById('clear').addEventListener('click', () => location.reload());
document.getElementById('close-directions').addEventListener('click', () => {
  document.getElementById('directions').classList.add('hidden');
});
