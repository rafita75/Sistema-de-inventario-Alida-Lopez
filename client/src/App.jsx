// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './modules/login/contexts/AuthContext';

import { initSocket, requestNotificationPermission, showNotification } from './shared/services/socketService';
import { useEffect, lazy, Suspense } from 'react';

// Core
const Login = lazy(() => import('./modules/login/pages/Login'));
const Register = lazy(() => import('./modules/login/pages/Register'));
const Home = lazy(() => import('./pages/Home'));
const MobileScanner = lazy(() => import('./modules/pos/pages/MobileScanner'));

// Admin & Gestión
const AdminDashboard = lazy(() => import('./modules/admin/pages/AdminDashboard'));
const POSDashboard = lazy(() => import('./modules/pos/pages/POSDashboard'));
const InventoryManager = lazy(() => import('./modules/inventory/pages/InventoryManager'));
const AccountingDashboard = lazy(() => import('./modules/accounting/pages/AccountingDashboard'));
const Profile = lazy(() => import('./modules/login/pages/Profile'));
const AuditLogs = lazy(() => import('./modules/admin/pages/AuditLogs'));

// ============================================
// CONSTANTES
// ============================================

const ROLES = {
  ADMIN: 'admin',
  EMPLOYEE: 'employee',
  SUPERADMIN: 'superadmin',
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
    // Si es gestión (admin/empleado), mandar al dashboard administrativo
    if (user.role === 'admin' || user.role === 'employee' || user.role === 'superadmin') {
      return <Navigate to="/admin" replace />;
    }
    // Si es cliente/usuario normal, mandar a home
    return <Navigate to="/home" replace />;
  }
  
  return children;
}

// ============================================
// COMPONENTE DE REDIRECCIÓN RAÍZ
// ============================================
function RootRedirect() {
  const { user } = useAuth();
  
  if (!user) return <Navigate to="/login" replace />;
  
  if (user.role === 'admin' || user.role === 'employee' || user.role === 'superadmin') {
    return <Navigate to="/admin" replace />;
  }
  
  return <Navigate to="/home" replace />;
}

function RouteLoader() {
  return <div className="min-h-screen flex items-center justify-center">Cargando...</div>;
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================
function App() {
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (user && (user.role === ROLES.ADMIN || user.role === ROLES.EMPLOYEE || user.role === ROLES.SUPERADMIN)) {
      const socket = initSocket();
      requestNotificationPermission();
      
      if (socket) {
        const handleNotification = (notification) => {
          showNotification(notification.title, {
            body: notification.body,
            icon: '/favicon.svg',
            data: notification.data
          });
        };

        socket.on('new-notification', handleNotification);
        return () => socket.off('new-notification', handleNotification);
      }
    }
  }, [user]);

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center">Cargando...</div>;
  }

  return (
    <BrowserRouter>
      <Suspense fallback={<RouteLoader />}>
      <Routes>
        {/* Rutas públicas */}
        <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
        
        {/* Escáner Móvil - Protegido */}
        <Route 
          path="/scanner" 
          element={
            <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.EMPLOYEE, ROLES.SUPERADMIN]} redirectTo="/login">
              <MobileScanner />
            </ProtectedRoute>
          } 
        />
        
        {/* Redirección raíz inteligente */}
        <Route path="/" element={<RootRedirect />} />
        
        {/* Home / Dashboard General */}
        <Route path="/home" element={<ProtectedRoute redirectTo="/login"><Home /></ProtectedRoute>} />

        {/* POS */}
        <Route 
          path="/pos" 
          element={
            <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.EMPLOYEE, ROLES.SUPERADMIN]} redirectTo="/login">
              <POSDashboard />
            </ProtectedRoute>
          } 
        />

        {/* Inventario */}
        <Route 
          path="/inventario" 
          element={
            <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.EMPLOYEE, ROLES.SUPERADMIN]} redirectTo="/login">
              <InventoryManager />
            </ProtectedRoute>
          } 
        />

        {/* Contabilidad - solo admin */}
        <Route 
          path="/contabilidad" 
          element={
            <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.SUPERADMIN]} redirectTo="/login">
              <AccountingDashboard />
            </ProtectedRoute>
          } 
        />

        {/* Auditoría - solo admin */}
        <Route 
          path="/admin/auditoria" 
          element={
            <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.SUPERADMIN]} redirectTo="/login">
              <AuditLogs />
            </ProtectedRoute>
          } 
        />

        {/* Perfil */}
        <Route 
          path="/profile" 
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
            <ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.EMPLOYEE, ROLES.SUPERADMIN]} redirectTo="/login">
              <AdminDashboard />
            </ProtectedRoute>
          } 
        />

        {/* 404 */}
        <Route path="*" element={<RootRedirect />} />
      </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
