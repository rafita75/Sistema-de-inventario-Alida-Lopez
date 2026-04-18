// server/modules/inventory/routes/brands.js
const express = require('express');
const Brand = require('../models/Brand');
const auth = require('../../login/middleware/auth');
const { requirePermission } = require('../../../shared/middleware/permissions');
const { logAudit } = require('../../core/utils/logger');

const router = express.Router();

// ============================================
// OBTENER TODAS LAS MARCAS
// ============================================
router.get('/', auth, requirePermission('viewBrands'), async (req, res) => {
  try {
    const brands = await Brand.find({ isActive: true }).sort({ name: 1 });
    res.json(brands);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener marcas' });
  }
});

// ============================================
// CREAR MARCA
// ============================================
router.post('/', auth, requirePermission('createBrands'), async (req, res) => {
  try {
    const brand = new Brand(req.body);
    await brand.save();

    await logAudit(req, {
      action: 'CREATE',
      module: 'INVENTORY',
      entityId: brand._id,
      entityName: brand.name,
      description: `Creó la marca: ${brand.name}`,
      newValue: brand
    });

    res.status(201).json(brand);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Ya existe una marca con ese nombre' });
    }
    res.status(500).json({ error: 'Error al crear marca' });
  }
});

// ============================================
// ACTUALIZAR MARCA
// ============================================
router.put('/:id', auth, requirePermission('editBrands'), async (req, res) => {
  try {
    const oldBrand = await Brand.findById(req.params.id);
    if (!oldBrand) {
      return res.status(404).json({ error: 'Marca no encontrada' });
    }

    const brand = await Brand.findByIdAndUpdate(req.params.id, req.body, { new: true });
    
    await logAudit(req, {
      action: 'UPDATE',
      module: 'INVENTORY',
      entityId: brand._id,
      entityName: brand.name,
      description: `Actualizó la marca: ${brand.name}`,
      oldValue: oldBrand,
      newValue: brand
    });

    res.json(brand);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar marca' });
  }
});

// ============================================
// ELIMINAR MARCA (desactivar)
// ============================================
router.delete('/:id', auth, requirePermission('deleteBrands'), async (req, res) => {
  try {
    const brand = await Brand.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!brand) {
      return res.status(404).json({ error: 'Marca no encontrada' });
    }

    await logAudit(req, {
      action: 'DELETE',
      module: 'INVENTORY',
      entityId: brand._id,
      entityName: brand.name,
      description: `Eliminó la marca: ${brand.name}`,
      oldValue: brand
    });

    res.json({ message: 'Marca eliminada' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar marca' });
  }
});

module.exports = router;
