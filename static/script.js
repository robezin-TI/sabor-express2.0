let map = L.map('map').setView([-23.5505, -46.6333], 13); // Padrão: SP
let markers = [];
let routingControl = null;

// Mapa base
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap'
}).addTo(map);

// Adicionar marcador clicando no mapa
map.on('click', function(e) {
    addPointToList(e.latlng.lat, e.latlng.lng, `Ponto ${markers.length + 1}`);
});

// Função para adicionar pontos
function addPointToList(lat, lng, label) {
    let marker = L.marker([lat, lng]).addTo(map).bindPopup(label).openPopup();
    markers.push(marker);

    let li = document.createElement('li');
    li.textContent = label;
    li.dataset.lat = lat;
    li.dataset.lng = lng;

    let removeBtn = document.createElement('button');
    removeBtn.textContent = "X";
    removeBtn.onclick = () => {
        map.removeLayer(marker);
        li.remove();
        markers = markers.filter(m => m !== marker);
    };

    li.appendChild(removeBtn);
    document.getElementById("pointList").appendChild(li);
}

// Botão adicionar
document.getElementById("addPoint").onclick = () => {
    let input = document.getElementById("addressInput").value;
    if (!input) return;

    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${input}`)
        .then(res => res.json())
        .then(data => {
            if (data.length > 0) {
                let lat = data[0].lat;
                let lon = data[0].lon;
                addPointToList(lat, lon, input);
                map.setView([lat, lon], 14);
            } else {
                alert("Endereço não encontrado!");
            }
        });
};

// Traçar rota
document.getElementById("traceRoute").onclick = () => {
    if (routingControl) {
        map.removeControl(routingControl);
    }

    let waypoints = markers.map(m => L.latLng(m.getLatLng().lat, m.getLatLng().lng));

    routingControl = L.Routing.control({
        waypoints: waypoints,
        routeWhileDragging: true,
        language: "pt-BR"
    }).addTo(map);
};

// Otimizar rota com OSRM
document.getElementById("optimizeRoute").onclick = () => {
    if (markers.length < 2) {
        alert("Adicione pelo menos 2 pontos!");
        return;
    }

    let coords = markers.map(m => [m.getLatLng().lng, m.getLatLng().lat]).join(';');
    fetch(`https://router.project-osrm.org/trip/v1/driving/${coords}?source=first&roundtrip=false&overview=full&geometries=geojson`)
        .then(res => res.json())
        .then(data => {
            if (data.code === "Ok") {
                if (routingControl) {
                    map.removeControl(routingControl);
                }

                let waypoints = data.trips[0].waypoints.map(wp => L.latLng(wp.location[1], wp.location[0]));
                routingControl = L.Routing.control({
                    waypoints: waypoints,
                    routeWhileDragging: true,
                    language: "pt-BR"
                }).addTo(map);
            }
        });
};

// Limpar tudo
document.getElementById("clearAll").onclick = () => {
    markers.forEach(m => map.removeLayer(m));
    markers = [];
    document.getElementById("pointList").innerHTML = "";
    if (routingControl) {
        map.removeControl(routingControl);
    }
};

// Drag-and-drop lista
new Sortable(document.getElementById("pointList"), {
    animation: 150,
    onEnd: () => {
        console.log("Ordem alterada!");
    }
});
