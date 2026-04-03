(function () {
  'use strict';

  // ── GUARDS ──────────────────────────────────────────────────

  // Already running as installed PWA → never show
  if (window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true) return;

  // Dismissed within the last 7 days → skip
  var STORAGE_KEY = 'install_banner_dismissed';
  var WEEK_MS = 7 * 24 * 60 * 60 * 1000;
  var lastDismissed = parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10);
  if (Date.now() - lastDismissed < WEEK_MS) return;

  // ── PLATFORM DETECTION ──────────────────────────────────────
  var ua = navigator.userAgent;
  var isIOS = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
  var isAndroid = /Android/.test(ua);
  var isSafari = /^((?!chrome|android).)*safari/i.test(ua);

  // Only show on iOS Safari or Android (Chrome PWA install)
  if (!isIOS && !isAndroid) return;

  // ── CAPTURE beforeinstallprompt (Android) ───────────────────
  var _deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    _deferredPrompt = e;
    // If banner already in DOM, enable the install button
    var btn = document.getElementById('_ib_install_btn');
    if (btn) btn.disabled = false;
  });

  // ── CSS ─────────────────────────────────────────────────────
  var style = document.createElement('style');
  style.textContent = [
    '#_install_banner {',
    '  position: fixed; top: 0; left: 0; right: 0; z-index: 9999;',
    '  background: linear-gradient(135deg, #0d0d12, #141420);',
    '  border-bottom: 1px solid rgba(201,168,76,0.3);',
    '  padding: 12px 16px;',
    '  display: flex; align-items: center; gap: 12px;',
    '  box-shadow: 0 4px 24px rgba(0,0,0,0.6);',
    '  animation: _ibSlide 0.35s cubic-bezier(0.16,1,0.3,1);',
    '}',
    '@keyframes _ibSlide { from { transform:translateY(-100%); opacity:0; } to { transform:translateY(0); opacity:1; } }',
    '#_install_banner._ib_hiding {',
    '  animation: _ibHide 0.25s ease forwards;',
    '}',
    '@keyframes _ibHide { to { transform:translateY(-100%); opacity:0; } }',
    '#_ib_icon {',
    '  width: 40px; height: 40px; border-radius: 10px; flex-shrink: 0;',
    '  background: linear-gradient(135deg,#7a5020,#c9a84c);',
    '  display: flex; align-items: center; justify-content: center; font-size: 20px;',
    '}',
    '#_ib_body { flex: 1; min-width: 0; }',
    '#_ib_title {',
    '  font-family: "Cinzel", serif; font-size: 0.78rem; font-weight: 700;',
    '  color: #f5e6b8; letter-spacing: 0.04em; margin-bottom: 3px;',
    '}',
    '#_ib_desc {',
    '  font-family: "Crimson Pro", Georgia, serif; font-size: 0.82rem;',
    '  color: rgba(200,184,152,0.8); line-height: 1.4;',
    '}',
    '#_ib_desc b { color: #c9a84c; font-style: normal; }',
    '#_ib_install_btn {',
    '  flex-shrink: 0;',
    '  background: linear-gradient(135deg,#7a5020,#c9a84c);',
    '  color: #0a0508; border: none; border-radius: 8px;',
    '  padding: 9px 18px;',
    '  font-family: "Cinzel", serif; font-size: 0.72rem; font-weight: 700;',
    '  letter-spacing: 0.06em; cursor: pointer; transition: opacity 0.2s;',
    '  white-space: nowrap;',
    '}',
    '#_ib_install_btn:disabled { opacity: 0.45; cursor: default; }',
    '#_ib_install_btn:not(:disabled):hover { opacity: 0.85; }',
    '#_ib_close {',
    '  flex-shrink: 0; background: none; border: none;',
    '  color: rgba(200,184,152,0.5); font-size: 1.1rem; cursor: pointer;',
    '  padding: 4px 6px; line-height: 1; transition: color 0.2s;',
    '}',
    '#_ib_close:hover { color: #f5e6b8; }',
  ].join('');
  document.head.appendChild(style);

  // ── BUILD HTML ───────────────────────────────────────────────
  function buildBanner() {
    var banner = document.createElement('div');
    banner.id = '_install_banner';

    var icon = '<div id="_ib_icon">👑</div>';

    var body, action;

    if (isIOS) {
      body = '<div id="_ib_body">'
        + '<div id="_ib_title">Add to Home Screen</div>'
        + '<div id="_ib_desc">Tap <b>□↑ Share</b>, then <b>"Add to Home Screen"</b></div>'
        + '</div>';
      action = ''; // no button for iOS, instruction is enough
    } else {
      body = '<div id="_ib_body">'
        + '<div id="_ib_title">Install the App</div>'
        + '<div id="_ib_desc">Get the full experience on your device</div>'
        + '</div>';
      action = '<button id="_ib_install_btn" disabled>Install App</button>';
    }

    var close = '<button id="_ib_close" aria-label="Dismiss">✕</button>';

    banner.innerHTML = icon + body + action + close;
    return banner;
  }

  // ── DISMISS ──────────────────────────────────────────────────
  function dismiss() {
    var banner = document.getElementById('_install_banner');
    if (!banner) return;
    banner.classList.add('_ib_hiding');
    setTimeout(function () { if (banner.parentNode) banner.parentNode.removeChild(banner); }, 280);
    localStorage.setItem(STORAGE_KEY, String(Date.now()));
  }

  // ── INJECT ───────────────────────────────────────────────────
  function inject() {
    var banner = buildBanner();
    document.body.insertBefore(banner, document.body.firstChild);

    // Push page content down
    document.body.style.paddingTop = (document.body.style.paddingTop
      ? parseInt(document.body.style.paddingTop) + banner.offsetHeight
      : banner.offsetHeight) + 'px';

    // Close button
    document.getElementById('_ib_close').addEventListener('click', function () {
      document.body.style.paddingTop = '';
      dismiss();
    });

    // Android install button
    if (!isIOS) {
      var btn = document.getElementById('_ib_install_btn');
      // Enable immediately if prompt already captured
      if (_deferredPrompt) btn.disabled = false;

      btn.addEventListener('click', function () {
        if (!_deferredPrompt) return;
        _deferredPrompt.prompt();
        _deferredPrompt.userChoice.then(function (result) {
          _deferredPrompt = null;
          document.body.style.paddingTop = '';
          dismiss();
        });
      });
    }
  }

  // ── INIT ─────────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inject);
  } else {
    inject();
  }

})();
