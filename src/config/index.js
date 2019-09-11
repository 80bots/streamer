import dotenv from 'dotenv';
import os from 'os';

const env = dotenv.config().parsed || process.env;

const config = {
  app: {
    port:              process.env.PORT || env.SOCKET_PORT || 6001,
    screenshotsFolder: env.SCREENSHOTS_FOLDER || os.homedir() + '/.screenshots/',
    logsFolder:        env.LOGS_FOLDER || os.homedir() + '/.logs/',
    outputFolder:      env.OUTPUT_FOLDER || os.homedir() + '/puppeteer/db/',
  },
};

export default config;
