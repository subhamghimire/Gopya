export function errorHandler(err, _req, res, _next) {
  console.error(err);
  const status = err.status || 500;
  const message = status === 500 ? 'Internal error' : err.message;
  res.status(status).json({ error: message });
}

