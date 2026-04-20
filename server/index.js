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
// SOCKET.IO - AUTENTICACIÓN Y EVENTOS
// ============================================
const jwt = require('jsonwebtoken');

io.use((socket, next) => {
  const token = socket.handshake.auth.token || socket.handshake.query.token;
  
  if (!token) {
    return next(new Error('Autenticación requerida'));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = decoded;
    next();
  } catch (err) {
    next(new Error('Token inválido'));
  }
});

io.on('connection', (socket) => {
  console.log(`🔌 Cliente conectado: ${socket.id} (Usuario: ${socket.user.id})`);

  // Registro en sala privada del usuario
  const roomName = `user-${socket.user.id}`;
  socket.join(roomName);
  console.log(`✅ Usuario ${socket.user.id} unido a su sala privada`);

  // ==========================================
  // EMPAREJAMIENTO PC-MÓVIL (Escáner Automático)
  // ==========================================
  socket.on('send-barcode', (data) => {
    const { barcode } = data;
    if (barcode) {
      // Usamos el ID del usuario autenticado en el socket, no el que venga en el body
      const roomName = `user-${socket.user.id}`;
      socket.to(roomName).emit('barcode-received', { barcode });
      console.log(`📡 Código ${barcode} enviado a la sala: ${roomName}`);
    }
  });

  socket.on('disconnect', () => {
    console.log('❌ Cliente desconectado:', socket.id);
  });
});

// ============================================
// FUNCIÓN GLOBAL DE NOTIFICACIONES (SOCKET)
// ============================================
const sendNotification = (userId, notification) => {
  const roomName = `user-${userId}`;
  io.to(roomName).emit('new-notification', notification);
  console.log(`📨 Notificación de Socket enviada a la sala: ${roomName}`);
  return true;
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
