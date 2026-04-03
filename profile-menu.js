(function () {
  // ── CSS ──
  const style = document.createElement('style');
  style.textContent = `
    .profile-menu-overlay {
      display: none; position: fixed; inset: 0; z-index: 200;
      background: rgba(0,0,0,0.55); backdrop-filter: blur(6px);
    }
    .profile-menu-overlay.open { display: block; }
    .profile-menu {
      position: fixed; top: 0; right: 0; bottom: 0; z-index: 201;
      width: min(320px, 88vw);
      background: #0e0e12;
      border-left: 1px solid rgba(201,168,76,0.15);
      display: flex; flex-direction: column;
      transform: translateX(100%);
      transition: transform 0.32s cubic-bezier(0.22,1,0.36,1);
    }
    .profile-menu.open { transform: translateX(0); }
    .profile-menu-header {
      padding: 28px 24px 20px;
      border-bottom: 1px solid rgba(201,168,76,0.1);
      position: relative;
    }
    .profile-menu-close {
      position: absolute; top: 18px; right: 18px;
      background: none; border: none; color: var(--text-dim);
      font-size: 1.1rem; cursor: pointer; padding: 6px;
      border-radius: 50%; transition: color 0.2s, background 0.2s;
    }
    .profile-menu-close:hover { color: var(--text); background: rgba(255,255,255,0.06); }
    .profile-avatar-large {
      width: 56px; height: 56px; border-radius: 50%;
      background: linear-gradient(135deg,#e67e22,#c0392b);
      display: flex; align-items: center; justify-content: center;
      font-family: 'Cinzel', serif; font-size: 1.3rem; font-weight: 700;
      color: #fff; margin-bottom: 12px;
      border: 2px solid rgba(201,168,76,0.3);
    }
    .profile-name { font-family: 'Cinzel', serif; font-size: 1rem; font-weight: 700; color: #f5e6b8; margin-bottom: 3px; }
    .profile-email { font-size: 0.82rem; color: var(--text-dim); }
    .profile-days-badge {
      display: inline-flex; align-items: center; gap: 6px;
      margin-top: 10px;
      background: rgba(201,168,76,0.1);
      border: 1px solid rgba(201,168,76,0.2);
      border-radius: 999px; padding: 5px 14px;
      font-family: 'Cinzel', serif; font-size: 0.62rem; font-weight: 600;
      letter-spacing: 0.12em; color: #c9a84c;
    }
    .profile-menu-body { flex: 1; padding: 16px 0; overflow-y: auto; }
    .profile-menu-item {
      display: flex; align-items: center; gap: 14px;
      padding: 14px 24px; cursor: pointer; text-decoration: none;
      transition: background 0.15s;
      border: none; background: none; width: 100%; text-align: left;
    }
    .profile-menu-item:hover { background: rgba(255,255,255,0.04); }
    .profile-menu-item-icon { font-size: 1.1rem; width: 24px; text-align: center; flex-shrink: 0; }
    .profile-menu-item-label { font-family: 'Crimson Pro', Georgia, serif; font-size: 1rem; color: var(--text); }
    .profile-menu-item-label.danger { color: #e07070; }
    .profile-menu-divider { height: 1px; background: rgba(255,255,255,0.06); margin: 8px 24px; }
  `;
  document.head.appendChild(style);

  // ── HTML ──
  const overlay = document.createElement('div');
  overlay.className = 'profile-menu-overlay';
  overlay.id = 'profile-menu-overlay';
  overlay.onclick = closeProfileMenu;

  const menu = document.createElement('div');
  menu.className = 'profile-menu';
  menu.id = 'profile-menu';
  menu.innerHTML = `
    <div class="profile-menu-header">
      <button class="profile-menu-close" onclick="closeProfileMenu()">✕</button>
      <div class="profile-avatar-large" id="profile-avatar-large"></div>
      <div class="profile-name" id="profile-name"></div>
      <div class="profile-email" id="profile-email"></div>
      <div class="profile-days-badge">✦ <span id="profile-days">0</span> Days of Connection</div>
    </div>
    <div class="profile-menu-body">
      <a href="index.html" class="profile-menu-item">
        <span class="profile-menu-item-icon">🏠</span>
        <span class="profile-menu-item-label">Home</span>
      </a>
      <a href="journey.html" class="profile-menu-item">
        <span class="profile-menu-item-icon">✨</span>
        <span class="profile-menu-item-label">My Journey</span>
      </a>
      <a href="journal.html" class="profile-menu-item">
        <span class="profile-menu-item-icon">📖</span>
        <span class="profile-menu-item-label">My Journal</span>
      </a>
      <a href="community.html" class="profile-menu-item">
        <span class="profile-menu-item-icon">👥</span>
        <span class="profile-menu-item-label">Abundance Circle</span>
      </a>
      <div class="profile-menu-divider"></div>
      <a href="support.html" class="profile-menu-item">
        <span class="profile-menu-item-icon">💬</span>
        <span class="profile-menu-item-label">Support</span>
      </a>
      <div class="profile-menu-divider"></div>
      <button class="profile-menu-item" onclick="logout()">
        <span class="profile-menu-item-icon">🚪</span>
        <span class="profile-menu-item-label danger">Sign Out</span>
      </button>
    </div>
  `;

  document.addEventListener('DOMContentLoaded', function () {
    document.body.appendChild(overlay);
    document.body.appendChild(menu);

    // Wire up nav avatar / username clicks
    ['nav-avatar', 'nav-username'].forEach(function (id) {
      const el = document.getElementById(id);
      if (el) {
        el.style.cursor = 'pointer';
        el.addEventListener('click', openProfileMenu);
      }
    });
  });

  // ── FUNCTIONS (global so onclick= attributes work) ──
  window.openProfileMenu = function () {
    const name  = localStorage.getItem('abundance_name')  || 'Friend';
    const email = localStorage.getItem('abundance_email') || '';
    const start = localStorage.getItem('abundance_start_date');
    let days = 1;
    if (start && start !== 'null' && start !== 'undefined') {
      const diff = (new Date() - new Date(start + 'T00:00:00')) / 86400000;
      if (!isNaN(diff)) days = Math.max(1, Math.floor(diff) + 1);
    }
    const first = name.split(' ')[0];
    document.getElementById('profile-avatar-large').textContent = first[0].toUpperCase();
    document.getElementById('profile-name').textContent = name;
    document.getElementById('profile-email').textContent = email;
    document.getElementById('profile-days').textContent = days;
    document.getElementById('profile-menu-overlay').classList.add('open');
    document.getElementById('profile-menu').classList.add('open');
    document.body.style.overflow = 'hidden';
  };

  window.closeProfileMenu = function () {
    document.getElementById('profile-menu-overlay').classList.remove('open');
    document.getElementById('profile-menu').classList.remove('open');
    document.body.style.overflow = '';
  };

  // Only define logout if not already defined by the page
  if (!window.logout) {
    window.logout = function () {
      if (typeof logoutUser === 'function') logoutUser();
      window.location.href = 'login.html';
    };
  }
})();
