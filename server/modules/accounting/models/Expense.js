// server/models/Expense.js
const mongoose = require('mongoose');

const ExpenseSchema = new mongoose.Schema({
  monto: {
    type: Number,
    required: true,
    min: 0
  },
  categoria: {
    type: String,
    enum: ['insumos', 'servicios', 'renta', 'sueldos', 'publicidad', 'transporte', 'otros'],
    required: true,
    default: 'insumos'
  },
  descripcion: {
    type: String,
    required: true
  },
  comprobante: {
    type: String,
    default: ''
  },
  recurrente: {
    type: Boolean,
    default: false
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

module.exports = mongoose.model('Expense', ExpenseSchema);