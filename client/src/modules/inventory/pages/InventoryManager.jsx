// client/src/modules/inventory/pages/InventoryManager.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { getAdminProducts } from '../../../shared/services/productService';
import { adjustStock, adjustVariantStock } from '../services/inventoryService';
import { getBrands } from '../../../shared/services/brandService';
import InventorySummary from '../components/InventorySummary';
import LowStockAlert from '../components/LowStockAlert';
import StockMovementHistory from '../components/StockMovementHistory';
import Button from '../../core/components/UI/Button';
import Input from '../../core/components/UI/Input';
import { useNotification } from '../../../shared/contexts/NotificationContext';
import { TableSkeleton } from '../../core/components/UI/Skeleton';
import Card from '../../core/components/UI/Card';

export default function InventoryManager() {
  const { notify } = useNotification();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Filtros adicionales
  const [brands, setBrands] = useState([]);
  const [selectedBrand, setSelectedBrand] = useState('all');
  const [stockFilter, setStockFilter] = useState('all'); 

  const [showReponerModal, setShowReponerModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [itemType, setItemType] = useState('product');
  const [reponerQuantity, setReponerQuantity] = useState(0);
  const [reponerPurchasePrice, setReponerPurchasePrice] = useState(0);
  const [priceChanged, setPriceChanged] = useState(false);
  const [reponerReason, setReponerReason] = useState('');
  const [reponerLoading, setReponerLoading] = useState(false);

  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    loadInitialData();
  };

  const loadInitialData = useCallback(async () => {
    setLoading(true);
    try {
      const [productsData, brandsData] = await Promise.all([
        getAdminProducts({ 
          page: currentPage, 
          limit: 15, 
          search: searchTerm,
          brand: selectedBrand !== 'all' ? selectedBrand : undefined,
          stockStatus: stockFilter !== 'all' ? stockFilter : undefined
        }),
        getBrands()
      ]);

      if (productsData.products) {
        setProducts(productsData.products);
        setTotalPages(productsData.pagination.pages);
        setTotalItems(productsData.pagination.total);
      } else {
        setProducts(productsData);
      }
      
      setBrands(brandsData.brands || brandsData);
    } catch (error) {
      console.error('Error cargando datos:', error);
      notify('Error al cargar inventario', 'error');
    } finally {
      setLoading(false);
    }
  }, [currentPage, notify, searchTerm, selectedBrand, stockFilter]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  const handleReponerStock = async () => {
    if (!selectedItem) return;
    if (reponerQuantity <= 0) {
      notify('Ingresa una cantidad válida', 'warning');
      return;
    }
    
    setReponerLoading(true);
    try {
      if (itemType === 'product') {
        await adjustStock(selectedItem._id, reponerQuantity, reponerReason, reponerPurchasePrice);
        notify(`Stock agregado a "${selectedItem.name}"`, 'success');
      } else {
        await adjustVariantStock(selectedItem.productId, selectedItem.variantId, reponerQuantity, reponerReason, reponerPurchasePrice);
        notify(`Stock agregado a "${selectedItem.productName} - ${selectedItem.variantName}"`, 'success');
      }
      
      setShowReponerModal(false);
      setSelectedItem(null);
      setReponerQuantity(0);
      setReponerPurchasePrice(0);
      setPriceChanged(false);
      setReponerReason('');
      loadInitialData();
      
    } catch (error) {
      console.error('Error al reponer stock:', error);
      notify('Error al reponer stock', 'error');
    } finally {
      setReponerLoading(false);
    }
  };

  const openReponerModal = (product) => {
    setItemType('product');
    setSelectedItem(product);
    setReponerPurchasePrice(product.purchasePrice || 0);
    setPriceChanged(false);
    setShowReponerModal(true);
  };

  const openReponerVariantModal = (variant) => {
    setItemType('variant');
    setSelectedItem(variant);
    setReponerPurchasePrice(variant.purchasePrice || 0);
    setPriceChanged(false);
    setShowReponerModal(true);
  };

  const goToCreateProduct = () => {
    const event = new CustomEvent('changeAdminTab', { detail: { tab: 'products' } });
    window.dispatchEvent(event);
    setTimeout(() => {
      const openModalEvent = new CustomEvent('openCreateProductModal');
      window.dispatchEvent(openModalEvent);
    }, 200);
  };

  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <span className="w-1 h-6 bg-green-600 rounded-full"></span>
            📦 Inventario
          </h1>
          <p className="text-gray-500 text-sm mt-1 font-medium">Control de stock y alertas críticas</p>
        </div>
        
        <Button 
          variant="primary" 
          onClick={goToCreateProduct}
          className="w-full sm:w-auto bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 h-12 rounded-2xl shadow-xl shadow-green-100"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Nuevo producto
        </Button>
      </div>

      <InventorySummary />
      <LowStockAlert />

      {/* Filtros y Tabla */}
      <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 p-4 md:p-8">
        <div className="flex flex-col gap-6 mb-8">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <h3 className="text-xl font-black text-gray-800 flex items-center gap-2 tracking-tighter uppercase">
              <span className="w-1.5 h-5 bg-green-500 rounded-full"></span>
              Listado de Inventario ({totalItems})
            </h3>
            <div className="relative w-full lg:w-96 group">
               <form onSubmit={handleSearch} className="flex gap-2">
                  <div className="relative flex-1 group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-green-600 transition-colors">
                      <span className="text-lg">🔍</span>
                    </div>
                    <input
                      type="text"
                      placeholder="Buscar por nombre, SKU o código..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-green-500 focus:ring-4 focus:ring-green-500/10 transition-all outline-none"
                    />
                  </div>
                  <Button type="submit" variant="outline" className="shrink-0 h-12 rounded-xl">Buscar</Button>
               </form>
            </div>
          </div>

          {/* Pastillas de Filtro (Pills) */}
          <div className="flex flex-wrap gap-6 items-start border-t border-gray-100 pt-6">
            <div className="space-y-3 w-full sm:w-auto">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
                <span>🏷️</span> Marca
              </p>
              <div className="flex flex-wrap gap-2">
                <button 
                  onClick={() => { setSelectedBrand('all'); setCurrentPage(1); }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${selectedBrand === 'all' ? 'bg-green-600 text-white shadow-lg shadow-green-100' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                >
                  Todas
                </button>
                {brands.slice(0, 5).map(b => (
                  <button 
                    key={b._id}
                    onClick={() => { setSelectedBrand(b._id); setCurrentPage(1); }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${selectedBrand === b._id ? 'bg-green-600 text-white shadow-lg shadow-green-100' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                  >
                    {b.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3 w-full sm:w-auto">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
                <span>📊</span> Stock
              </p>
              <div className="flex gap-2 p-1 bg-gray-100 rounded-2xl w-fit">
                {[
                  { id: 'all', label: 'Todos', icon: '📦' },
                  { id: 'low', label: 'Bajo', icon: '⚠️' },
                  { id: 'empty', label: 'Agotados', icon: '🚫' }
                ].map(f => (
                  <button 
                    key={f.id}
                    onClick={() => { setStockFilter(f.id); setCurrentPage(1); }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${stockFilter === f.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    <span>{f.icon}</span> {f.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="py-8"><TableSkeleton cols={6} rows={10} /></div>
        ) : (
          <>
            {/* Vista Desktop (Tabla) */}
            <div className="hidden md:block overflow-x-auto">
              <div className="max-h-[600px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200 pr-2">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 rounded-2xl sticky top-0 z-10 shadow-sm">
                    <tr>
                      <th className="p-4 text-xs font-black text-gray-400 uppercase tracking-widest">Producto</th>
                      <th className="p-4 text-xs font-black text-gray-400 uppercase tracking-widest text-center">Existencias</th>
                      <th className="p-4 text-right text-xs font-black text-gray-400 uppercase tracking-widest">Precio</th>
                      <th className="p-4 text-center text-xs font-black text-gray-400 uppercase tracking-widest w-20">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                  {products.length === 0 ? (
                    <tr><td colSpan="6" className="p-12 text-center text-gray-400 font-medium italic">No se encontraron productos</td></tr>
                  ) : (
                    products.map(product => (
                      <React.Fragment key={product._id}>
                        <tr className="hover:bg-gray-50/50 transition-colors group">
                          <td className="p-4">
                            <div className="font-bold text-gray-800 group-hover:text-green-700 transition-colors">{product.name}</div>
                            <div className="text-[10px] text-gray-400 font-mono mt-1">SKU: {product.sku || '—'}</div>
                          </td>
                          <td className="p-4 text-center">
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-black tracking-tighter ${
                              product.stock <= 0 ? 'bg-red-100 text-red-700' :
                              product.stock <= (product.minStock || 5) ? 'bg-yellow-100 text-yellow-700' :
                              'bg-green-100 text-green-700'
                            }`}>
                              {product.stock} UNI
                            </span>
                          </td>
                          <td className="p-4 text-right font-black text-green-600">Q{product.price?.toLocaleString() || 0}</td>
                          <td className="p-4 text-center">
                            {!product.hasVariants && (
                              <button onClick={() => openReponerModal(product)} className="p-3 text-green-600 hover:bg-green-600 hover:text-white rounded-2xl transition-all shadow-sm" title="Reponer stock">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                              </button>
                            )}
                          </td>
                        </tr>
                        {product.hasVariants && product.variants?.map(variant => (
                          <tr key={variant._id} className="bg-gray-50/30 text-xs">
                            <td className="p-3 pl-10"><div className="text-gray-600 font-medium"><span className="text-gray-300 mr-2">↳</span>{variant.name}</div></td>
                            <td className="p-3 text-center">
                              <span className={`px-2 py-0.5 rounded-full font-black ${
                                variant.stock <= 0 ? 'bg-red-50 text-red-500' :
                                variant.stock <= (variant.minStock || product.minStock || 5) ? 'bg-yellow-50 text-yellow-600' :
                                'bg-green-50 text-green-600'
                              }`}>
                                {variant.stock} UNI
                              </span>
                            </td>
                            <td className="p-3 text-right font-bold text-green-600">Q{variant.price?.toLocaleString() || 0}</td>
                            <td className="p-3 text-center">
                              <button onClick={() => openReponerVariantModal({
                                productId: product._id, 
                                productName: product.name, 
                                variantId: variant._id, 
                                variantName: variant.name, 
                                stock: variant.stock, 
                                sku: variant.sku, 
                                purchasePrice: variant.purchasePrice || product.purchasePrice || 0
                              })} className="p-2 text-green-600 hover:bg-green-600 hover:text-white rounded-xl transition-all">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
                    ))
                  )}
                </tbody>
                </table>
              </div>
            </div>

            {/* Vista Móvil (Cards) con Scroll */}
            <div className="md:hidden">
              <div className="max-h-[65vh] overflow-y-auto pr-1 space-y-4 scrollbar-hide">
                {products.length === 0 ? (
                  <div className="py-20 text-center text-gray-400 italic font-bold uppercase text-[10px] tracking-widest">No hay resultados</div>
                ) : (
                  products.map(product => (
                    <Card key={product._id} className="p-5 border-l-4 border-l-green-500 rounded-[2rem] shadow-sm">
                        <div className="flex justify-between items-start mb-4">
                          <div className="min-w-0 flex-1 pr-2">
                            <h4 className="font-black text-gray-800 leading-tight truncate uppercase tracking-tighter">{product.name}</h4>
                            <p className="text-[10px] text-gray-400 font-mono mt-1">{product.sku || 'SIN SKU'}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="font-black text-green-600 text-lg leading-none">Q{product.price}</p>
                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full inline-block mt-2 ${product.stock <= (product.minStock || 5) ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                              {product.stock} UNI
                            </span>
                          </div>
                        </div>
                        
                        {product.hasVariants ? (
                          <div className="space-y-2 mt-4 pt-4 border-t border-gray-100">
                            {product.variants?.map(v => (
                              <div key={v._id} className="flex justify-between items-center bg-gray-50 p-3 rounded-2xl border border-gray-100">
                                <div className="min-w-0 flex-1">
                                   <p className="text-xs font-bold text-gray-700 truncate">{v.name}</p>
                                   <p className="text-[9px] font-black text-green-600">Q{v.price}</p>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className="text-[10px] font-black text-gray-400">{v.stock} UNI</span>
                                  <button onClick={() => openReponerVariantModal({...v, productId: product._id, productName: product.name, variantName: v.name, variantId: v._id})} className="p-2.5 bg-green-600 text-white rounded-xl shadow-lg shadow-green-100">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <Button 
                            variant="primary" 
                            onClick={() => openReponerModal(product)} 
                            className="w-full bg-green-600 h-14 rounded-2xl font-black text-sm shadow-xl shadow-green-100 mt-2"
                          >
                            REPONER STOCK
                          </Button>
                        )}
                    </Card>
                  ))
                )}
              </div>
            </div>

            {/* Paginación */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mt-8 border-t border-gray-100 pt-8 shrink-0">
                <div className="flex gap-2 w-full sm:w-auto">
                  <Button 
                    variant="outline" 
                    disabled={currentPage === 1}
                    onClick={() => { setCurrentPage(prev => Math.max(1, prev - 1)); }}
                    className="flex-1 rounded-xl h-12 font-black text-[10px]"
                  >
                    ← ANTERIOR
                  </Button>
                  <Button 
                    variant="outline" 
                    disabled={currentPage === totalPages}
                    onClick={() => { setCurrentPage(prev => Math.min(totalPages, prev + 1)); }}
                    className="flex-1 rounded-xl h-12 font-black text-[10px] w-100"
                  >
                    SIGUIENTE →
                  </Button>
                </div>
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-50 px-3 py-1 rounded-full">
                  Página {currentPage} de {totalPages}
                </span>
              </div>
            )}
          </>
        )}
      </div>

      <StockMovementHistory />

      {/* Modal para reponer stock */}
      {showReponerModal && selectedItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-[3rem] p-8 max-w-md w-full shadow-2xl animate-scale-in border border-gray-100 flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center mb-8 shrink-0">
              <div>
                <h3 className="text-2xl font-black text-gray-800 tracking-tighter uppercase">Reponer Stock</h3>
                <p className="text-sm text-gray-500 font-medium">Ingreso de nueva mercadería</p>
              </div>
              <button onClick={() => setShowReponerModal(false)} className="bg-gray-100 text-gray-400 hover:text-gray-800 p-2 rounded-xl transition-all">✕</button>
            </div>

            <div className="overflow-y-auto pr-2 space-y-6 flex-1 scrollbar-hide pb-4">
              <div className="bg-green-50 p-6 rounded-[2rem] border border-green-100">
                <p className="text-[10px] font-black text-green-600 uppercase tracking-widest mb-1">Seleccionado</p>
                <p className="font-black text-gray-800 text-lg leading-tight">
                  {itemType === 'product' ? selectedItem.name : `${selectedItem.productName} - ${selectedItem.variantName}`}
                </p>
                <div className="flex justify-between mt-4 bg-white/50 p-3 rounded-2xl">
                  <div className="text-center flex-1 border-r border-green-100">
                    <p className="text-[9px] font-bold text-gray-400 uppercase">Stock Actual</p>
                    <p className="font-black text-gray-800">{selectedItem.stock}</p>
                  </div>
                  <div className="text-center flex-1">
                    <p className="text-[9px] font-bold text-gray-400 uppercase">Costo Base</p>
                    <p className="font-black text-green-600">Q{reponerPurchasePrice}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 ml-2">¿Cuántas unidades entran?</label>
                  <input type="number" value={reponerQuantity} onChange={(e) => setReponerQuantity(parseInt(e.target.value) || 0)} className="w-full p-5 bg-gray-50 border-2 border-transparent rounded-[2rem] focus:bg-white focus:border-green-500 outline-none text-3xl font-black text-center transition-all shadow-inner" placeholder="0" autoFocus />
                </div>
                <div className="pt-2 px-2">
                  <label className="flex items-center gap-4 cursor-pointer group">
                    <div className="relative">
                      <input type="checkbox" className="sr-only peer" checked={priceChanged} onChange={e => setPriceChanged(e.target.checked)} />
                      <div className="w-12 h-7 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                    </div>
                    <span className="text-xs font-black text-gray-600 group-hover:text-gray-800 uppercase tracking-tighter">¿El costo cambió?</span>
                  </label>
                </div>
                {priceChanged && (
                  <div className="animate-scale-in">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 ml-2">Nuevo Precio de Compra (Q)</label>
                    <input type="number" step="0.01" value={reponerPurchasePrice} onChange={(e) => setReponerPurchasePrice(parseFloat(e.target.value) || 0)} className="w-full p-5 bg-green-50 border-2 border-green-200 rounded-[2rem] outline-none text-3xl font-black text-center text-green-700 shadow-inner" />
                  </div>
                )}
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 ml-2">Motivo / Notas</label>
                  <input type="text" value={reponerReason} onChange={(e) => setReponerReason(e.target.value)} className="w-full p-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-gray-200 outline-none text-sm font-medium transition-all" placeholder="Factura, ingreso mensual..." />
                </div>
              </div>
            </div>
            
            <div className="flex flex-col gap-3 pt-6 shrink-0 border-t border-gray-50">
              <Button variant="primary" onClick={handleReponerStock} loading={reponerLoading} className="w-full bg-green-600 h-16 text-lg font-black shadow-2xl shadow-green-100 hover:scale-[1.02] transition-all rounded-[2rem]">CONFIRMAR INGRESO</Button>
              <button onClick={() => setShowReponerModal(false)} className="w-full h-10 text-gray-400 font-bold hover:text-gray-600 transition-colors uppercase text-[10px] tracking-widest">Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
