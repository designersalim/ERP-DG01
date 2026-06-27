import React, { useState, useEffect } from 'react';
import { 
  DollarSign, Receipt, Plus, Trash2, Calendar, FileText, CheckCircle, 
  Printer, Coins, ArrowRightLeft, Percent, Check, Landmark, User, FileDigit, HelpCircle
} from 'lucide-react';
import { ProformaInvoice, ManualInvoiceBill, MoneyReceipt } from '../types';
import { COMPANY_PROFILE as COMPANY_PROFILE_RAW } from '../data';

interface MoneyReceiptGeneratorProps {
  pis: ProformaInvoice[];
  manualBills: ManualInvoiceBill[];
  companyProfile?: any;
  onMarkPiAsPaid?: (id: string) => void;
  onMarkManualBillAsPaid?: (id: string) => void;
  canEdit?: boolean;
}

export default function MoneyReceiptGenerator({
  pis = [],
  manualBills = [],
  companyProfile,
  onMarkPiAsPaid,
  onMarkManualBillAsPaid,
  canEdit = true
}: MoneyReceiptGeneratorProps) {
  const COMPANY_PROFILE = companyProfile || COMPANY_PROFILE_RAW;
  const [receipts, setReceipts] = useState<MoneyReceipt[]>(() => {
    try {
      const saved = localStorage.getItem('acoola_money_receipts');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  useEffect(() => {
    localStorage.setItem('acoola_money_receipts', JSON.stringify(receipts));
  }, [receipts]);

  // Modal control & state
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<MoneyReceipt | null>(null);
  const [receiptNo, setReceiptNo] = useState(() => `MR-${Date.now().toString().substring(7)}`);
  const [refNum, setRefNum] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().substring(0, 10));
  const [sourceType, setSourceType] = useState<'PI' | 'Invoice'>('PI');
  
  // Custom states for calculation progress
  const [sourceId, setSourceId] = useState('');
  const [receivedFrom, setReceivedFrom] = useState('');
  const [totalAmountUSD, setTotalAmountUSD] = useState(0);
  const [conversionRate, setConversionRate] = useState(115); // BDT rate per USD
  const [totalAmountBDT, setTotalAmountBDT] = useState(0);
  const [receivedAmountBDT, setReceivedAmountBDT] = useState(0);
  const [isCleared, setIsCleared] = useState(false);
  const [remarks, setRemarks] = useState('');
  
  // Search query
  const [searchQuery, setSearchQuery] = useState('');

  // Handle source (PI or Invoice selection)
  useEffect(() => {
    if (sourceType === 'PI') {
      const match = pis.find(p => p.id === sourceId || p.invoiceNo === sourceId);
      if (match) {
        setRefNum(match.invoiceNo);
        setReceivedFrom(match.buyerName || COMPANY_PROFILE.name || '');
        const amountUsd = match.items.reduce((sum, item) => sum + (item.totalQuantity * (item.unitPrice || 0)), 0);
        setTotalAmountUSD(amountUsd);
        // Recalculate BDT based on conversion rate
        setTotalAmountBDT(Math.round(amountUsd * conversionRate));
      } else {
        setRefNum('');
        setTotalAmountUSD(0);
        setTotalAmountBDT(0);
      }
    } else {
      const match = manualBills.find(b => b.id === sourceId || b.invoiceNo === sourceId);
      if (match) {
        setRefNum(match.invoiceNo);
        setReceivedFrom(match.buyerName || match.clientName || '');
        const isUSD = match.currency === 'USD';
        const amt = match.totalAmount || 0;
        if (isUSD) {
          setTotalAmountUSD(amt);
          setTotalAmountBDT(Math.round(amt * conversionRate));
        } else {
          setTotalAmountUSD(0);
          setTotalAmountBDT(amt);
        }
      } else {
        setRefNum('');
        setTotalAmountUSD(0);
        setTotalAmountBDT(0);
      }
    }
  }, [sourceId, sourceType, conversionRate, pis, manualBills]);

  // Handle BDT receipt change
  const remainingCalculated = isCleared ? 0 : Math.max(0, totalAmountBDT - receivedAmountBDT);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!receiptNo || !receivedFrom || totalAmountBDT <= 0) {
      alert("Specify valid source and receipt parameters.");
      return;
    }

    const newRec: MoneyReceipt = {
      id: `MR-${Date.now()}`,
      receiptNo,
      date,
      type: sourceType,
      referenceNo: refNum || sourceId,
      originalAmount: totalAmountUSD > 0 ? totalAmountUSD : totalAmountBDT,
      originalCurrency: totalAmountUSD > 0 ? 'USD' : 'BDT',
      conversionRate: totalAmountUSD > 0 ? conversionRate : undefined,
      totalAmountBDT,
      receivedAmount: receivedAmountBDT,
      isFullyPaid: isCleared || remainingCalculated === 0,
      balanceAmountBDT: remainingCalculated,
      receivedFrom,
      remarks: remarks || 'Payment and account adjustment.',
      createdAt: new Date().toISOString()
    };

    setReceipts(prev => [newRec, ...prev]);
    
    // Sync payment status back to PI or Invoice/Bill Section if paid or cleared
    if (newRec.isFullyPaid) {
      if (sourceType === 'PI') {
        onMarkPiAsPaid?.(newRec.referenceNo || sourceId);
      } else {
        onMarkManualBillAsPaid?.(newRec.referenceNo || sourceId);
      }
    }

    setShowAddModal(false);
    
    // Clear states
    setSourceId('');
    setReceivedFrom('');
    setTotalAmountUSD(0);
    setReceivedAmountBDT(0);
    setRemarks('');
    setIsCleared(false);
    setReceiptNo(`MR-${Date.now().toString().substring(7)}`);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this Money Receipt? This cannot be undone.")) {
      setReceipts(prev => prev.filter(r => r.id !== id));
    }
  };

  const getWordAmount = (num: number): string => {
    // Basic number to words converter for print sheets
    const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    
    const countWords = (n: number): string => {
      if (n < 20) return a[n];
      if (n < 100) return b[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + a[n % 10] : '');
      if (n < 1000) return a[Math.floor(n / 100)] + 'Hundred ' + (n % 100 !== 0 ? 'and ' + countWords(n % 100) : '');
      if (n < 100000) return countWords(Math.floor(n / 1000)) + 'Thousand ' + (n % 1000 !== 0 ? countWords(n % 1000) : '');
      if (n < 10000000) return countWords(Math.floor(n / 100000)) + 'Lakh ' + (n % 100000 !== 0 ? countWords(n % 100000) : '');
      return countWords(Math.floor(n / 10000000)) + 'Crore ' + (n % 10000000 !== 0 ? countWords(n % 10000000) : '');
    };
    
    if (num === 0) return 'Zero';
    return countWords(Math.floor(num)) + ' Taka Only';
  };

  // Find matching document for the receipt to render dynamic client details
  const getClientDetails = (receipt: MoneyReceipt) => {
    if (receipt.type === 'PI') {
      const pi = pis.find(p => p.invoiceNo === receipt.referenceNo || p.id === receipt.referenceNo);
      if (pi) {
        return {
          factoryName: pi.factoryName || receipt.receivedFrom,
          factoryAddress: pi.factoryAddress || 'Tongi Industrial Area, Gazipur, Dhaka',
          email: pi.buyerName ? `Buyer: ${pi.buyerName}` : 'merchandising@example.com'
        };
      }
    } else {
      const bill = manualBills.find(b => b.invoiceNo === receipt.referenceNo || b.id === receipt.referenceNo);
      if (bill) {
        return {
          factoryName: bill.clientName || receipt.receivedFrom,
          factoryAddress: bill.clientAddress || 'Client Address Not Specified',
          email: bill.buyerName ? `Buyer Ref: ${bill.buyerName}` : 'billing@example.com'
        };
      }
    }
    return {
      factoryName: receipt.receivedFrom,
      factoryAddress: 'Plot-28, Sector-03, Tongi I/A, Gazipur, Dhaka',
      email: 'billing@example.com'
    };
  };

  const clientInfo = selectedReceipt ? getClientDetails(selectedReceipt) : null;

  const filteredReceipts = receipts.filter(r => 
    r.receiptNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.receivedFrom.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.referenceNo.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 text-left" id="money-receipt-generator-viewport">
      {/* Banner */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 relative overflow-hidden shadow-lg border border-slate-800">
        <div className="relative z-10 space-y-2">
          <span className="text-[10px] bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 font-extrabold px-3 py-1 rounded-full uppercase tracking-wider">
            Finance &amp; Accounts Ledger
          </span>
          <h1 className="text-2xl font-black uppercase tracking-tight">Official Money Receipt Generator</h1>
          <p className="text-xs text-slate-350 max-w-xl font-bold">
            Create customized payment money receipts against PI values and Invoice sheets, support custom BDT conversion rate multipliers, track current adjusted outstanding balance logs, and print receipts directly.
          </p>
        </div>
        <div className="absolute right-0 bottom-0 top-0 w-1/3 opacity-10 flex items-center justify-center">
          <Landmark className="w-48 h-48 rotate-12" />
        </div>
      </div>

      {/* Control bar */}
      <div className="sm:flex justify-between items-center bg-white border border-slate-150 p-3.5 rounded-2xl gap-4 shadow-xs">
        <div className="relative flex-1 sm:max-w-md">
          <Receipt className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search Receipts by No, Buyer, Ref..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 text-xs font-bold pl-10 pr-3 py-3 rounded-xl border border-slate-150 text-slate-800 focus:bg-white focus:outline-slate-950"
          />
        </div>

        {canEdit && (
          <button
            onClick={() => {
              setReceiptNo(`MR-${Date.now().toString().substring(7)}`);
              setShowAddModal(true);
            }}
            className="mt-3 sm:mt-0 bg-slate-900 hover:bg-emerald-600 text-white text-xs font-black px-5 py-3 rounded-xl flex items-center gap-2 cursor-pointer uppercase tracking-wider transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>New Money Receipt</span>
          </button>
        )}
      </div>

      {/* Receipts Table */}
      <div className="bg-white border border-slate-150 rounded-2xl overflow-hidden shadow-xs">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-150 text-slate-450 uppercase font-black text-[10px] tracking-widest">
              <th className="p-4">Receipt Serial</th>
              <th className="p-4">Date</th>
              <th className="p-4">Received From</th>
              <th className="p-4">Reference Source</th>
              <th className="p-4">Total Value</th>
              <th className="p-4">Amount Paid / Balance</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-150 font-bold text-slate-705">
            {filteredReceipts.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-12 text-center text-slate-400 font-bold">
                  No Money Receipts logged yet. Click 'New Money Receipt' above to log a customized customer voucher.
                </td>
              </tr>
            ) : (
              filteredReceipts.map(rec => (
                <tr key={rec.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="p-4">
                    <span className="text-sm font-black text-slate-900 font-mono tracking-tight">{rec.receiptNo}</span>
                  </td>
                  <td className="p-4 text-slate-500 font-medium">{rec.date}</td>
                  <td className="p-4">
                    <span className="text-slate-900 uppercase">{rec.receivedFrom}</span>
                  </td>
                  <td className="p-4">
                    <span className="text-xs bg-slate-100 border text-slate-700 px-2 py-1 rounded">
                      {rec.type}: {rec.referenceNo}
                    </span>
                  </td>
                  <td className="p-4 space-y-0.5">
                    {rec.originalCurrency === 'USD' && (
                      <div className="text-[10px] text-slate-400 font-bold">
                        ${rec.originalAmount.toLocaleString()} @ {rec.conversionRate || 115} BDT
                      </div>
                    )}
                    <div className="font-extrabold text-slate-900">৳{rec.totalAmountBDT.toLocaleString()}</div>
                  </td>
                  <td className="p-4 space-y-1">
                    <div className="text-emerald-700 font-black">Logged: ৳{rec.receivedAmount.toLocaleString()}</div>
                    {rec.isFullyPaid ? (
                      <span className="text-[9px] bg-emerald-100 border border-emerald-300 text-emerald-800 font-black px-1.5 py-0.5 rounded uppercase">
                        ✓ Complete No Due
                      </span>
                    ) : (
                      <div className="text-red-500 text-[11px]">Due: ৳{rec.balanceAmountBDT.toLocaleString()}</div>
                    )}
                  </td>
                  <td className="p-4 text-right space-x-1.5">
                    <button
                      onClick={() => setSelectedReceipt(rec)}
                      className="bg-slate-100 hover:bg-slate-900 hover:text-white p-2.5 rounded-xl transition-all cursor-pointer inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Print Sheet</span>
                    </button>
                    {canEdit && (
                      <button
                        onClick={() => handleDelete(rec.id)}
                        className="bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white p-2.5 rounded-xl cursor-pointer inline-flex"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Creation Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center z-[999] p-4 text-left select-none">
          <div className="bg-white border rounded-3xl w-full max-w-xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto space-y-4">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 text-slate-450 hover:text-slate-705 cursor-pointer p-1"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="border-b pb-3 text-left">
              <span className="text-[9px] font-black uppercase text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-300/30">
                Official Voucher Maker
              </span>
              <h2 className="text-base font-black text-slate-900 uppercase tracking-tight mt-1">
                Generate Money Receipt
              </h2>
              <p className="text-[11px] text-slate-500 font-medium">Log safe payment statements against Proforma Invoices or customer Bills.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs font-bold text-slate-705">
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[10px] text-slate-500 uppercase">Receipt Memo Number *</label>
                  <input
                    type="text"
                    required
                    value={receiptNo}
                    onChange={e => setReceiptNo(e.target.value)}
                    className="w-full bg-slate-50 border rounded-xl p-2.5 mt-1 text-slate-900 font-mono font-extrabold focus:bg-white focus:outline-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 uppercase">Receiving Date *</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    className="w-full bg-slate-50 border rounded-xl p-2.5 mt-1 text-slate-900 focus:bg-white focus:outline-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-slate-50/50 p-3 rounded-2xl border border-slate-100">
                <div>
                  <label className="block text-[10px] text-slate-550 uppercase">Source Document Type *</label>
                  <div className="flex gap-2 mt-1.5">
                    <button
                      type="button"
                      onClick={() => { setSourceType('PI'); setSourceId(''); }}
                      className={`flex-1 py-2 text-[11px] font-black rounded-lg uppercase tracking-wider transition-all cursor-pointer border ${
                        sourceType === 'PI'
                          ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                          : 'bg-white text-slate-500 border-slate-200'
                      }`}
                    >
                      Proforma Invoice (PI)
                    </button>
                    <button
                      type="button"
                      onClick={() => { setSourceType('Invoice'); setSourceId(''); }}
                      className={`flex-1 py-2 text-[11px] font-black rounded-lg uppercase tracking-wider transition-all cursor-pointer border ${
                        sourceType === 'Invoice'
                          ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                          : 'bg-white text-slate-500 border-slate-200'
                      }`}
                    >
                      Invoice / Bill
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] text-slate-550 uppercase mb-1.5">Select Specific Record *</label>
                  {sourceType === 'PI' ? (
                    <select
                      value={sourceId}
                      required
                      onChange={e => setSourceId(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2 text-slate-900 font-extrabold mt-0.5 cursor-pointer shadow-xs"
                    >
                      <option value="">-- Choose PI Number --</option>
                      {pis.map(p => {
                        const totalUsd = p.items.reduce((sum, item) => sum + (item.totalQuantity * (item.unitPrice || 0)), 0);
                        return (
                          <option key={p.id} value={p.invoiceNo}>
                            {p.invoiceNo} ({p.buyerName || 'Standard Buyer'}) - ${totalUsd.toLocaleString()}
                          </option>
                        );
                      })}
                    </select>
                  ) : (
                    <select
                      value={sourceId}
                      required
                      onChange={e => setSourceId(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2 text-slate-900 font-extrabold mt-0.5 cursor-pointer shadow-xs"
                    >
                      <option value="">-- Choose Invoice --</option>
                      {manualBills.map(b => (
                        <option key={b.id} value={b.invoiceNo}>
                          {b.invoiceNo} ({b.buyerName || b.clientName}) - {b.currency === 'USD' ? `$${b.totalAmount.toLocaleString()}` : `৳${b.totalAmount.toLocaleString()}`}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              {/* Recipient from matching selection */}
              {sourceId && (
                <div className="space-y-3.5 pt-1 animate-fade-in">
                  <div className="grid grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-[10px] text-slate-500 uppercase">Received Account Name (Standard)</label>
                      <input
                        type="text"
                        required
                        value={receivedFrom}
                        onChange={e => setReceivedFrom(e.target.value)}
                        className="w-full bg-slate-50 border rounded-xl p-2.5 mt-1 text-slate-900 font-extrabold focus:bg-white"
                      />
                    </div>

                    {totalAmountUSD > 0 && (
                      <div>
                        <label className="block text-[10px] text-emerald-800 uppercase flex items-center gap-1">
                          <Coins className="w-3.5 h-3.5" />
                          <span>BDT Conversion Rate * (1 USD to BDT)</span>
                        </label>
                        <input
                          type="number"
                          required
                          min={1}
                          value={conversionRate}
                          onChange={e => setConversionRate(Number(e.target.value))}
                          className="w-full bg-emerald-50/50 border border-emerald-205 rounded-xl p-2.5 mt-1 text-emerald-900 font-mono font-extrabold focus:bg-white"
                        />
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3.5 bg-slate-50 p-4 rounded-2xl border">
                    <div>
                      <span className="block text-[9px] text-slate-450 uppercase">Document Total Value</span>
                      <p className="text-slate-900 text-sm font-black font-mono">
                        {totalAmountUSD > 0 ? `$${totalAmountUSD.toLocaleString()} (${(totalAmountUSD * conversionRate).toLocaleString()} BDT)` : `৳${totalAmountBDT.toLocaleString()}`}
                      </p>
                    </div>

                    <div>
                      <label className="block text-[9.5px] text-indigo-800 uppercase flex items-center gap-1 font-extrabold">
                        Received Amount * (Customized Cash/Chq)
                      </label>
                      <input
                        type="number"
                        required
                        min={0}
                        value={receivedAmountBDT}
                        onChange={e => setReceivedAmountBDT(Number(e.target.value))}
                        className="w-full border-2 border-indigo-200/80 rounded-xl p-2 mt-1.5 text-indigo-900 font-mono font-black focus:border-indigo-600 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Payment fully cleared check box */}
                  <div className="flex items-center gap-2.5 bg-emerald-50 p-3.5 rounded-xl border border-emerald-200/50">
                    <input
                      type="checkbox"
                      id="isCleared"
                      checked={isCleared}
                      onChange={e => setIsCleared(e.target.checked)}
                      className="w-4.5 h-4.5 border text-emerald-600 rounded-lg cursor-pointer accent-emerald-600"
                    />
                    <label htmlFor="isCleared" className="text-[11px] text-emerald-900 font-black cursor-pointer leading-tight">
                      Yes, mark Payment as Cleared (বকেয়া পরিশোধ সম্পন্ন) 
                      <span className="block text-[10px] text-emerald-700/80 font-semibold mt-0.5">
                        * Checking this option forces the remaining balance to ৳0, meaning no further dues remain for this invoice!
                      </span>
                    </label>
                  </div>

                  {/* Live Outstanding Due Indicator */}
                  <div className="text-right text-xs pt-1">
                    <span className="text-slate-500 font-bold">Adjusted Remaining Balance: </span>
                    <span className={`font-mono font-black text-sm ${remainingCalculated > 0 ? 'text-red-500' : 'text-emerald-700 bg-emerald-100/50 px-2.5 py-0.5 rounded-full'}`}>
                      ৳{remainingCalculated.toLocaleString()}
                    </span>
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-500 uppercase mb-1">Remarks &amp; Mode of receipt (e.g., Cash, Prime Bank Cheque #9910)</label>
                    <input
                      type="text"
                      value={remarks}
                      onChange={e => setRemarks(e.target.value)}
                      placeholder="e.g. Received via Account Payee Cheque, Prime Bank Br#4501"
                      className="w-full bg-slate-50 border rounded-xl p-2.5 text-slate-800 font-bold focus:bg-white"
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-2 justify-end pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="bg-slate-100 hover:bg-slate-200 px-5 py-2.5 rounded-xl uppercase"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!sourceId}
                  className="bg-emerald-605 disabled:bg-slate-200 disabled:text-slate-400 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-6 py-2.5 rounded-xl uppercase tracking-wider"
                >
                  Save &amp; Generate MR
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Printable Money Receipt Sheet */}
      {selectedReceipt && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[9999] p-4 overflow-y-auto">
          <div className="bg-white border rounded-3xl w-full max-w-2xl p-6 shadow-2xl relative my-8 text-left">
            <button
              onClick={() => setSelectedReceipt(null)}
              className="absolute top-4 right-4 text-slate-450 hover:text-slate-705 cursor-pointer p-1 print:hidden"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Print Header Action Row */}
            <div className="flex justify-between items-center border-b pb-4 mb-6 print:hidden">
              <span className="text-xs text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full font-black uppercase tracking-wider">
                Voucher Print Preview
              </span>
              <button
                onClick={() => window.print()}
                className="bg-slate-900 hover:bg-emerald-600 text-white text-xs font-black px-4.5 py-2.5 rounded-xl flex items-center gap-1.5 cursor-pointer uppercase transition-all"
              >
                <Printer className="w-4 h-4" />
                <span>Initialize Print</span>
              </button>
            </div>

            {/* Money Receipt Canvas Body */}
            <div className="p-8 border-4 border-double border-slate-300 rounded-2xl bg-white space-y-6 select-text" id="money-receipt-print-sheet">
              {/* Receipt Header Block */}
              <div className="flex justify-between items-start border-b-2 border-slate-800 pb-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    {COMPANY_PROFILE.logo ? (
                      <img src={COMPANY_PROFILE.logo} referrerPolicy="no-referrer" alt="logo" className="w-10 h-10 object-contain rounded" />
                    ) : (
                      <div className="w-8 h-8 rounded bg-slate-900 flex items-center justify-center text-white font-black text-xs">A</div>
                    )}
                    <h1 className="text-lg font-black text-slate-900 uppercase tracking-tight">{COMPANY_PROFILE.name || 'Acoola Trims Corp.'}</h1>
                  </div>
                  <p className="text-[10px] text-slate-500 font-bold uppercase leading-tight max-w-sm">
                    {COMPANY_PROFILE.addresses?.office || 'Plot-28, Sector-03, Tongi I/A, Gazipur, Dhaka'}<br />
                    Email: {COMPANY_PROFILE.emails?.[0] || 'admin@acoolatrims.com'} • Tel: {COMPANY_PROFILE.phones?.[0] || '+8801711002233'}
                  </p>
                </div>

                <div className="text-right space-y-2">
                  <div className="bg-slate-900 text-white font-black uppercase text-center px-4 py-1.5 rounded text-xs tracking-widest">
                    MONEY RECEIPT
                  </div>
                  <div className="text-xs font-bold text-slate-705">
                    <div>No: <span className="font-mono text-slate-900 font-black">{selectedReceipt.receiptNo}</span></div>
                    <div>Date: <span className="text-slate-900">{selectedReceipt.date}</span></div>
                  </div>
                </div>
              </div>

              {/* Receipt Narrative Details */}
              <div className="space-y-4 text-xs leading-relaxed text-slate-800 font-bold">
                <div className="flex items-baseline border-b border-dashed border-slate-300 pb-1.5">
                  <span className="text-slate-450 uppercase text-[9px] w-32 shrink-0 tracking-wider">Received From:</span>
                  <div className="flex-1">
                    <span className="text-slate-900 text-sm font-black uppercase tracking-tight">{clientInfo?.factoryName || selectedReceipt.receivedFrom}</span>
                    {clientInfo?.factoryAddress && (
                      <span className="block text-[10px] text-slate-500 font-bold mt-0.5 normal-case font-mono">Address: {clientInfo.factoryAddress}</span>
                    )}
                    {clientInfo?.email && (
                      <span className="block text-[9.5px] text-slate-400 font-medium font-sans mt-0.2">Contact Reference: {clientInfo.email}</span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-baseline border-b border-dashed border-slate-300 pb-1.5">
                    <span className="text-slate-450 uppercase text-[9px] w-32 shrink-0 tracking-wider">Against {selectedReceipt.type}:</span>
                    <span className="text-slate-900 font-black font-mono">{selectedReceipt.referenceNo}</span>
                  </div>
                  <div className="flex items-baseline border-b border-dashed border-slate-300 pb-1.5">
                    <span className="text-slate-450 uppercase text-[9px] w-28 shrink-0 tracking-wider">Total Value:</span>
                    <span className="text-slate-900 font-extrabold font-mono">৳{selectedReceipt.totalAmountBDT.toLocaleString()}</span>
                  </div>
                </div>

                <div className="flex items-baseline border-b border-dashed border-slate-300 pb-1.5">
                  <span className="text-slate-450 uppercase text-[9px] w-32 shrink-0 tracking-wider">Amount Received (In Words):</span>
                  <span className="text-slate-900 tracking-tight font-black underline decoration-double select-all capitalize">
                    {getWordAmount(selectedReceipt.receivedAmount)}
                  </span>
                </div>

                <div className="flex items-baseline border-b border-dashed border-slate-300 pb-1.5">
                  <span className="text-slate-450 uppercase text-[9px] w-32 shrink-0 tracking-wider">Receipt Mode / Remarks:</span>
                  <span className="text-slate-855 italic font-semibold">{selectedReceipt.remarks || 'Standard account adjustments logged.'}</span>
                </div>
              </div>

              {/* Detailed Balance grid */}
              <div className="grid grid-cols-3 gap-3 pt-3">
                <div className="bg-slate-50 border p-3 rounded-xl text-center">
                  <span className="block text-[8px] text-slate-400 uppercase tracking-wider font-extrabold">Bill/PI Invoiced Total</span>
                  <span className="text-sm font-black text-slate-900 font-mono mt-1 block">৳{selectedReceipt.totalAmountBDT.toLocaleString()}</span>
                </div>
                <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-xl text-center">
                  <span className="block text-[8px] text-emerald-800 uppercase tracking-wider font-extrabold">Cash/Cheque Received</span>
                  <span className="text-sm font-black text-emerald-800 font-mono mt-1 block">৳{selectedReceipt.receivedAmount.toLocaleString()}</span>
                </div>
                <div className={`border p-3 rounded-xl text-center ${selectedReceipt.isFullyPaid ? 'bg-emerald-50 border-emerald-250 text-emerald-800' : 'bg-red-50 border-red-105 text-red-600'}`}>
                  <span className="block text-[8px] uppercase tracking-wider font-extrabold">{selectedReceipt.isFullyPaid ? 'Payment Status' : 'Outstanding Balance'}</span>
                  <span className="text-sm font-extrabold font-mono mt-1 block uppercase">
                    {selectedReceipt.isFullyPaid ? 'Cleared ✓' : `৳${selectedReceipt.balanceAmountBDT.toLocaleString()}`}
                  </span>
                </div>
              </div>

              {/* Print Footer Elements with Double Sign-off line */}
              <div className="flex justify-between items-end pt-12 text-center text-[10px] font-bold text-slate-500">
                <div className="w-40 border-t border-slate-400 pt-1.5 uppercase">
                  Customer Signature
                </div>
                <div className="w-48 border-t border-slate-900 pt-1.5 uppercase text-slate-900 font-extrabold">
                  For {COMPANY_PROFILE.name || 'Acoola Trims Corp.'}
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex gap-2 justify-end pt-4 border-t mt-5 print:hidden">
              <button
                onClick={() => setSelectedReceipt(null)}
                className="bg-slate-100 hover:bg-slate-200 px-5 py-2.5 rounded-xl uppercase text-xs font-black cursor-pointer"
              >
                Close Sheet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
