// server/index.js
// ============================================
// CONFIGURACIÓN INICIAL
// ============================================
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const http = require('http');
const socketIo = require('socket.io');

const connectDB = require('./db');
const { generalLimiter } = require('./shared/middleware/rateLimit');

// ============================================
// INICIALIZACIÓN
// ============================================
const app = express();
connectDB();

const server = http.createServer(app);

// ============================================
// CONFIGURACIÓN DE ORÍGENES PERMITIDOS (CORS)
// ============================================
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  process.env.FRONTEND_URL?.replace(/\/$/, ''),
  'https://libreria-ac.netlify.app'
].filter(Boolean);

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    const normalizedOrigin = origin.replace(/\/$/, '');
    if (allowedOrigins.includes(normalizedOrigin)) {
      callback(null, true);
    } else {
      console.warn(`❌ CORS bloqueado para: ${origin}`);
      callback(null, false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'X-Forwarded-For']
};

// APLICAR CORS INMEDIATAMENTE (Antes que cualquier otro middleware)
app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Manejar pre-flight de todas las rutas

// ============================================
// CONFIGURACIÓN DE SOCKET.IO
// ============================================
const io = socketIo(server, {
  cors: corsOptions, // 👈 Usar la misma configuración que express
  transports: ['websocket', 'polling']
});

// ============================================
// MIDDLEWARES DE SEGURIDAD Y PARSEO
// ============================================
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(express.json());

app.use((req, res, next) => {
  console.log(`📌 ${req.method} ${req.url}`);
  next();
});

app.use('/api', generalLimiter);

// ============================================
// INICIALIZAR LISTENERS DE MÓDULOS
// ============================================
try {
  const { setupInventoryListeners } = require('./modules/inventory/listeners');
  setupInventoryListeners();
  console.log('✅ Inventory listeners activados');
} catch (error) {
  console.log('⚠️ Inventory listeners no disponibles:', error.message);
}

try {
  const { setupAccountingListeners } = require('./modules/accounting/listeners');
  setupAccountingListeners();
  console.log('✅ Accounting listeners activados');
} catch (error) {
  console.log('⚠️ Accounting listeners no disponibles:', error.message);
}

// ============================================
// RUTAS
// ============================================
app.get('/api/test', (req, res) => {
  res.json({ message: 'Servidor de Gestión (Inventario/POS/Contabilidad) funcionando 🚀' });
});

// Auth & Core
app.use('/api/auth', require('./modules/login/routes/auth'));
app.use('/api/config', require('./modules/core/routes/config'));

// Gestión (Inventario, Productos, Categorías, Proveedores, Marcas)
app.use('/api/categories', require('./modules/inventory/routes/categories'));
app.use('/api/products', require('./modules/inventory/routes/products'));
app.use('/api/inventory', require('./modules/inventory/routes/inventory'));
app.use('/api/suppliers', require('./modules/inventory/routes/suppliers'));
app.use('/api/brands', require('./modules/inventory/routes/brands'));

// Contabilidad y POS
app.use('/api/accounting', require('./modules/accounting/routes/accounting'));
app.use('/api/pos', require('./modules/pos/routes/pos'));
app.use('/api/employees', require('./modules/admin/routes/employees'));
app.use('/api/audit', require('./modules/admin/routes/audit'));

// ============================================
// SOCKET.IO - USUARIOS CONECTADOS Y ESCÁNER MÓVIL
// ============================================
const connectedUsers = new Map();

io.on('connection', (socket) => {
  console.log('🔌 Cliente conectado:', socket.id);

  // Registro general de notificaciones
  socket.on('register-user', (userId) => {
    if (userId) {
      connectedUsers.set(userId.toString(), socket.id);
      socket.join(`user-${userId}`);
      console.log(`✅ Usuario ${userId} conectado`);
    }
  });

  // ==========================================
  // EMPAREJAMIENTO PC-MÓVIL (ESCÁNER)
  // ==========================================
  // La PC crea o se une a una sala de sesión
  socket.on('join-pos-session', (sessionId) => {
    socket.join(`pos-${sessionId}`);
    console.log(`💻 PC unida a sesión POS: ${sessionId}`);
  });

  // El Celular se une a la misma sala usando el QR
  socket.on('join-scanner-session', (sessionId) => {
    socket.join(`pos-${sessionId}`);
    console.log(`📱 Móvil unido a sesión POS: ${sessionId}`);
    // Avisar a la PC que el celular está listo
    socket.to(`pos-${sessionId}`).emit('scanner-connected', { success: true });
  });

  // El Celular escanea un código y lo envía a la PC
  socket.on('send-barcode', (data) => {
    const { sessionId, barcode } = data;
    console.log(`📡 Código de barras ${barcode} enviado a sesión ${sessionId}`);
    // Reenviar a todos en la sala (incluyendo la PC)
    socket.to(`pos-${sessionId}`).emit('barcode-received', { barcode });
  });

  socket.on('disconnect', () => {
    console.log('❌ Cliente desconectado:', socket.id);

    for (let [userId, socketId] of connectedUsers.entries()) {
      if (socketId === socket.id) {
        connectedUsers.delete(userId);
        console.log(`🧹 Usuario ${userId} eliminado`);
        break;
      }
    }
  });
});

// ============================================
// FUNCIÓN GLOBAL DE NOTIFICACIONES
// ============================================
const sendNotification = (userId, notification) => {
  const socketId = connectedUsers.get(userId);

  if (socketId) {
    io.to(socketId).emit('new-notification', notification);
    console.log(`📨 Notificación enviada a ${userId}`);
    return true;
  }

  console.log(`⚠️ Usuario ${userId} no conectado`);
  return false;
};

app.set('sendNotification', sendNotification);
app.set('io', io);

// ============================================
// MANEJO DE ERRORES GLOBAL
// ============================================
app.use((err, req, res, next) => {
  console.error('💥 Error detectado:', err);

  // Error de validación de Mongoose
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(val => val.message);
    return res.status(400).json({ error: 'Error de validación', details: messages });
  }

  // Error de ID inválido de MongoDB (CastError)
  if (err.name === 'CastError') {
    return res.status(404).json({ error: `Recurso no encontrado: ID inválido (${err.value})` });
  }

  // Error de duplicado en MongoDB (MongoError / MongoServerError)
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(400).json({ error: `Ya existe un registro con ese valor en el campo: ${field}` });
  }

  // Error de JWT
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ error: 'Token inválido. Por favor, inicia sesión de nuevo.' });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ error: 'Tu sesión ha expirado. Inicia sesión nuevamente.' });
  }

  // Error por defecto
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    error: err.message || 'Error interno del servidor',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// ============================================
// SERVIDOR
// ============================================
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 Servidor de Gestión corriendo en puerto ${PORT}`);
});
