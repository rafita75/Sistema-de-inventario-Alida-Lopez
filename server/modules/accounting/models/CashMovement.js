// server/models/CashMovement.js
const mongoose = require('mongoose');

const CashMovementSchema = new mongoose.Schema({
  tipo: {
    type: String,
    enum: ['ingreso', 'gasto'],
    required: true
  },
  monto: {
    type: Number,
    required: true
  },
  descripcion: {
    type: String,
    required: true
  },
  referenciaId: {
    type: mongoose.Schema.Types.ObjectId
  },
  referenciaModelo: {
    type: String
  },
  saldoAnterior: {
    type: Number,
    required: true
  },
  saldoNuevo: {
    type: Number,
    required: true
  },
  fecha: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('CashMovement', CashMovementSchema);