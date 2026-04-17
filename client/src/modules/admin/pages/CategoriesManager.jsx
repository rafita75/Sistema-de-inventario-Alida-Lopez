// client/src/pages/Admin/CategoriesManager.jsx
import { useState, useEffect } from 'react';
import { getCategories, createCategory, updateCategory, deleteCategory } from '../../../shared/services/categoryService';
import Button from '../../core/components/UI/Button';
import Input from '../../core/components/UI/Input';

export default function CategoriesManager() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const data = await getCategories();
      setCategories(data);
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
        await updateCategory(editing._id, formData);
        setMessage('✅ Categoría actualizada');
      } else {
        await createCategory(formData);
        setMessage('✅ Categoría creada');
      }
      setShowForm(false);
      setEditing(null);
      setFormData({ name: '', description: '' });
      loadCategories();
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage('❌ Error: ' + (error.response?.data?.error || 'Error al guardar'));
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar esta categoría?')) return;
    try {
      await deleteCategory(id);
      setMessage('✅ Categoría eliminada');
      loadCategories();
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage('❌ Error al eliminar');
    }
  };

  const handleEdit = (category) => {
    setEditing(category);
    setFormData({ name: category.name, description: category.description || '' });
    setShowForm(true);
  };

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
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <span className="w-1 h-6 bg-green-600 rounded-full"></span>
            🏷️ Categorías
          </h2>
          <p className="text-gray-500 text-sm mt-1">Gestiona las categorías de tus productos</p>
        </div>
        <Button 
          variant="primary" 
          onClick={() => {
            setEditing(null);
            setFormData({ name: '', description: '' });
            setShowForm(true);
          }}
          className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Nueva Categoría
        </Button>
      </div>

      {message && (
        <div className={`p-4 rounded-xl ${message.includes('✅') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {message}
        </div>
      )}

      {/* Formulario */}
      {showForm && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 animate-fade-in">
          <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <span className="w-1 h-5 bg-green-600 rounded-full"></span>
            {editing ? '✏️ Editar Categoría' : '➕ Nueva Categoría'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Nombre *"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ej: Electrónicos, Ropa, Hogar"
              required
              icon="📛"
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descripción (opcional)</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
                rows="3"
                placeholder="Describe la categoría..."
              />
            </div>
            <div className="flex gap-3 pt-2">
              <Button type="submit" variant="primary" className="bg-gradient-to-r from-green-600 to-green-700">
                {editing ? 'Actualizar' : 'Crear'} Categoría
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setShowForm(false);
                  setEditing(null);
                }}
              >
                Cancelar
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Lista de categorías - Tarjetas en móvil */}
      <div className="block lg:hidden space-y-3">
        {categories.map((cat) => (
          <div key={cat._id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-800">{cat.name}</span>
                  <span className="text-xs text-gray-400 font-mono bg-gray-100 px-2 py-0.5 rounded-full">{cat.slug}</span>
                </div>
                {cat.description && (
                  <p className="text-sm text-gray-500 mt-2">{cat.description}</p>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(cat)}
                  className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition"
                  title="Editar"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  onClick={() => handleDelete(cat._id)}
                  className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                  title="Eliminar"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        ))}
        {categories.length === 0 && (
          <div className="text-center py-12 text-gray-500 bg-white rounded-2xl shadow-sm border border-gray-100">
            No hay categorías creadas. Haz clic en "Nueva Categoría" para comenzar.
          </div>
        )}
      </div>

      {/* Tabla desktop */}
      <div className="hidden lg:block bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="p-4 text-left text-sm font-semibold text-gray-600">Nombre</th>
                <th className="p-4 text-left text-sm font-semibold text-gray-600">Slug</th>
                <th className="p-4 text-left text-sm font-semibold text-gray-600">Descripción</th>
                <th className="p-4 text-center text-sm font-semibold text-gray-600">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {categories.map((cat) => (
                <tr key={cat._id} className="hover:bg-gray-50 transition">
                  <td className="p-4">
                    <span className="font-medium text-gray-800">{cat.name}</span>
                  </td>
                  <td className="p-4">
                    <span className="text-sm text-gray-500 font-mono bg-gray-100 px-2 py-0.5 rounded-full">{cat.slug}</span>
                  </td>
                  <td className="p-4">
                    <p className="text-sm text-gray-500 max-w-md">
                      {cat.description || '—'}
                    </p>
                  </td>
                  <td className="p-4 text-center">
                    <div className="flex gap-2 justify-center">
                      <button
                        onClick={() => handleEdit(cat)}
                        className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition"
                        title="Editar"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(cat._id)}
                        className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                        title="Eliminar"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {categories.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            No hay categorías creadas. Haz clic en "Nueva Categoría" para comenzar.
          </div>
        )}
      </div>
    </div>
  );
}