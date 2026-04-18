// server/modules/pos/routes/pos.js
const express = require("express");
const mongoose = require('mongoose');
const Product = mongoose.model('Product');
const auth = require("../../login/middleware/auth");
const Sale = require('../models/Sale');
const eventBus = require('../../../shared/events');
const EVENTS = require('../../../shared/events.types');

const router = express.Router();

function canUsePOS(req) {
  if (req.user.role === 'admin') return true;
  if (req.user.role === 'employee' && req.user.usePOS) return true;
  return false;
}

// ============================================
// BUSCAR PRODUCTO POR CÓDIGO DE BARRAS (incluye variantes)
// ============================================
router.get("/product/barcode/:code", auth, async (req, res) => {
  try {
    if (!canUsePOS(req)) {
      return res.status(403).json({ error: "No autorizado" });
    }

    const barcode = req.params.code;
    
    let product = await Product.findOne({
      barcode: barcode,
      isActive: true,
    }).populate("categoryId");

    if (!product) {
      product = await Product.findOne({
        "variants.barcode": barcode,
        isActive: true,
      }).populate("categoryId");
      
      if (product) {
        const variant = product.variants.find(v => v.barcode === barcode);
        
        if (variant) {
          return res.json({
            _id: product._id,
            name: `${product.name} - ${variant.name}`,
            price: variant.price,
            stock: variant.stock,
            sku: variant.sku,
            barcode: variant.barcode,
            hasVariants: true,
            isVariant: true,
            variantId: variant._id,
            parentProductId: product._id,
            parentProductName: product.name
          });
        }
      }
    }

    if (!product) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }

    res.json({
      _id: product._id,
      name: product.name,
      price: product.price,
      stock: product.stock,
      sku: product.sku,
      barcode: product.barcode,
      hasVariants: product.hasVariants || false,
      variants: product.variants || [],
      isVariant: false
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al buscar producto" });
  }
});

// ============================================
// BUSCAR PRODUCTOS POR NOMBRE
// ============================================
router.get("/products/search", auth, async (req, res) => {
  try {
    if (!canUsePOS(req)) {
      return res.status(403).json({ error: "No autorizado" });
    }

    const { q, limit = 20 } = req.query;
    const query = { isActive: true };

    if (q) {
      query.$or = [
        { name: { $regex: q, $options: "i" } },
        { sku: { $regex: q, $options: "i" } },
        { barcode: { $regex: q, $options: "i" } }
      ];
    }

    const products = await Product.find(query)
      .limit(parseInt(limit))
      .sort({ name: 1 });

    const productsWithVariants = products.map(product => ({
      _id: product._id,
      name: product.name,
      price: product.price || 0,
      stock: product.stock || 0,
      sku: product.sku || '',
      barcode: product.barcode || '',
      hasVariants: product.hasVariants || false,
      variantsCount: product.variants?.length || 0,
      variants: product.variants || []
    }));

    res.json(productsWithVariants);
  } catch (error) {
    console.error("❌ Error en búsqueda POS:", error);
    res.status(500).json({ error: "Error al buscar productos" });
  }
});

// ============================================
// OBTENER VARIANTES DE UN PRODUCTO
// ============================================
router.get("/product/:productId/variants", auth, async (req, res) => {
  try {
    if (!canUsePOS(req)) {
      return res.status(403).json({ error: "No autorizado" });
    }

    const product = await Product.findById(req.params.productId);

    if (!product) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }

    if (!product.hasVariants || !product.variants || product.variants.length === 0) {
      return res.json({
        hasVariants: false,
        product: {
          _id: product._id,
          name: product.name,
          price: product.price,
          stock: product.stock,
          sku: product.sku
        },
        variants: []
      });
    }

    res.json({
      hasVariants: true,
      product: {
        _id: product._id,
        name: product.name,
        sku: product.sku
      },
      variants: product.variants.map(v => ({
        _id: v._id,
        name: v.name,
        price: v.price || product.price,
        stock: v.stock,
        sku: v.sku,
        image: v.image
      }))
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error al obtener variantes" });
  }
});

// ============================================
// REGISTRAR VENTA POS (REFACTORIZADO - SOLO EMITE EVENTOS)
// ============================================
router.post("/sale", auth, async (req, res) => {
  try {
    if (!canUsePOS(req)) {
      return res.status(403).json({ error: "No autorizado" });
    }

    const { items, clienteNombre, clienteTelefono, paymentMethod, total, esDeuda } = req.body;

    // 1. Validar stock antes de procesar (solo lectura, no modificación)
    for (const item of items) {
      if (item.variantId) {
        const product = await Product.findById(item.productId);
        if (!product) {
          return res.status(404).json({ error: `Producto no encontrado: ${item.name}` });
        }
        const variant = product.variants.id(item.variantId);
        if (!variant) {
          return res.status(404).json({ error: `Variante no encontrada: ${item.name}` });
        }
        if (variant.stock < item.quantity) {
          return res.status(400).json({
            error: `Stock insuficiente para "${item.name}". Disponible: ${variant.stock}`,
          });
        }
      } else {
        const product = await Product.findById(item.productId);
        if (!product) {
          return res.status(404).json({ error: `Producto no encontrado: ${item.name}` });
        }
        if (product.stock < item.quantity) {
          return res.status(400).json({
            error: `Stock insuficiente para "${product.name}". Disponible: ${product.stock}`,
          });
        }
      }
    }

    // 2. Crear la venta (modelo Sale)
    const sale = new Sale({
      items: items.map(item => ({
        productId: item.productId,
        variantId: item.variantId || null,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        sku: item.sku || ''
      })),
      subtotal: total,
      total,
      paymentMethod,
      clienteNombre: clienteNombre || "Mostrador",
      clienteTelefono: clienteTelefono || "",
      createdBy: req.user.id
    });
    
    await sale.save();

    // 3. EMITIR EVENTO - Inventory y Accounting escucharán
    await eventBus.emitAsync(EVENTS.SALE_CREATED, {
      saleId: sale._id,
      saleNumber: sale.saleNumber,
      items: items.map(item => ({
        productId: item.productId,
        variantId: item.variantId,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        sku: item.sku
      })),
      total,
      paymentMethod,
      clienteNombre: clienteNombre || "Mostrador",
      clienteTelefono: clienteTelefono || "",
      esDeuda: esDeuda === true,
      createdBy: req.user.id,
      createdAt: new Date()
    });

    // 4. Notificaciones (socket.io y Push)
    try {
      const sendNotification = req.app.get('sendNotification');
      const User = mongoose.model('User');
      const admins = await User.find({ role: 'admin' });
      
      const notification = {
        id: sale._id,
        type: 'sale',
        title: esDeuda ? '📝 Nueva venta a crédito' : '💰 Nueva venta registrada',
        body: `${sale.clienteNombre || 'Mostrador'} - Total: Q${sale.total.toLocaleString()}${esDeuda ? ' (Crédito)' : ''}`,
        data: {
          saleNumber: sale.saleNumber,
          total: sale.total,
          items: sale.items.length,
          url: '/inventario'
        },
        timestamp: new Date()
      };
      
      for (const admin of admins) {
        // Notificación en tiempo real (Socket)
        if (sendNotification) {
          sendNotification(admin._id.toString(), notification);
        }
        
        // ENVIAR PUSH REAL (Segundo plano)
        sendPushNotification(admin._id.toString(), {
          title: notification.title,
          body: notification.body,
          icon: '/logo1.png',
          data: {
            url: '/inventario'
          }
        }).catch(err => console.error('Error enviando push individual:', err.message));
      }
    } catch (notifError) {
      console.error('⚠️ Error no crítico en sistema de notificaciones:', notifError.message);
      // No lanzamos error, permitimos que la respuesta de éxito continúe
    }

    res.json({
      success: true,
      message: "Venta registrada correctamente",
      saleNumber: sale.saleNumber,
      total,
    });

  } catch (error) {
    console.error("Error al registrar venta POS:", error);
    res.status(500).json({ error: "Error al registrar venta" });
  }
});

module.exports = router;
