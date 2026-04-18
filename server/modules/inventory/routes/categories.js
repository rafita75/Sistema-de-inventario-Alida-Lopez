// server/modules/inventory/routes/categories.js
const express = require('express');
const Category = require('../models/Category');
const auth = require('../../login/middleware/auth');
const { validateCategory } = require('../../../shared/middleware/validation');
const { requirePermission } = require('../../../shared/middleware/permissions');
const { logAudit } = require('../../core/utils/logger');

const router = express.Router();

// ============================================
// OBTENER TODAS LAS CATEGORÍAS
// ============================================
router.get('/', auth, requirePermission('viewCategories'), async (req, res) => {
  try {
    const categories = await Category.find({ isActive: true }).sort({ order: 1 });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener categorías' });
  }
});

// ============================================
// CREAR CATEGORÍA
// ============================================
router.post('/', auth, requirePermission('createCategories'), validateCategory, async (req, res) => {
  try {
    const { name, description, image, parentId, order } = req.body;
    
    const category = new Category({
      name,
      description: description || '',
      image: image || '',
      parentId: parentId || null,
      order: order || 0,
      isActive: true
    });
    
    await category.save();

    await logAudit(req, {
      action: 'CREATE',
      module: 'INVENTORY',
      entityId: category._id,
      entityName: category.name,
      description: `Creó la categoría: ${category.name}`,
      newValue: category
    });

    res.status(201).json(category);
  } catch (error) {
    console.error('Error al crear categoría:', error);
    if (error.code === 11000) {
      return res.status(400).json({ error: 'El slug ya existe' });
    }
    res.status(500).json({ error: 'Error al crear categoría: ' + error.message });
  }
});

// ============================================
// ACTUALIZAR CATEGORÍA
// ============================================
router.put('/:id', auth, requirePermission('editCategories'), validateCategory, async (req, res) => {
  try {
    const oldCategory = await Category.findById(req.params.id);
    if (!oldCategory) {
      return res.status(404).json({ error: 'Categoría no encontrada' });
    }

    const category = await Category.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: Date.now() },
      { new: true }
    );
    
    await logAudit(req, {
      action: 'UPDATE',
      module: 'INVENTORY',
      entityId: category._id,
      entityName: category.name,
      description: `Actualizó la categoría: ${category.name}`,
      oldValue: oldCategory,
      newValue: category
    });

    res.json(category);
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar categoría' });
  }
});

// ============================================
// ELIMINAR CATEGORÍA
// ============================================
router.delete('/:id', auth, requirePermission('deleteCategories'), async (req, res) => {
  try {
    const category = await Category.findByIdAndDelete(req.params.id);
    if (!category) {
      return res.status(404).json({ error: 'Categoría no encontrada' });
    }
    
    await logAudit(req, {
      action: 'DELETE',
      module: 'INVENTORY',
      entityId: category._id,
      entityName: category.name,
      description: `Eliminó la categoría: ${category.name}`,
      oldValue: category
    });

    res.json({ message: 'Categoría eliminada' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar categoría' });
  }
});

module.exports = router;
