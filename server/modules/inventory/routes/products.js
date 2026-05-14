// server/modules/inventory/routes/products.js
const express = require('express');
const mongoose = require('mongoose');
const Product = require('../models/Product');
const auth = require('../../login/middleware/auth');
const { validateProduct } = require('../../../shared/middleware/validation');
const { logAudit } = require('../../core/utils/logger');
const { requirePermission } = require('../../../shared/middleware/permissions');

const router = express.Router();

function asBoolean(value) {
  return value === true || value === 'true';
}

function toNonNegativeNumber(value, fallback = 0) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return parsed;
}

function toNonNegativeInteger(value, fallback = 0) {
  return Math.floor(toNonNegativeNumber(value, fallback));
}

function normalizeOptionalId(value) {
  if (!value) return null;
  if (typeof value === 'object' && value._id) return value._id;
  return value;
}

function normalizeVariant(variant = {}) {
  const images = Array.isArray(variant.images) ? variant.images : [];
  const cleanVariant = {
    name: String(variant.name || '').trim(),
    price: toNonNegativeNumber(variant.price),
    purchasePrice: toNonNegativeNumber(variant.purchasePrice),
    stock: toNonNegativeInteger(variant.stock),
    minStock: toNonNegativeInteger(variant.minStock, 5),
    sku: String(variant.sku || '').trim(),
    barcode: String(variant.barcode || '').trim(),
    image: variant.image || images[0]?.url || '',
    stockAlertDisabled: variant.stockAlertDisabled === true,
    stockAlertDisabledAt: variant.stockAlertDisabledAt || null
  };

  if (variant._id && mongoose.Types.ObjectId.isValid(variant._id)) {
    cleanVariant._id = variant._id;
  }

  return cleanVariant;
}

function getLowestPositivePrice(variants) {
  const prices = variants.map((variant) => variant.price).filter((price) => price > 0);
  return prices.length > 0 ? Math.min(...prices) : 0;
}

function getFirstVariantImage(variants) {
  return variants.find((variant) => variant.image)?.image || '';
}

function normalizeProductPayload(payload, { keepSku = true } = {}) {
  const productData = { ...payload };
  const hasVariants = asBoolean(productData.hasVariants);

  delete productData._id;
  delete productData.createdAt;
  delete productData.updatedAt;
  delete productData.__v;

  productData.brandId = normalizeOptionalId(productData.brandId);
  productData.supplierId = normalizeOptionalId(productData.supplierId);
  productData.categoryId = normalizeOptionalId(productData.categoryId);
  productData.hasVariants = hasVariants;
  productData.stockAlertDisabled = productData.stockAlertDisabled === true;
  productData.stockAlertDisabledAt = productData.stockAlertDisabledAt || null;

  if (!keepSku || !productData.sku) {
    delete productData.sku;
  }

  if (!productData.slug) {
    delete productData.slug;
  }

  if (!productData.barcode) {
    delete productData.barcode;
  }

  if (hasVariants) {
    productData.variants = Array.isArray(productData.variants)
      ? productData.variants.map(normalizeVariant)
      : [];
    productData.stock = productData.variants.reduce((sum, variant) => sum + variant.stock, 0);
    productData.price = getLowestPositivePrice(productData.variants);
    productData.purchasePrice = toNonNegativeNumber(productData.purchasePrice);
    productData.minStock = toNonNegativeInteger(productData.minStock, 5);
    productData.thumbnail = productData.thumbnail || getFirstVariantImage(productData.variants);
  } else {
    productData.variants = [];
    productData.price = toNonNegativeNumber(productData.price);
    productData.purchasePrice = toNonNegativeNumber(productData.purchasePrice);
    productData.stock = toNonNegativeInteger(productData.stock);
    productData.minStock = toNonNegativeInteger(productData.minStock, 5);
  }

  return productData;
}

function calculateInitialInventoryCost(product) {
  if (product.hasVariants) {
    return product.variants.reduce((total, variant) => {
      return total + ((variant.purchasePrice || 0) * (variant.stock || 0));
    }, 0);
  }

  return (product.purchasePrice || 0) * (product.stock || 0);
}

function buildInitialInventoryNotes(product) {
  if (!product.hasVariants) {
    return `Producto nuevo. Cantidad: ${product.stock} x Q${product.purchasePrice} = Q${product.purchasePrice * product.stock}`;
  }

  const detail = product.variants
    .filter((variant) => variant.stock > 0 && variant.purchasePrice > 0)
    .map((variant) => `${variant.name}: ${variant.stock} x Q${variant.purchasePrice}`)
    .join('; ');

  return `Producto nuevo con variantes. ${detail || 'Sin costo inicial registrado'}`;
}

// ============================================
// RUTAS DE PRODUCTOS
// ============================================

router.get('/', auth, requirePermission('viewProducts'), async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '', brand, supplier, stockStatus, showInactive } = req.query;
    
    // Si showInactive es true, no filtramos por isActive: true (mostramos todos)
    // Si es false o no viene, solo mostramos los activos
    const query = asBoolean(showInactive) ? {} : { isActive: true };
    const filterConditions = [];
    
    if (search) {
      filterConditions.push({ $or: [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
        { barcode: { $regex: search, $options: 'i' } },
        { "variants.name": { $regex: search, $options: 'i' } },
        { "variants.sku": { $regex: search, $options: 'i' } },
        { "variants.barcode": { $regex: search, $options: 'i' } }
      ] });
    }

    if (brand) {
      if (!mongoose.Types.ObjectId.isValid(brand)) {
        return res.status(400).json({ error: 'Marca invalida' });
      }
      query.brandId = brand;
    }
    if (supplier) {
      if (!mongoose.Types.ObjectId.isValid(supplier)) {
        return res.status(400).json({ error: 'Proveedor invalido' });
      }
      query.supplierId = supplier;
    }

    if (stockStatus === 'low') {
      filterConditions.push({ $or: [
        { 
          hasVariants: false, 
          stockAlertDisabled: { $ne: true },
          $expr: { $lte: ["$stock", { $ifNull: ["$minStock", 5] }] },
          stock: { $gt: 0 }
        },
        {
          hasVariants: true,
          stockAlertDisabled: { $ne: true },
          "variants.stock": { $gt: 0 },
          $expr: {
            $gt: [
              {
                $size: {
                  $filter: {
                    input: "$variants",
                    as: "v",
                    cond: {
                      $and: [
                        { $ne: ["$$v.stockAlertDisabled", true] },
                        { $gt: ["$$v.stock", 0] },
                        { $lte: ["$$v.stock", { $ifNull: ["$$v.minStock", { $ifNull: ["$minStock", 5] }] }] }
                      ]
                    }
                  }
                }
              },
              0
            ]
          }
        }
      ] });
    } else if (stockStatus === 'empty') {
      filterConditions.push({ $or: [
        { hasVariants: false, stockAlertDisabled: { $ne: true }, stock: { $lte: 0 } },
        { 
          hasVariants: true, 
          stockAlertDisabled: { $ne: true },
          variants: { $elemMatch: { stockAlertDisabled: { $ne: true }, stock: { $lte: 0 } } } 
        }
      ] });
    }

    if (filterConditions.length > 0) {
      query.$and = filterConditions;
    }
    
    const parsedPage = Math.max(parseInt(page, 10) || 1, 1);
    const parsedLimit = Math.max(parseInt(limit, 10) || 20, 1);
    const skip = (parsedPage - 1) * parsedLimit;
    
    const [products, total] = await Promise.all([
      Product.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parsedLimit)
        .populate('categoryId')
        .populate('brandId')
        .populate('supplierId'),
      Product.countDocuments(query)
    ]);
    
    res.json({
      products,
      pagination: {
        total,
        page: parsedPage,
        limit: parsedLimit,
        pages: Math.ceil(total / parsedLimit)
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener productos' });
  }
});

router.post('/', auth, requirePermission('createProducts'), validateProduct, async (req, res) => {
  try {
    const productData = normalizeProductPayload(req.body);
    const product = new Product(productData);
    await product.save();

    await logAudit(req, {
      action: 'CREATE',
      module: 'INVENTORY',
      entityId: product._id,
      entityName: product.name,
      description: `Creó el producto: ${product.name}`,
      newValue: product
    });
    
    const initialInventoryCost = calculateInitialInventoryCost(product);
    if (initialInventoryCost > 0) {
      const Expense = require('../../accounting/models/Expense');
      const expense = new Expense({
        monto: initialInventoryCost,
        categoria: 'insumos',
        descripcion: `Compra inicial de inventario - ${product.name}`,
        comprobante: '',
        recurrente: false,
        notas: buildInitialInventoryNotes(product),
        creadoPor: req.user.id
      });
      await expense.save();
    }
    
    res.status(201).json(product);
  } catch (error) {
    console.error('Error al crear producto:', error);
    res.status(500).json({ error: 'Error al crear producto: ' + error.message });
  }
});

router.put('/:id', auth, requirePermission('editProducts'), validateProduct, async (req, res) => {
  try {
    const productData = normalizeProductPayload(req.body, { keepSku: false });
    
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    const oldPrice = product.price;
    const oldStock = product.stock;

    Object.assign(product, productData);
    await product.save();

    let auditAction = 'UPDATE';
    let auditDesc = `Actualizó el producto: ${product.name}`;

    if (oldPrice !== product.price) {
      auditAction = 'PRICE_CHANGE';
      auditDesc = `Cambió precio de '${product.name}': Q${oldPrice} -> Q${product.price}`;
    } else if (oldStock !== product.stock) {
      auditAction = 'STOCK_ADJUSTMENT';
      auditDesc = `Ajustó stock de '${product.name}': ${oldStock} -> ${product.stock}`;
    }

    await logAudit(req, {
      action: auditAction,
      module: 'INVENTORY',
      entityId: product._id,
      entityName: product.name,
      description: auditDesc,
      oldValue: { price: oldPrice, stock: oldStock },
      newValue: { price: product.price, stock: product.stock }
    });
    
    res.json(product);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar producto' });
  }
});

router.patch('/:id/disable', auth, requirePermission('editProducts'), async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Producto invalido' });
    }

    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    const now = new Date();
    const oldValue = {
      isActive: product.isActive,
      stockAlertDisabled: product.stockAlertDisabled,
      stockAlertDisabledAt: product.stockAlertDisabledAt,
      variants: product.hasVariants ? product.variants.map(v => ({
        _id: v._id,
        stockAlertDisabled: v.stockAlertDisabled,
        stockAlertDisabledAt: v.stockAlertDisabledAt
      })) : []
    };

    // Deshabilitar el producto
    product.isActive = false;
    product.disabledAt = now;
    product.stockAlertDisabled = true;
    product.stockAlertDisabledAt = now;

    // Si tiene variantes, también deshabilitar alertas en ellas
    if (product.hasVariants && Array.isArray(product.variants)) {
      product.variants = product.variants.map(variant => ({
        ...variant.toObject ? variant.toObject() : variant,
        stockAlertDisabled: true,
        stockAlertDisabledAt: now
      }));
    }

    await product.save();

    const newValue = {
      isActive: product.isActive,
      disabledAt: product.disabledAt,
      stockAlertDisabled: product.stockAlertDisabled,
      stockAlertDisabledAt: product.stockAlertDisabledAt,
      variants: product.hasVariants ? product.variants.map(v => ({
        _id: v._id,
        stockAlertDisabled: v.stockAlertDisabled,
        stockAlertDisabledAt: v.stockAlertDisabledAt
      })) : []
    };

    await logAudit(req, {
      action: 'UPDATE',
      module: 'INVENTORY',
      entityId: product._id,
      entityName: product.name,
      description: `Deshabilitó el producto: ${product.name}${product.hasVariants ? ` (con ${product.variants.length} variantes)` : ''}`,
      oldValue,
      newValue
    });

    res.json({ product, message: 'Producto deshabilitado correctamente' });
  } catch (error) {
    console.error('Error al deshabilitar producto:', error);
    res.status(500).json({ error: 'Error al deshabilitar producto: ' + error.message });
  }
});

router.patch('/:id/enable', auth, requirePermission('editProducts'), async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Producto invalido' });
    }

    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    const oldValue = {
      isActive: product.isActive,
      disabledAt: product.disabledAt,
      stockAlertDisabled: product.stockAlertDisabled,
      stockAlertDisabledAt: product.stockAlertDisabledAt,
      variants: product.hasVariants ? product.variants.map(v => ({
        _id: v._id,
        stockAlertDisabled: v.stockAlertDisabled,
        stockAlertDisabledAt: v.stockAlertDisabledAt
      })) : []
    };

    // Re-habilitar el producto
    product.isActive = true;
    product.disabledAt = null;
    product.stockAlertDisabled = false;
    product.stockAlertDisabledAt = null;

    // Si tiene variantes, también re-habilitar alertas en ellas
    if (product.hasVariants && Array.isArray(product.variants)) {
      product.variants = product.variants.map(variant => ({
        ...variant.toObject ? variant.toObject() : variant,
        stockAlertDisabled: false,
        stockAlertDisabledAt: null
      }));
    }

    await product.save();

    const newValue = {
      isActive: product.isActive,
      disabledAt: product.disabledAt,
      stockAlertDisabled: product.stockAlertDisabled,
      stockAlertDisabledAt: product.stockAlertDisabledAt,
      variants: product.hasVariants ? product.variants.map(v => ({
        _id: v._id,
        stockAlertDisabled: v.stockAlertDisabled,
        stockAlertDisabledAt: v.stockAlertDisabledAt
      })) : []
    };

    await logAudit(req, {
      action: 'UPDATE',
      module: 'INVENTORY',
      entityId: product._id,
      entityName: product.name,
      description: `Re-habilitó el producto: ${product.name}${product.hasVariants ? ` (con ${product.variants.length} variantes)` : ''}`,
      oldValue,
      newValue
    });

    res.json({ product, message: 'Producto re-habilitado correctamente' });
  } catch (error) {
    console.error('Error al re-habilitar producto:', error);
    res.status(500).json({ error: 'Error al re-habilitar producto: ' + error.message });
  }
});

router.delete('/:id', auth, requirePermission('deleteProducts'), async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    await logAudit(req, {
      action: 'DELETE',
      module: 'INVENTORY',
      entityId: product._id,
      entityName: product.name,
      description: `Eliminó el producto: ${product.name}`,
      oldValue: product
    });
    
    res.json({ message: 'Producto eliminado' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al eliminar producto' });
  }
});

router.get('/barcode/:code', auth, async (req, res) => {
  try {
    const product = await Product.findOne({ 
      barcode: req.params.code,
      isActive: true 
    }).populate('categoryId');
    
    if (!product) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    
    res.json(product);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al buscar por código de barras' });
  }
});

module.exports = router;
