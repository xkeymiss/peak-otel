/**
 * Peak Otel - Kullanıcı Kimlik Doğrulama ve Oturum Yönetimi
 */

const Auth = {
  init() {
    this.renderHeaderUser();
    this.bindEvents();
  },

  isLoggedIn() {
    return !!API.getToken();
  },

  isAdmin() {
    const user = API.getUser();
    return user && user.role === 'admin';
  },

  getCurrentUser() {
    return API.getUser();
  },

  renderHeaderUser() {
    const container = document.getElementById('header-auth-container');
    const drawerContainer = document.getElementById('mobile-drawer-auth-container');
    if (!container && !drawerContainer) return;

    const user = this.getCurrentUser();

    if (user) {
      const initials = user.full_name
        ? user.full_name.split(' ').map(n => n[0]).join('').toUpperCase()
        : 'U';

      if (container) {
        container.innerHTML = `
          <div class="user-badge-menu" id="user-menu-trigger">
            <div class="user-avatar">${initials}</div>
            <span class="user-name-label">${user.full_name}</span>
            <span style="font-size: 0.75rem; color: var(--color-muted);">▼</span>

            <div class="user-dropdown-menu" id="user-dropdown">
              <a href="/rezervasyonlarim" class="user-dropdown-item">
                <span>📅</span> Rezervasyonlarım
              </a>
              ${user.role === 'admin' ? `
                <a href="/admin" class="user-dropdown-item" style="color: var(--color-brass-hover); font-weight: 600;">
                  <span>👑</span> Admin Paneli
                </a>
              ` : ''}
              <div style="border-top: var(--border-hairline); margin: 4px 0;"></div>
              <a href="javascript:void(0)" class="user-dropdown-item btn-logout-action" style="color: var(--color-danger);">
                <span>🚪</span> Çıkış Yap
              </a>
            </div>
          </div>
        `;

        const trigger = document.getElementById('user-menu-trigger');
        const dropdown = document.getElementById('user-dropdown');
        if (trigger && dropdown) {
          trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.classList.toggle('show');
          });

          document.addEventListener('click', () => {
            dropdown.classList.remove('show');
          });
        }
      }

      if (drawerContainer) {
        drawerContainer.innerHTML = `
          <div style="display: flex; align-items: center; justify-content: space-between; padding: 10px 12px; background: var(--color-surface-subtle); border-radius: var(--radius-xs); border: var(--border-hairline);">
            <div style="display: flex; align-items: center; gap: 10px; overflow: hidden;">
              <div class="user-avatar" style="flex-shrink: 0;">${initials}</div>
              <div style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                <div style="font-weight: 600; font-size: 0.85rem; color: var(--color-obsidian); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${user.full_name}</div>
                <div style="font-size: 0.72rem; color: var(--color-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${user.email}</div>
              </div>
            </div>
            <button class="btn-logout-action" style="color: var(--color-danger); font-size: 0.78rem; font-weight: 600; padding: 4px 8px; border: var(--border-hairline); border-radius: 4px; background: #ffffff; cursor: pointer; flex-shrink: 0; margin-left: 8px;">
              Çıkış
            </button>
          </div>
          ${user.role === 'admin' ? `
            <a href="/admin" class="btn btn-obsidian btn-sm" style="width: 100%; text-align: center; margin-top: 8px;">
              👑 Admin Paneli
            </a>
          ` : ''}
        `;
      }

      document.querySelectorAll('.btn-logout-action').forEach(btn => {
        btn.addEventListener('click', () => {
          this.logout();
        });
      });

    } else {
      if (container) {
        container.innerHTML = `
          <button class="btn btn-outline btn-sm" id="btn-open-login">
            <span>Giriş Yap / Üye Ol</span>
          </button>
        `;
      }

      if (drawerContainer) {
        drawerContainer.innerHTML = `
          <button class="btn btn-outline btn-sm" id="btn-drawer-open-login" style="width: 100%;">
            <span>Giriş Yap / Üye Ol</span>
          </button>
        `;
      }

      const openLogin = () => {
        if (typeof toggleMobileNav === 'function') {
          const drawer = document.getElementById('mobile-nav-drawer');
          if (drawer && drawer.classList.contains('show')) {
            toggleMobileNav();
          }
        }
        this.openAuthModal();
      };

      const btn1 = document.getElementById('btn-open-login');
      if (btn1) btn1.addEventListener('click', openLogin);

      const btn2 = document.getElementById('btn-drawer-open-login');
      if (btn2) btn2.addEventListener('click', openLogin);
    }
  },

  bindEvents() {
    const modal = document.getElementById('auth-modal');
    if (modal) {
      const closeBtn = modal.querySelector('.btn-close-modal');
      if (closeBtn) {
        closeBtn.addEventListener('click', () => this.closeAuthModal());
      }
      modal.addEventListener('click', (e) => {
        if (e.target === modal) this.closeAuthModal();
      });
    }
  },

  openAuthModal(defaultTab = 'login') {
    let modal = document.getElementById('auth-modal');
    if (!modal) {
      this.createAuthModalDOM();
      modal = document.getElementById('auth-modal');
    }
    this.switchAuthTab(defaultTab);
    modal.classList.add('show');
  },

  closeAuthModal() {
    const modal = document.getElementById('auth-modal');
    if (modal) modal.classList.remove('show');
  },

  switchAuthTab(tab) {
    const loginForm = document.getElementById('auth-login-form');
    const registerForm = document.getElementById('auth-register-form');
    const tabLogin = document.getElementById('tab-btn-login');
    const tabRegister = document.getElementById('tab-btn-register');

    if (tab === 'login') {
      loginForm.style.display = 'block';
      registerForm.style.display = 'none';
      tabLogin.classList.add('active');
      tabRegister.classList.remove('active');
    } else {
      loginForm.style.display = 'none';
      registerForm.style.display = 'block';
      tabRegister.classList.add('active');
      tabLogin.classList.remove('active');
    }
  },

  async login(email, password) {
    try {
      const res = await API.post('/auth/login', { email, password });
      API.setToken(res.data.token);
      API.setUser(res.data.user);
      API.toast(`Hoş geldiniz, ${res.data.user.full_name}!`, 'success');
      this.closeAuthModal();
      this.renderHeaderUser();

      if (window.location.pathname.includes('admin') || window.location.pathname.includes('rezervasyonlarim')) {
        window.location.reload();
      }
      return res.data.user;
    } catch (err) {
      console.error('Giriş hatası:', err);
    }
  },

  async register(formData) {
    try {
      const res = await API.post('/auth/register', formData);
      API.setToken(res.data.token);
      API.setUser(res.data.user);
      API.toast('Hesabınız başarıyla oluşturuldu!', 'success');
      this.closeAuthModal();
      this.renderHeaderUser();
      if (window.location.pathname.includes('admin') || window.location.pathname.includes('rezervasyonlarim')) {
        window.location.reload();
      }
      return res.data.user;
    } catch (err) {
      console.error('Kayıt hatası:', err);
    }
  },

  logout() {
    API.setToken(null);
    API.setUser(null);
    API.toast('Oturum kapatıldı.', 'info');
    this.renderHeaderUser();
    if (window.location.pathname.includes('admin') || window.location.pathname.includes('rezervasyonlarim')) {
      window.location.href = '/';
    }
  },

  createAuthModalDOM() {
    const div = document.createElement('div');
    div.id = 'auth-modal';
    div.className = 'modal-backdrop';
    div.innerHTML = `
      <div class="modal-card">
        <div class="modal-header">
          <div style="display: flex; gap: 8px;">
            <button class="cat-tab active" id="tab-btn-login" onclick="Auth.switchAuthTab('login')">Giriş Yap</button>
            <button class="cat-tab" id="tab-btn-register" onclick="Auth.switchAuthTab('register')">Üye Ol</button>
          </div>
          <span class="btn-close-modal" onclick="Auth.closeAuthModal()">&times;</span>
        </div>

        <div class="modal-body">
          <form id="auth-login-form" onsubmit="event.preventDefault(); Auth.handleLoginForm();">
            <div class="form-group">
              <label class="form-label">E-Posta Adresi</label>
              <input type="email" id="login-email" class="form-input" placeholder="ornek@domain.com" required>
            </div>
            <div class="form-group">
              <label class="form-label">Şifre</label>
              <input type="password" id="login-password" class="form-input" placeholder="••••••••" required>
            </div>
            <button type="submit" class="btn btn-obsidian" style="width: 100%; margin-top: 8px;">
              Giriş Yap
            </button>
          </form>

          <form id="auth-register-form" style="display: none;" onsubmit="event.preventDefault(); Auth.handleRegisterForm();">
            <div class="form-group">
              <label class="form-label">Adınız ve Soyadınız</label>
              <input type="text" id="reg-name" class="form-input" placeholder="Ad Soyad" required>
            </div>
            <div class="form-group">
              <label class="form-label">E-Posta Adresi</label>
              <input type="email" id="reg-email" class="form-input" placeholder="ornek@domain.com" required>
            </div>
            <div class="form-group">
              <label class="form-label">Telefon Numarası</label>
              <input type="tel" id="reg-phone" class="form-input" placeholder="+90 5XX XXX XX XX">
            </div>
            <div class="form-group">
              <label class="form-label">Şifre (En az 6 karakter)</label>
              <input type="password" id="reg-password" class="form-input" placeholder="••••••••" minlength="6" required>
            </div>
            <button type="submit" class="btn btn-brass" style="width: 100%; margin-top: 8px;">
              Hesap Oluştur
            </button>
          </form>
        </div>
      </div>
    `;

    div.addEventListener('click', (e) => {
      if (e.target === div) Auth.closeAuthModal();
    });

    document.body.appendChild(div);
  },

  handleLoginForm() {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    this.login(email, password);
  },

  handleRegisterForm() {
    const fullName = document.getElementById('reg-name').value;
    const email = document.getElementById('reg-email').value;
    const phone = document.getElementById('reg-phone').value;
    const password = document.getElementById('reg-password').value;
    this.register({ fullName, email, phone, password });
  }
};

document.addEventListener('DOMContentLoaded', () => {
  Auth.init();
});
