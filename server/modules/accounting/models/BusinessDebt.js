// server/models/BusinessDebt.js
const mongoose = require('mongoose');

const BusinessDebtSchema = new mongoose.Schema({
  proveedor: {
    type: String,
    required: true
  },
  monto: {
    type: Number,
    required: true,
    min: 0
  },
  fecha: {
    type: Date,
    default: Date.now
  },
  fechaLimite: {
    type: Date
  },
  estado: {
    type: String,
    enum: ['pendiente', 'pagado'],
    default: 'pendiente'
  },
  fechaPago: {
    type: Date
  },
  notas: {
    type: String,
    default: ''
  }
});

module.exports = mongoose.model('BusinessDebt', BusinessDebtSchema);