// client/src/modules/admin/pages/CategoriesManager.jsx
import React, { useState, useEffect } from 'react';
import { getCategories, createCategory, updateCategory, deleteCategory } from '../../../shared/services/categoryService';
import Button from '../../core/components/UI/Button';
import Input from '../../core/components/UI/Input';
import Card from '../../core/components/UI/Card';
import { useNotification } from '../../../shared/contexts/NotificationContext';
import ConfirmModal from '../../core/components/UI/ConfirmModal';
import { TableSkeleton } from '../../core/components/UI/Skeleton';

export default function CategoriesManager() {
  const { notify } = useNotification();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [formData, setFormData] = useState({ name: '', description: '' });
  
  // Estados para Confirmación
  const [confirmDelete, setConfirmDelete] = useState({ open: false, id: null });
  const [deleting, setDeleting] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getCategories();
      setCategories(data);
    } catch (error) { 
      console.error(error);
      notify('Error al cargar categorías', 'error');
    } finally { 
      setLoading(false); 
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingCategory) {
        await updateCategory(editingCategory._id, formData);
        notify('Categoría actualizada', 'success');
      } else {
        await createCategory(formData);
        notify('Categoría creada', 'success');
      }
      setShowModal(false);
      loadData();
    } catch (error) {
      notify(error.response?.data?.error || 'Error al guardar', 'error');
    }
  };

  const openModal = (category = null) => {
    if (category) {
      setEditingCategory(category);
      setFormData(category);
    } else {
      setEditingCategory(null);
      setFormData({ name: '', description: '' });
    }
    setShowModal(true);
  };

  const handleConfirmDelete = async () => {
    setDeleting(true);
    try {
      await deleteCategory(confirmDelete.id);
      notify('Categoría eliminada', 'success');
      setConfirmDelete({ open: false, id: null });
      loadData();
    } catch (error) {
      notify('Error al eliminar categoría', 'error');
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
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
          <TableSkeleton rows={5} cols={3} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <span className="w-1 h-6 bg-green-600 rounded-full"></span>
          🏷️ Categorías
        </h2>
        <Button variant="primary" onClick={() => openModal()} className="bg-gradient-to-r from-green-600 to-green-700 shadow-md">
          + Nueva Categoría
        </Button>
      </div>

      <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-gray-500 font-bold uppercase text-[10px] tracking-widest border-b border-gray-100">
              <tr>
                <th className="p-6">Nombre</th>
                <th className="p-6">Descripción</th>
                <th className="p-6 text-center w-32">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {categories.map(c => (
                <tr key={c._id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="p-6 font-bold text-gray-800">{c.name}</td>
                  <td className="p-6 text-gray-500 text-sm">{c.description || '—'}</td>
                  <td className="p-6 text-center">
                    <div className="flex justify-center gap-1">
                      <button onClick={() => openModal(c)} className="p-3 text-blue-600 hover:bg-blue-50 rounded-2xl transition-all">✏️</button>
                      <button onClick={() => setConfirmDelete({ open: true, id: c._id })} className="p-3 text-red-600 hover:bg-red-50 rounded-2xl transition-all">🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
              {categories.length === 0 && (
                <tr><td colSpan="3" className="p-12 text-center text-gray-400">No hay categorías registradas</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <form onSubmit={handleSubmit} className="bg-white rounded-[2rem] max-w-md w-full p-8 space-y-6 shadow-2xl animate-scale-in">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-2xl font-black text-gray-800 tracking-tighter uppercase">
                {editingCategory ? '✏️ Editar Categoría' : '➕ Nueva Categoría'}
              </h3>
              <button type="button" onClick={() => setShowModal(false)} className="bg-gray-100 text-gray-400 hover:text-gray-800 transition">✕</button>
            </div>
            
            <Input label="Nombre de la Categoría" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required placeholder="Ej: Escritura" />
            <Input label="Descripción" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Para qué sirve esta categoría..." />
            
            <div className="flex gap-3 pt-4 border-t">
              <Button type="submit" variant="primary" className="flex-1 bg-green-600 h-14 text-lg font-bold shadow-xl">Guardar</Button>
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
        title="¿Eliminar Categoría?"
        message="Esta acción no afectará a los productos existentes, pero la categoría ya no podrá seleccionarse para nuevos productos."
        confirmText="Sí, eliminar"
        type="danger"
      />
    </div>
  );
}
