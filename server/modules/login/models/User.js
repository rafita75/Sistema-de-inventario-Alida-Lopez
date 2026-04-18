// server/models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['user', 'admin', 'employee', 'superadmin'],
    default: 'user'
  },
  // ============================================
  // PERMISOS PARA EMPLEADOS (Gestión Interna)
  // ============================================
  // Productos y Catálogo
  viewProducts: { type: Boolean, default: false },
  createProducts: { type: Boolean, default: false },
  editProducts: { type: Boolean, default: false },
  deleteProducts: { type: Boolean, default: false },
  viewCategories: { type: Boolean, default: false },
  createCategories: { type: Boolean, default: false },
  editCategories: { type: Boolean, default: false },
  deleteCategories: { type: Boolean, default: false },
  
  viewBrands: { type: Boolean, default: false },
  createBrands: { type: Boolean, default: false },
  editBrands: { type: Boolean, default: false },
  deleteBrands: { type: Boolean, default: false },
  
  viewSuppliers: { type: Boolean, default: false },
  createSuppliers: { type: Boolean, default: false },
  editSuppliers: { type: Boolean, default: false },
  deleteSuppliers: { type: Boolean, default: false },
  
  // Inventario y Etiquetas
  viewInventory: { type: Boolean, default: false },
  adjustStock: { type: Boolean, default: false },
  printBarcodes: { type: Boolean, default: false },
  
  // Punto de Venta y Facturación
  usePOS: { type: Boolean, default: false },
  viewInvoices: { type: Boolean, default: false },
  
  // Contabilidad y Cierre
  viewAccounting: { type: Boolean, default: false },
  performCashClosing: { type: Boolean, default: false },
  
  // Clientes
  viewCustomers: { type: Boolean, default: false },
  
  // Perfil propio
  editOwnProfile: { type: Boolean, default: true },
  
  // Suscripciones a Notificaciones Push
  pushSubscriptions: [
    {
      endpoint: String,
      expirationTime: Number,
      keys: {
        p256dh: String,
        auth: String
      }
    }
  ],
  
  // Empleados (solo admin)
  manageEmployees: { type: Boolean, default: false },
  
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  shippingAddress: {
    phone: { type: String, default: '' },
    address: { type: String, default: '' },
    city: { type: String, default: '' },
    zipCode: { type: String, default: '' }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Encriptar contraseña antes de guardar
UserSchema.pre('save', async function() {
  const user = this;
  if (!user.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  user.password = await bcrypt.hash(user.password, salt);
});

// Método para comparar contraseñas
UserSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);