const errorHandler = (err, req, res, next) => {
  console.error('Unhandled server error:', err.stack || err);

  const status = err.status || 500;
  const response = {
    error: err.message || 'Internal Server Error',
    details: err.details || null
  };

  if (req.path.startsWith('/api') || req.path.startsWith('/auth')) {
    return res.status(status).json(response);
  }

  // Default to plain text for non-API errors
  res.status(status).send(response.error);
};

module.exports = { errorHandler };
