// static/script.js
// UI behavior matching the fixed-left-sidebar layout from your print.
// Integrates with backend endpoints: /geocode, /optimize, /cluster, /train, /predict

const map = L.map('map').setView([-23.57, -46.63], 12);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap' }).addTo(map);

let stops = []; // {id, lat, lng, name, marker}
const listEl = document.getElementById('list');

// helper - create letter icon
function letterIcon(letter){
  return L.divIcon({
    className: 'letter-marker',
    html: `<div style="width:34px;height:34px;border-radius:50%;background:#111827;color:#fff;display:grid;place-items:center;font-weight:800;border:2px solid #fff">${letter}</div>`,
    iconSize: [34,34], iconAnchor: [17,34], popupAnchor: [0,-30]
  });
}

function updateMarkersAndList(){
  listEl.innerHTML = '';
  stops.forEach((s,i) => {
    const letter = String.fromCharCode(65 + i);
    s.marker.setIcon(letterIcon(letter));
    s.marker.bindPopup(`<b>${letter}</b> ${s.name || `${s.lat.toFixed(5)}, ${s.lng.toFixed(5)}`}`);
    // list item
    const item = document.createElement('div');
    item.className = 'stop';
    item.dataset.id = s.id;
    const handle = document.createElement('div');
    handle.className = 'handle';
    handle.textContent = '⋮⋮';
    const badge = document.createElement('div');
    badge.className = 'badge';
    badge.textContent = letter;
    const input = document.createElement('input');
    input.value = s.name || `${s.lat.toFixed(5)}, ${s.lng.toFixed(5)}`;
    input.placeholder = 'Endereço ou nome';
    input.addEventListener('change', () => { s.name = input.value; s.marker.bindPopup(s.name); });
    const del = document.createElement('button');
    del.className = 'x';
    del.textContent = '×';
    del.onclick = () => removeStop(s.id);

    const left = document.createElement('div');
    left.style.display = 'flex';
    left.style.alignItems = 'center';
    left.style.gap = '8px';
    left.appendChild(handle);
    left.appendChild(badge);

    item.appendChild(left);
    item.appendChild(input);
    item.appendChild(del);
    listEl.appendChild(item);
  });

  // enable Sortable
  if(window.Sortable){
    Sortable.create(listEl, {
      handle: '.handle',
      animation: 150,
      onEnd: (evt) => {
        const from = evt.oldIndex;
        const to = evt.newIndex;
        if(from === to) return;
        const moved = stops.splice(from, 1)[0];
        stops.splice(to, 0, moved);
        updateMarkersAndList();
        drawRoute(); // update route when reorder
      }
    });
  }
}

// Add/Remove stops
function addStop(lat, lng, name=''){
  const id = Date.now() + '_' + Math.random().toString(36).slice(2,8);
  const marker = L.marker([lat, lng], { draggable: true, icon: letterIcon('?') }).addTo(map);
  const s = { id, lat, lng, name, marker };
  marker.on('dragend', (e) => {
    const { lat, lng } = e.target.getLatLng();
    s.lat = lat; s.lng = lng;
    updateMarkersAndList();
    drawRoute();
  });
  stops.push(s);
  updateMarkersAndList();
  fitToStops();
}

function removeStop(id){
  const idx = stops.findIndex(s => s.id === id);
  if(idx >= 0){
    map.removeLayer(stops[idx].marker);
    stops.splice(idx,1);
    updateMarkersAndList();
    drawRoute();
  }
}

function fitToStops(){
  if(!stops.length) return;
  const group = L.featureGroup(stops.map(s => s.marker));
  map.fitBounds(group.getBounds().pad(0.25));
}

// geocode via backend
async function geocodeAddress(q){
  const res = await fetch('/geocode', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({address: q})
  });
  return await res.json();
}

// route drawing via backend
let currentRouteLayer = null;
async function drawRoute(){
  if(currentRouteLayer){ map.removeLayer(currentRouteLayer); currentRouteLayer = null; }
  if(stops.length < 2) return;
  const payload = { points: stops.map(s => ({lat: s.lat, lon: s.lng, name: s.name})) };
  const res = await fetch('/optimize', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if(data.error){
    console.error(data.error);
    return;
  }
  if(data.geometry){
    const coords = data.geometry; // array of [lat, lon]
    currentRouteLayer = L.polyline(coords, {color:'purple', weight:4, opacity:0.9}).addTo(map);
    fitToStops();
  } else if(data.route){
    // older optimizer returns 'route' as list of coords
    currentRouteLayer = L.polyline(data.route, {color:'purple', weight:4}).addTo(map);
    fitToStops();
  } else if(data.geometry === undefined && data.distance_km !== undefined){
    // if OSRM returned geometry as geojson coordinates flattened into 'geometry' earlier
    // nothing to draw
  }
}

// UI bindings
document.getElementById('add').onclick = async () => {
  const q = document.getElementById('search').value.trim();
  if(!q) return;
  try{
    const r = await geocodeAddress(q);
    if(r.error){ alert('Endereço não encontrado'); return; }
    addStop(r.lat, r.lon, q);
    document.getElementById('search').value = '';
  }catch(e){
    alert('Erro na geocodificação');
    console.error(e);
  }
};

map.on('click', (e) => { addStop(e.latlng.lat, e.latlng.lng); });

document.getElementById('route').onclick = () => { drawRoute(); };
document.getElementById('optimize').onclick = async () => {
  // trigger OSRM trip optimization server-side; draw resulting geometry
  if(stops.length < 2) return;
  await drawRoute();
};
document.getElementById('cluster').onclick = async () => {
  if(!stops.length) return;
  const payload = { points: stops.map(s => ({lat: s.lat, lon: s.lng, name: s.name})) , k: 3 };
  const res = await fetch('/cluster', {
    method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload)
  });
  const data = await res.json();
  if(data.error){ alert('Erro no clustering'); return; }
  // replace markers by colored circleMarkers
  stops.forEach(s => map.removeLayer(s.marker));
  stops = data.clusters.map((c, i) => {
    const color = c.cluster === 0 ? 'red' : c.cluster === 1 ? 'blue' : 'green';
    const marker = L.circleMarker([c.lat, c.lon], { radius:8, color }).addTo(map);
    return { id: Date.now() + '_' + i, lat:c.lat, lng:c.lon, name:c.name||'', marker, cluster:c.cluster };
  });
  updateMarkersAndList();
  fitToStops();
};

document.getElementById('train').onclick = async () => {
  // Demo training dataset (you should send real historical data)
  const X = [[2.5,0],[5.1,1],[8.0,2]]; // [distance_km, cluster]
  const y = [12, 26, 40]; // minutes
  const res = await fetch('/train', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({X,y,model:'rf'}) });
  const data = await res.json();
  if(data.error) alert('Erro no treino: '+data.error);
  else alert('Modelo treinado');
};

document.getElementById('predict').onclick = async () => {
  // demo predictions for current stops using nearest distances as feature
  if(!stops.length) return alert('Adicione pontos');
  // create features: simple consecutive distances (sum) & cluster placeholder 0
  const feats = stops.slice(0,2).map((s,i) => [ _distBetween(stops[0], stops[1]), 0 ]);
  const res = await fetch('/predict', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({X:feats}) });
  const data = await res.json();
  if(data.error) alert('Erro na predição');
  else alert('Predições: ' + data.predictions.join(', '));
};

// small util for demo distance
function _distBetween(a,b){
  const R = 6371;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLon = (b.lng - a.lng) * Math.PI / 180;
  const lat1 = a.lat * Math.PI / 180;
  const lat2 = b.lat * Math.PI / 180;
  const aa = Math.sin(dLat/2)*Math.sin(dLat/2) + Math.sin(dLon/2)*Math.sin(dLon/2)*Math.cos(lat1)*Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1-aa));
  return R * c;
};

// initialize UI
updateMarkersAndList();
