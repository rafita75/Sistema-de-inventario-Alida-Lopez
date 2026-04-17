// server/models/PhysicalCustomer.js
const mongoose = require('mongoose');

const PhysicalCustomerSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: true
  },
  telefono: {
    type: String
  },
  email: {
    type: String
  },
  direccion: {
    type: String
  },
  esRegistrado: {
    type: Boolean,
    default: false
  },
  totalCompras: {
    type: Number,
    default: 0
  },
  deudaActual: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  ultimaCompra: {
    type: Date
  }
});

module.exports = mongoose.model('PhysicalCustomer', PhysicalCustomerSchema);