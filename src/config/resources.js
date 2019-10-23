import os from 'os';
import dotenv from 'dotenv';
const env = dotenv.config().parsed || process.env;

export const STORAGE_TYPE_S3 = 'S3';
export const STORAGE_TYPE_FS = 'FS';
export const STORAGE_PROCESSING_PARAMS = 'PARAMS';

export const JSON = {
  [STORAGE_TYPE_S3]: 'json',
  [STORAGE_TYPE_FS]: (env.OUTPUT_FOLDER || os.homedir() + '/puppeteer/output') + '/json',
  [STORAGE_PROCESSING_PARAMS]: env.PARAMS_FOLDER || os.homedir() + '/.streamer-params'
};

export const IMAGES = {
  [STORAGE_TYPE_S3]: 'images',
  [STORAGE_TYPE_FS]: (env.OUTPUT_FOLDER || os.homedir() + '/puppeteer/output') + '/images',
  [STORAGE_PROCESSING_PARAMS]: env.PARAMS_FOLDER || os.homedir() + '/.streamer-params'
};

export const SCREENSHOTS = {
  [STORAGE_TYPE_S3]: 'screenshots',
  [STORAGE_TYPE_FS]: env.SCREENSHOTS_FOLDER || os.homedir() + '/.screenshots/',
  [STORAGE_PROCESSING_PARAMS]: env.PARAMS_FOLDER || os.homedir() + '/.streamer-params'
};

export const SERVER_LOGS = {
  [STORAGE_TYPE_S3]: 'logs',
  [STORAGE_TYPE_FS]: env.INIT_LOG_PATH || '/var/log/cloud-init-output.log',
  [STORAGE_PROCESSING_PARAMS]: env.PARAMS_FOLDER || os.homedir() + '/.streamer-params'
};

export const MAIN = {
  [STORAGE_TYPE_S3]: 'storage',
  [STORAGE_TYPE_FS]: 'storage',
  [STORAGE_PROCESSING_PARAMS]: env.PARAMS_FOLDER || os.homedir() + '/.streamer-params'
};

export const LOGS = {
  [STORAGE_TYPE_S3]: 'logs',
  [STORAGE_TYPE_FS]: env.LOG_PATH || os.homedir() + '/puppeteer/logs',
  [STORAGE_PROCESSING_PARAMS]: env.PARAMS_FOLDER || os.homedir() + '/.streamer-params'
};

export default {
  MAIN,
  JSON,
  IMAGES,
  SCREENSHOTS,
  SERVER_LOGS,
  LOGS,
};