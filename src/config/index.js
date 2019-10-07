import dotenv from 'dotenv';
import os from 'os';

const env = dotenv.config().parsed || process.env;

const config = {
  app: {
    port:              process.env.PORT || env.SOCKET_PORT || 6001,
    screenshotsFolder: env.SCREENSHOTS_FOLDER || os.homedir() + '/.screenshots/',
    logPath:           env.LOG_PATH || os.homedir() + '/puppeteer/logs/log.log',
    initLogPath:       env.INIT_LOG_PATH || '/var/log/cloud-init-output.log',
    outputFolder:      env.OUTPUT_FOLDER || os.homedir() + '/puppeteer/output/',
    dateFormat:        env.TIMESTAMP_FORMAT || 'YYYY-MM-DD-HH-mm-ss',
    sentryDSN:         env.SENTRY_DSN || 'https://f921491331824fc8818d4b72b0bba14f@sentry.io/1769350'
  },
  s3: {
    apiVersion: 'latest',
    key: '',
    secret: '',
    region: '',
    bucket: ''
  }
};

export default config;
