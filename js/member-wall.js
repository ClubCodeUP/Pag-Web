/* Mural recuperado del diseño anterior: mismo radio y respuesta al puntero. */
(function () {
  "use strict";
  var hover = window.matchMedia("(hover: hover) and (pointer: fine)");
  // ---- muro de retratos --------------------------------------------------
  // El color no está en un retrato: está alrededor del cursor. Cada baldosa
  // recibe --c (0..1) según su distancia al puntero, y de ahí salen el
  // color, el brillo y la escala en CSS. En táctil, el foco viaja con el
  // scroll por el centro de la pantalla.
  var wall = document.querySelector(".member-wall");
  if (wall) {
    var tiles = Array.prototype.slice.call(wall.querySelectorAll(".member-wall__tile"));
    // Animate wrappers once, independently of each portrait's pointer response.
    // Without JS, IntersectionObserver, or with reduced motion, all stay visible.
    var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if ("IntersectionObserver" in window && !reducedMotion.matches) {
      var entries = Array.prototype.slice.call(wall.querySelectorAll("li"));
      var entrance = new IntersectionObserver(function (observations) {
        observations.forEach(function (observation) {
          if (!observation.isIntersecting) return;
          observation.target.classList.add("is-visible");
          entrance.unobserve(observation.target);
        });
      }, { threshold: .12, rootMargin: "0px 0px -24px 0px" });
      entries.forEach(function (entry, index) {
        entry.style.setProperty("--entry-delay", (index % 7) * 45 + "ms");
        entrance.observe(entry);
      });
      wall.classList.add("member-wall--enter");
      reducedMotion.addEventListener("change", function (event) {
        if (!event.matches) return;
        entrance.disconnect();
        wall.classList.remove("member-wall--enter");
      });
    }
    var centers = [];
    var radius = 1;
    // Posición de layout, no de pantalla: las filas del muro entran con un
    // transform desde fuera y getBoundingClientRect lo arrastraría.
    var pageOffset = function (el) {
      var x = 0, y = 0;
      while (el) { x += el.offsetLeft; y += el.offsetTop; el = el.offsetParent; }
      return { x: x, y: y };
    };
    var measure = function () {
      centers = tiles.map(function (t) {
        var o = pageOffset(t), w = t.offsetWidth, h = t.offsetHeight;
        return { x: o.x + w / 2, y: o.y + h / 2, w: w, visible: w > 0 };
      });
      var w = centers.length && centers[0].w || 100;
      radius = w * 1.9;
    };
    var paint = function (px, py) {
      for (var i = 0; i < tiles.length; i++) {
        var c = centers[i];
        if (!c || !c.visible) continue;
        var d = Math.hypot(px - c.x, py - c.y) / radius;
        var v = d >= 1 ? 0 : 1 - d * d * (3 - 2 * d);   // smoothstep hacia fuera
        tiles[i].style.setProperty("--c", v.toFixed(3));
      }
    };
    var clear = function () { tiles.forEach(function (t) { t.style.setProperty("--c", "0"); }); };

    measure();
    window.addEventListener("resize", measure, { passive: true });
    window.addEventListener("load", measure);
    if ("ResizeObserver" in window) new ResizeObserver(measure).observe(wall);
    if (document.fonts) document.fonts.ready.then(measure);

    if (hover.matches) {
      // Se escribe directo del evento: nada de suavizado ni rAF, o se
      // siente que va detrás del cursor.
      wall.addEventListener("pointermove", function (e) { paint(e.pageX, e.pageY); }, { passive: true });
      wall.addEventListener("pointerleave", clear);
      // El scroll cambia la relación puntero/baldosa aunque el ratón no se mueva.
      var lastX = null, lastY = null;
      wall.addEventListener("pointermove", function (e) { lastX = e.clientX; lastY = e.clientY; }, { passive: true });
      window.addEventListener("scroll", function () {
        if (lastX !== null && wall.matches(":hover")) paint(lastX + window.scrollX, lastY + window.scrollY);
      }, { passive: true });
    } else {
      var focusByScroll = function () {
        var r = wall.getBoundingClientRect();
        if (r.bottom < 0 || r.top > window.innerHeight) return;
        paint(window.scrollX + window.innerWidth / 2, window.scrollY + window.innerHeight * .5);
      };
      window.addEventListener("scroll", focusByScroll, { passive: true });
      focusByScroll();
    }
    // Teclado: la baldosa enfocada se enciende sola desde CSS.
    tiles.forEach(function (t) {
      t.addEventListener("focus", function () { clear(); });
    });
  }

})();
