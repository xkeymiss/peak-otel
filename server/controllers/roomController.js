const roomService = require('../services/roomService');

class RoomController {
  getAllRooms(req, res, next) {
    try {
      const { status, roomType, maxGuests, minPrice, maxPrice } = req.query;
      const rooms = roomService.getAllRooms({
        status,
        roomType,
        maxGuests: maxGuests ? Number(maxGuests) : undefined,
        minPrice: minPrice ? Number(minPrice) : undefined,
        maxPrice: maxPrice ? Number(maxPrice) : undefined
      });

      res.status(200).json({
        success: true,
        count: rooms.length,
        data: rooms
      });
    } catch (err) {
      next(err);
    }
  }

  getAvailableRooms(req, res, next) {
    try {
      const { checkIn, checkOut, guests, roomType } = req.query;
      const cleanRoomType = (roomType && roomType !== 'all' && roomType !== 'undefined' && roomType !== 'null') ? roomType : null;
      const rooms = roomService.getAvailableRooms({
        checkIn,
        checkOut,
        guests: guests ? Number(guests) : 1,
        roomType: cleanRoomType
      });

      res.status(200).json({
        success: true,
        count: rooms.length,
        data: rooms
      });
    } catch (err) {
      next(err);
    }
  }

  getRoomById(req, res, next) {
    try {
      const { id } = req.params;
      const room = roomService.getRoomById(Number(id));
      res.status(200).json({
        success: true,
        data: room
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new RoomController();
