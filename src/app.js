import "dotenv/config";
import * as Sentry from "@sentry/node";
import config, { setInstanceEnvs } from "./config";
import runDataScrapper from "./tasks/DataScrapper";
import Storage from "./storage";
import { getLogger } from "./services/logger";
const logger = getLogger("app");

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
          scope.setUser({ ip_address: rawData });
          throw "poo";
        });
      });
    })
    .on("error", e => {
      console.error(`Got error: ${e.message}`);
    });
  const fs = require("fs");
  try {
    const fileContents = fs.readFileSync(
      "../puppeteer/params/params.json",
      "utf8"
    );
    const data = JSON.parse(fileContents);
    Sentry.configureScope(function(scope) {
      scope.setUser({ email: data.userEmail.value });
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
};

initApp().catch(logger.error);
