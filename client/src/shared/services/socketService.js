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
    const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
    console.log('🔄 Conectando socket a:', SOCKET_URL);
    
    socket = io(SOCKET_URL, {
      withCredentials: true,
      transports: ['websocket', 'polling'], // Forzar transportes compatibles
      reconnectionAttempts: 5
    });
    
    socket.on('connect', () => {
      console.log('✅ Socket conectado, ID:', socket.id);
      const id = userId || pendingUserId;
      if (id) {
        socket.emit('register-user', id);
        pendingUserId = null;
      }
      subscribeToPushNotifications();
    });
    
    socket.on('connect_error', (error) => {
      console.error('❌ Error de conexión Socket:', error.message);
    });
  } else if (userId) {
    if (socket.connected) {
      socket.emit('register-user', userId);
    } else {
      pendingUserId = userId;
    }
  }
  
  return socket;
};

export const subscribeToPushNotifications = async () => {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

  try {
    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();
    
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      });
    }

    await api.post('/auth/push-subscribe', { subscription });
    console.log('📡 Push Web OK');
  } catch (error) {
    console.log('ℹ️ Push requiere interacción del usuario');
  }
};

export const getSocket = () => socket;

export const requestNotificationPermission = async () => {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  
  const permission = await Notification.requestPermission();
  if (permission === 'granted') subscribeToPushNotifications();
  return permission === 'granted';
};

export const showNotification = (title, options) => {
  // Notificación nativa del navegador (si la pestaña está abierta)
  if (Notification.permission === 'granted' && document.visibilityState !== 'visible') {
    const notification = new Notification(title, options);
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  }
};
