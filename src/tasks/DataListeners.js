import config,
{
  JSON,
  IMAGES,
  SCREENSHOTS,
  LOGS
} from '../config/resources';
import JsonHandler from '../file-system-listeners/JsonHandler';
import ImageHandler from '../file-system-listeners/ImageHandler';
import TextHandler from '../file-system-listeners/TextHandler';

export default () => {
  new JsonHandler(JSON);
  new ImageHandler(IMAGES);
  new ImageHandler(SCREENSHOTS);
  new TextHandler(LOGS);
};
