// client/src/shared/services/productService.js
import api from './api';

// Obtener productos (ahora unificado con paginación y filtros)
export const getAdminProducts = async (params = {}) => {
  const { data } = await api.get('/products', { params });
  return data;
};

// Alias para compatibilidad o uso general
export const getProducts = getAdminProducts;

// Obtener producto por slug
export const getProductBySlug = async (slug) => {
  const { data } = await api.get(`/products/${slug}`);
  return data;
};

// Crear producto
export const createProduct = async (productData) => {
  const { data } = await api.post('/products', productData);
  return data;
};

// Actualizar producto
export const updateProduct = async (id, productData) => {
  const { data } = await api.put(`/products/${id}`, productData);
  return data;
};

// Deshabilitar producto sin borrar historial
export const disableProduct = async (id) => {
  const { data } = await api.patch(`/products/${id}/disable`);
  return data;
};

// Re-habilitar producto
export const enableProduct = async (id) => {
  const { data } = await api.patch(`/products/${id}/enable`);
  return data;
};

// Eliminar producto
export const deleteProduct = async (id) => {
  const { data } = await api.delete(`/products/${id}`);
  return data;
};
