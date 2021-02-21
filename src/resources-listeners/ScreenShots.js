import {watch} from "chokidar";
import appConfig from "../config";
import fs from "fs";
import Path from "path";
import dayjs from "dayjs";
import getColors from "get-image-colors";

class Listener {
    constructor() {
        this.storageRoot = appConfig.local.root;
        this.root = appConfig.app.screenshotsFolder;
        this.folder = dayjs().format("YYYY-MM-DD HH:mm:ss");
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
            .on("add", (...params) => this.filterScreenshot(...params))
            .on("change", (...params) => this.filterScreenshot(...params));
    }

    filterScreenshot(path) {

        const blackScreenshot = ['#fcfcfc', '#040404', '#c0ff80', '#408480', '#400484'];
        const fileName = Path.basename(path);

        getColors(path).then(colors => {
            const screenshotColors = colors.map(color => color.hex());

            if (screenshotColors.length !== blackScreenshot.length) {
                this.onFileAdded(path, fileName);
            } else if (!blackScreenshot.every((item, index) => item === screenshotColors[index])) {
                this.onFileAdded(path, fileName);
            } else {
                this.onFileAdded(path, "blank_screenshot " + fileName);
            }

        }).catch(e => e);
    }

    onFileAdded(path, fileName) {

        const link = `${this.storageRoot}/screenshots/${this.folder}/${fileName}`;

        if (!fs.existsSync(Path.dirname(link))) {
            fs.mkdirSync(Path.dirname(link), {recursive: true});
        }

        if (!fs.existsSync(link)) {
            fs.symlinkSync(path, link);
        }
    }

}

export default Listener;
