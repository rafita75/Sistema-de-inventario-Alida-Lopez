// server/modules/inventory/routes/brands.js
const express = require('express');
const Brand = require('../models/Brand');
const auth = require('../../login/middleware/auth');

const router = express.Router();

// Obtener todas las marcas
router.get('/', auth, async (req, res) => {
  try {
    const brands = await Brand.find({ isActive: true }).sort({ name: 1 });
    res.json(brands);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener marcas' });
  }
});

// Crear marca
router.post('/', auth, async (req, res) => {
  try {
    const brand = new Brand(req.body);
    await brand.save();
    res.status(201).json(brand);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Ya existe una marca con ese nombre' });
    }
    res.status(500).json({ error: 'Error al crear marca' });
  }
});

// Actualizar marca
router.put('/:id', auth, async (req, res) => {
  try {
    const brand = await Brand.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(brand);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar marca' });
  }
});

// Eliminar marca (desactivar)
router.delete('/:id', auth, async (req, res) => {
  try {
    await Brand.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ message: 'Marca eliminada' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar marca' });
  }
});

module.exports = router;
