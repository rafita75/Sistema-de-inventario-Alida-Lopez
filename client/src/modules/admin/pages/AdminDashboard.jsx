// client/src/modules/admin/pages/AdminDashboard.jsx
import { useState, useEffect } from 'react';
import { useAuth } from '../../login/contexts/AuthContext';
import api from '../../../shared/services/api';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

// Componentes de Gestión
import ProductsManager from './ProductsManager';
import CategoriesManager from './CategoriesManager';
import SuppliersManager from './SuppliersManager';
import BrandsManager from './BrandsManager';
import PrintBarcodes from '../../inventory/pages/PrintBarcodes';
import InvoicesManager from './InvoicesManager';
import CashClosingManager from './CashClosingManager';
import AccountingDashboard from '../../accounting/pages/AccountingDashboard';
import InventoryManager from '../../inventory/pages/InventoryManager';
import POSDashboard from '../../pos/pages/POSDashboard';
import EmployeesManager from './EmployeesManager';

export default function AdminDashboard() {
  const { user, logout } = useAuth(); 
  const isAdmin = user?.role === 'admin';
  
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  const [dashboardData, setDashboardData] = useState({
    stats: { ventasHoy: 0, ingresosHoy: 0, deudasPendientes: 0, productosBajoStock: 0 },
    weeklySales: [],
    lowStockItems: [],
    loading: true
  });

  // ============================================
  // MENÚ ORIGINAL (Restaurado)
  // ============================================
  const menuItems = [];
  if (isAdmin) {
    menuItems.push({ id: 'dashboard', label: 'Dashboard', icon: '📊', group: 'admin' });
    menuItems.push({ id: 'employees', label: 'Empleados', icon: '👥', group: 'admin' });
  }
  if (isAdmin || user?.viewProducts) menuItems.push({ id: 'products', label: 'Productos', icon: '📦', group: 'gestion' });
  if (isAdmin || user?.viewCategories) menuItems.push({ id: 'categories', label: 'Categorías', icon: '🏷️', group: 'gestion' });
  if (isAdmin || user?.viewInvoices) menuItems.push({ id: 'invoices', label: 'Facturación', icon: '🧾', group: 'gestion' });
  if (isAdmin || user?.viewBrands) menuItems.push({ id: 'brands', label: 'Marcas', icon: '✨', group: 'gestion' });
  if (isAdmin || user?.viewSuppliers) menuItems.push({ id: 'suppliers', label: 'Proveedores', icon: '🚚', group: 'gestion' });
  if (isAdmin || user?.printBarcodes) menuItems.push({ id: 'barcodes', label: 'Etiquetas', icon: '🖨️', group: 'gestion' });
  if (isAdmin || user?.viewInventory) menuItems.push({ id: 'inventory', label: 'Inventario', icon: '📊', group: 'gestion' });
  if (isAdmin || user?.usePOS) menuItems.push({ id: 'pos', label: 'Punto de Venta', icon: '💳', group: 'operacion' });
  if (isAdmin || user?.viewAccounting) menuItems.push({ id: 'accounting', label: 'Contabilidad', icon: '💰', group: 'finanzas' });
  if (isAdmin || user?.performCashClosing) menuItems.push({ id: 'cash-closing', label: 'Cierre de Caja', icon: '🏁', group: 'finanzas' });

  useEffect(() => {
    if (menuItems.length > 0 && !activeTab) setActiveTab(menuItems[0].id);
    if (isAdmin) loadFullDashboard();
    setLoading(false);
  }, [isAdmin, user]);

  const loadFullDashboard = async () => {
    try {
      const [statsRes, reportRes, lowStockRes] = await Promise.all([
        api.get('/accounting/dashboard-stats'),
        api.get('/accounting/report?period=week'),
        api.get('/inventory/low-stock')
      ]);

      const chartData = reportRes.data.dailyLabels.map((label, idx) => ({
        name: new Date(label).toLocaleDateString('es', { weekday: 'short' }),
        ventas: reportRes.data.dailyIncomes[idx] || 0
      }));

      setDashboardData({
        stats: statsRes.data,
        weeklySales: chartData,
        lowStockItems: lowStockRes.data.slice(0, 5),
        loading: false
      });
    } catch (error) {
      console.error('Error dashboard:', error);
    }
  };

  const handleLogout = () => { logout(); window.location.href = '/login'; };

  if (loading) return <div className="p-8 text-center">Cargando...</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 pb-16 lg:pb-0">
      {/* HEADER MÓVIL ORIGINAL */}
      <div className="lg:hidden bg-white shadow-sm p-2 fixed top-0 left-0 right-0 z-50 flex justify-center items-center">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-gradient-to-r from-green-600 to-green-700 rounded-lg flex items-center justify-center">
            <span className="text-white text-xs font-bold">A&C</span>
          </div>
          <h2 className="text-sm font-semibold text-gray-800">Librería A&C</h2>
        </div>
      </div>

      {/* MENÚ MÓVIL INFERIOR ORIGINAL */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white shadow-lg border-t border-gray-100 z-50">
        <div className="flex items-center overflow-x-auto py-2 px-2 gap-1 scrollbar-hide">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all whitespace-nowrap ${
                activeTab === item.id 
                  ? 'text-green-600 bg-green-50' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          ))}
          <button onClick={handleLogout} className="flex flex-col items-center gap-1 px-3 py-2 rounded-xl text-red-500 whitespace-nowrap">
            <span className="text-xl">🚪</span>
            <span className="text-xs font-medium">Salir</span>
          </button>
        </div>
      </div>

      {/* SIDEBAR DESKTOP ORIGINAL (Restaurado) */}
      <aside className={`hidden lg:block fixed top-0 left-0 h-full bg-white shadow-xl transition-all duration-300 z-30 ${sidebarCollapsed ? 'w-20' : 'w-64'}`}>
        <div className="flex flex-col h-full">
          <div className={`p-5 border-b border-gray-100 flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-between'}`}>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-r from-green-600 to-green-700 rounded-xl flex items-center justify-center shadow-md">
                <span className="text-white font-bold text-lg">A&C</span>
              </div>
              {!sidebarCollapsed && (
                <div>
                  <h2 className="font-bold text-gray-800">Librería A&C</h2>
                  <p className="text-xs text-gray-400 capitalize">{user?.role}</p>
                </div>
              )}
            </div>
            {!sidebarCollapsed && (
              <button onClick={() => setSidebarCollapsed(true)} className="text-gray-400 hover:text-green-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" /></svg>
              </button>
            )}
          </div>

          {sidebarCollapsed && (
            <button onClick={() => setSidebarCollapsed(false)} className="mt-4 mx-auto w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center text-gray-500 hover:bg-gray-200">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>
            </button>
          )}

          <nav className="flex-1 py-6 px-3 space-y-4 overflow-y-auto">
             {!sidebarCollapsed ? (
               <>
                 <Section label="Administración" items={menuItems.filter(i => i.group === 'admin')} activeTab={activeTab} setActiveTab={setActiveTab} />
                 <Section label="Gestión" items={menuItems.filter(i => i.group === 'gestion')} activeTab={activeTab} setActiveTab={setActiveTab} />
                 <Section label="Operación" items={menuItems.filter(i => i.group === 'operacion')} activeTab={activeTab} setActiveTab={setActiveTab} />
                 <Section label="Finanzas" items={menuItems.filter(i => i.group === 'finanzas')} activeTab={activeTab} setActiveTab={setActiveTab} />
               </>
             ) : (
               menuItems.map(item => (
                 <button key={item.id} onClick={() => setActiveTab(item.id)} title={item.label} className={`w-full flex justify-center items-center py-3 rounded-xl transition-all ${activeTab === item.id ? 'bg-gradient-to-r from-green-600 to-green-700 text-white shadow-md' : 'text-gray-600 hover:bg-gray-50'}`}>
                   <span className="text-xl">{item.icon}</span>
                 </button>
               ))
             )}
          </nav>

          <div className="p-4 border-t border-gray-100">
            <div className={`flex items-center gap-3 ${sidebarCollapsed ? 'justify-center' : ''}`}>
              <div className="w-10 h-10 bg-gradient-to-r from-gray-700 to-gray-800 rounded-full flex items-center justify-center text-white font-semibold shadow-sm">
                {user?.name?.charAt(0) || 'U'}
              </div>
              {!sidebarCollapsed && (
                <div className="flex-1 overflow-hidden">
                  <p className="font-medium text-gray-800 text-sm truncate">{user?.name}</p>
                  <button onClick={handleLogout} className="text-[10px] text-red-500 hover:underline">Cerrar sesión</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* CONTENIDO PRINCIPAL (Panel de Información mejorado) */}
      <main className={`transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'}`}>
        <div className="pt-20 lg:pt-6 p-4 md:p-6 pb-24 lg:pb-6">
          
          {activeTab === 'dashboard' && isAdmin && (
            <div className="space-y-6">
              {/* Header Panel Info */}
              <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-2xl p-6 text-white shadow-lg flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold">¡Bienvenido, {user?.name}!</h2>
                  <p className="text-green-100 mt-1">Este es el resumen de tu negocio para hoy.</p>
                </div>
                <button onClick={() => setActiveTab('pos')} className="hidden md:block bg-white/20 hover:bg-white/30 p-3 rounded-xl font-bold transition-all backdrop-blur-sm border border-white/10">
                  🚀 Nueva Venta
                </button>
              </div>

              {/* Cards de Información */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <StatCard title="Ventas hoy" value={dashboardData.stats.ventasHoy} icon="🛒" color="bg-green-100" textColor="text-green-700" />
                <StatCard title="Ingresos" value={`Q${dashboardData.stats.ingresosHoy.toLocaleString()}`} icon="💵" color="bg-green-100" textColor="text-green-700" />
                <StatCard title="Deudas" value={`Q${dashboardData.stats.deudasPendientes.toLocaleString()}`} icon="📝" color="bg-yellow-100" textColor="text-yellow-700" />
                <StatCard title="Stock bajo" value={dashboardData.stats.productosBajoStock} icon="⚠️" color="bg-red-100" textColor={dashboardData.stats.productosBajoStock > 0 ? 'text-red-600' : 'text-gray-400'} />
              </div>

              {/* Gráfica y Alertas del Panel */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                  <h3 className="font-bold text-gray-800 mb-4">Ventas de la Semana</h3>
                  <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={dashboardData.weeklySales}>
                        <defs>
                          <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#16a34a" stopOpacity={0.1}/>
                            <stop offset="95%" stopColor="#16a34a" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} />
                        <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} />
                        <Tooltip />
                        <Area type="monotone" dataKey="ventas" stroke="#16a34a" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                  <h3 className="font-bold text-gray-800 mb-4">Reponer Pronto</h3>
                  <div className="space-y-3">
                    {dashboardData.lowStockItems.length > 0 ? dashboardData.lowStockItems.map(item => (
                      <div key={item._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                        <span className="text-xs font-bold text-gray-700 truncate max-w-[120px]">{item.name}</span>
                        <span className="text-xs font-black text-red-500">Stock: {item.stock}</span>
                      </div>
                    )) : (
                      <p className="text-center py-10 text-gray-400 text-sm italic">Todo con buen stock ✅</p>
                    )}
                    <button onClick={() => setActiveTab('inventory')} className="w-full py-3 bg-gray-100 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-200 transition-all">Ver Inventario</button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Renderizado de Módulos (Filtrado) */}
          {!isAdmin && activeTab === 'dashboard' && (
            <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100">
              <div className="text-6xl mb-4">👋</div>
              <h2 className="text-2xl font-bold text-gray-800">Bienvenido, {user?.name}</h2>
              <p className="text-gray-500 mt-2">Selecciona una opción del menú para comenzar</p>
            </div>
          )}

          {activeTab === 'employees' && isAdmin && <EmployeesManager />}
          {activeTab === 'products' && (isAdmin || user?.viewProducts) && <ProductsManager />}
          {activeTab === 'categories' && (isAdmin || user?.viewCategories) && <CategoriesManager />}
          {activeTab === 'invoices' && (isAdmin || user?.viewInvoices) && <InvoicesManager />}
          {activeTab === 'brands' && (isAdmin || user?.viewBrands) && <BrandsManager />}
          {activeTab === 'suppliers' && (isAdmin || user?.viewSuppliers) && <SuppliersManager />}
          {activeTab === 'barcodes' && (isAdmin || user?.printBarcodes) && <PrintBarcodes />}
          {activeTab === 'inventory' && (isAdmin || user?.viewInventory) && <InventoryManager />}
          {activeTab === 'pos' && (isAdmin || user?.usePOS) && <POSDashboard onSaleComplete={loadFullDashboard} />}
          {activeTab === 'accounting' && (isAdmin || user?.viewAccounting) && <AccountingDashboard />}
          {activeTab === 'cash-closing' && (isAdmin || user?.performCashClosing) && <CashClosingManager />}
        </div>
      </main>
    </div>
  );
}

function Section({ label, items, activeTab, setActiveTab }) {
  if (items.length === 0) return null;
  return (
    <div className="pt-2">
      <p className="text-xs text-gray-400 uppercase tracking-wider px-3 mb-2">{label}</p>
      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => setActiveTab(item.id)}
          className={`w-full flex items-center gap-3 px-4 py-2 rounded-xl transition-all ${
            activeTab === item.id 
              ? 'bg-gradient-to-r from-green-600 to-green-700 text-white shadow-md' 
              : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          <span className="text-lg">{item.icon}</span>
          <span className="font-medium text-sm">{item.label}</span>
        </button>
      ))}
    </div>
  );
}

function StatCard({ title, value, icon, color, textColor = 'text-gray-800' }) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className={`text-2xl font-bold ${textColor}`}>{value}</p>
        </div>
        <div className={`w-12 h-12 ${color} rounded-2xl flex items-center justify-center text-2xl`}>
          {icon}
        </div>
      </div>
    </div>
  );
}
