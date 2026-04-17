// client/src/modules/pos/pages/MobileScanner.jsx
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { initSocket } from '../../../shared/services/socketService';

export default function MobileScanner() {
  const { sessionId } = useParams();
  const [socket, setSocket] = useState(null);
  const [status, setStatus] = useState('Conectando...');
  const [lastScanned, setLastScanned] = useState(null);

  useEffect(() => {
    // 1. Iniciar conexión Socket
    // Usamos el sessionId como si fuera el userId para forzar la conexión
    const newSocket = initSocket(sessionId);
    setSocket(newSocket);

    if (newSocket) {
      newSocket.on('connect', () => {
        setStatus('Conectado a la PC ✅');
        // Unirse a la sala de la PC
        newSocket.emit('join-scanner-session', sessionId);
      });

      newSocket.on('disconnect', () => {
        setStatus('Desconectado ❌');
      });
    }

    return () => {
      if (newSocket) newSocket.disconnect();
    };
  }, [sessionId]);

  useEffect(() => {
    // 2. Iniciar el escáner de cámara
    const scanner = new Html5QrcodeScanner(
      'reader',
      { fps: 10, qrbox: { width: 250, height: 150 } },
      false
    );

    scanner.render(
      (decodedText) => {
        // Éxito al escanear
        setLastScanned(decodedText);
        
        // Enviar por socket a la PC
        if (socket) {
          socket.emit('send-barcode', {
            sessionId: sessionId,
            barcode: decodedText
          });
          
          // Efecto de sonido/vibración (si el navegador lo permite)
          if (navigator.vibrate) {
            navigator.vibrate(200);
          }
        }
      },
      (error) => {
        // Ignorar errores constantes de lectura (pasan en cada frame)
      }
    );

    return () => {
      scanner.clear().catch(error => {
        console.error('Error limpiando scanner', error);
      });
    };
  }, [socket, sessionId]);

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      <div className="p-4 bg-gray-800 border-b border-gray-700 text-center shadow-md">
        <h1 className="text-xl font-bold text-green-400">📱 Escáner Móvil</h1>
        <p className="text-sm mt-1">{status}</p>
      </div>
      
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        {/* Contenedor del Lector de Cámara */}
        <div id="reader" className="w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl bg-white text-black"></div>
        
        {lastScanned ? (
          <div className="mt-8 text-center animate-fade-in">
            <p className="text-gray-400 mb-2">Último código enviado:</p>
            <div className="text-2xl font-mono bg-green-900 text-green-300 py-3 px-6 rounded-xl border border-green-700 shadow-inner">
              {lastScanned}
            </div>
          </div>
        ) : (
          <div className="mt-8 text-center text-gray-500 animate-pulse">
            Apunta la cámara a un código de barras
          </div>
        )}
      </div>

      <div className="p-4 text-center text-xs text-gray-500">
        Sesión activa: {sessionId.substring(0, 8)}...
      </div>
    </div>
  );
}
