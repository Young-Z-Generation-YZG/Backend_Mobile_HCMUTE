const server = require('./src/app');

const {
   loadEnv,
   app: { httpPort, httpsPort, sslEnable, nodeEnv },
} = require('./src/infrastructure/configs/env.config');

// Load environment variables

console.info('[LOG:SSL_ENABLE]::', sslEnable);

const PORT = sslEnable ? httpsPort : httpPort ?? 3000;

server.listen(PORT, () => {
   console.info(`[LOG:PORT]:: Server is running in ${nodeEnv} port ${PORT}`);
});
