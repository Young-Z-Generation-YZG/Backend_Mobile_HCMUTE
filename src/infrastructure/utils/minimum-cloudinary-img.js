const _ = require('lodash');

const minimumCloudinaryImg = (imgs) => {
   if (imgs.length === 0) return [];

   const result = imgs.map((img) => {
      const pickFields = ['public_id', 'secure_url'];

      img = _.pick(img, pickFields);

      return {
         public_id: img.public_id,
         secure_url: img.secure_url,
      };
   });

   return result;
};

module.exports = { minimumCloudinaryImg };
