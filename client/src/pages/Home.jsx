// client/src/pages/Home.jsx
import { useState, useEffect } from 'react';
import { useAuth } from '../modules/login/contexts/AuthContext';
import { Link } from 'react-router-dom';
import MainHeader from '../modules/core/components/Layout/MainHeader';
import Card from '../modules/core/components/UI/Card';
import Button from '../modules/core/components/UI/Button';
import api from '../shared/services/api';

export default function Home() {
  const { user, logout } = useAuth();
  const [recentOrders, setRecentOrders] = useState([]);
  const [recentBookings, setRecentBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [ordersRes, bookingsRes] = await Promise.all([
        api.get('/orders/my-orders'),
        api.get('/appointments/my').catch(() => ({ data: [] }))
      ]);
      setRecentOrders(ordersRes.data.slice(0, 5));
      setRecentBookings(bookingsRes.data?.slice(0, 5) || []);
    } catch (error) {
      console.error('Error cargando dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    window.location.href = '/';
  };

  const statusLabels = {
    pending: 'Pendiente',
    paid: 'Pagado',
    processing: 'Procesando',
    shipped: 'Enviado',
    delivered: 'Entregado',
    cancelled: 'Cancelado'
  };

  const statusColors = {
    pending: 'badge-warning',
    paid: 'badge-success',
    processing: 'badge-info',
    shipped: 'badge-info',
    delivered: 'badge-success',
    cancelled: 'badge-danger'
  };

  const bookingStatusLabels = {
    pending: 'Pendiente',
    confirmed: 'Confirmada',
    cancelled: 'Cancelada',
    completed: 'Completada'
  };

  const bookingStatusColors = {
    pending: 'badge-warning',
    confirmed: 'badge-success',
    cancelled: 'badge-danger',
    completed: 'badge-neutral'
  };

  return (
    <>
      <MainHeader />
      
      <div className="pt-20 min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="container mx-auto px-4 py-8">
          {/* Bienvenida */}
          <div className="mb-8 animate-slide-up">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
              ¡Bienvenido de vuelta, <span className="text-primary-600">{user?.name}</span>!
            </h1>
            <p className="text-gray-500 mt-2">Aquí tienes un resumen de tu actividad reciente</p>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Sidebar - Perfil */}
            <div className="lg:col-span-1 space-y-6">
              <Card className="overflow-hidden">
                <div className="relative h-24 bg-gradient-to-r from-primary-500 to-secondary-500"></div>
                <Card.Body className="text-center -mt-12">
                  <div className="w-24 h-24 bg-white rounded-2xl shadow-medium flex items-center justify-center text-4xl mx-auto mb-3 border-4 border-white">
                    {user?.name?.charAt(0).toUpperCase() || '👤'}
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900">{user?.name}</h2>
                  <p className="text-gray-500 text-sm mt-1">{user?.email}</p>
                  
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="grid grid-cols-2 gap-3 text-center">
                      <div>
                        <p className="text-2xl font-bold text-primary-600">{recentOrders.length}</p>
                        <p className="text-xs text-gray-500">Pedidos</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-secondary-600">{recentBookings.length}</p>
                        <p className="text-xs text-gray-500">Reservas</p>
                      </div>
                    </div>
                  </div>
                </Card.Body>
                <Card.Footer className="flex flex-col gap-2">
                  <Link to="/mis-pedidos" className="w-full">
                    <Button variant="outline" className="w-full">
                      📦 Mis pedidos
                    </Button>
                  </Link>
                  <Link to="/mis-reservas" className="w-full">
                    <Button variant="outline" className="w-full">
                      📅 Mis reservas
                    </Button>
                  </Link>
                  <Link to="/perfil" className="w-full">
                    <Button variant="ghost" className="w-full">
                      ⚙️ Editar perfil
                    </Button>
                  </Link>
                  <Button variant="danger" onClick={handleLogout} className="w-full">
                    🚪 Cerrar Sesión
                  </Button>
                </Card.Footer>
              </Card>

              {/* Acciones rápidas */}
              <Card>
                <Card.Header>
                  <h3 className="font-semibold text-gray-900">⚡ Acciones rápidas</h3>
                </Card.Header>
                <Card.Body className="grid grid-cols-2 gap-3">
                  <Link to="/catalogo">
                    <div className="p-4 bg-primary-50 rounded-xl text-center hover:bg-primary-100 transition">
                      <div className="text-2xl mb-1">🛍️</div>
                      <p className="text-sm font-medium text-primary-700">Comprar</p>
                    </div>
                  </Link>
                  <Link to="/servicios">
                    <div className="p-4 bg-secondary-50 rounded-xl text-center hover:bg-secondary-100 transition">
                      <div className="text-2xl mb-1">📅</div>
                      <p className="text-sm font-medium text-secondary-700">Reservar</p>
                    </div>
                  </Link>
                </Card.Body>
              </Card>
            </div>
            
            {/* Main content - Actividad reciente */}
            <div className="lg:col-span-2 space-y-6">
              {/* Pedidos recientes */}
              <Card>
                <Card.Header className="flex justify-between items-center">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">📦 Pedidos recientes</h2>
                    <p className="text-sm text-gray-500">Tus últimas compras</p>
                  </div>
                  <Link to="/mis-pedidos" className="text-primary-600 hover:text-primary-700 text-sm font-medium">
                    Ver todos →
                  </Link>
                </Card.Header>
                <Card.Body>
                  {loading ? (
                    <div className="flex justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                    </div>
                  ) : recentOrders.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="text-6xl mb-3">🛒</div>
                      <p className="text-gray-500 mb-4">No tienes pedidos aún</p>
                      <Link to="/catalogo">
                        <Button variant="primary">Comenzar a comprar</Button>
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {recentOrders.map((order) => (
                        <Link
                          key={order._id}
                          to={`/pedido/seguimiento/${order.orderNumber}`}
                          className="block p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition group"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex-1">
                              <p className="font-mono text-sm font-semibold text-gray-700">
                                {order.orderNumber}
                              </p>
                              <p className="text-xs text-gray-400">
                                {new Date(order.createdAt).toLocaleDateString('es-ES', {
                                  day: 'numeric',
                                  month: 'long',
                                  year: 'numeric'
                                })}
                              </p>
                            </div>
                            <div>
                              <span className={`badge ${statusColors[order.status]}`}>
                                {statusLabels[order.status]}
                              </span>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold text-primary-600">
                                ${order.total.toLocaleString()}
                              </p>
                              <p className="text-xs text-gray-400">{order.items.length} productos</p>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </Card.Body>
              </Card>

              {/* Reservas recientes */}
              {recentBookings.length > 0 && (
                <Card>
                  <Card.Header className="flex justify-between items-center">
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900">📅 Reservas recientes</h2>
                      <p className="text-sm text-gray-500">Tus próximas citas</p>
                    </div>
                    <Link to="/mis-reservas" className="text-primary-600 hover:text-primary-700 text-sm font-medium">
                      Ver todas →
                    </Link>
                  </Card.Header>
                  <Card.Body>
                    <div className="space-y-3">
                      {recentBookings.map((booking) => (
                        <div
                          key={booking._id}
                          className="p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex-1">
                              <p className="font-medium text-gray-900">
                                {booking.serviceId?.name || 'Servicio'}
                              </p>
                              <p className="text-sm text-gray-500">
                                {new Date(booking.fecha).toLocaleDateString('es-ES', {
                                  day: 'numeric',
                                  month: 'long'
                                })} - {booking.hora}
                              </p>
                              <p className="text-xs text-gray-400">
                                Profesional: {booking.professionalId?.name || 'Cualquiera'}
                              </p>
                            </div>
                            <div>
                              <span className={`badge ${bookingStatusColors[booking.estado]}`}>
                                {bookingStatusLabels[booking.estado]}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card.Body>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}