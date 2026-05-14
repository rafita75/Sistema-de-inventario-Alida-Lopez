// server/models/Income.js
const mongoose = require('mongoose');

const IncomeSchema = new mongoose.Schema({
  tipo: {
    type: String,
    enum: ['venta_rapida', 'manual', 'venta_pos'],
    default: 'venta_pos'
  },
  invoiceNumber: {
    type: String,
    unique: true,
    sparse: true // Para ventas manuales que no tengan factura
  },
  monto: {
    type: Number,
    required: true,
    min: 0
  },
  // Detalle de productos para la factura
  items: [{
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    variantId: { type: mongoose.Schema.Types.ObjectId, default: null },
    name: String,
    quantity: Number,
    price: Number,
    sku: String
  }],
  descripcion: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['completed', 'cancelled', 'debt', 'collected'],
    default: 'completed'
  },
  metodo: {
    type: String,
    enum: ['efectivo', 'transferencia', 'tarjeta'],
    default: 'efectivo'
  },
  clienteNombre: {
    type: String,
    default: ''
  },
  clienteTelefono: {
    type: String,
    default: ''
  },
  esDeuda: {
    type: Boolean,
    default: false
  },
  pedidoOnlineId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order'
  },
  notas: {
    type: String,
    default: ''
  },
  fecha: {
    type: Date,
    default: Date.now
  },
  creadoPor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
});

module.exports = mongoose.model('Income', IncomeSchema);
