const generateOtp = (digits) => {
   if (digits <= 0) return '';
   const min = Math.pow(10, digits - 1);
   const max = Math.pow(10, digits) - 1;
   return Math.floor(Math.random() * (max - min + 1) + min).toString();
};

module.exports = {
   generateOtp,
};
