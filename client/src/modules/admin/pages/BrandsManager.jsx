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
      const data = await getBrands({ page: currentPage, limit: 12 });
      if (data.brands) {
        setBrands(data.brands);
        setTotalPages(data.pagination.pages);
        setTotalItems(data.pagination.total);
      } else {
        setBrands(data);
      }
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

  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <span className="w-1 h-6 bg-green-600 rounded-full"></span>
          🏷️ Marcas ({totalItems})
        </h2>
        <Button variant="primary" onClick={() => openModal()} className="bg-gradient-to-r from-green-600 to-green-700 shadow-md h-12 rounded-2xl font-bold">
          + Nueva Marca
        </Button>
      </div>

      <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 p-6 md:p-8">
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="bg-gray-50 rounded-3xl p-6 h-40 animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            <div className="max-h-[65vh] overflow-y-auto pr-1 scrollbar-hide">
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 p-1">
                {brands.map(b => (
                  <Card key={b._id} className="p-4 text-center hover:shadow-md transition-all group border-l-4 border-transparent hover:border-l-green-600 rounded-3xl relative overflow-hidden">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-2 text-2xl group-hover:scale-110 transition-transform shadow-inner">
                      🏷️
                    </div>
                    <h3 className="font-bold text-gray-800 truncate text-sm">{b.name}</h3>
                    <div className="mt-3 flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openModal(b)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition">✏️</button>
                      <button onClick={() => setConfirmDelete({ open: true, id: b._id })} className="p-2 text-red-600 hover:bg-red-50 rounded-xl transition">🗑️</button>
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
          <form onSubmit={handleSubmit} className="bg-white rounded-[2.5rem] max-w-md w-full p-8 space-y-6 shadow-2xl animate-scale-in">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-2xl font-black text-gray-800 tracking-tighter uppercase">
                {editingBrand ? '✏️ Editar Marca' : '➕ Nueva Marca'}
              </h3>
              <button type="button" onClick={() => setShowModal(false)} className="bg-gray-100 text-gray-400 hover:text-gray-800 p-2 rounded-xl transition-all">✕</button>
            </div>
            
            <Input label="Nombre de la Marca" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required placeholder="Ej: Faber Castell" />
            <Input label="Descripción (opcional)" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Breve descripción..." />
            
            <div className="flex gap-3 pt-4">
              <Button type="submit" variant="primary" className="flex-1 bg-green-600 h-14 text-lg font-black shadow-xl">GUARDAR</Button>
              <Button type="button" variant="ghost" onClick={() => setShowModal(false)} className="flex-1 h-14 font-bold">Cancelar</Button>
            </div>
          </form>
        </div>
      )}

      <ConfirmModal isOpen={confirmDelete.open} onClose={() => setConfirmDelete({ open: false, id: null })} onConfirm={handleConfirmDelete} loading={deleting} title="¿Eliminar Marca?" message="Esta acción no afectará a los productos ya creados." confirmText="Sí, eliminar" type="danger" />
    </div>
  );
}
