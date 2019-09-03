import { IO } from '../services/socket.io';
import fs from 'fs';

class SendScreenshots {
  constructor() {
    this.socket = IO();
  }

  run() {
    const screenshots = fs.readdirSync('.screenshots').slice(0, 10);
    const data = screenshots.map(item => {
      const file = fs.readFileSync('.screenshots/' + item);
      return { data: file, name: item };
    });
    this.socket.emit('data', data);
  }
}

export default SendScreenshots;
