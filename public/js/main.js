/**
 * Peak Otel - Ana Sayfa ve Oda Kataloğu
 */

const Main = {
  allRooms: [],
  filteredRooms: [],
  currentCategory: 'all',
  currentSort: 'default',

  async init() {
    this.initDefaultDates();
    this.bindSearchEvents();
    this.bindCategoryTabs();
    this.bindSmoothScrollLinks();
    await this.loadRooms();

    // Sayfa içi hedef konuma yumuşak kaydırma
    const urlParams = new URLSearchParams(window.location.search);
    const cat = urlParams.get('category');
    if (cat) {
      setTimeout(() => this.selectCategoryAndScroll(cat), 100);
    } else if (window.location.hash) {
      this.scrollToTarget(window.location.hash);
    }
  },

  scrollToTarget(hash) {
    if (!hash || hash === '#') return;
    const performScroll = () => {
      try {
        const target = document.querySelector(hash);
        if (target) {
          const headerHeight = 84;
          const rect = target.getBoundingClientRect();
          const targetY = rect.top + window.pageYOffset - headerHeight;
          window.scrollTo({
            top: Math.max(0, targetY),
            behavior: 'smooth'
          });
        }
      } catch (err) {
        console.error('Kaydırma hatası:', err);
      }
    };

    // Asenkron oda yüklemelerinden sonraki DOM güncellemelerini bekle
    requestAnimationFrame(() => {
      setTimeout(performScroll, 80);
      setTimeout(performScroll, 350);
    });
  },

  bindSmoothScrollLinks() {
    document.querySelectorAll('a[href^="#"], a[href^="/#"]').forEach(link => {
      link.addEventListener('click', (e) => {
        const href = link.getAttribute('href');
        const hash = href.startsWith('/#') ? href.substring(1) : href;
        if (hash && hash !== '#' && document.querySelector(hash)) {
          e.preventDefault();
          this.scrollToTarget(hash);
          if (history.pushState) {
            history.pushState(null, null, hash);
          }
        }
      });
    });
  },

  selectCategoryAndScroll(category) {
    this.currentCategory = category;
    document.querySelectorAll('.cat-tab[data-category]').forEach(tab => {
      if (tab.dataset.category.toLowerCase() === category.toLowerCase()) {
        tab.classList.add('active');
      } else {
        tab.classList.remove('active');
      }
    });
    this.applyFiltersAndSort();
    this.scrollToTarget('#rooms-section');
  },

  initDefaultDates() {
    const today = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);

    const inStr = today.toISOString().split('T')[0];
    const outStr = tomorrow.toISOString().split('T')[0];

    const inInput = document.getElementById('search-checkin');
    const outInput = document.getElementById('search-checkout');

    if (inInput && outInput) {
      inInput.min = inStr;
      inInput.value = inStr;

      outInput.min = outStr;
      outInput.value = outStr;

      inInput.addEventListener('change', () => {
        const nextDay = new Date(inInput.value);
        nextDay.setDate(nextDay.getDate() + 1);
        outInput.min = nextDay.toISOString().split('T')[0];
        if (new Date(outInput.value) <= new Date(inInput.value)) {
          outInput.value = nextDay.toISOString().split('T')[0];
        }
      });
    }
  },

  async loadRooms() {
    try {
      const res = await API.get('/rooms');
      this.allRooms = res.data || [];
      this.applyFiltersAndSort();
    } catch {
      this.allRooms = [];
    }
  },

  bindCategoryTabs() {
    const tabs = document.querySelectorAll('.cat-tab[data-category]');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.currentCategory = tab.dataset.category;
        this.applyFiltersAndSort();
      });
    });

    const sortSelect = document.getElementById('sort-rooms-select');
    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        this.currentSort = e.target.value;
        this.applyFiltersAndSort();
      });
    }
  },

  bindSearchEvents() {
    const searchForm = document.getElementById('booking-search-form');
    if (searchForm) {
      searchForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const checkIn = document.getElementById('search-checkin').value;
        const checkOut = document.getElementById('search-checkout').value;
        const guests = document.getElementById('search-guests').value;
        const roomType = document.getElementById('search-room-type').value;

        // Filtre sekmelerini sıfırla
        this.currentCategory = 'all';
        document.querySelectorAll('.cat-tab[data-category]').forEach(tab => {
          if (tab.dataset.category === 'all') tab.classList.add('active');
          else tab.classList.remove('active');
        });

        const params = {
          checkIn,
          checkOut,
          guests
        };
        if (roomType && roomType !== 'all') {
          params.roomType = roomType;
        }

        try {
          const res = await API.get('/rooms/available', params);
          this.allRooms = res.data || [];
          this.applyFiltersAndSort();

          API.toast(`${res.count} adet müsait oda listelendi.`, 'success');

          // Odalar bölümüne kaydır
          const target = document.getElementById('rooms-section');
          if (target) {
            target.scrollIntoView({ behavior: 'smooth' });
          }
        } catch (err) {
          console.error('Müsaitlik arama hatası:', err);
        }
      });
    }
  },

  applyFiltersAndSort() {
    let list = [...this.allRooms];

    // Kategoriye göre filtrele
    if (this.currentCategory !== 'all') {
      list = list.filter(r => r.room_type.toLowerCase() === this.currentCategory.toLowerCase());
    }

    // Sıralama
    if (this.currentSort === 'price-asc') {
      list.sort((a, b) => a.price_per_night - b.price_per_night);
    } else if (this.currentSort === 'price-desc') {
      list.sort((a, b) => b.price_per_night - a.price_per_night);
    } else if (this.currentSort === 'size-desc') {
      list.sort((a, b) => b.size_m2 - a.size_m2);
    } else {
      list.sort((a, b) => Number(a.room_number) - Number(b.room_number));
    }

    this.filteredRooms = list;
    this.renderRoomsGrid();
  },

  renderRoomsGrid() {
    const grid = document.getElementById('rooms-grid-container');
    if (!grid) return;

    if (!this.filteredRooms.length) {
      grid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 60px 20px; background: #ffffff; border-radius: var(--radius-sm); border: var(--border-hairline);">
          <span style="font-size: 2.5rem;">🛎️</span>
          <h3 style="margin-top: 12px;">Seçilen Kriterlere Uygun Oda Bulunamadı</h3>
          <p style="color: var(--color-muted); font-size: 0.9rem; margin-top: 6px;">
            Lütfen farklı konaklama tarihleri seçmeyi veya filtreleri sıfırlamayı deneyiniz.
          </p>
          <button class="btn btn-outline btn-sm" style="margin-top: 18px;" onclick="Main.loadRooms()">
            Tüm Odaları Göster
          </button>
        </div>
      `;
      return;
    }

    grid.innerHTML = this.filteredRooms.map(room => {
      const amenitiesBadges = Array.isArray(room.amenities)
        ? room.amenities.slice(0, 3).map(a => `<span class="badge badge-brass">${a}</span>`).join('')
        : '';

      return `
        <article class="room-card" data-room-id="${room.id}">
          <div class="room-card-image-wrap">
            <img src="${room.image_url}" alt="${room.name}" class="room-card-img" loading="lazy">
            <div class="room-card-badges">
              <span class="room-number-badge">ODA ${room.room_number}</span>
              <span class="badge badge-dark">${room.floor}. Kat</span>
            </div>
          </div>

          <div class="room-card-body">
            <div class="room-card-eyebrow">
              <span class="room-card-type">${room.room_type}</span>
              <span class="room-card-floor">🌿 ${room.view_type}</span>
            </div>

            <h3 class="room-card-title">${room.name}</h3>

            <div class="room-card-specs">
              <span class="spec-item">📐 <strong>${room.size_m2} m²</strong></span>
              <span class="spec-item">👥 <strong>${room.max_guests} Kişi</strong></span>
              <span class="spec-item">🛏️ <strong>${room.bed_type}</strong></span>
            </div>

            <p class="room-card-desc">${room.description}</p>

            <div style="display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 20px;">
              ${amenitiesBadges}
            </div>

            <div class="room-card-footer">
              <div class="room-price-wrap">
                <span class="room-price-val">₺${room.price_per_night.toLocaleString('tr-TR')}</span>
                <span class="room-price-label">Gecelik / KDV Dahil</span>
              </div>
              <div class="room-card-actions">
                <button class="btn btn-outline-brass btn-sm" onclick="Main.openRoomDetailModal(${room.id})">
                  İncele
                </button>
                <button class="btn btn-brass btn-sm" onclick="Main.triggerBooking(${room.id})">
                  Rezerve Et
                </button>
              </div>
            </div>
          </div>
        </article>
      `;
    }).join('');
  },

  triggerBooking(roomId) {
    const room = this.allRooms.find(r => r.id === roomId);
    if (!room) return;

    const checkIn = document.getElementById('search-checkin')?.value;
    const checkOut = document.getElementById('search-checkout')?.value;
    const guests = document.getElementById('search-guests')?.value;

    Booking.openBookingModal(room, checkIn, checkOut, Number(guests));
  },

  async openRoomDetailModal(roomId) {
    const room = this.allRooms.find(r => r.id === roomId);
    if (!room) return;

    let modal = document.getElementById('room-detail-modal');
    if (!modal) {
      this.createRoomDetailModalDOM();
      modal = document.getElementById('room-detail-modal');
    }

    const content = document.getElementById('room-detail-modal-content');
    const allAmenities = Array.isArray(room.amenities)
      ? room.amenities.map(a => `<li style="padding: 6px 0; border-bottom: 1px dashed rgba(24,23,22,0.08);">✓ ${a}</li>`).join('')
      : '';

    content.innerHTML = `
      <div style="position: relative; height: 320px; border-radius: var(--radius-xs); overflow: hidden; margin-bottom: 24px;" class="room-detail-modal-img-wrap">
        <img src="${room.image_url}" alt="${room.name}" style="width: 100%; height: 100%; object-fit: cover;" class="room-detail-modal-img">
        <span class="room-number-badge" style="position: absolute; top: 16px; left: 16px; font-size: 0.9rem;">
          ODA ${room.room_number} • ${room.floor}. KAT
        </span>
      </div>

      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px;">
        <div>
          <span class="text-eyebrow">${room.room_type} SEÇKİSİ</span>
          <h2 style="font-size: 1.8rem; margin-top: 4px;">${room.name}</h2>
          <p style="color: var(--color-muted); font-size: 0.9rem; margin-top: 2px;">
            ${room.view_type} • ${room.size_m2} m² • ${room.bed_type}
          </p>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 1.8rem; font-weight: 700; color: var(--color-obsidian);">₺${room.price_per_night.toLocaleString('tr-TR')}</div>
          <div style="font-size: 0.75rem; color: var(--color-muted);">Gecelik Standart Fiyat</div>
        </div>
      </div>

      <div style="margin-bottom: 24px;">
        <h4 style="font-size: 1rem; margin-bottom: 8px;">Oda Hakkında</h4>
        <p style="color: var(--color-stone); font-size: 0.92rem; line-height: 1.65;">
          ${room.description}
        </p>
      </div>

      <div style="margin-bottom: 28px;">
        <h4 style="font-size: 1rem; margin-bottom: 12px;">Öne Çıkan Olanaklar & Ayrıcalıklar</h4>
        <ul style="list-style: none; display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 0.88rem; color: var(--color-charcoal);">
          ${allAmenities}
        </ul>
      </div>

      <div style="display: flex; gap: 12px; border-top: var(--border-hairline); padding-top: 20px;">
        <button class="btn btn-brass" style="flex: 1;" onclick="document.getElementById('room-detail-modal').classList.remove('show'); Main.triggerBooking(${room.id});">
          Hemen Rezerve Et
        </button>
        <button class="btn btn-outline" onclick="document.getElementById('room-detail-modal').classList.remove('show')">
          Kapat
        </button>
      </div>
    `;

    modal.classList.add('show');
  },

  createRoomDetailModalDOM() {
    const div = document.createElement('div');
    div.id = 'room-detail-modal';
    div.className = 'modal-backdrop';
    div.innerHTML = `
      <div class="modal-card" style="max-width: 720px; max-height: 90vh; overflow-y: auto; position: relative;">
        <button class="modal-close-floating" onclick="document.getElementById('room-detail-modal').classList.remove('show')" title="Kapat">&times;</button>
        <div class="modal-body" id="room-detail-modal-content"></div>
      </div>
    `;

    div.addEventListener('click', (e) => {
      if (e.target === div) div.classList.remove('show');
    });

    document.body.appendChild(div);
  }
};

document.addEventListener('DOMContentLoaded', () => {
  Main.init();
});

// Modal kontrolleri (ESC tuşu ve arka plan tıklaması ile kapatma)
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-backdrop.show').forEach(m => m.classList.remove('show'));
  }
});

document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-backdrop')) {
    e.target.classList.remove('show');
  }
});
