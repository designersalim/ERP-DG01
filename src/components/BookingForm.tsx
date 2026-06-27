/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Booking, SizeEntry } from '../types';
import AutocompleteInput from './AutocompleteInput';
import { Trash, Plus, FileText, CheckCircle, RefreshCcw, Save, Copy } from 'lucide-react';
import { COMPANY_PROFILE } from '../data';

interface BookingFormProps {
  editingBooking: Booking | null;
  onSaveBooking: (booking: Booking) => void;
  onCancel: () => void;
  prevGarments: string[];
  prevBuyers: string[];
  prevPos: string[];
  prevStyles: string[];
  prevAddresses: string[];
}

export default function BookingForm({
  editingBooking,
  onSaveBooking,
  onCancel,
  prevGarments,
  prevBuyers,
  prevPos,
  prevStyles,
  prevAddresses
}: BookingFormProps) {
  const [factoryName, setFactoryName] = useState('');
  const [buyerName, setBuyerName] = useState('');
  const [poNumber, setPoNumber] = useState('');
  const [itemName, setItemName] = useState('');
  const [ref, setRef] = useState('');
  const [unit, setUnit] = useState<'Pcs' | 'Dzn' | 'Set' | 'Yds' | 'Roll' | 'Cone' | 'Kg' | 'Mtr' | 'Ctn'>('Pcs');
  const [unitPrice, setUnitPrice] = useState<number>(0);
  const [details, setDetails] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');

  // Standard sizes list (XS to 6XL)
  const standardSizesList = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL', '5XL', '6XL'];

  // Multiple Styles with corresponding size breakdowns state
  const ALL_UNITS = ['Pcs', 'Dzn', 'Set', 'Yds', 'Roll', 'Cone', 'Kg', 'Mtr', 'Ctn'];

  const [styles, setStyles] = useState<{
    id: string;
    styleNumber: string;
    sizeWise: boolean;
    sizeMode: 'standard' | 'manual';
    standardSizes: Record<string, number>;
    manualSizes: SizeEntry[];
    flatQuantity: number;
    sizeUnit: string;
  }[]>([]);

  // Handle setting initial values if editing
  useEffect(() => {
    if (editingBooking) {
      setFactoryName(editingBooking.factoryName || '');
      setBuyerName(editingBooking.buyerName || '');
      setPoNumber(editingBooking.poNumber || '');
      setItemName(editingBooking.itemName || '');
      setRef(editingBooking.ref || '');
      setUnit(editingBooking.unit || 'Pcs');
      setUnitPrice(editingBooking.unitPrice || 0);
      setDetails(editingBooking.details || '');
      setDeliveryAddress(editingBooking.deliveryAddress || '');

      if (editingBooking.styleBreakdowns && editingBooking.styleBreakdowns.length > 0) {
        setStyles(editingBooking.styleBreakdowns.map(sb => {
          const isStandard = sb.sizes.every(s => standardSizesList.includes(s.size)) && sb.sizes.length > 0;
          const stdMap = standardSizesList.reduce((acc, curr) => ({ ...acc, [curr]: 0 }), {} as Record<string, number>);
          if (isStandard) {
            sb.sizes.forEach(s => {
              stdMap[s.size] = s.quantity;
            });
          }
          return {
            id: sb.id || `sb-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            styleNumber: sb.styleNumber || '',
            color: sb.color || '',
            sizeWise: sb.sizeWise || false,
            sizeMode: isStandard ? 'standard' : 'manual',
            standardSizes: stdMap,
            manualSizes: isStandard ? [{ size: '', quantity: 0 }] : (sb.sizes.length > 0 ? sb.sizes : [{ size: '', quantity: 0 }]),
            flatQuantity: sb.quantity || 0,
            sizeUnit: (sb as any).sizeUnit || 'Pcs'
          };
        }));
      } else {
        // Backwards compatibility with single style info
        const isStandard = editingBooking.sizes.every(s => standardSizesList.includes(s.size)) &&
                           editingBooking.sizes.length > 0;
        const stdMap = standardSizesList.reduce((acc, curr) => ({ ...acc, [curr]: 0 }), {} as Record<string, number>);
        if (isStandard) {
          editingBooking.sizes.forEach(s => {
            stdMap[s.size] = s.quantity;
          });
        }
        setStyles([{
          id: `sb-1`,
          styleNumber: editingBooking.styleNumber || '',
          color: '',
          sizeWise: editingBooking.sizeWise || false,
          sizeMode: isStandard ? 'standard' : 'manual',
          standardSizes: stdMap,
          manualSizes: isStandard ? [{ size: '', quantity: 0 }] : (editingBooking.sizes.length > 0 ? editingBooking.sizes : [{ size: '', quantity: 0 }]),
          flatQuantity: editingBooking.quantity || 0,
          sizeUnit: 'Pcs'
        }]);
      }
    } else {
      // Defaults for new booking
      setFactoryName('');
      setBuyerName('');
      setPoNumber('');
      setItemName('');
      setRef('');
      setUnit('Pcs');
      setUnitPrice(0);
      setDetails('');
      setDeliveryAddress('');
      setStyles([{
        id: `sb-init`,
        styleNumber: '',
        color: '',
        sizeWise: false,
        sizeMode: 'standard',
        standardSizes: standardSizesList.reduce((acc, curr) => ({ ...acc, [curr]: 0 }), {}),
        manualSizes: [{ size: '', quantity: 0 }],
        flatQuantity: 0,
        sizeUnit: 'Pcs'
      }]);
    }
  }, [editingBooking]);

  const addStyleRow = () => {
    setStyles(prev => [...prev, {
      id: `sb-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      styleNumber: '',
      color: '',
      sizeWise: false,
      sizeMode: 'standard',
      standardSizes: standardSizesList.reduce((acc, curr) => ({ ...acc, [curr]: 0 }), {}),
      manualSizes: [{ size: '', quantity: 0 }],
      flatQuantity: 0,
      sizeUnit: 'Pcs'
    }]);
  };

  const removeStyleRow = (idx: number) => {
    if (styles.length === 1) {
      alert("You need at least one style breakdown entry.");
      return;
    }
    setStyles(prev => prev.filter((_, i) => i !== idx));
  };

  const duplicateStyleRow = (idx: number) => {
    setStyles(prev => {
      const source = prev[idx];
      const clone = {
        ...source,
        id: `sb-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        standardSizes: { ...source.standardSizes },
        manualSizes: source.manualSizes.map(sz => ({ ...sz }))
      };
      const updated = [...prev];
      updated.splice(idx + 1, 0, clone);
      return updated;
    });
  };

  const updateStyleField = (idx: number, field: string, value: any) => {
    setStyles(prev => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s));
  };

  const updateStyleStandardSize = (styleIdx: number, size: string, val: string) => {
    const qty = parseFloat(val) || 0;
    setStyles(prev => prev.map((s, i) => i === styleIdx ? {
      ...s,
      standardSizes: { ...s.standardSizes, [size]: qty >= 0 ? qty : 0 }
    } : s));
  };

  const updateStyleManualSizeField = (styleIdx: number, sizeIdx: number, field: 'size' | 'quantity', val: string) => {
    setStyles(prev => prev.map((s, i) => {
      if (i === styleIdx) {
        const manual = [...s.manualSizes];
        if (field === 'size') {
          manual[sizeIdx].size = val;
        } else {
          manual[sizeIdx].quantity = Math.max(0, parseFloat(val) || 0);
        }
        return { ...s, manualSizes: manual };
      }
      return s;
    }));
  };

  const addStyleManualSizeRow = (styleIdx: number) => {
    setStyles(prev => prev.map((s, i) => i === styleIdx ? {
      ...s,
      manualSizes: [...s.manualSizes, { size: '', quantity: 0 }]
    } : s));
  };

  const removeStyleManualSizeRow = (styleIdx: number, sizeIdx: number) => {
    setStyles(prev => prev.map((s, i) => {
      if (i === styleIdx) {
        const manual = s.manualSizes.filter((_, idx) => idx !== sizeIdx);
        return {
          ...s,
          manualSizes: manual.length > 0 ? manual : [{ size: '', quantity: 0 }]
        };
      }
      return s;
    }));
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!factoryName || !poNumber || !itemName || !buyerName) {
      alert("Please fill in all mandatory fields (*).");
      return;
    }

    // Compile active styles breakdowns
    const compiledBreakdowns = styles.map(s => {
      let compiledSizes: SizeEntry[] = [];
      if (s.sizeWise) {
        if (s.sizeMode === 'standard') {
          compiledSizes = Object.entries(s.standardSizes)
            .filter(([_, qty]) => Number(qty) > 0)
            .map(([size, quantity]) => ({ size, quantity: Number(quantity) }));
        } else {
          compiledSizes = s.manualSizes.filter(sz => sz.size.trim() !== '' && sz.quantity > 0);
        }
      }
      return {
        id: s.id,
        styleNumber: s.styleNumber.trim(),
        color: s.color.trim(),
        sizeWise: s.sizeWise,
        sizes: compiledSizes,
        quantity: s.sizeWise ? undefined : Number(s.flatQuantity),
        sizeUnit: s.sizeUnit || 'Pcs'
      };
    });

    // Compute aggregate characteristics for backward-compatibility
    const hasAnySizes = compiledBreakdowns.some(b => b.sizeWise);
    const aggregatedSizesMap: Record<string, number> = {};
    
    compiledBreakdowns.forEach(b => {
      if (b.sizeWise) {
        b.sizes.forEach(sz => {
          aggregatedSizesMap[sz.size] = (aggregatedSizesMap[sz.size] || 0) + sz.quantity;
        });
      }
    });

    const compiledSizes: SizeEntry[] = Object.entries(aggregatedSizesMap)
      .map(([size, quantity]) => ({ size, quantity }));

    const overallStyleNum = compiledBreakdowns.map(b => b.styleNumber).filter(Boolean).join(', ');
    const overallQty = compiledBreakdowns.reduce((sum, b) => {
      if (b.sizeWise) {
        return sum + b.sizes.reduce((sh, sz) => sh + sz.quantity, 0);
      } else {
        return sum + (b.quantity || 0);
      }
    }, 0);

    const savedBooking: Booking = {
      id: editingBooking ? editingBooking.id : `bk-${Date.now()}`,
      factoryName: factoryName.trim(),
      buyerName: buyerName.trim(),
      poNumber: poNumber.trim(),
      styleNumber: overallStyleNum,
      itemName: itemName.trim(),
      ref: ref.trim(),
      unit,
      unitPrice: Number(unitPrice),
      details: details.trim(),
      sizeWise: hasAnySizes,
      sizes: compiledSizes,
      quantity: hasAnySizes ? undefined : overallQty,
      styleBreakdowns: compiledBreakdowns,
      deliveryAddress: deliveryAddress.trim(),
      status: editingBooking ? editingBooking.status || 'Pending' : 'Pending',
      createdAt: editingBooking ? editingBooking.createdAt : new Date().toISOString()
    };

    onSaveBooking(savedBooking);
  };

  return (
    <form onSubmit={handleFormSubmit} className="space-y-6" id="booking-entry-form">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-5">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-600" />
            {editingBooking ? `Edit Booking Entry` : 'New Booking Entry'}
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Create order booking. Values will automatically sync with Delivery Challans and PIs.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium text-xs uppercase tracking-wider rounded-lg transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 px-5 py-2 bg-emerald-600 active:bg-emerald-700 hover:bg-emerald-500 text-white font-medium text-xs uppercase tracking-wider rounded-lg shadow-sm transition-colors cursor-pointer"
          >
            <Save className="w-4 h-4" />
            {editingBooking ? 'Update Booking' : 'Save Booking'}
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {/* Core details card (Full Width) */}
        <div className="bg-white border border-gray-150 rounded-xl p-5 shadow-2xs space-y-4">
          <h3 className="text-sm font-bold text-gray-800 border-b border-gray-100 pb-2 uppercase tracking-wide">
            1. Booking Essentials
          </h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <AutocompleteInput
              id="garments-name"
              label="Garments / Factory Name"
              value={factoryName}
              onChange={setFactoryName}
              options={prevGarments}
              placeholder="Type or select Garments factory"
              required
            />

            <AutocompleteInput
              id="buyer-name"
              label="Buyer Name"
              value={buyerName}
              onChange={setBuyerName}
              options={prevBuyers}
              placeholder="Type or select Buyer"
              required
            />

            <AutocompleteInput
              id="po-number"
              label="PO Number"
              value={poNumber}
              onChange={setPoNumber}
              options={prevPos}
              placeholder="Type or select PO #"
              required
            />

            <div>
              <label htmlFor="item-name" className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                Product / Item Name *
              </label>
              <input
                id="item-name"
                type="text"
                required
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                placeholder="e.g. Woven Label, Printed Care Label"
                className="w-full px-3.5 py-2 text-sm bg-white border border-gray-300 rounded-lg shadow-2xs focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-hidden"
              />
            </div>

            <div>
              <label htmlFor="ref-no" className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                Reference / Ref. No
              </label>
              <input
                id="ref-no"
                type="text"
                value={ref}
                onChange={(e) => setRef(e.target.value)}
                placeholder="e.g. Ref-Zara-44"
                className="w-full px-3.5 py-2 text-sm bg-white border border-gray-300 rounded-lg shadow-2xs focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-hidden"
              />
            </div>

            <div>
              <label htmlFor="unit-select" className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                Unit of Measurement *
              </label>
              <select
                id="unit-select"
                value={unit}
                onChange={(e) => setUnit(e.target.value as any)}
                className="w-full px-3.5 py-2 text-sm bg-white border border-gray-300 rounded-lg shadow-2xs focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-hidden"
              >
                <option value="Pcs">Pcs (Pieces)</option>
                <option value="Dzn">Dzn (Dozen)</option>
                <option value="Set">Set</option>
                <option value="Yds">Yds (Yards)</option>
                <option value="Roll">Roll</option>
                <option value="Cone">Cone</option>
                <option value="Kg">Kg (Kilogram)</option>
                <option value="Mtr">Mtr (Metre)</option>
                <option value="Ctn">Ctn (Carton)</option>
              </select>
            </div>

            <div>
              <label htmlFor="unit-price" className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                Unit Price (USD / Unit) *
              </label>
              <input
                id="unit-price"
                type="number"
                step="0.0001"
                required
                min="0"
                value={unitPrice}
                onChange={(e) => setUnitPrice(Math.max(0, parseFloat(e.target.value) || 0))}
                placeholder="e.g. 0.12"
                className="w-full px-3.5 py-2 text-sm bg-white border border-gray-300 rounded-lg shadow-2xs focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-hidden"
              />
            </div>

            <div className="sm:col-span-2">
              <AutocompleteInput
                id="delivery-address"
                label="Delivery Address"
                value={deliveryAddress}
                onChange={setDeliveryAddress}
                options={prevAddresses}
                placeholder="Type or select Factory Delivery Location"
              />
            </div>
          </div>

          <div>
            <label htmlFor="booking-details" className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
              Item Details or Special Remarks
            </label>
            <textarea
              id="booking-details"
              rows={2}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Add quality specs, dimensions, base substrates..."
              className="w-full px-3.5 py-2 text-sm bg-white border border-gray-300 rounded-lg shadow-2xs focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-hidden"
            />
          </div>
        </div>

        {/* Styles & Sizing Matrix block (Full Width) */}
        <div className="bg-white border border-gray-150 rounded-xl p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-2">
            <div>
              <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wide">
                2. Styles &amp; Sizing Breakdown Matrix
              </h3>
              <p className="text-[11px] text-gray-400 mt-0.5">
                Configure multiple garment styles and their corresponding size quantities under this single item.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {styles.map((style, sIdx) => (
              <div 
                key={style.id} 
                className="border border-gray-200 rounded-xl p-4 bg-slate-50/20 shadow-3xs space-y-4 relative"
              >
                <div className="flex items-center justify-between gap-4 border-b border-dashed border-gray-150 pb-2">
                  <span className="text-xs font-black text-slate-500 uppercase tracking-widest bg-slate-100 px-2 py-0.5 rounded-sm">
                    Style Breakdown Row #{sIdx + 1}
                  </span>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => duplicateStyleRow(sIdx)}
                      className="text-indigo-500 hover:text-indigo-700 font-bold uppercase tracking-wider text-[10px] flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <Copy className="w-3.5 h-3.5" /> Duplicate Style
                    </button>
                    {styles.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeStyleRow(sIdx)}
                        className="text-red-500 hover:text-red-600 font-bold uppercase tracking-wider text-[10px] flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <Trash className="w-3.5 h-3.5" /> Remove Style Row
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-start">
                  {/* Style number spec */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider">Style Number *</label>
                    <input
                      type="text"
                      required
                      value={style.styleNumber}
                      onChange={(e) => updateStyleField(sIdx, 'styleNumber', e.target.value)}
                      placeholder="e.g. STYLE-9021"
                      className="w-full px-3 py-2 text-xs bg-white border border-gray-300 rounded-lg shadow-2xs focus:ring-1 focus:ring-emerald-500 outline-hidden font-mono"
                    />
                  </div>

                  {/* Color input for the style breakdown */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider">Color (রঙ)</label>
                    <input
                      type="text"
                      value={style.color || ''}
                      onChange={(e) => updateStyleField(sIdx, 'color', e.target.value)}
                      placeholder="e.g. Red, Black, DTM..."
                      className="w-full px-3 py-2 text-xs bg-white border border-gray-300 rounded-lg shadow-2xs focus:ring-1 focus:ring-emerald-500 outline-hidden font-bold text-indigo-700"
                    />
                  </div>

                  {/* Sizing entry category select */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider">Quantity Entry Mode</label>
                    <div className="grid grid-cols-3 gap-1 bg-gray-100 p-0.5 rounded-md">
                      <button
                        type="button"
                        onClick={() => updateStyleField(sIdx, 'sizeWise', false)}
                        className={`py-1 text-[9.5px] font-black rounded-sm uppercase tracking-wide transition-all ${
                          !style.sizeWise 
                            ? 'bg-white text-emerald-800 shadow-3xs' 
                            : 'text-gray-500 hover:text-gray-850'
                        }`}
                      >
                        Flat Qty
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          updateStyleField(sIdx, 'sizeWise', true);
                          updateStyleField(sIdx, 'sizeMode', 'standard');
                        }}
                        className={`py-1 text-[9.5px] font-black rounded-sm uppercase tracking-wide transition-all ${
                          style.sizeWise && style.sizeMode === 'standard' 
                            ? 'bg-white text-emerald-800 shadow-3xs' 
                            : 'text-gray-500 hover:text-gray-850'
                        }`}
                      >
                        Standard
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          updateStyleField(sIdx, 'sizeWise', true);
                          updateStyleField(sIdx, 'sizeMode', 'manual');
                        }}
                        className={`py-1 text-[9.5px] font-black rounded-sm uppercase tracking-wide transition-all ${
                          style.sizeWise && style.sizeMode === 'manual' 
                            ? 'bg-white text-emerald-800 shadow-3xs' 
                            : 'text-gray-500 hover:text-gray-850'
                        }`}
                      >
                        Manual
                      </button>
                    </div>
                  </div>

                  {/* Dynamic inputs based on Mode */}
                  <div className="md:col-span-1">
                    {!style.sizeWise ? (
                      <div className="space-y-1">
                        <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider">
                          Flat Quantity ({unit}) *
                        </label>
                        <div className="relative flex items-center">
                          <input
                            type="number"
                            step="any"
                            required
                            min="0"
                            value={style.flatQuantity || ''}
                            onChange={(e) => updateStyleField(sIdx, 'flatQuantity', Math.max(0, parseFloat(e.target.value) || 0))}
                            placeholder="Flat quantity"
                            className="w-full px-3 py-2 text-xs bg-white border border-gray-300 rounded-lg shadow-2xs focus:ring-1 focus:ring-emerald-500 font-mono"
                          />
                          <span className="absolute right-3 text-[10px] text-gray-400 font-black uppercase pointer-events-none">{unit}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-emerald-50/40 border border-emerald-100 rounded-lg p-2 text-center">
                        <span className="text-[10px] font-bold text-emerald-800 uppercase active:scale-95 block">
                          Sizes Configured
                        </span>
                        <p className="text-[9px] text-emerald-600 mt-0.5 leading-tight font-medium">
                          Fill sizes below in the detailed dropdown matrix block.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Sizing blocks rendering */}
                {style.sizeWise && (
                  <div className="border-t border-dashed border-gray-150 pt-3 space-y-3">
                    {/* Size Input Unit selector */}
                    <div className="flex items-center gap-3">
                      <label className="text-[10px] font-bold text-gray-600 uppercase tracking-wider whitespace-nowrap">
                        Size Input Unit:
                      </label>
                      <select
                        value={style.sizeUnit}
                        onChange={(e) => updateStyleField(sIdx, 'sizeUnit', e.target.value)}
                        className="px-2 py-1 text-xs bg-white border border-indigo-300 rounded-lg shadow-2xs focus:ring-1 focus:ring-indigo-400 outline-hidden font-bold text-indigo-700"
                      >
                        {ALL_UNITS.map(u => (
                          <option key={u} value={u}>{u}</option>
                        ))}
                      </select>
                      {style.sizeUnit !== unit && (
                        <span className="text-[9px] bg-amber-50 border border-amber-200 text-amber-700 font-bold px-2 py-0.5 rounded-full">
                          Price Unit: {unit} → PI will convert {style.sizeUnit}→{unit}
                        </span>
                      )}
                    </div>

                    {style.sizeMode === 'standard' ? (
                      <div className="space-y-2">
                        <p className="text-[10px] text-gray-500 font-medium italic">
                          Standard Size Grid (XS-6XL) - Quantities in <strong>{style.sizeUnit}</strong>:
                        </p>
                        <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-5 md:grid-cols-10 gap-2">
                          {standardSizesList.map((sz) => (
                            <div 
                              key={sz} 
                              className="bg-white border border-gray-200 p-1.5 rounded-lg text-center shadow-3xs flex flex-col gap-1"
                            >
                              <span className="text-[10px] font-black text-gray-600">{sz}</span>
                              <div className="relative flex items-center">
                                <input
                                  type="number"
                                  step="any"
                                  min="0"
                                  value={style.standardSizes[sz] || ''}
                                  onChange={(e) => updateStyleStandardSize(sIdx, sz, e.target.value)}
                                  placeholder="0"
                                  className="w-full text-center py-0.5 text-xs border border-gray-300 rounded-md focus:ring-1 focus:ring-emerald-500 font-mono"
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2 bg-white border border-gray-200 rounded-lg p-3">
                        <p className="text-[10px] text-gray-500 font-medium italic mb-1.5">
                          Custom size tags and respective quantities in <strong>{style.sizeUnit}</strong>:
                        </p>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 max-h-48 overflow-y-auto pr-1">
                          {style.manualSizes.map((row, rIdx) => (
                            <div key={rIdx} className="flex items-center gap-1.5 bg-slate-50 border border-slate-150 p-1.5 rounded-md">
                              <input
                                type="text"
                                value={row.size}
                                onChange={(e) => updateStyleManualSizeField(sIdx, rIdx, 'size', e.target.value)}
                                placeholder="Size Tag"
                                className="w-[50%] p-1 text-xs border border-gray-300 rounded bg-white font-bold"
                              />
                              <div className="relative w-[50%] flex items-center">
                                <input
                                  type="number"
                                  step="any"
                                  min="0"
                                  value={row.quantity || ''}
                                  onChange={(e) => updateStyleManualSizeField(sIdx, rIdx, 'quantity', e.target.value)}
                                  placeholder="Qty"
                                  className="w-full pr-5 pl-1 py-1 text-xs border border-gray-300 rounded bg-white font-mono font-bold text-right"
                                />
                                <span className="absolute right-1 text-[8.5px] text-gray-400 font-bold uppercase">{style.sizeUnit}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => removeStyleManualSizeRow(sIdx, rIdx)}
                                className="text-gray-400 hover:text-red-500 p-1 cursor-pointer transition-colors"
                              >
                                <Trash className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                        
                        <div className="pt-1.5">
                          <button
                            type="button"
                            onClick={() => addStyleManualSizeRow(sIdx)}
                            className="inline-flex items-center gap-1 text-[10.5px] font-black text-emerald-600 hover:text-emerald-700 uppercase transition-colors cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" /> Add Custom Size Dimension
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}

            <button
              type="button"
              onClick={addStyleRow}
              className="w-full py-2 bg-neutral-900 hover:bg-neutral-800 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
            >
              <Plus className="w-4 h-4" /> Insert Additional Style Row Breakdown
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
