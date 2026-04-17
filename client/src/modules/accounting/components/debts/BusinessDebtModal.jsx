// client/src/components/accounting/BusinessDebtModal.jsx
import { useState } from 'react';
import api from '../../../../shared/services/api';
import Button from '../../../core/components/UI/Button';
import Input from '../../../core/components/UI/Input';

export default function BusinessDebtModal({ isOpen, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    proveedor: '',
    monto: '',
    fechaLimite: '',
    notas: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      await api.post('/accounting/business-debt', formData);
      onSuccess();
      setFormData({ proveedor: '', monto: '', fechaLimite: '', notas: '' });
    } catch (err) {
      setError(err.response?.data?.error || 'Error al registrar deuda');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-hard animate-scale-in">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <span>🏢</span> Deuda del negocio
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition p-1">
            ✕
          </button>
        </div>
        
        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-xl text-sm border border-red-200">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Proveedor"
            type="text"
            value={formData.proveedor}
            onChange={(e) => setFormData({ ...formData, proveedor: e.target.value })}
            placeholder="Ej: Distribuidora XYZ"
            required
            icon="🏭"
          />
          
          <Input
            label="Monto"
            type="number"
            value={formData.monto}
            onChange={(e) => setFormData({ ...formData, monto: e.target.value })}
            placeholder="0.00"
            required
            step="0.01"
            icon="💰"
          />
          
          <Input
            label="Fecha límite"
            type="date"
            value={formData.fechaLimite}
            onChange={(e) => setFormData({ ...formData, fechaLimite: e.target.value })}
            icon="📅"
          />
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
            <textarea
              value={formData.notas}
              onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
              className="w-full p-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
              rows="2"
              placeholder="Información adicional..."
            />
          </div>
          
          <div className="flex gap-3 pt-2">
            <Button
              type="submit"
              variant="secondary"
              loading={loading}
              className="flex-1"
            >
              Registrar deuda
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
            >
              Cancelar
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}