/**
 * PEAK OTEL - ADMIN MANAGEMENT PORTAL
 * PMS Occupancy Matrix, Room Image Uploads, Price Adjustments, and Booking Control.
 */

const Admin = {
  currentTab: 'dashboard',
  calendarStartDate: new Date().toISOString().split('T')[0],
  calendarDays: 14,
  rooms: [],
  bookings: [],

  async init() {
    this.checkAdminAuth();
    this.bindNavigation();
    await this.loadDashboard();
  },

  checkAdminAuth() {
    const user = API.getUser();
    if (!user || user.role !== 'admin') {
      // Show admin login overlay
      this.showAdminLoginPrompt();
      return false;
    }

    document.getElementById('admin-user-display').textContent = user.full_name || 'Yönetici';
    return true;
  },

  showAdminLoginPrompt() {
    const overlay = document.createElement('div');
    overlay.className = 'modal-backdrop show';
    overlay.id = 'admin-auth-overlay';
    overlay.innerHTML = `
      <div class="modal-card" style="text-align: center; padding: 36px 28px; max-width: 420px;">
        <span style="font-size: 2.8rem;">🔒</span>
        <h3 style="margin-top: 14px; font-size: 1.5rem;">Yönetici Girişi</h3>
        <p style="color: var(--color-muted); font-size: 0.9rem; margin-top: 8px;">
          Peak Otel yönetim paneline erişmek için lütfen yetkili yönetici hesabınızla oturum açınız.
        </p>

        <form id="admin-login-form" onsubmit="event.preventDefault(); Admin.handleAdminLogin();" style="margin-top: 20px; text-align: left;">
          <div class="form-group">
            <label class="form-label">Yönetici E-Posta</label>
            <input type="email" id="admin-login-email" class="form-input" placeholder="admin@peakotel.com" required>
          </div>
          <div class="form-group">
            <label class="form-label">Şifre</label>
            <input type="password" id="admin-login-password" class="form-input" placeholder="••••••••" required>
          </div>
          <button type="submit" class="btn btn-brass" style="width: 100%; margin-top: 10px;">
            Yönetici Girişi Yap
          </button>
        </form>

        <a href="/" class="btn btn-outline" style="width: 100%; margin-top: 10px;">
          Müşteri Sitesine Dön
        </a>
      </div>
    `;
    document.body.appendChild(overlay);
  },

  async handleAdminLogin() {
    const email = document.getElementById('admin-login-email').value.trim();
    const password = document.getElementById('admin-login-password').value;

    try {
      const res = await API.post('/auth/login', { email, password });
      if (res.data.user.role !== 'admin') {
        API.toast('Bu panele erişim için yönetici yetkisi gerekmektedir.', 'error');
        return;
      }
      API.setToken(res.data.token);
      API.setUser(res.data.user);
      API.toast('Yönetici olarak giriş yapıldı.', 'success');
      const overlay = document.getElementById('admin-auth-overlay');
      if (overlay) overlay.remove();
      this.checkAdminAuth();
      this.loadDashboard();
    } catch (err) {
      console.error("Yonetim paneli veri hatasi:", err);
    }
  },

  bindNavigation() {
    const navItems = document.querySelectorAll('.admin-nav-item[data-tab]');
    navItems.forEach(item => {
      item.addEventListener('click', () => {
        navItems.forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        this.switchTab(item.dataset.tab);
      });
    });
  },

  switchTab(tabName) {
    this.currentTab = tabName;
    document.querySelectorAll('.admin-tab-panel').forEach(p => p.classList.remove('active'));
    const target = document.getElementById(`tab-${tabName}`);
    if (target) target.classList.add('active');

    const titleMap = {
      dashboard: 'Genel Bakış & Metrikler',
      calendar: 'PMS Doluluk Takvimi (Zaman Çizelgesi)',
      rooms: 'Oda, Resim & Fiyat Yönetimi',
      bookings: 'Rezervasyon Yönetimi',
      customers: 'Kayıtlı Misafirler'
    };
    document.getElementById('admin-page-heading').textContent = titleMap[tabName] || 'Yönetim Paneli';

    if (tabName === 'dashboard') this.loadDashboard();
    if (tabName === 'calendar') this.loadCalendar();
    if (tabName === 'rooms') this.loadRooms();
    if (tabName === 'bookings') this.loadBookings();
    if (tabName === 'customers') this.loadCustomers();
  },

  // 1. Dashboard KPIs
  async loadDashboard() {
    try {
      const res = await API.get('/admin/dashboard');
      const data = res.data;

      document.getElementById('kpi-occupancy').textContent = `%${data.occupancyRate}`;
      document.getElementById('kpi-occupied-rooms').textContent = `${data.occupiedToday} / ${data.totalRooms} Oda`;
      document.getElementById('kpi-today-checkins').textContent = `${data.todayCheckIns} Giriş / ${data.todayCheckOuts} Çıkış`;
      document.getElementById('kpi-revenue').textContent = `₺${data.totalRevenue.toLocaleString('tr-TR')}`;

      // Load recent bookings for dashboard quick table
      const bRes = await API.get('/admin/bookings');
      this.renderDashboardRecentBookings(bRes.data.slice(0, 5));
    } catch (err) {
      console.error("Yonetim paneli veri hatasi:", err);
    }
  },

  renderDashboardRecentBookings(list) {
    const tbody = document.getElementById('dashboard-recent-bookings-tbody');
    if (!tbody) return;

    if (!list.length) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--color-muted);">Kayıtlı rezervasyon bulunmuyor.</td></tr>';
      return;
    }

    tbody.innerHTML = list.map(b => `
      <tr>
        <td><strong>${b.booking_code}</strong></td>
        <td>Oda ${b.room_number} (${b.room_name})</td>
        <td>${b.guest_name}</td>
        <td>${b.check_in} — ${b.check_out}</td>
        <td>₺${b.total_price.toLocaleString('tr-TR')}</td>
        <td>${this.renderStatusBadge(b.status)}</td>
      </tr>
    `).join('');
  },

  // 2. Interactive PMS Occupancy Calendar Matrix
  async loadCalendar() {
    try {
      const res = await API.get('/admin/calendar', {
        startDate: this.calendarStartDate,
        days: this.calendarDays
      });

      const { dates, matrix, dailyStats } = res.data;
      this.renderCalendarMatrix(dates, matrix, dailyStats);
      this.updateCalendarControls(dates);
    } catch (err) {
      console.error("Yonetim paneli veri hatasi:", err);
    }
  },

  updateCalendarControls(dates) {
    const picker = document.getElementById('calendar-date-picker');
    if (picker && this.calendarStartDate) {
      picker.value = this.calendarStartDate;
    }

    const daysSelect = document.getElementById('calendar-days-select');
    if (daysSelect) {
      daysSelect.value = String(this.calendarDays || 14);
    }

    const badge = document.getElementById('calendar-current-range-badge');
    if (badge && dates && dates.length > 0) {
      const first = dates[0].label;
      const last = dates[dates.length - 1].label;
      const firstYear = dates[0].iso.split('-')[0];
      const lastYear = dates[dates.length - 1].iso.split('-')[0];
      const yearStr = firstYear === lastYear ? firstYear : `${firstYear} / ${lastYear}`;
      badge.innerHTML = `📌 ${first} — ${last} ${yearStr} <span style="opacity: 0.7; font-weight: 400;">(${dates.length} Gün)</span>`;
    }
  },

  jumpToDate(dateStr) {
    if (!dateStr) return;
    this.calendarStartDate = dateStr;
    const quickSelect = document.getElementById('calendar-quick-jump');
    if (quickSelect) quickSelect.selectedIndex = 0;
    this.loadCalendar();
  },

  quickJumpMonths(monthsCount) {
    if (monthsCount === '' || monthsCount === null) return;
    const months = parseInt(monthsCount, 10);
    const d = new Date();
    d.setMonth(d.getMonth() + months);

    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    this.calendarStartDate = `${y}-${m}-${day}`;

    const picker = document.getElementById('calendar-date-picker');
    if (picker) picker.value = this.calendarStartDate;

    this.loadCalendar();
  },

  changeCalendarDays(days) {
    this.calendarDays = parseInt(days, 10) || 14;
    this.loadCalendar();
  },

  shiftCalendar(daysDelta) {
    if (!this.calendarStartDate) {
      this.calendarStartDate = new Date().toISOString().split('T')[0];
    }
    const parts = this.calendarStartDate.split('-').map(Number);
    const current = new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0);
    current.setDate(current.getDate() + daysDelta);

    const y = current.getFullYear();
    const m = String(current.getMonth() + 1).padStart(2, '0');
    const d = String(current.getDate()).padStart(2, '0');
    this.calendarStartDate = `${y}-${m}-${d}`;

    const picker = document.getElementById('calendar-date-picker');
    if (picker) picker.value = this.calendarStartDate;
    const quickSelect = document.getElementById('calendar-quick-jump');
    if (quickSelect) quickSelect.selectedIndex = 0;

    this.loadCalendar();
  },

  resetCalendarToToday() {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    this.calendarStartDate = `${y}-${m}-${d}`;

    const picker = document.getElementById('calendar-date-picker');
    if (picker) picker.value = this.calendarStartDate;
    const quickSelect = document.getElementById('calendar-quick-jump');
    if (quickSelect) quickSelect.selectedIndex = 0;

    if (this.currentTab !== 'calendar') {
      const navItem = document.querySelector('.admin-nav-item[data-tab="calendar"]');
      if (navItem) {
        document.querySelectorAll('.admin-nav-item[data-tab]').forEach(i => i.classList.remove('active'));
        navItem.classList.add('active');
        this.switchTab('calendar');
        return;
      }
    }

    this.loadCalendar();
  },

  renderCalendarMatrix(dates, matrix, dailyStats) {
    const table = document.getElementById('calendar-matrix-table');
    if (!table) return;

    // Build the Header Row
    let theadHTML = `
      <tr>
        <th class="col-room-header">Oda / Tarih</th>
        ${dates.map(d => `
          <th class="calendar-day-th ${d.isWeekend ? 'weekend' : ''}">
            <span style="font-size: 0.68rem; text-transform: uppercase;">${d.dayName}</span>
            <span class="day-number">${d.label}</span>
          </th>
        `).join('')}
      </tr>
    `;

    // Build the Room Rows
    let tbodyHTML = matrix.map(row => {
      const room = row.room;
      const cellsHTML = row.days.map(day => {
        if (day.status === 'occupied') {
          return `
            <td class="matrix-cell">
              <div class="matrix-slot-occupied ${day.isCheckInDay ? 'check-in-day' : ''}" 
                   title="${day.guestName} (${day.bookingCode})"
                   onclick="Admin.viewBookingDetailByCode('${day.bookingCode}')">
                <span class="guest-abbr">${day.guestName.split(' ')[0]}</span>
                <span class="code-mini">${day.bookingCode}</span>
              </div>
            </td>
          `;
        } else {
          return `
            <td class="matrix-cell">
              <div class="matrix-slot-free" title="Müsait">
                <span>—</span>
              </div>
            </td>
          `;
        }
      }).join('');

      return `
        <tr>
          <td class="col-room-header">
            <div class="room-matrix-info">
              <img src="${room.image_url}" alt="Oda" class="room-thumb-mini">
              <div class="room-meta-mini">
                <div class="room-num">Oda ${room.room_number}</div>
                <div class="room-type">${room.room_type} • ₺${room.price_per_night.toLocaleString('tr-TR')}</div>
              </div>
            </div>
          </td>
          ${cellsHTML}
        </tr>
      `;
    }).join('');

    // Build the Daily Occupancy Summary Footer
    let tfootHTML = `
      <tr style="background-color: #faf9f6; font-weight: 700;">
        <td class="col-room-header">Doluluk Oranı</td>
        ${dailyStats.map(stat => `
          <td style="font-size: 0.74rem; color: ${stat.occupancyRate > 50 ? 'var(--color-brass-hover)' : 'var(--color-stone)'};">
            %${stat.occupancyRate}
          </td>
        `).join('')}
      </tr>
    `;

    table.innerHTML = `
      <thead>${theadHTML}</thead>
      <tbody>${tbodyHTML}</tbody>
      <tfoot>${tfootHTML}</tfoot>
    `;
  },

  // 3. Room & Price & Image Management
  async loadRooms() {
    try {
      const res = await API.get('/rooms');
      this.rooms = res.data || [];
      this.renderRoomsTable();
    } catch (err) {
      console.error("Yonetim paneli veri hatasi:", err);
    }
  },

  renderRoomsTable() {
    const tbody = document.getElementById('rooms-management-tbody');
    if (!tbody) return;

    tbody.innerHTML = this.rooms.map(room => `
      <tr data-room-row="${room.id}">
        <td>
          <div class="room-image-manager-cell">
            <div class="room-image-thumb-wrap">
              <img id="room-thumb-${room.id}" src="${room.image_url}" alt="Oda">
            </div>
            <div>
              <label class="btn-upload-label" title="Sadece fotoğrafı hızlıca değiştir">
                📷 Yükle
                <input type="file" accept="image/*" style="display: none;" onchange="Admin.handleImageUpload(${room.id}, this.files[0])">
              </label>
            </div>
          </div>
        </td>
        <td>
          <div style="font-weight: 700; font-size: 0.95rem;">Oda ${room.room_number}</div>
          <div style="font-size: 0.78rem; color: var(--color-muted); max-width: 220px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${room.name}">${room.name}</div>
        </td>
        <td><span class="badge badge-brass">${room.room_type}</span></td>
        <td>
          <div style="font-weight: 600;">${room.floor}. Kat</div>
          <div style="font-size: 0.75rem; color: var(--color-muted);">${room.size_m2} m²</div>
        </td>
        <td>👥 ${room.max_guests} Kişi</td>
        <td>
          <div style="display: flex; align-items: center; gap: 4px;">
            <span>₺</span>
            <input type="number" id="price-input-${room.id}" class="inline-price-input" value="${room.price_per_night}">
            <button class="btn btn-outline-brass btn-sm" onclick="Admin.updatePrice(${room.id})" title="Hızlı Fiyat Kaydet">
              ✓
            </button>
          </div>
        </td>
        <td>
          <select class="status-select" onchange="Admin.updateRoomStatus(${room.id}, this.value)">
            <option value="active" ${room.status === 'active' ? 'selected' : ''}>Aktif</option>
            <option value="maintenance" ${room.status === 'maintenance' ? 'selected' : ''}>Bakımda</option>
          </select>
        </td>
        <td style="text-align: right;">
          <button class="btn btn-outline-brass btn-sm" onclick="Admin.openEditRoomModal(${room.id})" title="Ad, Kategori, Olanaklar ve Tüm Detayları Düzenle">
            ✏️ Detaylı Düzenle
          </button>
        </td>
      </tr>
    `).join('');
  },

  // Room Detail Editor Modal (All attributes & amenities)
  openEditRoomModal(roomId) {
    const room = this.rooms.find(r => r.id === roomId);
    if (!room) return;
    this.showRoomEditorModal(room, false);
  },

  openCreateRoomModal() {
    const emptyRoom = {
      id: null,
      room_number: '',
      name: '',
      room_type: 'Standart',
      floor: 1,
      size_m2: 28,
      max_guests: 2,
      price_per_night: 2800,
      view_type: 'Bahçe & Doğa Manzaralı',
      bed_type: '1 Çift Kişilik Ortopedik Queen Yatak',
      description: 'Zarif ve konforlu bir konaklama deneyimi sunan modern odamız.',
      amenities: ['Yüksek Hızlı Wi-Fi', 'Sessiz İklimlendirme / Klima', 'Yağmur Duş & Mermer Banyo', 'Düz Ekran Smart TV', 'Elektronik Güvenlik Kasası'],
      status: 'active',
      image_url: '/images/rooms/1.jpg'
    };
    this.showRoomEditorModal(emptyRoom, true);
  },

  showRoomEditorModal(room, isCreate) {
    this.closeEditRoomModal();

    const escapeAttr = (s) => (s ? String(s).replace(/"/g, '&quot;') : '');
    const escapeText = (s) => (s ? String(s).replace(/</g, '&lt;').replace(/>/g, '&gt;') : '');

    const amenitiesList = Array.isArray(room.amenities) ? room.amenities : [];
    const amenitiesText = amenitiesList.join('\n');

    const modal = document.createElement('div');
    modal.id = 'room-editor-modal';
    modal.className = 'modal-backdrop show';
    modal.innerHTML = `
      <div class="modal-card room-editor-card">
        <button class="modal-close-floating" onclick="Admin.closeEditRoomModal()" title="Kapat" aria-label="Kapat">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>

        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; padding-bottom: 12px; border-bottom: var(--border-hairline);">
          <div>
            <h3 style="font-size: 1.35rem; margin: 0; color: var(--color-obsidian);">
              ${isCreate ? '➕ Yeni Oda Ekle' : `✏️ Oda ${room.room_number} - Detaylı Düzenleme`}
            </h3>
            <p style="font-size: 0.82rem; color: var(--color-muted); margin: 4px 0 0;">
              Oda adı, kategorisi, boyutu, yatak, manzara, fiyat, açıklama ve tüm olanakları güncelleyin.
            </p>
          </div>
          <span class="badge badge-brass" style="font-size: 0.82rem;">${isCreate ? 'Yeni Kayıt' : (room.room_type || 'Oda')}</span>
        </div>

        <form id="room-editor-form" onsubmit="event.preventDefault(); Admin.saveRoomEdit(${room.id ? room.id : 'null'});">

                    <div class="room-editor-section">
            <div class="room-editor-section-title">
              <span>🏷️</span> Temel Oda Bilgileri & Seçki
            </div>
            <div class="room-editor-grid-3">
              <div class="form-group" style="margin-bottom: 0;">
                <label class="form-label">Oda Numarası *</label>
                <input type="text" id="edit-room-number" class="form-input" value="${escapeAttr(room.room_number)}" required placeholder="Örn: 105">
              </div>
              <div class="form-group" style="margin-bottom: 0;">
                <label class="form-label">Kategori / Seçki *</label>
                <select id="edit-room-type" class="form-input">
                  <option value="Standart" ${room.room_type === 'Standart' ? 'selected' : ''}>Standart</option>
                  <option value="Superior" ${room.room_type === 'Superior' ? 'selected' : ''}>Superior</option>
                  <option value="Deluxe" ${room.room_type === 'Deluxe' ? 'selected' : ''}>Deluxe</option>
                  <option value="Executive" ${room.room_type === 'Executive' ? 'selected' : ''}>Executive</option>
                  <option value="Suite" ${room.room_type === 'Suite' ? 'selected' : ''}>Suite</option>
                  <option value="Penthouse" ${room.room_type === 'Penthouse' ? 'selected' : ''}>Penthouse</option>
                  <option value="Family" ${room.room_type === 'Family' ? 'selected' : ''}>Family (Aile)</option>
                </select>
              </div>
              <div class="form-group" style="margin-bottom: 0;">
                <label class="form-label">Gecelik Fiyat (₺) *</label>
                <input type="number" id="edit-room-price" class="form-input" value="${room.price_per_night || 2500}" min="100" required>
              </div>
            </div>

            <div class="form-group" style="margin-top: 12px; margin-bottom: 0;">
              <label class="form-label">Oda Başlığı / Adı *</label>
              <input type="text" id="edit-room-name" class="form-input" value="${escapeAttr(room.name)}" required placeholder="Örn: Standart King (İç Avlu & Bahçe)">
            </div>

            <div class="room-editor-grid-3" style="margin-top: 12px;">
              <div class="form-group" style="margin-bottom: 0;">
                <label class="form-label">Bulunduğu Kat</label>
                <input type="number" id="edit-room-floor" class="form-input" value="${room.floor || 1}" min="1" max="20">
              </div>
              <div class="form-group" style="margin-bottom: 0;">
                <label class="form-label">Oda Boyutu (m²)</label>
                <input type="number" id="edit-room-size" class="form-input" value="${room.size_m2 || 30}" min="10" max="1000">
              </div>
              <div class="form-group" style="margin-bottom: 0;">
                <label class="form-label">Misafir Kapasitesi (Kişi)</label>
                <input type="number" id="edit-room-guests" class="form-input" value="${room.max_guests || 2}" min="1" max="10">
              </div>
            </div>
          </div>

                    <div class="room-editor-section">
            <div class="room-editor-section-title">
              <span>🛏️</span> Konfor, Manzara & Yatak Seçimi
            </div>
            <div class="room-editor-grid-2">
              <div class="form-group" style="margin-bottom: 0;">
                <label class="form-label">Manzara Tipi</label>
                <input type="text" id="edit-room-view" class="form-input" value="${escapeAttr(room.view_type || '')}" placeholder="Örn: İç Avlu & Bahçe Manzaralı">
              </div>
              <div class="form-group" style="margin-bottom: 0;">
                <label class="form-label">Yatak Tipi & Konfigürasyon</label>
                <input type="text" id="edit-room-bed" class="form-input" value="${escapeAttr(room.bed_type || '')}" placeholder="Örn: 1 Çift Kişilik Ortopedik Queen Yatak">
              </div>
            </div>
            <div class="form-group" style="margin-top: 12px; margin-bottom: 0;">
              <label class="form-label">Oda Durumu</label>
              <select id="edit-room-status" class="form-input">
                <option value="active" ${room.status === 'active' ? 'selected' : ''}>Aktif (Rezervasyona Açık)</option>
                <option value="maintenance" ${room.status === 'maintenance' ? 'selected' : ''}>Bakımda (Geçici Olarak Kapalı)</option>
              </select>
            </div>
          </div>

                    <div class="room-editor-section">
            <div class="room-editor-section-title">
              <span>📝</span> Oda Hakkında Açıklama
            </div>
            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label">Detaylı Tanıtım Metni</label>
              <textarea id="edit-room-description" rows="3" class="form-input" style="width: 100%; font-family: inherit; font-size: 0.88rem; line-height: 1.5; resize: vertical;" placeholder="Odanın mimari atmosferini, sunduğu rahatlığı ve dinlendirici detaylarını anlatın...">${escapeText(room.description || '')}</textarea>
            </div>
          </div>

                    <div class="room-editor-section">
            <div class="room-editor-section-title" style="justify-content: space-between;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span>✨</span> Öne Çıkan Olanaklar & Ayrıcalıklar
              </div>
              <span style="font-size: 0.72rem; color: var(--color-muted); font-weight: normal;">(Her satıra bir özellik yazınız)</span>
            </div>

            <textarea id="edit-room-amenities" rows="6" class="form-input" style="width: 100%; font-family: inherit; font-size: 0.88rem; line-height: 1.6; resize: vertical;" placeholder="Yüksek Hızlı Wi-Fi&#10;Sessiz İklimlendirme / Klima&#10;Yağmur Duş & Mermer Banyo...">${escapeText(amenitiesText)}</textarea>

            <div style="margin-top: 10px;">
              <span style="font-size: 0.74rem; color: var(--color-muted); display: block; margin-bottom: 6px;">Hızlı Ekle (Tıklayarak listeye ekleyebilirsiniz):</span>
              <div class="quick-tags-container">
                <button type="button" class="quick-tag-btn" onclick="Admin.appendAmenityTag('Yüksek Hızlı Wi-Fi')">+ Wi-Fi</button>
                <button type="button" class="quick-tag-btn" onclick="Admin.appendAmenityTag('Sessiz İklimlendirme / Klima')">+ Klima</button>
                <button type="button" class="quick-tag-btn" onclick="Admin.appendAmenityTag('Yağmur Duş & Mermer Banyo')">+ Yağmur Duş</button>
                <button type="button" class="quick-tag-btn" onclick="Admin.appendAmenityTag('Nespresso Kahve Makinesi')">+ Nespresso</button>
                <button type="button" class="quick-tag-btn" onclick="Admin.appendAmenityTag('Düz Ekran Smart TV')">+ Smart TV</button>
                <button type="button" class="quick-tag-btn" onclick="Admin.appendAmenityTag('Elektronik Güvenlik Kasası')">+ Kasa</button>
                <button type="button" class="quick-tag-btn" onclick="Admin.appendAmenityTag('L\'Occitane Buklet')">+ L'Occitane</button>
                <button type="button" class="quick-tag-btn" onclick="Admin.appendAmenityTag('Özel Balkon & Oturma Grubu')">+ Balkon</button>
                <button type="button" class="quick-tag-btn" onclick="Admin.appendAmenityTag('Jakuzili Masaj Küveti')">+ Jakuzi</button>
                <button type="button" class="quick-tag-btn" onclick="Admin.appendAmenityTag('Marshall Bluetooth Hoparlör')">+ Ses Sistemi</button>
                <button type="button" class="quick-tag-btn" onclick="Admin.appendAmenityTag('Yastık Menüsü (Ortopedik/Kuş Tüyü)')">+ Yastık Menüsü</button>
                <button type="button" class="quick-tag-btn" onclick="Admin.appendAmenityTag('Gurme Minibar & Şarap Dolabı')">+ Minibar</button>
              </div>
            </div>
          </div>

                    <div class="room-editor-section">
            <div class="room-editor-section-title">
              <span>📷</span> Oda Fotoğrafı
            </div>
            <div style="display: flex; align-items: center; gap: 16px; flex-wrap: wrap;">
              <img id="edit-room-image-preview" src="${room.image_url || '/images/rooms/1.jpg'}" alt="Önizleme" style="width: 120px; height: 80px; object-fit: cover; border-radius: var(--radius-xs); border: 1px solid #d9d4c7;">
              <div>
                <label class="btn-upload-label" style="font-size: 0.85rem; padding: 8px 14px;">
                  📁 Yeni Fotoğraf Seç / Değiştir
                  <input type="file" id="edit-room-file-input" accept="image/*" style="display: none;" onchange="Admin.handleEditorImagePreview(this.files[0])">
                </label>
                <div id="edit-room-file-name" style="font-size: 0.75rem; color: var(--color-muted); margin-top: 4px;">Mevcut: ${room.image_url || 'Varsayılan'}</div>
              </div>
            </div>
          </div>

                    <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 24px; padding-top: 16px; border-top: var(--border-hairline);">
            <button type="button" class="btn btn-outline" onclick="Admin.closeEditRoomModal()">İptal</button>
            <button type="submit" class="btn btn-brass" id="btn-save-room-editor">💾 ${isCreate ? 'Odayı Kaydet' : 'Değişiklikleri Kaydet'}</button>
          </div>

        </form>
      </div>
    `;

    modal.addEventListener('click', (e) => {
      if (e.target === modal) Admin.closeEditRoomModal();
    });

    const escHandler = (e) => {
      if (e.key === 'Escape') {
        Admin.closeEditRoomModal();
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);

    document.body.appendChild(modal);
  },

  closeEditRoomModal() {
    const modal = document.getElementById('room-editor-modal');
    if (modal) modal.remove();
  },

  appendAmenityTag(tag) {
    const textarea = document.getElementById('edit-room-amenities');
    if (!textarea) return;
    const lines = textarea.value.split('\n').map(l => l.trim()).filter(Boolean);
    if (!lines.includes(tag)) {
      lines.push(tag);
      textarea.value = lines.join('\n');
      API.toast(`"${tag}" olanağı eklendi.`, 'info');
    }
  },

  handleEditorImagePreview(file) {
    if (!file) return;
    const preview = document.getElementById('edit-room-image-preview');
    const fileName = document.getElementById('edit-room-file-name');
    if (preview) {
      preview.src = URL.createObjectURL(file);
    }
    if (fileName) {
      fileName.textContent = `Seçilen Dosya: ${file.name} (${(file.size / 1024).toFixed(0)} KB)`;
      fileName.style.color = 'var(--color-brass-hover)';
    }
  },

  async saveRoomEdit(roomId) {
    const btn = document.getElementById('btn-save-room-editor');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Kaydediliyor...';
    }

    try {
      const room_number = document.getElementById('edit-room-number').value.trim();
      const name = document.getElementById('edit-room-name').value.trim();
      const room_type = document.getElementById('edit-room-type').value;
      const price_per_night = parseFloat(document.getElementById('edit-room-price').value) || 0;
      const floor = parseInt(document.getElementById('edit-room-floor').value, 10) || 1;
      const size_m2 = parseInt(document.getElementById('edit-room-size').value, 10) || 25;
      const max_guests = parseInt(document.getElementById('edit-room-guests').value, 10) || 2;
      const view_type = document.getElementById('edit-room-view').value.trim();
      const bed_type = document.getElementById('edit-room-bed').value.trim();
      const status = document.getElementById('edit-room-status').value;
      const description = document.getElementById('edit-room-description').value.trim();

      const rawAmenities = document.getElementById('edit-room-amenities').value;
      const amenities = rawAmenities
        .split('\n')
        .map(line => line.trim().replace(/^[✓\-\*\•\d\.]+\s*/, ''))
        .filter(line => line.length > 0);

      const payload = {
        room_number,
        name,
        room_type,
        price_per_night,
        floor,
        size_m2,
        max_guests,
        view_type,
        bed_type,
        status,
        description,
        amenities
      };

      let targetId = roomId;

      if (!roomId) {
        // Create new room
        const res = await API.post('/admin/rooms', payload);
        targetId = res.data.id;
        API.toast('Yeni oda envantere başarıyla eklendi!', 'success');
      } else {
        // Update existing room
        await API.put(`/admin/rooms/${roomId}`, payload);
        API.toast(`Oda ${room_number} tüm bilgileriyle başarıyla güncellendi!`, 'success');
      }

      // Check if image file was selected
      const fileInput = document.getElementById('edit-room-file-input');
      if (fileInput && fileInput.files && fileInput.files[0] && targetId) {
        const formData = new FormData();
        formData.append('image', fileInput.files[0]);
        await API.post(`/admin/rooms/${targetId}/image`, formData);
        API.toast('Oda fotoğrafı başarıyla yüklendi ve güncellendi.', 'info');
      }

      this.closeEditRoomModal();
      await this.loadRooms();
    } catch (err) {
      console.error('Oda kaydetme hatası:', err);
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = '💾 Değişiklikleri Kaydet';
      }
    }
  },

  async updatePrice(roomId) {
    const input = document.getElementById(`price-input-${roomId}`);
    const newPrice = input.value;

    try {
      await API.patch(`/admin/rooms/${roomId}/price`, { price: newPrice });
      API.toast(`Oda fiyatı ₺${Number(newPrice).toLocaleString('tr-TR')} olarak güncellendi.`, 'success');
      this.loadRooms();
    } catch (err) {
      console.error('Fiyat güncelleme hatası:', err);
    }
  },

  async handleImageUpload(roomId, file) {
    if (!file) return;

    const formData = new FormData();
    formData.append('image', file);

    try {
      const res = await API.post(`/admin/rooms/${roomId}/image`, formData);
      const newUrl = res.data.imageUrl;
      document.getElementById(`room-thumb-${roomId}`).src = newUrl;
      API.toast('Oda fotoğrafı başarıyla yüklendi ve güncellendi!', 'success');
      this.loadRooms();
    } catch (err) {
      console.error('Görsel yükleme hatası:', err);
    }
  },

  async updateRoomStatus(roomId, newStatus) {
    try {
      await API.put(`/admin/rooms/${roomId}`, { status: newStatus });
      API.toast('Oda durumu güncellendi.', 'success');
      this.loadRooms();
    } catch (err) {
      console.error('Oda durum güncelleme hatası:', err);
    }
  },

  // Rezervasyon Yönetimi
  async loadBookings() {
    try {
      const search = document.getElementById('booking-search-input')?.value || '';
      const status = document.getElementById('booking-status-filter')?.value || 'all';

      const res = await API.get('/admin/bookings', { search, status });
      this.bookings = res.data || [];
      this.renderBookingsTable();
    } catch (err) {
      console.error('Rezervasyon yükleme hatası:', err);
    }
  },

  renderBookingsTable() {
    const tbody = document.getElementById('bookings-management-tbody');
    if (!tbody) return;

    if (!this.bookings.length) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--color-muted); padding: 30px;">Kayıtlı rezervasyon bulunamadı.</td></tr>';
      return;
    }

    tbody.innerHTML = this.bookings.map(b => `
      <tr>
        <td>
          <a href="javascript:void(0)" onclick="Admin.viewBookingDetail(${b.id})" style="font-weight: 700; color: var(--color-brass-hover); font-family: monospace;">
            ${b.booking_code}
          </a>
        </td>
        <td>Oda ${b.room_number} (${b.room_type})</td>
        <td>
          <strong>${b.guest_name}</strong>
          <div style="font-size: 0.75rem; color: var(--color-muted);">${b.guest_phone}</div>
        </td>
        <td>${b.check_in} — ${b.check_out} <small>(${b.total_nights} Gece)</small></td>
        <td><strong>₺${b.total_price.toLocaleString('tr-TR')}</strong></td>
        <td>
          <select class="status-select" onchange="Admin.updateBookingStatus(${b.id}, this.value)">
            <option value="confirmed" ${b.status === 'confirmed' ? 'selected' : ''}>Onaylandı</option>
            <option value="checked_in" ${b.status === 'checked_in' ? 'selected' : ''}>Giriş Yapıldı</option>
            <option value="checked_out" ${b.status === 'checked_out' ? 'selected' : ''}>Çıkış Yapıldı</option>
            <option value="cancelled" ${b.status === 'cancelled' ? 'selected' : ''}>İptal Edildi</option>
          </select>
        </td>
        <td>
          <button class="btn btn-outline btn-sm" onclick="Admin.viewBookingDetail(${b.id})">
            📄 İncele
          </button>
        </td>
      </tr>
    `).join('');
  },

  async updateBookingStatus(bookingId, status) {
    try {
      await API.patch(`/admin/bookings/${bookingId}/status`, { status });
      API.toast('Rezervasyon durumu başarıyla güncellendi.', 'success');
      this.loadBookings();
    } catch (err) {
      console.error('Rezervasyon durum güncelleme hatası:', err);
    }
  },

  async viewBookingDetail(bookingId) {
    const booking = this.bookings.find(b => b.id === bookingId);
    if (!booking) return;

    Booking.showConfirmationModal(booking);
  },

  async viewBookingDetailByCode(code) {
    try {
      const res = await API.get(`/bookings/code/${code}`);
      Booking.showConfirmationModal(res.data);
    } catch (err) {
      console.error('Rezervasyon detay getirme hatası:', err);
    }
  },

  // Misafir Yönetimi
  async loadCustomers() {
    try {
      const res = await API.get('/admin/customers');
      const list = res.data || [];
      const tbody = document.getElementById('customers-management-tbody');
      if (!tbody) return;

      tbody.innerHTML = list.map(c => `
        <tr>
          <td><strong>${c.full_name}</strong></td>
          <td>${c.email}</td>
          <td>${c.phone || '—'}</td>
          <td>${c.created_at ? c.created_at.split(' ')[0] : '—'}</td>
          <td><span class="badge badge-brass">${c.total_bookings} Rezervasyon</span></td>
          <td><strong>₺${Number(c.total_spent).toLocaleString('tr-TR')}</strong></td>
        </tr>
      `).join('');
    } catch (err) {
      console.error('Misafir listesi yükleme hatası:', err);
    }
  },

  renderStatusBadge(status) {
    const map = {
      confirmed: '<span class="badge badge-info">Onaylandı</span>',
      checked_in: '<span class="badge badge-success">Giriş Yapıldı</span>',
      checked_out: '<span class="badge badge-dark">Çıkış Yapıldı</span>',
      cancelled: '<span class="badge badge-danger">İptal</span>'
    };
    return map[status] || status;
  }
};

document.addEventListener('DOMContentLoaded', () => {
  Admin.init();
});
