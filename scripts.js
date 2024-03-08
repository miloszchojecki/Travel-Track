//alert('Hello World!');

var map = L.map('map').setView([51.11044, 17.05852], 16);

L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
}).addTo(map);

var latlngs = [
    [51.11057, 17.05729],
    [51.10978, 17.05345],
    [51.10730, 17.05663],
    [51.10715, 17.06197]
];

var polyline = L.polyline(latlngs, {color: 'red', weight: 5}).addTo(map);

map.fitBounds(polyline.getBounds());

const mapContainer = document.getElementById('map');

function toggleMapVisibility() {
  mapContainer.classList.toggle('hidden-map'); // Dodajemy lub usuwamy klasę 'hidden-map' z kontenera mapy
}

const menu = document.querySelector(".menu");
const menuItems = document.querySelectorAll(".menuItem");
const hamburger= document.querySelector(".hamburger");
const closeIcon= document.querySelector(".closeIcon");
const menuIcon = document.querySelector(".menuIcon");

function toggleMenu() {
  if (menu.classList.contains("showMenu")) {
    menu.classList.remove("showMenu");
    closeIcon.style.display = "none";
    menuIcon.style.display = "block";
    toggleMapVisibility(); // Po zamknięciu menu ukrywamy mapę
  } else {
    menu.classList.add("showMenu");
    closeIcon.style.display = "block";
    menuIcon.style.display = "none";
    toggleMapVisibility(); // Po otwarciu menu pokazujemy mapę
  }
}

hamburger.addEventListener("click", toggleMenu);
menuItems.forEach(menuItem => menuItem.addEventListener("click", toggleMenu));
