const express = require('express');
const router = express.Router();

const ErrorHandler = require('../infrastructure/utils/catch-error');
const { grantAccess } = require('../middlewares/rbac.middleware');
const ReviewController = require('../controllers/review.controller');
const { authenticationMiddleware } = require('../middlewares/auth.middleware');

/**
 * @swagger
 * tags:
 *  name: Review
 *  description: CRUD Reviews
 */

/**
 * @swagger
 * /api/v1/reviews/{productId}:
 *   get:
 *     summary: Get all reviews of a product
 *     description: Retrieves reviews for a specific product with pagination and filtering options
 *     tags: [Review]
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         description: Product ID
 *         schema:
 *           type: string
 *           example: "507f1f77bcf86cd799439011"
 *       - in: query
 *         name: _page
 *         description: Page number (default is 1)
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *           example: 1
 *       - in: query
 *         name: _limit
 *         description: Number of reviews per page (default is 10)
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 10
 *           example: 10
 *       - in: query
 *         name: _star
 *         description: Filter reviews by star rating (1-5)
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 5
 *           example: 5
 *       - in: query
 *         name: _sortBy
 *         description: Sort reviews by creation date or star rating
 *         schema:
 *           type: string
 *           enum: [createdAt, star]
 *           default: createdAt
 *           example: createdAt
 *     responses:
 *       '200':
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 reviews:
 *                   type: array
 *                   items:
 *                     type: object
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
 *                     sortBy:
 *                       type: string
 */
router.get('/:productId', ErrorHandler(ReviewController.getAllByProductId));

router.use('/', authenticationMiddleware);

/**
 * @swagger
 * /api/v1/reviews/{productId}:
 *  post:
 *   summary: Create a new review for a product
 *   description: User must have purchased the product to leave a review
 *   tags: [Review]
 *   parameters:
 *     - in: path
 *       name: productId
 *       required: true
 *       description: Product ID
 *       schema:
 *         type: string
 *         example: "507f1f77bcf86cd799439011"
 *   requestBody:
 *    required: true
 *    content:
 *     application/json:
 *      schema:
 *        type: object
 *        properties:
 *         content:
 *          type: string
 *          example: "This dress is beautiful"
 *          required: true
 *         review_rating:
 *          type: number
 *          example: 5
 *          minimum: 1
 *          maximum: 5
 *          required: true
 *   responses:
 *    '201':
 *      description: Review created successfully
 *      content:
 *       application/json:
 *        schema:
 *         type: object
 */
router.post('/:productId', ErrorHandler(ReviewController.create));

/**
 * @swagger
 * /api/v1/reviews/{reviewId}:
 *  put:
 *   summary: Update an existing review
 *   description: Users can only update their own reviews
 *   tags: [Review]
 *   parameters:
 *     - in: path
 *       name: reviewId
 *       required: true
 *       description: Review ID
 *       schema:
 *         type: string
 *         example: "507f1f77bcf86cd799439011"
 *   requestBody:
 *    required: true
 *    content:
 *     application/json:
 *      schema:
 *        type: object
 *        properties:
 *         content:
 *          type: string
 *          example: "Updated review content"
 *          required: true
 *         review_rating:
 *          type: number
 *          example: 4
 *          minimum: 1
 *          maximum: 5
 *          required: true
 *   responses:
 *    '200':
 *      description: Review updated successfully
 *      content:
 *       application/json:
 *        schema:
 *         type: object
 */
router.put('/:reviewId', ErrorHandler(ReviewController.update));

/**
 * @swagger
 * /api/v1/reviews/{reviewId}:
 *  delete:
 *   summary: Delete a review
 *   description: Users can only delete their own reviews
 *   tags: [Review]
 *   parameters:
 *     - in: path
 *       name: reviewId
 *       required: true
 *       description: Review ID
 *       schema:
 *         type: string
 *         example: "507f1f77bcf86cd799439011"
 *   responses:
 *    '200':
 *      description: Review deleted successfully
 *      content:
 *       application/json:
 *        schema:
 *         type: object
 */
router.delete('/:reviewId', ErrorHandler(ReviewController.delete));

module.exports = router;
