// server/modules/inventory/models/StockMovement.js
const mongoose = require('mongoose');

const StockMovementSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  productName: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['sale', 'purchase', 'adjustment', 'return'],
    required: true
  },
  quantity: {
    type: Number,
    required: true
  },
  previousStock: {
    type: Number,
    required: true
  },
  newStock: {
    type: Number,
    required: true
  },
  reason: {
    type: String,
    default: ''
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  saleId: {  // 👈 NUEVO: referencia a la venta
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Sale',
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('StockMovement', StockMovementSchema);