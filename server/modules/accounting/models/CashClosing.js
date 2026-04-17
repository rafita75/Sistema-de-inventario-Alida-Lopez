// server/modules/accounting/models/CashClosing.js
const mongoose = require('mongoose');

const CashClosingSchema = new mongoose.Schema({
  fecha: { type: Date, default: Date.now },
  cajeroId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  // Totales calculados por el sistema
  saldoInicial: { type: Number, default: 0 },
  ventasEfectivo: { type: Number, default: 0 },
  ventasTarjeta: { type: Number, default: 0 },
  ventasTransferencia: { type: Number, default: 0 },
  totalGastos: { type: Number, default: 0 },
  esperadoEnCaja: { type: Number, default: 0 }, // Saldo inicial + ingresos - egresos
  
  // Ingresado por el humano
  contadoFisico: { type: Number, required: true },
  diferencia: { type: Number, default: 0 }, // Fisico - Esperado
  
  notas: { type: String, trim: true },
  isActive: { type: Boolean, default: true }
});

module.exports = mongoose.model('CashClosing', CashClosingSchema);
