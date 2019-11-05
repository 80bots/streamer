import axios from 'axios';
import config from '../config';
import { getLogger } from './logger';

const logger = getLogger('streamer-api');

const API = axios.create({
  baseURL: process.env.API_URL || 'http://localhost::8000/api',
  headers: {
    bot_instance_id: config.instance.id || 'test_id',
  }
});

API.interceptors.response.use(function (response) {
  // Any status code that lie within the range of 2xx cause this function to trigger
  // Do something with response data
  return response;
}, function (error) {
  // Any status codes that falls outside the range of 2xx cause this function to trigger
  // Do something with response error
  logger.error(error);
  return Promise.reject(error);
});

export default API;