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
  
  // Referencias para control de duplicados
  const lastScannedCodeRef = useRef(null);
  const lastScannedTimeRef = useRef(0);

  useEffect(() => {
    if (user?.id || user?._id) {
      const uId = user.id || user._id;
      const socket = initSocket(uId);
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
          
          // Bloqueo de 3 segundos para el MISMO código
          if (decodedText === lastScannedCodeRef.current && (now - lastScannedTimeRef.current) < 3000) {
            return;
          }

          lastScannedCodeRef.current = decodedText;
          lastScannedTimeRef.current = now;
          
          handleScanSuccess(decodedText);
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
    
    // 1. Enviar a PC al instante
    const socket = getSocket();
    if (socket?.connected) {
      socket.emit('send-barcode', { barcode });
    }

    // 2. Consultar información para feedback visual
    try {
      const product = await getProductByBarcode(barcode);
      setProductInfo(product);
      
      // VIBRACIÓN: Solo si el producto es válido y se procesó
      if (navigator.vibrate) navigator.vibrate(100);
      
    } catch (err) {
      setProductInfo({ error: "Producto no encontrado" });
      // Si no existe, no vibramos o vibramos diferente
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
      <div className="p-5 bg-gray-900/50 backdrop-blur-md border-b border-gray-800 flex justify-between items-center sticky top-0 z-50">
        <div>
          <h1 className="text-xl font-black text-green-500 tracking-tight italic">LIBRERÍA A&C</h1>
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${isScanning ? 'bg-green-500 animate-pulse' : 'bg-gray-600'}`}></span>
            <p className="text-[10px] text-gray-400 uppercase font-black tracking-widest">{status}</p>
          </div>
        </div>
        {isScanning && (
          <button onClick={stopScanner} className="bg-red-500/20 text-red-500 border border-red-500/30 px-5 py-2 rounded-2xl text-[10px] font-black active:scale-95 transition-all uppercase tracking-tighter">
            Detener
          </button>
        )}
      </div>

      <div className="flex-1 flex flex-col items-center p-6">
        <div className="relative w-full max-w-sm aspect-square bg-black rounded-[3rem] overflow-hidden border-4 border-gray-900 shadow-[0_0_60px_rgba(0,0,0,0.8)]">
          <div id="reader" className="w-full h-full"></div>
          {!isScanning && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/95 p-8 text-center backdrop-blur-sm">
              <div className="w-24 h-24 bg-green-500/10 rounded-[2rem] flex items-center justify-center mb-8 border border-green-500/20 shadow-inner">
                <span className="text-5xl">📷</span>
              </div>
              <h2 className="text-2xl font-black mb-3 tracking-tighter uppercase">Escáner Remoto</h2>
              <p className="text-gray-500 text-xs mb-10 leading-relaxed font-medium">Los productos escaneados aparecerán <br/> automáticamente en tu pantalla de PC.</p>
              <button onClick={startScanner} className="w-full bg-green-600 hover:bg-green-500 text-white font-black py-5 rounded-[2rem] shadow-2xl shadow-green-900/20 transition-all active:scale-95 text-lg tracking-tight">ACTIVAR LECTOR</button>
            </div>
          )}
          {isScanning && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-44 border-2 border-green-500/30 rounded-3xl pointer-events-none">
              <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-green-500 rounded-tl-xl"></div>
              <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-green-500 rounded-tr-xl"></div>
              <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-green-500 rounded-bl-xl"></div>
              <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-green-500 rounded-br-xl"></div>
              <div className="w-full h-1 bg-green-500/40 absolute top-1/2 animate-scan-line shadow-[0_0_15px_rgba(34,197,94,0.5)]"></div>
            </div>
          )}
        </div>

        {(productInfo || loadingProduct) && (
          <div className="mt-8 w-full max-w-sm animate-slide-up">
            {loadingProduct ? (
              <div className="bg-gray-900 p-8 rounded-[2.5rem] border border-gray-800 flex flex-col items-center justify-center gap-4">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-500"></div>
                <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Buscando producto...</p>
              </div>
            ) : productInfo?.error ? (
              <div className="bg-red-500/10 p-8 rounded-[2.5rem] border border-red-500/20 text-center backdrop-blur-md">
                <p className="text-red-400 font-black uppercase text-xs tracking-widest mb-1">No Registrado</p>
                <p className="text-lg font-black text-white/40 font-mono tracking-tighter">{lastScanned}</p>
              </div>
            ) : (
              <div className="bg-white rounded-[2.5rem] overflow-hidden shadow-2xl animate-scale-in">
                <div className="bg-green-600 p-4 flex justify-between items-center px-6">
                  <span className="text-[9px] font-black text-white uppercase tracking-widest">LECTURA EXITOSA</span>
                  <span className="text-[10px] font-mono text-white/60">{lastScanned}</span>
                </div>
                <div className="p-8 text-gray-950">
                  <h3 className="text-2xl font-black leading-none mb-2 uppercase tracking-tighter">{productInfo.name}</h3>
                  <div className="flex gap-2">
                    <span className="bg-gray-100 text-gray-600 text-[9px] font-black px-2 py-1 rounded-lg uppercase tracking-widest">✨ {productInfo.brandId?.name || 'GENÉRICO'}</span>
                    <span className="bg-green-50 text-green-700 text-[9px] font-black px-2 py-1 rounded-lg uppercase tracking-widest">📦 STOCK: {productInfo.stock}</span>
                  </div>
                  <div className="flex items-baseline justify-between mt-8 pt-6 border-t border-gray-100">
                    <span className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Precio</span>
                    <span className="text-5xl font-black text-green-600 tracking-tighter">Q{productInfo.price?.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes scan-line { 0% { top: 0; } 100% { top: 100%; } }
        .animate-scan-line { animation: scan-line 2.5s ease-in-out infinite; }
        @keyframes slide-up { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        .animate-slide-up { animation: slide-up 0.5s cubic-bezier(0.23, 1, 0.32, 1); }
      `}} />
    </div>
  );
}
