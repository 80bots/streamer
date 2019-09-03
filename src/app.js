import config from './config';
import SendScreenshots from './tasks/SendScreenshots';
import { getLogger } from './services/logger';
import { init } from './services/socket.io';

const logger = getLogger('app');

const initApp = () => {
  logger.info('Initializing socket server...');
  const socket = init();
  socket.on('connection', () => {
    logger.info('Client connected, running tasks...');
    setTimeout(() => (new SendScreenshots()).run());
  }, 1000);
  socket.listen(config.app.port);
  logger.info(`Socket server is listening on port ${config.app.port}`);
};

initApp();
