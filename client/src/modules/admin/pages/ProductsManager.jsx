// client/src/modules/admin/pages/ProductsManager.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { getAdminProducts, deleteProduct, updateProduct } from '../../../shared/services/productService';
import { getCategories } from '../../../shared/services/categoryService';
import ProductForm from './ProductForm';
import Button from '../../core/components/UI/Button';
import Input from '../../core/components/UI/Input';
import Card from '../../core/components/UI/Card';

export default function ProductsManager() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showVariantModal, setShowVariantModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [editingVariantProduct, setEditingVariantProduct] = useState(null);
  const [editingVariantData, setEditingVariantData] = useState(null);
  const [message, setMessage] = useState('');
  const [expandedProducts, setExpandedProducts] = useState({});

  // Paginación y Búsqueda
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  useEffect(() => {
    loadData();
  }, [currentPage]); // Recargar cuando cambia la página

  // Búsqueda con debounce manual o al presionar Enter
  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1); // Reset a página 1 al buscar
    loadData();
  };

  const loadData = async () => {
    setLoading(true);
    try {
      // Llamada al servicio que ahora debe aceptar params de paginación
      const [productsData, categoriesData] = await Promise.all([
        getAdminProducts({ page: currentPage, limit: 15, search }),
        getCategories()
      ]);
      
      // Ajustar según la nueva estructura de respuesta (paginada)
      if (productsData.products) {
        setProducts(productsData.products);
        setTotalPages(productsData.pagination.pages);
        setTotalItems(productsData.pagination.total);
      } else {
        // Fallback si la API aún no devuelve el objeto de paginación
        setProducts(productsData);
      }
      
      setCategories(categoriesData);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este producto?')) return;
    try {
      await deleteProduct(id);
      setMessage('✅ Producto eliminado');
      loadData();
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage('❌ Error al eliminar');
    }
  };

  const handleDeleteVariant = async (product, variantIndex, e) => {
    e.stopPropagation();
    if (!confirm('¿Eliminar esta variante?')) return;
    
    const updatedVariants = [...product.variants];
    updatedVariants.splice(variantIndex, 1);
    
    const totalStock = updatedVariants.reduce((sum, v) => sum + (v.stock || 0), 0);
    const prices = updatedVariants.map(v => v.price || 0).filter(p => p > 0);
    const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
    const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;
    
    const updatedProduct = {
      ...product,
      variants: updatedVariants,
      stock: totalStock,
      price: minPrice,
      comparePrice: maxPrice > minPrice ? maxPrice : 0,
      hasVariants: updatedVariants.length > 0
    };
    
    try {
      await updateProduct(product._id, updatedProduct);
      setMessage('✅ Variante eliminada');
      loadData();
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage('❌ Error al eliminar variante');
    }
  };

  const handleSaveVariant = async () => {
    try {
      const updatedVariants = [...editingVariantProduct.variants];
      updatedVariants[editingVariantData.variantIndex] = editingVariantData;
      
      const totalStock = updatedVariants.reduce((sum, v) => sum + (v.stock || 0), 0);
      const prices = updatedVariants.map(v => v.price || 0).filter(p => p > 0);
      const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
      const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;
      
      const updatedProduct = {
        ...editingVariantProduct,
        variants: updatedVariants,
        stock: totalStock,
        price: minPrice,
        comparePrice: maxPrice > minPrice ? maxPrice : 0
      };
      
      await updateProduct(editingVariantProduct._id, updatedProduct);
      setShowVariantModal(false);
      loadData();
      setMessage('✅ Variante actualizada');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage('❌ Error al actualizar variante');
    }
  };

  const toggleExpand = (productId, e) => {
    if (e) e.stopPropagation();
    setExpandedProducts(prev => ({
      ...prev,
      [productId]: !prev[productId]
    }));
  };

  const openCreateModal = () => {
    setEditingProduct(null);
    setShowModal(true);
  };

  const openEditModal = (product, e) => {
    if (e) e.stopPropagation();
    setEditingProduct(product);
    setShowModal(true);
  };

  const openEditVariantModal = (product, variantIndex, e) => {
    if (e) e.stopPropagation();
    setEditingVariantProduct(product);
    setEditingVariantData({
      ...product.variants[variantIndex],
      variantIndex: variantIndex
    });
    setShowVariantModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingProduct(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <span className="w-1 h-6 bg-green-600 rounded-full"></span>
          📦 Productos ({totalItems})
        </h2>
        <div className="flex gap-2 w-full sm:w-auto">
          <form onSubmit={handleSearch} className="flex-1 sm:w-64 flex gap-2">
            <Input 
              placeholder="Buscar por nombre, SKU o código..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="!mb-0"
            />
            <Button type="submit" variant="outline" className="shrink-0">🔍</Button>
          </form>
          <Button variant="primary" onClick={openCreateModal} data-testid="new-product-btn" className="bg-gradient-to-r from-green-600 to-green-700">
            + Nuevo
          </Button>
        </div>
      </div>

      {message && (
        <div className="p-4 bg-green-50 text-green-700 rounded-xl border border-green-200 animate-fade-in">
          {message}
        </div>
      )}

      {/* Modal de producto */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-auto shadow-xl">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-800">
                {editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
              </h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 transition">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6">
              <ProductForm
                product={editingProduct}
                categories={categories}
                onSuccess={() => {
                  closeModal();
                  loadData();
                }}
                onCancel={closeModal}
              />
            </div>
          </div>
        </div>
      )}

      {/* Modal de variante */}
      {showVariantModal && editingVariantData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-auto shadow-xl">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-800">
                ✏️ Editar Variante: {editingVariantData.name || 'Sin nombre'}
              </h3>
              <button onClick={() => setShowVariantModal(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6">
              <form onSubmit={(e) => { e.preventDefault(); handleSaveVariant(); }} className="space-y-4">
                <Input label="Nombre de la variante" value={editingVariantData.name || ''} onChange={(e) => setEditingVariantData({...editingVariantData, name: e.target.value})} required />
                <Input label="SKU" value={editingVariantData.sku || ''} onChange={(e) => setEditingVariantData({...editingVariantData, sku: e.target.value})} />
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Precio" type="number" value={editingVariantData.price || 0} onChange={(e) => setEditingVariantData({...editingVariantData, price: parseFloat(e.target.value)})} required />
                  <Input label="Stock" type="number" value={editingVariantData.stock || 0} onChange={(e) => setEditingVariantData({...editingVariantData, stock: parseInt(e.target.value)})} required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Precio de compra" type="number" value={editingVariantData.purchasePrice || 0} onChange={(e) => setEditingVariantData({...editingVariantData, purchasePrice: parseFloat(e.target.value)})} />
                  <Input label="Código de barras" value={editingVariantData.barcode || ''} onChange={(e) => setEditingVariantData({...editingVariantData, barcode: e.target.value})} />
                </div>
                <div className="flex gap-3 pt-4">
                  <Button type="submit" variant="primary" className="flex-1 bg-gradient-to-r from-green-600 to-green-700">Guardar Variante</Button>
                  <Button type="button" variant="ghost" onClick={() => setShowVariantModal(false)}>Cancelar</Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
        </div>
      ) : (
        <>
          {/* Vista móvil (cards) */}
          <div className="block lg:hidden space-y-3">
            {products.map((product) => (
              <div key={product._id} className="space-y-2">
                <Card className="p-4">
                  <div className="flex gap-4">
                    <div className="w-20 h-20 flex-shrink-0">
                      {product.thumbnail ? (
                        <img src={product.thumbnail} alt={product.name} className="w-full h-full object-cover rounded-xl" />
                      ) : (
                        <div className="w-full h-full bg-gray-100 rounded-xl flex items-center justify-center text-2xl">📦</div>
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <div>
                          <button 
                            onClick={(e) => product.hasVariants && toggleExpand(product._id, e)} 
                            className="mr-1 text-gray-400"
                          >
                            {product.hasVariants && (expandedProducts[product._id] ? '▼' : '▶')}
                          </button>
                          <h3 className="font-semibold text-gray-800 inline">{product.name}</h3>
                          <p className="text-xs text-gray-400 mt-1">SKU: {product.sku || '—'}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-green-600">Q{product.price}</p>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${product.stock > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {product.stock}
                          </span>
                        </div>
                      </div>
                      
                      <div className="mt-3 flex gap-2">
                        <Button size="sm" variant="outline" onClick={(e) => openEditModal(product, e)} className="flex-1">Editar</Button>
                        <Button size="sm" variant="danger" onClick={(e) => { e.stopPropagation(); handleDelete(product._id); }}>Borrar</Button>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            ))}
          </div>

          {/* Tabla desktop */}
          <div className="hidden lg:block bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="p-4 text-left text-sm font-semibold text-gray-600 w-16">Imagen</th>
                    <th className="p-4 text-left text-sm font-semibold text-gray-600">Producto</th>
                    <th className="p-4 text-left text-sm font-semibold text-gray-600">Categoría</th>
                    <th className="p-4 text-right text-sm font-semibold text-gray-600">Precio</th>
                    <th className="p-4 text-center text-sm font-semibold text-gray-600">Stock</th>
                    <th className="p-4 text-center text-sm font-semibold text-gray-600 w-24">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {products.map((product) => (
                    <React.Fragment key={product._id}>
                      <tr className="hover:bg-gray-50 transition cursor-pointer" onClick={() => product.hasVariants && toggleExpand(product._id)}>
                        <td className="p-4 text-center">
                          {product.thumbnail ? (
                            <img src={product.thumbnail} alt={product.name} className="w-10 h-10 object-cover rounded-lg mx-auto" />
                          ) : (
                            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-xl mx-auto">📦</div>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="font-medium text-gray-900">{product.name}</div>
                          <div className="text-xs text-gray-400">SKU: {product.sku || '—'}</div>
                        </td>
                        <td className="p-4"><span className="text-xs px-2 py-1 bg-gray-100 rounded-full">{product.categoryId?.name || 'General'}</span></td>
                        <td className="p-4 text-right font-bold text-green-600">Q{product.price}</td>
                        <td className="p-4 text-center">
                          <span className={`text-xs px-2 py-1 rounded-full ${product.stock > 5 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {product.stock}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex justify-center gap-1">
                            <button onClick={(e) => openEditModal(product, e)} className="p-2 text-gray-400 hover:text-green-600"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button>
                            <button onClick={(e) => { e.stopPropagation(); handleDelete(product._id); }} className="p-2 text-gray-400 hover:text-red-600"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                          </div>
                        </td>
                      </tr>
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-4 mt-6">
              <Button 
                variant="outline" 
                size="sm" 
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              >
                Anterior
              </Button>
              <span className="text-sm font-medium text-gray-600">
                Página {currentPage} de {totalPages}
              </span>
              <Button 
                variant="outline" 
                size="sm" 
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              >
                Siguiente
              </Button>
            </div>
          )}

          {products.length === 0 && (
            <div className="text-center py-12 text-gray-500 bg-white rounded-2xl border border-gray-100">
              No se encontraron productos.
            </div>
          )}
        </>
      )}
    </div>
  );
}
