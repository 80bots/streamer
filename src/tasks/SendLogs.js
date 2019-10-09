import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import storage, { OUTPUT_TYPES } from '../services/storage';
import {loggers} from 'winston';

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
      this.type = query.init ? OUTPUT_TYPES.LOG.INIT : OUTPUT_TYPES.LOG.WORK;
      this._getLog(this.type);
      if(this.watcher) storage._closeWatcher(this.type, this.watcher);
      this.watcher = storage._initWatcher(this.type, this._onLog);
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

  closeWatcher() {
    this.watcher && storage._closeWatcher(this.type, this.watcher);
  }

  _onLog = (chunk) => {
    this.socket.emit(SendLogs.MESSAGES.LOG, chunk);
  };

  _getLog(type) {
    this.socket.emit(SendLogs.MESSAGES.LOG, storage.getLog(type));
  }
}

export default SendLogs;
