// client/src/modules/inventory/components/StockMovementHistory.jsx
import { useState, useEffect, useCallback } from 'react';
import { getSales, getFilteredMovements, getMovementStats } from '../services/inventoryService';

const typeLabels = {
  sale: 'Venta',
  purchase: 'Compra',
  adjustment: 'Ajuste',
  return: 'Devolución'
};

const typeColors = {
  sale: 'bg-blue-100 text-blue-700',
  purchase: 'bg-green-100 text-green-700',
  adjustment: 'bg-yellow-100 text-yellow-700',
  return: 'bg-purple-100 text-purple-700'
};

export default function StockMovementHistory() {
  const [viewMode, setViewMode] = useState('grouped');
  const [sales, setSales] = useState([]);
  const [movements, setMovements] = useState([]);
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    type: ''
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      if (viewMode === 'grouped') {
        const salesData = await getSales({ limit: 50 });
        setSales(salesData);
      } else {
        const movementsData = await getFilteredMovements(filters);
        setMovements(movementsData);
      }
      const statsData = await getMovementStats(30);
      setStats(statsData);
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  }, [filters, viewMode]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="space-y-3">
            <div className="h-16 bg-gray-100 rounded-xl"></div>
            <div className="h-16 bg-gray-100 rounded-xl"></div>
            <div className="h-16 bg-gray-100 rounded-xl"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      {/* Header con tabs */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <span className="w-1 h-5 bg-green-500 rounded-full"></span>
          📋 Movimientos
        </h3>
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('grouped')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              viewMode === 'grouped' 
                ? 'bg-green-600 text-white shadow-sm' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            📦 Por venta
          </button>
          <button
            onClick={() => setViewMode('detailed')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              viewMode === 'detailed' 
                ? 'bg-green-600 text-white shadow-sm' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            🔍 Detallado
          </button>
        </div>
      </div>

      {/* Gráfica */}
      {stats.length > 0 && (
        <div className="mb-6 p-4 bg-gray-50 rounded-xl">
          <h4 className="text-sm font-medium text-gray-600 mb-3">📊 Movimientos (últimos 30 días)</h4>
          <div className="flex items-end gap-2 h-32">
            {stats.map(day => {
              const maxValue = Math.max(...stats.map(s => s.sales + s.purchases + s.adjustments), 1);
              const salesHeight = (day.sales / maxValue) * 80;
              const purchasesHeight = (day.purchases / maxValue) * 80;
              const adjustmentsHeight = (day.adjustments / maxValue) * 80;
              
              return (
                <div key={day._id} className="flex-1 flex flex-col items-center">
                  <div className="w-full flex flex-col gap-1 items-center">
                    {purchasesHeight > 0 && (
                      <div 
                        className="w-full bg-green-500 rounded-t transition-all hover:opacity-80"
                        style={{ height: `${purchasesHeight}px`, maxHeight: '80px' }}
                        title={`Compras: ${day.purchases}`}
                      ></div>
                    )}
                    {salesHeight > 0 && (
                      <div 
                        className="w-full bg-red-500 rounded-t transition-all hover:opacity-80"
                        style={{ height: `${salesHeight}px`, maxHeight: '80px' }}
                        title={`Ventas: ${day.sales}`}
                      ></div>
                    )}
                    {adjustmentsHeight > 0 && (
                      <div 
                        className="w-full bg-yellow-500 rounded-t transition-all hover:opacity-80"
                        style={{ height: `${adjustmentsHeight}px`, maxHeight: '80px' }}
                        title={`Ajustes: ${day.adjustments}`}
                      ></div>
                    )}
                  </div>
                  <span className="text-xs text-gray-500 mt-2">
                    {new Date(day._id).toLocaleDateString('es', { day: '2-digit', month: '2-digit' })}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="flex justify-center gap-4 mt-4 text-xs">
            <span className="flex items-center gap-1"><div className="w-3 h-3 bg-green-500 rounded"></div> Compras</span>
            <span className="flex items-center gap-1"><div className="w-3 h-3 bg-red-500 rounded"></div> Ventas</span>
            <span className="flex items-center gap-1"><div className="w-3 h-3 bg-yellow-500 rounded"></div> Ajustes</span>
          </div>
        </div>
      )}

      {/* Filtros */}
      {viewMode === 'detailed' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          <input
            type="date"
            value={filters.startDate}
            onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
            className="p-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <input
            type="date"
            value={filters.endDate}
            onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
            className="p-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <select
            value={filters.type}
            onChange={(e) => setFilters({ ...filters, type: e.target.value })}
            className="p-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="">Todos los tipos</option>
            <option value="sale">Ventas</option>
            <option value="purchase">Compras</option>
            <option value="adjustment">Ajustes</option>
          </select>
        </div>
      )}
      
      {/* Lista */}
      <div className="space-y-3 max-h-96 overflow-auto">
        {viewMode === 'grouped' ? (
          sales.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <div className="text-5xl mb-3">🛒</div>
              <p>No hay ventas registradas</p>
              <p className="text-sm text-gray-400 mt-1">Las ventas del POS aparecerán aquí</p>
            </div>
          ) : (
            sales.map(sale => (
              <div key={sale._id} className="border border-gray-100 rounded-xl overflow-hidden hover:shadow-md transition">
                <div className="bg-gray-50 p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div>
                    <p className="font-semibold text-gray-800">#{sale.invoiceNumber || 'Manual'}</p>
                    <p className="text-xs text-gray-400">
                      {sale.fecha ? new Date(sale.fecha).toLocaleString() : '—'} • {sale.clienteNombre || 'Mostrador'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-green-600">Q{(sale.monto || 0).toLocaleString()}</p>
                    <p className="text-xs text-gray-400 capitalize">{sale.metodo || 'efectivo'}</p>
                  </div>
                </div>
                <div className="p-4 bg-white space-y-2">
                  {(sale.items || []).map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">{item.name} <span className="text-gray-400">x{item.quantity}</span></span>
                      <span className="font-medium text-gray-800">Q{((item.price || 0) * (item.quantity || 0)).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )
        ) : (
          movements.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <div className="text-5xl mb-3">📭</div>
              <p>No hay movimientos registrados</p>
              <p className="text-sm text-gray-400 mt-1">Aplica filtros para ver más resultados</p>
            </div>
          ) : (
            movements.map(mov => (
              <div key={mov._id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition">
                <div className="flex-1 mb-2 sm:mb-0">
                  <p className="font-medium text-gray-800">{mov.productName}</p>
                  <div className="flex flex-wrap gap-2 text-xs text-gray-400 mt-1">
                    <span>{new Date(mov.createdAt).toLocaleString()}</span>
                    {mov.saleId && (
                      <span className="text-blue-600 font-medium">#{mov.saleId.saleNumber}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${typeColors[mov.type]}`}>
                    {typeLabels[mov.type]}
                  </span>
                  <p className={`text-sm font-semibold ${mov.quantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {mov.quantity > 0 ? `+${mov.quantity}` : mov.quantity}
                  </p>
                  <p className="text-xs text-gray-400">
                    {mov.previousStock} → {mov.newStock}
                  </p>
                </div>
              </div>
            ))
          )
        )}
      </div>
    </div>
  );
}
