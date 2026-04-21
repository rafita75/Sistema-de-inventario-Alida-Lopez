// server/modules/inventory/routes/brands.js
const express = require('express');
const Brand = require('../models/Brand');
const auth = require('../../login/middleware/auth');
const { requirePermission } = require('../../../shared/middleware/permissions');

const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [brands, total] = await Promise.all([
      Brand.find({ isActive: true })
        .sort({ name: 1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Brand.countDocuments({ isActive: true })
    ]);
    
    res.json({
      brands,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener marcas' });
  }
});

router.post('/', auth, requirePermission('createProducts'), async (req, res) => {
  try {
    const brand = new Brand(req.body);
    await brand.save();
    res.status(201).json(brand);
  } catch (error) {
    res.status(500).json({ error: 'Error al crear marca' });
  }
});

router.put('/:id', auth, requirePermission('editProducts'), async (req, res) => {
  try {
    const brand = await Brand.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(brand);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar marca' });
  }
});

router.delete('/:id', auth, requirePermission('deleteProducts'), async (req, res) => {
  try {
    await Brand.findByIdAndDelete(req.params.id);
    res.json({ message: 'Marca eliminada' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar marca' });
  }
});

module.exports = router;
