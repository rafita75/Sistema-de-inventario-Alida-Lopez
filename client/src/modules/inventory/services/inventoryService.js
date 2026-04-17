// client/src/modules/inventory/services/inventoryService.js
import api from '../../../shared/services/api';

export const getInventorySummary = async () => {
  const { data } = await api.get('/inventory/summary');
  return data;
};

export const getLowStockProducts = async () => {
  const { data } = await api.get('/inventory/low-stock');
  return data;
};

export const getLowStockVariants = async () => {
  const { data } = await api.get('/inventory/low-stock-variants');
  return data;
};

export const getStockMovements = async (params = {}) => {
  const { data } = await api.get('/inventory/movements', { params });
  return data;
};

export const getFilteredMovements = async (filters) => {
  const { data } = await api.get('/inventory/movements/filtered', { params: filters });
  return data;
};

export const getSales = async (params = {}) => {
  const { data } = await api.get('/inventory/sales', { params });
  return data;
};

export const getMovementStats = async (days = 7) => {
  const { data } = await api.get('/inventory/stats/movements', { params: { days } });
  return data;
};

export const adjustStock = async (productId, quantity, reason, purchasePrice = 0) => {
  const { data } = await api.put(`/inventory/products/${productId}/stock`, {
    quantity,
    reason,
    purchasePrice,
    type: 'adjustment'  // 👈 Asegurar que es string, no número
  });
  return data;
};

export const adjustVariantStock = async (productId, variantId, quantity, reason, purchasePrice = 0) => {
  const { data } = await api.put(`/inventory/variants/${productId}/${variantId}/stock`, {
    quantity,
    reason,
    purchasePrice,
    type: 'adjustment'  // 👈 Asegurar que es string
  });
  return data;
};

export const updateMinStock = async (productId, minStock) => {
  const { data } = await api.put(`/inventory/products/${productId}/min-stock`, { minStock });
  return data;
};