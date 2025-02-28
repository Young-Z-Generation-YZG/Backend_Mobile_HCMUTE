'use strict';

const express = require('express');
const router = express.Router();

const userRouter = require('./user.route');
const accessRouter = require('./access.route');
const uploadRouter = require('./upload.route');

router.use('/api/v1/users', userRouter);
router.use('/api/v1/auth', accessRouter);
router.use('/api/v1/upload', uploadRouter);

module.exports = router;
