const { Schema } = require('mongoose');
const {
   BadRequestError,
   NotFoundError,
} = require('../domain/core/error.response');
const inventoryModel = require('../domain/models/inventory.model');
const { COLORS_ARRAY, SIZES_ARRAY } = require('../domain/constants/domain');

class InventoryService {
   getByProductVariants = async (productId, productColor, productSize) => {
      if (!productColor && !productSize) {
         throw new BadRequestError('Color and size are required');
      }

      if (productColor && !COLORS_ARRAY.includes(productColor)) {
         throw new BadRequestError('Invalid color');
      }
      if (productSize && !SIZES_ARRAY.includes(productSize)) {
         throw new BadRequestError('Invalid size');
      }

      // Case 1: When both color and size are provided
      if (productColor && productSize) {
         const filter = {
            inventory_product: productId,
            'sku.sku_size': productSize,
            'sku.sku_color': productColor,
         };

         try {
            const inventory = await inventoryModel.findOne(filter);

            if (!inventory) {
               throw new NotFoundError('Inventory not found');
            }

            return inventory;
         } catch (err) {
            console.error(err);
            throw err; // Re-throw the error for proper handling
         }
      }
   };
}

module.exports = new InventoryService();
