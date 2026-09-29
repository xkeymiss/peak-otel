const db = require('../config/database');

class UserRepository {
  findByEmail(email) {
    const stmt = db.prepare('SELECT * FROM users WHERE email = ? COLLATE NOCASE');
    return stmt.get(email);
  }

  findById(id) {
    const stmt = db.prepare('SELECT id, email, full_name, phone, role, created_at FROM users WHERE id = ?');
    return stmt.get(id);
  }

  create({ email, passwordHash, fullName, phone, role = 'customer' }) {
    const stmt = db.prepare(`
      INSERT INTO users (email, password_hash, full_name, phone, role)
      VALUES (?, ?, ?, ?, ?)
    `);
    const info = stmt.run(email, passwordHash, fullName, phone, role);
    return this.findById(info.lastInsertRowid);
  }

  getAllCustomers() {
    const stmt = db.prepare(`
      SELECT u.id, u.email, u.full_name, u.phone, u.created_at,
             COUNT(b.id) AS total_bookings,
             COALESCE(SUM(CASE WHEN b.status != 'cancelled' THEN b.total_price ELSE 0 END), 0) AS total_spent
      FROM users u
      LEFT JOIN bookings b ON u.id = b.user_id
      WHERE u.role = 'customer'
      GROUP BY u.id
      ORDER BY u.created_at DESC
    `);
    return stmt.all();
  }
}

module.exports = new UserRepository();
