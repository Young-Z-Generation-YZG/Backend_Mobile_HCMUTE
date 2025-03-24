const express = require('express');
const router = express.Router();

const ErrorHandler = require('../infrastructure/utils/catch-error');

const InvoiceController = require('../controllers/invoice.controller');

/**
 * @swagger
 * tags:
 *  name: Invoice
 *  description: CRUD invoices
 */

/**
 * @swagger
 * /api/v1/invoices:
 *   get:
 *     tags: [Invoice]
 *     summary: Get a list of invoices with optional filtering, search, and pagination
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
 *         example: 10
 *       - in: query
 *         name: _sort
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: asc
 *         description: Sort direction
 *         example: asc
 *       - in: query
 *         name: _sortBy
 *         schema:
 *           type: string
 *           enum: [invoice_total, createdAt]
 *           default: createdAt
 *         description: Field to sort by
 *         example: createdAt
 *       - in: query
 *         name: _invoiceStatus
 *         schema:
 *           type: string
 *           enum: [PENDING, CONFIRMED, REQUEST_CANCEL, CANCELLED, ON_PREPARING, ON_DELIVERING, DELIVERED]
 *         description: Invoice status to filter by
 *         example: "DELIVERED"
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
 */
router.get('/', ErrorHandler(InvoiceController.getAll));

/**
 * @swagger
 * /api/v1/invoices/schedule-jobs:
 *   get:
 *     tags: [Invoice]
 *     summary: Get a list of scheduled jobs
 *     responses:
 *       '200':
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 */
router.get('/schedule-jobs', ErrorHandler(InvoiceController.getScheduleJobs));

/**
 * @swagger
 * /api/v1/invoices/{id}/confirmation-timeout:
 *   get:
 *     summary: Get confirmation timeout for an invoice
 *     description: Get the remaining time for the invoice to be confirmed
 *     tags: [Invoice]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Invoice ID
 *         schema:
 *           type: string
 *           example: "507f1f77bcf86cd799439011"
 *     responses:
 *       '200':
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 */
router.get(
   '/:id/confirmation-timeout',
   ErrorHandler(InvoiceController.getConfirmationTimeoutById),
);

/**
 * @swagger
 * /api/v1/invoices:
 *  post:
 *   tags: [Invoice]
 *   requestBody:
 *    required: true
 *    content:
 *     application/json:
 *      schema:
 *        type: object
 *        properties:
 *         contact_name:
 *          type: string
 *          example: "Foo Bar"
 *          required: true
 *         contact_phone_number:
 *          type: string
 *          example: "0333284890"
 *          required: true
 *         address_line:
 *          type: string
 *          example: "106* Kha Van Can"
 *          required: true
 *         address_district:
 *          type: string
 *          example: "Thu Duc"
 *          required: true
 *         address_province:
 *          type: string
 *          example: "Ho Chi Minh"
 *          required: true
 *         address_country:
 *          type: string
 *          example: "Viet Nam"
 *          required: true
 *         payment_method:
 *          type: enum
 *          enum: ["COD", "VNPAY"]
 *          example: "COD"
 *          required: true
 *         bought_items:
 *          type: array
 *          example: [{"product_id":"6646a822529494b708d5a23b","product_name": "Apple Cinnam Pants","product_color":"Green","product_size":"S","product_image": "https://res.cloudinary.com/djiju7xcq/image/upload/v1729840556/Apple-Cinnam-Pants-1-690x884_wgabxx.jpg","product_price": 200,"quantity":1}]
 *          required: true
 *         total_amount:
 *          type: number
 *          example: 200
 *   responses:
 *    '200':
 *      description: OK
 *      content:
 *       application/json:
 *        schema:
 *         type: object
 */
router.post('/', ErrorHandler(InvoiceController.create));

/**
 * @swagger
 * /api/v1/invoices/{id}/status:
 *   patch:
 *     summary: Update invoice status
 *     description: Updates the status of an existing invoice using query parameter
 *     tags: [Invoice]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Invoice ID
 *         schema:
 *           type: string
 *           example: "507f1f77bcf86cd799439011"
 *       - in: query
 *         name: _status
 *         required: true
 *         description: The new status for the invoice
 *         schema:
 *           type: string
 *           enum: ["CANCELLED", "ON_PREPARING", "ON_DELIVERING", "DELIVERED"]
 *           example: "CONFIRMED"
 *     responses:
 *       '200':
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 */
router.patch('/:id/status', ErrorHandler(InvoiceController.updateStatus));

/**
 * @swagger
 * /api/v1/invoices/{id}/confirm:
 *   patch:
 *     summary: Update invoice status to CONFIRMED
 *     description: Updates the status of an existing invoice using query parameter
 *     tags: [Invoice]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Invoice ID
 *         schema:
 *           type: string
 *           example: "507f1f77bcf86cd799439011"
 *     responses:
 *       '200':
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 */
router.patch('/:id/confirm', ErrorHandler(InvoiceController.confirmOrder));

/**
 * @swagger
 * /api/v1/invoices/{id}/cancel:
 *   patch:
 *     summary: Update invoice status to REQUEST_CANCEL
 *     description: Updates the status of an existing invoice using query parameter
 *     tags: [Invoice]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Invoice ID
 *         schema:
 *           type: string
 *           example: "507f1f77bcf86cd799439011"
 *     responses:
 *       '200':
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 */
router.patch('/:id/cancel', ErrorHandler(InvoiceController.cancelOrder));

module.exports = router;
