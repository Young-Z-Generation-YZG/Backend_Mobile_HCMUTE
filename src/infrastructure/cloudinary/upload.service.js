const cloudinary = require('cloudinary').v2;
const { deleteFile } = require('../utils/os/handle-os-file');

const {
   cloudinary: {
      CLOUDINARY_CLOUD_NAME,
      CLOUDINARY_API_KEY,
      CLOUDINARY_API_SECRET,
      CLOUDINARY_FOLDER,
      CLOUDINARY_URL,
   },
} = require('../configs/env.config');

cloudinary.config({
   cloud_name: CLOUDINARY_CLOUD_NAME,
   api_key: CLOUDINARY_API_KEY,
   api_secret: CLOUDINARY_API_SECRET,
   secure: true,
});

const uploadSingle = async (file) => {
   const result = await cloudinary.uploader.upload(file.path, {
      folder: CLOUDINARY_FOLDER,
   });

   deleteFile(file.path);

   return result;
};

const uploadMultiple = async (files) => {
   const result = await Promise.all(
      files.map(async (file) => {
         const response = await cloudinary.uploader.upload(file.path, {
            folder: CLOUDINARY_FOLDER,
         });

         deleteFile(file.path);

         return response;
      }),
   );

   return result;
};

const uploadByImageUrl = async (imageUrl) => {
   console.log('imageUrl:::', imageUrl);

   const result = await cloudinary.uploader.upload(imageUrl, {
      folder: CLOUDINARY_FOLDER,
   });

   return result;
};

const uploadByImagesUrl = async (imageUrls) => {
   const result = await Promise.all(
      imageUrls.map(async (imageUrl) => {
         const response = await cloudinary.uploader.upload(imageUrl, {
            folder: CLOUDINARY_FOLDER,
         });

         return response;
      }),
   );

   return result;
};

const deleteImage = async (publicId) => {
   try {
      const response = await cloudinary.uploader.destroy(publicId);

      console.log('cloudinary delete success:::', result);

      return response;
   } catch (error) {
      console.log('cloudinary delete error:::', error);
   }
};

const getAll = async () => {
   const result = await cloudinary.api.resources({
      type: 'upload',
      prefix: 'chani_store/',
   });

   console.log('cloudinary get all success:::', result);

   return result;
};

module.exports = {
   uploadSingle,
   uploadMultiple,
   uploadByImageUrl,
   uploadByImagesUrl,
   deleteImage,
   getAll,
};
