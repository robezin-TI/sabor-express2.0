let map = L.map("map").setView([-23.5505, -46.6333], 13);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "© OpenStreetMap"
}).addTo(map);

let points = [];
let routeLayer;
const clusterColors = ["red","blue","green","orange","purple","brown","teal","pink","gray","black"];

// Adicionar ponto manualmente
function addPoint(lat, lng, label) {
  points.push({ lat, lng, label });
  updateList();
  applyKMeans(3);
}

// Geocodificação por endereço
function addAddress() {
  const address = document.getElementById("address").value;
  if (!address) return;
  fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${address}`)
    .then(res => res.json())
    .then(data => {
      if (data.length > 0) {
        addPoint(parseFloat(data[0].lat), parseFloat(data[0].lon), address);
      }
    });
  document.getElementById("address").value = "";
}

// Atualizar lista com drag and drop
function updateList() {
  const list = document.getElementById("points");
  list.innerHTML = "";
  points.forEach((p, i) => {
    const li = document.createElement("li");
    li.textContent = p.label || `Ponto ${i+1}`;
    const btn = document.createElement("button");
    btn.textContent = "x";
    btn.onclick = () => { removePoint(i); };
    li.appendChild(btn);
    list.appendChild(li);
  });

  Sortable.create(list, {
    animation: 150,
    onEnd: function (evt) {
      const moved = points.splice(evt.oldIndex, 1)[0];
      points.splice(evt.newIndex, 0, moved);
      applyKMeans(3);
    }
  });
}

// Remover ponto
function removePoint(i) {
  points.splice(i, 1);
  updateList();
  applyKMeans(3);
}

// Limpar tudo
function clearAll() {
  points = [];
  if (routeLayer) map.removeLayer(routeLayer);
  updateList();
  document.getElementById("route-summary").innerHTML = "";
}

// Traçar rota
function drawRoute() {
  if (points.length < 2) return;
  const coords = points.map(p => `${p.lng},${p.lat}`).join(";");
  fetch(`https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson&steps=true`)
    .then(res => res.json())
    .then(data => {
      if (routeLayer) map.removeLayer(routeLayer);
      routeLayer = L.geoJSON(data.routes[0].geometry).addTo(map);
      map.fitBounds(routeLayer.getBounds());
      showSummary(data.routes[0]);
    });
}

// Otimizar rota
function optimizeRoute() {
  if (points.length < 2) return;
  const coords = points.map(p => `${p.lng},${p.lat}`).join(";");
  fetch(`https://router.project-osrm.org/trip/v1/driving/${coords}?source=first&destination=last&roundtrip=false&overview=full&geometries=geojson&steps=true`)
    .then(res => res.json())
    .then(data => {
      if (!data.trips || data.trips.length === 0) return;
      if (routeLayer) map.removeLayer(routeLayer);
      routeLayer = L.geoJSON(data.trips[0].geometry).addTo(map);
      map.fitBounds(routeLayer.getBounds());
      showSummary(data.trips[0]);
    });
}

// Mostrar resumo da rota
function showSummary(route) {
  let html = `<b>Resumo da rota</b><br>${(route.distance/1000).toFixed(2)} km, ${(route.duration/60).toFixed(0)} min<ul>`;
  route.legs.forEach(leg => {
    leg.steps.forEach(step => {
      const instr = step.maneuver.instruction || `${step.maneuver.type} ${step.name || ""}`;
      html += `<li>${instr}</li>`;
    });
  });
  html += "</ul>";
  document.getElementById("route-summary").innerHTML = html;
}

// Aplicar KMeans
function applyKMeans(k=3) {
  if (points.length < k) return;

  const coords = points.map(p => [p.lat, p.lng]);
  ml5.kmeans(coords, k, clusters => {
    clusters.forEach((c, i) => {
      const color = clusterColors[c.cluster % clusterColors.length];
      if (points[i].marker) map.removeLayer(points[i].marker);

      const icon = L.divIcon({
        className: "custom-cluster-icon",
        html: `<div style="
          background:${color};
          color:white;
          width:28px;
          height:28px;
          border-radius:50%;
          display:flex;
          align-items:center;
          justify-content:center;
          font-size:14px;
          font-weight:bold;
          border:2px solid white;
        ">${c.cluster+1}</div>`,
        iconSize: [28,28]
      });

      points[i].marker = L.marker([points[i].lat, points[i].lng], { icon }).addTo(map);
    });
  });
}
