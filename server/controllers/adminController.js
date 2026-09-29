const adminService = require('../services/adminService');
const roomService = require('../services/roomService');
const bookingService = require('../services/bookingService');

class AdminController {
  getDashboardSummary(req, res, next) {
    try {
      const summary = adminService.getDashboardSummary();
      res.status(200).json({
        success: true,
        data: summary
      });
    } catch (err) {
      next(err);
    }
  }

  getOccupancyCalendar(req, res, next) {
    try {
      const { startDate, days } = req.query;
      const daysCount = days ? parseInt(days, 10) : 14;
      const calendar = adminService.getOccupancyCalendarMatrix(startDate, daysCount);
      res.status(200).json({
        success: true,
        data: calendar
      });
    } catch (err) {
      next(err);
    }
  }

  getAllBookings(req, res, next) {
    try {
      const { status, roomId, search } = req.query;
      const bookings = adminService.getAllBookings({ status, roomId, search });
      res.status(200).json({
        success: true,
        count: bookings.length,
        data: bookings
      });
    } catch (err) {
      next(err);
    }
  }

  updateBookingStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const updated = bookingService.updateStatus(Number(id), status);
      res.status(200).json({
        success: true,
        message: 'Rezervasyon durumu güncellendi.',
        data: updated
      });
    } catch (err) {
      next(err);
    }
  }

  createRoom(req, res, next) {
    try {
      const roomData = req.body;
      const created = roomService.createRoom(roomData);
      res.status(201).json({
        success: true,
        message: 'Oda başarıyla eklendi.',
        data: created
      });
    } catch (err) {
      next(err);
    }
  }

  updateRoom(req, res, next) {
    try {
      const { id } = req.params;
      const roomData = req.body;
      const updated = roomService.updateRoom(Number(id), roomData);
      res.status(200).json({
        success: true,
        message: 'Oda bilgileri güncellendi.',
        data: updated
      });
    } catch (err) {
      next(err);
    }
  }

  updateRoomPrice(req, res, next) {
    try {
      const { id } = req.params;
      const { price } = req.body;
      const updated = roomService.updatePrice(Number(id), price);
      res.status(200).json({
        success: true,
        message: 'Oda fiyatı güncellendi.',
        data: updated
      });
    } catch (err) {
      next(err);
    }
  }

  uploadRoomImage(req, res, next) {
    try {
      const { id } = req.params;
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'Lütfen bir resim dosyası seçiniz.'
        });
      }

      const imageUrl = `/uploads/${req.file.filename}`;
      const updated = roomService.updateImage(Number(id), imageUrl);

      res.status(200).json({
        success: true,
        message: 'Oda resmi başarıyla güncellendi.',
        data: {
          imageUrl,
          room: updated
        }
      });
    } catch (err) {
      next(err);
    }
  }

  deleteRoom(req, res, next) {
    try {
      const { id } = req.params;
      const deleted = roomService.deleteRoom(Number(id));
      res.status(200).json({
        success: true,
        message: 'Oda başarıyla silindi.',
        data: { deleted }
      });
    } catch (err) {
      next(err);
    }
  }

  getCustomers(req, res, next) {
    try {
      const customers = adminService.getAllCustomers();
      res.status(200).json({
        success: true,
        count: customers.length,
        data: customers
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AdminController();
