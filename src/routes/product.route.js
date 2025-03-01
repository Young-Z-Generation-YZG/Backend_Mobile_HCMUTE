const express = require('express');
const router = express.Router();

const ErrorHandler = require('../infrastructure/utils/catch-error.js');

const productController = require('../controllers/product.controller');

/**
 * @swagger
 * /api/v1/products:
 *   get:
 *     tags: [Products]
 *     responses:
 *       '200':
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 */
router.get('/', ErrorHandler(productController.getAll));

/**
 * @swagger
 * /api/v1/products/best-sellers:
 *   get:
 *     summary: Get best selling products
 *     tags: [Products]
 *     parameters:
 *     - in: query
 *       name: limit
 *       type: number
 *       description: Limit number of products
 *       default: 10
 *     responses:
 *       200:
 *         description: Get best sellers successfully
 */
router.get('/best-sellers', ErrorHandler(productController.getBestSellers));

module.exports = router;
