const AuditLog = require('../models/AuditLog');

/**
 * Registra una acción administrativa en el log de auditoría.
 * @param {Object} req - Objeto request de Express (para extraer usuario e IP).
 * @param {Object} options - Opciones del log.
 */
const logAudit = async (req, options) => {
  try {
    const { action, module, entityId, entityName, description, oldValue, newValue } = options;
    
    const auditLog = new AuditLog({
      user: req.user.id,
      userName: req.user.name || 'Usuario desconocido',
      action,
      module,
      entityId,
      entityName,
      description,
      details: {
        oldValue,
        newValue
      },
      ip: req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress
    });

    await auditLog.save();
    console.log(`📜 [AUDIT] ${action} en ${module}: ${description}`);
  } catch (error) {
    console.error('❌ Error al registrar log de auditoría:', error);
  }
};

module.exports = { logAudit };
