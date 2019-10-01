import config from '../config';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import fs from 'fs';
import archiver from 'archiver';
import { AVAILABLE_COLORS, getLogger } from '../services/logger';

dayjs.extend(customParseFormat);

const EVENTS = {
  GET_FULL_OUTPUT: 'output.full',
  GET_AVAILABLE: 'output.available',
  GET_FOLDERS: 'output.folders',
  GET_OUTPUT: 'output.data'
};

const MESSAGES = {
  AVAILABLE: 'output.available',
  FOLDERS: 'output.folders',
  OUTPUT: 'output.data',
  FULL: 'output.full'
};

const OUTPUT_TYPES = {
  JSON: 'json',
  IMAGES: 'images'
};

const IMAGES_ZIP_PATH = 'images.zip';

const logger = getLogger('output', AVAILABLE_COLORS.YELLOW);

class SendOutput {
  listeners = ({
    [EVENTS.GET_AVAILABLE]: () => this._getAvailableOutputs(),
    [EVENTS.GET_OUTPUT]: (query = {}) => this._getOutput(query),
    [EVENTS.GET_FOLDERS]: (query = {}) => this._getFolders(query),
    [EVENTS.GET_FULL_OUTPUT]: (query = {}) => this._getFullOutput(query)
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
    let available = [];
    if(fs.existsSync(config.app.outputFolder)) {
      available = fs.readdirSync(config.app.outputFolder, { withFileTypes: true })
        .filter(dir => dir.isDirectory())
        .map(dir => dir.name);
    }
    this.socket.emit(MESSAGES.AVAILABLE, available);
  }

  _getOutput({ folder, type, limit, offset }) {
    let arr = [];
    if(this[type]?.[folder]) {
      switch (type) {
        case OUTPUT_TYPES.JSON: { arr = this[type][folder]; break; }
        case OUTPUT_TYPES.IMAGES: { arr = this[type][folder].slice(offset).slice(0, limit); break; }
      }
    }
    this.socket.emit(MESSAGES.OUTPUT, arr);
  }

  _getFullOutput({ type }) {
    if(this[type]) {
      switch (type) {
        case OUTPUT_TYPES.JSON:
          return this.socket.emit(MESSAGES.FULL, Object.values(this[type]));
        case OUTPUT_TYPES.IMAGES:
          return this._compressImages();
      }
    }
  }

  _getFolders({ type }) {
    let folders = [];
    try {
      if(!Object.values(OUTPUT_TYPES).includes(type)) return new Error('No such type');
      const files = fs.readdirSync(config.app.outputFolder + type, { withFileTypes: true })
        .filter(item => !item.isDirectory())
        .map(item => item.name);
      switch (type) {
        case OUTPUT_TYPES.JSON: { folders = this._processJsonType(files); break; }
        case OUTPUT_TYPES.IMAGES: { folders = this._processImageType(files); break; }
      }
      if(!folders) folders = [];
    } catch (e) {
      logger.error(e);
    } finally {
      this.socket.emit(MESSAGES.FOLDERS, folders);
    }
  }

  _processJsonType = (files) => {
    if(!this[OUTPUT_TYPES.JSON]) this[OUTPUT_TYPES.JSON] = {};
    return files.map(file => {
      const date = dayjs(file.split('.')[0]).format('YYYY-MM-DD HH:mm:ss');
      this[OUTPUT_TYPES.JSON][date] =
        JSON.parse(fs.readFileSync(config.app.outputFolder + OUTPUT_TYPES.JSON + '/' + file).toString());
      return date;
    });
  };

  _processImageType = (files) => {
    if(!this[OUTPUT_TYPES.IMAGES]) this[OUTPUT_TYPES.IMAGES] = { all: [] };
    files.forEach(file => {
      this[OUTPUT_TYPES.IMAGES].all.push({
        name: file,
        data: fs.readFileSync(config.app.outputFolder + OUTPUT_TYPES.IMAGES + '/' + file)
      });
    });
    return [{ name: 'all', total: files.length }];
  };

  _compressImages = () => {
    logger.info('Compressing images...');
    try {
      const output = fs.createWriteStream( IMAGES_ZIP_PATH);
      const archive = archiver('zip', { zlib: { level: 9 } });
      archive.on('warning', logger.error);
      archive.on('error', logger.error);
      output.on('close', () => {
        logger.info(`Compressed to ${archive.pointer()} Bytes`);
        this.socket.emit(MESSAGES.FULL, fs.readFileSync(IMAGES_ZIP_PATH));
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
