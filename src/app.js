import config from './config';
import SendScreenshots from './tasks/SendScreenshots';
import { getLogger } from './services/logger';
import { init } from './services/socket.io';

const logger = getLogger('app');

const initApp = () => {
  logger.info('Initializing socket server...');
  const socket = init();
  socket.on('connect', (socket) => {
    logger.info(`${socket.id} connected`);
    socket.on('disconnect', () => logger.info(`${socket.id} disconnected`));
    new SendScreenshots(socket);
  });
  socket.listen(config.app.port);
  logger.info(`Socket server is listening on port ${config.app.port}`);
};

initApp();
