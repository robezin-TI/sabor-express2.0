let map = L.map("map").setView([-23.55, -46.63], 13);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "© OpenStreetMap contributors"
}).addTo(map);

let pontos = [];
let marcadores = [];
let controleRota = null;

// Clique no mapa para adicionar ponto
map.on("click", function (e) {
  adicionarPonto(e.latlng.lat, e.latlng.lng, `Ponto ${pontos.length + 1}`);
});

// Adiciona ponto digitado
function adicionarEndereco() {
  let input = document.getElementById("endereco").value;
  if (!input) return;

  fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${input}`)
    .then(res => res.json())
    .then(data => {
      if (data.length > 0) {
        let lat = parseFloat(data[0].lat);
        let lon = parseFloat(data[0].lon);
        adicionarPonto(lat, lon, input);
      }
    });
}

// Função para adicionar ponto
function adicionarPonto(lat, lon, nome) {
  pontos.push([lat, lon]);
  let marker = L.marker([lat, lon]).addTo(map).bindPopup(nome);
  marcadores.push(marker);
  atualizarLista();
}

// Atualiza lista lateral
function atualizarLista() {
  let lista = document.getElementById("lista-pontos");
  lista.innerHTML = "";
  pontos.forEach((p, i) => {
    let li = document.createElement("li");
    li.textContent = `Ponto ${i + 1}`;
    let btn = document.createElement("button");
    btn.textContent = "X";
    btn.onclick = () => removerPonto(i);
    li.appendChild(btn);
    lista.appendChild(li);
  });
}

// Remove ponto
function removerPonto(i) {
  map.removeLayer(marcadores[i]);
  pontos.splice(i, 1);
  marcadores.splice(i, 1);
  atualizarLista();
}

// Limpa tudo
function limparTudo() {
  pontos.forEach((_, i) => map.removeLayer(marcadores[i]));
  pontos = [];
  marcadores = [];
  if (controleRota) {
    map.removeControl(controleRota);
    controleRota = null;
  }
  atualizarLista();
}

// Traçar rota
function tracarRota() {
  if (controleRota) map.removeControl(controleRota);
  if (pontos.length < 2) return alert("Adicione pelo menos 2 pontos!");

  controleRota = L.Routing.control({
    waypoints: pontos.map(p => L.latLng(p[0], p[1])),
    routeWhileDragging: true,
    showAlternatives: false,
    language: "pt-BR"
  }).addTo(map);
}

// Otimizar rota (OSRM)
function otimizarRota() {
  if (pontos.length < 2) return alert("Adicione pelo menos 2 pontos!");
  let coords = pontos.map(p => p[1] + "," + p[0]).join(";");
  fetch(`https://router.project-osrm.org/trip/v1/driving/${coords}?source=first&roundtrip=false&annotations=true&geometries=geojson`)
    .then(res => res.json())
    .then(data => {
      if (data.code === "Ok") {
        let novaOrdem = data.trips[0].waypoints.map(w => [w.location[1], w.location[0]]);
        pontos = novaOrdem;
        marcadores.forEach(m => map.removeLayer(m));
        marcadores = [];
        pontos.forEach((p, i) => {
          let marker = L.marker([p[0], p[1]]).addTo(map).bindPopup(`Ponto ${i + 1}`);
          marcadores.push(marker);
        });
        atualizarLista();
        tracarRota();
      }
    });
}

// Agrupar com K-Means
function agruparKMeans() {
  if (pontos.length < 2) return alert("Adicione pelo menos 2 pontos!");

  let k = parseInt(prompt("Quantos clusters deseja (ex: 2, 3, 4)?"));
  if (isNaN(k) || k < 1) return alert("Número inválido de clusters!");

  let data = pontos.map(p => [p[0], p[1]]);
  let clusters = mlKMeans(data, k);

  marcadores.forEach(m => map.removeLayer(m));
  marcadores = [];

  let cores = ["red", "blue", "green", "purple", "orange", "brown", "pink"];

  pontos.forEach((p, i) => {
    let cor = cores[clusters.clusters[i] % cores.length];
    let marker = L.circleMarker([p[0], p[1]], {
      radius: 10,
      color: cor,
      fillOpacity: 0.8
    }).addTo(map).bindPopup(`Ponto ${i + 1} - Cluster ${clusters.clusters[i] + 1}`);
    marcadores.push(marker);
  });
}
