// client/src/modules/pos/pages/POSDashboard.jsx
import { useState, useEffect } from 'react';
import api from '../../../shared/services/api';
import POS from '../components/POS';
import Button from '../../core/components/UI/Button';

export default function POSDashboard() {
  const [showPOS, setShowPOS] = useState(false);
  const [stats, setStats] = useState({
    totalVentasHoy: 0,
    totalIngresosHoy: 0,
    totalDeudasPendientes: 0,
    ventas: [],
    deudasPendientes: [],
    loading: true
  });

  async function loadTodaySales() {
    setStats(prev => ({ ...prev, loading: true }));
    try {
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      
      const response = await api.get('/accounting/incomes', {
        params: { fechaInicio: hoy.toISOString() }
      });
      
      const ventas = response.data || [];
      const ventasEfectivo = ventas.filter(v => !v.esDeuda);
      const ventasCredito = ventas.filter(v => v.esDeuda);
      
      const totalIngresos = ventasEfectivo.reduce((sum, v) => sum + v.monto, 0);
      const totalDeudas = ventasCredito.reduce((sum, v) => sum + v.monto, 0);
      
      setStats(prev => ({
        ...prev,
        totalVentasHoy: ventas.length,
        totalIngresosHoy: totalIngresos,
        totalDeudasHoy: totalDeudas,
        ventas: ventas.slice(0, 10),
        loading: false
      }));
    } catch (error) {
      console.error('Error cargando ventas del día:', error);
      setStats(prev => ({ ...prev, loading: false }));
    }
  }

  async function loadPendingDebts() {
    try {
      const response = await api.get('/accounting/customer-debts');
      const todasLasDeudas = response.data || [];
      const deudasPendientes = todasLasDeudas.filter(deuda => deuda.estado === 'pendiente');
      const totalDeudasPendientes = deudasPendientes.reduce((sum, d) => sum + d.monto, 0);
      
      setStats(prev => ({
        ...prev,
        deudasPendientes: deudasPendientes.slice(0, 5),
        totalDeudasPendientes
      }));
    } catch (error) {
      console.error('Error cargando deudas pendientes:', error);
    }
  }

  useEffect(() => {
    if (!showPOS) {
      loadTodaySales();
      loadPendingDebts();
    }
  }, [showPOS]);

  const formatTime = (date) => new Date(date).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
  const formatDate = (date) => new Date(date).toLocaleDateString('es', { day: '2-digit', month: '2-digit', year: 'numeric' });

  if (showPOS) {
    return <POS onClose={() => setShowPOS(false)} onSaleComplete={() => {
      loadTodaySales();
      loadPendingDebts();
    }} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <span className="w-1 h-6 bg-green-600 rounded-full"></span>
            💳 Punto de Venta
          </h1>
          <p className="text-gray-500 text-sm mt-1">Ventas en mostrador y control de caja</p>
        </div>
        
        <Button 
          variant="primary" 
          onClick={() => setShowPOS(true)}
          className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Abrir Caja
        </Button>
      </div>

      {/* Tarjetas de resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-gradient-to-r from-green-50 to-green-100 border border-green-200 rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-600 font-medium">Ventas del día</p>
              <p className="text-3xl font-bold text-green-700">{stats.totalVentasHoy}</p>
              <p className="text-xs text-green-500 mt-1">transacciones</p>
            </div>
            <div className="text-4xl">💰</div>
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-600 font-medium">Ingresos en efectivo</p>
              <p className="text-3xl font-bold text-blue-700">Q{stats.totalIngresosHoy.toLocaleString()}</p>
              <p className="text-xs text-blue-500 mt-1">caja actual</p>
            </div>
            <div className="text-4xl">💵</div>
          </div>
        </div>
        
        <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 border border-yellow-200 rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-yellow-600 font-medium">Créditos del día</p>
              <p className="text-3xl font-bold text-yellow-700">Q{stats.totalDeudasHoy?.toLocaleString() || 0}</p>
              <p className="text-xs text-yellow-500 mt-1">ventas a crédito</p>
            </div>
            <div className="text-4xl">📝</div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-red-50 to-red-100 border border-red-200 rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-red-600 font-medium">Deudas pendientes</p>
              <p className="text-3xl font-bold text-red-700">Q{stats.totalDeudasPendientes.toLocaleString()}</p>
              <p className="text-xs text-red-500 mt-1">por cobrar</p>
            </div>
            <div className="text-4xl">⚠️</div>
          </div>
        </div>
      </div>

      {/* Deudas pendientes */}
      {stats.deudasPendientes.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 border-l-4 border-l-red-500">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <span>⚠️</span> Deudas pendientes por cobrar
            </h3>
          </div>
          <div className="space-y-3">
            {stats.deudasPendientes.map((deuda) => (
              <div key={deuda._id} className="flex justify-between items-center p-4 bg-red-50 rounded-xl">
                <div>
                  <p className="font-medium text-gray-800">{deuda.clienteNombre}</p>
                  <p className="text-xs text-gray-500">Desde: {formatDate(deuda.fecha)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-red-600">Q{deuda.monto.toLocaleString()}</p>
                  <button 
                    onClick={async () => {
                      if (confirm(`¿Marcar como pagada la deuda de ${deuda.clienteNombre} por Q${deuda.monto}?`)) {
                        await api.put(`/accounting/customer-debt/${deuda._id}/pay`, { metodo: 'efectivo' });
                        loadPendingDebts();
                        loadTodaySales();
                      }
                    }}
                    className="mt-2 text-xs bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 transition"
                  >
                    Marcar pagada
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ventas recientes */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <span className="w-1 h-4 bg-green-500 rounded-full"></span>
            📋 Ventas de hoy
          </h3>
          <button 
            onClick={loadTodaySales}
            className="text-sm text-green-600 hover:text-green-700 flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Actualizar
          </button>
        </div>
        
        {stats.loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
          </div>
        ) : stats.ventas.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <div className="text-5xl mb-3">🛒</div>
            <p>No hay ventas registradas hoy</p>
            <p className="text-sm text-gray-400 mt-1">Haz clic en "Abrir Caja" para comenzar</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-auto">
            {stats.ventas.map((venta) => (
              <div key={venta._id} className="flex justify-between items-center p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      venta.esDeuda ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'
                    }`}>
                      {venta.esDeuda ? '📝 Crédito' : '💰 Efectivo'}
                    </span>
                    <span className="text-sm text-gray-500">{formatTime(venta.fecha)}</span>
                  </div>
                  <p className="font-medium text-gray-800 mt-2">{venta.descripcion}</p>
                  <p className="text-xs text-gray-400 mt-1">{venta.clienteNombre || 'Cliente mostrador'}</p>
                </div>
                <div className="text-right">
                  <p className={`text-lg font-bold ${venta.esDeuda ? 'text-yellow-600' : 'text-green-600'}`}>
                    Q{venta.monto.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-400 capitalize mt-1">{venta.metodo}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Consejo rápido */}
      <div className="bg-gray-50 rounded-xl p-4 text-center">
        <p className="text-sm text-gray-600">
          💡 <span className="font-medium">Consejo:</span> Usa el lector de código de barras para agregar productos rápidamente. 
          Las ventas a crédito se registran automáticamente como deudas pendientes hasta que se marquen como pagadas.
        </p>
      </div>
    </div>
  );
}
