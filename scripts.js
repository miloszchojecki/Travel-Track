var map = L.map('map').setView([51.11044, 17.05852], 16);
var tracks = [];
var colorIndex = 0;

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);

const mapContainer = document.getElementById('map');

document.getElementById('fileInput').addEventListener('change', function (event) {
    const file = event.target.files[0];

    if (file)
        loadGPX(file).then(latlngs => { addTrackToMap(latlngs); addTrackToList(file.name); });

    document.getElementById('fileInput').value = '';
});

function loadGPX(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = function (e) {
            const gpxData = e.target.result;
            const gpx = new DOMParser().parseFromString(gpxData, 'text/xml');
            const trackPoints = gpx.querySelectorAll('trkpt');
            const latlngs = [];

            trackPoints.forEach(function (point) {
                const lat = parseFloat(point.getAttribute('lat'));
                const lon = parseFloat(point.getAttribute('lon'));
                latlngs.push([lat, lon]);
            });

            resolve(latlngs);
        }

        reader.readAsText(file);
    }
    );
}

function addTrackToMap(latlngs) {
    const polyline = L.polyline(latlngs, { color: pickColor() }).addTo(map);
    tracks.push(polyline);
    map.fitBounds(polyline.getBounds());
}

function addTrackToList(fileName) {
    const fileList = document.querySelector('.fileList');
    const listItem = document.createElement('li');
    const polyline = tracks[tracks.length - 1];

    fileName = fileName.replace('.gpx', '');
    if (fileName.length > 20) {
        fileName = fileName.substring(0, 20) + '...';
    }

    const fileText = document.createElement('span');
    fileText.classList.add('fileText');
    fileText.textContent = fileName;
    fileText.addEventListener('click', function () {
        map.fitBounds(polyline.getBounds());
    });

    const deleteIcon = document.createElement('i');
    deleteIcon.classList.add('deleteIcon', 'material-icons');
    deleteIcon.textContent = 'delete';
    deleteIcon.addEventListener('click', function () {
        map.removeLayer(polyline);
        fileList.removeChild(listItem);

        const idx = tracks.indexOf(polyline);
        tracks.splice(idx, 1);
    });

    listItem.appendChild(fileText);
    listItem.appendChild(deleteIcon);
    fileList.appendChild(listItem);
}

function pickColor() {
    let color;
    if (colorIndex === 0) {
        color = 'blue';
    } else if (colorIndex === 1) {
        color = 'red';
    } else if (colorIndex === 2) {
        color = 'black';
    } else if (colorIndex === 3) {
        color = 'purple';
    } else {
        const letters = '0123456789abcdef';
        color = '#';
        for (let i = 0; i < 6; i++) {
            color += letters[Math.floor(Math.random() * 16)];
        }
    }
    colorIndex++;
    return color;
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
    } else {
        menu.classList.add("showMenu");
        closeIcon.style.display = "block";
        menuIcon.style.display = "none";
    }
}

hamburger.addEventListener("click", toggleMenu);