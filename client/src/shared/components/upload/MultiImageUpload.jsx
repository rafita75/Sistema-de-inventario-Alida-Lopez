// client/src/shared/components/upload/MultiImageUpload.jsx
import { useState } from 'react';
import Button from '../../../modules/core/components/UI/Button';

export default function MultiImageUpload({ onImagesChange, initialImages = [], label = 'Subir imágenes' }) {
  const [uploading, setUploading] = useState(false);
  const [images, setImages] = useState(initialImages);
  const [error, setError] = useState('');

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    // Validar archivos
    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        setError('Solo se permiten imágenes');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError('Las imágenes no pueden superar los 5MB');
        return;
      }
    }

    setUploading(true);
    setError('');

    const newImages = [...images];
    
    for (const file of files) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET);

      try {
        const response = await fetch(
          `https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload`,
          { method: 'POST', body: formData }
        );
        const data = await response.json();
        
        if (data.secure_url) {
          newImages.push({
            url: data.secure_url,
            alt: '',
            order: newImages.length
          });
        }
      } catch (error) {
        console.error('Error subiendo imagen:', error);
        setError('Error al subir una o más imágenes');
      }
    }

    setImages(newImages);
    onImagesChange(newImages);
    setUploading(false);
    e.target.value = ''; // Limpiar input
  };

  const handleRemove = (index) => {
    const newImages = images.filter((_, i) => i !== index);
    // Reordenar
    const reordered = newImages.map((img, idx) => ({ ...img, order: idx }));
    setImages(reordered);
    onImagesChange(reordered);
  };

  const handleSetAsMain = (index) => {
    const newImages = [...images];
    const [selected] = newImages.splice(index, 1);
    newImages.unshift(selected);
    const reordered = newImages.map((img, idx) => ({ ...img, order: idx }));
    setImages(reordered);
    onImagesChange(reordered);
  };

  return (
    <div className="space-y-4">
      {/* Grid de imágenes */}
      {images.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
          {images.map((img, idx) => (
            <div key={idx} className="relative group">
              <div className="relative">
                <img
                  src={img.url}
                  alt={img.alt || `Imagen ${idx + 1}`}
                  className="w-full aspect-square object-cover rounded-xl border-2 transition-all duration-200"
                  style={{
                    borderColor: idx === 0 ? '#3b82f6' : '#e5e7eb'
                  }}
                />
                {idx === 0 && (
                  <span className="absolute top-1 left-1 bg-primary-600 text-white text-xs rounded-full px-1.5 py-0.5 shadow-soft">
                    Principal
                  </span>
                )}
              </div>
              
              {/* Botones flotantes */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center gap-1">
                {idx !== 0 && (
                  <button
                    type="button"
                    onClick={() => handleSetAsMain(idx)}
                    className="p-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
                    title="Establecer como principal"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleRemove(idx)}
                  className="p-1 bg-red-500 text-white rounded hover:bg-red-600 transition"
                  title="Eliminar"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Botón de subida */}
      <div className="flex items-center gap-3 flex-wrap">
        <label className="cursor-pointer">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={uploading}
            className="relative"
          >
            {uploading ? (
              <span className="flex items-center gap-1">
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Subiendo...
              </span>
            ) : (
              `📷 ${label}`
            )}
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleUpload}
              className="absolute inset-0 opacity-0 cursor-pointer"
              disabled={uploading}
            />
          </Button>
        </label>
        
        {error && (
          <p className="text-sm text-red-500">{error}</p>
        )}
      </div>
      
      <p className="text-xs text-gray-400">
        💡 Puedes subir múltiples imágenes. La primera será la miniatura. 
        Arrastra para reordenar o haz clic en "★" para establecer una como principal.
      </p>
    </div>
  );
}
