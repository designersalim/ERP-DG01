import React, { useState, useMemo, useEffect } from 'react';
import { ProformaInvoice, DeliveryChallan, CommercialInvoice, BankDetails, SizeEntry } from '../types';
import { COMPANY_PROFILE } from '../data';
import Barcode from './Barcode';
import { 
  Printer, 
  FileText, 
  Check, 
  Plus, 
  Trash2, 
  Edit3, 
  ShieldAlert, 
  Sparkles, 
  Send, 
  Coins, 
  FileCheck, 
  Landmark, 
  Receipt, 
  Archive 
} from 'lucide-react';

interface CommercialInvoiceHubProps {
  pis: ProformaInvoice[];
  challans: DeliveryChallan[];
  commercialInvoices: CommercialInvoice[];
  banks: BankDetails[];
  onAddCommercialInvoice: (ci: CommercialInvoice) => void;
  onUpdateCommercialInvoice: (ci: CommercialInvoice) => void;
  onDeleteCommercialInvoice: (id: string) => void;
}

export default function CommercialInvoiceHub({
  pis,
  challans,
  commercialInvoices,
  banks,
  onAddCommercialInvoice,
  onUpdateCommercialInvoice,
  onDeleteCommercialInvoice
}: CommercialInvoiceHubProps) {
  const [activePreview, setActivePreview] = useState<CommercialInvoice | null>(null);
  const [selectedPi, setSelectedPi] = useState<ProformaInvoice | null>(null);
  const [selectedChallanIds, setSelectedChallanIds] = useState<string[]>([]);
  const [previewTab, setPreviewTab] = useState<'invoice' | 'packing-list'>('invoice');

  // Input fields for Trade/Credit details
  const [invoiceNo, setInvoiceNo] = useState('');
  const [lcNo, setLcNo] = useState('N/A');
  const [lcDate, setLcDate] = useState('');
  const [expNo, setExpNo] = useState('N/A');
  const [expDate, setExpDate] = useState('');
  const [truckNo, setTruckNo] = useState('Covered Van / DM-TA-9932');
  const [grossWeight, setGrossWeight] = useState('240.50 Kgs');
  const [netWeight, setNetWeight] = useState('210.00 Kgs');
  const [totalCartons, setTotalCartons] = useState(12);

  // Editing state for existing invoice/packing list
  const [editingCi, setEditingCi] = useState<CommercialInvoice | null>(null);
  const [editInvoiceNo, setEditInvoiceNo] = useState('');
  const [editLcNo, setEditLcNo] = useState('');
  const [editLcDate, setEditLcDate] = useState('');
  const [editExpNo, setEditExpNo] = useState('');
  const [editExpDate, setEditExpDate] = useState('');
  const [editTruckNo, setEditTruckNo] = useState('');
  const [editGrossWeight, setEditGrossWeight] = useState('');
  const [editNetWeight, setEditNetWeight] = useState('');
  const [editTotalCartons, setEditTotalCartons] = useState(1);
  const [editHsCode, setEditHsCode] = useState('');
  const [editBankId, setEditBankId] = useState('');
  const [editItems, setEditItems] = useState<{
    itemName: string;
    poNumber: string;
    styleNumber: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    amount: number;
  }[]>([]);

  // React State-driven reliable Printing engine to bypass Iframe security policies
  const [printData, setPrintData] = useState<{ ci: CommercialInvoice; type: 'invoice' | 'packing-list' } | null>(null);

  // Filter delivered challans matching the same factoryName of the selected PI
  const availableChallans = useMemo(() => {
    if (!selectedPi) return [];
    return challans.filter(c => c.factoryName === selectedPi.factoryName);
  }, [selectedPi, challans]);

  const handleStartGeneration = (pi: ProformaInvoice) => {
    setSelectedPi(pi);
    // Create an incremental Invoice No
    const serial = 100 + (commercialInvoices.length + 1);
    setInvoiceNo(`ATC-CI-2026-${serial}`);
    setSelectedChallanIds([]);
    
    // Auto-propagate weights from PI
    setNetWeight(pi.netWeight || '180 Kgs');
    setGrossWeight(pi.grossWeight || '210 Kgs');
  };

  const handleToggleChallanSelection = (challanId: string) => {
    setSelectedChallanIds(prev =>
      prev.includes(challanId)
        ? prev.filter(id => id !== challanId)
        : [...prev, challanId]
    );
  };

  const handleGenerateInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPi) return;

    // Collate selected challans
    const matchedChallans = challans.filter(c => selectedChallanIds.includes(c.id));
    const challanNumbers = matchedChallans.map(c => c.challanNo);

    // Map items from PI
    const invoiceItems = selectedPi.items.map(item => ({
      itemName: item.itemName,
      poNumber: item.poNumber,
      styleNumber: item.styleNumber,
      quantity: item.totalQuantity,
      unit: item.unit,
      unitPrice: item.unitPrice,
      amount: item.totalQuantity * item.unitPrice
    }));

    const totalAmount = invoiceItems.reduce((sum, item) => sum + item.amount, 0);

    // Auto-compute packing list carton allocations
    // Spread target quantities over Carton numbers dynamically for absolute detail
    const packingListItems: CommercialInvoice['packingList'] = [];
    const nwNum = parseFloat(netWeight) || 0;
    const gwNum = parseFloat(grossWeight) || 0;

    selectedPi.items.forEach((item, itemIdx) => {
      const cartonCount = Math.max(1, Math.round(totalCartons / selectedPi.items.length));
      for (let i = 1; i <= cartonCount; i++) {
        const cartonNo = `CTN-${itemIdx + 1}-${i}/${totalCartons}`;
        const qtyPerCtn = Math.round(item.totalQuantity / cartonCount);

        packingListItems.push({
          cartonNo,
          itemName: item.itemName,
          poNumber: item.poNumber,
          styleNumber: item.styleNumber,
          sizes: (item.sizes || []).map(s => ({
            size: s.size,
            quantity: Math.round(s.quantity / cartonCount)
          })),
          quantity: qtyPerCtn,
          unit: item.unit,
          netWeight: totalCartons > 0 ? `${(nwNum / totalCartons).toFixed(2)} Kgs` : '0 Kgs',
          grossWeight: totalCartons > 0 ? `${(gwNum / totalCartons).toFixed(2)} Kgs` : '0 Kgs'
        });
      }
    });

    const newCi: CommercialInvoice = {
      id: `ci-${Date.now()}`,
      invoiceNo,
      piNo: selectedPi.invoiceNo,
      piId: selectedPi.id,
      date: new Date().toISOString().substring(0, 10),
      challanNos: challanNumbers,
      factoryName: selectedPi.factoryName,
      factoryAddress: selectedPi.factoryAddress,
      buyerName: selectedPi.buyerName,
      items: invoiceItems,
      totalAmount,
      bankDetails: selectedPi.bankDetails,
      hsCode: selectedPi.hsCode || '6217.10.00',
      lcNo,
      lcDate,
      expNo,
      expDate,
      truckNo,
      grossWeight,
      netWeight,
      totalCartons,
      packingList: packingListItems,
      createdAt: new Date().toISOString()
    };

    onAddCommercialInvoice(newCi);
    setSelectedPi(null);
    setActivePreview(newCi);
  };

  // Safe non-blocking preview template triggers
  const triggerPrintCommercial = (ci: CommercialInvoice, type: 'invoice' | 'packing-list') => {
    setPrintData({ ci, type });
  };

  // Launching the editor
  const triggerEditCi = (ci: CommercialInvoice) => {
    setEditingCi(ci);
    setEditInvoiceNo(ci.invoiceNo);
    setEditLcNo(ci.lcNo || 'N/A');
    setEditLcDate(ci.lcDate || '');
    setEditExpNo(ci.expNo || 'N/A');
    setEditExpDate(ci.expDate || '');
    setEditTruckNo(ci.truckNo || 'Covered Van');
    setEditGrossWeight(ci.grossWeight || '210 Kgs');
    setEditNetWeight(ci.netWeight || '180 Kgs');
    setEditTotalCartons(ci.totalCartons || 12);
    setEditHsCode(ci.hsCode || '6217.10.00');
    setEditBankId(ci.bankDetails.accountNo);
    
    // De-reference items list for non-destructive edit state
    setEditItems(ci.items.map(item => ({ ...item })));
  };

  const handleEditItemField = (index: number, field: 'quantity' | 'unitPrice', val: number) => {
    setEditItems(prev => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        [field]: val,
        amount: field === 'quantity' ? val * copy[index].unitPrice : copy[index].quantity * val
      };
      return copy;
    });
  };

  const handleSaveCiEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCi) return;

    const matchedBank = banks.find(b => b.accountNo === editBankId) || editingCi.bankDetails;
    const computedTotal = editItems.reduce((sum, item) => sum + item.amount, 0);

    // Re-propagate carton wise sizes based on modified totals
    const regeneratedPackingList = editingCi.packingList.map(ctn => {
      // Find matching edited item to calculate ratio
      const editedItem = editItems.find(it => it.itemName === ctn.itemName);
      if (!editedItem) return ctn;

      const originalItem = editingCi.items.find(it => it.itemName === ctn.itemName);
      const originalTotalQty = originalItem ? originalItem.quantity : 1;
      const factor = editedItem.quantity / originalTotalQty;

      return {
        ...ctn,
        quantity: Math.round(ctn.quantity * factor),
        sizes: ctn.sizes.map(sz => ({
          ...sz,
          quantity: Math.round(sz.quantity * factor)
        })),
        netWeight: `${((parseFloat(editNetWeight) || 0) / editTotalCartons).toFixed(2)} Kgs`,
        grossWeight: `${((parseFloat(editGrossWeight) || 0) / editTotalCartons).toFixed(2)} Kgs`
      };
    });

    const updatedCi: CommercialInvoice = {
      ...editingCi,
      invoiceNo: editInvoiceNo,
      lcNo: editLcNo,
      lcDate: editLcDate,
      expNo: editExpNo,
      expDate: editExpDate,
      truckNo: editTruckNo,
      grossWeight: editGrossWeight,
      netWeight: editNetWeight,
      totalCartons: editTotalCartons,
      hsCode: editHsCode,
      items: editItems,
      totalAmount: computedTotal,
      bankDetails: matchedBank,
      packingList: regeneratedPackingList
    };

    onUpdateCommercialInvoice(updatedCi);
    
    // Automatically swap active preview if currently looking at it
    if (activePreview && activePreview.id === editingCi.id) {
      setActivePreview(updatedCi);
    }
    
    setEditingCi(null);
  };

  const amountInWords = (num: number) => {
    const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    
    const cleanNum = Math.floor(num);
    const cents = Math.round((num - cleanNum) * 105) % 100;

    const toWords = (n: number): string => {
      if (n < 20) return a[n];
      if (n < 100) return b[Math.floor(n / 10)] + ' ' + a[n % 10];
      if (n < 1000) return a[Math.floor(n / 100)] + ' Hundred ' + toWords(n % 100);
      if (n < 1000000) return toWords(Math.floor(n / 1000)) + ' Thousand ' + toWords(n % 1000);
      return toWords(Math.floor(n / 1000000)) + ' Million ' + toWords(n % 1000000);
    };

    const wordStr = toWords(cleanNum);
    const centStr = cents > 0 ? ` and Cents ${toWords(cents)}` : '';
    return `US Dollar ${wordStr}${centStr} Only.`;
  };

  return (
    <div className="space-y-6">
      {/* Upper Tab Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-4 print:hidden">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900 tracking-tight flex items-center gap-1.5 leading-none">
            🧾 রপ্তানি কমার্শিয়াল ইনভয়েস ও প্যাকিং লিস্ট সেন্টার (Invoice & Packing Hub)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            ডেলিভারি সম্পন্ন হওয়ার পর প্রফর্মা ইনভয়েস (PI) ও চালানের তথ্যের ওপর সরাসরি ভিত্তি করে স্বয়ংক্রিয় কমার্শিয়াল ইনভয়েস ও কন্টেইনার প্যাকিং লিস্ট জেনারেট করুন।
          </p>
        </div>
      </div>

      {/* Generation Workspace Flow */}
      {selectedPi ? (
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4 print:hidden">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <h3 className="text-sm font-black text-slate-800 uppercase flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" /> Generating Invoice from PI: {selectedPi.invoiceNo}
            </h3>
            <button
              onClick={() => setSelectedPi(null)}
              className="px-3 py-1 bg-slate-100 hover:bg-slate-200 rounded text-xs font-bold text-slate-600 transition-colors"
            >
              Cancel Process
            </button>
          </div>

          <form onSubmit={handleGenerateInvoice} className="space-y-5 text-xs text-slate-700">
            {/* Step 1: Challans Matching */}
            <div className="space-y-2">
              <span className="block text-[10.5px] uppercase font-bold text-slate-400">Step 1: Select corresponding Delivered Challans (চালান সংযুক্তি)</span>
              {availableChallans.length === 0 ? (
                <div className="p-3 bg-rose-50 border border-rose-100 rounded-lg text-rose-800 font-medium">
                  ⚠️ This factory doesn't have any delivery challan in records! You can still generate a direct cargo Invoice.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {availableChallans.map(c => {
                    const selected = selectedChallanIds.includes(c.id);
                    return (
                      <div
                        key={c.id}
                        onClick={() => handleToggleChallanSelection(c.id)}
                        className={`p-3 border rounded-lg cursor-pointer flex justify-between items-center transition-all ${
                          selected 
                            ? 'border-emerald-600 bg-emerald-50/50 text-emerald-950 shadow-xs' 
                            : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700'
                        }`}
                      >
                        <div>
                          <p className="font-extrabold text-xs">{c.challanNo}</p>
                          <p className="text-[9.5px] text-slate-500 mt-0.5">Date: {c.date} • {c.items.length} Items</p>
                        </div>
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          selected ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-300 bg-white'
                        }`}>
                          {selected && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Step 2: Trade details inputs */}
            <div className="space-y-3 pt-2">
              <span className="block text-[10.5px] uppercase font-bold text-slate-400">Step 2: Commercial Credit & Physical Weights (এলসি ও ওজনের তথ্য)</span>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">Commercial Invoice No.</label>
                  <input
                    type="text"
                    required
                    value={invoiceNo}
                    onChange={(e) => setInvoiceNo(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-bold focus:border-indigo-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">L/C / Sales Contract No.</label>
                  <input
                    type="text"
                    required
                    value={lcNo}
                    onChange={(e) => setLcNo(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-bold focus:border-indigo-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">L/C Date (if any)</label>
                  <input
                    type="date"
                    value={lcDate}
                    onChange={(e) => setLcDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-bold focus:border-indigo-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">EXP Form number</label>
                  <input
                    type="text"
                    required
                    value={expNo}
                    onChange={(e) => setExpNo(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-bold focus:border-indigo-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">EXP Date</label>
                  <input
                    type="date"
                    value={expDate}
                    onChange={(e) => setExpDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-bold focus:border-indigo-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">Dispatched Truck No</label>
                  <input
                    type="text"
                    value={truckNo}
                    onChange={(e) => setTruckNo(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-semibold focus:border-indigo-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">Net Weight (নিকট ওজন)</label>
                  <input
                    type="text"
                    required
                    value={netWeight}
                    onChange={(e) => setNetWeight(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">Gross Weight (মোট ওজন)</label>
                  <input
                    type="text"
                    required
                    value={grossWeight}
                    onChange={(e) => setGrossWeight(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-1">Total Shipment Cartons (মোট কার্টন)</label>
                  <input
                    type="number"
                    required
                    value={totalCartons}
                    onChange={(e) => setTotalCartons(parseInt(e.target.value) || 1)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-black"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-2 bg-[#007d46] hover:bg-[#006438] active:bg-[#007d46]/90 text-white font-extrabold uppercase tracking-widest text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-sm transition-colors animate-pulse"
                style={{ animationDuration: '3s' }}
              >
                <FileCheck className="w-4 h-4" /> কমার্শিয়াল ইনভয়েস ও প্যাকিং লিস্ট চূড়ান্ত করুন (Approve & Generate Trades)
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print:hidden">
          {/* Left Side: Dynamic PIs awaiting Commercial Invoices */}
          <div className="space-y-4">
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
              <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-700 flex items-center gap-1">
                <Archive className="w-4 h-4 text-emerald-600" /> Pending Proforma Invoices (PI তালিকা)
              </h3>
              <p className="text-[10px] text-slate-400 mt-0.5">Select a Proforma invoice below to compute final trade invoice and carton packing details.</p>
            </div>

            <div className="space-y-3">
              {pis.map(pi => {
                const alreadyGenerated = commercialInvoices.some(ci => ci.piId === pi.id);
                return (
                  <div key={pi.id} className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs hover:border-indigo-200 transition-colors flex justify-between items-center gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-sm text-slate-900">{pi.invoiceNo}</span>
                        <span className="text-[9.5px] font-bold text-slate-400">({pi.date})</span>
                      </div>
                      <p className="font-bold text-xs text-neutral-800 mt-1">{pi.factoryName}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        Brand: {pi.buyerName} • Value: <strong className="text-emerald-700">${pi.items.reduce((sum, item) => sum + (item.totalQuantity * item.unitPrice), 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</strong>
                      </p>
                    </div>

                    <div>
                      {alreadyGenerated ? (
                        <span className="inline-block px-2.5 py-1 bg-slate-100 text-slate-500 border border-slate-200 rounded text-[10px] font-bold uppercase">
                          Issued
                        </span>
                      ) : (
                        <button
                          onClick={() => handleStartGeneration(pi)}
                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-extrabold uppercase tracking-wide flex items-center gap-1 cursor-pointer transition-all"
                        >
                          <Receipt className="w-3.5 h-3.5" /> Generate CI
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Side: Active Saved Commercial Invoices */}
          <div className="space-y-4">
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl">
              <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-700 flex items-center gap-1">
                <FileCheck className="w-4 h-4 text-indigo-600" /> Issued Commercial Invoices (রপ্তানি রশিদসমূহ)
              </h3>
              <p className="text-[10px] text-slate-400 mt-0.5">Issued and finalized container delivery commercial bills with respective packing data.</p>
            </div>

            {commercialInvoices.length === 0 ? (
              <div className="py-16 text-center text-slate-400 bg-white border border-dashed border-slate-200 rounded-2xl">
                <p className="font-bold">কোনো কমার্শিয়াল ইনভয়েস পাওয়া যায়নি</p>
                <p className="text-[10px]">বামপাশের যে কোনো পেন্ডিং PI এর পাশের বাটনে ক্লিক করে ইনভয়েস ইস্যু করতে পারেন।</p>
              </div>
            ) : (
              <div className="space-y-3">
                {commercialInvoices.map(ci => (
                  <div key={ci.id} className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
                    <div className="p-4 flex justify-between items-start gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-black text-sm text-slate-900">{ci.invoiceNo}</span>
                          <span className="text-[9.5px] font-bold text-indigo-600">PI Ref: {ci.piNo}</span>
                        </div>
                        <p className="font-extrabold text-xs text-neutral-800 mt-1">{ci.factoryName}</p>
                        <p className="text-[10px] text-slate-500 mt-1">
                          Value: <strong className="text-emerald-700">${ci.totalAmount.toLocaleString(undefined, {minimumFractionDigits: 2})}</strong> • Trucks: {ci.truckNo}
                        </p>
                        <div className="text-[9px] text-slate-400 mt-1">
                          CTNs: {ci.totalCartons} • Net/Gross: {ci.netWeight} / {ci.grossWeight}
                        </div>
                      </div>

                      <div className="flex flex-col gap-1.5 shrink-0">
                        <button
                          onClick={() => triggerPrintCommercial(ci, 'invoice')}
                          className="px-2.5 py-1 bg-neutral-900 hover:bg-neutral-950 text-white rounded text-[9.5px] font-semibold flex items-center gap-1 justify-center shadow-xs transition-colors cursor-pointer uppercase"
                        >
                          <Printer className="w-3 h-3" /> CI Print
                        </button>
                        <button
                          onClick={() => triggerPrintCommercial(ci, 'packing-list')}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[9.5px] font-semibold flex items-center gap-1 justify-center transition-colors cursor-pointer uppercase"
                        >
                          <Archive className="w-3 h-3" /> P-List Print
                        </button>
                        <div className="flex gap-1.5 w-full">
                          <button
                            onClick={() => triggerEditCi(ci)}
                            className="flex-1 py-1 px-1.5 border border-slate-200 hover:border-emerald-600 hover:text-emerald-700 rounded text-[9.5px] font-bold uppercase cursor-pointer flex justify-center items-center gap-0.5"
                            title="Edit Invoice Information"
                          >
                            <Edit3 className="w-2.5 h-2.5" /> Edit
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm(`Are you sure you want to permanently delete commercial records for ${ci.invoiceNo}?`)) {
                                onDeleteCommercialInvoice(ci.id);
                              }
                            }}
                            className="p-1 border border-rose-100 hover:border-rose-450 hover:bg-rose-50 text-rose-500 rounded flex justify-center items-center cursor-pointer transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ✏️ EDIT COMMERCIAL INVOICE & PACKING LIST MODAL */}
      {editingCi && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full shadow-lg p-6 space-y-4 text-xs max-h-[90vh] overflow-y-auto antialiased">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-800 uppercase flex items-center gap-1.5 font-sans">
                <FileText className="w-4 h-4 text-emerald-600" /> Edit Commercial Invoice & Packing List (তথ্য সম্পাদন করুন)
              </h3>
              <button
                onClick={() => setEditingCi(null)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCiEdit} className="space-y-4 text-left">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Invoice Number</label>
                  <input
                    type="text"
                    value={editInvoiceNo}
                    onChange={(e) => setEditInvoiceNo(e.target.value)}
                    className="w-full mt-1 px-3 py-1.5 border border-slate-200 rounded-lg font-mono focus:outline-emerald-600 font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">H.S. Code</label>
                  <input
                    type="text"
                    value={editHsCode}
                    onChange={(e) => setEditHsCode(e.target.value)}
                    className="w-full mt-1 px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-emerald-600 font-bold"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Remittance Bank</label>
                  <select
                    value={editBankId}
                    onChange={(e) => setEditBankId(e.target.value)}
                    className="w-full mt-1 px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-emerald-600 font-bold"
                  >
                    {banks.map(b => (
                      <option key={b.accountNo} value={b.accountNo}>
                        {b.bankName} - {b.accountNo}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">L/C or Contract No</label>
                  <input
                    type="text"
                    value={editLcNo}
                    onChange={(e) => setEditLcNo(e.target.value)}
                    className="w-full mt-1 px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-emerald-600 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">L/C Date</label>
                  <input
                    type="date"
                    value={editLcDate}
                    onChange={(e) => setEditLcDate(e.target.value)}
                    className="w-full mt-1 px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-emerald-600"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">EXP Form No</label>
                  <input
                    type="text"
                    value={editExpNo}
                    onChange={(e) => setEditExpNo(e.target.value)}
                    className="w-full mt-1 px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-emerald-600 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">EXP Date</label>
                  <input
                    type="date"
                    value={editExpDate}
                    onChange={(e) => setEditExpDate(e.target.value)}
                    className="w-full mt-1 px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-emerald-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Cargo Truck No</label>
                  <input
                    type="text"
                    value={editTruckNo}
                    onChange={(e) => setEditTruckNo(e.target.value)}
                    className="w-full mt-1 px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-emerald-600 font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Net Weight</label>
                  <input
                    type="text"
                    value={editNetWeight}
                    onChange={(e) => setEditNetWeight(e.target.value)}
                    className="w-full mt-1 px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-emerald-600 font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Gross Weight</label>
                  <input
                    type="text"
                    value={editGrossWeight}
                    onChange={(e) => setEditGrossWeight(e.target.value)}
                    className="w-full mt-1 px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-emerald-600 font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">Total Cartons</label>
                  <input
                    type="number"
                    value={editTotalCartons}
                    onChange={(e) => setEditTotalCartons(parseInt(e.target.value) || 1)}
                    className="w-full mt-1 px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-emerald-600 font-bold"
                  />
                </div>
              </div>

              {/* Editable items list inside Commercial Invoice */}
              <div className="border border-slate-150 rounded-xl overflow-hidden mt-2">
                <div className="bg-slate-50 p-2.5 border-b border-slate-150 font-bold uppercase text-[9.5px] text-slate-700">
                  Export cargo shipment quantity editor (পণ্য সংখ্যা ও মূল্য সংশোধন)
                </div>
                <div className="p-3 space-y-2 max-h-[180px] overflow-y-auto">
                  {editItems.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-center border-b border-dashed border-slate-100 pb-2 last:border-0 last:pb-0">
                      <div className="font-extrabold text-slate-900">{item.itemName}</div>
                      <div>
                        <span className="block text-[8px] text-slate-400">Style/PO</span>
                        <span className="font-mono text-[9px] text-slate-500">{item.styleNumber} / {item.poNumber}</span>
                      </div>
                      <div>
                        <span className="block text-[8px] font-bold text-slate-500 uppercase">Shipped Qty</span>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => handleEditItemField(idx, 'quantity', parseInt(e.target.value) || 0)}
                          className="w-full px-2 py-1 border border-slate-250 rounded font-bold"
                        />
                      </div>
                      <div>
                        <span className="block text-[8px] font-bold text-slate-500 uppercase">Unit Price (USD)</span>
                        <input
                          type="number"
                          step="0.0001"
                          value={item.unitPrice}
                          onChange={(e) => handleEditItemField(idx, 'unitPrice', parseFloat(e.target.value) || 0)}
                          className="w-full px-2 py-1 border border-slate-250 rounded font-bold font-mono text-right"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#007d46] hover:bg-[#006438] text-white font-bold rounded-lg cursor-pointer text-xs"
                >
                  Save Changes (হালনাগাদ করুন)
                </button>
                <button
                  type="button"
                  onClick={() => setEditingCi(null)}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg cursor-pointer text-xs"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 📊 Global Hidden Print Container for Commercial Invoice / Packing List */}
      {printData && (
        <>
          {/* On-Screen Interactive Print Preview Modal */}
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto print:hidden text-left">
            <div className="bg-slate-50 border border-slate-200 rounded-2xl max-w-3xl w-full shadow-lg p-6 space-y-4 text-xs animate-fade-in">
              <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-800 uppercase flex items-center gap-1.5 font-sans">
                  <Printer className="w-4 h-4 text-emerald-600" /> {printData.type === 'invoice' ? 'Commercial Invoice' : 'Packing List'} Print Preview
                </h3>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const sheetId = printData.type === 'invoice' ? 'commercial-invoice-print-sheet' : 'packing-list-print-sheet';
                      const element = document.getElementById(sheetId);
                      if (!element) return;
                      const printWindow = window.open('', '_blank', 'width=1000,height=800');
                      if (!printWindow) {
                        window.focus();
                        window.print();
                        return;
                      }
                      const styleLinks = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
                        .map(el => el.outerHTML)
                        .join('\n');
                      const customStyles = `
                        <style>
                          body { margin: 0; padding: 10mm !important; background-color: #ffffff; color: #171717; font-family: sans-serif; }
                          #${sheetId} { display: block !important; visibility: visible !important; width: 100% !important; margin: 0 !important; padding: 0 !important; }
                          #${sheetId} * { visibility: visible !important; }
                          @page { size: A4 portrait; margin: 10mm; }
                        </style>
                      `;
                      printWindow.document.write(`
                        <html>
                          <head>
                            <title>${printData.type === 'invoice' ? 'Commercial Invoice' : 'Packing List'} - ${printData.ci.invoiceNo}</title>
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
                                setTimeout(function() { window.close(); }, 1200);
                              }
                              if (document.readyState === 'complete') {
                                setTimeout(doPrint, 800);
                              } else {
                                window.addEventListener('load', function() { setTimeout(doPrint, 800); });
                              }
                            </script>
                          </body>
                        </html>
                      `);
                      printWindow.document.close();
                    }}
                    className="px-4 py-1.5 bg-[#007d46] hover:bg-[#006438] text-white font-extrabold text-[10px] uppercase tracking-wider rounded-lg flex items-center gap-1 cursor-pointer transition-all shadow-xs"
                  >
                    <Printer className="w-3.5 h-3.5" /> Print Statement
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrintData(null)}
                    className="px-3 py-1.5 bg-slate-250 hover:bg-slate-355 text-slate-700 font-bold rounded-lg cursor-pointer text-[10px]"
                  >
                    Close Preview
                  </button>
                </div>
              </div>

              <div className="p-2.5 text-center bg-amber-50 text-amber-800 border border-amber-250/30 rounded font-bold text-[9.5px]">
                📌 ব্রাউজার সিকিউরিটি পলিসির কারণে সরাসরি প্রিন্ট ওপেন না হলে দয়া করে উপরের <strong>Print Statement</strong> বাটনে ক্লিক করুন অথবা <strong>Ctrl+P</strong> চাপুন।
              </div>

              {/* A4 simulated view on screen */}
              <div className="w-full bg-white border border-slate-300 rounded-xl p-5 shadow-sm overflow-x-auto max-h-[60vh] select-text">
                <div className="p-4 border-2 border-dashed border-slate-300 rounded-lg text-left bg-white font-sans text-neutral-800">
                  <div className="flex justify-between border-b border-slate-300 pb-4 items-start">
                    <div>
                      <h4 className="text-base font-black text-slate-900 uppercase">{COMPANY_PROFILE.name}</h4>
                      <p className="text-[10px] text-slate-500 font-bold mt-0.5">{COMPANY_PROFILE.addresses.office}</p>
                    </div>
                    <div className="text-right flex flex-col items-end">
                      <span className="bg-sky-600 text-white px-2 py-0.5 text-[8.5px] font-black rounded uppercase">
                        {printData.type === 'invoice' ? 'COMMERCIAL INVOICE' : 'PACKING LIST'}
                      </span>
                      <p className="text-[10px] font-mono mt-1 font-bold">Ref: {printData.ci.invoiceNo}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-[10px] mt-4 bg-slate-55 p-3 border border-slate-200 rounded">
                    <div>
                      <p><strong>Shipped To:</strong> {printData.ci.factoryName}</p>
                      <p className="mt-1"><strong>Buyer:</strong> {printData.ci.buyerName}</p>
                    </div>
                    <div>
                      <p><strong>Invoice No:</strong> {printData.ci.invoiceNo}</p>
                      <p className="mt-1"><strong>Date:</strong> {printData.ci.date}</p>
                    </div>
                  </div>

                  {printData.type === 'invoice' ? (
                    <table className="w-full text-left text-[9.5px] mt-4 border-collapse">
                      <thead>
                        <tr className="bg-slate-100 font-bold border-b border-slate-300">
                          <th className="py-1 px-2">Description</th>
                          <th className="py-1 px-2 text-right">Shipped Qty</th>
                          <th className="py-1 px-2 text-right">Unit Price</th>
                          <th className="py-1 px-2 text-right">Amount (USD)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {printData.ci.items.map((item, idx) => (
                          <tr key={idx}>
                            <td className="py-1.5 px-2 font-bold text-slate-700">{item.itemName}</td>
                            <td className="py-1.5 px-2 text-right">{item.quantity.toLocaleString()} {item.unit}</td>
                            <td className="py-1.5 px-2 text-right font-mono">${item.unitPrice.toFixed(4)}</td>
                            <td className="py-1.5 px-2 text-right font-bold">${item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                          </tr>
                        ))}
                        <tr className="bg-slate-50 font-black border-t border-slate-400">
                          <td colSpan={3} className="py-2 px-2 text-slate-900 uppercase">Total Amount:</td>
                          <td className="py-2 px-2 text-right text-emerald-700 font-extrabold">
                            ${printData.ci.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  ) : (
                    <table className="w-full text-left text-[9px] mt-4 border-collapse">
                      <thead>
                        <tr className="bg-slate-100 font-bold border-b border-slate-300">
                          <th className="py-1 px-2">Carton No</th>
                          <th className="py-1 px-2">Item Description</th>
                          <th className="py-1 px-2 text-center">Sizes</th>
                          <th className="py-1 px-2 text-right">Net Wt</th>
                          <th className="py-1 px-2 text-right">Gross Wt</th>
                          <th className="py-1 px-2 text-right">Quantity</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {printData.ci.packingList.map((ctn, idx) => (
                          <tr key={idx}>
                            <td className="py-1 px-2 font-bold text-slate-950 font-mono">{ctn.cartonNo}</td>
                            <td className="py-1 px-2">{ctn.itemName}</td>
                            <td className="py-1 px-2 text-center font-mono text-sky-700">{ctn.sizes.map(s => `[${s.size}:${s.quantity}]`).join(' ')}</td>
                            <td className="py-1 px-2 text-right">{ctn.netWeight}</td>
                            <td className="py-1 px-2 text-right">{ctn.grossWeight}</td>
                            <td className="py-1 px-2 text-right font-bold">{ctn.quantity.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div 
            id={printData.type === 'invoice' ? 'commercial-invoice-print-sheet' : 'packing-list-print-sheet'} 
            className="relative p-[10mm] font-sans bg-white text-neutral-900 min-h-screen select-text text-left print:block hidden"
          >
          {printData.type === 'invoice' ? (
            /* COMMERCIAL INVOICE PRINT OUT */
            <div className="max-w-4xl mx-auto space-y-6 bg-white relative">
              {/* Vertical Margin Barcode (Scannable within 0.5" page margins) */}
              <div 
                className="absolute left-[-34px] top-[40mm] w-[10mm] h-[100mm] flex flex-col items-center justify-center print:flex hidden z-55 pointer-events-none select-none"
              >
                <Barcode value={printData.ci.invoiceNo} vertical={true} height={35} showText={false} />
              </div>

              {/* Header */}
              <div className="flex justify-between items-start border-b-2 border-neutral-800 pb-5">
                <div>
                  <h1 className="text-2xl font-black text-neutral-900 tracking-tight text-transform uppercase">{COMPANY_PROFILE.name}</h1>
                  <p className="text-[10px] text-neutral-500 font-bold mt-1 max-w-xl">{COMPANY_PROFILE.addresses.office}</p>
                  <p className="text-[9.5px] text-neutral-500 font-mono mt-0.5">Cell: {COMPANY_PROFILE.phones[0]} • Email: {COMPANY_PROFILE.emails[0]}</p>
                  <p className="text-[9.5px] text-neutral-500 font-bold">Factory: {COMPANY_PROFILE.addresses.factory}</p>
                  <p className="text-[10px] text-neutral-900 font-extrabold mt-1">BIN NO: {COMPANY_PROFILE.bin}</p>
                </div>
                <div className="text-right flex flex-col items-end shrink-0">
                  <span className="bg-sky-600 text-white px-3 py-1 font-black text-[10px] rounded tracking-wider uppercase">COMMERCIAL INVOICE</span>
                  <p className="text-sm font-black text-neutral-900 mt-2">Invoice No: {printData.ci.invoiceNo}</p>
                  <p className="text-[10px] font-bold text-neutral-500">Date: {printData.ci.date}</p>
                  <div className="mt-4">
                    <Barcode value={printData.ci.invoiceNo} height={20} showText={true} />
                  </div>
                </div>
              </div>

              {/* Trade Finance Details Matrix */}
              <div className="grid grid-cols-2 gap-6 text-[10px] border-b-2 border-neutral-100 pb-4">
                <div>
                  <span className="font-extrabold text-neutral-400 text-[8px] uppercase block">Billing / Consigned Factory Address (ক্রেতা):</span>
                  <p className="text-xs font-black text-neutral-900 mt-1">{printData.ci.factoryName}</p>
                  <p className="text-neutral-600 font-semibold mt-1 leading-normal">{printData.ci.factoryAddress || COMPANY_PROFILE.addresses.factory}</p>
                  <p className="text-neutral-550 font-extrabold mt-2">Buyer Brand: {printData.ci.buyerName}</p>
                </div>
                <div>
                  <table className="w-full border-collapse">
                    <tbody>
                      <tr>
                        <td className="font-bold text-neutral-400 py-1">Proforma Invoice Ref:</td>
                        <td className="font-black text-sky-600 text-right py-1">{printData.ci.piNo}</td>
                      </tr>
                      <tr className="border-t border-neutral-100">
                        <td className="font-bold text-neutral-400 py-1">Delivery Challan Refs:</td>
                        <td className="font-bold text-neutral-800 text-right py-1">{printData.ci.challanNos.join(', ') || 'Direct Cargo Ship'}</td>
                      </tr>
                      <tr className="border-t border-neutral-100">
                        <td className="font-bold text-neutral-400 py-1">L/C OR Contract No:</td>
                        <td className="font-extrabold text-neutral-800 text-right py-1">{printData.ci.lcNo} {printData.ci.lcDate ? 'Dt: ' + printData.ci.lcDate : ''}</td>
                      </tr>
                      <tr className="border-t border-neutral-100">
                        <td className="font-bold text-neutral-400 py-1">EXP Form No & Date:</td>
                        <td className="font-extrabold text-neutral-800 text-right py-1">{printData.ci.expNo} {printData.ci.expDate ? 'Dt: ' + printData.ci.expDate : ''}</td>
                      </tr>
                      <tr className="border-t border-neutral-100">
                        <td className="font-bold text-neutral-400 py-1">H.S. Code Ref:</td>
                        <td className="font-bold text-neutral-800 text-right py-1">{printData.ci.hsCode}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="text-[10px] text-neutral-600 font-semibold italic">
                Gentlemen, we have dispatched the undermentioned garments accessories materials on board the truck: <strong>{printData.ci.truckNo}</strong>.
              </div>

              {/* Items Trade Table */}
              <table className="w-full text-left border-collapse text-[10px] mt-2">
                <thead>
                  <tr className="bg-neutral-50 border-b-2 border-neutral-800 font-black">
                    <th className="p-2 w-12">SL</th>
                    <th className="p-2">Description of Accessories Goods</th>
                    <th className="p-2">P.O & Style Refs</th>
                    <th className="p-2 text-right">Quantity</th>
                    <th className="p-2 text-right">Unit Price</th>
                    <th className="p-2 text-right">Total (USD)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {printData.ci.items.map((item, idx) => (
                    <tr key={idx} className="align-top font-medium text-neutral-850">
                      <td className="p-2 font-bold">{String(idx + 1).padStart(2, '0')}</td>
                      <td className="p-2 font-extrabold text-neutral-900">{item.itemName}</td>
                      <td className="p-2 text-neutral-500">P.O: {item.poNumber}<br/>Style: {item.styleNumber}</td>
                      <td className="p-2 font-bold text-right">{item.quantity.toLocaleString()} {item.unit}</td>
                      <td className="p-2 font-mono text-right">${item.unitPrice.toFixed(4)}</td>
                      <td className="p-2 font-black text-right text-neutral-905">${item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                  <tr className="bg-neutral-50 font-black border-t-2 border-neutral-800 text-xs text-neutral-900">
                    <td colSpan={3} className="p-2.5 text-right uppercase">Total Shipment Invoice Value:</td>
                    <td className="p-2.5 text-right font-black">
                      {printData.ci.items.reduce((sum, item) => sum + item.quantity, 0).toLocaleString()} Pins/Pcs
                    </td>
                    <td className="p-2.5"></td>
                    <td className="p-2.5 text-right font-black text-sky-700">
                      ${printData.ci.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Amount in Words */}
              <div className="text-[10px] p-3 border-2 border-dashed border-neutral-300 bg-neutral-50 font-bold">
                Invoice Total Value In Words: <span className="text-sky-700 font-extrabold uppercase">{amountInWords(printData.ci.totalAmount)}</span>
              </div>

              {/* Foreign Exchange Remittance Bank Routing info */}
              <div className="border border-neutral-200 rounded-lg p-3 text-[9.5px] bg-neutral-50">
                <span className="font-extrabold text-sky-700 text-transform uppercase block mb-1">Beneficiary Banking Remittance Route (এলসি পেমেন্ট ব্যাংক):</span>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p><strong>Bank:</strong> {printData.ci.bankDetails.bankName}</p>
                    <p><strong>Branch:</strong> {printData.ci.bankDetails.branch}</p>
                    <p><strong>Account Name:</strong> {printData.ci.bankDetails.accountName}</p>
                  </div>
                  <div>
                    <p><strong>Account No:</strong> {printData.ci.bankDetails.accountNo}</p>
                    <p><strong>Swift Code:</strong> {printData.ci.bankDetails.swiftCode}</p>
                    <p><strong>Routing No:</strong> {printData.ci.bankDetails.routingNo}</p>
                  </div>
                </div>
              </div>

              {/* Shipment weights */}
              <div className="grid grid-cols-4 gap-2 text-[9.5px] font-bold bg-neutral-100 p-2 text-center text-neutral-700 rounded">
                <div>Net Weight: {printData.ci.netWeight}</div>
                <div>Gross Weight: {printData.ci.grossWeight}</div>
                <div>Cargo Truck: {printData.ci.truckNo}</div>
                <div>Total cartons: {printData.ci.totalCartons} Pkgs</div>
              </div>

              {/* Signatures and terms line */}
              <div className="pt-12 grid grid-cols-2 gap-12 text-[10px] font-bold text-center">
                <div>
                  <div className="border-t border-neutral-400 pt-1.5 text-neutral-500">Accepted & Confirmed Importer Signature</div>
                </div>
                <div>
                  <div className="border-t-2 border-emerald-500 pt-1.5 text-emerald-600 font-black">For {COMPANY_PROFILE.name}</div>
                  <p className="text-[8px] text-neutral-450 mt-1 uppercase tracking-wider">Authorized Signature & Seal</p>
                </div>
              </div>
            </div>
          ) : (
            /* PACKING LIST PRINT OUT */
            <div className="max-w-4xl mx-auto space-y-6 bg-white relative">
              {/* Vertical Margin Barcode (Scannable within 0.5" page margins) */}
              <div 
                className="absolute left-[-34px] top-[40mm] w-[10mm] h-[100mm] flex flex-col items-center justify-center print:flex hidden z-55 pointer-events-none select-none"
              >
                <Barcode value={printData.ci.invoiceNo} vertical={true} height={35} showText={false} />
              </div>

              {/* Header */}
              <div className="flex justify-between items-start border-b-2 border-neutral-800 pb-5">
                <div>
                  <h1 className="text-2xl font-black text-neutral-900 tracking-tight text-transform uppercase">{COMPANY_PROFILE.name}</h1>
                  <p className="text-[10px] text-neutral-500 font-bold mt-1">{COMPANY_PROFILE.addresses.office}</p>
                  <p className="text-[10px] text-neutral-900 font-extrabold mt-1">BIN NO: {COMPANY_PROFILE.bin}</p>
                </div>
                <div className="text-right flex flex-col items-end shrink-0">
                  <span className="bg-emerald-600 text-white px-3 py-1 font-black text-[10px] rounded tracking-wider uppercase">SHIPMENT PACKING LIST</span>
                  <p className="text-sm font-black text-neutral-900 mt-2">CI Invoice Ref: {printData.ci.invoiceNo}</p>
                  <p className="text-[10px] font-bold text-neutral-500">Date: {printData.ci.date}</p>
                </div>
              </div>

              {/* Trade details */}
              <div className="grid grid-cols-2 gap-6 text-[10px] border-b-2 border-neutral-100 pb-4">
                <div>
                  <span className="font-extrabold text-neutral-400 text-[8px] uppercase block">Shipped To (গ্রাহক):</span>
                  <p className="text-sm font-black text-neutral-900 mt-1">{printData.ci.factoryName}</p>
                  <p className="text-neutral-500 font-bold mt-1">Buyer Brand: {printData.ci.buyerName}</p>
                </div>
                <div>
                  <table className="w-full border-collapse">
                    <tbody>
                      <tr>
                        <td className="font-bold text-neutral-400 py-1">Invoice Reference:</td>
                        <td className="font-black text-neutral-900 text-right py-1">{printData.ci.invoiceNo}</td>
                      </tr>
                      <tr className="border-t border-neutral-100">
                        <td className="font-bold text-neutral-400 py-1">Proforma Invoice No:</td>
                        <td className="font-extrabold text-emerald-600 text-right py-1">{printData.ci.piNo}</td>
                      </tr>
                      <tr className="border-t border-neutral-100">
                        <td className="font-bold text-neutral-400 py-1">Total Packages:</td>
                        <td className="font-extrabold text-neutral-900 text-right py-1">{printData.ci.totalCartons} Cartons PKG</td>
                      </tr>
                      <tr className="border-t border-neutral-100">
                        <td className="font-bold text-neutral-400 py-1">Net & Gross Weight:</td>
                        <td className="font-bold text-neutral-900 text-right py-1">Net: {printData.ci.netWeight} / Gro: {printData.ci.grossWeight}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Packing breakdown matrix */}
              <table className="w-full text-left border-collapse text-[9px] mt-2">
                <thead>
                  <tr className="bg-neutral-50 border-b-2 border-emerald-500 font-black text-neutral-900">
                    <th className="p-2">Carton ID</th>
                    <th className="p-2">Description / Style Ref</th>
                    <th className="p-2 text-center">Size Wise breakdown (সাইজ ও পরিমাপ)</th>
                    <th className="p-2 text-right">Net Wt</th>
                    <th className="p-2 text-right">Gross Wt</th>
                    <th className="p-2 text-right">Qty</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {printData.ci.packingList.map((ctn, idx) => {
                    const sizesStr = ctn.sizes.length > 0 
                      ? ctn.sizes.map(s => `[${s.size}: ${s.quantity}]`).join(' ') 
                      : 'Flat item';

                    return (
                      <tr key={idx} className="align-middle font-medium text-neutral-800">
                        <td className="p-2 font-black text-neutral-950 font-mono">{ctn.cartonNo}</td>
                        <td className="p-2">
                          <span className="font-extrabold text-neutral-900">{ctn.itemName}</span>
                          <div className="text-[8px] text-neutral-450 mt-0.5">Style: {ctn.styleNumber} / P.O: {ctn.poNumber}</div>
                        </td>
                        <td className="p-2 font-mono text-center text-sky-700 text-[8.5px]">{sizesStr}</td>
                        <td className="p-2 text-right font-bold text-neutral-700">{ctn.netWeight || 'N/A'}</td>
                        <td className="p-2 text-right font-bold text-neutral-700">{ctn.grossWeight || 'N/A'}</td>
                        <td className="p-2 text-right font-black text-emerald-700">{ctn.quantity.toLocaleString()} {ctn.unit}</td>
                      </tr>
                    );
                  })}
                  <tr className="bg-neutral-50 font-black border-t-2 border-neutral-800 text-xs text-neutral-900">
                    <td colSpan={5} className="p-2.5 text-right uppercase">Total Carton Accessory Pieces:</td>
                    <td className="p-2.5 text-right text-emerald-700 font-extrabold">
                      {printData.ci.items.reduce((sum, i) => sum + i.quantity, 0).toLocaleString()}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Inspection Footer */}
              <div className="pt-16 grid grid-cols-3 gap-6 text-[9px] font-bold text-center text-neutral-500">
                <div>
                  <div className="border-t border-neutral-300 pt-1.5">Cargo Loaded Guard Checked</div>
                </div>
                <div>
                  <div className="border-t border-neutral-300 pt-1.5">Warehouse Dispatch Head</div>
                </div>
                <div>
                  <div className="border-t-2 border-emerald-500 pt-1.5 text-emerald-600 font-black">For {COMPANY_PROFILE.name}</div>
                </div>
              </div>
            </div>
          )}
        </div>
        </>
      )}
    </div>
  );
}
