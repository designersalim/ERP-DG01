import React from 'react';

interface BarcodeProps {
  value: string;
  vertical?: boolean;
  height?: number; // width/height depending on layout
  barWidth?: number; // individual stripe thickness
  showText?: boolean;
}

export default function Barcode({
  value,
  vertical = false,
  height = 50,
  barWidth = 1.6,
  showText = true
}: BarcodeProps) {
  // Generates a beautiful, high-quality vector QR code image
  const encodedValue = encodeURIComponent(value);
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodedValue}`;

  return (
    <div className={`flex ${vertical ? 'flex-col' : 'flex-row'} items-center gap-1 inline-flex select-none`}>
      <img
        src={qrUrl}
        alt="System QR Code"
        className="w-12 h-12 border border-slate-205 p-0.5 rounded bg-white shadow-3xs"
        referrerPolicy="no-referrer"
      />
      {showText && (
        <span className="text-[7.5px] font-mono font-black text-slate-800 uppercase tracking-tight select-all">
          {value}
        </span>
      )}
    </div>
  );
}
