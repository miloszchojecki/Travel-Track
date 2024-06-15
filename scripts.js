//inicjalizacja mapy z ustawieniem początkowych współrzędnych
var map = L.map('map').setView([51.11044, 17.05852], 16);
var simpleMapScreenshoter = L.simpleMapScreenshoter({hidden: true}).addTo(map);

//flagi determinujące, czy uproszczenia ścieżek na podstawie prędkości lub odległości mają być stosowane 
var simplifyBySpeed = false;
var simplifyByDistance = false;

var tracks = [];
var currentTrack = []; 
var colorIndex = 0;
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
  attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);
const mapContainer = document.getElementById('map');

//obsługa dodawania ścieżek z pliku GPX
document.getElementById('fileInput').addEventListener('change', function (event) {
  const file = event.target.files[0];
  if (file)
    loadGPX(file).then(data => { 
      if(simplifyBySpeed) {
        // INPUT: timestamps, x,y-coords, treshold speed(km/h)
        stationaryBugRemoverSpeed(data.timeArray, data.latlngs, 4);
      }
      if (simplifyByDistance) {
        // INPUT: x,y-coords, treshold distance(meters)
        stationaryBugRemoverDistance(data.latlngs, 10);
      }
      // Dodanie ścieżki do mapy i listy
      addTrackToMap(data.latlngs);
      addTrackToList(file.name);
    });
  // Pokazuje markery jeżeli chcemy ręcznie edytować ścieżkę, wpp. nie wyświetla markerów
  document.getElementById('markerToggle').addEventListener('change', function(event) {
    const isChecked = event.target.checked;
    if (isChecked) {
      makeMarkersDraggable();
    } else {
      makeMarkersHidden();
    }
  });
   //resetowanie wartości input, aby umożliwić ponowne dodanie tego samego pliku
  document.getElementById('fileInput').value = '';
});

// Upraszczanie trasy z użyciem alg. Douglasa Peuckera
// https://en.wikipedia.org/wiki/Ramer%E2%80%93Douglas%E2%80%93Peucker_algorithm
function douglasPeucker(points, tolerance) {
  if (points.length <= 2) {
    return points;
  }
  // Znajdź punkt z maksymalną odległością
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
  // Jeśli maksymalna odległość jest większa od tolerancji, uprość rekurencyjnie
  if (maxDistance > tolerance) {
    const firstPart = douglasPeucker(points.slice(0, index + 1), tolerance);
    const secondPart = douglasPeucker(points.slice(index), tolerance);
    return firstPart.slice(0, firstPart.length - 1).concat(secondPart);
  } else {
    return [points[0], points[end]];
  }
}

//Funkcja pomocnicza dla douglasPeucker; Oblicza odległość
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

//ładowanie pliku GPX
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
      resolve({latlngs, timeArray});
    }
    reader.readAsText(file);
  });
}
// Funkcja ukrywająca markery na mapie
function makeMarkersHidden() {
  map.eachLayer(function(layer) {
      if (layer instanceof L.Marker) {
          map.removeLayer(layer);
      }
  });
}
// Funkcja umożliwiająca przeciąganie markerów
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

//dodanie ścieżki do mapy i do listy ścieżek
function addTrackToMap(latlngs) {
  const polyline = L.polyline(latlngs, { color: pickColor() }).addTo(map);
  tracks.push(polyline);
  map.fitBounds(polyline.getBounds());
}
//dodanie ścieżki do listy ścieżek
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

// Wybór koloru dla ścieżki
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

// Elementy menu
const menu = document.querySelector(".menu");
const menuItems = document.querySelectorAll(".menuItem");
const hamburger = document.querySelector(".hamburger");
const closeIcon = document.querySelector(".closeIcon");
const menuIcon = document.querySelector(".menuIcon");
const screenshotBtn = document.querySelector(".screenshotBtn");
const saveScreenshotBtn = document.querySelector("#save-button");
const cancelScreenshotBtn = document.querySelector("#cancel-button");
const captionCheckbox = document.querySelector("#caption-checkbox");
const screenshotCaption = document.querySelector("#screenshot-caption");
const simplifyBySpeedToggle = document.getElementById('simplifyBySpeedToggle');
const simplifyByDistanceToggle = document.getElementById('simplifyByDistanceToggle');

// Toggle widoczności menu
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

// Wł/Wył upraszczanie przez prędkość
simplifyBySpeedToggle.addEventListener('change', function(event) {
  const isChecked = event.target.checked;
  if (isChecked) {
    simplifyBySpeed = true;
  } else {
    simplifyBySpeed = false;
  }
});
// Wł/Wył upraszczanie przez odległośc
simplifyByDistanceToggle.addEventListener('change', function(event) {
  const isChecked = event.target.checked;
  if (isChecked) {
    simplifyByDistance = true;
  } else {
    simplifyByDistance = false;
  }
});

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
  // Wyświetl smoothness
  document.getElementById('smoothnessValue').textContent = smoothness.toFixed(4);
});
slider.addEventListener('change', function(event) {
  const smoothness = parseFloat(event.target.value);
  // smoothness = wartość zczytana ze slidera
  document.getElementById('smoothnessValue').textContent = smoothness.toFixed(4);
  const latlngs = currentTrack.getLatLngs();
  const simplifiedLatlngs = douglasPeucker(latlngs, smoothness); // the higher second parameter the more points we remove
  addTrackToMap(simplifiedLatlngs);
  var str = "Simplified " + smoothness.toString()
  addTrackToList(str);
});

// Oblicza odległość między dwoma punktami używając "haversine formula"
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Promień Ziemi w metrach
  const φ1 = lat1 * Math.PI / 180; // Stopnie do radianów
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c; // Odl. w metrach
  return distance;
}

// Obliczanie prędkośi między dwoma punktami
function calculateSpeed(lat1, lon1, time1, lat2, lon2, time2) {
  const distance = calculateDistance(lat1, lon1, lat2, lon2) / 1000; // Odl. w km
  const timeDiff = (time2 - time1) / (1000 * 60 * 60); // Różnica czasu w godz
  const speed = distance / timeDiff; // Prędkość w km/h
  return speed;
}

// Upraszczanie miejsc, gdzie użytkownik stał, bazując na odległości między nast. punktami
// treshold podajemy w metrach 
function stationaryBugRemoverDistance(latlngs, tresholdDistance) {
  var simplifiedLatlngs = [];
  for (let i = 0; i < latlngs.length - 1; i++) {
    //Usuń jeśli distance < treshold
    var distance = calculateDistance(latlngs[i][0], latlngs[i][1], latlngs[i+1][0], latlngs[i+1][1]); // Odl. w metrach
    if (distance < tresholdDistance) {
      //IDEA: Usuwaj wszystkie punkty poniżej tresholdu, 
      //jeśli jakiś pkt jest już dalej niż treshold (lub koniec punktów) to opóść for
      const pointIndex = i;
      for (let j = i; (distance < tresholdDistance) && (j < latlngs.length - 1); j++) {
        distance = calculateDistance(latlngs[pointIndex][0], latlngs[pointIndex][1], latlngs[j+1][0], latlngs[j+1][1]);
        i = j;
      }
    } 
    else {
      simplifiedLatlngs.push(latlngs[i])
    }
  }
  addTrackToMap(simplifiedLatlngs);
  var str = "SimplifiedByDistance " + tresholdDistance.toString();
  addTrackToList(str);
}

// Upraszczanie miejsc, gdzie użytkownik stał, bazując na prędkości między dwoma punktami
// treshold podajemy w km/h
function stationaryBugRemoverSpeed(timeArray, latlngs, treshholSpeed) {
  var simplifiedLatlngs = [];
  for (let i = 0; i < latlngs.length - 1; i++) {
    //Usuń jeśli speed < treshold
    const speed = calculateSpeed(latlngs[i][0], latlngs[i][1], timeArray[i], latlngs[i+1][0], latlngs[i+1][1], timeArray[i+1]);
    if (speed < treshholSpeed) {} 
    else {
      simplifiedLatlngs.push(latlngs[i])
    }
  }
  addTrackToMap(simplifiedLatlngs);
  var str = "SimplifiedBySpeed " + treshholSpeed.toString();
  addTrackToList(str);
}

//ustawienie domyślnej nazwy dla pliku zrzutu ekranu na podstawie daty
const defaultName = 'My map ' + new Date().toLocaleDateString().replace(/\./g, '-');

//robienie zrzutu ekranu
screenshotBtn.addEventListener('click', function () {
  document.getElementById('screenshot-options').style.display = 'block'
  screenshotCaption.value = defaultName
})

//anulowanie zrzutu ekranu
cancelScreenshotBtn.addEventListener('click', function () {
  document.getElementById('screenshot-options').style.display = 'none'
})

//zapisywanie zrzutu ekranu
saveScreenshotBtn.addEventListener('click', function () {
  var name = screenshotCaption.value;
  if(!name)
    {
      name = defaultName;
    }
  simpleMapScreenshoter.takeScreen('blob', {
      caption: function () {
          if(captionCheckbox.checked)
            return name
          else
            return null
      },
      captionFontSize: 24,
      captionOffset: 18
  }).then(blob => {
      saveAs(blob, name+'.png')
  }).catch(e => {
      alert(e.toString())
  })
})

captionCheckbox.addEventListener('change', (event) => {
  screenshotCaption.disabled = !event.currentTarget.checked
  })

map.on('simpleMapScreenshoter.error', function (event) {
  console.error(event.e);
  alert('Unable to take screenshot');
})

document.querySelector('.exportButton').addEventListener('click', function() {
  exportTracks();
});

//funkcja eksportująca wszystkie ścieżki do formatu GPX
function exportTracks() {
  if (tracks.length === 0) {
    alert('No tracks to export!');
    return;
  }
  const gpxContent = generateGPX();
  const blob = new Blob([gpxContent], { type: 'text/xml' });
  saveAs(blob, 'tracks.gpx');
}

//generowanie pliku GPX zawierającego wszystkie ścieżki
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
