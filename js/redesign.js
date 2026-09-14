(function () {
  "use strict";

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const environmentVideo = document.querySelector(".hero-environment video");
  if (environmentVideo) {
    if (reducedMotion.matches) environmentVideo.pause();
    else environmentVideo.play().catch(function () {});

    // The clip's own lighting dims across its full length — the windows and
    // the fountain genuinely go dark by the last second, it isn't just a
    // mismatched final frame. A ~0.3s crossfade back to the lit poster made
    // that read as the lights slamming back on. Starting the fade earlier,
    // matched to a slow CSS transition (see .hero-environment__motion in
    // home-ide.css), spreads the "lights returning" over roughly the pace
    // the rest of the clip changes at, instead of snapping.
    const LOOP_FADE_WINDOW = 1.3;
    let lastVideoTime = 0;
    let isFadingLoop = false;
    environmentVideo.addEventListener("timeupdate", function () {
      const duration = environmentVideo.duration || 0;
      const time = environmentVideo.currentTime;
      if (duration && duration - time < LOOP_FADE_WINDOW && !isFadingLoop) {
        isFadingLoop = true;
        environmentVideo.classList.add("is-looping");
      } else if (isFadingLoop && time < lastVideoTime - 0.5) {
        setTimeout(function () {
          environmentVideo.classList.remove("is-looping");
          isFadingLoop = false;
        }, 80);
      }
      lastVideoTime = time;
    });
  }

  const backToTop = document.querySelector(".back-to-top");
  if (backToTop) {
    const updateBackToTop = function () {
      backToTop.classList.toggle("is-visible", window.scrollY > 520);
    };
    window.addEventListener("scroll", updateBackToTop, { passive: true });
    updateBackToTop();
  }

  document.querySelectorAll("[data-copy]").forEach(function (button) {
    button.addEventListener("click", function () {
      const text = button.getAttribute("data-copy") || "";
      if (!navigator.clipboard) return;
      navigator.clipboard.writeText(text).then(function () {
        const icon = button.querySelector("i");
        button.classList.add("is-copied");
        if (icon) icon.className = "fa fa-check";
        setTimeout(function () {
          button.classList.remove("is-copied");
          if (icon) icon.className = "fa fa-copy";
        }, 1800);
      }).catch(function () {});
    });
  });

  // Scroll progress bar: a thin build/loading strip that fills as the page
  // is read.
  // Layout-derived numbers are cached and only re-read when the layout can
  // actually have changed. Reading scrollHeight / clientWidth / offsetTop
  // inside the animation loop forces a synchronous reflow on every frame,
  // which is what makes the hero canvas stutter while scrolling.
  let layoutStale = true;
  let scrollableHeight = 0;

  const progressBar = document.querySelector(".ide-scroll-progress span");
  const updateProgress = function () {
    if (!progressBar) return;
    const ratio = scrollableHeight > 0 ? window.scrollY / scrollableHeight : 0;
    progressBar.style.transform = "scaleX(" + Math.min(1, Math.max(0, ratio)) + ")";
  };

  // Count-up numbers: stats read as computed output rather than static text.
  const countEls = document.querySelectorAll("[data-count]");
  const animateCount = function (element) {
    const target = parseInt(element.getAttribute("data-count"), 10) || 0;
    if (reducedMotion.matches) {
      element.textContent = target;
      return;
    }
    const duration = 900;
    const start = performance.now();
    const step = function (now) {
      const elapsed = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - elapsed, 3);
      element.textContent = Math.round(target * eased);
      if (elapsed < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  if (countEls.length && "IntersectionObserver" in window) {
    const countObserver = new IntersectionObserver(function (entries, observer) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          animateCount(entry.target);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.6 });
    countEls.forEach(function (element) { countObserver.observe(element); });
  }

  // Typewriter: the join command types itself out like a real terminal line.
  const typewriterEl = document.querySelector("[data-typewriter]");
  if (typewriterEl && "IntersectionObserver" in window) {
    const fullText = typewriterEl.textContent;
    const runTypewriter = function () {
      if (reducedMotion.matches) return;
      typewriterEl.textContent = "";
      let index = 0;
      const interval = setInterval(function () {
        index += 1;
        typewriterEl.textContent = fullText.slice(0, index);
        if (index >= fullText.length) clearInterval(interval);
      }, 32);
    };
    const typeObserver = new IntersectionObserver(function (entries, observer) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          runTypewriter();
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.6 });
    typeObserver.observe(typewriterEl);
  }

  // ---- Continuous scroll-scrub system --------------------------------
  // Every [data-reveal] / [data-scrub-img] / [data-parallax] element reads
  // its state straight from the current scroll position. Nothing is a
  // one-shot "entrance" — scroll up and it plays back exactly in reverse.
  //
  // The deploy feel: targets are recomputed from raw scroll every frame,
  // but the values actually written to the DOM chase those targets with a
  // lerp instead of snapping to them. That's the one thing ported from the
  // reference — not its colors, its motion timing: a slight, constant
  // "catching up" quality instead of a rigid 1:1 scroll-to-pixel mapping.
  const reveals = Array.from(document.querySelectorAll("[data-reveal]"));
  const scrubImgs = Array.from(document.querySelectorAll("[data-scrub-img]"));
  const parallaxEls = Array.from(document.querySelectorAll("[data-parallax]"));
  const heroEl = document.querySelector(".ide-hero");
  // Card stack: each card is sticky at the same offset, so the next one rises
  // and covers it. The covered card darkens toward 50% black — the reference
  // drives its overlay with exactly `opacity: progress * 0.5`.
  const stackCards = Array.from(document.querySelectorAll("[data-stack-card]"));
  const stackCover = new Map();

  // Group siblings so a row of cards cascades instead of arriving as one
  // flat block — each later sibling needs a little more scroll to catch up.
  const staggerOffset = new Map();
  const revealState = new Map();
  const splitWords = new Map();
  (function setupReveals() {
    const seen = new Map();
    reveals.forEach(function (element) {
      const parent = element.parentElement;
      const index = seen.get(parent) || 0;
      staggerOffset.set(element, Math.min(index, 5) * 46);
      seen.set(parent, index + 1);
      revealState.set(element, { current: 0, target: 0 });
      element.style.setProperty("--p", reducedMotion.matches ? 1 : 0);

      if (element.hasAttribute("data-split-words")) {
        const words = [];
        Array.from(element.childNodes).forEach(function (node) {
          if (node.nodeType !== Node.TEXT_NODE) return;
          const frag = document.createDocumentFragment();
          node.textContent.split(/(\s+)/).forEach(function (part) {
            if (part === "") return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
            const span = document.createElement("span");
            span.className = "ide-word";
            span.textContent = part;
            words.push(span);
            frag.appendChild(span);
          });
          element.replaceChild(frag, node);
        });
        splitWords.set(element, words);
      }
    });
  })();

  // ---- Motion vocabulary read out of the reference build --------------
  // These are not guesses at what the reference "feels like": they are the
  // eases, offsets, staggers and trigger windows lifted from its own
  // scroll timelines (every one of them scrub-linked, same as ours).
  //   words      x: step * (i - (n-1)/2) -> 0            power3.out
  //   expand     width 50rem -> 100%, scale .8 -> 1      power3.out/inOut
  //   counter-x  image inside counter-slides xPercent    power3.inOut
  //   slide-left xPercent -101 -> 0, stagger .2          power3.inOut
  //   pop        scale 0 -> 1                            elastic.out(1.5, 2)
  //   rise       opacity 0 -> 1, y 50 -> 0               power3.out
  const clamp01 = function (v) { return v < 0 ? 0 : v > 1 ? 1 : v; };
  const easing = {
    power2In: function (t) { return t * t; },
    power2InOut: function (t) { return t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; },
    power3Out: function (t) { return 1 - Math.pow(1 - t, 3); },
    power3InOut: function (t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; },
    elasticOut: function (t) {
      if (t <= 0) return 0;
      if (t >= 1) return 1;
      return Math.pow(2, -10 * t) * Math.sin((t * 10 - .75) * (2 * Math.PI / 3)) + 1;
    }
  };

  // Line grouping for the word converge: the reference fans each LINE around
  // its own centre, so words in different lines don't share one spread.
  const lineCache = new Map();
  const wordLines = function (element, words) {
    const cached = lineCache.get(element);
    if (cached) return cached;
    const lines = [];
    let currentTop = null;
    words.forEach(function (word) {
      const top = word.offsetTop;
      if (currentTop === null || Math.abs(top - currentTop) > 4) {
        lines.push([]);
        currentTop = top;
      }
      lines[lines.length - 1].push(word);
    });
    lineCache.set(element, lines);
    return lines;
  };

  const applyWordConverge = function (element, words, p) {
    const eased = easing.power3Out(clamp01(p));
    wordLines(element, words).forEach(function (line) {
      const n = line.length;
      const step = Math.min(64, 320 / Math.max(1, n));
      line.forEach(function (word, i) {
        const fan = step * (i - (n - 1) / 2) * (1 - eased);
        word.style.opacity = eased.toFixed(3);
        word.style.transform = "translate3d(" + fan.toFixed(1) + "px, 0, 0)";
      });
    });
  };

  // A scene is one trigger window ("top 85%" -> "top 15%" in the reference's
  // own notation); the elements inside it each claim a slice of that window,
  // which is how their timelines sequence one move after another.
  const scenes = Array.from(document.querySelectorAll("[data-scroll-scene]")).map(function (scene) {
    const spec = scene.getAttribute("data-scroll-scene") || "85,15";
    // "pin": the section is taller than the viewport and holds a sticky
    // stage, so progress is how far through that extra height you've come —
    // the scroll distance *is* the timeline, which is what lets a whole
    // composition arrive in sequence instead of sliding past as a block.
    const pinned = spec === "pin";
    const window_ = pinned ? [85, 15] : spec.split(",").map(Number);
    const items = Array.from(scene.querySelectorAll("[data-anim]")).map(function (el) {
      const at = (el.getAttribute("data-anim-at") || "0,1").split(",").map(Number);
      const move = el.getAttribute("data-anim");
      let words = null;
      if (move === "part") {
        // Their headline halves: one word slides left, the other right, out
        // from a shared centre (power2.inOut).
        const text = el.textContent.trim();
        const cut = text.indexOf(" ", Math.floor(text.length / 2) - 6);
        const left = document.createElement("span");
        const right = document.createElement("span");
        left.className = "ide-part ide-part--left";
        right.className = "ide-part ide-part--right";
        left.textContent = cut === -1 ? text : text.slice(0, cut);
        right.textContent = cut === -1 ? "" : text.slice(cut + 1);
        el.textContent = "";
        el.appendChild(left);
        el.appendChild(right);
        words = [left, right];
      }
      if (move === "converge") {
        words = [];
        Array.from(el.childNodes).forEach(function (node) {
          if (node.nodeType !== Node.TEXT_NODE) return;
          const frag = document.createDocumentFragment();
          node.textContent.split(/(\s+)/).forEach(function (part) {
            if (part === "") return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
            const span = document.createElement("span");
            span.className = "ide-word";
            span.textContent = part;
            words.push(span);
            frag.appendChild(span);
          });
          el.replaceChild(frag, node);
        });
      }
      return {
        el: el,
        move: move,
        from: at[0],
        to: at[1],
        index: Number(el.getAttribute("data-anim-i") || 0),
        words: words
      };
    });
    return { el: scene, pinned: pinned, lead: Number(scene.getAttribute("data-scroll-lead") || 0), start: window_[0] / 100, end: window_[1] / 100, items: items, current: 0, target: 0 };
  });

  const applyScene = function (scene, p) {
    scene.items.forEach(function (item) {
      // stagger .2 of the reference, expressed as a slice of the window —
      // small enough that the last-staggered item still completes inside it
      const offset = item.index * 0.09;
      const span = Math.max(0.001, item.to - item.from);
      const local = clamp01((p - item.from - offset) / span);
      const el = item.el;
      switch (item.move) {
        case "part": {
          const e = easing.power2InOut(local);
          if (item.words) {
            item.words[0].style.transform = "translate3d(" + (-e * 6).toFixed(2) + "%, 0, 0)";
            item.words[1].style.transform = "translate3d(" + (e * 6).toFixed(2) + "%, 0, 0)";
          }
          break;
        }
        case "converge":
          applyWordConverge(el, item.words, local);
          break;
        case "expand": {
          // Same read as the reference's width 50rem -> 100%, but expressed
          // as a clip inset so it never triggers layout mid-scroll.
          const inE = easing.power3Out(clamp01(local / 0.35));
          const wideE = easing.power3InOut(clamp01((local - 0.25) / 0.75));
          const inset = (23 * (1 - wideE)).toFixed(2);
          el.style.opacity = inE.toFixed(3);
          el.style.clipPath = "inset(0% " + inset + "% 0% " + inset + "% round var(--about-round))";
          el.style.transform = "scale(" + (0.92 + 0.08 * inE).toFixed(3) + ")";
          break;
        }
        case "counter-x": {
          const e = easing.power3InOut(local);
          el.style.transform = "translate3d(" + (-6 * (1 - e)).toFixed(2) + "%, 0, 0) scale(1.06)";
          break;
        }
        case "dissolve": {
          // The reference's photo hand-off: the top image shrinks and fades
          // out (power2.in) to uncover the one behind it.
          const e = easing.power2In(local);
          el.style.opacity = (1 - e).toFixed(3);
          el.style.transform = "translate3d(0, " + (20 * e).toFixed(1) + "px, 0) scale(" + (1 - 0.5 * e).toFixed(3) + ")";
          break;
        }
        case "tint": {
          // backgroundColor white -> accent, stagger .2, ease none.
          el.style.setProperty("--tint", local.toFixed(3));
          break;
        }
        case "slide-left": {
          const e = easing.power3InOut(local);
          el.style.transform = "translate3d(" + (-101 * (1 - e)).toFixed(2) + "%, 0, 0)";
          el.style.opacity = local > 0 ? "1" : "0";
          break;
        }
        case "pop": {
          const e = easing.elasticOut(local);
          el.style.opacity = clamp01(local * 4).toFixed(3);
          el.style.transform = "scale(" + e.toFixed(3) + ")";
          break;
        }
        case "rise": {
          const e = easing.power3Out(local);
          el.style.opacity = e.toFixed(3);
          el.style.transform = "translate3d(0, " + (50 * (1 - e)).toFixed(1) + "px, 0)";
          break;
        }
      }
    });
  };

  const computeTargets = function () {
    const vh = window.innerHeight;
    if (layoutStale) {
      scrollableHeight = document.documentElement.scrollHeight - vh;
      lineCache.clear();
      layoutStale = false;
    }
    updateProgress();

    // Every scene's scroll position is read here, in the same read-only pass
    // as the reveals — never interleaved with the style writes below.
    scenes.forEach(function (scene) { scene.target = sceneProgress(scene); });

    reveals.forEach(function (element) {
      const rect = element.getBoundingClientRect();
      const offset = staggerOffset.get(element) || 0;
      const start = vh * 0.92;
      const end = vh * 0.6 - offset;
      const p = (start - rect.top) / (start - end);
      revealState.get(element).target = Math.min(1, Math.max(0, p));
    });

    stackCards.forEach(function (card, i) {
      const next = stackCards[i + 1];
      if (!next) { stackCover.set(card, 0); return; }
      const r = card.getBoundingClientRect();
      const nr = next.getBoundingClientRect();
      // 0 when the next card sits fully below this one, 1 once it has risen
      // to cover it completely.
      stackCover.set(card, Math.min(1, Math.max(0, (r.top + r.height - nr.top) / r.height)));
    });

    scrubImgs.forEach(function (img) {
      const rect = img.getBoundingClientRect();
      const vhCenter = vh / 2;
      const elCenter = rect.top + rect.height / 2;
      const dist = Math.min(1, Math.abs(elCenter - vhCenter) / vhCenter);
      img.style.setProperty("--zoom", (1 + dist * 0.12).toFixed(3));
    });

    if (heroEl && parallaxEls.length) {
      const rect = heroEl.getBoundingClientRect();
      if (rect.bottom > 0 && rect.top < vh) {
        const offset = Math.max(-40, Math.min(40, rect.top * 0.12));
        parallaxEls.forEach(function (element) {
          element.style.transform = "translate3d(0, " + offset.toFixed(1) + "px, 0)";
        });
      }
    }
  };

  // "top 85%" -> "top 15%" in the reference's notation: progress runs from
  // the scene's top crossing 85% of the viewport to it crossing 15%.
  const sceneProgress = function (scene) {
    const rect = scene.el.getBoundingClientRect();
    const vh = window.innerHeight;
    if (scene.pinned) {
      const travel = rect.height - vh;
      // Start the opted-in about scene while it enters, not after a blank screen.
      const lead = vh * scene.lead;
      return travel > 0 ? Math.min(1, Math.max(0, (lead - rect.top) / (travel + lead))) : 0;
    }
    const from = vh * scene.start;
    const to = vh * scene.end;
    return Math.min(1, Math.max(0, (from - rect.top) / (from - to)));
  };

  const lerp = function (current, target, factor) { return current + (target - current) * factor; };

  // The loop runs every frame while anything is still catching up (that's
  // the whole point — the lerp needs frames after the scroll event stops),
  // but goes idle the instant everything has settled so a motionless page
  // doesn't keep reading layout 60 times a second forever.
  let dirty = true;
  window.addEventListener("scroll", function () { dirty = true; }, { passive: true });
  window.addEventListener("resize", function () { dirty = true; layoutStale = true; }, { passive: true });
  window.addEventListener("load", function () { dirty = true; layoutStale = true; });

  const tick = function () {
    if (dirty) {
      computeTargets();
      let settled = true;

      reveals.forEach(function (element) {
        const state = revealState.get(element);
        state.current = reducedMotion.matches ? state.target : lerp(state.current, state.target, 0.1);
        if (Math.abs(state.current - state.target) < 0.001) state.current = state.target;
        else settled = false;
        element.style.setProperty("--p", state.current.toFixed(3));

        const words = splitWords.get(element);
        if (words && words.length) {
          applyWordConverge(element, words, reducedMotion.matches ? 1 : state.current);
        }
      });

      scenes.forEach(function (scene) {
        const target = scene.target;
        const next = reducedMotion.matches ? target : lerp(scene.current, target, 0.1);
        if (Math.abs(next - scene.current) > 0.0002) settled = false;
        scene.current = next;
        applyScene(scene, next);
      });

      stackCards.forEach(function (card) {
        const darken = card.querySelector(".ide-stack__darken");
        if (darken) darken.style.opacity = ((stackCover.get(card) || 0) * 0.5).toFixed(3);
      });

      if (settled) dirty = false;
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
})();
