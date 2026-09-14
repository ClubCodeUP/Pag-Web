const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const html = readFileSync(join(__dirname, "../index.html"), "utf8");
const css = readFileSync(join(__dirname, "../css/home-ide.css"), "utf8");
const gaze = readFileSync(join(__dirname, "../js/hero-gaze.js"), "utf8");

test("the hero window has decorative macOS chrome without dismissing its content", () => {
  assert.match(html, /class="ide-window-controls" aria-hidden="true"/);
  for (const control of ["close", "minimize", "zoom"]) {
    assert.equal((html.match(new RegExp(`class="ide-window-control--${control}"`, "g")) || []).length, 1);
  }
  assert.match(html, /class="ide-file-panel__filename">codeup \/ inicio.tsx<\/span>/);
});

test("closing copy stays whole instead of splitting or resizing as it is typed", () => {
  assert.match(html, /<h2 id="join-title">Tu lugar en la familia empieza aquí\.<\/h2>/);
  assert.match(html, /<code class="ide-command__text">Siempre hay espacio para alguien más\.<\/code>/);
  assert.match(html, /data-copy="Siempre hay espacio para alguien más\."/);
  assert.doesNotMatch(html, /data-anim="part"|data-typewriter/);
});

test("the primary hero action opens the team directory instead of looping within home", () => {
  assert.match(html, /class="ide-run-btn" href="team\.html"/);
  assert.match(html, /> conoce-a-la-familia<span class="ide-caret"/);
  assert.doesNotMatch(html, /class="ide-run-btn" href="#conocenos"/);
});

test("mobile hero keeps the full cat below the copy and never enables pointer tracking", () => {
  assert.match(css, /@media \(max-width: 767\.98px\)[\s\S]*?\.ide-hero \{ min-height: auto;/);
  assert.match(css, /\.ide-hero__visual-space \{ min-height: clamp\(350px, 105vw, 560px\); \}/);
  assert.match(css, /\.hero-environment \{[\s\S]*?inset: auto 0 0; height: clamp\(350px, 105vw, 560px\);/);
  assert.match(css, /\.hero-environment img, \.hero-environment video \{ object-position: right center; \}/);
  assert.match(css, /\.hero-motion-root \{ display: none; \}/);
  assert.match(gaze, /return finePointer\.matches && !mobile\.matches && !reducedMotion\.matches;/);
  assert.match(gaze, /if \(!canTrackPointer\(\)\) \{\s*pendingPointer = null;\s*return;/);
  assert.match(gaze, /if \(canTrackPointer\(\)\) \{\s*prepare\(\)/);
});
