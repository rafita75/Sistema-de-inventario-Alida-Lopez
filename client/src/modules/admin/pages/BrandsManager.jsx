// client/src/modules/admin/pages/BrandsManager.jsx
import React, { useState, useEffect } from 'react';
import { getBrands, createBrand, updateBrand, deleteBrand } from '../../../shared/services/brandService';
import Button from '../../core/components/UI/Button';
import Input from '../../core/components/UI/Input';
import Card from '../../core/components/UI/Card';
import { useNotification } from '../../../shared/contexts/NotificationContext';
import ConfirmModal from '../../core/components/UI/ConfirmModal';
import Skeleton from '../../core/components/UI/Skeleton';

export default function BrandsManager() {
  const { notify } = useNotification();
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingBrand, setEditingBrand] = useState(null);
  const [formData, setFormData] = useState({ name: '', description: '' });
  
  // Estados para Confirmación
  const [confirmDelete, setConfirmDelete] = useState({ open: false, id: null });
  const [deleting, setDeleting] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getBrands();
      setBrands(data);
    } catch (error) { 
      console.error(error);
      notify('Error al cargar marcas', 'error');
    } finally { 
      setLoading(false); 
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingBrand) {
        await updateBrand(editingBrand._id, formData);
        notify('Marca actualizada correctamente', 'success');
      } else {
        await createBrand(formData);
        notify('Marca creada correctamente', 'success');
      }
      setShowModal(false);
      loadData();
    } catch (error) {
      notify(error.response?.data?.error || 'Error al guardar', 'error');
    }
  };

  const openModal = (brand = null) => {
    if (brand) {
      setEditingBrand(brand);
      setFormData(brand);
    } else {
      setEditingBrand(null);
      setFormData({ name: '', description: '' });
    }
    setShowModal(true);
  };

  const handleConfirmDelete = async () => {
    setDeleting(true);
    try {
      await deleteBrand(confirmDelete.id);
      notify('Marca eliminada', 'success');
      setConfirmDelete({ open: false, id: null });
      loadData();
    } catch (error) {
      notify('Error al eliminar marca', 'error');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="h-8 w-48 bg-gray-200 rounded-lg animate-pulse" />
          <div className="h-10 w-32 bg-gray-200 rounded-xl animate-pulse" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="bg-white rounded-3xl p-6 h-40 border border-gray-100 shadow-sm animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <span className="w-1 h-6 bg-green-600 rounded-full"></span>
          🏷️ Marcas
        </h2>
        <Button variant="primary" onClick={() => openModal()} className="bg-gradient-to-r from-green-600 to-green-700 shadow-md">
          + Nueva Marca
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {brands.map(b => (
          <Card key={b._id} className="p-4 text-center hover:shadow-md transition-all group border-l-4 border-transparent hover:border-l-green-600 rounded-3xl">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-2 text-2xl group-hover:scale-110 transition-transform shadow-inner">
              🏷️
            </div>
            <h3 className="font-bold text-gray-800 truncate">{b.name}</h3>
            <div className="mt-3 flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => openModal(b)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition">✏️</button>
              <button onClick={() => setConfirmDelete({ open: true, id: b._id })} className="p-2 text-red-600 hover:bg-red-50 rounded-xl transition">🗑️</button>
            </div>
          </Card>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <form onSubmit={handleSubmit} className="bg-white rounded-[2rem] max-w-md w-full p-8 space-y-6 shadow-2xl animate-scale-in">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-2xl font-black text-gray-800 tracking-tighter uppercase">
                {editingBrand ? '✏️ Editar Marca' : '➕ Nueva Marca'}
              </h3>
              <button type="button" onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-800 transition">✕</button>
            </div>
            
            <Input label="Nombre de la Marca" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required placeholder="Ej: Faber Castell" />
            <Input label="Descripción (opcional)" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Breve descripción..." />
            
            <div className="flex gap-3 pt-4">
              <Button type="submit" variant="primary" className="flex-1 bg-green-600 h-12 shadow-lg">Guardar</Button>
              <Button type="button" variant="ghost" onClick={() => setShowModal(false)} className="flex-1">Cancelar</Button>
            </div>
          </form>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmDelete.open}
        onClose={() => setConfirmDelete({ open: false, id: null })}
        onConfirm={handleConfirmDelete}
        loading={deleting}
        title="¿Eliminar Marca?"
        message="Esta acción no afectará a los productos ya creados, pero la marca dejará de estar disponible para nuevos registros."
        confirmText="Sí, eliminar"
        type="danger"
      />
    </div>
  );
}
