const express = require('express');
const router = express.Router();

const ErrorHandler = require('../infrastructure/utils/catch-error');

const userController = require('../controllers/user.controller');

/**
 * @swagger
 * /api/v1/users/profile:
 *   get:
 *     tags: [User]
 *     responses:
 *       '200':
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 */
router.get('/profile', ErrorHandler(userController.getProfile));

module.exports = router;
