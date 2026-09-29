const db = require('../config/database');

class BookingRepository {
  create(data) {
    const stmt = db.prepare(`
      INSERT INTO bookings (
        booking_code, user_id, room_id, check_in, check_out, total_nights,
        guest_count, guest_name, guest_email, guest_phone, base_price,
        addons_json, addons_total, tax_amount, total_price, status, special_requests
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const addonsJson = Array.isArray(data.addons) ? JSON.stringify(data.addons) : (data.addons_json || '[]');

    const info = stmt.run(
      data.booking_code,
      data.user_id || null,
      data.room_id,
      data.check_in,
      data.check_out,
      data.total_nights,
      data.guest_count,
      data.guest_name,
      data.guest_email,
      data.guest_phone,
      data.base_price,
      addonsJson,
      data.addons_total || 0,
      data.tax_amount || 0,
      data.total_price,
      data.status || 'confirmed',
      data.special_requests || ''
    );

    return this.findById(info.lastInsertRowid);
  }

  findById(id) {
    const stmt = db.prepare(`
      SELECT b.*, r.room_number, r.name as room_name, r.room_type, r.image_url as room_image
      FROM bookings b
      JOIN rooms r ON b.room_id = r.id
      WHERE b.id = ?
    `);
    const booking = stmt.get(id);
    return this._parseBooking(booking);
  }

  findByCode(bookingCode) {
    const stmt = db.prepare(`
      SELECT b.*, r.room_number, r.name as room_name, r.room_type, r.image_url as room_image
      FROM bookings b
      JOIN rooms r ON b.room_id = r.id
      WHERE b.booking_code = ? COLLATE NOCASE
    `);
    const booking = stmt.get(bookingCode);
    return this._parseBooking(booking);
  }

  findByUserId(userId, email = null) {
    let query = `
      SELECT b.*, r.room_number, r.name as room_name, r.room_type, r.image_url as room_image
      FROM bookings b
      JOIN rooms r ON b.room_id = r.id
      WHERE 1=1
    `;
    const params = [];
    if (userId && email) {
      query += ' AND (b.user_id = ? OR LOWER(b.guest_email) = LOWER(?))';
      params.push(userId, email);
    } else if (userId) {
      query += ' AND b.user_id = ?';
      params.push(userId);
    } else if (email) {
      query += ' AND LOWER(b.guest_email) = LOWER(?)';
      params.push(email);
    } else {
      return [];
    }

    query += ' ORDER BY b.created_at DESC';
    const stmt = db.prepare(query);
    const bookings = stmt.all(...params);
    return bookings.map(this._parseBooking);
  }

  findAll(filters = {}) {
    let query = `
      SELECT b.*, r.room_number, r.name as room_name, r.room_type, r.image_url as room_image
      FROM bookings b
      JOIN rooms r ON b.room_id = r.id
      WHERE 1=1
    `;
    const params = [];

    if (filters.status && filters.status !== 'all') {
      query += ' AND b.status = ?';
      params.push(filters.status);
    }

    if (filters.roomId) {
      query += ' AND b.room_id = ?';
      params.push(filters.roomId);
    }

    if (filters.search) {
      query += ` AND (
        b.booking_code LIKE ? OR 
        b.guest_name LIKE ? OR 
        b.guest_email LIKE ? OR 
        r.room_number LIKE ?
      )`;
      const s = `%${filters.search}%`;
      params.push(s, s, s, s);
    }

    query += ' ORDER BY b.check_in DESC, b.id DESC';

    const stmt = db.prepare(query);
    const bookings = stmt.all(...params);
    return bookings.map(this._parseBooking);
  }

  checkCollision(roomId, checkIn, checkOut, excludeBookingId = null) {
    let query = `
      SELECT COUNT(*) AS conflict_count
      FROM bookings
      WHERE room_id = ?
        AND status IN ('confirmed', 'checked_in')
        AND check_in < ?
        AND check_out > ?
    `;
    const params = [roomId, checkOut, checkIn];

    if (excludeBookingId) {
      query += ' AND id != ?';
      params.push(excludeBookingId);
    }

    const row = db.prepare(query).get(...params);
    return row.conflict_count > 0;
  }

  updateStatus(id, newStatus) {
    const stmt = db.prepare(`
      UPDATE bookings 
      SET status = ? 
      WHERE id = ?
    `);
    stmt.run(newStatus, id);
    return this.findById(id);
  }

  getBookingsInDateRange(startDate, endDate) {
    const stmt = db.prepare(`
      SELECT b.id, b.booking_code, b.room_id, b.check_in, b.check_out, b.guest_name, b.guest_phone,
             b.status, b.total_price, r.room_number, r.name as room_name
      FROM bookings b
      JOIN rooms r ON b.room_id = r.id
      WHERE b.status IN ('confirmed', 'checked_in')
        AND b.check_in <= ?
        AND b.check_out >= ?
      ORDER BY b.check_in ASC
    `);
    return stmt.all(endDate, startDate);
  }

  getDashboardMetrics() {
    const today = new Date().toISOString().split('T')[0];

    // Total rooms count
    const totalRooms = db.prepare("SELECT COUNT(*) as count FROM rooms WHERE status = 'active'").get().count;

    // Today occupied rooms count
    const occupiedToday = db.prepare(`
      SELECT COUNT(DISTINCT room_id) as count 
      FROM bookings 
      WHERE status IN ('confirmed', 'checked_in')
        AND check_in <= ? AND check_out > ?
    `).get(today, today).count;

    // Today check-ins
    const todayCheckIns = db.prepare(`
      SELECT COUNT(*) as count 
      FROM bookings 
      WHERE status = 'confirmed' AND check_in = ?
    `).get(today).count;

    // Today check-outs
    const todayCheckOuts = db.prepare(`
      SELECT COUNT(*) as count 
      FROM bookings 
      WHERE status IN ('confirmed', 'checked_in') AND check_out = ?
    `).get(today).count;

    // Total confirmed bookings & revenue
    const stats = db.prepare(`
      SELECT 
        COUNT(*) as total_bookings,
        COALESCE(SUM(total_price), 0) as total_revenue
      FROM bookings
      WHERE status != 'cancelled'
    `).get();

    const occupancyRate = totalRooms > 0 ? Math.round((occupiedToday / totalRooms) * 100) : 0;

    return {
      totalRooms,
      occupiedToday,
      availableToday: Math.max(0, totalRooms - occupiedToday),
      occupancyRate,
      todayCheckIns,
      todayCheckOuts,
      totalBookings: stats.total_bookings,
      totalRevenue: stats.total_revenue
    };
  }

  _parseBooking(booking) {
    if (!booking) return null;
    let addons = [];
    try {
      addons = JSON.parse(booking.addons_json || '[]');
    } catch {
      addons = [];
    }
    return {
      ...booking,
      addons
    };
  }
}

module.exports = new BookingRepository();
