// client/src/pages/Profile.jsx
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import MainHeader from '../../core/components/Layout/MainHeader';
import Button from '../../core/components/UI/Button';
import Card from '../../core/components/UI/Card';
import Input from '../../core/components/UI/Input';
import api from '../../../shared/services/api';

export default function Profile() {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: user?.name || '',
    phone: '',
    address: '',
    city: '',
    zipCode: ''
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const { data } = await api.get('/auth/profile');
      setFormData({
        name: data.name || '',
        phone: data.shippingAddress?.phone || '',
        address: data.shippingAddress?.address || '',
        city: data.shippingAddress?.city || '',
        zipCode: data.shippingAddress?.zipCode || ''
      });
    } catch (error) {
      console.error('Error cargando perfil:', error);
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    
    try {
      await api.put('/auth/profile', {
        name: formData.name,
        shippingAddress: {
          phone: formData.phone,
          address: formData.address,
          city: formData.city,
          zipCode: formData.zipCode
        }
      });
      setMessage('✅ Perfil actualizado correctamente');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError('Error al actualizar perfil');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }
    
    setLoading(true);
    setError('');
    setMessage('');
    
    try {
      await api.put('/auth/change-password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      setMessage('✅ Contraseña actualizada correctamente');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError('Contraseña actual incorrecta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <MainHeader />
      <div className="pt-20 min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center mb-8 animate-slide-up">
            <h1 className="text-3xl font-bold text-gray-900">👤 Mi Perfil</h1>
            <p className="text-gray-500 mt-2">Administra tu información personal</p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
            {/* Datos personales */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <span>📝</span> Información personal
              </h2>
              
              {message && (
                <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-xl border border-green-200">
                  {message}
                </div>
              )}
              {error && (
                <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-xl border border-red-200">
                  {error}
                </div>
              )}
              
              <form onSubmit={handleProfileUpdate} className="space-y-4">
                <Input
                  label="Nombre"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  icon="👤"
                />
                
                <Input
                  label="Teléfono"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  icon="📞"
                />
                
                <Input
                  label="Dirección"
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  icon="📍"
                />
                
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Ciudad"
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    icon="🏙️"
                  />
                  <Input
                    label="Código postal"
                    type="text"
                    value={formData.zipCode}
                    onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
                    icon="📮"
                  />
                </div>
                
                <Button type="submit" variant="primary" loading={loading} className="w-full">
                  Guardar cambios
                </Button>
              </form>
            </Card>
            
            {/* Cambiar contraseña */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <span>🔒</span> Cambiar contraseña
              </h2>
              
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <Input
                  label="Contraseña actual"
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                  required
                  icon="🔐"
                />
                
                <Input
                  label="Nueva contraseña"
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  required
                  minLength="6"
                  helper="Mínimo 6 caracteres"
                  icon="🔒"
                />
                
                <Input
                  label="Confirmar nueva contraseña"
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  required
                  icon="✓"
                />
                
                <Button type="submit" variant="primary" loading={loading} className="w-full">
                  Cambiar contraseña
                </Button>
              </form>
            </Card>
          </div>
          
          <div className="text-center mt-6">
            <Link to="/mis-pedidos" className="text-primary-600 hover:text-primary-700 font-medium inline-flex items-center gap-1">
              Ver mis pedidos
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}