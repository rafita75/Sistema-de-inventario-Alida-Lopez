// server/modules/inventory/routes/suppliers.js
const express = require('express');
const Supplier = require('../models/Supplier');
const auth = require('../../login/middleware/auth');

const router = express.Router();

// Obtener todos los proveedores
router.get('/', auth, async (req, res) => {
  try {
    const suppliers = await Supplier.find({ isActive: true }).sort({ name: 1 });
    res.json(suppliers);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener proveedores' });
  }
});

// Crear proveedor
router.post('/', auth, async (req, res) => {
  try {
    const supplier = new Supplier(req.body);
    await supplier.save();
    res.status(201).json(supplier);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Ya existe un proveedor con ese nombre' });
    }
    res.status(500).json({ error: 'Error al crear proveedor' });
  }
});

// Actualizar proveedor
router.put('/:id', auth, async (req, res) => {
  try {
    const supplier = await Supplier.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(supplier);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar proveedor' });
  }
});

// Eliminar proveedor (desactivar)
router.delete('/:id', auth, async (req, res) => {
  try {
    await Supplier.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ message: 'Proveedor eliminado' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar proveedor' });
  }
});

module.exports = router;
