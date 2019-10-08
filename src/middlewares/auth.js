import { setInstanceId } from '../config';

export default async function (socket) {
  if(process.env.NODE_ENV !== 'production') {
    process.env.INSTANCE_ID = 'test';
    return true;
  }
  if(socket.request._query.id) {
    try {
      const id = await setInstanceId();
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
