import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import storage, {OUTPUT_TYPES} from '../services/storage';
import { AVAILABLE_COLORS, getLogger } from '../services/logger';

dayjs.extend(customParseFormat);

const logger = getLogger('output', AVAILABLE_COLORS.BLUE);

class SendOutput {
  static EVENTS = {
    GET_FULL_OUTPUT: 'output.full',
    GET_AVAILABLE:   'output.available',
    GET_FOLDERS:     'output.folders',
    GET_OUTPUT:      'output.data'
  };

  static MESSAGES = {
    AVAILABLE:        'output.available',
    APPEND_AVAILABLE: 'output.available.append',
    APPEND_FOLDERS:   'output.folders.append',
    FOLDERS:          'output.folders',
    OUTPUT:           'output.data',
    APPEND:           'output.append',
    FULL:             'output.full',
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

  closeWatchers() {
    this.typeWatcher && storage._closeWatcher(OUTPUT_TYPES.GENERAL, this.typeWatcher);
    this.watcher && storage._closeWatcher(this.type, this.watcher);
  }

  _getAvailableOutputs() {
    this.typeWatcher && storage._closeWatcher(OUTPUT_TYPES.GENERAL, this.typeWatcher);
    this.typeWatcher = storage._initWatcher(OUTPUT_TYPES.GENERAL, this._onType, this._onFolder);
    this.socket.emit(SendOutput.MESSAGES.AVAILABLE, storage.getOutputFolders());
  }

  _getOutput({ folder, type, ...rest }) {
    this.watcher && storage._closeWatcher(type, this.watcher);
    this.type = type;
    this.watcher = storage._initWatcher(type, this._onOutput, folder);
    this.socket.emit(SendOutput.MESSAGES.OUTPUT, storage.getOutputData({ folder, type, ...rest }));
  }

  _getFullOutput({ type }) {
    storage.getFullOutput(type).then(data => this.socket.emit(SendOutput.MESSAGES.FULL, data));
  }

  _getFolders({ type }) {
    this.folderWatcher && storage._closeWatcher(OUTPUT_TYPES.JSON, this.folderWatcher);
    this.folderWatcher = storage._initWatcher(OUTPUT_TYPES.JSON);
    this.socket.emit(SendOutput.MESSAGES.FOLDERS, storage.getFolders(type));
  }

  _onOutput = (chunk, type) => {
    if(type === OUTPUT_TYPES.JSON) {
      try {
        const parsedChunk = [JSON.parse(chunk)];
        this.socket.emit(SendOutput.MESSAGES.APPEND, parsedChunk);
      } catch (e) {
        logger.error(`Broken chunk: ${chunk.toString()}; length: ${chunk.length}`);
      }
    } else {
      this.socket.emit(SendOutput.MESSAGES.APPEND, chunk);
    }
  };

  _onType = (type) => {
    this.socket.emit(SendOutput.MESSAGES.APPEND_AVAILABLE, type);
  };

  _onFolder = (folder) => {
    this.socket.emit(SendOutput.MESSAGES.APPEND_FOLDERS, folder);
  };
}

export default SendOutput;
