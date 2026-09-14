const test = require("node:test");
const assert = require("node:assert/strict");
const { advance, routePoints, curvePoint, pathData, mount, dividerGeometry, mountDivider } = require("../js/club-flight.js");

test("the straight skate rail, not the story section, sits between members and board", () => {
  const html = require("node:fs").readFileSync(require("node:path").join(__dirname, "../index.html"), "utf8");
  const members = html.indexOf('id="comunidad"');
  const journey = html.indexOf('id="nuestro-camino"');
  const rail = html.indexOf('id="equipo-en-camino"');
  const board = html.indexOf('aria-labelledby="team-title"');
  assert.ok(journey > 0 && journey < members && members < rail && rail < board);
  assert.equal((html.match(/id="flightPath"/g) || []).length, 1);
  assert.ok(html.includes('src="media/cat-skate.webp" width="480" height="400"'));
  assert.deepEqual([...html.matchAll(/ide-flight__note--(\d)/g)].map(m => m[1]), ["1", "2", "3"]);
});

test("the guide has the same time-based response at different refresh rates", () => {
  const positions = [30, 60, 90, 120, 144].map(fps => {
    let state = { position: 80, velocity: 0 };
    for (let i = 0; i < fps; i += 1) state = advance(state, 700, 1 / fps);
    return state.position;
  });
  positions.forEach(position => assert.ok(Math.abs(position - positions[0]) < 1e-8));
});

test("reversing scroll preserves motion and settles without oscillating", () => {
  let state = { position: 100, velocity: 0 };
  for (let i = 0; i < 10; i += 1) state = advance(state, 800, 1 / 60);
  const previous = state.position;
  state = advance(state, 100, 1 / 60);
  assert.ok(Math.abs(state.position - previous) < 50);
  for (let i = 0; i < 120; i += 1) state = advance(state, 100, 1 / 60);
  assert.ok(Math.abs(state.position - 100) < .01);
  assert.ok(Math.abs(state.velocity) < .01);
});

const fixtures = [
  { width: 1110, height: 940, cat: 112, mobile: false, notes: [{left:633, top:20, width:477, height:226}, {left:0, top:334, width:477, height:229}, {left:633, top:651, width:477, height:253}] },
  { width: 930, height: 1066, cat: 100, mobile: false, notes: [{left:539, top:20, width:391, height:278}, {left:0, top:386, width:391, height:278}, {left:539, top:752, width:391, height:278}] },
  { width: 690, height: 1552, cat: 80, mobile: false, notes: [{left:400, top:20, width:290, height:440}, {left:0, top:548, width:290, height:440}, {left:400, top:1076, width:290, height:440}] },
  { width: 345, height: 900, cat: 72, mobile: true, notes: [{left:69, top:20, width:276, height:252}, {left:69, top:320, width:276, height:252}, {left:69, top:620, width:276, height:252}] },
  { width: 290, height: 1126, cat: 60, mobile: true, notes: [{left:58, top:20, width:232, height:330}, {left:58, top:398, width:232, height:312}, {left:58, top:758, width:232, height:340}] },
  // Live measurements after compacting the stories: opposite columns overlap
  // vertically, so the guide must fit a narrower (but still curved) centre lane.
  { compact: true, width: 1110, height: 626, cat: 112, mobile: false, notes: [{left:633, top:16, width:477, height:209}, {left:0, top:193, width:477, height:212}, {left:633, top:373, width:477, height:236}] },
  { compact: true, width: 930, height: 714, cat: 100, mobile: false, notes: [{left:539, top:16, width:391, height:257}, {left:0, top:241, width:391, height:232}, {left:539, top:441, width:391, height:257}] },
  { compact: true, width: 690, height: 1108, cat: 80, mobile: false, notes: [{left:400, top:16, width:290, height:380}, {left:0, top:364, width:290, height:380}, {left:400, top:712, width:290, height:380}] },
  { compact: true, width: 330, height: 829, cat: 72, mobile: true, notes: [{left:66, top:8, width:264, height:261}, {left:66, top:293, width:264, height:238}, {left:66, top:555, width:264, height:258}] },
  // Enlarged mascots retain the compact layout and must clear every story.
  { compact: true, width: 1110, height: 653, cat: 156, mobile: false, notes: [{left:666, top:16, width:444, height:236}, {left:0, top:220, width:444, height:212}, {left:666, top:401, width:444, height:236}] },
  { compact: true, width: 930, height: 695, cat: 136, mobile: false, notes: [{left:558, top:16, width:372, height:250}, {left:0, top:234, width:372, height:226}, {left:558, top:428, width:372, height:250}] },
  { compact: true, width: 690, height: 1069, cat: 104, mobile: false, notes: [{left:421, top:16, width:269, height:367}, {left:0, top:351, width:269, height:367}, {left:421, top:686, width:269, height:367}] },
  { compact: true, width: 330, height: 871, cat: 88, mobile: true, notes: [{left:86, top:8, width:244, height:280}, {left:86, top:312, width:244, height:238}, {left:86, top:575, width:244, height:280}] },
  { compact: true, width: 275, height: 1050, cat: 80, mobile: true, notes: [{left:77, top:8, width:198, height:348}, {left:77, top:380, width:198, height:326}, {left:77, top:730, width:198, height:304}] }
];

test("responsive routes advance continuously and keep the image clear of the notes", () => {
  fixtures.forEach(f => {
    const points = routePoints(f.width, f.height, f.notes, f.cat, f.mobile);
    assert.ok(pathData(points).startsWith("M "));
    for (let i = 1; i < points.length; i += 1) {
      const a = points[i - 1], b = points[i];
      assert.ok(b.y > a.y, `backtracking at width ${f.width}`);
      // Cubics share their endpoint slope and keep y monotone for scrubbing.
      for (let j = 0; j <= 100; j += 1) {
        const t = j / 100;
        const { x, y } = curvePoint(a, b, t);
        // Include both banks, rotating the whole image about the wheel contact.
        const maxTilt = 5;
        for (const degrees of [-maxTilt, 0, maxTilt]) {
          const angle = degrees * Math.PI / 180;
          const corners = [[-.56, -.94], [.44, -.94], [-.56, .06], [.44, .06]].map(([dx,dy]) => {
            dx *= f.cat; dy *= f.cat * 5/6;
            return {x:x + dx*Math.cos(angle)-dy*Math.sin(angle),y:y + dx*Math.sin(angle)+dy*Math.cos(angle)};
          });
          const left = Math.min(...corners.map(c=>c.x)), right = Math.max(...corners.map(c=>c.x));
          const top = Math.min(...corners.map(c=>c.y)), bottom = Math.max(...corners.map(c=>c.y));
          if (degrees === 0) assert.ok(left >= -13, "guide remains inside the container's 15px viewport gutter");
          f.notes.forEach(note => {
            const overlapsY = bottom > note.top && top < note.top + note.height;
            if (overlapsY) assert.ok(right < note.left || left > note.left + note.width, `overlap at width ${f.width}: ${x},${y}, bank ${degrees}`);
          });
        }
      }
    }
  });
});

test("the story stroke stays curved with continuous tangents, not a straight fallback", () => {
  for (const f of fixtures.filter(f=>!f.mobile)) {
    const points = routePoints(f.width, f.height, f.notes, f.cat, false);
    assert.ok(Math.max(...points.map(p=>p.x)) - Math.min(...points.map(p=>p.x)) > (f.compact ? 8 : 40));
    assert.ok(points.length <= 7, "no staircase of tight control points");
    for (let i=1;i<points.length-1;i++) {
      const before = curvePoint(points[i-1],points[i],1-.00001);
      const after = curvePoint(points[i],points[i+1],.00001);
      const left = (points[i].x-before.x)/(points[i].y-before.y);
      const right = (after.x-points[i].x)/(after.y-points[i].y);
      assert.ok(Math.abs(left-right)<.001, "shared tangent is continuous");
    }
  }
});

test("horizontal rail geometry keeps the wheel at a constant height and inside bounds", () => {
  for (const [width,height,cat] of [[1110,148,128],[690,148,128],[345,112,96],[290,112,96],[1110,184,176],[690,184,176],[330,144,128],[275,144,128]]) {
    const g = dividerGeometry(width,height,cat);
    assert.ok(g.firstX-cat*.56>=0);
    assert.ok(g.firstX+g.travel+cat*.44<=width);
    assert.ok(g.imageY>=0);
    assert.ok(Math.abs(g.imageY+cat*5/6*.94-g.wheelY)<.000001);
  }
});

test("the controller stops drawing at rest and honors reduced motion", () => {
  const previousWindow = global.window;
  const queued = new Map(), events = new Map();
  let counter = 0, clock = 0, measureCount = 0;
  const preference = { matches: false, addEventListener: (_, fn) => events.set("motion", fn) };
  const img = { complete: true, naturalWidth: 480 };
  const cat = { offsetWidth: 156, offsetHeight: 130, style: {}, querySelector: () => img };
  const path = { style: {}, setAttribute() {}, getTotalLength: () => 830, getPointAtLength: d => ({x:80,y:85+d}) };
  const inert = { setAttribute() {} };
  const stage = {
    dataset: {},
    getBoundingClientRect: () => { measureCount += 1; return {width:1110,height:1552,top:200-window.scrollY}; },
    querySelector: selector => selector.includes("cat") ? cat : selector.includes("trail") ? path : inert,
    querySelectorAll: () => fixtures[0].notes.map(n=>({offsetLeft:n.left,offsetTop:n.top,offsetWidth:n.width,offsetHeight:n.height}))
  };
  const document = { hidden: false, querySelector: () => stage, addEventListener: (_, fn) => events.set("visibility", fn) };
  global.window = {
    scrollY: 0, innerWidth: 1280, innerHeight: 800, location: {search:"?flightDebug=1"},
    matchMedia: () => preference,
    addEventListener: (name, fn) => events.set(name, fn),
    requestAnimationFrame: fn => { queued.set(++counter, fn); return counter; }
  };
  const flush = () => {
    for (let i = 0; queued.size && i < 240; i += 1) {
      const callbacks = [...queued.values()]; queued.clear(); clock += 1000/60;
      callbacks.forEach(fn => fn(clock));
    }
    assert.equal(queued.size, 0, "no animation frame is left running at rest");
  };
  try {
    mount(document); flush();
    assert.equal(stage.dataset.flightSettled, "true");
    window.scrollY = 400; events.get("scroll")(); flush();
    assert.equal(Number(stage.dataset.flightY), 648);
    assert.equal(measureCount, 1, "scrolling reuses measured geometry");
    window.scrollY = 0; events.get("scroll")(); flush();
    assert.equal(Number(stage.dataset.flightY), 248);
    preference.matches = true; events.get("motion")(); flush();
    assert.equal(Number(stage.dataset.flightY), 85);
    assert.equal(path.style.strokeDashoffset, "0");
    window.scrollY = 500; events.get("scroll")(); flush();
    assert.equal(Number(stage.dataset.flightY), 85, "reduced-motion guide stays still");
    document.hidden = true; events.get("scroll")();
    assert.equal(queued.size, 0, "hidden documents do not draw");
  } finally { global.window = previousWindow; }
});
