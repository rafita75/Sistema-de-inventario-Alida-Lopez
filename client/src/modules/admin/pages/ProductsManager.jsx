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

  useEffect(() => {
    loadData();
  }, [currentPage]); 

  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1); 
    loadData();
  };

  const loadData = async () => {
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
  };

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
    <div className="space-y-6 pb-20 lg:pb-0">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <span className="w-1 h-6 bg-green-600 rounded-full"></span>
            📦 Gestión de Productos
          </h2>
          <p className="text-gray-500 text-sm mt-1 font-medium">Catálogo general y variantes ({totalItems} total)</p>
        </div>
        
        <Button variant="primary" onClick={openCreateModal} className="w-full sm:w-auto bg-gradient-to-r from-green-600 to-green-700 h-12 px-8 rounded-2xl shadow-xl shadow-green-100 font-bold">
          ➕ NUEVO PRODUCTO
        </Button>
      </div>

      <div className="bg-white rounded-[2rem] shadow-sm border border-gray-100 p-4 md:p-8">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8">
            <h3 className="text-xl font-black text-gray-800 flex items-center gap-2 tracking-tighter uppercase">
              <span className="w-1.5 h-5 bg-green-500 rounded-full"></span>
              Filtros y Búsqueda
            </h3>
            <div className="relative w-full lg:w-96 group">
               <form onSubmit={handleSearch} className="flex gap-2">
                  <div className="relative flex-1 group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400 group-focus-within:text-green-600 transition-colors">
                      <span className="text-lg">🔍</span>
                    </div>
                    <input
                      type="text"
                      placeholder="Buscar por nombre, SKU o código..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-green-500 focus:ring-4 focus:ring-green-500/10 transition-all outline-none"
                    />
                  </div>
                  <Button type="submit" variant="outline" className="shrink-0 h-12 rounded-xl">Buscar</Button>
               </form>
            </div>
        </div>

        {/* Vista Desktop (Tabla) */}
        <div className="hidden md:block overflow-x-auto">
          {loading ? (
            <TableSkeleton cols={6} rows={10} />
          ) : (
            <table className="w-full text-left">
              <thead className="bg-gray-50 rounded-2xl">
                <tr>
                  <th className="p-6 text-xs font-black text-gray-400 uppercase tracking-widest w-16">Imagen</th>
                  <th className="p-6 text-xs font-black text-gray-400 uppercase tracking-widest">Producto</th>
                  <th className="p-6 text-xs font-black text-gray-400 uppercase tracking-widest text-center">Categoría</th>
                  <th className="p-6 text-xs font-black text-gray-400 uppercase tracking-widest text-right">Precio</th>
                  <th className="p-6 text-xs font-black text-gray-400 uppercase tracking-widest text-center">Existencias</th>
                  <th className="p-6 text-xs font-black text-gray-400 uppercase tracking-widest text-center w-32">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {products.map((product) => (
                  <React.Fragment key={product._id}>
                    <tr className="hover:bg-gray-50 transition group cursor-pointer" onClick={() => product.hasVariants && toggleExpand(product._id)}>
                      <td className="p-6 text-center">
                        {product.thumbnail ? (
                          <img src={product.thumbnail} alt={product.name} className="w-12 h-12 object-cover rounded-2xl shadow-sm border border-white" />
                        ) : (
                          <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center text-2xl shadow-inner">📦</div>
                        )}
                      </td>
                      <td className="p-6">
                        <div className="flex items-center gap-2">
                           <button className="text-gray-300">
                              {product.hasVariants ? (expandedProducts[product._id] ? '▼' : '▶') : '•'}
                           </button>
                           <div>
                             <div className="font-black text-gray-800 group-hover:text-green-700 transition-colors leading-tight">{product.name}</div>
                             <div className="text-[10px] text-gray-400 font-mono mt-1">SKU: {product.sku || '—'}</div>
                           </div>
                        </div>
                      </td>
                      <td className="p-6 text-center">
                        <span className="text-[10px] font-black px-3 py-1 bg-gray-100 text-gray-500 rounded-full uppercase tracking-tighter">{product.categoryId?.name || 'General'}</span>
                      </td>
                      <td className="p-6 text-right">
                        <div className="font-black text-green-600 text-lg">Q{product.price?.toLocaleString()}</div>
                      </td>
                      <td className="p-6 text-center">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black tracking-widest ${product.stock > 5 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {product.stock} UNI
                        </span>
                      </td>
                      <td className="p-6">
                        <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={(e) => openEditModal(product, e)} className="p-3 text-blue-600 hover:bg-blue-50 rounded-2xl transition-all shadow-sm hover:shadow-blue-100">
                             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); setConfirmDelete({ open: true, id: product._id, type: 'product' }); }} className="p-3 text-red-600 hover:bg-red-50 rounded-2xl transition-all shadow-sm hover:shadow-red-100">
                             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expandedProducts[product._id] && product.hasVariants && product.variants?.map((variant, vIdx) => (
                      <tr key={variant._id} className="bg-gray-50/30 text-xs border-l-4 border-l-green-500">
                        <td className="p-4"></td>
                        <td className="p-4 pl-8">
                          <div className="flex items-center gap-3">
                            <span className="text-gray-300 font-bold">↳</span>
                            {variant.image ? (
                              <img src={variant.image} className="w-8 h-8 rounded-xl object-cover shadow-sm" />
                            ) : (
                              <div className="w-8 h-8 bg-gray-200 rounded-xl flex items-center justify-center text-xs shadow-inner">🎨</div>
                            )}
                            <span className="font-bold text-gray-600">{variant.name}</span>
                          </div>
                        </td>
                        <td className="p-4 text-center font-mono text-gray-400">SKU: {variant.sku}</td>
                        <td className="p-4 text-right">
                          <div className="font-black text-green-600">Q{variant.price?.toLocaleString()}</div>
                        </td>
                        <td className="p-4 text-center">
                          <span className="px-2 py-0.5 bg-white border border-gray-100 rounded-lg font-black text-gray-500">STOCK: {variant.stock}</span>
                        </td>
                        <td className="p-4">
                           <div className="flex justify-center gap-3">
                             <button onClick={(e) => openEditVariantModal(product, vIdx, e)} className="text-blue-500 hover:scale-125 transition-transform">✏️</button>
                             <button onClick={(e) => { e.stopPropagation(); setConfirmDelete({ open: true, id: variant._id, type: 'variant', extra: { product, variantIndex: vIdx } }); }} className="text-red-400 hover:scale-125 transition-transform">🗑️</button>
                           </div>
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Vista Móvil (Cards) */}
        <div className="md:hidden space-y-4">
           {loading ? (
             [1,2,3,4].map(i => <div key={i} className="h-48 bg-gray-100 rounded-[2rem] animate-pulse" />)
           ) : products.length === 0 ? (
             <div className="py-20 text-center text-gray-400 italic">No se encontraron productos</div>
           ) : (
             products.map(product => (
               <Card key={product._id} className="p-5 border-l-4 border-l-green-500 rounded-[2rem] shadow-sm">
                  <div className="flex gap-4 mb-4">
                    <div className="w-16 h-16 shrink-0">
                      {product.thumbnail ? (
                        <img src={product.thumbnail} alt={product.name} className="w-full h-full object-cover rounded-2xl" />
                      ) : (
                        <div className="w-full h-full bg-gray-100 rounded-2xl flex items-center justify-center text-2xl">📦</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                       <h4 className="font-black text-gray-800 leading-tight truncate uppercase tracking-tighter">{product.name}</h4>
                       <p className="text-[10px] text-gray-400 font-mono mt-1">SKU: {product.sku || 'SIN SKU'}</p>
                       <p className="text-[10px] font-black text-green-600 bg-green-50 px-2 py-0.5 rounded-full inline-block mt-2">Q{product.price}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between bg-gray-50 p-4 rounded-2xl mb-4">
                    <div className="text-center">
                       <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Existencias</p>
                       <p className={`font-black ${product.stock > 5 ? 'text-gray-800' : 'text-red-500'}`}>{product.stock}</p>
                    </div>
                    <div className="text-center border-x border-gray-200 px-6">
                       <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Variantes</p>
                       <p className="font-black text-gray-800">{product.variants?.length || 0}</p>
                    </div>
                    <div className="text-center">
                       <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Cat</p>
                       <p className="font-black text-gray-800 truncate max-w-[40px] uppercase text-[9px]">{product.categoryId?.name?.substring(0,3) || 'GEN'}</p>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={(e) => openEditModal(product, e)} className="flex-1 rounded-xl font-black text-[10px]">EDITAR</Button>
                    <Button variant="danger" size="sm" onClick={(e) => { e.stopPropagation(); setConfirmDelete({ open: true, id: product._id, type: 'product' }); }} className="bg-red-50 text-red-500 border-none rounded-xl font-black text-[10px]">BORRAR</Button>
                  </div>

                  {product.hasVariants && (
                    <button 
                      onClick={() => toggleExpand(product._id)}
                      className="w-full mt-4 py-2 bg-gray-100 rounded-xl text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center justify-center gap-2"
                    >
                      {expandedProducts[product._id] ? 'Ocultar Variantes ▲' : 'Ver Variantes ▼'}
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
                             <span className="text-[10px] font-black text-green-600">Q{v.price}</span>
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

        {/* Paginación Responsive */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mt-10 border-t border-gray-100 pt-8">
            <div className="flex gap-2 w-full sm:w-auto">
              <Button 
                variant="outline" 
                size="sm" 
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                className="flex-1 rounded-xl h-12"
              >
                ← Anterior
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                className="flex-1 rounded-xl h-12"
              >
                Siguiente →
              </Button>
            </div>
            <span className="text-xs font-black text-gray-400 uppercase tracking-widest">
              Página {currentPage} de {totalPages}
            </span>
          </div>
        )}
      </div>

      {/* Modales Personalizados */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white rounded-none sm:rounded-[3rem] w-full max-w-4xl h-full sm:h-auto sm:max-h-[90vh] overflow-auto shadow-2xl animate-scale-in flex flex-col">
            <div className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-gray-100 px-8 py-6 flex justify-between items-center z-20 shrink-0">
              <h3 className="text-2xl font-black text-gray-800 tracking-tighter uppercase">
                {editingProduct ? '✏️ Editar Producto' : '➕ Nuevo Producto'}
              </h3>
              <button onClick={closeModal} className="bg-gray-100 text-gray-400 hover:text-gray-800 p-2 rounded-2xl transition-all">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-8">
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

      {showVariantModal && editingVariantData && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-[2.5rem] max-w-xl w-full p-8 shadow-2xl animate-scale-in border border-gray-100">
            <h3 className="text-2xl font-black text-gray-800 mb-2 tracking-tighter uppercase">Editar Variante</h3>
            <p className="text-gray-500 mb-8 font-medium">{editingVariantData.name}</p>
            
            <form onSubmit={(e) => { e.preventDefault(); handleSaveVariant(); }} className="space-y-6">
                <Input label="Nombre de la variante" value={editingVariantData.name || ''} onChange={(e) => setEditingVariantData({...editingVariantData, name: e.target.value})} required />
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Precio Venta" type="number" value={editingVariantData.price || 0} onChange={(e) => setEditingVariantData({...editingVariantData, price: parseFloat(e.target.value)})} required />
                  <Input label="Existencias" type="number" value={editingVariantData.stock || 0} onChange={(e) => setEditingVariantData({...editingVariantData, stock: parseInt(e.target.value)})} required />
                </div>
                <div className="flex gap-3 pt-4">
                  <Button type="submit" variant="primary" className="flex-1 bg-green-600 h-14 text-lg font-black shadow-xl shadow-green-100">GUARDAR CAMBIOS</Button>
                  <Button type="button" variant="ghost" onClick={() => setShowVariantModal(false)} className="h-14 font-bold">Cancelar</Button>
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
        message="Esta acción es irreversible y eliminará el registro del inventario."
        confirmText="SÍ, ELIMINAR"
        type="danger"
      />
    </div>
  );
}
