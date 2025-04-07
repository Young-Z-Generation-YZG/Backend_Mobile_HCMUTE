const { model, Schema } = require('mongoose');

const COLLECTION_NAME = 'Vouchers';
const DOCUMENT_NAME = 'Voucher';

const voucherSchema = new Schema(
   {
      voucher_code: {
         type: String,
         required: true,
         unique: true,
         trim: true,
      },
      voucher_name: {
         type: String,
         required: true,
         trim: true,
      },
      voucher_description: {
         type: String,
         default: '',
         trim: true,
      },
      voucher_type: {
         type: String,
         enum: ['PERCENTAGE', 'FIXED_AMOUNT'],
         default: 'PERCENTAGE',
      },
      voucher_value: {
         type: Number,
         required: true,
         min: 0,
      },
      voucher_max_discount: {
         type: Number,
         default: null,
      },
      voucher_start_date: {
         type: Date,
         required: true,
      },
      voucher_end_date: {
         type: Date,
         required: true,
      },
      voucher_count: {
         type: Number,
         default: 1, // Number of times voucher can be used
      },
      voucher_used_count: {
         type: Number,
         default: 0,
      },
      voucher_user: {
         type: Schema.Types.ObjectId,
         ref: 'User',
         required: true,
      },
      voucher_status: {
         type: String,
         enum: ['ACTIVE', 'EXPIRED'],
         default: 'ACTIVE',
      },
      voucher_source: {
         type: String,
         enum: ['REVIEW', 'PROMOTION', 'SYSTEM'],
         required: true,
         default: 'SYSTEM',
      },
   },
   {
      timestamps: true,
      collection: COLLECTION_NAME,
   },
);

// Middleware to validate dates
voucherSchema.pre('save', function (next) {
   if (this.voucher_start_date >= this.voucher_end_date) {
      next(new Error('End date must be after start date'));
   }
   next();
});

// Method to check if voucher is valid
voucherSchema.methods.isValid = function () {
   const now = new Date();
   return (
      this.voucher_status === 'ACTIVE' &&
      now >= this.voucher_start_date &&
      now <= this.voucher_end_date &&
      this.voucher_used_count < this.voucher_count
   );
};

module.exports = model(DOCUMENT_NAME, voucherSchema);
