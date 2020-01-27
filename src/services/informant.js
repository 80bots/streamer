import Echo from "laravel-echo";
import io from "socket.io-client";
import config from "../config";

class Informant {
  connect() {
    console.log(config.instance.id);
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
    this.informant = socket.private(`instances.${config.instance.id}.storage`);
  }

  emit(chat, data) {
    // console.log('TELL', chat, data);
    this.informant.whisper(chat, data);
  }
  on(chat, callback) {
    this.informant.listenForWhisper(chat, callback);
  }
}

export default new Informant();
