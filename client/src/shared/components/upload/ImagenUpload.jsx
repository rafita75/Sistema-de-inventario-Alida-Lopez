// client/src/shared/components/upload/ImageUpload.jsx
import { useState } from 'react';
import Button from '../../../modules/core/components/UI/Button';

export default function ImageUpload({ onUpload, currentImage, label = 'Subir imagen' }) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(currentImage);
  const [error, setError] = useState('');

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      setError('Solo se permiten imágenes');
      return;
    }

    // Validar tamaño (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('La imagen no puede superar los 5MB');
      return;
    }

    setUploading(true);
    setError('');
    
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
        setPreview(data.secure_url);
        onUpload(data.secure_url);
      } else {
        setError('Error al subir la imagen');
      }
    } catch (error) {
      console.error('Error subiendo imagen:', error);
      setError('Error de conexión');
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    setPreview('');
    onUpload('');
  };

  return (
    <div className="space-y-3">
      {preview && (
        <div className="relative inline-block">
          <img 
            src={preview} 
            alt="Vista previa" 
            className="w-32 h-32 object-cover rounded-xl border-2 border-gray-200"
          />
          <button
            type="button"
            onClick={handleRemove}
            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
          >
            ✕
          </button>
        </div>
      )}
      
      <div className="flex items-center gap-3">
        <label className="cursor-pointer">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={uploading}
            className="relative"
          >
            {uploading ? 'Subiendo...' : `📷 ${label}`}
            <input
              type="file"
              accept="image/*"
              onChange={handleUpload}
              className="absolute inset-0 opacity-0 cursor-pointer"
              disabled={uploading}
            />
          </Button>
        </label>
        
        {preview && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleRemove}
          >
            Eliminar
          </Button>
        )}
      </div>
      
      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}
      
      <p className="text-xs text-gray-400">
        Formatos soportados: JPG, PNG, GIF. Máximo 5MB.
      </p>
    </div>
  );
}