// client/src/shared/services/supplierService.js
import api from './api';

export const getSuppliers = async () => {
  const { data } = await api.get('/suppliers');
  return data;
};

export const createSupplier = async (supplierData) => {
  const { data } = await api.post('/suppliers', supplierData);
  return data;
};

export const updateSupplier = async (id, supplierData) => {
  const { data } = await api.put(`/suppliers/${id}`, supplierData);
  return data;
};

export const deleteSupplier = async (id) => {
  const { data } = await api.delete(`/suppliers/${id}`);
  return data;
};
