// client/src/modules/login/contexts/AuthContext.jsx
import { createContext, useContext, useState, useEffect } from 'react';
import api from '../../../shared/services/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState(null);

  useEffect(() => {
    const verifyToken = async () => {
      const token = localStorage.getItem('token');
      
      if (!token) {
        setLoading(false);
        return;
      }
      
      try {
        const { data } = await api.get('/auth/verify');
        setUser(data.user);
        setPermissions(data.user.permissions);
      } catch (error) {
        console.error('Token inválido:', error);
        localStorage.removeItem('token');
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    
    verifyToken();
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('token', data.token);
    setUser(data.user);
    setPermissions(data.user.permissions);
    return data;
  };

  const register = async (name, email, password) => {
    const { data } = await api.post('/auth/register', { name, email, password });
    localStorage.setItem('token', data.token);
    setUser(data.user);
    setPermissions(data.user.permissions);
    return data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setPermissions(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, permissions }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
