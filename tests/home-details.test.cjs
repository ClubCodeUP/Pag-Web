const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const html = readFileSync(join(__dirname, "../index.html"), "utf8");

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
