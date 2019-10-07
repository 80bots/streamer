import config from '../config';
import { S3 } from 'aws-sdk';

export const s3 = new S3({
  apiVersion:      config.s3.apiVersion,
  accessKeyId:     config.s3.key,
  secretAccessKey: config.s3.secret,
  bucket:          config.s3.bucket,
  region:          config.s3.region,
});

export const putObject = (buffer, path, bucket = config.s3.bucket) => new Promise((resolve, reject) => {
  s3.putObject({ Body: buffer, Key: path, Bucket: bucket }, (err, res) => {
    if(err) {
      reject(err);
    } else {
      resolve(res);
    }
  });
});

export const getObject = (key, bucket) => new Promise((resolve, reject) => {
  s3.getObject({ Key: key, Bucket: bucket }, (err, data) => {
    if(err) {
      reject(err);
    } else {
      resolve(data);
    }
  });
});
