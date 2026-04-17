const jwt = require('jsonwebtoken');
const User = require('../models/User');

module.exports = async function (req, res, next) {
  try {
    let token;

    // Obtener token del header
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ error: 'No autorizado, token faltante' });
    }

    // Verificar token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 🔥 IMPORTANTE: traer usuario actualizado desde DB
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(401).json({ error: 'Usuario no existe' });
    }

    if (!user.isActive) {
      return res.status(403).json({ error: 'Usuario desactivado' });
    }

    // 👉 aquí tienes SIEMPRE los permisos actualizados
    req.user = user;

    next();
  } catch (error) {
    console.error('Error en auth middleware:', error);
    return res.status(401).json({ error: 'Token inválido' });
  }
};