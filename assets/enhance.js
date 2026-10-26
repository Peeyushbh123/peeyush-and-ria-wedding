/* Peeyush & Ria — enhancement layer: music, fireworks, tilt, garland, reveals, guest tools. */
(function () {
  'use strict';
  if (window.__prEnhance) return;
  window.__prEnhance = true;

  /* =============================================================
     SETTINGS — safe to edit
     ============================================================= */
  // The background track lives in index.html's own `Cn` array (search for "Cn=["), not here —
  // this file just triggers the built-in music button; it never sets the <audio> src itself.

  // WhatsApp RSVP button: put a number WITH country code, digits only (e.g. '919876543210').
  // Leave empty ('') to hide the RSVP button.
  var RSVP_WHATSAPP = '';

  var VENUE = 'Jharkhand Palace and Resort, Opposite Vinayak City, Sirsi Road, Bindayaka, Jaipur 302041, Rajasthan';
  var COUPLE = 'Peeyush & Ria';
  // Times are India time (IST). "mins" is how long the calendar entry lasts (assumed; change freely).
  var EVENTS = [
    { id: 'tilak',   en: 'Tilak Ceremony',  hi: 'तिलक समारोह',   d: [2027, 2, 14, 14, 0], mins: 180,
      whenEn: '14 Feb · 2:00 PM',  whenHi: '14 फरवरी · दोपहर 2:00 बजे' },
    { id: 'sangeet', en: 'Sangeet Ceremony', hi: 'संगीत समारोह', d: [2027, 2, 14, 19, 0], mins: 270,
      whenEn: '14 Feb · 7:00 PM',  whenHi: '14 फरवरी · शाम 7:00 बजे' },
    { id: 'haldi',   en: 'Haldi',           hi: 'हल्दी',         d: [2027, 2, 15, 11, 0], mins: 180,
      whenEn: '15 Feb · 11:00 AM', whenHi: '15 फरवरी · सुबह 11:00 बजे' },
    { id: 'mehendi', en: 'Mehendi',         hi: 'मेहँदी',        d: [2027, 2, 15, 16, 0], mins: 240,
      whenEn: '15 Feb · 4:00 PM',  whenHi: '15 फरवरी · शाम 4:00 बजे' },
    { id: 'wedding', en: 'Royal Wedding',   hi: 'शुभ विवाह',     d: [2027, 2, 16, 18, 0], mins: 360,
      whenEn: '16 Feb · 6:00 PM',  whenHi: '16 फरवरी · शाम 6:00 बजे' }
  ];

  /* ============================================================= */

  var reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia && matchMedia('(hover:hover) and (pointer:fine)').matches;
  var lite = !!((navigator.connection && navigator.connection.saveData) ||
    (navigator.deviceMemory && navigator.deviceMemory <= 3) ||
    (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4));
  if (lite) document.documentElement.classList.add('pr-lite');

  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }

  /* =============================================================
     MUSIC — starts inside the seal tap (a real user gesture)
     ============================================================= */
  var audio = null, wasPlaying = false;

  function setupMusic() {
    // don't resolve #weddingAudio here — enhance.js can boot before React has mounted it,
    // so look it up lazily, right when it's actually needed (always rendered by tap time)
    document.addEventListener('click', function (e) {
      var seal = e.target && e.target.closest && e.target.closest('button[aria-label^="Open invitation"]');
      if (!seal) return;
      startReveal();
      if (!audio) {
        audio = document.getElementById('weddingAudio');
        if (audio) {
          window.__prAudioOK = true;             // tells the built-in synth fallback to stay quiet
          audio.addEventListener('error', function () { window.__prAudioOK = false; });
        }
      }
      if (!audio) return;
      // start music the same proven way the visible MUSIC button does, instead of
      // duplicating that play() logic here (that duplicate path was unreliable)
      var musicBtn = document.querySelector('button[aria-pressed]');
      if (musicBtn && musicBtn.getAttribute('aria-pressed') !== 'true') musicBtn.click();
    }, true);

    // pause politely when the tab is hidden, resume when it returns
    document.addEventListener('visibilitychange', function () {
      if (!audio) return;
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
    var cap = lite ? 420 : 900;
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
        if (!lite && p.life > .5 && Math.random() < .12) {   // twinkle dot
          ctx.fillStyle = '#fff8dc'; ctx.fillRect(p.x, p.y, 1.6, 1.6);
        }
      }
      ctx.globalAlpha = 1;
      raf = parts.length ? requestAnimationFrame(loop) : 0;
    }
    function kick() { if (!raf) raf = requestAnimationFrame(loop); }

    return {
      burst: function (x, y, n, power) {
        n = Math.round((n || 56) * (lite ? .55 : 1)); power = power || 1;
        for (var i = 0; i < n; i++) {
          var a = (Math.PI * 2 * i) / n + Math.random() * .25;
          var s = (1.4 + Math.random() * 3.4) * power;
          parts.push({ x: x, y: y, px: x, py: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
            g: .035, fr: .982, life: 1, decay: .011 + Math.random() * .012,
            size: 1.2 + Math.random() * 1.8, color: colors[(Math.random() * colors.length) | 0] });
        }
        if (parts.length > cap) parts.splice(0, parts.length - cap);
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
    if (!fine || reduced || lite) return;
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
    var els = $$('main article.group, main .grid.gap-3 > div.group, #pr-guest-tools, #pr-scratch');
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
     (kept short so it never covers the first line of the invitation)
     ============================================================= */
  function buildGarland() {
    if (document.getElementById('pr-garland')) return;
    var NS = 'http://www.w3.org/2000/svg';
    var W = 430, H = 108, top = 8;
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
    var sw = [[0, 144, 30], [144, 286, 36], [286, W, 30]];
    sw.forEach(function (s, si) {
      var x0 = s[0], x1 = s[1], dip = s[2], cx = (x0 + x1) / 2;
      var n = 15;
      for (var i = 0; i <= n; i++) {
        var t = i / n, u = 1 - t;
        var x = u * u * x0 + 2 * u * t * cx + t * t * x1;
        var y = u * u * (top + 3) + 2 * u * t * (top + 3 + dip * 2) + t * t * (top + 3);
        if (i % 3 === 1) el('ellipse', { cx: x, cy: y + 5, rx: 3.2, ry: 6, fill: '#4D7C0F', transform: 'rotate(' + (i * 17 % 50 - 25) + ' ' + x + ' ' + y + ')', opacity: .9 });
        flower(x, y, 5.2, svg, i + si);
      }
    });
    // short hanging strands
    var xs = [152, 188, 215, 242, 278];   // clear of the language / music buttons
    xs.forEach(function (x, idx) {
      var g = el('g', { 'class': 'pr-strand' });
      g.style.setProperty('--sd', (3.4 + (idx % 4) * .6) + 's');
      g.style.setProperty('--dl', (-idx * .45) + 's');
      var len = 14 + ((idx * 17) % 5) * 6 + (idx % 2 ? 6 : 0);   // 14 – 44
      var yTop = top + (idx % 2 ? 30 : 24);
      el('line', { x1: x, y1: top + 3, x2: x, y2: yTop + len, stroke: '#B8952F', 'stroke-width': 1.1 }, g);
      var count = Math.max(1, Math.floor(len / 11));
      for (var k = 0; k < count; k++) flower(x, yTop + 6 + k * 11, 4.4, g, k + idx);
      el('path', { d: 'M' + (x - 4.5) + ' ' + (yTop + len) + ' Q' + x + ' ' + (yTop + len + 14) + ' ' + (x + 4.5) + ' ' + (yTop + len) + ' Z', fill: '#D4AF37', stroke: '#B8952F', 'stroke-width': .8 }, g);
      el('circle', { cx: x, cy: yTop + len + 10, r: 1.6, fill: '#fff3c4' }, g);
    });

    wrap.appendChild(svg);
    document.body.appendChild(wrap);

    function onScroll() {
      var k = Math.max(0, 1 - window.scrollY / 220);
      wrap.style.setProperty('--pr-g', k.toFixed(2));
    }
    addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    requestAnimationFrame(function () { requestAnimationFrame(function () { wrap.classList.add('pr-on'); }); });
  }

  /* =============================================================
     ENVELOPE COVER — richer seal screen (decoration only; the React logic is untouched)
     ============================================================= */
  function mandalaSVG(op) {
    var g = '<circle r="96" stroke-width=".9"/><circle r="91" stroke-dasharray="1.2 3.2"/><circle r="58"/><circle r="30" stroke-width=".8"/>';
    var i;
    for (i = 0; i < 24; i++) g += '<path transform="rotate(' + (i * 15) + ')" d="M0-60Q7-75 0-90Q-7-75 0-60Z" fill="rgba(212,175,55,.10)"/>';
    for (i = 0; i < 12; i++) g += '<path transform="rotate(' + (i * 30 + 15) + ')" d="M0-30Q10-43 0-57Q-10-43 0-30Z" fill="rgba(255,233,168,.12)"/>';
    for (i = 0; i < 24; i++) g += '<circle r="1.3" cx="0" cy="-93.5" transform="rotate(' + (i * 15 + 7.5) + ')" fill="#D4AF37" stroke="none"/>';
    g += '<circle r="9" fill="rgba(212,175,55,.18)"/><circle r="4.5" fill="#D4AF37" stroke="none"/>';
    return '<svg viewBox="-100 -100 200 200" aria-hidden="true"><g class="pr-mandala-spin" fill="none" stroke="#D4AF37" stroke-width=".6" opacity="' + op + '">' + g + '</g></svg>';
  }
  var CORNER = '<svg viewBox="0 0 26 26" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"><path d="M2 24V9Q2 2 9 2H24"/><path d="M7 24V13Q7 7 13 7H24" opacity=".55"/><circle cx="2" cy="2" r="1.6" fill="currentColor" stroke="none"/></svg>';

  var coverEl = null, sealBtn = null;
  function setupCover() {
    sealBtn = document.querySelector('button[aria-label^="Open invitation"]');
    if (!sealBtn) return;
    coverEl = sealBtn.closest('.fixed');
    if (!coverEl || coverEl.classList.contains('pr-cover')) return;
    coverEl.classList.add('pr-cover');

    var glow = document.createElement('div'); glow.className = 'pr-cover-glow'; glow.setAttribute('aria-hidden', 'true');
    coverEl.insertBefore(glow, coverEl.firstChild);

    var flap = coverEl.querySelector('div[style*="clip-path"]');
    if (flap) {
      var art = document.createElement('div'); art.className = 'pr-flap-art'; art.setAttribute('aria-hidden', 'true');
      art.innerHTML =
        '<div style="position:absolute;left:50%;top:50%;width:min(80%,300px);aspect-ratio:1;transform:translate(-50%,-50%)">' + mandalaSVG(.55) + '</div>' +
        '<svg viewBox="0 0 100 100" preserveAspectRatio="none" style="position:absolute;inset:0;width:100%;height:100%">' +
        '<polyline points="0,68 50,100 100,68" fill="none" stroke="#D4AF37" stroke-width="5" vector-effect="non-scaling-stroke" stroke-linejoin="round"/>' +
        '<polyline points="0,63 50,94.2 100,63" fill="none" stroke="#E8D5A0" stroke-width="1" stroke-dasharray="2 5" vector-effect="non-scaling-stroke" opacity=".7"/></svg>';
      flap.appendChild(art);
    }
    var body = coverEl.querySelector('div[style*="top: 34%"]');
    if (body) {
      var ba = document.createElement('div'); ba.className = 'pr-body-art'; ba.setAttribute('aria-hidden', 'true');
      ba.innerHTML = ['tl', 'tr', 'bl', 'br'].map(function (c) { return '<span class="pr-corner ' + c + '">' + CORNER + '</span>'; }).join('');
      body.appendChild(ba);
    }
    var box = sealBtn.parentElement;
    if (box) {
      var glow2 = document.createElement('div'); glow2.className = 'pr-seal-glow'; glow2.setAttribute('aria-hidden', 'true');
      var ring = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      ring.setAttribute('class', 'pr-seal-ring'); ring.setAttribute('viewBox', '0 0 206 206'); ring.setAttribute('aria-hidden', 'true');
      ring.innerHTML = '<defs><path id="prRingPath" d="M103 103m-82 0a82 82 0 1 1 164 0a82 82 0 1 1-164 0"/></defs>' +
        '<text><textPath href="#prRingPath" textLength="506" lengthAdjust="spacing">' + ringText() + '</textPath></text>';
      box.insertBefore(glow2, box.firstChild); box.insertBefore(ring, box.firstChild);
      onLangChange.push(function () {
        var tp = ring.querySelector('textPath');
        if (tp) tp.textContent = ringText();
      });
    }
    if (!reduced) {
      var dust = document.createElement('div'); dust.className = 'pr-dust'; dust.setAttribute('aria-hidden', 'true');
      var n = lite ? 10 : 22, h = '';
      for (var k = 0; k < n; k++) h += '<i style="--x:' + (4 + Math.random() * 92).toFixed(1) + '%;--y:' + (8 + Math.random() * 78).toFixed(1) + '%;--t:' + (3.2 + Math.random() * 3.5).toFixed(1) + 's;--d:' + (-Math.random() * 6).toFixed(1) + 's"></i>';
      dust.innerHTML = h;
      coverEl.appendChild(dust);
    }
  }

  /* =============================================================
     ROYAL REVEAL — the scene that plays after the seal is tapped
     ============================================================= */
  var rv = null, wave = null, revealActive = false, revealDone = false, sparkTimer = 0, exitTimer = 0, canSkip = false;

  function buildReveal() {
    if (rv) return;
    rv = document.createElement('div');
    rv.id = 'pr-reveal'; rv.setAttribute('aria-hidden', 'true');
    var petals = '';
    if (!reduced) {
      for (var i = 0; i < 16; i++) {
        petals += '<i class="pr-rv-petal" style="--x:' + (4 + Math.random() * 92).toFixed(1) + '%;--d:' +
          (Math.random() * 1.3).toFixed(2) + 's;--rz:' + (Math.random() * 40 - 20).toFixed(0) + 'deg"></i>';
      }
    }
    rv.innerHTML = '<div class="pr-rv-halo"></div><div class="pr-rv-mandala">' + mandalaSVG(.5) + '</div>' +
      '<div class="pr-rv-gate-scene">' +
      '<div class="pr-rv-gate left"><i class="pr-rv-fringe"></i></div>' +
      '<div class="pr-rv-gate right"><i class="pr-rv-fringe"></i></div></div>' +
      '<div class="pr-rv-petals">' + petals + '</div>' +
      '<div class="pr-rv-content"><h2 class="pr-rv-names"></h2><div class="pr-rv-line"></div>' +
      '<div class="pr-rv-place"></div></div><div class="pr-rv-skip"></div>';
    document.body.appendChild(rv);
    wave = document.createElement('div'); wave.id = 'pr-wave'; wave.setAttribute('aria-hidden', 'true');
    document.body.appendChild(wave);
    rv.addEventListener('click', function () { if (canSkip) exitReveal(); });
  }

  function fillReveal() {
    var hi = isHindi();
    rv.querySelector('.pr-rv-names').textContent = hi ? 'पीयूष & रिया' : 'Peeyush & Ria';
    rv.querySelector('.pr-rv-place').textContent = hi ? 'हमारे विवाह के निमंत्रण में आपका स्वागत है' : 'Welcome to our wedding invitation';
    rv.querySelector('.pr-rv-skip').textContent = hi ? 'आगे बढ़ने के लिए टैप करें' : 'Tap to continue';
  }

  function heroName() { return document.querySelector('main section h2'); }

  var crack = null;
  function buildCrack() {
    if (crack) return;
    crack = document.createElement('div');
    crack.id = 'pr-crack'; crack.setAttribute('aria-hidden', 'true');
    crack.innerHTML = '<i class="pr-crack-core"></i><i class="pr-crack-ring"></i>' +
      '<i class="pr-crack-shard a"></i><i class="pr-crack-shard b"></i><i class="pr-crack-shard c"></i><i class="pr-crack-shard d"></i>';
    document.body.appendChild(crack);
  }

  function startReveal() {
    if (revealActive || revealDone) return;
    revealActive = true;
    if (reduced) { setTimeout(runOpen, 1500); return; }
    buildReveal();
    var r = sealBtn ? sealBtn.getBoundingClientRect() : null;
    var cx = r ? r.left + r.width / 2 : innerWidth / 2;
    var cy = r ? r.top + r.height / 2 : innerHeight * 0.4;
    rv.style.setProperty('--sx', cx + 'px');
    rv.style.setProperty('--sy', cy + 'px');
    // the seal cracking open: an instant burst of gold light right where the guest tapped
    buildCrack();
    crack.style.left = cx + 'px'; crack.style.top = cy + 'px';
    crack.classList.remove('go'); void crack.offsetWidth; crack.classList.add('go');
    if (fx) fx.burst(cx, cy, 46, .85);
    setTimeout(function () {
      if (revealDone) return;
      fillReveal();
      var h = heroName(); if (h) h.classList.add('pr-wipe-wait');
      window.scrollTo(0, 0);
      rv.classList.remove('pr-out');
      rv.classList.add('pr-on');
      // gentle gold dust while the names appear
      sparkTimer = setInterval(function () {
        if (!fx) return;
        for (var i = 0; i < 2; i++) fx.spark(innerWidth * (.1 + Math.random() * .8), innerHeight * (.12 + Math.random() * .6));
      }, 120);
      // light breaking through as the curtains part, then a bigger burst once the names land
      setTimeout(function () { if (fx && !revealDone) fx.burst(innerWidth * .5, innerHeight * .46, 45, .8); }, 950);
      setTimeout(function () { if (fx && !revealDone) fx.burst(innerWidth * .5, innerHeight * .46, 90, 1.1); }, 1650);
      setTimeout(function () { canSkip = true; }, 1900);
      exitTimer = setTimeout(exitReveal, 3700);
    }, 280);
  }

  function exitReveal() {
    if (revealDone || !rv) return;
    revealDone = true; canSkip = false;
    clearInterval(sparkTimer); clearTimeout(exitTimer);
    rv.classList.add('pr-out');
    if (wave) { wave.classList.remove('go'); void wave.offsetWidth; wave.classList.add('go'); }
    if (fx) {
      fx.burst(innerWidth * .25, innerHeight * .3, 60, 1.05);
      setTimeout(function () { fx.burst(innerWidth * .75, innerHeight * .26, 60, 1.05); }, 220);
      setTimeout(function () { fx.burst(innerWidth * .5, innerHeight * .2, 80, 1.15); }, 440);
    }
    setTimeout(function () { rv.classList.remove('pr-on', 'pr-out'); rv.style.display = 'none'; }, 1000);
    runOpen(300);
  }

  /* shared "the page is now visible" sequence */
  var opened = false;
  function runOpen(delay) {
    var d = delay || 0;
    // always un-hide the hero name, even on replay — only the one-time decor below is guarded
    setTimeout(function () {
      var h = heroName();
      if (h) { h.classList.remove('pr-hero-entrance', 'pr-name-glow', 'pr-wipe-wait'); if (!reduced) h.classList.add('pr-wipe'); }
    }, d);
    if (opened) return;
    opened = true;
    if (reduced) return;
    if (!revealDone) setTimeout(function () { showStars(lite ? 3 : 5, [.12, .45]); }, d);
    setTimeout(buildGarland, d + 1100);
  }

  function watchOpen(main) {
    // safety net: if the reveal never ran (e.g. the cover could not be found) still finish the opening
    function check() {
      if (/opacity-100/.test(main.className) && !revealActive) setTimeout(function () { if (!revealActive) runOpen(300); }, 1200);
    }
    new MutationObserver(check).observe(main, { attributes: true, attributeFilter: ['class'] });
    check();
  }

  /* =============================================================
     TAP SPARKLES on empty space + pointer trail
     ============================================================= */
  function setupPointerFX() {
    if (reduced) return;
    var last = 0;
    if (fine && !lite) {
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
     LANGUAGE — remembered between visits, and kept in <html lang>
     ============================================================= */
  function isHindi() {
    var h = document.querySelector('main article h3');
    return !!h && /[\u0900-\u097F]/.test(h.textContent);
  }
  function ringText() {
    return isHindi()
      ? '\u0938\u0947\u0935 \u0926 \u0921\u0947\u091F \u2726 14 \u00B7 15 \u00B7 16 \u092B\u093C\u0930\u0935\u0930\u0940 2027 \u2726 \u091C\u092F\u092A\u0941\u0930 \u2726 \u092A\u0940\u092F\u0942\u0937 \u0914\u0930 \u0930\u093F\u092F\u093E \u2726 '
      : 'SAVE THE DATE \u2726 14 \u00B7 15 \u00B7 16 FEBRUARY 2027 \u2726 JAIPUR \u2726 PEEYUSH & RIA \u2726 ';
  }

  var lastLang = 'en';
  var onLangChange = [];
  function setupLanguage() {
    var saved = lsGet('pr-lang');
    if (saved === 'hi') {
      var btn = $$('button').filter(function (b) { return /हिंदी/.test(b.textContent); })[0];
      if (btn) btn.click();
    }
    setInterval(function () {
      var now = isHindi() ? 'hi' : 'en';
      if (now === lastLang) return;
      lastLang = now;
      document.documentElement.lang = now;
      lsSet('pr-lang', now);
      onLangChange.forEach(function (fn) { fn(); });
    }, 400);
  }

  /* =============================================================
     GUEST TOOLS — add to calendar, share, optional WhatsApp RSVP
     ============================================================= */
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function utcStamp(d, addMins) {
    // d = [y, m, day, hh, mm] in IST  ->  UTC stamp
    var t = new Date(Date.UTC(d[0], d[1] - 1, d[2], d[3], d[4]) - 330 * 60000 + (addMins || 0) * 60000);
    return t.getUTCFullYear() + pad(t.getUTCMonth() + 1) + pad(t.getUTCDate()) + 'T' +
      pad(t.getUTCHours()) + pad(t.getUTCMinutes()) + '00Z';
  }
  function localStamp(d, addMins) {
    var t = new Date(Date.UTC(d[0], d[1] - 1, d[2], d[3], d[4]) + (addMins || 0) * 60000);
    return t.getUTCFullYear() + pad(t.getUTCMonth() + 1) + pad(t.getUTCDate()) + 'T' +
      pad(t.getUTCHours()) + pad(t.getUTCMinutes()) + '00';
  }
  function icsEsc(s) { return String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n'); }

  function buildICS(list) {
    var now = new Date();
    var stamp = now.getUTCFullYear() + pad(now.getUTCMonth() + 1) + pad(now.getUTCDate()) + 'T' +
      pad(now.getUTCHours()) + pad(now.getUTCMinutes()) + pad(now.getUTCSeconds()) + 'Z';
    var lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Peeyush and Ria Wedding//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'];
    list.forEach(function (ev) {
      lines.push('BEGIN:VEVENT',
        'UID:pr-' + ev.id + '-2027@wedding-invitation',
        'DTSTAMP:' + stamp,
        'DTSTART:' + utcStamp(ev.d, 0),
        'DTEND:' + utcStamp(ev.d, ev.mins),
        'SUMMARY:' + icsEsc(ev.en + ' – ' + COUPLE),
        'LOCATION:' + icsEsc(VENUE),
        'DESCRIPTION:' + icsEsc('You are warmly invited to the ' + ev.en + ' of ' + COUPLE + '.'),
        'BEGIN:VALARM', 'TRIGGER:-P1D', 'ACTION:DISPLAY', 'DESCRIPTION:Tomorrow – ' + icsEsc(ev.en), 'END:VALARM',
        'BEGIN:VALARM', 'TRIGGER:-PT3H', 'ACTION:DISPLAY', 'DESCRIPTION:' + icsEsc(ev.en) + ' starts in 3 hours', 'END:VALARM',
        'END:VEVENT');
    });
    lines.push('END:VCALENDAR');
    return lines.join('\r\n');
  }

  function downloadICS(list, filename) {
    var blob = new Blob([buildICS(list)], { type: 'text/calendar;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = filename; a.style.display = 'none';
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 1500);
  }

  function googleLink(ev) {
    return 'https://calendar.google.com/calendar/render?action=TEMPLATE' +
      '&text=' + encodeURIComponent(ev.en + ' – ' + COUPLE) +
      '&dates=' + localStamp(ev.d, 0) + '/' + localStamp(ev.d, ev.mins) +
      '&ctz=Asia/Kolkata' +
      '&location=' + encodeURIComponent(VENUE) +
      '&details=' + encodeURIComponent('You are warmly invited to the ' + ev.en + ' of ' + COUPLE + '.');
  }

  var toastEl = null, toastTimer = 0;
  function toast(msg) {
    if (!toastEl) { toastEl = document.createElement('div'); toastEl.id = 'pr-toast'; toastEl.setAttribute('role', 'status'); document.body.appendChild(toastEl); }
    toastEl.textContent = msg;
    toastEl.classList.add('on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('on'); }, 2600);
  }

  var STR = {
    eyebrow: ['Save the dates', 'तारीखें सहेजें'],
    title: ['Add to your calendar', 'अपने कैलेंडर में जोड़ें'],
    add: ['＋ Add', '＋ जोड़ें'],
    all: ['Add all 5 events', 'सभी 5 कार्यक्रम जोड़ें'],
    share: ['Share invitation', 'निमंत्रण साझा करें'],
    rsvp: ['RSVP on WhatsApp', 'व्हाट्सऐप पर आरएसवीपी करें'],
    copied: ['Link copied', 'लिंक कॉपी हो गया'],
    addTitle: ['Download calendar file', 'कैलेंडर फ़ाइल डाउनलोड करें'],
    gTitle: ['Add to Google Calendar', 'Google कैलेंडर में जोड़ें'],
    shareText: ['You are invited to the wedding of Peeyush & Ria – 14, 15 & 16 February 2027, Jaipur.',
                'पीयूष और रिया के विवाह में आप सादर आमंत्रित हैं – 14, 15 और 16 फरवरी 2027, जयपुर।'],
    rsvpText: ['Hello! I will be attending the wedding of Peeyush & Ria.\nName:\nNumber of guests:\nEvents I will attend:',
               'नमस्ते! मैं पीयूष और रिया के विवाह में शामिल होऊँगा/होऊँगी।\nनाम:\nमेहमानों की संख्या:\nजिन कार्यक्रमों में आऊँगा/आऊँगी:']
  };
  function T(key) { return STR[key][isHindi() ? 1 : 0]; }

  function shareInvite() {
    var url = location.href.split('#')[0];
    var data = { title: COUPLE + ' – Wedding Invitation', text: T('shareText'), url: url };
    if (navigator.share) { navigator.share(data).catch(function () {}); return; }
    var done = function () { toast(T('copied')); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(data.text + ' ' + url).then(done, done);
    else done();
  }

  function mk(tag, cls, text, attrs) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    if (attrs) for (var k in attrs) n.setAttribute(k, attrs[k]);
    return n;
  }

  function renderGuestTools(sec) {
    var hi = isHindi() ? 1 : 0;
    sec.textContent = '';
    sec.appendChild(mk('p', 'pr-gt-eyebrow', T('eyebrow')));
    sec.appendChild(mk('h3', 'pr-gt-title', T('title')));

    var list = mk('div', 'pr-gt-list');
    EVENTS.forEach(function (ev) {
      var row = mk('div', 'pr-gt-row');
      var info = mk('div', 'pr-gt-info');
      info.appendChild(mk('div', 'pr-gt-name', hi ? ev.hi : ev.en));
      info.appendChild(mk('div', 'pr-gt-when', hi ? ev.whenHi : ev.whenEn));
      var acts = mk('div', 'pr-gt-actions');
      var add = mk('button', 'pr-btn pr-btn-gold', T('add'), { type: 'button', title: T('addTitle'), 'aria-label': T('addTitle') + ': ' + ev.en });
      add.addEventListener('click', function () { downloadICS([ev], 'peeyush-ria-' + ev.id + '.ics'); });
      var g = mk('a', 'pr-btn pr-btn-ghost pr-btn-round', 'G', { href: googleLink(ev), target: '_blank', rel: 'noopener noreferrer', title: T('gTitle'), 'aria-label': T('gTitle') + ': ' + ev.en });
      acts.appendChild(add); acts.appendChild(g);
      row.appendChild(info); row.appendChild(acts);
      list.appendChild(row);
    });
    sec.appendChild(list);

    var all = mk('button', 'pr-btn pr-btn-gold pr-btn-block', T('all'), { type: 'button' });
    all.addEventListener('click', function () { downloadICS(EVENTS, 'peeyush-ria-wedding.ics'); });
    sec.appendChild(all);

    var row2 = mk('div', 'pr-gt-actions2');
    var sh = mk('button', 'pr-btn pr-btn-ghost pr-btn-block', '↗ ' + T('share'), { type: 'button' });
    sh.addEventListener('click', shareInvite);
    row2.appendChild(sh);
    if (RSVP_WHATSAPP) {
      var rs = mk('a', 'pr-btn pr-btn-ghost pr-btn-block', '✉ ' + T('rsvp'), {
        href: 'https://wa.me/' + String(RSVP_WHATSAPP).replace(/\D/g, '') + '?text=' + encodeURIComponent(T('rsvpText')),
        target: '_blank', rel: 'noopener noreferrer' });
      row2.appendChild(rs);
    }
    sec.appendChild(row2);
  }

  /* =============================================================
     COUPLE PHOTOS — portrait added above each card's existing content
     ============================================================= */
  function setupCouplePhotos(main) {
    if (document.querySelector('.pr-couple-photo-wrap')) return;
    var pics = [
      { sel: '[data-en="The Groom"]', src: 'assets/images/groom-portrait.jpg', alt: 'Peeyush' },
      { sel: '[data-en="The Bride"]', src: 'assets/images/bride-portrait.jpg', alt: 'Ria' }
    ];
    pics.forEach(function (p) {
      var label = main.querySelector(p.sel);
      if (!label || !label.parentNode) return;
      var card = label.parentNode;
      var wrap = document.createElement('div');
      wrap.className = 'pr-couple-photo-wrap';
      var img = document.createElement('img');
      img.className = 'pr-couple-photo';
      img.src = p.src;
      img.alt = p.alt;
      img.loading = 'lazy';
      wrap.appendChild(img);
      card.appendChild(wrap);
      var h3 = card.querySelector('h3');
      if (h3) {
        var top = h3.offsetTop + h3.offsetHeight / 2 - wrap.offsetHeight / 2;
        wrap.style.top = Math.max(14, Math.round(top)) + 'px';
      }
    });
  }

  /* =============================================================
     EVENT THEMES — each ceremony card gets a colour tint + custom icon
     ============================================================= */
  var EVENT_THEME = {
    tilak: {
      accent: 'linear-gradient(90deg, #D4AF37, #B8952F, #8B3A3A)',
      accentV: 'linear-gradient(180deg, #D4AF37, #B8952F, #8B3A3A)',
      border: 'rgba(139,58,58,.35)',
      bg: 'linear-gradient(180deg, #FFFBF5 0%, #FDF3EC 100%)',
      photo: 'assets/images/tilak-theme.jpg', swatch: '#FDF3EC',
      photoOverlay: 'linear-gradient(180deg, rgba(255,251,240,.3) 0%, rgba(255,251,240,.22) 50%, rgba(255,251,240,.34) 100%)'
    },
    sangeet: {
      accent: 'linear-gradient(90deg, #D4AF37, #6B3F69, #3E2A52)',
      accentV: 'linear-gradient(180deg, #D4AF37, #6B3F69, #3E2A52)',
      border: 'rgba(212,175,55,.4)',
      bg: 'linear-gradient(180deg, #FDF6FB 0%, #F7ECF5 100%)',
      photo: 'assets/images/sangeet-theme.jpg', swatch: '#120B16',
      photoOverlay: 'linear-gradient(180deg, rgba(12,8,14,.4) 0%, rgba(10,7,12,.46) 50%, rgba(10,7,12,.58) 100%)',
      lightText: true, label: '#F0D9A8', value: '#FFF6E8', text: 'rgba(255,245,232,.92)', themeVal: '#F0CB63'
    },
    haldi: {
      accent: 'linear-gradient(90deg, #A7B6E0, #C9B8E8, #8FA3D6)',
      accentV: 'linear-gradient(180deg, #A7B6E0, #C9B8E8, #8FA3D6)',
      border: 'rgba(145,130,210,.35)',
      bg: 'linear-gradient(180deg, #F8F7FF 0%, #F1EEFC 100%)',
      photo: 'assets/images/haldi-theme.jpg', swatch: '#F1EEFC',
      photoOverlay: 'linear-gradient(180deg, rgba(248,247,255,.3) 0%, rgba(248,247,255,.22) 50%, rgba(248,247,255,.34) 100%)'
    },
    mehendi: {
      accent: 'linear-gradient(90deg, #7C9A6B, #A9C08E, #577049)',
      accentV: 'linear-gradient(180deg, #7C9A6B, #A9C08E, #577049)',
      border: 'rgba(90,120,70,.35)',
      bg: 'linear-gradient(180deg, #F8FBF3 0%, #EFF6E6 100%)',
      photo: 'assets/images/mehendi-theme.jpg', swatch: '#EFF6E6',
      photoOverlay: 'linear-gradient(180deg, rgba(248,251,243,.3) 0%, rgba(248,251,243,.22) 50%, rgba(248,251,243,.34) 100%)'
    },
    wedding: {
      accent: 'linear-gradient(90deg, #D4AF37, #8B3A3A, #B8952F)',
      accentV: 'linear-gradient(180deg, #D4AF37, #8B3A3A, #B8952F)',
      border: 'rgba(139,58,58,.4)',
      bg: 'linear-gradient(180deg, #FFFDF7 0%, #FBF0E0 100%)',
      photo: 'assets/images/wedding-theme.jpg', swatch: '#FBF0E0',
      photoOverlay: 'linear-gradient(180deg, rgba(255,253,247,.3) 0%, rgba(255,253,247,.22) 50%, rgba(255,253,247,.34) 100%)'
    }
  };
  function setupEventThemes(main) {
    if (document.body.classList.contains('pr-ev-themed')) return;
    function applyPhoto(art, theme) {
      art.style.backgroundColor = theme.swatch;
      art.style.backgroundImage = theme.photoOverlay + ', url(' + theme.photo + ')';
      art.style.backgroundSize = 'cover, cover';
      art.style.backgroundPosition = 'center, center';
      art.style.backgroundRepeat = 'no-repeat, no-repeat';
    }
    var io = ('IntersectionObserver' in window) ? new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        applyPhoto(entry.target, entry.target.__prTheme);
        io.unobserve(entry.target);
      });
    }, { rootMargin: '300px 0px' }) : null;
    EVENTS.forEach(function (ev) {
      var theme = EVENT_THEME[ev.id];
      var art = findEventArticle(ev);
      if (!theme || !art) return;
      art.classList.add('pr-ev-' + ev.id);
      art.style.background = theme.bg;
      if (theme.photo) {
        art.classList.add('pr-ev-photo');
        if (theme.lightText) art.classList.add('pr-ev-light-text');
        if (io) { art.__prTheme = theme; io.observe(art); } else { applyPhoto(art, theme); }
      }
      art.style.borderColor = theme.border;
      var topBar = art.querySelector('div[class*="h-[4px]"]');
      if (topBar) topBar.style.background = theme.accent;
      var leftBar = art.querySelector('div[class*="w-[4px]"]');
      if (leftBar) leftBar.style.background = theme.accentV;
      var bigGlyph = art.querySelector('div[class*="rotate-12"]');
      if (bigGlyph && theme.photo) bigGlyph.style.display = 'none';
      var glowBlur = art.querySelector('div[class*="blur-["]');
      if (glowBlur && theme.photo) glowBlur.style.display = 'none';
      if (theme.lightText) {
        art.style.setProperty('--label', theme.label);
        var lightEls = art.querySelectorAll('[class*="text-[#3E4A33]"]');
        for (var i = 0; i < lightEls.length; i++) lightEls[i].style.color = theme.value;
        var descEl = art.querySelector('p[class*="text-[#6B6355]"]');
        if (descEl) descEl.style.color = theme.text;
        var themeValEl = art.querySelector('p[class*="text-[#B8952F]"]');
        if (themeValEl) themeValEl.style.color = theme.themeVal;
      }
    });
    document.body.classList.add('pr-ev-themed');
  }

  /* =============================================================
     VENUE MAP — a real, lazy-loaded Google Maps embed on the Venue card
     ============================================================= */
  var VENUE_MAP_QUERY = 'JHARKHAND+PALACE+WEDDING+RESORT+Opposite+Vinayak+City+Sirsi+Road+Bindayaka+Jaipur+302041';
  function findFullAddressBox(venueSec) {
    var ps = venueSec.querySelectorAll('p.small-caps');
    for (var i = 0; i < ps.length; i++) {
      var t = ps[i].textContent.trim();
      if (t === 'Full Address' || t === 'पूरा पता') return ps[i].parentNode;
    }
    return null;
  }
  function setupVenueMap() {
    if (document.querySelector('.pr-venue-map')) return;
    var venueSec = findVenueSection();
    if (!venueSec) return;
    var box = findFullAddressBox(venueSec);
    if (!box || !box.parentNode) return;
    var wrap = document.createElement('div');
    wrap.className = 'pr-venue-map';
    var ph = document.createElement('div');
    ph.className = 'pr-venue-map-ph';
    ph.textContent = isHindi() ? 'मानचित्र लोड हो रहा है…' : 'Loading map…';
    wrap.appendChild(ph);
    box.parentNode.insertBefore(wrap, box);
    onLangChange.push(function () {
      if (wrap.querySelector('.pr-venue-map-ph')) ph.textContent = isHindi() ? 'मानचित्र लोड हो रहा है…' : 'Loading map…';
    });
    var io = ('IntersectionObserver' in window) ? new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var iframe = document.createElement('iframe');
        iframe.src = 'https://www.google.com/maps?q=' + VENUE_MAP_QUERY + '&output=embed';
        iframe.loading = 'lazy';
        iframe.setAttribute('allowfullscreen', '');
        iframe.setAttribute('referrerpolicy', 'no-referrer-when-downgrade');
        iframe.title = 'Jharkhand Palace And Resort — map location';
        wrap.innerHTML = '';
        wrap.appendChild(iframe);
        io.unobserve(wrap);
      });
    }, { rootMargin: '300px 0px' }) : null;
    if (io) io.observe(wrap); else {
      var iframe2 = document.createElement('iframe');
      iframe2.src = 'https://www.google.com/maps?q=' + VENUE_MAP_QUERY + '&output=embed';
      iframe2.title = 'Jharkhand Palace And Resort — map location';
      wrap.innerHTML = ''; wrap.appendChild(iframe2);
    }
  }

  /* =============================================================
     QUICK NAV — a small floating menu to jump straight to any section
     ============================================================= */
  var STR_NAV = {
    label: ['Jump to', 'यहाँ जाएं'],
    hero: ['Welcome', 'स्वागत'],
    couple: ['The Couple', 'वर-वधू'],
    venue: ['Venue', 'स्थल'],
    rsvp: ['Save the Date & RSVP', 'तारीख व आरएसवीपी']
  };
  function navLabel(key) { return STR_NAV[key][isHindi() ? 1 : 0]; }

  function findEventArticle(ev) {
    var heads = $$('main article h3');
    for (var i = 0; i < heads.length; i++) {
      var t = heads[i].textContent.trim();
      if (t === ev.en || t === ev.hi) return heads[i].closest('article');
    }
    return null;
  }
  function findVenueSection() {
    var heads = $$('main h3');
    for (var i = 0; i < heads.length; i++) {
      var t = heads[i].textContent.trim();
      if (t === 'Jharkhand Palace And Resort' || t === 'झारखंड पैलेस एंड रिसॉर्ट') {
        return heads[i].closest('section') || heads[i].parentElement;
      }
    }
    return null;
  }

  function setupNav(main) {
    if (document.getElementById('pr-nav')) return;
    var targets = [];
    var hero = main.querySelector('section');
    if (hero) targets.push({ labelFn: function () { return navLabel('hero'); }, el: hero });
    var couple = main.querySelector('.grid.gap-3.mb-7');
    if (couple) targets.push({ labelFn: function () { return navLabel('couple'); }, el: couple });
    EVENTS.forEach(function (ev) {
      var el = findEventArticle(ev);
      if (el) targets.push({ labelFn: function () { return isHindi() ? ev.hi : ev.en; }, el: el });
    });
    var venueEl = findVenueSection();
    if (venueEl) targets.push({ labelFn: function () { return navLabel('venue'); }, el: venueEl });
    var guestTools = document.getElementById('pr-guest-tools');
    if (guestTools) targets.push({ labelFn: function () { return navLabel('rsvp'); }, el: guestTools });
    if (targets.length < 2) return;

    var nav = document.createElement('div');
    nav.id = 'pr-nav';
    var fab = document.createElement('button');
    fab.id = 'pr-nav-fab'; fab.type = 'button'; fab.setAttribute('aria-expanded', 'false');
    fab.innerHTML = '<span></span><span></span><span></span>';
    var menu = document.createElement('div');
    menu.id = 'pr-nav-menu'; menu.setAttribute('role', 'menu');
    var list = document.createElement('div'); list.className = 'pr-nav-list';
    menu.appendChild(list); nav.appendChild(menu); nav.appendChild(fab);
    document.body.appendChild(nav);

    var open = false;
    function closeMenu() { open = false; nav.classList.remove('pr-nav-open'); fab.setAttribute('aria-expanded', 'false'); }
    function openMenu() { open = true; nav.classList.add('pr-nav-open'); fab.setAttribute('aria-expanded', 'true'); }

    function renderList() {
      list.innerHTML = '';
      fab.setAttribute('aria-label', navLabel('label'));
      targets.forEach(function (t) {
        var btn = mk('button', 'pr-nav-item', t.labelFn(), { type: 'button' });
        btn.addEventListener('click', function () {
          closeMenu();
          setTimeout(function () { t.el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' }); }, reduced ? 0 : 180);
        });
        list.appendChild(btn);
      });
    }
    renderList();
    onLangChange.push(renderList);

    fab.addEventListener('click', function () { if (open) closeMenu(); else openMenu(); });
    document.addEventListener('click', function (e) { if (open && !nav.contains(e.target)) closeMenu(); }, true);

    // only show the nav once the invitation has actually opened
    var tries2 = 0;
    var revealTimer = setInterval(function () {
      if (opened) { nav.classList.add('pr-nav-ready'); clearInterval(revealTimer); }
      else if (++tries2 > 200) clearInterval(revealTimer);
    }, 150);
  }

  function setupGuestTools(main) {
    if (document.getElementById('pr-guest-tools')) return;
    var sec = document.createElement('div');   // a div (not section) so the built-in section effects don't double up
    sec.id = 'pr-guest-tools';
    renderGuestTools(sec);
    var footer = main.querySelector('footer');
    if (footer && footer.parentNode) footer.parentNode.insertBefore(sec, footer); else main.appendChild(sec);
    onLangChange.push(function () { renderGuestTools(sec); });
  }

  /* =============================================================
     SCRATCH CARD — a heart you scratch to reveal the save-the-date
     ============================================================= */
  var STR_SCRATCH = {
    eyebrow: ['A little surprise', 'एक छोटी सी सौगात'],
    prompt: ['Scratch', 'स्क्रैच'],
    heading: ['Save the Date', 'यह तारीख सहेजें'],
    dates: ['16', '16'],
    month: ['February 2027', 'फरवरी 2027'],
    place: ['Jaipur, Rajasthan', 'जयपुर, राजस्थान'],
    tag: ['#PyaaRkaaSafar', '#PyaaRkaaSafar'],
    hint: ['Swipe your finger across the card', 'कार्ड पर अपनी उंगली घुमाएँ']
  };
  function TS(key) { return STR_SCRATCH[key][isHindi() ? 1 : 0]; }

  function renderScratchContent(sec) {
    sec.innerHTML =
      '<p class="pr-gt-eyebrow">' + TS('eyebrow') + '</p>' +
      '<div class="pr-scratch-card">' +
        '<div class="pr-scratch-reveal">' +
          '<img class="pr-scratch-photo" src="assets/images/couple-illustration.jpg" alt="Peeyush and Ria">' +
          '<div class="pr-scratch-caption">' +
            '<p class="pr-scratch-heading">' + TS('heading') + '</p>' +
            '<p class="pr-scratch-dates">' + TS('dates') + '</p>' +
            '<p class="pr-scratch-month">' + TS('month') + '</p>' +
            '<p class="pr-scratch-place">' + TS('place') + '</p>' +
            '<p class="pr-scratch-tag">' + TS('tag') + '</p>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<p class="pr-scratch-hint">' + TS('hint') + '</p>';
  }

  function setupScratchCanvas(card) {
    var canvas = document.createElement('canvas');
    canvas.className = 'pr-scratch-canvas'; canvas.setAttribute('aria-hidden', 'true');
    card.appendChild(canvas);
    var ctx = canvas.getContext('2d');
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    var W = 0, H = 0, revealed = false, scratching = false, moveCount = 0;

    function draw() {
      ctx.clearRect(0, 0, W, H);
      // the ENTIRE card is opaque until scratched — the heart below is just a decorative hint,
      // never a clip mask, so nothing can peek out around it on any screen size.
      var g = ctx.createLinearGradient(0, 0, W, H);
      g.addColorStop(0, '#4C5A40'); g.addColorStop(1, '#2A331F');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = 'rgba(232,213,160,.35)';
      for (var i = 0; i < Math.round((W * H) / 900); i++) {
        ctx.beginPath();
        ctx.arc(Math.random() * W, Math.random() * H, Math.random() * 1.3 + .3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#F3E9C8'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = '600 14px Inter, sans-serif';
      ctx.fillText(TS('prompt').toUpperCase(), W / 2, H * 0.5);
      ctx.textBaseline = 'alphabetic';
    }

    function applySize(w, h) {
      if (w <= 0 || h <= 0 || revealed) return;
      W = w; H = h;
      canvas.width = Math.max(1, Math.round(W * dpr)); canvas.height = Math.max(1, Math.round(H * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw();
    }
    if (window.ResizeObserver) {
      new ResizeObserver(function (entries) {
        var r = entries[0].contentRect;
        applySize(r.width, r.height);
      }).observe(card);
    } else {
      var fallback = function () { var r = card.getBoundingClientRect(); applySize(r.width, r.height); };
      fallback();
      addEventListener('resize', fallback);
    }

    function posFromEvent(e) {
      var r = canvas.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    }
    function scratchAt(x, y) {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath(); ctx.arc(x, y, 24, 0, Math.PI * 2); ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
    }
    function checkCleared() {
      if (revealed) return;
      var data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      var total = 0, cleared = 0;
      for (var i = 3; i < data.length; i += 4 * 23) { total++; if (data[i] < 40) cleared++; }
      if (total && cleared / total > 0.48) revealAll();
    }
    function revealAll() {
      revealed = true;
      card.classList.add('pr-scratched');
      canvas.style.opacity = '0'; canvas.style.transform = 'scale(1.05)';
      setTimeout(function () { if (canvas.parentNode) canvas.parentNode.removeChild(canvas); }, 650);
    }
    function start(e) { if (revealed) return; scratching = true; var p = posFromEvent(e); scratchAt(p.x, p.y); e.preventDefault(); }
    function move(e) {
      if (!scratching || revealed) return;
      var p = posFromEvent(e); scratchAt(p.x, p.y);
      if (++moveCount % 4 === 0) checkCleared();
      e.preventDefault();
    }
    function stop() { scratching = false; }
    canvas.addEventListener('pointerdown', start);
    canvas.addEventListener('pointermove', move);
    canvas.addEventListener('pointerup', stop);
    canvas.addEventListener('pointercancel', stop);
    canvas.addEventListener('pointerleave', stop);
    onLangChange.push(function () { if (!revealed && W && H) draw(); });
  }

  function setupScratchSection(main) {
    if (document.getElementById('pr-scratch')) return;
    var sec = document.createElement('div');
    sec.id = 'pr-scratch';
    renderScratchContent(sec);
    var hero = main.querySelector('section');
    if (hero && hero.parentNode) hero.parentNode.insertBefore(sec, hero.nextSibling); else main.insertBefore(sec, main.firstChild);
    setupScratchCanvas(sec.querySelector('.pr-scratch-card'));
    onLangChange.push(function () {
      var eyebrow = sec.querySelector('.pr-gt-eyebrow'); if (eyebrow) eyebrow.textContent = TS('eyebrow');
      var hint = sec.querySelector('.pr-scratch-hint'); if (hint) hint.textContent = TS('hint');
      var heading = sec.querySelector('.pr-scratch-heading'); if (heading) heading.textContent = TS('heading');
      var place = sec.querySelector('.pr-scratch-place'); if (place) place.textContent = TS('place');
      var month = sec.querySelector('.pr-scratch-month'); if (month) month.textContent = TS('month');
    });
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
      if (main && main.querySelector('footer')) {
        clearInterval(t);
        setupCover();
        setupScratchSection(main);
        setupGuestTools(main);
        setupReveals(); setupTilt(); setupCountdown(); watchOpen(main);
        setupCouplePhotos(main);
        setupEventThemes(main);
        setupVenueMap();
        setupNav(main);
        setupLanguage();
      } else if (tries > 80) { clearInterval(t); }
    }, 150);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
