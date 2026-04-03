(function () {
  'use strict';

  // ── GUARDS ──────────────────────────────────────────────────

  if (window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true) return;

  var STORAGE_KEY = 'install_banner_dismissed';
  var WEEK_MS = 7 * 24 * 60 * 60 * 1000;
  var lastDismissed = parseInt(localStorage.getItem(STORAGE_KEY) || '0', 10);
  if (Date.now() - lastDismissed < WEEK_MS) return;

  // ── PLATFORM DETECTION ──────────────────────────────────────
  var ua = navigator.userAgent;
  var isIOS = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
  var isAndroid = /Android/.test(ua);
  if (!isIOS && !isAndroid) return;

  // ── CAPTURE beforeinstallprompt (Android) ───────────────────
  var _deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    _deferredPrompt = e;
    var btn = document.getElementById('_ib_modal_install_btn');
    if (btn) btn.disabled = false;
  });

  // ── CSS ─────────────────────────────────────────────────────
  var style = document.createElement('style');
  style.textContent = `
    /* ── CHIP ── */
    #_ib_chip {
      position: fixed;
      top: 12px;
      left: 12px;
      z-index: 9999;
      display: inline-flex;
      align-items: center;
      gap: 5px;
      background: #4c1d95;
      border: 1px solid rgba(167,139,250,0.4);
      border-radius: 999px;
      padding: 5px 10px 5px 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.45);
      cursor: pointer;
      animation: _ibChipIn 0.32s cubic-bezier(0.16,1,0.3,1);
      user-select: none;
    }
    @keyframes _ibChipIn {
      from { transform: scale(0.7) translateY(-6px); opacity: 0; }
      to   { transform: scale(1)   translateY(0);    opacity: 1; }
    }
    #_ib_chip._ib_hiding {
      animation: _ibChipOut 0.22s ease forwards;
    }
    @keyframes _ibChipOut {
      to { transform: scale(0.7) translateY(-6px); opacity: 0; }
    }
    #_ib_chip_icon {
      font-size: 13px;
      line-height: 1;
    }
    #_ib_chip_label {
      font-family: "Cinzel", serif;
      font-size: 0.65rem;
      font-weight: 700;
      letter-spacing: 0.06em;
      color: #ddd6fe;
      white-space: nowrap;
    }
    #_ib_chip_close {
      background: none;
      border: none;
      color: rgba(221,214,254,0.55);
      font-size: 0.65rem;
      cursor: pointer;
      padding: 0 0 0 3px;
      line-height: 1;
      transition: color 0.2s;
      display: flex;
      align-items: center;
    }
    #_ib_chip_close:hover { color: #ddd6fe; }

    /* ── MODAL OVERLAY ── */
    #_ib_overlay {
      display: none;
      position: fixed;
      inset: 0;
      z-index: 10000;
      background: rgba(0,0,0,0.65);
      backdrop-filter: blur(4px);
      align-items: center;
      justify-content: center;
    }
    #_ib_overlay.open { display: flex; }

    /* modal box */
    #_ib_modal {
      background: #1a0a2e;
      border: 1px solid rgba(139,92,246,0.35);
      border-radius: 18px;
      padding: 28px 24px 24px;
      width: min(340px, 92vw);
      box-shadow: 0 16px 48px rgba(0,0,0,0.7);
      position: relative;
      animation: _ibModalIn 0.28s cubic-bezier(0.16,1,0.3,1);
    }
    @keyframes _ibModalIn {
      from { transform: scale(0.88) translateY(16px); opacity: 0; }
      to   { transform: scale(1)    translateY(0);    opacity: 1; }
    }
    #_ib_modal_close {
      position: absolute; top: 14px; right: 14px;
      background: rgba(255,255,255,0.06); border: none; border-radius: 50%;
      width: 30px; height: 30px;
      display: flex; align-items: center; justify-content: center;
      color: rgba(233,213,255,0.6); font-size: 0.95rem; cursor: pointer;
      transition: background 0.2s, color 0.2s;
    }
    #_ib_modal_close:hover { background: rgba(255,255,255,0.12); color: #e9d5ff; }
    #_ib_modal_icon {
      width: 52px; height: 52px; border-radius: 13px;
      background: linear-gradient(135deg,#5b2d9e,#8b5cf6);
      display: flex; align-items: center; justify-content: center;
      font-size: 26px; margin: 0 auto 16px;
    }
    #_ib_modal_title {
      font-family: "Cinzel", serif; font-size: 1rem; font-weight: 700;
      color: #e9d5ff; text-align: center; margin-bottom: 14px;
      letter-spacing: 0.04em;
    }
    .ib-instruction {
      background: rgba(139,92,246,0.1);
      border: 1px solid rgba(139,92,246,0.25);
      border-radius: 10px;
      padding: 14px 16px;
      font-family: "Crimson Pro", Georgia, serif; font-size: 0.95rem;
      color: rgba(233,213,255,0.85); line-height: 1.55;
    }
    .ib-instruction b { color: #c4b5fd; font-style: normal; }
    #_ib_modal_install_btn {
      display: block; width: 100%; margin-top: 16px;
      background: linear-gradient(135deg,#5b2d9e,#8b5cf6);
      color: #fff; border: none; border-radius: 10px;
      padding: 13px; cursor: pointer;
      font-family: "Cinzel", serif; font-size: 0.82rem; font-weight: 700;
      letter-spacing: 0.07em; transition: opacity 0.2s;
    }
    #_ib_modal_install_btn:disabled { opacity: 0.4; cursor: default; }
    #_ib_modal_install_btn:not(:disabled):hover { opacity: 0.85; }
  `;
  document.head.appendChild(style);

  // ── HELPERS ─────────────────────────────────────────────────
  function dismissChip() {
    var chip = document.getElementById('_ib_chip');
    if (!chip) return;
    chip.classList.add('_ib_hiding');
    setTimeout(function () {
      if (chip.parentNode) chip.parentNode.removeChild(chip);
    }, 240);
    localStorage.setItem(STORAGE_KEY, String(Date.now()));
  }

  function openModal() {
    var el = document.getElementById('_ib_overlay');
    if (el) el.classList.add('open');
  }

  function closeModal() {
    var el = document.getElementById('_ib_overlay');
    if (el) el.classList.remove('open');
  }

  // ── INJECT ───────────────────────────────────────────────────
  function inject() {

    // ── CHIP ──
    var chip = document.createElement('div');
    chip.id = '_ib_chip';
    chip.innerHTML =
      '<span id="_ib_chip_icon">📱</span>' +
      '<span id="_ib_chip_label">Install App</span>' +
      '<button id="_ib_chip_close" aria-label="Dismiss">✕</button>';
    document.body.appendChild(chip);

    chip.addEventListener('click', function (e) {
      if (e.target.id !== '_ib_chip_close') openModal();
    });
    document.getElementById('_ib_chip_close').addEventListener('click', function (e) {
      e.stopPropagation();
      dismissChip();
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
      '  <div id="_ib_modal_icon">📱</div>' +
      '  <div id="_ib_modal_title">Install The Age of Abundance</div>' +
      instructionHTML +
      '</div>';

    document.body.appendChild(overlay);

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
          dismissChip();
        });
      });
    }
  }

  // ── INIT ────────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inject);
  } else {
    inject();
  }

})();
