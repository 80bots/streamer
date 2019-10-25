import 'dotenv/config';
import * as Sentry from '@sentry/node';
import config, { setInstanceEnvs } from './config';
import runDataListeners from './tasks/DataListeners';
import { getLogger } from './services/logger';
import runSocketServer from './socket-server';
const logger = getLogger('app');
import Informant from './services/Informant';

if(process.env?.NODE_ENV === 'production') {
  Sentry.init({ dsn: config.app.sentryDSN });
}

process.on('unhandledRejection', error => {
  logger.error(error);
  logger.debug('%o', error);
});

const initApp = async () => {
  // Initialize config using
  await setInstanceEnvs();
  runDataListeners();
  // runSocketServer();
  // dynamically initialize storage
  import('./services/storage');
};

initApp().catch(logger.error);
