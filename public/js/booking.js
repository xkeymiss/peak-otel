/**
 * Peak Otel - Rezervasyon Motoru
 */

const Booking = {
  currentRoom: null,
  addons: [],
  selectedAddonIds: [],

  async init() {
    await this.loadAddons();
    this.createBookingModalDOM();
  },

  async loadAddons() {
    try {
      const res = await API.get('/bookings/addons');
      this.addons = res.data || [];
    } catch (err) {
      console.error('Hizmetler yüklenemedi:', err);
      this.addons = [];
    }
  },

  async openBookingModal(room, initialCheckIn = null, initialCheckOut = null, initialGuests = 1) {
    this.currentRoom = room;
    this.selectedAddonIds = [];

    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);

    const checkIn = initialCheckIn || document.getElementById('search-checkin')?.value || today.toISOString().split('T')[0];
    const checkOut = initialCheckOut || document.getElementById('search-checkout')?.value || tomorrow.toISOString().split('T')[0];
    const guests = initialGuests || document.getElementById('search-guests')?.value || 1;

    let modal = document.getElementById('booking-modal');
    if (!modal) {
      this.createBookingModalDOM();
      modal = document.getElementById('booking-modal');
    }

    document.getElementById('modal-room-img').src = room.image_url;
    document.getElementById('modal-room-title').textContent = room.name;
    document.getElementById('modal-room-meta').textContent = `Oda ${room.room_number} • ${room.room_type} • ${room.size_m2} m²`;
    document.getElementById('modal-room-price').textContent = `₺${room.price_per_night.toLocaleString('tr-TR')} / gece`;

    const inInput = document.getElementById('bk-checkin');
    const outInput = document.getElementById('bk-checkout');
    const guestsInput = document.getElementById('bk-guests');

    inInput.min = today.toISOString().split('T')[0];
    inInput.value = checkIn;
    outInput.value = checkOut;
    guestsInput.value = guests;
    guestsInput.max = room.max_guests;

    const currentUser = Auth.getCurrentUser();
    if (currentUser) {
      document.getElementById('bk-name').value = currentUser.full_name || '';
      document.getElementById('bk-email').value = currentUser.email || '';
      document.getElementById('bk-phone').value = currentUser.phone || '';
    }

    this.renderAddonsList();
    await this.updatePriceEstimate();

    modal.classList.add('show');
  },

  closeBookingModal() {
    const modal = document.getElementById('booking-modal');
    if (modal) modal.classList.remove('show');
  },

  renderAddonsList() {
    const container = document.getElementById('modal-addons-container');
    if (!container) return;

    if (!this.addons.length) {
      container.innerHTML = '<p style="font-size: 0.8rem; color: var(--color-muted);">Ekstra hizmet bulunmuyor.</p>';
      return;
    }

    container.innerHTML = this.addons.map(addon => {
      const priceText = addon.price_type === 'per_person_per_night'
        ? `+₺${addon.price.toLocaleString('tr-TR')} / kişi / gün`
        : addon.price_type === 'per_night'
          ? `+₺${addon.price.toLocaleString('tr-TR')} / gün`
          : `+₺${addon.price.toLocaleString('tr-TR')} / konaklama`;

      return `
        <label class="addon-item">
          <input type="checkbox" value="${addon.id}" onchange="Booking.toggleAddon(${addon.id}, this.checked)">
          <div class="addon-info">
            <div class="addon-name">${addon.icon || '✨'} ${addon.name}</div>
            <div class="addon-desc">${addon.description}</div>
          </div>
          <div class="addon-price">${priceText}</div>
        </label>
      `;
    }).join('');
  },

  toggleAddon(addonId, isChecked) {
    if (isChecked) {
      if (!this.selectedAddonIds.includes(addonId)) {
        this.selectedAddonIds.push(addonId);
      }
    } else {
      this.selectedAddonIds = this.selectedAddonIds.filter(id => id !== addonId);
    }
    this.updatePriceEstimate();
  },

  async updatePriceEstimate() {
    if (!this.currentRoom) return;

    const checkIn = document.getElementById('bk-checkin').value;
    const checkOut = document.getElementById('bk-checkout').value;
    const guestCount = document.getElementById('bk-guests').value;

    if (!checkIn || !checkOut || new Date(checkOut) <= new Date(checkIn)) {
      document.getElementById('bk-summary-nights').textContent = '—';
      document.getElementById('bk-summary-room-total').textContent = '—';
      document.getElementById('bk-summary-addons-total').textContent = '—';
      document.getElementById('bk-summary-tax').textContent = '—';
      document.getElementById('bk-summary-total').textContent = '—';
      return;
    }

    try {
      const res = await API.post('/bookings/estimate', {
        roomId: this.currentRoom.id,
        checkIn,
        checkOut,
        guestCount: Number(guestCount),
        addonIds: this.selectedAddonIds
      });

      const data = res.data;
      document.getElementById('bk-summary-nights').textContent = `${data.nights} Gece`;
      document.getElementById('bk-summary-room-total').textContent = `₺${data.baseRoomTotal.toLocaleString('tr-TR')}`;
      document.getElementById('bk-summary-addons-total').textContent = `₺${data.addonsTotal.toLocaleString('tr-TR')}`;
      document.getElementById('bk-summary-tax').textContent = `₺${data.taxAmount.toLocaleString('tr-TR')}`;
      document.getElementById('bk-summary-total').textContent = `₺${data.totalPrice.toLocaleString('tr-TR')}`;
    } catch (err) {
      console.error('Fiyat tahmini hatası:', err);
    }
  },

  async submitBooking() {
    if (!this.currentRoom) return;

    const checkIn = document.getElementById('bk-checkin').value;
    const checkOut = document.getElementById('bk-checkout').value;
    const guestCount = document.getElementById('bk-guests').value;
    const guestName = document.getElementById('bk-name').value;
    const guestEmail = document.getElementById('bk-email').value;
    const guestPhone = document.getElementById('bk-phone').value;
    const specialRequests = document.getElementById('bk-notes').value;

    if (!guestName || !guestEmail || !guestPhone) {
      API.toast('Lütfen ad, e-posta ve telefon alanlarını doldurunuz.', 'error');
      return;
    }

    try {
      const res = await API.post('/bookings', {
        roomId: this.currentRoom.id,
        checkIn,
        checkOut,
        guestCount: Number(guestCount),
        guestName,
        guestEmail,
        guestPhone,
        addonIds: this.selectedAddonIds,
        specialRequests
      });

      this.closeBookingModal();
      this.showConfirmationModal(res.data);
      API.toast('Rezervasyonunuz başarıyla onaylandı!', 'success');
    } catch (err) {
      console.error('Rezervasyon gönderim hatası:', err);
    }
  },

  lastBooking: null,

  showConfirmationModal(booking) {
    this.lastBooking = booking;
    let modal = document.getElementById('voucher-modal');
    if (!modal) {
      this.createVoucherModalDOM();
      modal = document.getElementById('voucher-modal');
    }

    const roomNum = booking.room_number || this.currentRoom?.room_number || '';
    const roomName = booking.room_name || this.currentRoom?.name || '';
    const roomType = booking.room_type || this.currentRoom?.room_type || '';

    const content = document.getElementById('voucher-modal-content');
    content.innerHTML = `
      <div style="text-align: center; margin-bottom: 24px;">
        <span style="font-size: 2.8rem; line-height: 1;">🎉</span>
        <h3 style="font-size: 1.6rem; margin-top: 12px; color: var(--color-obsidian);">Rezervasyonunuz Alındı!</h3>
        <p style="color: var(--color-muted); font-size: 0.9rem;">
          Peak Otel ailesi olarak sizi ağırlamaktan büyük mutluluk duyacağız.
        </p>
      </div>

            <div id="printable-voucher" style="border: 2px dashed rgba(184, 147, 92, 0.5); border-radius: var(--radius-sm); padding: 24px; background: #ffffff;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; border-bottom: var(--border-hairline); padding-bottom: 16px;">
          <div>
            <div style="font-family: var(--font-serif); font-size: 1.3rem; font-weight: 700;">PEAK OTEL</div>
            <div style="font-size: 0.72rem; color: var(--color-muted);">BUTİK REZERVASYON BELGESİ</div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 0.72rem; color: var(--color-muted); font-weight: 600;">REZERVASYON KODU</div>
            <div style="font-size: 1.25rem; font-weight: 700; color: var(--color-brass-hover); font-family: monospace;">${booking.booking_code}</div>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; font-size: 0.88rem; margin-bottom: 20px;">
          <div>
            <span style="color: var(--color-muted); font-size: 0.75rem; display: block;">Misafir Adı:</span>
            <strong>${booking.guest_name}</strong>
          </div>
          <div>
            <span style="color: var(--color-muted); font-size: 0.75rem; display: block;">Konaklama Tarihleri:</span>
            <strong>${booking.check_in} — ${booking.check_out} (${booking.total_nights} Gece)</strong>
          </div>
          <div>
            <span style="color: var(--color-muted); font-size: 0.75rem; display: block;">Oda Bilgisi:</span>
            <strong>Oda ${roomNum} (${roomName || roomType})</strong>
          </div>
          <div>
            <span style="color: var(--color-muted); font-size: 0.75rem; display: block;">Kişi Sayısı:</span>
            <strong>${booking.guest_count} Misafir</strong>
          </div>
        </div>

        <div style="background-color: var(--color-surface-subtle); padding: 12px 16px; border-radius: var(--radius-xs); display: flex; justify-content: space-between; align-items: center;">
          <span style="font-weight: 600; font-size: 0.95rem;">Toplam Tutar (KDV Dahil):</span>
          <span style="font-size: 1.25rem; font-weight: 700; color: var(--color-obsidian);">₺${Number(booking.total_price).toLocaleString('tr-TR')}</span>
        </div>
      </div>

            <div style="display: flex; gap: 10px; margin-top: 20px; flex-wrap: wrap;">
        <button class="btn btn-brass" style="flex: 1.2; min-width: 140px;" onclick="Booking.downloadPdf('${booking.booking_code}')">
          ⬇️ PDF Olarak İndir
        </button>
        <button class="btn btn-obsidian" style="flex: 1; min-width: 130px;" onclick="Booking.printVoucher()">
          🖨️ Fişi Yazdır (1 Sayfa)
        </button>
        <button class="btn btn-outline" style="flex: 0.6; min-width: 80px;" onclick="document.getElementById('voucher-modal').classList.remove('show')">
          ✕ Kapat
        </button>
      </div>
    `;

    modal.classList.add('show');
  },

  getVoucherHtml(booking) {
    const roomNum = booking.room_number || this.currentRoom?.room_number || '';
    const roomName = booking.room_name || this.currentRoom?.name || '';
    const roomType = booking.room_type || this.currentRoom?.room_type || '';

    return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <title>Peak Otel Rezervasyon Belgesi - ${booking.booking_code}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,600;0,700;1,400&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Plus Jakarta Sans', sans-serif;
      background: #fbfaf7;
      color: #1a1918;
      padding: 30px;
      display: flex;
      justify-content: center;
    }
    .voucher-card {
      background: #ffffff;
      width: 100%;
      max-width: 720px;
      border: 2px solid #b8935c;
      border-radius: 8px;
      padding: 36px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.06);
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #f0eae1;
      padding-bottom: 20px;
      margin-bottom: 24px;
    }
    .brand-title {
      font-family: 'Playfair Display', serif;
      font-size: 26px;
      font-weight: 700;
      letter-spacing: 2px;
      color: #181716;
    }
    .brand-sub {
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 3px;
      color: #b8935c;
      margin-top: 3px;
    }
    .code-box {
      text-align: right;
    }
    .code-label {
      font-size: 11px;
      font-weight: 700;
      color: #8c857b;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .code-val {
      font-size: 22px;
      font-weight: 700;
      font-family: monospace;
      color: #9c7a45;
      margin-top: 4px;
    }
    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-bottom: 24px;
    }
    .info-box {
      background: #fcfbf9;
      border: 1px solid #ebe6dd;
      border-radius: 6px;
      padding: 12px 16px;
    }
    .info-label {
      font-size: 11px;
      font-weight: 700;
      color: #8c857b;
      text-transform: uppercase;
      margin-bottom: 4px;
    }
    .info-val {
      font-size: 15px;
      font-weight: 600;
      color: #181716;
    }
    .price-box {
      background: #faf6ef;
      border: 1.5px solid #dfc192;
      border-radius: 6px;
      padding: 16px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }
    .price-label {
      font-size: 15px;
      font-weight: 600;
      color: #181716;
    }
    .price-val {
      font-size: 24px;
      font-weight: 700;
      color: #9c7a45;
    }
    .policies {
      font-size: 12px;
      color: #797369;
      line-height: 1.6;
      border-top: 1px solid #f0eae1;
      padding-top: 18px;
    }
    .hotel-contact {
      margin-top: 16px;
      padding-top: 12px;
      border-top: 1px dashed #e8e3d8;
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      color: #8c857b;
    }
    .print-actions {
      text-align: center;
      margin-bottom: 20px;
    }
    .btn-action {
      background: #181716;
      color: #fff;
      border: none;
      padding: 10px 20px;
      border-radius: 4px;
      cursor: pointer;
      font-weight: 600;
      margin-right: 8px;
    }
    @media print {
      body { background: #fff; padding: 0; }
      .voucher-card { box-shadow: none; border-color: #333; max-width: 100%; }
      .no-print { display: none !important; }
      @page { size: A4 portrait; margin: 12mm; }
    }
  </style>
</head>
<body>
  <div style="width: 100%; max-width: 720px;">
    <div class="print-actions no-print">
      <button class="btn-action" onclick="window.print()">🖨️ Yazdır (Ctrl + P)</button>
      <button class="btn-action" style="background: #b8935c;" onclick="window.close()">Kapat</button>
    </div>

    <div class="voucher-card">
      <div class="header">
        <div>
          <div class="brand-title">PEAK OTEL</div>
          <div class="brand-sub">BUTİK REZERVASYON BELGESİ</div>
        </div>
        <div class="code-box">
          <div class="code-label">Rezervasyon Kodu</div>
          <div class="code-val">${booking.booking_code}</div>
        </div>
      </div>

      <div class="grid">
        <div class="info-box">
          <div class="info-label">Misafir Adı</div>
          <div class="info-val">${booking.guest_name}</div>
        </div>
        <div class="info-box">
          <div class="info-label">İletişim</div>
          <div class="info-val">${booking.guest_email || '—'} / ${booking.guest_phone || '—'}</div>
        </div>
        <div class="info-box">
          <div class="info-label">Konaklama Tarihleri</div>
          <div class="info-val">${booking.check_in} — ${booking.check_out} (${booking.total_nights} Gece)</div>
        </div>
        <div class="info-box">
          <div class="info-label">Oda Seçimi & Kişi</div>
          <div class="info-val">Oda ${roomNum} (${roomName || roomType}) • ${booking.guest_count} Misafir</div>
        </div>
      </div>

      <div class="price-box">
        <div class="price-label">Toplam Tutar (KDV Dahil):</div>
        <div class="price-val">₺${Number(booking.total_price).toLocaleString('tr-TR')}</div>
      </div>

      <div class="policies">
        <strong>Konaklama Bilgilendirmesi:</strong><br>
        • Otele giriş (Check-in) saati: 14:00, çıkış (Check-out) saati: 12:00'dir.<br>
        • Rezervasyonunuz otele varışta ödeme garantilidir.<br>
        • Kahvaltı paketini ek hizmet olarak seçen misafirlerimiz için servis Peak Teras'ta 07:30 - 11:00 saatleri arasındadır.
      </div>

      <div class="hotel-contact">
        <div>📍 Nevşehir, Türkiye</div>
        <div>📞 +90 (555) 555 55 55</div>
        <div>✉️ info@peakotel.com</div>
      </div>
    </div>
  </div>
</body>
</html>`;
  },

  printVoucher() {
    const booking = this.lastBooking;
    if (!booking) return;

    const printWindow = window.open('', '_blank', 'width=780,height=850');
    if (!printWindow) {
      window.print();
      return;
    }

    printWindow.document.open();
    printWindow.document.write(this.getVoucherHtml(booking));
    printWindow.document.close();

    printWindow.onload = () => {
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 300);
    };
  },

  downloadPdf(code) {
    const booking = this.lastBooking;
    const bookingCode = code || booking?.booking_code;
    if (!bookingCode) {
      API.toast('Rezervasyon kodu bulunamadı.', 'error');
      return;
    }

    API.toast('PDF rezervasyon belgeniz hazırlanıp indiriliyor...', 'info');
    const link = document.createElement('a');
    link.href = `/api/bookings/code/${bookingCode}/pdf`;
    link.download = `Peak_Otel_Rezervasyon_${bookingCode}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },

  downloadVoucher() {
    const booking = this.lastBooking;
    if (!booking) return;

    const htmlContent = this.getVoucherHtml(booking);
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Peak_Otel_Rezervasyon_${booking.booking_code}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);

    API.toast(`Rezervasyon belgesi '${link.download}' olarak indirildi!`, 'success');
  },

  createBookingModalDOM() {
    const div = document.createElement('div');
    div.id = 'booking-modal';
    div.className = 'modal-backdrop';
    div.innerHTML = `
      <div class="modal-card booking-modal-card" style="position: relative;">
        <button class="modal-close-floating" onclick="Booking.closeBookingModal()" title="Kapat" aria-label="Kapat">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
        <div class="modal-header">
          <div>
            <span class="text-eyebrow">Konaklama Rezervasyonu</span>
            <h3 id="modal-room-title" style="margin-top: 2px;">Oda Rezervasyonu</h3>
          </div>
        </div>

        <div class="booking-modal-body">
          <div class="booking-steps-grid">
            <div>
              <div class="booking-summary-room">
                <img id="modal-room-img" src="" alt="Oda">
                <div>
                  <div id="modal-room-meta" style="font-size: 0.8rem; color: var(--color-brass); font-weight: 600;"></div>
                  <div id="modal-room-price" style="font-size: 1.15rem; font-weight: 700; margin-top: 4px;"></div>
                </div>
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
                <div class="form-group">
                  <label class="form-label">Giriş Tarihi</label>
                  <input type="date" id="bk-checkin" class="form-input" onchange="Booking.updatePriceEstimate()" required>
                </div>
                <div class="form-group">
                  <label class="form-label">Çıkış Tarihi</label>
                  <input type="date" id="bk-checkout" class="form-input" onchange="Booking.updatePriceEstimate()" required>
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Misafir Sayısı</label>
                <select id="bk-guests" class="form-input" onchange="Booking.updatePriceEstimate()">
                  <option value="1">1 Kişi</option>
                  <option value="2">2 Kişi</option>
                  <option value="3">3 Kişi</option>
                  <option value="4">4 Kişi</option>
                </select>
              </div>

              <div style="margin: 24px 0 16px;">
                <label class="form-label" style="display: flex; justify-content: space-between; align-items: center;">
                  <span>Kişiselleştirilmiş Ekstra Hizmetler</span>
                  <span style="font-size: 0.72rem; color: var(--color-muted); font-weight: normal;">(İsteğe Bağlı)</span>
                </label>
                <div id="modal-addons-container" class="addons-list"></div>
              </div>

              <div style="margin-top: 24px; padding-top: 18px; border-top: var(--border-hairline);">
                <label class="form-label">Misafir İletişim Bilgileri</label>
                <div class="form-group">
                  <input type="text" id="bk-name" class="form-input" placeholder="Adınız ve Soyadınız *" required>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
                  <div class="form-group">
                    <input type="email" id="bk-email" class="form-input" placeholder="E-Posta Adresi *" required>
                  </div>
                  <div class="form-group">
                    <input type="tel" id="bk-phone" class="form-input" placeholder="Telefon Numarası *" required>
                  </div>
                </div>
                <div class="form-group">
                  <textarea id="bk-notes" class="form-input" rows="2" placeholder="Özel talepleriniz veya varış saatiniz (isteğe bağlı)..."></textarea>
                </div>
              </div>
            </div>

            <div>
              <div class="booking-summary-panel">
                <h4 style="font-size: 1.1rem; margin-bottom: 18px;">Fiyat Özeti</h4>

                <div class="price-breakdown-row">
                  <span>Konaklama Süresi:</span>
                  <strong id="bk-summary-nights">—</strong>
                </div>

                <div class="price-breakdown-row">
                  <span>Oda Ücreti:</span>
                  <strong id="bk-summary-room-total">—</strong>
                </div>

                <div class="price-breakdown-row">
                  <span>Seçilen Ekstra Hizmetler:</span>
                  <strong id="bk-summary-addons-total">₺0</strong>
                </div>

                <div class="price-breakdown-row">
                  <span>Turizm / KDV (%10):</span>
                  <strong id="bk-summary-tax">—</strong>
                </div>

                <div class="price-breakdown-row total-row">
                  <span>Toplam Tutar:</span>
                  <strong id="bk-summary-total" style="color: var(--color-brass-hover);">—</strong>
                </div>

                <button class="btn btn-brass" style="width: 100%; margin-top: 24px;" onclick="Booking.submitBooking()">
                  Rezervasyonu Tamamla & Onayla
                </button>

                <p style="font-size: 0.72rem; color: var(--color-muted); text-align: center; margin-top: 12px; line-height: 1.4;">
                  🛡️ Rezervasyonunuz ücretsiz iptal garantilidir. Otele varışta ödeme seçeneği geçerlidir.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    div.addEventListener('click', (e) => {
      if (e.target === div) Booking.closeBookingModal();
    });

    document.body.appendChild(div);
  },

  createVoucherModalDOM() {
    const div = document.createElement('div');
    div.id = 'voucher-modal';
    div.className = 'modal-backdrop';
    div.innerHTML = `
      <div class="modal-card" style="max-width: 620px; position: relative;">
        <button class="modal-close-floating" onclick="document.getElementById('voucher-modal').classList.remove('show')" title="Kapat" aria-label="Kapat">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
        <div class="modal-body" id="voucher-modal-content"></div>
      </div>
    `;

    div.addEventListener('click', (e) => {
      if (e.target === div) div.classList.remove('show');
    });

    document.body.appendChild(div);
  }
};

document.addEventListener('DOMContentLoaded', () => {
  Booking.init();
});
