const { model, Schema } = require('mongoose');
const userModel = require('./user.model');
const {
   INVOICE_STATUS,
   INVOICE_STATUS_ARRAY,
   COLORS_ARRAY,
   SIZES_ARRAY,
   PAYMENT_METHODS_ARRAY,
   PAYMENT_METHODS,
} = require('../constants/domain');

const COLLECTION_NAME = 'Invoices';
const DOCUMENT_NAME = 'Invoice';

const productInvoiceSchema = new Schema({
   product_id: {
      type: Schema.Types.ObjectId,
      ref: 'Products',
      required: true,
      index: true,
   },
   product_name: {
      type: String,
      required: true,
   },
   product_size: {
      type: String,
      enum: SIZES_ARRAY,
      required: true,
   },
   product_color: {
      type: String,
      enum: COLORS_ARRAY,
      required: true,
   },
   product_image: {
      type: String,
      required: true,
   },
   product_price: {
      type: Number,
      required: true,
      trim: true,
   },
   quantity: {
      type: Number,
      required: true,
   },
   product_sub_total_price: {
      type: Number,
      required: true,
   },
   promotion: {
      type: {
         promotion_id: {
            type: Schema.Types.ObjectId,
            ref: 'Promotion',
         },
         promotion_name: {
            type: String,
         },
         discount_percentage: {
            type: Number,
            min: 0,
            max: 100,
         },
         discount_amount: {
            type: Number,
            min: 0,
         },
         _id: false,
      },
      required: false,
      default: null,
   },
});

productInvoiceSchema.remove('_id');

const invoiceSchema = new Schema(
   {
      invoice_user: {
         type: Schema.Types.ObjectId,
         ref: userModel,
         required: true,
      },
      contact_name: {
         type: String,
         required: true,
         trim: true,
      },
      contact_phone_number: {
         type: String,
         required: true,
         trim: true,
      },
      invoice_products: {
         type: [productInvoiceSchema],
         required: true,
      },
      invoice_note: {
         type: String,
         default: '',
         trim: true,
      },
      shipping_address_line: {
         type: String,
         default: '',
         trim: true,
      },
      shipping_address_district: {
         type: String,
         default: '',
         trim: true,
      },
      shipping_address_province: {
         type: String,
         default: '',
         trim: true,
      },
      shipping_address_country: {
         type: String,
         default: '',
         trim: true,
      },
      payment_method: {
         type: String,
         enum: Object.values(PAYMENT_METHODS),
         default: PAYMENT_METHODS.COD,
      },
      invoice_status: {
         type: String,
         enum: Object.values(INVOICE_STATUS),
         default: INVOICE_STATUS.PENDING,
      },
      invoice_total: {
         type: Number,
         required: true,
         min: 0,
      },
      applied_voucher: {
         voucher_id: {
            type: Schema.Types.ObjectId,
            ref: 'Voucher',
         },
         voucher_code: {
            type: String,
            trim: true,
         },
         voucher_value: {
            type: Number,
         },
         voucher_type: {
            type: String,
            enum: ['PERCENTAGE', 'FIXED_AMOUNT'],
         },
         discount_amount: {
            type: Number,
            min: 0,
         },
         _id: false,
      },
   },
   {
      timestamps: true,
      collection: COLLECTION_NAME,
   },
);

module.exports = model(DOCUMENT_NAME, invoiceSchema);
