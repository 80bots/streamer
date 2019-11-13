import config from '../config';
import { S3 } from 'aws-sdk';

export const s3 = new S3({
  apiVersion:      config.s3.apiVersion,
  accessKeyId:     config.s3.key,
  secretAccessKey: config.s3.secret,
  bucket:          config.s3.bucket,
  region:          config.s3.region,
});

export const getFullPath = (key) => {
  return config.instance.name + '/' + key;
};

export const putObject = (buffer, path, ContentType) => new Promise((resolve, reject) => {
  // prepend key
  const key = getFullPath(path);
  const params = {
    Key: key,
    Bucket: config.s3.bucket,
  };
  if(ContentType) {
    params.ContentType = ContentType;
  }
  if(buffer.length) {
    params.Body = buffer;
  }
  s3.putObject(params, (err, res) => {
    if(err) {
      reject(err);
    } else {
      resolve(res);
    }
  });
});

export const getSignedUrl = (path) => new Promise((resolve, reject) => {
  const key = getFullPath(path);
  s3.getSignedUrl('getObject', {
    Bucket: config.s3.bucket,
    Key: key,
    Expires: 600
  }, (err, url) => {
    if(err) reject(err);
    if(!config.s3.cdnHost) {
      resolve(url);
    } else {
      const urlObj = new URL(url);
      urlObj.hostname = config.s3.cdnHost;
      resolve(urlObj.href);
    }
  });
});

export const getObject = key => new Promise((resolve, reject) => {
  // prepend key
  const key = getFullPath(key);
  s3.getObject({ Key: key, Bucket: config.s3.bucket }, (err, data) => {
    if(err) {
      reject(err);
    } else {
      resolve(data);
    }
  });
});
