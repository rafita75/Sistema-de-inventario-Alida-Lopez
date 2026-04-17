// client/src/modules/admin/pages/EmployeesManager.jsx
import { useState, useEffect } from 'react';
import api from '../../../shared/services/api';
import Button from '../../core/components/UI/Button';
import Card from '../../core/components/UI/Card';
import Input from '../../core/components/UI/Input';

export default function EmployeesManager() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    isActive: true,
    viewProducts: false,
    createProducts: false,
    editProducts: false,
    deleteProducts: false,
    viewCategories: false,
    viewBrands: false,
    viewSuppliers: false,
    viewInventory: false,
    adjustStock: false,
    printBarcodes: false,
    usePOS: false,
    viewInvoices: false,
    viewAccounting: false,
    performCashClosing: false,
    viewCustomers: false
  });
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    try {
      const { data } = await api.get('/employees');
      setEmployees(data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await api.put(`/employees/${editing._id}`, formData);
        setMessage('✅ Empleado actualizado');
      } else {
        await api.post('/employees', formData);
        setMessage('✅ Empleado creado');
      }
      setShowForm(false);
      setEditing(null);
      resetForm();
      loadEmployees();
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error:', error);
      setMessage(error.response?.data?.error || '❌ Error al guardar');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      isActive: true,
      viewProducts: false,
      createProducts: false,
      editProducts: false,
      deleteProducts: false,
      viewCategories: false,
      viewBrands: false,
      viewSuppliers: false,
      viewInventory: false,
      adjustStock: false,
      printBarcodes: false,
      usePOS: false,
      viewInvoices: false,
      viewAccounting: false,
      performCashClosing: false,
      viewCustomers: false
    });
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este empleado?')) return;
    try {
      await api.delete(`/employees/${id}`);
      setMessage('✅ Empleado eliminado');
      loadEmployees();
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage('❌ Error al eliminar');
    }
  };

  const handleEdit = (emp) => {
    setEditing(emp);
    setFormData({
      name: emp.name || '',
      email: emp.email || '',
      password: '',
      isActive: emp.isActive !== false,
      viewProducts: emp.viewProducts || false,
      createProducts: emp.createProducts || false,
      editProducts: emp.editProducts || false,
      deleteProducts: emp.deleteProducts || false,
      viewCategories: emp.viewCategories || false,
      viewBrands: emp.viewBrands || false,
      viewSuppliers: emp.viewSuppliers || false,
      viewInventory: emp.viewInventory || false,
      adjustStock: emp.adjustStock || false,
      printBarcodes: emp.printBarcodes || false,
      usePOS: emp.usePOS || false,
      viewInvoices: emp.viewInvoices || false,
      viewAccounting: emp.viewAccounting || false,
      performCashClosing: emp.performCashClosing || false,
      viewCustomers: emp.viewCustomers || false
    });
    setShowForm(true);
  };

  const togglePermission = (perm) => {
    setFormData(prev => ({
      ...prev,
      [perm]: !prev[perm]
    }));
  };

  const permissionGroups = [
    { 
      title: '📦 Catálogo y Productos', 
      icon: '📦',
      perms: [
        { key: 'viewProducts', label: 'Ver productos' },
        { key: 'createProducts', label: 'Crear productos' },
        { key: 'editProducts', label: 'Editar productos' },
        { key: 'deleteProducts', label: 'Eliminar productos' },
        { key: 'viewCategories', label: 'Ver Categorías' },
        { key: 'viewBrands', label: 'Ver Marcas' },
        { key: 'viewSuppliers', label: 'Ver Proveedores' }
      ]
    },
    { 
      title: '📊 Inventario y Etiquetas', 
      icon: '📊',
      perms: [
        { key: 'viewInventory', label: 'Ver inventario' },
        { key: 'adjustStock', label: 'Ajustar stock' },
        { key: 'printBarcodes', label: 'Imprimir Etiquetas' }
      ]
    },
    { 
      title: '💰 POS y Facturación', 
      icon: '💰',
      perms: [
        { key: 'usePOS', label: 'Usar punto de venta' },
        { key: 'viewInvoices', label: 'Ver Facturación' }
      ]
    },
    { 
      title: '🏁 Contabilidad y Cierre', 
      icon: '🏁',
      perms: [
        { key: 'viewAccounting', label: 'Ver Dashboard' },
        { key: 'performCashClosing', label: 'Hacer Cierre Caja' }
      ]
    },
    { 
      title: '👥 Otros', 
      icon: '👥',
      perms: [
        { key: 'viewCustomers', label: 'Ver clientes' }
      ]
    }
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <span className="w-1 h-6 bg-green-600 rounded-full"></span>
            👥 Gestión de Personal
          </h2>
          <p className="text-gray-500 text-sm mt-1">Configura accesos y permisos para tus empleados</p>
        </div>
        <Button 
          variant="primary" 
          onClick={() => {
            setEditing(null);
            resetForm();
            setShowForm(true);
          }} 
          className="flex items-center gap-2 bg-gradient-to-r from-green-600 to-green-700 shadow-md"
        >
          <span>➕</span> Nuevo empleado
        </Button>
      </div>

      {message && (
        <div className={`p-4 rounded-xl ${message.includes('✅') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {message}
        </div>
      )}

      {/* Formulario */}
      {showForm && (
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 animate-fade-in">
          <h3 className="text-xl font-semibold text-gray-800 mb-6 flex items-center gap-2 border-b pb-4">
            {editing ? '✏️ Editar Empleado' : '➕ Registrar Nuevo Personal'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Nombre completo"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                placeholder="Ej: Juan Pérez"
              />
              <Input
                label="Correo electrónico"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                placeholder="juan@libreria-ayc.com"
              />
              {!editing && (
                <Input
                  label="Contraseña inicial"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  placeholder="Min. 6 caracteres"
                />
              )}
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-100 h-[64px]">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-5 h-5 text-green-600 rounded-lg focus:ring-green-500"
                />
                <label htmlFor="isActive" className="text-sm font-bold text-gray-700 cursor-pointer">
                  Empleado con acceso activo
                </label>
              </div>
            </div>

            {/* Permisos */}
            <div className="pt-4">
              <h4 className="font-bold text-gray-700 mb-4 flex items-center gap-2 uppercase text-xs tracking-widest">
                🔒 Configuración de Permisos
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {permissionGroups.map(group => (
                  <div key={group.title} className="bg-gray-50 rounded-2xl p-5 border border-gray-100">
                    <p className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                      <span className="text-xl">{group.icon}</span> {group.title}
                    </p>
                    <div className="space-y-3">
                      {group.perms.map(perm => (
                        <label key={perm.key} className="flex items-center justify-between group cursor-pointer hover:bg-white p-2 rounded-xl transition-all">
                          <span className="text-sm text-gray-600 group-hover:text-green-700 transition-colors">{perm.label}</span>
                          <div className="relative inline-flex items-center">
                            <input
                              type="checkbox"
                              checked={formData[perm.key] || false}
                              onChange={() => togglePermission(perm.key)}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-6 border-t">
              <Button type="submit" variant="primary" className="flex-1 bg-green-600 h-12 text-lg shadow-lg">
                {editing ? 'Guardar Cambios' : 'Registrar Empleado'}
              </Button>
              <Button type="button" variant="ghost" onClick={() => setShowForm(false)} className="flex-1">
                Cancelar
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Tabla de empleados */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="p-4 text-left text-xs font-bold text-gray-500 uppercase">Empleado</th>
                <th className="p-4 text-left text-xs font-bold text-gray-500 uppercase">Correo</th>
                <th className="p-4 text-center text-xs font-bold text-gray-500 uppercase">Estado</th>
                <th className="p-4 text-center text-xs font-bold text-gray-500 uppercase">Accesos Clave</th>
                <th className="p-4 text-center text-xs font-bold text-gray-500 uppercase w-24">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {employees.map(emp => (
                <tr key={emp._id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-green-100 text-green-700 flex items-center justify-center font-bold">
                        {emp.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-bold text-gray-900">{emp.name}</div>
                        <div className="text-[10px] text-gray-400 font-mono uppercase">ID: {emp._id.slice(-8)}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-gray-600 text-sm">{emp.email}</td>
                  <td className="p-4 text-center">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black tracking-widest ${emp.isActive !== false ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {emp.isActive !== false ? 'ACTIVO' : 'INACTIVO'}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex justify-center gap-2">
                      {emp.usePOS && <span title="Punto de Venta" className="cursor-help">💰</span>}
                      {emp.viewInventory && <span title="Inventario" className="cursor-help">📦</span>}
                      {emp.performCashClosing && <span title="Cierre de Caja" className="cursor-help">🏁</span>}
                      {emp.viewAccounting && <span title="Contabilidad" className="cursor-help">📊</span>}
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex gap-1 justify-center">
                      <button onClick={() => handleEdit(emp)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-all">✏️</button>
                      <button onClick={() => handleDelete(emp._id)} className="p-2 text-red-600 hover:bg-red-50 rounded-xl transition-all">🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
