'use strict';

const express = require('express');
const router = express.Router();

const userRouter = require('./user.route');
const accessRouter = require('./access.route');
const uploadRouter = require('./upload.route');
const productRouter = require('./product.route');
const categoryRouter = require('./category.route');
const invoiceRouter = require('./invoice.route');
const reviewRouter = require('./review.route');
const promotionRouter = require('./promotion.route');
const voucherRouter = require('./voucher.route');
const notificationRouter = require('./notification.route');

router.use('/api/v1/users', userRouter);
router.use('/api/v1/auth', accessRouter);
router.use('/api/v1/upload', uploadRouter);
router.use('/api/v1/products', productRouter);
router.use('/api/v1/categories', categoryRouter);
router.use('/api/v1/invoices', invoiceRouter);
router.use('/api/v1/reviews', reviewRouter);
router.use('/api/v1/promotions', promotionRouter);
router.use('/api/v1/vouchers', voucherRouter);
router.use('/api/v1/notifications', notificationRouter);

module.exports = router;
