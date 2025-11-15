const express = require('express');
const router = express.Router();
const { createRideRequest } = require('../controllers/requestsController');

// POST /api/booth/request - Create new ride request from booth
router.post('/request', createRideRequest);

module.exports = router;
