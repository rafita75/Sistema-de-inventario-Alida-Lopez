import { useState } from 'react';
import api from '../../../../shared/services/api';
import Button from '../../../core/components/UI/Button';
import Input from '../../../core/components/UI/Input';

const categorias = [
  { value: 'insumos', label: '📦 Insumos / Materia prima', activeClasses: 'border-blue-500 bg-blue-50 text-blue-700' },
  { value: 'servicios', label: '💡 Servicios (luz, agua, internet)', activeClasses: 'border-yellow-500 bg-yellow-50 text-yellow-700' },
  { value: 'renta', label: '🏠 Renta / Alquiler', activeClasses: 'border-orange-500 bg-orange-50 text-orange-700' },
  { value: 'sueldos', label: '👥 Sueldos', activeClasses: 'border-purple-500 bg-purple-50 text-purple-700' },
  { value: 'publicidad', label: '📢 Publicidad', activeClasses: 'border-pink-500 bg-pink-50 text-pink-700' },
  { value: 'transporte', label: '🚚 Transporte', activeClasses: 'border-indigo-500 bg-indigo-50 text-indigo-700' },
  { value: 'otros', label: '📝 Otros', activeClasses: 'border-gray-500 bg-gray-50 text-gray-700' }
];

export default function ExpenseModal({ isOpen, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    monto: '',
    categoria: 'insumos',
    descripcion: '',
    comprobante: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await api.post('/accounting/expense', formData);
      onSuccess();
      setFormData({ monto: '', categoria: 'insumos', descripcion: '', comprobante: '' });
    } catch (err) {
      setError(err.response?.data?.error || 'Error al registrar gasto');
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
            <span>💸</span> Registrar gasto
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
            label="Monto"
            type="number"
            value={formData.monto}
            onChange={(e) => setFormData({ ...formData, monto: e.target.value })}
            placeholder="0.00"
            required
            step="0.01"
            icon="💰"
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
            <div className="grid grid-cols-2 gap-2">
              {categorias.map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, categoria: cat.value })}
                  className={`p-2 rounded-xl border-2 text-sm font-medium transition ${
                    formData.categoria === cat.value
                      ? cat.activeClasses
                      : 'border-gray-200 hover:border-gray-300 text-gray-600'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          <Input
            label="Descripción"
            type="text"
            value={formData.descripcion}
            onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
            placeholder="Ej: Compra de insumos, Pago de luz"
            required
            icon="📝"
          />

          <Input
            label="Comprobante (URL)"
            type="text"
            value={formData.comprobante}
            onChange={(e) => setFormData({ ...formData, comprobante: e.target.value })}
            placeholder="https://..."
            icon="🔗"
          />

          <div className="flex gap-3 pt-2">
            <Button
              type="submit"
              variant="danger"
              loading={loading}
              className="flex-1"
            >
              Registrar gasto
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
