import { useState } from 'react';
import Button from '../../core/components/UI/Button';
import Input from '../../core/components/UI/Input';
import MultiImageUpload from '../../../shared/components/upload/MultiImageUpload';
import ConfirmModal from '../../core/components/UI/ConfirmModal';

const getVariantKey = (variant) => variant._id || variant.tempId || variant.id;

const getNumberValue = (value) => {
  if (value === '' || value === null || value === undefined) return '';
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : '';
};

const getMoneyValue = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
};

const getUnitsValue = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : 0;
};

const createBarcode = () => {
  const now = Date.now();
  const timestamp = now.toString().slice(-7);
  const random = Math.floor(10000 + Math.random() * 90000).toString();
  return timestamp + random;
};

const createBlankVariant = (parentSku, nextIndex) => ({
  tempId: `variant-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  name: '',
  sku: parentSku ? `${parentSku}-${String(nextIndex).padStart(2, '0')}` : '',
  price: '',
  purchasePrice: '',
  stock: '',
  minStock: 5,
  barcode: createBarcode(),
  image: '',
  images: []
});

export default function VariantManager({ variants, onChange, parentSku }) {
  const [expandedVariant, setExpandedVariant] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState({ open: false, id: null });

  const toggleExpand = (variantId) => {
    setExpandedVariant(expandedVariant === variantId ? null : variantId);
  };

  const addVariant = () => {
    const newVariant = createBlankVariant(parentSku, variants.length + 1);
    onChange([...variants, newVariant]);
    setExpandedVariant(getVariantKey(newVariant));
  };

  const updateVariant = (id, field, value) => {
    onChange(variants.map((variant) => (
      getVariantKey(variant) === id ? { ...variant, [field]: value } : variant
    )));
  };

  const updateNumberVariant = (id, field, value, integer = false) => {
    const cleanValue = value === '' ? '' : (integer ? getUnitsValue(value) : getNumberValue(value));
    updateVariant(id, field, cleanValue);
  };

  const updateVariantImage = (id, images) => {
    onChange(variants.map((variant) => (
      getVariantKey(variant) === id
        ? { ...variant, images, image: images[0]?.url || '' }
        : variant
    )));
  };

  const handleConfirmDelete = () => {
    const id = confirmDelete.id;
    onChange(variants.filter((variant) => getVariantKey(variant) !== id));
    setConfirmDelete({ open: false, id: null });
  };

  if (variants.length === 0) {
    return (
      <div className="text-center py-10 rounded-[2rem] border-2 border-dashed border-gray-200 bg-gray-50">
        <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-white shadow-sm flex items-center justify-center text-green-600 font-black">
          +
        </div>
        <p className="text-gray-500 mb-4 font-bold">Aun no hay variantes agregadas</p>
        <Button
          variant="outline"
          onClick={addVariant}
          className="border-green-600 text-green-600 hover:bg-green-50 rounded-2xl font-bold"
        >
          + Agregar primera variante
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-5 bg-green-500 rounded-full"></span>
          <h4 className="font-black text-gray-800 uppercase tracking-tighter">Variantes del producto</h4>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={addVariant}
          className="border-green-600 text-green-600 hover:bg-green-50 rounded-xl font-bold"
        >
          + Agregar variante
        </Button>
      </div>

      <div className="space-y-3">
        {variants.map((variant, index) => {
          const vId = getVariantKey(variant);
          const price = getMoneyValue(variant.price);
          const stock = getUnitsValue(variant.stock);
          const isIncomplete = !String(variant.name || '').trim() || variant.price === '';

          return (
            <div key={vId} className={`border rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all ${isIncomplete ? 'border-yellow-200 bg-yellow-50/20' : 'border-gray-100 bg-white'}`}>
              <button
                type="button"
                onClick={() => toggleExpand(vId)}
                className="w-full px-4 py-3 bg-white hover:bg-gray-50 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 text-left transition"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 bg-gradient-to-r from-green-100 to-green-200 rounded-2xl flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                    {variant.image ? (
                      <img src={variant.image} alt={variant.name || 'Variante'} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs font-black text-green-700">{index + 1}</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-gray-800 truncate">{variant.name || `Variante ${index + 1}`}</p>
                    <p className="text-[10px] text-gray-400 font-mono truncate">SKU: {variant.sku || 'automatico'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 sm:gap-3">
                  {isIncomplete && <span className="text-[10px] px-2 py-1 rounded-full bg-yellow-100 text-yellow-700 font-black uppercase">Pendiente</span>}
                  <span className="text-sm font-black text-green-600">Q{price.toLocaleString()}</span>
                  <span className={`text-xs px-2 py-1 rounded-full font-bold ${stock > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    Stock: {stock}
                  </span>
                  <svg className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${expandedVariant === vId ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              {expandedVariant === vId && (
                <div className="p-5 space-y-4 border-t border-gray-100 bg-gray-50/80">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Input
                      label="Nombre de la variante *"
                      value={variant.name || ''}
                      onChange={(e) => updateVariant(vId, 'name', e.target.value)}
                      placeholder="Ej: Rojo, Talla M, Edicion pasta dura"
                      required
                    />

                    <Input
                      label="SKU"
                      value={variant.sku || ''}
                      onChange={(e) => updateVariant(vId, 'sku', e.target.value)}
                      placeholder="Automatico si se deja vacio"
                    />
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Input
                      label="Precio venta *"
                      type="number"
                      min="0"
                      step="0.01"
                      value={variant.price ?? ''}
                      onChange={(e) => updateNumberVariant(vId, 'price', e.target.value)}
                      placeholder="0.00"
                      required
                    />

                    <Input
                      label="Precio compra"
                      type="number"
                      min="0"
                      step="0.01"
                      value={variant.purchasePrice ?? ''}
                      onChange={(e) => updateNumberVariant(vId, 'purchasePrice', e.target.value)}
                      placeholder="0.00"
                    />

                    <Input
                      label="Stock inicial"
                      type="number"
                      min="0"
                      value={variant.stock ?? ''}
                      onChange={(e) => updateNumberVariant(vId, 'stock', e.target.value, true)}
                      placeholder="0"
                    />

                    <Input
                      label="Stock minimo"
                      type="number"
                      min="0"
                      value={variant.minStock ?? 5}
                      onChange={(e) => updateNumberVariant(vId, 'minStock', e.target.value, true)}
                      placeholder="5"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Input
                      label="Codigo de barras"
                      value={variant.barcode || ''}
                      onChange={(e) => updateVariant(vId, 'barcode', e.target.value)}
                      placeholder="Automatico si se deja vacio"
                    />

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Imagen de la variante</label>
                      <MultiImageUpload
                        onImagesChange={(images) => updateVariantImage(vId, images)}
                        initialImages={variant.images || (variant.image ? [{ url: variant.image, file: null }] : [])}
                        label="Subir imagen"
                        maxImages={1}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => setConfirmDelete({ open: true, id: vId })}
                      className="bg-red-50 text-red-600 hover:bg-red-100 border-none rounded-xl font-bold"
                    >
                      Eliminar variante
                    </Button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <ConfirmModal
        isOpen={confirmDelete.open}
        onClose={() => setConfirmDelete({ open: false, id: null })}
        onConfirm={handleConfirmDelete}
        title="Eliminar variante"
        message="Se eliminara la configuracion de esta variante."
        confirmText="Si, eliminar"
        type="danger"
      />
    </div>
  );
}
