/* Próspera: movimento da página.
   Um sol atravessa as dobras, as faixas do logo se abrem em mapa
   e cada seção chega como uma colina. Sem GSAP ou com movimento
   reduzido, tudo fica estático e completo. */
(function () {
  'use strict';

  var doc = document;
  var html = doc.documentElement;
  var D = window.PROSPERA_DATA || {};
  var $ = function (s, c) { return (c || doc).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || doc).querySelectorAll(s)); };
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var motion = !!(window.gsap && window.ScrollTrigger) && !reduce;
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  var clamp01 = function (v) { return v < 0 ? 0 : v > 1 ? 1 : v; };
  var narrow = function () { return window.innerWidth <= 900; };

  window.__prospera = true;
  if (!motion) html.classList.remove('movimento');

  /* ---------- Topo ---------- */

  var topo = $('#topo');
  var nav = $('#nav');
  var menuBtn = $('.topo-menu');
  var onScrollTop = function () { topo.classList.toggle('rolou', window.scrollY > 24); };
  window.addEventListener('scroll', onScrollTop, { passive: true });
  onScrollTop();

  var closeMenu = function () { nav.classList.remove('aberto'); menuBtn.setAttribute('aria-expanded', 'false'); };
  menuBtn.addEventListener('click', function () {
    var open = nav.classList.toggle('aberto');
    menuBtn.setAttribute('aria-expanded', String(open));
  });
  nav.addEventListener('click', function (e) { if (e.target.closest('a')) closeMenu(); });
  doc.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeMenu(); });

  if ('IntersectionObserver' in window) {
    var links = {};
    $$('.topo-nav a[href^="#"]').forEach(function (a) { links[a.getAttribute('href').slice(1)] = a; });
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        var a = links[en.target.id];
        if (!a) return;
        if (en.isIntersecting) {
          Object.keys(links).forEach(function (k) { links[k].removeAttribute('aria-current'); });
          a.setAttribute('aria-current', 'true');
        } else if (a.getAttribute('aria-current')) {
          a.removeAttribute('aria-current');
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    $$('main section[id]').forEach(function (s) { spy.observe(s); });
  }

  $$('[data-ano]').forEach(function (el) { el.textContent = new Date().getFullYear(); });

  /* ---------- Faixas do logo (hero) ---------- */

  // Cada curva: [controleX, controleY, fimX, fimY], saindo do ponto de fuga v.
  var REST = {
    v: [1500, 480],
    c: [[780, 455, -60, 880], [700, 540, -60, 1050], [800, 545, 330, 960], [930, 585, 800, 960], [1080, 620, 1030, 960], [1300, 660, 1410, 960]]
  };
  var FLOOD = {
    v: [2500, -260],
    c: [[900, -1500, -900, -1300], [800, -700, -900, -420], [-600, -900, -3000, 1000], [2500, 2400, -900, 2400], [2700, 2500, 2300, 2700], [2900, 2600, 2800, 2700]]
  };
  var heroBands = $$('.hero .faixa');
  var heroTrees = $('.hero .cena-arvores');
  var bandState = { o0: 1, o1: 1, o2: 1, flood: 0 };

  function renderBands() {
    var t = bandState.flood;
    var vx = lerp(REST.v[0], FLOOD.v[0], t), vy = lerp(REST.v[1], FLOOD.v[1], t);
    for (var i = 0; i < 3; i++) {
      var a = REST.c[i * 2], b = REST.c[i * 2 + 1], o = bandState['o' + i], ca = [], cb = [];
      for (var k = 0; k < 4; k++) {
        var mid = (a[k] + b[k]) / 2;
        ca[k] = lerp(lerp(mid, a[k], o), FLOOD.c[i * 2][k], t);
        cb[k] = lerp(lerp(mid, b[k], o), FLOOD.c[i * 2 + 1][k], t);
      }
      heroBands[i].setAttribute('d',
        'M' + vx.toFixed(1) + ' ' + vy.toFixed(1) +
        'Q' + ca[0].toFixed(1) + ' ' + ca[1].toFixed(1) + ' ' + ca[2].toFixed(1) + ' ' + ca[3].toFixed(1) +
        'L' + cb[2].toFixed(1) + ' ' + cb[3].toFixed(1) +
        'Q' + cb[0].toFixed(1) + ' ' + cb[1].toFixed(1) + ' ' + vx.toFixed(1) + ' ' + vy.toFixed(1) + 'Z');
    }
    if (heroTrees && t > 0) heroTrees.style.left = (vx / 16) + '%';
    else if (heroTrees) heroTrees.style.left = '';
  }

  /* ---------- Mapa da propriedade ---------- */

  var mapaFig = $('.mapa');
  var mapaSvg = $('#mapa');
  var marker = { x: 40, y: 95 };
  var mSol, mAnel, mVoo, mVarre, mEscalaTxt, mEscalaLinha;
  var ESCALAS = { sitio: ['50 m', 100], fazenda: ['1 km', 150], loteamento: ['100 m', 120] };

  function buildMap() {
    if (!mapaSvg || !D.mapa) return;
    var m = D.mapa;
    var limite = 'M70 110L250 55L470 80L545 240L520 455L360 545L150 510L60 330Z';
    var zona = 'M84 250L232 170L268 300L262 430L165 492L76 372Z';
    var rio = 'M312 196C322 250 296 300 304 360S292 470 286 549';
    var voo = 'M40 95', dir = 1;
    for (var y = 95; y <= 545; y += 50) {
      voo += 'L' + (dir > 0 ? 560 : 40) + ' ' + y;
      if (y + 50 <= 545) voo += 'A25 25 0 0 ' + (dir > 0 ? 1 : 0) + ' ' + (dir > 0 ? 560 : 40) + ' ' + (y + 50);
      dir = -dir;
    }
    var paths = function (arr) { return arr.map(function (d) { return '<path d="' + d + '"/>'; }).join(''); };
    var lotes = '';
    for (var x = -120; x <= 720; x += 38) lotes += '<path d="M' + x + ' -120V720"/>';
    for (var r = 0, yy = -120; yy <= 720; yy += 62, r++) lotes += '<path' + (r % 2 ? ' class="m-rua"' : '') + ' d="M-120 ' + yy + 'H720"/>';
    var arvores = m.arvores.map(function (p, i) { return '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="3.3" style="--i:' + i + '"/>'; }).join('');

    var keep = mapaSvg.innerHTML;
    mapaSvg.innerHTML = keep +
      '<defs>' +
        '<clipPath id="c-limite"><path d="' + limite + '"/></clipPath>' +
        '<clipPath id="c-zona"><path d="' + zona + '"/></clipPath>' +
        '<clipPath id="c-varre"><rect id="m-varre" x="0" y="0" width="600" height="600"/></clipPath>' +
      '</defs>' +
      '<path class="m-limite" d="' + limite + '"/>' +
      '<path class="m-voo" id="m-voo" d="' + voo + '"/>' +
      '<g clip-path="url(#c-limite)">' +
        '<g clip-path="url(#c-varre)"><g class="m-camada m-curvas">' + paths(m.curvas) + '</g></g>' +
        '<g class="m-variante m-linhas-largas">' + paths(m.linhas) + '</g>' +
        '<g class="m-variante m-lotes" transform="rotate(-14 300 300)">' + lotes + '</g>' +
        '<path class="m-variante m-app" d="' + rio + '"/>' +
        '<g clip-path="url(#c-varre)"><path class="m-camada m-agua" d="' + rio + '"/></g>' +
        '<g class="m-camada m-linhas" clip-path="url(#c-zona)">' + paths(m.linhas) + '</g>' +
        '<path class="m-camada m-acesso" d="M545 240C500 262 480 285 452 296C400 316 350 300 306 318C280 328 262 322 240 330"/>' +
        '<g class="m-camada m-div"><path d="M366 96L384 236"/><path d="M384 236L400 352"/><path d="M400 352L524 402"/><path d="M400 352L372 540"/></g>' +
        '<ellipse class="m-camada m-acude" cx="297" cy="438" rx="24" ry="15"/>' +
        '<g class="m-camada m-casa"><rect x="446" y="282" width="17" height="12" rx="2"/><rect x="468" y="298" width="10" height="10" rx="2"/></g>' +
        '<g class="m-camada m-arvores">' + arvores + '</g>' +
      '</g>' +
      '<g class="m-escala"><line id="m-escala-l" x1="70" y1="578" x2="170" y2="578"/><line x1="70" y1="572" x2="70" y2="584"/><line id="m-escala-f" x1="170" y1="572" x2="170" y2="584"/><text id="m-escala-t" x="70" y="564">50 m</text></g>' +
      '<circle class="m-anel" id="m-anel" cx="40" cy="95" r="9"/>' +
      '<circle class="m-sol" id="m-sol" data-dock="2" cx="40" cy="95" r="9"/>';

    mSol = $('#m-sol'); mAnel = $('#m-anel'); mVoo = $('#m-voo'); mVarre = $('#m-varre');
    mEscalaTxt = $('#m-escala-t'); mEscalaLinha = $('#m-escala-l');
  }

  function placeMarker() {
    if (!mSol) return;
    mSol.setAttribute('cx', marker.x); mSol.setAttribute('cy', marker.y);
    mAnel.setAttribute('cx', marker.x); mAnel.setAttribute('cy', marker.y);
  }

  function setEscala(nome) {
    if (!mapaFig || !ESCALAS[nome]) return;
    mapaFig.dataset.escala = nome;
    if (mEscalaTxt) {
      mEscalaTxt.textContent = ESCALAS[nome][0];
      var x2 = 70 + ESCALAS[nome][1];
      mEscalaLinha.setAttribute('x2', x2);
      $('#m-escala-f').setAttribute('x1', x2); $('#m-escala-f').setAttribute('x2', x2);
    }
    $$('.escala [role="tab"]').forEach(function (b) {
      var on = b.dataset.escala === nome;
      b.setAttribute('aria-selected', String(on));
      b.tabIndex = on ? 0 : -1;
      if (on) $('#painel-escala').setAttribute('aria-labelledby', b.id);
    });
    $$('#painel-escala p').forEach(function (p) { p.hidden = p.dataset.escala !== nome; });
  }

  (function tabs() {
    var list = $('.escala');
    if (!list) return;
    var btns = $$('[role="tab"]', list);
    list.addEventListener('click', function (e) {
      var b = e.target.closest('[role="tab"]');
      if (b) setEscala(b.dataset.escala);
    });
    list.addEventListener('keydown', function (e) {
      var i = btns.indexOf(doc.activeElement);
      if (i < 0) return;
      var n = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? btns.length - 1 : -1;
      if (n < 0 && e.key !== 'ArrowLeft') return;
      e.preventDefault();
      n = (n + btns.length) % btns.length;
      btns[n].focus(); setEscala(btns[n].dataset.escala);
    });
  })();

  /* ---------- Brasil em pontos ---------- */

  var brasilFig = $('.brasil');
  var brasilCv = $('#brasil-pontos');
  var onda = { w: 0 };
  var brasilDist = null, brasilMax = 1;

  function layoutBrasil() {
    if (!brasilFig || !D.brasil) return;
    var b = D.brasil;
    $$('[data-ponto]', brasilFig).forEach(function (el) {
      var p = b.pts[el.dataset.ponto];
      el.style.left = (p[0] / b.w * 100) + '%';
      el.style.top = (p[1] / b.h * 100) + '%';
      var d = Math.hypot(p[0] - b.pts.brasilia[0], p[1] - b.pts.brasilia[1]);
      el.style.transitionDelay = (0.25 + d / 700) + 's';
    });
    var base = $('.brasil-base', brasilFig);
    base.style.left = (b.pts.brasilia[0] / b.w * 100) + '%';
    base.style.top = (b.pts.brasilia[1] / b.h * 100) + '%';

    var svg = $('.brasil-arcos', brasilFig), arcs = '';
    svg.setAttribute('viewBox', '0 0 ' + b.w + ' ' + b.h);
    Object.keys(b.pts).forEach(function (k) {
      if (k === 'brasilia') return;
      var a = b.pts.brasilia, c = b.pts[k];
      var mx = (a[0] + c[0]) / 2, my = (a[1] + c[1]) / 2, dx = c[0] - a[0], dy = c[1] - a[1];
      var d = Math.hypot(dx, dy);
      arcs += '<path pathLength="1" style="transition-delay:' + (0.1 + d / 900) + 's" d="M' + a[0] + ' ' + a[1] + 'Q' + (mx - dy * 0.22).toFixed(1) + ' ' + (my + dx * 0.22).toFixed(1) + ' ' + c[0] + ' ' + c[1] + '"/>';
    });
    svg.innerHTML = arcs;

    brasilDist = b.dots.map(function (p) { return Math.hypot(p[0] - b.pts.brasilia[0], p[1] - b.pts.brasilia[1]); });
    brasilMax = Math.max.apply(null, brasilDist);
  }

  function drawBrasil() {
    if (!brasilCv || !D.brasil || !brasilDist) return;
    var b = D.brasil, dpr = Math.min(window.devicePixelRatio || 1, 2);
    var cw = brasilCv.clientWidth, ch = brasilCv.clientHeight;
    if (!cw) return;
    if (brasilCv.width !== Math.round(cw * dpr)) { brasilCv.width = Math.round(cw * dpr); brasilCv.height = Math.round(ch * dpr); }
    var ctx = brasilCv.getContext('2d'), s = brasilCv.width / b.w;
    ctx.clearRect(0, 0, brasilCv.width, brasilCv.height);
    var w = onda.w;
    for (var i = 0; i < b.dots.length; i++) {
      var r = brasilDist[i] / brasilMax, front = w - r;
      var lit = front > 0;
      ctx.beginPath();
      if (lit && front < 0.07 && w < 1.04) { ctx.fillStyle = '#FFC800'; ctx.arc(b.dots[i][0] * s, b.dots[i][1] * s, 4.6 * s, 0, 6.2832); }
      else { ctx.fillStyle = lit ? '#94C03F' : 'rgba(148,192,63,0.26)'; ctx.arc(b.dots[i][0] * s, b.dots[i][1] * s, (lit ? 3.5 : 2.8) * s, 0, 6.2832); }
      ctx.fill();
    }
  }

  /* ---------- Colinas entre as dobras ---------- */

  var COLINAS = { a: { cx: 360, l: 0.25, r: 1 }, b: { cx: 660, l: 1, r: 0.2 }, c: { cx: 480, l: 0.6, r: 0.75 } };
  function renderColina(svg, a) {
    var k = COLINAS[svg.dataset.colina] || COLINAS.a;
    var yL = 200 - 78 * a * k.l, yR = 200 - 78 * a * k.r, yC = 200 - 250 * a;
    $('.colina-chao', svg).setAttribute('d', 'M0 201V' + yL.toFixed(1) + 'Q' + k.cx + ' ' + yC.toFixed(1) + ' 1000 ' + yR.toFixed(1) + 'V201Z');
    $('.colina-faixa', svg).setAttribute('d', 'M0 201V' + (yL - 46 * a).toFixed(1) + 'Q' + (k.cx + (k.cx < 500 ? 130 : -130)) + ' ' + (yC - 96 * a).toFixed(1) + ' 1000 ' + (yR - 52 * a).toFixed(1) + 'V201Z');
  }

  /* ---------- Formulário ---------- */

  (function form() {
    var f = $('.pedido');
    if (!f) return;
    var erro = $('.pedido-erro', f), ok = $('.pedido-ok', f);
    var ZAP = 'https://wa.me/556193339398?text=';

    function check() {
      var first = null;
      $$('[required]', f).forEach(function (el) {
        var bad = !el.value.trim();
        el.setAttribute('aria-invalid', String(bad));
        if (bad && !first) first = el;
      });
      if (first) {
        erro.textContent = 'Preencha ' + first.labels[0].textContent.toLowerCase().replace(/\?$/, '') + ' para enviar o pedido.';
        erro.hidden = false; first.focus();
        return false;
      }
      erro.hidden = true;
      return true;
    }
    f.addEventListener('input', function (e) {
      if (e.target.getAttribute('aria-invalid') === 'true' && e.target.value.trim()) e.target.setAttribute('aria-invalid', 'false');
    });

    f.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!check()) return;
      var btn = $('[type="submit"]', f), label = btn.textContent;
      btn.disabled = true; btn.textContent = 'Enviando…';
      fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(new FormData(f)).toString()
      }).then(function (r) {
        if (!r.ok) throw new Error(r.status);
        ok.hidden = false; ok.setAttribute('tabindex', '-1'); ok.focus();
        f.reset();
      }).catch(function () {
        erro.textContent = 'O pedido não foi enviado. Confira a conexão e envie de novo, ou use o WhatsApp.';
        erro.hidden = false;
      }).then(function () { btn.disabled = false; btn.textContent = label; });
    });

    $('[data-zap]', f).addEventListener('click', function () {
      var v = function (n) { return (f.elements[n].value || '').trim(); };
      var msg = 'Olá! Vim pelo site da Próspera e quero um orçamento.';
      if (v('nome')) msg += '\nNome: ' + v('nome');
      msg += '\nTipo de área: ' + v('tipo');
      if (v('local')) msg += '\nLocal: ' + v('local');
      if (v('mensagem')) msg += '\n' + v('mensagem');
      window.open(ZAP + encodeURIComponent(msg), '_blank', 'noopener');
    });
  })();

  /* ---------- Montagem estática ---------- */

  buildMap();
  layoutBrasil();
  setEscala('sitio');
  $$('.colina').forEach(function (s) { renderColina(s, 0.6); });

  if (!motion) {
    if (mapaFig) mapaFig.dataset.step = '4';
    if (mSol) { marker.x = 170; marker.y = 340; placeMarker(); }
    onda.w = 1.1;
    if (brasilFig) brasilFig.classList.add('aceso');
    drawBrasil();
    window.addEventListener('resize', drawBrasil);
    return;
  }

  /* ================= Movimento ================= */

  var gsap = window.gsap, ScrollTrigger = window.ScrollTrigger;
  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });

  /* ---------- O sol que atravessa a página ---------- */

  var sol = $('#sol');
  var docks = [0, 1, 2, 3, 4, 5].map(function (i) { return $('[data-dock="' + i + '"]'); });
  var voo = [0, 0, 0, 0, 0];
  var atual = -2;
  var retratoImg = $('.retrato-disco img');

  function centro(el) {
    var r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, d: r.width };
  }
  function setDock(k) {
    if (k === atual) return;
    var antes = atual; atual = k;
    docks.forEach(function (d, i) { if (d) { if (i === k) d.setAttribute('data-on', ''); else d.removeAttribute('data-on'); } });
    if (k === 3 && retratoImg) gsap.fromTo(retratoImg, { opacity: 0 }, { opacity: 1, duration: 0.8, ease: 'power2.out', overwrite: true });
    if (k === 4 && brasilFig && !brasilFig.classList.contains('aceso')) {
      brasilFig.classList.add('aceso');
      gsap.to(onda, { w: 1.1, duration: 2.6, ease: 'power1.out', onUpdate: drawBrasil });
    }
    if (antes === 3 && retratoImg) gsap.set(retratoImg, { opacity: 1 });
  }
  function updateSol() {
    var ativo = -1;
    for (var i = voo.length - 1; i >= 0; i--) if (voo[i] > 0 && voo[i] < 1) { ativo = i; break; }
    if (ativo < 0) {
      sol.style.visibility = 'hidden';
      var k = 0;
      for (var j = 0; j < voo.length; j++) if (voo[j] >= 1) k = j + 1;
      setDock(k);
      return;
    }
    var a = centro(docks[ativo]), b = centro(docks[ativo + 1]);
    var t = voo[ativo]; t = t * t * (3 - 2 * t);
    var dist = Math.hypot(b.x - a.x, b.y - a.y);
    var x = lerp(a.x, b.x, t);
    var y = lerp(a.y, b.y, t) - Math.sin(Math.PI * t) * Math.min(120, dist * 0.16);
    var d = lerp(a.d, b.d, t);
    sol.style.transform = 'translate3d(' + (x - d / 2).toFixed(1) + 'px,' + (y - d / 2).toFixed(1) + 'px,0) scale(' + (d / 480).toFixed(4) + ')';
    sol.style.visibility = 'visible';
    setDock(-1);
  }
  function flight(i, cfg, from, to) {
    cfg.onUpdate = cfg.onRefresh = function (self) {
      voo[i] = clamp01((self.progress - from) / (to - from));
      updateSol();
    };
    return ScrollTrigger.create(cfg);
  }

  /* ---------- Hero: nascer, e as faixas que viram a próxima dobra ---------- */

  var hero = $('.hero');
  var heroSol = $('.hero .cena-sol');
  var heroTexto = $('.hero-texto');

  bandState.o0 = bandState.o1 = bandState.o2 = 0;
  renderBands();
  gsap.set([heroTexto, $('.hero .cena')], { visibility: 'visible' });

  var intro = gsap.timeline({ defaults: { ease: 'power3.out' } });
  intro
    .to(bandState, { o0: 1, duration: 1.3, onUpdate: renderBands }, 0.05)
    .to(bandState, { o1: 1, duration: 1.3, onUpdate: renderBands }, 0.2)
    .to(bandState, { o2: 1, duration: 1.3, onUpdate: renderBands }, 0.35)
    .fromTo(heroSol, { '--nasce': 0 }, { '--nasce': 1, duration: 1.8, ease: 'power2.out' }, 0.15)
    .fromTo(heroTrees, { scale: 0, transformOrigin: '50% 100%' }, { scale: 1, duration: 0.9, ease: 'back.out(1.6)' }, 0.9)
    .fromTo('.hero-titulo .ln > span', { yPercent: 112 }, { yPercent: 0, duration: 1.1, stagger: 0.09 }, 0.25)
    .fromTo('.hero-titulo', { fontStretch: '100%' }, { fontStretch: getComputedStyle($('.hero-titulo')).fontStretch, duration: 1.6, ease: 'power2.out', clearProps: 'fontStretch' }, 0.25)
    .fromTo(['.hero-sub', '.hero-acoes'], { autoAlpha: 0, y: 22 }, { autoAlpha: 1, y: 0, duration: 0.9, stagger: 0.1 }, 0.75);

  var heroTl = gsap.timeline({ defaults: { ease: 'none' } });
  heroTl
    .to(heroSol, { yPercent: -66, duration: 0.2, ease: 'power1.out' }, 0)
    .to(heroTexto, { autoAlpha: 0, y: -50, duration: 0.2, ease: 'power1.in' }, 0.04)
    .to(heroTrees, { autoAlpha: 0, duration: 0.14 }, 0.16)
    .to(bandState, { flood: 1, duration: 0.74, ease: 'power2.inOut', onUpdate: renderBands }, 0.16)
    .to({}, { duration: 0.1 }, 0.9);

  flight(0, {
    trigger: hero, start: 'top top', end: '+=130%', pin: true, scrub: 0.5, animation: heroTl, anticipatePin: 1
  }, 0.2, 0.62);

  /* ---------- Serviços: mapa em camadas ---------- */

  var passos = $$('.passo');
  var passo = 0;
  var ALVOS = { 2: [297, 438], 3: [170, 340], 4: [170, 340] };

  function moveMarker(x, y, dur) {
    gsap.to(marker, { x: x, y: y, duration: dur, ease: dur > 0.3 ? 'power2.inOut' : 'none', overwrite: true, onUpdate: function () { placeMarker(); updateSol(); } });
  }
  function setStep(n) {
    if (n === passo) return;
    passo = n;
    mapaFig.dataset.step = String(n);
    if (n === 0) { moveMarker(40, 95, 0.5); mVarre.setAttribute('height', 0); }
    if (n >= 2) { mVarre.setAttribute('height', 600); moveMarker(ALVOS[n][0], ALVOS[n][1], 0.9); }
  }

  if (mapaFig && mSol) {
    mVarre.setAttribute('height', 0);
    var vooLen = mVoo.getTotalLength();

    passos.forEach(function (el, i) {
      ScrollTrigger.create({
        trigger: el,
        start: function () { return narrow() ? 'top 82%' : 'top 62%'; },
        end: function () { return narrow() ? 'bottom 82%' : 'bottom 62%'; },
        onToggle: function (self) { if (self.isActive) setStep(i + 1); },
        onLeaveBack: i === 0 ? function () { setStep(0); } : null
      });
    });

    // Etapa 1: o ponto percorre as linhas de voo e o relevo aparece atrás dele.
    ScrollTrigger.create({
      trigger: passos[0],
      start: function () { return narrow() ? 'top 82%' : 'top 62%'; },
      end: function () { return narrow() ? 'bottom 95%' : 'bottom 75%'; },
      onUpdate: function (self) {
        if (passo !== 1) return;
        var pt = mVoo.getPointAtLength(vooLen * self.progress);
        mVarre.setAttribute('height', self.progress > 0.995 ? 600 : Math.max(0, pt.y + 26));
        moveMarker(pt.x, pt.y, 0.25);
      }
    });

    flight(1, { trigger: '.rolo', start: 'top 82%', end: function () { return narrow() ? 'top 40%' : 'top 16%'; } }, 0, 1);
  }

  /* ---------- Demais voos do sol ---------- */

  flight(2, { trigger: '.retrato-disco', start: 'top 94%', end: 'center 46%' }, 0, 1);
  flight(3, { trigger: '.brasil', start: 'top 90%', end: 'center 54%' }, 0, 1);
  flight(4, { trigger: '.poente', start: 'top 90%', end: 'top 42%' }, 0, 1);

  gsap.to('.cena-poente .cena-sol', {
    yPercent: 84, ease: 'none',
    scrollTrigger: { trigger: '.poente', start: 'top 42%', end: 'bottom bottom', scrub: true }
  });

  /* ---------- Colinas ---------- */

  $$('.colina').forEach(function (svg) {
    var st = { a: 1 };
    renderColina(svg, 1);
    gsap.to(st, {
      a: 0, ease: 'none', onUpdate: function () { renderColina(svg, st.a); },
      scrollTrigger: { trigger: svg.parentNode, start: 'top bottom', end: 'top 22%', scrub: 0.4 }
    });
  });

  /* ---------- Entradas pontuais ---------- */

  gsap.from('.servicos-intro > *', {
    y: 40, autoAlpha: 0, duration: 1, stagger: 0.12, ease: 'power3.out',
    scrollTrigger: { trigger: '.servicos-intro', start: 'top 62%' }
  });
  gsap.from('.citacao p', {
    fontStretch: '100%', autoAlpha: 0, duration: 1.4, ease: 'power2.out',
    scrollTrigger: { trigger: '.citacao', start: 'top 78%' }
  });

  /* ---------- Ajustes de layout ---------- */

  drawBrasil();
  window.addEventListener('resize', function () { drawBrasil(); updateSol(); });
  window.addEventListener('load', function () { ScrollTrigger.refresh(); });
  if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(function () { ScrollTrigger.refresh(); });
  updateSol();
})();
