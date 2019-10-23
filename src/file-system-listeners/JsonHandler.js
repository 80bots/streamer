import {STORAGE_TYPE_FS, STORAGE_TYPE_S3} from '../config/resources';
import fs from 'fs';
import Listener from './Listener';
import dayjs from 'dayjs';
import { putObject } from '../services/s3';
import {lookup as getMime} from 'mime-types';

class JsonHandler extends Listener {
  constructor(config){
    super(config[STORAGE_TYPE_FS]);
    this._s3Root = config[STORAGE_TYPE_S3];
  }

  get mime () {
    return 'application/json';
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
    console.log('JSON');
    const currentCheckPoint = this.getCheckPoint();
    const nextCheckPoint = 1 + currentCheckPoint;
    this.setCheckPoint(nextCheckPoint);
    try {
      const rawJson = fs.readFileSync(path);
      const items = JSON.parse(rawJson);
      const recentEntity = items[nextCheckPoint];
      if(recentEntity) {
        const buffer = Buffer.from(JSON.stringify(recentEntity));
        const fileName = `${nextCheckPoint}.json`;
        const mime = getMime(fileName);
        putObject(buffer, `${this.s3root}/${fileName}`, mime)
          .then((res) => {
            // NOTIFY MAIN SERVER
          });
      }
    } catch (e) {
      console.log(e);
    }
  }
}

export default JsonHandler;