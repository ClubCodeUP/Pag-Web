/* The club guide owns its route and clock; the hero and card reveals do not. */
(function (root, factory) {
  const motion = factory();
  if (typeof module === "object" && module.exports) module.exports = motion;
  else { motion.mount(root.document); motion.mountDivider(root.document); }
})(typeof window !== "undefined" ? window : null, function () {
  "use strict";
  const clamp = (value, low, high) => Math.max(low, Math.min(high, value));

  // Exact critically damped spring: equal response at 30, 60, or 144 Hz.
  function advance(state, target, dt) {
    const omega = 18;
    const offset = state.position - target;
    const impulse = state.velocity + omega * offset;
    const decay = Math.exp(-omega * dt);
    return {
      position: target + (offset + impulse * dt) * decay,
      velocity: (state.velocity - omega * impulse * dt) * decay
    };
  }

  // A single flowing S, rather than a staircase of short, tight turns.
  // The wheel contact stays on the stroke; its amplitude fits the live content.
  function routePoints(width, height, notes, catWidth, mobile) {
    const catHeight = catWidth * 5 / 6;
    // The container has a 15px viewport inset. Borrow 12px of that gutter so
    // even a banked sprite clears the photograph on narrow phone screens.
    const minX = catWidth * .56 - 12;
    const startY = catHeight + 18;
    const endY = height - 18;
    if (mobile) {
      const right = Math.max(minX, Math.min(...notes.map(note => note.left - catWidth * .44 - 12)));
      const left = Math.max(minX, right - 12);
      return [
        { x: right, y: startY },
        { x: left, y: height * .28 },
        { x: right, y: height * .52 },
        { x: left, y: height * .76 },
        { x: right, y: endY }
      ];
    }
    // Centre the image, accounting for the off-centre wheel anchor.
    const center = width / 2 + catWidth * .06;
    const makePoints = amplitude => {
      const points = [{ x: center - amplitude * .82, y: startY }];
      notes.forEach((note, i) => {
        points.push({
          x: center + (note.left > width * .3 ? -amplitude : amplitude),
          y: note.top + note.height * .55 + catHeight * .35
        });
        const next = notes[i + 1];
        if (next) points.push({
          x: center,
          y: (note.top + note.height + next.top) / 2 + catHeight * .44,
          // Tangents must shrink with the amplitude too. A fixed tangent
          // otherwise bulges out of the tighter lane between compact stories.
          slope: (next.left > width * .3 ? -1 : 1) * .22 * Math.min(1, amplitude / (width * .14))
        });
      });
      points.push({ x: center - amplitude * .82, y: endY });
      return points;
    };
    // Collision checks run only after layout changes. Shrink the whole curve
    // uniformly instead of clamping individual points and introducing kinks.
    function clearsStories(points) {
      for (let i = 1; i < points.length; i += 1) {
        const a = points[i - 1], b = points[i];
        for (let j = 0; j <= 80; j += 1) {
          const t = j / 80;
          const { x, y } = curvePoint(a, b, t);
          const left = x - catWidth * .56 - catHeight * .105;
          const right = x + catWidth * .44 + catHeight * .105;
          const top = y - catHeight * .94 - catWidth * .06;
          const bottom = y + catHeight * .06 + catWidth * .06;
          if (notes.some(note => bottom > note.top - 3 && top < note.top + note.height + 3 && right > note.left - 3 && left < note.left + note.width + 3)) return false;
        }
      }
      return true;
    }
    let amplitude = width * .14;
    for (let attempt = 0; attempt < 24; attempt += 1) {
      const points = makePoints(amplitude);
      if (clearsStories(points)) return points;
      amplitude *= .86;
    }
    return makePoints(0);
  }

  function curvePoint(a, b, t) {
    const third = (b.y - a.y) / 3;
    const c1 = a.x + (a.slope || 0) * third;
    const c2 = b.x - (b.slope || 0) * third;
    const u = 1 - t;
    return { x: u*u*u*a.x + 3*u*u*t*c1 + 3*u*t*t*c2 + t*t*t*b.x, y: a.y + (b.y - a.y)*t };
  }

  function pathData(points) {
    let d = `M ${points[0].x},${points[0].y}`;
    for (let i = 1; i < points.length; i += 1) {
      const a = points[i - 1], b = points[i];
      const third = (b.y - a.y) / 3;
      d += ` C ${a.x + (a.slope || 0) * third},${a.y + third} ${b.x - (b.slope || 0) * third},${b.y - third} ${b.x},${b.y}`;
    }
    return d;
  }

  function mount(document) {
    const stage = document.querySelector(".ide-flight--photos .ide-flight__stage");
    if (!stage) return;
    const svg = stage.querySelector(".ide-flight__svg");
    const path = stage.querySelector(".ide-flight__trail");
    const track = stage.querySelector(".ide-flight__track");
    const cat = stage.querySelector(".ide-flight__cat");
    const img = cat && cat.querySelector("img");
    const notes = Array.from(stage.querySelectorAll(".ide-flight__note"));
    if (!svg || !path || !track || !img || notes.length !== 3) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let samples = [], length = 0, stageTop = 0, viewportHeight = 0;
    let firstY = 0, lastY = 0, catWidth = 0, catHeight = 0;
    let frame = 0, lastTime = 0, state = null, tilt = 0;
    let layoutDirty = true, visible = true, imageReady = false;
    let renders = 0;
    const debug = new URLSearchParams(window.location.search).has("flightDebug");

    function measure() {
      const rect = stage.getBoundingClientRect();
      stageTop = rect.top + window.scrollY;
      viewportHeight = window.innerHeight;
      catWidth = cat.offsetWidth;
      catHeight = cat.offsetHeight;
      const bounds = notes.map(note => ({ left: note.offsetLeft, top: note.offsetTop, width: note.offsetWidth, height: note.offsetHeight }));
      const points = routePoints(rect.width, rect.height, bounds, catWidth, window.innerWidth < 768);
      const d = pathData(points);
      svg.setAttribute("viewBox", `0 0 ${rect.width} ${rect.height}`);
      path.setAttribute("d", d);
      track.setAttribute("d", d);
      length = path.getTotalLength();
      path.style.strokeDasharray = String(length);
      // Geometry work happens only on layout changes, never during the scroll loop.
      const count = Math.max(200, Math.ceil(length / 3));
      samples = Array.from({ length: count + 1 }, (_, i) => {
        const distance = length * i / count;
        const point = path.getPointAtLength(distance);
        return { x: point.x, y: point.y, distance };
      });
      firstY = samples[0].y;
      lastY = samples[samples.length - 1].y;
      layoutDirty = false;
      if (!state) state = { position: targetY(), velocity: 0 };
      state.position = clamp(state.position, firstY, lastY);
    }

    function targetY() {
      return clamp(window.scrollY + viewportHeight * .56 - stageTop, firstY, lastY);
    }

    function pointAtY(y) {
      let low = 0, high = samples.length - 1;
      while (high - low > 1) {
        const mid = (low + high) >> 1;
        if (samples[mid].y < y) low = mid;
        else high = mid;
      }
      const a = samples[low], b = samples[high];
      const mix = clamp((y - a.y) / Math.max(.001, b.y - a.y), 0, 1);
      return {
        x: a.x + (b.x - a.x) * mix,
        y: a.y + (b.y - a.y) * mix,
        distance: a.distance + (b.distance - a.distance) * mix,
        slope: (b.x - a.x) / Math.max(.001, b.y - a.y)
      };
    }

    function tick(time) {
      frame = 0;
      if (document.hidden || !visible || !imageReady) return;
      if (layoutDirty) measure();
      const dt = lastTime ? Math.min((time - lastTime) / 1000, .05) : 1 / 60;
      lastTime = time;
      const target = reduced.matches ? firstY : targetY();
      state = reduced.matches ? { position: firstY, velocity: 0 } : advance(state, target, dt);
      state.position = clamp(state.position, firstY, lastY);
      const positionSettled = Math.abs(state.position - target) < .08 && Math.abs(state.velocity) < .5;
      if (positionSettled) state = { position: target, velocity: 0 };
      const point = pointAtY(state.position);
      // Bank into turns around the wheel contact. Reversing scroll preserves
      // velocity and pose: no instant image flip, reset, or duplicate ghost.
      const maxTilt = 5;
      const targetTilt = reduced.matches ? 0 : clamp(point.slope * state.velocity * .009, -maxTilt, maxTilt);
      tilt += (targetTilt - tilt) * (1 - Math.exp(-dt / .14));
      if (Math.abs(tilt - targetTilt) < .02) tilt = targetTilt;
      cat.style.transform = `translate3d(${(point.x - catWidth * .56).toFixed(2)}px,${(point.y - catHeight * .94).toFixed(2)}px,0) rotate(${tilt.toFixed(2)}deg)`;
      path.style.strokeDashoffset = String(reduced.matches ? 0 : length - point.distance);
      stage.dataset.flightReady = "true";
      const settled = positionSettled && Math.abs(tilt) < .02;
      if (debug) {
        stage.dataset.flightY = point.y.toFixed(2);
        stage.dataset.flightRenders = String(++renders);
        stage.dataset.flightSettled = String(settled);
      }
      if (!settled) frame = window.requestAnimationFrame(tick);
      else lastTime = 0;
    }

    function wake() {
      if (!frame && visible && imageReady && !document.hidden) frame = window.requestAnimationFrame(tick);
    }
    function relayout() { layoutDirty = true; wake(); }
    window.addEventListener("scroll", wake, { passive: true });
    window.addEventListener("resize", relayout, { passive: true });
    window.addEventListener("load", relayout, { once: true });
    reduced.addEventListener("change", wake);
    document.addEventListener("visibilitychange", () => { lastTime = 0; wake(); });
    if (document.fonts) document.fonts.ready.then(relayout);
    if ("ResizeObserver" in window) {
      const observer = new ResizeObserver(relayout);
      observer.observe(document.body);
      observer.observe(stage);
      notes.forEach(note => observer.observe(note));
    }
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(entries => {
        visible = entries[0].isIntersecting;
        lastTime = 0;
        if (visible) relayout();
        else if (frame) { window.cancelAnimationFrame(frame); frame = 0; }
      }, { rootMargin: "180px" }).observe(stage);
    }
    function ready() { imageReady = img.naturalWidth > 0; relayout(); }
    if (img.decode) img.decode().then(ready).catch(ready);
    else if (img.complete) ready();
    else img.addEventListener("load", ready, { once: true });
  }
  function dividerGeometry(width, height, catWidth) {
    const firstX = catWidth * .56 + 4;
    const lastX = Math.max(firstX, width - catWidth * .44 - 4);
    const wheelY = height - 24;
    return { firstX, travel: lastX - firstX, wheelY, imageY: wheelY - catWidth * 5 / 6 * .94 };
  }

  // Independent horizontal progress rail. No tilt, curve, loop, or jump at reversal.
  function mountDivider(document) {
    const stage = document.querySelector(".ide-skate-divider__stage");
    if (!stage) return;
    const cat = stage.querySelector(".ide-skate-divider__cat");
    const track = stage.querySelector(".ide-skate-divider__track");
    const fill = stage.querySelector(".ide-skate-divider__fill");
    if (!cat || !track || !fill) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let geometry, width = 0, documentY = 0, viewport = 0;
    let state = null, frame = 0, lastTime = 0;
    let dirty = true, visible = true, ready = false, renders = 0;
    const debug = new URLSearchParams(window.location.search).has("flightDebug");

    function measure() {
      const rect = stage.getBoundingClientRect();
      width = cat.offsetWidth;
      geometry = dividerGeometry(rect.width, rect.height, width);
      documentY = rect.top + window.scrollY + geometry.wheelY;
      viewport = window.innerHeight;
      [track, fill].forEach(line => {
        line.style.left = geometry.firstX + "px";
        line.style.top = geometry.wheelY + "px";
        line.style.width = geometry.travel + "px";
      });
      dirty = false;
      if (!state) state = { position: target(), velocity: 0 };
    }
    function target() {
      return reduced.matches ? 0 : clamp((window.scrollY + viewport * .86 - documentY) / (viewport * .7), 0, 1);
    }
    function tick(time) {
      frame = 0;
      if (document.hidden || !visible || !ready) return;
      if (dirty) measure();
      const dt = lastTime ? Math.min((time - lastTime) / 1000, .05) : 1 / 60;
      lastTime = time;
      const goal = target();
      state = reduced.matches ? {position:0,velocity:0} : advance(state, goal, dt);
      state.position = clamp(state.position, 0, 1);
      const settled = Math.abs(state.position - goal) < .0001 && Math.abs(state.velocity) < .001;
      if (settled) state = { position: goal, velocity: 0 };
      const x = geometry.firstX + geometry.travel * state.position - width * .56;
      cat.style.transform = `translate3d(${x.toFixed(2)}px,${geometry.imageY.toFixed(2)}px,0)`;
      fill.style.transform = `scaleX(${state.position.toFixed(5)})`;
      stage.dataset.skateReady = "true";
      if (debug) {
        stage.dataset.skateProgress = state.position.toFixed(4);
        stage.dataset.skateSettled = String(settled);
        stage.dataset.skateRenders = String(++renders);
      }
      if (!settled) frame = window.requestAnimationFrame(tick);
      else lastTime = 0;
    }
    function wake() {
      if (!frame && visible && ready && !document.hidden) frame = window.requestAnimationFrame(tick);
    }
    function relayout() { dirty = true; wake(); }
    window.addEventListener("scroll", wake, {passive:true});
    window.addEventListener("resize", relayout, {passive:true});
    window.addEventListener("load", relayout, {once:true});
    document.addEventListener("visibilitychange", () => { lastTime = 0; wake(); });
    reduced.addEventListener("change", wake);
    if (document.fonts) document.fonts.ready.then(relayout);
    if ("ResizeObserver" in window) {
      const observer = new ResizeObserver(relayout);
      observer.observe(stage); observer.observe(document.body);
    }
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(entries => {
        visible = entries[0].isIntersecting;
        lastTime = 0;
        if (visible) relayout();
        else if (frame) { window.cancelAnimationFrame(frame); frame = 0; }
      }, {rootMargin:"100px"}).observe(stage);
    }
    function imageReady() { ready = cat.naturalWidth > 0; relayout(); }
    if (cat.decode) cat.decode().then(imageReady).catch(imageReady);
    else if (cat.complete) imageReady();
    else cat.addEventListener("load", imageReady, {once:true});
  }
  return { advance, routePoints, curvePoint, pathData, mount, dividerGeometry, mountDivider };
});
