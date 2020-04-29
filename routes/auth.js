const express = require('express');
const {
	register,
	authenticateEmail,
	login,
	logout,
	updatePassword,
	forgotPassword,
	resetPassword,
	deleteAccount,
} = require('../controllers/auth');

const router = express.Router();

const { protect } = require('../middleware/auth');

router.post('/register', register);
router.post('/register/:token', authenticateEmail);
router.post('/login', login);
router.get('/logout', protect, logout);
router.post('/forgotpassword', forgotPassword);
router.put('/resetpassword/:resettoken', resetPassword);
router.put('/updatepassword', protect, updatePassword);
router.delete('/deleteaccount', protect, deleteAccount);

module.exports = router;
