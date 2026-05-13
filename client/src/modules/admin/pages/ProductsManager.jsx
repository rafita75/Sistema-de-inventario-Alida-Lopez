// client/src/modules/admin/pages/ProductsManager.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { getAdminProducts, deleteProduct, updateProduct } from '../../../shared/services/productService';
import { getCategories } from '../../../shared/services/categoryService';
import ProductForm from './ProductForm';
import Button from '../../core/components/UI/Button';
import Input from '../../core/components/UI/Input';
import Card from '../../core/components/UI/Card';
import { useNotification } from '../../../shared/contexts/NotificationContext';
import ConfirmModal from '../../core/components/UI/ConfirmModal';
import { TableSkeleton } from '../../core/components/UI/Skeleton';

export default function ProductsManager() {
  const { notify } = useNotification();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showVariantModal, setShowVariantModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [editingVariantProduct, setEditingVariantProduct] = useState(null);
  const [editingVariantData, setEditingVariantData] = useState(null);
  const [expandedProducts, setExpandedProducts] = useState({});

  // Paginación y Búsqueda
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Estados para Confirmación
  const [confirmDelete, setConfirmDelete] = useState({ open: false, id: null, type: 'product', extra: null });
  const [deleting, setDeleting] = useState(false);

  const openCreateModal = useCallback(() => {
    setEditingProduct(null);
    setShowModal(true);
  }, []);

  useEffect(() => {
    const handleOpenCreateModal = () => openCreateModal();
    window.addEventListener('openCreateProductModal', handleOpenCreateModal);
    return () => window.removeEventListener('openCreateProductModal', handleOpenCreateModal);
  }, [openCreateModal]);

  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1); 
    loadData();
  };

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [productsData, categoriesData] = await Promise.all([
        getAdminProducts({ page: currentPage, limit: 15, search }),
        getCategories()
      ]);
      
      if (productsData.products) {
        setProducts(productsData.products);
        setTotalPages(productsData.pagination.pages);
        setTotalItems(productsData.pagination.total);
      } else {
        setProducts(productsData);
      }
      
      setCategories(categoriesData);
    } catch (error) {
      console.error('Error:', error);
      notify('Error al cargar productos', 'error');
    } finally {
      setLoading(false);
    }
  }, [currentPage, notify, search]);

  useEffect(() => {
    loadData();
  }, [loadData]); 

  const handleConfirmDelete = async () => {
    setDeleting(true);
    try {
      if (confirmDelete.type === 'product') {
        await deleteProduct(confirmDelete.id);
        notify('Producto eliminado correctamente', 'success');
      } else {
        // Eliminar variante
        const { product, variantIndex } = confirmDelete.extra;
        const updatedVariants = [...product.variants];
        updatedVariants.splice(variantIndex, 1);
        
        const totalStock = updatedVariants.reduce((sum, v) => sum + (v.stock || 0), 0);
        const prices = updatedVariants.map(v => v.price || 0).filter(p => p > 0);
        const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
        
        const updatedProduct = {
          ...product,
          variants: updatedVariants,
          stock: totalStock,
          price: minPrice,
          hasVariants: updatedVariants.length > 0
        };
        await updateProduct(product._id, updatedProduct);
        notify('Variante eliminada correctamente', 'success');
      }
      setConfirmDelete({ open: false, id: null, type: 'product', extra: null });
      loadData();
    } catch (error) {
      notify('Error al eliminar', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const handleSaveVariant = async () => {
    try {
      const updatedVariants = [...editingVariantProduct.variants];
      updatedVariants[editingVariantData.variantIndex] = editingVariantData;
      
      const totalStock = updatedVariants.reduce((sum, v) => sum + (v.stock || 0), 0);
      const prices = updatedVariants.map(v => v.price || 0).filter(p => p > 0);
      const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
      
      const updatedProduct = {
        ...editingVariantProduct,
        variants: updatedVariants,
        stock: totalStock,
        price: minPrice
      };
      
      await updateProduct(editingVariantProduct._id, updatedProduct);
      setShowVariantModal(false);
      loadData();
      notify('Variante actualizada correctamente', 'success');
    } catch (error) {
      notify('Error al actualizar variante', 'error');
    }
  };

  const toggleExpand = (productId, e) => {
    if (e) e.stopPropagation();
    setExpandedProducts(prev => ({
      ...prev,
      [productId]: !prev[productId]
    }));
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
    <div className="space-y-6 pb-20 lg:pb-0">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <span className="w-1 h-6 bg-green-600 rounded-full"></span>
            📦 Gestión de Productos
          </h2>
          <p className="text-gray-500 text-sm mt-1 font-medium">Catálogo general ({totalItems} total)</p>
        </div>
        
        <Button variant="primary" onClick={openCreateModal} className="w-full sm:w-auto bg-gradient-to-r from-green-600 to-green-700 h-12 px-8 rounded-2xl shadow-xl shadow-green-100 font-bold">
          + Nuevo Producto
        </Button>
      </div>

      <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 p-4 md:p-8">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8">
            <h3 className="text-xl font-black text-gray-800 flex items-center gap-2 tracking-tighter uppercase text-sm">
              <span className="w-1.5 h-4 bg-green-500 rounded-full"></span>
              Filtros y Búsqueda
            </h3>
            <div className="relative w-full lg:w-96 group">
               <form onSubmit={handleSearch} className="flex gap-2">
                  <div className="relative flex-1">
                    <Input 
                      placeholder="Buscar producto..." 
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="!mb-0"
                      icon="🔍"
                    />
                  </div>
                  <Button type="submit" variant="outline" className="shrink-0 h-12 rounded-xl">Buscar</Button>
               </form>
            </div>
        </div>

        {loading ? (
          <TableSkeleton cols={6} rows={10} />
        ) : (
          <>
            {/* Vista Desktop (Tabla Estándar) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-widest w-16">Imagen</th>
                    <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Producto</th>
                    <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-center">Categoría</th>
                    <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-right">Precio</th>
                    <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-center">Stock</th>
                    <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-center w-32">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {products.map((product) => (
                    <React.Fragment key={product._id}>
                      <tr className="hover:bg-gray-50 transition cursor-pointer" onClick={() => product.hasVariants && toggleExpand(product._id)}>
                        <td className="p-4">
                          {product.thumbnail ? (
                            <img src={product.thumbnail} alt={product.name} className="w-10 h-10 object-cover rounded-xl" />
                          ) : (
                            <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center text-xl">📦</div>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="font-bold text-gray-800">
                             {product.hasVariants && (
                               <span className="mr-2 text-gray-400">{expandedProducts[product._id] ? '▼' : '▶'}</span>
                             )}
                             {product.name}
                          </div>
                          <div className="text-[10px] text-gray-400 font-mono">SKU: {product.sku || '—'}</div>
                        </td>
                        <td className="p-4 text-center">
                          <span className="text-[10px] font-bold px-2 py-1 bg-gray-100 text-gray-500 rounded-full">{product.categoryId?.name || 'General'}</span>
                        </td>
                        <td className="p-4 text-right font-bold text-green-600">Q{product.price?.toLocaleString()}</td>
                        <td className="p-4 text-center">
                          <span className={`text-[10px] font-bold px-3 py-1 rounded-full ${product.stock > 5 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {product.stock}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex justify-center gap-2">
                            <button onClick={(e) => openEditModal(product, e)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-all">✏️</button>
                            <button onClick={(e) => { e.stopPropagation(); setConfirmDelete({ open: true, id: product._id, type: 'product' }); }} className="p-2 text-red-600 hover:bg-red-50 rounded-xl transition-all">🗑️</button>
                          </div>
                        </td>
                      </tr>
                      {expandedProducts[product._id] && product.hasVariants && product.variants?.map((variant, vIdx) => (
                        <tr key={variant._id} className="bg-gray-50/50 text-xs">
                          <td className="p-3"></td>
                          <td className="p-3 pl-12">
                            <div className="flex items-center gap-2">
                              <span className="text-gray-400">↳</span>
                              {variant.image ? <img src={variant.image} className="w-6 h-6 rounded object-cover" /> : '🎨'}
                              <span className="font-medium text-gray-600">{variant.name}</span>
                            </div>
                          </td>
                          <td className="p-3 text-center text-gray-400">SKU: {variant.sku}</td>
                          <td className="p-3 text-right font-bold text-green-600">Q{variant.price?.toLocaleString()}</td>
                          <td className="p-3 text-center">Stock: {variant.stock}</td>
                          <td className="p-3 text-center">
                             <div className="flex justify-center gap-2">
                               <button onClick={(e) => openEditVariantModal(product, vIdx, e)} className="text-blue-500 hover:text-blue-700">✏️</button>
                               <button onClick={(e) => { e.stopPropagation(); setConfirmDelete({ open: true, id: variant._id, type: 'variant', extra: { product, variantIndex: vIdx } }); }} className="text-red-400 hover:text-red-600">🗑️</button>
                             </div>
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Vista Móvil (Cards Estándar) */}
            <div className="md:hidden">
              <div className="max-h-[65vh] overflow-y-auto pr-1 space-y-4 scrollbar-hide pb-10">
                {products.length === 0 ? (
                  <div className="py-20 text-center text-gray-400 italic">No se encontraron productos</div>
                ) : (
                  products.map(product => (
                    <Card key={product._id} className="p-5 border-l-4 border-l-green-500 rounded-[2rem] shadow-sm">
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex gap-4">
                             <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center overflow-hidden">
                                {product.thumbnail ? <img src={product.thumbnail} className="w-full h-full object-cover" /> : '📦'}
                             </div>
                             <div>
                                <h4 className="font-bold text-gray-800 leading-tight truncate max-w-[150px]">{product.name}</h4>
                                <p className="text-[10px] text-gray-400 font-mono mt-1">{product.sku || 'SIN SKU'}</p>
                             </div>
                          </div>
                          <div className="text-right">
                            <p className="font-black text-green-600">Q{product.price}</p>
                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${product.stock <= 5 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                              STOCK: {product.stock}
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex gap-2">
                           <Button variant="outline" size="sm" onClick={(e) => openEditModal(product, e)} className="flex-1 rounded-xl text-[10px] font-bold">EDITAR</Button>
                           <Button variant="danger" size="sm" onClick={(e) => { e.stopPropagation(); setConfirmDelete({ open: true, id: product._id, type: 'product' }); }} className="flex-1 rounded-xl text-[10px] font-bold">BORRAR</Button>
                        </div>

                        {product.hasVariants && (
                          <button 
                            onClick={() => toggleExpand(product._id)}
                            className="w-full mt-4 py-2 bg-gray-100 rounded-xl text-[10px] font-bold text-gray-500 uppercase tracking-widest flex items-center justify-center gap-2"
                          >
                            {expandedProducts[product._id] ? 'Ocultar Variantes ▲' : `Ver ${product.variants?.length} Variantes ▼`}
                          </button>
                        )}

                        {expandedProducts[product._id] && product.hasVariants && (
                          <div className="mt-4 space-y-2 border-t border-gray-100 pt-4">
                            {product.variants?.map((v, vIdx) => (
                              <div key={v._id} className="flex justify-between items-center bg-gray-50/50 p-3 rounded-xl border border-gray-100">
                                <div className="flex items-center gap-2">
                                   {v.image && <img src={v.image} className="w-6 h-6 rounded-lg object-cover" />}
                                   <span className="text-xs font-bold text-gray-600">{v.name}</span>
                                </div>
                                <div className="flex items-center gap-4">
                                   <span className="text-[10px] font-bold text-green-600">Q{v.price}</span>
                                   <button onClick={(e) => openEditVariantModal(product, vIdx, e)} className="text-blue-500 text-xs">✏️</button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                    </Card>
                  ))
                )}
              </div>
            </div>

            {/* Paginación */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-4 mt-8 border-t border-gray-100 pt-8 shrink-0">
                <Button 
                  variant="outline" 
                  size="sm" 
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  className="rounded-xl font-bold text-[10px]"
                >
                  ← ANTERIOR
                </Button>
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  Pág. {currentPage} / {totalPages}
                </span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  className="rounded-xl font-bold text-[10px]"
                >
                  <span className="whitespace-nowrap">SIGUIENTE →</span>
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal de producto */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-[2rem] max-w-4xl w-full max-h-[90vh] overflow-auto shadow-xl">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex justify-between items-center z-10">
              <h3 className="text-lg font-semibold text-gray-800 uppercase">
                {editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
              </h3>
              <button onClick={closeModal} className="bg-gray-100 text-gray-400 hover:text-gray-800 p-2 rounded-xl">
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-xl w-full p-8 shadow-xl animate-scale-in">
            <h3 className="text-xl font-bold text-gray-800 mb-6 uppercase">Editar Variante</h3>
            <form onSubmit={(e) => { e.preventDefault(); handleSaveVariant(); }} className="space-y-4">
                <Input label="Nombre" value={editingVariantData.name || ''} onChange={(e) => setEditingVariantData({...editingVariantData, name: e.target.value})} required />
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Precio" type="number" value={editingVariantData.price || 0} onChange={(e) => setEditingVariantData({...editingVariantData, price: parseFloat(e.target.value)})} required />
                  <Input label="Stock" type="number" value={editingVariantData.stock || 0} onChange={(e) => setEditingVariantData({...editingVariantData, stock: parseInt(e.target.value)})} required />
                </div>
                <div className="flex gap-3 pt-4">
                  <Button type="submit" variant="primary" className="flex-1 bg-green-600 h-12 font-bold">GUARDAR</Button>
                  <Button type="button" variant="ghost" onClick={() => setShowVariantModal(false)}>Cancelar</Button>
                </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmDelete.open}
        onClose={() => setConfirmDelete({ ...confirmDelete, open: false })}
        onConfirm={handleConfirmDelete}
        loading={deleting}
        title={confirmDelete.type === 'product' ? '¿Eliminar Producto?' : '¿Eliminar Variante?'}
        message="Esta acción es irreversible."
        confirmText="Sí, eliminar"
        type="danger"
      />
    </div>
  );
}
