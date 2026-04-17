// client/src/modules/core/components/Layout/MainHeader.jsx
import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../login/contexts/AuthContext';
import Button from '../UI/Button';

export default function MainHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Detectar scroll para cambiar estilo del header
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      scrolled 
        ? 'bg-white/95 backdrop-blur-md shadow-soft py-2' 
        : 'bg-white/90 backdrop-blur-sm shadow-sm py-3'
    }`}>
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center">
          {/* Logo */}
          <Link 
            to={user ? "/admin" : "/login"} 
            className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent hover:opacity-80 transition"
          >
            GestiónPro
          </Link>
          
          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-6">
            {user && (
              <>
                <Link 
                  to="/admin" 
                  className={`text-sm font-medium transition ${location.pathname === '/admin' ? 'text-primary-600' : 'text-gray-600 hover:text-primary-600'}`}
                >
                  Dashboard
                </Link>
                <Link 
                  to="/inventario" 
                  className={`text-sm font-medium transition ${location.pathname === '/inventario' ? 'text-primary-600' : 'text-gray-600 hover:text-primary-600'}`}
                >
                  Inventario
                </Link>
                <Link 
                  to="/pos" 
                  className={`text-sm font-medium transition ${location.pathname === '/pos' ? 'text-primary-600' : 'text-gray-600 hover:text-primary-600'}`}
                >
                  Punto de Venta
                </Link>
                {user.role === 'admin' && (
                  <Link 
                    to="/contabilidad" 
                    className={`text-sm font-medium transition ${location.pathname === '/contabilidad' ? 'text-primary-600' : 'text-gray-600 hover:text-primary-600'}`}
                  >
                    Contabilidad
                  </Link>
                )}
              </>
            )}
          </nav>
          
          {/* Acciones derecha */}
          <div className="flex items-center gap-3">
            {/* Usuario logueado */}
            {user ? (
              <div className="hidden sm:flex items-center gap-3">
                <Link 
                  to="/perfil" 
                  className="flex items-center gap-2 hover:opacity-80 transition"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-primary-500 to-secondary-500 flex items-center justify-center text-white text-sm font-bold">
                    {user.name?.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm font-medium text-gray-700 hidden md:inline">
                    {user.name?.split(' ')[0]}
                  </span>
                </Link>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={handleLogout}
                >
                  Salir
                </Button>
              </div>
            ) : (
              <div className="hidden sm:flex gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => navigate('/login')}
                >
                  Iniciar Sesión
                </Button>
              </div>
            )}
            
            {/* Botón menú móvil */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 text-gray-600 hover:text-primary-600 transition"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
        
        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <nav className="lg:hidden mt-4 pt-4 border-t border-gray-100 flex flex-col gap-2 animate-fade-in">
            {user ? (
              <>
                <Link
                  to="/admin"
                  className="text-gray-600 hover:text-primary-600 transition py-2 font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Dashboard
                </Link>
                <Link
                  to="/inventario"
                  className="text-gray-600 hover:text-primary-600 transition py-2 font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Inventario
                </Link>
                <Link
                  to="/pos"
                  className="text-gray-600 hover:text-primary-600 transition py-2 font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Punto de Venta
                </Link>
                {user.role === 'admin' && (
                  <Link
                    to="/contabilidad"
                    className="text-gray-600 hover:text-primary-600 transition py-2 font-medium"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Contabilidad
                  </Link>
                )}
                <Link
                  to="/perfil"
                  className="text-gray-600 hover:text-primary-600 transition py-2 font-medium"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Perfil
                </Link>
                <div className="pt-2 border-t border-gray-100 mt-2">
                  <Button
                    variant="danger"
                    onClick={handleLogout}
                    className="w-full"
                  >
                    Cerrar Sesión
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex flex-col gap-2 pt-2 border-t border-gray-100 mt-2">
                <Button
                  variant="primary"
                  onClick={() => {
                    navigate('/login');
                    setMobileMenuOpen(false);
                  }}
                  className="w-full"
                >
                  Iniciar Sesión
                </Button>
              </div>
            )}
          </nav>
        )}
      </div>
    </header>
  );
}
