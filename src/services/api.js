import axios from 'axios';
import config from '../config';
import { getLogger } from './logger';

const logger = getLogger('streamer-api');

const API = axios.create();

API.interceptors.request.use(req => {
  req.url = process.env.API_URL + '/tunnel' + req.url;
  req.headers['bot-instance-id'] = config.instance.id;
  return req;
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