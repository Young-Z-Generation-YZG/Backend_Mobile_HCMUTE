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

// [DONE]
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
 *          example: "Foo"
 *         lastName:
 *          type: string
 *          example: "Bar"
 *         email:
 *          type: string
 *          example: "foo@gmail.com"
 *         password:
 *          type: string
 *          example: "bar"
 *   responses:
 *    '200':
 *      description: OK
 *      content:
 *       application/json:
 *        schema:
 *         type: object
 */
router.post('/register', ErrorHandler(AccessController.register));

// [DONE]
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
 *          example: "foo@gmail.com"
 *         password:
 *          type: string
 *          example: "user"
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
 * /api/v1/auth/refresh-token:
 *  post:
 *   summary: Refresh access token using refresh token
 *   tags: [Auth]
 *   requestBody:
 *    required: true
 *    content:
 *     application/json:
 *      schema:
 *        type: object
 *        properties:
 *         refresh_token:
 *          type: string
 *          required: true
 *          example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *   responses:
 *    '200':
 *      description: OK
 *      content:
 *       application/json:
 *        schema:
 *         type: object
 *         properties:
 *          access_token:
 *           type: string
 *          refresh_token:
 *           type: string
 */
router.post('/refresh-token', ErrorHandler(AccessController.refreshToken));

// [DONE]
/**
 * @swagger
 * /api/v1/auth/otp-verify:
 *   get:
 *     summary: centralized verify otp page [Page]
 *     tags: [Auth]
 *     parameters:
 *       - in: query
 *         name: _q
 *         schema:
 *           type: string
 *         required: true
 *         description: _q is jwt token.
 *       - in: query
 *         name: _verify_type
 *         schema:
 *           type: string
 *           enum: [EMAIL, RESET_PASSWORD, CHANGE_EMAIL, CHANGE_PHONE_NUMBER]
 *         default: EMAIL
 *         required: true
 *     responses:
 *       '200':
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 */
router.get('/otp-verify', ErrorHandler(AccessController.verifyOtpPage));

// [DONE]
/**
 * @swagger
 * /api/v1/auth/send-mail-otp:
 *   get:
 *     summary: centralized to send mail otp
 *     tags: [Auth]
 *     parameters:
 *       - in: query
 *         name: _q
 *         schema:
 *           type: string
 *         required: true
 *         description: q is jwt mail token.
 *       - in: query
 *         name: _verify_type
 *         schema:
 *           type: string
 *           enum: [email, resetPassword, changeEmail, changePhoneNumber]
 *         default: email
 *         required: true
 *     responses:
 *       '200':
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 */
router.get('/send-mail-otp', ErrorHandler(AccessController.sendMailOtp));

// [DONE]
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

// [DONE]
/**
 * @swagger
 * /api/v1/auth/verify-change-phone-number:
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
   '/verify-change-phone-number',
   ErrorHandler(AccessController.verifyEmailChangePhoneNumber),
);

// [DONE]
/**
 * @swagger
 * /api/v1/auth/email-reset-password:
 *  post:
 *   summary: Send email to reset password [Forget Password]
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
router.post(
   '/email-reset-password',
   ErrorHandler(AccessController.emailResetPassword),
);

// [DONE]
/**
 * @swagger
 * /api/v1/auth/reset-password-verify:
 *   get:
 *     summary: reset password page [Page]
 *     tags: [Auth]
 *     parameters:
 *       - in: query
 *         name: _q
 *         schema:
 *           type: string
 *         required: true
 *         description: _q is jwt token.
 *       - in: query
 *         name: _verify_type
 *         schema:
 *           type: string
 *           enum: [resetPassword]
 *         required: true
 *     responses:
 *       '200':
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 */
router.get(
   '/reset-password-verify',
   ErrorHandler(AccessController.resetPasswordPage),
);

// [DONE]
/**
 * @swagger
 * /api/v1/auth/reset-new-password:
 *   post:
 *    tags: [Auth]
 *    parameters:
 *      - in: query
 *        name: _q
 *        schema:
 *          type: string
 *        required: true
 *        description: _q is jwt token.
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
   '/reset-new-password',
   ErrorHandler(AccessController.resetNewPassword),
);

// [DONE]
/**
 * @swagger
 * /api/v1/auth/verify-reset-password:
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
   '/verify-reset-password',
   ErrorHandler(AccessController.verifyResetPassword),
);

module.exports = router;
