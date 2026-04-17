// client/src/components/accounting/QuickSaleModal.jsx
import { useState } from 'react';
import api from '../../../../shared/services/api';
import Button from '../../../core/components/UI/Button';
import Input from '../../../core/components/UI/Input';

export default function QuickSaleModal({ isOpen, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    monto: '',
    descripcion: '',
    metodo: 'efectivo',
    clienteNombre: '',
    clienteTelefono: '',
    esDeuda: false,
    notas: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    // 👈 VALIDAR Y LIMPIAR EL MONTO
    let montoLimpio = formData.monto;
    
    // Si es string, eliminar comas y caracteres no numéricos
    if (typeof montoLimpio === 'string') {
      montoLimpio = montoLimpio.replace(/[^0-9.-]/g, '');
    }
    
    // Convertir a número
    const montoNumerico = parseFloat(montoLimpio);
    
    // Validar
    if (isNaN(montoNumerico) || montoNumerico <= 0) {
      setError('Ingrese un monto válido (número positivo)');
      setLoading(false);
      return;
    }
    
    // Limitar a 2 decimales
    const montoFinal = Math.round(montoNumerico * 100) / 100;
    
    try {
      await api.post('/accounting/sale', {
        ...formData,
        monto: montoFinal  // 👈 Enviar número limpio
      });
      onSuccess();
      setFormData({
        monto: '',
        descripcion: '',
        metodo: 'efectivo',
        clienteNombre: '',
        clienteTelefono: '',
        esDeuda: false,
        notas: ''
      });
    } catch (err) {
      setError(err.response?.data?.error || 'Error al registrar venta');
    } finally {
      setLoading(false);
    }
  };

  // 👈 Función para manejar cambio en el monto
  const handleMontoChange = (e) => {
    let value = e.target.value;
    // Permitir solo números, punto y guión
    value = value.replace(/[^0-9.-]/g, '');
    // Evitar múltiples puntos
    const parts = value.split('.');
    if (parts.length > 2) {
      value = parts[0] + '.' + parts.slice(1).join('');
    }
    setFormData({ ...formData, monto: value });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-fade-in">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-hard animate-scale-in">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <span>💰</span> Venta rápida
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
            type="text"
            value={formData.monto}
            onChange={handleMontoChange}
            placeholder="0.00"
            required
            icon="💰"
          />
          
          <Input
            label="Descripción"
            type="text"
            value={formData.descripcion}
            onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
            placeholder="Ej: Corte de pelo, Almuerzo, etc."
            required
            icon="📝"
          />
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Método de pago</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'efectivo', label: '💵 Efectivo', color: 'green' },
                { value: 'transferencia', label: '🏦 Transferencia', color: 'blue' },
                { value: 'tarjeta', label: '💳 Tarjeta', color: 'purple' }
              ].map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, metodo: opt.value })}
                  className={`p-2 rounded-xl border-2 text-sm font-medium transition ${
                    formData.metodo === opt.value
                      ? `border-${opt.color}-500 bg-${opt.color}-50 text-${opt.color}-700`
                      : 'border-gray-200 hover:border-gray-300 text-gray-600'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Cliente (opcional)"
              type="text"
              value={formData.clienteNombre}
              onChange={(e) => setFormData({ ...formData, clienteNombre: e.target.value })}
              placeholder="Nombre"
            />
            <Input
              label="Teléfono (opcional)"
              type="tel"
              value={formData.clienteTelefono}
              onChange={(e) => setFormData({ ...formData, clienteTelefono: e.target.value })}
              placeholder="Teléfono"
            />
          </div>
          
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
            <input
              type="checkbox"
              id="esDeuda"
              checked={formData.esDeuda}
              onChange={(e) => setFormData({ ...formData, esDeuda: e.target.checked })}
              className="w-4 h-4 text-yellow-600 rounded focus:ring-yellow-500"
            />
            <label htmlFor="esDeuda" className="text-sm text-gray-700 cursor-pointer">
              Es a crédito (fiado) - No afecta caja
            </label>
          </div>
          
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
              variant="success"
              loading={loading}
              className="flex-1"
            >
              Registrar venta
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