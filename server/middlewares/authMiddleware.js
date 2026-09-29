const authService = require('../services/authService');

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Oturum açmanız gerekiyor. Lütfen giriş yapınız.'
    });
  }

  const token = authHeader.split(' ')[1];
  const decoded = authService.verifyToken(token);

  if (!decoded) {
    return res.status(401).json({
      success: false,
      message: 'Geçersiz veya süresi dolmuş oturum. Lütfen tekrar giriş yapınız.'
    });
  }

  req.user = decoded;
  next();
}

function requireAdmin(req, res, next) {
  authenticate(req, res, () => {
    if (req.user && req.user.role === 'admin') {
      next();
    } else {
      res.status(403).json({
        success: false,
        message: 'Bu işlem için yönetici (Admin) yetkisi gerekmektedir.'
      });
    }
  });
}

function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    const decoded = authService.verifyToken(token);
    if (decoded) {
      req.user = decoded;
    }
  }
  next();
}

module.exports = {
  authenticate,
  requireAdmin,
  optionalAuth
};
