const { model, Schema } = require('mongoose');
const userModel = require('./user.model');
const {
   INVOICE_STATUS,
   INVOICE_STATUS_ARRAY,
   COLORS_ARRAY,
   SIZES_ARRAY,
   PAYMENT_METHODS_ARRAY,
} = require('../../common/constants/domain');

const COLLECTION_NAME = 'Invoices';
const DOCUMENT_NAME = 'invoice';

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
         enum: PAYMENT_METHODS_ARRAY,
         required: true,
      },
      invoice_status: {
         type: String,
         enum: INVOICE_STATUS_ARRAY,
         default: INVOICE_STATUS.PENDING,
         required: true,
      },
      invoice_total: {
         type: Number,
         trim: true,
      },
   },
   {
      timestamps: true,
      collection: COLLECTION_NAME,
   },
);

module.exports = model(DOCUMENT_NAME, invoiceSchema);
