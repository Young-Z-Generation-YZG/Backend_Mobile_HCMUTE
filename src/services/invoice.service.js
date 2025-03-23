'use strict';

const InvoiceModel = require('../domain/models/invoice.model');
const ProductService = require('./product.service');
const InventoryService = require('./inventory.service');
const {
   PAYMENT_METHODS,
   PAYMENT_METHODS_ARRAY,
   INVOICE_STATUS,
   INVOICE_STATUS_ARRAY,
} = require('../common/constants/domain');

const {
   BadRequestError,
   NotFoundError,
} = require('../domain/core/error.response');
const { default: mongoose } = require('mongoose');

class InvoiceService {
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
      // if (_paymentMethod) {
      //    if (!PAYMENT_METHODS_ARRAY.includes(_paymentMethod)) {
      //       throw new BadRequestError('Invalid payment method');
      //    }
      //    query.payment_method = _paymentMethod;
      // }

      // Filter by user ID
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

      const userEmail = 'lov3rinve146@gmail.com';

      const { bought_items = [] } = req.body;

      if (!PAYMENT_METHODS_ARRAY.includes(payment_method)) {
         throw new BadRequestError('Invalid payment method');
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
         invoice_user: new mongoose.Types.ObjectId('664439317954a1ae3c523650'),
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

      return !!newInvoice;
   }

   async updateStatus(req) {
      const { id } = req.params;
      const { _status } = req.query;

      console.log('id', id);
      console.log('_status', _status);

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
            `Cannot update status from ${invoice.invoice_status} to ${_status}`,
         );
      }

      // case 2: CANCELLED: only PENDING -> CANCELLED
      if (
         _status === INVOICE_STATUS.CANCELLED &&
         invoice.invoice_status !== INVOICE_STATUS.PENDING
      ) {
         throw new BadRequestError(
            `Cannot update status from ${invoice.invoice_status} to ${_status}`,
         );
      }

      // case 3: ON_PREPARING: only CONFIRMED -> ON_PREPARING
      if (
         _status === INVOICE_STATUS.ON_PREPARING &&
         invoice.invoice_status !== INVOICE_STATUS.CONFIRMED
      ) {
         throw new BadRequestError(
            `Cannot update status from ${invoice.invoice_status} to ${_status}`,
         );
      }

      // case 3.1: REQUEST_CANCEL: only ON_PREPARING -> REQUEST_CANCEL
      if (
         _status === INVOICE_STATUS.REQUEST_CANCEL &&
         invoice.invoice_status !== INVOICE_STATUS.ON_PREPARING
      ) {
         throw new BadRequestError(
            `Cannot update status from ${invoice.invoice_status} to ${_status}`,
         );
      }

      // case 3.2: CANCELLED: only REQUEST_CANCEL -> CANCELLED
      if (
         _status === INVOICE_STATUS.CANCELLED &&
         invoice.invoice_status !== INVOICE_STATUS.REQUEST_CANCEL
      ) {
         throw new BadRequestError(
            `Cannot update status from ${invoice.invoice_status} to ${_status}`,
         );
      }

      // case 4: ON_DELIVERING: only ON_PREPARING -> ON_DELIVERING
      if (
         _status === INVOICE_STATUS.ON_DELIVERING &&
         invoice.invoice_status !== INVOICE_STATUS.ON_DELIVERING
      ) {
         throw new BadRequestError(
            `Cannot update status from ${invoice.invoice_status} to ${_status}`,
         );
      }

      // case 5: DELIVERED: only ON_DELIVERING -> DELIVERED
      if (
         _status === INVOICE_STATUS.DELIVERED &&
         invoice.invoice_status !== INVOICE_STATUS.ON_DELIVERING
      ) {
         throw new BadRequestError(
            `Cannot update status from ${invoice.invoice_status} to ${_status}`,
         );
      }

      invoice.invoice_status = _status;

      await invoice.save();

      return true;
   }
}

module.exports = new InvoiceService();
