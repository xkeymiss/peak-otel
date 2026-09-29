const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const userRepository = require('../repositories/userRepository');

const JWT_SECRET = process.env.JWT_SECRET || 'peak-hotel-secret-key-2026-super-secure';
const JWT_EXPIRES_IN = '7d';

class AuthService {
  async register({ email, password, fullName, phone, role = 'customer' }) {
    if (!email || !password || !fullName) {
      throw new Error('E-posta, şifre ve ad soyad alanları zorunludur.');
    }

    const existing = userRepository.findByEmail(email);
    if (existing) {
      throw new Error('Bu e-posta adresiyle kayıtlı bir hesap zaten var.');
    }

    if (password.length < 6) {
      throw new Error('Şifre en az 6 karakter olmalıdır.');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = userRepository.create({
      email,
      passwordHash,
      fullName,
      phone: phone || '',
      role
    });

    const token = this.generateToken(user);
    return { user, token };
  }

  async login({ email, password }) {
    if (!email || !password) {
      throw new Error('E-posta ve şifre gereklidir.');
    }

    const user = userRepository.findByEmail(email);
    if (!user) {
      const err = new Error('Geçersiz e-posta veya şifre.');
      err.statusCode = 401;
      throw err;
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      const err = new Error('Geçersiz e-posta veya şifre.');
      err.statusCode = 401;
      throw err;
    }

    const safeUser = {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      phone: user.phone,
      role: user.role
    };

    const token = this.generateToken(safeUser);
    return { user: safeUser, token };
  }

  generateToken(user) {
    return jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        fullName: user.full_name
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
  }

  verifyToken(token) {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch {
      return null;
    }
  }
}

module.exports = new AuthService();
