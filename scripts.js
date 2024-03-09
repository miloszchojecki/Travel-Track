var map = L.map('map').setView([51.11044, 17.05852], 16);
var polylines = [];
var colorsIndex = 0;

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
    const files = event.target.files;

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
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

            let color;
            if (colorsIndex === 0) {
                color = 'blue';
            } else if (colorsIndex === 1) {
                color = 'red';
            } else if (colorsIndex === 2) {
                color = 'black';
            } else if (colorsIndex === 3) {
                color = 'purple';
            } else {
                color = getRandomColor();
            }

            const polyline = L.polyline(latlngs, {color: color}).addTo(map);
            polylines.push(polyline);
            map.fitBounds(polyline.getBounds());
            colorsIndex++;
        };

        reader.readAsText(file);
    }
});

function getRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}
