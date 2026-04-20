import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  console.error('Error handling request:', err);

  if (err instanceof ZodError) {
    return res.status(400).json({ error: 'Validation Error', details: err.errors });
  }

  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
  });
}
