const http = require('http');
const { Server } = require('socket.io');
const { createApp } = require('../../index');

async function main() {
  const { app, ready } = await createApp({
    port: 3000,
    database: { dialect: 'sqlite', storage: ':memory:' },
  });

  const server = http.createServer(app);
  const io = new Server(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] },
  });

  io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);

    socket.on('message', (data) => {
      io.emit('message', { userId: socket.id, text: data, timestamp: new Date() });
    });

    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`);
    });
  });

  await ready;
  server.listen(3000, () => console.log('WebSocket example running on port 3000'));
}

main().catch(console.error);
