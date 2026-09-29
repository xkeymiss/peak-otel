const authService = require('../services/authService');
const userRepository = require('../repositories/userRepository');

class AuthController {
  async register(req, res, next) {
    try {
      const email = req.body.email;
      const password = req.body.password;
      const fullName = req.body.fullName || req.body.name;
      const phone = req.body.phone;
      const result = await authService.register({ email, password, fullName, phone });
      res.status(201).json({
        success: true,
        message: 'Kayıt başarıyla tamamlandı.',
        data: result
      });
    } catch (err) {
      next(err);
    }
  }

  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      const result = await authService.login({ email, password });
      res.status(200).json({
        success: true,
        message: 'Giriş başarılı.',
        data: result
      });
    } catch (err) {
      next(err);
    }
  }

  async me(req, res, next) {
    try {
      const user = userRepository.findById(req.user.id);
      if (!user) {
        return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı.' });
      }
      res.status(200).json({
        success: true,
        data: user
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AuthController();
