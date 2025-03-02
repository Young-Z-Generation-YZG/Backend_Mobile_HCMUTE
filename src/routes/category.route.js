const express = require('express');
const router = express.Router();

const ErrorHandler = require('../infrastructure/utils/catch-error.js');

const CategoryController = require('../controllers/category.controller');

/**
 * @swagger
 * tags:
 *  name: Categories
 *  description: CRUD categories
 */

/**
 * @swagger
 * /api/v1/categories:
 *   get:
 *     tags: [Categories]
 *     responses:
 *       '200':
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 */
router.get('/', ErrorHandler(CategoryController.getAll));

/**
 * @swagger
 * /api/v1/categories/{slug}/products:
 *   get:
 *     summary: Get products by category slug with pagination
 *     description: Retrieves a paginated list of products for a category (including its child categories) identified by its slug, with sorting options.
 *     tags: [Categories]
 *     parameters:
 *       - name: slug
 *         in: path
 *         required: true
 *         description: The unique slug of the category
 *         schema:
 *           type: string
 *           example: maxi
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
 *         description: Successfully retrieved products
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 statusCode:
 *                   type: integer
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: Products retrieved successfully
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                 meta:
 *                   type: object
 *                   properties:
 *                     totalItems:
 *                       type: integer
 *                       example: 50
 *                     totalPages:
 *                       type: integer
 *                       example: 5
 *                     currentPage:
 *                       type: integer
 *                       example: 2
 *                     itemsPerPage:
 *                       type: integer
 *                       example: 10
 */
router.get(
   '/:slug/products',
   ErrorHandler(CategoryController.getProductsByCategory),
);

module.exports = router;
