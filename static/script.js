(() => {
  // ----- Mapa -----
  const map = L.map('map').setView([-23.57, -46.63], 12);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19, attribution: '&copy; OpenStreetMap'
  }).addTo(map);

  // Estado
  let stops = [];
  const listEl = document.getElementById('list');

  // Helpers UI
  function letterIcon(letter) {
    return L.divIcon({
      className: 'letter-marker',
      html: `<div style="
        width:34px;height:34px;border-radius:50%;
        background:#111827;color:#fff;display:grid;place-items:center;
        font-weight:800;border:2px solid #fff; box-shadow:0 2px 6px rgba(0,0,0,.25)">${letter}</div>`,
      iconSize: [34,34],
      iconAnchor: [17,34],
      popupAnchor: [0,-30]
    });
  }

  function updateMarkerLetters(){
    stops.forEach((s,i) => {
      const letter = String.fromCharCode(65+i);
      s.marker.setIcon(letterIcon(letter));
      s.marker.bindPopup(`<b>${letter}</b> ${s.name || `${s.lat.toFixed(5)}, ${s.lng.toFixed(5)}`}`);
    });
  }

  function renderList(){
    listEl.innerHTML = '';
    stops.forEach((s,i) => {
      const item = document.createElement('div');
      item.className = 'stop';
      item.dataset.id = s.id;

      const handle = document.createElement('div');
      handle.className = 'handle';
      handle.textContent = '⋮⋮';

      const badge = document.createElement('div');
      badge.className = 'badge';
      badge.textContent = String.fromCharCode(65+i);

      const input = document.createElement('input');
      input.value = s.name || `${s.lat.toFixed(5)}, ${s.lng.toFixed(5)}`;
      input.placeholder = 'Endereço ou nome';
      input.addEventListener('change', () => { s.name = input.value; updateMarkerLetters(); });

      const left = document.createElement('div');
      left.style.display = 'flex';
      left.style.alignItems = 'center';
      left.style.gap = '8px';
      left.appendChild(handle);
      left.appendChild(badge);

      const del = document.createElement('button');
      del.className = 'x';
      del.textContent = '×';
      del.onclick = () => removeStop(s.id);

      item.appendChild(left);
      item.appendChild(input);
      item.appendChild(del);
      listEl.appendChild(item);
    });

    if (window.Sortable) {
      new Sortable(listEl, {
        handle: '.handle',
        animation: 150,
        onEnd: (evt) => {
          const from = evt.oldIndex;
          const to = evt.newIndex;
          if (from === to) return;
          const moved = stops.splice(from, 1)[0];
          stops.splice(to, 0, moved);
          updateMarkerLetters();
          route();
        }
      });
    }
  }

  function removeStop(id){
    const idx = stops.findIndex(s => s.id === id);
    if (idx >= 0) {
      map.removeLayer(stops[idx].marker);
      stops.splice(idx,1);
      renderList();
      updateMarkerLetters();
      route();
    }
  }

  function addStop(lat,lng,name=''){
    const id = Date.now()+'_'+Math.random();
    const marker = L.marker([lat,lng], { draggable:true, icon:letterIcon('?') }).addTo(map);
    const s = { id, name, lat, lng, marker };
    stops.push(s);

    marker.on('dragend', (e) => {
      const { lat, lng } = e.target.getLatLng();
      s.lat = lat; s.lng = lng;
      updateMarkerLetters();
      route();
    });

    renderList();
    updateMarkerLetters();
    fitToStops();
  }

  map.on('click', (e) => addStop(e.latlng.lat, e.latlng.lng));

  // Geocoding direto no front (Nominatim)
  async function geocode(q){
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(q)}`;
    const r = await fetch(url, { headers: { 'Accept-Language':'pt-BR', 'User-Agent': 'sabor-express' }});
    const data = await r.json();
    return data.map(d => ({ lat: +d.lat, lng: +d.lon, display: d.display_name }));
  }

  const input = document.getElementById('search');
  document.getElementById('add').onclick = async () => {
    const q = input.value.trim();
    if(!q) return;
    try{
      const [first] = await geocode(q);
      if(!first) { alert('Endereço não encontrado'); return; }
      addStop(first.lat, first.lng, q);
      input.value = '';
    }catch(err){ alert('Erro ao buscar endereço.'); }
  };

  // LRM (OSRM) – exibe a rota no mapa
  let routeControl = L.Routing.control({
    waypoints: [],
    router: L.Routing.osrmv1({
      serviceUrl: 'https://router.project-osrm.org/route/v1'
    }),
    showAlternatives: true,
    addWaypoints: false,
    routeWhileDragging: false,
    draggableWaypoints: true,
    fitSelectedRoutes: false,
    show: false,
    createMarker: () => null // remove pins azuis
  }).addTo(map);

  function lrmSetWaypoints(){
    const wps = stops.map(s => L.latLng(s.lat, s.lng));
    routeControl.setWaypoints(wps);
  }
  function fitToStops(){
    if(!stops.length) return;
    const group = L.featureGroup(stops.map(s => s.marker));
    map.fitBounds(group.getBounds().pad(0.25));
  }
  function route(){
    if(stops.length < 2){
      routeControl.setWaypoints([]);
      return;
    }
    lrmSetWaypoints();
    routeControl.route();
  }
  document.getElementById('route').onclick = route;

  // Otimização de ordem via OSRM Trip (mantém 1º e último)
  async function optimize(){
    if(stops.length < 3){ route(); return; }
    const coords = stops.map(s => `${s.lng},${s.lat}`).join(';');
    const url = `https://router.project-osrm.org/trip/v1/driving/${coords}?source=first&destination=last&roundtrip=false&geometries=geojson`;
    const r = await fetch(url);
    const data = await r.json();
    if(data.code !== 'Ok'){ alert('OSRM não retornou solução.'); return; }
    // OSRM retorna um "trip" com waypoints. Reordena os stops conforme "waypoint_index".
    const order = data.waypoints
      .slice()
      .sort((a,b)=>a.waypoint_index-b.waypoint_index)
      .map(w=>w.waypoint_index);
    stops = order.map(i => stops[i]);
    renderList();
    updateMarkerLetters();
    route();
  }
  document.getElementById('optimize').onclick = optimize;

  // Limpar
  document.getElementById('clear').onclick = () => {
    stops.forEach(s => map.removeLayer(s.marker));
    stops = [];
    renderList();
    routeControl.setWaypoints([]);
  };

  renderList();
})();
