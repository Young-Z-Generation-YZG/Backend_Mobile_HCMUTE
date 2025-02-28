const express = require('express');
const router = express.Router();

const ErrorHandler = require('../infrastructure/utils/catch-error.js');

const UploadController = require('../controllers/upload.controller');

const {
   upload: uploadMiddleware,
} = require('../middlewares/upload.middleware.js');

/**
 * @swagger
 * tags:
 *  name: Cloudinary
 */

/**
 * @swagger
 * /api/v1/upload/images:
 *   get:
 *     tags: [Cloudinary]
 *     responses:
 *       '200':
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 */
router.get('/images', ErrorHandler(UploadController.getAll));

/**
 * @swagger
 * /api/v1/upload/single:
 *   post:
 *     tags: [Cloudinary]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: file
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       201:
 *         description: Promotion created successfully
 */
router.post(
   '/single',
   uploadMiddleware.single('image'),
   ErrorHandler(UploadController.uploadSingle),
);

/**
 * @swagger
 * /api/v1/upload/multiple:
 *   post:
 *     tags: [Cloudinary]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               images:
 *                 type: array
 *                 items:
 *                   type: file
 *                   format: binary
 *     responses:
 *       201:
 *         description: Promotion created successfully
 */
router.post(
   '/multiple',
   uploadMiddleware.array('images', 5),
   ErrorHandler(UploadController.uploadMultiple),
);

// /**
//  * @swagger
//  * /api/v1/upload/image-url:
//  *   post:
//  *     summary: Upload an image using a URL
//  *     description: Uploads an image to Cloudinary by providing an image URL
//  *     tags: [Cloudinary]
//  *     requestBody:
//  *       required: true
//  *       content:
//  *         application/json:
//  *           schema:
//  *             type: object
//  *             required:
//  *               - imageUrl
//  *             properties:
//  *               imageUrl:
//  *                 type: string
//  *                 format: uri
//  *                 description: The URL of the image to upload
//  *                 example: https://example.com/image.jpg
//  *     responses:
//  *       201:
//  *         description: Promotion created successfully
//  */
// router.post('/image-url', ErrorHandler(UploadController.uploadByImageUrl));

// /**
//  * @swagger
//  * /api/v1/upload/images-url:
//  *   post:
//  *     summary: Upload multiple images using URLs
//  *     description: Uploads multiple images to Cloudinary by providing an array of image URLs
//  *     tags: [Cloudinary]
//  *     requestBody:
//  *       required: true
//  *       content:
//  *         application/json:
//  *           schema:
//  *             type: object
//  *             required:
//  *               - imageUrls
//  *             properties:
//  *               imageUrls:
//  *                 type: array
//  *                 description: Array of image URLs to upload
//  *                 items:
//  *                   type: string
//  *                   format: uri
//  *                   description: A single image URL
//  *                   example: https://example.com/image.jpg
//  *                 minItems: 1
//  *                 maxItems: 10
//  */
// router.post('/images-url', ErrorHandler(UploadController.uploadByImagesUrl));

module.exports = router;
