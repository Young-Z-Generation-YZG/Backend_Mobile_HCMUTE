'use strict';

const { model, Schema } = require('mongoose');
const mongoose = require('mongoose');
var slug = require('mongoose-slug-updater');
mongoose.plugin(slug);
const categoryModel = require('./category.model');

const COLLECTION_NAME = 'Products';
const DOCUMENT_NAME = 'Product';

// Define the schema for rating star items without _id
const ratingStarSchema = new Schema(
   {
      star: {
         type: Number,
         enum: [1, 2, 3, 4, 5],
      },
      star_count: {
         type: Number,
         default: 0,
      },
   },
   { _id: false },
);

const productSchema = new Schema(
   {
      product_code: {
         type: String,
         default: '',
         trim: true,
      },
      product_name: {
         type: String,
         default: '',
         trim: true,
      },
      product_description: {
         type: String,
         default: 'No description yet',
         trim: true,
      },
      product_sizes: {
         type: [String],
         enum: ['S', 'M', 'L', 'XL'],
         required: true,
      },
      product_colors: {
         type: [String],
         enum: ['YELLOW', 'GREEN', 'BROWN', 'WHITE'],
         required: true,
      },
      product_stocks: {
         type: Number,
         default: 0,
      },
      product_imgs: {
         type: [Object],
         default: [],
      },
      product_category: {
         type: Schema.Types.ObjectId,
         ref: categoryModel,
         default: null,
      },
      product_type: {
         type: String,
         enum: ['clothe', 'trousers', 'shoes'],
         trim: true,
      },
      product_gender: {
         type: String,
         enum: ['man', 'woman', 'unisex'],
         trim: true,
      },
      product_brand: {
         type: String,
         default: '',
         trim: true,
      },
      product_price: {
         type: Number,
         default: 0,
      },
      product_promotion: {
         promotion_id: {
            type: Schema.Types.ObjectId,
            ref: 'Promotion',
            default: null,
         },
         promotion_name: {
            type: String,
            default: '',
            trim: true,
         },
         current_discount: {
            type: Number,
            min: 0,
            max: 100,
            default: 0,
         },
         start_date: {
            type: Date,
            default: null,
         },
         end_date: {
            type: Date,
            default: null,
         },
         _id: false,
      },
      product_slug: {
         type: String,
         slug: 'product_name',
         unique: true,
      },
      product_status: {
         type: String,
         enum: ['DRAFT', 'PUBLISHED', 'SCHEDULED'],
      },
      average_rating: {
         average_value: {
            type: Number,
            default: 0,
         },
         rating_count: {
            type: Number,
            default: 0,
         },
      },
      rating_star: {
         type: [ratingStarSchema],
         default: [
            {
               star: 1,
               star_count: 0,
            },
            {
               star: 2,
               star_count: 0,
            },
            {
               star: 3,
               star_count: 0,
            },
            {
               star: 4,
               star_count: 0,
            },
            {
               star: 5,
               star_count: 0,
            },
         ],
      },
   },
   {
      timestamps: true,
      collection: COLLECTION_NAME,
   },
);

// // Add index for searching
productSchema.index(
   {
      product_name: 'text',
      product_description: 'text',
   },
   {
      weights: {
         product_name: 10,
         product_description: 1,
      },
   },
);

module.exports = model(DOCUMENT_NAME, productSchema);
