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

  // Only show on iOS or Android
  if (!isIOS && !isAndroid) return;

  // ── CAPTURE beforeinstallprompt (Android) ───────────────────
  var _deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    _deferredPrompt = e;
    // Enable install button if modal already open
    var btn = document.getElementById('_ib_modal_install_btn');
    if (btn) btn.disabled = false;
  });

  // ── CSS ─────────────────────────────────────────────────────
  var style = document.createElement('style');
  style.textContent = [

    /* ── BANNER (small strip at top) ── */
    '#_install_banner {',
    '  position: fixed; top: 0; left: 0; right: 0; z-index: 9999;',
    '  background: #3d1f6e;',
    '  padding: 8px 14px;',
    '  display: flex; align-items: center; gap: 10px;',
    '  box-shadow: 0 2px 12px rgba(0,0,0,0.5);',
    '  cursor: pointer;',
    '  animation: _ibSlideIn 0.32s cubic-bezier(0.16,1,0.3,1);',
    '}',
    '@keyframes _ibSlideIn {',
    '  from { transform: translateY(-100%); opacity: 0; }',
    '  to   { transform: translateY(0);     opacity: 1; }',
    '}',
    '#_install_banner._ib_hiding {',
    '  animation: _ibSlideOut 0.24s ease forwards;',
    '}',
    '@keyframes _ibSlideOut {',
    '  to { transform: translateY(-100%); opacity: 0; }',
    '}',

    /* icon */
    '#_ib_app_icon {',
    '  width: 30px; height: 30px; border-radius: 7px; flex-shrink: 0;',
    '  background: linear-gradient(135deg,#5b2d9e,#8b5cf6);',
    '  display: flex; align-items: center; justify-content: center;',
    '  font-size: 16px;',
    '}',

    /* label */
    '#_ib_label {',
    '  flex: 1; font-family: "Cinzel", serif; font-size: 0.78rem;',
    '  font-weight: 700; letter-spacing: 0.05em; color: #e9d5ff;',
    '}',

    /* dismiss X on banner */
    '#_ib_banner_close {',
    '  flex-shrink: 0; background: none; border: none;',
    '  color: rgba(233,213,255,0.5); font-size: 1rem; cursor: pointer;',
    '  padding: 4px 4px 4px 10px; line-height: 1; transition: color 0.2s;',
    '}',
    '#_ib_banner_close:hover { color: #e9d5ff; }',

    /* ── MODAL OVERLAY ── */
    '#_ib_overlay {',
    '  display: none; position: fixed; inset: 0; z-index: 10000;',
    '  background: rgba(0,0,0,0.65); backdrop-filter: blur(4px);',
    '  align-items: center; justify-content: center;',
    '}',
    '#_ib_overlay.open { display: flex; }',

    /* modal box */
    '#_ib_modal {',
    '  background: #1a0a2e;',
    '  border: 1px solid rgba(139,92,246,0.35);',
    '  border-radius: 18px;',
    '  padding: 28px 24px 24px;',
    '  width: min(340px, 92vw);',
    '  box-shadow: 0 16px 48px rgba(0,0,0,0.7);',
    '  position: relative;',
    '  animation: _ibModalIn 0.28s cubic-bezier(0.16,1,0.3,1);',
    '}',
    '@keyframes _ibModalIn {',
    '  from { transform: scale(0.88) translateY(16px); opacity: 0; }',
    '  to   { transform: scale(1)    translateY(0);    opacity: 1; }',
    '}',

    /* modal close */
    '#_ib_modal_close {',
    '  position: absolute; top: 14px; right: 14px;',
    '  background: rgba(255,255,255,0.06); border: none; border-radius: 50%;',
    '  width: 30px; height: 30px; display: flex; align-items: center; justify-content: center;',
    '  color: rgba(233,213,255,0.6); font-size: 0.95rem; cursor: pointer;',
    '  transition: background 0.2s, color 0.2s;',
    '}',
    '#_ib_modal_close:hover { background: rgba(255,255,255,0.12); color: #e9d5ff; }',

    /* modal icon */
    '#_ib_modal_icon {',
    '  width: 52px; height: 52px; border-radius: 13px;',
    '  background: linear-gradient(135deg,#5b2d9e,#8b5cf6);',
    '  display: flex; align-items: center; justify-content: center;',
    '  font-size: 26px; margin: 0 auto 16px;',
    '}',

    /* modal title */
    '#_ib_modal_title {',
    '  font-family: "Cinzel", serif; font-size: 1rem; font-weight: 700;',
    '  color: #e9d5ff; text-align: center; margin-bottom: 14px;',
    '  letter-spacing: 0.04em;',
    '}',

    /* instruction box */
    '.ib-instruction {',
    '  background: rgba(139,92,246,0.1);',
    '  border: 1px solid rgba(139,92,246,0.25);',
    '  border-radius: 10px;',
    '  padding: 14px 16px;',
    '  font-family: "Crimson Pro", Georgia, serif; font-size: 0.95rem;',
    '  color: rgba(233,213,255,0.85); line-height: 1.55;',
    '}',
    '.ib-instruction b { color: #c4b5fd; font-style: normal; }',

    /* android install btn */
    '#_ib_modal_install_btn {',
    '  display: block; width: 100%; margin-top: 16px;',
    '  background: linear-gradient(135deg,#5b2d9e,#8b5cf6);',
    '  color: #fff; border: none; border-radius: 10px;',
    '  padding: 13px; cursor: pointer;',
    '  font-family: "Cinzel", serif; font-size: 0.82rem; font-weight: 700;',
    '  letter-spacing: 0.07em; transition: opacity 0.2s;',
    '}',
    '#_ib_modal_install_btn:disabled { opacity: 0.4; cursor: default; }',
    '#_ib_modal_install_btn:not(:disabled):hover { opacity: 0.85; }',

  ].join('\n');
  document.head.appendChild(style);

  // ── DISMISS BANNER ───────────────────────────────────────────
  function dismissBanner() {
    var banner = document.getElementById('_install_banner');
    if (!banner) return;
    banner.classList.add('_ib_hiding');
    setTimeout(function () {
      if (banner.parentNode) banner.parentNode.removeChild(banner);
      document.body.style.paddingTop = '';
    }, 260);
    localStorage.setItem(STORAGE_KEY, String(Date.now()));
  }

  // ── OPEN / CLOSE MODAL ───────────────────────────────────────
  function openModal() {
    var overlay = document.getElementById('_ib_overlay');
    if (overlay) overlay.classList.add('open');
  }

  function closeModal() {
    var overlay = document.getElementById('_ib_overlay');
    if (overlay) overlay.classList.remove('open');
  }

  // ── BUILD & INJECT ───────────────────────────────────────────
  function inject() {

    // ── MINI BANNER ──
    var banner = document.createElement('div');
    banner.id = '_install_banner';
    banner.innerHTML =
      '<div id="_ib_app_icon">👑</div>' +
      '<div id="_ib_label">Install App</div>' +
      '<button id="_ib_banner_close" aria-label="Dismiss">✕</button>';
    document.body.insertBefore(banner, document.body.firstChild);

    // Nudge content down so banner doesn't overlap
    var bh = banner.offsetHeight;
    document.body.style.paddingTop = (parseInt(document.body.style.paddingTop || '0', 10) + bh) + 'px';

    // Clicking anywhere on the banner (except ✕) opens modal
    banner.addEventListener('click', function (e) {
      if (e.target.id !== '_ib_banner_close') openModal();
    });

    // ✕ on banner → permanent dismiss for 1 week
    document.getElementById('_ib_banner_close').addEventListener('click', function (e) {
      e.stopPropagation();
      dismissBanner();
      closeModal();
    });

    // ── MODAL ──
    var overlay = document.createElement('div');
    overlay.id = '_ib_overlay';

    var instructionHTML;
    if (isIOS) {
      instructionHTML =
        '<div class="ib-instruction">' +
        'Tap the <b>Share button (□↑ or ⋯)</b> at the bottom of your screen, ' +
        'then tap <b>"Add to Home Screen"</b>.' +
        '</div>';
    } else {
      instructionHTML =
        '<div class="ib-instruction">' +
        'Tap <b>Install</b> below to add the app directly to your home screen.' +
        '</div>' +
        '<button id="_ib_modal_install_btn" disabled>Install App</button>';
    }

    overlay.innerHTML =
      '<div id="_ib_modal">' +
      '  <button id="_ib_modal_close" aria-label="Close">✕</button>' +
      '  <div id="_ib_modal_icon">👑</div>' +
      '  <div id="_ib_modal_title">Install The Age of Abundance</div>' +
      instructionHTML +
      '</div>';

    document.body.appendChild(overlay);

    // Close modal on overlay click or X button
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closeModal();
    });
    document.getElementById('_ib_modal_close').addEventListener('click', closeModal);

    // Android install button
    if (!isIOS) {
      var btn = document.getElementById('_ib_modal_install_btn');
      if (_deferredPrompt) btn.disabled = false;

      btn.addEventListener('click', function () {
        if (!_deferredPrompt) return;
        _deferredPrompt.prompt();
        _deferredPrompt.userChoice.then(function () {
          _deferredPrompt = null;
          closeModal();
          dismissBanner();
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
