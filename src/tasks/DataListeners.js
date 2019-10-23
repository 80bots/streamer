import config,
{
  JSON,
  IMAGES,
  SCREENSHOTS
} from '../config/resources';
import JsonHandler from '../file-system-listeners/JsonHandler';
import ImageHandler from '../file-system-listeners/ImageHandler';

export default () => {
  new JsonHandler(JSON);
  new ImageHandler(IMAGES);
  new ImageHandler(SCREENSHOTS);
};
