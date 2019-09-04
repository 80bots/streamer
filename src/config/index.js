import dotenv from 'dotenv';

const env = dotenv.config().parsed || process.env;

const config = {
  app: {
    port: process.env.PORT || env.SOCKET_PORT || 6001,
    screenshotsFolder: env.SCREENSHOTS_FOLDER || '.screenshots'
  },
};

export default config;
