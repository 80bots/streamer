import "dotenv/config";
import * as Sentry from "@sentry/node";
import config, { setInstanceEnvs } from "./config";
import runDataScrapper from "./tasks/DataScrapper";
import Storage from "./storage";
import { getLogger } from "./services/logger";
//import Notification from "./services/notification";
import Notification from "./notifications";
const WorkerPool = require("../src/worker");
const os = require('os');

const logger = getLogger("app");
let userData = {
  ip_address: "0.0.0.0",
  email: "unknown@80bots.com"
};
const pool = new WorkerPool(os.cpus().length);

if (process.env?.NODE_ENV === "production") {
  Sentry.init({ dsn: config.app.sentryDSN });
  const http = require("http");
  http
    .get("http://169.254.169.254/latest/meta-data/public-ipv4", res => {
      const { statusCode } = res;
      const contentType = res.headers["content-type"];
      res.setEncoding("utf8");
      let rawData = "";
      res.on("data", chunk => {
        rawData += chunk;
      });
      res.on("end", () => {
        Sentry.configureScope(function(scope) {
          userData.ip_address = rawData.trim();
          scope.setUser(userData);
        });
      });
    })
    .on("error", e => {
      console.error(`Got error: ${e.message}`);
    });
  const fs = require("fs");
  try {
    const fileContents = fs.readFileSync(
      "../src/params/params.json",
      "utf8"
    );
    const data = JSON.parse(fileContents);
    Sentry.configureScope(function(scope) {
      userData.email = data.userEmail ? data.userEmail.value : "unknown@80bots.com";
      scope.setUser(userData);
    });
  } catch (err) {
    console.error(err);
  }
}

process.on("unhandledRejection", error => {
  logger.error(error);
  logger.debug("%o", error);
});

const initApp = async () => {
  await setInstanceEnvs();
  new Storage();
  await runDataScrapper();
  //await Notification.connect();
  let notification = new Notification();
  await pool.runTask('status', (err, result) => {
    //Notification.emit('notification', {notification: result, error: err});
    notification.tellServerAboutNotificaition(result);
  });
};

initApp().catch(logger.error);
