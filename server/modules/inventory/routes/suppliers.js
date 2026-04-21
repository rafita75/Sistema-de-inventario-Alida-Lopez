// server/modules/inventory/routes/suppliers.js
const express = require('express');
const Supplier = require('../models/Supplier');
const auth = require('../../login/middleware/auth');
const { requirePermission } = require('../../../shared/middleware/permissions');

const router = express.Router();

router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [suppliers, total] = await Promise.all([
      Supplier.find({ isActive: true })
        .sort({ name: 1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Supplier.countDocuments({ isActive: true })
    ]);

    res.json({
      suppliers,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener proveedores' });
  }
});

router.post('/', auth, requirePermission('createProducts'), async (req, res) => {
  try {
    const supplier = new Supplier(req.body);
    await supplier.save();
    res.status(201).json(supplier);
  } catch (error) {
    res.status(500).json({ error: 'Error al crear proveedor' });
  }
});

router.put('/:id', auth, requirePermission('editProducts'), async (req, res) => {
  try {
    const supplier = await Supplier.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(supplier);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar proveedor' });
  }
});

router.delete('/:id', auth, requirePermission('deleteProducts'), async (req, res) => {
  try {
    await Supplier.findByIdAndDelete(req.params.id);
    res.json({ message: 'Proveedor eliminado' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar proveedor' });
  }
});

module.exports = router;
