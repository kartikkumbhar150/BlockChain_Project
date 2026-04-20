import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { credentialsRouter } from './routes/credentials';
import { verifyRouter } from './routes/verify';
import { errorHandler } from './middleware/errorHandler';
// import { authRouter } from './routes/auth';
// import { institutionsRouter } from './routes/institutions';
// import { templatesRouter } from './routes/templates';

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || '*' }));
app.use(express.json({ limit: '10mb' }));

// app.use('/auth', authRouter);
app.use('/v1/credentials', credentialsRouter);
// app.use('/v1/institutions', institutionsRouter);
// app.use('/v1/templates', templatesRouter);
app.use('/v1/public', verifyRouter);   // no auth

app.use(errorHandler);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

export { app };
