// client/src/modules/admin/pages/BrandsManager.jsx
import React, { useState, useEffect } from 'react';
import { getBrands, createBrand, updateBrand, deleteBrand } from '../../../shared/services/brandService';
import Button from '../../core/components/UI/Button';
import Input from '../../core/components/UI/Input';
import Card from '../../core/components/UI/Card';

export default function BrandsManager() {
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingBrand, setEditingBrand] = useState(null);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [message, setMessage] = useState('');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const data = await getBrands();
      setBrands(data);
    } catch (error) { console.error(error); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingBrand) {
        await updateBrand(editingBrand._id, formData);
        setMessage('✅ Marca actualizada');
      } else {
        await createBrand(formData);
        setMessage('✅ Marca creada');
      }
      setShowModal(false);
      loadData();
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      alert(error.response?.data?.error || 'Error al guardar');
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

  if (loading) return <div className="text-center py-10">Cargando...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <span className="w-1 h-6 bg-green-600 rounded-full"></span>
          🏷️ Marcas
        </h2>
        <Button variant="primary" onClick={() => openModal()} className="bg-gradient-to-r from-green-600 to-green-700">
          + Nueva Marca
        </Button>
      </div>

      {message && <div className="p-4 bg-green-50 text-green-700 rounded-xl border border-green-200">{message}</div>}

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        {brands.map(b => (
          <Card key={b._id} className="p-4 text-center hover:shadow-md transition-all group">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2 text-2xl group-hover:scale-110 transition-transform">
              🏷️
            </div>
            <h3 className="font-bold text-gray-800 truncate">{b.name}</h3>
            <div className="mt-3 flex justify-center gap-2">
              <button onClick={() => openModal(b)} className="text-blue-600 hover:scale-125 transition">✏️</button>
              <button onClick={async () => { if(confirm('¿Eliminar?')) { await deleteBrand(b._id); loadData(); } }} className="text-red-600 hover:scale-125 transition">🗑️</button>
            </div>
          </Card>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-xl font-bold">{editingBrand ? 'Editar Marca' : 'Nueva Marca'}</h3>
            <Input label="Nombre de la Marca" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
            <Input label="Descripción (opcional)" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
            <div className="flex gap-3 pt-4">
              <Button type="submit" variant="primary" className="flex-1 bg-green-600">Guardar</Button>
              <Button type="button" variant="ghost" onClick={() => setShowModal(false)} className="flex-1">Cancelar</Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
