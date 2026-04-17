const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  userName: {
    type: String,
    required: true
  },
  action: {
    type: String,
    enum: ['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'PRICE_CHANGE', 'STOCK_ADJUSTMENT', 'DEBT_PAYMENT', 'CASH_CLOSING'],
    required: true
  },
  module: {
    type: String,
    enum: ['INVENTORY', 'ACCOUNTING', 'POS', 'AUTH', 'ADMIN'],
    required: true
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null
  },
  entityName: {
    type: String,
    default: ''
  },
  description: {
    type: String,
    required: true
  },
  details: {
    oldValue: mongoose.Schema.Types.Mixed,
    newValue: mongoose.Schema.Types.Mixed
  },
  ip: {
    type: String,
    default: ''
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

// Índice para búsquedas rápidas por fecha y módulo
AuditLogSchema.index({ timestamp: -1 });
AuditLogSchema.index({ module: 1 });
AuditLogSchema.index({ user: 1 });

module.exports = mongoose.model('AuditLog', AuditLogSchema);
