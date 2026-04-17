const express = require('express');
const AuditLog = require('../../core/models/AuditLog');
const auth = require('../../login/middleware/auth');

const router = express.Router();

// ============================================
// PERMISOS (SOLO ADMIN)
// ============================================
function isAdmin(req) {
  return req.user.role === 'admin';
}

// ============================================
// RUTAS
// ============================================

// Obtener logs con paginación y filtros
router.get('/', auth, async (req, res) => {
  try {
    if (!isAdmin(req)) {
      return res.status(403).json({ error: 'No autorizado. Se requiere perfil Administrador.' });
    }

    const { page = 1, limit = 50, module, action, search } = req.query;
    const query = {};

    if (module) query.module = module;
    if (action) query.action = action;
    if (search) {
      query.$or = [
        { userName: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { entityName: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [logs, total] = await Promise.all([
      AuditLog.find(query)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('user', 'name email'),
      AuditLog.countDocuments(query)
    ]);

    res.json({
      logs,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error al obtener auditoría:', error);
    res.status(500).json({ error: 'Error al obtener logs de auditoría' });
  }
});

module.exports = router;
