/**
 * Global centralized error handling middleware.
 * Ensures the client always receives a clean JSON response instead of a HTML stack trace.
 */
export const errorHandler = (err, req, res, _next) => {
  const statusCode = err.statusCode || 500;
  const isDevelopment = process.env.NODE_ENV === 'development';

  console.error(`[Error] ${req.method} ${req.url}:`, err);

  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error',
    stack: isDevelopment ? err.stack : undefined
  });
};
