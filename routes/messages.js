const express = require('express');

const router = express.Router();

const {
	sendMessage,
	deleteMessage,
	getThread,
} = require('../controllers/messages');

const { protect } = require('../middleware/auth');

router.route('/to/:userId').post(protect, sendMessage);
router
	.route('/thread/:threadId/message/:messageId')
	.delete(protect, deleteMessage);
router.route('/:threadId').get(protect, getThread);

module.exports = router;
