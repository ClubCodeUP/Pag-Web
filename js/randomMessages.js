document.addEventListener("DOMContentLoaded", function () {
 const messages = [
  "Cursos Gratuitos :)",
  "¡Aprende sin costo!",
  "Educación para todos",
  "Únete a nuestras clases gratis",
  "Conocimiento sin barreras",
  "Ahora en 3D",
  "No puedo cerrar el Balatro",
  "Te veo 👀",
  "Hello, World!",
  "May the code be with you",
  "404: Excusas no encontradas",
  "sudo aprende ahora",
  "There's no place like 127.0.0.1",
  "📚 + 🧠 = 💥",

  // Nuevos mensajes gpt
  "Compila tu futuro 🖥️",
  "Aprende... como si fuera el último save",
  "Ctrl + S antes de que crashee",
  "console.log('Sigue estudiando');",
  "It's dangerous to go alone! Take this 📚",
  "¡Sube de nivel con nosotros!",
  "Acceso root al saber",
  "Neo, ya sabes programar",
  "Winter is coding ❄️",
  "Usa la Fuerza (y Python)",
  "Hazlo por la ciencia... o por XP",
  "Aprende como un Saiyajin: con cada derrota",
  "Compila o muere 🔥",
  "Mientras más aprendo, menos bugs tengo",
  "🎮 Save scumming la vida real: estudiar",
  "Insert coin to aprender 💾",
  "Con grandes bugs vienen grandes responsabilidades",
  "En esta clase sí hay respawn",
  "Aprende algo que ni ChatGPT sepa",
  "Knowledge is the final boss"
];

  const randomIndex = Math.floor(Math.random() * messages.length);
  const messageElement = document.getElementById("randomMessage");

  if (messageElement) {
    messageElement.innerHTML = messages[randomIndex];
  }
});
