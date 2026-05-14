// client/src/modules/inventory/components/LowStockAlert.jsx
import { useState, useEffect } from 'react';
import { getLowStockProducts, getLowStockVariants, adjustStock, adjustVariantStock, disableProductStockAlert, disableVariantStockAlert } from '../services/inventoryService';
import Button from '../../core/components/UI/Button';
import { useNotification } from '../../../shared/contexts/NotificationContext';

export default function LowStockAlert() {
  const { notify } = useNotification();
  const [products, setProducts] = useState([]);
  const [variants, setVariants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [adjustQuantity, setAdjustQuantity] = useState(0);
  const [purchasePrice, setPurchasePrice] = useState(0);
  const [priceChanged, setPriceChanged] = useState(false);
  const [reason, setReason] = useState('');
  const [itemType, setItemType] = useState('product');
  const [adjustLoading, setAdjustLoading] = useState(false);

  useEffect(() => {
    loadLowStock();
  }, []);

  const loadLowStock = async () => {
    try {
      const [productsData, variantsData] = await Promise.all([
        getLowStockProducts(),
        getLowStockVariants()
      ]);
      // Filtramos para que en 'products' solo queden los productos únicos (sin variantes)
      const uniqueProducts = (productsData || []).filter(p => !p.hasVariants);
      setProducts(uniqueProducts);
      setVariants(variantsData || []);
    } catch (error) {
      console.error('Error cargando stock bajo:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDisableAlert = async (productId) => {
    try {
      await disableProductStockAlert(productId);
      notify('Alerta deshabilitada para este producto', 'success');
      loadLowStock();
    } catch (error) {
      notify('Error al deshabilitar alerta', 'error');
    }
  };

  const handleDisableVariantAlert = async (productId, variantId) => {
    try {
      await disableVariantStockAlert(productId, variantId);
      notify('Alerta deshabilitada para esta variante', 'success');
      loadLowStock();
    } catch (error) {
      notify('Error al deshabilitar alerta', 'error');
    }
  };

  const openModal = (item, type) => {
    // ... (unchanged)
  };

  // ... (handleAdjustStock and other functions)

  if (loading) return <div className="p-10 text-center animate-pulse text-gray-400">Analizando inventario...</div>;

  const totalAlerts = (products?.length || 0) + (variants?.length || 0);
  if (totalAlerts === 0) return null;

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-black text-gray-800 mb-6 flex items-center gap-2 uppercase tracking-tighter">
          <span className="w-1.5 h-6 bg-orange-500 rounded-full"></span>
          ⚠️ Alertas de Stock Bajo ({totalAlerts})
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map(p => (
            <div key={p._id} className="p-4 bg-orange-50 rounded-2xl border border-orange-100 flex flex-col justify-between gap-3">
              <div>
                <p className="font-bold text-gray-800 truncate">{p.name}</p>
                <div className="flex items-center gap-2 mt-1">
                   <span className="text-[10px] font-black bg-orange-200 text-orange-800 px-2 py-0.5 rounded-lg uppercase">Crítico</span>
                   <span className="text-xs text-gray-500 font-bold">Stock: <span className="text-red-600">{p.stock}</span></span>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => openModal(p, 'product')} className="flex-1 py-2.5 bg-white text-orange-600 font-bold text-xs rounded-xl shadow-sm hover:bg-orange-600 hover:text-white transition-all">Reponer</button>
                <button onClick={() => handleDisableAlert(p._id)} className="px-3 py-2.5 bg-white text-gray-400 font-bold text-xs rounded-xl shadow-sm hover:bg-gray-100 hover:text-gray-600 transition-all" title="No avisar más">🔕</button>
              </div>
            </div>
          ))}

          {variants.map(v => (
            <div key={`${v.productId}-${v.variantId}`} className="p-4 bg-red-50 rounded-2xl border border-red-100 flex flex-col justify-between gap-3">
              <div>
                <p className="font-bold text-gray-800 truncate">{v.productName}</p>
                <p className="text-[10px] text-red-400 font-bold uppercase">{v.variantName}</p>
                <div className="flex items-center gap-2 mt-1">
                   <span className="text-[10px] font-black bg-red-200 text-red-800 px-2 py-0.5 rounded-lg uppercase">Reponer</span>
                   <span className="text-xs text-gray-500 font-bold">Stock: <span className="text-red-600">{v.stock}</span></span>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => openModal(v, 'variant')} className="flex-1 py-2.5 bg-white text-red-600 font-bold text-xs rounded-xl shadow-sm hover:bg-red-600 hover:text-white transition-all">Reponer</button>
                <button onClick={() => handleDisableVariantAlert(v.productId, v.variantId)} className="px-3 py-2.5 bg-white text-gray-400 font-bold text-xs rounded-xl shadow-sm hover:bg-gray-100 hover:text-gray-600 transition-all" title="No avisar más">🔕</button>
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* ... (Modal code) */}

      {selectedItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4 backdrop-blur-sm">
          <div className="bg-white rounded-[2.5rem] p-8 max-w-md w-full shadow-2xl animate-scale-in">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-2xl font-black text-gray-800 tracking-tighter uppercase">Reponer Stock</h3>
                <p className="text-sm text-gray-500 font-medium">Ajuste rápido de inventario</p>
              </div>
              <button onClick={() => setSelectedItem(null)} className="bg-gray-100 text-gray-400 hover:text-gray-800 p-2 rounded-xl">✕</button>
            </div>

            <div className="bg-orange-50 p-5 rounded-2xl border border-orange-100 mb-6">
               <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest mb-1">Mercadería Crítica</p>
               <p className="font-bold text-gray-800 truncate">
                {itemType === 'product' ? selectedItem.name : `${selectedItem.productName} - ${selectedItem.variantName}`}
              </p>
              <div className="flex justify-between mt-3">
                <span className="text-xs text-gray-500 font-bold">Actual: <b className="text-red-600">{selectedItem.stock}</b></span>
                <span className="text-xs text-gray-500 font-bold">Costo Base: <b>Q{purchasePrice}</b></span>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Cantidad a ingresar</label>
                <input
                  type="number"
                  autoFocus
                  value={adjustQuantity}
                  onChange={(e) => setAdjustQuantity(parseInt(e.target.value) || 0)}
                  className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl outline-none text-2xl font-black focus:border-orange-500 transition-all"
                  placeholder="0"
                />
              </div>

              <div className="pt-1">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative">
                    <input type="checkbox" className="sr-only peer" checked={priceChanged} onChange={e => setPriceChanged(e.target.checked)} />
                    <div className="w-10 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
                  </div>
                  <span className="text-sm font-bold text-gray-600 group-hover:text-gray-800">¿El precio de compra cambió?</span>
                </label>
              </div>

              {priceChanged && (
                <div className="animate-fade-in">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Nuevo Costo Unitario (Q)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={purchasePrice}
                    onChange={(e) => setPurchasePrice(parseFloat(e.target.value) || 0)}
                    className="w-full p-4 bg-orange-50 border-2 border-orange-200 rounded-2xl outline-none text-xl font-bold text-orange-700"
                  />
                </div>
              )}

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Motivo / notas</label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl outline-none text-sm font-medium focus:border-orange-500 transition-all"
                  placeholder="Compra semanal, proveedor, factura..."
                />
              </div>
              
              <div className="flex gap-3 pt-2">
                <Button
                  variant="primary"
                  onClick={handleAdjustStock}
                  loading={adjustLoading}
                  className="flex-1 bg-orange-600 h-14 text-lg font-bold shadow-xl shadow-orange-100 hover:scale-[1.02] active:scale-95 transition-all"
                >
                  Confirmar Reposición
                </Button>
                <Button variant="ghost" onClick={() => setSelectedItem(null)} className="h-14 font-bold">Cancelar</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
