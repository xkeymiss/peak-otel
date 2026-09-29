const bookingRepository = require('../repositories/bookingRepository');
const roomRepository = require('../repositories/roomRepository');
const pricingService = require('./pricingService');

class BookingService {
  /**
   * Preview price estimate before committing booking
   */
  calculateEstimate(params) {
    const roomId = params.roomId || params.room_id;
    const checkIn = params.checkIn || params.check_in || params.check_in_date;
    const checkOut = params.checkOut || params.check_out || params.check_out_date;
    const guestCount = Number(params.guestCount || params.guest_count || params.guests_count || 1);
    let addonIds = params.addonIds || params.addon_ids || [];
    if (Array.isArray(params.addons)) {
      addonIds = params.addons.map(a => typeof a === 'object' ? (a.addon_id || a.id) : a);
    }

    const room = roomRepository.findById(roomId);
    if (!room) {
      throw new Error('Oda bulunamadı.');
    }

    if (room.status !== 'active') {
      throw new Error('Bu oda şu anda hizmet dışıdır.');
    }

    if (guestCount > room.max_guests) {
      throw new Error(`Bu oda en fazla ${room.max_guests} misafir ağırlayabilir.`);
    }

    // Check collision for these dates
    const isConflict = bookingRepository.checkCollision(room.id, checkIn, checkOut);
    if (isConflict) {
      throw new Error('Seçilen tarihler arasında bu oda maalesef doludur. Lütfen başka bir tarih veya oda seçiniz.');
    }

    const priceBreakdown = pricingService.calculate({
      room,
      checkIn,
      checkOut,
      guestCount,
      selectedAddonIds: addonIds
    });

    return {
      room,
      ...priceBreakdown
    };
  }

  /**
   * Create confirmed reservation
   */
  async createBooking(data, user = null) {
    const roomId = data.roomId || data.room_id;
    const checkIn = data.checkIn || data.check_in || data.check_in_date;
    const checkOut = data.checkOut || data.check_out || data.check_out_date;
    const guestCount = Number(data.guestCount || data.guest_count || data.guests_count || 1);
    const guestName = data.guestName || data.guest_name || data.customer_name;
    const guestEmail = data.guestEmail || data.guest_email || data.customer_email;
    const guestPhone = data.guestPhone || data.guest_phone || data.customer_phone;
    let addonIds = data.addonIds || data.addon_ids || [];
    if (Array.isArray(data.addons)) {
      addonIds = data.addons.map(a => typeof a === 'object' ? (a.addon_id || a.id) : a);
    }
    const specialRequests = data.specialRequests || data.special_requests || '';

    if (!roomId || !checkIn || !checkOut || !guestName || !guestEmail || !guestPhone) {
      throw new Error('Lütfen tüm zorunlu alanları (Oda, Tarihler, İletişim Bilgileri) doldurunuz.');
    }

    const room = roomRepository.findById(roomId);
    if (!room) {
      throw new Error('Oda bulunamadı.');
    }

    if (room.status !== 'active') {
      throw new Error('Bu oda şu anda rezervasyona kapalıdır.');
    }

    if (Number(guestCount) > room.max_guests) {
      throw new Error(`Bu oda maksimum ${room.max_guests} kişiliktir.`);
    }

    // Strict Collision check
    const isConflict = bookingRepository.checkCollision(roomId, checkIn, checkOut);
    if (isConflict) {
      throw new Error('Seçilen tarih aralığında bu oda doludur. Lütfen farklı tarihler seçiniz.');
    }

    // Calculate official pricing
    const pricing = pricingService.calculate({
      room,
      checkIn,
      checkOut,
      guestCount: Number(guestCount),
      selectedAddonIds: addonIds
    });

    // Generate unique human-readable voucher code
    const bookingCode = this.generateBookingCode();

    const newBooking = bookingRepository.create({
      booking_code: bookingCode,
      user_id: user ? user.id : null,
      room_id: room.id,
      check_in: checkIn,
      check_out: checkOut,
      total_nights: pricing.nights,
      guest_count: Number(guestCount),
      guest_name: guestName,
      guest_email: guestEmail,
      guest_phone: guestPhone,
      base_price: pricing.baseRoomTotal,
      addons: pricing.addons,
      addons_total: pricing.addonsTotal,
      tax_amount: pricing.taxAmount,
      total_price: pricing.totalPrice,
      status: 'confirmed',
      special_requests: specialRequests
    });

    return newBooking;
  }

  getBookingByCode(code) {
    const booking = bookingRepository.findByCode(code);
    if (!booking) {
      throw new Error('Belirtilen rezervasyon koduna ait kayıt bulunamadı.');
    }
    return booking;
  }

  getUserBookings(userId, email = null) {
    return bookingRepository.findByUserId(userId, email);
  }

  cancelBooking(id, requestingUser) {
    const booking = bookingRepository.findById(id);
    if (!booking) {
      throw new Error('Rezervasyon bulunamadı.');
    }

    // Check ownership if not admin
    const emailMatches = booking.guest_email && requestingUser.email && booking.guest_email.toLowerCase() === requestingUser.email.toLowerCase();
    if (requestingUser.role !== 'admin' && booking.user_id !== requestingUser.id && !emailMatches) {
      throw new Error('Bu rezervasyonu iptal etme yetkiniz bulunmuyor.');
    }

    if (booking.status === 'cancelled') {
      throw new Error('Bu rezervasyon zaten iptal edilmiş.');
    }

    if (booking.status === 'checked_out') {
      throw new Error('Tamamlanmış bir konaklama iptal edilemez.');
    }

    return bookingRepository.updateStatus(id, 'cancelled');
  }

  updateStatus(id, newStatus) {
    const allowed = ['confirmed', 'checked_in', 'checked_out', 'cancelled'];
    if (!allowed.includes(newStatus)) {
      throw new Error('Geçersiz rezervasyon durumu.');
    }
    return bookingRepository.updateStatus(id, newStatus);
  }

  generateBookingCode() {
    const randomDigits = Math.floor(1000 + Math.random() * 9000);
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const randomChar1 = chars[Math.floor(Math.random() * chars.length)];
    const randomChar2 = chars[Math.floor(Math.random() * chars.length)];
    return `PK-${randomChar1}${randomChar2}${randomDigits}`;
  }
}

module.exports = new BookingService();
