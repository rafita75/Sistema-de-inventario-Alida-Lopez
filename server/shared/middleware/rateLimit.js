// server/middleware/rateLimit.js
const rateLimit = require('express-rate-limit');

// ============================================
// LÍMITE PARA LOGIN (evita ataques de fuerza bruta)
// ============================================
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // Máximo 5 intentos por IP
  message: { error: 'Demasiados intentos de inicio de sesión. Intenta de nuevo en 15 minutos' },
  standardHeaders: true,
  legacyHeaders: false
});

// ============================================
// LÍMITE PARA REGISTRO (evita creación masiva de cuentas)
// ============================================
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 3, // Máximo 3 registros por IP
  message: { error: 'Demasiados registros. Intenta de nuevo en 1 hora' }
});

// ============================================
// LÍMITE GENERAL (protege toda la API)
// ============================================
const generalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 100, // Máximo 100 peticiones por minuto
  message: { error: 'Demasiadas peticiones. Espera un momento' }
});

module.exports = {
  loginLimiter,
  registerLimiter,
  generalLimiter
};