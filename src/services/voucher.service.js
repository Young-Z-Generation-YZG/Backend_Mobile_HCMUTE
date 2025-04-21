const {
   BadRequestError,
   NotFoundError,
} = require('../domain/core/error.response');
const voucherModel = require('../domain/models/voucher.model');
const userModel = require('../domain/models/user.model');
const mongoose = require('mongoose');
const crypto = require('crypto');

class VoucherService {
   /**
    * Generate a new voucher for a user when they write a review
    * @param {Object} user - User object
    * @param {Object} reviewId - ID of the review that generated this voucher
    * @returns {Object} - The created voucher
    */
   async generateReviewVoucher(user, reviewId) {
      try {
         // Generate random voucher code
         const voucherCode = `REV-${crypto
            .randomBytes(4)
            .toString('hex')
            .toUpperCase()}`;

         // Set voucher dates (valid for 30 days from now)
         const now = new Date();
         const expiryDate = new Date(now);
         expiryDate.setDate(now.getDate() + 30);

         // Create the voucher
         const voucher = await voucherModel.create({
            voucher_code: voucherCode,
            voucher_name: 'Review Reward',
            voucher_description: 'Thank you for your product review!',
            voucher_type: 'PERCENTAGE',
            voucher_value: 10, // 10% discount
            voucher_min_order_value: 0,
            voucher_max_discount: 100000, // Limit maximum discount
            voucher_start_date: now,
            voucher_end_date: expiryDate,
            voucher_count: 1, // Can be used once
            voucher_user: user._id,
            voucher_status: 'ACTIVE',
            voucher_source: 'REVIEW',
         });

         return {
            _id: voucher._id,
            code: voucherCode,
            value: '10%',
            expires: expiryDate,
         };
      } catch (error) {
         console.error('Error generating review voucher:', error);
         throw new BadRequestError('Failed to generate voucher');
      }
   }

   /**
    * Apply a voucher to an order
    * @param {string} voucherCode - The voucher code to apply
    * @param {string} userId - The user ID
    * @param {number} orderAmount - The order amount before discount
    * @returns {Object} - The discount information
    */
   async applyVoucher(voucherCode, userId, orderAmount) {
      if (!voucherCode) {
         return {
            isApplied: false,
            finalAmount: orderAmount,
            discount: 0,
            voucher: null,
         };
      }

      // Find the voucher and verify it belongs to the user and is valid
      const voucher = await voucherModel.findOne({
         voucher_code: voucherCode,
         voucher_user: userId,
         voucher_status: 'ACTIVE',
      });

      if (!voucher) {
         throw new BadRequestError('Used or expired voucher code');
      }

      // Calculate discount
      let discountAmount = 0;

      if (voucher.voucher_type === 'PERCENTAGE') {
         discountAmount = (orderAmount * voucher.voucher_value) / 100;

         // Apply maximum discount if set
         if (
            voucher.voucher_max_discount &&
            discountAmount > voucher.voucher_max_discount
         ) {
            discountAmount = voucher.voucher_max_discount;
         }
      } else {
         // Fixed amount voucher
         discountAmount = voucher.voucher_value;
      }

      // Apply discount
      const finalAmount = Math.max(0, orderAmount - discountAmount);

      // Prepare voucher reference for the invoice
      const appliedVoucher = {
         voucher_id: voucher._id,
         voucher_code: voucher.voucher_code,
         voucher_value: voucher.voucher_value,
         voucher_type: voucher.voucher_type,
         discount_amount: discountAmount,
      };

      return {
         isApplied: true,
         finalAmount,
         discount: discountAmount,
         voucher: appliedVoucher,
      };
   }

   /**
    * Mark a voucher as used
    * @param {string} voucherId - The ID of the voucher to update
    * @param {Object} session - Mongoose session for transaction
    */
   async markVoucherAsUsed(voucherId, session) {
      if (!voucherId) return;

      const voucher = await voucherModel.findById(voucherId);
      if (!voucher) return;

      await voucherModel.findByIdAndUpdate(
         voucherId,
         {
            $inc: { voucher_used_count: 1 },
            $set: {
               voucher_status:
                  voucher.voucher_count <= voucher.voucher_used_count + 1
                     ? 'USED'
                     : 'ACTIVE',
            },
         },
         { session },
      );
   }

   /**
    * Get all vouchers for a user
    * @param {string} userId - The user ID
    * @returns {Array} - List of vouchers
    */
   async getUserVouchers(userId) {
      const vouchers = await voucherModel
         .find({
            voucher_user: userId,
            voucher_status: 'ACTIVE',
         })
         .sort({ createdAt: -1 });

      return vouchers.map((voucher) => ({
         id: voucher._id,
         code: voucher.voucher_code,
         name: voucher.voucher_name,
         description: voucher.voucher_description,
         value: voucher.voucher_value,
         type: voucher.voucher_type,
         minOrderValue: voucher.voucher_min_order_value,
         maxDiscount: voucher.voucher_max_discount,
         startDate: voucher.voucher_start_date,
         endDate: voucher.voucher_end_date,
         isValid: voucher.isValid(),
         source: voucher.voucher_source,
      }));
   }

   /**
    * Get all vouchers for a user by using authentication
    * @returns {Array} - List of vouchers
    */
   async getVouchers(req) {
      const { email } = req.user;

      const user = await userModel.findOne({ email }).populate({
         path: 'user_profile',
         model: 'profile',
      });

      const vouchers = await voucherModel
         .find({
            voucher_user: user._id,
            voucher_status: 'ACTIVE',
         })
         .sort({ createdAt: -1 });

      return vouchers.map((voucher) => ({
         id: voucher._id,
         code: voucher.voucher_code,
         name: voucher.voucher_name,
         description: voucher.voucher_description,
         value: voucher.voucher_value,
         type: voucher.voucher_type,
         minOrderValue: voucher.voucher_min_order_value,
         maxDiscount: voucher.voucher_max_discount,
         startDate: voucher.voucher_start_date,
         endDate: voucher.voucher_end_date,
         isValid: voucher.isValid(),
         source: voucher.voucher_source,
      }));
   }
}

module.exports = new VoucherService();
