const express = require('express');
const { offer, cancelOffer } = require('../controllers/hiring');
const { apply, cancelApplication } = require('../controllers/jobHunting');

const router = express.Router();

const { protect, authorize } = require('../middleware/auth');

// project manager routes
router
	.route('/offer/:positionId/:userId')
	.put(protect, authorize('OWNER'), offer);
router
	.route('/offer/:positionId/:userId/cancel')
	.delete(protect, authorize('OWNER'), cancelOffer);

// user routes
router.route('/apply/:positionId').put(protect, apply);
router.route('/apply/:positionId/cancel').delete(protect, cancelApplication);

module.exports = router;
