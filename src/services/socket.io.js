import socketIo from 'socket.io';

let ioInstance = null;

export const init = () => {
  ioInstance = socketIo();
  return ioInstance;
};

//must be called in app init
export const IO = () => ioInstance;
