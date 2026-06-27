/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ProformaInvoice, DocumentItem, BankDetails } from '../types';
import { COMPANY_PROFILE, DEFAULT_TERMS, DEFAULT_BANKS } from '../data';
import AcoolaLogo from './AcoolaLogo';
import Barcode from './Barcode';
import { Printer, Eye, Trash2, Edit, Save, Calendar, Landmark, Check, AlertCircle, Plus, Sparkles, X, ArrowUp, ArrowDown } from 'lucide-react';

interface PiListProps {
  pis: ProformaInvoice[];
  banks?: BankDetails[];
  onDeletePi: (id: string) => void;
  onUpdatePiItems: (
    id: string, 
    updatedItems: DocumentItem[], 
    netWeight?: string, 
    grossWeight?: string, 
    terms?: string[], 
    invoiceNo?: string, 
    date?: string,
    factoryName?: string,
    factoryAddress?: string,
    buyerName?: string,
    ref?: string,
    bankDetails?: BankDetails,
    hsCode?: string
  ) => void;
  onTogglePurchasePi?: (id: string) => void;
  onAddPi?: (pi: ProformaInvoice) => void;
  canEdit?: boolean;
}

const getValidityDate = (baseDateStr: string) => {
  if (!baseDateStr) return 'N/A';
  try {
    const date = new Date(baseDateStr);
    if (isNaN(date.getTime())) return 'N/A';
    date.setDate(date.getDate() + 15);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch (err) {
    return 'N/A';
  }
};

const numberToWords = (num: number): string => {
  if (num === 0) return "Zero US Dollars Only";

  const numWords = (n: number): string => {
    const ones = [
      "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
      "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
      "Seventeen", "Eighteen", "Nineteen"
    ];
    const tens = [
      "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"
    ];
    const scales = ["", "Thousand", "Million", "Billion"];

    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "");
    if (n < 1000) return ones[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " And " + numWords(n % 100) : "");

    for (let i = 0; i < scales.length; i++) {
      const unit = Math.pow(1000, i);
      if (n < unit * 1000) {
        return numWords(Math.floor(n / unit)) + " " + scales[i] + (n % unit ? " " + numWords(n % unit) : "");
      }
    }
    return "";
  };

  const dollarPart = Math.floor(num);
  const centPart = Math.round((num - dollarPart) * 100);

  let result = numWords(dollarPart) + " US Dollar" + (dollarPart === 1 ? "" : "s");
  if (centPart > 0) {
    result += " and " + numWords(centPart) + " Cent" + (centPart === 1 ? "" : "s");
  }
  return result + " Only";
};

export default function PiList({ pis, banks = [], onDeletePi, onUpdatePiItems, onTogglePurchasePi, onAddPi, canEdit = true }: PiListProps) {
  const [activePreview, setActivePreview] = useState<ProformaInvoice | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [subTab, setSubTab] = useState<'active' | 'purchased'>('active');

  const [watermarkImage, setWatermarkImage] = useState(() => localStorage.getItem('acoola_global_watermark') || '');
  const [signatureImage, setSignatureImage] = useState(() => localStorage.getItem('acoola_global_signature') || '');

  const activeBankSelections = (banks && banks.length > 0) ? banks : DEFAULT_BANKS;

  // Manual PI Creation states
  const [isManualPiModalOpen, setIsManualPiModalOpen] = useState(false);
  const [newInvoiceNo, setNewInvoiceNo] = useState('');
  const [newBuyerName, setNewBuyerName] = useState('');
  const [newRef, setNewRef] = useState('Ref-PO-77182');
  const [newDate, setNewDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [newFactoryName, setNewFactoryName] = useState(() => COMPANY_PROFILE.name || '');
  const [newFactoryAddress, setNewFactoryAddress] = useState(() => COMPANY_PROFILE.addresses.factory || '');
  const [newNetWeight, setNewNetWeight] = useState('980 Kgs');
  const [newGrossWeight, setNewGrossWeight] = useState('1020 Kgs');
  const [newHsCode, setNewHsCode] = useState(() => COMPANY_PROFILE.defaultHsCode || '6217.10.00');
  const [newBankId, setNewBankId] = useState(() => activeBankSelections[0]?.id || '');
  const [newTerms, setNewTerms] = useState<string[]>(() => [...DEFAULT_TERMS]);
  const [newItems, setNewItems] = useState<any[]>([
    { id: 'itm-1', poNumber: '', styleNumber: '', itemName: '', unit: 'Pcs', unitPrice: 0, totalQuantity: 0 }
  ]);

  React.useEffect(() => {
    if (activeBankSelections.length > 0 && !newBankId) {
      setNewBankId(activeBankSelections[0].id);
    }
  }, [activeBankSelections, newBankId]);

  // Editing state for active PI details
  const [isEditing, setIsEditing] = useState(false);
  const [editingItems, setEditingItems] = useState<DocumentItem[]>([]);
  const [editingNetWeight, setEditingNetWeight] = useState('');
  const [editingGrossWeight, setEditingGrossWeight] = useState('');
  const [editingTerms, setEditingTerms] = useState<string[]>([]);
  const [editNewTerm, setEditNewTerm] = useState('');
  const [editingInvoiceNo, setEditingInvoiceNo] = useState('');
  const [editingDate, setEditingDate] = useState('');
  const [editingBuyerName, setEditingBuyerName] = useState('');
  const [editingRef, setEditingRef] = useState('');
  const [editingFactoryName, setEditingFactoryName] = useState('');
  const [editingFactoryAddress, setEditingFactoryAddress] = useState('');
  const [editingHsCode, setEditingHsCode] = useState('');
  const [editingBankId, setEditingBankId] = useState('');

  // Parent/inline card editing states
  const [parentEditingPiId, setParentEditingPiId] = useState<string | null>(null);
  const [parentEditingItems, setParentEditingItems] = useState<DocumentItem[]>([]);
  const [parentEditingNetWeight, setParentEditingNetWeight] = useState('');
  const [parentEditingGrossWeight, setParentEditingGrossWeight] = useState('');

  const startParentEditing = (pi: ProformaInvoice) => {
    setParentEditingPiId(pi.id);
    setParentEditingItems(pi.items.map(item => ({ ...item })));
    setParentEditingNetWeight(pi.netWeight || '');
    setParentEditingGrossWeight(pi.grossWeight || '');
  };

  const handleToggleLocalAndGlobal = (piId: string) => {
    if (onTogglePurchasePi) {
      onTogglePurchasePi(piId);
    }
    if (activePreview && activePreview.id === piId) {
      setActivePreview(prev => prev ? { ...prev, isPurchased: !prev.isPurchased } : null);
    }
  };

  const openManualPiForm = () => {
    const proposed = `ATC-${101 + pis.length}`;
    setNewInvoiceNo(proposed);
    setNewBuyerName('');
    setNewRef('Ref-PO-' + Math.floor(1000 + Math.random() * 9000));
    setNewDate(new Date().toISOString().split('T')[0]);
    setNewNetWeight('980 Kgs');
    setNewGrossWeight('1020 Kgs');
    setNewItems([
      { id: 'itm-' + Date.now(), poNumber: '', styleNumber: '', itemName: '', unit: 'Pcs', unitPrice: 0, totalQuantity: 0 }
    ]);
    setIsManualPiModalOpen(true);
  };

  const addManualItemRow = () => {
    setNewItems(prev => [
      ...prev,
      { id: 'itm-' + Date.now() + Math.random().toString(36).substr(2, 4), poNumber: '', styleNumber: '', itemName: '', unit: 'Pcs', unitPrice: 0, totalQuantity: 0 }
    ]);
  };

  const removeManualItemRow = (id: string) => {
    if (newItems.length > 1) {
      setNewItems(prev => prev.filter(item => item.id !== id));
    } else {
      alert("At least one item line is required.");
    }
  };

  const updateManualItemField = (id: string, field: string, value: any) => {
    setNewItems(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  const submitManualPi = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInvoiceNo.trim()) {
      alert("Invoice No is required.");
      return;
    }
    if (!newBuyerName.trim()) {
      alert("Buyer Name is required.");
      return;
    }

    const filteredItems = newItems.filter(i => i.itemName.trim() !== '');
    if (filteredItems.length === 0) {
      alert("Please add at least one item description.");
      return;
    }

    const docItems: DocumentItem[] = filteredItems.map((item, idx) => ({
      id: item.id || `mi-${idx}-${Date.now()}`,
      bookingId: 'manual',
      poNumber: item.poNumber || 'N/A',
      styleNumber: item.styleNumber || 'Standard',
      itemName: item.itemName,
      unit: item.unit as any || 'Pcs',
      unitPrice: parseFloat(item.unitPrice) || 0,
      totalQuantity: parseFloat(item.totalQuantity) || 0,
      sizeWise: false,
      sizes: [],
      details: ''
    }));

    const selectedBank = activeBankSelections.find(b => b.id === newBankId) || activeBankSelections[0];

    const newPi: ProformaInvoice = {
      id: `pi-manual-${Date.now()}`,
      invoiceNo: newInvoiceNo,
      factoryName: newFactoryName,
      factoryAddress: newFactoryAddress,
      buyerName: newBuyerName,
      ref: newRef,
      date: newDate,
      bankDetails: selectedBank,
      items: docItems,
      netWeight: newNetWeight || 'N/A',
      grossWeight: newGrossWeight || 'N/A',
      hsCode: newHsCode || '6217.10.00',
      terms: newTerms,
      createdAt: new Date().toISOString(),
      isPurchased: false
    };

    if (onAddPi) {
      onAddPi(newPi);
    }
    setIsManualPiModalOpen(false);
  };

  const triggerPrint = () => {
    if (!activePreview) return;
    const element = document.getElementById('proforma-invoice-print-sheet');
    if (!element) return;

    // Create a new window for secure printable area extraction
    const printWindow = window.open('', '_blank', 'width=1000,height=800');
    if (!printWindow) {
      // Direct window fallback in case popups are blocked
      window.focus();
      window.print();
      return;
    }

    // Capture standard system styling stylesheets to style cloned content element
    const styleLinks = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
      .map(el => el.outerHTML)
      .join('\n');

    const customStyles = `
      <style>
        * {
          -webkit-user-select: text !important;
          -moz-user-select: text !important;
          -ms-user-select: text !important;
          user-select: text !important;
        }
        body {
          margin: 0;
          padding: 0 !important;
          background-color: #ffffff;
        }
        @page {
          size: A4 portrait;
          margin: 0mm !important;
        }
        /* Ensure everything is 100% visible inside this specific window */
        body, body * {
          visibility: visible !important;
        }
        #proforma-invoice-print-sheet,
        #proforma-invoice-print-sheet * {
          visibility: visible !important;
        }
        @media print {
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          #proforma-invoice-print-sheet {
            position: relative !important;
            width: 210mm !important;
            min-height: 297mm !important;
            height: auto !important;
            left: 0 !important;
            top: 0 !important;
            margin: 0 !important;
            padding: 8mm 6mm !important;
            border: none !important;
            box-shadow: none !important;
            box-sizing: border-box !important;
          }
        }
      </style>
    `;

    printWindow.document.write(`
      <html>
        <head>
          <title>Proforma Invoice - ${activePreview?.invoiceNo || ''}</title>
          <base href="${window.location.origin}/" />
          ${styleLinks}
          ${customStyles}
        </head>
        <body class="bg-white">
          <div class="w-full flex justify-center">
            ${element.outerHTML}
          </div>
          <script>
            function doPrint() {
              window.focus();
              window.print();
              setTimeout(() => { window.close(); }, 1000);
            }
            if (document.readyState === 'complete') {
              setTimeout(doPrint, 800);
            } else {
              window.addEventListener('load', () => { setTimeout(doPrint, 800); });
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const startEditingPi = (pi: ProformaInvoice) => {
    setActivePreview(pi);
    setEditingItems(pi.items.map(item => ({ ...item })));
    setEditingNetWeight(pi.netWeight);
    setEditingGrossWeight(pi.grossWeight);
    setEditingTerms([...(pi.terms || [])]);
    setEditingInvoiceNo(pi.invoiceNo);
    setEditingDate(pi.date);
    setEditingBuyerName(pi.buyerName || '');
    setEditingRef(pi.ref || '');
    setEditingFactoryName(pi.factoryName || '');
    setEditingFactoryAddress(pi.factoryAddress || '');
    setEditingHsCode(pi.hsCode || '');
    setEditingBankId(pi.bankDetails?.id || '');
    setIsEditing(true);
  };

  const handleSavePiEdits = (piId: string) => {
    if (editingItems.length === 0) {
      alert("PI must contain at least one item.");
      return;
    }
    const selectedBank = banks.find(b => b.id === editingBankId) || activePreview?.bankDetails || DEFAULT_BANKS[0];
    onUpdatePiItems(
      piId, 
      editingItems, 
      editingNetWeight, 
      editingGrossWeight, 
      editingTerms, 
      editingInvoiceNo, 
      editingDate,
      editingFactoryName,
      editingFactoryAddress,
      editingBuyerName,
      editingRef,
      selectedBank,
      editingHsCode
    );
    
    // Sync active preview to show the new changes immediately
    const updatedPi = pis.find(p => p.id === piId);
    if (updatedPi) {
      setActivePreview({
        ...updatedPi,
        invoiceNo: editingInvoiceNo,
        date: editingDate,
        items: editingItems,
        netWeight: editingNetWeight,
        grossWeight: editingGrossWeight,
        terms: editingTerms,
        buyerName: editingBuyerName,
        ref: editingRef,
        factoryName: editingFactoryName,
        factoryAddress: editingFactoryAddress,
        hsCode: editingHsCode,
        bankDetails: selectedBank
      });
    }

    setIsEditing(false);
  };

  const handleEditItemQuantity = (id: string, val: string) => {
    const qty = Math.max(0, parseFloat(val) || 0);
    setEditingItems(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, totalQuantity: qty };
      }
      return item;
    }));
  };

  const handleEditItemField = (id: string, field: string, val: any) => {
    setEditingItems(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, [field]: val };
      }
      return item;
    }));
  };

  const handleEditItemPrice = (id: string, val: string) => {
    const price = Math.max(0, parseFloat(val) || 0);
    setEditingItems(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, unitPrice: price };
      }
      return item;
    }));
  };

  const handleRemoveEditItem = (id: string) => {
    setEditingItems(prev => prev.filter(item => item.id !== id));
  };

  const dragItem = React.useRef<number | null>(null);
  const dragOverItem = React.useRef<number | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    dragItem.current = index;
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDragEnd = () => {
    if (dragItem.current !== null && dragOverItem.current !== null && dragItem.current !== dragOverItem.current) {
      const copyListItems = [...editingItems];
      const dragItemContent = copyListItems[dragItem.current];
      copyListItems.splice(dragItem.current, 1);
      copyListItems.splice(dragOverItem.current, 0, dragItemContent);
      setEditingItems(copyListItems);
    }
    dragItem.current = null;
    dragOverItem.current = null;
  };

  const handleDragEnter = (index: number) => {
    dragOverItem.current = index;
  };

  const moveEditingItemUp = (index: number) => {
    if (index === 0) return;
    const copyListItems = [...editingItems];
    const temp = copyListItems[index];
    copyListItems[index] = copyListItems[index - 1];
    copyListItems[index - 1] = temp;
    setEditingItems(copyListItems);
  };

  const moveEditingItemDown = (index: number) => {
    if (index === editingItems.length - 1) return;
    const copyListItems = [...editingItems];
    const temp = copyListItems[index];
    copyListItems[index] = copyListItems[index + 1];
    copyListItems[index + 1] = temp;
    setEditingItems(copyListItems);
  };

  const parentDragItem = React.useRef<number | null>(null);
  const parentDragOverItem = React.useRef<number | null>(null);

  const parentHandleDragStart = (e: React.DragEvent, index: number) => {
    parentDragItem.current = index;
    e.dataTransfer.effectAllowed = "move";
  };

  const parentHandleDragEnd = () => {
    if (parentDragItem.current !== null && parentDragOverItem.current !== null && parentDragItem.current !== parentDragOverItem.current) {
      const copyListItems = [...parentEditingItems];
      const dragItemContent = copyListItems[parentDragItem.current];
      copyListItems.splice(parentDragItem.current, 1);
      copyListItems.splice(parentDragOverItem.current, 0, dragItemContent);
      setParentEditingItems(copyListItems);
    }
    parentDragItem.current = null;
    parentDragOverItem.current = null;
  };

  const moveParentEditingItemUp = (index: number) => {
    if (index === 0) return;
    const copyListItems = [...parentEditingItems];
    const temp = copyListItems[index];
    copyListItems[index] = copyListItems[index - 1];
    copyListItems[index - 1] = temp;
    setParentEditingItems(copyListItems);
  };

  const moveParentEditingItemDown = (index: number) => {
    if (index === parentEditingItems.length - 1) return;
    const copyListItems = [...parentEditingItems];
    const temp = copyListItems[index];
    copyListItems[index] = copyListItems[index + 1];
    copyListItems[index + 1] = temp;
    setParentEditingItems(copyListItems);
  };

  const handleAddEditTerm = () => {
    if (!editNewTerm.trim()) return;
    setEditingTerms(prev => [...prev, editNewTerm.trim()]);
    setEditNewTerm('');
  };

  const handleRemoveEditTerm = (index: number) => {
    setEditingTerms(prev => prev.filter((_, i) => i !== index));
  };

  const computeItemsQtyAndUSDTotal = (items: DocumentItem[]) => {
    const groupMap = new Map<string, {
      itemName: string;
      unit: string;
      unitPrice: number;
      totalQuantity: number;
    }>();
    
    items.forEach(item => {
      const key = `${item.itemName}||${item.unit}`;
      if (groupMap.has(key)) {
        const existing = groupMap.get(key)!;
        existing.totalQuantity = Math.round((existing.totalQuantity + item.totalQuantity) * 1e10) / 1e10;
      } else {
        groupMap.set(key, {
          itemName: item.itemName,
          unit: item.unit,
          unitPrice: item.unitPrice,
          totalQuantity: item.totalQuantity
        });
      }
    });

    let totalQty = 0;
    let totalUSD = 0;

    groupMap.forEach((grp) => {
      const sourceItems = items.filter(
        i => i.itemName === grp.itemName && i.unit === grp.unit
      );
      let sizeUnit: string = grp.unit;
      for (const src of sourceItems) {
        if (src.styleBreakdowns && src.styleBreakdowns.length > 0) {
          const su = (src.styleBreakdowns[0] as any).sizeUnit;
          if (su) { sizeUnit = su; break; }
        }
      }
      
      const needsConversion = sizeUnit === 'Pcs' && grp.unit === 'Dzn';
      const displayQty = needsConversion
        ? Math.round((grp.totalQuantity / 12) * 1e10) / 1e10
        : grp.totalQuantity;
      const lineTotal = Math.round(displayQty * grp.unitPrice * 1e10) / 1e10;

      totalQty += displayQty;
      totalUSD += lineTotal;
    });

    return { totalQty, totalUSD };
  };

  const computePIQtyTotal = (pi: ProformaInvoice) => {
    return computeItemsQtyAndUSDTotal(pi.items).totalQty;
  };

  const computePIUSDTotal = (pi: ProformaInvoice) => {
    return computeItemsQtyAndUSDTotal(pi.items).totalUSD;
  };

  const computedEditingUSDTotal = () => {
    return computeItemsQtyAndUSDTotal(editingItems).totalUSD;
  };

  // Automatically calculate modal edit weights when editingItems changes
  React.useEffect(() => {
    if (editingItems.length > 0) {
      const totalUSD = computeItemsQtyAndUSDTotal(editingItems).totalUSD;
      if (totalUSD > 0) {
        const calculatedNet = totalUSD / 5.37;
        const calculatedGross = calculatedNet + 40;
        setEditingNetWeight(`${calculatedNet.toFixed(2)} Kgs`);
        setEditingGrossWeight(`${calculatedGross.toFixed(2)} Kgs`);
      }
    }
  }, [editingItems]);

  // Automatically calculate inline edit weights when parentEditingItems changes
  React.useEffect(() => {
    if (parentEditingItems.length > 0) {
      const totalUSD = computeItemsQtyAndUSDTotal(parentEditingItems).totalUSD;
      if (totalUSD > 0) {
        const calculatedNet = totalUSD / 5.37;
        const calculatedGross = calculatedNet + 40;
        setParentEditingNetWeight(`${calculatedNet.toFixed(2)} Kgs`);
        setParentEditingGrossWeight(`${calculatedGross.toFixed(2)} Kgs`);
      }
    }
  }, [parentEditingItems]);

  const filteredPis = pis.filter(pi => subTab === 'purchased' ? pi.isPurchased : !pi.isPurchased);

  return (
    <div id="pi-register-section" className="space-y-6 text-left">
      
      {/* Table Headers */}
      <div className="border-b border-gray-150 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-5 h-5 text-emerald-600" />
            Proforma Invoice (PI) Database
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Historical registry of corporate PIs. Adjust weights, items, and pricing dynamically.
          </p>
        </div>
        {canEdit && (
          <div>
            <button
              type="button"
              onClick={openManualPiForm}
              className="px-4 py-2 bg-[#007d46] hover:bg-emerald-700 text-white rounded-lg text-xs font-black uppercase tracking-wider shadow-sm hover:shadow flex items-center gap-1.5 cursor-pointer transition-all"
            >
              <Plus className="w-4 h-4 text-white" />
              <span>Generate Manual PI</span>
            </button>
          </div>
        )}
      </div>

      {/* Sub tabs selector */}
      <div className="flex border-b border-neutral-200 bg-white rounded-t-xl overflow-hidden shadow-3xs p-1" id="pi-sub-tabs">
        <button
          type="button"
          onClick={() => {
            setSubTab('active');
            setActivePreview(null);
          }}
          className={`flex-1 py-2 px-4 text-xs font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
            subTab === 'active'
              ? 'bg-[#007d46] text-white shadow-xs font-black'
              : 'text-neutral-500 hover:text-neutral-800 hover:bg-neutral-50/70 font-bold'
          }`}
        >
          Active PIs ({pis.filter(p => !p.isPurchased).length})
        </button>
        <button
          type="button"
          onClick={() => {
            setSubTab('purchased');
            setActivePreview(null);
          }}
          className={`flex-1 py-2 px-4 text-xs font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
            subTab === 'purchased'
              ? 'bg-indigo-650 text-white shadow-xs font-black'
              : 'text-neutral-500 hover:text-neutral-800 hover:bg-neutral-50/70 font-bold'
          }`}
        >
          Purchase History ({pis.filter(p => p.isPurchased).length})
        </button>
      </div>

      {pis.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl py-12 text-center text-gray-500 max-w-lg mx-auto">
          No Proforma Invoices generated yet. Open Bookings, select items, and click &ldquo;Build PI&rdquo; to begin.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Grid cards */}
          <div className="lg:col-span-1 space-y-3.5 max-h-[600px] overflow-y-auto pr-1">
            {filteredPis.length === 0 ? (
              <div className="bg-white border border-dashed border-neutral-300 rounded-xl p-8 text-center text-neutral-400 font-bold text-xs">
                {subTab === 'purchased' ? 'No purchased PI records found.' : 'All PIs have been transferred to Purchase History!'}
              </div>
            ) : (
              filteredPis.map((pi) => {
                const qtyTotal = computePIQtyTotal(pi);
                const usdTotal = computePIUSDTotal(pi);
                return (
                  <div
                    key={pi.id}
                    onClick={() => {
                      if (parentEditingPiId !== pi.id) {
                        setActivePreview(pi);
                        setIsEditing(false);
                      }
                    }}
                    className={`border rounded-xl p-4 cursor-pointer hover:bg-neutral-50/50 transition-all duration-200 select-none relative overflow-hidden ${
                      activePreview?.id === pi.id 
                        ? 'border-emerald-600 bg-emerald-50/10 shadow-md' 
                        : 'border-neutral-200 bg-white shadow-3xs'
                    }`}
                    id={`pi-card-${pi.id}`}
                  >
                    {parentEditingPiId === pi.id ? (
                      <div className="space-y-3 mt-1 text-xs" onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}>
                        <div className="flex items-center justify-between border-b pb-1.5 mb-2">
                          <span className="font-extrabold text-[#007d46] uppercase font-mono text-xs flex items-center gap-1">
                            <Edit className="w-3.5 h-3.5 text-[#007d46]" /> Inline Edit #{pi.invoiceNo}
                          </span>
                          <button
                            type="button"
                            onClick={() => setParentEditingPiId(null)}
                            className="text-neutral-400 hover:text-neutral-600 font-bold"
                          >
                            ✕
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-2 bg-neutral-50 p-2.5 rounded-lg border border-neutral-200">
                          <div>
                            <label className="block text-[9px] uppercase font-bold text-neutral-500 mb-0.5">Net Weight</label>
                            <input
                              type="text"
                              value={parentEditingNetWeight}
                              onChange={(e) => setParentEditingNetWeight(e.target.value)}
                              className="w-full bg-white border border-neutral-300 rounded px-2 py-0.5 text-xs font-bold font-sans focus:outline-hidden"
                              placeholder="e.g. 15 Kg"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] uppercase font-bold text-neutral-500 mb-0.5">Gross Weight</label>
                            <input
                              type="text"
                              value={parentEditingGrossWeight}
                              onChange={(e) => setParentEditingGrossWeight(e.target.value)}
                              className="w-full bg-white border border-neutral-300 rounded px-2 py-0.5 text-xs font-bold font-sans focus:outline-hidden"
                              placeholder="e.g. 18 Kg"
                            />
                          </div>
                        </div>

                        <div className="space-y-2.5 border border-neutral-200 rounded-lg p-2 bg-white max-h-48 overflow-y-auto">
                          <span className="block text-[9px] uppercase font-extrabold text-neutral-400 tracking-wider">Line Items</span>
                          {parentEditingItems.map((item, index) => (
                            <div 
                              key={item.id} 
                              draggable
                              onDragStart={(e) => parentHandleDragStart(e, index)}
                              onDragEnter={() => parentDragOverItem.current = index}
                              onDragEnd={parentHandleDragEnd}
                              onDragOver={(e) => e.preventDefault()}
                              className="text-[11px] pb-1.5 border-b border-neutral-100 last:border-b-0 last:pb-0 space-y-1 hover:bg-slate-50 rounded px-1.5 transition-all"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1 shrink-0 select-none">
                                  <span className="text-gray-400 font-bold text-sm cursor-grab active:cursor-grabbing hover:text-gray-600" title="Hold to drag reorder">⠿</span>
                                  <div className="flex items-center gap-0.5">
                                    <button
                                      type="button"
                                      onClick={() => moveParentEditingItemUp(index)}
                                      disabled={index === 0}
                                      className={`p-0.5 rounded ${index === 0 ? 'text-gray-200 cursor-not-allowed' : 'text-gray-500 hover:bg-gray-200 hover:text-gray-900'} transition-colors`}
                                      title="Move Item Up"
                                    >
                                      <ArrowUp className="w-2.5 h-2.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => moveParentEditingItemDown(index)}
                                      disabled={index === parentEditingItems.length - 1}
                                      className={`p-0.5 rounded ${index === parentEditingItems.length - 1 ? 'text-gray-200 cursor-not-allowed' : 'text-gray-500 hover:bg-gray-200 hover:text-gray-900'} transition-colors`}
                                      title="Move Item Down"
                                    >
                                      <ArrowDown className="w-2.5 h-2.5" />
                                    </button>
                                  </div>
                                </div>
                                <p className="font-bold text-neutral-800 leading-none truncate flex-1">{item.itemName}</p>
                              </div>
                              <div className="flex gap-2 items-center">
                                <div className="flex-1">
                                  <label className="block text-[8px] text-neutral-400 uppercase font-medium">Qty ({item.unit})</label>
                                  <input
                                    type="number"
                                    step="any"
                                    min="0.001"
                                    value={item.totalQuantity}
                                    onChange={(e) => {
                                      const val = Math.max(0, parseFloat(e.target.value) || 0);
                                      setParentEditingItems(prev => prev.map(x => x.id === item.id ? { ...x, totalQuantity: val } : x));
                                    }}
                                    className="w-full bg-neutral-50/50 border border-neutral-200 rounded px-1.5 py-0.5 text-right font-bold"
                                  />
                                </div>
                                <div className="flex-1">
                                  <label className="block text-[8px] text-neutral-400 uppercase font-medium">USD Price</label>
                                  <input
                                    type="number"
                                    step="0.0001"
                                    min="0"
                                    value={item.unitPrice}
                                    onChange={(e) => {
                                      const val = Math.max(0, parseFloat(e.target.value) || 0);
                                      setParentEditingItems(prev => prev.map(x => x.id === item.id ? { ...x, unitPrice: val } : x));
                                    }}
                                    className="w-full bg-neutral-50/50 border border-neutral-200 rounded px-1.5 py-0.5 text-right font-mono"
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="flex gap-1.5 justify-end pt-1.5 border-t border-neutral-100">
                          <button
                            type="button"
                            onClick={() => setParentEditingPiId(null)}
                            className="px-2.5 py-1 text-[9px] uppercase font-bold border rounded bg-white hover:bg-neutral-50 transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              onUpdatePiItems(pi.id, parentEditingItems, parentEditingNetWeight, parentEditingGrossWeight, pi.terms);
                              if (activePreview?.id === pi.id) {
                                setActivePreview({
                                  ...activePreview,
                                  items: parentEditingItems,
                                  netWeight: parentEditingNetWeight,
                                  grossWeight: parentEditingGrossWeight
                                });
                              }
                              setParentEditingPiId(null);
                            }}
                            className="px-3 py-1 text-[9px] uppercase font-black bg-emerald-600 hover:bg-emerald-700 text-white rounded transition-colors"
                          >
                            Save Edits
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-between items-start gap-2.5">
                          <div>
                            <h4 className="font-mono font-extrabold text-emerald-800 text-sm tracking-tight">{pi.invoiceNo}</h4>
                            <p className="text-xs font-bold text-neutral-800 tracking-tight mt-0.5">{pi.factoryName}</p>
                          </div>
                          {/* Visual Category Label Badge */}
                          <span className={`text-[8.5px] px-2 py-0.5 font-black uppercase rounded tracking-wider ${
                            pi.isPurchased 
                              ? 'bg-amber-100 text-amber-900 border border-amber-250/50' 
                              : 'bg-emerald-100 text-emerald-950 border border-emerald-250/50'
                          }`}>
                            {pi.isPurchased ? 'Purchased' : 'Active PI'}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 mt-4 text-[11px] border-t border-neutral-100 pt-3">
                          <div>
                            <span className="text-neutral-400 font-bold block text-[9px] uppercase">Buyers</span>
                            <span className="text-neutral-800 font-semibold truncate block" title={pi.buyerName}>{pi.buyerName || 'N/A'}</span>
                          </div>
                          <div>
                            <span className="text-neutral-400 font-bold block text-[9px] uppercase">Issue Date</span>
                            <span className="text-neutral-800 block">{pi.date}</span>
                          </div>
                        </div>

                        <div className="flex justify-between items-center text-[11px] text-neutral-500 mt-3 pt-2.5 border-t border-neutral-50">
                          <span>{pi.items.length} line items</span>
                          <span className="font-mono font-bold text-emerald-800 text-xs">
                            ${usdTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                          </span>
                        </div>

                        {/* Purchase History State Toggle Button */}
                        <div className="pt-2 border-t border-neutral-100 mt-2.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              handleToggleLocalAndGlobal(pi.id);
                            }}
                            className={`w-full flex items-center justify-center gap-1 py-1 text-[10px] uppercase font-black tracking-wider rounded-lg border transition-all cursor-pointer ${
                              pi.isPurchased
                                ? 'bg-amber-50 hover:bg-amber-100 border-amber-250 text-amber-850'
                                : 'bg-indigo-50 hover:bg-indigo-100 border-indigo-250 text-indigo-900'
                            }`}
                          >
                            {pi.isPurchased ? '↩ RESTORE TO ACTIVE' : '🛒 MARK AS PURCHASED'}
                          </button>
                        </div>

                        {/* Quick Action Delete Button */}
                        <div className="flex justify-between items-center pt-2 border-t border-neutral-50 mt-2">
                          {canEdit && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                startParentEditing(pi);
                              }}
                              className="inline-flex items-center text-[10px] font-semibold uppercase tracking-wider text-emerald-700 hover:text-emerald-800 hover:underline py-1 cursor-pointer"
                            >
                              <Edit className="w-3 h-3 mr-0.5" /> Edit Items / Weight
                            </button>
                          )}
                          {canEdit && (
                            confirmDeleteId === pi.id ? (
                              <div className="flex items-center gap-1.5" onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}>
                                <span className="text-[10px] text-red-600 font-extrabold uppercase">Confirm?</span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    onDeletePi(pi.id);
                                    if (activePreview?.id === pi.id) setActivePreview(null);
                                    setConfirmDeleteId(null);
                                  }}
                                  className="px-2 py-0.5 bg-red-600 hover:bg-red-700 text-white text-[9px] font-black uppercase rounded cursor-pointer transition-colors"
                                >
                                  Yes, Delete
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    setConfirmDeleteId(null);
                                  }}
                                  className="px-2 py-0.5 bg-neutral-200 hover:bg-neutral-300 text-neutral-800 text-[9px] font-bold uppercase rounded cursor-pointer transition-colors"
                                >
                                  No
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  setConfirmDeleteId(pi.id);
                                }}
                                className="inline-flex items-center text-[10px] font-bold uppercase tracking-wider text-red-600 hover:text-red-700 hover:underline py-1 cursor-pointer"
                              >
                                <Trash2 className="w-3 h-3 mr-0.5" /> Delete Register
                              </button>
                            )
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Preview / Edit panel */}
          <div className="lg:col-span-2 bg-white border border-neutral-250 rounded-xl p-5 shadow-sm">
            {activePreview ? (
              <div className="space-y-4">
                
                {/* Editing view */}
                {isEditing ? (
                  <div className="space-y-4 animate-fade-in" id="pi-editor-card">
                    <div className="flex items-center justify-between border-b pb-2">
                      <h3 className="font-bold text-sm text-gray-800 flex items-center gap-1.5">
                        <Edit className="w-4 h-4 text-emerald-600" />
                        Live Editing PI #{activePreview.invoiceNo}
                      </h3>
                      <button
                        type="button"
                        onClick={() => setIsEditing(false)}
                        className="text-gray-400 hover:text-gray-600 text-xs"
                      >
                        ✕ Cancel
                      </button>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-gray-50 p-3 rounded-lg border border-gray-100">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5 text-[#007d46]">PI Number</label>
                        <input
                          type="text"
                          value={editingInvoiceNo}
                          onChange={(e) => setEditingInvoiceNo(e.target.value)}
                          className="w-full px-2.5 py-1 text-xs border border-gray-300 rounded bg-white font-extrabold outline-hidden"
                          placeholder="e.g. ATC-9821"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5 text-[#007d46]">PI Date</label>
                        <input
                          type="date"
                          value={editingDate}
                          onChange={(e) => setEditingDate(e.target.value)}
                          className="w-full px-2.5 py-1 text-xs border border-gray-300 rounded bg-white outline-hidden cursor-pointer"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">Net Weight</label>
                        <input
                          type="text"
                          value={editingNetWeight}
                          onChange={(e) => setEditingNetWeight(e.target.value)}
                          className="w-full px-2.5 py-1 text-xs border border-gray-300 rounded bg-white outline-hidden"
                          placeholder="e.g. 15 Kg"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">Gross Weight</label>
                        <input
                          type="text"
                          value={editingGrossWeight}
                          onChange={(e) => setEditingGrossWeight(e.target.value)}
                          className="w-full px-2.5 py-1 text-xs border border-gray-300 rounded bg-white outline-hidden"
                          placeholder="e.g. 18 Kg"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">Buyer Brand Name</label>
                        <input
                          type="text"
                          value={editingBuyerName}
                          onChange={(e) => setEditingBuyerName(e.target.value)}
                          className="w-full px-2.5 py-1 text-xs border border-gray-300 rounded bg-white outline-hidden"
                          placeholder="e.g. H&M"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">Reference / PO</label>
                        <input
                          type="text"
                          value={editingRef}
                          onChange={(e) => setEditingRef(e.target.value)}
                          className="w-full px-2.5 py-1 text-xs border border-gray-300 rounded bg-white outline-hidden font-mono"
                          placeholder="e.g. Ref No"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">HS Tariff Classification</label>
                        <input
                          type="text"
                          value={editingHsCode}
                          onChange={(e) => setEditingHsCode(e.target.value)}
                          className="w-full px-2.5 py-1 text-xs border border-gray-300 rounded bg-white outline-hidden font-mono"
                          placeholder="e.g. 6217.10.00"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5 text-emerald-800">Assigned Bank</label>
                        <select
                          value={editingBankId}
                          onChange={(e) => setEditingBankId(e.target.value)}
                          className="w-full px-2.5 py-1 text-xs border border-gray-300 rounded bg-white outline-hidden cursor-pointer"
                        >
                          {(banks.length > 0 ? banks : DEFAULT_BANKS).map((bk) => (
                            <option key={bk.id} value={bk.id}>
                              {bk.bankName} ({bk.accountNo})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="col-span-2 md:col-span-2">
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">Delivery Factory Name</label>
                        <input
                          type="text"
                          value={editingFactoryName}
                          onChange={(e) => setEditingFactoryName(e.target.value)}
                          className="w-full px-2.5 py-1 text-xs border border-gray-300 rounded bg-white outline-hidden"
                          placeholder="e.g. Blue Garments Ltd"
                        />
                      </div>
                      <div className="col-span-2 md:col-span-2">
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">Delivery Factory Address</label>
                        <input
                          type="text"
                          value={editingFactoryAddress}
                          onChange={(e) => setEditingFactoryAddress(e.target.value)}
                          className="w-full px-2.5 py-1 text-xs border border-gray-300 rounded bg-white outline-hidden"
                          placeholder="e.g. Tongi I/A, Gazipur"
                        />
                      </div>
                    </div>

                    {/* Edit line items */}
                    <div className="space-y-3.5 border rounded-lg p-3 bg-white">
                      <span className="block text-xs font-bold text-gray-400 uppercase tracking-widest border-b pb-1">Edit PI Line Items</span>
                      <div className="space-y-3 divide-y divide-gray-50">
                        {editingItems.map((item, index) => (
                          <div 
                            key={item.id} 
                            draggable
                            onDragStart={(e) => handleDragStart(e, index)}
                            onDragEnter={(e) => handleDragEnter(index)}
                            onDragEnd={handleDragEnd}
                            onDragOver={handleDragOver}
                            className="pt-3 pb-3 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs hover:bg-slate-50 border-b border-gray-100 last:border-b-0 rounded px-2 transition-all"
                          >
                            <div className="flex items-center gap-3 w-full">
                              {/* Drag Visual Indicator & Up/Down Arrows */}
                              <div className="flex items-center gap-1 shrink-0 select-none">
                                <span className="text-gray-400 font-bold text-lg cursor-grab active:cursor-grabbing hover:text-gray-700" title="Hold to drag reorder">⠿</span>
                                <div className="flex flex-col gap-0.5">
                                  <button
                                    type="button"
                                    onClick={() => moveEditingItemUp(index)}
                                    disabled={index === 0}
                                    className={`p-0.5 rounded ${index === 0 ? 'text-gray-200 cursor-not-allowed' : 'text-gray-500 hover:bg-gray-200 hover:text-gray-900'} transition-colors`}
                                    title="Move Item Up"
                                  >
                                    <ArrowUp className="w-2.5 h-2.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => moveEditingItemDown(index)}
                                    disabled={index === editingItems.length - 1}
                                    className={`p-0.5 rounded ${index === editingItems.length - 1 ? 'text-gray-200 cursor-not-allowed' : 'text-gray-500 hover:bg-gray-200 hover:text-gray-900'} transition-colors`}
                                    title="Move Item Down"
                                  >
                                    <ArrowDown className="w-2.5 h-2.5" />
                                  </button>
                                </div>
                              </div>
                              
                              {/* Inputs grid */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 w-full">
                                <div>
                                  <label className="block text-[8.5px] uppercase font-bold text-gray-400">Description</label>
                                  <input
                                    type="text"
                                    value={item.itemName}
                                    onChange={(e) => handleEditItemField(item.id, 'itemName', e.target.value)}
                                    className="w-full px-2 py-1 text-xs border rounded bg-white font-medium text-slate-800"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[8.5px] uppercase font-bold text-gray-400">PO Number</label>
                                  <input
                                    type="text"
                                    value={item.poNumber}
                                    onChange={(e) => handleEditItemField(item.id, 'poNumber', e.target.value)}
                                    className="w-full px-2 py-1 text-xs border rounded bg-white font-mono text-slate-705"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[8.5px] uppercase font-bold text-gray-400">Style Number</label>
                                  <input
                                    type="text"
                                    value={item.styleNumber}
                                    onChange={(e) => handleEditItemField(item.id, 'styleNumber', e.target.value)}
                                    className="w-full px-2 py-1 text-xs border rounded bg-white font-mono text-slate-705"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[8.5px] uppercase font-bold text-gray-400">Unit</label>
                                  <select
                                    value={item.unit}
                                    onChange={(e) => handleEditItemField(item.id, 'unit', e.target.value)}
                                    className="w-full px-2 py-0.5 text-xs border rounded bg-white cursor-pointer text-slate-800"
                                  >
                                    <option value="Pcs">Pcs</option>
                                    <option value="Dzn">Dzn</option>
                                    <option value="Set">Set</option>
                                    <option value="Yds">Yds</option>
                                    <option value="Roll">Roll</option>
                                    <option value="Cone">Cone</option>
                                    <option value="Kg">Kg</option>
                                    <option value="Mtr">Mtr</option>
                                    <option value="Ctn">Ctn</option>
                                  </select>
                                </div>
                                <div className="grid grid-cols-2 gap-1">
                                  <div>
                                    <label className="block text-[8.5px] uppercase font-bold text-gray-400">Qty</label>
                                    <input
                                      type="number"
                                      step="any"
                                      min="0.001"
                                      value={item.totalQuantity}
                                      onChange={(e) => handleEditItemQuantity(item.id, e.target.value)}
                                      className="w-full px-2 py-1 text-xs text-right border rounded bg-white font-mono text-slate-800"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[8.5px] uppercase font-bold text-gray-400">Price ($)</label>
                                    <input
                                      type="number"
                                      step="0.0001"
                                      min="0"
                                      value={item.unitPrice}
                                      onChange={(e) => handleEditItemPrice(item.id, e.target.value)}
                                      className="w-full px-2 py-1 text-xs text-right border rounded bg-white font-mono text-slate-800"
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleRemoveEditItem(item.id)}
                              className="text-red-500 hover:bg-red-50 p-1.5 rounded mt-3 md:mt-0 shrink-0 self-end md:self-center"
                              title="Remove item"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Terms Editing */}
                    <div className="space-y-3 border rounded-lg p-3 bg-white">
                      <span className="block text-xs font-bold text-gray-400 uppercase tracking-widest border-b pb-1">Edit PI Terms & Conditions</span>
                      <div className="space-y-1.5 max-h-36 overflow-y-auto">
                        {editingTerms.map((term, tIdx) => (
                          <div key={tIdx} className="flex items-center justify-between text-[11px] bg-gray-50 p-1 px-2.5 rounded border border-gray-100">
                            <span className="text-gray-700 leading-relaxed font-medium">{tIdx + 1}. {term}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveEditTerm(tIdx)}
                              className="text-gray-400 hover:text-red-600 font-sans"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={editNewTerm}
                          onChange={(e) => setEditNewTerm(e.target.value)}
                          placeholder="Type customer bullet point..."
                          className="w-full text-xs px-2.5 py-1 border rounded bg-white"
                        />
                        <button
                          type="button"
                          onClick={handleAddEditTerm}
                          className="px-3 py-1 bg-emerald-600 text-white text-[10px] uppercase font-bold rounded"
                        >
                          Add
                        </button>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 border-t pt-3">
                      <button
                        type="button"
                        onClick={() => setIsEditing(false)}
                        className="px-3.5 py-1 text-xs uppercase font-bold border rounded hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => activePreview && handleSavePiEdits(activePreview.id)}
                        className="px-4 py-1.5 text-xs uppercase font-bold bg-emerald-600 text-white rounded flex items-center gap-1.5"
                      >
                        <Save className="w-3.5 h-3.5" /> Save PI Modifications
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 animate-fade-in">
                    
                    {/* Document Branding & Assets Segment (Only shown on screen) */}
                    <div className="bg-[#007d46]/5 border border-[#007d46]/20 p-4 rounded-xl print:hidden space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-[#007d46]">
                          <Sparkles className="w-4 h-4 text-[#007d46]" />
                          <h4 className="text-xs font-black uppercase tracking-wide">Document Printing Assets &amp; Brand Settings</h4>
                        </div>
                        <span className="text-[10px] text-neutral-500 font-medium font-sans">Changes persist globally for all documents</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Watermark Section */}
                        <div className="bg-white p-3 rounded-lg border border-neutral-150 flex flex-col justify-between">
                          <div>
                            <span className="text-[9.5px] uppercase font-black text-neutral-700 block font-sans">Jolchap / Watermark Image (Default)</span>
                            <span className="text-[8.5px] text-neutral-400 block leading-tight mt-0.5 font-sans">
                              This background image will repeat on both PI and Delivery Challan automatically.
                            </span>
                          </div>
                          <div className="flex items-center gap-2 pt-2 border-t border-neutral-100 mt-2 font-sans text-xs">
                            <label className="cursor-pointer bg-neutral-100 px-2.5 py-1 rounded text-[9px] font-bold hover:bg-neutral-200 text-neutral-700 select-none">
                              Upload JPG/PNG
                              <input 
                                type="file" 
                                accept="image/*" 
                                className="hidden" 
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    const reader = new FileReader();
                                    reader.onloadend = () => {
                                      const b64 = reader.result as string;
                                      localStorage.setItem('acoola_global_watermark', b64);
                                      setWatermarkImage(b64);
                                    };
                                    reader.readAsDataURL(file);
                                  }
                                }}
                              />
                            </label>
                            {watermarkImage ? (
                              <div className="flex items-center gap-1 ml-auto">
                                <span className="text-[8.5px] font-bold text-emerald-650 flex items-center gap-0.5"><Check className="w-3 h-3" /> SET</span>
                                <button 
                                  type="button" 
                                  onClick={() => {
                                    localStorage.removeItem('acoola_global_watermark');
                                    setWatermarkImage('');
                                  }}
                                  className="text-[9px] font-bold text-red-600 hover:underline px-1"
                                >
                                  Remove
                                </button>
                              </div>
                            ) : (
                              <span className="text-[8.5px] text-neutral-400 font-mono italic ml-auto">No Watermark</span>
                            )}
                          </div>
                        </div>
                        
                        {/* Signature & Seal Section */}
                        <div className="bg-white p-3 rounded-lg border border-neutral-150 flex flex-col justify-between">
                          <div>
                            <span className="text-[9.5px] uppercase font-black text-neutral-700 block font-sans">Seal &amp; Signature Image (Default)</span>
                            <span className="text-[8.5px] text-neutral-400 block leading-tight mt-0.5 font-sans">
                              Placed right above "For Acoola Trims Corporation" signature line.
                            </span>
                          </div>
                          <div className="flex items-center gap-2 pt-2 border-t border-neutral-100 mt-2 font-sans text-xs">
                            <label className="cursor-pointer bg-neutral-100 px-2.5 py-1 rounded text-[9px] font-bold hover:bg-neutral-200 text-neutral-700 select-none">
                              Upload JPG/PNG
                              <input 
                                type="file" 
                                accept="image/*" 
                                className="hidden" 
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    const reader = new FileReader();
                                    reader.onloadend = () => {
                                      const b64 = reader.result as string;
                                      localStorage.setItem('acoola_global_signature', b64);
                                      setSignatureImage(b64);
                                    };
                                    reader.readAsDataURL(file);
                                  }
                                }}
                              />
                            </label>
                            {signatureImage ? (
                              <div className="flex items-center gap-1 ml-auto">
                                <span className="text-[8.5px] font-bold text-emerald-650 flex items-center gap-0.5"><Check className="w-3 h-3" /> SET</span>
                                <button 
                                  type="button" 
                                  onClick={() => {
                                    localStorage.removeItem('acoola_global_signature');
                                    setSignatureImage('');
                                  }}
                                  className="text-[9px] font-bold text-red-600 hover:underline px-1"
                                >
                                  Remove
                                </button>
                              </div>
                            ) : (
                              <span className="text-[8.5px] text-neutral-400 font-mono italic ml-auto">No Signature</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between border-b border-gray-150 pb-3 flex-wrap gap-2 print:hidden select-none">
                      <div className="flex flex-col">
                        <span className="text-xs font-extrabold text-neutral-400 uppercase tracking-widest font-sans">
                          Proforma Invoice Preview (A4 Scale Layout)
                        </span>
                        <p className="text-[10px] text-amber-600 font-medium leading-tight mt-0.5 font-sans">
                          Note: If printing within this frame doesn't trigger, please open the application in a <strong>New Tab</strong>.
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {canEdit && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleToggleLocalAndGlobal(activePreview.id)}
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-black uppercase tracking-wider rounded-lg border transition-all cursor-pointer ${
                                activePreview.isPurchased
                                  ? 'bg-amber-100 border-amber-300 text-amber-900 hover:bg-amber-200'
                                  : 'bg-indigo-50 border-indigo-250 hover:bg-indigo-100 text-indigo-900'
                              }`}
                            >
                              {activePreview.isPurchased ? '↩ Restore to Active' : '🛒 Mark as Purchased'}
                            </button>
                            <button
                              type="button"
                              onClick={() => startEditingPi(activePreview)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 border border-[#007d46] hover:bg-emerald-50 text-[#007d46] text-xs font-sans font-bold uppercase tracking-wider rounded-lg transition-colors cursor-pointer"
                            >
                              <Edit className="w-3.5 h-3.5" /> Edit Items / Weights
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          onClick={triggerPrint}
                          className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-[#007d46] hover:bg-[#005e34] text-white font-bold text-xs font-sans uppercase tracking-wider rounded-lg shadow-xs transition-colors cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5" /> Print PI Document
                        </button>
                      </div>
                    </div>

                    {/* Multi-color Proforma Invoice layout sheet ready for printing - Styled inside simulated A4 envelope sheets */}
                    <div className="w-full overflow-x-auto py-2 bg-neutral-100/40 rounded-xl flex justify-center print:bg-transparent print:p-0 select-text">
                      <div 
                        className="w-[210mm] min-h-[297mm] p-[6mm] sm:p-[10mm] print:p-[8mm] print:pt-[10mm] border-2 border-neutral-300 shadow-md font-sans bg-white print:border-0 print:shadow-none print:w-full print:min-h-0 text-neutral-900 relative box-border flex flex-col justify-between" 
                        id="proforma-invoice-print-sheet"
                      >
                        {/* Top Emerald Accents Strip */}
                        <div className="absolute top-0 left-0 w-full h-2 bg-[#007d46]" />

                        {/* Background Watermark/Jolchap if configured */}
                        {(COMPANY_PROFILE.logo || watermarkImage) && (
                          <div 
                            className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0 overflow-hidden"
                            style={{ opacity: COMPANY_PROFILE.logo ? 0.05 : 0.12 }}
                          >
                            <img 
                              src={COMPANY_PROFILE.logo || watermarkImage} 
                              alt="Watermark" 
                              className="max-w-[70%] max-h-[45%] object-contain select-none pointer-events-none"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                        )}

                        {/* Top Contents Bundle */}
                        <div className="space-y-3 pt-1.5">
                          {/* Invoice Brand Header Segment */}
                          <div className="flex flex-col sm:flex-row print:flex-row justify-between items-start gap-3 pb-3 border-b border-neutral-200">
                            <div className="flex items-start gap-3 text-left w-full animate-fade-in">
                              {COMPANY_PROFILE.logo && (
                                <div className="w-12 h-12 bg-white border border-neutral-200 rounded p-1 flex items-center justify-center shrink-0 overflow-hidden">
                                  <img src={COMPANY_PROFILE.logo} alt="Company Logo" className="max-w-full max-h-full object-contain" />
                                </div>
                              )}
                              <div className="space-y-0.5 text-left">
                                <h1 className="text-lg sm:text-xl print:text-xl font-black text-[#007d46] uppercase tracking-tight leading-none font-sans">
                                  {COMPANY_PROFILE.name.toUpperCase()}
                                </h1>
                                <p className="text-[7.5px] uppercase font-black text-[#007d46] tracking-widest leading-none mt-1 font-sans">
                                  {COMPANY_PROFILE.tagline.toUpperCase()}
                                </p>
                                <div className="text-[9px] text-neutral-700 font-medium space-y-0 pt-1.5 leading-normal font-sans">
                                  <p><span className="font-bold text-neutral-800 font-sans">Office:</span> {COMPANY_PROFILE.addresses.office}</p>
                                  <p><span className="font-bold text-neutral-805 font-sans">Factory:</span> {COMPANY_PROFILE.addresses.factory}</p>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2.5 shrink-0 text-right">
                              <div className="space-y-0.5">
                                <h2 className="text-sm font-black text-[#007d46] tracking-tight uppercase leading-none font-sans">
                                  PROFORMA INVOICE
                                </h2>
                                <div className="text-[8.5px] text-neutral-750 font-medium font-mono space-y-0 leading-tight">
                                  <p><span className="text-neutral-600 font-sans text-[7.5px] uppercase">Mob :</span> {COMPANY_PROFILE.phones.join(', ')}</p>
                                  {COMPANY_PROFILE.emails.map((email, eIdx) => (
                                    <p key={eIdx}>
                                      <span className="text-neutral-600 font-sans text-[7.5px] uppercase">
                                        {eIdx === 0 ? "Email: " : "       "}
                                      </span>
                                      {email}
                                    </p>
                                  ))}
                                </div>
                              </div>
                              <div className="shrink-0 bg-white p-0.5 rounded border border-neutral-200">
                                <Barcode value={activePreview.invoiceNo} showText={false} />
                              </div>
                            </div>
                          </div>

                          {/* Solid Green separator line */}
                          <div className="border-t-2 border-[#007d46] my-0.5" />

                          {/* Beneficiary To, Advising Bank, & PI Particulars block (3-Column Layout) */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 print:grid-cols-3 gap-2.5 font-sans">
                            {/* BENEFICIARY / TO: */}
                            <div className="border border-neutral-200 rounded-xl p-2.5 bg-white print:bg-transparent shadow-3xs flex flex-col justify-between text-left">
                              <div>
                                <span className="text-[7.5px] uppercase font-bold text-neutral-600 tracking-wider mb-1 block font-black border-b border-neutral-100 pb-0.5">
                                  BENEFICIARY / TO:
                                </span>
                                <h3 className="text-[9.5px] font-black text-neutral-950 leading-tight">
                                  {activePreview.factoryName}
                                </h3>
                                <p className="text-[8.5px] text-neutral-750 font-medium leading-relaxed mt-1 line-clamp-3">
                                  {activePreview.factoryAddress || "Standard Factory Compound, Board Bazar, Gazipur"}
                                </p>
                              </div>
                              <div className="pt-1.5 mt-1.5 border-t border-neutral-150 text-[8.5px] space-y-0.5 text-neutral-850 font-bold">
                                <div className="flex justify-between leading-none">
                                  <span className="text-neutral-550">Buyer Name:</span>
                                  <span className="font-extrabold text-neutral-900">{activePreview.buyerName || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between leading-none">
                                  <span className="text-neutral-550">Ref No:</span>
                                  <span className="font-extrabold text-neutral-900 font-mono">{activePreview.ref || 'N/A'}</span>
                                </div>
                              </div>
                            </div>

                            {/* ADVISING BANK DETAILS */}
                            <div className="border border-neutral-200 rounded-xl p-2.5 bg-white print:bg-transparent shadow-3xs flex flex-col justify-between text-left">
                              <div>
                                <span className="text-[7.5px] uppercase font-bold text-[#007d46] tracking-wider mb-1 block font-black border-b border-neutral-100 pb-0.5">
                                  ADVISING BANK DETAILS:
                                </span>
                                <h4 className="text-[9.5px] font-black text-neutral-950 leading-tight truncate">
                                  {activePreview.bankDetails.bankName}
                                </h4>
                                <p className="text-[8.5px] text-neutral-850 font-bold leading-tight mt-0.5">
                                  Branch: {activePreview.bankDetails.branch}
                                </p>
                                {activePreview.bankDetails.address && (
                                  <p className="text-[7.5px] text-neutral-500 leading-normal font-sans mt-0.5 line-clamp-2">
                                    {activePreview.bankDetails.address}
                                  </p>
                                )}
                              </div>
                              <div className="pt-1.5 mt-1.5 border-t border-neutral-150 text-[8.5px] space-y-1 text-neutral-850 font-bold">
                                <div className="flex justify-between items-start gap-1">
                                  <span className="text-neutral-550 shrink-0">A/C Name:</span>
                                  <span className="font-extrabold text-neutral-900 text-right leading-tight break-words font-sans max-w-[140px]" title={activePreview.bankDetails.accountName}>
                                    {activePreview.bankDetails.accountName}
                                  </span>
                                </div>
                                <div className="flex justify-between leading-none">
                                  <span className="text-neutral-550">A/C No:</span>
                                  <span className="font-extrabold text-neutral-900 font-mono">{activePreview.bankDetails.accountNo}</span>
                                </div>
                                <div className="flex justify-between leading-none">
                                  <span className="text-neutral-550">SWIFT:</span>
                                  <span className="font-extrabold text-[#007d46] font-mono">{activePreview.bankDetails.swiftCode || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between leading-none">
                                  <span className="text-neutral-550">BIN No:</span>
                                  <span className="font-extrabold text-neutral-905 font-mono">{COMPANY_PROFILE.bin}</span>
                                </div>
                              </div>
                            </div>

                            {/* PI DETAILS & PARTICULARS: */}
                            <div className="border border-neutral-200 rounded-xl p-2.5 bg-white print:bg-transparent shadow-3xs space-y-1 text-left flex flex-col justify-between">
                              <div>
                                <span className="text-[7.5px] uppercase font-bold text-neutral-600 tracking-wider mb-1 block font-black border-b border-neutral-100 pb-0.5">
                                  PI PARTICULARS:
                                </span>
                                <div className="text-[8.5px] font-medium space-y-1 font-sans">
                                  <div className="flex justify-between items-center py-0.5 font-bold">
                                    <span className="text-neutral-500 font-semibold">PI Number:</span>
                                    <span className="font-mono font-extrabold text-neutral-900 leading-none">{activePreview.invoiceNo}</span>
                                  </div>
                                  <div className="flex justify-between items-center py-0.5 font-bold border-t border-neutral-50">
                                    <span className="text-neutral-500 font-semibold">Date (Printed):</span>
                                    <span className="font-bold text-neutral-900">
                                      {activePreview.date ? new Date(activePreview.date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'}
                                    </span>
                                  </div>
                                  <div className="flex justify-between items-center py-0.5 font-bold border-t border-neutral-50">
                                    <span className="text-neutral-500 font-semibold">H.S. Code:</span>
                                    <span className="font-mono font-bold text-neutral-900">{activePreview.hsCode || COMPANY_PROFILE.defaultHsCode}</span>
                                  </div>
                                </div>
                              </div>

                              <div className="pt-1 border-t border-neutral-150 text-[8.5px] space-y-0.5 text-neutral-850 font-bold">
                                <div className="flex justify-between leading-none pt-0.5">
                                  <span className="text-neutral-950 font-bold">Validity:</span>
                                  <span className="font-mono font-black text-[#007d46] text-[8.5px]">
                                    {activePreview.date ? new Date(getValidityDate(activePreview.date)).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'}
                                  </span>
                                </div>
                                <div className="flex justify-between leading-none pt-0.5">
                                  <span className="text-neutral-950 font-bold">N.W. / G.W.:</span>
                                  <span className="font-black text-neutral-950 font-mono text-[8.5px]">
                                    {activePreview.netWeight || 'N/A'} / {activePreview.grossWeight || 'N/A'}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Items table with clear headers, lines, and borders */}
                          <div className="overflow-x-auto mt-2.5">
                            <table className="w-full text-left text-[9.5px] border-collapse border border-neutral-200 font-sans">
                              <thead>
                                <tr className="bg-neutral-50 text-neutral-850 font-black uppercase text-[8.5px] tracking-wider border-b border-neutral-250">
                                  <th className="py-1.5 px-2 w-8 text-center border border-neutral-200 text-neutral-700 font-bold">SL</th>
                                  <th className="py-1.5 px-2 border border-neutral-200">STYLE / REF &amp; PO NUMBER</th>
                                  <th className="py-1.5 px-2 border border-neutral-200">DESCRIPTION OF GOODS</th>
                                  <th className="py-1.5 px-2 text-right border border-neutral-200">QUANTITY</th>
                                  <th className="py-1.5 px-2 text-right border border-neutral-200">UNIT PRICE (USD)</th>
                                  <th className="py-1.5 px-2 text-right border border-neutral-200">AMOUNT (USD)</th>
                                </tr>
                              </thead>
                              <tbody className="text-neutral-900 font-medium">
                                {(() => {
                                  // Item-wise consolidation: group all styles of same item type into one row
                                  const groupMap = new Map<string, {
                                    id: string; itemName: string; styleNumber: string; poNumber: string;
                                    unit: string; unitPrice: number; totalQuantity: number; details: string;
                                  }>();
                                  activePreview.items.forEach(item => {
                                    const key = `${item.itemName}||${item.unit}`;
                                    if (groupMap.has(key)) {
                                      const existing = groupMap.get(key)!;
                                      existing.totalQuantity = Math.round((existing.totalQuantity + item.totalQuantity) * 1e10) / 1e10;
                                      if (item.styleNumber && !existing.styleNumber.includes(item.styleNumber)) {
                                        existing.styleNumber = [existing.styleNumber, item.styleNumber].filter(Boolean).join(', ');
                                      }
                                    } else {
                                      groupMap.set(key, {
                                        id: item.id,
                                        itemName: item.itemName,
                                        styleNumber: item.styleNumber || '',
                                        poNumber: item.poNumber || '',
                                        unit: item.unit,
                                        unitPrice: item.unitPrice,
                                        totalQuantity: item.totalQuantity,
                                        details: item.details || ''
                                      });
                                    }
                                  });
                                  // Determine sizeUnit for each consolidated group from its source items
                                  const consolidatedItems = Array.from(groupMap.values()).map(grp => {
                                    const sourceItems = activePreview.items.filter(
                                      i => i.itemName === grp.itemName && i.unit === grp.unit
                                    );
                                    // Get dominant sizeUnit from styleBreakdowns (use first found)
                                    let sizeUnit: string = grp.unit;
                                    for (const src of sourceItems) {
                                      if (src.styleBreakdowns && src.styleBreakdowns.length > 0) {
                                        const su = (src.styleBreakdowns[0] as any).sizeUnit;
                                        if (su) { sizeUnit = su; break; }
                                      }
                                    }
                                    return { ...grp, sizeUnit };
                                  });

                                  // Get all unique active styles and POs across all previewed items
                                  const allUniqueStyles = Array.from(
                                    new Set(
                                      activePreview.items
                                        .map(i => i.styleNumber)
                                        .filter(Boolean)
                                        .flatMap(s => s.split(',').map(sub => sub.trim()).filter(Boolean))
                                    )
                                  );

                                  const allUniquePOs = Array.from(
                                    new Set(
                                      activePreview.items
                                        .map(i => i.poNumber)
                                        .filter(Boolean)
                                        .flatMap(p => p.split(',').map(sub => sub.trim()).filter(Boolean))
                                    )
                                  );

                                  return consolidatedItems.map((item, idx) => {
                                    // Pcs→Dzn: if quantities were entered in Pcs but price unit is Dzn, divide by 12
                                    const needsConversion = item.sizeUnit === 'Pcs' && item.unit === 'Dzn';
                                    const displayQty = needsConversion
                                      ? Math.round((item.totalQuantity / 12) * 1e10) / 1e10
                                      : item.totalQuantity;
                                    const lineTotal = Math.round(displayQty * item.unitPrice * 1e10) / 1e10;
                                    return (
                                      <tr key={item.id + idx} className="align-top border-b border-neutral-200">
                                        <td className="py-1 px-1.5 text-center border border-neutral-200 text-neutral-700 font-mono text-[9px]">{idx + 1}</td>
                                        {idx === 0 && (
                                          <td rowSpan={consolidatedItems.length} className="py-2 px-2.5 border border-neutral-200 text-left bg-white font-mono text-[9px] w-[180px] max-w-[200px]">
                                            <div className="space-y-2 align-top">
                                              <div>
                                                <span className="text-[7.5px] uppercase font-bold text-neutral-500 tracking-wider block leading-none mb-1">STYLE / REF:</span>
                                                <div className="font-extrabold text-neutral-950 flex flex-wrap gap-1 leading-tight">
                                                  {allUniqueStyles.length > 0 ? (
                                                    allUniqueStyles.map((style, stIdx) => (
                                                      <span key={stIdx} className="bg-neutral-100/70 border border-neutral-200/90 text-neutral-900 px-1 rounded-sm text-[8.5px]">{style}</span>
                                                    ))
                                                  ) : (
                                                    <span className="text-neutral-450 italic font-sans font-normal">N/A</span>
                                                  )}
                                                </div>
                                              </div>
                                              {allUniquePOs.length > 0 && (
                                                <div className="pt-2 border-t border-neutral-150">
                                                  <span className="text-[7.5px] uppercase font-bold text-neutral-500 tracking-wider block leading-none mb-1">PO NUMBER:</span>
                                                  <div className="font-extrabold text-neutral-900 flex flex-wrap gap-1 leading-tight">
                                                    {allUniquePOs.map((po, poIdx) => (
                                                      <span key={poIdx} className="bg-neutral-50 border border-neutral-200/80 text-neutral-800 px-1 rounded-sm text-[8.5px]">{po}</span>
                                                    ))}
                                                  </div>
                                                </div>
                                              )}
                                            </div>
                                          </td>
                                        )}
                                        <td className="py-1 px-2 border border-neutral-200 text-left">
                                          <p className="font-extrabold text-neutral-950 leading-tight text-[9.5px]">{item.itemName}</p>
                                          {item.details && <p className="text-[8.5px] text-neutral-600 italic mt-0.5 leading-none">{item.details}</p>}
                                        </td>
                                        <td className="py-1 px-2 text-right font-mono font-bold border border-neutral-200 text-neutral-900 text-[9.5px] bg-neutral-50/10">
                                          {displayQty.toLocaleString()} <span className="text-[8px] font-sans font-medium text-neutral-600">{item.unit}</span>
                                        </td>
                                        <td className="py-1 px-2 text-right font-mono border border-neutral-200 text-neutral-700 text-[9.5px]">
                                          ${item.unitPrice.toFixed(4)}
                                        </td>
                                        <td className="py-1 px-2 text-right font-mono font-extrabold text-neutral-950 border border-neutral-200 text-[9.5px]">
                                          ${lineTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </td>
                                      </tr>
                                    );
                                  });
                                })()}
                              </tbody>
                              <tfoot>
                                <tr className="bg-neutral-50/50 font-black text-neutral-900 border-b border-neutral-250 text-[9.5px]">
                                  <td colSpan={3} className="py-1.5 px-2 text-right border border-neutral-200 font-extrabold">
                                    TOTAL AMOUNT (FOB USD):
                                  </td>
                                  <td className="py-1.5 px-2 text-right font-mono border border-neutral-200 font-bold">
                                    {computePIQtyTotal(activePreview).toLocaleString()}
                                  </td>
                                  <td className="py-1.5 px-2 border border-neutral-250"></td>
                                  <td className="py-1.5 px-2 text-right font-mono border border-neutral-250 font-black text-[#007d46]">
                                    ${computePIUSDTotal(activePreview).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>

                          {/* Words Conversion block */}
                          <div className="border border-neutral-200 rounded-xl p-2 bg-neutral-50/40 text-[9.5px] font-medium leading-relaxed font-sans text-left">
                            <span className="font-black text-neutral-850 text-[9.5px]">In Words:</span>{' '}
                            <span className="text-neutral-900">
                              {numberToWords(computePIUSDTotal(activePreview))}
                            </span>
                          </div>

                          {/* Sequential rows for Terms & Conditions */}
                          <div className="space-y-2 font-sans text-left">
                            {/* Terms & Conditions details (1 full row) */}
                            <div className="border border-neutral-250 rounded-xl p-3 bg-white shadow-3xs space-y-1">
                              <span className="text-[8px] uppercase font-bold text-[#007d46] tracking-wider mb-0.5 block pb-0.5 border-b border-neutral-100 font-black">
                                TERMS &amp; CONDITIONS :
                              </span>
                              <div className="text-[9px] font-medium divide-y divide-neutral-50/50 font-bold">
                                {activePreview.terms && activePreview.terms.map((t, idx) => {
                                  const colonIdx = t.indexOf(':');
                                  if (colonIdx !== -1) {
                                    const key = t.substring(0, colonIdx).trim();
                                    const value = t.substring(colonIdx + 1).trim();
                                    return (
                                      <p key={idx} className="py-0.5 flex gap-1 leading-tight items-start">
                                        <span className="font-bold text-neutral-950 uppercase text-[7.5px] whitespace-nowrap mr-1.5 shrink-0">{key} :</span>
                                        <span className="text-neutral-800">{value}</span>
                                      </p>
                                    );
                                  }
                                  return (
                                    <p key={idx} className="py-0.5 text-neutral-800 leading-tight">
                                      {t}
                                    </p>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Bottom Signatures Block */}
                        <div className="mt-8 pt-4 pb-1 font-sans">
                          <div className="grid grid-cols-2 gap-10 text-center text-[9px] text-neutral-600 font-bold">
                            <div className="relative flex flex-col justify-end items-center h-28 text-center">
                              <div className="border-t border-neutral-400 w-44 pt-1.5" />
                              <p className="font-black text-neutral-950 text-[10px] leading-none font-sans">Accepted &amp; Confirmed By</p>
                              <p className="text-[8px] text-neutral-650 leading-none mt-0.5 font-bold font-sans">Importer / Buyer Signature</p>
                            </div>
                            <div className="relative flex flex-col justify-end items-center h-28 text-center animate-fade-in">
                              {signatureImage && (
                                <img 
                                  src={signatureImage} 
                                  alt="Seal &amp; Signature" 
                                  className="absolute bottom-10 max-h-[75px] w-auto object-contain select-text"
                                  referrerPolicy="no-referrer"
                                />
                              )}
                              <div className="border-t border-[#007d46] w-44 pt-1.5" />
                              <p className="font-black text-[#007d46] text-[10px] leading-none font-sans">For {COMPANY_PROFILE.name}</p>
                              <p className="text-[8px] text-neutral-650 leading-none mt-0.5 font-bold font-sans">Authorized Signature</p>
                            </div>
                          </div>
                        </div>

                        {/* Footer footnote */}
                        <div className="mt-4 flex justify-between items-center text-[8px] text-neutral-400 font-medium font-sans border-t border-neutral-100 pt-2 select-none">
                          <p>This Document is generated by {COMPANY_PROFILE.name} ERP System by Shakhawat.</p>
                          <p className="text-right font-mono text-[7.5px] tracking-wide select-text">PAGE 1 OF 1</p>
                        </div>

                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-24 text-gray-400 select-none">
                <Eye className="w-10 h-10 text-neutral-200 mb-2" />
                <p className="text-xs font-semibold text-neutral-400 uppercase tracking-widest">Select a PI from register to view details</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= MANUAL PI CREATION MODAL ================= */}
      {isManualPiModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto select-text">
          <div className="bg-slate-100 border border-slate-200 rounded-2xl max-w-4xl w-full shadow-2xl p-6 relative flex flex-col max-h-[90vh]">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4 bg-white -mx-6 -mt-6 p-4 rounded-t-2xl">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-650" />
                <span className="font-extrabold text-slate-800 tracking-tight text-sm uppercase">Generate Manual Proforma Invoice</span>
              </div>
              <button
                type="button"
                onClick={() => setIsManualPiModalOpen(false)}
                className="p-1 px-3 bg-slate-200 hover:bg-slate-300 rounded text-xs font-bold text-slate-705 cursor-pointer"
              >
                Close Form
              </button>
            </div>

            {/* Scrollable form body */}
            <form onSubmit={submitManualPi} className="flex-1 overflow-y-auto space-y-4 pr-1">
              
              {/* Info group 1: PI Metadata */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-4 shadow-3xs">
                <h3 className="text-xs font-black text-[#007d46] uppercase tracking-wider border-b border-slate-100 pb-1.5">PI Meta Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">PI Invoice Number *</label>
                    <input
                      type="text"
                      required
                      value={newInvoiceNo}
                      onChange={(e) => setNewInvoiceNo(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-mono text-xs uppercase font-bold text-slate-800"
                      placeholder="e.g. ATC-204"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Buyer/Client Name *</label>
                    <input
                      type="text"
                      required
                      value={newBuyerName}
                      onChange={(e) => setNewBuyerName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-medium text-xs text-slate-800"
                      placeholder="e.g. Zara Dhaka Office / H&M"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">PO / LC Reference *</label>
                    <input
                      type="text"
                      required
                      value={newRef}
                      onChange={(e) => setNewRef(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-medium text-xs text-slate-800"
                      placeholder="e.g. PO-99178-BD"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Date Raised</label>
                    <input
                      type="date"
                      required
                      value={newDate}
                      onChange={(e) => setNewDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-medium text-xs text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Custom HS Code</label>
                    <input
                      type="text"
                      value={newHsCode}
                      onChange={(e) => setNewHsCode(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-mono text-xs text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Advising Receiver Bank</label>
                    <select
                      value={newBankId}
                      onChange={(e) => setNewBankId(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-medium text-xs text-slate-800 cursor-pointer"
                    >
                      {activeBankSelections.map((b) => (
                        <option key={b.id} value={b.id}>{b.bankName} ({b.accountNo})</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Net Weight Specification</label>
                    <input
                      type="text"
                      value={newNetWeight}
                      onChange={(e) => setNewNetWeight(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-medium text-xs text-slate-805"
                      placeholder="e.g. 1200 Kgs"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Gross Weight Specification</label>
                    <input
                      type="text"
                      value={newGrossWeight}
                      onChange={(e) => setNewGrossWeight(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-medium text-xs text-slate-805"
                      placeholder="e.g. 1300 Kgs"
                    />
                  </div>
                </div>
              </div>

              {/* Info group 2: Factory Company Profile */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-4 shadow-3xs">
                <h3 className="text-xs font-black text-emerald-805 uppercase tracking-wider border-b border-slate-100 pb-1.5">Manufacturer Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Exporter Factory Name</label>
                    <input
                      type="text"
                      value={newFactoryName}
                      onChange={(e) => setNewFactoryName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-medium text-xs text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Exporter Registered Factory Address</label>
                    <input
                      type="text"
                      value={newFactoryAddress}
                      onChange={(e) => setNewFactoryAddress(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-medium text-xs text-slate-800"
                    />
                  </div>
                </div>
              </div>

              {/* Info group 3: Items section */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-4 shadow-3xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                  <h3 className="text-xs font-black text-indigo-700 uppercase tracking-wider">PI Item Lines Details</h3>
                  <button
                    type="button"
                    onClick={addManualItemRow}
                    className="px-2.5 py-1 bg-indigo-650 hover:bg-indigo-700 text-white rounded text-[10.5px] uppercase font-black tracking-wide flex items-center gap-1 cursor-pointer transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Item</span>
                  </button>
                </div>

                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[9.5px] font-black uppercase text-slate-500">
                        <th className="p-2 border-r border-slate-200" style={{ width: '40px' }}>SL</th>
                        <th className="p-2 border-r border-slate-200">Product / Quality Item Description *</th>
                        <th className="p-2 border-r border-slate-200" style={{ width: '100px' }}>PO Number</th>
                        <th className="p-2 border-r border-slate-200" style={{ width: '100px' }}>Style Number</th>
                        <th className="p-2 border-r border-slate-200" style={{ width: '80px' }}>Unit</th>
                        <th className="p-2 border-r border-slate-200" style={{ width: '90px' }}>Quantity</th>
                        <th className="p-2 border-r border-slate-200" style={{ width: '90px' }}>Unit Price ($)</th>
                        <th className="p-2" style={{ width: '50px' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-150">
                      {newItems.map((item, idx) => (
                        <tr key={item.id} className="hover:bg-slate-50/20">
                          <td className="p-1 text-center font-bold text-slate-400 border-r border-slate-200 bg-slate-50/50">{idx + 1}</td>
                          <td className="p-1 border-r border-slate-200">
                            <input
                              type="text"
                              required
                              placeholder="e.g. Plastic Hanger / Satin Label"
                              value={item.itemName}
                              onChange={(e) => updateManualItemField(item.id, 'itemName', e.target.value)}
                              className="w-full bg-transparent border-0 focus:ring-0 p-1 font-bold text-xs text-slate-800"
                            />
                          </td>
                          <td className="p-1 border-r border-slate-200">
                            <input
                              type="text"
                              placeholder="e.g. 52024"
                              value={item.poNumber}
                              onChange={(e) => updateManualItemField(item.id, 'poNumber', e.target.value)}
                              className="w-full bg-transparent border-0 focus:ring-0 p-1 font-mono font-medium text-xs text-slate-700"
                            />
                          </td>
                          <td className="p-1 border-r border-slate-200">
                            <input
                              type="text"
                              placeholder="e.g. Style-9"
                              value={item.styleNumber}
                              onChange={(e) => updateManualItemField(item.id, 'styleNumber', e.target.value)}
                              className="w-full bg-transparent border-0 focus:ring-0 p-1 font-mono font-medium text-xs text-slate-705"
                            />
                          </td>
                          <td className="p-1 border-r border-slate-200">
                            <select
                              value={item.unit}
                              onChange={(e) => updateManualItemField(item.id, 'unit', e.target.value)}
                              className="w-full bg-transparent border-0 focus:ring-0 p-1 font-medium text-xs text-slate-700 cursor-pointer"
                            >
                              <option value="Pcs">Pcs</option>
                              <option value="Dzn">Dzn</option>
                              <option value="Set">Set</option>
                              <option value="Yds">Yds</option>
                              <option value="Roll">Roll</option>
                              <option value="Cone">Cone</option>
                              <option value="Kg">Kg</option>
                              <option value="Mtr">Mtr</option>
                              <option value="Ctn">Ctn</option>
                            </select>
                          </td>
                          <td className="p-1 border-r border-slate-200">
                            <input
                              type="number"
                              required
                              min="0"
                              step="any"
                              placeholder="0"
                              value={item.totalQuantity || ''}
                              onChange={(e) => updateManualItemField(item.id, 'totalQuantity', e.target.value)}
                              className="w-full bg-transparent border-0 focus:ring-0 p-1 font-mono font-medium text-xs text-slate-700 text-right"
                            />
                          </td>
                          <td className="p-1 border-r border-slate-200">
                            <input
                              type="number"
                              required
                              min="0"
                              step="any"
                              placeholder="0.00"
                              value={item.unitPrice || ''}
                              onChange={(e) => updateManualItemField(item.id, 'unitPrice', e.target.value)}
                              className="w-full bg-transparent border-0 focus:ring-0 p-1 font-mono font-medium text-xs text-slate-700 text-right"
                            />
                          </td>
                          <td className="p-1 text-center bg-red-50/5">
                            <button
                              type="button"
                              onClick={() => removeManualItemRow(item.id)}
                              className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded cursor-pointer transition animate-none"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Form buttons */}
              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4 bg-white -mx-6 -mb-6 p-4 rounded-b-2xl">
                <button
                  type="button"
                  onClick={() => setIsManualPiModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-205 text-slate-750 rounded-lg font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#007d46] hover:bg-emerald-700 text-white rounded-lg font-bold shadow-md transition-colors cursor-pointer"
                >
                  Generate &amp; Save PI
                </button>
              </div>

            </form>

          </div>
        </div>
      )}
    </div>
  );
}
