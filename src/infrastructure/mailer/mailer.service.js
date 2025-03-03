const nodeMailer = require('nodemailer');
const path = require('path');
const hbs = require('nodemailer-express-handlebars');

const {
   mailer: { MAILER_SENDER, MAILER_SENDER_NAME, MAILER_PASSWORD },
} = require('../configs/env.config');

const OtpService = require('../utils/otp.service');

const transporter = nodeMailer.createTransport({
   service: 'Gmail',
   auth: {
      user: MAILER_SENDER,
      pass: MAILER_PASSWORD,
   },
});

// point to the template'folder
const handlebarOptions = {
   viewEngine: {
      partialsDir: path.resolve(__dirname, 'templates'),
      defaultLayout: false,
   },
   viewPath: path.resolve(__dirname, 'templates'),
};

// use a template file with nodemailer
transporter.use('compile', hbs(handlebarOptions));

const sendEmailVerify = async ({
   to = '',
   receiverEmail = '',
   mailOtp = '',
}) => {
   var options = {
      from: MAILER_SENDER,
      to,
      subject: '[VERIFY] Clothing store notification',
      text: `Hii ${receiverEmail} !`,
      template: 'receiver',
      context: {
         name: receiverEmail,
         website: 'null',
         mailOtp: mailOtp,
      },
   };

   try {
      transporter.sendMail(options, function (error, info) {
         if (error) {
            console.log(error);
         } else {
            console.log('Email sent: ' + info.response);
         }
      });
   } catch (error) {
      throw new Error(error);
   }
};

const sendEmailResetPassword = async ({
   to = '',
   name = '',
   resetUrl = '',
}) => {
   const resetOtp = OtpService.generateOtp(6);

   var options = {
      from: MAILER_SENDER,
      to,
      subject: '[RESET_PASSWORD] Clothing store notification',
      text: `Hii ${name} !`,
      template: 'recover',
      context: {
         name: name,
         resetOtp: resetOtp,
      },
   };

   try {
      transporter.sendMail(options, function (error, info) {
         if (error) {
            console.log(error);
         } else {
            console.log('Email sent: ' + info.response);
         }
      });
   } catch (error) {
      throw new Error(error);
   }

   return resetOtp;
};

const sendEmailResetPasswordWithOtp = async ({
   to = '',
   receiverEmail = '',
   mailOtp = '',
}) => {
   var options = {
      from: MAILER_SENDER,
      to,
      subject: '[RESET_PASSWORD] Clothing store notification',
      text: `Hii ${receiverEmail} !`,
      template: 'forget-password',
      context: {
         name: receiverEmail,
         mailOtp: mailOtp,
      },
   };

   try {
      transporter.sendMail(options, function (error, info) {
         if (error) {
            console.log(error);
         } else {
            console.log('Email sent: ' + info.response);
         }
      });
   } catch (error) {
      throw new Error(error);
   }
};

const sendEmailChangePhoneNumber = async ({
   to = '',
   receiverEmail = '',
   mailOtp = '',
}) => {
   var options = {
      from: MAILER_SENDER,
      to,
      subject: '[CHANGE_PHONE_NUMBER] Clothing store notification',
      text: `Hii ${receiverEmail} !`,
      template: 'change-phone-number',
      context: {
         name: receiverEmail,
         mailOtp: mailOtp,
      },
   };

   try {
      transporter.sendMail(options, function (error, info) {
         if (error) {
            console.log(error);
         } else {
            console.log('Email sent: ' + info.response);
         }
      });
   } catch (error) {
      throw new Error(error);
   }
};

module.exports = {
   sendEmailVerify,
   sendEmailResetPassword,
   sendEmailResetPasswordWithOtp,
   sendEmailChangePhoneNumber,
};
