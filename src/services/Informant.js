import Echo from 'laravel-echo';
import io from 'socket.io-client';
import config from '../config';

// TODO: Create real Informant class
setTimeout(() => {
  const listener = new Echo({
    broadcaster: 'socket.io',
    host: 'http://127.0.0.1:6001',
    client: io,
    auth: {
      headers: {
        bot_instance_id: config.instance.id || 'test_id',
      },
    },
  });

  listener.private(`instances.${config.instance.id}.storage`)
    .listenForWhisper('signal', console.log);
}, 200);

class Informant {
  constructor() {
    this.sender = new Echo({
      broadcaster: 'socket.io',
      host: 'http://127.0.0.1:6001',
      client: io,
      auth: {
        headers: {
          bot_instance_id: config.instance.id || 'test_id',
        },
      },
    });
  }

  send (data) {
    this.sender
      .private(`instances.${config.instance.id}.storage`)
      .whisper('signal', data);
  }
}

export default new Informant