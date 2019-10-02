import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import storage from '../services/storage';

dayjs.extend(customParseFormat);

class SendOutput {
  static EVENTS = {
    GET_FULL_OUTPUT: 'output.full',
    GET_AVAILABLE: 'output.available',
    GET_FOLDERS: 'output.folders',
    GET_OUTPUT: 'output.data'
  };

  static MESSAGES = {
    AVAILABLE: 'output.available',
    FOLDERS: 'output.folders',
    OUTPUT: 'output.data',
    FULL: 'output.full'
  };

  listeners = ({
    [SendOutput.EVENTS.GET_AVAILABLE]: () => this._getAvailableOutputs(),
    [SendOutput.EVENTS.GET_OUTPUT]: (query = {}) => this._getOutput(query),
    [SendOutput.EVENTS.GET_FOLDERS]: (query = {}) => this._getFolders(query),
    [SendOutput.EVENTS.GET_FULL_OUTPUT]: (query = {}) => this._getFullOutput(query)
  });

  constructor(socket) {
    this.socket = socket;
    for (let event in this.listeners) {
      if(this.listeners.hasOwnProperty(event)) {
        socket.on(event, this.listeners[event]);
      }
    }
  }

  _getAvailableOutputs() {
    this.socket.emit(SendOutput.MESSAGES.AVAILABLE, storage.getOutputFolders());
  }

  _getOutput(query) {
    this.socket.emit(SendOutput.MESSAGES.OUTPUT, storage.getOutputData(query));
  }

  _getFullOutput({ type }) {
    storage.getFullOutput(type).then(data => this.socket.emit(SendOutput.MESSAGES.FULL, data));
  }

  _getFolders({ type }) {
    this.socket.emit(SendOutput.MESSAGES.FOLDERS, storage.getFolders(type));
  }
}

export default SendOutput;
