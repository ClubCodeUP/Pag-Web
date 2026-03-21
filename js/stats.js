document.addEventListener("DOMContentLoaded", function () {
  const stats = {
    anios: 6,
    lenguajes: 7,
    talleres: 10,
    miembros: 74
  };

  // Asigna los valores a los elementos correspondientes
  document.getElementById("stat-anios").textContent = stats.anios;
  document.getElementById("stat-lenguajes").textContent = stats.lenguajes;
  document.getElementById("stat-talleres").textContent = stats.talleres;
  document.getElementById("stat-miembros").textContent = stats.miembros;
});
