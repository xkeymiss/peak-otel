const express = require('express');
const router = express.Router();
const roomController = require('../controllers/roomController');

router.get('/', (req, res, next) => roomController.getAllRooms(req, res, next));
router.get('/available', (req, res, next) => roomController.getAvailableRooms(req, res, next));
router.get('/:id', (req, res, next) => roomController.getRoomById(req, res, next));

module.exports = router;
