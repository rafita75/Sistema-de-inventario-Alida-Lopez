// client/src/modules/login/pages/Login.jsx
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import Button from '../../../modules/core/components/UI/Button';
import Input from '../../../modules/core/components/UI/Input';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await login(email.trim(), password.trim());

      // 🔥 usa data directamente
      if (data.user) {
        navigate(data.user.role === 'admin' || data.user.role === 'employee' ? '/admin' : '/home');
      }

    } catch (err) {
      console.error("ERROR LOGIN:", err.response?.data);
      setError(err.response?.data?.error || 'Credenciales incorrectas');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md animate-fade-in border border-gray-100">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-r from-green-600 to-green-700 rounded-2xl flex items-center justify-center mx-auto shadow-md">
            <span className="text-white text-2xl font-bold">A&C</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mt-4">Librería A&C</h1>
          <p className="text-gray-500 text-sm mt-1">Sistema de Administración</p>
        </div>
        
        {error && (
          <div className="mb-6 p-3 bg-red-50 text-red-700 rounded-xl border border-red-200 text-center text-sm">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            label="Correo electrónico"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin@libreria.com"
            required
            icon="✉️"
          />
          
          <Input
            label="Contraseña"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            icon="🔒"
          />
          
          <Button
            type="submit"
            variant="primary"
            loading={loading}
            className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800"
            size="lg"
          >
            Iniciar Sesión
          </Button>
        </form>
        
        <div className="mt-6 text-center text-xs text-gray-400">
          <p>© 2026 Librería A&C - Todos los derechos reservados</p>
        </div>
      </div>
    </div>
  );
}
