import {STORAGE_TYPE_FS, STORAGE_TYPE_S3} from '../config/resources';
import fs from 'fs';
import Listener from './Listener';
import dayjs from 'dayjs';
import readline from 'readline';
import { putObject } from '../services/s3';
import {lookup as getMime} from 'mime-types';
import Path from "path";

class JsonHandler extends Listener {
  constructor(params){
    super(params[STORAGE_TYPE_FS]);
    this._s3Root = params[STORAGE_TYPE_S3];
    this.counter = 0;
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

  storeToS3 (path) {
    clearTimeout(this.timer);
    const buffer = fs.readFileSync(path);
    const fileName = Path.basename(path);
    const mime = getMime(fileName);
    const key = `${this.s3root}/${fileName}`
    putObject(buffer, key, mime)
      .then((res) => {
        return this.tellServerAboutChanges(key);
      });
  }

  onFileAdded(path) {
    this.storeToS3(path);
  }

  onFileChanged(path) {
    // reset current uploading schedule
    clearTimeout(this.timer);
    // plan uploading if no changes will occurs
    this.timer = setTimeout(() => this.storeToS3(path), 500);
    // get existing check point
    const start = this.getCheckPoint();
    // read stream line by line
    const readInterface = readline.createInterface({
      input: fs.createReadStream(path, { start }),
      console: false
    });
    readInterface.on('line', (line) => {
      // define the next line which we looking for
      this.setCheckPoint(this.getCheckPoint() + line.length + 1);
      // count updates in order to avoid a frequent requests to S3
      this.counter++;
      // Sync the file each 100 lines if writing performs very actively
      if(this.counter%100 === 0) {
        this.storeToS3(path);
      }
    });
  }

  onFileRemoved() {
    this.setCheckPoint(0);
  }
}

export default JsonHandler;