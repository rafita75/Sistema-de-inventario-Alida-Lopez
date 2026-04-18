// server/modules/inventory/routes/suppliers.js
const express = require('express');
const Supplier = require('../models/Supplier');
const auth = require('../../login/middleware/auth');
const { requirePermission } = require('../../../shared/middleware/permissions');
const { logAudit } = require('../../core/utils/logger');

const router = express.Router();

// ============================================
// OBTENER TODOS LOS PROVEEDORES
// ============================================
router.get('/', auth, requirePermission('viewSuppliers'), async (req, res) => {
  try {
    const suppliers = await Supplier.find({ isActive: true }).sort({ name: 1 });
    res.json(suppliers);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener proveedores' });
  }
});

// ============================================
// CREAR PROVEEDOR
// ============================================
router.post('/', auth, requirePermission('createSuppliers'), async (req, res) => {
  try {
    const supplier = new Supplier(req.body);
    await supplier.save();

    await logAudit(req, {
      action: 'CREATE',
      module: 'INVENTORY',
      entityId: supplier._id,
      entityName: supplier.name,
      description: `Creó el proveedor: ${supplier.name}`,
      newValue: supplier
    });

    res.status(201).json(supplier);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Ya existe un proveedor con ese nombre' });
    }
    res.status(500).json({ error: 'Error al crear proveedor' });
  }
});

// ============================================
// ACTUALIZAR PROVEEDOR
// ============================================
router.put('/:id', auth, requirePermission('editSuppliers'), async (req, res) => {
  try {
    const oldSupplier = await Supplier.findById(req.params.id);
    if (!oldSupplier) {
      return res.status(404).json({ error: 'Proveedor no encontrado' });
    }

    const supplier = await Supplier.findByIdAndUpdate(req.params.id, req.body, { new: true });
    
    await logAudit(req, {
      action: 'UPDATE',
      module: 'INVENTORY',
      entityId: supplier._id,
      entityName: supplier.name,
      description: `Actualizó el proveedor: ${supplier.name}`,
      oldValue: oldSupplier,
      newValue: supplier
    });

    res.json(supplier);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar proveedor' });
  }
});

// ============================================
// ELIMINAR PROVEEDOR (desactivar)
// ============================================
router.delete('/:id', auth, requirePermission('deleteSuppliers'), async (req, res) => {
  try {
    const supplier = await Supplier.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!supplier) {
      return res.status(404).json({ error: 'Proveedor no encontrado' });
    }

    await logAudit(req, {
      action: 'DELETE',
      module: 'INVENTORY',
      entityId: supplier._id,
      entityName: supplier.name,
      description: `Eliminó el proveedor: ${supplier.name}`,
      oldValue: supplier
    });

    res.json({ message: 'Proveedor eliminado' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar proveedor' });
  }
});

module.exports = router;
