'use strict';

const schedule = require('node-schedule');
const InvoiceModel = require('../domain/models/invoice.model');
const ProductService = require('./product.service');
const InventoryService = require('./inventory.service');
const VoucherService = require('./voucher.service');
const {
   PAYMENT_METHODS,
   PAYMENT_METHODS_ARRAY,
   INVOICE_STATUS,
   INVOICE_STATUS_ARRAY,
} = require('../domain/constants/domain');

const {
   BadRequestError,
   NotFoundError,
} = require('../domain/core/error.response');
const { default: mongoose } = require('mongoose');
const { isNull } = require('lodash');
const userModel = require('../domain/models/user.model');

class InvoiceService {
   constructor() {
      this.jobs = new Map(); // Store scheduled jobs for cleanup if needed
   }

   async getAll(req) {
      const {
         _page = 1,
         _limit = 10, // Changed default to 10
         _sort = 'asc',
         _sortBy = 'createdAt',
         _invoiceStatus, // Removed default
         _paymentMethod, // Added new filter
         _userId, // Added new filter
      } = req.query;

      // Parse and validate pagination parameters
      const page = parseInt(_page, 10);
      const limit = parseInt(_limit, 10);
      const sortDirection = _sort.toLowerCase() === 'desc' ? -1 : 1;

      if (isNaN(page) || page < 1) {
         throw new BadRequestError('Page must be a positive number');
      }

      if (isNaN(limit) || limit < 1 || limit > 100) {
         throw new BadRequestError('Limit must be between 1 and 100');
      }

      // Validate sort field
      const validSortFields = ['createdAt', 'updatedAt', 'invoice_total'];
      const sortField = validSortFields.includes(_sortBy)
         ? _sortBy
         : 'createdAt';

      // Build query object
      const query = {};

      // Filter by invoice status
      if (_invoiceStatus) {
         if (!INVOICE_STATUS_ARRAY.includes(_invoiceStatus)) {
            throw new BadRequestError('Invalid invoice status');
         }
         query.invoice_status = _invoiceStatus;
      }

      // Filter by payment method
      if (_paymentMethod) {
         if (!PAYMENT_METHODS_ARRAY.includes(_paymentMethod)) {
            throw new BadRequestError('Invalid payment method');
         }
         query.payment_method = _paymentMethod;
      }

      // // Filter by user ID
      // if (_userId) {
      //    if (!mongoose.Types.ObjectId.isValid(_userId)) {
      //       throw new BadRequestError('Invalid user ID');
      //    }
      //    query.invoice_user = _userId;
      // }

      try {
         // Calculate skip
         const skip = (page - 1) * limit;

         // Execute queries in parallel
         const [totalItems, invoices] = await Promise.all([
            InvoiceModel.countDocuments(query),
            InvoiceModel.find(query)
               .sort({ [sortField]: sortDirection })
               .skip(skip)
               .limit(limit)
               .lean(),
            // .populate('invoice_user', 'email') // Optional: populate user info
         ]);

         const totalPages = Math.ceil(totalItems / limit);

         return {
            meta: {
               total_records: totalItems,
               total_pages: totalPages,
               page_size: limit,
               current_page: page,
            },
            items: invoices,
         };
      } catch (error) {
         console.error('Error fetching invoices:', error);
         throw new BadRequestError(error.message || 'Error fetching invoices');
      }
   }

   async getInvoiceOfUser(req) {
      const { email } = req.user;

      if (!email) {
         throw new BadRequestError('User not authenticated');
      }

      const {
         _page = 1,
         _limit = 10,
         _sort = 'asc',
         _sortBy = 'createdAt',
         _invoiceStatus,
      } = req.query;

      // Parse and validate pagination parameters
      const page = parseInt(_page, 10);
      const limit = parseInt(_limit, 10);
      const sortDirection = _sort.toLowerCase() === 'desc' ? -1 : 1;

      if (isNaN(page) || page < 1) {
         throw new BadRequestError('Page must be a positive number');
      }

      if (isNaN(limit) || limit < 1 || limit > 100) {
         throw new BadRequestError('Limit must be between 1 and 100');
      }

      // Validate sort field
      const validSortFields = ['createdAt', 'updatedAt', 'invoice_total'];
      const sortField = validSortFields.includes(_sortBy)
         ? _sortBy
         : 'createdAt';

      try {
         // Find the user by email
         const user = await mongoose.model('User').findOne({ email }).lean();

         if (!user) {
            throw new NotFoundError('User not found');
         }

         // Build query object
         const query = {
            invoice_user: user._id,
         };

         // Filter by invoice status
         if (_invoiceStatus) {
            if (!INVOICE_STATUS_ARRAY.includes(_invoiceStatus)) {
               throw new BadRequestError('Invalid invoice status');
            }
            query.invoice_status = _invoiceStatus;
         }

         // Calculate skip
         const skip = (page - 1) * limit;

         // Execute queries in parallel
         const [totalItems, invoices] = await Promise.all([
            InvoiceModel.countDocuments(query),
            InvoiceModel.find(query)
               .sort({ [sortField]: sortDirection })
               .skip(skip)
               .limit(limit)
               .lean(),
         ]);

         const totalPages = Math.ceil(totalItems / limit);

         return {
            meta: {
               total_records: totalItems,
               total_pages: totalPages,
               page_size: limit,
               current_page: page,
            },
            items: invoices,
         };
      } catch (error) {
         console.error('Error fetching user invoices:', error);
         throw new BadRequestError(
            error.message || 'Error fetching user invoices',
         );
      }
   }

   // Schedule auto-confirmation for a specific invoice
   scheduleAutoConfirmation(invoiceId, createdAt) {
      const thirtyMinutesLater = new Date(createdAt.getTime() + 30 * 60 * 1000);

      const job = schedule.scheduleJob(thirtyMinutesLater, async () => {
         try {
            const invoice = await InvoiceModel.findById(invoiceId);
            if (!invoice) {
               console.warn(
                  `Invoice ${invoiceId} not found for auto-confirmation`,
               );
               return;
            }

            if (invoice.invoice_status === INVOICE_STATUS.PENDING) {
               invoice.invoice_status = INVOICE_STATUS.CONFIRMED;
               await invoice.save();
               console.log(
                  `Order ${invoiceId} auto-confirmed at ${new Date()}`,
               );
            } else {
               console.log(
                  `Order ${invoiceId} skipped auto-confirmation (status: ${invoice.invoice_status})`,
               );
            }

            // Clean up the job reference
            this.jobs.delete(invoiceId.toString());
         } catch (error) {
            console.error(`Error auto-confirming invoice ${invoiceId}:`, error);
         }
      });

      // Store the job reference
      this.jobs.set(invoiceId.toString(), job);
      console.log(
         `Scheduled auto-confirmation for invoice ${invoiceId} at ${thirtyMinutesLater}`,
      );
   }

   // Cancel a scheduled job (useful for manual confirmation or cancellation)
   async cancelAutoConfirmation(invoiceId) {
      const job = this.jobs.get(invoiceId.toString());
      if (job) {
         job.cancel();
         this.jobs.delete(invoiceId.toString());
         console.log(
            `Cancelled auto-confirmation job for invoice ${invoiceId}`,
         );
         return true;
      }
      return false;
   }

   async getScheduleJobs(req) {
      console.log('Scheduled jobs:', this.jobs.size);

      return Array.from(this.jobs.keys()).map((invoiceId) => ({
         invoice_id: invoiceId,
         next_invocation: this.jobs.get(invoiceId).nextInvocation(),
      }));
   }

   async getConfirmationTimeoutById(req) {
      const { id } = req.params;

      const invoice = await InvoiceModel.findById(id);

      if (!invoice) {
         throw new NotFoundError('Invoice not found');
      }

      if (invoice.invoice_status !== INVOICE_STATUS.PENDING) {
         throw new BadRequestError(
            `Cannot get confirmation timeout for invoice with status ${invoice.invoice_status}. Invoice status must be ${INVOICE_STATUS.PENDING}`,
         );
      }

      const job = this.jobs.get(id);

      if (!job) {
         throw new NotFoundError('Confirmation timeout not found');
      }

      return {
         invoice_id: id,
         next_invocation: job.nextInvocation(),
      };
   }

   // [DONE]
   async create(req) {
      const {
         contact_name,
         contact_phone_number,
         address_line,
         address_district,
         address_province,
         address_country,
         payment_method,
         voucher_code,
      } = req.body;

      const { email } = req.user;

      const { bought_items = [] } = req.body;

      if (!PAYMENT_METHODS_ARRAY.includes(payment_method)) {
         throw new BadRequestError('Invalid payment method');
      }

      // Find user by email
      const user = await mongoose.model('User').findOne({ email }).lean();
      if (!user) {
         throw new NotFoundError('User not found');
      }

      // check products in stock and get promotion info
      let totalAmount = 0;
      const processedItems = [];

      for (const product of bought_items) {
         const { product_id, product_color, product_size, quantity } = product;

         if (isNaN(quantity) || quantity < 0) {
            throw new BadRequestError(
               `Invalid quantity for product ${product_name}`,
            );
         }

         const inventory = await InventoryService.getByProductVariants(
            product_id,
            product_color,
            product_size,
         );

         const { sku } = inventory;
         const { sku_quantity } = sku;

         if (sku_quantity < quantity) {
            throw new BadRequestError(
               `Not enough stock for product ${product_name}`,
            );
         }

         // Get product details including promotion
         const productDetails = await ProductService.getById(product_id);

         let itemTotalPrice = productDetails.product_price * product.quantity;
         let itemSubTotal = itemTotalPrice;
         let promotionInfo = null;
         let itemDiscountPrice = null;
         const itemPromotion = productDetails.product_promotion;

         // Check for active category promotion
         if (!(itemPromotion.promotion_id === undefined)) {
            const discountPercentage =
               productDetails.product_promotion.current_discount;

            const discountAmount = (
               (productDetails.product_price * discountPercentage) /
               100
            ).toFixed(2);

            itemDiscountPrice = productDetails.product_price - discountAmount;

            promotionInfo = {
               promotion_id: productDetails.product_promotion.promotion_id,
               promotion_name:
                  productDetails.product_promotion.promotion_name || '',
               discount_percentage: discountPercentage,
               discount_amount: discountAmount,
            };

            totalAmount += itemTotalPrice - discountAmount * quantity;

            itemSubTotal = itemTotalPrice - discountAmount * quantity;
         } else {
            totalAmount += itemTotalPrice;
         }

         processedItems.push({
            ...product,
            product_name: productDetails.product_name,
            product_image: productDetails.product_imgs[0].secure_url,
            product_price: productDetails.product_price,
            product_sub_total_price: itemSubTotal,
            final_price: itemTotalPrice,
            promotion: promotionInfo,
         });
      }

      // Check payment method (e.g., COD, VNPAY)
      if (payment_method && payment_method === PAYMENT_METHODS.VNPAY) {
         throw new BadRequestError(
            `${PAYMENT_METHODS.VNPAY} is not supported yet`,
         );
      }

      // Apply voucher if provided
      let voucherResult = null;
      if (voucher_code) {
         console.log('voucher_code', voucher_code);

         voucherResult = await VoucherService.applyVoucher(
            voucher_code,
            user._id,
            totalAmount,
         );
      }
      console.log('voucherResult', voucherResult);

      // Create new Invoice with default status = "PENDING"
      const invoiceProducts = processedItems.map((item) => {
         return {
            product_id: new mongoose.Types.ObjectId(item.product_id),
            product_name: item.product_name,
            product_size: item.product_size,
            product_color: item.product_color,
            product_image: item.product_image,
            product_price: item.product_price,
            product_sub_total_price: item.product_sub_total_price,
            final_price: item.final_price,
            quantity: item.quantity,
            promotion: item.promotion,
         };
      });

      const session = await mongoose.startSession();
      session.startTransaction();

      try {
         // Create the invoice
         const newInvoice = await InvoiceModel.create(
            [
               {
                  invoice_user: user._id,
                  contact_name: contact_name,
                  contact_phone_number: contact_phone_number,
                  invoice_products: invoiceProducts,
                  invoice_note: '',
                  shipping_address_line: address_line,
                  shipping_address_district: address_district,
                  shipping_address_province: address_province,
                  shipping_address_country: address_country,
                  payment_method: PAYMENT_METHODS.COD,
                  invoice_status: INVOICE_STATUS.PENDING,
                  invoice_total: voucherResult
                     ? voucherResult.finalAmount
                     : totalAmount,
                  applied_voucher: voucherResult ? voucherResult.voucher : null,
               },
            ],
            { session },
         );

         // Update voucher usage if one was applied
         if (voucherResult && voucherResult.isApplied) {
            await VoucherService.markVoucherAsUsed(
               voucherResult.voucher.voucher_id,
               session,
            );
         }

         await session.commitTransaction();

         // Schedule auto-confirmation for this invoice
         this.scheduleAutoConfirmation(
            newInvoice[0]._id,
            newInvoice[0].createdAt,
         );

         return true;
      } catch (error) {
         await session.abortTransaction();
         console.error('Error creating invoice:', error);
         throw new BadRequestError(error.message || 'Failed to create invoice');
      } finally {
         session.endSession();
      }
   }

   async updateStatus(req) {
      const { id } = req.params;
      const { _status } = req.query;

      if (!INVOICE_STATUS_ARRAY.includes(_status)) {
         throw new BadRequestError('Invalid status');
      }

      const invoice = await InvoiceModel.findById(id);

      if (!invoice) {
         throw new NotFoundError('Invoice not found');
      }

      // case 1: CONFIRMED: only PENDING -> CONFIRMED
      if (
         _status === INVOICE_STATUS.CONFIRMED &&
         invoice.invoice_status !== INVOICE_STATUS.PENDING
      ) {
         throw new BadRequestError(
            `Cannot update status from ${invoice.invoice_status} to ${_status}. Order status must be ${INVOICE_STATUS.PENDING}`,
         );
      }

      // case 2: CANCELLED: only PENDING -> CANCELLED or REQUEST_CANCEL -> CANCELLED
      if (
         _status === INVOICE_STATUS.CANCELLED &&
         invoice.invoice_status !== INVOICE_STATUS.PENDING &&
         invoice.invoice_status !== INVOICE_STATUS.REQUEST_CANCEL
      ) {
         throw new BadRequestError(
            `Cannot update status from ${invoice.invoice_status} to ${_status}. Order status must be ${INVOICE_STATUS.PENDING} or ${INVOICE_STATUS.REQUEST_CANCEL}`,
         );
      }

      // case 3: ON_PREPARING: only CONFIRMED -> ON_PREPARING
      if (
         _status === INVOICE_STATUS.ON_PREPARING &&
         invoice.invoice_status !== INVOICE_STATUS.CONFIRMED
      ) {
         throw new BadRequestError(
            `Cannot update status from ${invoice.invoice_status} to ${_status}. Order status must be ${INVOICE_STATUS.CONFIRMED}`,
         );
      }

      // case 3.1: REQUEST_CANCEL: only ON_PREPARING -> REQUEST_CANCEL
      if (
         _status === INVOICE_STATUS.REQUEST_CANCEL &&
         invoice.invoice_status !== INVOICE_STATUS.ON_PREPARING
      ) {
         throw new BadRequestError(
            `Cannot update status from ${invoice.invoice_status} to ${_status}. Order status must be ${INVOICE_STATUS.ON_PREPARING}`,
         );
      }

      // case 3.2: CANCELLED: only REQUEST_CANCEL -> CANCELLED
      if (
         _status === INVOICE_STATUS.CANCELLED &&
         invoice.invoice_status !== INVOICE_STATUS.REQUEST_CANCEL
      ) {
         throw new BadRequestError(
            `Cannot update status from ${invoice.invoice_status} to ${_status}. Order status must be ${INVOICE_STATUS.REQUEST_CANCEL}`,
         );
      }

      // case 4: ON_DELIVERING: only ON_PREPARING -> ON_DELIVERING
      if (
         _status === INVOICE_STATUS.ON_DELIVERING &&
         invoice.invoice_status !== INVOICE_STATUS.ON_DELIVERING
      ) {
         throw new BadRequestError(
            `Cannot update status from ${invoice.invoice_status} to ${_status}. Order status must be ${INVOICE_STATUS.ON_DELIVERING}`,
         );
      }

      // case 5: DELIVERED: only ON_DELIVERING -> DELIVERED
      if (
         _status === INVOICE_STATUS.DELIVERED &&
         invoice.invoice_status !== INVOICE_STATUS.ON_DELIVERING
      ) {
         throw new BadRequestError(
            `Cannot update status from ${invoice.invoice_status} to ${_status}. Order status must be ${INVOICE_STATUS.ON_DELIVERING}`,
         );
      }

      invoice.invoice_status = _status;

      await invoice.save();

      return true;
   }

   async cancelOrder(req) {
      const { id } = req.params;

      const invoice = await InvoiceModel.findById(id);

      if (!invoice) {
         throw new NotFoundError('Invoice not found');
      }

      if (invoice.invoice_status === INVOICE_STATUS.ON_PREPARING) {
         invoice.invoice_status = INVOICE_STATUS.REQUEST_CANCEL;

         await invoice.save();

         await this.cancelAutoConfirmation(id);

         return true;
      } else {
         throw new BadRequestError(
            `Cannot cancel Order with status ${invoice.invoice_status}. Order status must be ${INVOICE_STATUS.ON_PREPARING}`,
         );
      }
   }

   async confirmOrder(req) {
      const { id } = req.params;

      const invoice = await InvoiceModel.findById(id);

      if (!invoice) {
         throw new NotFoundError('Invoice not found');
      }

      if (invoice.invoice_status === INVOICE_STATUS.PENDING) {
         invoice.invoice_status = INVOICE_STATUS.CONFIRMED;

         await invoice.save();

         // Schedule auto-confirmation
         await this.cancelAutoConfirmation(id);

         return true;
      } else {
         throw new BadRequestError(
            `Cannot cancel Order with status ${invoice.invoice_status}. Order status must be ${INVOICE_STATUS.PENDING}`,
         );
      }
   }

   // async getStatistics(req) {
   //    const { email } = req.user;

   //    const user = await userModel.findOne({ email }).populate({
   //       path: 'user_profile',
   //       model: 'profile',
   //    });

   //    const statistics = await InvoiceModel.aggregate([
   //       {
   //          $match: { invoice_user: user._id },
   //       },
   //       {
   //          $group: {
   //             _id: '$invoice_status',
   //             count: { $sum: 1 },
   //             revenue: { $sum: '$invoice_total' },
   //          },
   //       },
   //       {
   //          $project: {
   //             _id: 0,
   //             status: '$_id',
   //             count: 1,
   //             revenue: 1,
   //          },
   //       },
   //    ]);

   //    const result = {};
   //    statistics.forEach((stat) => {
   //       result[stat.status] = {
   //          count: stat.count,
   //          revenue: stat.revenue,
   //       };
   //    });

   //    const allStatuses = [
   //       'PENDING',
   //       'CONFIRMED',
   //       'REQUEST_CANCEL',
   //       'CANCELLED',
   //       'ON_PREPARING',
   //       'ON_DELIVERING',
   //       'DELIVERED',
   //    ];

   //    allStatuses.forEach((status) => {
   //       if (!result[status]) {
   //          result[status] = { count: 0, revenue: 0 };
   //       }
   //    });

   //    return result;
   // }

   async getStatistics(req) {
      const { email } = req.user;

      const user = await userModel.findOne({ email }).populate({
         path: 'user_profile',
         model: 'profile',
      });

      const invoices = await InvoiceModel.find({ invoice_user: user._id });

      const result = {};

      invoices.forEach((invoice) => {
         const status = invoice.invoice_status;
         if (!result[status]) {
            result[status] = { count: 0, revenue: 0 };
         }
         result[status].count += 1;
         result[status].revenue += invoice.invoice_total;
      });

      const allStatuses = [
         'PENDING',
         'CONFIRMED',
         'REQUEST_CANCEL',
         'CANCELLED',
         'ON_PREPARING',
         'ON_DELIVERING',
         'DELIVERED',
      ];

      allStatuses.forEach((status) => {
         if (!result[status]) {
            result[status] = { count: 0, revenue: 0 };
         }
      });

      return result;
   }

   async getRevenues(req) {
      const { _monthFrom, _monthTo, _year } = req.query;

      if (!_monthFrom || !_monthTo || !_year) {
         throw new BadRequestError(
            'Missing required query parameters: _monthFrom, _monthTo, _year',
         );
      }

      const monthFromNum = parseInt(_monthFrom, 10);
      const monthToNum = parseInt(_monthTo, 10);
      const yearNum = parseInt(_year, 10);

      if (isNaN(monthFromNum) || monthFromNum < 1 || monthFromNum > 12) {
         throw new BadRequestError(
            'Invalid _monthFrom parameter. Must be between 01-12',
         );
      }

      if (isNaN(monthToNum) || monthToNum < 1 || monthToNum > 12) {
         throw new BadRequestError(
            'Invalid _monthTo parameter. Must be between 01-12',
         );
      }

      if (isNaN(yearNum) || yearNum.toString().length !== 4) {
         throw new BadRequestError(
            'Invalid _year parameter. Must be a 4-digit year',
         );
      }

      const startDate = new Date(yearNum, monthFromNum - 1, 1);
      const endDate = new Date(yearNum, monthToNum, 0, 23, 59, 59, 999);

      const invoices = await InvoiceModel.find({
         createdAt: { $gte: startDate, $lte: endDate },
         invoice_status: INVOICE_STATUS.DELIVERED,
      });

      const result = {};
      let totalRevenue = 0;
      let totalQuantity = 0;

      invoices.forEach((invoice) => {
         const createdAt = new Date(invoice.createdAt);
         const monthKey = `${createdAt.getFullYear()}-${String(
            createdAt.getMonth() + 1,
         ).padStart(2, '0')}`;

         if (!result[monthKey]) {
            result[monthKey] = {
               month: monthKey,
               month_revenue: 0,
               month_quantity: 0,
            };
         }

         result[monthKey].month_revenue += invoice.invoice_total || 0;

         const quantity =
            invoice.invoice_products?.reduce((sum, item) => {
               return sum + (item.quantity || 0);
            }, 0) || 0;

         result[monthKey].month_quantity += quantity;

         totalRevenue += invoice.invoice_total || 0;
         totalQuantity += quantity;
      });

      return result;

      // console.log('invoices', invoices);
      // console.log('monthFromNum', monthFromNum);
      // console.log('monthToNum', monthToNum);
      // console.log('yearNum', yearNum);
      // console.log('startDate', startDate);
      // console.log('endDate', endDate);
   }
}

module.exports = new InvoiceService();
