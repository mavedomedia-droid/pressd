/* =============================================================================
 * PRESSD : shared UI kit
 * =============================================================================
 * Load order on every page (in <head>):
 *   <script src="/js/config.js"></script>
 *   <script src="/js/ui.js"></script>
 *
 * What it does on every page:
 *   - loads Google Tag Manager (skip with <html data-no-gtm>)
 *   - captures ad attribution (utm_*, gclid, fbclid, ttclid, ?area=) to
 *     localStorage, so it rides along with the booking
 *   - renders the nav into <div data-pressd-nav="home|page"></div>
 *   - renders the footer into <div data-pressd-footer></div>
 *   - wires .reveal scroll animations and [data-wa] / [data-mail] / [data-tg] links
 *
 * What pages can call (window.Pressd):
 *   Pressd.api(action, payload)    POST to Apps Script, returns JSON
 *   Pressd.get(action, params)     GET to Apps Script, returns JSON
 *   Pressd.pay({ accessCode, authorizationUrl, onSuccess(ref), onCancel() })
 *   Pressd.track(event, data)      dataLayer.push
 *   Pressd.attribution()           last-touch attribution object
 *   Pressd.fmtNaira(n), fmtDate(iso), fmtWindow(key), esc(str)
 * ============================================================================= */
(function () {
  'use strict';

  var CFG = window.PRESSD_CONFIG || {};
  var P = CFG.PATHS || {};
  var D = document;

  /* ---------------------------------------------------------------------------
   * Tag Manager (runs immediately, in <head>)
   * ------------------------------------------------------------------------- */
  window.dataLayer = window.dataLayer || [];
  if (CFG.GTM_ID && !D.documentElement.hasAttribute('data-no-gtm')) {
    window.dataLayer.push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });
    var g = D.createElement('script');
    g.async = true;
    g.src = 'https://www.googletagmanager.com/gtm.js?id=' + encodeURIComponent(CFG.GTM_ID);
    (D.head || D.documentElement).appendChild(g);
  }

  /* ---------------------------------------------------------------------------
   * Canonical + og:url from SITE_URL, so a domain change is one edit
   * ------------------------------------------------------------------------- */
  if (CFG.SITE_URL) {
    var base = CFG.SITE_URL.replace(/\/+$/, '');
    var canon = base + location.pathname;
    var link = D.querySelector('link[rel="canonical"]') || D.createElement('link');
    link.rel = 'canonical'; link.href = canon;
    if (!link.parentNode) D.head.appendChild(link);
    var og = D.querySelector('meta[property="og:url"]') || D.createElement('meta');
    og.setAttribute('property', 'og:url'); og.content = canon;
    if (!og.parentNode) D.head.appendChild(og);
  }

  /* ---------------------------------------------------------------------------
   * Storage (wrapped: private mode / blocked storage must never break a page)
   * ------------------------------------------------------------------------- */
  function sGet(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } }
  function sSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }

  /* ---------------------------------------------------------------------------
   * Attribution: first touch kept forever, last touch updated on any tagged visit
   * ------------------------------------------------------------------------- */
  (function captureAttribution() {
    var q = new URLSearchParams(location.search);
    var keys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
    var hit = {};
    var tagged = false;
    keys.forEach(function (k) { var v = q.get(k); if (v) { hit[k] = v.slice(0, 120); tagged = true; } });
    var click = q.get('gclid') || q.get('fbclid') || q.get('ttclid');
    if (click) { hit.clickId = click.slice(0, 200); tagged = true; }
    var area = q.get('area');
    if (area) { hit.landingArea = area.slice(0, 60); tagged = true; }
    var ref = D.referrer && D.referrer.indexOf(location.host) === -1 ? D.referrer : '';
    if (!tagged && !ref) return;
    hit.referrer = ref.slice(0, 200);
    hit.landingPage = (location.pathname + location.search).slice(0, 200);
    hit.at = new Date().toISOString();
    if (!sGet('pressd_first_touch')) sSet('pressd_first_touch', hit);
    if (tagged || !sGet('pressd_last_touch')) sSet('pressd_last_touch', hit);
  })();

  function attribution() {
    var a = sGet('pressd_last_touch') || {};
    var f = sGet('pressd_first_touch') || {};
    return {
      source: 'web',
      utm_source: a.utm_source || '', utm_medium: a.utm_medium || '', utm_campaign: a.utm_campaign || '',
      utm_content: a.utm_content || '', utm_term: a.utm_term || '', clickId: a.clickId || '',
      landingArea: a.landingArea || '', referrer: a.referrer || '', landingPage: a.landingPage || '',
      firstSource: f.utm_source || '', firstCampaign: f.utm_campaign || '',
    };
  }

  /* ---------------------------------------------------------------------------
   * Formatting
   * ------------------------------------------------------------------------- */
  var WINDOWS = {
    morning:   { label: 'Morning',   time: '8 AM – 11 AM' },
    afternoon: { label: 'Afternoon', time: '12 PM – 3 PM' },
    evening:   { label: 'Evening',   time: '4 PM – 7 PM' },
  };
  function fmtWindow(k) { var w = WINDOWS[k]; return w ? w.label + ' · ' + w.time : (k || '—'); }
  function fmtNaira(n) {
    if (n == null || n === '' || isNaN(n)) return '—';
    return '₦' + Math.round(Number(n)).toLocaleString('en-NG');
  }
  function fmtDate(iso, opts) {
    if (!iso) return '';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleString('en-NG', Object.assign({ day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }, opts || {}));
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /* ---------------------------------------------------------------------------
   * Backend
   * ------------------------------------------------------------------------- */
  function withTimeout(promise, ms) {
    return new Promise(function (resolve, reject) {
      var t = setTimeout(function () { reject(new Error('Request timed out')); }, ms);
      promise.then(function (v) { clearTimeout(t); resolve(v); }, function (e) { clearTimeout(t); reject(e); });
    });
  }
  function api(action, payload) {
    if (!CFG.APPS_SCRIPT_URL) return Promise.reject(new Error('APPS_SCRIPT_URL missing in /js/config.js'));
    var body = Object.assign({ action: action }, payload || {});
    return withTimeout(fetch(CFG.APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(body),
    }), 30000).then(function (r) {
      if (!r.ok) throw new Error('Backend error ' + r.status);
      return r.json();
    });
  }
  function get(action, params) {
    if (!CFG.APPS_SCRIPT_URL) return Promise.reject(new Error('APPS_SCRIPT_URL missing'));
    var q = new URLSearchParams(Object.assign({ action: action }, params || {}));
    return withTimeout(fetch(CFG.APPS_SCRIPT_URL + '?' + q.toString()), 20000).then(function (r) { return r.json(); });
  }

  /* ---------------------------------------------------------------------------
   * Payments : Paystack Popup v2 with the server-made access code.
   * Falls back to the hosted checkout page if the popup cannot open.
   * ------------------------------------------------------------------------- */
  var paystackLoading = null;
  function loadPaystack() {
    if (window.PaystackPop) return Promise.resolve(window.PaystackPop);
    if (paystackLoading) return paystackLoading;
    paystackLoading = new Promise(function (resolve, reject) {
      var s = D.createElement('script');
      s.src = 'https://js.paystack.co/v2/inline.js';
      s.onload = function () { window.PaystackPop ? resolve(window.PaystackPop) : reject(new Error('Paystack missing')); };
      s.onerror = function () { paystackLoading = null; reject(new Error('Paystack failed to load')); };
      D.head.appendChild(s);
    });
    return paystackLoading;
  }
  function pay(opts) {
    var redirect = function () { if (opts.authorizationUrl) location.href = opts.authorizationUrl; };
    if (!opts.accessCode) { redirect(); return; }
    loadPaystack().then(function (PaystackPop) {
      var popup = new PaystackPop();
      popup.resumeTransaction(opts.accessCode, {
        onSuccess: function (tx) { if (opts.onSuccess) opts.onSuccess(tx && tx.reference); },
        onCancel: function () { if (opts.onCancel) opts.onCancel(); },
        onError: function () { redirect(); },
      });
    }).catch(redirect);
  }

  /* ---------------------------------------------------------------------------
   * Tracking
   * ------------------------------------------------------------------------- */
  function track(event, data) {
    try { window.dataLayer.push(Object.assign({ event: event }, data || {})); } catch (e) {}
  }

  /* ---------------------------------------------------------------------------
   * Nav + footer
   * ------------------------------------------------------------------------- */
  var ICON_BACK = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>';

  function renderNav(el) {
    var variant = el.getAttribute('data-pressd-nav') || 'page';
    var home = P.HOME || '/';
    var logo = '<a href="' + home + '" class="nav-logo" aria-label="Pressd home"><img src="' + (P.LOGO_LIGHT || '/assets/logo-light.png') + '" alt="Pressd" width="106" height="32" /></a>';
    var right;
    if (variant === 'home') {
      right =
        '<div class="nav-links">' +
          '<a href="#how">How it works</a><a href="#services">Services</a><a href="#pricing">Pricing</a><a href="#faq">FAQ</a>' +
        '</div>' +
        '<button class="nav-cta" data-open-pickup>Request Pickup</button>';
    } else if (variant === 'bare') {
      right = '';
    } else {
      var onOrder = location.pathname.indexOf(P.ORDER || '/order.html') === 0;
      right = '<div class="nav-right">' +
        (onOrder ? '' : '<a href="' + (P.ORDER || '/order.html') + '" class="nav-back">Track order</a>') +
        '<a href="' + home + '" class="nav-back">' + ICON_BACK + ' Home</a></div>';
    }
    el.innerHTML = '<nav class="nav"><div class="container nav-inner">' + logo + right + '</div></nav>';
  }

  function renderFooter(el) {
    var home = P.HOME || '/';
    var h = function (hash) { return location.pathname === home ? hash : home + hash; };
    el.innerHTML =
      '<footer class="footer"><div class="container">' +
        '<div class="footer-grid">' +
          '<div class="footer-brand"><img src="' + (P.LOGO_LIGHT || '/assets/logo-light.png') + '" alt="Pressd" width="120" height="36" />' +
            '<p>Laundry, picked up and delivered across Lagos.</p></div>' +
          '<div><h4>Service</h4><ul>' +
            '<li><a href="' + h('#services') + '">Pressd Load</a></li>' +
            '<li><a href="' + h('#services') + '">Pressd Care</a></li>' +
            '<li><a href="' + h('#pricing') + '">Pricing</a></li>' +
          '</ul></div>' +
          '<div><h4>Orders</h4><ul>' +
            '<li><a href="' + h('#book') + '">Request a pickup</a></li>' +
            '<li><a href="' + (P.ORDER || '/order.html') + '">Track an order</a></li>' +
            '<li><a href="' + h('#faq') + '">FAQ</a></li>' +
          '</ul></div>' +
          '<div><h4>Support</h4><ul>' +
            '<li><a href="' + esc(CFG.WHATSAPP_URL) + '" target="_blank" rel="noopener">WhatsApp us</a></li>' +
            '<li><a href="' + esc(CFG.TELEGRAM_BOT) + '" target="_blank" rel="noopener">Chat with Donut</a></li>' +
            '<li><a href="mailto:' + esc(CFG.SUPPORT_EMAIL) + '">' + esc(CFG.SUPPORT_EMAIL) + '</a></li>' +
          '</ul></div>' +
        '</div>' +
        '<div class="footer-bottom"><span>© ' + new Date().getFullYear() + ' Pressd. All rights reserved.</span><span>washed • dried • pressd</span></div>' +
      '</div></footer>';
  }

  /* ---------------------------------------------------------------------------
   * Boot
   * ------------------------------------------------------------------------- */
  function boot() {
    Array.prototype.forEach.call(D.querySelectorAll('[data-pressd-nav]'), renderNav);
    Array.prototype.forEach.call(D.querySelectorAll('[data-pressd-footer]'), renderFooter);

    // Contact links from config
    Array.prototype.forEach.call(D.querySelectorAll('[data-wa]'), function (a) { a.href = CFG.WHATSAPP_URL; a.target = '_blank'; a.rel = 'noopener'; });
    Array.prototype.forEach.call(D.querySelectorAll('[data-tg]'), function (a) { a.href = CFG.TELEGRAM_BOT; a.target = '_blank'; a.rel = 'noopener'; });
    Array.prototype.forEach.call(D.querySelectorAll('[data-mail]'), function (a) {
      a.href = 'mailto:' + CFG.SUPPORT_EMAIL;
      if (!a.textContent.trim()) a.textContent = CFG.SUPPORT_EMAIL;
    });
    Array.prototype.forEach.call(D.querySelectorAll('[data-cfg]'), function (n) {
      var v = CFG[n.getAttribute('data-cfg')];
      if (v != null) n.textContent = v;
    });

    // Reveal on scroll
    var els = D.querySelectorAll('.reveal');
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); } });
      }, { threshold: 0.12 });
      Array.prototype.forEach.call(els, function (el) { io.observe(el); });
    } else {
      Array.prototype.forEach.call(els, function (el) { el.classList.add('visible'); });
    }
  }
  if (D.readyState === 'loading') D.addEventListener('DOMContentLoaded', boot); else boot();

  window.Pressd = {
    cfg: CFG, paths: P, WINDOWS: WINDOWS,
    api: api, get: get, pay: pay, track: track, attribution: attribution,
    fmtNaira: fmtNaira, fmtDate: fmtDate, fmtWindow: fmtWindow, esc: esc,
    store: { get: sGet, set: sSet },
  };
})();
