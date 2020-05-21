const express = require('express');

const router = express.Router();

const { reportUser, reportProject } = require('../controllers/report');

const { protect } = require('../middleware/auth');

router.route('/user/:userId').post(protect, reportUser);
router.route('/project/:projectId').post(protect, reportProject);

module.exports = router;
