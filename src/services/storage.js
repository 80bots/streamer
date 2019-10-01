import fs from 'fs';
import path from 'path';
import chokidar from 'chokidar';
import config from '../config';
import dayjs from 'dayjs';
import { AVAILABLE_COLORS, getLogger } from './logger';

const logger = getLogger('storage', AVAILABLE_COLORS.YELLOW);

export const OUTPUT_TYPES = {
  JSON: 'json',
  IMAGES: 'images',
  SCREENSHOTS: 'screenshots'
};

class Storage {
  constructor() {
    logger.info('Initializing storage...');
    Object.values(OUTPUT_TYPES).forEach(type => {
      this[type] = {};
    });
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

        case OUTPUT_TYPES.SCREENSHOTS: return this._getImageFolders(type);
        case OUTPUT_TYPES.IMAGES: return this._getImageFolders(type, true);
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
    let arr = [];
    if(this[type]?.[folder]) {
      switch (type) {
        case OUTPUT_TYPES.JSON: {
          arr = JSON.parse(fs.readFileSync(this._resolvePath(type) + '/' + this[type][folder].file));
          break;
        }
        case OUTPUT_TYPES.SCREENSHOTS:
        case OUTPUT_TYPES.IMAGES: {
          arr = this[type][folder].files.slice(offset).slice(0, limit).map(item => this._toImageFile(type, item));
          break;
        }
      }
    }
    return arr;
  }

  _toImageFile = (type, fileName) => ({
    name: fileName,
    data: fs.readFileSync(this._resolvePath(type) + '/' + fileName)
  });

  _resolvePath(type) {
    return type === OUTPUT_TYPES.SCREENSHOTS
      ? path.resolve(config.app.screenshotsFolder)
      : path.resolve(config.app.outputFolder, type);
  }

  _getJsonFolders() {
    const files = this.getFiles(OUTPUT_TYPES.JSON);
    return files.map(file => {
      const date = dayjs(file.split('.')[0]).format('YYYY-MM-DD HH:mm:ss');
      this[OUTPUT_TYPES.JSON][date] = { file };
      return date;
    });
  }

  _getImageFolders(type, combineAll = false) {
    const files = this.getFiles(type).reverse();
    const currentDate = dayjs();
    if(combineAll && files.length > 0) {
      const date = currentDate.format('YYYY-MM-DD');
      this[type][date] = {
        thumbnail: fs.readFileSync(this._resolvePath(type) + '/' + files[0]),
        name: date,
        total: files.length,
        files
      };
    } else {
      files.forEach(file => {
        const date = dayjs(file.split('.')[0], config.app.dateFormat).format('YYYY-MM-DD');
        if(!this[type][date]) {
          const diff = currentDate.diff(date, 'day');
          this[type][date] = {
            thumbnail: fs.readFileSync(this._resolvePath(type) + '/' + file),
            name: diff > 0 ? diff === 1 ? 'Yesterday' : `${diff} days ago` : 'Today',
            date,
            total: 1,
            files: [file]
          };
        } else {
          this[type][date].total++;
          this[type][date].files.push(file);
        }
      });
    }
    return Object.values(this[type]);
  }

  _synchronizeWithS3() {

  }
}

export default new Storage();
