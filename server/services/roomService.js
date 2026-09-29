const roomRepository = require('../repositories/roomRepository');

class RoomService {
  getAllRooms(filters = {}) {
    return roomRepository.findAll(filters);
  }

  getAvailableRooms({ checkIn, checkOut, guests = 1, roomType = null }) {
    if (!checkIn || !checkOut) {
      return roomRepository.findAll({ status: 'active' });
    }

    if (new Date(checkOut) <= new Date(checkIn)) {
      throw new Error('Çıkış tarihi giriş tarihinden sonra olmalıdır.');
    }

    return roomRepository.findAvailable(checkIn, checkOut, Number(guests), roomType);
  }

  getRoomById(id) {
    const room = roomRepository.findById(id);
    if (!room) {
      throw new Error('Oda bulunamadı.');
    }
    return room;
  }

  createRoom(roomData) {
    if (!roomData.room_number || !roomData.name || !roomData.price_per_night) {
      throw new Error('Oda numarası, isim ve gecelik fiyat zorunludur.');
    }

    const existing = roomRepository.findByRoomNumber(roomData.room_number);
    if (existing) {
      throw new Error(`'${roomData.room_number}' numaralı oda zaten kayıtlı.`);
    }

    return roomRepository.create(roomData);
  }

  updateRoom(id, roomData) {
    const existing = roomRepository.findById(id);
    if (!existing) {
      throw new Error('Güncellenecek oda bulunamadı.');
    }

    if (roomData.room_number && roomData.room_number !== existing.room_number) {
      const duplicate = roomRepository.findByRoomNumber(roomData.room_number);
      if (duplicate) {
        throw new Error(`'${roomData.room_number}' numaralı oda başka bir kayıtla çakışıyor.`);
      }
    }

    return roomRepository.update(id, roomData);
  }

  updatePrice(id, newPrice) {
    const price = parseFloat(newPrice);
    if (isNaN(price) || price <= 0) {
      throw new Error('Geçerli bir fiyat giriniz.');
    }
    return roomRepository.updatePrice(id, price);
  }

  updateImage(id, imageUrl) {
    if (!imageUrl) {
      throw new Error('Resim yolu belirtilmelidir.');
    }
    return roomRepository.updateImage(id, imageUrl);
  }

  deleteRoom(id) {
    return roomRepository.delete(id);
  }
}

module.exports = new RoomService();
