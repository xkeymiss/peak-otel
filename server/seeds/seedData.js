const bcrypt = require('bcryptjs');
const db = require('../config/database');

async function seed() {
  console.log('🌱 Peak Otel veritabanı tohumlama (seeding) başlatılıyor...');

  // Reset or ensure tables exist
  const countUsers = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
  if (countUsers > 0) {
    console.log('ℹ️ Veritabanında mevcut kayıtlar var, tablolar temizleniyor...');
    db.prepare('DELETE FROM bookings').run();
    db.prepare('DELETE FROM room_images').run();
    db.prepare('DELETE FROM rooms').run();
    db.prepare('DELETE FROM addons').run();
    db.prepare('DELETE FROM users').run();
  }

  // 1. Seed Users (Admin and All Real Guests)
  const salt = await bcrypt.genSalt(10);
  const adminPass = await bcrypt.hash('admin123', salt);
  const userPass = await bcrypt.hash('123456', salt);

  const insertUser = db.prepare(`
    INSERT INTO users (email, password_hash, full_name, phone, role)
    VALUES (?, ?, ?, ?, ?)
  `);

  insertUser.run('admin@peakotel.com', adminPass, 'Peak Otel Yönetimi', '+90 555 111 2233', 'admin');
  
  const userAhmet = insertUser.run('ahmet@gmail.com', userPass, 'Ahmet Yılmaz', '+90 532 999 8877', 'customer');
  const userZeynep = insertUser.run('zeynep.kaya@gmail.com', userPass, 'Zeynep Kaya', '+90 533 444 5566', 'customer');
  const userBurak = insertUser.run('burak.demir@gmail.com', userPass, 'Burak Demir', '+90 542 123 4567', 'customer');
  const userMurat = insertUser.run('murat.erdem@gmail.com', userPass, 'Murat Erdem', '+90 505 888 1122', 'customer');
  const userCanan = insertUser.run('canan.cetin@gmail.com', userPass, 'Canan Çetin', '+90 535 777 9900', 'customer');

  const guestIds = {
    ahmet: userAhmet.lastInsertRowid,
    zeynep: userZeynep.lastInsertRowid,
    burak: userBurak.lastInsertRowid,
    murat: userMurat.lastInsertRowid,
    canan: userCanan.lastInsertRowid
  };

  console.log('✅ 5 Misafir ve 1 Yönetici hesabı oluşturuldu (Şifreler: 123456 / admin123)');

  // 2. Seed Add-ons
  const insertAddon = db.prepare(`
    INSERT INTO addons (name, description, price, price_type, icon, is_active)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const addons = [
    {
      name: 'Teras Gurme Serpme Kahvaltı',
      description: 'Her sabah çatı terasında organik yerel ürünlerle zengin serpme kahvaltı servisi.',
      price: 350,
      price_type: 'per_person_per_night',
      icon: '🍳'
    },
    {
      name: 'VIP Havalimanı Karşılama Transferi',
      description: 'Havalimanından otele özel Mercedes Vito VIP araçla konforlu transfer.',
      price: 950,
      price_type: 'per_stay',
      icon: '🚘'
    },
    {
      name: 'Aromaterapi Spa & Masaj Seansı',
      description: 'Otel içi spa merkezinde 60 dakikalık rahatlatıcı bitkisel yağ masajı.',
      price: 1200,
      price_type: 'per_stay',
      icon: '🌿'
    },
    {
      name: 'Şampanya & Taze Meyve Karşılama Paketi',
      description: 'Girişte odanızda hazır bekleyen soğutulmuş köpüklü şarap ve gurme meyve sepeti.',
      price: 850,
      price_type: 'per_stay',
      icon: '🍾'
    },
    {
      name: 'Geç Çıkış İzni (Late Check-out 16:00)',
      description: 'Ayrılış gününüzde saat 16:00\'ya kadar odanızı kullanma imkanı.',
      price: 500,
      price_type: 'per_stay',
      icon: '⏰'
    }
  ];

  for (const a of addons) {
    insertAddon.run(a.name, a.description, a.price, a.price_type, a.icon, 1);
  }
  console.log('✅ Ekstra hizmetler (Add-ons) eklendi.');

  // 3. Seed Rooms (101 - 302, each with varied m2, floor, bed, amenities, and real photos)
  const insertRoom = db.prepare(`
    INSERT INTO rooms (
      room_number, name, room_type, floor, size_m2, max_guests,
      bed_type, price_per_night, view_type, description, amenities, image_url, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const roomsData = [
    {
      room_number: '101',
      name: 'Standart King (İç Avlu & Bahçe)',
      room_type: 'Standart',
      floor: 1,
      size_m2: 26,
      max_guests: 2,
      bed_type: '1 Çift Kişilik Ortopedik Queen Yatak',
      price_per_night: 2450,
      view_type: 'İç Avlu & Bahçe Manzaralı',
      description: 'Zemin kattaki sakin iç avluya ve peyzajlı bahçeye bakan, akustik ses yalıtımlı huzurlu oda. Doğal meşe mobilyalar, yağmur duş ve birinci sınıf pamuklu tekstil ürünleriyle dinlendirici bir atmosfer sunar.',
      amenities: ['Yüksek Hızlı Wi-Fi', 'Sessiz İklimlendirme / Klima', 'Yağmur Duş & Mermer Banyo', 'Nespresso Kahve Makinesi', 'Düz Ekran Smart TV', 'Elektronik Güvenlik Kasası', 'L\'Occitane Buklet'],
      image_url: '/images/rooms/1.jpg'
    },
    {
      room_number: '102',
      name: 'Superior Çift Kişilik (Sakin Avlu)',
      room_type: 'Superior',
      floor: 1,
      size_m2: 32,
      max_guests: 3,
      bed_type: '1 King Size Yatak + 1 Rahat Berjer Koltuk',
      price_per_night: 2900,
      view_type: 'Bahçe & Doğa Manzaralı',
      description: 'Geniş oturma köşesi, ergonomik mermer çalışma masası ve ferah yatak alanıyla hem iş hem dinlenme amaçlı seyahatler için ideal ferah oda. Büyük pencereleri sayesinde bol doğal ışık alır.',
      amenities: ['Yüksek Hızlı Wi-Fi', 'Akıllı 4K TV (Netflix & YouTube)', 'Mermer Banyo & Yağmur Duş', 'Çalışma Masası & Ergonomik Sandalye', 'Minibar & Çay/Kahve İstasyonu', 'Geniş Giysi Dolabı', 'Kasa'],
      image_url: '/images/rooms/2.jpg'
    },
    {
      room_number: '103',
      name: 'Deluxe Twin (Şehir & Cadde)',
      room_type: 'Deluxe',
      floor: 1,
      size_m2: 29,
      max_guests: 2,
      bed_type: '2 Ayrı Tek Kişilik Ortopedik Yatak',
      price_per_night: 2700,
      view_type: 'Tarihi Cadde Manzaralı',
      description: 'İki ayrı yatak tercihi olan misafirler ve iş ortakları için özel olarak kurgulanmış, gün ışığı alan ve çift kat ses yalıtımlı ferah oda. Her yatak için bağımsız okuma lambası ve USB prizler mevcuttur.',
      amenities: ['2 Ayrı Tek Kişilik Yatak', 'Yüksek Hızlı Wi-Fi', 'Çift Kat Ses Yalıtımlı Pencereler', 'Klima', 'Kapsül Kahve Makinesi', 'Minibar', 'Saç Kurutma & Işıklı Ayna'],
      image_url: '/images/rooms/3.jpg'
    },
    {
      room_number: '104',
      name: 'Junior Aile Odası (Geniş Balkonlu)',
      room_type: 'Family',
      floor: 1,
      size_m2: 42,
      max_guests: 4,
      bed_type: '1 King Yatak + 1 Açılabilir Lüks Çift Kişilik Kanepe',
      price_per_night: 3850,
      view_type: 'Bahçe & Havuz Cepheli Balkon',
      description: 'Geniş aileler ve uzun süreli konaklamalar için tasarlanmış, özel ferah balkonlu ve ekstra geniş yaşam alanına sahip modern süit. Çocuklu misafirler için bebek yatağı ve mama sandalyesi ücretsiz temin edilir.',
      amenities: ['Özel Geniş Balkon & Oturma Grubu', 'Geniş Yaşam Alanı', 'Çift Lavabolu Banyo', 'Yüksek Hızlı Wi-Fi', '4K Smart TV', 'Büyük Boy Buzdolaplı Minibar', 'Ütü & Ütü Masası'],
      image_url: '/images/rooms/4.jpg'
    },
    {
      room_number: '201',
      name: 'Executive Suite (Panoramik Şehir)',
      room_type: 'Executive',
      floor: 2,
      size_m2: 48,
      max_guests: 2,
      bed_type: '1 California King Yatak',
      price_per_night: 4500,
      view_type: 'Panoramik Şehir & Gün Batımı Manzaralı',
      description: 'Oda içinde cam kenarı bağımsız ayaklı lüks küveti, panoramik gün batımı manzarası ve kişiselleştirilmiş yastık menüsüyle üst düzey bir butik konaklama deneyimi. Akşamları şehir ışıklarını izleyerek dinlenebilirsiniz.',
      amenities: ['Oda İçi Bağımsız Tasarım Küvet', 'Panoramik Cam Cephe', 'Marshall Bluetooth Hoparlör', 'Yastık Menüsü (Ortopedik/Kuş Tüyü)', 'Özel Kapsül Kahve İstasyonu', 'Bornoz & Terlik Seti', 'Hızlı Wi-Fi'],
      image_url: '/images/rooms/7.jpg'
    },
    {
      room_number: '202',
      name: 'Deluxe Corner Suite (Çift Cepheli)',
      room_type: 'Deluxe',
      floor: 2,
      size_m2: 45,
      max_guests: 3,
      bed_type: '1 King Yatak + 1 Konforlu Dinlenme Koltuğu',
      price_per_night: 4200,
      view_type: 'Çift Cepheli Şehir & Park Manzaralı',
      description: 'Binanın köşe konumunda bulunması sayesinde tüm gün zengin doğal gün ışığı alan, geniş bağımsız giyinme odası ve özel tasarlanmış cam jakuzili duşakabiniyle seçkin konaklama alanı.',
      amenities: ['Çift Cephe Köşe Aydınlığı', 'Bağımsız Giyinme Odası', 'Jakuzili Masaj Duşu', 'Gurme Minibar & Şarap Dolabı', '55" Ultra HD Smart TV', 'Lüks Banyo Kozmetikleri', 'Hızlı Wi-Fi'],
      image_url: '/images/rooms/8.jpg'
    },
    {
      room_number: '203',
      name: 'Romantik Çatı Katı Süiti (Yıldız Pencereli)',
      room_type: 'Suite',
      floor: 2,
      size_m2: 38,
      max_guests: 2,
      bed_type: '1 Özel Tasarım King Yatak',
      price_per_night: 3950,
      view_type: 'Açılı Gökyüzü & Şehir Manzarası',
      description: 'Geceleri yatağınızdan yıldızları ve gökyüzünü izleyebileceğiniz açılı tavan pencereleri, sıcak şömine efektli ortam aydınlatması ve çiftler için özel olarak hazırlanmış karşılama sürprizleri.',
      amenities: ['Açılır Tavan Gökyüzü Penceresi', 'Şömine Ambiyansı', 'Büyük Çift Kişilik Jakuzili Küvet', 'Özel Şampanya İkramı', 'Sonos Ses Sistemi', 'Yumuşak Pamuklu Bornoz Takımı', 'Wi-Fi'],
      image_url: '/images/rooms/11.jpg'
    },
    {
      room_number: '301',
      name: 'Teras Penthouse (Özel Açık Teras)',
      room_type: 'Penthouse',
      floor: 3,
      size_m2: 64,
      max_guests: 3,
      bed_type: '1 Ultra Comfort King Yatak + Dinlenme Sediri',
      price_per_night: 6800,
      view_type: '360 Derece Panoramik Tepe & Teras Manzarası',
      description: 'Otelin en üst katında, 25 m² büyüklüğünde sadece size özel açık hava terası, şezlongları ve açık hava jakuzisiyle eşsiz bir tepe noktası (Peak) deneyimi. Odanızdan ayrılmadan gün doğumunun keyfini çıkarın.',
      amenities: ['25 m² Özel Açık Teras & Şezlong', 'Teras Açık Hava Jakuzisi', 'VIP Butler / Karşılama Hizmeti', 'Özel Kahvaltı Teras Servisi', 'Dyson Saç Kurutma Seti', '65" OLED TV', 'Premium Minibar'],
      image_url: '/images/rooms/12.jpg'
    },
    {
      room_number: '302',
      name: 'Grand Presidential Suite (İki Yatak Odalı)',
      room_type: 'Penthouse',
      floor: 3,
      size_m2: 78,
      max_guests: 4,
      bed_type: '2 Ayrı Yatak Odası (1 King + 1 Queen)',
      price_per_night: 8500,
      view_type: 'Panoramik Şehir, Vadi ve Tepe Manzarası',
      description: 'Peak Otel\'in en prestijli imza süiti. İki ayrı ebeveyn banyolu yatak odası, 8 kişilik özel yemek masası bulunan geniş salonu, mini mutfağı ve otel teras restoranına özel VIP geçişiyle kusursuz lüks.',
      amenities: ['2 Bağımsız Yatak Odası + Salon', '2 Ayrı Mermer Ebeveyn Banyosu', 'Mutfak Nişi & Kahve Barı', 'Özel Şef Yemek Servisi İsteğe Bağlı', 'Özel VIP Transfer Dahil', 'B&O Ses Sistemi', 'High-Speed Wi-Fi'],
      image_url: '/images/rooms/13.jpg'
    }
  ];

  const createdRoomIds = {};
  for (const r of roomsData) {
    const res = insertRoom.run(
      r.room_number,
      r.name,
      r.room_type,
      r.floor,
      r.size_m2,
      r.max_guests,
      r.bed_type,
      r.price_per_night,
      r.view_type,
      r.description,
      JSON.stringify(r.amenities),
      r.image_url,
      'active'
    );
    createdRoomIds[r.room_number] = res.lastInsertRowid;
  }
  console.log(`✅ ${roomsData.length} adet özgün oda başarıyla kaydedildi.`);

  // 4. Seed Realistic Sample Bookings for Admin Occupancy Matrix & Calendar
  const today = new Date();
  
  function formatDate(date, addDays = 0) {
    const d = new Date(date);
    d.setDate(d.getDate() + addDays);
    return d.toISOString().split('T')[0];
  }

  const sampleBookings = [
    {
      booking_code: 'PK-TR7821',
      user_id: guestIds.ahmet,
      room_id: createdRoomIds['101'],
      check_in: formatDate(today, -1),
      check_out: formatDate(today, 2), // currently staying!
      total_nights: 3,
      guest_count: 2,
      guest_name: 'Ahmet Yılmaz',
      guest_email: 'ahmet@gmail.com',
      guest_phone: '+90 532 999 8877',
      base_price: 2450 * 3,
      addons_json: JSON.stringify([{ name: 'Teras Gurme Serpme Kahvaltı', calculated_total: 1050 }]),
      addons_total: 1050,
      tax_amount: 840,
      total_price: 9240,
      status: 'checked_in',
      special_requests: 'Sessiz ve sakin bir köşe rica ediyoruz.'
    },
    {
      booking_code: 'PK-BK3190',
      user_id: guestIds.zeynep,
      room_id: createdRoomIds['201'],
      check_in: formatDate(today, 0), // checking in today!
      check_out: formatDate(today, 3),
      total_nights: 3,
      guest_count: 2,
      guest_name: 'Zeynep Kaya',
      guest_email: 'zeynep.kaya@gmail.com',
      guest_phone: '+90 533 444 5566',
      base_price: 4500 * 3,
      addons_json: JSON.stringify([{ name: 'VIP Havalimanı Karşılama Transferi', calculated_total: 950 }]),
      addons_total: 950,
      tax_amount: 1445,
      total_price: 15895,
      status: 'confirmed',
      special_requests: 'Uçuş saatimiz 14:30, resepsiyonda transfer görevlisi bekleyecek.'
    },
    {
      booking_code: 'PK-AL5022',
      user_id: guestIds.burak,
      room_id: createdRoomIds['301'],
      check_in: formatDate(today, 2),
      check_out: formatDate(today, 5),
      total_nights: 3,
      guest_count: 2,
      guest_name: 'Burak Demir',
      guest_email: 'burak.demir@gmail.com',
      guest_phone: '+90 542 123 4567',
      base_price: 6800 * 3,
      addons_json: JSON.stringify([
        { name: 'Şampanya & Taze Meyve Karşılama Paketi', calculated_total: 850 },
        { name: 'Teras Gurme Serpme Kahvaltı', calculated_total: 1050 }
      ]),
      addons_total: 1900,
      tax_amount: 2230,
      total_price: 24530,
      status: 'confirmed',
      special_requests: 'Evlilik yıldönümümüz, teras jakuzisi hazır olabilirse seviniriz.'
    },
    {
      booking_code: 'PK-MD9411',
      user_id: guestIds.murat,
      room_id: createdRoomIds['104'],
      check_in: formatDate(today, 4),
      check_out: formatDate(today, 8),
      total_nights: 4,
      guest_count: 3,
      guest_name: 'Murat Erdem',
      guest_email: 'murat.erdem@gmail.com',
      guest_phone: '+90 505 888 1122',
      base_price: 3850 * 4,
      addons_json: '[]',
      addons_total: 0,
      tax_amount: 1540,
      total_price: 16940,
      status: 'confirmed',
      special_requests: 'Bebek yatağı talep ediyoruz.'
    },
    {
      booking_code: 'PK-ES6304',
      user_id: guestIds.canan,
      room_id: createdRoomIds['203'],
      check_in: formatDate(today, -4),
      check_out: formatDate(today, -1),
      total_nights: 3,
      guest_count: 2,
      guest_name: 'Canan Çetin',
      guest_email: 'canan.cetin@gmail.com',
      guest_phone: '+90 535 777 9900',
      base_price: 3950 * 3,
      addons_json: '[]',
      addons_total: 0,
      tax_amount: 1185,
      total_price: 13035,
      status: 'checked_out',
      special_requests: ''
    }
  ];

  const insertBooking = db.prepare(`
    INSERT INTO bookings (
      booking_code, user_id, room_id, check_in, check_out, total_nights,
      guest_count, guest_name, guest_email, guest_phone, base_price,
      addons_json, addons_total, tax_amount, total_price, status, special_requests
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const b of sampleBookings) {
    insertBooking.run(
      b.booking_code,
      b.user_id,
      b.room_id,
      b.check_in,
      b.check_out,
      b.total_nights,
      b.guest_count,
      b.guest_name,
      b.guest_email,
      b.guest_phone,
      b.base_price,
      b.addons_json,
      b.addons_total,
      b.tax_amount,
      b.total_price,
      b.status,
      b.special_requests
    );
  }
  console.log(`✅ ${sampleBookings.length} adet örnek rezervasyon oluşturuldu.`);

  console.log('✨ Peak Otel veritabanı başarıyla hazırlandı!');
}

seed().catch(err => {
  console.error('Tohumlama hatası:', err);
  process.exit(1);
});
