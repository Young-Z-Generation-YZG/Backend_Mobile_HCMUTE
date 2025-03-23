'use strict';

const InvoiceModel = require('../domain/models/invoice.model');
const ProductService = require('./product.service');
const InventoryService = require('./inventory.service');
const {
   PAYMENT_METHODS,
   PAYMENT_METHODS_ARRAY,
   INVOICE_STATUS,
} = require('../common/constants/domain');

const {
   BadRequestError,
   NotFoundError,
} = require('../domain/core/error.response');
const { default: mongoose } = require('mongoose');

class InvoiceService {
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
}

module.exports = new InvoiceService();
