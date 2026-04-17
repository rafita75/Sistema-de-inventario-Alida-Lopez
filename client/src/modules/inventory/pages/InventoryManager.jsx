// client/src/modules/inventory/pages/InventoryManager.jsx
import React, { useState, useEffect } from 'react';
import { getAdminProducts } from '../../../shared/services/productService';
import { adjustStock, adjustVariantStock } from '../services/inventoryService';
import InventorySummary from '../components/InventorySummary';
import LowStockAlert from '../components/LowStockAlert';
import StockMovementHistory from '../components/StockMovementHistory';
import Button from '../../core/components/UI/Button';
import Input from '../../core/components/UI/Input';

export default function InventoryManager() {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showReponerModal, setShowReponerModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [itemType, setItemType] = useState('product');
  const [reponerQuantity, setReponerQuantity] = useState(0);
  const [reponerPurchasePrice, setReponerPurchasePrice] = useState(0);
  const [priceChanged, setPriceChanged] = useState(false);
  const [reponerReason, setReponerReason] = useState('');
  const [reponerLoading, setReponerLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredProducts(products);
    } else {
      const term = searchTerm.toLowerCase();
      const filtered = products.filter(p => 
        p.name.toLowerCase().includes(term) || 
        p.sku?.toLowerCase().includes(term) ||
        p.barcode?.toLowerCase().includes(term)
      );
      setFilteredProducts(filtered);
    }
  }, [searchTerm, products]);

  const loadProducts = async () => {
    try {
      const data = await getAdminProducts();
      const productsList = data.products || data;
      setProducts(productsList);
      setFilteredProducts(productsList);
    } catch (error) {
      console.error('Error cargando productos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReponerStock = async () => {
    if (!selectedItem) return;
    if (reponerQuantity <= 0) {
      alert('Ingresa una cantidad válida');
      return;
    }
    
    setReponerLoading(true);
    try {
      if (itemType === 'product') {
        await adjustStock(selectedItem._id, reponerQuantity, reponerReason, reponerPurchasePrice);
        setMessage(`✅ Stock agregado a "${selectedItem.name}"`);
      } else {
        await adjustVariantStock(selectedItem.productId, selectedItem.variantId, reponerQuantity, reponerReason, reponerPurchasePrice);
        setMessage(`✅ Stock agregado a "${selectedItem.productName} - ${selectedItem.variantName}"`);
      }
      
      setShowReponerModal(false);
      setSelectedItem(null);
      setReponerQuantity(0);
      setReponerPurchasePrice(0);
      setPriceChanged(false);
      setReponerReason('');
      loadProducts();
      
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error al reponer stock:', error);
      setMessage('❌ Error al reponer stock');
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

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <span className="w-1 h-6 bg-green-600 rounded-full"></span>
            📦 Inventario
          </h1>
          <p className="text-gray-500 text-sm mt-1">Control de stock y alertas</p>
        </div>
        
        <Button 
          variant="primary" 
          onClick={goToCreateProduct}
          className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Nuevo producto
        </Button>
      </div>

      {message && (
        <div className={`p-4 rounded-xl ${message.includes('✅') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {message}
        </div>
      )}

      <InventorySummary />
      <LowStockAlert />

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
          <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <span className="w-1 h-4 bg-green-500 rounded-full"></span>
            🔍 Todos los productos
          </h3>
          <div className="relative w-full sm:w-80">
            <Input
              type="text"
              placeholder="Buscar por nombre, SKU o código..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              icon="🔍"
              className="pl-10"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 rounded-xl">
              <tr>
                <th className="p-3 text-left text-sm font-semibold text-gray-600">Producto</th>
                <th className="p-3 text-left text-sm font-semibold text-gray-600">SKU</th>
                <th className="p-3 text-right text-sm font-semibold text-gray-600">Precio</th>
                <th className="p-3 text-center text-sm font-semibold text-gray-600">Stock</th>
                <th className="p-3 text-center text-sm font-semibold text-gray-600">Mínimo</th>
                <th className="p-3 text-center text-sm font-semibold text-gray-600">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredProducts.length === 0 ? (
                <tr><td colSpan="6" className="p-8 text-center text-gray-500">No se encontraron productos</td></tr>
              ) : (
                filteredProducts.map(product => (
                  <React.Fragment key={product._id}>
                    <tr className="hover:bg-gray-50 transition">
                      <td className="p-3">
                        <div className="font-medium text-gray-800">{product.name}</div>
                        {product.hasVariants && <span className="text-xs text-green-600">🔄 Con variantes</span>}
                      </td>
                      <td className="p-3 text-sm text-gray-500">{product.sku || '—'}</td>
                      <td className="p-3 text-right font-semibold text-green-600">Q{product.price?.toLocaleString() || 0}</td>
                      <td className="p-3 text-center">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          product.stock <= 0 ? 'bg-red-100 text-red-700' :
                          product.stock <= (product.minStock || 5) ? 'bg-yellow-100 text-yellow-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                          {product.stock}
                        </span>
                      </td>
                      <td className="p-3 text-center text-sm text-gray-500">{product.minStock || 5}</td>
                      <td className="p-3 text-center">
                        {!product.hasVariants && (
                          <button onClick={() => openReponerModal(product)} className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition" title="Reponer stock">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                          </button>
                        )}
                      </td>
                    </tr>
                    {product.hasVariants && product.variants?.map(variant => (
                      <tr key={variant._id} className="bg-gray-50">
                        <td className="p-3 pl-8"><div className="text-gray-700"><span className="text-gray-400 mr-2">↳</span>{variant.name}</div></td>
                        <td className="p-3 text-sm text-gray-500">{variant.sku || '—'}</td>
                        <td className="p-3 text-right font-semibold text-green-600">Q{variant.price?.toLocaleString() || 0}</td>
                        <td className="p-3 text-center">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            variant.stock <= 0 ? 'bg-red-100 text-red-700' :
                            variant.stock <= (variant.minStock || product.minStock || 5) ? 'bg-yellow-100 text-yellow-700' :
                            'bg-green-100 text-green-700'
                          }`}>
                            {variant.stock}
                          </span>
                        </td>
                        <td className="p-3 text-center text-sm text-gray-500">{variant.minStock || product.minStock || 5}</td>
                        <td className="p-3 text-center">
                          <button onClick={() => openReponerVariantModal({
                            productId: product._id, productName: product.name, variantId: variant._id, variantName: variant.name, stock: variant.stock, sku: variant.sku, purchasePrice: variant.purchasePrice
                          })} className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition" title="Reponer stock">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
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

      <StockMovementHistory />

      {/* Modal para reponer stock REDISEÑADO */}
      {showReponerModal && selectedItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl animate-scale-in border border-gray-100">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-2xl font-black text-gray-800 tracking-tighter uppercase">Reponer Stock</h3>
                <p className="text-sm text-gray-500 font-medium">Ingreso de nueva mercadería</p>
              </div>
              <button onClick={() => setShowReponerModal(false)} className="bg-gray-100 text-gray-400 hover:text-gray-800 p-2 rounded-xl transition-all">✕</button>
            </div>

            <div className="bg-green-50 p-4 rounded-2xl border border-green-100 mb-6">
              <p className="text-xs font-bold text-green-600 uppercase tracking-widest mb-1">Producto Seleccionado</p>
              <p className="font-bold text-gray-800 truncate">
                {itemType === 'product' ? selectedItem.name : `${selectedItem.productName} - ${selectedItem.variantName}`}
              </p>
              <div className="flex justify-between mt-2">
                <span className="text-xs text-gray-500">Stock Actual: <b>{selectedItem.stock}</b></span>
                <span className="text-xs text-gray-500">Costo Base: <b>Q{reponerPurchasePrice}</b></span>
              </div>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">
                  ¿Cuántas unidades entran?
                </label>
                <input
                  type="number"
                  value={reponerQuantity}
                  onChange={(e) => setReponerQuantity(parseInt(e.target.value) || 0)}
                  className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:border-green-500 focus:bg-white outline-none text-xl font-bold transition-all"
                  placeholder="0"
                  autoFocus
                />
              </div>

              {/* Lógica UX: El precio cambió */}
              <div className="pt-2">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className="relative">
                    <input 
                      type="checkbox" 
                      className="sr-only peer"
                      checked={priceChanged}
                      onChange={e => setPriceChanged(e.target.checked)}
                    />
                    <div className="w-10 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                  </div>
                  <span className="text-sm font-bold text-gray-600 group-hover:text-gray-800 transition-colors">¿El precio de compra cambió?</span>
                </label>
              </div>

              {priceChanged && (
                <div className="animate-fade-in">
                   <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Nuevo Precio de Compra (Q)</label>
                   <input
                    type="number"
                    step="0.01"
                    value={reponerPurchasePrice}
                    onChange={(e) => setReponerPurchasePrice(parseFloat(e.target.value) || 0)}
                    className="w-full p-4 bg-green-50 border-2 border-green-200 rounded-2xl outline-none text-xl font-bold text-green-700"
                  />
                </div>
              )}
              
              <div>
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Motivo / Notas</label>
                <input
                  type="text"
                  value={reponerReason}
                  onChange={(e) => setReponerReason(e.target.value)}
                  className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-2xl outline-none text-sm"
                  placeholder="Ej: Factura #1234"
                />
              </div>
              
              <div className="flex gap-3 pt-4">
                <Button
                  variant="primary"
                  onClick={handleReponerStock}
                  loading={reponerLoading}
                  className="flex-1 bg-green-600 h-14 text-lg font-bold shadow-xl shadow-green-100 hover:scale-[1.02] active:scale-95 transition-all"
                >
                  Confirmar Ingreso
                </Button>
                <Button variant="ghost" onClick={() => setShowReponerModal(false)} className="h-14 font-bold">
                  Cancelar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
