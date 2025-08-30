let map = L.map("map").setView([-23.55, -46.63], 12);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);

let points = [];
let markers = [];
let routeLayer;

function addAddress() {
  const address = document.getElementById("address").value;
  fetch("/geocode", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({address})
  })
  .then(res => res.json())
  .then(data => {
    if (data.lat) {
      points.push(data);
      let marker = L.marker([data.lat, data.lon]).addTo(map);
      markers.push(marker);
    }
  });
}

function clusterPoints() {
  fetch("/cluster", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({points})
  })
  .then(res => res.json())
  .then(data => {
    markers.forEach(m => map.removeLayer(m));
    markers = [];
    data.clusters.forEach(p => {
      let color = p.cluster === 0 ? "red" : p.cluster === 1 ? "blue" : "green";
      let marker = L.circleMarker([p.lat, p.lon], {radius:8, color}).addTo(map);
      markers.push(marker);
    });
  });
}

function optimizeRoute() {
  fetch("/optimize", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({points})
  })
  .then(res => res.json())
  .then(data => {
    if (routeLayer) map.removeLayer(routeLayer);
    routeLayer = L.polyline(data.route, {color:"purple"}).addTo(map);
  });
}

function trainModel() {
  // exemplo fictício de treinamento
  let X = [[2,0],[5,1],[8,2]];
  let y = [10, 20, 30];
  fetch("/train", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({X, y})
  });
}

function predictTime() {
  let X = [[3,0],[6,1]];
  fetch("/predict", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({X})
  })
  .then(res => res.json())
  .then(data => alert("Previsão de tempos: " + data.predictions.join(", ")));
}
