// server/shared/middleware/validation.js
const { body, validationResult } = require('express-validator');

// ============================================
// MANEJADOR CENTRAL DE ERRORES DE VALIDACIÓN
// ============================================
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const firstError = errors.array()[0];
    return res.status(400).json({ 
      error: firstError.msg,
      field: firstError.path 
    });
  }
  next();
};

// ============================================
// VALIDACIONES DE PRODUCTOS
// ============================================
const validateProduct = [
  body('name').trim().notEmpty().withMessage('El nombre es requerido'),
  body('price').isNumeric().withMessage('El precio debe ser un número').custom(v => v >= 0).withMessage('El precio no puede ser negativo'),
  body('stock').isNumeric().withMessage('El stock debe ser un número').custom(v => v >= 0).withMessage('El stock no puede ser negativo'),
  body('categoryId').optional({ checkFalsy: true }).isMongoId().withMessage('Categoría inválida'),
  body('sku').optional({ checkFalsy: true }).trim().isLength({ min: 3 }).withMessage('SKU muy corto'),
  handleValidationErrors
];

// ============================================
// VALIDACIONES DE CATEGORÍAS
// ============================================
const validateCategory = [
  body('name').trim().notEmpty().withMessage('El nombre es requerido'),
  handleValidationErrors
];

// ============================================
// VALIDACIONES DE CONTABILIDAD (Gastos/Ingresos)
// ============================================
const validateAccountingEntry = [
  body('monto').isNumeric().withMessage('El monto debe ser un número').custom(v => v > 0).withMessage('El monto debe ser mayor a cero'),
  body('descripcion').trim().notEmpty().withMessage('La descripción es requerida'),
  handleValidationErrors
];

// ============================================
// VALIDACIONES DE VENTA POS
// ============================================
const validateSale = [
  body('items').isArray({ min: 1 }).withMessage('Debe incluir al menos un producto'),
  body('items.*.productId').isMongoId().withMessage('ID de producto inválido'),
  body('items.*.quantity').isNumeric().custom(v => v > 0).withMessage('La cantidad debe ser mayor a cero'),
  body('total').isNumeric().withMessage('El total debe ser un número'),
  body('paymentMethod').isIn(['efectivo', 'tarjeta', 'transferencia']).withMessage('Método de pago inválido'),
  handleValidationErrors
];

module.exports = {
  validateProduct,
  validateCategory,
  validateAccountingEntry,
  validateSale,
  handleValidationErrors
};
