// client/src/modules/admin/pages/ProductForm.jsx
import { useState, useEffect } from 'react';
import { createProduct, updateProduct } from '../../../shared/services/productService';
import { getBrands, createBrand } from '../../../shared/services/brandService';
import { getSuppliers, createSupplier } from '../../../shared/services/supplierService';
import Button from '../../core/components/UI/Button';
import Input from '../../core/components/UI/Input';
import VariantManager from './VariantManager';
import { useNotification } from '../../../shared/contexts/NotificationContext';
import MultiImageUpload from '../../../shared/components/upload/MultiImageUpload';

export default function ProductForm({ product, categories, onSuccess, onCancel }) {
  const { notify } = useNotification();
  const [hasVariants, setHasVariants] = useState(product?.hasVariants || false);
  const [variants, setVariants] = useState(product?.variants || []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Listas para selects
  const [brands, setBrands] = useState([]);
  const [suppliers, setSuppliers] = useState([]);

  // Estados para Mini-Modales UX
  const [showBrandModal, setShowBrandModal] = useState(false);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [quickData, setQuickData] = useState({ name: '', phone: '' });
  
  const [formData, setFormData] = useState({
    name: product?.name || '',
    description: product?.description || '',
    brandId: product?.brandId?._id || product?.brandId || '',
    supplierId: product?.supplierId?._id || product?.supplierId || '',
    categoryId: product?.categoryId?._id || '',
    images: product?.images || [],
    thumbnail: product?.thumbnail || '',
    sku: product?.sku || '',
    barcode: product?.barcode || '',
    price: product?.price || '',
    purchasePrice: product?.purchasePrice || '',
    stock: product?.stock || '',
    minStock: product?.minStock || 5
  });

  useEffect(() => {
    loadReferences();
  }, []);

  const loadReferences = async () => {
    try {
      const [bData, sData] = await Promise.all([getBrands(), getSuppliers()]);
      setBrands(bData);
      setSuppliers(sData);
    } catch (e) { console.error('Error cargando referencias:', e); }
  };

  // Lógica UX: Guardar Marca rápido
  const handleSaveBrand = async (e) => {
    e.preventDefault();
    if (!quickData.name) return;
    try {
      const newBrand = await createBrand({ name: quickData.name });
      setBrands([...brands, newBrand]);
      setFormData({ ...formData, brandId: newBrand._id });
      setShowBrandModal(false);
      setQuickData({ name: '', phone: '' });
      notify('Marca creada correctamente', 'success');
    } catch (e) { notify('Error al crear marca', 'error'); }
  };

  // Lógica UX: Guardar Proveedor rápido
  const handleSaveSupplier = async (e) => {
    e.preventDefault();
    if (!quickData.name) return;
    try {
      const newSupplier = await createSupplier({ name: quickData.name, phone: quickData.phone });
      setSuppliers([...suppliers, newSupplier]);
      setFormData({ ...formData, supplierId: newSupplier._id });
      setShowSupplierModal(false);
      setQuickData({ name: '', phone: '' });
      notify('Proveedor creado correctamente', 'success');
    } catch (e) { notify('Error al crear proveedor', 'error'); }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleImagesChange = (images) => {
    setFormData({ 
      ...formData, 
      images: images,
      thumbnail: images.length > 0 ? images[0].url : '' 
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    const submitData = {
      ...formData,
      price: parseFloat(formData.price) || 0,
      purchasePrice: parseFloat(formData.purchasePrice) || 0,
      stock: parseInt(formData.stock) || 0,
      minStock: parseInt(formData.minStock) || 5,
      brandId: formData.brandId || null,
      supplierId: formData.supplierId || null,
      categoryId: formData.categoryId || null,
      hasVariants,
      variants: hasVariants ? variants : []
    };

    if (!submitData.barcode || submitData.barcode.trim() === '') {
      delete submitData.barcode;
    }
    
    try {
      if (product) {
        await updateProduct(product._id, submitData);
        notify('Producto actualizado correctamente', 'success');
      } else {
        await createProduct(submitData);
        notify('Producto creado correctamente', 'success');
      }
      onSuccess();
    } catch (err) {
      const msg = err.response?.data?.error || 'Error al guardar producto';
      setError(msg);
      notify(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-2">
      {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-xl border border-red-100">{error}</div>}
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex items-center gap-2 p-3 bg-green-50 rounded-xl border border-green-100">
          <input type="checkbox" checked={hasVariants} onChange={(e) => setHasVariants(e.target.checked)} className="w-5 h-5 text-green-600 rounded" />
          <span className="text-sm font-medium text-green-800">Este producto tiene múltiples variantes (tallas, colores, etc.)</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="Nombre del Producto *" name="name" value={formData.name} onChange={handleChange} required />
          <Input label="SKU (Auto)" name="sku" value={formData.sku} disabled className="bg-gray-50" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* MARCA */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex justify-between">
              Marca 
              <button type="button" onClick={() => setShowBrandModal(true)} className="text-green-600 hover:text-green-700 font-bold text-xs">+ Nueva</button>
            </label>
            <select name="brandId" value={formData.brandId} onChange={handleChange} className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 bg-white shadow-sm transition-all">
              <option value="">Seleccionar marca</option>
              {brands.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
            </select>
          </div>

          {/* PROVEEDOR */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 flex justify-between">
              Proveedor
              <button type="button" onClick={() => setShowSupplierModal(true)} className="text-green-600 hover:text-green-700 font-bold text-xs">+ Nuevo</button>
            </label>
            <select name="supplierId" value={formData.supplierId} onChange={handleChange} className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 bg-white shadow-sm transition-all">
              <option value="">Seleccionar proveedor</option>
              {suppliers.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
            </select>
          </div>

          {/* CATEGORIA */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
            <select name="categoryId" value={formData.categoryId} onChange={handleChange} className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 bg-white shadow-sm transition-all">
              <option value="">Sin categoría</option>
              {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
          </div>
        </div>

        {/* IMÁGENES PARA PRODUCTO ÚNICO */}
        {!hasVariants && (
          <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100">
            <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
              🖼️ Fotos del producto
            </h4>
            <MultiImageUpload
              onImagesChange={handleImagesChange}
              initialImages={formData.images}
              maxImages={5}
            />
          </div>
        )}

        {!hasVariants && (
          <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 grid grid-cols-2 md:grid-cols-4 gap-4">
            <Input label="Precio Compra" name="purchasePrice" type="number" step="0.01" value={formData.purchasePrice} onChange={handleChange} />
            <Input label="Precio Venta *" name="price" type="number" step="0.01" value={formData.price} onChange={handleChange} required={!hasVariants} />
            <Input label="Stock Inicial" name="stock" type="number" value={formData.stock} onChange={handleChange} disabled={!!product} className={product ? 'bg-gray-100' : ''} />
            <Input label="Cód. Barras (Auto)" name="barcode" value={formData.barcode} disabled className="bg-gray-100 font-mono" />
          </div>
        )}

        {hasVariants && <VariantManager variants={variants} onChange={setVariants} parentSku={formData.sku} />}

        <div className="flex gap-3 pt-6 border-t">
          <Button type="submit" variant="primary" loading={loading} className="flex-1 bg-green-600 shadow-md">
            {product ? 'Actualizar Producto' : 'Guardar Producto'}
          </Button>
          <Button type="button" variant="ghost" onClick={onCancel} className="flex-1">Cancelar</Button>
        </div>
      </form>

      {/* MINI MODAL: NUEVA MARCA */}
      {showBrandModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-scale-in">
            <h4 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              🏷️ Nueva Marca
            </h4>
            <form onSubmit={handleSaveBrand} className="space-y-4">
              <Input 
                label="Nombre de la Marca" 
                autoFocus 
                value={quickData.name} 
                onChange={e => setQuickData({...quickData, name: e.target.value})} 
                placeholder="Ej: Faber Castell"
              />
              <div className="flex gap-2 pt-2">
                <Button type="submit" variant="primary" className="flex-1 bg-green-600">Crear</Button>
                <Button type="button" variant="ghost" onClick={() => setShowBrandModal(false)} className="flex-1">Cancelar</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MINI MODAL: NUEVO PROVEEDOR */}
      {showSupplierModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-scale-in">
            <h4 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              🚚 Nuevo Proveedor
            </h4>
            <form onSubmit={handleSaveSupplier} className="space-y-4">
              <Input 
                label="Empresa" 
                autoFocus 
                value={quickData.name} 
                onChange={e => setQuickData({...quickData, name: e.target.value})} 
                placeholder="Nombre de la distribuidora"
              />
              <Input 
                label="Teléfono (Opcional)" 
                value={quickData.phone} 
                onChange={e => setQuickData({...quickData, phone: e.target.value})} 
                placeholder="5555-5555"
              />
              <div className="flex gap-2 pt-2">
                <Button type="submit" variant="primary" className="flex-1 bg-green-600">Crear</Button>
                <Button type="button" variant="ghost" onClick={() => setShowSupplierModal(false)} className="flex-1">Cancelar</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
