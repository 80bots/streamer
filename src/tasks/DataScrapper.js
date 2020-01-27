import OutputJson from "../resources-listeners/OutputJson";
import OutputImages from "../resources-listeners/OutputImages";
import ScreenShots from "../resources-listeners/ScreenShots";
import BotWorkLog from "../resources-listeners/BotWorkLog";
import InstanceInitLog from "../resources-listeners/InstanceInitLog";

export default () => {
  new OutputJson();
  new OutputImages();
  new ScreenShots();
  new BotWorkLog();
  new InstanceInitLog();
};
