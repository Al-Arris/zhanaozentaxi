const formStatus = document.getElementById('formStatus');
if (formStatus) {
  formStatus.textContent = '';
}

const center = [43.34116, 52.86192];
const map = L.map('taxiMap', { zoomControl: true }).setView(center, 13);

L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
  maxZoom: 17,
  attribution: '&copy; OpenStreetMap contributors, SRTM | OpenTopoMap',
}).addTo(map);

let mode = 'pickup';
let pickupMarker;
let dropoffMarker;
let routeLine;

const pickupText = document.getElementById('pickupText');
const dropoffText = document.getElementById('dropoffText');
const distanceText = document.getElementById('distanceText');
const durationText = document.getElementById('durationText');

const setPickupBtn = document.getElementById('setPickupBtn');
const setDropoffBtn = document.getElementById('setDropoffBtn');

const formatCoord = (latlng) => `${latlng.lat.toFixed(5)}, ${latlng.lng.toFixed(5)}`;

const setActiveModeUi = () => {
  setPickupBtn.classList.toggle('primary', mode === 'pickup');
  setPickupBtn.classList.toggle('dark', mode !== 'pickup');
  setDropoffBtn.classList.toggle('primary', mode === 'dropoff');
  setDropoffBtn.classList.toggle('dark', mode !== 'dropoff');
};

setPickupBtn.addEventListener('click', () => {
  mode = 'pickup';
  setActiveModeUi();
});

setDropoffBtn.addEventListener('click', () => {
  mode = 'dropoff';
  setActiveModeUi();
});

const drawRoute = async () => {
  if (!pickupMarker || !dropoffMarker) return;

  const from = pickupMarker.getLatLng();
  const to = dropoffMarker.getLatLng();

  const url = `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    if (!data.routes || !data.routes[0]) return;

    const route = data.routes[0];
    const coords = route.geometry.coordinates.map(([lng, lat]) => [lat, lng]);

    if (routeLine) {
      map.removeLayer(routeLine);
    }

    routeLine = L.polyline(coords, {
      color: '#4f8cff',
      weight: 6,
      opacity: 0.95,
    }).addTo(map);

    map.fitBounds(routeLine.getBounds(), { padding: [40, 40] });

    distanceText.textContent = `${(route.distance / 1000).toFixed(1)} км`;
    durationText.textContent = `${Math.round(route.duration / 60)} мин`;
  } catch {
    distanceText.textContent = 'Маршрутты есептеу сәтсіз';
    durationText.textContent = '—';
  }
};

map.on('click', (event) => {
  const latlng = event.latlng;

  if (mode === 'pickup') {
    if (pickupMarker) map.removeLayer(pickupMarker);
    pickupMarker = L.marker(latlng).addTo(map).bindPopup('🟢 Алу адресі').openPopup();
    pickupText.textContent = formatCoord(latlng);
    mode = 'dropoff';
  } else {
    if (dropoffMarker) map.removeLayer(dropoffMarker);
    dropoffMarker = L.marker(latlng).addTo(map).bindPopup('🔴 Баратын жер').openPopup();
    dropoffText.textContent = formatCoord(latlng);
  }

  setActiveModeUi();
  drawRoute();
});

const taxiIcon = L.divIcon({
  className: 'taxi-icon',
  html: '🚕',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

const taxis = [
  { pos: [43.3438, 52.8505], step: [0.00016, 0.0001] },
  { pos: [43.3344, 52.8718], step: [0.0001, -0.00015] },
  { pos: [43.3491, 52.8784], step: [-0.00014, 0.00008] },
  { pos: [43.3385, 52.8409], step: [0.00012, 0.00012] },
  { pos: [43.3475, 52.861], step: [-0.0001, -0.00009] },
];

const bounds = {
  minLat: 43.327,
  maxLat: 43.356,
  minLng: 52.835,
  maxLng: 52.89,
};

taxis.forEach((taxi) => {
  taxi.marker = L.marker(taxi.pos, { icon: taxiIcon }).addTo(map);
});

setInterval(() => {
  taxis.forEach((taxi) => {
    let [lat, lng] = taxi.pos;
    let [latStep, lngStep] = taxi.step;

    lat += latStep;
    lng += lngStep;

    if (lat < bounds.minLat || lat > bounds.maxLat) {
      latStep = -latStep;
      lat += latStep * 2;
    }

    if (lng < bounds.minLng || lng > bounds.maxLng) {
      lngStep = -lngStep;
      lng += lngStep * 2;
    }

    taxi.pos = [lat, lng];
    taxi.step = [latStep, lngStep];
    taxi.marker.setLatLng(taxi.pos);
  });
}, 1000);

setActiveModeUi();