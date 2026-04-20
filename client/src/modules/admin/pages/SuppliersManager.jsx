// client/src/modules/admin/pages/SuppliersManager.jsx
import React, { useState, useEffect } from 'react';
import { getSuppliers, createSupplier, updateSupplier, deleteSupplier } from '../../../shared/services/supplierService';
import Button from '../../core/components/UI/Button';
import Input from '../../core/components/UI/Input';
import Card from '../../core/components/UI/Card';
import { useNotification } from '../../../shared/contexts/NotificationContext';
import ConfirmModal from '../../core/components/UI/ConfirmModal';
import { CardSkeleton } from '../../core/components/UI/Skeleton';

export default function SuppliersManager() {
  const { notify } = useNotification();
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [formData, setFormData] = useState({ name: '', contactName: '', phone: '', email: '', address: '', nit: '', notes: '' });
  
  // Estados para Confirmación
  const [confirmDelete, setConfirmDelete] = useState({ open: false, id: null });
  const [deleting, setDeleting] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getSuppliers();
      setSuppliers(data);
    } catch (error) { 
      console.error(error);
      notify('Error al cargar proveedores', 'error');
    }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingSupplier) {
        await updateSupplier(editingSupplier._id, formData);
        notify('Proveedor actualizado correctamente', 'success');
      } else {
        await createSupplier(formData);
        notify('Proveedor creado correctamente', 'success');
      }
      setShowModal(false);
      loadData();
    } catch (error) {
      notify(error.response?.data?.error || 'Error al guardar', 'error');
    }
  };

  const openModal = (supplier = null) => {
    if (supplier) {
      setEditingSupplier(supplier);
      setFormData(supplier);
    } else {
      setEditingSupplier(null);
      setFormData({ name: '', contactName: '', phone: '', email: '', address: '', nit: '', notes: '' });
    }
    setShowModal(true);
  };

  const handleConfirmDelete = async () => {
    setDeleting(true);
    try {
      await deleteSupplier(confirmDelete.id);
      notify('Proveedor eliminado', 'success');
      setConfirmDelete({ open: false, id: null });
      loadData();
    } catch (error) {
      notify('Error al eliminar proveedor', 'error');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="h-8 w-48 bg-gray-200 rounded-lg animate-pulse" />
          <div className="h-10 w-40 bg-gray-200 rounded-xl animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => <CardSkeleton key={i} />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <span className="w-1 h-6 bg-green-600 rounded-full"></span>
          🚚 Proveedores
        </h2>
        <Button variant="primary" onClick={() => openModal()} className="bg-gradient-to-r from-green-600 to-green-700 shadow-md">
          + Nuevo Proveedor
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {suppliers.map(s => (
          <Card key={s._id} className="p-5 hover:shadow-md transition-all border-l-4 border-l-green-600 rounded-3xl group">
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <h3 className="font-bold text-gray-800 text-lg group-hover:text-green-700 transition-colors">{s.name}</h3>
                <div className="space-y-1">
                  <p className="text-sm text-gray-500 flex items-center gap-2">
                    <span className="text-base">👤</span> {s.contactName || 'Sin contacto'}
                  </p>
                  <p className="text-sm text-gray-500 flex items-center gap-2">
                    <span className="text-base">📞</span> {s.phone || 'Sin teléfono'}
                  </p>
                  <p className="text-sm text-gray-500 flex items-center gap-2">
                    <span className="text-base">📧</span> {s.email || 'Sin email'}
                  </p>
                </div>
              </div>
              <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => openModal(s)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition" title="Editar">✏️</button>
                <button onClick={() => setConfirmDelete({ open: true, id: s._id })} className="p-2 text-red-600 hover:bg-red-50 rounded-xl transition" title="Eliminar">🗑️</button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <form onSubmit={handleSubmit} className="bg-white rounded-[2rem] max-w-lg w-full p-8 space-y-6 shadow-2xl animate-scale-in">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-2xl font-black text-gray-800 tracking-tighter uppercase">
                {editingSupplier ? '✏️ Editar Proveedor' : '➕ Nuevo Proveedor'}
              </h3>
              <button type="button" onClick={() => setShowModal(false)} className="bg-gray-100 text-gray-400 hover:text-gray-800 p-2 rounded-xl transition-all">✕</button>
            </div>

            <div className="space-y-4">
              <Input label="Nombre de la Empresa" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required placeholder="Distribuidora X..." />
              <div className="grid grid-cols-2 gap-4">
                <Input label="Persona de Contacto" value={formData.contactName} onChange={e => setFormData({...formData, contactName: e.target.value})} placeholder="Nombre..." />
                <Input label="NIT / Registro" value={formData.nit} onChange={e => setFormData({...formData, nit: e.target.value})} placeholder="000000-0" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Teléfono" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="5555-5555" />
                <Input label="Correo electrónico" type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="correo@ejemplo.com" />
              </div>
              <Input label="Dirección Física" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} placeholder="Av. Siempre Viva 123..." />
              <Input label="Notas adicionales" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} placeholder="Días de visita, descuentos..." />
            </div>

            <div className="flex gap-3 pt-4 border-t">
              <Button type="submit" variant="primary" className="flex-1 bg-green-600 h-14 text-lg font-bold shadow-xl">Guardar Proveedor</Button>
              <Button type="button" variant="ghost" onClick={() => setShowModal(false)} className="flex-1 h-14 font-bold">Cancelar</Button>
            </div>
          </form>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmDelete.open}
        onClose={() => setConfirmDelete({ open: false, id: null })}
        onConfirm={handleConfirmDelete}
        loading={deleting}
        title="¿Eliminar Proveedor?"
        message="Se mantendrá el historial de compras, pero este proveedor ya no podrá asignarse a nuevos productos."
        confirmText="Sí, eliminar"
        type="danger"
      />
    </div>
  );
}
