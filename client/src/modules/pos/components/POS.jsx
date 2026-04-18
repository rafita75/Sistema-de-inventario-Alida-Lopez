// client/src/modules/pos/components/POS.jsx
import { useState, useEffect, useRef } from 'react';
import { searchProducts, getProductByBarcode, getProductVariants, registerSale } from '../services/posService';
import Button from '../../core/components/UI/Button';
import { QRCodeSVG } from 'qrcode.react';
import { initSocket, getSocket } from '../../../shared/services/socketService';
import { useAuth } from '../../login/contexts/AuthContext';

export default function POS({ onClose, onSaleComplete }) {
  const { user } = useAuth();
  const [cart, setCart] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [products, setProducts] = useState([]);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [clienteNombre, setClienteNombre] = useState('');
  const [clienteTelefono, setClienteTelefono] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('efectivo');
  const [isDebt, setIsDebt] = useState(false);
  const [message, setMessage] = useState('');
  
  const [showVariantModal, setShowVariantModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [variants, setVariants] = useState([]);

  // ==========================================
  // ESTADOS DEL ESCÁNER MÓVIL
  // ==========================================
  const [showScannerQR, setShowScannerQR] = useState(false);
  const [scannerConnected, setScannerConnected] = useState(false);
  
  const barcodeRef = useRef(null);
  const barcodeTimeoutRef = useRef(null);

  // Inicializar conexión automática al abrir el POS
  useEffect(() => {
    if (!user?.id) return;

    // Conectar al socket usando el User ID (Sincronización automática)
    const socket = initSocket(user.id);

    const handleBarcode = (data) => {
      if (data.barcode) {
        console.log('📡 Código recibido del móvil:', data.barcode);
        submitBarcode(data.barcode);
        setScannerConnected(true);
        setMessage('📷 Código escaneado desde el celular');
        setTimeout(() => setMessage(''), 2000);
      }
    };

    socket.on('barcode-received', handleBarcode);
    socket.on('scanner-connected', () => setScannerConnected(true));

    if (barcodeRef.current) {
      barcodeRef.current.focus();
    }

    return () => {
      socket.off('barcode-received', handleBarcode);
    };
  }, [user]);

  useEffect(() => {
    const searchProductsDebounced = setTimeout(async () => {
      if (searchTerm.length >= 2) {
        try {
          const data = await searchProducts(searchTerm);
          setProducts(data);
        } catch (error) {
          console.error('Error buscando productos:', error);
        }
      } else {
        setProducts([]);
      }
    }, 300);

    return () => clearTimeout(searchProductsDebounced);
  }, [searchTerm]);

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
      } 
      else if (product.hasVariants && product.variants && product.variants.length > 0) {
        setSelectedProduct(product);
        setVariants(product.variants);
        setShowVariantModal(true);
      } 
      else {
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
      if (barcodeRef.current) barcodeRef.current.focus();
    } catch (error) {
      if (error.response?.status === 404) {
        alert(`Producto no encontrado (${code})`);
      } else {
        alert('Error al buscar producto');
      }
      setBarcodeInput('');
      if (barcodeRef.current) barcodeRef.current.focus();
    }
  };

  const handleBarcodeChange = (e) => {
    const value = e.target.value;
    setBarcodeInput(value);
    
    if (barcodeTimeoutRef.current) clearTimeout(barcodeTimeoutRef.current);
    
    if (value.trim()) {
      barcodeTimeoutRef.current = setTimeout(() => {
        submitBarcode(value);
      }, 300);
    }
  };

  const handleBarcodeSubmit = (e) => {
    e.preventDefault();
    if (barcodeTimeoutRef.current) clearTimeout(barcodeTimeoutRef.current);
    submitBarcode(barcodeInput);
  };

  const handleProductSelect = async (product) => {
    if (product.hasVariants) {
      try {
        const data = await getProductVariants(product._id);
        setSelectedProduct(data.product);
        setVariants(data.variants);
        setShowVariantModal(true);
      } catch (error) {
        alert('Error al cargar las variantes');
      }
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
    setSelectedProduct(null);
    setVariants([]);
  };

  const addToCart = (item) => {
    if (item.stock < 1) {
      alert(`⚠️ Stock insuficiente. No hay unidades disponibles.`);
      return;
    }

    setCart(prev => {
      const itemKey = item.variantId ? `${item.productId}-${item.variantId}` : item.productId;
      const existing = prev.find(i => i.itemKey === itemKey);
      
      if (existing) {
        if (existing.quantity + 1 > item.stock) {
          alert(`⚠️ Solo puedes agregar hasta ${item.stock} unidades.`);
          return prev;
        }
        return prev.map(i => i.itemKey === itemKey ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...item, itemKey, quantity: 1 }];
    });
  };

  const removeFromCart = (itemKey) => {
    setCart(prev => prev.filter(item => item.itemKey !== itemKey));
  };

  const updateQuantity = (itemKey, quantity) => {
    const item = cart.find(i => i.itemKey === itemKey);
    if (quantity > item.stock) {
      alert(`⚠️ Solo hay ${item.stock} unidades disponibles.`);
      return;
    }
    if (quantity <= 0) {
      removeFromCart(itemKey);
      return;
    }
    setCart(prev => prev.map(item => item.itemKey === itemKey ? { ...item, quantity } : item));
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const handleCheckout = async () => {
    if (cart.length === 0) return alert('Agrega productos al carrito');
    if (isDebt && !clienteNombre.trim()) return alert('⚠️ Para crédito, ingrese el nombre del cliente');

    setLoading(true);
    setMessage('');

    try {
      await registerSale({
        items: cart.map(item => ({
          productId: item.productId,
          variantId: item.variantId,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          sku: item.sku
        })),
        clienteNombre,
        clienteTelefono,
        paymentMethod: isDebt ? 'efectivo' : paymentMethod,
        total: subtotal,
        esDeuda: isDebt
      });

      setMessage(`✅ Venta exitosa. Total: Q${subtotal.toLocaleString()}`);
      setCart([]); setClienteNombre(''); setClienteTelefono(''); setIsDebt(false);
      
      if (onSaleComplete) onSaleComplete();
      setTimeout(() => { setMessage(''); if (onClose) onClose(); }, 2000);
    } catch (error) {
      setMessage(error.response?.data?.error || '❌ Error al procesar la venta');
    } finally {
      setLoading(false);
    }
  };

  // URL para el escáner móvil (detecta automáticamente la IP o el dominio)
  const mobileScannerUrl = `${window.location.origin}/scanner/${sessionId}`;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden shadow-xl flex flex-col animate-scale-in">
        {/* Header */}
        <div className="bg-white border-b border-gray-100 px-6 py-4 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <span className="w-1 h-5 bg-green-600 rounded-full"></span>
              💰 Punto de Venta
            </h2>
            <button 
              onClick={() => setShowScannerQR(true)}
              className={`text-sm px-3 py-1.5 rounded-lg font-medium transition ${
                scannerConnected 
                  ? 'bg-green-100 text-green-700 border border-green-200' 
                  : 'bg-blue-50 text-blue-600 border border-blue-100 hover:bg-blue-100'
              }`}
            >
              {scannerConnected ? '📱 Celular Vinculado' : '📷 Vincular Celular'}
            </button>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition p-2 rounded-lg hover:bg-gray-100">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {message && (
          <div className={`mx-6 mt-4 p-3 rounded-xl shrink-0 ${message.includes('✅') || message.includes('📱') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
            {message}
          </div>
        )}

        <div className="p-6 grid lg:grid-cols-3 gap-6 overflow-y-auto flex-1">
          {/* Panel izquierdo */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            <form onSubmit={handleBarcodeSubmit} className="flex gap-2 shrink-0">
              <input
                ref={barcodeRef}
                type="text"
                placeholder="📷 Escanea o escribe código..."
                value={barcodeInput}
                onChange={handleBarcodeChange}
                className="flex-1 p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 font-mono"
              />
              <Button type="submit" variant="primary" size="sm" className="bg-gradient-to-r from-green-600 to-green-700 shrink-0">
                Agregar
              </Button>
            </form>

            <input
              type="text"
              placeholder="🔍 Buscar producto por nombre..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 shrink-0"
            />

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 overflow-y-auto pr-2 pb-2">
              {products.map(product => (
                <div
                  key={product._id}
                  onClick={() => handleProductSelect(product)}
                  className="p-4 border border-gray-100 rounded-xl cursor-pointer hover:border-green-300 hover:shadow-md transition-all"
                >
                  <div className="font-medium text-gray-800 truncate flex items-center justify-between">
                    {product.name}
                    {product.hasVariants && <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">🔄</span>}
                  </div>
                  <div className="text-green-600 font-bold mt-1">Q{product.price}</div>
                  <div className="text-xs text-gray-400 mt-1">Stock: {product.stock}</div>
                </div>
              ))}
              {products.length === 0 && searchTerm.length >= 2 && (
                <p className="text-gray-400 col-span-full text-center py-8">No se encontraron productos</p>
              )}
            </div>
          </div>

          {/* Panel derecho - Carrito */}
          <div className="bg-gray-50 rounded-2xl p-5 flex flex-col h-full">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2 shrink-0">
              <span className="w-1 h-4 bg-green-500 rounded-full"></span>
              🛒 Carrito
            </h3>
            
            <div className="space-y-2 overflow-y-auto flex-1 min-h-[200px]">
              {cart.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <div className="text-5xl mb-3">🛒</div>
                  <p>Carrito vacío</p>
                </div>
              ) : (
                cart.map(item => (
                  <div key={item.itemKey} className="bg-white rounded-xl p-3 shadow-sm border border-gray-100">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="font-medium text-gray-800 leading-tight">{item.name}</p>
                        <p className="text-sm text-green-600">Q{item.price}</p>
                      </div>
                      <button onClick={() => removeFromCart(item.itemKey)} className="text-gray-400 hover:text-red-500 transition p-1">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => updateQuantity(item.itemKey, item.quantity - 1)} className="w-7 h-7 bg-gray-100 rounded-lg hover:bg-gray-200 transition">-</button>
                        <span className="w-8 text-center font-medium">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.itemKey, item.quantity + 1)} className="w-7 h-7 bg-gray-100 rounded-lg hover:bg-gray-200 transition">+</button>
                      </div>
                      <span className="font-semibold text-gray-800">Q{(item.price * item.quantity).toLocaleString()}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="shrink-0 mt-4">
              <div className="border-t border-gray-200 pt-4 mb-4">
                <div className="flex justify-between text-lg font-bold">
                  <span className="text-gray-600">Total</span>
                  <span className="text-green-600">Q{subtotal.toLocaleString()}</span>
                </div>
              </div>

              <div className="space-y-3 mb-4">
                <input
                  type="text"
                  placeholder="Nombre del cliente (requerido para crédito)"
                  value={clienteNombre}
                  onChange={(e) => setClienteNombre(e.target.value)}
                  className={`w-full p-3 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 ${isDebt ? 'border-yellow-400 bg-yellow-50' : 'border-gray-200'}`}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-500 mb-2 uppercase tracking-wider">Tipo de venta</label>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => setIsDebt(false)} className={`py-2.5 rounded-xl text-sm font-medium transition-all ${!isDebt ? 'bg-gradient-to-r from-green-600 to-green-700 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>💵 Efectivo</button>
                  <button onClick={() => setIsDebt(true)} className={`py-2.5 rounded-xl text-sm font-medium transition-all ${isDebt ? 'bg-gradient-to-r from-yellow-600 to-yellow-700 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>📝 Crédito</button>
                </div>
              </div>

              <div className="flex gap-3 mt-4">
                <Button variant="success" onClick={handleCheckout} loading={loading} disabled={cart.length === 0} className="flex-1 bg-gradient-to-r from-green-600 to-green-700">
                  {isDebt ? '📝 Crédito' : '💰 Cobrar'}
                </Button>
                <Button variant="danger" onClick={() => setCart([])} disabled={cart.length === 0} className="bg-red-500 hover:bg-red-600 px-4">
                  🗑️
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL QR ESCÁNER */}
      {showScannerQR && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[70] p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-sm w-full p-8 text-center shadow-2xl relative">
            <button onClick={() => setShowScannerQR(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-800">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            
            <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
              📱
            </div>
            
            <h3 className="text-2xl font-bold text-gray-800 mb-2">Vincular Celular</h3>
            <p className="text-gray-500 mb-6 text-sm">
              Escanea este código QR con la cámara de tu celular para usarlo como lector de código de barras.
            </p>
            
            <div className="bg-gray-50 p-4 rounded-2xl flex justify-center border border-gray-100 mb-6">
              <QRCodeSVG value={mobileScannerUrl} size={200} level="H" includeMargin={true} />
            </div>

            <div className="text-xs text-gray-400 mb-4 bg-gray-100 p-2 rounded-lg break-all">
              {mobileScannerUrl}
            </div>

            <p className="text-sm font-medium text-blue-600 animate-pulse flex items-center justify-center gap-2">
              <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
              Esperando conexión...
            </p>
          </div>
        </div>
      )}

      {/* MODAL VARIANTES */}
      {showVariantModal && selectedProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[80vh] overflow-auto shadow-xl animate-scale-in">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-4 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-800">Selecciona variante</h3>
              <button onClick={() => setShowVariantModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="p-5 space-y-3">
              {variants.map((variant) => (
                <div key={variant._id} onClick={() => addVariantToCart(variant)} className="p-4 border border-gray-100 rounded-xl cursor-pointer hover:border-green-300 hover:shadow-md transition-all flex justify-between items-center">
                  <div>
                    <div className="font-medium text-gray-800">{variant.name}</div>
                    <div className="text-xs text-gray-400">Stock: {variant.stock}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-green-600 font-bold">Q{variant.price}</div>
                    <button className="mt-1 px-3 py-1 bg-green-600 text-white text-xs rounded-lg">Agregar</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
