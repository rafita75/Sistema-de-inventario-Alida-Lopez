// client/src/modules/pos/pages/MobileScanner.jsx
import React, { useEffect, useState, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { useAuth } from '../../login/contexts/AuthContext';
import { initSocket, getSocket } from '../../../shared/services/socketService';
import { getProductByBarcode } from '../services/posService';

export default function MobileScanner() {
  const { user } = useAuth();
  const [status, setStatus] = useState('Iniciando...');
  const [lastScanned, setLastScanned] = useState(null);
  const [productInfo, setProductInfo] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [loadingProduct, setLoadingProduct] = useState(false);
  const [error, setError] = useState(null);
  const html5QrCodeRef = useRef(null);
  
  const lastScannedCodeRef = useRef(null);
  const lastScannedTimeRef = useRef(0);

  useEffect(() => {
    if (user?.id) {
      const socket = initSocket(user.id);
      if (socket && socket.connected) socket.emit('register-user', user.id);
      setStatus('Sincronizado con PC ✅');
    }
  }, [user]);

  const startScanner = async () => {
    try {
      setError(null);
      const html5QrCode = new Html5Qrcode("reader");
      html5QrCodeRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: "environment" }, 
        { fps: 15, qrbox: { width: 280, height: 180 }, aspectRatio: 1.0 }, 
        (decodedText) => {
          const now = Date.now();
          if (decodedText === lastScannedCodeRef.current && (now - lastScannedTimeRef.current) < 2500) return;

          lastScannedCodeRef.current = decodedText;
          lastScannedTimeRef.current = now;
          
          handleScanSuccess(decodedText);
          if (navigator.vibrate) navigator.vibrate(100);
        }
      );
      setIsScanning(true);
    } catch (err) {
      setError("No se pudo acceder a la cámara.");
    }
  };

  const handleScanSuccess = async (barcode) => {
    setLastScanned(barcode);
    setLoadingProduct(true);
    
    // 1. Enviar a PC (si está conectado)
    const socket = getSocket();
    if (socket?.connected) {
      socket.emit('send-barcode', { userId: user.id, barcode });
    }

    // 2. Consultar información del producto (Modo Standalone / Ver Precio)
    try {
      const product = await getProductByBarcode(barcode);
      setProductInfo(product);
    } catch (err) {
      setProductInfo({ error: "Producto no encontrado" });
    } finally {
      setLoadingProduct(false);
    }
  };

  const stopScanner = async () => {
    if (html5QrCodeRef.current) {
      await html5QrCodeRef.current.stop();
      setIsScanning(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col font-sans pb-10">
      {/* Header Premium */}
      <div className="p-5 bg-gray-900/50 backdrop-blur-md border-b border-gray-800 flex justify-between items-center sticky top-0 z-50">
        <div>
          <h1 className="text-xl font-black text-green-500 tracking-tight">LIBRERÍA A&C</h1>
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${isScanning ? 'bg-green-500 animate-pulse' : 'bg-gray-600'}`}></span>
            <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">{status}</p>
          </div>
        </div>
        {isScanning && (
          <button onClick={stopScanner} className="bg-red-500/10 text-red-500 border border-red-500/20 px-4 py-1.5 rounded-2xl text-xs font-bold active:scale-95 transition-all">
            DETENER
          </button>
        )}
      </div>

      <div className="flex-1 flex flex-col items-center p-6">
        {/* Lector de Cámara */}
        <div className="relative w-full max-w-sm aspect-square bg-black rounded-[2.5rem] overflow-hidden border-4 border-gray-900 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
          <div id="reader" className="w-full h-full"></div>
          
          {!isScanning && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/90 p-8 text-center">
              <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mb-6 border border-green-500/20">
                <span className="text-4xl">📷</span>
              </div>
              <h2 className="text-2xl font-bold mb-2">Lector Activo</h2>
              <p className="text-gray-400 text-sm mb-8">Escanea para enviar a la PC o consultar precios al instante</p>
              <button 
                onClick={startScanner}
                className="w-full bg-green-600 hover:bg-green-500 text-white font-black py-4 rounded-3xl shadow-[0_10px_20px_rgba(22,163,74,0.3)] transition-all active:scale-95"
              >
                ACTIVAR CÁMARA
              </button>
            </div>
          )}

          {isScanning && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-40 border-2 border-green-500/50 rounded-2xl pointer-events-none">
              <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-green-500 rounded-tl-lg"></div>
              <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-green-500 rounded-tr-lg"></div>
              <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-green-500 rounded-bl-lg"></div>
              <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-green-500 rounded-br-lg"></div>
              <div className="w-full h-0.5 bg-green-500/30 absolute top-1/2 animate-scan-line"></div>
            </div>
          )}
        </div>

        {/* Tarjeta de Información del Producto */}
        {(productInfo || loadingProduct) && (
          <div className="mt-8 w-full max-w-sm animate-slide-up">
            {loadingProduct ? (
              <div className="bg-gray-900 p-6 rounded-[2rem] border border-gray-800 flex items-center justify-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-500"></div>
              </div>
            ) : productInfo?.error ? (
              <div className="bg-red-500/10 p-6 rounded-[2rem] border border-red-500/20 text-center">
                <p className="text-red-400 font-bold">⚠️ Código no registrado</p>
                <p className="text-xs text-red-300/60 mt-1 font-mono">{lastScanned}</p>
              </div>
            ) : (
              <div className="bg-white rounded-[2rem] overflow-hidden shadow-2xl">
                <div className="bg-green-600 p-4 flex justify-between items-center">
                  <span className="text-[10px] font-black text-green-100 uppercase tracking-widest">Información de Producto</span>
                  <span className="text-[10px] font-mono text-green-100">{lastScanned}</span>
                </div>
                <div className="p-6 text-gray-900">
                  <h3 className="text-2xl font-black leading-tight mb-1">{productInfo.name}</h3>
                  <div className="flex gap-2 mb-4">
                    {productInfo.brandId?.name && (
                      <span className="bg-gray-100 text-gray-600 text-[10px] font-bold px-2 py-1 rounded-lg uppercase">
                        ✨ {productInfo.brandId.name}
                      </span>
                    )}
                    <span className="bg-green-50 text-green-700 text-[10px] font-bold px-2 py-1 rounded-lg uppercase">
                      📦 Stock: {productInfo.stock}
                    </span>
                  </div>
                  
                  <div className="flex items-baseline justify-between mt-6 pt-6 border-t border-gray-100">
                    <span className="text-gray-400 text-sm font-bold uppercase">Precio Venta</span>
                    <span className="text-4xl font-black text-green-600">Q{productInfo.price?.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {!productInfo && !loadingProduct && isScanning && (
          <p className="mt-8 text-gray-500 text-xs font-bold uppercase tracking-widest animate-pulse">
            Esperando lectura...
          </p>
        )}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes scan-line {
          0% { top: 0; }
          100% { top: 100%; }
        }
        .animate-scan-line {
          animation: scan-line 2s linear infinite;
        }
        @keyframes slide-up {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-slide-up {
          animation: slide-up 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
      `}} />
    </div>
  );
}
