// server/middleware/validation.js
const { body, validationResult } = require('express-validator');

// ============================================
// REGLAS DE VALIDACIÓN PARA REGISTRO
// ============================================
const validateRegister = [
  // Validar nombre (mínimo 2 caracteres, solo letras y espacios)
  body('name')
    .trim()
    .isLength({ min: 2 }).withMessage('El nombre debe tener al menos 2 caracteres')
    .matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/).withMessage('El nombre solo puede contener letras')
    .escape(),
  
  // Validar email (formato correcto)
  body('email')
    .trim()
    .isEmail().withMessage('Debe ser un email válido')
    .normalizeEmail() // Convierte a minúsculas, limpia
    .isLength({ max: 100 }).withMessage('El email es demasiado largo'),
  
  // Validar contraseña (mínimo 6 caracteres)
  body('password')
    .isLength({ min: 8 }).withMessage('La contraseña debe tener al menos 6 caracteres')
    .matches(/[A-Z]/).withMessage('La contraseña debe tener al menos una mayúscula')
    .matches(/[0-9]/).withMessage('La contraseña debe tener al menos un número'),
  
  // Validar rol (opcional, solo si viene)
  body('role')
    .optional()
    .isIn(['user']).withMessage('Rol no válido')
];

// ============================================
// REGLAS DE VALIDACIÓN PARA LOGIN
// ============================================
const validateLogin = [
  body('email')
    .trim()
    .isEmail().withMessage('Debe ser un email válido')
    .normalizeEmail(),
  
  body('password')
    .notEmpty().withMessage('La contraseña es requerida')
];

// ============================================
// MIDDLEWARE PARA VERIFICAR ERRORES DE VALIDACIÓN
// ============================================
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    // Devolver solo el primer error para no abrumar
    const firstError = errors.array()[0];
    return res.status(400).json({ 
      error: firstError.msg,
      field: firstError.path 
    });
  }
  
  next();
};

module.exports = {
  validateRegister,
  validateLogin,
  handleValidationErrors
};
