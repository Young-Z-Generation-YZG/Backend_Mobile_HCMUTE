'use strict';

const express = require('express');
const router = express.Router();

const userRouter = require('./user.route');
const accessRouter = require('./access.route');

router.use('/api/v1/users', userRouter);
router.use('/api/v1/auth', accessRouter);

module.exports = router;
