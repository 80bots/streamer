import { watch } from "chokidar";
import appConfig from "../config";
import fs from "fs";
import Path from "path";

class Listener {
  constructor() {
    this.storageRoot = appConfig.local.root;
    this.root = appConfig.app.initLogPath;
    const interval = setInterval(() => {
      if (fs.existsSync(this.root)) {
        this.watcher = watch(this.root, {
          persistent: true,
          ignoreInitial: false
        });
        this.applyListeners();
        clearInterval(interval);
      } else {
        // console.log(`${this.root} doesn't exist`);
      }
    }, 1000);
  }

  applyListeners() {
    this.watcher
      .on("add", (...params) => this.onFileAdded(...params))
      .on("change", (...params) => this.onFileAdded(...params));
  }

  onFileAdded(path) {
    const fileName = Path.basename(path);
    const link = `${this.storageRoot}logs/${fileName}`;
    if (!fs.existsSync(Path.dirname(link))) {
      fs.mkdirSync(Path.dirname(link), { recursive: true });
    }
    if (!fs.existsSync(link)) {
      fs.symlinkSync(path, link);
    }
  }
}

export default Listener;
