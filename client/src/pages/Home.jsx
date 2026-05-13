// client/src/pages/Home.jsx
import { useAuth } from '../modules/login/contexts/AuthContext';
import { Link } from 'react-router-dom';
import MainHeader from '../modules/core/components/Layout/MainHeader';
import Card from '../modules/core/components/UI/Card';
import Button from '../modules/core/components/UI/Button';

export default function Home() {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <MainHeader />
      
      <main className="flex-grow container mx-auto px-4 py-12 max-w-4xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-extrabold text-gray-900 mb-4 tracking-tight">
            ¡Bienvenido, <span className="text-green-600">{user?.name}</span>! 👋
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Sistema de Gestión Empresarial - Librería A&C
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Panel de Control - Acceso según rol */}
          <Card className="p-8 border-none shadow-xl bg-white rounded-3xl hover:scale-[1.02] transition-transform duration-300">
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-green-100 rounded-2xl flex items-center justify-center text-4xl mb-6 shadow-inner">
                🏠
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-3">Panel de Gestión</h3>
              <p className="text-gray-500 mb-8 leading-relaxed">
                Accede a las herramientas de inventario, POS y contabilidad según tus permisos.
              </p>
              
              {user?.role === 'admin' || user?.role === 'employee' || user?.role === 'superadmin' ? (
                <Link to="/admin" className="w-full">
                  <Button className="w-full bg-green-600 hover:bg-green-700 text-lg py-6 rounded-2xl shadow-lg shadow-green-200">
                    Ir al Dashboard
                  </Button>
                </Link>
              ) : (
                <div className="p-4 bg-yellow-50 rounded-2xl text-yellow-700 text-sm border border-yellow-100 italic">
                  No tienes permisos de gestión. Contacta al administrador para habilitar tu acceso.
                </div>
              )}
            </div>
          </Card>

          {/* Perfil de Usuario */}
          <Card className="p-8 border-none shadow-xl bg-white rounded-3xl hover:scale-[1.02] transition-transform duration-300">
            <div className="flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-blue-100 rounded-2xl flex items-center justify-center text-4xl mb-6 shadow-inner">
                👤
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-3">Mi Perfil</h3>
              <p className="text-gray-500 mb-8 leading-relaxed">
                Gestiona tu información personal, cambia tu contraseña y revisa tus datos.
              </p>
              <Link to="/profile" className="w-full">
                <Button variant="outline" className="w-full border-2 border-blue-600 text-blue-600 hover:bg-blue-50 text-lg py-6 rounded-2xl">
                  Ver mi Perfil
                </Button>
              </Link>
            </div>
          </Card>
        </div>

        {/* Footer Info */}
        <div className="mt-16 text-center">
          <button 
            onClick={handleLogout}
            className="text-gray-400 hover:text-red-500 transition-colors flex items-center gap-2 mx-auto font-medium"
          >
            🚪 Cerrar sesión de forma segura
          </button>
          <p className="text-xs text-gray-400 mt-8">
            © {new Date().getFullYear()} Librería A&C. Sistema de Gestión Interna v2.0
          </p>
        </div>
      </main>
    </div>
  );
}
