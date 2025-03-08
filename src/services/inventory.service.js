const { Schema } = require('mongoose');
const {
   BadRequestError,
   NotFoundError,
} = require('../domain/core/error.response');
const inventoryModel = require('../domain/models/inventory.model');
const productModel = require('../domain/models/product.model');

class InventoryService {
   getByProductId = async (productId, filters = {}) => {
      if (productId === Schema.Types.ObjectId) {
         throw new BadRequestError('Something wrong with product ID');
      }

      try {
         const inventory = await inventoryModel.find(
            {
               inventory_product: productId,
            },
            filters,
         );

         return inventory;
      } catch (err) {
         console.error(err);
      }

      return null;
   };
}

module.exports = new InventoryService();
