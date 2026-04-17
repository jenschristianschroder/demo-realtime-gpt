import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import healthRouter from './routes/health.js';
import { attachRealtimeWebSocket } from './routes/realtime.js';

const PORT = parseInt(process.env.PORT ?? '3001', 10);

const app = express();
app.use(cors());
app.use(express.json());
app.use(healthRouter);

const server = createServer(app);
attachRealtimeWebSocket(server);

server.listen(PORT, () => {
  console.log(`[api] Listening on port ${PORT}`);
});
