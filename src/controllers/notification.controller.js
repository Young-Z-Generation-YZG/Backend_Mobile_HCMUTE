const NotificationService = require('../services/notification.service');
const { OK, CREATED } = require('../domain/core/success.response');

class NotificationController {
   // Get notifications for authenticated user
   async getAdminNotifications(req, res) {
      new OK({
         message: 'OK',
         statusCode: 200,
         data: await NotificationService.getAdminNotification(req),
      }).send(res);
   }

   // Mark a notification as read
   async markAsRead(req, res) {
      try {
         const userId = req.user.id;
         const { notificationId } = req.params;

         const notification = await notificationService.markAsRead(
            notificationId,
            userId,
         );

         return res.status(200).json({
            status: 'success',
            code: 200,
            data: notification,
         });
      } catch (error) {
         return res
            .status(error.message === 'Notification not found' ? 404 : 500)
            .json({
               status: 'error',
               code: error.message === 'Notification not found' ? 404 : 500,
               message: error.message,
            });
      }
   }

   // Mark all notifications as read
   async markAllAsRead(req, res) {
      try {
         const userId = req.user.id;

         const result = await notificationService.markAllAsRead(userId);

         return res.status(200).json({
            status: 'success',
            code: 200,
            data: result,
         });
      } catch (error) {
         return res.status(500).json({
            status: 'error',
            code: 500,
            message: error.message,
         });
      }
   }

   // Delete a notification
   async deleteNotification(req, res) {
      try {
         const userId = req.user.id;
         const { notificationId } = req.params;

         const result = await notificationService.deleteNotification(
            notificationId,
            userId,
         );

         return res.status(200).json({
            status: 'success',
            code: 200,
            data: result,
         });
      } catch (error) {
         return res
            .status(error.message === 'Notification not found' ? 404 : 500)
            .json({
               status: 'error',
               code: error.message === 'Notification not found' ? 404 : 500,
               message: error.message,
            });
      }
   }

   // Get unread notification count
   async getUnreadCount(req, res) {
      try {
         const userId = req.user.id;

         const result = await notificationService.getUnreadCount(userId);

         return res.status(200).json({
            status: 'success',
            code: 200,
            data: result,
         });
      } catch (error) {
         return res.status(500).json({
            status: 'error',
            code: 500,
            message: error.message,
         });
      }
   }

   // Get counts of new invoices and reviews
   async getNewEntitiesCount(req, res) {
      try {
         const userId = req.user.id;
         const { since } = req.query;

         // Parse the since parameter if provided
         const sinceDate = since
            ? new Date(since)
            : new Date(Date.now() - 24 * 60 * 60 * 1000); // Default to last 24 hours

         const result = await notificationService.getNewEntitiesCount(userId, {
            since: sinceDate,
         });

         return res.status(200).json({
            status: 'success',
            code: 200,
            data: result,
         });
      } catch (error) {
         return res.status(500).json({
            status: 'error',
            code: 500,
            message: error.message,
         });
      }
   }

   // Get admin metrics (dashboard summary data)
   async getAdminMetrics(req, res) {
      try {
         const userId = req.user.id;

         // Check if user is an admin
         const User = require('../domain/models/user.model');
         const user = await User.findById(userId);

         if (!user || user.role !== 'ADMIN') {
            return res.status(403).json({
               status: 'error',
               code: 403,
               message: 'Unauthorized access. Admin privileges required.',
            });
         }

         const { timeframe = 'day' } = req.query;
         let since;

         // Set timeframe for metrics
         switch (timeframe) {
            case 'week':
               since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // Last 7 days
               break;
            case 'month':
               since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Last 30 days
               break;
            case 'all':
               since = new Date(0); // All time
               break;
            case 'day':
            default:
               since = new Date(Date.now() - 24 * 60 * 60 * 1000); // Last 24 hours
               break;
         }

         // Get basic metrics
         const Invoice = require('../domain/models/invoice.model');
         const Review = require('../domain/models/review.model');

         // Get invoice status counts
         const invoiceStatusCounts = await Invoice.aggregate([
            {
               $match: {
                  createdAt: { $gte: since },
               },
            },
            {
               $group: {
                  _id: '$invoice_status',
                  count: { $sum: 1 },
               },
            },
         ]);

         // Get review rating distribution
         const reviewRatingDistribution = await Review.aggregate([
            {
               $match: {
                  createdAt: { $gte: since },
               },
            },
            {
               $group: {
                  _id: '$review_rating',
                  count: { $sum: 1 },
               },
            },
            {
               $sort: { _id: 1 }, // Sort by rating (1-5)
            },
         ]);

         // Format the results
         const invoiceStatuses = {};
         invoiceStatusCounts.forEach((status) => {
            invoiceStatuses[status._id] = status.count;
         });

         const reviewRatings = {
            1: 0,
            2: 0,
            3: 0,
            4: 0,
            5: 0, // Initialize all ratings
         };
         reviewRatingDistribution.forEach((rating) => {
            reviewRatings[rating._id] = rating.count;
         });

         // Calculate totals
         const totalNewInvoices = invoiceStatusCounts.reduce(
            (sum, status) => sum + status.count,
            0,
         );
         const totalNewReviews = reviewRatingDistribution.reduce(
            (sum, rating) => sum + rating.count,
            0,
         );

         // Get average rating
         const averageRating =
            totalNewReviews > 0
               ? reviewRatingDistribution.reduce(
                    (sum, rating) => sum + rating._id * rating.count,
                    0,
                 ) / totalNewReviews
               : 0;

         return res.status(200).json({
            status: 'success',
            code: 200,
            data: {
               timeframe,
               totalNewInvoices,
               totalNewReviews,
               invoiceStatuses,
               reviewRatings,
               averageRating: parseFloat(averageRating.toFixed(1)),
            },
         });
      } catch (error) {
         return res.status(500).json({
            status: 'error',
            code: 500,
            message: error.message,
         });
      }
   }
}

module.exports = new NotificationController();
