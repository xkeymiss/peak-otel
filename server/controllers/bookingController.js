const bookingService = require('../services/bookingService');
const addonRepository = require('../repositories/addonRepository');
const pdfService = require('../services/pdfService');

class BookingController {
  getAddons(req, res, next) {
    try {
      const addons = addonRepository.findAll(true);
      res.status(200).json({
        success: true,
        data: addons
      });
    } catch (err) {
      next(err);
    }
  }

  estimate(req, res, next) {
    try {
      const { roomId, checkIn, checkOut, guestCount, addonIds } = req.body;
      const estimate = bookingService.calculateEstimate({
        roomId: Number(roomId),
        checkIn,
        checkOut,
        guestCount: Number(guestCount) || 1,
        addonIds: Array.isArray(addonIds) ? addonIds.map(Number) : []
      });

      res.status(200).json({
        success: true,
        data: estimate
      });
    } catch (err) {
      next(err);
    }
  }

  async createBooking(req, res, next) {
    try {
      const bookingData = req.body;
      const user = req.user || null;

      const booking = await bookingService.createBooking(bookingData, user);

      res.status(201).json({
        success: true,
        message: 'Rezervasyonunuz başarıyla oluşturuldu.',
        data: booking
      });
    } catch (err) {
      next(err);
    }
  }

  getByCode(req, res, next) {
    try {
      const { code } = req.params;
      const booking = bookingService.getBookingByCode(code);
      res.status(200).json({
        success: true,
        data: booking
      });
    } catch (err) {
      next(err);
    }
  }

  getMyBookings(req, res, next) {
    try {
      const user = req.user || null;
      const email = user ? user.email : req.query.email;
      const userId = user ? user.id : null;
      if (!userId && !email) {
        return res.status(401).json({ success: false, message: 'Yetkilendirme gerekli.' });
      }
      const bookings = bookingService.getUserBookings(userId, email);
      res.status(200).json({
        success: true,
        data: bookings
      });
    } catch (err) {
      next(err);
    }
  }

  cancelBooking(req, res, next) {
    try {
      const { id } = req.params;
      const result = bookingService.cancelBooking(Number(id), req.user);
      res.status(200).json({
        success: true,
        message: 'Rezervasyon başarıyla iptal edildi.',
        data: result
      });
    } catch (err) {
      next(err);
    }
  }

  downloadPdfByCode(req, res, next) {
    try {
      const { code } = req.params;
      const booking = bookingService.getBookingByCode(code);
      if (!booking) {
        return res.status(404).json({ success: false, message: 'Rezervasyon bulunamadı.' });
      }

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="Peak_Otel_Rezervasyon_${booking.booking_code}.pdf"`);
      pdfService.generateVoucherPdf(booking, res);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new BookingController();
