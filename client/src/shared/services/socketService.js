// client/src/shared/services/socketService.js
import { io } from 'socket.io-client';

let socket = null;
let pendingUserId = null;

export const initSocket = (userId) => {
  if (!socket) {
    console.log('🔄 Inicializando socket en puerto 5000');
    socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000');
    
    socket.on('connect', () => {
      console.log('✅ Socket conectado, ID:', socket.id);
      // Enviar userId pendiente o el actual
      const userIdToSend = pendingUserId || userId;
      if (userIdToSend) {
        socket.emit('register-user', userIdToSend);
        console.log('📝 Registrando usuario:', userIdToSend);
        pendingUserId = null;
      }
    });
    
    socket.on('connect_error', (error) => {
      console.error('❌ Error de conexión:', error);
    });
    
    socket.on('disconnect', () => {
      console.log('🔌 Socket desconectado');
    });
  } else if (userId && socket.connected) {
    // Si ya está conectado, enviar registro ahora
    socket.emit('register-user', userId);
    console.log('📝 Registrando usuario (reconexión):', userId);
  } else if (userId) {
    // Guardar para cuando se conecte
    pendingUserId = userId;
  }
  
  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const requestNotificationPermission = async () => {
  if (!('Notification' in window)) {
    console.log('⚠️ Este navegador no soporta notificaciones');
    return false;
  }
  
  if (Notification.permission === 'granted') {
    console.log('✅ Permiso concedido');
    return true;
  }
  
  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    console.log('📢 Permiso:', permission);
    return permission === 'granted';
  }
  
  return false;
};

export const showNotification = (title, options) => {
  if (Notification.permission === 'granted') {
    const notification = new Notification(title, options);
    setTimeout(() => notification.close(), 5000);
    notification.onclick = () => {
      window.focus();
      if (options?.data?.url) {
        window.location.href = options.data.url;
      }
      notification.close();
    };
  }
};