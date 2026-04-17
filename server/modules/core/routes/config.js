// server/routes/config.js
const express = require('express');
const SiteConfig = require('../models/SiteConfig');
const auth = require('../../login/middleware/auth');

const router = express.Router();

// Obtener configuración (público)
router.get('/', async (req, res) => {
  try {
    let config = await SiteConfig.findOne();
    
    if (!config) {
      config = await SiteConfig.create({});
    }
    
    res.json(config);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener configuración' });
  }
});

// Actualizar configuración (solo admin)
router.put('/', auth, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({ error: 'No autorizado' });
    }
    
    let config = await SiteConfig.findOne();
    
    if (!config) {
      config = new SiteConfig();
    }
    
    // Solo actualizar color principal y tipo de fondo
    if (req.body.primaryColor !== undefined) {
      config.primaryColor = req.body.primaryColor;
    }
    if (req.body.backgroundType !== undefined) {
      config.backgroundType = req.body.backgroundType;
    }
    
    config.updatedAt = Date.now();
    await config.save();
    
    res.json(config);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar configuración' });
  }
});

module.exports = router;