const { model, Schema } = require('mongoose');

const COLLECTION_NAME = 'Inventory';
const DOCUMENT_NAME = 'inventory';

const inventorySchema = new Schema(
   {
      inventory_product: {
         type: Schema.Types.ObjectId,
         ref: 'Products',
         required: true,
         index: true,
      },
      sku: {
         type: {
            sku_color: {
               type: String,
               default: '',
            },
            sku_size: {
               type: String,
               default: '',
            },
            quantity: {
               type: Number,
               default: 0,
            },
         },
         required: true,
      },
   },
   {
      timestamps: true,
      collection: COLLECTION_NAME,
   },
);

module.exports = model(DOCUMENT_NAME, inventorySchema);
