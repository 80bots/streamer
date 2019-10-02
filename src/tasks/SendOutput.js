import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import fs from 'fs';
import archiver from 'archiver';
import storage, { OUTPUT_TYPES } from '../services/storage';
import { AVAILABLE_COLORS, getLogger } from '../services/logger';

dayjs.extend(customParseFormat);

const IMAGES_ZIP_PATH = 'images.zip';

const logger = getLogger('output', AVAILABLE_COLORS.YELLOW);

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
    if(this[type]) {
      switch (type) {
        case OUTPUT_TYPES.JSON:
          return this.socket.emit(SendOutput.MESSAGES.FULL, Object.values(this[type]));
        case OUTPUT_TYPES.IMAGES:
          return this._compressImages();
      }
    }
  }

  _getFolders({ type }) {
    this.socket.emit(SendOutput.MESSAGES.FOLDERS, storage.getFolders(type));
  }

  _compressImages = () => {
    logger.info('Compressing images...');
    try {
      const output = fs.createWriteStream(IMAGES_ZIP_PATH);
      const archive = archiver('zip', { zlib: { level: 9 } });
      archive.on('warning', logger.error);
      archive.on('error', logger.error);
      output.on('close', () => {
        logger.info(`Compressed to ${archive.pointer()} Bytes`);
        this.socket.emit(SendOutput.MESSAGES.FULL, fs.readFileSync(IMAGES_ZIP_PATH));
        fs.unlinkSync(IMAGES_ZIP_PATH);
      });
      this[OUTPUT_TYPES.IMAGES].all.forEach(item => {
        archive.append(item.data, { name: item.name });
      });
      archive.pipe(output);
      archive.finalize();
    } catch (e) {
      logger.error(e);
    }
  };
}

export default SendOutput;
