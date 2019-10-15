import fs from 'fs';
import path from 'path';
import config from '../config';
import dayjs from 'dayjs';
import archiver from 'archiver';
import { performance } from 'perf_hooks';
import { putObject } from './s3';
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
  GENERAL: 'output'
};

const S3_PATH = {
  [OUTPUT_TYPES.LOG]: 'logs',
  [OUTPUT_TYPES.JSON]: 'json',
  [OUTPUT_TYPES.IMAGES]: 'images',
  [OUTPUT_TYPES.SCREENSHOTS]: 'screenshots',
  [OUTPUT_TYPES.LOG]: 'logs'
};

const IMAGES_ZIP_PATH = 'images.zip';

class Storage {
  constructor() {
    logger.info('Initializing storage...');
    this.syncedFiles = {};
    for (let key in OUTPUT_TYPES) {
      this[OUTPUT_TYPES[key]] = {};
      this.syncedFiles[OUTPUT_TYPES[key]] = [];
    }
    // update thumbs every minute
    setInterval(() => {
      this._updateFolderThumbs(OUTPUT_TYPES.IMAGES);
      this._updateFolderThumbs(OUTPUT_TYPES.SCREENSHOTS);
    }, 100000);
    // sync with s3 every 5 minutes
    setInterval(() => {
      this._syncWithS3();
    }, 300000);
    // update folder names every 1 hour
    setInterval(() => {
      this._updateFolderNames(OUTPUT_TYPES.SCREENSHOTS);
    }, 3600000);
  }

  /**
   *
   * @param {('json'|'images'|'screenshots')} type Output folder name to read from
   *
   */
  getFolders(type) {
    if (!Object.values(OUTPUT_TYPES).includes(type)) return new Error('No such type');
    try {
      switch (type) {
        case OUTPUT_TYPES.JSON:
          return this._getJsonFolders();

        case OUTPUT_TYPES.SCREENSHOTS:
        case OUTPUT_TYPES.IMAGES:
          return this._getImageFolders(type);
      }
    } catch (e) {
      logger.error(e);
      logger.debug('%o', e);
      return [];
    }
  }

  getOutputFolders() {
    let folders = [];
    if (fs.existsSync(config.app.outputFolder)) {
      folders = fs.readdirSync(config.app.outputFolder, {withFileTypes: true})
        .filter(dir => dir.isDirectory())
        .map(dir => dir.name);
    }
    return folders;
  }

  /**
   *
   * @param {('json'|'images')} folder Output folder name to read from
   *
   */
  _getFiles(folder) {
    if(fs.existsSync(this._resolvePath(folder))) {
      return fs.readdirSync(this._resolvePath(folder), { withFileTypes: true })
        .filter(item => !item.isDirectory())
        .map(item => item.name);
    } else {
      return [];
    }
  }

  getOutputData({folder, type, limit, offset}) {
    if (this[type]?.[folder]) {
      switch (type) {
        case OUTPUT_TYPES.JSON: {
          let buff = [];
          this._size(type, 0);
          try {
            buff = fs.readFileSync(this._resolvePath(type) + '/' + this[type][folder].file);
            this._size(type, buff.length);
            buff = JSON.parse(buff);
          } catch (e) {
            buff = buff.length ? buff : [];
          }
          return buff;
        }

        case OUTPUT_TYPES.SCREENSHOTS:
        case OUTPUT_TYPES.IMAGES: {
          // first slice to avoid array mutation

          return this[type][folder].files
            .slice()
            .reverse()
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

  getLog(type) {
    let buff = new Buffer.from(new ArrayBuffer(0));
    if (fs.existsSync(this._resolvePath(type))) {
      const logPath = this._resolvePath(type);
      buff = fs.readFileSync(logPath);
      this._size(type, buff.length);
    }
    return buff;
  }

  async getFullOutput(type) {
    switch (type) {
      case OUTPUT_TYPES.JSON:
        if (!Object.keys(this[type]).length) this._getJsonFolders();
        return Object.values(this[type]).reduce((all, current) => {
          return all.concat(JSON.parse(fs.readFileSync(this._resolvePath(type) + '/' + current.file)));
        }, []);
      case OUTPUT_TYPES.IMAGES:
        return this._compressImages();
    }
  }

  _updateFolderThumbs(type) {
    if (this[type]) {
      for (let folder in this[type]) {
        if (this[type].hasOwnProperty(folder)) {
          if (this[type][folder]?.files) {
            const file = this[type][folder].files.slice().reverse()[0];
            this[type][folder].thumbnail = fs.readFileSync(this._resolvePath(type) + '/' + file);
          }
        }
      }
    }
  }

  _initWatcher(type, sender, folder) {
    const typePath = this._resolvePath(type);
    let watcher;
    switch (type) {
      case OUTPUT_TYPES.SCREENSHOTS:
      case OUTPUT_TYPES.IMAGES: {
        watcher = watch(typePath, {persistent: true, ignoreInitial: true});
        watcher.on('add', filePath => this._onFileAdded(filePath, type, sender));
        break;
      }

      case OUTPUT_TYPES.LOG.WORK:
      case OUTPUT_TYPES.LOG.INIT: {
        watcher = watch(typePath, {persistent: true, usePolling: true, ignorePermissionErrors: true});
        watcher.on('change', (filePath, stats) => this._onFileChanged(filePath, stats, type, sender));
        break;
      }

      case OUTPUT_TYPES.JSON: {
        const filePath = typePath + '/' + this[type][folder]?.file;
        if(fs.existsSync(filePath)) {
          watcher = watch(filePath, {persistent: true, usePolling: true, ignorePermissionErrors: true});
          watcher.on('change', (watchPath, stats) => this._onFileChanged(watchPath, stats, type, sender));
        }
        break;
      }

      case OUTPUT_TYPES.GENERAL: {
        watcher = watch(config.app.outputFolder, { ignoreInitial: true });
        watcher.on('addDir', (watchPath) => this._onFolderCreated(watchPath, sender));
        break;
      }
    }
    watcher && logger.info(`Watching ${type}`);
    return watcher;
  }

  _closeWatcher(type, watcher) {
    watcher.unwatch(this._resolvePath(type));
    watcher.close();
    logger.info(`Unwatch ${type}`);
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
    const size = this._size(type);
    let length = stats.size - size - (type === OUTPUT_TYPES.JSON ? 1 : 0); //get rid of ']' at the JSON end
    if(length > 0) {
      let buff = new Buffer.from(new ArrayBuffer(length));
      fs.readSync(file, buff, 0, length, size);
      if(buff.toString() === '[' && type === OUTPUT_TYPES.JSON) {
        this._size(type, size + 1); // skip '[' char and behave normally on next chunk
      } else {
        this._size(type, stats.size);
        sender(buff, type);
      }
    }
  };

  _onFolderCreated = (fullPath, sender) => {
    try {
      const folderName = fullPath.split('/')[fullPath.split('/').length - 1];
      const type = Object.keys(OUTPUT_TYPES).find(key => OUTPUT_TYPES[key] === folderName);
      sender(OUTPUT_TYPES[type]);
      logger.info('New output available. Sending...');
    } catch (e) {
      logger.info('Added folder which is not expected output type');
    }
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

      case OUTPUT_TYPES.GENERAL:
        return config.app.outputFolder;
    }
  }

  _getJsonFolders() {
    const files = this._getFiles(OUTPUT_TYPES.JSON);
    return files.map(file => {
      const date = dayjs(file.split('.')[0]).format('YYYY-MM-DD HH:mm:ss');
      this[OUTPUT_TYPES.JSON][date] = {file};
      return date;
    });
  }

  _appendFolderFiles = (file, type) => {
    const folder = type === OUTPUT_TYPES.IMAGES ? dayjs().format('YYYY-MM-DD') : this._getDate(file);
    if (this[type][folder]) {
      if (!this[type][folder].files.includes(file)) {
        this[type][folder].files.push(file);
        this[type][folder].total++;
      }
    } else {
      this._initFolder(file, type);
    }
  };

  _getDate = fileName => dayjs(fileName.split('.')[0], config.app.dateFormat).format('YYYY-MM-DD');

  _size = (type, setTo) => {
    switch (type) {
      case OUTPUT_TYPES.LOG.WORK:
      case OUTPUT_TYPES.LOG.INIT:
        return typeof setTo === 'number' ? this.logSize = setTo : this.logSize;

      case OUTPUT_TYPES.JSON:
        return typeof setTo === 'number' ? this.jsonSize = setTo : this.jsonSize;

      default:
        return typeof setTo === 'number' ? this.currentSize = setTo : this.currentSize || 0;
    }
  };

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
    const files = this._getFiles(type);
    for (let idx in files) {
      if (files.hasOwnProperty(idx)) {
        this._appendFolderFiles(files[idx], type);
      }
    }
    return Object.values(this[type]).reverse();
  }

  _compressImages = async () => new Promise((resolve) => {
    logger.info('Compressing images...');
    if (!Object.keys(this[OUTPUT_TYPES.IMAGES]).length) this._getImageFolders(OUTPUT_TYPES.IMAGES);
    const key = Object.keys(this[OUTPUT_TYPES.IMAGES])[0];
    try {
      const output = fs.createWriteStream(IMAGES_ZIP_PATH);
      const archive = archiver('zip', {zlib: {level: 9}});
      archive.on('warning', logger.error);
      archive.on('error', logger.error);
      output.on('close', () => {
        logger.info(`Compressed to ${archive.pointer()} Bytes`);
        resolve(fs.readFileSync(IMAGES_ZIP_PATH));
        fs.unlinkSync(IMAGES_ZIP_PATH);
      });
      this[OUTPUT_TYPES.IMAGES][key].files.forEach(item => {
        archive.append(fs.readFileSync(this._resolvePath(OUTPUT_TYPES.IMAGES) + '/' + item), {name: item});
      });
      archive.pipe(output);
      archive.finalize();
    } catch (e) {
      logger.error(e);
    }
  });

  // hasOwnPropertyCheck is generally unneeded, but most IDEs wants it to be
  _syncWithS3() {
    try {
      logger.info('Started sync with S3...');
      const start = performance.now();
      for (let key in OUTPUT_TYPES) {
        const type = OUTPUT_TYPES[key];
        switch (type) {
          case OUTPUT_TYPES.SCREENSHOTS:
          case OUTPUT_TYPES.IMAGES: {
            if(!Object.keys(this[type]).length) this._getImageFolders(type);
            for(let folder in this[type]) {
              if(this[type].hasOwnProperty(folder)) {
                const files = this[type][folder]?.files;
                for (let idx in files) {
                  if(files.hasOwnProperty(idx) && !this.syncedFiles[type].includes(files[idx])) {
                    const key = S3_PATH[type] + '/' + folder + '/' + files[idx];
                    const buffer = fs.readFileSync(this._resolvePath(type) + '/' + files[idx]);
                    this.syncedFiles[type].push(files[idx]);
                    putObject(buffer, key);
                  }
                }
              }
            }
            break;
          }
          case OUTPUT_TYPES.JSON: {
            if(!Object.keys(this[type]).length) this._getJsonFolders();
            for(let folder in this[type]) {
              if(this[type].hasOwnProperty(folder) && this[type][folder]) {
                const file = this[type][folder].file;
                const key = S3_PATH[type] + '/' + dayjs(folder).format('YYYY-MM-DD') + '/' + file;
                const buffer = fs.readFileSync(this._resolvePath(type) + '/' + file);
                this.syncedFiles[type].push(file);
                putObject(buffer, key);
              }
            }
            break;
          }
          case OUTPUT_TYPES.LOG: {
            for(let subType in OUTPUT_TYPES.LOG) {
              if(OUTPUT_TYPES.LOG.hasOwnProperty(subType)) {
                const path = this._resolvePath(OUTPUT_TYPES.LOG[subType]);
                if(fs.existsSync(path)) {
                  const key = S3_PATH[type] + '/' + `${subType}.log`;
                  putObject(fs.readFileSync(path), key);
                }
              }
            }
            break;
          }
        }
      }
      const end = performance.now();
      logger.info(`Sync ended in ${(end - start).toFixed(2)} ms`);
    } catch (e) {
      logger.error(e);
    }
  }

  _updateFolderNames(type) {
    const currentDate = dayjs();
    if (this[type]) {
      for (let folder in this[type]) {
        if (this[type].hasOwnProperty(folder)) {
          if (this[type][folder]?.name) {
            const diff = currentDate.diff(folder, 'day');
            this[type][folder].name = diff > 0 ? diff === 1 ? 'Yesterday' : `${diff} days ago` : 'Today';
          }
        }
      }
    }
  }
}

export default new Storage();
