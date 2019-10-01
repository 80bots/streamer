import config from '../config';
import fs from 'fs';
import dayjs from 'dayjs';
import chokidar from 'chokidar';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import storage, { OUTPUT_TYPES } from '../services/storage';
import { AVAILABLE_COLORS, getLogger } from '../services/logger';

dayjs.extend(customParseFormat);

const logger = getLogger('screenshots', AVAILABLE_COLORS.CYAN);

class SendScreenshots {
  static EVENTS = {
    FOLDERS: 'get_folders',
    SCREENSHOTS: 'get_screenshots'
  };

  static MESSAGES = {
    FOLDERS: 'folders',
    SCREENSHOTS: 'screenshots',
    SCREENSHOT: 'screenshot'
  };

  listeners = ({
    [SendScreenshots.EVENTS.SCREENSHOTS]: (query) => this._sendScreenshotsFromFolder(query),
    [SendScreenshots.EVENTS.FOLDERS]: () => storage.getFolders('screenshots'),
  });

  constructor(socket) {
    this.socket = socket;
    for (let event in this.listeners) {
      if(this.listeners.hasOwnProperty(event)) {
        socket.on(event, this.listeners[event]);
      }
    }
    this.watcher = chokidar.watch(config.app.screenshotsFolder, { persistent: true, ignoreInitial: true });
    this.watcher.on('add', this._onScreenShotAdded);
    this._getFolders();
    logger.info('Watcher initialized');
  }

  _onScreenShotAdded = (path) => {
    setTimeout(() => {
      const name = path.split('/')[path.split('/').length - 1];
      this.socket.emit(SendScreenshots.MESSAGES.SCREENSHOT, { name, data: fs.readFileSync(path) });
    }, 500);
  };

  _sendScreenshotsFromFolder(query) {
    const data = storage.getOutputData({ ...query, type: OUTPUT_TYPES.SCREENSHOTS });
    this.socket.emit(SendScreenshots.MESSAGES.SCREENSHOTS, data);
  }

  _getFolders() {
    this.socket.emit(SendScreenshots.MESSAGES.FOLDERS, storage.getFolders(OUTPUT_TYPES.SCREENSHOTS));
  }
}

export default SendScreenshots;
