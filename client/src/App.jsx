// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './modules/login/contexts/AuthContext';

import { initSocket, requestNotificationPermission, showNotification } from './shared/services/socketService';
import { useEffect } from 'react';

// Core
import Login from './modules/login/pages/Login';
import Register from './modules/login/pages/Register';
import Home from './pages/Home';
import MobileScanner from './modules/pos/pages/MobileScanner';

// Admin & Gestión
import AdminDashboard from './modules/admin/pages/AdminDashboard';
import POSDashboard from './modules/pos/pages/POSDashboard';
import InventoryManager from './modules/inventory/pages/InventoryManager';
import AccountingDashboard from './modules/accounting/pages/AccountingDashboard';
import Profile from './modules/login/pages/Profile';
import AuditLogs from './modules/admin/pages/AuditLogs';

// ============================================
// CONSTANTES
// ============================================

const ROLES = {
  ADMIN: 'admin',
  EMPLOYEE: 'employee',
  USER: 'user'
};

// ============================================
// COMPONENTE DE RUTA PROTEGIDA
// ============================================
function ProtectedRoute({ children, allowedRoles, redirectTo = '/login' }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Cargando...</div>;
  }
  
  if (!user) {
    return <Navigate to={redirectTo} replace />;
  }
  
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={redirectTo} replace />;
  }
  
  return children;
}

// ============================================
// COMPONENTE DE RUTA PÚBLICA
// ============================================
function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Cargando...</div>;
  }
  
  if (user) {
    return <Navigate to="/admin" replace />;
  }
  
  return children;
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================
function App() {
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (user && (user.role === 'admin' || user.role === 'employee')) {
      const userId = String(user.id || user._id);
      const socket = initSocket(userId);
      requestNotificationPermission();
      
      if (socket) {
        socket.on('new-notification', (notification) => {
          showNotification(notification.title, {
            body: notification.body,
            icon: '/favicon.svg',
            data: notification.data
          });
        });
      }
    }
  }, [user]);

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center">Cargando...</div>;
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Rutas públicas */}
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
        
        {/* Escáner Móvil - Protegido */}
        <Route 
          path="/scanner" 
          element={
            <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.EMPLOYEE]} redirectTo="/login">
              <MobileScanner />
            </ProtectedRoute>
          } 
        />
        
        {/* Redirección raíz */}
        <Route path="/" element={<Navigate to="/admin" replace />} />
        
        {/* Home / Dashboard General */}
        <Route path="/home" element={<ProtectedRoute><Home /></ProtectedRoute>} />

        {/* POS */}
        <Route 
          path="/pos" 
          element={
            <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.EMPLOYEE]} redirectTo="/login">
              <POSDashboard />
            </ProtectedRoute>
          } 
        />

        {/* Inventario */}
        <Route 
          path="/inventario" 
          element={
            <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.EMPLOYEE]} redirectTo="/login">
              <InventoryManager />
            </ProtectedRoute>
          } 
        />

        {/* Contabilidad - solo admin */}
        <Route 
          path="/contabilidad" 
          element={
            <ProtectedRoute allowedRoles={[ROLES.ADMIN]} redirectTo="/login">
              <AccountingDashboard />
            </ProtectedRoute>
          } 
        />

        {/* Auditoría - solo admin */}
        <Route 
          path="/admin/auditoria" 
          element={
            <ProtectedRoute allowedRoles={[ROLES.ADMIN]} redirectTo="/login">
              <AuditLogs />
            </ProtectedRoute>
          } 
        />

        {/* Perfil */}
        <Route 
          path="/perfil" 
          element={
            <ProtectedRoute redirectTo="/login">
              <Profile />
            </ProtectedRoute>
          } 
        />

        {/* Admin Dashboard - principal */}
        <Route 
          path="/admin" 
          element={
            <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.EMPLOYEE]} redirectTo="/login">
              <AdminDashboard />
            </ProtectedRoute>
          } 
        />

        {/* 404 */}
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
