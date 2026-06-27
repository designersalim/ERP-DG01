/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Booking, BankDetails, DocumentItem, ProformaInvoice, DeliveryChallan, SizeEntry } from '../types';
import { COMPANY_PROFILE, DEFAULT_TERMS } from '../data';
import { FileText, Landmark, Scale, Plus, Trash, AlertTriangle, ShieldCheck, Check, Calendar, MapPin, Edit2, GripVertical, ArrowUp, ArrowDown } from 'lucide-react';

interface CreateDocumentProps {
  bookings: Booking[];
  docType: 'pi' | 'challan';
  allPis: ProformaInvoice[];
  allChallans: DeliveryChallan[];
  banks: BankDetails[];
  onGeneratePi: (pi: ProformaInvoice) => void;
  onGenerateChallan: (challan: DeliveryChallan) => void;
  onCancel: () => void;
}

export function getFactoryShortCode(name: string): string {
  if (!name) return 'ATC';
  const cleanName = name.trim().toLowerCase();
  
  // Custom exact overrides for specific user requests
  if (cleanName.includes('rupa')) return 'RPK';
  if (cleanName.includes('spark')) return 'SAK';
  if (cleanName.includes('standard')) return 'SGL';
  if (cleanName.includes('ha-meem') || cleanName.includes('hameem')) return 'HMA';
  if (cleanName.includes('pacific')) return 'PJL';
  
  // Generic word parser matching consonants
  const cleaned = name.replace(/[^a-zA-Z\s-]/g, '');
  const words = cleaned.split(/[\s-]+/).filter(w => w && !['ltd', 'limited', 'plc', 'corp', 'corporation', 'apparel', 'group', 'garments', 'textile', 'textiles', 'knit', 'wear', 'knitwear'].includes(w.toLowerCase()));

  if (words.length >= 3) {
    return (words[0][0] + words[1][0] + words[2][0]).toUpperCase();
  } else if (words.length === 2) {
    const first = words[0];
    const second = words[1];
    if (first.length >= 3) {
      const consonants = first.replace(/[aeiou]/gi, '');
      if (consonants.length >= 2) {
        return (consonants[0] + consonants[1] + second[0]).toUpperCase();
      }
      return (first[0] + first[first.length - 1] + second[0]).toUpperCase();
    }
    return (first[0] + second[0] + 'K').toUpperCase();
  } else if (words.length === 1 && words[0]) {
    const word = words[0];
    if (word.length >= 3) {
      return word.substring(0, 3).toUpperCase();
    }
    return word.padEnd(3, 'X').toUpperCase();
  }
  return 'ATC';
}

export default function CreateDocument({
  bookings,
  docType,
  allPis,
  allChallans,
  banks,
  onGeneratePi,
  onGenerateChallan,
  onCancel
}: CreateDocumentProps) {
  
  const factoryName = bookings[0]?.factoryName || 'Factory';
  
  // Buyer list and Ref list merged into single outputs
  const buyerNames = useMemo(() => {
    return Array.from(new Set(bookings.map(b => b.buyerName))).filter(Boolean);
  }, [bookings]);

  const refs = useMemo(() => {
    return Array.from(new Set(bookings.map(b => b.ref))).filter(Boolean);
  }, [bookings]);

  // Delivery addresses merged / suggested
  const deliveryAddressDefault = useMemo(() => {
    const addresses = Array.from(new Set(bookings.map(b => b.deliveryAddress))).filter(Boolean);
    return addresses[0] || '';
  }, [bookings]);

  // Document item states derived directly from bookings
  // This allows deleting and editing items before completing PI / Challan
  const [docItems, setDocItems] = useState<DocumentItem[]>([]);

  // State for item drag & drop reordering
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const [isGripMouseDown, setIsGripMouseDown] = useState<boolean>(false);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIdx(index);
    e.dataTransfer.setData('text/plain', index.toString());
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragOverIdx !== index) {
      setDragOverIdx(index);
    }
  };

  const handleDrop = (e: React.DragEvent, targetIdx: number) => {
    e.preventDefault();
    setDragOverIdx(null);
    if (draggedIdx === null || draggedIdx === targetIdx) return;

    const reorderedItems = [...docItems];
    const [removed] = reorderedItems.splice(draggedIdx, 1);
    reorderedItems.splice(targetIdx, 0, removed);

    setDocItems(reorderedItems);
    setDraggedIdx(null);
  };

  const handleDragEnd = () => {
    setDraggedIdx(null);
    setDragOverIdx(null);
    setIsGripMouseDown(false);
  };

  const moveItemUp = (index: number) => {
    if (index === 0) return;
    const reorderedItems = [...docItems];
    const temp = reorderedItems[index];
    reorderedItems[index] = reorderedItems[index - 1];
    reorderedItems[index - 1] = temp;
    setDocItems(reorderedItems);
  };

  const moveItemDown = (index: number) => {
    if (index === docItems.length - 1) return;
    const reorderedItems = [...docItems];
    const temp = reorderedItems[index];
    reorderedItems[index] = reorderedItems[index + 1];
    reorderedItems[index + 1] = temp;
    setDocItems(reorderedItems);
  };

  // Quick total calculations
  const grossSumQty = docItems.reduce((acc, curr) => acc + curr.totalQuantity, 0);
  const grossSumUSD = Math.round(docItems.reduce((acc, curr) => acc + (curr.totalQuantity * curr.unitPrice), 0) * 100) / 100;

  // Bank Account Selection (default to bank-1 if it exists)
  const [selectedBank, setSelectedBank] = useState<BankDetails>(
    banks.find(b => b.id === 'bank-1') || banks[0]
  );

  // Proforma Invoice details
  const [netWeight, setNetWeight] = useState('');
  const [grossWeight, setGrossWeight] = useState('');
  const [terms, setTerms] = useState<string[]>(DEFAULT_TERMS);
  const [newTerm, setNewTerm] = useState('');

  // Challan details
  const [deliveryAddress, setDeliveryAddress] = useState(deliveryAddressDefault);
  const [hsCode, setHsCode] = useState(COMPANY_PROFILE.defaultHsCode);

  // Warning tracking
  const [warnings, setWarnings] = useState<{ bookingId: string; msg: string; previousDocNo: string }[]>([]);
  const [warningBypass, setWarningBypass] = useState<Record<string, boolean>>({});

  // Document Numbering Engine
  const invoiceNoSuggestion = useMemo(() => {
    const code = getFactoryShortCode(factoryName);
    // Auto-increment globally based on the number of existing PIs, starting from 101
    const count = 101 + allPis.length;
    return `${code}-ATC-${count}`;
  }, [factoryName, allPis]);

  const challanNoSuggestion = useMemo(() => {
    // Parser for Buyer name: ZR-ATC-1002
    const buyerStr = buyerNames[0] || 'BY';
    const words = buyerStr.split(' ').filter(Boolean);
    const code = words.length >= 2 
      ? (words[0][0] + words[1][0]).toUpperCase() 
      : (buyerStr.length >= 2 ? buyerStr.substring(0, 2).toUpperCase() : buyerStr.substring(0, 1).toUpperCase() + 'X');
    
    // Auto-increment globally based on existing Automated Delivery Challans to ensure ATC and MTC run separate counters
    const autoChallansCount = allChallans.filter(ch => !ch.id.startsWith('m-') && !ch.challanNo.includes('-MTC-')).length;
    const count = 1001 + autoChallansCount;
    return `${code}-ATC-${count}`;
  }, [buyerNames, allChallans]);

  const [customDocNo, setCustomDocNo] = useState('');
  const [customDocDate, setCustomDocDate] = useState(() => new Date().toISOString().substring(0, 10));

  // Populate actual Suggestion when starting
  useEffect(() => {
    setCustomDocNo(docType === 'pi' ? invoiceNoSuggestion : challanNoSuggestion);
  }, [docType, invoiceNoSuggestion, challanNoSuggestion]);

  // Automatically calculate Net Weight and Gross Weight when total invoice value changes
  useEffect(() => {
    if (docType === 'pi' && grossSumUSD > 0) {
      const calculatedNet = grossSumUSD / 5.37;
      // Gross weight is minimum 20-60kg more than Net Weight. We use +40 kg.
      const calculatedGross = calculatedNet + 40;
      setNetWeight(`${calculatedNet.toFixed(2)} Kgs`);
      setGrossWeight(`${calculatedGross.toFixed(2)} Kgs`);
    }
  }, [grossSumUSD, docType]);

  // Populate document items state
  const bookingsKey = bookings.map(b => `${b.id}-${b.quantity}-${b.unitPrice}`).join(',');
  useEffect(() => {
    const items = bookings.map((bk) => {
      const needsConversion = bk.unit === 'Dzn';
      const sizesCopy = bk.sizeWise 
        ? bk.sizes.map(s => ({ 
            ...s, 
            quantity: needsConversion ? (Math.round((s.quantity / 12) * 1e10) / 1e10) : s.quantity 
          })) 
        : [];
      
      const totalQty = bk.sizeWise 
        ? sizesCopy.reduce((acc, curr) => acc + curr.quantity, 0) 
        : (needsConversion ? (Math.round(((bk.quantity || 0) / 12) * 1e10) / 1e10) : (bk.quantity || 0));

      return {
        id: `doc-item-${bk.id}-${Date.now()}`,
        bookingId: bk.id,
        poNumber: bk.poNumber,
        styleNumber: bk.styleNumber,
        itemName: bk.itemName,
        unit: bk.unit,
        unitPrice: bk.unitPrice,
        sizeWise: bk.sizeWise,
        sizes: sizesCopy,
        totalQuantity: totalQty,
        details: bk.details,
        styleBreakdowns: bk.styleBreakdowns ? bk.styleBreakdowns.map(sb => {
          const sbSizes = (sb.sizeWise && sb.sizes)
            ? sb.sizes.map(s => ({
                ...s,
                quantity: needsConversion ? (Math.round((s.quantity / 12) * 1e10) / 1e10) : s.quantity
              }))
            : [];
          const sbQty = sb.sizeWise
            ? sbSizes.reduce((acc, curr) => acc + curr.quantity, 0)
            : (needsConversion ? (Math.round(((sb.quantity || 0) / 12) * 1e10) / 1e10) : (sb.quantity || 0));
          return {
            ...sb,
            sizes: sbSizes,
            quantity: sbQty,
            sizeUnit: needsConversion ? 'Dzn' : (sb as any).sizeUnit
          };
        }) : undefined
      };
    });
    setDocItems(items);
  }, [bookingsKey]);

  // Scan for duplicate warning requirements
  useEffect(() => {
    const list: { bookingId: string; msg: string; previousDocNo: string }[] = [];
    docItems.forEach((item) => {
      // Find PI warning
      if (docType === 'pi') {
        const matchingPi = allPis.find(p => 
          p.items.some(piItem => 
            piItem.poNumber === item.poNumber && 
            piItem.styleNumber === item.styleNumber && 
            piItem.itemName === item.itemName
          )
        );
        if (matchingPi) {
          list.push({
            bookingId: item.bookingId,
            msg: `Item "${item.itemName}" of PO "${item.poNumber}" is already billed in PI #${matchingPi.invoiceNo}.`,
            previousDocNo: matchingPi.invoiceNo
          });
        }
      } else {
        // Find Challan warning
        const matchingChallan = allChallans.find(c => 
          c.items.some(chItem => 
            chItem.poNumber === item.poNumber && 
            chItem.styleNumber === item.styleNumber && 
            chItem.itemName === item.itemName
          )
        );
        if (matchingChallan) {
          list.push({
            bookingId: item.bookingId,
            msg: `Item "${item.itemName}" of PO "${item.poNumber}" was already dispatched in Delivery Challan #${matchingChallan.challanNo}.`,
            previousDocNo: matchingChallan.challanNo
          });
        }
      }
    });
    setWarnings(list);
  }, [docItems, docType, allPis, allChallans]);

  // Edit item quantity helpers
  const handleItemQuantityChange = (itemId: string, val: string) => {
    const numeric = Math.max(0, parseFloat(val) || 0);
    setDocItems(prev => prev.map(item => {
      if (item.id === itemId) {
        return {
          ...item,
          totalQuantity: numeric
        };
      }
      return item;
    }));
  };

  const handleItemSizeQuantityChange = (itemId: string, sizeName: string, val: string) => {
    const numeric = Math.max(0, parseFloat(val) || 0);
    setDocItems(prev => prev.map(item => {
      if (item.id === itemId) {
        const updatedSizes = item.sizes.map(s => {
          if (s.size === sizeName) {
            return { ...s, quantity: numeric };
          }
          return s;
        });
        const computedTotal = updatedSizes.reduce((sum, s) => sum + s.quantity, 0);
        return {
          ...item,
          sizes: updatedSizes,
          totalQuantity: computedTotal
        };
      }
      return item;
    }));
  };

  const handleRemoveItem = (itemId: string) => {
    if (docItems.length === 1) {
      alert("You cannot generate an document with empty items. Please add at least one booking.");
      return;
    }
    setDocItems(prev => prev.filter(i => i.id !== itemId));
  };

  // Term management helpers
  const handleAddTerm = () => {
    if (!newTerm.trim()) return;
    setTerms(prev => [...prev, newTerm.trim()]);
    setNewTerm('');
  };

  const handleRemoveTerm = (index: number) => {
    setTerms(prev => prev.filter((_, i) => i !== index));
  };

  const handleSaveDocument = (e: React.FormEvent) => {
    e.preventDefault();

    // Check warning bypass
    const unbypassed = warnings.filter(w => !warningBypass[w.bookingId]);
    if (unbypassed.length > 0) {
      alert("There are duplicate PO/Item warnings. Please confirm the bypass checkmark to authorize duplicate issuance.");
      return;
    }

    if (!customDocNo.trim()) {
      alert("Please provide a Document Number.");
      return;
    }

    // Comma-separated summaries
    const compositeBuyer = buyerNames.join(', ');
    const compositeRef = refs.join(', ');

    if (docType === 'pi') {
      const pi: ProformaInvoice = {
        id: `pi-${Date.now()}`,
        invoiceNo: customDocNo.trim(),
        factoryName,
        factoryAddress: deliveryAddressDefault,
        buyerName: compositeBuyer,
        ref: compositeRef,
        date: customDocDate, // user edited PI date
        bankDetails: selectedBank,
        items: docItems,
        netWeight: netWeight.trim() || "N/A",
        grossWeight: grossWeight.trim() || "N/A",
        hsCode,
        terms,
        createdAt: new Date().toISOString()
      };
      onGeneratePi(pi);
    } else {
      const challan: DeliveryChallan = {
        id: `ch-${Date.now()}`,
        challanNo: customDocNo.trim(),
        factoryName,
        buyerName: compositeBuyer,
        ref: compositeRef,
        date: customDocDate, // user edited Challan date
        deliveryAddress: deliveryAddress.trim() || factoryName,
        items: docItems,
        hsCode,
        status: 'Delivered', // Automatically marks as Delivered since it will be printed
        createdAt: new Date().toISOString()
      };
      onGenerateChallan(challan);
    }
  };

  return (
    <form onSubmit={handleSaveDocument} className="space-y-6" id="doc-generation-module">
      {/* Top Banner section */}
      <div className={`rounded-xl p-5 border shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 ${
        docType === 'pi' 
          ? 'bg-emerald-50/50 border-emerald-100 text-emerald-950' 
          : 'bg-gray-50 border-gray-200 text-gray-950'
      }`}>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <FileText className={`w-5 h-5 ${docType === 'pi' ? 'text-emerald-700' : 'text-gray-950'}`} />
            <span className="font-bold text-lg uppercase tracking-wider">
              {docType === 'pi' ? 'Proforma Invoice (PI) Builder' : 'Delivery Challan Builder'}
            </span>
          </div>
          <p className="text-xs text-gray-500">
            For Factory: <strong className="text-gray-800 font-bold">{factoryName}</strong> | 
            Buyers: <strong className="text-gray-800 font-semibold">{buyerNames.join(', ') || 'N/A'}</strong>
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 text-xs font-bold uppercase tracking-wider rounded-lg transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            className={`px-5 py-2 text-xs font-bold uppercase tracking-wider rounded-lg shadow-sm transition-colors cursor-pointer text-white ${
              docType === 'pi' 
                ? 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800' 
                : 'bg-black hover:bg-zinc-800 active:bg-zinc-900'
            }`}
          >
            Create {docType === 'pi' ? 'PI Document' : 'Delivery Challan'}
          </button>
        </div>
      </div>

      {/* Duplicate PO/Item warning banner */}
      {warnings.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3.5 shadow-xs">
          <div className="flex items-start gap-2 text-amber-800">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-sm">Duplicate Order Item Reference Warning</h4>
              <p className="text-xs text-amber-700 mt-0.5">
                One or more items in this selection have been previously used in other finalized documents.
              </p>
            </div>
          </div>
          <div className="divide-y divide-amber-100 bg-white rounded-lg border border-amber-100 divide-none pl-3 pr-3 text-xs space-y-2 py-2">
            {warnings.map((w, idx) => (
              <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 py-1.5 border-b border-amber-50 last:border-0">
                <p className="text-gray-700 text-[11px] font-medium leading-relaxed">{w.msg}</p>
                <div className="flex items-center gap-2 shrink-0">
                  <input
                    type="checkbox"
                    id={`bypass-${w.bookingId}`}
                    checked={!!warningBypass[w.bookingId]}
                    onChange={(e) => setWarningBypass(prev => ({
                      ...prev,
                      [w.bookingId]: e.target.checked
                    }))}
                    className="w-4 h-4 text-amber-600 border-amber-300 rounded-sm focus:ring-amber-500 cursor-pointer"
                  />
                  <label htmlFor={`bypass-${w.bookingId}`} className="text-[10px] font-bold text-amber-800 uppercase tracking-wide select-none cursor-pointer flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Authorized
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Basic Setup / Controls Card */}
      <div className="bg-white border border-gray-250 rounded-xl p-5 shadow-xs grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
            {docType === 'pi' ? 'Invoice NO' : 'Delivery Challan NO'}
          </label>
          <input
            type="text"
            required
            value={customDocNo}
            onChange={(e) => setCustomDocNo(e.target.value)}
            className="w-full px-3.5 py-2 font-mono text-sm uppercase bg-white border border-gray-300 rounded-lg shadow-xs focus:ring-2 focus:ring-emerald-500"
            placeholder={docType === 'pi' ? 'e.g. SGL-101' : 'e.g. ZR-ATC-1001'}
          />
          <p className="text-[10px] text-gray-400 mt-1 italic">
            Computed formula suggestion: {docType === 'pi' ? '3-character Factory code & sequence starting from 101' : 'Buyer initials + "-ATC-" + running index.'}
          </p>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
            HS Code
          </label>
          <input
            type="text"
            required
            value={hsCode}
            onChange={(e) => setHsCode(e.target.value)}
            className="w-full px-3.5 py-2 text-sm bg-white border border-gray-300 rounded-lg shadow-xs focus:ring-2 focus:ring-emerald-500"
            placeholder="e.g. 6217.10.00"
          />
        </div>

        {/* Date of Issue Info */}
        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
            Document Date
          </label>
          <div className="relative">
            <input
              type="date"
              required
              value={customDocDate}
              onChange={(e) => setCustomDocDate(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-white border border-gray-300 rounded-lg shadow-xs focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <p className="text-[10px] text-gray-400 mt-1 italic">
            You can customize the date before generating the {docType === 'pi' ? 'PI' : 'Challan'}.
          </p>
        </div>
      </div>

      {docType === 'pi' && (
        <div className="bg-white border border-gray-250 rounded-xl p-5 shadow-xs grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
              Select PI Settle Bank Account *
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1.5">
              {banks.map((b) => (
                <div
                  key={b.id}
                  onClick={() => setSelectedBank(b)}
                  className={`border rounded-lg p-3 cursor-pointer relative transition-all duration-200 select-none ${
                    selectedBank.id === b.id
                      ? 'border-emerald-600 bg-emerald-50/20 shadow-xs'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  {selectedBank.id === b.id && (
                    <div className="absolute top-2 right-2 text-emerald-600">
                      <Check className="w-4 h-4" />
                    </div>
                  )}
                  <h5 className="text-xs font-bold text-gray-800">{b.bankName}</h5>
                  <p className="text-[10px] text-gray-500 mt-0.5">{b.branch}</p>
                  <p className="text-[10px] text-emerald-800 font-mono font-bold mt-1.5">A/C: {b.accountNo}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 space-y-3">
              <span className="block text-xs font-bold text-gray-700 uppercase tracking-wider border-b border-gray-200 pb-1 flex items-center gap-1">
                <Scale className="w-3.5 h-3.5" /> Weight details
              </span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Net Weight</label>
                  <input
                    type="text"
                    value={netWeight}
                    onChange={(e) => setNetWeight(e.target.value)}
                    placeholder="e.g. 18.2 Kg"
                    className="w-full px-2.5 py-1 text-xs border border-gray-300 rounded-md focus:ring-1 focus:ring-emerald-500 bg-white outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Gross Weight</label>
                  <input
                    type="text"
                    value={grossWeight}
                    onChange={(e) => setGrossWeight(e.target.value)}
                    placeholder="e.g. 20.5 Kg"
                    className="w-full px-2.5 py-1 text-xs border border-gray-300 rounded-md focus:ring-1 focus:ring-emerald-500 bg-white outline-hidden"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delivery Challan address overrider */}
      {docType === 'challan' && (
        <div className="bg-white border border-gray-250 rounded-xl p-5 shadow-xs">
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
            <MapPin className="w-4 h-4 text-emerald-600" />
            Consignee Delivery Address
          </label>
          <input
            type="text"
            required
            value={deliveryAddress}
            onChange={(e) => setDeliveryAddress(e.target.value)}
            placeholder="Type final garments factory address for shipment dispatch..."
            className="w-full px-3.5 py-2 text-sm bg-white border border-gray-300 rounded-lg shadow-xs focus:ring-2 focus:ring-emerald-500 outline-hidden"
          />
          <p className="text-[10px] text-gray-400 mt-1 italic">
            Pre-loaded from standard delivery address of selected booking items. Customize if necessary.
          </p>
        </div>
      )}

      {/* Main itemizer list */}
      <div className="bg-white border border-gray-250 rounded-xl overflow-hidden shadow-xs">
        <div className="bg-gray-50 border-b border-gray-200 py-3.5 px-5 flex justify-between items-center">
          <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wider">
            Review and Refine Items in Document ({docItems.length})
          </h3>
          <span className="text-xs font-mono font-semibold text-gray-500">
            Total Qty Sum: <strong className="text-gray-900 font-bold">{grossSumQty.toLocaleString()}</strong>
          </span>
        </div>

        <div className="divide-y divide-gray-150">
          {docItems.map((item, idx) => (
            <div 
              key={item.id} 
              draggable={isGripMouseDown}
              onDragStart={(e) => handleDragStart(e, idx)}
              onDragEnd={handleDragEnd}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDrop={(e) => handleDrop(e, idx)}
              className={`p-5 space-y-4 hover:bg-gray-50/25 transition-all duration-150 relative border-b border-gray-150 ${
                draggedIdx === idx ? 'opacity-30 bg-indigo-50/20 shadow-inner' : ''
              } ${
                dragOverIdx === idx && draggedIdx !== idx ? 'border-t-4 border-t-emerald-500 bg-emerald-50/10' : ''
              }`}
            >
              <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  {/* Grip & Arrows reorder controller */}
                  <div 
                    onMouseDown={() => setIsGripMouseDown(true)}
                    onMouseUp={() => setIsGripMouseDown(false)}
                    onMouseLeave={() => setIsGripMouseDown(false)}
                    onTouchStart={() => setIsGripMouseDown(true)}
                    onTouchEnd={() => setIsGripMouseDown(false)}
                    className="drag-grip-handle flex items-center gap-1.5 shrink-0 self-start select-none bg-gray-100/80 hover:bg-gray-100 rounded px-1.5 py-1.5 border border-gray-250 cursor-grab active:cursor-grabbing"
                  >
                    <div 
                      className="text-gray-400 hover:text-gray-700 p-0.5"
                      title="Drag to reorder"
                    >
                      <GripVertical className="w-4 h-4" />
                    </div>
                    <div className="flex items-center gap-0.5">
                      <button
                        type="button"
                        onClick={() => moveItemUp(idx)}
                        disabled={idx === 0}
                        className="p-0.5 text-gray-400 hover:text-gray-700 disabled:opacity-25 rounded transition-transform duration-100 cursor-pointer"
                        title="Move Up"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveItemDown(idx)}
                        disabled={idx === docItems.length - 1}
                        className="p-0.5 text-gray-400 hover:text-gray-700 disabled:opacity-25 rounded transition-transform duration-100 cursor-pointer"
                        title="Move Down"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1 min-w-0 flex-1">
                    <span className="inline-block bg-teal-50 text-teal-800 font-bold px-1.5 py-0.5 rounded text-[10px] font-mono select-none">
                      Item #{idx + 1}
                    </span>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                      <h4 className="font-bold text-gray-900 text-sm leading-none">{item.itemName}</h4>
                      <span className="text-xs text-gray-400">|</span>
                      <span className="text-xs font-mono font-medium text-gray-500">PO: {item.poNumber}</span>
                      <span className="text-xs text-gray-400">|</span>
                      <span className="text-xs font-mono font-medium text-gray-500">Style: {item.styleNumber || 'N/A'}</span>
                    </div>
                    {item.details && (
                      <p className="text-xs text-gray-400 mt-1.5 italic">&ldquo;{item.details}&rdquo;</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {/* Total price overview if PI */}
                  {docType === 'pi' && (
                    <div className="text-right text-xs">
                      <span className="text-gray-400 block text-[9px] uppercase font-bold tracking-wider">Unit Value</span>
                      <span className="text-gray-900 font-mono font-bold">${item.unitPrice.toFixed(4)}</span>
                      <span className="text-emerald-800 font-mono font-bold block mt-0.5 text-[11px]">
                        Ext: ${(item.totalQuantity * item.unitPrice).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => handleRemoveItem(item.id)}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                    title="Remove item from document"
                  >
                    <Trash className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Sizing grid modifying */}
              {item.sizeWise ? (
                <div className="bg-gray-50 p-3 rounded-lg border border-gray-150">
                  <span className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                    Size Quantities Matrix ({item.unit})
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-5 md:grid-cols-10 gap-2.5">
                    {item.sizes.map((sz) => (
                      <div key={sz.size} className="bg-white border border-gray-200 rounded px-2 py-1 flex flex-col justify-between items-center">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{sz.size}</span>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          value={sz.quantity || ''}
                          onChange={(e) => handleItemSizeQuantityChange(item.id, sz.size, e.target.value)}
                          className="w-full text-center py-0.5 text-xs font-bold text-gray-800 focus:outline-hidden focus:border-emerald-500 mt-1"
                          placeholder="0"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="max-w-xs">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                    Booking Quantity ({item.unit})
                  </label>
                  <div className="relative flex items-center max-w-44">
                    <input
                      type="number"
                      step="any"
                      min="0.001"
                      value={item.totalQuantity || ''}
                      onChange={(e) => handleItemQuantityChange(item.id, e.target.value)}
                      className="w-full text-right pr-9 pl-2.5 py-1.5 text-xs bg-white border border-gray-300 rounded-md focus:ring-1"
                    />
                    <span className="absolute right-2.5 text-[10px] text-gray-400 font-bold uppercase pointer-events-none">{item.unit}</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Aggregate sum summary */}
        <div className="bg-gray-50/50 py-4 px-5 border-t border-gray-150 flex flex-col sm:flex-row sm:items-center justify-between gap-4 font-sans">
          <div className="text-xs text-gray-500 leading-relaxed font-semibold">
            By compiling this form, a persistent record of this {docType === 'pi' ? 'Proforma Invoice' : 'Delivery Challan'} will be created.
          </div>
          <div className="text-right space-y-1 shrink-0">
            <p className="text-xs font-bold text-gray-500 uppercase">Document Total Sums</p>
            <p className="text-sm font-extrabold text-gray-800">
              Quantity Sum: <span className="font-mono">{grossSumQty.toLocaleString()} Units</span>
            </p>
            {docType === 'pi' && (
              <p className="text-md font-black text-emerald-800 font-mono">
                Total Value: ${grossSumUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
              </p>
            )}
          </div>
        </div>
      </div>

      {docType === 'pi' && (
        <div className="bg-white border border-gray-250 rounded-xl p-5 shadow-xs space-y-4">
          <span className="text-xs font-bold text-gray-700 uppercase tracking-wider block border-b border-gray-100 pb-2">
            Proforma Invoice Terms & Conditions
          </span>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {terms.map((t, index) => (
              <div key={index} className="flex items-center justify-between gap-2.5 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                <span className="text-xs text-gray-700 leading-relaxed font-medium">{index + 1}. {t}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveTerm(index)}
                  className="text-gray-400 hover:text-red-500 font-sans text-xs flex items-center cursor-pointer"
                  title="Remove Term"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 max-w-2xl pt-2">
            <input
              type="text"
              value={newTerm}
              onChange={(e) => setNewTerm(e.target.value)}
              className="w-full px-3.5 py-1.5 text-xs bg-white border border-gray-300 rounded-md focus:ring-1 focus:ring-emerald-500 outline-hidden"
              placeholder="Type another terms & condition bullet..."
            />
            <button
              type="button"
              onClick={handleAddTerm}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 font-semibold hover:bg-emerald-500 text-white text-xs uppercase tracking-wider rounded-md shrink-0 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Add
            </button>
          </div>
        </div>
      )}
    </form>
  );
}
