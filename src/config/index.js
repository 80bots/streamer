import dotenv from "dotenv";
import os from "os";
import { EC2, MetadataService } from "aws-sdk";

const meta = new MetadataService();
const env = dotenv.config().parsed || process.env;

const config = {
  app: {
    port: process.env.PORT || env.SOCKET_PORT || 6001,
    screenshotsFolder:
      env.SCREENSHOTS_FOLDER || os.homedir() + "/.screenshots/",
    logPath: env.LOG_PATH || os.homedir() + "/data-streamer/logs/log.log",
    initLogPath: env.INIT_LOG_PATH || "/var/log/cloud-init-output.log",
    outputFolder: env.OUTPUT_FOLDER || os.homedir() + "/data-streamer/output/",
    dateFormat: env.TIMESTAMP_FORMAT || "YYYY-MM-DD-HH-mm-ss",
    sentryDSN:
      env.SENTRY_DSN ||
      "https://f921491331824fc8818d4b72b0bba14f@sentry.io/1769350",
    socketServer: env.SOCKET_SERVER_HOST || "http://127.0.0.1:6001"
  },
  local: {
    root: os.homedir() + "/storage/"
  },
  s3: {
    apiVersion: "latest",
    key: env.AWS_ACCESS_KEY_ID,
    secret: env.AWS_SECRET_ACCESS_KEY,
    region: env.AWS_REGION || "us-east-2",
    bucket: env.AWS_BUCKET+"/streamer-data",
    cdnHost: env.AWS_CLOUDFRONT_INSTANCES_HOST,
  },
  instance: {
    name: "",
    region: "",
    id: ""
  }
};

export const setInstanceId = () =>
  new Promise((resolve, reject) => {
    meta.request("/latest/meta-data/instance-id", (err, resp) => {
      if (!err) {
        config.instance.id = resp;
        resolve(resp);
      } else {
        reject(err);
      }
    });
  });

const setInstanceRegion = () =>
  new Promise((resolve, reject) => {
    meta.request(
      "/latest/meta-data/placement/availability-zone",
      (err, resp) => {
        if (!err) {
          const region = resp.slice(0, resp.length - 1);
          config.instance.region = region;
          resolve(region);
        } else {
          reject(err);
        }
      }
    );
  });

export const setInstanceRegionAndName = async () => {
  const ec2 = new EC2({
    apiVersion: config.s3.apiVersion,
    accessKeyId: config.s3.key,
    secretAccessKey: config.s3.secret,
    region: (await setInstanceRegion()) || "us-east-2"
  });

  return ec2.describeTags(
    {
      Filters: [
        {
          Name: "resource-id",
          Values: [config.instance.id]
        }
      ]
    },
    (err, resp) =>
      new Promise((resolve, reject) => {
        if (!err) {
          const name =
            resp.Tags.find(item => item.Key === "Name")?.Value || "unmatched";
          config.instance.name = name;
          resolve(name);
        } else {
          reject(err);
        }
      })
  );
};

export const setInstanceEnvs = async () => {
  if (process.env.NODE_ENV === "production") {
    return Promise.all([setInstanceId(), setInstanceRegionAndName()]);
  } else {
    config.instance.id = "test_id";
    config.instance.name = "test_name";
    config.instance.region = "us-east-2";
    return true;
  }
};

export default config;
