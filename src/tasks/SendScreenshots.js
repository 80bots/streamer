import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import storage, { OUTPUT_TYPES } from '../services/storage';

dayjs.extend(customParseFormat);

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
    [SendScreenshots.EVENTS.FOLDERS]: () => {
      storage._initWatcher(OUTPUT_TYPES.SCREENSHOTS, this._onScreenShotAdded);
      this._getFolders();
    },
  });

  constructor(socket) {
    this.socket = socket;
    for (let event in this.listeners) {
      if(this.listeners.hasOwnProperty(event)) {
        socket.on(event, this.listeners[event]);
      }
    }
  }

  _onScreenShotAdded = (image) => {
    this.socket.emit(SendScreenshots.MESSAGES.SCREENSHOT, image);
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
