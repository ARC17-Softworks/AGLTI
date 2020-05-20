const express = require('express');

const router = express.Router();

const {
	sendRequestId,
	sendRequestEmail,
	cancelRequest,
	rejectRequest,
	acceptRequest,
	removeContact,
	blockUser,
} = require('../controllers/contacts');

const { protect } = require('../middleware/auth');

router.route('/invite/:userId').put(protect, sendRequestId);
router.route('/invite').put(protect, sendRequestEmail);
router.route('/cancel/:userId').delete(protect, cancelRequest);
router.route('/reject/:userId').delete(protect, rejectRequest);
router.route('/accept/:userId').put(protect, acceptRequest);
router.route('/remove/:userId').delete(protect, removeContact);
router.route('/block/:userId').delete(protect, blockUser);

module.exports = router;
