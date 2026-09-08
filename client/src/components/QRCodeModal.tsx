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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75">
      <div className="relative w-full max-w-sm bg-white border-2 border-black rounded-none p-5 shadow-none">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1 rounded-none text-black hover:bg-[#800000] hover:text-white border border-black"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2 mb-2">
          <QrCode className="w-5 h-5 text-[#800000]" />
          <h3 className="font-mono font-black text-lg text-black uppercase">Scan to Join</h3>
        </div>

        <p className="text-xs text-stone-600 mb-4 font-mono">
          Have players point their phone cameras at this QR code to join instantly.
        </p>

        {/* QR Code Container */}
        <div className="flex justify-center p-3 bg-white border-2 border-black rounded-none mb-4">
          <QRCodeSVG
            value={effectiveJoinUrl}
            size={200}
            level="H"
            includeMargin={true}
          />
        </div>

        {/* Room Code Callout */}
        <div className="text-center mb-4">
          <div className="text-[10px] uppercase font-mono font-bold text-stone-600 mb-1">Room Code</div>
          <div className="font-mono text-2xl font-black tracking-widest text-black bg-[#f4f4f4] py-1.5 px-4 rounded-none border-2 border-black inline-block">
            {roomCode}
          </div>
        </div>

        {/* Copy Link button */}
        <button
          onClick={handleCopy}
          className="retro-btn-primary w-full flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-mono font-black uppercase tracking-wider"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-white" />
              <span>Link Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4 text-white" />
              <span>Copy Join Link</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
