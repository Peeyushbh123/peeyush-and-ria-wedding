/* Peeyush & Ria — enhancement layer: music, fireworks, tilt, garland, reveals. */
(function () {
  'use strict';
  if (window.__prEnhance) return;
  window.__prEnhance = true;

  var reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia && matchMedia('(hover:hover) and (pointer:fine)').matches;
  var AUDIO_SRC = 'audio/wedding-music.mp3';
  var VOLUME = 0.55;

  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  /* =============================================================
     MUSIC — starts inside the seal tap (a real user gesture), fades in
     ============================================================= */
  var audio = null, wasPlaying = false;

  function fadeIn(a, target, ms) {
    var t0 = performance.now();
    (function step() {
      var k = Math.min(1, (performance.now() - t0) / ms);
      try { a.volume = target * (k * k * (3 - 2 * k)); } catch (e) {}
      if (k < 1) requestAnimationFrame(step);
    })();
  }

  function setupMusic() {
    audio = document.getElementById('weddingAudio');
    if (!audio) return;
    window.__prAudioOK = true;               // tells the built-in synth fallback to stay quiet
    audio.addEventListener('error', function () { window.__prAudioOK = false; });

    document.addEventListener('click', function (e) {
      var seal = e.target && e.target.closest && e.target.closest('button[aria-label^="Open invitation"]');
      if (!seal || !audio.paused) return;
      try {
        audio.muted = false;
        audio.volume = 0;
        if (!audio.src || audio.src.indexOf('wedding-music') < 0) audio.src = AUDIO_SRC;
        var p = audio.play();
        if (p && p.then) p.then(function () { fadeIn(audio, VOLUME, 3500); }).catch(function () {});
      } catch (err) {}
    }, true);

    // pause politely when the tab is hidden, resume when it returns
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) { wasPlaying = !audio.paused; if (wasPlaying) audio.pause(); }
      else if (wasPlaying) { audio.play().catch(function () {}); }
    });
  }

  /* =============================================================
     FIREWORKS + cursor sparkle trail (single canvas)
     ============================================================= */
  var fx = null;
  function makeFX() {
    if (reduced) return null;
    var c = document.createElement('canvas');
    c.id = 'pr-fx';
    c.setAttribute('aria-hidden', 'true');
    document.body.appendChild(c);
    var ctx = c.getContext('2d');
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    var parts = [], raf = 0;
    var colors = ['#FFD76A', '#D4AF37', '#FFF3C4', '#E8D5A0', '#E07A8F', '#F7B2B7', '#FFFFFF'];

    function size() {
      c.width = innerWidth * dpr; c.height = innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    size();
    addEventListener('resize', size);

    function loop() {
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      ctx.globalCompositeOperation = 'lighter';
      for (var i = parts.length - 1; i >= 0; i--) {
        var p = parts[i];
        p.px = p.x; p.py = p.y;
        p.vx *= p.fr; p.vy = p.vy * p.fr + p.g;
        p.x += p.vx; p.y += p.vy;
        p.life -= p.decay;
        if (p.life <= 0) { parts.splice(i, 1); continue; }
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.strokeStyle = p.color; ctx.lineWidth = p.size; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(p.px, p.py); ctx.lineTo(p.x, p.y); ctx.stroke();
        if (p.life > .5 && Math.random() < .12) {   // twinkle dot
          ctx.fillStyle = '#fff8dc'; ctx.fillRect(p.x, p.y, 1.6, 1.6);
        }
      }
      ctx.globalAlpha = 1;
      raf = parts.length ? requestAnimationFrame(loop) : 0;
    }
    function kick() { if (!raf) raf = requestAnimationFrame(loop); }

    return {
      burst: function (x, y, n, power) {
        n = n || 56; power = power || 1;
        for (var i = 0; i < n; i++) {
          var a = (Math.PI * 2 * i) / n + Math.random() * .25;
          var s = (1.4 + Math.random() * 3.4) * power;
          parts.push({ x: x, y: y, px: x, py: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
            g: .035, fr: .982, life: 1, decay: .011 + Math.random() * .012,
            size: 1.2 + Math.random() * 1.8, color: colors[(Math.random() * colors.length) | 0] });
        }
        if (parts.length > 900) parts.splice(0, parts.length - 900);
        kick();
      },
      spark: function (x, y) {
        parts.push({ x: x, y: y, px: x, py: y, vx: (Math.random() - .5) * .8, vy: Math.random() * .6 + .1,
          g: .02, fr: .97, life: .9, decay: .03, size: 1.4 + Math.random(), color: colors[(Math.random() * 3) | 0] });
        kick();
      }
    };
  }

  function showStars(count, area) {
    if (!fx) return;
    var w = innerWidth, h = innerHeight;
    for (var i = 0; i < count; i++) {
      setTimeout(function () {
        fx.burst(w * (.15 + Math.random() * .7), h * (area[0] + Math.random() * (area[1] - area[0])), 60, 1.05);
      }, i * 380);
    }
  }

  /* =============================================================
     3D TILT + GLARE on cards (desktop pointers)
     ============================================================= */
  function setupTilt() {
    if (!fine || reduced) return;
    $$('main :is(article, div).group').forEach(function (el) {
      var raf = 0, ev = null;
      function apply() {
        raf = 0;
        var r = el.getBoundingClientRect();
        var x = (ev.clientX - r.left) / r.width, y = (ev.clientY - r.top) / r.height;
        el.style.setProperty('--ry', ((x - .5) * 9).toFixed(2) + 'deg');
        el.style.setProperty('--rx', ((.5 - y) * 7).toFixed(2) + 'deg');
        el.style.setProperty('--mx', (x * 100).toFixed(1) + '%');
        el.style.setProperty('--my', (y * 100).toFixed(1) + '%');
      }
      el.addEventListener('pointerenter', function () { el.classList.add('pr-tilting'); });
      el.addEventListener('pointermove', function (e) { ev = e; if (!raf) raf = requestAnimationFrame(apply); });
      el.addEventListener('pointerleave', function () {
        el.classList.remove('pr-tilting');
        el.style.removeProperty('--rx'); el.style.removeProperty('--ry');
      });
    });
  }

  /* =============================================================
     SCROLL REVEALS — cards slide in from alternating sides
     ============================================================= */
  function setupReveals() {
    var els = $$('main article.group, main .grid.gap-3 > div.group');
    if (!els.length) return;
    if (reduced || !('IntersectionObserver' in window)) return;
    els.forEach(function (el, i) { el.classList.add('pr-rev', i % 2 ? 'pr-from-r' : 'pr-from-l'); });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target;
        io.unobserve(el);
        el.classList.add('pr-in');
        setTimeout(function () { el.classList.remove('pr-rev', 'pr-in', 'pr-from-l', 'pr-from-r'); }, 1200);
        if (el.tagName === 'ARTICLE' && /Royal Wedding|शुभ विवाह/.test(el.textContent) && fx) {
          var r = el.getBoundingClientRect();
          [0, 350, 700].forEach(function (d, k) {
            setTimeout(function () { fx.burst(r.left + r.width * (.2 + k * .3), Math.max(80, r.top + 30), 70, 1.1); }, d);
          });
        }
      });
    }, { threshold: .15, rootMargin: '0px 0px -40px 0px' });
    els.forEach(function (el) { io.observe(el); });
  }

  /* =============================================================
     COUNTDOWN — numbers pop when they change
     ============================================================= */
  function setupCountdown() {
    $$('main .font-serif.font-bold').forEach(function (n) {
      var last = n.textContent;
      new MutationObserver(function () {
        var t = n.textContent;
        if (t === last) return;
        last = t;
        n.classList.remove('pr-pop'); void n.offsetWidth; n.classList.add('pr-pop');
      }).observe(n, { childList: true, characterData: true, subtree: true });
    });
  }

  /* =============================================================
     MARIGOLD TORANA — swaying garland across the top once opened
     ============================================================= */
  function buildGarland() {
    if (document.getElementById('pr-garland')) return;
    var NS = 'http://www.w3.org/2000/svg';
    var W = 430, H = 150, top = 8;
    var marigold = ['#F59E0B', '#FBBF24', '#EA580C', '#FCD34D'];
    var wrap = document.createElement('div');
    wrap.id = 'pr-garland'; wrap.setAttribute('aria-hidden', 'true');
    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);

    function el(name, attrs, parent) {
      var n = document.createElementNS(NS, name);
      for (var k in attrs) n.setAttribute(k, attrs[k]);
      (parent || svg).appendChild(n); return n;
    }
    function flower(x, y, r, parent, i) {
      el('circle', { cx: x, cy: y, r: r, fill: marigold[i % marigold.length] }, parent);
      el('circle', { cx: x, cy: y, r: r * .55, fill: marigold[(i + 2) % marigold.length], opacity: .85 }, parent);
      el('circle', { cx: x, cy: y, r: r * .2, fill: '#7C2D12', opacity: .55 }, parent);
    }
    // beam
    el('path', { d: 'M0 ' + top + ' H' + W, stroke: '#B8952F', 'stroke-width': 3, fill: 'none' });
    el('path', { d: 'M0 ' + (top + 2.5) + ' H' + W, stroke: '#E8D5A0', 'stroke-width': 1, fill: 'none', opacity: .8 });
    // swags
    var sw = [[0, 144, 38], [144, 286, 46], [286, W, 38]];
    sw.forEach(function (s, si) {
      var x0 = s[0], x1 = s[1], dip = s[2], cx = (x0 + x1) / 2;
      var n = 15;
      for (var i = 0; i <= n; i++) {
        var t = i / n, u = 1 - t;
        var x = u * u * x0 + 2 * u * t * cx + t * t * x1;
        var y = u * u * (top + 3) + 2 * u * t * (top + 3 + dip * 2) + t * t * (top + 3);
        if (i % 3 === 1) el('ellipse', { cx: x, cy: y + 5, rx: 3.2, ry: 6, fill: '#4D7C0F', transform: 'rotate(' + (i * 17 % 50 - 25) + ' ' + x + ' ' + y + ')', opacity: .9 });
        flower(x, y, 5.4, svg, i + si);
      }
    });
    // hanging strands
    var xs = [26, 70, 118, 168, 215, 262, 312, 360, 404];
    xs.forEach(function (x, idx) {
      var g = el('g', { 'class': 'pr-strand' });
      g.style.setProperty('--sd', (3.4 + (idx % 4) * .6) + 's');
      g.style.setProperty('--dl', (-idx * .45) + 's');
      var len = 36 + ((idx * 17) % 5) * 9 + (idx % 2 ? 8 : 0);
      var yTop = top + (idx % 2 ? 36 : 28);                 // starts below the swag, roughly
      el('line', { x1: x, y1: top + 3, x2: x, y2: yTop + len, stroke: '#B8952F', 'stroke-width': 1.1 }, g);
      var count = Math.floor(len / 11);
      for (var k = 0; k < count; k++) flower(x, yTop + 6 + k * 11, 4.6, g, k + idx);
      // gold bell / drop
      el('path', { d: 'M' + (x - 5) + ' ' + (yTop + len) + ' Q' + x + ' ' + (yTop + len + 16) + ' ' + (x + 5) + ' ' + (yTop + len) + ' Z', fill: '#D4AF37', stroke: '#B8952F', 'stroke-width': .8 }, g);
      el('circle', { cx: x, cy: yTop + len + 12, r: 1.8, fill: '#fff3c4' }, g);
    });

    wrap.appendChild(svg);
    document.body.appendChild(wrap);

    // fade the garland away as the guest scrolls down
    function onScroll() {
      var k = Math.max(0, 1 - window.scrollY / 280);
      wrap.style.setProperty('--pr-g', k.toFixed(2));
    }
    addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    requestAnimationFrame(function () { requestAnimationFrame(function () { wrap.classList.add('pr-on'); }); });
  }

  /* =============================================================
     ON OPEN — runs once when the invitation becomes visible
     ============================================================= */
  var opened = false;
  function onOpen() {
    if (opened) return;
    opened = true;
    if (reduced) return;
    // golden fireworks explode over the opening gates
    setTimeout(function () { showStars(5, [.12, .45]); }, 1800);
    setTimeout(buildGarland, 3600);
    // wipe the hero name in once the gates have parted
    setTimeout(function () {
      var h = document.querySelector('main section h2');
      if (h) { h.classList.remove('pr-hero-entrance', 'pr-name-glow'); h.classList.add('pr-wipe'); }
    }, 4300);
  }

  function watchOpen(main) {
    function check() { if (/opacity-100/.test(main.className)) onOpen(); }
    new MutationObserver(check).observe(main, { attributes: true, attributeFilter: ['class'] });
    check();
  }

  /* =============================================================
     TAP SPARKLES on empty space + pointer trail
     ============================================================= */
  function setupPointerFX() {
    if (reduced) return;
    var last = 0;
    if (fine) {
      document.addEventListener('pointermove', function (e) {
        var now = performance.now();
        if (now - last < 45 || e.pointerType === 'touch') return;
        last = now;
        if (fx) fx.spark(e.clientX, e.clientY);
      }, { passive: true });
    }
    document.addEventListener('click', function (e) {
      if (!fx || (e.target.closest && e.target.closest('a,button,[role="button"]'))) return;
      fx.burst(e.clientX, e.clientY, 26, .55);
    }, { passive: true });
  }

  /* =============================================================
     BOOT
     ============================================================= */
  function boot() {
    setupMusic();
    fx = makeFX();
    setupPointerFX();
    var tries = 0;
    var t = setInterval(function () {
      var main = document.querySelector('main');
      tries++;
      if (main) {
        clearInterval(t);
        setupReveals(); setupTilt(); setupCountdown(); watchOpen(main);
      } else if (tries > 80) { clearInterval(t); }
    }, 150);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
