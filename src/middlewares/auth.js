import { execSync } from 'child_process';

export default function (socket) {
  if(process.env.NODE_ENV && process.env.NODE_ENV !== 'production') return true;
  if(socket.request._query.id) {
    try {
      let id = execSync('curl http://169.254.169.254/latest/meta-data/instance-id');
      if (id === socket.request._query.id) return true;
    } catch (e) {
      socket.disconnect();
      return false;
    }
  } else {
    socket.disconnect();
    return false;
  }
}
