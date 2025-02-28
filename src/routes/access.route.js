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
 * /api/v1/auth/otp-verify:
 *   get:
 *     tags: [Auth]
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         required: true
 *         description: q is jwt token.
 *       - in: query
 *         name: verify_type
 *         schema:
 *           type: string
 *         required: true
 *         description: verify_type ["email", "resetPassword"].
 *     responses:
 *       '200':
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 */
router.get('/otp-verify', ErrorHandler(AccessController.verifyOtpPage));

/**
 * @swagger
 * /api/v1/auth/send-mail-token:
 *   get:
 *     tags: [Auth]
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         required: true
 *         description: q is jwt mail token.
 *       - in: query
 *         name: verify_type
 *         schema:
 *           type: string
 *         required: true
 *         description: verify_type ["email", "resetPassword"].
 *     responses:
 *       '200':
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 */
router.get('/send-mail-token', ErrorHandler(AccessController.sendMailToken));

/**
 * @swagger
 * /api/v1/auth/verify-email:
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
 *         otp:
 *          type: string
 *   responses:
 *    '200':
 *      description: OK
 *      content:
 *       application/json:
 *        schema:
 *         type: object
 */
router.post('/verify-email', ErrorHandler(AccessController.verifyEmail));

/**
 * @swagger
 * /api/v1/auth/otp-recover:
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
 *   responses:
 *    '200':
 *      description: OK
 *      content:
 *       application/json:
 *        schema:
 *         type: object
 */
router.post('/otp-recover', ErrorHandler(AccessController.recoverOtp));

/**
 * @swagger
 * /api/v1/auth/otp-reset-password:
 *   get:
 *     tags: [Auth]
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         required: true
 *         description: q is jwt for reset password.
 *       - in: query
 *         name: verify_type
 *         schema:
 *           type: string
 *         required: true
 *         description: verify_type ["email", "resetPassword"].
 *     responses:
 *       '200':
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 */
router.get(
   '/otp-reset-password',
   ErrorHandler(AccessController.resetPasswordPage),
);

/**
 * @swagger
 * /api/v1/auth/otp-reset-password:
 *   post:
 *    tags: [Auth]
 *    parameters:
 *      - in: query
 *        name: q
 *        schema:
 *          type: string
 *        required: true
 *        description: q is jwt token.
 *    requestBody:
 *     required: true
 *     content:
 *      application/json:
 *       schema:
 *        type: object
 *        properties:
 *         password:
 *          type: string
 *         confirmPassword:
 *          type: string
 *    responses:
 *     '200':
 *      description: OK
 *      content:
 *       application/json:
 *        schema:
 *         type: object
 *         properties:
 */
router.post(
   '/otp-reset-password',
   ErrorHandler(AccessController.resetPassword),
);

/**
 * @swagger
 * /api/v1/auth/otp-verify-reset-password:
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
 *         otp:
 *          type: string
 *   responses:
 *    '200':
 *      description: OK
 *      content:
 *       application/json:
 *        schema:
 *         type: object
 */
router.post(
   '/otp-verify-reset-password',
   ErrorHandler(AccessController.verifyResetPasswordOtp),
);

module.exports = router;
