import fs from 'fs';
import path from 'path';
import config from '../config';
import dayjs from 'dayjs';
import archiver from 'archiver';
import { watch } from 'chokidar';
import { AVAILABLE_COLORS, getLogger } from './logger';

const logger = getLogger('storage', AVAILABLE_COLORS.YELLOW);

export const OUTPUT_TYPES = {
  LOG: {
    INIT: 'init log',
    WORK: 'work log'
  },
  JSON: 'json',
  IMAGES: 'images',
  SCREENSHOTS: 'screenshots',
};

const IMAGES_ZIP_PATH = 'images.zip';

class Storage {
  constructor() {
    logger.info('Initializing storage...');
    Object.values(OUTPUT_TYPES).forEach(type => {
      this[type] = {};
    });
    setTimeout(() => {
      this._updateFolderThumbs(OUTPUT_TYPES.IMAGES);
      this._updateFolderThumbs(OUTPUT_TYPES.SCREENSHOTS);
    }, 10000);
  }

  getOutputFolders() {
    let folders = [];
    if(fs.existsSync(config.app.outputFolder)) {
      folders = fs.readdirSync(config.app.outputFolder, { withFileTypes: true })
        .filter(dir => dir.isDirectory())
        .map(dir => dir.name);
    }
    return folders;
  }

  /**
   *
   * @param {('json'|'images'|'screenshots')} type Output folder name to read from
   *
   */
  getFolders(type) {
    if(!Object.values(OUTPUT_TYPES).includes(type)) return new Error('No such type');
    try {
      switch (type) {
        case OUTPUT_TYPES.JSON: return this._getJsonFolders();

        case OUTPUT_TYPES.SCREENSHOTS:
        case OUTPUT_TYPES.IMAGES: return this._getImageFolders(type);
      }
    } catch (e) {
      logger.error(e);
      return [];
    }
  }

  /**
   *
   * @param {('json'|'images')} folder Output folder name to read from
   *
   */
  getFiles(folder) {
    return fs.readdirSync(this._resolvePath(folder), { withFileTypes: true })
      .filter(item => !item.isDirectory())
      .map(item => item.name);
  }

  getOutputData({ folder, type, limit, offset }) {
    if(this[type]?.[folder]) {
      switch (type) {
        case OUTPUT_TYPES.JSON:
          return JSON.parse(fs.readFileSync(this._resolvePath(type) + '/' + this[type][folder].file));

        case OUTPUT_TYPES.SCREENSHOTS:
        case OUTPUT_TYPES.IMAGES: {
          return this[type][folder].files
            .slice(offset)
            .slice(0, limit)
            .map(item => this._toImageFile(type, item));
        }

      }
    } else {
      //TODO: proper exception here
      return [];
    }
  }

  async getFullOutput(type) {
    switch (type) {
      case OUTPUT_TYPES.JSON:
        if(!Object.keys(this[type]).length) this._getJsonFolders();
        return Object.values(this[type]).reduce((all, current) => {
          return all.concat(JSON.parse(fs.readFileSync(this._resolvePath(type) + '/' + current.file)));
        }, []);
      case OUTPUT_TYPES.IMAGES:
        return this._compressImages();
    }
  }

  _updateFolderThumbs(type) {
    if(this[type]) {
      Object.keys(this[type]).forEach(folder => {
        if(this[type][folder]?.files) {
          const file = this[type][folder].files[0];
          this[type][folder].thumbnail = fs.readFileSync(this._resolvePath(type) + '/' + file);
        }
      });
    }
  }

  _initWatcher(type, sender) {
    const typePath = this._resolvePath(type);
    let watcher;
    switch (type) {
      case OUTPUT_TYPES.SCREENSHOTS:
      case OUTPUT_TYPES.IMAGES: {
        watcher = watch(typePath, { persistent: true, ignoreInitial: true });
        watcher.on('add', filePath => this._onFileAdded(filePath, type, sender));
        break;
      }

      case OUTPUT_TYPES.JSON:
      case OUTPUT_TYPES.LOG.WORK:
      case OUTPUT_TYPES.LOG.INIT: {
        watcher = watch(typePath, { persistent: true, usePolling: true, ignorePermissionErrors: true });
        watcher.on('change', (filePath, stats) => this._onFileChanged(filePath, stats, type, sender));
        break;
      }
    }
    watcher && logger.info(`Watching ${type}`);
    return watcher;
  }

  _onFileAdded = (filePath, type, sender) => {
    // wait a little to let file be written
    setTimeout(() => {
      const fileName = filePath.split('/')[filePath.split('/').length - 1];
      this._appendFolderFiles(fileName, type);
      switch (type) {
        case OUTPUT_TYPES.SCREENSHOTS:
        case OUTPUT_TYPES.IMAGES:
          return sender(this._toImageFile(type, fileName));
      }
    }, 500);
  };

  _onFileChanged = (filePath, stats, type, sender) => {
    const file = fs.openSync(filePath, 'r');
    let length = stats.size - this.currentSize;
    let buff = new Buffer.from(new ArrayBuffer(length));
    fs.readSync(file, buff, 0, length, this.currentSize);
    this.currentSize = stats.size;
    sender(buff);
  };

  _toImageFile = (type, fileName) => ({
    name: fileName,
    data: fs.readFileSync(this._resolvePath(type) + '/' + fileName)
  });

  _resolvePath(type) {
    switch (type) {
      case OUTPUT_TYPES.SCREENSHOTS:
        return path.resolve(config.app.screenshotsFolder);

      case OUTPUT_TYPES.JSON:
      case OUTPUT_TYPES.IMAGES:
        return path.resolve(config.app.outputFolder, type);

      case OUTPUT_TYPES.LOG.WORK:
        return path.resolve(config.app.logPath);

      case OUTPUT_TYPES.LOG.INIT:
        return path.resolve(config.app.initLogPath);
    }
  }

  _getJsonFolders() {
    const files = this.getFiles(OUTPUT_TYPES.JSON);
    return files.map(file => {
      const date = dayjs(file.split('.')[0]).format('YYYY-MM-DD HH:mm:ss');
      this[OUTPUT_TYPES.JSON][date] = { file };
      return date;
    });
  }

  _appendFolderFiles = (file, type) => {
    const folder = type === OUTPUT_TYPES.IMAGES ? dayjs().format('YYYY-MM-DD') : this._getDate(file);
    if(this[type][folder]) {
      if(this[type][folder].files.indexOf(file) === -1) {
        this[type][folder].files.push(file);
        this[type][folder].total++;
      }
    } else {
      this._initFolder(file, type);
    }
  };

  _getDate = fileName => dayjs(fileName.split('.')[0], config.app.dateFormat).format('YYYY-MM-DD');

  _initFolder = (file, type) => {
    const currentDate = dayjs();
    switch (type) {
      case OUTPUT_TYPES.SCREENSHOTS: {
        const date = this._getDate(file);
        const diff = currentDate.diff(date, 'day');
        this[type][date] = {
          thumbnail: fs.readFileSync(this._resolvePath(type) + '/' + file),
          name: diff > 0 ? diff === 1 ? 'Yesterday' : `${diff} days ago` : 'Today',
          date,
          total: 1,
          files: [file]
        };
        break;
      }

      case OUTPUT_TYPES.IMAGES: {
        const date = currentDate.format('YYYY-MM-DD');
        this[type][date] = {
          thumbnail: fs.readFileSync(this._resolvePath(type) + '/' + file),
          name: date,
          date,
          total: 1,
          files: [file]
        };
        break;
      }
    }
  };

  _getImageFolders(type) {
    const files = this.getFiles(type);
    files.forEach(file => {
      this._appendFolderFiles(file, type);
    });
    return Object.values(this[type]).reverse();
  }

  _compressImages = async () => new Promise((resolve) => {
    logger.info('Compressing images...');
    if(!Object.keys(this[OUTPUT_TYPES.IMAGES]).length) this._getImageFolders(OUTPUT_TYPES.IMAGES);
    const key = Object.keys(this[OUTPUT_TYPES.IMAGES])[0];
    try {
      const output = fs.createWriteStream(IMAGES_ZIP_PATH);
      const archive = archiver('zip', { zlib: { level: 9 } });
      archive.on('warning', logger.error);
      archive.on('error', logger.error);
      output.on('close', () => {
        logger.info(`Compressed to ${archive.pointer()} Bytes`);
        resolve(fs.readFileSync(IMAGES_ZIP_PATH));
        fs.unlinkSync(IMAGES_ZIP_PATH);
      });
      this[OUTPUT_TYPES.IMAGES][key].files.forEach(item => {
        archive.append(fs.readFileSync(this._resolvePath(OUTPUT_TYPES.IMAGES) + '/' + item), { name: item });
      });
      archive.pipe(output);
      archive.finalize();
    } catch (e) {
      logger.error(e);
    }
  });

  getLog(type) {
    let buff = new Buffer(0);
    if(fs.existsSync(this._resolvePath(type))) {
      const logPath = this._resolvePath(type);
      buff = fs.readFileSync(logPath);
      this.currentSize = buff.length;
    }
    return buff;
  }
}

export default new Storage();
