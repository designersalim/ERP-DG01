/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

export default function AcoolaLogo({ className = "h-16" }: { className?: string }) {
  return (
    <svg viewBox="0 0 1020 250" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Logo Mark Icon Group */}
      <g transform="translate(10, 10)">
        {/* Left Green Leg of A */}
        <path d="M 15 200 L 95 25 L 115 25 L 35 200 Z" fill="#007d46" />
        
        {/* Central Red Accent diagonal */}
        <path d="M 68 200 L 105 120 L 123 120 L 86 200 Z" fill="#ed1c24" />

        {/* Right Green Connection leg swooping from peak into O */}
        <path d="M 95 25 L 140 115" stroke="#007d46" strokeWidth="18" strokeLinecap="round" />
        
        {/* The "O" Circle */}
        <circle cx="180" cy="115" r="55" stroke="#007d46" strokeWidth="18" fill="none" />
        
        {/* Small subtitle label under icon */}
        <text x="8" y="222" fill="#007d46" fontSize="10.5" fontWeight="900" fontFamily="system-ui, sans-serif" letterSpacing="0.2">ACOOLA TRIMS</text>
        <text x="103" y="222" fill="#ed1c24" fontSize="10.5" fontWeight="900" fontFamily="system-ui, sans-serif" letterSpacing="0.2">CORPORATION</text>
      </g>

      {/* Typography Group */}
      <g transform="translate(265, 0)">
        {/* English top level: "ACOOLA TRIMS" (Green) and "CORPORATION" (Red) */}
        <text x="0" y="105" fill="#007d46" fontSize="76" fontWeight="950" fontFamily='"Poppins", sans-serif' letterSpacing="-1">
          ACOOLA TRIMS
        </text>
        <text x="590" y="105" fill="#ed1c24" fontSize="76" fontWeight="950" fontFamily='"Poppins", sans-serif' letterSpacing="-1">
          CORPORATION
        </text>

        {/* Bengali bottom level: "এ্যাকুলা ট্রিমস" (Gray) and "কর্পোরেশন" (Green) */}
        <text x="12" y="196" fill="#525458" fontSize="78" fontWeight="800" fontFamily='"Noto Sans Bengali", "Inter", system-ui, sans-serif' letterSpacing="-0.5">
          এ্যাকুলা ট্রিমস
        </text>
        <text x="495" y="196" fill="#007d46" fontSize="78" fontWeight="800" fontFamily='"Noto Sans Bengali", "Inter", system-ui, sans-serif' letterSpacing="-0.5">
          কর্পোরেশন
        </text>
      </g>
    </svg>
  );
}
