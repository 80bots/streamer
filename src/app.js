import config from './config';
import SendScreenshots from './tasks/SendScreenshots';
import SendLogs from './tasks/SendLogs';
import SendOutput from './tasks/SendOutput';
import valid from './middlewares/auth';
import { getLogger } from './services/logger';
import { init } from './services/socket.io';

const logger = getLogger('app');

process.on('unhandledRejection', error => {
  logger.error(error);
  logger.debug('%o', error);
});

const initApp = () => {
  logger.info('Initializing socket server...');
  const socket = init();
  socket.on('connect', (socket) => {
    if(valid(socket)) {
      logger.info(`${socket.id} connected`);
      new SendScreenshots(socket);
      new SendLogs(socket);
      new SendOutput(socket);
      socket.on('disconnect', () => logger.info(`${socket.id} disconnected`));
    }
  });
  socket.listen(config.app.port);
  logger.info(`Socket server is listening on port ${config.app.port}`);
};

initApp();
