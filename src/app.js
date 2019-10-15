import config, { setInstanceEnvs } from './config';
import SendScreenshots from './tasks/SendScreenshots';
import SendLogs from './tasks/SendLogs';
import SendOutput from './tasks/SendOutput';
import valid from './middlewares/auth';
import * as Sentry from '@sentry/node';
import { getLogger } from './services/logger';
import { init } from './services/socket.io';

const logger = getLogger('app');

if(process.env?.NODE_ENV === 'production') {
  Sentry.init({ dsn: config.app.sentryDSN });
}

process.on('unhandledRejection', error => {
  logger.error(error);
  logger.debug('%o', error);
});

const initApp = async () => {
  logger.info('Initializing socket server...');
  const socket = init();
  await setInstanceEnvs();
  // dynamically initialize storage
  import('./services/storage');

  socket.on('connect', async (socket) => {
    const isValid = await valid(socket);
    if(isValid) {
      logger.info(`${socket.id} connected`);
      const screenshotTask = new SendScreenshots(socket);
      const logsTask = new SendLogs(socket);
      const outputTask = new SendOutput(socket);
      socket.on('disconnect', () => {
        logger.info(`${socket.id} disconnected, watchers closed`);
        screenshotTask.closeWatcher();
        logsTask.closeWatcher();
        outputTask.closeWatchers();
      });
    }
  });
  socket.listen(config.app.port);
  logger.info(`Socket server is listening on port ${config.app.port}`);
};

initApp().catch(logger.error);
