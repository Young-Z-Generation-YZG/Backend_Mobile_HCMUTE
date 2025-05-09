const express = require('express');
const router = express.Router();

const ErrorHandler = require('../infrastructure/utils/catch-error');
const {
   upload: uploadMiddleware,
} = require('../middlewares/upload.middleware.js');
const { grantAccess } = require('../middlewares/rbac.middleware');

const { authenticationMiddleware } = require('../middlewares/auth.middleware');
const userController = require('../controllers/user.controller');

router.use('/', authenticationMiddleware);

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

/**
 * @swagger
 * /api/v1/users/addresses:
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

router.get('/addresses', ErrorHandler(userController.getAddress));

/**
 * @swagger
 * /api/v1/users/profile:
 *  put:
 *   tags: [User]
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
 *         phoneNumber:
 *          type: string
 *          example: "0123456789"
 *   responses:
 *    '200':
 *      description: OK
 *      content:
 *       application/json:
 *        schema:
 *         type: object
 */
router.put('/profile', ErrorHandler(userController.updateProfile));

/**
 * @swagger
 * /api/v1/users/addresses:
 *  put:
 *   tags: [User]
 *   requestBody:
 *    required: true
 *    content:
 *     application/json:
 *      schema:
 *        type: object
 *        properties:
 *         addressLine:
 *          type: string
 *          example: "106* Kha Van Can, Linh Dong, Thu Duc"
 *         province:
 *          type: string
 *          example: "Hồ Chí Minh"
 *         district:
 *          type: string
 *          example: "Quận 1"
 *         country:
 *          type: string
 *          example: "Việt Nam"
 *   responses:
 *    '200':
 *      description: OK
 *      content:
 *       application/json:
 *        schema:
 *         type: object
 */
router.put('/addresses', ErrorHandler(userController.updateAddresses));

/**
 * @swagger
 * /api/v1/users/password:
 *  patch:
 *   tags: [User]
 *   requestBody:
 *    required: true
 *    content:
 *     application/json:
 *      schema:
 *        type: object
 *        properties:
 *         currentPassword:
 *          type: string
 *          example: "string"
 *         newPassword:
 *          type: string
 *          example: "string"
 *         confirmPassword:
 *          type: string
 *          example: "string"
 *   responses:
 *    '200':
 *      description: OK
 *      content:
 *       application/json:
 *        schema:
 *         type: object
 */
router.patch('/password', ErrorHandler(userController.changeCurrentPassword));

/**
 * @swagger
 * /api/v1/users/phone-number:
 *  patch:
 *   tags: [User]
 *   requestBody:
 *    required: true
 *    content:
 *     application/json:
 *      schema:
 *        type: object
 *        properties:
 *         changedPhoneNumber:
 *          type: string
 *          example: "0888283890"
 *   responses:
 *    '200':
 *      description: OK
 *      content:
 *       application/json:
 *        schema:
 *         type: object
 */
router.patch('/phone-number', ErrorHandler(userController.changePhoneNumber));

/**
 * @swagger
 * /api/v1/users/profile-image:
 *   post:
 *     tags: [User]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: The profile image file to upload
 *     responses:
 *       200:
 *         description: Profile image uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 */
router.post(
   '/profile-image',
   uploadMiddleware.single('image'),
   ErrorHandler(userController.uploadProfileImage),
);

/**
 * @swagger
 * /api/v1/users/admin:
 *   get:
 *     tags: [User]
 *     description: Get all users (admin only)
 *     responses:
 *       '200':
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 */
router.get('/admin', ErrorHandler(userController.getAllUsers));

module.exports = router;
