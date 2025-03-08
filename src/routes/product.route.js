'use strict';

const express = require('express');
const router = express.Router();

const ErrorHandler = require('../infrastructure/utils/catch-error.js');
const productController = require('../controllers/product.controller');

/**
 * @swagger
 * /api/v1/products:
 *   get:
 *     tags: [Products]
 *     summary: Get a list of products with optional filtering, search, and pagination
 *     parameters:
 *       - in: query
 *         name: _q
 *         schema:
 *           type: string
 *         description: Full-text search query for product name or description
 *         example: "shirt"
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
 *         example: 10
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
 *       - in: query
 *         name: _product_sizes
 *         schema:
 *           type: string
 *         description: Comma-separated list of sizes to filter by
 *         example: "S,M,L"
 *       - in: query
 *         name: _product_colors
 *         schema:
 *           type: string
 *         description: Comma-separated list of colors to filter by
 *         example: "Red,Yellow"
 *       - in: query
 *         name: _product_type
 *         schema:
 *           type: string
 *           enum: [Clothe, Trousers, Shoes]
 *         description: Product type to filter by
 *         example: "Clothe"
 *       - in: query
 *         name: _product_category
 *         schema:
 *           type: string
 *         description: Category ID (ObjectId) to filter by
 *         example: "507f1f77bcf86cd799439011"
 *       - in: query
 *         name: _product_gender
 *         schema:
 *           type: string
 *           enum: [Man, Woman, Unisex]
 *         description: Gender to filter by
 *         example: "Man"
 *       - in: query
 *         name: _product_brand
 *         schema:
 *           type: string
 *           enum: [Prada, Louis Vuitton, Chanel, Gucci]
 *         description: Brand to filter by
 *         example: "Louis Vuitton"
 *       - in: query
 *         name: _min_price
 *         schema:
 *           type: number
 *           minimum: 0
 *         description: Minimum price to filter by
 *         example: 20
 *       - in: query
 *         name: _max_price
 *         schema:
 *           type: number
 *           minimum: 0
 *         description: Maximum price to filter by
 *         example: 50
 *     responses:
 *       '200':
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 items:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                       product_name:
 *                         type: string
 *                       product_description:
 *                         type: string
 *                       product_sizes:
 *                         type: array
 *                         items:
 *                           type: string
 *                       product_colors:
 *                         type: array
 *                         items:
 *                           type: string
 *                       product_type:
 *                         type: string
 *                       product_gender:
 *                         type: string
 *                       product_brand:
 *                         type: string
 *                       product_price:
 *                         type: number
 *                 meta:
 *                   type: object
 *                   properties:
 *                     totalItems:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *                     currentPage:
 *                       type: integer
 *                     itemsPerPage:
 *                       type: integer
 *       '400':
 *         description: Bad Request - Invalid query parameters
 */
router.get('/', ErrorHandler(productController.getAll));

/**
 * @swagger
 * /api/v1/products/best-sellers:
 *   get:
 *     summary: Get best-selling products
 *     tags: [Products]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: number
 *           default: 10
 *         description: Limit number of products
 *         example: 10
 *     responses:
 *       200:
 *         description: Get best sellers successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 */
router.get('/best-sellers', ErrorHandler(productController.getBestSellers));

module.exports = router;
