// client/src/shared/services/socketService.js
import { io } from 'socket.io-client';
import api from './api';

let socket = null;
let pendingUserId = null;
const VAPID_PUBLIC_KEY = 'BIqCZYmZJqq53fJCwLPgvKSDbRaQiGQnrSeX3MoWS5gxIh1tuKUO3haEu2LGCAbmE2TqSg7iQ7zkTGgcySc2tvI';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export const initSocket = (userId) => {
  if (!socket) {
    console.log('🔄 Inicializando socket en puerto 5000');
    socket = io(import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000');
    
    socket.on('connect', () => {
      console.log('✅ Socket conectado, ID:', socket.id);
      const userIdToSend = pendingUserId || userId;
      if (userIdToSend) {
        socket.emit('register-user', userIdToSend);
        pendingUserId = null;
      }
      
      // Intentar suscripción Push en segundo plano
      subscribeToPushNotifications();
    });
    
    socket.on('connect_error', (error) => {
      console.error('❌ Error de conexión:', error);
    });
    
    socket.on('disconnect', () => {
      console.log('🔌 Socket desconectado');
    });
  } else if (userId && socket.connected) {
    socket.emit('register-user', userId);
  } else if (userId) {
    pendingUserId = userId;
  }
  
  return socket;
};

// Función para suscribirse a notificaciones push reales (segundo plano)
export const subscribeToPushNotifications = async () => {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('⚠️ Notificaciones push no soportadas');
    return;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();
    
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      });
      console.log('✅ Nueva suscripción push creada');
    }

    // Enviar suscripción al servidor
    await api.post('/auth/push-subscribe', { subscription });
    console.log('📡 Push sincronizado');

  } catch (error) {
    console.log('ℹ️ Suscripción push pendiente de permisos');
  }
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const requestNotificationPermission = async () => {
  if (!('Notification' in window)) return false;
  
  if (Notification.permission === 'granted') return true;
  
  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      subscribeToPushNotifications();
    }
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
