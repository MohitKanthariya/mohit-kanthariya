(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover:hover) and (pointer:fine)').matches;
  const root = document.documentElement;
  const clamp = (n, a, b) => Math.min(b, Math.max(a, n));

  /* ---------- tiny utils ---------- */
  $('#year').textContent = new Date().getFullYear();
  $$('.links a').forEach(a => { if (!a.getAttribute('href')) a.classList.add('hide'); });
  $$('.shot').forEach(img => {
    const bad = () => img.remove();
    img.addEventListener('error', bad, { once: true });
    if (img.complete && img.naturalWidth === 0) bad();
  });

  /* ---------- split headline into words ---------- */
  const splitEl = $('.split');
  if (splitEl) {
    let i = 0;
    const walk = node => {
      [...node.childNodes].forEach(n => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(t => {
            if (!t) return;
            if (/^\s+$/.test(t)) { frag.append(' '); return; }
            const w = document.createElement('span'); w.className = 'w';
            const s = document.createElement('span'); s.textContent = t; s.style.setProperty('--i', i++);
            w.append(s); frag.append(w);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1) walk(n);
      });
    };
    splitEl.setAttribute('aria-label', splitEl.textContent.trim());
    walk(splitEl);
    $$('.w', splitEl).forEach(w => w.setAttribute('aria-hidden', 'true'));
  }

  /* ---------- preloader ---------- */
  const loader = $('#loader'), bar = $('#loaderBar'), num = $('#loaderNum');
  let revealed = false;
  const startPage = () => {
    if (revealed) return; revealed = true;
    document.body.classList.remove('lock');
    root.classList.add('ready');
    $$('.hero .reveal, .split').forEach(el => el.classList.add('in'));
    initReveal();
  };
  const finishLoader = () => {
    try { sessionStorage.setItem('seen', '1'); } catch (e) {}
    loader.classList.add('done');
    setTimeout(startPage, 450);
    setTimeout(() => loader.classList.add('gone'), 1300);
  };
  if (!loader || !root.classList.contains('js') || root.classList.contains('seen') || reduce) {
    loader && loader.classList.add('gone');
    startPage();
  } else {
    document.body.classList.add('lock');
    let p = 0, loaded = document.readyState === 'complete';
    addEventListener('load', () => (loaded = true));
    const t0 = performance.now();
    const tick = now => {
      const elapsed = now - t0;
      const target = loaded ? 100 : Math.min(90, elapsed / 18);
      p += (target - p) * .12; if (target === 100 && p > 99.2) p = 100;
      if (elapsed < 1500 && p > elapsed / 15) p = elapsed / 15; // min display time ~1.5s
      bar.style.width = p + '%'; num.textContent = Math.round(p);
      if (p >= 100) return finishLoader();
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    setTimeout(() => { if (!revealed) { loaded = true; } }, 4000); // failsafe
  }

  /* ---------- reveal on scroll ---------- */
  function initReveal() {
    const items = $$('.reveal:not(.in)');
    if (!('IntersectionObserver' in window) || reduce) return items.forEach(el => el.classList.add('in'));
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    }), { threshold: .12, rootMargin: '0px 0px -8% 0px' });
    items.forEach(el => io.observe(el));
  }

  /* ---------- count-up stats ---------- */
  const fmt = (v, dec) => v.toLocaleString('en-IN', { minimumFractionDigits: dec, maximumFractionDigits: dec });
  const counters = $$('[data-count]');
  const runCount = el => {
    const end = parseFloat(el.dataset.count), dec = +(el.dataset.dec || 0), suf = el.dataset.suffix || '';
    if (reduce) { el.textContent = fmt(end, dec) + suf; return; }
    const dur = 1600, t0 = performance.now();
    const step = now => {
      const k = clamp((now - t0) / dur, 0, 1), e = 1 - Math.pow(1 - k, 4);
      el.textContent = fmt(end * e, dec) + suf;
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  if ('IntersectionObserver' in window) {
    const co = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) { runCount(e.target); co.unobserve(e.target); }
    }), { threshold: .6 });
    counters.forEach(c => co.observe(c));
  }

  /* ---------- nav: mobile menu, scrolled state, active link ---------- */
  const burger = $('#burger'), list = $('#navlist');
  const setMenu = open => {
    list.classList.toggle('open', open);
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  };
  burger.addEventListener('click', () => setMenu(!list.classList.contains('open')));
  $$('a', list).forEach(a => a.addEventListener('click', () => setMenu(false)));
  addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });
  document.addEventListener('click', e => { if (!e.target.closest('.nav')) setMenu(false); });

  const links = $$('.nav__list a[href^="#"]');
  if ('IntersectionObserver' in window) {
    const so = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) links.forEach(l => l.classList.toggle('on', l.getAttribute('href') === '#' + e.target.id));
    }), { rootMargin: '-45% 0px -50% 0px' });
    $$('main section[id]').forEach(s => so.observe(s));
  }

  /* ---------- scroll progress + timeline fill ---------- */
  const bar2 = $('#progress'), tl = $('#tl'), tlFill = $('#tlFill');
  let ticking = false;
  const onScroll = () => {
    const h = root;
    bar2.style.width = (h.scrollTop / Math.max(1, h.scrollHeight - h.clientHeight)) * 100 + '%';
    if (tl) {
      const r = tl.getBoundingClientRect(), vh = innerHeight;
      tl.style.setProperty('--p', clamp((vh * .6 - r.top) / r.height, 0, 1).toFixed(3));
    }
    ticking = false;
  };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();

  /* ---------- role rotator ---------- */
  const rolesEl = $('#roles');
  if (rolesEl && !reduce) {
    const roles = ['Flutter Developer', 'Mobile App Engineer', 'Firebase & Laravel', 'CI/CD Automation'];
    let r = 0;
    setInterval(() => {
      r = (r + 1) % roles.length;
      const b = document.createElement('b'); b.textContent = roles[r];
      rolesEl.replaceChildren(b);
    }, 2600);
  }

  /* ---------- phone carousel ---------- */
  const slides = $$('.slide'), cap = $('#phoneTitle'), pbtn = $('#phonePause'), dots = $$('#phoneDots i');
  let si = 0, timer = null, paused = reduce;
  const show = n => {
    slides[si].classList.remove('is-on'); dots[si].classList.remove('on');
    si = (n + slides.length) % slides.length;
    slides[si].classList.add('is-on'); dots[si].classList.add('on');
    cap.textContent = slides[si].dataset.title;
  };
  const stop = () => { clearInterval(timer); timer = null; };
  const start = () => { stop(); if (!paused) timer = setInterval(() => show(si + 1), 3200); };
  pbtn.setAttribute('aria-pressed', String(paused));
  pbtn.addEventListener('click', () => {
    paused = !paused; pbtn.setAttribute('aria-pressed', String(paused));
    pbtn.setAttribute('aria-label', paused ? 'Play preview' : 'Pause preview');
    paused ? stop() : start();
  });
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
  start();

  /* ---------- pointer effects (desktop only, skipped for reduced motion) ---------- */
  // spotlight follows pointer on glass cards
  $$('.spot').forEach(el => el.addEventListener('pointermove', e => {
    const r = el.getBoundingClientRect();
    el.style.setProperty('--mx', e.clientX - r.left + 'px');
    el.style.setProperty('--my', e.clientY - r.top + 'px');
  }));

  if (fine && !reduce) {
    // cursor ring
    const cur = $('#cursor');
    if (cur) {
      let x = innerWidth / 2, y = innerHeight / 2, cx = x, cy = y;
      addEventListener('pointermove', e => { x = e.clientX; y = e.clientY; cur.classList.remove('hide'); });
      document.addEventListener('mouseleave', () => cur.classList.add('hide'));
      const loop = () => { cx += (x - cx) * .2; cy += (y - cy) * .2; cur.style.transform = `translate3d(${cx}px,${cy}px,0)`; requestAnimationFrame(loop); };
      loop();
      document.addEventListener('pointerover', e => cur.classList.toggle('big', !!e.target.closest('a,button,.mag,input,textarea')));
    }

    // magnetic buttons
    $$('.mag').forEach(el => {
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect();
        el.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * .22}px,${(e.clientY - r.top - r.height / 2) * .3}px)`;
      });
      el.addEventListener('pointerleave', () => (el.style.transform = ''));
    });

    // 3D tilt on phone previews
    $$('.tilt').forEach(el => {
      const host = el.closest('.proj');
      host.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect();
        const dx = clamp((e.clientX - (r.left + r.width / 2)) / 400, -1, 1), dy = clamp((e.clientY - (r.top + r.height / 2)) / 400, -1, 1);
        el.style.transform = `rotateY(${dx * 16}deg) rotateX(${-dy * 12}deg) translateZ(10px)`;
      });
      host.addEventListener('pointerleave', () => (el.style.transform = ''));
    });

    // hero parallax
    const stage = $('#stage'), depth = $$('[data-depth]', stage);
    const hero = $('.hero');
    hero.addEventListener('pointermove', e => {
      const nx = e.clientX / innerWidth - .5, ny = e.clientY / innerHeight - .5;
      depth.forEach(d => {
        const k = +d.dataset.depth;
        d.style.translate = `${-nx * k}px ${-ny * k}px`;
      });
    });
  }

  /* ---------- project phone galleries (cross-fade through each app's screens) ---------- */
  $$('.mini__screen').forEach((box, n) => {
    const frames = () => $$('.shot', box);
    if (frames().length < 2 || reduce) return;
    let t = null, k = 0;
    const next = () => {
      const f = frames(); if (f.length < 2) return;
      f[k % f.length].classList.remove('on');
      k = (k + 1) % f.length;
      f[k].classList.add('on');
    };
    const go = () => { if (!t) t = setInterval(next, 3400 + n * 300); };
    const halt = () => { clearInterval(t); t = null; };
    new IntersectionObserver(es => es.forEach(e => (e.isIntersecting ? go() : halt())), { threshold: .3 }).observe(box);
  });

  /* ---------- copy email ---------- */
  $$('.copy').forEach(b => b.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(b.dataset.copy); b.textContent = 'Copied ✓'; }
    catch { b.textContent = 'Press Ctrl+C'; }
    setTimeout(() => (b.textContent = 'Copy'), 1800);
  }));

  /* ---------- Contact form: opens the visitor's email app, pre-filled (no backend needed) ---------- */
  const form = $('.form'), status = $('#formStatus');
  if (form) form.addEventListener('submit', e => {
    e.preventDefault();
    const d = new FormData(form);
    const subject = encodeURIComponent('Portfolio enquiry from ' + d.get('name'));
    const body = encodeURIComponent(d.get('message') + '\n\n— ' + d.get('name') + ' (' + d.get('email') + ')');
    status.className = 'form__status ok';
    status.textContent = 'Opening your email app… if nothing opens, write to kanthariyamohit1234@gmail.com';
    location.href = 'mailto:kanthariyamohit1234@gmail.com?subject=' + subject + '&body=' + body;
  });
})();
