const {
   NOTIFICATION_TYPES,
   INVOICE_STATUS,
   NOTIFICATION_TYPE_ARRAY,
} = require('../domain/constants/domain');
const NotificationModel = require('../domain/models/notification.model');
const socketService = require('../infrastructure/socket');
const productModel = require('../domain/models/product.model');
const userModel = require('../domain/models/user.model');
const {
   BadRequestError,
   NotFoundError,
} = require('../domain/core/error.response');

const { Access } = require('accesscontrol');

class NotificationService {
   // Create a notification
   async create(notificationData) {
      try {
         console.log('notificationData', notificationData);

         const notification = new NotificationModel(notificationData);

         await notification.save();

         // // Send notification via WebSocket if recipient is online
         // if (socketService.isUserOnline(notification.recipient.toString())) {
         //    socketService.sendNotification(notification.recipient.toString(), {
         //       id: notification._id,
         //       type: notification.type,
         //       message: notification.message,
         //       data: notification.data,
         //       createdAt: notification.createdAt,
         //    });
         // }

         return notification;
      } catch (error) {
         throw new Error(`Error creating notification: ${error.message}`);
      }
   }

   async getAdminNotification(req) {
      try {
         const {
            _page = 1,
            _limit = 1,
            _type = NOTIFICATION_TYPES.ALL,
            _isRead,
         } = req.query;

         const page = parseInt(_page, 10);
         const limit = parseInt(_limit, 10);
         const isRead =
            _isRead === 'true' ? true : _isRead === 'false' ? false : null;
         const type = _type;
         let total_records = 0;
         let total_pages = 1;

         let query = {
            recipient: null,
            sender: null,
         };
         let sort = {
            createdAt: -1,
         };
         let notifications = [];

         if (isNaN(page) || page < 1) {
            throw new BadRequestError('Invalid page number');
         }
         if (isNaN(limit) || limit < 1 || limit > 100) {
            throw new BadRequestError('Invalid limit value (1-100)');
         }
         if (!NOTIFICATION_TYPE_ARRAY.includes(type)) {
            throw new BadRequestError(
               `Invalid type value (${NOTIFICATION_TYPE_ARRAY.toString()})`,
            );
         }
         // if (isRead === null) {
         //    throw new BadRequestError(`Invalid isRead parameter`);
         // }

         const skip = (page - 1) * limit;

         if (type === NOTIFICATION_TYPES.ALL) {
            total_records = await NotificationModel.countDocuments(query);
            total_pages = Math.ceil(total_records / limit);

            notifications = await NotificationModel.find(query)
               .sort(sort)
               .skip(skip)
               .limit(limit)
               .lean();
         } else {
            query.type = type;

            total_records = await NotificationModel.countDocuments(query);
            total_pages = Math.ceil(total_records / limit);

            notifications = await NotificationModel.find(query)
               .sort(sort)
               .skip(skip)
               .limit(limit)
               .lean();
         }

         return {
            total_records,
            total_pages,
            page_size: limit,
            current_page: page,
            items: notifications,
            links: null,
         };
      } catch (error) {
         throw new Error(
            `Error marking all notifications as read: ${error.message}`,
         );
      }
   }

   // Get notifications for a user
   async getUserNotifications(req) {
      
      try {
         const {
            _page = 1,
            _limit = 10,
            _isRead,
            _sort = 'desc'
         } = req.query;
         
         const userId = req.user._id;
         
         const page = parseInt(_page, 10);
         const limit = parseInt(_limit, 10);
         
         if (isNaN(page) || page < 1) {
            throw new BadRequestError('Invalid page number');
         }
         if (isNaN(limit) || limit < 1 || limit > 100) {
            throw new BadRequestError('Invalid limit value (1-100)');
         }
         if (_sort !== 'asc' && _sort !== 'desc') {
            throw new BadRequestError('Sort direction must be "asc" or "desc"');
         }

         const query = {
            recipient: userId,
            isDeleted: { $ne: true }
         };
   
         if (_isRead === 'true') {
            query.isRead = true;
         } else if (_isRead === 'false') {
            query.isRead = false;
         }
   
         const skip = (page - 1) * limit;
         
         // Set sort direction (1 for ascending, -1 for descending)
         const sortDirection = _sort === 'asc' ? 1 : -1;
         const sortOptions = { createdAt: sortDirection };

         const total_records = await NotificationModel.countDocuments(query);
         const total_pages = Math.ceil(total_records / limit);
         
         const notifications = await NotificationModel.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate('sender', 'email user_profile')
            .lean();
   
         return {
            items: notifications,
            meta: {
               totalItems: total_records,
               totalPages: total_pages,
               currentPage: page,
               itemsPerPage: limit,
            },
         };
      } catch (error) {
         throw new Error(`Error fetching notifications: ${error.message}`);
      }
      // try {
      //    const {
      //    userId,
      //    _page = 1,
      //    _limit = 1,
      //    _isRead,
      //    } = req.query;
            
      //    const query = {
      //       recipient: userId,
      //       isDeleted: false,
      //    };
   
      //    if (isRead !== null) {
      //       query.isRead = isRead;
      //    }
   
      //    const total = await Notification.countDocuments(query);
      //    const notifications = await Notification.find(query)
      //       .sort({ createdAt: -1 })
      //       .skip((page - 1) * limit)
      //       .limit(limit)
      //       .populate('sender', 'name avatar');
   
      //    return {
      //       data: notifications,
      //       pagination: {
      //          total,
      //          page: parseInt(page),
      //          limit: parseInt(limit),
      //          totalPages: Math.ceil(total / limit),
      //       },
      //    };
      // } catch (error) {
      //    throw new Error(`Error fetching notifications: ${error.message}`);
      // }
   }

   // Mark a notification as read
   async markAsRead(notificationId, userId) {
      try {
         const notification = await Notification.findOneAndUpdate(
            { _id: notificationId, recipient: userId, isDeleted: false },
            { isRead: true, readAt: new Date() },
            { new: true },
         );

         if (!notification) {
            throw new Error('Notification not found');
         }

         return notification;
      } catch (error) {
         throw new Error(
            `Error marking notification as read: ${error.message}`,
         );
      }
   }

   // Mark all notifications as read for a user
   async markAllAsRead(userId) {
      try {
         const result = await Notification.updateMany(
            { recipient: userId, isRead: false, isDeleted: false },
            { isRead: true, readAt: new Date() },
         );

         return {
            success: true,
            count: result.modifiedCount,
         };
      } catch (error) {
         throw new Error(
            `Error marking all notifications as read: ${error.message}`,
         );
      }
   }

   // Delete a notification
   async deleteNotification(notificationId, userId) {
      try {
         const notification = await Notification.findOneAndUpdate(
            { _id: notificationId, recipient: userId },
            { isDeleted: true },
            { new: true },
         );

         if (!notification) {
            throw new Error('Notification not found');
         }

         return { success: true };
      } catch (error) {
         throw new Error(`Error deleting notification: ${error.message}`);
      }
   }

   // Get unread count for a user
   async getUnreadCount(userId) {
      try {
         const count = await Notification.countDocuments({
            recipient: userId,
            isRead: false,
            isDeleted: false,
         });

         return { count };
      } catch (error) {
         throw new Error(`Error getting unread count: ${error.message}`);
      }
   }

   // [DONE]
   // Notify about new invoice creation
   async notifyNewInvoice(invoice) {
      try {
         const user = await userModel
            .findById(invoice.invoice_user.toString())
            .populate('user_profile')
            .lean();

         // Create a notification for the user
         const newInvoiceNotification = {
            recipient: invoice.invoice_user.toString(),
            sender: null,
            type: NOTIFICATION_TYPES.INVOICE,
            invoice_info: {
               label: 'new order created',
               message: `invoice for order #${'321413'} of user #${'67ef97148a53ddabeb422b6e'}`,
               invoice_id: invoice._id.toString(),
               invoice_code: '',
               customer_id: invoice.invoice_user.toString(),
               customer_name: `${user?.user_profile.profile_firstName} ${user?.user_profile.profile_lastName}`,
               amount: invoice.invoice_total,
               unit: invoice.invoice_products.length,
               status: INVOICE_STATUS.PENDING,
            },
         };

         const notification = await this.create(newInvoiceNotification);

         socketService.broadcastToAdmins(newInvoiceNotification);
         socketService.sendNotification(user._id.toString(),notification);

         return { success: true };
      } catch (error) {
         console.error(`Error notifying about new invoice: ${error.message}`);
         // Log error but don't throw - we don't want to disrupt the invoice creation process
         return { success: false, error: error.message };
      }
   }

   // Notify about invoice status change
   async notifyInvoiceStatusChange(invoice, previousStatus) {
      try {
         const userId = invoice.invoice_user.toString();
         const invoiceId = invoice._id.toString();
         const currentStatus = invoice.invoice_status;

         // Create message based on status
         let message;
         switch (currentStatus) {
            case 'PROCESSING':
               message = `Your order #${invoiceId.slice(
                  -6,
               )} is now being processed.`;
               break;
            case 'SHIPPED':
               message = `Your order #${invoiceId.slice(-6)} has been shipped.`;
               break;
            case 'DELIVERED':
               message = `Your order #${invoiceId.slice(
                  -6,
               )} has been delivered. Enjoy your purchase!`;
               break;
            case 'CANCELLED':
               message = `Your order #${invoiceId.slice(
                  -6,
               )} has been cancelled.`;
               break;
            case 'COMPLETED':
               message = `Your order #${invoiceId.slice(
                  -6,
               )} is now complete. Thank you for your purchase!`;
               break;
            default:
               message = `Your order #${invoiceId.slice(
                  -6,
               )} status has been updated to ${currentStatus}.`;
         }

         // Create a notification for the user
         await this.create({
            recipient: userId,
            type: 'ACTIVITY',
            message,
            data: {
               invoiceId: invoiceId,
               previousStatus,
               currentStatus,
               updatedAt: new Date(),
            },
         });

         return { success: true };
      } catch (error) {
         console.error(
            `Error notifying about invoice status change: ${error.message}`,
         );
         return { success: false, error: error.message };
      }
   }

   // Notify about new review
   async notifyNewReview(review) {
      try {
         const product = await productModel
            .findById(review.review_product)
            .select('product_name product_imgs');

         const user = await userModel
            .findById(review.review_user.toString())
            .populate('user_profile')
            .lean();

         const newReviewNotification = {
            recipient: review.review_user.toString(),
            sender: null,
            type: NOTIFICATION_TYPES.REVIEW,
            review_info: {
               label: 'new review created',
               rating: review.review_rating,
               message: review.review_content,
               review_id: review._id.toString(),
               content: review.review_content,
               user_id: review.review_user.toString(),
               customer_name: `${user?.user_profile.profile_firstName} ${user?.user_profile.profile_lastName}`,
               product_id: review.review_product.toString(),
               product_name: product.product_name,
               product_image: product.product_imgs[0].secure_url,
               invoice_code: review.review_invoice.toString(),
            },
         };

         const notification = await this.create(newReviewNotification);

         socketService.broadcastToAdmins(newReviewNotification);
         socketService.sendNotification(user._id.toString(),notification);

         return { success: true };
      } catch (error) {
         console.error(`Error notifying about new review: ${error.message}`);
         return { success: false, error: error.message };
      }
   }

   // Get admin user IDs - helper method for admin notifications
   // This is a placeholder - you'll need to implement based on your user role system
   async getAdminUserIds() {
      try {
         const User = require('../domain/models/user.model');
         // This query would need to be adjusted based on how you identify admin users
         const admins = await User.find({ role: 'ADMIN' }).select('_id');
         return admins.map((admin) => admin._id);
      } catch (error) {
         console.error(`Error getting admin user IDs: ${error.message}`);
         return [];
      }
   }

   // Get count of new entities for a dashboard
   async getNewEntitiesCount(userId, options = {}) {
      try {
         const { since = new Date(Date.now() - 24 * 60 * 60 * 1000) } = options; // Default: last 24 hours

         // Get models
         const Invoice = require('../domain/models/invoice.model');
         const Review = require('../domain/models/review.model');
         const User = require('../domain/models/user.model');

         // Check if user is admin
         const user = await User.findById(userId);
         const isAdmin = user && user.role === 'ADMIN';

         // Count results will depend on user role
         let result = {
            newInvoices: 0,
            newReviews: 0,
         };

         if (isAdmin) {
            // Admin sees all new invoices and reviews
            result.newInvoices = await Invoice.countDocuments({
               createdAt: { $gte: since },
            });

            result.newReviews = await Review.countDocuments({
               createdAt: { $gte: since },
            });
         } else {
            // Regular users only see their own invoices
            result.newInvoices = await Invoice.countDocuments({
               invoice_user: userId,
               createdAt: { $gte: since },
            });

            // For sellers, show reviews on their products
            if (user && user.isSeller) {
               const Product = require('../domain/models/product.model');
               const userProducts = await Product.find({
                  seller: userId,
               }).select('_id');
               const productIds = userProducts.map((p) => p._id);

               result.newReviews = await Review.countDocuments({
                  review_product: { $in: productIds },
                  createdAt: { $gte: since },
               });
            }
         }

         return result;
      } catch (error) {
         throw new Error(`Error getting new entities count: ${error.message}`);
      }
   }

   // Send system notification to multiple users
   async sendSystemNotification(userIds, message, data = {}) {
      try {
         // Separate admin and normal user IDs
         const adminIds = [];
         const normalUserIds = [];

         // Check each user's role
         for (const userId of userIds) {
            try {
               const User = require('../domain/models/user.model');
               const user = await User.findById(userId).select('role');

               if (user && user.role === 'ADMIN') {
                  adminIds.push(userId);
               } else {
                  normalUserIds.push(userId);
               }
            } catch (error) {
               console.error(`Error checking user role for ${userId}:`, error);
               normalUserIds.push(userId); // Default to normal user if error
            }
         }

         // Create notifications in database for all users
         const notificationPromises = userIds.map((userId) => {
            return this.create({
               recipient: userId,
               type: 'SYSTEM',
               message,
               data,
            });
         });

         const notifications = await Promise.all(notificationPromises);

         // Send via appropriate sockets to online users
         const notificationData = {
            type: 'SYSTEM',
            message,
            data,
            createdAt: new Date(),
         };

         // Send to admins via admin channel
         if (adminIds.length > 0) {
            adminIds.forEach((adminId) => {
               if (socketService.isAdminOnline(adminId)) {
                  socketService.sendAdminNotification(
                     adminId,
                     notificationData,
                  );
               }
            });
         }

         // Send to normal users via user channel
         if (normalUserIds.length > 0) {
            socketService.sendNotificationToMany(
               normalUserIds,
               notificationData,
            );
         }

         return { success: true, count: notifications.length };
      } catch (error) {
         throw new Error(`Error sending system notification: ${error.message}`);
      }
   }
}

module.exports = new NotificationService();
