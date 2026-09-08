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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
    >
      <div className="relative w-full max-w-sm bg-white border-2 border-black rounded-none p-5 shadow-none text-left">
        {/* Dismiss X button */}
        <button
          type="button"
          onClick={onCancel}
          disabled={isConfirming}
          className="absolute top-3 right-3 p-1 rounded-none text-black hover:bg-[#800000] hover:text-white border border-black disabled:opacity-50"
          title="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Warning Icon & Category */}
        <div className="flex items-center gap-2 mb-2">
          <div className="w-6 h-6 bg-[#800000] text-white border border-black flex items-center justify-center shrink-0">
            <AlertTriangle className="w-3.5 h-3.5" />
          </div>
          <span className="text-[10px] font-mono uppercase font-bold tracking-wider text-[#800000]">
            Moderator Confirmation
          </span>
        </div>

        {/* Dialog Title */}
        <h3
          id="confirm-modal-title"
          className="font-mono font-black text-lg text-black uppercase tracking-wide mb-2"
        >
          {title}
        </h3>

        {/* Dialog Description */}
        {message && (
          <div className="text-xs text-stone-700 font-mono mb-5 leading-relaxed">
            {message}
          </div>
        )}

        {/* Action Buttons: Cancel and Confirm */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t-2 border-black">
          <button
            type="button"
            onClick={onCancel}
            disabled={isConfirming}
            className="retro-btn retro-btn-secondary w-full py-2 px-3 text-xs font-mono font-bold uppercase tracking-wider disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isConfirming}
            className={`retro-btn w-full py-2 px-3 text-xs font-mono font-black uppercase tracking-wider transition-none ${
              confirmVariant === 'danger'
                ? 'bg-[#800000] hover:bg-[#660000] text-white'
                : confirmVariant === 'warning'
                ? 'bg-amber-300 hover:bg-amber-400 text-black'
                : 'bg-black hover:bg-stone-800 text-white'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isConfirming ? 'Processing...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
