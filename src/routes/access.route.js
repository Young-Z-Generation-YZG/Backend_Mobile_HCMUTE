const express = require('express');
const router = express.Router();

const ErrorHandler = require('../infrastructure/utils/catch-error.js');

const AccessController = require('../controllers/access.controller.js');

/**
 * @swagger
 * tags:
 *  name: Auth
 *  description: authentication and authorization
 */

/**
 * @swagger
 * /api/v1/auth/register:
 *  post:
 *   tags: [Auth]
 *   requestBody:
 *    required: true
 *    content:
 *     application/json:
 *      schema:
 *        type: object
 *        properties:
 *         firstName:
 *          type: string
 *         lastName:
 *          type: string
 *         email:
 *          type: string
 *         password:
 *          type: string
 *   responses:
 *    '200':
 *      description: OK
 *      content:
 *       application/json:
 *        schema:
 *         type: object
 */
router.post('/register', ErrorHandler(AccessController.register));

/**
 * @swagger
 * /api/v1/auth/login:
 *  post:
 *   tags: [Auth]
 *   requestBody:
 *    required: true
 *    content:
 *     application/json:
 *      schema:
 *        type: object
 *        properties:
 *         email:
 *          type: string
 *         password:
 *          type: string
 *   responses:
 *    '200':
 *      description: OK
 *      content:
 *       application/json:
 *        schema:
 *         type: object
 */
router.post('/login', ErrorHandler(AccessController.login));

/**
 * @swagger
 * /api/v1/auth/verify:
 *   get:
 *     tags: [Auth]
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         required: true
 *         description: q is jwt mail token.
 *     responses:
 *       '200':
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 */
router.get('/verify', ErrorHandler(AccessController.verify));

/**
 * @swagger
 * /api/v1/auth/sendMailToken:
 *   get:
 *     tags: [Auth]
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         required: true
 *         description: q is jwt mail token.
 *     responses:
 *       '200':
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 */
router.get('/sendMailToken', ErrorHandler(AccessController.sendMailToken));

/**
 * @swagger
 * /api/v1/auth/verifyEmail:
 *  post:
 *   tags: [Auth]
 *   requestBody:
 *    required: true
 *    content:
 *     application/json:
 *      schema:
 *        type: object
 *        properties:
 *         q:
 *          type: string
 *         mailOtp:
 *          type: string
 *   responses:
 *    '200':
 *      description: OK
 *      content:
 *       application/json:
 *        schema:
 *         type: object
 */
router.post('/verifyEmail', ErrorHandler(AccessController.verifyEmail));

module.exports = router;
