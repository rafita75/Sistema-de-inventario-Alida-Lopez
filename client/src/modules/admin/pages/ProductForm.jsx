import { useEffect, useMemo, useState } from 'react';
import { createProduct, updateProduct } from '../../../shared/services/productService';
import { getBrands, createBrand } from '../../../shared/services/brandService';
import { getSuppliers, createSupplier } from '../../../shared/services/supplierService';
import Button from '../../core/components/UI/Button';
import Input from '../../core/components/UI/Input';
import VariantManager from './VariantManager';
import { useNotification } from '../../../shared/contexts/NotificationContext';
import MultiImageUpload from '../../../shared/components/upload/MultiImageUpload';

const selectClass = 'w-full p-3 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-green-500/10 focus:border-green-500 bg-white shadow-sm transition-all outline-none font-medium';

const isValidObjectId = (value) => /^[a-f\d]{24}$/i.test(String(value || ''));

const toMoney = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
};

const toUnits = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : fallback;
};

const getId = (value) => {
  if (!value) return '';
  if (typeof value === 'object') return value._id || '';
  return value;
};

const getVariantTotals = (items = []) => {
  const stock = items.reduce((sum, variant) => sum + toUnits(variant.stock), 0);
  const prices = items.map((variant) => toMoney(variant.price)).filter((price) => price > 0);

  return {
    stock,
    price: prices.length > 0 ? Math.min(...prices) : 0,
    count: items.length
  };
};

const cleanVariantForSubmit = (variant) => {
  const cleanVariant = {
    name: String(variant.name || '').trim(),
    price: toMoney(variant.price),
    purchasePrice: toMoney(variant.purchasePrice),
    stock: toUnits(variant.stock),
    minStock: toUnits(variant.minStock, 5),
    sku: String(variant.sku || '').trim(),
    barcode: String(variant.barcode || '').trim(),
    image: variant.image || variant.images?.[0]?.url || ''
  };

  if (isValidObjectId(variant._id)) {
    cleanVariant._id = variant._id;
  }

  return cleanVariant;
};

export default function ProductForm({ product, categories, onSuccess, onCancel }) {
  const { notify } = useNotification();
  const [hasVariants, setHasVariants] = useState(Boolean(product?.hasVariants));
  const [variants, setVariants] = useState(product?.variants || []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [brands, setBrands] = useState([]);
  const [suppliers, setSuppliers] = useState([]);

  const [showBrandModal, setShowBrandModal] = useState(false);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [quickData, setQuickData] = useState({ name: '', phone: '' });

  const [formData, setFormData] = useState({
    name: product?.name || '',
    description: product?.description || '',
    brandId: getId(product?.brandId),
    supplierId: getId(product?.supplierId),
    categoryId: getId(product?.categoryId),
    images: product?.images || [],
    thumbnail: product?.thumbnail || '',
    sku: product?.sku || '',
    barcode: product?.barcode || '',
    price: product?.price ?? '',
    purchasePrice: product?.purchasePrice ?? '',
    stock: product?.stock ?? '',
    minStock: product?.minStock ?? 5
  });

  const variantTotals = useMemo(() => getVariantTotals(variants), [variants]);

  useEffect(() => {
    loadReferences();
  }, []);

  const loadReferences = async () => {
    try {
      const [bData, sData] = await Promise.all([getBrands(), getSuppliers()]);
      setBrands(bData.brands || bData);
      setSuppliers(sData.suppliers || sData);
    } catch (e) {
      console.error('Error cargando referencias:', e);
    }
  };

  const handleSaveBrand = async (e) => {
    e.preventDefault();
    if (!quickData.name.trim()) return;
    try {
      const newBrand = await createBrand({ name: quickData.name.trim() });
      setBrands((current) => [...current, newBrand]);
      setFormData((current) => ({ ...current, brandId: newBrand._id }));
      setShowBrandModal(false);
      setQuickData({ name: '', phone: '' });
      notify('Marca creada correctamente', 'success');
    } catch (e) {
      notify('Error al crear marca', 'error');
    }
  };

  const handleSaveSupplier = async (e) => {
    e.preventDefault();
    if (!quickData.name.trim()) return;
    try {
      const newSupplier = await createSupplier({ name: quickData.name.trim(), phone: quickData.phone.trim() });
      setSuppliers((current) => [...current, newSupplier]);
      setFormData((current) => ({ ...current, supplierId: newSupplier._id }));
      setShowSupplierModal(false);
      setQuickData({ name: '', phone: '' });
      notify('Proveedor creado correctamente', 'success');
    } catch (e) {
      notify('Error al crear proveedor', 'error');
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const handleImagesChange = (images) => {
    setFormData((current) => ({
      ...current,
      images,
      thumbnail: images.length > 0 ? images[0].url : ''
    }));
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      return 'Ingresa el nombre del producto';
    }

    if (hasVariants) {
      if (variants.length === 0) return 'Agrega al menos una variante';

      const cleanedVariants = variants.map(cleanVariantForSubmit);
      const invalidIndex = cleanedVariants.findIndex((variant) => !variant.name);
      if (invalidIndex >= 0) return `La variante ${invalidIndex + 1} necesita nombre`;

      const missingPriceIndex = variants.findIndex((variant) => variant.price === '' || variant.price === null || variant.price === undefined);
      if (missingPriceIndex >= 0) return `La variante ${missingPriceIndex + 1} necesita precio`;

      return '';
    }

    if (formData.price === '' || toMoney(formData.price) <= 0) {
      return 'Ingresa el precio de venta';
    }

    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationMessage = validateForm();
    if (validationMessage) {
      setError(validationMessage);
      notify(validationMessage, 'warning');
      return;
    }

    setLoading(true);
    setError('');

    const cleanedVariants = hasVariants ? variants.map(cleanVariantForSubmit) : [];
    const totals = getVariantTotals(cleanedVariants);
    const firstVariantImage = cleanedVariants.find((variant) => variant.image)?.image || '';

    const submitData = {
      ...formData,
      name: formData.name.trim(),
      description: formData.description.trim(),
      price: hasVariants ? totals.price : toMoney(formData.price),
      purchasePrice: toMoney(formData.purchasePrice),
      stock: hasVariants ? totals.stock : toUnits(formData.stock),
      minStock: toUnits(formData.minStock, 5),
      brandId: formData.brandId || null,
      supplierId: formData.supplierId || null,
      categoryId: formData.categoryId || null,
      thumbnail: formData.thumbnail || firstVariantImage,
      hasVariants,
      variants: cleanedVariants
    };

    if (!submitData.barcode || !submitData.barcode.trim()) delete submitData.barcode;
    if (!submitData.sku || !submitData.sku.trim()) delete submitData.sku;

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
      {error && (
        <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-2xl border border-red-100 text-sm font-bold">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-2 gap-2 rounded-2xl border border-gray-100 bg-gray-50 p-1.5 shadow-inner">
          <button
            type="button"
            onClick={() => setHasVariants(false)}
            className={`rounded-xl px-4 py-3 text-sm font-black transition-all ${!hasVariants ? 'bg-white text-green-700 shadow-md shadow-green-100' : 'text-gray-500 hover:text-gray-800'}`}
          >
            Producto simple
          </button>
          <button
            type="button"
            onClick={() => setHasVariants(true)}
            className={`rounded-xl px-4 py-3 text-sm font-black transition-all ${hasVariants ? 'bg-white text-green-700 shadow-md shadow-green-100' : 'text-gray-500 hover:text-gray-800'}`}
          >
            Con variantes
          </button>
        </div>

        <section className="space-y-4 rounded-[2rem] border border-gray-100 bg-gray-50/70 p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Nombre del producto *" name="name" value={formData.name} onChange={handleChange} required />
            <Input label="SKU automatico" name="sku" value={formData.sku} disabled className="bg-gray-50 font-mono" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descripcion</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              className="input resize-none rounded-2xl bg-white"
              placeholder="Detalle breve para identificar el producto"
            />
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-4 rounded-[2rem] border border-gray-100 bg-white p-5 shadow-sm">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <span className="flex items-center justify-between gap-3">
                Marca
                <button type="button" onClick={() => setShowBrandModal(true)} className="text-green-600 hover:text-green-700 font-bold text-xs">
                  + Nueva
                </button>
              </span>
            </label>
            <select name="brandId" value={formData.brandId} onChange={handleChange} className={selectClass}>
              <option value="">Sin marca</option>
              {brands.map((brand) => <option key={brand._id} value={brand._id}>{brand.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <span className="flex items-center justify-between gap-3">
                Proveedor
                <button type="button" onClick={() => setShowSupplierModal(true)} className="text-green-600 hover:text-green-700 font-bold text-xs">
                  + Nuevo
                </button>
              </span>
            </label>
            <select name="supplierId" value={formData.supplierId} onChange={handleChange} className={selectClass}>
              <option value="">Sin proveedor</option>
              {suppliers.map((supplier) => <option key={supplier._id} value={supplier._id}>{supplier.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
            <select name="categoryId" value={formData.categoryId} onChange={handleChange} className={selectClass}>
              <option value="">Sin categoria</option>
              {categories.map((category) => <option key={category._id} value={category._id}>{category.name}</option>)}
            </select>
          </div>
        </section>

        <section className="space-y-3 rounded-[2rem] border border-gray-100 bg-gray-50 p-5 shadow-inner">
          <div>
            <h4 className="font-black text-gray-800 uppercase tracking-tighter">Fotos del producto</h4>
          </div>
          <MultiImageUpload
            onImagesChange={handleImagesChange}
            initialImages={formData.images}
            maxImages={5}
          />
        </section>

        {!hasVariants ? (
          <section className="rounded-[2rem] border border-gray-100 bg-gray-50 p-5 shadow-inner">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <Input label="Precio compra" name="purchasePrice" type="number" min="0" step="0.01" value={formData.purchasePrice} onChange={handleChange} />
              <Input label="Precio venta *" name="price" type="number" min="0" step="0.01" value={formData.price} onChange={handleChange} required />
              <Input label="Stock inicial" name="stock" type="number" min="0" value={formData.stock} onChange={handleChange} disabled={!!product} className={product ? 'bg-gray-100' : ''} />
              <Input label="Stock minimo" name="minStock" type="number" min="0" value={formData.minStock} onChange={handleChange} />
              <Input label="Codigo barras" name="barcode" value={formData.barcode} disabled className="bg-gray-100 font-mono" />
            </div>
          </section>
        ) : (
          <section className="space-y-4">
            <div className="grid grid-cols-3 gap-3 rounded-[2rem] border border-green-100 bg-green-50 p-4 text-center shadow-inner">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-green-700">Variantes</p>
                <p className="text-2xl font-black text-gray-900">{variantTotals.count}</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-green-700">Stock total</p>
                <p className="text-2xl font-black text-gray-900">{variantTotals.stock}</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-green-700">Desde</p>
                <p className="text-2xl font-black text-gray-900">Q{variantTotals.price.toLocaleString()}</p>
              </div>
            </div>

            <VariantManager variants={variants} onChange={setVariants} parentSku={formData.sku} />
          </section>
        )}

        <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t">
          <Button type="submit" variant="primary" loading={loading} className="flex-1 bg-green-600 shadow-xl shadow-green-100 h-14 rounded-2xl font-black">
            {product ? 'Actualizar producto' : 'Guardar producto'}
          </Button>
          <Button type="button" variant="ghost" onClick={onCancel} className="flex-1 h-14 rounded-2xl font-bold">
            Cancelar
          </Button>
        </div>
      </form>

      {showBrandModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-[2rem] p-6 w-full max-w-sm shadow-2xl animate-scale-in">
            <h4 className="text-xl font-black text-gray-800 mb-4 uppercase tracking-tighter">Nueva marca</h4>
            <form onSubmit={handleSaveBrand} className="space-y-4">
              <Input
                label="Nombre de la marca"
                autoFocus
                value={quickData.name}
                onChange={(e) => setQuickData({ ...quickData, name: e.target.value })}
                placeholder="Ej: Faber Castell"
              />
              <div className="flex gap-2 pt-2">
                <Button type="submit" variant="primary" className="flex-1 bg-green-600 h-12 rounded-2xl font-bold">Crear</Button>
                <Button type="button" variant="ghost" onClick={() => setShowBrandModal(false)} className="flex-1 h-12 rounded-2xl font-bold">Cancelar</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showSupplierModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-[2rem] p-6 w-full max-w-sm shadow-2xl animate-scale-in">
            <h4 className="text-xl font-black text-gray-800 mb-4 uppercase tracking-tighter">Nuevo proveedor</h4>
            <form onSubmit={handleSaveSupplier} className="space-y-4">
              <Input
                label="Empresa"
                autoFocus
                value={quickData.name}
                onChange={(e) => setQuickData({ ...quickData, name: e.target.value })}
                placeholder="Nombre de la distribuidora"
              />
              <Input
                label="Telefono opcional"
                value={quickData.phone}
                onChange={(e) => setQuickData({ ...quickData, phone: e.target.value })}
                placeholder="5555-5555"
              />
              <div className="flex gap-2 pt-2">
                <Button type="submit" variant="primary" className="flex-1 bg-green-600 h-12 rounded-2xl font-bold">Crear</Button>
                <Button type="button" variant="ghost" onClick={() => setShowSupplierModal(false)} className="flex-1 h-12 rounded-2xl font-bold">Cancelar</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
