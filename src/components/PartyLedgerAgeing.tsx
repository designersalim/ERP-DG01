import React, { useState, useMemo } from 'react';
import { ProformaInvoice, CommercialInvoice, PaymentReceived } from '../types';
import Barcode from './Barcode';
import { Printer, TrendingDown, DollarSign, Calendar, Search, CreditCard, ChevronRight, Plus, RefreshCw, Layers } from 'lucide-react';

interface PartyLedgerAgeingProps {
  pis: ProformaInvoice[];
  commercialInvoices: CommercialInvoice[];
  initialPayments?: PaymentReceived[];
  onPaymentsChange?: (payments: PaymentReceived[]) => void;
  canEdit?: boolean;
}

export default function PartyLedgerAgeing({ pis, commercialInvoices, initialPayments, onPaymentsChange, canEdit = true }: PartyLedgerAgeingProps) {
  const [searchQuery, setSearchQuery] = useState('');
  
  const [localPayments, setLocalPayments] = useState<PaymentReceived[]>(() => {
    try {
      const saved = localStorage.getItem('acoola_buyer_payments');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [
      {
        id: 'rec-1',
        factoryName: 'Interlink Apparel Ltd',
        date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10),
        amount: 3200,
        paymentMethod: 'Bank Transfer',
        bankRef: 'EBL-29931'
      },
      {
        id: 'rec-2',
        factoryName: 'Dekko Garments Ltd',
        date: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10),
        amount: 1500,
        paymentMethod: 'Check Received',
        bankRef: 'DBBL-CHQ-1100'
      }
    ];
  });

  const payments = initialPayments !== undefined ? initialPayments : localPayments;

  // Modal State for adding a Payment Receipt
  const [showModal, setShowModal] = useState(false);
  const [editingPayment, setEditingPayment] = useState<PaymentReceived | null>(null);
  const [selectedParty, setSelectedParty] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().substring(0, 10));
  const [paymentMethod, setPaymentMethod] = useState('Bank Transfer');
  const [bankRef, setBankRef] = useState('');
  const [isPrinting, setIsPrinting] = useState(false);
  const [paymentReceiptToPrint, setPaymentReceiptToPrint] = useState<PaymentReceived | null>(null);

  // Auto clean up print states on printable cancel or layout close
  const triggerPrintReceipt = (item: PaymentReceived) => {
    setPaymentReceiptToPrint(item);
  };

  const savePaymentsToStorage = (updatedPayments: PaymentReceived[]) => {
    if (onPaymentsChange) {
      onPaymentsChange(updatedPayments);
    } else {
      setLocalPayments(updatedPayments);
    }
    localStorage.setItem('acoola_buyer_payments', JSON.stringify(updatedPayments));
  };

  const triggerOpenCreate = () => {
    setEditingPayment(null);
    setSelectedParty('');
    setPaymentAmount('');
    setPaymentDate(new Date().toISOString().substring(0, 10));
    setPaymentMethod('Bank Transfer');
    setBankRef('');
    setShowModal(true);
  };

  const triggerEditPayment = (p: PaymentReceived) => {
    setEditingPayment(p);
    setSelectedParty(p.factoryName);
    setPaymentAmount(p.amount.toString());
    setPaymentDate(p.date);
    setPaymentMethod(p.paymentMethod);
    setBankRef(p.bankRef || '');
    setShowModal(true);
  };

  const handleDeletePayment = (id: string) => {
    if (window.confirm("Are you sure you want to permanently delete this payment collection? Net accounts receivable dues will recalculate instantly.")) {
      const filtered = payments.filter(p => p.id !== id);
      savePaymentsToStorage(filtered);
    }
  };

  // Compile billing lists by factory
  const ledgerData = useMemo(() => {
    const parties: Record<string, {
      factoryName: string;
      billingTotal: number;
      paidTotal: number;
      outstandingTotal: number;
      aging0to30: number;
      aging31to60: number;
      aging61to90: number;
      aging90Plus: number;
    }> = {};

    // Get all billable items using the newer Commercial invoices or falling back to PIs
    const today = new Date();

    // Sum up PI values (as base invoice values)
    pis.forEach(pi => {
      const name = pi.factoryName.trim();
      if (!name) return;

      const totalVal = pi.items.reduce((sum, s) => sum + (s.totalQuantity * s.unitPrice), 0);
      
      // Calculate age of the invoice in days
      const invoiceDate = new Date(pi.date || pi.createdAt || today.toISOString());
      const ageInMs = today.getTime() - invoiceDate.getTime();
      const ageInDays = Math.max(0, Math.floor(ageInMs / (1000 * 60 * 60 * 24)));

      if (!parties[name]) {
        parties[name] = {
          factoryName: name,
          billingTotal: 0,
          paidTotal: 0,
          outstandingTotal: 0,
          aging0to30: 0,
          aging31to60: 0,
          aging61to90: 0,
          aging90Plus: 0
        };
      }

      parties[name].billingTotal += totalVal;

      // Assign to the appropriate bucket based on age
      if (ageInDays <= 30) {
        parties[name].aging0to30 += totalVal;
      } else if (ageInDays <= 60) {
        parties[name].aging31to60 += totalVal;
      } else if (ageInDays <= 90) {
        parties[name].aging61to90 += totalVal;
      } else {
        parties[name].aging90Plus += totalVal;
      }
    });

    // Make sure we dynamically add any extra Commercial Invoices not in PIs
    commercialInvoices.forEach(ci => {
      const name = ci.factoryName.trim();
      if (!name) return;
      
      // If payment base was done via PI, avoid double counting value
      const matchPi = pis.some(p => p.id === ci.piId);
      if (matchPi) return; // already counted in PI loops

      const totalVal = ci.totalAmount;
      const invoiceDate = new Date(ci.date || ci.createdAt || today.toISOString());
      const ageInMs = today.getTime() - invoiceDate.getTime();
      const ageInDays = Math.max(0, Math.floor(ageInMs / (1000 * 60 * 60 * 24)));

      if (!parties[name]) {
        parties[name] = {
          factoryName: name,
          billingTotal: 0,
          paidTotal: 0,
          outstandingTotal: 0,
          aging0to30: 0,
          aging31to60: 0,
          aging61to90: 0,
          aging90Plus: 0
        };
      }

      parties[name].billingTotal += totalVal;
      if (ageInDays <= 30) {
        parties[name].aging0to30 += totalVal;
      } else if (ageInDays <= 60) {
        parties[name].aging31to60 += totalVal;
      } else if (ageInDays <= 90) {
        parties[name].aging61to90 += totalVal;
      } else {
        parties[name].aging90Plus += totalVal;
      }
    });

    // Map payments to Deduct from outstanding and decrement buckets sequentially
    payments.forEach(p => {
      const name = p.factoryName.trim();
      if (!parties[name]) {
        // Just record names of parties who made advance payment if they don't have invoices
        parties[name] = {
          factoryName: name,
          billingTotal: 0,
          paidTotal: 0,
          outstandingTotal: 0,
          aging0to30: 0,
          aging31to60: 0,
          aging61to90: 0,
          aging90Plus: 0
        };
      }
      parties[name].paidTotal += p.amount;
    });

    // Finalize ledger values & credit aging reductions
    return Object.values(parties).map(party => {
      // Calculate Net Outstanding
      const outstanding = Math.max(0, party.billingTotal - party.paidTotal);
      let remPaid = party.paidTotal;

      // Deduct paid sequentially start from oldest buckets (FIFO)
      let b90 = party.aging90Plus;
      if (remPaid >= b90) { remPaid -= b90; b90 = 0; } else { b90 -= remPaid; remPaid = 0; }

      let b90_60 = party.aging61to90;
      if (remPaid >= b90_60) { remPaid -= b90_60; b90_60 = 0; } else { b90_60 -= remPaid; remPaid = 0; }

      let b60_30 = party.aging31to60;
      if (remPaid >= b60_30) { remPaid -= b60_30; b60_30 = 0; } else { b60_30 -= remPaid; remPaid = 0; }

      let b0_30 = party.aging0to30;
      if (remPaid >= b0_30) { remPaid -= b0_30; b0_30 = 0; } else { b0_30 -= remPaid; remPaid = 0; }

      return {
        ...party,
        outstandingTotal: outstanding,
        aging0to30: b0_30,
        aging31to60: b60_30,
        aging61to90: b90_60,
        aging90Plus: b90
      };
    }).filter(ledger => ledger.billingTotal > 0 || ledger.paidTotal > 0);

  }, [pis, commercialInvoices, payments]);

  const filteredLedgers = useMemo(() => {
    return ledgerData.filter(item => 
      item.factoryName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [ledgerData, searchQuery]);

  // Totals for summary analytics
  const summaryAggregates = useMemo(() => {
    return filteredLedgers.reduce((acc, current) => {
      acc.totalBilled += current.billingTotal;
      acc.totalPaid += current.paidTotal;
      acc.totalDue += current.outstandingTotal;
      acc.total0to30 += current.aging0to30;
      acc.total31to60 += current.aging31to60;
      acc.total61to90 += current.aging61to90;
      acc.total90Plus += current.aging90Plus;
      return acc;
    }, {
      totalBilled: 0,
      totalPaid: 0,
      totalDue: 0,
      total0to30: 0,
      total31to60: 0,
      total61to90: 0,
      total90Plus: 0
    });
  }, [filteredLedgers]);

  const handleRecordPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedParty || !paymentAmount) return;

    if (editingPayment) {
      const updated = payments.map(p => p.id === editingPayment.id ? {
        ...p,
        factoryName: selectedParty,
        date: paymentDate,
        amount: parseFloat(paymentAmount) || 0,
        paymentMethod,
        bankRef: bankRef.trim() || undefined
      } : p);
      savePaymentsToStorage(updated);
      setEditingPayment(null);
    } else {
      const newPayment: PaymentReceived = {
        id: `rcv-${Date.now()}`,
        factoryName: selectedParty,
        date: paymentDate,
        amount: parseFloat(paymentAmount) || 0,
        paymentMethod,
        bankRef: bankRef.trim() || undefined
      };
      savePaymentsToStorage([newPayment, ...payments]);
    }

    setShowModal(false);
    setPaymentAmount('');
    setBankRef('');
    setSelectedParty('');
  };

  const activePartiesList = useMemo(() => {
    const list = new Set<string>();
    pis.forEach(p => list.add(p.factoryName));
    commercialInvoices.forEach(c => list.add(c.factoryName));
    return Array.from(list);
  }, [pis, commercialInvoices]);

  const triggerPrintReport = () => {
    setIsPrinting(true);
  };

  return (
    <div className="space-y-6">
      {/* Target Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-4">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900 tracking-tight flex items-center gap-1.5 leading-none">
            📊 বায়ার লেজার ও বকেয়া ডেট ট্র্যাকার (Buyer Aging Ledger Hub)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            কোন বায়ার বা গার্মেন্টস হাউসের কাছে কত টাকা বিল পাওনা আছে এবং তা কতদিন ধরে বকেয়া (৩০/৬০/৯০ দিন) রয়েছে তার স্বয়ংক্রিয় এনালাইসিস রিপোর্ট।
          </p>
        </div>

        <div className="flex gap-2">
          {canEdit && (
            <button
              onClick={triggerOpenCreate}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-xs uppercase tracking-wider"
            >
              <Plus className="w-4 h-4" /> পেমেন্ট কালেকশন যোগ করুন (Receive Payment)
            </button>
          )}
          <button
            onClick={triggerPrintReport}
            className="px-3.5 py-1.5 bg-neutral-900 hover:bg-neutral-950 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
          >
            <Printer className="w-4 h-4" /> লেজার প্রিন্ট / PDF
          </button>
        </div>
      </div>

      {/* Due Visualizer Progress Blocks */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex items-center gap-3">
          <div className="p-3 bg-indigo-50 text-indigo-700 rounded-lg"><DollarSign className="w-5 h-5" /></div>
          <div>
            <span className="block text-[9.5px] uppercase font-bold text-slate-400">Total Billed Receivables</span>
            <span className="text-base font-black text-neutral-950">${summaryAggregates.totalBilled.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
            <span className="block text-[9px] text-slate-500">মোট ধার্যকৃত পাওনা</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex items-center gap-3">
          <div className="p-3 bg-emerald-50 text-emerald-700 rounded-lg"><TrendingDown className="w-5 h-5" /></div>
          <div>
            <span className="block text-[9.5px] uppercase font-bold text-slate-400">Total Payments received</span>
            <span className="text-base font-black text-emerald-700">${summaryAggregates.totalPaid.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
            <span className="block text-[9px] text-slate-500">মোট পেমেন্ট জমা</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex items-center gap-3">
          <div className="p-3 bg-rose-50 text-rose-700 rounded-lg"><Plus className="w-5 h-5" /></div>
          <div>
            <span className="block text-[9.5px] uppercase font-bold text-slate-400">Net Outstanding Dues</span>
            <span className="text-base font-black text-rose-800">${summaryAggregates.totalDue.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
            <span className="block text-[9px] text-[#c2185b] font-bold">মোট প্রকৃত বকেয়া পাওনা</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex items-center gap-3">
          <div className="p-3 bg-amber-50 text-amber-700 rounded-lg"><Calendar className="w-5 h-5" /></div>
          <div>
            <span className="block text-[9.5px] uppercase font-bold text-slate-400">90+ Days Overdue (High Risk)</span>
            <span className="text-base font-black text-[#b91c1c]">${summaryAggregates.total90Plus.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
            <span className="block text-[9px] text-red-600 font-bold">৯০+ দিন পার হওয়া অত্যন্ত ঝুঁকিপূর্ণ</span>
          </div>
        </div>
      </div>

      {/* Overdue Percent Visualizer Grid Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
        <h3 className="font-extrabold text-[10.5px] uppercase tracking-wider text-slate-700 border-b border-slate-100 pb-2 mb-3">
          ⏰ Due Aging Distribution chart (%)
        </h3>
        {summaryAggregates.totalDue === 0 ? (
          <p className="text-xs text-slate-400 py-2 font-medium">No active outstanding receivables to classify.</p>
        ) : (
          <div className="space-y-4">
            <div className="h-6 w-full rounded-full overflow-hidden flex font-mono text-[9px] font-extrabold text-white">
              <div 
                style={{ width: `${(summaryAggregates.total0to30 / summaryAggregates.totalDue) * 100}%` }} 
                className="bg-emerald-600 h-full flex items-center justify-center min-w-[20px]"
                title={`0-30 days: $${summaryAggregates.total0to30.toLocaleString()}`}
              >
                {summaryAggregates.total0to30 > 0 && '0-30d'}
              </div>
              <div 
                style={{ width: `${(summaryAggregates.total31to60 / summaryAggregates.totalDue) * 100}%` }} 
                className="bg-indigo-600 h-full flex items-center justify-center min-w-[20px]"
                title={`31-60 days: $${summaryAggregates.total31to60.toLocaleString()}`}
              >
                {summaryAggregates.total31to60 > 0 && '31-60d'}
              </div>
              <div 
                style={{ width: `${(summaryAggregates.total61to90 / summaryAggregates.totalDue) * 100}%` }} 
                className="bg-amber-500 h-full flex items-center justify-center min-w-[20px]"
                title={`61-90 days: $${summaryAggregates.total61to90.toLocaleString()}`}
              >
                {summaryAggregates.total61to90 > 0 && '61-90d'}
              </div>
              <div 
                style={{ width: `${(summaryAggregates.total90Plus / summaryAggregates.totalDue) * 100}%` }} 
                className="bg-red-600 h-full flex items-center justify-center min-w-[20px]"
                title={`90+ days: $${summaryAggregates.total90Plus.toLocaleString()}`}
              >
                {summaryAggregates.total90Plus > 0 && '90d+'}
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-semibold pl-2">
              <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-600" /><span>0 - 30 Days: <strong>${summaryAggregates.total0to30.toLocaleString(undefined, {maximumFractionDigits:0})}</strong></span></div>
              <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-indigo-600" /><span>31 - 60 Days: <strong>${summaryAggregates.total31to60.toLocaleString(undefined, {maximumFractionDigits:0})}</strong></span></div>
              <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" /><span>61 - 90 Days: <strong>${summaryAggregates.total61to90.toLocaleString(undefined, {maximumFractionDigits:0})}</strong></span></div>
              <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-650" /><span>90+ Overdue: <strong className="text-red-600">${summaryAggregates.total90Plus.toLocaleString(undefined, {maximumFractionDigits:0})}</strong></span></div>
            </div>
          </div>
        )}
      </div>

      {/* Interactive Search Tool table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="p-4 bg-slate-50 border-b border-gray-150 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative flex-1 w-full max-w-xs group">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400 group-hover:text-slate-650 transition-colors" />
            <input
              type="text"
              placeholder="বায়ার বা গার্মেন্টস দিয়ে খুঁজুন..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg py-1.5 pl-9 pr-4 text-xs font-semibold outline-none focus:border-emerald-500 transition-colors"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-gray-150 text-[10px] uppercase font-extrabold tracking-wider text-slate-400">
                <th className="py-3.5 px-4">Client Garments / বায়ার</th>
                <th className="py-3.5 px-4 text-right">Total Billing / মোট ধার্য</th>
                <th className="py-3.5 px-4 text-right">Fund Received / জমা</th>
                <th className="py-3.5 px-4 text-right text-rose-800">Outstanding Duo / বকেয়া</th>
                <th className="py-3.5 px-4 text-center">Age: 0-30d</th>
                <th className="py-3.5 px-4 text-center">Age: 31-60d</th>
                <th className="py-3.5 px-4 text-center">Age: 61-90d</th>
                <th className="py-3.5 px-4 text-center text-red-600">Age: 90D+</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-150">
              {filteredLedgers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 font-bold">
                    No matching party accounts in ledger database.
                  </td>
                </tr>
              ) : (
                filteredLedgers.map(item => (
                  <tr key={item.factoryName} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="py-3.5 px-4 font-bold text-slate-900 flex items-center gap-1.5">
                      <ChevronRight className="w-3.5 h-3.5 text-slate-350 group-hover:text-emerald-500 transition-colors" />
                      {item.factoryName}
                    </td>
                    <td className="py-3.5 px-4 text-right font-semibold text-slate-700">${item.billingTotal.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                    <td className="py-3.5 px-4 text-right font-semibold text-emerald-700">${item.paidTotal.toLocaleString(undefined, {minimumFractionDigits:2})}</td>
                    <td className="py-3.5 px-4 text-right font-black text-rose-800 bg-rose-50/20">${item.outstandingTotal.toLocaleString(undefined, {minimumFractionDigits:2})}</td>
                    <td className="py-3.5 px-4 text-center font-mono text-slate-650">${item.aging0to30 > 0 ? `$${item.aging0to30.toLocaleString(undefined, {maximumFractionDigits:0})}` : '—'}</td>
                    <td className="py-3.5 px-4 text-center font-mono text-slate-650">${item.aging31to60 > 0 ? `$${item.aging31to60.toLocaleString(undefined, {maximumFractionDigits:0})}` : '—'}</td>
                    <td className="py-3.5 px-4 text-center font-mono text-slate-650">${item.aging61to90 > 0 ? `$${item.aging61to90.toLocaleString(undefined, {maximumFractionDigits:0})}` : '—'}</td>
                    <td className="py-3.5 px-4 text-center font-mono font-bold text-red-650 bg-red-50/10">${item.aging90Plus > 0 ? `$${item.aging90Plus.toLocaleString(undefined, {maximumFractionDigits:0})}` : '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 💳 Individual Receipts Ledger (একক পেমেন্ট কালেকশন লোগ ও এডিট অপশন) */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="p-4 bg-slate-50 border-b border-slate-105 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-800 flex items-center gap-1">
              <RefreshCw className="w-4 h-4 text-emerald-600" /> Real Collection Receipts List (কালেকশন হিস্ট্রি ও রেকর্ড এডিট)
            </h3>
            <p className="text-[10px] text-slate-500 font-medium">Any changes here will compile instantly to calculate the respective party's net outstanding balances.</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-gray-150 text-[10px] uppercase font-extrabold tracking-wider text-slate-400">
                <th className="py-3 px-4">Factory Name / বায়ার গার্মেন্টস গ্রুপ</th>
                <th className="py-3 px-4 text-center">Receipt Date / তারিখ</th>
                <th className="py-3 px-4 text-right">Amount (USD) / পরিমাণ</th>
                <th className="py-3 px-4 text-center">Channel / পদ্ধতি</th>
                <th className="py-3 px-4 text-center">Reference Ref</th>
                <th className="py-3 px-4 text-right">Actions / এডিট</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-150">
              {payments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-400 font-bold">
                    No payment collections recorded in the database ledger. Click the green button above to post one.
                  </td>
                </tr>
              ) : (
                payments.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900">{item.factoryName}</td>
                    <td className="py-3.5 px-4 text-center text-slate-600">{item.date}</td>
                    <td className="py-3.5 px-4 text-right font-extrabold text-emerald-700">${item.amount.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-block bg-slate-100 border border-slate-200 text-slate-700 px-2 py-0.5 rounded-full text-[9px] font-bold">
                        {item.paymentMethod}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center font-mono text-slate-505 font-bold">{item.bankRef || 'N/A'}</td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex justify-end gap-1.5 font-sans">
                        <button
                          onClick={() => triggerPrintReceipt(item)}
                          className="px-2 py-1 bg-neutral-900 hover:bg-neutral-950 text-white font-extrabold uppercase text-[9.5px] rounded flex items-center gap-0.5 cursor-pointer transition-colors"
                          title="Print Money Receipt"
                        >
                          🖨️ Receipt
                        </button>
                        {canEdit && (
                          <>
                            <button
                              onClick={() => triggerEditPayment(item)}
                              className="px-2 py-1 border border-slate-200 hover:border-indigo-600 hover:text-indigo-700 font-bold uppercase text-[9.5px] rounded flex items-center gap-0.5 cursor-pointer transition-colors"
                            >
                              ✏️ Edit
                            </button>
                            <button
                              onClick={() => handleDeletePayment(item.id)}
                              className="px-2 py-1 border border-slate-200 hover:border-red-600 hover:text-red-700 font-bold uppercase text-[9.5px] rounded flex items-center gap-0.5 cursor-pointer transition-colors"
                            >
                              🗑️ Delete
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Payment Dialog Popup */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 p-6 rounded-2xl max-w-md w-full shadow-lg space-y-4 text-xs">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-800 uppercase flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-emerald-600" /> {editingPayment ? 'Edit Client Fund Receipt / পেমেন্ট সংশোধন' : 'Record Client Funds Received (কালেকশন)'}
              </h3>
            </div>

            <form onSubmit={handleRecordPayment} className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Select Buyer / Garments Group</label>
                <select
                  required
                  value={selectedParty}
                  onChange={(e) => setSelectedParty(e.target.value)}
                  className="w-full border border-slate-250 py-2 px-3 rounded-lg text-xs font-bold font-sans outline-none focus:border-emerald-500"
                >
                  <option value="">-- Choose Party --</option>
                  {activePartiesList.map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Payment Received Amount (USD)</label>
                <input
                  type="number"
                  step="any"
                  required
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="e.g. 2500"
                  className="w-full border border-slate-250 py-2 px-3 rounded-lg text-xs font-extrabold fill-slate-800 outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Deposit Date (তারিখ)</label>
                  <input
                    type="date"
                    required
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full border border-slate-250 py-2 px-3 rounded-lg text-xs font-bold outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Channel (পেমেন্ট পদ্ধতি)</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full border border-slate-250 py-2 px-3 rounded-lg text-xs font-bold outline-none focus:border-emerald-500"
                  >
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Check Received">Check / Chq</option>
                    <option value="L/C Credit Negotiate">L/C Negotiation</option>
                    <option value="Cash Cash">Cash Receipt</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Bank Reference Check / RTGS Transaction Info</label>
                <input
                  type="text"
                  placeholder="e.g. MTBL-Ref-99021"
                  value={bankRef}
                  onChange={(e) => setBankRef(e.target.value)}
                  className="w-full border border-slate-250 py-2 px-3 rounded-lg text-xs font-semibold outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex gap-2.5 pt-3">
                <button
                  type="submit"
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-extrabold uppercase rounded-lg cursor-pointer transition-colors shadow-sm"
                >
                  Confirm Collection
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg cursor-pointer transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 📊 Global Hidden Print Container for Party Ledger */}
      {isPrinting && (
        <>
          {/* On-Screen Interactive Preview Modal */}
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto print:hidden">
            <div className="bg-slate-50 border border-slate-200 rounded-2xl max-w-4xl w-full shadow-lg p-6 space-y-4 text-xs animate-fade-in text-left">
              <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-800 uppercase flex items-center gap-1.5 font-sans">
                  <Printer className="w-4 h-4 text-indigo-600" /> Buyer Ledger & Aging Report Preview
                </h3>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const element = document.getElementById('party-ledger-print-sheet');
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
                          #party-ledger-print-sheet { display: block !important; visibility: visible !important; width: 100% !important; margin: 0 !important; padding: 0 !important; }
                          #party-ledger-print-sheet * { visibility: visible !important; }
                          @page { size: A4 portrait; margin: 10mm; }
                        </style>
                      `;
                      printWindow.document.write(`
                        <html>
                          <head>
                            <title>Buyer Ledger & Aging Report</title>
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
                    className="px-4 py-1.5 bg-neutral-900 hover:bg-neutral-950 text-white font-extrabold text-[10px] uppercase tracking-wider rounded-lg flex items-center gap-1 cursor-pointer transition-all shadow-xs"
                  >
                    <Printer className="w-3.5 h-3.5" /> Print Statement
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsPrinting(false)}
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
                <div className="p-6 border border-slate-300 rounded-xl text-left bg-white relative">
                  <div className="flex justify-between items-start border-b border-slate-300 pb-4 mb-4">
                    <div>
                      <h2 className="text-base font-black text-slate-900 uppercase">Acoola Trims Corporation</h2>
                      <p className="text-[10px] text-slate-500 font-bold">Receivables Aging Ledger Report (বকেয়া এজ ট্র্যাকার)</p>
                      <p className="text-[8.5px] text-slate-455 mt-1">Generated: {new Date().toLocaleString()}</p>
                    </div>
                  </div>

                  <table className="w-full text-[10px] text-neutral-700 border-collapse">
                    <thead>
                      <tr className="bg-slate-55 border-b border-slate-300 font-bold uppercase text-[9px] text-slate-500">
                        <th className="py-2 px-2 text-left">Factory Name</th>
                        <th className="py-2 px-2 text-right">Total Billed</th>
                        <th className="py-2 px-2 text-right">Payments</th>
                        <th className="py-2 px-2 text-right text-pink-700">Outstanding</th>
                        <th className="py-2 px-2 text-right">0-30 Days</th>
                        <th className="py-2 px-2 text-right">31-60 Days</th>
                        <th className="py-2 px-2 text-right">61-90 Days</th>
                        <th className="py-2 px-2 text-right">90+ Days</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredLedgers.map((item, idx) => (
                        <tr key={idx}>
                          <td className="py-2 px-2 font-bold text-slate-900">{item.factoryName}</td>
                          <td className="py-2 px-2 text-right">${item.billingTotal.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                          <td className="py-2 px-2 text-right">${item.paidTotal.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                          <td className="py-2 px-2 text-right font-bold text-pink-700">${item.outstandingTotal.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                          <td className="py-2 px-2 text-right">${item.aging0to30.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                          <td className="py-2 px-2 text-right">${item.aging31to60.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                          <td className="py-2 px-2 text-right">${item.aging61to90.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                          <td className="py-2 px-2 text-right font-bold text-red-850">${item.aging90Plus.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                        </tr>
                      ))}
                      <tr className="bg-slate-50 font-extrabold border-t border-slate-400 text-slate-900">
                        <td className="py-2 px-2">Total:</td>
                        <td className="py-2 px-2 text-right">${summaryAggregates.totalBilled.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                        <td className="py-2 px-2 text-right">${summaryAggregates.totalPaid.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                        <td className="py-2 px-2 text-right text-pink-700">${summaryAggregates.totalDue.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                        <td className="py-2 px-2 text-right">${summaryAggregates.total0to30.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                        <td className="py-2 px-2 text-right">${summaryAggregates.total31to60.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                        <td className="py-2 px-2 text-right">${summaryAggregates.total61to90.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                        <td className="py-2 px-2 text-right text-red-800">${summaryAggregates.total90Plus.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          <div id="party-ledger-print-sheet" className="relative p-[10mm] font-sans bg-white text-neutral-900 min-h-screen select-text print:block hidden text-left">
          {/* Vertical Margin Barcode (Scannable within 0.5" page margins) */}
          <div className="absolute left-[-32px] top-[40mm] w-[10mm] h-[100mm] flex flex-col items-center justify-center print:flex hidden z-55 pointer-events-none select-none">
            <Barcode value="LEDGER-AGING" vertical={true} height={36} showText={false} />
          </div>

          <div className="max-w-7xl mx-auto text-left relative">
            <div className="flex justify-between items-start border-b border-slate-300 pb-4 mb-4">
              <div>
                <h2 className="text-xl font-black text-slate-900 uppercase">Acoola Trims Corporation</h2>
                <p className="text-[11px] text-slate-500 font-bold">Receivables Aging Ledger Report (বকেয়া এজ ট্র্যাকার)</p>
                <p className="text-[9px] text-slate-400 mt-1">Generated: {new Date().toLocaleString()}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <Barcode value="LEDGER-AGING" height={20} showText={true} />
              </div>
            </div>

            <table className="w-full text-xs text-neutral-700 border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b-2 border-slate-300 font-bold uppercase text-[9px] text-slate-500">
                  <th className="py-2 px-3 text-left">Factory / Garments Name</th>
                  <th className="py-2 px-3 text-right">Total Billed (USD)</th>
                  <th className="py-2 px-3 text-right">Total Payments (USD)</th>
                  <th className="py-2 px-3 text-right text-pink-700">Outstanding Due (USD)</th>
                  <th className="py-2 px-3 text-right">0-30 Days</th>
                  <th className="py-2 px-3 text-right">31-60 Days</th>
                  <th className="py-2 px-3 text-right">61-90 Days</th>
                  <th className="py-2 px-3 text-right">90+ Days Due</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredLedgers.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 border-b border-slate-100">
                    <td className="py-2 px-3 font-bold text-slate-900">{item.factoryName}</td>
                    <td className="py-2 px-3 text-right">${item.billingTotal.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                    <td className="py-2 px-3 text-right">${item.paidTotal.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                    <td className="py-2 px-3 text-right font-bold text-pink-700">${item.outstandingTotal.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                    <td className="py-2 px-3 text-right">${item.aging0to30.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                    <td className="py-2 px-3 text-right">${item.aging31to60.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                    <td className="py-2 px-3 text-right">${item.aging61to90.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                    <td className="py-2 px-3 text-right font-bold text-red-800">${item.aging90Plus.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                  </tr>
                ))}
                <tr className="bg-slate-50 font-extrabold border-t-2 border-slate-900 text-slate-900">
                  <td className="py-3 px-3">RECORD TOTALS:</td>
                  <td className="py-3 px-3 text-right">${summaryAggregates.totalBilled.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                  <td className="py-3 px-3 text-right">${summaryAggregates.totalPaid.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                  <td className="py-3 px-3 text-right text-pink-700">${summaryAggregates.totalDue.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                  <td className="py-3 px-3 text-right">${summaryAggregates.total0to30.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                  <td className="py-3 px-3 text-right">${summaryAggregates.total31to60.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                  <td className="py-3 px-3 text-right">${summaryAggregates.total61to90.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                  <td className="py-3 px-3 text-right text-red-800">${summaryAggregates.total90Plus.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        </>
      )}

      {/* 💸 Global Hidden Print Container for Buyer Money Receipt / Payment Slip */}
      {paymentReceiptToPrint && (
        <>
          {/* On-Screen Interactive Preview Modal */}
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto print:hidden">
            <div className="bg-slate-50 border border-slate-200 rounded-2xl max-w-2xl w-full shadow-lg p-6 space-y-4 text-xs animate-fade-in text-left">
              <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-800 uppercase flex items-center gap-1.5 font-sans">
                  <Printer className="w-4 h-4 text-emerald-600" /> Money Receipt Print Preview (প্রাপ্তি রশিদ)
                </h3>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const element = document.getElementById('buyer-payment-slip-print-sheet');
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
                          body { margin: 0; padding: 15mm !important; background-color: #ffffff; color: #171717; font-family: sans-serif; }
                          #buyer-payment-slip-print-sheet { display: block !important; visibility: visible !important; width: 100% !important; margin: 0 !important; padding: 0 !important; }
                          #buyer-payment-slip-print-sheet * { visibility: visible !important; }
                          @page { size: A4 portrait; margin: 15mm; }
                        </style>
                      `;
                      printWindow.document.write(`
                        <html>
                          <head>
                            <title>Money Receipt - ${paymentReceiptToPrint.id}</title>
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
                    className="px-4 py-1.5 bg-neutral-900 hover:bg-neutral-950 text-white font-extrabold text-[10px] uppercase tracking-wider rounded-lg flex items-center gap-1 cursor-pointer transition-all shadow-xs"
                  >
                    <Printer className="w-3.5 h-3.5" /> Print Statement
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentReceiptToPrint(null)}
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
                <div className="p-6 border-2 border-neutral-800 rounded-xl text-left bg-white relative space-y-4">
                  <div className="border-b border-neutral-300 pb-3 flex justify-between items-start">
                    <div>
                      <h4 className="text-sm font-black text-slate-900 uppercase">Acoola Trims Corporation</h4>
                      <p className="text-[9.5px] text-slate-500 font-bold">Industrial Accessories Manufacturer & Exporter</p>
                    </div>
                    <div className="text-right">
                      <span className="bg-emerald-600 text-white px-2 py-0.5 text-[8.5px] font-black rounded uppercase">MONEY RECEIPT</span>
                      <p className="text-[10px] font-mono mt-1 font-bold">Receipt No: MR-2026-{paymentReceiptToPrint.id}</p>
                    </div>
                  </div>

                  <div className="space-y-2 text-[10.5px]">
                    <p><strong>Received From:</strong> {paymentReceiptToPrint.factoryName}</p>
                    <p><strong>Payment Amount:</strong> <span className="font-extrabold text-emerald-700">${paymentReceiptToPrint.amount.toLocaleString(undefined, {minimumFractionDigits: 2})} USD</span></p>
                    <p><strong>Payment Channel:</strong> {paymentReceiptToPrint.paymentMethod}</p>
                    {paymentReceiptToPrint.bankRef && <p><strong>Bank/Check Ref:</strong> <span className="font-mono text-indigo-700">{paymentReceiptToPrint.bankRef}</span></p>}
                    <p className="text-[9.5px] text-slate-500 font-bold">Date: {paymentReceiptToPrint.date}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div id="buyer-payment-slip-print-sheet" className="hidden print:block relative p-[15mm] font-sans bg-white text-neutral-900 min-h-screen select-text text-left">
          {/* Vertical Margin Barcode (Scannable within 0.5" page margins) */}
          <div className="absolute left-[-32px] top-[40mm] w-[10mm] h-[100mm] flex flex-col items-center justify-center print:flex hidden z-55 pointer-events-none select-none">
            <Barcode value={`PAY-${paymentReceiptToPrint.id}`} vertical={true} height={36} showText={false} />
          </div>

          <div className="max-w-3xl mx-auto border-4 border-double border-neutral-800 p-8 rounded-2xl bg-white relative space-y-6">
            {/* Stamp area */}
            <div className="absolute right-6 top-[80px] w-24 h-24 border-2 border-dashed border-slate-300 rounded flex items-center justify-center text-[10px] uppercase font-bold text-slate-400 select-none">
              Revenue Stamp
            </div>

            {/* Header */}
            <div className="border-b-2 border-neutral-950 pb-5 flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-black text-neutral-905 tracking-tight uppercase">Acoola Trims Corporation</h1>
                <p className="text-[10px] text-neutral-500 font-bold mt-1">Industrial Accessories Manufacturer & Exporter</p>
                <p className="text-[9px] text-zinc-500 mt-0.5">BIN No: 001925348-0201 • Sector-07 Main Office Unit</p>
              </div>
              <div className="text-right flex flex-col items-end">
                <span className="bg-neutral-900 text-white px-3 py-1 font-black text-xs rounded tracking-wider uppercase">MONEY RECEIPT</span>
                <p className="text-xs font-black text-neutral-900 mt-2">Receipt No: MR-2026-{paymentReceiptToPrint.id}</p>
                <p className="text-[10px] text-neutral-500 font-bold mt-0.5">Date: {paymentReceiptToPrint.date}</p>
              </div>
            </div>

            <p className="text-emerald-850 text-[11px] font-bold italic leading-none">
              Verified & Credited Official Payment Receipt / প্রাপ্তি স্বীকার রশিদ
            </p>

            {/* Body of money receipt */}
            <div className="space-y-4 text-xs mt-2 border-b border-neutral-100 pb-6 text-neutral-800">
              <div className="flex items-center gap-2 border-b border-dashed border-neutral-200 pb-2">
                <span className="w-44 text-neutral-400 font-bold uppercase text-[9.5px]">Received From (বায়ার গ্রাহক):</span>
                <span className="font-extrabold text-neutral-900 text-sm">{paymentReceiptToPrint.factoryName}</span>
              </div>

              <div className="flex items-center gap-2 border-b border-dashed border-neutral-200 pb-2">
                <span className="w-44 text-neutral-400 font-bold uppercase text-[9.5px]">Payment Amount (প্রাপ্তির পরিমাণ):</span>
                <span className="font-black text-emerald-700 text-sm">${paymentReceiptToPrint.amount.toLocaleString(undefined, {minimumFractionDigits: 2})} USD</span>
              </div>

              <div className="flex items-center gap-2 border-b border-dashed border-neutral-200 pb-2">
                <span className="w-44 text-neutral-400 font-bold uppercase text-[9.5px]">Amount in Words (কথায়):</span>
                <span className="font-black text-neutral-850 space-x-1">
                  {(() => {
                    const toWords = (n: number): string => {
                      const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
                      const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
                      if (n < 20) return a[n];
                      if (n < 100) return b[Math.floor(n / 10)] + ' ' + a[n % 10];
                      if (n < 1000) return a[Math.floor(n / 100)] + ' Hundred ' + toWords(n % 100);
                      if (n < 1000000) return toWords(Math.floor(n / 1000)) + ' Thousand ' + toWords(n % 1000);
                      return toWords(Math.floor(n / 1000000)) + ' Million ' + toWords(n % 1000000);
                    };
                    const cleanAmt = Math.floor(paymentReceiptToPrint.amount);
                    return `US Dollars ${toWords(cleanAmt)} Only.`;
                  })()}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2 border-b border-dashed border-neutral-200 pb-2">
                  <span className="text-neutral-400 font-bold uppercase text-[9.5px]">Payment Channel (মাধ্যম):</span>
                  <span className="font-extrabold text-neutral-900">{paymentReceiptToPrint.paymentMethod}</span>
                </div>
                <div className="flex items-center gap-2 border-b border-dashed border-neutral-200 pb-2">
                  <span className="text-neutral-400 font-bold uppercase text-[9.5px]">Check/Bank Reference:</span>
                  <span className="font-mono font-bold text-indigo-700">{paymentReceiptToPrint.bankRef || 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* Verification and signature line */}
            <div className="pt-16 grid grid-cols-2 gap-12 text-[10px] font-bold text-center">
              <div>
                <div className="border-t border-neutral-300 pt-1.5 text-neutral-500">Authorized Depositor / Accounts Assistant</div>
              </div>
              <div>
                <div className="border-t-2 border-emerald-500 pt-1.5 text-emerald-600 font-black">For Acoola Trims Corporation</div>
                <p className="text-[8px] text-neutral-450 mt-1 uppercase tracking-wider">Managing Chief Cashier Seal & Stamp</p>
              </div>
            </div>
          </div>
        </div>
        </>
      )}
    </div>
  );
}
