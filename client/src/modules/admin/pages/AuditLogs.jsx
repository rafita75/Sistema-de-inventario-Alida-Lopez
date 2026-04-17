import { useState, useEffect } from 'react';
import api from '../../../shared/services/api';

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 1 });
  const [filters, setFilters] = useState({ module: '', action: '', search: '' });

  useEffect(() => {
    loadLogs();
  }, [pagination.page, filters.module, filters.action]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.page,
        module: filters.module,
        action: filters.action,
        search: filters.search
      };
      const { data } = await api.get('/audit', { params });
      setLogs(data.logs);
      setPagination(prev => ({ ...prev, total: data.pagination.total, pages: data.pagination.pages }));
    } catch (error) {
      console.error('Error al cargar auditoría:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActionColor = (action) => {
    switch (action) {
      case 'CREATE': return 'bg-green-100 text-green-700';
      case 'UPDATE': return 'bg-blue-100 text-blue-700';
      case 'DELETE': return 'bg-red-100 text-red-700';
      case 'PRICE_CHANGE': return 'bg-purple-100 text-purple-700';
      case 'STOCK_ADJUSTMENT': return 'bg-yellow-100 text-yellow-700';
      case 'CASH_CLOSING': return 'bg-indigo-100 text-indigo-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getModuleIcon = (module) => {
    switch (module) {
      case 'INVENTORY': return '📦';
      case 'ACCOUNTING': return '💰';
      case 'POS': return '🏪';
      case 'AUTH': return '🔑';
      default: return '📝';
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <span className="w-1 h-6 bg-green-600 rounded-full"></span>
            📜 Logs de Auditoría
          </h2>
          <p className="text-gray-500 text-sm mt-1">Registro de todas las acciones administrativas</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="space-y-1">
          <label className="text-xs font-semibold text-gray-400 uppercase ml-1">Buscar</label>
          <input
            type="text"
            placeholder="Usuario, producto, descripción..."
            className="w-full bg-gray-50 border-none rounded-2xl px-4 py-2 text-sm focus:ring-2 focus:ring-green-500"
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            onKeyPress={(e) => e.key === 'Enter' && loadLogs()}
          />
        </div>
        
        <div className="space-y-1">
          <label className="text-xs font-semibold text-gray-400 uppercase ml-1">Módulo</label>
          <select
            className="w-full bg-gray-50 border-none rounded-2xl px-4 py-2 text-sm focus:ring-2 focus:ring-green-500"
            value={filters.module}
            onChange={(e) => setFilters({ ...filters, module: e.target.value, page: 1 })}
          >
            <option value="">Todos los módulos</option>
            <option value="INVENTORY">Inventario</option>
            <option value="ACCOUNTING">Contabilidad</option>
            <option value="POS">Punto de Venta</option>
            <option value="AUTH">Seguridad</option>
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-gray-400 uppercase ml-1">Acción</label>
          <select
            className="w-full bg-gray-50 border-none rounded-2xl px-4 py-2 text-sm focus:ring-2 focus:ring-green-500"
            value={filters.action}
            onChange={(e) => setFilters({ ...filters, action: e.target.value, page: 1 })}
          >
            <option value="">Todas las acciones</option>
            <option value="CREATE">Creación</option>
            <option value="UPDATE">Actualización</option>
            <option value="DELETE">Eliminación</option>
            <option value="PRICE_CHANGE">Cambio de precio</option>
            <option value="STOCK_ADJUSTMENT">Ajuste de stock</option>
            <option value="CASH_CLOSING">Cierre de caja</option>
          </select>
        </div>

        <div className="flex items-end">
          <button
            onClick={() => loadLogs()}
            className="w-full bg-green-600 text-white rounded-2xl py-2 text-sm font-bold hover:bg-green-700 transition"
          >
            Aplicar Filtros
          </button>
        </div>
      </div>

      {/* Tabla de Logs */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr className="text-gray-400 text-xs uppercase font-bold">
                  <th className="px-6 py-4">Fecha / Usuario</th>
                  <th className="px-6 py-4">Módulo</th>
                  <th className="px-6 py-4">Acción</th>
                  <th className="px-6 py-4">Descripción</th>
                  <th className="px-6 py-4">IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {logs.length > 0 ? (
                  logs.map((log) => (
                    <tr key={log._id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-bold text-gray-800">{log.userName}</div>
                        <div className="text-xs text-gray-400">
                          {new Date(log.timestamp).toLocaleString('es-GT', { 
                            day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' 
                          })}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="flex items-center gap-1 text-sm font-medium text-gray-600">
                          {getModuleIcon(log.module)} {log.module}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${getActionColor(log.action)}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-gray-700 max-w-md">{log.description}</p>
                        {log.entityName && (
                          <span className="text-xs text-green-600 font-semibold bg-green-50 px-2 py-0.5 rounded-lg mt-1 inline-block">
                            Item: {log.entityName}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-xs text-gray-400 font-mono">{log.ip}</span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="px-6 py-20 text-center text-gray-400">
                      No se encontraron registros de auditoría
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginación */}
        <div className="bg-gray-50 px-6 py-4 flex justify-between items-center border-t border-gray-100">
          <p className="text-xs text-gray-500">
            Total: <strong>{pagination.total}</strong> registros
          </p>
          <div className="flex gap-2">
            <button
              disabled={pagination.page <= 1}
              onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
              className="px-3 py-1 bg-white border border-gray-200 rounded-xl text-xs font-bold disabled:opacity-50 hover:bg-gray-100"
            >
              Anterior
            </button>
            <span className="text-xs font-bold text-gray-500 flex items-center">
              Pág {pagination.page} de {pagination.pages}
            </span>
            <button
              disabled={pagination.page >= pagination.pages}
              onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
              className="px-3 py-1 bg-white border border-gray-200 rounded-xl text-xs font-bold disabled:opacity-50 hover:bg-gray-100"
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
