// server/shared/middleware/permissions.js
const User = require('../../modules/login/models/User');

// Verificar que el usuario es admin o tiene el permiso específico
const requirePermission = (permission) => {
    return async (req, res, next) => {
      try {
        if (!req.user) {
          return res.status(401).json({ error: 'No autorizado' });
        }
        
        // Admin tiene todos los permisos
        if (req.user.role === 'admin' || req.user.role === 'superadmin') {
          return next();
        }
        
        // Empleado necesita el permiso específico
        if (req.user.role === 'employee') {
          const user = await User.findById(req.user.id);
          if (user && user.permissions && user.permissions[permission] === true) {
            return next();
          }
          return res.status(403).json({ error: 'No tienes permiso para realizar esta acción' });
        }
        
        // Usuario normal no tiene permisos de admin
        return res.status(403).json({ error: 'Acceso denegado' });
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al verificar permisos' });
      }
    };
  };
  
  // Verificar que el usuario es admin (para acciones críticas)
  const requireAdmin = async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'No autorizado' });
      }
      
      if (req.user.role === 'admin' || req.user.role === 'superadmin') {
        return next();
      }
      
      res.status(403).json({ error: 'Acceso denegado. Se requieren permisos de administrador' });
    } catch (error) {
      res.status(500).json({ error: 'Error al verificar permisos' });
    }
  };
  
  module.exports = { requirePermission, requireAdmin };
