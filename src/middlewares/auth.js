import http from 'http';

const requestId = () => new Promise((resolve, reject) => {
  http.get('http://169.254.169.254/latest/meta-data/instance-id', (resp) => {
    let data = '';
    resp.on('data', chunk => { data += chunk; });
    resp.on('end', () => resolve(data));
  }).on('error', reject);
});

export default async function (socket) {
  if(process.env.NODE_ENV !== 'production') return true;
  if(socket.request._query.id) {
    try {
      let id = await requestId().catch(() => '');
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
