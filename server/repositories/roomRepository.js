const db = require('../config/database');

class RoomRepository {
  findAll(filters = {}) {
    let query = 'SELECT * FROM rooms WHERE 1=1';
    const params = [];

    if (filters.status) {
      query += ' AND status = ?';
      params.push(filters.status);
    }

    if (filters.roomType && filters.roomType !== 'all' && filters.roomType !== 'undefined' && filters.roomType !== 'null') {
      query += ' AND room_type = ?';
      params.push(filters.roomType);
    }

    if (filters.maxGuests) {
      query += ' AND max_guests >= ?';
      params.push(filters.maxGuests);
    }

    if (filters.minPrice) {
      query += ' AND price_per_night >= ?';
      params.push(filters.minPrice);
    }

    if (filters.maxPrice) {
      query += ' AND price_per_night <= ?';
      params.push(filters.maxPrice);
    }

    query += ' ORDER BY CAST(room_number AS INTEGER) ASC, room_number ASC';
    const stmt = db.prepare(query);
    const rooms = stmt.all(...params);

    return rooms.map(this._parseRoom);
  }

  findAvailable(checkIn, checkOut, guests = 1, roomType = null) {
    let query = `
      SELECT r.* 
      FROM rooms r
      WHERE r.status = 'active'
        AND r.max_guests >= ?
        AND r.id NOT IN (
          SELECT b.room_id 
          FROM bookings b
          WHERE b.status IN ('confirmed', 'checked_in')
            AND b.check_in < ?
            AND b.check_out > ?
        )
    `;
    const params = [guests, checkOut, checkIn];

    if (roomType && roomType !== 'all' && roomType !== 'undefined' && roomType !== 'null') {
      query += ' AND r.room_type = ?';
      params.push(roomType);
    }

    query += ' ORDER BY CAST(r.room_number AS INTEGER) ASC, r.room_number ASC';
    const stmt = db.prepare(query);
    const rooms = stmt.all(...params);

    return rooms.map(this._parseRoom);
  }

  findById(id) {
    let stmt = db.prepare('SELECT * FROM rooms WHERE id = ?');
    let room = stmt.get(id);
    if (!room) {
      stmt = db.prepare('SELECT * FROM rooms WHERE room_number = ?');
      room = stmt.get(String(id));
    }
    if (!room) return null;

    const parsedRoom = this._parseRoom(room);
    parsedRoom.gallery = this.getImages(room.id);
    return parsedRoom;
  }

  findByRoomNumber(roomNumber) {
    const stmt = db.prepare('SELECT * FROM rooms WHERE room_number = ?');
    const room = stmt.get(roomNumber);
    return room ? this._parseRoom(room) : null;
  }

  create(roomData) {
    const stmt = db.prepare(`
      INSERT INTO rooms (
        room_number, name, room_type, floor, size_m2, max_guests, 
        bed_type, price_per_night, view_type, description, amenities, image_url, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const amenitiesJson = Array.isArray(roomData.amenities)
      ? JSON.stringify(roomData.amenities)
      : roomData.amenities || '[]';

    const info = stmt.run(
      roomData.room_number,
      roomData.name,
      roomData.room_type,
      roomData.floor,
      roomData.size_m2,
      roomData.max_guests,
      roomData.bed_type,
      roomData.price_per_night,
      roomData.view_type,
      roomData.description,
      amenitiesJson,
      roomData.image_url,
      roomData.status || 'active'
    );

    return this.findById(info.lastInsertRowid);
  }

  update(id, roomData) {
    const amenitiesJson = Array.isArray(roomData.amenities)
      ? JSON.stringify(roomData.amenities)
      : roomData.amenities;

    const stmt = db.prepare(`
      UPDATE rooms SET
        room_number = COALESCE(?, room_number),
        name = COALESCE(?, name),
        room_type = COALESCE(?, room_type),
        floor = COALESCE(?, floor),
        size_m2 = COALESCE(?, size_m2),
        max_guests = COALESCE(?, max_guests),
        bed_type = COALESCE(?, bed_type),
        price_per_night = COALESCE(?, price_per_night),
        view_type = COALESCE(?, view_type),
        description = COALESCE(?, description),
        amenities = COALESCE(?, amenities),
        image_url = COALESCE(?, image_url),
        status = COALESCE(?, status),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    stmt.run(
      roomData.room_number,
      roomData.name,
      roomData.room_type,
      roomData.floor,
      roomData.size_m2,
      roomData.max_guests,
      roomData.bed_type,
      roomData.price_per_night,
      roomData.view_type,
      roomData.description,
      amenitiesJson,
      roomData.image_url,
      roomData.status,
      id
    );

    return this.findById(id);
  }

  updatePrice(id, newPrice) {
    const stmt = db.prepare(`
      UPDATE rooms 
      SET price_per_night = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `);
    stmt.run(newPrice, id);
    return this.findById(id);
  }

  updateImage(id, newImageUrl) {
    const stmt = db.prepare(`
      UPDATE rooms 
      SET image_url = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `);
    stmt.run(newImageUrl, id);
    return this.findById(id);
  }

  delete(id) {
    const stmt = db.prepare('DELETE FROM rooms WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  getImages(roomId) {
    const stmt = db.prepare('SELECT * FROM room_images WHERE room_id = ? ORDER BY is_primary DESC, id ASC');
    return stmt.all(roomId);
  }

  addImage(roomId, imageUrl, caption = '', isPrimary = 0) {
    const stmt = db.prepare(`
      INSERT INTO room_images (room_id, image_url, caption, is_primary)
      VALUES (?, ?, ?, ?)
    `);
    const info = stmt.run(roomId, imageUrl, caption, isPrimary);
    return { id: info.lastInsertRowid, room_id: roomId, image_url: imageUrl, caption, is_primary: isPrimary };
  }

  deleteImage(imageId) {
    const stmt = db.prepare('DELETE FROM room_images WHERE id = ?');
    return stmt.run(imageId).changes > 0;
  }

  _parseRoom(room) {
    if (!room) return null;
    let amenities = [];
    try {
      amenities = JSON.parse(room.amenities || '[]');
    } catch {
      amenities = [];
    }
    return {
      ...room,
      amenities
    };
  }
}

module.exports = new RoomRepository();
