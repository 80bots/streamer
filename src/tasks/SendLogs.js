import config from '../config';
import dayjs from 'dayjs';
import chokidar from 'chokidar';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import fs from 'fs';

dayjs.extend(customParseFormat);

class SendLogs {
  static EVENTS = {
    GET_LOGS: 'get_logs'
  };

  static MESSAGES = {
    LOG: 'log'
  };

  listeners = ({
    [SendLogs.EVENTS.GET_LOGS]: (query = { init: false }) => {
      const path = query.init ? config.app.initLogPath : config.app.logPath;
      this._getLog(path);
      this._startWatcher(path);
    }
  });

  constructor(socket) {
    this.socket = socket;
    for (let event in this.listeners) {
      if(this.listeners.hasOwnProperty(event)) {
        socket.on(event, this.listeners[event]);
      }
    }
  }

  _startWatcher(path) {
    if(this.watcher) this.watcher.close();

    this.watcher = chokidar.watch(path, {
      persistent: true, usePolling: true, ignorePermissionErrors: true
    });

    this.watcher.on('change', (path, stats) => {
      const file = fs.openSync(path, 'r');
      let length = stats.size - this.currentSize;
      let buff = new Buffer.from(new ArrayBuffer(length));
      fs.readSync(file, buff, 0, length, this.currentSize);
      this.currentSize = stats.size;
      this.socket.emit(SendLogs.MESSAGES.LOG, buff);
    });
  }

  _getLog(path) {
    const buff = fs.readFileSync(path);
    this.currentSize = buff.length;
    this.socket.emit(SendLogs.MESSAGES.LOG, buff);
  }
}

export default SendLogs;
