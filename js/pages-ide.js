(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (typeof document !== 'undefined') api.mount(document);
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const clamp = value => Math.max(0, Math.min(1, value));
  const approach = (current, target, elapsed) => current + (target - current) * (1 - Math.exp(-Math.min(elapsed, .064) * 11));
  const staggerDelay = (index, columns) => Math.min((index % Math.max(1, columns)) * 55, 180);
  const smooth = value => { const p = clamp(value); return p * p * (3 - 2 * p); };
  const scrollProgress = (top, height, viewport) => clamp((viewport - top) / Math.max(1, viewport + height));
  const entryProgress = (top, height, viewport, delay = 0) => smooth((viewport * .96 - top - delay) / Math.max(1, Math.min(height * .9 + 60, viewport * .52)));
  const followScroll = (current, target, elapsed) => current + (target - current) * (1 - Math.exp(-Math.min(elapsed, .064) * 22));

  // Stable layout coordinates: animated transforms must never feed back into measurement.
  const layoutTop = element => {
    let top = 0;
    for (let node = element; node; node = node.offsetParent) top += node.offsetTop;
    return top;
  };

  function mount(doc) {
    const win = doc.defaultView;
    const reduced = win.matchMedia('(prefers-reduced-motion: reduce)');
    const animations = new Map();
    const play = (element, keyframes, options = {}) => {
      if (!element || reduced.matches || doc.hidden || typeof element.animate !== 'function') return;
      animations.get(element)?.cancel();
      const animation = element.animate(keyframes, { duration: 620, easing: 'cubic-bezier(.16,1,.3,1)', ...options });
      animations.set(element, animation);
      const release = () => { if (animations.get(element) === animation) animations.delete(element); };
      animation.onfinish = release;
      animation.oncancel = release;
    };
    const menu = doc.querySelector('.ide-menu-toggle');
    const tabs = doc.querySelector('.ide-tabs-wrap');
    if (menu && tabs) {
      doc.body.classList.add('menu-ready');
      const toggleMenu = open => {
        tabs.classList.toggle('show', open);
        menu.setAttribute('aria-expanded', String(open));
        menu.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
      };
      menu.addEventListener('click', () => toggleMenu(menu.getAttribute('aria-expanded') !== 'true'));
      doc.addEventListener('keydown', event => {
        if (event.key === 'Escape' && menu.getAttribute('aria-expanded') === 'true') {
          toggleMenu(false);
          menu.focus();
        }
      });
      tabs.addEventListener('click', event => { if (event.target.closest('a')) toggleMenu(false); });
    }

    // Only the page title greets once. Content scenes below are reversible scroll motion.
    play(doc.querySelector('h1'), [{ opacity: .6, transform: 'translateY(12px)' }, { opacity: 1, transform: 'none' }], { duration: 540 });

    const scenes = [];
    const addScene = (element, kind, anchor = element, order = 0) => {
      if (!element) return;
      element.dataset.scrollMotion = kind;
      scenes.push({ element, anchor, kind, order, top: 0, height: 0, delay: 0, current: null, target: 0, last: null });
    };
    const photos = '.learning-intro__image .page-photo, .alliance-intro > .page-photo, .team-panorama, .join-photos > figure, .journal-feature__image, .learning-end .page-photo, .article-cover:not(.article-cover--science)';
    doc.querySelectorAll(photos).forEach(frame => addScene(frame.querySelector('img'), 'photo', frame));
    doc.querySelectorAll('.journal-archive > a, .article-cover--science').forEach(frame => addScene(frame.querySelector('img'), 'artifact', frame));
    doc.querySelectorAll('.journal-feature > div, .journal-archive > div').forEach(element => addScene(element, 'copy', element.parentElement));
    doc.querySelectorAll('.project-function').forEach(element => addScene(element, 'case'));
    doc.querySelectorAll('.project-game__image').forEach((element, index) => addScene(element, index % 2 ? 'from-right' : 'from-left'));
    doc.querySelectorAll('.member-portrait__photo').forEach(element => {
      const member = element.closest('.member-portrait');
      addScene(element, 'portrait', member, [...member.parentElement.children].indexOf(member));
    });
    doc.querySelectorAll('.learning-tools > span').forEach((element, index) => addScene(element, 'tool', element.parentElement, index));
    doc.querySelectorAll('.page-section-head h2, .learning-end h2, .join-steps > div > h2, .team-group__head h3').forEach(element => addScene(element, 'heading'));
    doc.querySelectorAll('.alliance-logo').forEach(element => addScene(element, 'from-left', element.closest('.alliance-row')));
    doc.querySelectorAll('.join-photos__second, .learning-intro__note').forEach(element => addScene(element, 'layer', element.parentElement));
    doc.querySelectorAll('.alliance-row, .course-entry, .join-steps__list li, .team-group__head').forEach(element => addScene(element, 'line'));
    const caseLinks = [...doc.querySelectorAll('.project-flow a')];
    const caseSteps = caseLinks.map(link => doc.getElementById(link.hash.slice(1)));
    let caseTops = [];
    let sceneViewport = win.innerHeight;

    const measureScenes = () => {
      sceneViewport = win.innerHeight;
      scenes.forEach(scene => {
        scene.top = layoutTop(scene.anchor);
        scene.height = scene.anchor.offsetHeight;
        if (scene.kind === 'portrait') {
          const grid = scene.anchor.parentElement;
          const columns = win.getComputedStyle(grid).gridTemplateColumns.split(' ').length;
          scene.delay = staggerDelay(scene.order, columns) * .35;
        } else scene.delay = scene.kind === 'tool' ? scene.order * 24 : 0;
      });
      caseTops = caseSteps.map(step => layoutTop(step));
    };
    const targetScenes = () => {
      const scroll = win.scrollY;
      scenes.forEach(scene => {
        const top = scene.top - scroll;
        scene.target = scene.kind === 'photo' || scene.kind === 'layer'
          ? scrollProgress(top, scene.height, sceneViewport)
          : entryProgress(top, scene.height, sceneViewport, scene.delay);
        if (scene.current === null || top > sceneViewport + 100 || top + scene.height < -100 || reduced.matches) scene.current = scene.target;
      });
      let active = 0;
      caseTops.forEach((top, index) => { if (top - scroll < sceneViewport * .55) active = index; });
      caseLinks.forEach((link, index) => {
        if (index === active) link.setAttribute('aria-current', 'step');
        else link.removeAttribute('aria-current');
      });
    };
    const drawScene = scene => {
      const p = reduced.matches ? 1 : scene.current;
      const key = `${reduced.matches}:${p.toFixed(4)}`;
      if (scene.last === key) return;
      scene.last = key;
      const { element, kind } = scene;
      const distance = win.innerWidth <= 640 ? .45 : 1;
      const rest = 1 - p;
      let transform = 'none';
      let clip = 'none';
      if (!reduced.matches) {
        if (kind === 'photo') {
          transform = `translate3d(0,${((.5 - p) * Math.min(44, scene.height * .1) * distance).toFixed(2)}px,0) scale(${(1.2 - p * .1).toFixed(4)})`;
          const opening = (1 - smooth(p / .38)) * 14;
          clip = `inset(0 ${opening.toFixed(2)}% 0 ${opening.toFixed(2)}%)`;
        }
        if (kind === 'layer') transform = `translate3d(0,${((.5 - p) * 76 * distance).toFixed(2)}px,0)`;
        if (kind === 'case') transform = `translate3d(0,${(rest * 30 * distance).toFixed(2)}px,0) scale(${(1 - rest * .045).toFixed(4)})`;
        if (kind === 'artifact') {
          transform = `scale(${(1 - rest * .06).toFixed(4)})`;
          clip = `inset(0 ${(rest * 9).toFixed(2)}% 0 0)`;
        }
        if (kind === 'portrait') {
          transform = `translate3d(0,${(rest * 34 * distance).toFixed(2)}px,0)`;
          clip = `inset(0 0 ${(rest * 12).toFixed(2)}% 0)`;
        }
        if (kind === 'from-left' || kind === 'from-right') {
          transform = `translate3d(${(rest * 34 * distance * (kind === 'from-left' ? -1 : 1)).toFixed(2)}px,0,0)`;
          clip = `inset(0 ${(rest * 8).toFixed(2)}% 0 ${(rest * 8).toFixed(2)}%)`;
        }
        if (kind === 'heading' || kind === 'tool') transform = `translate3d(0,${(rest * (kind === 'tool' ? 24 : 18)).toFixed(2)}px,0)`;
        if (kind === 'copy') transform = `translate3d(${(rest * 32 * distance).toFixed(2)}px,0,0)`;
      }
      if (kind === 'line') element.style.setProperty('--row-progress', p.toFixed(4));
      else {
        element.style.transform = transform;
        element.style.clipPath = clip;
      }
    };

    doc.querySelectorAll('.journal-companion, .join-photos__cat').forEach(cat => {
      const greet = () => play(cat, [
        { transform: 'rotate(0deg) translateY(0)' },
        { transform: 'rotate(-7deg) translateY(-9px)', offset: .3 },
        { transform: 'rotate(4deg) translateY(-4px)', offset: .65 },
        { transform: 'rotate(0deg) translateY(0)' }
      ], { duration: 850 });
      if ('IntersectionObserver' in win) {
        const greetingObserver = new win.IntersectionObserver(entries => {
          if (entries.some(entry => entry.isIntersecting)) { greet(); greetingObserver.disconnect(); }
        }, { threshold: .6 });
        greetingObserver.observe(cat);
      }
      cat.addEventListener('pointerenter', greet);
    });

    doc.querySelectorAll('[data-catalog]').forEach(catalog => {
      const buttons = [...catalog.querySelectorAll('[data-filter]')];
      const courses = [...catalog.querySelectorAll('[data-course]')];
      const status = catalog.querySelector('[data-filter-status]');
      buttons.forEach(button => button.addEventListener('click', () => {
        const filter = button.dataset.filter;
        let count = 0;
        buttons.forEach(item => item.setAttribute('aria-pressed', String(item === button)));
        courses.forEach(course => {
          course.hidden = filter !== 'all' && !course.dataset.course.split(' ').includes(filter);
          if (!course.hidden) {
            count++;
            play(course, [{ opacity: .45, transform: 'translateX(-8px)' }, { opacity: 1, transform: 'none' }], { duration: 260 });
          }
        });
        status.textContent = `${count} ${count === 1 ? 'opción disponible' : 'opciones disponibles'} en el catálogo`;
      }));
    });

    doc.querySelectorAll('.course-entry').forEach(course => course.addEventListener('toggle', () => {
      if (course.open) play(course.querySelector('.course-entry__body'), [{ opacity: .5, transform: 'translateY(-6px)' }, { opacity: 1, transform: 'none' }], { duration: 240 });
    }));

    const progress = doc.querySelector('.page-progress span');
    const rails = [...doc.querySelectorAll('[data-scroll-cat]')].map(element => ({
      element, cat: element.querySelector('img'), fill: element.querySelector('.page-cat-rail__fill'), current: 0, target: 0, visible: false, travel: 0
    }));
    const tocLinks = [...doc.querySelectorAll('.article-toc a, .team-areas a')];
    const headings = tocLinks.map(link => doc.getElementById(link.hash.slice(1)));
    let frame = 0;
    let previousTime = 0;
    let needsMeasure = true;
    let needsGeometry = true;
    const wake = () => { if (!frame && !doc.hidden) frame = win.requestAnimationFrame(tick); };
    const measure = () => {
      if (needsGeometry) { measureScenes(); needsGeometry = false; }
      targetScenes();
      const height = win.innerHeight;
      if (progress) {
        const range = doc.documentElement.scrollHeight - height;
        progress.style.transform = `scaleX(${range > 0 ? clamp(win.scrollY / range) : 0})`;
      }
      rails.forEach(rail => {
        const rect = rail.element.getBoundingClientRect();
        rail.visible = rect.bottom > 0 && rect.top < height;
        rail.travel = Math.max(0, rect.width - rail.cat.offsetWidth);
        rail.target = clamp((height * .93 - rect.top) / (height * .62 + rect.height));
        if (!rail.visible || reduced.matches) rail.current = rail.target;
      });
      if (headings.length) {
        let active = 0;
        headings.forEach((heading, index) => { if (heading && heading.getBoundingClientRect().top < height * .35) active = index; });
        tocLinks.forEach((link, index) => {
          if (index === active) link.setAttribute('aria-current', 'location');
          else link.removeAttribute('aria-current');
        });
      }
    };
    function tick(time) {
      frame = 0;
      const elapsed = previousTime ? (time - previousTime) / 1000 : 1 / 60;
      previousTime = time;
      if (needsMeasure) { measure(); needsMeasure = false; }
      let moving = false;
      scenes.forEach(scene => {
        scene.current = reduced.matches ? scene.target : followScroll(scene.current, scene.target, elapsed);
        if (Math.abs(scene.current - scene.target) < .0003) scene.current = scene.target;
        drawScene(scene);
        if (!reduced.matches && scene.current !== scene.target) moving = true;
      });
      rails.forEach(rail => {
        rail.current = reduced.matches ? rail.target : approach(rail.current, rail.target, elapsed);
        if (Math.abs(rail.target - rail.current) < .0002) rail.current = rail.target;
        rail.cat.style.transform = `translate3d(${(rail.current * rail.travel).toFixed(2)}px,0,0)`;
        rail.fill.style.transform = `scaleX(${rail.current.toFixed(4)})`;
        if (!reduced.matches && rail.visible && rail.current !== rail.target) moving = true;
      });
      if (moving) wake(); else previousTime = 0;
    }
    const update = () => { needsMeasure = true; wake(); };
    const reflow = () => { needsGeometry = true; scenes.forEach(scene => { scene.last = null; }); update(); };
    win.addEventListener('scroll', update, { passive: true });
    win.addEventListener('resize', reflow, { passive: true });
    win.addEventListener('load', reflow, { once: true });
    doc.addEventListener('load', reflow, true);
    doc.addEventListener('toggle', reflow, true);
    doc.addEventListener('click', event => { if (event.target.closest('[data-filter]')) reflow(); });
    doc.fonts?.ready.then(reflow);
    doc.addEventListener('visibilitychange', () => {
      if (doc.hidden) {
        win.cancelAnimationFrame(frame); frame = 0; previousTime = 0;
        animations.forEach(animation => animation.pause());
      } else {
        animations.forEach(animation => animation.play());
        update();
      }
    });
    reduced.addEventListener('change', () => {
      if (reduced.matches) { animations.forEach(animation => animation.cancel()); animations.clear(); }
      update();
    });
    if ('ResizeObserver' in win) new win.ResizeObserver(reflow).observe(doc.body);
    update();
  }
  return { clamp, staggerDelay, approach, smooth, scrollProgress, entryProgress, followScroll, layoutTop, mount };
});
