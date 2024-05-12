//Init
var map = L.map('map').setView([51.11044, 17.05852], 16);
var tracks = [];
var currentTrack = []; //potentaily needed slider 
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
    loadGPX(file).then(latlngs => { 

      latlngs.forEach(function(latlng) {
        console.log("INPUT Latitude:", latlng[0], "Longitude:", latlng[1]);
      });
      // const simplifiedLatlngs = douglasPeucker(latlngs, 0.0007); // the higher second parameter the more points we remove
      addTrackToMap(latlngs);
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
  // console.log("dp", points);
  // console.log("dp", points[0]);

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
  // const startX = start[0];
  // const startY = start[1];
  // const endX = end[0];
  // const endY = end[1];
  // // console.log("dist lat", point[0],"lng", point[1])
  // const x = point[0];
  // const y = point[1];

  const startX = start.lat;
  const startY = start.lng;
  const endX = end.lat;
  const endY = end.lng;
  // console.log("dist lat", point[0],"lng", point[1])
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
      const latlngs = [];

      trackPoints.forEach(function (point) {
        const lat = parseFloat(point.getAttribute('lat'));
        const lon = parseFloat(point.getAttribute('lon'));
        latlngs.push([lat, lon]);
      });
      resolve(latlngs);
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
  tracks.forEach(function(polyline) {
    polyline.getLatLngs().forEach(function(latlng, index) {
      const marker = L.marker(latlng, { draggable: true }).addTo(map);
      marker.on('drag', function(event) {
        const newLatLng = event.target.getLatLng();
        polyline.setLatLngs(polyline.getLatLngs().map((oldLatLng, i) => (i === index ? newLatLng : oldLatLng)));
      });
    });
  });
}

//PRZEDE WSZYSTKIM ZROBIC UPRASZZCANIE JAK SIE NIE RUSZA
// IDEA JAK JEST KLINKNIETY TO SPRAWDZ KTORY TO TRACK 
// I DLA TEGO TRACKA ZMIENIAJ SMOOTHNESS TJ USUN I ZROB ZNOWU ZE ZMIENIONYM SMOOTHNSE

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
  fileText.textContent = fileName;
  fileText.addEventListener('click', function () {
    map.fitBounds(polyline.getBounds());

    currentTrack = tracks[tracks.length - 1];
    // console.log("BLAH", tracks[tracks.length - 1]);
    // console.log("BLAH3", tracks[tracks.length - 1].getLatLngs());
    // console.log("BLAH3", tracks[tracks.length - 1].getLatLngs()[1]);
    // polyline.getLatLngs.forEach(function(latlng) {
    //   console.log("ADD2LIST Latitude:", latlng[0], "Longitude:", latlng[1]);
    // });
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
    // Update smoothness value display
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
  // Update smoothness value display
  document.getElementById('smoothnessValue').textContent = smoothness.toFixed(4);
});
slider.addEventListener('change', function(event) {
  const smoothness = parseFloat(event.target.value);
  // Update the smoothness factor when the slider value changes
  document.getElementById('smoothnessValue').textContent = smoothness.toFixed(4);
  //TODO REDRAW THE TRACK
  const latlngs = currentTrack.getLatLngs();
  // latlngs.forEach(latlng => {
  //   console.log("SMOTHED Latitude:", latlng.lat, "Longitude:", latlng.lng);
  // });
  const simplifiedLatlngs = douglasPeucker(latlngs, smoothness); // the higher second parameter the more points we remove
  addTrackToMap(simplifiedLatlngs);
  var str = "Simplified " + smoothness.toString()
  addTrackToList(str);
});

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
