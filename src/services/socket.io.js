import socketIo from 'socket.io';

let ioInstance = null;

export const init = () => {
  ioInstance = socketIo();
  ioInstance.on('connection', (socket) => {
    socket.on('join', (room) => {
      socket.join(room);
    });
  });
  return ioInstance;
};

//must be called in app init
export const IO = () => ioInstance;
