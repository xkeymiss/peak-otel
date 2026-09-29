if (typeof process.loadEnvFile === 'function') {
  try {
    process.loadEnvFile();
  } catch {
    // .env dosyası opsiyoneldir
  }
}

const express = require('express');
const path = require('path');
const cors = require('cors');
const os = require('os');

// Routes
const authRoutes = require('./routes/authRoutes');
const roomRoutes = require('./routes/roomRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const adminRoutes = require('./routes/adminRoutes');
const errorHandler = require('./middlewares/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static assets from public/
const publicDir = path.resolve(__dirname, '..', 'public');
app.use(express.static(publicDir));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/admin', adminRoutes);

// Friendly URL rewrites for HTML pages (Express 5 compatible with { root })
app.get(['/admin', '/admin/'], (req, res) => {
  res.sendFile('admin.html', { root: publicDir });
});

app.get(['/rezervasyonlarim', '/rezervasyonlarim/'], (req, res) => {
  res.sendFile('my-bookings.html', { root: publicDir });
});

app.get(['/oda', '/oda/', '/oda/:id', '/oda/:id/'], (req, res) => {
  res.sendFile('room-detail.html', { root: publicDir });
});

// Centralized error handler
app.use(errorHandler);

// Helper to get local network IP
function getLocalIpAddress() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return 'localhost';
}

const server = app.listen(PORT, () => {
  const localIp = getLocalIpAddress();
  console.log('\n============================================================');
  console.log(' ✨  PEAK OTEL - BUTİK OTEL & REZERVASYON SİSTEMİ  ✨');
  console.log('============================================================');
  console.log(` 🏨  Müşteri Sitesi:     http://localhost:${PORT}`);
  console.log(` 🔑  Admin Paneli:       http://localhost:${PORT}/admin`);
  console.log(` 📱  Ağ / Telefon:       http://${localIp}:${PORT}`);
  console.log('============================================================\n');
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Peak Otel sunucusu kapatılıyor...');
  server.close(() => {
    console.log('✅ Sunucu başarıyla durduruldu.');
    process.exit(0);
  });
});
