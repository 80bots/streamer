import { watch } from 'chokidar';
import API from '../services/api';
import Informant from '../services/informant';
import config from '../config';

class Listener {
  constructor (path, config) {
    this.watcher = watch(path, {persistent: true, ignoreInitial: true, ...config});
    this.applyListeners();
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

  }

  onFileAdded () {

  }

  onFileChanged () {

  }

  onFileRemoved () {

  }

  onDirAdded () {

  }

  onDirRemoved () {

  }

  async tellServerAboutChanges (key) {
    const {
      status
    } = await API.post(`/instances/${config.instance.id}/objects`, { key });
  }

  async tellClientAboutChanges (data) {
    Informant.send(data);
  }
}

export default Listener;