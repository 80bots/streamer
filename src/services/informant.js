import Echo from 'laravel-echo';
import io from 'socket.io-client';
import config from '../config';

const REQUEST_UPDATES = 'get.file.updates';

class Informant {
  connect () {
    const socket = new Echo({
      broadcaster: 'socket.io',
      host: config.app.socketServer,
      client: io,
      auth: {
        headers: {
          bot_instance_id: config.instance.id,
        },
      },
    });
    this.informant = socket.private(`instances.${config.instance.id}.storage`);
  }

  emit (chat, data) {
    console.log(chat);
    this.informant.whisper(chat, data);
  }

  on (chat, callback) {
    console.log(chat, callback);
    this.informant.listenForWhisper(REQUEST_UPDATES, (e) => {
      console.log(e);
    });
  }
}

export default new Informant();
