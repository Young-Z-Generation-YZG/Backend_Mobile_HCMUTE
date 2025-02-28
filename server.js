const server = require('./src/app');

const {
   loadEnv,
   app: { NODE_ENV, RUNNING_PORT, SSL_ENABLE },
} = require('./src/infrastructure/configs/env.config');

// Load environment variables

console.info('[LOG:SSL_ENABLE]::', SSL_ENABLE);

server.listen(RUNNING_PORT, () => {
   console.info(
      `[LOG:PORT]:: Server is running in ${NODE_ENV} port ${RUNNING_PORT}`,
   );
});
