import "dotenv/config";
import config, {setInstanceEnvs} from "./config";
import runDataScrapper from "./tasks/DataScrapper";
import Storage from "./storage";
import {getLogger} from "./services/logger";
import ClientNotification from "./services/notification";
import ServerNotification from "./notifications";

const WorkerPool = require("../src/worker");
const os = require('os');

const logger = getLogger("app");

const pool = new WorkerPool(os.cpus().length);

process.on("unhandledRejection", error => {
    logger.error(error);
    logger.debug("%o", error);
});

const initApp = async () => {
    await setInstanceEnvs();
    new Storage();
    await runDataScrapper();
    await ClientNotification.connect();
    let serverNotification = new ServerNotification();
    await pool.runTask('status', (err, result) => {
        serverNotification.tellServerAboutNotificaition(result);
        ClientNotification.emit('notification', {notification: result, error: err});
    });
};

initApp().catch(logger.error);