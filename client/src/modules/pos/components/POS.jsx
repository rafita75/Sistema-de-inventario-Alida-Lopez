// client/src/modules/pos/components/POS.jsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { getProductByBarcode, searchProducts, getProductVariants, registerSale } from '../services/posService';
import Button from '../../core/components/UI/Button';
import Card from '../../core/components/UI/Card';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '../../login/contexts/AuthContext';
import { Html5Qrcode } from 'html5-qrcode';
import { useNotification } from '../../../shared/contexts/NotificationContext';
import ConfirmModal from '../../core/components/UI/ConfirmModal';

export default function POS({ onClose, onSaleComplete }) {
  const { user } = useAuth();
  const { notify } = useNotification();
  const [cart, setCart] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [variants, setVariants] = useState([]);
  const [showVariantModal, setShowVariantModal] = useState(false);
  const [clienteNombre, setClienteNombre] = useState('');
  const [clienteTelefono, setClienteTelefono] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('efectivo');
  const [isDebt, setIsDebt] = useState(false);
  
  // Estados para Escáner
  const [showNativeScanner, setShowNativeScanner] = useState(false);
  const [showPairingQR, setShowPairingQR] = useState(false);
  const nativeScannerRef = useRef(null);
  
  // Referencias
  const barcodeRef = useRef(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  useEffect(() => {
    const searchProductsDebounced = setTimeout(async () => {
      if (searchTerm.trim().length >= 2) {
        setIsSearching(true);
        try {
          const data = await searchProducts(searchTerm);
          setProducts(Array.isArray(data) ? data : []);
        } catch (error) {
          console.error('Error buscando productos:', error);
          setProducts([]);
        } finally {
          setIsSearching(false);
        }
      } else {
        setProducts([]);
        setIsSearching(false);
      }
    }, 400);
    return () => clearTimeout(searchProductsDebounced);
  }, [searchTerm]);

  const startNativeScanner = async () => {
    setShowNativeScanner(true);
    setTimeout(async () => {
      try {
        const html5QrCode = new Html5Qrcode("native-scanner-container");
        nativeScannerRef.current = html5QrCode;
        await html5QrCode.start(
          { facingMode: "environment" },
          { fps: 15, qrbox: { width: 250, height: 150 }, aspectRatio: 1.0 },
          (decodedText) => {
            submitBarcode(decodedText);
            if (navigator.vibrate) navigator.vibrate(100);
          }
        );
      } catch (err) {
        notify("No se pudo iniciar la cámara", 'error');
        setShowNativeScanner(false);
      }
    }, 300);
  };

  const stopNativeScanner = async () => {
    if (nativeScannerRef.current) {
      try { await nativeScannerRef.current.stop(); } catch (err) { console.error(err); }
      nativeScannerRef.current = null;
    }
    setShowNativeScanner(false);
  };

  const submitBarcode = async (code) => {
    if (!code.trim()) return;
    try {
      const product = await getProductByBarcode(code);
      if (product.isVariant) {
        addToCart({
          productId: product.parentProductId,
          name: product.name,
          price: product.price,
          stock: product.stock,
          variantId: product.variantId,
          variantName: product.name.split(' - ')[1] || product.name,
          sku: product.sku
        });
      } else if (product.hasVariants && product.variants?.length > 0) {
        setSelectedProduct(product);
        setVariants(product.variants);
        setShowVariantModal(true);
      } else {
        addToCart({
          productId: product._id,
          name: product.name,
          price: product.price,
          stock: product.stock,
          variantId: null,
          variantName: null
        });
      }
      setBarcodeInput('');
    } catch (error) {
      console.error(error);
      setBarcodeInput('');
    }
  };

  const handleBarcodeChange = (e) => setBarcodeInput(e.target.value);
  const handleBarcodeSubmit = (e) => {
    e.preventDefault();
    submitBarcode(barcodeInput);
  };

  const handleProductSelect = async (product) => {
    if (product.hasVariants) {
      try {
        const data = await getProductVariants(product._id);
        setSelectedProduct(data.product);
        setVariants(data.variants);
        setShowVariantModal(true);
      } catch (error) { notify('Error al cargar las variantes', 'error'); }
    } else {
      addToCart({ productId: product._id, name: product.name, price: product.price, stock: product.stock, variantId: null });
    }
  };

  const addVariantToCart = (variant) => {
    addToCart({
      productId: selectedProduct._id,
      name: `${selectedProduct.name} - ${variant.name}`,
      price: variant.price,
      stock: variant.stock,
      variantId: variant._id,
      variantName: variant.name,
      sku: variant.sku
    });
    setShowVariantModal(false);
  };

  const addToCart = (item) => {
    if (item.stock < 1) {
      notify(`Stock insuficiente.`, 'warning');
      return;
    }
    setCart(prev => {
      const itemKey = item.variantId ? `${item.productId}-${item.variantId}` : item.productId;
      const existing = prev.find(i => i.itemKey === itemKey);
      if (existing) {
        if (existing.quantity + 1 > item.stock) {
          notify(`Solo puedes agregar hasta ${item.stock} unidades.`, 'warning');
          return prev;
        }
        return prev.map(i => i.itemKey === itemKey ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...item, itemKey, quantity: 1 }];
    });
  };

  const removeFromCart = (itemKey) => setCart(prev => prev.filter(item => item.itemKey !== itemKey));

  const updateQuantity = (itemKey, quantity) => {
    const item = cart.find(i => i.itemKey === itemKey);
    if (quantity > (item?.stock || 0)) {
      notify(`Solo hay ${item.stock} unidades disponibles.`, 'warning');
      return;
    }
    if (quantity <= 0) { removeFromCart(itemKey); return; }
    setCart(prev => prev.map(item => item.itemKey === itemKey ? { ...item, quantity } : item));
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const handleCheckout = async () => {
    if (cart.length === 0) return notify('Agrega productos al carrito', 'warning');
    if (isDebt && !clienteNombre.trim()) return notify('Ingresa el nombre del cliente', 'warning');

    setLoading(true);
    try {
      const saleData = {
        items: cart.map(item => ({ productId: item.productId, variantId: item.variantId, name: item.name, price: item.price, quantity: item.quantity, sku: item.sku })),
        clienteNombre, paymentMethod: isDebt ? 'efectivo' : paymentMethod, esDeuda: isDebt
      };
      const result = await registerSale(saleData);
      notify(`Venta #${result.saleNumber} registrada`, 'success');
      if (onSaleComplete) onSaleComplete();
      setCart([]); setClienteNombre(''); onClose();
    } catch (error) {
      notify(error.response?.data?.error || 'Error al procesar la venta', 'error');
    } finally { setLoading(false); }
  };

  // COMPONENTE REUTILIZABLE: TARJETA DE PRODUCTO EN EL CARRITO
  const CartItem = ({ item }) => (
    <div className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-bold text-gray-800 leading-tight truncate uppercase tracking-tighter text-xs">{item.name}</p>
          <p className="text-[10px] font-black text-green-600 mt-0.5">Q{item.price.toLocaleString()}</p>
        </div>
        <button onClick={() => removeFromCart(item.itemKey)} className="text-gray-300 hover:text-red-500 transition-colors p-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
        </button>
      </div>
      <div className="flex items-center justify-between mt-3 bg-gray-50 p-1.5 rounded-xl">
        <div className="flex items-center gap-1">
          <button onClick={() => updateQuantity(item.itemKey, item.quantity - 1)} className="w-7 h-7 flex items-center justify-center bg-white border border-gray-200 rounded-lg font-bold text-gray-500 hover:bg-gray-100 transition-colors">−</button>
          <span className="w-6 text-center font-black text-xs text-gray-800">{item.quantity}</span>
          <button onClick={() => updateQuantity(item.itemKey, item.quantity + 1)} className="w-7 h-7 flex items-center justify-center bg-white border border-gray-200 rounded-lg font-bold text-gray-500 hover:bg-gray-100 transition-colors">+</button>
        </div>
        <span className="font-black text-gray-900 text-xs px-2">Q{(item.price * item.quantity).toLocaleString()}</span>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-3xl w-full max-w-6xl h-[85vh] overflow-hidden shadow-2xl animate-scale-in flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-100 px-6 py-4 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-black text-gray-800 tracking-tighter uppercase flex items-center gap-2">
              <span className="w-1.5 h-6 bg-green-600 rounded-full"></span> 💰 Nueva Venta
            </h2>
            <button 
              onClick={() => isMobile ? startNativeScanner() : setShowPairingQR(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-50 hover:bg-gray-100 rounded-xl text-gray-600 font-bold text-xs transition-all border border-gray-100 shadow-sm"
            >
              <span>{isMobile ? '📷 Abrir Escáner' : '📱 Conectar Celular'}</span>
            </button>
          </div>
          <button onClick={onClose} className="bg-gray-100 text-gray-400 hover:text-gray-800 p-2 rounded-xl">✕</button>
        </div>

        {isMobile ? (
          /* ============================================================
             VISTA MÓVIL (Scroll Total)
             ============================================================ */
          <div className="p-4 flex-1 overflow-y-auto scrollbar-hide">
            <div className="flex flex-col gap-6 max-w-lg mx-auto pb-10">
              <div className="bg-gray-50 p-5 rounded-[2rem] border border-gray-100 shadow-inner">
                <form onSubmit={handleBarcodeSubmit} className="space-y-4">
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-green-600 transition-colors"><span className="text-xl">📷</span></div>
                    <input ref={barcodeRef} type="text" placeholder="Escanea aquí..." value={barcodeInput} onChange={handleBarcodeChange} className="w-full pl-12 pr-4 py-4 bg-white border-2 border-transparent rounded-2xl focus:border-green-500 focus:ring-4 focus:ring-green-500/10 font-mono text-xl shadow-sm outline-none transition-all" autoFocus />
                  </div>
                  <Button type="submit" variant="primary" className="w-full bg-green-600 h-14 rounded-2xl font-black text-sm shadow-xl">AGREGAR AL CARRITO</Button>
                </form>
              </div>

              <div className="bg-gray-50 rounded-[2.5rem] border border-gray-100 overflow-hidden flex flex-col">
                <div className="p-5 border-b border-gray-100 flex justify-between items-center">
                  <h3 className="text-sm font-black text-gray-800 uppercase tracking-tighter">🛒 Tu Carrito ({cart.length})</h3>
                  {cart.length > 0 && <button onClick={() => setShowClearConfirm(true)} className="text-[10px] font-black text-red-400 uppercase tracking-widest">Vaciar</button>}
                </div>
                <div className="p-3 space-y-2">
                  {cart.length === 0 ? (
                    <div className="text-center py-10 text-gray-300"><div className="text-4xl mb-2 opacity-10">🛒</div><p className="text-[10px] font-bold uppercase tracking-widest">Esperando productos...</p></div>
                  ) : (
                    cart.map(item => <CartItem key={item.itemKey} item={item} />)
                  )}
                </div>
                <div className="p-6 bg-gray-900 text-white border-t border-gray-800">
                   <div className="flex justify-between items-center mb-6"><span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Total</span><span className="text-3xl font-black text-green-400 tracking-tighter">Q{subtotal.toLocaleString()}</span></div>
                   <div className="space-y-4">
                      <input type="text" placeholder="Cliente..." value={clienteNombre} onChange={(e) => setClienteNombre(e.target.value)} className="w-full px-4 py-4 bg-white/5 border-2 border-gray-800 rounded-2xl text-sm focus:outline-none focus:border-green-500 focus:bg-white/10 transition-all" />
                      <div className="grid grid-cols-2 gap-3">
                        <button onClick={() => setIsDebt(false)} className={`py-4 rounded-2xl text-[10px] font-black uppercase transition-all ${!isDebt ? 'bg-green-600 text-white shadow-xl' : 'bg-gray-800 text-gray-500'}`}>💵 Efectivo</button>
                        <button onClick={() => setIsDebt(true)} className={`py-4 rounded-2xl text-[10px] font-black uppercase transition-all ${isDebt ? 'bg-yellow-500 text-white shadow-xl' : 'bg-gray-800 text-gray-500'}`}>📝 Crédito</button>
                      </div>
                      <Button variant="success" onClick={handleCheckout} loading={loading} disabled={cart.length === 0} className="w-full bg-green-500 h-16 rounded-2xl text-lg font-black transition-all">FINALIZAR VENTA</Button>
                   </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ============================================================
             VISTA DESKTOP (PC)
             ============================================================ */
          <div className="p-6 grid lg:grid-cols-3 gap-6 flex-1 overflow-hidden">
            <div className="lg:col-span-2 flex flex-col gap-4 overflow-hidden">
              <div className="bg-gray-50 p-4 rounded-[2rem] border border-gray-100 flex flex-col gap-3 shrink-0">
                <form onSubmit={handleBarcodeSubmit} className="flex gap-2">
                  <div className="relative flex-1 group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-green-600 transition-colors"><span className="text-xl">📷</span></div>
                    <input ref={barcodeRef} type="text" placeholder="Escanea o escribe código..." value={barcodeInput} onChange={handleBarcodeChange} className="w-full pl-12 pr-4 py-4 bg-white border-2 border-gray-100 rounded-2xl focus:outline-none focus:border-green-500 focus:ring-4 focus:ring-green-500/10 font-mono text-lg transition-all" />
                  </div>
                  <Button type="submit" variant="primary" className="bg-green-600 px-8 rounded-2xl shadow-lg font-bold">Agregar</Button>
                </form>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-green-600 transition-colors"><span className="text-xl">🔍</span></div>
                  <input type="text" placeholder="Buscar por nombre o SKU..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-12 pr-4 py-3 bg-white border-2 border-gray-100 rounded-2xl focus:outline-none focus:border-green-500 focus:ring-4 focus:ring-green-500/10 transition-all" />
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 overflow-y-auto pr-2 pb-2 flex-1 scrollbar-thin scrollbar-thumb-gray-200">
                {isSearching ? (
                  <div className="col-span-full py-12 text-center text-gray-400"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-3"></div><p>Búscando productos...</p></div>
                ) : products.length === 0 && searchTerm.trim().length >= 2 ? (
                  <div className="col-span-full py-12 text-center text-gray-400"><div className="text-5xl mb-3">🔍</div><p>No se encontraron resultados</p></div>
                ) : (
                  products.map(product => (
                    <div key={product._id} onClick={() => handleProductSelect(product)} className="p-4 border border-gray-100 bg-white rounded-xl cursor-pointer hover:border-green-300 hover:shadow-md transition-all flex flex-col justify-between">
                      <div>
                        <div className="font-bold text-gray-800 truncate flex items-center justify-between text-xs">{product.name} {product.hasVariants && <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">🔄</span>}</div>
                        <div className="text-[10px] text-gray-400 mt-1">{product.sku}</div>
                      </div>
                      <div className="mt-3 flex justify-between items-end">
                        <div className="text-green-600 font-bold text-sm">Q{product.price.toLocaleString()}</div>
                        <div className={`text-[9px] font-black px-2 py-0.5 rounded-full ${product.stock > 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>STOCK: {product.stock}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="bg-gray-50 rounded-[2rem] p-5 flex flex-col h-full overflow-hidden border border-gray-100">
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2 shrink-0 uppercase tracking-tighter"><span className="w-1.5 h-5 bg-green-500 rounded-full"></span> 🛒 Carrito</h3>
              <div className="space-y-2 overflow-y-auto flex-1 pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
                {cart.map(item => <CartItem key={item.itemKey} item={item} />)}
              </div>
              <div className="shrink-0 mt-4 border-t border-gray-200 pt-6">
                <div className="flex justify-between items-end mb-4"><span className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">Total</span><span className="text-3xl font-black text-green-600 tracking-tighter">Q{subtotal.toLocaleString()}</span></div>
                <input type="text" placeholder="Cliente..." value={clienteNombre} onChange={(e) => setClienteNombre(e.target.value)} className="w-full px-4 py-3 bg-white border-2 border-gray-100 rounded-2xl text-sm focus:outline-none focus:border-green-500 transition-all mb-4" />
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <button onClick={() => setIsDebt(false)} className={`py-3 rounded-2xl text-[10px] font-black uppercase transition-all ${!isDebt ? 'bg-green-600 text-white shadow-lg shadow-green-900/20' : 'bg-white border-2 text-gray-400'}`}>💵 Efec.</button>
                  <button onClick={() => setIsDebt(true)} className={`py-3 rounded-2xl text-[10px] font-black uppercase transition-all ${isDebt ? 'bg-yellow-500 text-white shadow-lg shadow-yellow-900/20' : 'bg-white border-2 text-gray-400'}`}>📝 Créd.</button>
                </div>
                <Button variant="success" onClick={handleCheckout} loading={loading} disabled={cart.length === 0} className="w-full bg-green-600 h-14 rounded-2xl text-lg font-black shadow-xl">COBRAR VENTA</Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MODALES COMUNES */}
      {showVariantModal && selectedProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4 backdrop-blur-sm">
          <div className="bg-white rounded-[2.5rem] max-w-xl w-full p-8 shadow-2xl animate-scale-in border border-gray-100">
            <h3 className="text-2xl font-black text-gray-800 mb-2 tracking-tighter uppercase">Seleccionar Variante</h3>
            <p className="text-gray-500 mb-6 font-medium">{selectedProduct.name}</p>
            <div className="grid grid-cols-2 gap-3 max-h-96 overflow-auto pr-2">
              {variants.map(v => (
                <button key={v._id} onClick={() => addVariantToCart(v)} className="p-4 text-left border-2 border-gray-100 rounded-2xl hover:border-green-500 hover:bg-green-50 transition-all group">
                  <p className="font-bold text-gray-800 group-hover:text-green-700 transition-colors">{v.name}</p>
                  <p className="text-green-600 font-black mt-1">Q{v.price.toLocaleString()}</p>
                  <p className="text-[10px] text-gray-400 mt-2 uppercase font-bold tracking-widest">Stock: {v.stock}</p>
                </button>
              ))}
            </div>
            <Button variant="ghost" onClick={() => setShowVariantModal(false)} className="w-full mt-6 h-12 rounded-2xl font-bold">Cancelar</Button>
          </div>
        </div>
      )}

      {showPairingQR && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[70] p-4">
          <div className="bg-white rounded-[3rem] p-8 max-w-sm w-full shadow-2xl animate-scale-in text-center border border-gray-100">
            <div className="w-20 h-20 bg-blue-50 rounded-3xl flex items-center justify-center text-4xl mx-auto mb-6 shadow-inner">📱</div>
            <h3 className="text-2xl font-black text-gray-800 mb-2 tracking-tighter uppercase">Conectar Celular</h3>
            <p className="text-gray-500 mb-8 text-sm leading-relaxed">Escanea este código para usar tu celular como <b>lector remoto</b>.</p>
            <div className="bg-gray-50 p-6 rounded-3xl inline-block border-2 border-dashed border-gray-200 mb-8 shadow-inner"><QRCodeSVG value={mobileScannerUrl} size={180} level="H" includeMargin={false} /></div>
            <div className="space-y-3">
              <div className="p-3 bg-blue-50 rounded-2xl text-blue-700 text-xs font-bold border border-blue-100 italic">Asegúrate de estar en la misma red Wi-Fi</div>
              <Button variant="ghost" onClick={() => setShowPairingQR(false)} className="w-full h-12 rounded-2xl font-bold">Cerrar</Button>
            </div>
          </div>
        </div>
      )}

      {showNativeScanner && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
          <div className="bg-white/90 rounded-[2.5rem] overflow-hidden shadow-2xl w-full max-w-md border border-white/20 animate-scale-in">
            <div className="p-6 flex justify-between items-center border-b border-gray-100 bg-white">
              <div className="flex items-center gap-3"><span className="text-xl">📷</span><h3 className="text-lg font-black text-gray-800 tracking-tighter uppercase">Escáner</h3></div>
              <button onClick={stopNativeScanner} className="bg-gray-100 text-gray-500 p-2 rounded-xl">✕</button>
            </div>
            <div className="relative aspect-square overflow-hidden bg-black">
              <div id="native-scanner-container" className="w-full h-full"></div>
              <div className="absolute inset-0 border-[60px] border-black/40 pointer-events-none flex items-center justify-center"><div className="w-full h-full border-2 border-green-500 rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.2)]"></div></div>
            </div>
            <div className="p-6 bg-white text-center"><p className="text-xs text-gray-400 font-medium">Detección automática al enfocar el código.</p></div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={showClearConfirm}
        onClose={() => setShowClearConfirm(false)}
        onConfirm={() => { setCart([]); setShowClearConfirm(false); }}
        title="¿Vaciar Carrito?"
        message="Se eliminarán todos los productos de esta venta."
        confirmText="Sí, vaciar"
        type="danger"
      />
    </div>
  );
}
