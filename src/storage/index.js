import { watch } from 'chokidar';
import API from '../services/api';
import Informant from '../services/informant';
import appConfig from '../config';
import fs from 'fs';
import Path from 'path';
import {lookup as getMime} from 'mime-types';
import {putObject} from '../services/s3';

class Index {
  constructor (path, config) {
    Informant.connect();
    this.root = appConfig.local.root;
    this.watcher = watch(this.root, {persistent: true, ignoreInitial: true});
    this.applyListeners();
    this.schedulers = {};
  }

  applyListeners () {
    this.watcher
      .on('add', (...params) => this.onFileAdded(...params))
      .on('change', (...params) => this.onFileChanged(...params))
      .on('unlink', (...params) => this.onFileRemoved(...params))
      .on('addDir', (...params) => this.onDirAdded(...params))
      .on('unlinkDir', (...params) => this.onDirRemoved(...params))
      .on('ready', (...params) => this.onReady(...params))
      .on('error', error => console.log(`Watcher error: ${error}`));
  }

  onReady () {
    console.log('Storage successfully initialized');
  }

  onFileAdded (path) {
    this.storeToS3(path);
    const buffer = fs.readFileSync(path);
    const mime = getMime(path);
    const url = `data:${mime};base64,${buffer.toString('base64')}`;
    this.tellServerAboutChanges(path);
    this.tellClientsAboutChanges(`/${Path.dirname(this.getRelativePath(path))}`, {
      path: this.getRelativePath(path),
      name: Path.basename(path),
      url,
      type: 'file',
      mime: getMime(path)
    });
  }

  resolveFullPath (path) {
    const dir = Path.dirname(path);
    if(!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if(!fs.existsSync(path)) {
      fs.closeSync(fs.openSync(path, 'w'));
    }
    return path;
  }

  onFileChanged (path) {
    this.scheduleStoring(path);
  }

  onFileRemoved (path) {
    console.log('onFileRemoved', path);
  }

  onDirAdded (path) {
    // Ignore creation root;
    if(path === this.root) return;
    this.storeToS3(path);
    let parent = Path.dirname(this.getRelativePath(path));
    if(parent === '.') {
      parent = '';
    }
    this.tellServerAboutChanges(path);
    this.tellClientsAboutChanges(`/${parent}`, {
      path: this.getRelativePath(path),
      name: Path.basename(path),
      type: 'folder'
    });
  }

  onDirRemoved (path) {
    console.log('onDirRemoved', path);
  }

  getRelativePath (path) {
    return path.replace(this.root, '');
  }

  storeToS3 (path) {
    if(this.schedulers[path]) {
      this.schedulers[path] = clearTimeout(this.schedulers[path]);
    }
    const stats = fs.statSync(path);
    if(stats.isDirectory()) {
      const key = this.getRelativePath(path);
      putObject(Buffer.alloc(0), key);
    } else {
      const buffer = fs.readFileSync(path);
      const fileName = Path.basename(path);
      const mime = getMime(fileName);
      const key = this.getRelativePath(path);
      putObject(buffer, key, mime);
    }
  }

  scheduleStoring (path) {
    // Remove old planning
    this.schedulers[path] = clearTimeout(this.schedulers[path]);
    const { size } = fs.statSync(path);
    const sizeMb = size / 1000000.0;
    // Calculate debounce
    // For files < 1Mb debounce is 0.5 s
    // For files > 1Mb debounce is N * 5s (N - total megabytes)
    const debounce = sizeMb < 1 ? 500 : sizeMb * 5000;
    this.schedulers[path] = setTimeout(() => this.storeToS3(path), debounce);
  }

  async tellServerAboutChanges (path) {
    const key = this.getRelativePath(path);
    return API.post(`/instances/${appConfig.instance.id}/objects`, { key })
      .then(res => {
        if(res.status === 201) {
          console.log(`Informing about "${key}" has been successfully performed`);
        }
      })
      .catch(error => {
        console.log(`Informing about "${key}" is postponed for 10 seconds due to ${error.response?.status} status error`);
        setTimeout(() => this.tellServerAboutChanges(key), 10000);
        throw error;
      });

  }

  async tellClientsAboutChanges (path, data) {
    Informant.emit(path, data);
  }
}

export default Index;