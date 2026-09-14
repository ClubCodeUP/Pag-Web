(function () {
  "use strict";
  const stage = document.querySelector("[data-hero-scene]");
  const root = document.getElementById("hero-motion-root");
  const Motion = window.CodeupGazeMotion;
  if (!stage || !root || !Motion) return;

  const SOURCE_WIDTH = 1280, SOURCE_HEIGHT = 720;
  const CROP_X = 400, FRAME_WIDTH = 880;
  const ASSET_WIDTH = 1100, ASSET_HEIGHT = 900;
  const PHRASES = [
    "Bienvenida, comunidad UP", "Aquí crecemos en equipo",
    "May the code be with you", "Hay lugar para tus ideas",
    "El mejor proyecto es hacer equipo", "There's no place like 127.0.0.1",
    "Compartimos código y buenos momentos", "Tu próxima amistad puede empezar aquí",
    "Más que un club, una familia", "Cada Codito cuenta",
    "Celebramos lo que somos", "Unidos por la tecnología y nuestra gente"
  ];
  const phraseEl = document.getElementById("heroPhrase");
  if (phraseEl) phraseEl.textContent = "// " + PHRASES[Math.floor(Math.random() * PHRASES.length)];

  const canvas = document.createElement("canvas");
  canvas.className = "hero-cat-canvas";
  canvas.setAttribute("aria-hidden", "true");
  root.appendChild(canvas);
  const context = canvas.getContext("2d", { alpha: true, desynchronized: true });
  if (!context) return;

  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const mobile = window.matchMedia("(max-width: 767.98px)");
  const video = stage.querySelector("video");
  const motion = Motion.create();
  const frames = new Array(Motion.COUNT);
  const debug = new URLSearchParams(window.location.search).has("gazeDebug");
  let ready = false, visible = true, raf = 0, lastTime = 0;
  let geometry = null, bounds = stage.getBoundingClientRect();
  let needsPaint = true, lastFrame = -1, inDeadZone = false;
  let pendingPointer = null, renderCount = 0;
  let dot = null;

  function canAnimateGaze() {
    return !mobile.matches && !reducedMotion.matches;
  }

  function canUseCustomCursor() {
    return finePointer.matches && canAnimateGaze();
  }

  if (canUseCustomCursor()) {
    dot = document.createElement("div");
    dot.className = "ide-pointer";
    dot.setAttribute("aria-hidden", "true");
    dot.innerHTML = '<span class="ide-pointer__ring"></span><span class="ide-pointer__core"></span>';
    document.body.appendChild(dot);
    stage.classList.add("has-dot");
  }

  function wake() {
    if (raf || !visible || document.hidden || !frames[Motion.NEUTRAL]) return;
    lastTime = 0;
    raf = requestAnimationFrame(tick);
  }

  function measure() {
    bounds = stage.getBoundingClientRect();
    const rect = root.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const cssScale = Math.max(rect.width / SOURCE_WIDTH, rect.height / SOURCE_HEIGHT);
    // Rendering beyond the decoded source adds GPU work, not image detail.
    const ratio = Math.min(window.devicePixelRatio || 1, ASSET_HEIGHT / (SOURCE_HEIGHT * cssScale));
    const width = Math.max(1, Math.round(rect.width * ratio));
    const height = Math.max(1, Math.round(rect.height * ratio));
    const anchor = mobile.matches ? .68 : .5;
    const scale = Math.max(width / SOURCE_WIDTH, height / SOURCE_HEIGHT);
    const sceneX = (width - SOURCE_WIDTH * scale) * anchor;
    geometry = {
      width, height,
      x: sceneX + CROP_X * scale,
      y: (height - SOURCE_HEIGHT * scale) / 2,
      w: FRAME_WIDTH * scale, h: SOURCE_HEIGHT * scale,
      headX: (rect.width - SOURCE_WIDTH * cssScale) * anchor + 940 * cssScale,
      headY: (rect.height - SOURCE_HEIGHT * cssScale) / 2 + 330 * cssScale
    };
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      // Assigning canvas dimensions resets all context settings.
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
    }
    needsPaint = true;
    wake();
  }

  function tick(now) {
    raf = 0;
    if (!visible || document.hidden || !geometry) return;
    const dt = lastTime ? (now - lastTime) / 1000 : 1 / 60;
    lastTime = now;
    const state = motion.step(dt);
    const source = frames[state.frame];
    if (source && (needsPaint || state.frame !== lastFrame)) {
      const g = geometry;
      context.globalAlpha = 1;
      context.globalCompositeOperation = "source-over";
      context.clearRect(0, 0, g.width, g.height);
      context.drawImage(source.image, source.x, source.y, ASSET_WIDTH, ASSET_HEIGHT, g.x, g.y, g.w, g.h);
      lastFrame = state.frame;
      needsPaint = false;
      renderCount++;
      // The same renderer holds the neutral pose; never reveal a different
      // moving cat from the background video at the end of a return.
      canvas.classList.add("is-ready", "is-active");
      if (debug) {
        stage.dataset.gazeFrame = String(state.frame);
        stage.dataset.gazeRenders = String(renderCount);
        stage.dataset.gazeCanvas = g.width + "x" + g.height;
      }
    }
    if (debug) stage.dataset.gazeSettled = String(state.settled);
    if (!state.settled) raf = requestAnimationFrame(tick);
  }

  function follow(event) {
    if (!canAnimateGaze() || !ready || !geometry || event.pointerType === "touch") return;
    const dx = event.clientX - bounds.left - geometry.headX;
    const dy = event.clientY - bounds.top - geometry.headY;
    const radius = Math.max(40, Math.min(80, Math.min(bounds.width, bounds.height) * .09));
    if (Math.hypot(dx, dy) < radius * (inDeadZone ? 1.2 : 1)) {
      inDeadZone = true;
      return;
    }
    inDeadZone = false;
    motion.aim(Math.atan2(dx, -dy));
    wake();
  }

  function leave() {
    pendingPointer = null;
    inDeadZone = false;
    if (dot) dot.classList.remove("is-visible");
    motion.release();
    wake();
  }

  stage.addEventListener("pointermove", (event) => {
    if (!canAnimateGaze() || event.pointerType === "touch") {
      pendingPointer = null;
      return;
    }
    pendingPointer = event;
    if (dot && event.pointerType !== "touch") {
      dot.style.transform = "translate3d(" + event.clientX + "px," + event.clientY + "px,0)";
      dot.classList.add("is-visible");
      const target = event.target.closest("a,button");
      dot.classList.toggle("is-active", !!target && stage.contains(target));
    }
    follow(event);
  }, { passive: true });
  stage.addEventListener("pointerleave", leave);
  stage.addEventListener("pointercancel", leave);
  window.addEventListener("blur", leave);
  window.addEventListener("scroll", () => { bounds = stage.getBoundingClientRect(); }, { passive: true });
  window.addEventListener("resize", measure, { passive: true });
  if ("ResizeObserver" in window) new ResizeObserver(measure).observe(root);
  if (document.fonts) document.fonts.ready.then(measure);

  function suspend() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    lastTime = 0;
    motion.reset();
    needsPaint = true;
    if (dot) dot.classList.remove("is-visible");
    if (video) video.pause();
  }
  function resume() {
    measure();
    if (video && !reducedMotion.matches) video.play().catch(() => {});
  }
  if ("IntersectionObserver" in window) {
    new IntersectionObserver((entries) => {
      visible = entries[0].isIntersecting;
      if (!visible) suspend();
      else if (!document.hidden) resume();
    }, { threshold: 0 }).observe(stage);
  }
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) suspend();
    else if (visible) resume();
  });
  reducedMotion.addEventListener("change", () => {
    motion.reset();
    needsPaint = true;
    if (video && reducedMotion.matches) video.pause();
    else if (video && visible && !document.hidden) video.play().catch(() => {});
    wake();
  });
  measure();

  async function loadSheet(url, count) {
    const image = new Image();
    image.decoding = "async";
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = reject;
      image.src = url;
    });
    if (image.decode) await image.decode();
    // Keep one decoded texture per atlas and select each frame with source
    // coordinates. Creating 96 additional ImageBitmaps delayed interaction
    // by several seconds on hybrid Windows devices without adding detail.
    return Array.from({ length: count }, (_, index) => ({
      image,
      x: (index % 4) * ASSET_WIDTH,
      y: Math.floor(index / 4) * ASSET_HEIGHT
    }));
  }

  async function prepare() {
    // Show the neutral pose first, while the remaining directions decode.
    const returning = await loadSheet("media/cat-return-sheet.webp?v=9", 8);
    returning.forEach((frame, i) => { frames[80 + i] = frame; });
    wake();
    const jobs = [
      ...Array.from({ length: 5 }, (_, i) => ({ url: "media/cat-right-sheet-" + i + ".webp?v=9", count: 16, offset: i * 16 })),
      { url: "media/cat-entry-sheet.webp?v=1", count: 8, offset: 88 }
    ];
    let next = 0;
    async function worker() {
      while (next < jobs.length) {
        const job = jobs[next++];
        const decoded = await loadSheet(job.url, job.count);
        decoded.forEach((frame, i) => { frames[job.offset + i] = frame; });
      }
    }
    // Bound concurrent large decodes to avoid a memory/CPU spike at startup.
    await Promise.all([worker(), worker()]);
    ready = true;
    if (debug) stage.dataset.gazeReady = "96";
    if (pendingPointer) follow(pendingPointer);
  }
  // On phones and other touch-first devices the original film is the base
  // animation. The interactive atlas is desktop-only, so mobile neither
  // follows taps/pointer emulation nor downloads and decodes its 96 frames.
  if (canAnimateGaze()) {
    prepare().catch(() => {
      document.documentElement.classList.add("cat-assets-failed");
      // If directions fail, the already-loaded neutral pose stays visible.
      if (debug) stage.dataset.gazeReady = "failed";
    });
  } else if (debug) {
    stage.dataset.gazeReady = "ambient-only";
  }
})();
