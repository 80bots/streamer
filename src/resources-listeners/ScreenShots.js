import { watch } from "chokidar";
import appConfig from "../config";
import fs from "fs";
import Path from "path";
import dayjs from "dayjs";

class Listener {
  constructor() {
    this.storageRoot = appConfig.local.root;
    this.root = appConfig.app.screenshotsFolder;
    const interval = setInterval(() => {
      if (fs.existsSync(this.root)) {
        this.watcher = watch(this.root, {
          persistent: true,
          ignoreInitial: true
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
    let folder = dayjs(fileName.split(".")[0]).format("YYYY-MM-DD");
    if (folder === "Invalid Date") {
      folder = dayjs().format("YYYY-MM-DD");
    }
    const link = `${this.storageRoot}/screenshots/${folder}/${fileName}`;
    if (!fs.existsSync(Path.dirname(link))) {
      fs.mkdirSync(Path.dirname(link), { recursive: true });
    }
    if (!fs.existsSync(link)) {
      fs.symlinkSync(path, link);
    }
  }
}

export default Listener;
