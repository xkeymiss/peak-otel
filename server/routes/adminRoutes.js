const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { requireAdmin } = require('../middlewares/authMiddleware');
const upload = require('../middlewares/uploadMiddleware');

// All admin routes require admin privileges
router.use(requireAdmin);

// Dashboard KPIs
router.get('/dashboard', (req, res, next) => adminController.getDashboardSummary(req, res, next));

// Occupancy Matrix / Calendar
router.get('/calendar', (req, res, next) => adminController.getOccupancyCalendar(req, res, next));

// Bookings
router.get('/bookings', (req, res, next) => adminController.getAllBookings(req, res, next));
router.patch('/bookings/:id/status', (req, res, next) => adminController.updateBookingStatus(req, res, next));

// Room management
router.post('/rooms', (req, res, next) => adminController.createRoom(req, res, next));
router.put('/rooms/:id', (req, res, next) => adminController.updateRoom(req, res, next));
router.patch('/rooms/:id/price', (req, res, next) => adminController.updateRoomPrice(req, res, next));
router.post('/rooms/:id/image', upload.single('image'), (req, res, next) => adminController.uploadRoomImage(req, res, next));
router.delete('/rooms/:id', (req, res, next) => adminController.deleteRoom(req, res, next));

// Customers
router.get('/customers', (req, res, next) => adminController.getCustomers(req, res, next));

module.exports = router;
