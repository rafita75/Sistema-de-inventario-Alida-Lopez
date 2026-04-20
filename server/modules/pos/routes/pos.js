const express = require("express");
const mongoose = require('mongoose');
const auth = require("../../login/middleware/auth");
const { requirePermission } = require('../../../shared/middleware/permissions');
const Sale = require('../models/Sale');
const eventBus = require('../../../shared/events');
const EVENTS = require('../../../shared/events.types');
const { sendPushNotification } = require('../../../shared/push-notifications');
const StockMovement = require('../../inventory/models/StockMovement');

// Importar modelos necesarios
const Income = require('../../accounting/models/Income');
const CashMovement = require('../../accounting/models/CashMovement');
const CustomerDebt = require('../../accounting/models/CustomerDebt');
const Product = require('../../inventory/models/Product');

const router = express.Router();

// ============================================
// BUSCAR PRODUCTO POR CÓDIGO DE BARRAS
// ============================================
router.get("/product/barcode/:code", auth, requirePermission('usePOS'), async (req, res) => {
  try {
    const barcode = req.params.code;
    
    // 1. Buscar en producto principal
    let product = await Product.findOne({
      barcode: barcode,
      isActive: true,
    }).populate("categoryId");

    // 2. Si no está en principal, buscar en variantes
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
            variantId: variant._id,
            isVariant: true,
            parentProductId: product._id
          });
        }
      }
      return res.status(404).json({ error: "Producto no encontrado" });
    }

    res.json(product);
  } catch (error) {
    console.error("Error barcode search:", error);
    res.status(500).json({ error: "Error al buscar producto" });
  }
});

// ============================================
// BUSCAR PRODUCTOS (BÚSQUEDA PROFUNDA)
// ============================================
router.get("/search", auth, requirePermission('usePOS'), async (req, res) => {
  try {
    const { query } = req.query;
    if (!query || query.trim().length < 2) return res.json([]);

    const words = query.trim().split(/\s+/).filter(w => w.length > 0);
    
    // Búsqueda que debe coincidir con TODAS las palabras ingresadas (Intersección)
    const searchConditions = words.map(word => ({
      $or: [
        { name: { $regex: word, $options: "i" } },
        { sku: { $regex: word, $options: "i" } },
        { barcode: { $regex: word, $options: "i" } },
        { "variants.name": { $regex: word, $options: "i" } },
        { "variants.sku": { $regex: word, $options: "i" } },
        { "variants.barcode": { $regex: word, $options: "i" } }
      ]
    }));

    const products = await Product.find({
      $and: searchConditions,
      isActive: true,
    })
      .limit(20)
      .populate("categoryId")
      .select('name price stock sku barcode hasVariants variants');

    res.json(products);
  } catch (error) {
    console.error("Error POS search:", error);
    res.status(500).json({ error: "Error en el servidor al buscar" });
  }
});

// ============================================
// OBTENER VARIANTES
// ============================================
router.get("/variants/:productId", auth, requirePermission('usePOS'), async (req, res) => {
  try {
    const product = await Product.findById(req.params.productId);
    if (!product) return res.status(404).json({ error: "Producto no encontrado" });

    res.json({
      hasVariants: product.hasVariants,
      product: { _id: product._id, name: product.name, sku: product.sku },
      variants: product.variants || []
    });
  } catch (error) {
    res.status(500).json({ error: "Error al obtener variantes" });
  }
});

// ============================================
// REGISTRAR VENTA (TRANSACCIÓN COMPLETA)
// ============================================
router.post("/sale", auth, requirePermission('usePOS'), async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { items, clienteNombre, clienteTelefono, paymentMethod, esDeuda } = req.body;

    if (!items || items.length === 0) throw new Error("Carrito vacío");

    let calculatedTotal = 0;
    const validatedItems = [];
    const stockUpdates = [];

    for (const item of items) {
      if (item.quantity <= 0) throw new Error(`Cantidad inválida para ${item.name}`);

      const product = await Product.findById(item.productId).session(session);
      if (!product) throw new Error(`Producto no encontrado: ${item.name}`);

      let price = product.price;
      let sku = product.sku;
      let name = product.name;
      let previousStock, newStock;

      if (item.variantId) {
        const variant = product.variants.id(item.variantId);
        if (!variant) throw new Error(`Variante no encontrada: ${name}`);
        if (variant.price) price = variant.price;
        sku = variant.sku;
        name = `${product.name} - ${variant.name}`;
        
        if (variant.stock < item.quantity) throw new Error(`Sin stock para ${name}`);

        previousStock = variant.stock;
        newStock = previousStock - item.quantity;
        variant.stock = newStock;
        product.stock = product.variants.reduce((sum, v) => sum + v.stock, 0);
      } else {
        if (product.stock < item.quantity) throw new Error(`Sin stock para ${product.name}`);
        previousStock = product.stock;
        newStock = previousStock - item.quantity;
        product.stock = newStock;
      }

      calculatedTotal += price * item.quantity;
      validatedItems.push({
        productId: item.productId,
        variantId: item.variantId || null,
        name, price, quantity: item.quantity, sku
      });

      await product.save({ session });

      stockUpdates.push({
        productId: product._id,
        productName: name,
        type: 'sale',
        quantity: -item.quantity,
        previousStock, newStock,
        reason: `Venta POS - ${clienteNombre || 'Mostrador'}`,
        userId: req.user.id
      });
    }

    const sale = new Sale({
      items: validatedItems,
      subtotal: calculatedTotal,
      total: calculatedTotal,
      paymentMethod,
      clienteNombre: clienteNombre || "Mostrador",
      clienteTelefono: clienteTelefono || "",
      createdBy: req.user.id
    });
    
    await sale.save({ session });

    for (const move of stockUpdates) {
      move.saleId = sale._id;
      move.reason = `Venta #${sale.saleNumber}`;
      await new StockMovement(move).save({ session });
    }

    const income = new Income({
      tipo: "venta_pos",
      invoiceNumber: sale.saleNumber,
      monto: calculatedTotal,
      descripcion: `Venta POS #${sale.saleNumber}`,
      items: validatedItems, 
      metodo: paymentMethod,
      clienteNombre: clienteNombre || "Cliente mostrador",
      esDeuda: esDeuda === true,
      status: esDeuda ? 'debt' : 'completed', 
      creadoPor: req.user.id
    });
    await income.save({ session });

    if (esDeuda) {
      const debt = new CustomerDebt({
        clienteNombre: clienteNombre || "Cliente sin nombre",
        monto: calculatedTotal,
        estado: 'pendiente',
        notas: `Venta #${sale.saleNumber}`
      });
      await debt.save({ session });
      income.notas = `Deuda: ${debt._id}`;
      await income.save({ session });
    } else {
      const lastMovement = await CashMovement.findOne().sort({ fecha: -1 }).session(session);
      const saldoAnterior = lastMovement ? lastMovement.saldoNuevo : 0;
      await CashMovement.create([{
        tipo: "ingreso", monto: calculatedTotal, descripcion: `Venta POS #${sale.saleNumber}`,
        referenciaId: income._id, referenciaModelo: "Income",
        saldoAnterior, saldoNuevo: saldoAnterior + calculatedTotal
      }], { session });
    }

    await session.commitTransaction();
    session.endSession();

    eventBus.emitAsync(EVENTS.SALE_CREATED, {
      saleId: sale._id, saleNumber: sale.saleNumber, items: validatedItems,
      total: calculatedTotal, skipInventoryUpdate: true, skipAccountingUpdate: true
    });

    res.json({ success: true, saleNumber: sale.saleNumber, total: calculatedTotal });

  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ error: error.message || "Error al registrar venta" });
  }
});

module.exports = router;
