import config from '../config';
import fs from 'fs';
import dayjs from 'dayjs';
import chockidar from 'chokidar';
import customParseFormat from 'dayjs/plugin/customParseFormat';

dayjs.extend(customParseFormat);

const EVENTS = {
  FOLDERS: 'get_folders',
  SCREENSHOTS: 'get_screenshots'
};

const MESSAGES = {
  FOLDERS: 'folders',
  SCREENSHOTS: 'screenshots',
  SCREENSHOT: 'screenshot'
};

class SendScreenshots {
  listeners = ({
    [EVENTS.SCREENSHOTS]: (query) => this._sendScreenshotsFromFolder(query),
    [EVENTS.FOLDERS]: () => this._getFolders(),
  });

  constructor(socket) {
    this.socket = socket;
    this.watcher = chockidar.watch(config.app.screenshotsFolder, { persistent: true, ignoreInitial: true });
    this.watcher.on('add', this._onScreenShotAdded);

    for (let event in this.listeners) {
      // eslint-disable-next-line no-prototype-builtins
      if(this.listeners.hasOwnProperty(event)) {
        socket.on(event, this.listeners[event]);
      }
    }
    this._getFolders();
  }

  _onScreenShotAdded = (path) => {
    const name = path.split('/')[path.split('/').length - 1];
    this.socket.emit(MESSAGES.SCREENSHOT, { name, data: fs.readFileSync(path) });
  };

  _sendScreenshotsFromFolder({ date, limit, offset }) {
    if(date) {
      if(this.dates && this.dates[date]) {
        let screenshots = this.dates[date].slice(offset).slice(0, limit).map(item => ({
          name: item, data: fs.readFileSync(config.app.screenshotsFolder + item)
        }));
        this.socket.emit(MESSAGES.SCREENSHOTS, screenshots);
      }
    }
  }

  _transformToArray(object) {
    let result = [];
    for(let key in object) {
      // eslint-disable-next-line no-prototype-builtins
      if(object.hasOwnProperty(key)) {
        result.push({ day: key, ...object[key] });
      }
    }
    return result;
  }

  _getFolders() {
    try {
      const screenshots = fs.readdirSync(config.app.screenshotsFolder).reverse();
      let dates = {};
      let folders = {};
      const currentDate = dayjs();
      screenshots.forEach(item => {
        const date = dayjs(item.split('.')[0], 'YYYY-MM-DD-HH-mm-ss').format('YYYY-MM-DD');
        if(!folders[date]) {
          const diff = currentDate.diff(date, 'day');
          folders[date] = {
            thumbnail: fs.readFileSync(config.app.screenshotsFolder + item),
            name: diff > 0 ? diff === 1 ? 'Yesterday' : `${diff} days ago` : 'Today',
            date,
            total: 1
          };
          dates[date] = [item];
        } else {
          folders[date].total++;
          dates[date].push(item);
        }
      });
      folders = this._transformToArray(folders);
      this.dates = dates;
      this.socket.emit(MESSAGES.FOLDERS, folders);
    } catch (e) {
      this.socket.emit(MESSAGES.FOLDERS, []);
    }
  }
}

export default SendScreenshots;
