import Echo from "laravel-echo";
import io from "socket.io-client";
import config from "../config";

class Notification {
  connect() {
    const socket = new Echo({
      broadcaster: "socket.io",
      host: config.app.socketServer,
      client: io,
      auth: {
        headers: {
          ["bot-instance-id"]: config.instance.id
        }
      }
    });
    this.notification = socket.private(`instances.${config.instance.id}.notification`);
  }

  emit(chat, status) {
    // console.log(chat, {...status,  instanceId: config.instance.id});
    this.notification.whisper(chat, {...status, instanceId: config.instance.id});
  }
  on(chat, callback) {
    this.notification.listenForWhisper(chat, callback);
  }
}
export default new Notification();
