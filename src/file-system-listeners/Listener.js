import { watch } from 'chokidar';
import Path from "path";

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
}

export default Listener;