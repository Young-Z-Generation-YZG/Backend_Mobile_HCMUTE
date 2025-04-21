const express = require('express');
const router = express.Router();

const ErrorHandler = require('../infrastructure/utils/catch-error.js');

const voucherController = require('../controllers/voucher.controller.js');
const {
   authenticationMiddleware,
} = require('../middlewares/auth.middleware.js');

/**
 * @swagger
 * tags:
 *  name: Vouchers
 */

router.use('/', authenticationMiddleware);

/**
 * @swagger
 * /api/v1/vouchers/:
 *   get:
 *     tags: [Vouchers]
 *     responses:
 *       200:
 *         description: Get vouchers of a user successfully
 */
router.get('/', ErrorHandler(voucherController.getVouchers));

module.exports = router;
