var map = L.map('map').setView([51.11044, 17.05852], 16);
var polyline;

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);

const mapContainer = document.getElementById('map');

function toggleMapVisibility() {
    mapContainer.classList.toggle('hidden-map');
}

const menu = document.querySelector(".menu");
const menuItems = document.querySelectorAll(".menuItem");
const hamburger = document.querySelector(".hamburger");
const closeIcon = document.querySelector(".closeIcon");
const menuIcon = document.querySelector(".menuIcon");

function toggleMenu() {
    if (menu.classList.contains("showMenu")) {
        menu.classList.remove("showMenu");
        closeIcon.style.display = "none";
        menuIcon.style.display = "block";
        toggleMapVisibility();
    } else {
        menu.classList.add("showMenu");
        closeIcon.style.display = "block";
        menuIcon.style.display = "none";
        toggleMapVisibility();
    }
}

hamburger.addEventListener("click", toggleMenu);

document.getElementById('fileInput').addEventListener('change', function(event) {
    const file = event.target.files[0];
    const reader = new FileReader();

    reader.onload = function(e) {
        const gpxData = e.target.result;
        const gpx = new DOMParser().parseFromString(gpxData, 'text/xml');
        const trackPoints = gpx.querySelectorAll('trkpt');
        const latlngs = [];

        trackPoints.forEach(function(point) {
            const lat = parseFloat(point.getAttribute('lat'));
            const lon = parseFloat(point.getAttribute('lon'));
            latlngs.push([lat, lon]);
        });

        if (polyline) {
            map.removeLayer(polyline);
        }

        polyline = L.polyline(latlngs, {color: 'blue'}).addTo(map);
        map.fitBounds(polyline.getBounds());
    };

    reader.readAsText(file);
});
