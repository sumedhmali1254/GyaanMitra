import React from 'react';
import ReactDOM from 'react-dom';
import './ConfirmationModal.css';

const ConfirmationModal = ({ 
  show, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  confirmText = "Confirm", 
  cancelText = "Cancel",
  type = "primary" // primary, danger, warning
}) => {
  if (!show) return null;

  const modalContent = (
    <div className="custom-modal-overlay">
      <div className="custom-modal-container animate-slide-up">
        <button className="modal-close-fab" onClick={onClose} aria-label="Close modal" style={{ border: 'none' }}>
          <i className="bi bi-x-lg" style={{ fontSize: '1.2rem' }}></i>
        </button>
        <div className="custom-modal-header border-0 pb-0">
          <div 
             className={`modal-icon-circle bg-${type === 'danger' ? 'danger' : type === 'warning' ? 'warning' : 'primary'}-subtle text-${type === 'danger' ? 'danger' : type === 'warning' ? 'warning' : 'primary'} mb-4`}
             style={{ width: '56px', height: '56px', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}
          >
            {type === 'danger' && <i className="bi bi-exclamation-triangle-fill"></i>}
            {type === 'warning' && <i className="bi bi-exclamation-circle-fill"></i>}
            {type === 'primary' && <i className="bi bi-info-circle-fill"></i>}
          </div>
          <h4 className="modal-title fw-bold text-dark-emphasis w-100 text-center px-4">
            {title}
          </h4>
        </div>
        <div className="custom-modal-body text-center pt-0 px-4">
          <p className="text-muted mb-0" style={{ fontSize: '1rem', lineHeight: '1.6' }}>{message}</p>
        </div>
        <div className="custom-modal-footer border-0 pt-0 pb-4 d-flex justify-content-center gap-3">
          <button 
            className="btn btn-secondary-custom shadow-none" 
            onClick={onClose}
            style={{ borderRadius: '14px', padding: '0.75rem 1.5rem', fontWeight: '600', minWidth: '120px' }}
          >
            {cancelText}
          </button>
          <button 
            className={`btn btn-${type}-custom shadow-sm`} 
            onClick={async () => {
              const shouldClose = await onConfirm();
              if (shouldClose !== false) onClose();
            }}
            style={{ borderRadius: '14px', padding: '0.75rem 1.5rem', fontWeight: '700', minWidth: '120px' }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(modalContent, document.body);
};

export default ConfirmationModal;
