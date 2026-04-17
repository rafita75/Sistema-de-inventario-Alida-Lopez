// server/routes/auth.js
const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth'); 
const { validateRegister, validateLogin, handleValidationErrors } = require('../middleware/validation');
const { loginLimiter, registerLimiter } = require('../../../shared/middleware/rateLimit');

const router = express.Router();

// ============================================
// REGISTRO DE USUARIO (con validación y límite)
// ============================================
router.post('/register', 
  registerLimiter,                    // Límite de registros por IP
  validateRegister,                   // Validar datos
  handleValidationErrors,             // Manejar errores de validación
  async (req, res) => {
    try {
      const { name, email, password } = req.body;
      
      // Verificar si el email ya está registrado
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ error: 'El email ya está registrado' });
      }
      
      // Crear nuevo usuario
      const user = new User({
        name,
        email,
        password,
        role: 'user'
      });
      
      await user.save();
      
      // Crear token JWT
      // En el login y register, el token debe incluir name y email
      const token = jwt.sign(
        { id: user._id, name: user.name, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: '30d' }
      );
            
      // Responder (sin enviar la contraseña)
      res.status(201).json({
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      });
      
    } catch (error) {
      console.error('Error en registro:', error);
      res.status(500).json({ error: 'Error en el registro' });
    }
  }
);

// ============================================
// LOGIN DE USUARIO (con validación y límite)
// ============================================
// En el login
router.post('/login',
  loginLimiter,
  validateLogin,
  handleValidationErrors,
  async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: 'Credenciales incorrectas' });
    }
    
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Credenciales incorrectas' });
    }

    if (!user.isActive) {
      return res.status(401).json({ error: 'Usuario desactivado. Contacta al administrador.' });
    }
    
    // 👈 Asegurar que los permisos se envíen correctamente
    const token = jwt.sign(
      { 
        id: user._id, 
        name: user.name, 
        email: user.email, 
        role: user.role,
        viewProducts: user.viewProducts || false,
        createProducts: user.createProducts || false,
        editProducts: user.editProducts || false,
        deleteProducts: user.deleteProducts || false,
        viewInventory: user.viewInventory || false,
        adjustStock: user.adjustStock || false,
        usePOS: user.usePOS || false,
        viewAccounting: user.viewAccounting || false,
        viewCustomers: user.viewCustomers || false
      },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );
    
    // 👈 Devolver el usuario con todos sus permisos
    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        // Permisos
        viewProducts: user.viewProducts || false,
        createProducts: user.createProducts || false,
        editProducts: user.editProducts || false,
        deleteProducts: user.deleteProducts || false,
        viewInventory: user.viewInventory || false,
        adjustStock: user.adjustStock || false,
        usePOS: user.usePOS || false,
        viewAccounting: user.viewAccounting || false,
        viewCustomers: user.viewCustomers || false
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error en el login' });
  }
});

// ============================================
// VERIFICAR TOKEN (para mantener sesión)
// ============================================
router.get('/verify', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'No autorizado' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return res.status(401).json({ error: 'Usuario no encontrado' });
    }
    
    // 👈 Devolver el usuario con todos sus permisos
    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        viewProducts: user.viewProducts || false,
        createProducts: user.createProducts || false,
        editProducts: user.editProducts || false,
        deleteProducts: user.deleteProducts || false,
        viewInventory: user.viewInventory || false,
        adjustStock: user.adjustStock || false,
        usePOS: user.usePOS || false,
        viewAccounting: user.viewAccounting || false,
        viewCustomers: user.viewCustomers || false
      }
    });
  } catch (error) {
    res.status(401).json({ error: 'Token inválido' });
  }
});


// ============================================
// ACTUALIZAR PERFIL DE USUARIO
// ============================================
router.put('/profile', auth, async (req, res) => {
  try {
    const { name, shippingAddress } = req.body;
    const updateData = {};
    
    if (name) updateData.name = name;
    if (shippingAddress) updateData.shippingAddress = shippingAddress;
    
    const user = await User.findByIdAndUpdate(
      req.user.id,
      updateData,
      { new: true }
    ).select('-password');
    
    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar perfil' });
  }
});

// ============================================
// OBTENER PERFIL DE USUARIO
// ============================================
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener perfil' });
  }
});

// ============================================
// CAMBIAR CONTRASEÑA
// ============================================
router.put('/change-password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ error: 'Contraseña actual incorrecta' });
    }
    
    user.password = newPassword;
    await user.save();
    
    res.json({ message: 'Contraseña actualizada' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al cambiar contraseña' });
  }
});

router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    
    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
      permissions: {
        viewProducts: user.viewProducts || false,
        createProducts: user.createProducts || false,
        editProducts: user.editProducts || false,
        deleteProducts: user.deleteProducts || false,
        viewInventory: user.viewInventory || false,
        adjustStock: user.adjustStock || false,
        usePOS: user.usePOS || false,
        viewAccounting: user.viewAccounting || false,
        viewCustomers: user.viewCustomers || false,
        viewOrders: user.viewOrders || false,
        updateOrderStatus: user.updateOrderStatus || false,
        viewAppointments: user.viewAppointments || false,
        createAppointments: user.createAppointments || false,
        updateAppointmentStatus: user.updateAppointmentStatus || false,
        editOwnProfile: user.editOwnProfile !== undefined ? user.editOwnProfile : true,
        manageEmployees: user.manageEmployees || false
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener perfil' });
  }
});

module.exports = router;
