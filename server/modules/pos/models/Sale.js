// server/modules/pos/models/Sale.js
const mongoose = require('mongoose');

const SaleItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  variantId: { type: mongoose.Schema.Types.ObjectId },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true },
  sku: { type: String }
});

const SaleSchema = new mongoose.Schema({
  saleNumber: { type: String, unique: true },
  items: [SaleItemSchema],
  subtotal: { type: Number, required: true },
  total: { type: Number, required: true },
  paymentMethod: { type: String, enum: ['efectivo', 'transferencia', 'tarjeta'], required: true },
  clienteNombre: { type: String, default: '' },
  clienteTelefono: { type: String, default: '' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now }
});

// Generar número de venta automático
SaleSchema.pre('save', async function() {
  if (this.isNew && !this.saleNumber) {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const timePart = Date.now().toString(36).toUpperCase();
    const randomPart = Math.random().toString(36).slice(2, 5).toUpperCase();
    this.saleNumber = `VTA-${year}${month}-${timePart}-${randomPart}`;
  }
});

module.exports = mongoose.model('Sale', SaleSchema);
