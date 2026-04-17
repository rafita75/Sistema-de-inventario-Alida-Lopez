// server/modules/core/models/SiteConfig.js
const mongoose = require('mongoose');

const SiteConfigSchema = new mongoose.Schema({
  // Configuración general del sistema de gestión
  siteName: { type: String, default: 'GestiónPro' },
  primaryColor: { type: String, default: '#3b82f6' },
  logo: { type: String, default: '' },
  
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('SiteConfig', SiteConfigSchema);
