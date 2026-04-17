// server/models/CustomerDebt.js
const mongoose = require('mongoose');

const CustomerDebtSchema = new mongoose.Schema({
  clienteId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  clienteNombre: {
    type: String,
    required: true
  },
  clienteTelefono: {
    type: String
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

module.exports = mongoose.model('CustomerDebt', CustomerDebtSchema);