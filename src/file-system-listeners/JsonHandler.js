import {STORAGE_TYPE_FS, STORAGE_TYPE_S3} from '../config/resources';
import fs from 'fs';
import Listener from './Listener';
import dayjs from 'dayjs';
import { putObject } from '../services/s3';
import {lookup as getMime} from 'mime-types';
import Path from 'path';

class JsonHandler extends Listener {
  constructor(config){
    super(config[STORAGE_TYPE_FS]);
    this._s3Root = config[STORAGE_TYPE_S3];
  }

  setCheckPoint (value) {
    this._checkPoint = +value;
  }

  getCheckPoint () {
    return this._checkPoint || 0;
  }

  get s3root () {
    return `${dayjs().format('YYYY-MM-DD')}/${this._s3Root}`;
  }

  onFileChanged(path) {
    const currentCheckPoint = this.getCheckPoint();
    const nextCheckPoint = 1 + currentCheckPoint;
    this.setCheckPoint(nextCheckPoint);
    let key;
    let buffer = fs.readFileSync(path);
    let mime;
    const baseFileName = Path.basename(path);
    try {
      const items = JSON.parse(buffer);
      if(!Array.isArray(items)) {
        throw new Error('Invalid data array');
      }
      const recentEntity = items[nextCheckPoint];
      if(recentEntity) {
        buffer = Buffer.from(JSON.stringify(recentEntity));
        const fileName = `${nextCheckPoint}:${baseFileName}`;
        key = `${this.s3root}/${fileName}`;
        mime = getMime(fileName);
      }
    } catch (e) {
      key = `${this.s3root}/${baseFileName}`
      mime = getMime(baseFileName);
    }
    putObject(buffer, key, mime)
      .then((res) => {
        return this.tellServerAboutChanges(key);
      });
  }
}

export default JsonHandler;