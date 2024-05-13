//Init
var map = L.map('map').setView([51.11044, 17.05852], 16);
var tracks = [];
var currentTrack = []; //potentaily needed slider 
let fileCounter = 0; //counts tracks
var colorIndex = 0;
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);
const mapContainer = document.getElementById('map');

//Ading tracks
document.getElementById('fileInput').addEventListener('change', function (event) {
  const file = event.target.files[0];
  if (file)
    loadGPX(file).then(data => { 
      stationaryBugRemover(data.timeArray, data.latlngs, 4);
      // const simplifiedLatlngs = douglasPeucker(latlngs, 0.0007); // the higher second parameter the more points we remove
      addTrackToMap(data.latlngs);
      addTrackToList(file.name);
    });
  // Inside the document.getElementById('fileInput').addEventListener block
  document.getElementById('markerToggle').addEventListener('change', function(event) {
    const isChecked = event.target.checked;
    if (isChecked) {
      makeMarkersDraggable();
    } else {
      makeMarkersHidden();
    }
  });
  document.getElementById('fileInput').value = '';
});

// Simplifies the trach using douglasPeucker algorithm
function douglasPeucker(points, tolerance) {
  if (points.length <= 2) {
    return points;
  }
  // Find the point with the maximum distance
  let maxDistance = 0;
  let index = 0;
  const end = points.length - 1;
  for (let i = 1; i < end; i++) {
    const distance = perpendicularDistance(points[i], points[0], points[end]);
    if (distance > maxDistance) {
      maxDistance = distance;
      index = i;
    }
  }
  // If the maximum distance is greater than the tolerance, recursively simplify
  if (maxDistance > tolerance) {
    const firstPart = douglasPeucker(points.slice(0, index + 1), tolerance);
    const secondPart = douglasPeucker(points.slice(index), tolerance);
    return firstPart.slice(0, firstPart.length - 1).concat(secondPart);
  } else {
    return [points[0], points[end]];
  }
}

//Calculates distance used in douglasPeucker
function perpendicularDistance(point, start, end) {
  const startX = start.lat;
  const startY = start.lng;
  const endX = end.lat;
  const endY = end.lng;
  const x = point.lat;
  const y = point.lng;

  const slope = (endY - startY) / (endX - startX);
  const intercept = startY - slope * startX;
  const perpendicularIntercept = y + (1 / slope) * x;
  const perpendicularX = (perpendicularIntercept - intercept) / (slope + (1 / slope));
  const perpendicularY = slope * perpendicularX + intercept;

  return Math.sqrt(Math.pow(perpendicularX - x, 2) + Math.pow(perpendicularY - y, 2));
}

//Used to load file 
function loadGPX(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = function (e) {
      const gpxData = e.target.result;
      const gpx = new DOMParser().parseFromString(gpxData, 'text/xml');
      const trackPoints = gpx.querySelectorAll('trkpt');
      const timeElements = gpx.getElementsByTagName('time');
      const latlngs = [];
      const timeArray = [];
      //i equal 1 bc 0th time is not connected to any point
      for (let i = 1; i < timeElements.length; i++) {
        const timeValue = timeElements[i].textContent;
        const millis = Date.parse(timeValue);
        timeArray.push(millis);
      }
      trackPoints.forEach(function (point) {
        const lat = parseFloat(point.getAttribute('lat'));
        const lon = parseFloat(point.getAttribute('lon'));
        latlngs.push([lat, lon]);
      });
      console.log("|time| = ", timeArray.length, " |latlngs| = ", latlngs.length);

      //there should be equal number of time and latlng points
      // if ()
      resolve({latlngs, timeArray});
    }
    reader.readAsText(file);
  });
}
//Used to hide markers from the map
function makeMarkersHidden() {
  // Iterate through the marker layers and remove them from the map
  map.eachLayer(function(layer) {
    if (layer instanceof L.Marker) {
      map.removeLayer(layer);
    }
  });
}
//makes markers draggable
function makeMarkersDraggable() {
  // tracks.forEach(function(polyline) {
  var polyline = currentTrack;
    polyline.getLatLngs().forEach(function(latlng, index) {
      const marker = L.marker(latlng, { draggable: true }).addTo(map);
      marker.on('drag', function(event) {
        const newLatLng = event.target.getLatLng();
        polyline.setLatLngs(polyline.getLatLngs().map((oldLatLng, i) => (i === index ? newLatLng : oldLatLng)));
      });
    });
  // });
}
//removeTrackHelper
function updateFileNumbers(deletedFileNumber) {
  const fileTextElements = document.querySelectorAll('.fileText');
  fileTextElements.forEach(fileText => {
    const fileNumber = parseInt(fileText.dataset.fileNumber);
    if (fileNumber > deletedFileNumber) {
      fileText.dataset.fileNumber = fileNumber - 1; // Decrease file number by 1 for tracks after the deleted one
    }
  });
  fileCounter--;
}
//adds track to map
function addTrackToMap(latlngs) {
  const polyline = L.polyline(latlngs, { color: pickColor() }).addTo(map);
  tracks.push(polyline);
  map.fitBounds(polyline.getBounds());
}
//adds track to list of tracks
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
  fileCounter++;
  fileText.textContent = fileName;
  fileText.dataset.fileNumber = fileCounter;
  fileText.addEventListener('click', function () {
    map.fitBounds(polyline.getBounds());
    const currTrIdx = fileText.dataset.fileNumber- 1;
    currentTrack = tracks[currTrIdx];
  });

  const deleteIcon = document.createElement('i');
  deleteIcon.classList.add('deleteIcon', 'material-icons');
  deleteIcon.textContent = 'delete';
  deleteIcon.addEventListener('click', function () {
    map.removeLayer(polyline);
    updateFileNumbers(fileText.dataset.fileNumber);
    fileList.removeChild(listItem);
    const idx = tracks.indexOf(polyline);
    tracks.splice(idx, 1);
  });
  listItem.appendChild(fileText);
  listItem.appendChild(deleteIcon);
  fileList.appendChild(listItem);
}

//picks color for track
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
const screenshotBtn = document.querySelector(".screenshotBtn"); // Dodaj referencję do przycisku Screenshot

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

const slider = document.getElementById('smoothnessSlider');
const input = document.getElementById('smoothnessInput');
const confirmButton = document.getElementById('confirmSmoothness');

// Function to handle confirmation button click
confirmButton.addEventListener('click', function(event) {
  const smoothness = parseFloat(input.value);
  if (!isNaN(smoothness)) { // Check if input is a valid number
    slider.value = smoothness;
    document.getElementById('smoothnessValue').textContent = smoothness.toFixed(4);
    // Call the event handler for slider change to update the track
    slider.dispatchEvent(new Event('change'));
  } else {
    alert("Please enter a valid number.");
  }
});
input.addEventListener('input', function(event) {
  const smoothness = parseFloat(event.target.value);
  slider.value = smoothness;
  document.getElementById('smoothnessValue').textContent = smoothness.toFixed(4);
});
slider.addEventListener('change', function(event) {
  const smoothness = parseFloat(event.target.value);
  document.getElementById('smoothnessValue').textContent = smoothness.toFixed(4);
  input.value = smoothness;
  const latlngs = currentTrack.getLatLngs();
  const simplifiedLatlngs = douglasPeucker(latlngs, smoothness); // the higher second parameter the more points we remove
  addTrackToMap(simplifiedLatlngs);
  var str = "Simplified " + smoothness.toString();
  addTrackToList(str);
});

// Function to calculate the distance between two points using the haversine formula
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth radius in meters
  const φ1 = lat1 * Math.PI / 180; // Convert degrees to radians
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c; // Distance in meters
  return distance;
}

// Function to calculate speed between two points
function calculateSpeed(lat1, lon1, time1, lat2, lon2, time2) {
  const distance = calculateDistance(lat1, lon1, lat2, lon2) / 1000; // Distance in kilometers
  const timeDiff = (time2 - time1) / (1000 * 60 * 60); // Time difference in hours
  const speed = distance / timeDiff; // Speed in kilometers per hour
  return speed;
}

//simplifies places where user was stationary
//treshhold in km/h
function stationaryBugRemover(timeArray, latlngs, treshhold) {
  // const latlngs = currentTrack.getLatLngs();
  var simplifiedLatlngs = [];
  for (let i = 0; i < latlngs.length - 1; i++) {
    const speed = calculateSpeed(latlngs[i][0], latlngs[i][1], timeArray[i], latlngs[i+1][0], latlngs[i+1][1], timeArray[i+1]);
    if (speed < treshhold) {} 
    else {
      simplifiedLatlngs.push(latlngs[i])
    }
  }
  addTrackToMap(simplifiedLatlngs);
  var str = "SimplifiedStationary " + treshhold.toString();
  addTrackToList(str);
}

screenshotBtn.addEventListener("click", function() {
  navigator.mediaDevices.getDisplayMedia({ video: true }).then(stream => {
    const videoElement = document.getElementById('screenshotVideo');
    videoElement.srcObject = stream;
    videoElement.onloadedmetadata = function(e) {
      videoElement.play();
      const canvas = document.createElement('canvas');
      canvas.width = videoElement.videoWidth;
      canvas.height = videoElement.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
      const imgData = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = imgData;
      link.download = 'screenshot.png';
      link.click();
      stream.getTracks().forEach(track => track.stop());
    };
  }).catch(error => {
    console.error('Error capturing screenshot:', error);
  });
});

document.querySelector('.exportButton').addEventListener('click', function() {
  exportTracks();
});

function exportTracks() {
  if (tracks.length === 0) {
    alert('No tracks to export!');
    return;
  }
  const gpxContent = generateGPX();
  const blob = new Blob([gpxContent], { type: 'text/xml' });
  saveAs(blob, 'tracks.gpx');
}

function generateGPX() {
  let gpxContent = '<?xml version="1.0" encoding="UTF-8" standalone="no" ?>';
  gpxContent += '<gpx xmlns="http://www.topografix.com/GPX/1/1">';
  gpxContent += '<trk>';
  gpxContent += '<name>Tracks</name>';
  gpxContent += '<trkseg>';
  tracks.forEach(track => {
      track.getLatLngs().forEach(latlng => {
          gpxContent += `<trkpt lat="${latlng.lat}" lon="${latlng.lng}"></trkpt>`;
      });
  });
  gpxContent += '</trkseg>';
  gpxContent += '</trk>';
  gpxContent += '</gpx>';
  return gpxContent;
}
