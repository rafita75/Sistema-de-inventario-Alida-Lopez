// client/src/modules/admin/pages/EmployeesManager.jsx
import { useState, useEffect, useCallback } from 'react';
import api from '../../../shared/services/api';
import Button from '../../core/components/UI/Button';
import Card from '../../core/components/UI/Card';
import Input from '../../core/components/UI/Input';
import { useNotification } from '../../../shared/contexts/NotificationContext';
import ConfirmModal from '../../core/components/UI/ConfirmModal';
import { TableSkeleton } from '../../core/components/UI/Skeleton';

export default function EmployeesManager() {
  const { notify } = useNotification();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  
  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Estados para Confirmación
  const [confirmDelete, setConfirmDelete] = useState({ open: false, id: null });
  const [deleting, setDeleting] = useState(false);

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

  const loadEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/employees', { params: { page: currentPage, limit: 10 } });
      if (data.employees) {
        setEmployees(data.employees);
        setTotalPages(data.pagination.pages);
        setTotalItems(data.pagination.total);
      } else {
        setEmployees(data);
      }
    } catch (error) {
      console.error('Error:', error);
      notify('Error al cargar empleados', 'error');
    } finally {
      setLoading(false);
    }
  }, [currentPage, notify]);

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await api.put(`/employees/${editing._id}`, formData);
        notify('Empleado actualizado correctamente', 'success');
      } else {
        await api.post('/employees', formData);
        notify('Empleado registrado correctamente', 'success');
      }
      setShowForm(false);
      setEditing(null);
      resetForm();
      loadEmployees();
    } catch (error) {
      console.error('Error:', error);
      notify(error.response?.data?.error || 'Error al guardar empleado', 'error');
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

  const handleConfirmDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/employees/${confirmDelete.id}`);
      notify('Empleado eliminado', 'success');
      setConfirmDelete({ open: false, id: null });
      loadEmployees();
    } catch (error) {
      notify('Error al eliminar empleado', 'error');
    } finally {
      setDeleting(false);
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
    }
  ];

  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <span className="w-1 h-6 bg-green-600 rounded-full"></span>
            👥 Gestión de Personal
          </h2>
          <p className="text-gray-500 text-sm mt-1 font-medium">Configura accesos y permisos ({totalItems} total)</p>
        </div>
        <Button 
          variant="primary" 
          onClick={() => {
            setEditing(null);
            resetForm();
            setShowForm(true);
          }} 
          className="w-full sm:w-auto bg-gradient-to-r from-green-600 to-green-700 h-12 px-6 rounded-2xl shadow-xl shadow-green-100 font-bold"
        >
          ➕ NUEVO EMPLEADO
        </Button>
      </div>

      {/* Formulario */}
      {showForm && (
        <div className="bg-white rounded-[2rem] shadow-2xl border border-gray-100 p-6 md:p-10 animate-scale-in">
          <div className="flex justify-between items-center mb-8 border-b pb-4">
            <h3 className="text-2xl font-black text-gray-800 tracking-tighter uppercase">
              {editing ? '✏️ Editar Empleado' : '➕ Nuevo Personal'}
            </h3>
            <button onClick={() => setShowForm(false)} className="bg-gray-100 text-gray-400 hover:text-gray-800 p-2 rounded-xl transition-all">✕</button>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input label="Nombre completo" type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required placeholder="Ej: Juan Pérez" />
              <Input label="Correo electrónico" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required placeholder="juan@libreria-ayc.com" />
              {!editing && (
                <Input label="Contraseña inicial" type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} required placeholder="Min. 6 caracteres" />
              )}
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-100 h-[64px]">
                <div className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" id="isActive" checked={formData.isActive} onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })} className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                </div>
                <label htmlFor="isActive" className="text-sm font-bold text-gray-700 cursor-pointer">Acceso activo</label>
              </div>
            </div>

            <div className="pt-4">
              <h4 className="font-black text-gray-400 mb-6 flex items-center gap-2 uppercase text-[10px] tracking-widest">🔒 Permisos del Sistema</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {permissionGroups.map(group => (
                  <div key={group.title} className="bg-gray-50 rounded-3xl p-6 border border-gray-100">
                    <p className="font-bold text-gray-800 mb-6 flex items-center gap-2"><span className="text-xl">{group.icon}</span> {group.title}</p>
                    <div className="space-y-3">
                      {group.perms.map(perm => (
                        <label key={perm.key} className="flex items-center justify-between group cursor-pointer hover:bg-white p-3 rounded-2xl transition-all border border-transparent hover:border-gray-100">
                          <span className="text-sm font-medium text-gray-600 group-hover:text-green-700 transition-colors">{perm.label}</span>
                          <div className="relative inline-flex items-center">
                            <input type="checkbox" checked={formData[perm.key] || false} onChange={() => togglePermission(perm.key)} className="sr-only peer" />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-6 border-t">
              <Button type="submit" variant="primary" className="flex-1 bg-green-600 h-16 text-lg font-black shadow-xl rounded-2xl">{editing ? 'GUARDAR CAMBIOS' : 'REGISTRAR EMPLEADO'}</Button>
              <Button type="button" variant="ghost" onClick={() => setShowForm(false)} className="flex-1 h-16 font-bold">Cancelar</Button>
            </div>
          </form>
        </div>
      )}

      {/* Listado */}
      <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-8"><TableSkeleton rows={5} cols={5} /></div>
        ) : (
          <>
            {/* Vista Desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="p-6 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Empleado</th>
                    <th className="p-6 text-left text-xs font-bold text-gray-400 uppercase tracking-widest">Correo</th>
                    <th className="p-6 text-center text-xs font-bold text-gray-400 uppercase tracking-widest">Estado</th>
                    <th className="p-6 text-center text-xs font-bold text-gray-400 uppercase tracking-widest w-24">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {employees.map(emp => (
                    <tr key={emp._id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="p-6">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-green-100 text-green-700 flex items-center justify-center font-black text-xl shadow-sm">{emp.name.charAt(0)}</div>
                          <div>
                            <div className="font-bold text-gray-900 leading-tight">{emp.name}</div>
                            <div className="text-[9px] text-gray-400 font-mono uppercase mt-1">ID: {emp._id.slice(-8)}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-6 text-gray-600 text-sm font-medium">{emp.email}</td>
                      <td className="p-6 text-center">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black tracking-widest ${emp.isActive !== false ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{emp.isActive !== false ? 'ACTIVO' : 'INACTIVO'}</span>
                      </td>
                      <td className="p-6">
                        <div className="flex gap-1 justify-center">
                          <button onClick={() => handleEdit(emp)} className="p-3 text-blue-600 hover:bg-blue-50 rounded-2xl transition-all shadow-sm">✏️</button>
                          <button onClick={() => setConfirmDelete({ open: true, id: emp._id })} className="p-3 text-red-600 hover:bg-red-50 rounded-2xl transition-all shadow-sm">🗑️</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Vista Móvil con Scroll */}
            <div className="md:hidden">
               <div className="max-h-[60vh] overflow-y-auto pr-1 space-y-4 p-4 scrollbar-hide">
                 {employees.map(emp => (
                   <Card key={emp._id} className="p-5 border-l-4 border-l-green-500 rounded-3xl shadow-sm">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 rounded-2xl bg-green-100 text-green-700 flex items-center justify-center font-black text-xl shadow-sm">{emp.name.charAt(0)}</div>
                        <div className="flex-1 min-w-0">
                           <h4 className="font-black text-gray-800 truncate">{emp.name}</h4>
                           <p className="text-[10px] text-gray-400 truncate">{emp.email}</p>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[8px] font-black ${emp.isActive !== false ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{emp.isActive !== false ? 'ON' : 'OFF'}</span>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => handleEdit(emp)} className="flex-1 rounded-xl font-black text-[10px]">EDITAR</Button>
                        <Button size="sm" variant="danger" onClick={() => setConfirmDelete({ open: true, id: emp._id })} className="bg-red-50 text-red-500 border-none rounded-xl font-black text-[10px]">BORRAR</Button>
                      </div>
                   </Card>
                 ))}
               </div>
            </div>

            {/* Paginación */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-4 p-6 border-t border-gray-100">
                <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} className="rounded-xl font-black text-[10px]">← ANT.</Button>
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Pág {currentPage} / {totalPages}</span>
                <Button variant="outline" size="sm" disabled={currentPage === totalPages} onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} className="rounded-xl font-black text-[10px]">SIG. →</Button>
              </div>
            )}
          </>
        )}
      </div>

      <ConfirmModal isOpen={confirmDelete.open} onClose={() => setConfirmDelete({ open: false, id: null })} onConfirm={handleConfirmDelete} loading={deleting} title="¿Eliminar Empleado?" message="Esta acción revocará todo acceso al sistema." confirmText="SÍ, ELIMINAR" type="danger" />
    </div>
  );
}
