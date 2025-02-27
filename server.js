const server = require("./src/app");

const {
  app: { port },
} = require("./src/infrastructure/configs/env.config");

const PORT = port || 3001;

server.listen(PORT, () => {
  console.info(`[LOG]:: Server is running in port ${PORT}`);
});
