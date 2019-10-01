import socketIo from 'socket.io';

let ioInstance = null;

export const init = () => {
  ioInstance = socketIo(null, {
    pingTimeout: 60000
  });
  return ioInstance;
};
