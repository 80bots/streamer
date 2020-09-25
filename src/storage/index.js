import { watch } from "chokidar";
import API from "../services/api";
import Informant from "../services/informant";
import appConfig from "../config";
import fs from "fs";
import Path from "path";
import { lookup as getMime } from "mime-types";
import { putObject, getSignedUrl } from "../services/s3";
import util from "util"

const readdir = util.promisify(fs.readdir);

class Index {
  constructor() {
    Informant.connect();
    this.root = appConfig.local.root;
    this.watcher = watch(this.root, { persistent: true, ignoreInitial: true });
    this.applyListeners();
    this.schedulers = {};
    this.screenshotsFolder = appConfig.app.screenshotsFolder;
  }

  applyListeners() {
    this.watcher
      .on("add", (...params) => this.onFileAdded(...params))
      .on("change", (...params) => this.onFileChanged(...params))
      .on("unlink", (...params) => this.onFileRemoved(...params))
      .on("addDir", (...params) => this.onDirAdded(...params))
      .on("unlinkDir", (...params) => this.onDirRemoved(...params))
      .on("ready", (...params) => this.onReady(...params))
      .on("error", error => console.log(`Watcher error: ${error}`));
  }

  onReady() {
    console.log("Storage successfully initialized");
  }

  async onFileAdded(path) {
    if (path === this.root) return;
    let parent = Path.dirname(this.getRelativePath(path));
    if (parent === ".") {
      parent = "";
    }
    const data = await this.getObjectFromPath(path);
    this.storeToS3(path).then(() =>
      this.tellClientsAboutChanges(`/${parent}`, data)
    );
  }

  async onFileChanged(path) {
    this.scheduleStoring(path);
  }

  onFileRemoved(path) {
    console.log("onFileRemoved", path);
  }

  async onDirAdded(path) {
    if (path === this.root) return;
    let parent = Path.dirname(this.getRelativePath(path));
    if (parent === ".") {
      parent = "";
    }
    const data = await this.getObjectFromPath(path);
    this.storeToS3(path).then(() =>
      this.tellClientsAboutChanges(`/${parent}`, data)
    );
  }

  onDirRemoved(path) {
    console.log("onDirRemoved", path);
  }

  getRelativePath(path) {
    return path.replace(this.root, "");
  }

  storeToS3(path) {
    if (this.schedulers[path]) {
      this.schedulers[path] = clearTimeout(this.schedulers[path]);
      delete this.schedulers[path];
    }
    const stats = fs.statSync(path);
    if (stats.isDirectory()) {
      const key = this.getRelativePath(path);
      return putObject(Buffer.alloc(0), key + "/").then( async () => {
        try {
          let files = await readdir(this.screenshotsFolder);
          let t = null;
          resemble(this.screenshotsFolder + files[files.length-1])
              .compareTo(this.screenshotsFolder + files[files.length-2])
              .ignoreColors()
              .onComplete(function(data) {
                const imageDifference = data.misMatchPercentage;
                console.log('key' + key);
                console.log('imageDifference' + imageDifference);
                this.tellServerAboutChanges(key, imageDifference);
              });
          console.log('t' + t);
          return t;
        } catch (err) {console.log(err);}
        return true;
      });
    }
    const buffer = fs.readFileSync(path);
    const fileName = Path.basename(path);
    const mime = getMime(fileName);
    const key = this.getRelativePath(path);
    return putObject(buffer, key, mime).then( async () => {
      try {
        let files = await readdir('./images');
        let t = null;
        resemble(this.screenshotsFolder + files[files.length-1])
            .compareTo(this.screenshotsFolder + files[files.length-2])
            .ignoreColors()
            .onComplete(function(data) {
              const imageDifference = data.misMatchPercentage;
              console.log('key' + key);
              console.log('imageDifference' + imageDifference);
              this.tellServerAboutChanges(key, imageDifference);
            });
        console.log('t' + t);
        return t;
      } catch (err) {console.log(err);}
      return true;
    });
  }

  async scheduleStoring(path) {
    // Remove old planning
    const data = await this.getObjectFromPath(path);
    if (this.schedulers[path]) {
      // console.log("returning");
      return;
    }
    // console.log("planning");
    const { size } = fs.statSync(path);
    const sizeMb = size / 1000000.0;
    // Calculate debounce
    // For files < 1Mb debounce is 0.5 s
    // For files > 1Mb debounce is N * 5s (N - total megabytes)
    const debounce = sizeMb < 1 ? 1000 : sizeMb;
    this.schedulers[path] = setTimeout(() => {
      this.storeToS3(path).then(() =>
        this.tellClientsAboutChanges(`/${this.getRelativePath(path)}`, data)
      );
    }, debounce);
  }

  async tellServerAboutChanges(path) {
    const key = this.getRelativePath(path);
    return API.post(`/instances/${appConfig.instance.id}/objects`, { key })
      .then(res => {
        if (res.status === 201) {
          // console.log(`Informing about "${key}" has been successfully performed`);
        }
        return true;
      })
      .catch(error => {
        // console.log(`Informing about "${key}" is postponed for 10 seconds due to ${error.response?.status} status error`);
        setTimeout(async () => {
          try {
            let files = await readdir('./images');
            let t = null;
            resemble(this.screenshotsFolder + files[files.length-1])
                .compareTo(this.screenshotsFolder + files[files.length-2])
                .ignoreColors()
                .onComplete(function(data) {
                  const imageDifference = data.misMatchPercentage;
                  console.log('key' + key);
                  console.log('imageDifference' + imageDifference);
                  this.tellServerAboutChanges(key, imageDifference);
                });
            console.log('t' + t);
            return t;
          } catch (err) {console.log(err);}
          return true;
        }, 10000);
        throw error;
      });
  }

  async tellClientsAboutChanges(path, data) {
    // console.log("TELL", path);
    Informant.emit(`${path}`, data);
  }

  async getObjectFromPath(path) {
    const stats = fs.statSync(path);
    if (path === this.root) return;
    return {
      path: this.getRelativePath(path),
      name: stats.isDirectory()
        ? Path.basename(path)
        : Path.basename(path)
            .split(".")
            .slice(0, -1)
            .join("."),
      type: stats.isDirectory() ? "folder" : "file",
      url: await getSignedUrl(this.getRelativePath(path))
    };
  }
}

export default Index;
