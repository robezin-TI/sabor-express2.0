let map = L.map('map').setView([-23.55052, -46.633308], 12); // SP como inicial
let locations = [];
let routingControl = null;

// TileLayer do OpenStreetMap
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap'
}).addTo(map);

// Geocodificação com Nominatim
async function geocode(address) {
    let response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`);
    let data = await response.json();
    if (data.length > 0) {
        return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
    }
    return null;
}

// Adicionar local à lista
async function addLocation() {
    let address = document.getElementById('address').value;
    if (!address) return;

    let coords = await geocode(address);
    if (coords) {
        locations.push({ name: address, coords });
        updateLocations();
        document.getElementById('address').value = "";
    } else {
        alert("Endereço não encontrado!");
    }
}

// Atualizar lista de locais
function updateLocations() {
    let ul = document.getElementById('locations');
    ul.innerHTML = "";
    locations.forEach((loc, index) => {
        let li = document.createElement('li');
        li.innerHTML = `<span>${loc.name}</span> 
                        <button onclick="removeLocation(${index})">X</button>`;
        ul.appendChild(li);
    });
}

// Remover local
function removeLocation(index) {
    locations.splice(index, 1);
    updateLocations();
}

// Limpar tudo
function clearLocations() {
    locations = [];
    updateLocations();
    if (routingControl) {
        map.removeControl(routingControl);
        routingControl = null;
    }
    document.getElementById("route-summary").innerHTML = "";
}

// Calcular rota
function calculateRoute() {
    if (locations.length < 2) {
        alert("Adicione pelo menos 2 locais!");
        return;
    }

    if (routingControl) {
        map.removeControl(routingControl);
    }

    routingControl = L.Routing.control({
        waypoints: locations.map(l => L.latLng(l.coords[0], l.coords[1])),
        routeWhileDragging: true,
        createMarker: (i, wp) => L.marker(wp.latLng).bindPopup(locations[i].name)
    }).addTo(map);

    routingControl.on('routesfound', function(e) {
        let summary = e.routes[0].summary;
        let instructions = e.routes[0].instructions || [];
        let html = `
            <h3>Resumo da rota</h3>
            <p>${(summary.totalDistance/1000).toFixed(1)} km • ${(summary.totalTime/60).toFixed(0)} min</p>
            <ul>
        `;
        e.routes[0].instructions.forEach(inst => {
            html += `<li>${inst.text} - ${inst.distance} m</li>`;
        });
        html += "</ul>";
        document.getElementById("route-summary").innerHTML = html;
    });
}

// Otimização com K-Means simples (agrupamento de pontos)
function optimizeRoute() {
    if (locations.length < 3) {
        alert("Adicione pelo menos 3 locais para otimizar!");
        return;
    }

    // Usando centroides médios para simular agrupamento
    let coords = locations.map(l => l.coords);
    let avgLat = coords.reduce((a, b) => a + b[0], 0) / coords.length;
    let avgLon = coords.reduce((a, b) => a + b[1], 0) / coords.length;

    locations.sort((a, b) => {
        let da = Math.hypot(a.coords[0] - avgLat, a.coords[1] - avgLon);
        let db = Math.hypot(b.coords[0] - avgLat, b.coords[1] - avgLon);
        return da - db;
    });

    updateLocations();
    calculateRoute();
}
