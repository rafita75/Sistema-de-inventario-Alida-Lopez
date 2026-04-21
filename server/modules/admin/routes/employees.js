// server/modules/admin/routes/employees.js
const express = require('express');
const User = require('../../login/models/User');
const auth = require('../../login/middleware/auth');
const { requireAdmin } = require('../../../shared/middleware/permissions');

const router = express.Router();

// ============================================
// OBTENER TODOS LOS EMPLEADOS (PAGINADO)
// ============================================
router.get('/', auth, requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [employees, total] = await Promise.all([
      User.find({ role: 'employee' })
        .select('-password')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      User.countDocuments({ role: 'employee' })
    ]);
    
    res.json({
      employees,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener empleados' });
  }
});

// ============================================
// CREAR EMPLEADO
// ============================================
router.post('/', auth, requireAdmin, async (req, res) => {
  try {
    const { email } = req.body;
    
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'El email ya está registrado' });
    }
    
    // Crear el empleado con todos los campos del body
    const employee = new User({
      ...req.body,
      role: 'employee',
      isActive: true,
      createdBy: req.user.id
    });
    
    await employee.save();
    
    const savedEmployee = await User.findById(employee._id).select('-password');
    res.status(201).json(savedEmployee);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al crear empleado' });
  }
});

// ============================================
// ACTUALIZAR EMPLEADO
// ============================================
router.put('/:id', auth, requireAdmin, async (req, res) => {
  try {
    const updateData = { ...req.body };
    
    // No permitir cambiar el rol ni el creador desde aquí
    delete updateData.role;
    delete updateData.createdBy;
    delete updateData._id;

    const employee = await User.findOne({ _id: req.params.id, role: 'employee' });
    
    if (!employee) {
      return res.status(404).json({ error: 'Empleado no encontrado' });
    }

    // Si viene password vacía, no actualizarla
    if (!updateData.password || !updateData.password.trim()) {
      delete updateData.password;
    }
    
    // Aplicar todos los campos (incluyendo los nuevos permisos)
    Object.assign(employee, updateData);
    
    await employee.save();
    
    const updatedEmployee = await User.findById(employee._id).select('-password');
    res.json(updatedEmployee);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar empleado' });
  }
});

// ============================================
// ELIMINAR EMPLEADO
// ============================================
router.delete('/:id', auth, requireAdmin, async (req, res) => {
  try {
    const employee = await User.findOneAndDelete({ 
      _id: req.params.id, 
      role: 'employee'
    });
    
    if (!employee) {
      return res.status(404).json({ error: 'Empleado no encontrado' });
    }
    
    res.json({ message: 'Empleado eliminado' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al eliminar empleado' });
  }
});

module.exports = router;
