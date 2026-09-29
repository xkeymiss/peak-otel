const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const { authenticate, optionalAuth } = require('../middlewares/authMiddleware');

router.get('/', optionalAuth, (req, res, next) => bookingController.getMyBookings(req, res, next));
router.get('/addons', (req, res, next) => bookingController.getAddons(req, res, next));
router.post('/estimate', (req, res, next) => bookingController.estimate(req, res, next));
router.post('/', optionalAuth, (req, res, next) => bookingController.createBooking(req, res, next));
router.get('/code/:code', (req, res, next) => bookingController.getByCode(req, res, next));
router.get('/code/:code/pdf', (req, res, next) => bookingController.downloadPdfByCode(req, res, next));
router.get('/my', authenticate, (req, res, next) => bookingController.getMyBookings(req, res, next));
router.patch('/:id/cancel', authenticate, (req, res, next) => bookingController.cancelBooking(req, res, next));

module.exports = router;
