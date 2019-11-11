import 'dotenv/config';
import * as Sentry from '@sentry/node';
import config, { setInstanceEnvs } from './config';
import runDataScrapper from './tasks/DataScrapper';
import Storage from './storage';
import { getLogger } from './services/logger';
const logger = getLogger('app');

if(process.env?.NODE_ENV === 'production') {
  Sentry.init({ dsn: config.app.sentryDSN });
}

process.on('unhandledRejection', error => {
  logger.error(error);
  logger.debug('%o', error);
});

const initApp = async () => {
  await setInstanceEnvs();
  await runDataScrapper();
  new Storage();
};

initApp().catch(logger.error);
