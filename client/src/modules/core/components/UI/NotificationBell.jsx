// client/src/core/components/UI/NotificationBell.jsx
import { useState, useEffect } from 'react';
import { getSocket } from '../../../shared/services/socketService';

export default function NotificationBell() {
  const [notifications, setNotifications] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const socket = getSocket();
    if (socket) {
      socket.on('new-notification', (notification) => {
        setNotifications(prev => [notification, ...prev]);
        setUnreadCount(prev => prev + 1);
        
        // Reproducir sonido (opcional)
        const audio = new Audio('/notification.mp3');
        audio.play().catch(() => console.log('Sonido no disponible'));
      });
    }
    
    return () => {
      if (socket) {
        socket.off('new-notification');
      }
    };
  }, []);

  const markAsRead = () => {
    setUnreadCount(0);
  };

  const clearNotifications = () => {
    setNotifications([]);
    setUnreadCount(0);
    setShowDropdown(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => {
          setShowDropdown(!showDropdown);
          if (showDropdown) markAsRead();
        }}
        className="relative p-2 text-gray-600 hover:text-gray-900 transition"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
            {unreadCount}
          </span>
        )}
      </button>
      
      {showDropdown && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setShowDropdown(false)}></div>
          <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg z-50 overflow-hidden">
            <div className="p-3 border-b bg-gray-50 flex justify-between items-center">
              <span className="font-semibold text-gray-900">Notificaciones</span>
              <button onClick={clearNotifications} className="text-xs text-gray-500 hover:text-gray-700">
                Limpiar todo
              </button>
            </div>
            <div className="max-h-96 overflow-auto">
              {notifications.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  <div className="text-2xl mb-1">🔔</div>
                  <p className="text-sm">No hay notificaciones</p>
                </div>
              ) : (
                notifications.map((notif, idx) => (
                  <div key={idx} className="p-3 border-b hover:bg-gray-50 cursor-pointer transition">
                    <div className="flex items-start gap-3">
                      <div className="text-xl">
                        {notif.type === 'sale' ? '💰' : '📦'}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 text-sm">{notif.title}</p>
                        <p className="text-xs text-gray-500">{notif.body}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(notif.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
