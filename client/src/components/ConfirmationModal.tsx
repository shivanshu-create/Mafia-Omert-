import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

export interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message?: React.ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  confirmVariant?: 'danger' | 'warning' | 'primary';
  isConfirming?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  title,
  message,
  confirmLabel,
  cancelLabel = 'Cancel',
  confirmVariant = 'danger',
  isConfirming = false,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 font-mono"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
    >
      <div className="relative w-full max-w-sm bg-[#101216] border border-[#ff003c] hud-cut p-5 sm:p-6 shadow-[0_0_35px_rgba(255,0,60,0.25)] text-left animate-hud-modal-snap space-y-4">
        {/* Dismiss X button */}
        <button
          type="button"
          onClick={onCancel}
          disabled={isConfirming}
          className="absolute top-4 right-4 p-1.5 text-[#7d8799] hover:text-white disabled:opacity-50"
          title="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Warning Icon & Category */}
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-[#ff003c]/20 border border-[#ff003c] text-[#ff003c] flex items-center justify-center shrink-0">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <span className="text-[10px] uppercase font-bold tracking-wider text-[#ff003c]">
            CONFIRM ACTION
          </span>
        </div>

        {/* Dialog Title */}
        <h3
          id="confirm-modal-title"
          className="font-bold text-base text-white tracking-wider uppercase"
        >
          {title}
        </h3>

        {/* Dialog Description */}
        {message && (
          <div className="text-xs text-stone-300 leading-relaxed font-mono">
            {message}
          </div>
        )}

        {/* Action Buttons: Cancel and Confirm */}
        <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-[#fcee0a]/20">
          <button
            type="button"
            onClick={onCancel}
            disabled={isConfirming}
            className="hud-btn hud-btn-secondary w-full py-2.5 px-3 text-xs disabled:opacity-50"
          >
            [ {cancelLabel.toUpperCase()} ]
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isConfirming}
            className={`w-full py-2.5 px-3 text-xs font-bold uppercase tracking-wider transition-none ${
              confirmVariant === 'danger'
                ? 'hud-btn hud-btn-danger'
                : 'hud-btn hud-btn-primary'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isConfirming ? '[ PLEASE WAIT... ]' : `[ ${confirmLabel.toUpperCase()} ]`}
          </button>
        </div>
      </div>
    </div>
  );
};
