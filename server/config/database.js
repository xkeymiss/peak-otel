const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'hotel.db');
const db = new Database(dbPath);

// Enable WAL mode for better concurrency and performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Initialize database schema
function initDatabase() {
  const schema = `
    -- Users Table
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      phone TEXT,
      role TEXT DEFAULT 'customer' CHECK(role IN ('customer', 'admin')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Rooms Table
    CREATE TABLE IF NOT EXISTS rooms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_number TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      room_type TEXT NOT NULL,
      floor INTEGER NOT NULL,
      size_m2 INTEGER NOT NULL,
      max_guests INTEGER NOT NULL,
      bed_type TEXT NOT NULL,
      price_per_night REAL NOT NULL,
      view_type TEXT NOT NULL,
      description TEXT NOT NULL,
      amenities TEXT NOT NULL, -- JSON array
      image_url TEXT NOT NULL,
      status TEXT DEFAULT 'active' CHECK(status IN ('active', 'maintenance')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Room Additional Images
    CREATE TABLE IF NOT EXISTS room_images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_id INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
      image_url TEXT NOT NULL,
      caption TEXT,
      is_primary INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Add-ons Services Table
    CREATE TABLE IF NOT EXISTS addons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      price REAL NOT NULL,
      price_type TEXT DEFAULT 'per_night' CHECK(price_type IN ('per_night', 'per_stay', 'per_person_per_night')),
      icon TEXT,
      is_active INTEGER DEFAULT 1
    );

    -- Bookings Table
    CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      booking_code TEXT UNIQUE NOT NULL,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      room_id INTEGER NOT NULL REFERENCES rooms(id) ON DELETE RESTRICT,
      check_in DATE NOT NULL,
      check_out DATE NOT NULL,
      total_nights INTEGER NOT NULL,
      guest_count INTEGER NOT NULL,
      guest_name TEXT NOT NULL,
      guest_email TEXT NOT NULL,
      guest_phone TEXT NOT NULL,
      base_price REAL NOT NULL,
      addons_json TEXT DEFAULT '[]',
      addons_total REAL DEFAULT 0,
      tax_amount REAL NOT NULL,
      total_price REAL NOT NULL,
      status TEXT DEFAULT 'confirmed' CHECK(status IN ('confirmed', 'checked_in', 'checked_out', 'cancelled')),
      special_requests TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Indexes for high-performance availability queries
    CREATE INDEX IF NOT EXISTS idx_bookings_dates ON bookings(room_id, check_in, check_out, status);
    CREATE INDEX IF NOT EXISTS idx_bookings_code ON bookings(booking_code);
    CREATE INDEX IF NOT EXISTS idx_bookings_user ON bookings(user_id);
    CREATE INDEX IF NOT EXISTS idx_rooms_active ON rooms(status);
  `;

  db.exec(schema);
}

initDatabase();

module.exports = db;
