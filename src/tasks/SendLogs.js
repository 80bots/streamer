import config from '../config';
import dayjs from 'dayjs';
import chokidar from 'chokidar';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import fs from 'fs';

dayjs.extend(customParseFormat);

const EVENTS = {
  GET_LOGS: 'get_logs',
};

const MESSAGES = {
  LOG: 'log'
};

class SendLogs {
  listeners = ({
    [EVENTS.GET_LOGS]: (query) => { this._getLog(query); this._startWatcher() }
  });

  constructor(socket) {
    this.socket = socket;
    for (let event in this.listeners) {
      // eslint-disable-next-line no-prototype-builtins
      if(this.listeners.hasOwnProperty(event)) {
        socket.on(event, this.listeners[event]);
      }
    }
  }

  _startWatcher() {
    let currentSize = 0;
    const file = fs.openSync(config.app.logsFolder + 'log.txt', 'r');

    this.watcher = chokidar.watch(config.app.logsFolder + 'log.txt', {
      persistent: true, usePolling: true, ignorePermissionErrors: true
    });
    this.watcher.on('change', (path, stats) => {
      let buff = new Buffer.from(new ArrayBuffer(stats.size - currentSize));
      fs.readSync(file, buff, 0, stats.size - currentSize, stats.size - currentSize);
      currentSize = stats.size;
      this.socket.emit(MESSAGES.LOG, buff);
    });
  }

  _getLog() {
    this.socket.emit(MESSAGES.LOG, fs.readFileSync(config.app.logsFolder + 'log.txt'));
  }
}

export default SendLogs;
