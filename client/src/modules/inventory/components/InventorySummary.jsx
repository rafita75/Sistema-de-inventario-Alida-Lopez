// client/src/modules/inventory/components/InventorySummary.jsx
import { useState, useEffect } from 'react';
import { getInventorySummary, getLowStockVariants } from '../services/inventoryService';

export default function InventorySummary() {
  const [summary, setSummary] = useState(null);
  const [lowStockVariantsCount, setLowStockVariantsCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSummary();
  }, []);

  const loadSummary = async () => {
    try {
      const [data, variantsData] = await Promise.all([
        getInventorySummary(),
        getLowStockVariants().catch(() => [])
      ]);
      setSummary(data);
      setLowStockVariantsCount(variantsData.length || 0);
    } catch (error) {
      console.error('Error cargando resumen:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-28 bg-gray-100 rounded-2xl animate-pulse"></div>
        ))}
      </div>
    );
  }

  const stats = [
    { 
      label: 'Productos', 
      value: summary?.totalProducts || 0, 
      icon: '📦', 
      bgColor: 'bg-blue-50', 
      textColor: 'text-blue-600',
      borderColor: 'border-blue-100'
    },
    { 
      label: 'Variantes', 
      value: summary?.totalVariants || 0, 
      icon: '🎨', 
      bgColor: 'bg-purple-50', 
      textColor: 'text-purple-600',
      borderColor: 'border-purple-100'
    },
    { 
      label: 'Stock bajo', 
      value: (summary?.lowStockProducts || 0) + lowStockVariantsCount, 
      icon: '⚠️', 
      bgColor: 'bg-yellow-50', 
      textColor: 'text-yellow-600',
      borderColor: 'border-yellow-100',
      subtitle: `${summary?.lowStockProducts || 0} productos · ${lowStockVariantsCount} variantes`
    },
    { 
      label: 'Valor inventario', 
      value: `Q${summary?.totalValue?.toLocaleString() || 0}`, 
      icon: '💰', 
      bgColor: 'bg-green-50', 
      textColor: 'text-green-600',
      borderColor: 'border-green-100'
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      {stats.map((stat, idx) => (
        <div 
          key={idx} 
          className={`${stat.bgColor} border ${stat.borderColor} rounded-2xl p-5 transition-all hover:shadow-md`}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">{stat.label}</p>
              <p className={`text-3xl font-bold ${stat.textColor}`}>{stat.value}</p>
              {stat.subtitle && (
                <p className="text-xs text-gray-400 mt-2">{stat.subtitle}</p>
              )}
            </div>
            <div className={`text-3xl opacity-70 ${stat.textColor}`}>{stat.icon}</div>
          </div>
        </div>
      ))}
    </div>
  );
}