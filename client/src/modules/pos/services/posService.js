// client/src/modules/pos/services/posService.js
import api from '../../../shared/services/api';

export const searchProducts = async (query, limit = 20) => {
  const { data } = await api.get('/pos/products/search', { params: { q: query, limit } });
  return data;
};

export const getProductByBarcode = async (barcode) => {
  const { data } = await api.get(`/pos/product/barcode/${barcode}`);
  return data;
};

export const getProductVariants = async (productId) => {
  const { data } = await api.get(`/pos/product/${productId}/variants`);
  return data;
};

export const registerSale = async (saleData) => {
  const { data } = await api.post('/pos/sale', saleData);
  return data;
}; 