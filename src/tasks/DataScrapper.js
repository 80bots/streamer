import OutputJson from "../resources-listeners/OutputJson";
import OutputImages from "../resources-listeners/OutputImages";
import OutputFiles from "../resources-listeners/OutputFiles";
import ScreenShots from "../resources-listeners/ScreenShots";
import BotWorkLog from "../resources-listeners/BotWorkLog";
import InstanceInitLog from "../resources-listeners/InstanceInitLog";

export default () => {
  new OutputJson();
  new OutputImages();
  new OutputFiles();
  new ScreenShots();
  new BotWorkLog();
  new InstanceInitLog();
};
