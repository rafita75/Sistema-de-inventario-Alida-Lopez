// client/src/shared/contexts/NotificationContext.jsx
import React, { createContext, useContext, useState, useCallback } from 'react';

const NotificationContext = createContext();

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);

  const notify = useCallback((message, type = 'info', duration = 5000) => {
    const id = Date.now();
    setNotifications(prev => [...prev, { id, message, type }]);

    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, duration);
  }, []);

  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  return (
    <NotificationContext.Provider value={{ notify }}>
      {children}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 w-full max-w-sm pointer-events-none">
        {notifications.map(n => (
          <div
            key={n.id}
            className={`pointer-events-auto p-4 rounded-2xl shadow-2xl border flex items-center justify-between gap-3 animate-slide-in-right ${
              n.type === 'error' ? 'bg-red-50 border-red-100 text-red-700' :
              n.type === 'success' ? 'bg-green-50 border-green-100 text-green-700' :
              n.type === 'warning' ? 'bg-yellow-50 border-yellow-100 text-yellow-700' :
              'bg-white border-gray-100 text-gray-700'
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">
                {n.type === 'error' ? '❌' : 
                 n.type === 'success' ? '✅' : 
                 n.type === 'warning' ? '⚠️' : 'ℹ️'}
              </span>
              <p className="text-sm font-bold">{n.message}</p>
            </div>
            <button 
              onClick={() => removeNotification(n.id)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
}
