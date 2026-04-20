// client/src/modules/core/components/UI/ConfirmModal.jsx
import React from 'react';
import Modal from './Modal';
import Button from './Button';

export default function ConfirmModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = '¿Estás seguro?', 
  message = 'Esta acción no se puede deshacer.',
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  type = 'danger',
  loading = false
}) {
  const getIcon = () => {
    switch (type) {
      case 'danger': return '⚠️';
      case 'warning': return '🟡';
      case 'info': return 'ℹ️';
      case 'success': return '✅';
      default: return '❓';
    }
  };

  const getConfirmButtonClass = () => {
    switch (type) {
      case 'danger': return 'bg-red-600 hover:bg-red-700 shadow-red-100';
      case 'warning': return 'bg-yellow-500 hover:bg-yellow-600 shadow-yellow-100';
      case 'info': return 'bg-blue-600 hover:bg-blue-700 shadow-blue-100';
      case 'success': return 'bg-green-600 hover:bg-green-700 shadow-green-100';
      default: return 'bg-gray-800 hover:bg-gray-900';
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="p-6 text-center">
        <div className="text-5xl mb-4 animate-bounce-short">{getIcon()}</div>
        <h3 className="text-xl font-bold text-gray-800 mb-2">{title}</h3>
        <p className="text-gray-500 mb-8">{message}</p>
        
        <div className="flex gap-3">
          <Button
            variant="ghost"
            onClick={onClose}
            className="flex-1"
            disabled={loading}
          >
            {cancelText}
          </Button>
          <Button
            variant="primary"
            onClick={onConfirm}
            loading={loading}
            className={`flex-1 font-bold shadow-lg ${getConfirmButtonClass()}`}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
