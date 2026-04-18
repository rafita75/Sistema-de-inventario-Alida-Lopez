// client/src/modules/pos/pages/MobileScanner.jsx
import React, { useEffect, useState, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { useAuth } from '../../login/contexts/AuthContext';
import { initSocket, getSocket } from '../../../shared/services/socketService';

export default function MobileScanner() {
  const { user } = useAuth();
  const [status, setStatus] = useState('Iniciando...');
  const [lastScanned, setLastScanned] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState(null);
  const html5QrCodeRef = useRef(null);

  useEffect(() => {
    if (user?.id) {
      console.log('🔗 Conectando escáner para usuario:', user.id);
      initSocket(user.id);
      setStatus('Listo para conectar ✅');
    }
  }, [user]);

  const startScanner = async () => {
    try {
      setError(null);
      const html5QrCode = new Html5Qrcode("reader");
      html5QrCodeRef.current = html5QrCode;

      const config = { 
        fps: 10, 
        qrbox: { width: 280, height: 180 },
        aspectRatio: 1.0
      };

      await html5QrCode.start(
        { facingMode: "environment" }, 
        config, 
        (decodedText) => {
          setLastScanned(decodedText);
          sendToPC(decodedText);
          if (navigator.vibrate) navigator.vibrate(100);
        }
      );

      setIsScanning(true);
      setStatus('Escaneando... 📷');
    } catch (err) {
      console.error("Error al iniciar cámara:", err);
      setError("No se pudo acceder a la cámara. Asegúrate de dar permisos.");
      setStatus('Error de cámara ❌');
    }
  };

  const stopScanner = async () => {
    if (html5QrCodeRef.current) {
      await html5QrCodeRef.current.stop();
      setIsScanning(false);
      setStatus('Escáner detenido');
    }
  };

  const sendToPC = (barcode) => {
    const socket = getSocket();
    if (socket && socket.connected) {
      socket.emit('send-barcode', {
        userId: user.id,
        barcode: barcode
      });
      console.log('📡 Enviado a PC:', barcode);
    } else {
      setStatus('Desconectado de la PC ❌');
      // Intentar reconectar
      initSocket(user.id);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col font-sans">
      {/* Header */}
      <div className="p-4 bg-gray-900 border-b border-gray-800 flex justify-between items-center sticky top-0 z-50">
        <div>
          <h1 className="text-lg font-bold text-green-500">Librería A&C</h1>
          <p className="text-xs text-gray-400">{status}</p>
        </div>
        {isScanning && (
          <button 
            onClick={stopScanner}
            className="bg-red-600 text-white px-4 py-1 rounded-full text-xs font-bold"
          >
            Detener
          </button>
        )}
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6">
        {error && (
          <div className="mb-6 p-4 bg-red-900/50 border border-red-700 rounded-2xl text-red-200 text-sm text-center">
            {error}
          </div>
        )}

        {/* Contenedor del Lector */}
        <div className="relative w-full max-w-sm aspect-square bg-gray-900 rounded-3xl overflow-hidden border-2 border-gray-800 shadow-2xl">
          <div id="reader" className="w-full h-full"></div>
          
          {!isScanning && !error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/80 backdrop-blur-sm p-8 text-center">
              <div className="text-6xl mb-4">📷</div>
              <h2 className="text-xl font-bold mb-2">Escáner Desactivado</h2>
              <p className="text-gray-400 text-sm mb-6">Toca el botón para usar la cámara y escanear productos</p>
              <button 
                onClick={startScanner}
                className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-4 rounded-2xl shadow-lg transition-transform active:scale-95"
              >
                ACTIVAR CÁMARA
              </button>
            </div>
          )}
        </div>

        {lastScanned && (
          <div className="mt-10 w-full max-w-sm animate-bounce-in">
            <p className="text-gray-500 text-center text-xs uppercase tracking-widest mb-2 font-bold">Último detectado</p>
            <div className="bg-gradient-to-r from-green-900 to-green-800 text-green-100 py-4 px-6 rounded-2xl border border-green-600 text-center shadow-xl">
              <span className="text-3xl font-mono font-bold">{lastScanned}</span>
              <p className="text-[10px] mt-1 text-green-400">ENVIADO AUTOMÁTICAMENTE A LA PC</p>
            </div>
          </div>
        )}
      </div>

      <div className="p-6 text-center">
        <p className="text-gray-600 text-[10px] uppercase tracking-tighter">
          Conectado como: <span className="text-gray-400">{user?.name}</span>
        </p>
      </div>
    </div>
  );
}
