function errorHandler(err, req, res, next) {
  console.error('[Error Details]:', err);

  const statusCode = err.statusCode || (res.statusCode !== 200 ? res.statusCode : 400);

  res.status(statusCode).json({
    success: false,
    message: err.message || 'Sunucuda beklenmeyen bir hata meydana geldi.',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
}

module.exports = errorHandler;
