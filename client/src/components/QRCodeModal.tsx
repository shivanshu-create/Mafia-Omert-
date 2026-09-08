import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Copy, Check, QrCode } from 'lucide-react';
import { buildJoinUrl } from '../utils/config';

interface QRCodeModalProps {
  roomCode: string;
  joinUrl?: string;
  isOpen: boolean;
  onClose: () => void;
}

export const QRCodeModal: React.FC<QRCodeModalProps> = ({ roomCode, joinUrl, isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const effectiveJoinUrl = joinUrl || buildJoinUrl(roomCode);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(effectiveJoinUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 font-mono">
      <div className="relative w-full max-w-sm bg-[#101216] hud-cut border border-[#fcee0a] p-6 shadow-[0_0_35px_rgba(0,0,0,0.95)] animate-hud-modal-snap">
        {/* Top Hazard Stripe */}
        <div className="h-1.5 w-full bg-[#fcee0a] hud-hazard-yellow mb-4" />

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3.5 right-3.5 p-1.5 text-[#7d8799] hover:text-[#fcee0a]"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2.5 mb-2">
          <QrCode className="w-5 h-5 text-[#fcee0a]" />
          <h3 className="font-bold text-lg text-white uppercase tracking-wider">[ SCAN TO JOIN ]</h3>
        </div>

        <p className="text-xs text-[#7d8799] mb-5 leading-relaxed">
          Scan with your phone's camera to join the room instantly.
        </p>

        {/* QR Code Container - Keep clean white surface for optimal camera scanning */}
        <div className="flex justify-center p-4 bg-white border-2 border-[#fcee0a] mb-5">
          <QRCodeSVG
            value={effectiveJoinUrl}
            size={200}
            level="H"
            includeMargin={false}
          />
        </div>

        {/* Room Code Callout */}
        <div className="text-center mb-5">
          <div className="text-[10px] uppercase tracking-wider text-[#7d8799] font-bold mb-1.5">ROOM CODE:</div>
          <div className="font-mono text-2xl font-bold tracking-widest text-[#fcee0a] bg-[#08090b] py-2 px-6 border border-[#fcee0a]/50 inline-block shadow-sm">
            {roomCode}
          </div>
        </div>

        {/* Copy Link button */}
        <button
          onClick={handleCopy}
          className="hud-btn hud-btn-primary w-full flex items-center justify-center gap-2 py-2.5 px-4 text-xs"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-black" />
              <span>[ LINK COPIED ]</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4 text-black" />
              <span>[ COPY JOIN LINK ]</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
