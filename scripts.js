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
        loadGPX(file).then(latlngs => { 
            addTrackToMap(latlngs); 
            addTrackToList(file.name); 
            const speeds = calculateSpeed(latlngs);
            displaySpeedOnMap(latlngs, speeds);
        });
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
function degreesToRadians(degrees) {
  return degrees * Math.PI / 180;
}

function calculateDistance(lat1, lon1, lat2, lon2) {
  const earthRadiusKm = 6371;

  const dLat = degreesToRadians(lat2 - lat1);
  const dLon = degreesToRadians(lon2 - lon1);

  const radLat1 = degreesToRadians(lat1);
  const radLat2 = degreesToRadians(lat2);

  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(radLat1) * Math.cos(radLat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const distance = earthRadiusKm * c;
  return distance;
}
function calculateSpeed(latlngs) {
  const speeds = [];
  for (let i = 1; i < latlngs.length; i++) {
      const lat1 = latlngs[i - 1][0];
      const lon1 = latlngs[i - 1][1];
      const lat2 = latlngs[i][0];
      const lon2 = latlngs[i][1];
      const distance = calculateDistance(lat1, lon1, lat2, lon2); // Function to calculate distance between two points
      const timeDifference = 1; // Assuming time difference is 1 second between consecutive points (adjust as needed)
      const speed = distance / timeDifference; // Speed in units per second
      speeds.push(speed);
  }
  return speeds;
}

function displaySpeedOnMap(latlngs, speeds) {
  latlngs.forEach(function(latlng, index) {
      const speed = speeds[index];
      const marker = L.marker(latlng).addTo(map);
      marker.bindPopup(`Speed: ${speed.toFixed(2)} units/s`).openPopup();
  });
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