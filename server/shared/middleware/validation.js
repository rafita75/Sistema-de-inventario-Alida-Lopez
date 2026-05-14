// server/shared/middleware/validation.js
const mongoose = require('mongoose');
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
function isVariantProduct(req) {
  return req.body.hasVariants === true || req.body.hasVariants === 'true';
}

function isNonNegativeNumber(value) {
  if (value === '' || value === null || value === undefined) return false;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) && numberValue >= 0;
}

function optionalMongoId(field, label) {
  return body(field).optional({ nullable: true, checkFalsy: true }).custom((value) => {
    const rawValue = typeof value === 'object' && value?._id ? value._id : value;
    if (!mongoose.Types.ObjectId.isValid(rawValue)) {
      throw new Error(`${label} invalida`);
    }
    return true;
  });
}

const validateProduct = [
  body('name').trim().notEmpty().withMessage('El nombre es requerido'),
  body('price').custom((value, { req }) => {
    if (isVariantProduct(req)) return true;
    if (!isNonNegativeNumber(value)) {
      throw new Error('El precio debe ser un numero mayor o igual a cero');
    }
    return true;
  }),
  body('stock').custom((value, { req }) => {
    if (isVariantProduct(req)) return true;
    if (!isNonNegativeNumber(value)) {
      throw new Error('El stock debe ser un numero mayor o igual a cero');
    }
    return true;
  }),
  optionalMongoId('categoryId', 'Categoria'),
  optionalMongoId('brandId', 'Marca'),
  optionalMongoId('supplierId', 'Proveedor'),
  body('sku').optional({ checkFalsy: true }).trim().isLength({ min: 3 }).withMessage('SKU muy corto'),
  body('variants').custom((variants, { req }) => {
    if (!isVariantProduct(req)) return true;
    if (!Array.isArray(variants) || variants.length === 0) {
      throw new Error('Agrega al menos una variante');
    }

    variants.forEach((variant, index) => {
      const number = index + 1;
      if (!variant?.name || !String(variant.name).trim()) {
        throw new Error(`La variante ${number} necesita nombre`);
      }
      if (!isNonNegativeNumber(variant.price)) {
        throw new Error(`La variante ${number} necesita precio valido`);
      }
      if (!isNonNegativeNumber(variant.stock)) {
        throw new Error(`La variante ${number} necesita stock valido`);
      }
      if (variant.purchasePrice !== undefined && variant.purchasePrice !== '' && !isNonNegativeNumber(variant.purchasePrice)) {
        throw new Error(`La variante ${number} tiene precio de compra invalido`);
      }
      if (variant.minStock !== undefined && variant.minStock !== '' && !isNonNegativeNumber(variant.minStock)) {
        throw new Error(`La variante ${number} tiene stock minimo invalido`);
      }
    });

    return true;
  }),
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
