const db = require('../config/database');

class AddonRepository {
  findAll(onlyActive = true) {
    let query = 'SELECT * FROM addons';
    if (onlyActive) {
      query += ' WHERE is_active = 1';
    }
    query += ' ORDER BY id ASC';
    return db.prepare(query).all();
  }

  findById(id) {
    return db.prepare('SELECT * FROM addons WHERE id = ?').get(id);
  }

  create({ name, description, price, priceType = 'per_night', icon = '', isActive = 1 }) {
    const stmt = db.prepare(`
      INSERT INTO addons (name, description, price, price_type, icon, is_active)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const info = stmt.run(name, description, price, priceType, icon, isActive);
    return this.findById(info.lastInsertRowid);
  }
}

module.exports = new AddonRepository();
