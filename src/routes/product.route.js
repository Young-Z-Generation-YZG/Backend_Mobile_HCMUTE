const express = require('express');
const router = express.Router();

const ErrorHandler = require('../infrastructure/utils/catch-error.js');

const productController = require('../controllers/product.controller');

/**
 * @swagger
 * /api/v1/products:
 *   get:
 *     tags: [Products]
 *     parameters:
 *       - in: query
 *         name: _page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *         example: 1
 *       - in: query
 *         name: _limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of items per page
 *         example: 3
 *       - in: query
 *         name: _sort
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: asc
 *         description: Sort direction
 *         example: desc
 *       - in: query
 *         name: _sortBy
 *         schema:
 *           type: string
 *           enum: [product_price, createdAt, updatedAt]
 *           default: createdAt
 *         description: Field to sort by
 *         example: product_price
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
