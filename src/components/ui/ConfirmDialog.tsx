import React from 'react';
import { TriangleAlert, X } from 'lucide-react';
import { createPortal } from 'react-dom';

export const ConfirmDialog: React.FC<{
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ open, title, description, confirmLabel = 'Confirm', danger, onConfirm, onCancel }) => {
  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={title}>
      <button className="absolute inset-0 bg-navy-950/40" onClick={onCancel} aria-label="Close dialog" />
      <div className="relative w-[min(92vw,400px)] rounded-xl border border-cv-line bg-cv-surface p-5 shadow-cv-3">
        <button
          onClick={onCancel}
          className="absolute right-3 top-3 rounded p-1 text-navy-300 hover:bg-navy-50 hover:text-navy-600"
          aria-label="Close"
        >
          <X size={16} aria-hidden="true" />
        </button>
        <div className="flex items-start gap-3">
          <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${danger ? 'bg-red-50 text-red-700' : 'bg-navy-100 text-navy-700'}`}>
            <TriangleAlert size={17} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h3 className="text-[14px] font-semibold text-navy-900">{title}</h3>
            {description && <p className="subtitle mt-1">{description}</p>}
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onCancel} className="btn btn-secondary">
            Cancel
          </button>
          <button onClick={onConfirm} className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} autoFocus>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};