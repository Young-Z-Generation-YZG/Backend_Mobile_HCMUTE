const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const MongoDatabase = require('../mongo.db');

// Import models
const userModel = require('../../../domain/models/user.model');
const profileModel = require('../../../domain/models/profile.model');
const addressModel = require('../../../domain/models/address.model');
const roleModel = require('../../../domain/models/role.model');
const resourceModel = require('../../../domain/models/resource.model');
const categoryModel = require('../../../domain/models/category.model');
const productModel = require('../../../domain/models/product.model');
const inventoryModel = require('../../../domain/models/inventory.model');

/**
 * Import existing MongoDB export data that contains ObjectIds
 */
async function importExistingData() {
   try {
      // Connect to the database
      await MongoDatabase.connect();
      console.log('Connected to database');

      // Import Resources
      console.log('Importing resources...');
      const resourcesData = JSON.parse(
         fs.readFileSync(
            path.join(__dirname, 'data', 'resources.json'),
            'utf8',
         ),
      );

      // Import Roles
      console.log('Importing roles...');
      const rolesData = JSON.parse(
         fs.readFileSync(path.join(__dirname, 'data', 'roles.json'), 'utf8'),
      );

      // Import Categories
      console.log('Importing categories...');
      const categoriesData = JSON.parse(
         fs.readFileSync(
            path.join(__dirname, 'data', 'categories.json'),
            'utf8',
         ),
      );

      // Import Products
      console.log('Importing products...');
      const productsData = JSON.parse(
         fs.readFileSync(path.join(__dirname, 'data', 'products.json'), 'utf8'),
      );

      // Import Inventory
      console.log('Importing inventory...');
      const inventoryData = JSON.parse(
         fs.readFileSync(
            path.join(__dirname, 'data', 'inventory.json'),
            'utf8',
         ),
      );

      // Import addresses
      console.log('Importing addresses...');
      const addressesData = JSON.parse(
         fs.readFileSync(
            path.join(__dirname, 'data', 'addresses.json'),
            'utf8',
         ),
      );

      // Import profiles
      console.log('Importing profiles...');
      const profilesData = JSON.parse(
         fs.readFileSync(path.join(__dirname, 'data', 'profiles.json'), 'utf8'),
      );

      // Import users
      console.log('Importing users...');
      const usersData = JSON.parse(
         fs.readFileSync(path.join(__dirname, 'data', 'users.json'), 'utf8'),
      );

      // // Import resources with their original IDs
      let importedResources = 0;
      // for (const resourceData of resourcesData) {
      //    const resourceId = resourceData._id.$oid;
      //    const existingResource = await resourceModel.findById(resourceId);
      //    if (!existingResource) {
      //       await resourceModel.create({
      //          _id: resourceData._id.$oid,
      //          res_name: resourceData.res_name,
      //          res_description: resourceData.res_description,
      //       });
      //       importedResources++;
      //    }
      // }

      // // Import roles with their original IDs

      let importedRoles = 0;
      // for (const roleData of rolesData) {
      //    const roleId = roleData._id.$oid;

      //    // Check if role already exists
      //    const existingRole = await roleModel.findById(roleId);
      //    if (!existingRole) {
      //       // Convert MongoDB export format to model format
      //       const roleDoc = {
      //          ...roleData,
      //       };

      //       // Convert grants ObjectId references
      //       if (roleDoc.role_grants && Array.isArray(roleDoc.role_grants)) {
      //          roleDoc.role_grants = roleDoc.role_grants.map((grant) => {
      //             const newGrant = { ...grant };

      //             // Convert resource ObjectId
      //             if (newGrant.resource && newGrant.resource.$oid) {
      //                newGrant.resource = newGrant.resource.$oid;
      //             }

      //             // Remove MongoDB specific _id from grant
      //             if (newGrant._id) {
      //                delete newGrant._id;
      //             }

      //             return newGrant;
      //          });
      //       }

      //       // Remove MongoDB export specific fields
      //       delete roleDoc._id;
      //       delete roleDoc.__v;
      //       delete roleDoc.createdAt;
      //       delete roleDoc.updatedAt;

      //       // Create the role with the original ID
      //       await roleModel.create({
      //          _id: roleId,
      //          ...roleDoc,
      //       });
      //       importedRoles++;
      //    }
      // }

      // Import categories with their original IDs

      let importedCategories = 0;
      for (const categoryData of categoriesData) {
         const categoryId = categoryData._id.$oid;

         // Check if category already exists
         const existingCategory = await categoryModel.findById(categoryId);
         if (!existingCategory) {
            // Convert MongoDB export format to model format
            const categoryDoc = {
               ...categoryData,
            };

            // Convert ObjectId references for parent category
            if (
               categoryDoc.category_parentId &&
               categoryDoc.category_parentId.$oid
            ) {
               categoryDoc.category_parentId =
                  categoryDoc.category_parentId.$oid;
            }

            // Remove MongoDB export specific fields
            delete categoryDoc._id;
            delete categoryDoc.__v;
            delete categoryDoc.createdAt;
            delete categoryDoc.updatedAt;

            // Create the category with the original ID
            await categoryModel.create({
               _id: categoryId,
               ...categoryDoc,
            });
            importedCategories++;
         }
      }

      // Import products with their original IDs
      let importedProducts = 0;
      for (const productData of productsData) {
         const productId = productData._id?.$oid;

         // Skip if no valid ID is found
         if (!productId) {
            console.warn(
               'Skipping product without valid ID:',
               productData.product_name || 'unknown',
            );
            continue;
         }

         // Check if product already exists
         const existingProduct = await productModel.findById(productId);
         if (!existingProduct) {
            // Convert MongoDB export format to model format
            const productDoc = {
               ...productData,
            };

            // Convert ObjectId references for category
            if (
               productDoc.product_category &&
               productDoc.product_category.$oid
            ) {
               productDoc.product_category = productDoc.product_category.$oid;
            }

            // Remove MongoDB export specific fields
            delete productDoc._id;
            delete productDoc.__v;
            delete productDoc.createdAt;
            delete productDoc.updatedAt;

            // Create the product with the original ID
            await productModel.create({
               _id: productId,
               ...productDoc,
            });
            importedProducts++;
         }
      }

      // Import inventory with their original IDs
      let importedInventory = 0;
      for (const inventoryItem of inventoryData) {
         const inventoryId = inventoryItem._id?.$oid;

         // Skip if no valid ID is found
         if (!inventoryId) {
            console.warn('Skipping inventory without valid ID');
            continue;
         }

         // Check if inventory item already exists
         const existingInventory = await inventoryModel.findById(inventoryId);
         if (!existingInventory) {
            // Convert MongoDB export format to model format
            const inventoryDoc = {
               ...inventoryItem,
            };

            // Convert ObjectId references for product
            if (
               inventoryDoc.inventory_product &&
               inventoryDoc.inventory_product.$oid
            ) {
               inventoryDoc.inventory_product =
                  inventoryDoc.inventory_product.$oid;
            }

            // Remove MongoDB export specific fields
            delete inventoryDoc._id;
            delete inventoryDoc.__v;
            delete inventoryDoc.createdAt;
            delete inventoryDoc.updatedAt;

            // Create the inventory with the original ID
            await inventoryModel.create({
               _id: inventoryId,
               ...inventoryDoc,
            });
            importedInventory++;
         }
      }

      // Import addresses with their original IDs
      let importedAddresses = 0;
      for (const addressData of addressesData) {
         const addressId = addressData._id?.$oid;

         // Skip if no valid ID is found
         if (!addressId) {
            console.warn('Skipping address without valid ID');
            continue;
         }

         // Check if address already exists
         const existingAddress = await addressModel.findById(addressId);
         if (!existingAddress) {
            // Convert MongoDB export format to model format
            // Note: This assumes addressData has the correct structure
            const addressDoc = {
               ...addressData,
            };

            // Remove MongoDB export specific fields
            delete addressDoc._id;
            delete addressDoc.__v;
            delete addressDoc.createdAt;
            delete addressDoc.updatedAt;

            // Create the address with the original ID
            await addressModel.create({
               _id: addressId,
               ...addressDoc,
            });

            importedAddresses++;
         }
      }

      // Import profiles with their original IDs
      let importedProfiles = 0;
      for (const profileData of profilesData) {
         const profileId = profileData._id?.$oid;

         // Skip if no valid ID is found
         if (!profileId) {
            console.warn('Skipping profile without valid ID');
            continue;
         }

         // Check if profile already exists
         const existingProfile = await profileModel.findById(profileId);
         if (!existingProfile) {
            // Convert MongoDB export format to model format
            const profileDoc = {
               ...profileData,
            };

            // Convert ObjectId references
            if (profileDoc.profile_address && profileDoc.profile_address.$oid) {
               profileDoc.profile_address = profileDoc.profile_address.$oid;
            }

            // Remove MongoDB export specific fields
            delete profileDoc._id;
            delete profileDoc.__v;
            delete profileDoc.createdAt;
            delete profileDoc.updatedAt;

            // Create the profile with the original ID
            await profileModel.create({
               _id: profileId,
               ...profileDoc,
            });
            importedProfiles++;
         }
      }

      // Import users with their original IDs
      let importedUsers = 0;
      // for (const userData of usersData) {
      //    const userId = userData._id?.$oid;

      //    // If user has no ID, generate a new one
      //    if (!userId) {
      //       console.log(
      //          'Found user without ID, generating new ID for:',
      //          userData.email,
      //       );
      //       const newUser = {
      //          ...userData,
      //       };

      //       // Convert ObjectId references
      //       if (newUser.user_profile && newUser.user_profile.$oid) {
      //          newUser.user_profile = newUser.user_profile.$oid;
      //       }

      //       // Convert roles array
      //       if (newUser.roles && Array.isArray(newUser.roles)) {
      //          newUser.roles = newUser.roles.map((role) => role.$oid);
      //       }

      //       // Remove MongoDB export specific fields
      //       delete newUser._id;
      //       delete newUser.__v;
      //       delete newUser.createdAt;
      //       delete newUser.updatedAt;

      //       // Create user with auto-generated ID
      //       await userModel.create(newUser);
      //       importedUsers++;
      //       continue;
      //    }

      //    // Check if user already exists
      //    const existingUser = await userModel.findById(userId);
      //    if (!existingUser) {
      //       // Convert MongoDB export format to model format
      //       const userDoc = {
      //          ...userData,
      //       };

      //       // Convert ObjectId references
      //       if (userDoc.user_profile && userDoc.user_profile.$oid) {
      //          userDoc.user_profile = userDoc.user_profile.$oid;
      //       }

      //       // Convert roles array
      //       if (userDoc.roles && Array.isArray(userDoc.roles)) {
      //          userDoc.roles = userDoc.roles.map((role) => role.$oid);
      //       }

      //       // Remove MongoDB export specific fields
      //       delete userDoc._id;
      //       delete userDoc.__v;
      //       delete userDoc.createdAt;
      //       delete userDoc.updatedAt;

      //       // Create the user with the original ID
      //       await userModel.create({
      //          _id: userId,
      //          ...userDoc,
      //       });
      //       importedUsers++;
      //    }
      // }

      console.log(`✅ Import completed successfully!`);
      console.log(
         `Imported: ${importedResources} resources, ${importedRoles} roles, ${importedCategories} categories, ${importedProducts} products, ${importedInventory} inventory items, ${importedAddresses} addresses, ${importedProfiles} profiles, ${importedUsers} users`,
      );
      process.exit(0);
   } catch (error) {
      console.error('❌ Error importing data:', error);
      process.exit(1);
   }
}

// Run the import function if script is executed directly
if (require.main === module) {
   importExistingData();
}

module.exports = importExistingData;
