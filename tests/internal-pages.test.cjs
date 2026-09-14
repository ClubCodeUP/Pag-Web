const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { staggerDelay, approach, scrollProgress, entryProgress, followScroll, layoutTop, mount } = require('../js/pages-ide.js');
const root = path.resolve(__dirname, '..');
const routes = ['advisories.html', 'projects.html', 'course.html', 'contact.html', 'team.html', 'blog.html', 'Blog/blog_phishing.html', 'Blog/blog_humanchip.html', 'Blog/blog_template.html'];
const source = file => fs.readFileSync(path.join(root, file), 'utf8');

test('all active interior routes have one title and the shared accessible shell', () => {
  routes.forEach(file => {
    const html = source(file);
    assert.equal((html.match(/<h1\b/g) || []).length, 1, file);
    assert.equal((html.match(/<main\b/g) || []).length, 1, file);
    assert.match(html, /class="club-page"/);
    assert.match(html, /pages-ide\.css/);
    assert.match(html, /pages-ide\.js[^>]+defer/);
    assert.match(html, /aria-controls="navbarCollapse"/);
    assert.match(html, /site-header\.css/);
    assert.match(html, /aria-current="page"/);
    assert.doesNotMatch(html, /hero-gaze|hero-atlas|owl-carousel|jquery|href="#"|THESIS:/i);
  });
});

test('local images, scripts, styles, navigation and anchors resolve on every route', () => {
  routes.forEach(file => {
    const html = source(file);
    const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
    assert.equal(new Set(ids).size, ids.length, `duplicate ids in ${file}`);
    for (const match of html.matchAll(/\b(?:src|href)="([^"]+)"/g)) {
      const ref = match[1];
      if (/^(https?:|mailto:|data:)/.test(ref)) continue;
      const [url, fragment] = ref.split('#');
      const target = url ? path.resolve(path.dirname(path.join(root, file)), decodeURIComponent(url.split('?')[0])) : path.join(root, file);
      assert.ok(fs.existsSync(target), `${file}: missing ${ref}`);
      if (fragment && target.endsWith('.html')) assert.ok(source(path.relative(root, target)).includes(`id="${fragment}"`), `${file}: missing fragment ${ref}`);
    }
  });
});

test('the directory reflects the 50 unique members and ten groups in the 2026-2 roster', () => {
  const html = source('team.html');
  const people = [...html.matchAll(/data-member-name="([^"]+)"/g)].map(match => match[1]);
  assert.equal(people.length, 50, 'each person appears once, in their current area');
  assert.equal(new Set(people).size, 50);
  assert.equal((html.match(/data-team-group=/g) || []).length, 10);
  assert.match(html, /Manuel Fidel Serna/);
  assert.match(html, /Foto por compartir/);
  assert.doesNotMatch(html, /src=""/);
  assert.match(html, /class="team-areas"/);
  assert.doesNotMatch(html, /type="search"|team-toolbar|data-team-empty|data-reset-team|<select/);
  assert.equal((html.match(/class="member-portrait__photo"/g) || []).length, 49);
});

test('course and partner catalogs retain their real content', () => {
  const html = source('advisories.html');
  assert.equal((html.match(/data-course=/g) || []).length, 7);
  assert.equal((html.match(/Asesoría gratuita ·/g) || []).length, 4);
  assert.equal((source('course.html').match(/class="alliance-row /g) || []).length, 5);
  ['Mi Profe UP', 'Nuevo videojuego', 'Ayuda a C.cat', 'Bookchase UP'].forEach(title => assert.ok(source('projects.html').includes(title)));
});

test('article URLs retain authors, archive context and sources', () => {
  assert.match(source('Blog/blog_phishing.html'), /Grupo 8 CODE UP/);
  assert.match(source('Blog/blog_phishing.html'), /<section class="sources">/);
  assert.match(source('Blog/blog_humanchip.html'), /Solange Chavez/);
  assert.match(source('Blog/blog_humanchip.html'), /2 de septiembre de 2022/);
  assert.match(source('Blog/blog_template.html'), /name="robots" content="noindex"/);
  assert.match(source('Blog/blog_template.html'), /rel="canonical"/);
});

test('scientific figures reserve their original proportions before lazy loading', () => {
  for (const file of ['Blog/blog_humanchip.html', 'Blog/blog_template.html']) {
    assert.match(source(file), /blog1\.jpg" width="547" height="572"/);
    assert.match(source(file), /blog3\.jpg" width="1062" height="846"/);
  }
});

test('metadata follows case and listing titles; mobile keeps the top active tab line', () => {
  for (const file of ['projects.html','blog.html']) assert.doesNotMatch(source(file), /<div class="page-meta">[\s\S]*?<\/div><h[23]/);
  assert.match(source('css/site-header.css'), /ide-tab\.is-active::after[^}]+top: 0; height: 2px/);
});

test('every interior uses the homepage header markup and its shared stylesheet', () => {
  const header = html => html.match(/<div class="ide-topbar">[\s\S]*?<\/header>/)[0].replaceAll('../','').replaceAll(' is-active','').replaceAll(' aria-current="page"','').replace(/\s+/g,' ').trim();
  const reference=header(source('index.html'));
  routes.forEach(file => assert.equal(header(source(file)),reference,file));
  assert.match(source('index.html'),/site-header\.css/);
  assert.doesNotMatch(source('css/pages-ide.css'), /\.page-header|\.page-tab\b|\.page-menu/);
  assert.match(source('js/pages-ide.js'),/querySelector\('\.ide-menu-toggle'\)/);
});

test('portrait choreography is staggered by row with a bounded delay', () => {
  assert.deepEqual([0,1,2,3,4,5].map(i => staggerDelay(i,5)), [0,55,110,165,180,0]);
  assert.deepEqual([0,1,2,3].map(i => staggerDelay(i,2)), [0,55,0,55]);
  assert.equal(staggerDelay(78,1), 0);
  const js = source('js/pages-ide.js');
  assert.match(js, /animation\.pause/);
  assert.match(js, /animation\.cancel/);
  assert.match(js, /typeof element\.animate/);
  assert.doesNotMatch(js, /matchesMember|team-search|filterTeam/);
});

test('purple and fuchsia accents keep readable contrast over the original navy backgrounds', () => {
  const css = source('css/pages-ide.css');
  const color = name => css.match(new RegExp(`--page-${name}: (#[0-9a-f]{6})`))[1];
  const luminance = hex => {
    const rgb = hex.slice(1).match(/../g).map(value => parseInt(value,16)/255).map(value => value <= .04045 ? value/12.92 : ((value+.055)/1.055)**2.4);
    return rgb[0]*.2126 + rgb[1]*.7152 + rgb[2]*.0722;
  };
  const contrast = (a,b) => (Math.max(a,b)+.05)/(Math.min(a,b)+.05);
  for (const ground of ['bg','raised','deep','chrome']) for (const foreground of ['ink','muted','accent','pink']) {
    assert.ok(contrast(luminance(color(ground)),luminance(color(foreground))) >= 4.5, `${foreground} on ${ground}`);
  }
  assert.equal(color('bg'),'#14172a');
  assert.equal(color('raised'),'#1c2038');
  assert.equal(color('pink'),'#ff67c5');
  assert.doesNotMatch(css,/--page-cyan|#21122f|#321d45|background-blend-mode/);
  assert.match(css,/navy-texture-dark\.webp[^}]+opacity: \.58/);
  assert.match(css,/navy-texture-light\.webp/);
  assert.match(source('blog.html'), /journal-companion/);
});

test('cat scroll smoothing approaches monotonically in both directions without overshoot', () => {
  for (const [start, target] of [[0,1],[1,0],[.8,.2]]) {
    let current = start;
    for (let i = 0; i < 100; i++) {
      const next = approach(current, target, 1 / 60);
      assert.ok(next >= Math.min(current, target) && next <= Math.max(current, target));
      current = next;
    }
    assert.ok(Math.abs(current - target) < .001);
  }
  let sixty = 0, oneTwenty = 0;
  for (let i = 0; i < 30; i++) sixty = approach(sixty, 1, 1 / 60);
  for (let i = 0; i < 60; i++) oneTwenty = approach(oneTwenty, 1, 1 / 120);
  assert.ok(Math.abs(sixty - oneTwenty) < 1e-8, 'motion independent of refresh rate');
  assert.ok(approach(0, 1, 10) < .51, 'long pause does not snap to destination');
});

test('motion has reduced-motion and visibility guards, no repeating idle timer', () => {
  const js = source('js/pages-ide.js');
  assert.match(js, /prefers-reduced-motion/);
  assert.match(js, /visibilitychange/);
  assert.match(js, /if \(moving\) wake\(\)/);
  assert.doesNotMatch(js, /setInterval|setTimeout/);
  assert.match(source('css/pages-ide.css'), /prefers-reduced-motion: reduce/);
});

test('projects explain functions and mechanics, never send visitors to standalone images', () => {
  const html = source('projects.html');
  assert.doesNotMatch(html, /data-view-image|photo-viewer|<dialog|href="img\/projects|fa-expand|Ver imagen|Ampliar/i);
  assert.equal((html.match(/class="project-function"/g) || []).length, 2);
  assert.equal((html.match(/class="project-mechanics"/g) || []).length, 3);
  assert.match(html, /href="#compartir-experiencia"/);
  assert.match(html, /href="#encontrar-referencias"/);
  assert.match(html, /width="661" height="519"/);
  assert.match(html, /width="676" height="457"/);
  assert.match(source('css/pages-ide.css'), /project-feature__copy \{ position: sticky/);
});

test('photo scroll progress is bounded, continuous and reversible at desktop and mobile sizes', () => {
  for (const viewport of [667, 800, 1080]) for (const height of [220, 415, 580]) {
    assert.equal(scrollProgress(viewport + 100, height, viewport), 0);
    assert.equal(scrollProgress(-height - 100, height, viewport), 1);
    const tops = Array.from({length: 51}, (_, index) => viewport - index * (viewport + height) / 50);
    const down = tops.map(top => scrollProgress(top, height, viewport));
    const up = [...tops].reverse().map(top => scrollProgress(top, height, viewport)).reverse();
    assert.deepEqual(down, up);
    down.slice(1).forEach((value, index) => assert.ok(value >= down[index] && value - down[index] < .021));
    assert.equal(entryProgress(viewport + 100, height, viewport), 0);
    assert.equal(entryProgress(0, height, viewport), 1, 'reading position is completely settled');
    const halfway = viewport * .96 - Math.min(height * .9 + 60, viewport * .52) * .5;
    assert.ok(entryProgress(halfway, height, viewport, 40) < entryProgress(halfway, height, viewport));
  }
});

test('scroll scenes use layout coordinates, not their own animated bounding boxes', () => {
  const parent = { offsetTop: 120, offsetParent: null };
  const element = { offsetTop: 45, offsetParent: parent, getBoundingClientRect() { throw Error('animated geometry must not be read'); } };
  assert.equal(layoutTop(element), 165);
  assert.equal(layoutTop(null), 0);
  const js = source('js/pages-ide.js');
  assert.match(js, /if \(needsGeometry\)/);
  assert.match(js, /doc\.fonts\?\.ready\.then\(reflow\)/);
  assert.match(js, /scene\.last === key/);
  assert.match(js, /doc\.addEventListener\('load', reflow, true\)/);
});

test('content scrub follows promptly, reverses mid-flight and is refresh-rate independent', () => {
  let sixty = 0, high = 0;
  for (let i = 0; i < 12; i++) sixty = followScroll(sixty, 1, 1/60);
  for (let i = 0; i < 24; i++) high = followScroll(high, 1, 1/120);
  assert.ok(Math.abs(sixty - high) < 1e-8);
  assert.ok(sixty > .98, 'settled within 200ms, not a delayed autoplay');
  const reversed = followScroll(sixty, 0, 1/60);
  assert.ok(reversed > 0 && reversed < sixty);
  assert.ok(followScroll(0, 1, 10) < .8, 'returning to a tab cannot fast-forward a scene');
});

test('the mounted photo controller reverses, sleeps at rest, cancels when hidden and restores reduced-motion content', () => {
  const queued = new Map(), windowEvents = {}, documentEvents = {};
  let id = 0, time = 0, changePreference;
  const preference = { matches: false, addEventListener(type, fn) { changePreference = fn; } };
  const image = { dataset: {}, style: {} };
  const photoFrame = { offsetTop: 500, offsetHeight: 300, offsetParent: null, querySelector: () => image };
  const win = {
    innerHeight: 800, innerWidth: 1280, scrollY: 0,
    matchMedia: () => preference,
    requestAnimationFrame(fn) { queued.set(++id, fn); return id; },
    cancelAnimationFrame(key) { queued.delete(key); },
    addEventListener(type, fn) { windowEvents[type] = fn; }
  };
  const doc = {
    defaultView: win, hidden: false, body: {},
    querySelector: () => null,
    querySelectorAll(selector) { return selector.startsWith('.learning-intro__image .page-photo') ? [photoFrame] : []; },
    addEventListener(type, fn) { documentEvents[type] = fn; }
  };
  const settle = () => {
    let frames = 0;
    while (queued.size && frames++ < 120) {
      const jobs = [...queued.values()]; queued.clear(); time += 1000 / 60;
      jobs.forEach(fn => fn(time));
    }
    assert.equal(queued.size, 0, 'no idle RAF loop');
    assert.ok(frames < 120);
  };
  mount(doc); settle();
  const initial = image.style.transform;
  assert.notEqual(initial, 'none');
  win.scrollY = 300; windowEvents.scroll(); settle();
  assert.notEqual(image.style.transform, initial);
  win.scrollY = 0; windowEvents.scroll(); settle();
  assert.equal(image.style.transform, initial, 'returning to the same scroll restores the same pose');
  win.scrollY = 200; windowEvents.scroll();
  assert.equal(queued.size, 1);
  doc.hidden = true; documentEvents.visibilitychange();
  assert.equal(queued.size, 0);
  doc.hidden = false; documentEvents.visibilitychange(); settle();
  preference.matches = true; changePreference(); settle();
  assert.equal(image.style.transform, 'none');
  assert.equal(image.style.clipPath, 'none', 'the whole image remains available');
  preference.matches = false; changePreference(); settle();
  assert.notEqual(image.style.transform, 'none');
  photoFrame.offsetTop = 700; windowEvents.resize(); settle();
  assert.ok(image.style.transform.includes('scale('), 'geometry refresh preserves the scene');
});
