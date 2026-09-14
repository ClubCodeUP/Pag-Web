const test = require("node:test");
const assert = require("node:assert/strict");
const { mountDivider } = require("../js/club-flight.js");

test("the loading skate moves only horizontally and smoothly reverses with scroll", () => {
  const previousWindow = global.window;
  const queued = new Map(), events = new Map();
  let frameId = 0, clock = 0, measurements = 0;
  const preference = { matches: false, addEventListener: (_, fn) => events.set("motion", fn) };
  const cat = { complete: true, naturalWidth: 480, offsetWidth: 128, style: {} };
  const fill = {style:{}}, track = {style:{}};
  const stage = {
    dataset: {},
    getBoundingClientRect: () => { measurements++; return {width:1110,height:148,top:1000-window.scrollY}; },
    querySelector: s => s.endsWith("__cat") ? cat : s.endsWith("__fill") ? fill : track
  };
  const document = { hidden: false, querySelector: () => stage, addEventListener: (name, fn) => events.set(name, fn) };
  global.window = {
    scrollY: 0, innerHeight: 800, location: {search:"?flightDebug=1"},
    matchMedia: () => preference,
    addEventListener: (name, fn) => events.set(name, fn),
    requestAnimationFrame: fn => { queued.set(++frameId, fn); return frameId; }
  };
  const step = () => {
    const callbacks = [...queued.values()]; queued.clear(); clock += 1000/60;
    callbacks.forEach(fn=>fn(clock));
  };
  const flush = () => {
    for (let i=0; queued.size && i<240; i++) step();
    assert.equal(queued.size,0,"the rail stops its own frame loop when settled");
  };
  const position = () => cat.style.transform.match(/translate3d\(([-\d.]+)px,([-\d.]+)px,0\)/).slice(1).map(Number);
  try {
    mountDivider(document); flush();
    const [startX, fixedY] = position();
    assert.equal(startX,4);
    window.scrollY = 700; events.get("scroll")(); step();
    assert.ok(Number(stage.dataset.skateProgress) > 0 && Number(stage.dataset.skateProgress) < .05,"scroll does not teleport the skate");
    flush();
    const [forwardX, forwardY] = position();
    assert.ok(forwardX > startX);
    assert.equal(forwardY,fixedY);
    assert.ok(Math.abs(Number(stage.dataset.skateProgress)-.4714)<.0001);
    window.scrollY = 500; events.get("scroll")(); flush();
    const [backX, backY] = position();
    assert.ok(backX > startX && backX < forwardX);
    assert.equal(backY,fixedY);
    assert.equal(measurements,1,"scrolling reuses cached rail geometry");
    assert.equal(stage.dataset.skateSettled,"true");
    preference.matches = true; events.get("motion")(); flush();
    assert.equal(position()[0],startX);
    window.scrollY = 1000; events.get("scroll")(); flush();
    assert.equal(position()[0],startX,"reduced-motion preference keeps the skate still");
    document.hidden = true; events.get("scroll")();
    assert.equal(queued.size,0);
  } finally { global.window = previousWindow; }
});
