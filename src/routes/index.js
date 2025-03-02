'use strict';

const express = require('express');
const router = express.Router();

const userRouter = require('./user.route');
const accessRouter = require('./access.route');
const uploadRouter = require('./upload.route');
const productRouter = require('./product.route');
const categoryRouter = require('./category.route');

router.use('/api/v1/users', userRouter);
router.use('/api/v1/auth', accessRouter);
router.use('/api/v1/upload', uploadRouter);
router.use('/api/v1/products', productRouter);
router.use('/api/v1/categories', categoryRouter);

module.exports = router;
