const generateEncodedUrl = (url = '', params = {}) => {
   // Create URLSearchParams instance
   const urlParams = new URLSearchParams();

   // Add each param to URLSearchParams
   Object.entries(params).forEach(([key, value]) => {
      // Handle arrays and objects by converting to string
      if (Array.isArray(value) || typeof value === 'object') {
         urlParams.append(key, JSON.stringify(value));
      } else {
         urlParams.append(key, value);
      }
   });

   // Combine base URL with encoded params
   const encodedParams = urlParams.toString();
   return encodedParams ? `${url}?${encodedParams}` : url;
};
module.exports = {
   generateEncodedUrl,
};
