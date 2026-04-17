// client/src/shared/services/brandService.js
import api from './api';

export const getBrands = async () => {
  const { data } = await api.get('/brands');
  return data;
};

export const createBrand = async (brandData) => {
  const { data } = await api.post('/brands', brandData);
  return data;
};

export const updateBrand = async (id, brandData) => {
  const { data } = await api.put(`/brands/${id}`, brandData);
  return data;
};

export const deleteBrand = async (id) => {
  const { data } = await api.delete(`/brands/${id}`);
  return data;
};
