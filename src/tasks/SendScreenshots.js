import { IO } from '../services/socket.io';
import config from '../config';
import fs from 'fs';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';

dayjs.extend(customParseFormat);

const EVENTS = {
  GET: 'get'
};

class SendScreenshots {
  listeners = ({
    [EVENTS.GET]: (query) => this._sendScreenshotsFromFolder(query)
  });

  constructor() {
    this.socket = IO();
    const handler = socket => {
      for (let event in this.listeners) {
        // eslint-disable-next-line no-prototype-builtins
        if(this.listeners.hasOwnProperty(event)) {
          socket.on(event, this.listeners[event]);
        }
      }
    };
    this.socket.on('connection', handler);
    this.socket.on('reconnect', handler);
  }

  _sendScreenshotsFromFolder({ date }) {
    if(date) {
      if(this.dates[date]) {
        let screenshots = this.dates[date].slice(0, 20).map(item => ({
          name: item, data: fs.readFileSync(config.app.screenshotsFolder + item)
        }));
        this.socket.emit('data', screenshots);
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

  run() {
    try {
      const screenshots = fs.readdirSync(config.app.screenshotsFolder);
      let dates = {};
      let folders = {};
      const currentDate = dayjs();
      screenshots.forEach(item => {
        const date = dayjs(item.split('.')[0], 'YYYY-MM-DD-HH-mm-ss').format('YYYY-MM-DD');
        if(!folders[date]) {
          const diff = currentDate.diff(date, 'day');
          folders[date] = {
            thumbnail: fs.readFileSync(config.app.screenshotsFolder + item),
            name: diff > 0 ? `${diff} days ago` : 'Today',
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
      this.socket.emit('init', folders);
    } catch (e) {
      this.socket.emit('init', []);
    }
  }
}

export default SendScreenshots;
