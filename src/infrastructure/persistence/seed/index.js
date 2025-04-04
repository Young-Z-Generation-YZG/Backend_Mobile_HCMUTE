const mongoose = require('mongoose');
const MongoDatabase = require('../mongo.db');
const seedUsers = require('./users.seed');
const seedCategories = require('./categories.seed');
const seedProducts = require('./products.seed');
const seedInvoices = require('./invoices.seed');
const seedReviews = require('./reviews.seed');

async function seedDatabase() {
   try {
      // Connect to the database
      await MongoDatabase.connect();
      console.log('Connected to database');

      // Clear existing data
      console.info('Clearing existing data...');

      const collections = mongoose.connection.collections;

      for (const key in collections) {
         // await collections[key].deleteMany({});
      }

      // console.info('Seeding users...');
      // const users = await seedUsers();

      // console.log('Seeding categories...');
      // const categories = await seedCategories();

      // console.log('Seeding products...');
      // const productsData = await seedProducts(categories);

      // console.log('Seeding invoices...');
      // const invoicesData = await seedInvoices(users, productsData);

      // console.log('Seeding reviews...');
      // await seedReviews(users, productsData, invoicesData);

      console.log('✅ Seeding completed successfully!');
      process.exit(0);
   } catch (error) {
      console.error('❌ Error seeding database:', error);
      process.exit(1);
   }
}

// Run the seed function if script is executed directly
if (require.main === module) {
   seedDatabase();
}

module.exports = seedDatabase;
