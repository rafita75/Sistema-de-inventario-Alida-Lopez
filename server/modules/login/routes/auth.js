const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { validateRegister, validateLogin, handleValidationErrors } = require('../middleware/validation');
const { loginLimiter, registerLimiter } = require('../../../shared/middleware/rateLimit');
const { requirePermission } = require('../../../shared/middleware/permissions');

const router = express.Router();

// ============================================
// HELPER: Generar objeto de usuario con todos sus permisos
// ============================================
const formatUserResponse = (user) => {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    // Permisos consolidados (Backend a Frontend)
    permissions: {
      viewProducts: user.viewProducts || false,
      createProducts: user.createProducts || false,
      editProducts: user.editProducts || false,
      deleteProducts: user.deleteProducts || false,
      viewCategories: user.viewCategories || false,
      createCategories: user.createCategories || false,
      editCategories: user.editCategories || false,
      deleteCategories: user.deleteCategories || false,
      viewBrands: user.viewBrands || false,
      createBrands: user.createBrands || false,
      editBrands: user.editBrands || false,
      deleteBrands: user.deleteBrands || false,
      viewSuppliers: user.viewSuppliers || false,
      createSuppliers: user.createSuppliers || false,
      editSuppliers: user.editSuppliers || false,
      deleteSuppliers: user.deleteSuppliers || false,
      viewInventory: user.viewInventory || false,
      adjustStock: user.adjustStock || false,
      printBarcodes: user.printBarcodes || false,
      usePOS: user.usePOS || false,
      viewInvoices: user.viewInvoices || false,
      viewAccounting: user.viewAccounting || false,
      performCashClosing: user.performCashClosing || false,
      viewCustomers: user.viewCustomers || false,
      manageEmployees: user.manageEmployees || false
    }
  };
};

// ============================================
// REGISTRO
// ============================================
router.post('/register', registerLimiter, validateRegister, handleValidationErrors, async (req, res) => {
  try {
    const { name, email, password } = req.body;
    let user = await User.findOne({ email });
    if (user) return res.status(400).json({ error: 'El email ya está registrado' });

    user = new User({ name, email, password, role: 'user' });
    await user.save();

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user: formatUserResponse(user) });
  } catch (error) {
    res.status(500).json({ error: 'Error en el registro' });
  }
});

// ============================================
// LOGIN
// ============================================
router.post('/login', loginLimiter, validateLogin, handleValidationErrors, async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    if (!user.isActive) return res.status(403).json({ error: 'Cuenta desactivada' });

    const token = jwt.sign(
      { id: user._id, role: user.role, name: user.name }, 
      process.env.JWT_SECRET, 
      { expiresIn: '7d' }
    );
    
    res.json({ token, user: formatUserResponse(user) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error en el login' });
  }
});

// ============================================
// VERIFICAR TOKEN
// ============================================
router.get('/verify', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(401).json({ error: 'Usuario no encontrado' });
    if (!user.isActive) return res.status(403).json({ error: 'Cuenta desactivada' });

    res.json({ user: formatUserResponse(user) });
  } catch (error) {
    res.status(500).json({ error: 'Error al verificar token' });
  }
});

// ============================================
// MI PERFIL
// ============================================
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener perfil' });
  }
});

router.put('/profile', auth, async (req, res) => {
  try {
    const { name, shippingAddress } = req.body;
    const user = await User.findById(req.user.id);
    
    if (name) user.name = name;
    if (shippingAddress) user.shippingAddress = shippingAddress;
    
    await user.save();
    res.json(formatUserResponse(user));
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar perfil' });
  }
});

// ============================================
// CAMBIO DE CONTRASEÑA
// ============================================
router.put('/change-password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user.id);
    
    if (!(await user.comparePassword(currentPassword))) {
      return res.status(401).json({ error: 'Contraseña actual incorrecta' });
    }
    
    user.password = newPassword;
    await user.save();
    res.json({ message: 'Contraseña actualizada correctamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error al cambiar contraseña' });
  }
});

// ============================================
// SUSCRIPCIÓN PUSH
// ============================================
router.get('/scanner-session', auth, requirePermission('usePOS'), async (req, res) => {
  try {
    const token = jwt.sign(
      {
        id: req.user._id,
        role: req.user.role,
        name: req.user.name,
        scope: 'scanner'
      },
      process.env.JWT_SECRET,
      { expiresIn: '10m' }
    );

    res.json({ token, expiresInMinutes: 10 });
  } catch (error) {
    res.status(500).json({ error: 'No se pudo generar la sesiÃ³n del escÃ¡ner' });
  }
});

router.post('/push-subscribe', auth, async (req, res) => {
  try {
    const { subscription } = req.body;
    const user = await User.findById(req.user.id);
    
    if (!user.pushSubscriptions) user.pushSubscriptions = [];
    
    // Evitar duplicados
    const exists = user.pushSubscriptions.some(s => s.endpoint === subscription.endpoint);
    if (!exists) {
      user.pushSubscriptions.push(subscription);
      await user.save();
    }
    
    res.status(201).json({ message: 'Suscripción guardada' });
  } catch (error) {
    res.status(500).json({ error: 'Error al guardar suscripción push' });
  }
});

// ============================================
// RUTA ME (Legacy/Compatibility)
// ============================================
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(formatUserResponse(user));
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener perfil' });
  }
});

module.exports = router;
