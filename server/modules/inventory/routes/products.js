// server/modules/inventory/routes/products.js
const express = require('express');
const Product = require('../models/Product');
const auth = require('../../login/middleware/auth');
const { validateProduct } = require('../../../shared/middleware/validation');
const { logAudit } = require('../../core/utils/logger');
const { requirePermission } = require('../../../shared/middleware/permissions');

const router = express.Router();

// ============================================
// RUTAS DE PRODUCTOS
// ============================================

router.get('/', auth, requirePermission('viewProducts'), async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '', brand, supplier, stockStatus } = req.query;
    const query = { isActive: true };
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
        { barcode: { $regex: search, $options: 'i' } },
        { "variants.sku": { $regex: search, $options: 'i' } },
        { "variants.barcode": { $regex: search, $options: 'i' } }
      ];
    }

    if (brand) query.brandId = brand;
    if (supplier) query.supplierId = supplier;

    if (stockStatus === 'low') {
      query.$or = [
        { 
          hasVariants: false, 
          $expr: { $lte: ["$stock", { $ifNull: ["$minStock", 5] }] },
          stock: { $gt: 0 }
        },
        {
          hasVariants: true,
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
      ];
    } else if (stockStatus === 'empty') {
      query.$or = [
        { hasVariants: false, stock: { $lte: 0 } },
        { 
          hasVariants: true, 
          variants: { $elemMatch: { stock: { $lte: 0 } } } 
        }
      ];
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [products, total] = await Promise.all([
      Product.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('categoryId')
        .populate('brandId')
        .populate('supplierId'),
      Product.countDocuments(query)
    ]);
    
    res.json({
      products,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener productos' });
  }
});

router.post('/', auth, requirePermission('createProducts'), validateProduct, async (req, res) => {
  try {
    const productData = req.body;
    
    if (productData.sku === '' || !productData.sku) {
      delete productData.sku;
    }
    
    if (productData.slug === '' || !productData.slug) {
      delete productData.slug;
    }
    
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
    
    if (product.purchasePrice && product.purchasePrice > 0 && product.stock > 0) {
      const Expense = require('../../accounting/models/Expense');
      const expense = new Expense({
        monto: product.purchasePrice * product.stock,
        categoria: 'insumos',
        descripcion: `Compra inicial de inventario - ${product.name}`,
        comprobante: '',
        recurrente: false,
        notas: `Producto nuevo. Cantidad: ${product.stock} x Q${product.purchasePrice} = Q${product.purchasePrice * product.stock}`,
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
    const productData = { ...req.body };
    delete productData.sku;
    
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    delete productData._id;
    delete productData.createdAt;
    delete productData.updatedAt;

    if (productData.categoryId === '') {
      productData.categoryId = null;
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
