(function () {
  'use strict';

  // ── SEARCH INDEX ─────────────────────────────────────────────
  var INDEX = [
    // Pages
    { title: 'Home',                          desc: 'Your daily dashboard and spiritual overview',              cat: 'Pages',      url: 'index.html',                   emoji: '🏠' },
    { title: 'My Journey',                    desc: 'Track your milestones and unlock divine gifts',            cat: 'Pages',      url: 'journey.html',                 emoji: '✨' },
    { title: 'My Journal',                    desc: 'Write your reflections and gratitude entries',             cat: 'Pages',      url: 'journal.html',                 emoji: '📖' },
    { title: 'Abundance Circle',              desc: 'Daily prayers and community connection',                   cat: 'Pages',      url: 'community.html',               emoji: '👥' },
    { title: 'Divine Script',                 desc: 'Your personalized divine script and declarations',         cat: 'Pages',      url: 'divine-script.html',           emoji: '📜' },
    { title: 'Support',                       desc: 'Get help and contact the team',                            cat: 'Pages',      url: 'support.html',                 emoji: '💬' },

    // Today's Practice
    { title: 'Daily Focus',                   desc: 'Your daily spiritual focus and intention setting',         cat: "Today's Practice", url: 'player-daily-focus.html',    emoji: '🎯' },
    { title: 'Divine Truth',                  desc: 'Daily scripture and divine truth meditation',              cat: "Today's Practice", url: 'player-divine-truth.html',   emoji: '✝️' },
    { title: "Solomon's Wisdom",              desc: 'Daily wisdom from the book of Proverbs',                   cat: "Today's Practice", url: 'player-solomons-wisdom.html',emoji: '👑' },
    { title: 'Daily Decree',                  desc: 'Speak divine decrees over your life today',                cat: "Today's Practice", url: 'player-daily-decree.html',   emoji: '📜' },

    // My Products
    { title: 'Discover Your Guardian Angel', desc: 'Find out which angel watches over you and your path',      cat: 'My Products', url: 'https://quizangel.vercel.app/', emoji: '👼', external: true },
    { title: 'Powerful Prayers to Archangel Michael', desc: 'Connect with divine protection through powerful prayers', cat: 'My Products', url: 'player.html',            emoji: '⚔️' },
    { title: 'The Sacred Chant of Archangel Michael', desc: 'Transformative journey into divine protection and purification', cat: 'My Products', url: 'player-sacred-chant.html', emoji: '🎵' },
    { title: 'The 7 Frequencies of Divine Acceleration', desc: 'Activate the seven sacred frequencies of your divine path', cat: 'My Products', url: 'player-7frequencies.html', emoji: '🔮' },
    { title: "The Hidden Secrets of King Solomon's Prosperity", desc: 'Unlock ancient wisdom and sacred principles of wealth', cat: 'My Products', url: 'player-solomon.html', emoji: '💎' },
    { title: '21-Day Manifestation Challenge',desc: 'Transform your life in 21 days through focused divine intention', cat: 'My Products', url: 'player-21-days.html',    emoji: '🌟' },

    // Expand Your Journey
    { title: 'Powerful Numbers — Divine Frequency', desc: 'Explore the sacred geometry of numbers and divine frequencies', cat: 'Expand Your Journey', url: 'player-powerful-numbers.html', emoji: '🔢' },
    { title: 'Vision Board Academy',          desc: 'Create vision boards that accelerate your manifestation', cat: 'Expand Your Journey', url: 'player-vision-board.html',  emoji: '🖼️' },
    { title: 'Dream Journal',                 desc: 'Record and decode the messages in your dreams',            cat: 'Expand Your Journey', url: 'player-dream-journal.html', emoji: '🌙' },
    { title: 'Secret of Power',               desc: 'Unlock the hidden secrets of spiritual power',             cat: 'Expand Your Journey', url: 'player-secret-of-power.html', emoji: '⚡' },
    { title: 'Mindset Reset',                 desc: 'Break limiting beliefs and reprogram your abundance mindset', cat: 'Expand Your Journey', url: 'player-mindset-reset.html', emoji: '🧠' },
    { title: 'Whisper of Faith',              desc: 'Deepen your connection through the whisper of faith',      cat: 'Expand Your Journey', url: 'player-whisper-faith.html', emoji: '🕊️' },
    { title: 'Age of Abundance',              desc: 'The complete Age of Abundance experience',                 cat: 'Expand Your Journey', url: 'player-age-of-abundance.html', emoji: '✨' },

    // Journey Gifts
    { title: 'The Golden Scroll',             desc: 'Day 3 milestone gift — sacred scroll of wisdom',          cat: 'Journey Gifts', url: 'gift-golden-scroll.html',      emoji: '📜' },
    { title: 'Solomon Wealth Map',            desc: 'Day 7 milestone gift — wealth map of King Solomon',       cat: 'Journey Gifts', url: 'gift-solomon-wealth-map.html', emoji: '🗺️' },
    { title: 'The Hidden Key of 444',         desc: 'Day 15 milestone gift — the angelic key of abundance',   cat: 'Journey Gifts', url: 'gift-hidden-key-444.html',     emoji: '🔑' },
    { title: 'The New Name',                  desc: 'Day 21 milestone gift — receive your divine name',        cat: 'Journey Gifts', url: 'gift-new-name.html',           emoji: '✨' },
    { title: 'The Sacred Mission',            desc: 'Day 40 milestone gift — your divine mission revealed',    cat: 'Journey Gifts', url: 'gift-sacred-mission.html',     emoji: '🎯' },
  ];

  // ── CSS ──────────────────────────────────────────────────────
  var style = document.createElement('style');
  style.textContent = `
    #_srch_overlay {
      display: none; position: fixed; inset: 0; z-index: 10000;
      background: rgba(0,0,0,0.82); backdrop-filter: blur(6px);
      flex-direction: column; align-items: stretch;
      padding: env(safe-area-inset-top, 0) 0 0;
    }
    #_srch_overlay.open { display: flex; }

    #_srch_bar {
      display: flex; align-items: center; gap: 10px;
      padding: 14px 16px;
      background: #0e0e12;
      border-bottom: 1px solid rgba(201,168,76,0.15);
    }
    #_srch_input {
      flex: 1; background: rgba(255,255,255,0.06);
      border: 1px solid rgba(201,168,76,0.2);
      border-radius: 10px; padding: 10px 14px;
      font-family: 'Crimson Pro', Georgia, serif; font-size: 1rem;
      color: #f5e6b8; outline: none;
      transition: border-color 0.2s;
    }
    #_srch_input::placeholder { color: rgba(200,184,152,0.4); }
    #_srch_input:focus { border-color: rgba(201,168,76,0.5); }
    #_srch_cancel {
      background: none; border: none; color: rgba(200,184,152,0.6);
      font-family: 'Cinzel', serif; font-size: 0.78rem; letter-spacing: 0.04em;
      cursor: pointer; white-space: nowrap; padding: 6px 2px;
      transition: color 0.2s;
    }
    #_srch_cancel:hover { color: #f5e6b8; }

    #_srch_results {
      flex: 1; overflow-y: auto; padding: 8px 0 80px;
    }

    ._srch_cat_label {
      font-family: 'Cinzel', serif; font-size: 0.62rem; font-weight: 700;
      letter-spacing: 0.1em; color: rgba(201,168,76,0.6);
      padding: 14px 16px 6px; text-transform: uppercase;
    }

    ._srch_item {
      display: flex; align-items: center; gap: 12px;
      padding: 12px 16px; cursor: pointer;
      transition: background 0.15s; text-decoration: none;
      border: none; background: none; width: 100%; text-align: left;
    }
    ._srch_item:hover, ._srch_item:active { background: rgba(201,168,76,0.07); }

    ._srch_item_icon {
      width: 38px; height: 38px; border-radius: 9px; flex-shrink: 0;
      background: linear-gradient(135deg,#1e1830,#2d2048);
      border: 1px solid rgba(201,168,76,0.18);
      display: flex; align-items: center; justify-content: center;
      font-size: 17px;
    }
    ._srch_item_body { flex: 1; min-width: 0; text-align: left; }
    ._srch_item_title {
      font-family: 'Cinzel', serif; font-size: 0.8rem; font-weight: 700;
      color: #f5e6b8; margin-bottom: 2px;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    ._srch_item_desc {
      font-family: 'Crimson Pro', Georgia, serif; font-size: 0.85rem;
      color: rgba(200,184,152,0.6); line-height: 1.3;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    ._srch_item_arrow {
      color: rgba(200,184,152,0.3); font-size: 0.9rem; flex-shrink: 0;
    }

    ._srch_empty {
      text-align: center; padding: 48px 24px;
      font-family: 'Crimson Pro', Georgia, serif; font-size: 1rem;
      color: rgba(200,184,152,0.4);
    }
    ._srch_empty_icon { font-size: 2rem; margin-bottom: 10px; }

    ._srch_hint {
      text-align: center; padding: 32px 24px 8px;
      font-family: 'Crimson Pro', Georgia, serif; font-size: 0.9rem;
      color: rgba(200,184,152,0.35);
    }
  `;
  document.head.appendChild(style);

  // ── HTML ─────────────────────────────────────────────────────
  var overlay = document.createElement('div');
  overlay.id = '_srch_overlay';
  overlay.innerHTML =
    '<div id="_srch_bar">' +
      '<input id="_srch_input" type="search" placeholder="Search content…" autocomplete="off" autocorrect="off" spellcheck="false"/>' +
      '<button id="_srch_cancel">Cancel</button>' +
    '</div>' +
    '<div id="_srch_results"></div>';

  document.addEventListener('DOMContentLoaded', function () {
    document.body.appendChild(overlay);

    // Wire all 🔍 buttons on this page
    document.querySelectorAll('button.nav-icon-btn').forEach(function (btn) {
      if (btn.textContent.trim() === '🔍') {
        btn.addEventListener('click', openSearch);
      }
    });

    document.getElementById('_srch_cancel').addEventListener('click', closeSearch);
    document.getElementById('_srch_input').addEventListener('input', onInput);

    // Close on overlay backdrop click (outside bar)
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closeSearch();
    });
  });

  // ── OPEN / CLOSE ─────────────────────────────────────────────
  function openSearch() {
    overlay.classList.add('open');
    var input = document.getElementById('_srch_input');
    input.value = '';
    renderResults('');
    setTimeout(function () { input.focus(); }, 80);
  }

  function closeSearch() {
    overlay.classList.remove('open');
    document.getElementById('_srch_input').blur();
  }

  // ── SEARCH ───────────────────────────────────────────────────
  function onInput() {
    renderResults(this.value);
  }

  function score(item, q) {
    var t = (item.title + ' ' + item.desc + ' ' + item.cat).toLowerCase();
    return t.includes(q) ? (item.title.toLowerCase().includes(q) ? 2 : 1) : 0;
  }

  function renderResults(raw) {
    var container = document.getElementById('_srch_results');
    var q = raw.trim().toLowerCase();

    if (!q) {
      container.innerHTML = '<div class="_srch_hint">Type to search modules, players and pages…</div>';
      return;
    }

    var hits = INDEX.filter(function (item) { return score(item, q) > 0; })
                    .sort(function (a, b) { return score(b, q) - score(a, q); });

    if (!hits.length) {
      container.innerHTML =
        '<div class="_srch_empty">' +
          '<div class="_srch_empty_icon">🔍</div>' +
          'No results for <strong style="color:#c9a84c">"' + escHtml(raw) + '"</strong>' +
        '</div>';
      return;
    }

    // Group by category
    var cats = [];
    var bycat = {};
    hits.forEach(function (item) {
      if (!bycat[item.cat]) { bycat[item.cat] = []; cats.push(item.cat); }
      bycat[item.cat].push(item);
    });

    var html = '';
    cats.forEach(function (cat) {
      html += '<div class="_srch_cat_label">' + escHtml(cat) + '</div>';
      bycat[cat].forEach(function (item) {
        var isExternal = item.external;
        html +=
          '<button class="_srch_item" onclick="_srchNavigate(\'' + escAttr(item.url) + '\',' + (isExternal ? 'true' : 'false') + ')">' +
            '<div class="_srch_item_icon">' + item.emoji + '</div>' +
            '<div class="_srch_item_body">' +
              '<div class="_srch_item_title">' + escHtml(item.title) + '</div>' +
              '<div class="_srch_item_desc">' + escHtml(item.desc) + '</div>' +
            '</div>' +
            '<span class="_srch_item_arrow">›</span>' +
          '</button>';
      });
    });

    container.innerHTML = html;
  }

  // ── NAVIGATE ─────────────────────────────────────────────────
  window._srchNavigate = function (url, external) {
    closeSearch();
    if (external) {
      window.open(url, '_blank');
      return;
    }
    // Use page fade if available, else direct
    if (typeof navigateTo === 'function') {
      var fakeEvent = { preventDefault: function () {} };
      navigateTo(fakeEvent, url);
    } else {
      document.body.style.opacity = '0';
      setTimeout(function () { window.location.href = url; }, 280);
    }
  };

  // ── UTILS ────────────────────────────────────────────────────
  function escHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function escAttr(s) {
    return String(s == null ? '' : s).replace(/'/g, "\\'");
  }

})();
