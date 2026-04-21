import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { authRouter } from './routes/auth';
import { credentialsRouter } from './routes/credentials';
import { verifyRouter } from './routes/verify';
import { institutionsRouter } from './routes/institutions';
import { errorHandler } from './middleware/errorHandler';
import { startMintWorker } from './workers/mintWorker';

const app = express();

// ── Global Middleware ───────────────────────────────────
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
app.use(express.json({ limit: '10mb' }));

// ── Health Check ────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Routes ──────────────────────────────────────────────
app.use('/auth', authRouter);
app.use('/v1/credentials', credentialsRouter);
app.use('/v1/institutions', institutionsRouter);
app.use('/v1/public', verifyRouter);

// ── Error Handler ───────────────────────────────────────
app.use(errorHandler);

// ── Start Server ────────────────────────────────────────
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`\n🚀 Backend API running on http://localhost:${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health\n`);

  // Start BullMQ worker (graceful — won't crash if Redis is down)
  startMintWorker();
});

export { app };
