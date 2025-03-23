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

module.exports = router;
