const REDIS_STATUS = {
   CONNECT: 'connect',
   ERROR: 'error',
   END: 'end',
   RECONNECT: 'reconnect',
};

const VERIFY_TYPE = {
   EMAIL: 'email',
   RESET_PASSWORD: 'resetPassword',
   CHANGE_EMAIL: 'changeEmail',
   CHANGE_PHONE_NUMBER: 'changePhoneNumber',
};

module.exports = {
   REDIS_STATUS,
   VERIFY_TYPE,
};
