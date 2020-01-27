import { init } from "./services/socket.io";
import valid from "./middlewares/auth";
import SendScreenshots from "./tasks/SendScreenshots";
import SendLogs from "./tasks/SendLogs";
import SendOutput from "./tasks/SendOutput";
import config from "./config";
import { getLogger } from "./services/logger";

const logger = getLogger("instance-socket-server");

export default () => {
  logger.info("Initializing socket server...");
  console.log("Initializing socket server...");
  const socket = init();
  socket.on("connect", async socket => {
    const isValid = await valid(socket);
    if (isValid) {
      logger.info(`${socket.id} connected`);
      const screenshotTask = new SendScreenshots(socket);
      const logsTask = new SendLogs(socket);
      const outputTask = new SendOutput(socket);
      socket.on("disconnect", () => {
        logger.info(`${socket.id} disconnected, watchers closed`);
        console.log(`${socket.id} disconnected, watchers closed`);
        screenshotTask.closeWatcher();
        logsTask.closeWatcher();
        outputTask.closeWatchers();
      });
    }
  });
  socket.listen(config.app.port);
  logger.info(`Socket server is listening on port ${config.app.port}`);
  console.log(`Socket server is listening on port ${config.app.port}`);
};
