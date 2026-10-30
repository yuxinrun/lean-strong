/* =========================================================
   轻与壮 — 站点交互
   语言切换 / 主题切换 / 滚动动效 / 目录高亮 / 折叠 / 清单
   ========================================================= */
(function () {
  'use strict';

  var LANG_KEY = 'ls-lang';
  var THEME_KEY = 'ls-theme';
  var root = document.documentElement;

  var originals = new Map(); // key -> 原始（中文）HTML
  var nodes = [];
  var lang = 'zh';

  /* ---------- 语言 ---------- */
  function detectLang() {
    try {
      var saved = localStorage.getItem(LANG_KEY);
      if (saved === 'zh' || saved === 'en') return saved;
    } catch (e) {}
    var nav = (navigator.languages && navigator.languages[0]) || navigator.language || 'zh';
    return /^zh/i.test(nav) ? 'zh' : 'en';
  }

  function dict() {
    return window.I18N_EN || {};
  }

  function collect() {
    nodes = Array.prototype.slice.call(
      document.querySelectorAll('[data-i18n],[data-i18n-placeholder],[data-i18n-aria],[data-i18n-text],[data-i18n-content]')
    );
    nodes.forEach(function (el) {
      var key = el.getAttribute('data-i18n') || el.getAttribute('data-i18n-text');
      if (key && !originals.has(key)) originals.set(key, el.innerHTML);
    });
  }

  function translate(el, l) {
    var key = el.getAttribute('data-i18n') || el.getAttribute('data-i18n-text');

    if (key) {
      var isText = el.hasAttribute('data-i18n-text') || el.namespaceURI === 'http://www.w3.org/2000/svg' || el.tagName === 'TITLE';
      var value = l === 'zh' ? originals.get(key) : (dict()[key] || originals.get(key));
      if (typeof value === 'string') {
        if (isText) el.textContent = value;
        else el.innerHTML = value;
      }
    }

    var ph = el.getAttribute('data-i18n-placeholder');
    if (ph) {
      var v = l === 'zh' ? el.getAttribute('data-zh-ph') : (dict()[ph] || el.getAttribute('data-zh-ph'));
      if (v) el.setAttribute('placeholder', v);
    }

    var ar = el.getAttribute('data-i18n-aria');
    if (ar) {
      var a = l === 'zh' ? el.getAttribute('data-zh-aria') : (dict()[ar] || el.getAttribute('data-zh-aria'));
      if (a) el.setAttribute('aria-label', a);
    }

    var ct = el.getAttribute('data-i18n-content');
    if (ct) {
      var c = l === 'zh' ? el.getAttribute('data-zh-content') : (dict()[ct] || el.getAttribute('data-zh-content'));
      if (c) el.setAttribute('content', c);
    }
  }

  function applyLang(l, silent) {
    lang = l;
    root.setAttribute('lang', l === 'zh' ? 'zh-CN' : 'en');
    document.body.setAttribute('data-lang', l);
    nodes.forEach(function (el) { translate(el, l); });

    document.querySelectorAll('[data-lang-label]').forEach(function (el) {
      el.classList.toggle('is-on', el.getAttribute('data-lang-label') === l);
    });

    try { localStorage.setItem(LANG_KEY, l); } catch (e) {}

    if (!silent) {
      document.dispatchEvent(new CustomEvent('langchange', { detail: { lang: l } }));
    }
    if (window.__afterLang) window.__afterLang(l);
  }

  function initLang() {
    collect();
    applyLang(detectLang(), true);
  }

  /* ---------- 主题 ---------- */
  function detectTheme() {
    try {
      var saved = localStorage.getItem(THEME_KEY);
      if (saved === 'light' || saved === 'dark') return saved;
    } catch (e) {}
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function applyTheme(t) {
    root.setAttribute('data-theme', t);
    try { localStorage.setItem(THEME_KEY, t); } catch (e) {}
    document.querySelectorAll('[data-theme-icon]').forEach(function (el) {
      el.setAttribute('aria-pressed', t === 'dark' ? 'true' : 'false');
    });
    document.dispatchEvent(new CustomEvent('themechange', { detail: { theme: t } }));
  }

  /* ---------- 页头 / 导航 ---------- */
  function initHeader() {
    var header = document.querySelector('.site-header');
    var nav = document.getElementById('siteNav');
    var toggle = document.getElementById('navToggle');
    var lastY = 0;

    function onScroll() {
      var y = window.pageYOffset || document.documentElement.scrollTop;
      if (header) header.classList.toggle('is-stuck', y > 8);
      lastY = y;
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    if (toggle && nav) {
      toggle.addEventListener('click', function () {
        var open = nav.classList.toggle('is-open');
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
      nav.addEventListener('click', function (e) {
        if (e.target.closest('a')) {
          nav.classList.remove('is-open');
          toggle.setAttribute('aria-expanded', 'false');
        }
      });
      document.addEventListener('click', function (e) {
        if (!nav.contains(e.target) && !toggle.contains(e.target)) {
          nav.classList.remove('is-open');
          toggle.setAttribute('aria-expanded', 'false');
        }
      });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
          nav.classList.remove('is-open');
          toggle.setAttribute('aria-expanded', 'false');
        }
      });
    }
  }

  /* ---------- 滚动出现 ---------- */
  function initReveal() {
    var items = document.querySelectorAll('[data-reveal], .chart');

    if (!('IntersectionObserver' in window)) {
      items.forEach(function (el) { el.classList.add('is-visible'); });
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        var delay = el.getAttribute('data-delay');
        if (delay) el.style.transitionDelay = delay + 'ms';
        el.classList.add('is-visible');
        animateSVG(el);
        io.unobserve(el);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });

    items.forEach(function (el) { io.observe(el); });
  }

  function animateSVG(scope) {
    // 折线图：按真实路径长度绘制
    scope.querySelectorAll('.line-path').forEach(function (p) {
      if (p.classList.contains('line-path--dashed')) return;
      try {
        var len = p.getTotalLength();
        p.style.strokeDasharray = len + ' ' + len;
        p.style.strokeDashoffset = len;
        void p.getBoundingClientRect();
        p.style.strokeDashoffset = '0';
      } catch (e) {}
    });
    // 环形图
    scope.querySelectorAll('.donut [data-len]').forEach(function (c, i) {
      setTimeout(function () {
        c.style.strokeDasharray = c.getAttribute('data-len') + ' 999';
      }, i * 140);
    });
    // 数值滚动
    scope.querySelectorAll('[data-count]').forEach(function (el) { countUp(el); });
  }

  function countUp(el) {
    var target = parseFloat(el.getAttribute('data-count'));
    if (isNaN(target)) return;
    var decimals = parseInt(el.getAttribute('data-decimals') || '0', 10);
    var dur = 900;
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) { el.textContent = target.toFixed(decimals); return; }
    var start = performance.now();
    function tick(now) {
      var p = Math.min(1, (now - start) / dur);
      var eased = 1 - Math.pow(1 - p, 3);
      el.textContent = (target * eased).toFixed(decimals);
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  /* ---------- 阅读进度 + 目录高亮 ---------- */
  function initProgress() {
    var bar = document.getElementById('progress');
    if (!bar) return;
    var article = document.querySelector('.prose') || document.body;
    function update() {
      var rect = article.getBoundingClientRect();
      var total = rect.height - window.innerHeight * 0.55;
      var passed = -rect.top + window.innerHeight * 0.2;
      var pct = total > 0 ? Math.min(100, Math.max(0, (passed / total) * 100)) : 0;
      bar.style.width = pct + '%';
    }
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
  }

  function initTOC() {
    var links = Array.prototype.slice.call(document.querySelectorAll('.toc a[href^="#"]'));
    if (!links.length) return;
    var sections = links.map(function (a) {
      return document.getElementById(a.getAttribute('href').slice(1));
    }).filter(Boolean);
    if (!sections.length) return;

    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var id = entry.target.id;
          links.forEach(function (a) {
            a.classList.toggle('is-active', a.getAttribute('href') === '#' + id);
          });
        });
      }, { rootMargin: '-15% 0px -70% 0px', threshold: 0 });
      sections.forEach(function (s) { io.observe(s); });
    }
  }

  /* ---------- 折叠面板 ---------- */
  function initAccordion() {
    document.querySelectorAll('.acc-trigger').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var item = btn.closest('.acc-item');
        var open = item.classList.toggle('is-open');
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
    });
  }

  /* ---------- 清单（本地保存） ---------- */
  function initChecklist() {
    document.querySelectorAll('[data-checklist]').forEach(function (group) {
      var id = group.getAttribute('data-checklist');
      var boxes = Array.prototype.slice.call(group.querySelectorAll('input[type="checkbox"]'));
      var out = document.querySelector('[data-check-count="' + id + '"]');
      var state = {};
      try { state = JSON.parse(localStorage.getItem('ls-check-' + id) || '{}'); } catch (e) {}

      function sync() {
        var done = 0;
        boxes.forEach(function (b) {
          b.checked = !!state[b.value];
          if (b.checked) done++;
        });
        if (out) out.textContent = done + ' / ' + boxes.length;
      }

      boxes.forEach(function (b) {
        b.addEventListener('change', function () {
          state[b.value] = b.checked;
          try { localStorage.setItem('ls-check-' + id, JSON.stringify(state)); } catch (e) {}
          sync();
        });
      });
      sync();
    });
  }

  /* ---------- 启动 ---------- */
  function init() {
    var themeBtn = document.getElementById('themeToggle');
    if (themeBtn) {
      themeBtn.addEventListener('click', function () {
        applyTheme(root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
      });
    }

    var langBtn = document.getElementById('langToggle');
    if (langBtn) {
      langBtn.addEventListener('click', function () {
        applyLang(lang === 'zh' ? 'en' : 'zh');
      });
    }

    applyTheme(root.getAttribute('data-theme') || detectTheme());
    initHeader();
    initReveal();
    initProgress();
    initTOC();
    initAccordion();
    initChecklist();

    document.querySelectorAll('a[href^="#"]').forEach(function (a) {
      a.addEventListener('click', function () {
        var id = a.getAttribute('href');
        if (id.length < 2) return;
        var target = document.querySelector(id);
        if (target) {
          setTimeout(function () {
            target.setAttribute('tabindex', '-1');
            target.focus({ preventScroll: true });
          }, 400);
        }
      });
    });
  }

  // 供外部调用
  window.LS = {
    applyLang: applyLang,
    applyTheme: applyTheme,
    getLang: function () { return lang; }
  };

  initLang();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
