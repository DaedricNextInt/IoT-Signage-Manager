import { Request, Response, NextFunction } from 'express';

export const requestLogger = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const log = `${req.method} ${req.path} ${res.statusCode} ${duration}ms`;
    
    if (res.statusCode >= 500) {
      console.error(`❌ ${log}`);
    } else if (res.statusCode >= 400) {
      console.warn(`⚠️  ${log}`);
    } else if (process.env.NODE_ENV === 'development') {
      console.log(`✓ ${log}`);
    }
  });
  
  next();
};
