// server/modules/inventory/routes/inventory.js
const express = require('express');
const mongoose = require('mongoose');
const StockMovement = require('../models/StockMovement');
const auth = require('../../login/middleware/auth');
const Product = mongoose.model('Product');
const eventBus = require('../../../shared/events');
const EVENTS = require('../../../shared/events.types');

const router = express.Router();

// ============================================
// FUNCIONES DE VERIFICACIÓN DE PERMISOS
// ============================================
function canViewInventory(req) {
  if (req.user.role === 'admin' || req.user.role === 'superadmin') return true;
  if (req.user.role === 'employee' && req.user.viewInventory) return true;
  return false;
}

function canAdjustStock(req) {
  if (req.user.role === 'admin' || req.user.role === 'superadmin') return true;
  if (req.user.role === 'employee' && req.user.adjustStock) return true;
  return false;
}

function buildMovementQuery(queryParams = {}) {
  const query = {};

  if (queryParams.productId) {
    query.productId = queryParams.productId;
  }

  if (queryParams.type) {
    query.type = queryParams.type;
  }

  if (queryParams.startDate || queryParams.endDate) {
    query.createdAt = {};

    if (queryParams.startDate) {
      query.createdAt.$gte = new Date(queryParams.startDate);
    }

    if (queryParams.endDate) {
      const endDate = new Date(queryParams.endDate);
      endDate.setHours(23, 59, 59, 999);
      query.createdAt.$lte = endDate;
    }
  }

  return query;
}

async function listMovements(req, res) {
  const { limit = 50 } = req.query;
  const query = buildMovementQuery(req.query);

  const movements = await StockMovement.find(query)
    .sort({ createdAt: -1 })
    .limit(parseInt(limit, 10))
    .populate('userId', 'name')
    .populate('saleId', 'saleNumber');

  res.json(movements);
}

// ============================================
// RUTAS DE INVENTARIO
// ============================================

router.get('/low-stock', auth, async (req, res) => {
  try {
    if (!canViewInventory(req)) {
      return res.status(403).json({ error: 'No tienes permiso para ver inventario' });
    }
    
    // Obtenemos todos los productos activos
    const allProducts = await Product.find({ isActive: true }).populate('categoryId');
    
    // Filtramos manualmente para incluir lógica de variantes
    const lowStockItems = allProducts.filter(p => {
      if (p.hasVariants) {
        // Si tiene variantes, vemos si al menos una está baja de stock
        return p.variants.some(v => v.stock <= (v.minStock || p.minStock || 5));
      } else {
        // Si es producto simple
        return p.stock <= (p.minStock || 5);
      }
    });
    
    res.json(lowStockItems);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener productos con stock bajo' });
  }
});

router.get('/summary', auth, async (req, res) => {
  try {
    if (!canViewInventory(req)) {
      return res.status(403).json({ error: 'No tienes permiso para ver inventario' });
    }
    
    const totalProducts = await Product.countDocuments({ isActive: true });
    const productsWithVariants = await Product.find({ hasVariants: true, isActive: true });
    const totalVariants = productsWithVariants.reduce((sum, p) => sum + (p.variants?.length || 0), 0);
    const lowStockVariants = productsWithVariants.reduce((sum, product) => (
      sum + product.variants.filter((variant) => (
        variant.stock > 0 && variant.stock <= (variant.minStock || product.minStock || 5)
      )).length
    ), 0);
    const outOfStockVariants = productsWithVariants.reduce((sum, product) => (
      sum + product.variants.filter((variant) => variant.stock === 0).length
    ), 0);
    
    const lowStockProducts = await Product.countDocuments({
      isActive: true,
      hasVariants: { $ne: true },
      stock: { $gt: 0 },
      $expr: { $lte: ['$stock', { $ifNull: ['$minStock', 5] }] }
    });
    const outOfStock = await Product.countDocuments({
      isActive: true,
      hasVariants: { $ne: true },
      stock: 0
    });
    
    const totalValue = await Product.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: null, total: { $sum: { $multiply: ['$price', '$stock'] } } } }
    ]);
    
    res.json({
      totalProducts,
      totalVariants,
      lowStockProducts,
      lowStockVariants,
      outOfStockVariants,
      outOfStock,
      totalValue: totalValue[0]?.total || 0
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener resumen' });
  }
});

// ============================================
// AJUSTAR STOCK (REFACTORIZADO - Emite evento)
// ============================================
router.put('/products/:id/stock', auth, async (req, res) => {
  try {
    if (!canAdjustStock(req)) {
      return res.status(403).json({ error: 'No tienes permiso para ajustar stock' });
    }
    
    const { quantity, reason, purchasePrice } = req.body;
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    
    const previousStock = product.stock;
    const newStock = previousStock + quantity;
    
    if (newStock < 0) {
      return res.status(400).json({ error: 'No se puede reducir el stock por debajo de 0' });
    }
    
    product.stock = newStock;
    await product.save();
    
    // Registrar movimiento de stock
    const movement = new StockMovement({
      productId: product._id,
      productName: product.name,
      type: 'adjustment',
      quantity,
      previousStock,
      newStock,
      reason: reason || `Ajuste manual: ${quantity > 0 ? '+' : ''}${quantity}`,
      userId: req.user.id
    });
    await movement.save();
    
    // 👈 EMITIR EVENTO para que Accounting registre el gasto
    if (quantity > 0 && purchasePrice && purchasePrice > 0) {
      await eventBus.emitAsync(EVENTS.EXPENSE_CREATED, {
        monto: quantity * purchasePrice,
        categoria: 'insumos',
        descripcion: `Compra de inventario - ${product.name}`,
        notas: `Cantidad: ${quantity} x Q${purchasePrice} = Q${quantity * purchasePrice}. Motivo: ${reason || 'Reposición de stock'}`,
        creadoPor: req.user.id
      });
    }
    
    // 👈 EMITIR EVENTO para notificar ajuste de stock
    await eventBus.emitAsync(EVENTS.STOCK_ADJUSTED, {
      productId: product._id,
      productName: product.name,
      quantity,
      previousStock,
      newStock,
      reason: reason || `Ajuste manual: ${quantity > 0 ? '+' : ''}${quantity}`,
      userId: req.user.id
    });
    
    res.json({ product, movement });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al ajustar stock' });
  }
});

router.get('/movements', auth, async (req, res) => {
  try {
    if (!canViewInventory(req)) {
      return res.status(403).json({ error: 'No tienes permiso para ver inventario' });
    }

    await listMovements(req, res);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener historial' });
  }
});

router.get('/movements/filtered', auth, async (req, res) => {
  try {
    if (!canViewInventory(req)) {
      return res.status(403).json({ error: 'No tienes permiso para ver inventario' });
    }

    await listMovements(req, res);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al filtrar historial' });
  }
});

router.get('/sales', auth, async (req, res) => {
  try {
    if (!canViewInventory(req)) {
      return res.status(403).json({ error: 'No tienes permiso para ver inventario' });
    }
    
    const { limit = 50 } = req.query;
    const Income = mongoose.model('Income');
    
    const sales = await Income.find({ 
      tipo: 'venta_pos',
      items: { $exists: true, $not: { $size: 0 } }
    })
    .sort({ fecha: -1 })
    .limit(parseInt(limit))
    .populate('creadoPor', 'name');
    
    res.json(sales);
  } catch (error) {
    console.error('Error al obtener ventas de inventario:', error);
    res.status(500).json({ error: 'Error al obtener datos de ventas' });
  }
});

router.get('/low-stock-variants', auth, async (req, res) => {
  try {
    if (!canViewInventory(req)) {
      return res.status(403).json({ error: 'No tienes permiso para ver inventario' });
    }
    
    const products = await Product.find({ hasVariants: true, isActive: true });
    const lowStockVariants = [];
    
    for (const product of products) {
      for (const variant of product.variants) {
        const minStock = variant.minStock || product.minStock || 5;
        if (variant.stock <= minStock) {
          lowStockVariants.push({
            productId: product._id,
            productName: product.name,
            variantId: variant._id,
            variantName: variant.name,
            stock: variant.stock,
            minStock: minStock,
            sku: variant.sku,
            purchasePrice: variant.purchasePrice || product.purchasePrice || 0
          });
        }
      }
    }
    
    res.json(lowStockVariants);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener variantes con stock bajo' });
  }
});

router.put('/variants/:productId/:variantId/stock', auth, async (req, res) => {
  try {
    if (!canAdjustStock(req)) {
      return res.status(403).json({ error: 'No tienes permiso para ajustar stock' });
    }
    
    const { quantity, reason, purchasePrice } = req.body;
    const product = await Product.findById(req.params.productId);
    
    if (!product) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    
    const variant = product.variants.id(req.params.variantId);
    if (!variant) {
      return res.status(404).json({ error: 'Variante no encontrada' });
    }
    
    const previousStock = variant.stock;
    const newStock = previousStock + quantity;
    
    if (newStock < 0) {
      return res.status(400).json({ error: 'No se puede reducir el stock por debajo de 0' });
    }
    
    variant.stock = newStock;
    
    const totalStock = product.variants.reduce((sum, v) => sum + v.stock, 0);
    product.stock = totalStock;
    
    await product.save();
    
    const movement = new StockMovement({
      productId: product._id,
      productName: `${product.name} - ${variant.name}`,
      type: 'adjustment',
      quantity,
      previousStock,
      newStock,
      reason: reason || `Ajuste manual: ${quantity > 0 ? '+' : ''}${quantity}`,
      userId: req.user.id
    });
    await movement.save();
    
    if (quantity > 0 && purchasePrice && purchasePrice > 0) {
      await eventBus.emitAsync(EVENTS.EXPENSE_CREATED, {
        monto: quantity * purchasePrice,
        categoria: 'insumos',
        descripcion: `Compra de inventario - ${product.name} - ${variant.name}`,
        notas: `Cantidad: ${quantity} x Q${purchasePrice} = Q${quantity * purchasePrice}`,
        creadoPor: req.user.id
      });
    }
    
    res.json({ product, variant, movement });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al ajustar stock de variante' });
  }
});

router.get('/stats/movements', auth, async (req, res) => {
  try {
    if (!canViewInventory(req)) {
      return res.status(403).json({ error: 'No tienes permiso para ver inventario' });
    }
    
    const { days = 7 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const movements = await StockMovement.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      { $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        sales: { $sum: { $cond: [{ $eq: ["$type", "sale"] }, { $abs: "$quantity" }, 0] } },
        purchases: { $sum: { $cond: [{ $eq: ["$type", "purchase"] }, "$quantity", 0] } },
        adjustments: { $sum: { $cond: [{ $eq: ["$type", "adjustment"] }, "$quantity", 0] } }
      } },
      { $sort: { _id: 1 } }
    ]);
    
    res.json(movements);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
});

module.exports = router;
