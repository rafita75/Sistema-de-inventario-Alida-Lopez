// server/middleware/superAdminAuth.js
const jwt = require('jsonwebtoken');

const verifySuperAdmin = (req, res, next) => {
  try {
    // Obtener token del header
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      console.log('No authorization header');
      return res.status(401).json({ error: 'No autorizado' });
    }
    
    const token = authHeader.split(' ')[1];
    if (!token) {
      console.log('No token found');
      return res.status(401).json({ error: 'No autorizado' });
    }
    
    // Verificar token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Token decodificado:', decoded);
    
    // Verificar que el rol sea superadmin
    if (decoded.role !== 'superadmin') {
      console.log('Rol incorrecto:', decoded.role);
      return res.status(403).json({ error: 'Acceso denegado. Se requieren permisos de superadmin' });
    }
    
    req.user = decoded;
    next();
  } catch (error) {
    console.error('Error en verifySuperAdmin:', error.message);
    return res.status(401).json({ error: 'Token inválido' });
  }
};

module.exports = { verifySuperAdmin };