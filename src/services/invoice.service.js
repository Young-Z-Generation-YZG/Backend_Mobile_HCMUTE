'use strict';

const schedule = require('node-schedule');
const InvoiceModel = require('../domain/models/invoice.model');
const ProductService = require('./product.service');
const InventoryService = require('./inventory.service');
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
         total_amount,
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

      // check products in stock
      for (const product of bought_items) {
         const {
            product_id,
            product_name,
            product_color,
            product_size,
            quantity,
         } = product;

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
      }

      // Check payment method (e.g., COD, VNPAY)
      if (payment_method && payment_method === PAYMENT_METHODS.VNPAY) {
         throw new BadRequestError(
            `${PAYMENT_METHODS.VNPAY} is not supported yet`,
         );
      }

      // Create new Invoice with default status = "PENDING"
      var invoiceProducts = bought_items.map((item) => {
         return {
            product_id: new mongoose.Types.ObjectId(item.product_id),
            product_name: item.product_name,
            product_size: item.product_size,
            product_color: item.product_color,
            product_image: item.product_image,
            product_price: item.product_price,
            quantity: item.quantity,
         };
      });

      const newInvoice = await InvoiceModel.create({
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
         invoice_total: total_amount,
      });

      if (!newInvoice) {
         throw new BadRequestError('Error creating invoice');
      }

      // Schedule auto-confirmation for this invoice
      this.scheduleAutoConfirmation(newInvoice._id, newInvoice.createdAt);

      return !!newInvoice;
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
}

module.exports = new InvoiceService();
