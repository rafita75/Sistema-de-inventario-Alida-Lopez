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
  
  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Estados para Confirmación
  const [confirmDelete, setConfirmDelete] = useState({ open: false, id: null });
  const [deleting, setDeleting] = useState(false);

  useEffect(() => { loadData(); }, [currentPage]);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getSuppliers({ page: currentPage, limit: 12 });
      if (data.suppliers) {
        setSuppliers(data.suppliers);
        setTotalPages(data.pagination.pages);
        setTotalItems(data.pagination.total);
      } else {
        setSuppliers(data);
      }
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

  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <span className="w-1 h-6 bg-green-600 rounded-full"></span>
          🚚 Proveedores ({totalItems})
        </h2>
        <Button variant="primary" onClick={() => openModal()} className="bg-gradient-to-r from-green-600 to-green-700 shadow-md h-12 rounded-2xl font-bold">
          + Nuevo Proveedor
        </Button>
      </div>

      <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 p-6 md:p-8">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3,4,5,6].map(i => <CardSkeleton key={i} />)}
          </div>
        ) : (
          <>
            <div className="max-h-[65vh] overflow-y-auto pr-1 scrollbar-hide">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-1">
                {suppliers.map(s => (
                  <Card key={s._id} className="p-5 hover:shadow-md transition-all border-l-4 border-l-green-600 rounded-3xl group">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2 min-w-0 flex-1">
                        <h3 className="font-black text-gray-800 text-lg group-hover:text-green-700 transition-colors truncate uppercase tracking-tighter">{s.name}</h3>
                        <div className="space-y-1">
                          <p className="text-xs text-gray-500 flex items-center gap-2 truncate"><span className="text-base shrink-0">👤</span> {s.contactName || 'Sin contacto'}</p>
                          <p className="text-xs text-gray-500 flex items-center gap-2 truncate"><span className="text-base shrink-0">📞</span> {s.phone || 'Sin teléfono'}</p>
                          <p className="text-xs text-gray-500 flex items-center gap-2 truncate"><span className="text-base shrink-0">📧</span> {s.email || 'Sin email'}</p>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                        <button onClick={() => openModal(s)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition" title="Editar">✏️</button>
                        <button onClick={() => setConfirmDelete({ open: true, id: s._id })} className="p-2 text-red-600 hover:bg-red-50 rounded-xl transition" title="Eliminar">🗑️</button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-4 mt-8 pt-8 border-t border-gray-100">
                <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} className="rounded-xl font-black text-[10px]">← ANT.</Button>
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Pág {currentPage} / {totalPages}</span>
                <Button variant="outline" size="sm" disabled={currentPage === totalPages} onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} className="rounded-xl font-black text-[10px]">SIG. →</Button>
              </div>
            )}
          </>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <form onSubmit={handleSubmit} className="bg-white rounded-[2.5rem] max-w-lg w-full p-8 space-y-6 shadow-2xl animate-scale-in">
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
              <Button type="submit" variant="primary" className="flex-1 bg-green-600 h-14 text-lg font-black shadow-xl">Guardar</Button>
              <Button type="button" variant="ghost" onClick={() => setShowModal(false)} className="flex-1 h-14 font-bold">Cancelar</Button>
            </div>
          </form>
        </div>
      )}

      <ConfirmModal isOpen={confirmDelete.open} onClose={() => setConfirmDelete({ ...confirmDelete, open: false })} onConfirm={handleConfirmDelete} loading={deleting} title="¿Eliminar Proveedor?" message="Esta acción es irreversible." confirmText="Sí, eliminar" type="danger" />
    </div>
  );
}
