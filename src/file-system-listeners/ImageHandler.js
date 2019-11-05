import {STORAGE_TYPE_FS, STORAGE_TYPE_S3} from '../config/resources';
import fs from 'fs';
import Path from 'path';
import Listener from './Listener';
import dayjs from 'dayjs';
import { putObject } from '../services/s3';
import { lookup as getMime } from 'mime-types';

class JsonHandler extends Listener {
  constructor(config){
    super(config[STORAGE_TYPE_FS]);
    this._s3Root = config[STORAGE_TYPE_S3];
  }

  get s3root () {
    return `${dayjs().format('YYYY-MM-DD')}/${this._s3Root}`;
  }

  onFileAdded (path) {
    // Debounce time to make sure that the file has been fully written;
    setTimeout(() => {
      const fileName = Path.basename(path);
      const mime = getMime(fileName);
      const buffer = fs.readFileSync(path);
      const key = `${this.s3root}/${fileName}`;
      putObject(buffer, `${this.s3root}/${fileName}`, mime)
        .then((res) => {
          return this.tellServerAboutChanges(key);
        });
    }, 50);
  }
}

export default JsonHandler;