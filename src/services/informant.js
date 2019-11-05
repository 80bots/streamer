import Echo from 'laravel-echo';
import io from 'socket.io-client';
import config from '../config';

class Informant {
  constructor() {
    this.connect();
  }

  connect () {
    this.informant = new Echo({
      broadcaster: 'socket.io',
      host: config.app.socketServer.host,
      client: io,
      auth: {
        headers: {
          bot_instance_id: config.instance.id,
        },
      },
    });
  }

  send (folder, data) {
    this.informant
      .private(`instances.${config.instance.id}.storage`)
      .whisper(folder, data);
  }
}

export default new Informant;
