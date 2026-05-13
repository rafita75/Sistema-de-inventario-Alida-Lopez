// client/src/modules/accounting/pages/AccountingDashboard.jsx
import { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, ComposedChart
} from 'recharts';
import api from '../../../shared/services/api';
import QuickSaleModal from '../components/expenses/QuickSaleModal';
import ExpenseModal from '../components/expenses/ExpenseModal';
import CustomerDebtModal from '../components/debts/CustomerDebtModal';
import BusinessDebtModal from '../components/debts/BusinessDebtModal';
import ReportsModal from '../components/reports/ReportsModal';
import ConfirmModal from '../../core/components/UI/ConfirmModal';
import { useNotification } from '../../../shared/contexts/NotificationContext';
import { CardSkeleton } from '../../core/components/UI/Skeleton';

export default function AccountingDashboard() {
  const { notify } = useNotification();
  const [dashboard, setDashboard] = useState(null);
  const [balanceGeneral, setBalanceGeneral] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showSaleModal, setShowSaleModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showCustomerDebtModal, setShowCustomerDebtModal] = useState(false);
  const [showBusinessDebtModal, setShowBusinessDebtModal] = useState(false);
  const [showReports, setShowReports] = useState(false);
  
  // Estados para Confirmación
  const [confirmDebt, setConfirmDebt] = useState({ open: false, id: null, type: 'customer' });
  const [paying, setPaying] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [dashRes, balanceRes] = await Promise.all([
        api.get('/accounting/dashboard'),
        api.get('/accounting/balance-general')
      ]);
      setDashboard(dashRes.data);
      setBalanceGeneral(balanceRes.data);
    } catch (error) {
      console.error('Error cargando datos contables:', error);
      notify('Error al cargar datos financieros', 'error');
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handlePayDebt = async () => {
    setPaying(true);
    try {
      if (confirmDebt.type === 'customer') {
        await api.put(`/accounting/customer-debt/${confirmDebt.id}/pay`, { metodo: 'efectivo' });
        notify('Deuda de cliente pagada', 'success');
      } else {
        await api.put(`/accounting/business-debt/${confirmDebt.id}/pay`);
        notify('Deuda de negocio pagada', 'success');
      }
      setConfirmDebt({ open: false, id: null, type: 'customer' });
      loadData();
    } catch (error) {
      notify('Error al procesar pago', 'error');
    } finally {
      setPaying(false);
    }
  };

  const formatMonth = useCallback((monthStr) => {
    const [year, month] = monthStr.split('-');
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return `${months[parseInt(month) - 1]} ${year}`;
  }, []);

  const chartData = useMemo(() => balanceGeneral, [balanceGeneral]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-gray-200 rounded-lg animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[1,2,3,4,5].map(i => <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
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
            💰 Contabilidad
          </h2>
          <p className="text-gray-500 text-sm mt-1">Gestión financiera y balance general</p>
        </div>
      </div>

      {/* Botones de acción rápida */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <button
          onClick={() => setShowSaleModal(true)}
          className="flex flex-col items-center gap-2 p-4 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-2xl hover:shadow-lg transition-all"
        >
          <span className="text-3xl">💰</span>
          <span className="font-semibold text-sm">Venta rápida</span>
        </button>
        
        <button
          onClick={() => setShowExpenseModal(true)}
          className="flex flex-col items-center gap-2 p-4 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-2xl hover:shadow-lg transition-all"
        >
          <span className="text-3xl">💸</span>
          <span className="font-semibold text-sm">Gasto</span>
        </button>
        
        <button
          onClick={() => setShowCustomerDebtModal(true)}
          className="flex flex-col items-center gap-2 p-4 bg-gradient-to-r from-yellow-600 to-yellow-700 text-white rounded-2xl hover:shadow-lg transition-all"
        >
          <span className="text-3xl">📝</span>
          <span className="font-semibold text-sm">Deuda cliente</span>
        </button>
        
        <button
          onClick={() => setShowBusinessDebtModal(true)}
          className="flex flex-col items-center gap-2 p-4 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-2xl hover:shadow-lg transition-all"
        >
          <span className="text-3xl">🏪</span>
          <span className="font-semibold text-sm">Deuda negocio</span>
        </button>

        <button
          onClick={() => setShowReports(true)}
          className="flex flex-col items-center gap-2 p-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-2xl hover:shadow-lg transition-all"
        >
          <span className="text-3xl">📊</span>
          <span className="font-semibold text-sm">Reportes</span>
        </button>
      </div>

      {/* Tarjetas de resumen */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h3 className="text-sm font-medium text-gray-500 mb-3 flex items-center gap-2">
            <span className="w-1 h-4 bg-green-500 rounded-full"></span>
            Hoy
          </h3>
          <div className="flex justify-between items-baseline mb-2">
            <span className="text-gray-500 text-sm">Ingresos</span>
            <span className="text-xl font-bold text-green-600">+Q{dashboard?.hoy?.ingresos?.toLocaleString() || 0}</span>
          </div>
          <div className="flex justify-between items-baseline mb-2">
            <span className="text-gray-500 text-sm">Gastos</span>
            <span className="text-xl font-bold text-red-600">-Q{dashboard?.hoy?.gastos?.toLocaleString() || 0}</span>
          </div>
          <div className="border-t border-gray-100 mt-3 pt-3 flex justify-between items-baseline">
            <span className="font-semibold text-gray-700">Ganancia</span>
            <span className={`text-lg font-bold ${dashboard?.hoy?.ganancia >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              Q{dashboard?.hoy?.ganancia?.toLocaleString() || 0}
            </span>
          </div>
        </div>
        
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h3 className="text-sm font-medium text-gray-500 mb-3 flex items-center gap-2">
            <span className="w-1 h-4 bg-blue-500 rounded-full"></span>
            Esta semana
          </h3>
          <div className="flex justify-between items-baseline mb-2">
            <span className="text-gray-500 text-sm">Ingresos</span>
            <span className="text-xl font-bold text-green-600">+Q{dashboard?.semana?.ingresos?.toLocaleString() || 0}</span>
          </div>
          <div className="flex justify-between items-baseline mb-2">
            <span className="text-gray-500 text-sm">Gastos</span>
            <span className="text-xl font-bold text-red-600">-Q{dashboard?.semana?.gastos?.toLocaleString() || 0}</span>
          </div>
          <div className="border-t border-gray-100 mt-3 pt-3 flex justify-between items-baseline">
            <span className="font-semibold text-gray-700">Ganancia</span>
            <span className={`text-lg font-bold ${dashboard?.semana?.ganancia >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              Q{dashboard?.semana?.ganancia?.toLocaleString() || 0}
            </span>
          </div>
        </div>
        
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h3 className="text-sm font-medium text-gray-500 mb-3 flex items-center gap-2">
            <span className="w-1 h-4 bg-purple-500 rounded-full"></span>
            Este mes
          </h3>
          <div className="flex justify-between items-baseline mb-2">
            <span className="text-gray-500 text-sm">Ingresos</span>
            <span className="text-xl font-bold text-green-600">+Q{dashboard?.mes?.ingresos?.toLocaleString() || 0}</span>
          </div>
          <div className="flex justify-between items-baseline mb-2">
            <span className="text-gray-500 text-sm">Gastos</span>
            <span className="text-xl font-bold text-red-600">-Q{dashboard?.mes?.gastos?.toLocaleString() || 0}</span>
          </div>
          <div className="border-t border-gray-100 mt-3 pt-3 flex justify-between items-baseline">
            <span className="font-semibold text-gray-700">Ganancia</span>
            <span className={`text-lg font-bold ${dashboard?.mes?.ganancia >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              Q{dashboard?.mes?.ganancia?.toLocaleString() || 0}
            </span>
          </div>
        </div>
      </div>

      {/* Balance General Histórico */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-6 flex items-center gap-2">
          <span className="w-1 h-5 bg-green-600 rounded-full"></span>
          📈 Balance General (Últimos meses)
        </h3>
        
        <div className="h-80 w-full mb-8">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis 
                dataKey="mes" 
                tickFormatter={formatMonth}
                tick={{ fontSize: 12, fill: '#9ca3af' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis 
                tick={{ fontSize: 12, fill: '#9ca3af' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(value) => `Q${value}`}
              />
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                labelFormatter={formatMonth}
              />
              <Legend verticalAlign="top" height={36}/>
              <Bar dataKey="ingresos" name="Ingresos" fill="#16a34a" radius={[4, 4, 0, 0]} />
              <Bar dataKey="gastos" name="Gastos" fill="#dc2626" radius={[4, 4, 0, 0]} />
              <Line type="monotone" dataKey="ganancia" name="Ganancia Neta" stroke="#2563eb" strokeWidth={3} dot={{ r: 4 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-100 text-gray-400 text-sm">
                <th className="pb-3 font-medium">Mes</th>
                <th className="pb-3 font-medium text-right">Ingresos</th>
                <th className="pb-3 font-medium text-right">Gastos</th>
                <th className="pb-3 font-medium text-right">Ganancia Neta</th>
              </tr>
            </thead>
            <tbody>
              {balanceGeneral.map((item) => (
                <tr key={item.mes} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition">
                  <td className="py-3 font-medium text-gray-700">{formatMonth(item.mes)}</td>
                  <td className="py-3 text-right text-green-600 font-semibold">Q{item.ingresos.toLocaleString()}</td>
                  <td className="py-3 text-right text-red-600 font-semibold">Q{item.gastos.toLocaleString()}</td>
                  <td className={`py-3 text-right font-bold ${item.ganancia >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                    Q{item.ganancia.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Deudas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Deudas de clientes */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <span className="w-1 h-5 bg-yellow-500 rounded-full"></span>
            💰 Deudas de clientes
          </h3>
          <div className="text-2xl font-bold text-yellow-600 mb-4">
            Q{dashboard?.deudas?.clientes?.total?.toLocaleString() || 0}
          </div>
          {dashboard?.deudas?.clientes?.items?.length > 0 ? (
            <div className="space-y-3 max-h-80 overflow-auto">
              {dashboard.deudas.clientes.items.map((deuda) => (
                <div key={deuda._id} className="border-b border-gray-100 pb-3 last:border-0">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-gray-800">{deuda.clienteNombre}</p>
                      <p className="text-xs text-gray-400">
                        {new Date(deuda.fecha).toLocaleDateString()}
                      </p>
                      {deuda.notas && (
                        <p className="text-xs text-gray-400 mt-1">{deuda.notas}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-yellow-600">Q{deuda.monto.toLocaleString()}</p>
                      {deuda.fechaLimite && (
                        <p className="text-xs text-gray-400">
                          Vence: {new Date(deuda.fechaLimite).toLocaleDateString()}
                        </p>
                      )}
                      <button
                        onClick={() => setConfirmDebt({ open: true, id: deuda._id, type: 'customer' })}
                        className="mt-2 text-xs bg-green-600 text-white px-3 py-1 rounded-lg hover:bg-green-700 transition"
                      >
                        Pagar
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">No hay deudas pendientes</p>
          )}
        </div>
        
        {/* Deudas del negocio */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <span className="w-1 h-5 bg-red-500 rounded-full"></span>
            🏢 Deudas del negocio
          </h3>
          <div className="text-2xl font-bold text-red-600 mb-4">
            Q{dashboard?.deudas?.negocio?.total?.toLocaleString() || 0}
          </div>
          {dashboard?.deudas?.negocio?.items?.length > 0 ? (
            <div className="space-y-3 max-h-80 overflow-auto">
              {dashboard.deudas.negocio.items.map((deuda) => (
                <div key={deuda._id} className="border-b border-gray-100 pb-3 last:border-0">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-gray-800">{deuda.proveedor}</p>
                      <p className="text-xs text-gray-400">
                        {new Date(deuda.fecha).toLocaleDateString()}
                      </p>
                      {deuda.notas && (
                        <p className="text-xs text-gray-400 mt-1">{deuda.notas}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-red-600">Q{deuda.monto.toLocaleString()}</p>
                      {deuda.fechaLimite && (
                        <p className="text-xs text-gray-400">
                          Vence: {new Date(deuda.fechaLimite).toLocaleDateString()}
                        </p>
                      )}
                      <button
                        onClick={() => setConfirmDebt({ open: true, id: deuda._id, type: 'business' })}
                        className="mt-2 text-xs bg-green-600 text-white px-3 py-1 rounded-lg hover:bg-green-700 transition"
                      >
                        Pagar
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">No hay deudas pendientes</p>
          )}
        </div>
      </div>

      {/* Últimos movimientos */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <span className="w-1 h-5 bg-green-500 rounded-full"></span>
          📋 Últimos movimientos
        </h3>
        <div className="text-2xl font-bold text-gray-800 mb-4">
          Saldo en caja: <span className="text-green-600">Q{dashboard?.caja?.saldoActual?.toLocaleString() || 0}</span>
        </div>
        <div className="space-y-2 max-h-96 overflow-auto">
          {dashboard?.caja?.ultimosMovimientos?.length > 0 ? (
            dashboard.caja.ultimosMovimientos.map((mov) => (
              <div key={mov._id} className="flex justify-between items-center p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition">
                <div>
                  <p className="font-medium text-gray-800">{mov.descripcion}</p>
                  <p className="text-xs text-gray-400">
                    {new Date(mov.fecha).toLocaleString()}
                  </p>
                </div>
                <div className={`font-bold ${mov.tipo === 'ingreso' ? 'text-green-600' : 'text-red-600'}`}>
                  {mov.tipo === 'ingreso' ? '+' : '-'}Q{mov.monto.toLocaleString()}
                </div>
              </div>
            ))
          ) : (
            <p className="text-gray-500 text-center py-4">No hay movimientos registrados</p>
          )}
        </div>
      </div>

      {/* Modales */}
      <QuickSaleModal
        isOpen={showSaleModal}
        onClose={() => setShowSaleModal(false)}
        onSuccess={() => {
          setShowSaleModal(false);
          loadData();
          notify('Venta registrada correctamente', 'success');
        }}
      />
      
      <ExpenseModal
        isOpen={showExpenseModal}
        onClose={() => setShowExpenseModal(false)}
        onSuccess={() => {
          setShowExpenseModal(false);
          loadData();
          notify('Gasto registrado correctamente', 'success');
        }}
      />
      
      <CustomerDebtModal
        isOpen={showCustomerDebtModal}
        onClose={() => setShowCustomerDebtModal(false)}
        onSuccess={() => {
          setShowCustomerDebtModal(false);
          loadData();
          notify('Deuda registrada', 'success');
        }}
      />
      
      <BusinessDebtModal
        isOpen={showBusinessDebtModal}
        onClose={() => setShowBusinessDebtModal(false)}
        onSuccess={() => {
          setShowBusinessDebtModal(false);
          loadData();
          notify('Deuda registrada', 'success');
        }}
      />

      <ReportsModal
        isOpen={showReports}
        onClose={() => setShowReports(false)}
      />

      <ConfirmModal
        isOpen={confirmDebt.open}
        onClose={() => setConfirmDebt({ ...confirmDebt, open: false })}
        onConfirm={handlePayDebt}
        loading={paying}
        title="Confirmar Pago"
        message={confirmDebt.type === 'customer' 
          ? "¿Marcar esta deuda como pagada? Se registrará el ingreso en caja."
          : "¿Marcar esta deuda como pagada? Se registrará el gasto."
        }
        confirmText="Confirmar Pago"
        type="success"
      />
    </div>
  );
}
