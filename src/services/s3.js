import config from '../config';
import { S3 } from 'aws-sdk';

export const s3 = new S3({
  apiVersion:      config.s3.apiVersion,
  accessKeyId:     config.s3.key,
  secretAccessKey: config.s3.secret,
  bucket:          config.s3.bucket,
  region:          config.s3.region,
});

export const putObject = (buffer, path) => new Promise((resolve, reject) => {
  // prepend key
  const key = config.instance.name + '/' + path;
  s3.putObject({ Body: buffer, Key: key, Bucket: config.s3.bucket }, (err, res) => {
    if(err) {
      reject(err);
    } else {
      resolve(res);
    }
  });
});

export const getObject = key => new Promise((resolve, reject) => {
  // prepend key
  const path = config.instance.name + '/' + key;
  s3.getObject({ Key: path, Bucket: config.s3.bucket }, (err, data) => {
    if(err) {
      reject(err);
    } else {
      resolve(data);
    }
  });
});
