import config from '../config';
import { S3 } from 'aws-sdk';

export const s3 = new S3({
  apiVersion:      config.s3.apiVersion,
  accessKeyId:     config.s3.key,
  secretAccessKey: config.s3.secret,
  bucket:          config.s3.bucket,
  region:          config.s3.region,
});
