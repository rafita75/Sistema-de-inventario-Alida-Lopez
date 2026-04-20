// client/src/modules/admin/pages/VariantManager.jsx
import { useState } from 'react';
import Button from '../../core/components/UI/Button';
import Input from '../../core/components/UI/Input';
import MultiImageUpload from '../../../shared/components/upload/MultiImageUpload';
import ConfirmModal from '../../core/components/UI/ConfirmModal';

export default function VariantManager({ variants, onChange, parentSku }) {
  const [expandedVariant, setExpandedVariant] = useState(null);
  
  // Estados para Confirmación
  const [confirmDelete, setConfirmDelete] = useState({ open: false, id: null });

  const toggleExpand = (variantId) => {
    setExpandedVariant(expandedVariant === variantId ? null : variantId);
  };

  const addVariant = () => {
    // Usamos _id para consistencia con MongoDB
    const now = Date.now();
    const newId = `new-${now}`;
    const newSku = parentSku ? `${parentSku}-${String(variants.length + 1).padStart(2, '0')}` : '';
    
    // Generar código de barras numérico (igual que en el backend)
    const vTimestamp = now.toString().slice(-7);
    const vRandom = Math.floor(10000 + Math.random() * 90000).toString();
    const newBarcode = vTimestamp + vRandom;

    const newVariant = {
      _id: newId,
      name: '',
      sku: newSku,
      price: 0,
      purchasePrice: 0,
      stock: 0,
      barcode: newBarcode,
      image: '',
      images: [],
      attributes: {}
    };
    onChange([...variants, newVariant]);
    setExpandedVariant(newId);
  };

  const updateVariant = (id, field, value) => {
    const updatedVariants = variants.map(variant =>
      (variant._id === id || variant.id === id) ? { ...variant, [field]: value } : variant
    );
    onChange(updatedVariants);
  };

  const updateVariantImage = (id, images) => {
    const updatedVariants = variants.map(variant =>
      (variant._id === id || variant.id === id) ? { ...variant, images: images, image: images[0]?.url || '' } : variant
    );
    onChange(updatedVariants);
  };

  const handleConfirmDelete = () => {
    const id = confirmDelete.id;
    onChange(variants.filter(variant => variant._id !== id && variant.id !== id));
    setConfirmDelete({ open: false, id: null });
  };

  if (variants.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-4xl mb-3 text-gray-300">🎨</div>
        <p className="text-gray-400 mb-4">No hay variantes agregadas</p>
        <Button 
          variant="outline" 
          onClick={addVariant}
          className="border-green-600 text-green-600 hover:bg-green-50"
        >
          + Agregar Primera Variante
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h4 className="font-medium text-gray-800 flex items-center gap-2">
          <span className="w-1 h-4 bg-green-600 rounded-full"></span>
          Variantes del producto
        </h4>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={addVariant}
          className="border-green-600 text-green-600 hover:bg-green-50"
        >
          + Agregar Variante
        </Button>
      </div>

      <div className="space-y-3">
        {variants.map((variant) => {
          const vId = variant._id || variant.id;
          return (
            <div key={vId} className="border border-gray-100 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all">
              {/* Header de la variante */}
              <div
                onClick={() => toggleExpand(vId)}
                className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 flex justify-between items-center cursor-pointer transition"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-green-100 to-green-200 rounded-lg flex items-center justify-center">
                    {variant.image ? (
                      <img src={variant.image} alt={variant.name} className="w-8 h-8 object-cover rounded-lg" />
                    ) : (
                      <span className="text-green-600 text-sm">🎨</span>
                    )}
                  </div>
                  <span className="font-medium text-gray-800">
                    {variant.name || 'Nueva variante'}
                  </span>
                  {variant.sku && (
                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                      SKU: {variant.sku}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-green-600">Q{variant.price || 0}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${variant.stock > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    Stock: {variant.stock || 0}
                  </span>
                  <svg className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${expandedVariant === vId ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              {/* Contenido expandido */}
              {expandedVariant === vId && (
                <div className="p-4 space-y-3 border-t border-gray-100 bg-white">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Input
                      label="Nombre de la variante"
                      value={variant.name}
                      onChange={(e) => updateVariant(vId, 'name', e.target.value)}
                      placeholder="Ej: Rojo, Talla M, 64GB"
                      icon="🎨"
                    />
                    
                    <Input
                      label="SKU"
                      value={variant.sku}
                      onChange={(e) => updateVariant(vId, 'sku', e.target.value)}
                      placeholder="Código único"
                      icon="🔢"
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Input
                      label="Precio"
                      type="number"
                      value={variant.price}
                      onChange={(e) => updateVariant(vId, 'price', parseFloat(e.target.value))}
                      placeholder="0.00"
                      icon="💰"
                    />
                    
                    <Input
                      label="Stock"
                      type="number"
                      value={variant.stock}
                      onChange={(e) => updateVariant(vId, 'stock', parseInt(e.target.value))}
                      placeholder="0"
                      icon="📊"
                      disabled={true}
                      className="bg-gray-50 cursor-not-allowed"
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <Input
                      label="Precio de compra"
                      type="number"
                      value={variant.purchasePrice}
                      onChange={(e) => updateVariant(vId, 'purchasePrice', parseFloat(e.target.value))}
                      placeholder="0.00"
                      icon="📥"
                    />
                    
                    <Input
                      label="Código de barras"
                      value={variant.barcode}
                      onChange={(e) => updateVariant(vId, 'barcode', e.target.value)}
                      placeholder="Código de barras"
                      icon="📷"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Imagen de la variante
                    </label>
                    <MultiImageUpload
                      onImagesChange={(images) => updateVariantImage(vId, images)}
                      initialImages={variant.images || (variant.image ? [{ url: variant.image, file: null }] : [])}
                      label="Subir imagen"
                      maxImages={1}
                    />
                  </div>
                  
                  <div className="flex justify-end pt-2">
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => setConfirmDelete({ open: true, id: vId })}
                      className="bg-red-50 text-red-600 hover:bg-red-100 border-none"
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
      
      {/* Mensaje de ayuda */}
      {variants.length > 0 && (
        <div className="mt-4 p-3 bg-green-50 rounded-xl text-xs text-green-700 text-center">
          💡 Las variantes permiten manejar diferentes tallas, colores o versiones del mismo producto.
        </div>
      )}

      <ConfirmModal
        isOpen={confirmDelete.open}
        onClose={() => setConfirmDelete({ open: false, id: null })}
        onConfirm={handleConfirmDelete}
        title="¿Eliminar Variante?"
        message="Se eliminará la configuración de esta variante. No afectará al producto principal."
        confirmText="Sí, eliminar"
        type="danger"
      />
    </div>
  );
}
