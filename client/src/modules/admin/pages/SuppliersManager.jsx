// client/src/modules/admin/pages/SuppliersManager.jsx
import React, { useState, useEffect } from 'react';
import { getSuppliers, createSupplier, updateSupplier, deleteSupplier } from '../../../shared/services/supplierService';
import Button from '../../core/components/UI/Button';
import Input from '../../core/components/UI/Input';
import Card from '../../core/components/UI/Card';

export default function SuppliersManager() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingSupplier, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({ name: '', contactName: '', phone: '', email: '', address: '', nit: '', notes: '' });
  const [message, setMessage] = useState('');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const data = await getSuppliers();
      setSuppliers(data);
    } catch (error) { console.error(error); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingSupplier) {
        await updateSupplier(editingSupplier._id, formData);
        setMessage('✅ Proveedor actualizado');
      } else {
        await createSupplier(formData);
        setMessage('✅ Proveedor creado');
      }
      setShowModal(false);
      loadData();
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      alert(error.response?.data?.error || 'Error al guardar');
    }
  };

  const openModal = (supplier = null) => {
    if (supplier) {
      setEditingProduct(supplier);
      setFormData(supplier);
    } else {
      setEditingProduct(null);
      setFormData({ name: '', contactName: '', phone: '', email: '', address: '', nit: '', notes: '' });
    }
    setShowModal(true);
  };

  if (loading) return <div className="text-center py-10">Cargando...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <span className="w-1 h-6 bg-green-600 rounded-full"></span>
          🚚 Proveedores
        </h2>
        <Button variant="primary" onClick={() => openModal()} className="bg-gradient-to-r from-green-600 to-green-700">
          + Nuevo Proveedor
        </Button>
      </div>

      {message && <div className="p-4 bg-green-50 text-green-700 rounded-xl border border-green-200">{message}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {suppliers.map(s => (
          <Card key={s._id} className="p-4 hover:shadow-md transition-all border-l-4 border-l-green-600">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-gray-800 text-lg">{s.name}</h3>
                <p className="text-sm text-gray-500">👤 {s.contactName || 'Sin contacto'}</p>
                <p className="text-sm text-gray-500">📞 {s.phone || 'Sin teléfono'}</p>
                <p className="text-sm text-gray-500">📧 {s.email || 'Sin email'}</p>
              </div>
              <div className="flex gap-1">
                <button onClick={() => openModal(s)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg">✏️</button>
                <button onClick={async () => { if(confirm('¿Eliminar?')) { await deleteSupplier(s._id); loadData(); } }} className="p-2 text-red-600 hover:bg-red-50 rounded-lg">🗑️</button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-xl font-bold">{editingSupplier ? 'Editar Proveedor' : 'Nuevo Proveedor'}</h3>
            <Input label="Nombre de la Empresa" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
            <div className="grid grid-cols-2 gap-4">
              <Input label="Contacto" value={formData.contactName} onChange={e => setFormData({...formData, contactName: e.target.value})} />
              <Input label="NIT" value={formData.nit} onChange={e => setFormData({...formData, nit: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Teléfono" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
              <Input label="Email" type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
            </div>
            <Input label="Dirección" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
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
