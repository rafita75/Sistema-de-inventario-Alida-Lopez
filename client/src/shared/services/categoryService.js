// client/src/services/categoryService.js
import api from './api';

// Obtener todas las categorías
export const getCategories = async () => {
  const { data } = await api.get('/categories');
  return data;
};

// Crear categoría
export const createCategory = async (categoryData) => {
  const { data } = await api.post('/categories', categoryData);
  return data;
};

// Actualizar categoría
export const updateCategory = async (id, categoryData) => {
  const { data } = await api.put(`/categories/${id}`, categoryData);
  return data;
};

// Eliminar categoría
export const deleteCategory = async (id) => {
  const { data } = await api.delete(`/categories/${id}`);
  return data;
};