'use strict';

const express = require('express');
const router = express.Router();
const { authenticationMiddleware } = require('../middlewares/auth.middleware');
const notificationController = require('../controllers/notification.controller');


/**
 * @swagger
 * /api/v1/notifications/admin:
 *   get:
 *     summary: Get admin notifications
 *     tags: [Notifications]
 *     parameters:
 *       - in: query
 *         name: _page
 *         schema:
 *           type: integer
 *         description: Page number
 *       - in: query
 *         name: _limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: _type
 *         schema:
 *           type: string
 *           enum: [SYSTEM, USER, INVOICE, REVIEW, VOUCHER, ACTIVITY, ALL]
 *         description: Number of items per page
 *       - in: query
 *         name: _isRead
 *         schema:
 *           type: boolean
 *         description: Filter by read status
 *     responses:
 *       200:
 *         description: List of notifications
 */
router.get('/admin', notificationController.getAdminNotifications);

/**
 * @swagger
 * /api/v1/notifications/unread-count:
 *   get:
 *     summary: Get unread notification count
 *     tags: [Notifications]
 *     responses:
 *       200:
 *         description: Unread notification count
 */
router.get('/unread-count', notificationController.getUnreadCount);

/**
 * @swagger
 * /api/v1/notifications/new-entities-count:
 *   get:
 *     summary: Get count of new invoices and reviews
 *     tags: [Notifications]
 *     parameters:
 *       - in: query
 *         name: since
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Date from which to count new entities (default is last 24 hours)
 *     responses:
 *       200:
 *         description: Count of new invoices and reviews
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 code:
 *                   type: integer
 *                   example: 200
 *                 data:
 *                   type: object
 *                   properties:
 *                     newInvoices:
 *                       type: integer
 *                       example: 5
 *                     newReviews:
 *                       type: integer
 *                       example: 3
 */
router.get('/new-entities-count', notificationController.getNewEntitiesCount);

/**
 * @swagger
 * /api/v1/notifications/mark-all-read:
 *   patch:
 *     summary: Mark all notifications as read
 *     tags: [Notifications]
 *     responses:
 *       200:
 *         description: Notifications marked as read
 */
router.patch('/mark-all-read', notificationController.markAllAsRead);

/**
 * @swagger
 * /api/v1/notifications/{notificationId}/read:
 *   patch:
 *     summary: Mark a notification as read
 *     tags: [Notifications]
 *     parameters:
 *       - in: path
 *         name: notificationId
 *         required: true
 *         schema:
 *           type: string
 *         description: Notification ID
 *     responses:
 *       200:
 *         description: Notification marked as read
 *       404:
 *         description: Notification not found
 */
router.patch('/:notificationId/read', notificationController.markAsRead);

/**
 * @swagger
 * /api/v1/notifications/{notificationId}:
 *   delete:
 *     summary: Delete a notification
 *     tags: [Notifications]
 *     parameters:
 *       - in: path
 *         name: notificationId
 *         required: true
 *         schema:
 *           type: string
 *         description: Notification ID
 *     responses:
 *       200:
 *         description: Notification deleted
 *       404:
 *         description: Notification not found
 */
router.delete('/:notificationId', notificationController.deleteNotification);

/**
 * @swagger
 * /api/v1/notifications/admin-metrics:
 *   get:
 *     summary: Get admin dashboard metrics for invoices and reviews
 *     tags: [Notifications]
 *     parameters:
 *       - in: query
 *         name: timeframe
 *         schema:
 *           type: string
 *           enum: [day, week, month, all]
 *         description: Timeframe for metrics (default is day)
 *     responses:
 *       200:
 *         description: Admin metrics data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 code:
 *                   type: integer
 *                   example: 200
 *                 data:
 *                   type: object
 *                   properties:
 *                     timeframe:
 *                       type: string
 *                       example: day
 *                     totalNewInvoices:
 *                       type: integer
 *                       example: 12
 *                     totalNewReviews:
 *                       type: integer
 *                       example: 8
 *                     invoiceStatuses:
 *                       type: object
 *                       example: {"PENDING": 3, "CONFIRMED": 5, "DELIVERED": 4}
 *                     reviewRatings:
 *                       type: object
 *                       example: {"1": 0, "2": 1, "3": 2, "4": 3, "5": 2}
 *                     averageRating:
 *                       type: number
 *                       example: 3.8
 *       403:
 *         description: Unauthorized access
 */
router.get('/admin-metrics', notificationController.getAdminMetrics);

// All routes require authentication
router.use(authenticationMiddleware);

/**
 * @swagger
 * /api/v1/notifications/user:
 *   get:
 *     summary: Get user notifications
 *     description: Get paginated list of notifications for the authenticated user
 *     tags: [Notifications]
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
 *         description: Number of notifications per page
 *         example: 10
 *       - in: query
 *         name: _isRead
 *         schema:
 *           type: string
 *           enum: [true, false]
 *         description: Filter by read status (optional)
 *         example: false
 *     responses:
 *       '200':
 *         description: List of user notifications
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 statusCode:
 *                   type: number
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: OK
 *                 data:
 *                   type: object
 *                   properties:
 *                     total_records:
 *                       type: integer
 *                       example: 25
 *                     total_pages:
 *                       type: integer
 *                       example: 3
 *                     page_size:
 *                       type: integer
 *                       example: 10
 *                     current_page:
 *                       type: integer
 *                       example: 1
 *                     items:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                           type:
 *                             type: string
 *                             enum: [SYSTEM, USER, INVOICE, REVIEW, VOUCHER, ACTIVITY]
 *                           recipient:
 *                             type: string
 *                           isRead:
 *                             type: boolean
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *       '401':
 *         description: Unauthorized
 *       '500':
 *         description: Server error
 */
router.get('/user', notificationController.getUserNotifications);


module.exports = router;
