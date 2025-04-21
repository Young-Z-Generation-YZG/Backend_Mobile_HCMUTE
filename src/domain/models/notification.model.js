const mongoose = require('mongoose');
const { INVOICE_STATUS_ARRAY } = require('../constants/domain');
const Schema = mongoose.Schema;

const COLLECTION_NAME = 'Notifications';
const DOCUMENT_NAME = 'Notification';

const invoiceNotificationSchema = new Schema(
   {
      label: {
         type: String,
         default: '',
         trim: true,
      },
      message: {
         type: String,
         default: '',
         trim: true,
      },
      invoice_id: {
         type: Schema.Types.ObjectId,
         ref: 'Invoice',
      },
      invoice_code: {
         type: String,
         default: '',
      },
      customer_id: {
         type: Schema.Types.ObjectId,
         ref: 'User',
      },
      customer_name: {
         type: String,
         default: '',
      },
      amount: {
         type: Number,
         default: 0,
      },
      unit: {
         type: Number,
         default: 0,
      },
      status: {
         type: String,
         enum: INVOICE_STATUS_ARRAY,
      },
      createdAt: {
         type: Date,
         default: Date.now,
      },
      updatedAt: {
         type: Date,
         default: Date.now,
      },
   },
   {
      _id: false,
      timestamps: true,
   },
);

const reviewNotificationSchema = new Schema(
   {
      label: {
         type: String,
         default: '',
         trim: true,
      },
      message: {
         type: String,
         default: '',
         trim: true,
      },
      review_id: {
         type: Schema.Types.ObjectId,
         ref: 'Review',
      },
      rating: {
         type: Number,
         default: 5,
      },
      content: {
         type: String,
         default: '',
         trim: true,
      },
      user_id: {
         type: Schema.Types.ObjectId,
         ref: 'User',
      },
      customer_name: {
         type: String,
         default: '',
         trim: true,
      },
      product_id: {
         type: Schema.Types.ObjectId,
         ref: 'Product',
      },
      product_name: {
         type: String,
         default: '',
         trim: true,
      },
      product_image: {
         type: String,
         default: '',
         trim: true,
      },
      invoice_code: {
         type: String,
         default: '',
         trim: true,
      },
      createdAt: {
         type: Date,
         default: Date.now,
      },
   },
   {
      _id: false,
      timestamps: true,
   },
);

const voucherNotificationSchema = new Schema(
   {
      label: {
         type: String,
         default: '',
         trim: true,
      },
      code: {
         type: String,
         default: '',
         trim: true,
      },
      discount_rate: {
         type: Number,
         default: 5,
      },
      description: {
         type: String,
         default: '',
         trim: true,
      },
      unit: {
         type: Number,
         default: 0,
      },
      createdAt: {
         type: Date,
         default: Date.now,
      },
      dueAt: {
         type: Date,
         default: Date.now,
      },
   },
   {
      _id: false,
      timestamps: true,
   },
);

const notificationSchema = new Schema(
   {
      recipient: {
         type: Schema.Types.ObjectId,
         ref: 'User',
      },
      sender: {
         type: Schema.Types.ObjectId,
         ref: 'User',
      },
      type: {
         type: String,
         required: true,
         enum: ['SYSTEM', 'USER', 'INVOICE', 'REVIEW', 'VOUCHER', 'ACTIVITY'],
      },
      invoice_info: {
         type: invoiceNotificationSchema,
         default: null,
      },
      review_info: {
         type: reviewNotificationSchema,
         default: null,
      },
      voucher_info: {
         type: voucherNotificationSchema,
         default: null,
      },
      isRead: {
         type: Boolean,
         default: false,
      },
      readAt: {
         type: Date,
         default: null,
      },
      isDeleted: {
         type: Boolean,
         default: false,
      },
   },
   {
      timestamps: true,
      collection: COLLECTION_NAME,
   },
);

// Define indexes for better query performance
notificationSchema.index({ recipient: 1 });
notificationSchema.index({ isRead: 1 });
notificationSchema.index({ createdAt: -1 });

module.exports = mongoose.model(DOCUMENT_NAME, notificationSchema);
