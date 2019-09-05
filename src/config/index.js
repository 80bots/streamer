import dotenv from 'dotenv';
import os from 'os';

const env = dotenv.config().parsed || process.env;

const config = {
  app: {
    port: process.env.PORT || env.SOCKET_PORT || 6001,
    screenshotsFolder: env.SCREENSHOTS_FOLDER || os.homedir() + '/.screenshots/'
  },
};

export default config;
