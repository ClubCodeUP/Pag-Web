document.addEventListener("DOMContentLoaded", function () {
  const stats = {
    anios: 5,
    lenguajes: 6,
    talleres: 50,
    miembros: 34
  };

  // Asigna los valores a los elementos correspondientes
  document.getElementById("stat-anios").textContent = stats.anios;
  document.getElementById("stat-lenguajes").textContent = stats.lenguajes;
  document.getElementById("stat-talleres").textContent = stats.talleres;
  document.getElementById("stat-miembros").textContent = stats.miembros;
});
