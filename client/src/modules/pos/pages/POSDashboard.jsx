// client/src/modules/pos/pages/POSDashboard.jsx
import { useState, useEffect, useCallback } from 'react';
import POS from '../components/POS';
import api from '../../../shared/services/api';
import Card from '../../core/components/UI/Card';
import Button from '../../core/components/UI/Button';
import { useNotification } from '../../../shared/contexts/NotificationContext';
import ConfirmModal from '../../core/components/UI/ConfirmModal';
import { CardSkeleton } from '../../core/components/UI/Skeleton';

export default function POSDashboard() {
  const { notify } = useNotification();
  const [showPOS, setShowPOS] = useState(false);
  const [stats, setStats] = useState({
    totalVentasHoy: 0,
    totalIngresosHoy: 0,
    totalDeudasHoy: 0,
    ventas: [],
    deudasPendientes: [],
    totalDeudasPendientes: 0,
    loading: true
  });

  // Estados para Confirmación de Deuda
  const [confirmDebt, setConfirmDebt] = useState({ open: false, id: null, cliente: '', monto: 0 });
  const [paying, setPaying] = useState(false);

  const loadTodaySales = useCallback(async () => {
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
      console.warn('Acceso limitado a estadísticas de contabilidad');
      setStats(prev => ({
        ...prev,
        totalVentasHoy: 0,
        totalIngresosHoy: 0,
        totalDeudasHoy: 0,
        ventas: [],
        loading: false
      }));
    }
  }, []);

  const loadPendingDebts = useCallback(async () => {
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
      console.warn('Acceso limitado a deudas de clientes');
      setStats(prev => ({
        ...prev,
        deudasPendientes: [],
        totalDeudasPendientes: 0
      }));
    }
  }, []);

  const loadDashboardData = useCallback(async () => {
    await Promise.all([
      loadTodaySales(),
      loadPendingDebts()
    ]);
  }, [loadPendingDebts, loadTodaySales]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const getSaleStatus = (sale) => {
    if (sale.status === 'collected' || sale.notas?.includes('Pagada:')) {
      return {
        label: 'COBRADA',
        classes: 'bg-green-100 text-green-700'
      };
    }

    if (sale.esDeuda) {
      return {
        label: 'DEUDA',
        classes: 'bg-yellow-100 text-yellow-700'
      };
    }

    return {
      label: 'PAGADO',
      classes: 'bg-green-100 text-green-700'
    };
  };

  const handlePayDebt = async () => {
    setPaying(true);
    try {
      await api.put(`/accounting/customer-debt/${confirmDebt.id}/pay`, { metodo: 'efectivo' });
      notify('Pago registrado correctamente', 'success');
      setConfirmDebt({ open: false, id: null, cliente: '', monto: 0 });
      loadDashboardData();
    } catch (error) {
      notify('Error al registrar pago', 'error');
    } finally {
      setPaying(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header con botón principal */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <span className="w-1 h-6 bg-green-600 rounded-full"></span>
            💳 Punto de Venta
          </h2>
          <p className="text-gray-500 text-sm mt-1">Registra nuevas ventas y abonos de clientes</p>
        </div>
        <Button 
          variant="primary" 
          onClick={() => setShowPOS(true)} 
          className="bg-gradient-to-r from-green-600 to-green-700 h-14 px-8 text-lg font-black shadow-xl shadow-green-100 hover:scale-105 active:scale-95 transition-all"
        >
          🚀 NUEVA VENTA
        </Button>
      </div>

      {stats.loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-white p-6 border-l-4 border-l-green-600 shadow-sm">
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Ventas de Hoy</p>
            <div className="flex items-center justify-between">
              <p className="text-3xl font-black text-gray-800">{stats.totalVentasHoy}</p>
              <div className="text-2xl">🛍️</div>
            </div>
          </Card>
          <Card className="bg-white p-6 border-l-4 border-l-green-600 shadow-sm">
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Efectivo Ingresado</p>
            <div className="flex items-center justify-between">
              <p className="text-3xl font-black text-green-600">Q{stats.totalIngresosHoy.toLocaleString()}</p>
              <div className="text-2xl">💵</div>
            </div>
          </Card>
          <Card className="bg-white p-6 border-l-4 border-l-yellow-500 shadow-sm">
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Ventas a Crédito</p>
            <div className="flex items-center justify-between">
              <p className="text-3xl font-black text-yellow-600">Q{stats.totalDeudasHoy.toLocaleString()}</p>
              <div className="text-2xl">📝</div>
            </div>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tabla de ventas recientes */}
        <Card title="Últimas ventas" className="shadow-sm border-gray-100">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 font-bold uppercase text-[10px] tracking-widest">
                <tr>
                  <th className="p-4 text-left">Factura</th>
                  <th className="p-4 text-left">Cliente</th>
                  <th className="p-4 text-right">Total</th>
                  <th className="p-4 text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {stats.ventas.map(venta => {
                  const saleStatus = getSaleStatus(venta);

                  return (
                    <tr key={venta._id} className="hover:bg-gray-50 transition">
                      <td className="p-4 font-mono font-bold text-green-700">#{venta.invoiceNumber || 'POS'}</td>
                      <td className="p-4">
                        <p className="font-bold text-gray-800">{venta.clienteNombre}</p>
                        <p className="text-[10px] text-gray-400 uppercase">{venta.metodo}</p>
                      </td>
                      <td className="p-4 text-right font-black text-gray-900">Q{venta.monto.toLocaleString()}</td>
                      <td className="p-4 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${saleStatus.classes}`}>
                          {saleStatus.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {stats.ventas.length === 0 && (
                  <tr><td colSpan="4" className="p-8 text-center text-gray-400">No hay ventas registradas hoy</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Deudas pendientes */}
        <Card title="Cuentas por Cobrar" className="shadow-sm border-gray-100">
          <div className="flex items-center justify-between mb-4 bg-red-50 p-4 rounded-2xl border border-red-100">
            <div>
              <p className="text-xs font-black text-red-400 uppercase tracking-widest">Total por recuperar</p>
              <p className="text-3xl font-bold text-red-700">Q{stats.totalDeudasPendientes.toLocaleString()}</p>
            </div>
            <div className="text-4xl">⚠️</div>
          </div>
          <div className="space-y-3">
            {stats.deudasPendientes.map(deuda => (
              <div key={deuda._id} className="p-4 bg-white border border-gray-100 rounded-2xl flex justify-between items-center hover:shadow-md transition-shadow">
                <div>
                  <p className="font-black text-gray-800">{deuda.clienteNombre}</p>
                  <p className="text-xs text-gray-400">{new Date(deuda.fecha).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <p className="font-black text-yellow-600">Q{deuda.monto.toLocaleString()}</p>
                  <button 
                    onClick={() => setConfirmDebt({ 
                      open: true, 
                      id: deuda._id, 
                      cliente: deuda.clienteNombre, 
                      monto: deuda.monto 
                    })}
                    className="text-[10px] font-black uppercase text-green-600 hover:underline mt-1"
                  >
                    Marcar Pagado
                  </button>
                </div>
              </div>
            ))}
            {stats.deudasPendientes.length === 0 && (
              <p className="text-center py-8 text-gray-400 italic">No hay deudas pendientes ✅</p>
            )}
          </div>
        </Card>
      </div>

      {showPOS && (
        <POS 
          onClose={() => setShowPOS(false)} 
          onSaleComplete={() => {
            loadDashboardData();
          }}
        />
      )}

      <ConfirmModal
        isOpen={confirmDebt.open}
        onClose={() => setConfirmDebt({ ...confirmDebt, open: false })}
        onConfirm={handlePayDebt}
        loading={paying}
        title="Confirmar Cobro"
        message={`¿Deseas marcar como pagada la deuda de ${confirmDebt.cliente} por Q${confirmDebt.monto.toLocaleString()}?`}
        confirmText="Confirmar Pago"
        type="success"
      />

      <div className="bg-blue-50 p-6 rounded-[2rem] border border-blue-100">
        <h4 className="font-bold text-blue-800 flex items-center gap-2 mb-2">
          <span>💡</span> Consejos de uso
        </h4>
        <p className="text-blue-600 text-sm leading-relaxed">
          <span className="font-black">Escáner:</span> Usa el lector de código de barras para agregar productos rápidamente. 
          Las ventas a crédito se registran automáticamente como deudas pendientes hasta que se marquen como pagadas.
        </p>
      </div>
    </div>
  );
}
