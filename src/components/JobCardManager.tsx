import React, { useState, useMemo } from 'react';
import { Booking, JobCard, SizeEntry } from '../types';
import { COMPANY_PROFILE } from '../data';
import Barcode from './Barcode';
import { Printer, Edit3, ClipboardList, CheckCircle2, Sliders, Calendar, Sparkles, Check, Play, FileText, Search, User, Eye, Trash2 } from 'lucide-react';

interface JobCardManagerProps {
  bookings: Booking[];
  jobCards: JobCard[];
  onAddJobCard: (jc: JobCard) => void;
  onUpdateJobCard: (jc: JobCard) => void;
  onDeleteJobCard: (id: string) => void;
  canEdit?: boolean;
}

export default function JobCardManager({
  bookings,
  jobCards,
  onAddJobCard,
  onUpdateJobCard,
  onDeleteJobCard,
  canEdit = true
}: JobCardManagerProps) {
  const [activePreview, setActivePreview] = useState<JobCard | null>(null);
  const [editingCard, setEditingCard] = useState<JobCard | null>(null);
  const [jobCardToPrint, setJobCardToPrint] = useState<JobCard | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Input states for editing/configuring Job Card production specs
  const [materialDetails, setMaterialDetails] = useState('');
  const [colorDetails, setColorDetails] = useState('');
  const [machineNo, setMachineNo] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [remarks, setRemarks] = useState('');
  const [status, setStatus] = useState<JobCard['status']>('Pending');

  // Compute Job Cards representing current bookings
  // If some bookings don't have matching Job Card, they will be auto-displayed or pre-built.
  const synchronizedJobCards = useMemo(() => {
    return bookings.map(b => {
      const existing = jobCards.find(jc => jc.bookingId === b.id);
      if (existing) return existing;

      // Calculate flat quantity
      const flatQty = b.sizeWise 
        ? b.sizes.reduce((sum, s) => sum + s.quantity, 0) 
        : (b.quantity || 0);

      const buyerAbbr = b.buyerName ? b.buyerName.split(' ').map(w => w[0]).join('').substring(0, 3).toUpperCase() : 'BYR';
      const cleanStyle = (b.styleNumber || 'STYLE').replace(/[^a-zA-Z0-9]/g, '').substring(0, 6).toUpperCase();
      const uniqueSuffix = b.id.substring(b.id.length - 4).toUpperCase();
      const calculatedJobCardNo = `ATC-JC-${buyerAbbr}-${cleanStyle}-${uniqueSuffix}`;

      // Create a virtual initial JobCard in-memory to prompt creation or list instantly
      const virtualCard: JobCard = {
        id: `jc-virtual-${b.id}`,
        bookingId: b.id,
        jobCardNo: calculatedJobCardNo,
        createdAt: b.createdAt || new Date().toISOString(),
        status: 'Pending',
        factoryName: b.factoryName,
        buyerName: b.buyerName,
        poNumber: b.poNumber || '',
        styleNumber: b.styleNumber || '',
        itemName: b.itemName,
        quantity: flatQty,
        unit: b.unit,
        sizeWise: b.sizeWise,
        sizes: b.sizes,
        materialDetails: 'Premium Polyester Elastic Yarn & Standard Raw Accessories',
        colorDetails: 'Dyeing matching as per approved lap-dip color standard',
        machineNo: 'M/C-08',
        targetDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10),
        remarks: 'Produce with zero trim waste and strict inspection.'
      };
      return virtualCard;
    });
  }, [bookings, jobCards]);

  const filteredJobCards = useMemo(() => {
    return synchronizedJobCards.filter(jc => {
      const term = searchQuery.toLowerCase();
      const matchText = (
        jc.factoryName.toLowerCase().includes(term) ||
        jc.buyerName.toLowerCase().includes(term) ||
        jc.itemName.toLowerCase().includes(term) ||
        jc.poNumber.toLowerCase().includes(term) ||
        jc.styleNumber.toLowerCase().includes(term) ||
        jc.jobCardNo.toLowerCase().includes(term)
      );
      const matchStatus = statusFilter === 'ALL' || jc.status === statusFilter;
      return matchText && matchStatus;
    });
  }, [synchronizedJobCards, searchQuery, statusFilter]);

  const triggerStartConfig = (jc: JobCard) => {
    // If it's a virtual job card, convert it into standard state
    const cardToEdit = jobCards.find(c => c.bookingId === jc.bookingId) || {
      ...jc,
      id: `jc-${Date.now()}` // instantiate fully
    };
    
    setEditingCard(cardToEdit);
    setMaterialDetails(cardToEdit.materialDetails || '');
    setColorDetails(cardToEdit.colorDetails || '');
    setMachineNo(cardToEdit.machineNo || '');
    setTargetDate(cardToEdit.targetDate || '');
    setRemarks(cardToEdit.remarks || '');
    setStatus(cardToEdit.status || 'Pending');
  };

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCard) return;

    const savedCard: JobCard = {
      ...editingCard,
      materialDetails,
      colorDetails,
      machineNo,
      targetDate,
      remarks,
      status
    };

    // If already exists in global array, update it, otherwise add it as permanent
    const exists = jobCards.some(c => c.bookingId === editingCard.bookingId);
    if (exists) {
      onUpdateJobCard(savedCard);
    } else {
      onAddJobCard(savedCard);
    }

    setEditingCard(null);
  };

  // Printable layout window trigger
  const triggerPrintJobCard = (jc: JobCard) => {
    setJobCardToPrint(jc);
  };

  return (
    <div className="space-y-6">
      {/* Upper Tab Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-4">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900 tracking-tight flex items-center gap-1.5 leading-none">
            📋 প্রোডাকশন জব কার্ড ও মাস্টার অর্ডার হাব (Job Card Hub)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            বুকিং এন্ট্রি হওয়ার পর স্বয়ংক্রিয়ভাবে একটি 'জব কার্ড' বা 'প্রোডাকশন অর্ডার' তৈরি হবে যা ফ্লোরে উৎপাদনের জন্য পাঠানো যায়।
          </p>
        </div>
      </div>

      {/* Main Panel grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: Interactive Specs Configuration Form */}
        <div className="lg:col-span-1 bg-white border border-slate-200 p-5 rounded-xl shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-1">
            <Sliders className="w-5 h-5 text-emerald-600" />
            <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-800">
              {editingCard ? 'Configure Card Details' : 'Select a card to configure'}
            </h3>
          </div>

          {editingCard ? (
            <form onSubmit={handleSaveConfig} className="space-y-4 text-xs">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                <p className="font-bold text-slate-900 text-sm">{editingCard.itemName}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  No: {editingCard.jobCardNo} • Style: {editingCard.styleNumber}
                </p>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Special Materials Details (ম্যাটেরিয়াল ও সুতা)</label>
                <textarea
                  value={materialDetails}
                  onChange={(e) => setMaterialDetails(e.target.value)}
                  placeholder="e.g., Polyester thread, metallic teeth, standard dye chemical"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none font-sans font-medium focus:border-emerald-500 transition-colors h-16"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Dyeing & Color specifications (কালার স্পেসিফিকেশন)</label>
                <textarea
                  value={colorDetails}
                  onChange={(e) => setColorDetails(e.target.value)}
                  placeholder="e.g., Royal Blue match Pantone Standard PMS-286C"
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none font-sans font-medium focus:border-emerald-500 transition-colors h-16"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Machine Assignment (মেশিন নং)</label>
                  <input
                    type="text"
                    value={machineNo}
                    onChange={(e) => setMachineNo(e.target.value)}
                    placeholder="M/C No"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none font-bold focus:border-emerald-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Target End Date</label>
                  <input
                    type="date"
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none font-bold focus:border-emerald-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Production Status (অবস্থা)</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as JobCard['status'])}
                  className="w-full bg-slate-50 border border-slate-250 py-2 px-3 rounded-lg text-xs font-bold font-sans outline-none text-neutral-850 focus:border-emerald-500"
                >
                  <option value="Pending">🕒 Pending (অপেক্ষমান)</option>
                  <option value="In Progress">⚙️ In Progress (উৎপাদন চলছে)</option>
                  <option value="Completed">✅ Completed (উৎপাদন সমাপ্ত)</option>
                  <option value="Delivered">🚚 Delivered (সরবরাহকৃত)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Special Instructions (বিশেষ নির্দেশনাবলী)</label>
                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Insert quality standards checks or specific cutting instructions..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none font-sans font-medium focus:border-emerald-500 transition-colors h-14"
                />
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-extrabold uppercase tracking-wider rounded-lg cursor-pointer transition-colors"
                >
                  Save Config
                </button>
                <button
                  type="button"
                  onClick={() => setEditingCard(null)}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold uppercase tracking-wider rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="py-12 text-center text-slate-400 flex flex-col items-center justify-center gap-1.5 grayscale opacity-75">
              <ClipboardList className="w-10 h-10 text-slate-300" />
              <p className="font-sans font-bold text-neutral-800">No Job Card Selected</p>
              <p className="text-[10px] text-slate-400 max-w-[200px]">Click any of the configure buttons on the list to define yarn, machine and color instructions.</p>
            </div>
          )}
        </div>

        {/* Right Side: Job Cards List */}
        <div className="lg:col-span-2 space-y-4">
          {/* Filtering Header Toolbar */}
          <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative flex-1 w-full max-w-sm group">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400 group-hover:text-slate-650 transition-colors" />
              <input
                type="text"
                placeholder="গার্মেন্টস, ডিজাইন বা আইডি দিয়ে খুঁজুন..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 hover:bg-slate-100/70 border border-slate-200 rounded-lg py-1.5 pl-9 pr-4 text-xs font-semibold outline-none focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 shadow-xs transition-all text-neutral-980"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <span className="text-[10px] uppercase font-bold text-slate-400 whitespace-nowrap">Filter:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-white border border-slate-250 py-1.5 px-2.5 rounded-lg text-xs font-bold outline-none text-neutral-850"
              >
                <option value="ALL">সকল অবস্থা (All Status)</option>
                <option value="Pending">🕒 Pending</option>
                <option value="In Progress">⚙️ In Progress</option>
                <option value="Completed">✅ Completed</option>
                <option value="Delivered">🚚 Delivered</option>
              </select>
            </div>
          </div>

          {/* Job Card items table / grid */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            {filteredJobCards.length === 0 ? (
              <div className="py-16 text-center text-slate-400">
                <p className="font-bold">কোনো জব কার্ড পাওয়া যায়নি</p>
                <p className="text-[10px]">বুকিং ডিরেক্টরিতে এসে একটি বুকিং তৈরি করলে স্বয়ংক্রিয়ভাবে জব কার্ড তৈরি হয়।</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-gray-150 text-[10px] uppercase font-extrabold tracking-wider text-slate-400">
                      <th className="py-3 px-4">Job Info / কার্ড আইডি</th>
                      <th className="py-3 px-4">Garments & Buyer / ক্রেতা</th>
                      <th className="py-3 px-4">Accessory / পণ্যের বিবরণ</th>
                      <th className="py-3 px-4 text-center">Qty / পরিমাণ</th>
                      <th className="py-3 px-4 text-center">Status / অবস্থা</th>
                      <th className="py-3 px-4 text-right">Actions / প্রিন্ট</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-150">
                    {filteredJobCards.map((jc) => {
                      const isVirtual = jc.id.startsWith('jc-virtual-');
                      
                      let statusBadgeColor = 'bg-stone-100 text-stone-800 border-stone-200';
                      if (jc.status === 'In Progress') statusBadgeColor = 'bg-indigo-50 text-indigo-700 border-indigo-200';
                      if (jc.status === 'Completed') statusBadgeColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                      if (jc.status === 'Delivered') statusBadgeColor = 'bg-cyan-50 text-cyan-700 border-cyan-200';

                      return (
                        <tr key={jc.bookingId} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3.5 px-4 font-mono">
                            <span className="block font-black text-slate-900 group-hover:text-emerald-700 transition-colors">
                              {jc.jobCardNo}
                            </span>
                            <span className="text-[9.5px] font-bold text-slate-400 block mt-0.5">
                              Style: {jc.styleNumber || 'N/A'}
                            </span>
                           </td>
                           <td className="py-3.5 px-4">
                             <span className="block font-bold text-slate-900 leading-tight">{jc.factoryName}</span>
                             <span className="text-[9.5px] font-semibold text-slate-500 block mt-0.5">
                               Buyer: {jc.buyerName}
                             </span>
                           </td>
                           <td className="py-3.5 px-4">
                             <span className="block font-black text-slate-950 leading-tight">{jc.itemName}</span>
                             <span className="text-[9.5px] text-emerald-800 font-bold block mt-0.5 uppercase">
                               Machine: {jc.machineNo || 'Click config'}
                             </span>
                           </td>
                           <td className="py-3.5 px-4 text-center">
                            <span className="font-extrabold text-slate-900 block">{jc.quantity.toLocaleString()}</span>
                            <span className="font-bold text-slate-400 text-[9.5px] block">{jc.unit}</span>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span className={`inline-block border px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${statusBadgeColor}`}>
                              {jc.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5 flex-wrap">
                              {canEdit && (
                                <button
                                  onClick={() => triggerStartConfig(jc)}
                                  className="p-1 px-2 border border-slate-200 hover:border-emerald-600 hover:text-emerald-700 font-bold uppercase text-[9.5px] rounded flex items-center gap-0.5 cursor-pointer transition-colors"
                                >
                                  <Edit3 className="w-2.5 h-2.5 text-slate-400" /> Config
                                </button>
                              )}
                              <button
                                onClick={() => setActivePreview(jc)}
                                className="p-1 px-2 border border-slate-200 hover:bg-slate-50 hover:text-indigo-700 font-bold uppercase text-[9.5px] rounded flex items-center gap-0.5 cursor-pointer transition-colors"
                              >
                                <Eye className="w-2.5 h-2.5 text-slate-400" /> Preview
                              </button>
                              <button
                                onClick={() => triggerPrintJobCard(jc)}
                                className="p-1 px-2 bg-neutral-900 hover:bg-neutral-955 text-white font-bold uppercase text-[9.5px] rounded flex items-center gap-0.5 cursor-pointer transition-colors shadow-xs"
                              >
                                <Printer className="w-2.5 h-2.5" /> Print
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* 📋 Job Card Live Print Preview Modal */}
      {activePreview && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-slate-50 border border-slate-200 rounded-2xl max-w-4xl w-full shadow-lg p-6 space-y-4 text-xs">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-800 uppercase flex items-center gap-1.5 font-sans">
                <ClipboardList className="w-4 h-4 text-emerald-600" /> Job Card Print Preview (জব কার্ড প্রিন্ট প্রিভ্যু)
              </h3>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setJobCardToPrint(activePreview);
                  }}
                  className="px-3.5 py-1.5 bg-neutral-900 hover:bg-neutral-950 text-white font-extrabold text-[10px] uppercase rounded-lg cursor-pointer flex items-center gap-1"
                >
                  <Printer className="w-3.5 h-3.5" /> Print Card
                </button>
                <button
                  type="button"
                  onClick={() => setActivePreview(null)}
                  className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg cursor-pointer text-[10px]"
                >
                  Close
                </button>
              </div>
            </div>

            {/* Simulated Paper Sheets */}
            <div className="flex justify-center bg-white p-6 max-h-[500px] overflow-y-auto">
              <div 
                className="w-[195mm] min-h-[260mm] p-[10mm] font-sans bg-white text-neutral-900 relative box-border flex flex-col justify-between" 
              >
                <div className="border-b-2 border-neutral-800 pb-5 flex justify-between items-start">
                  <div>
                    <span className="px-2 bg-slate-100 text-slate-800 font-extrabold text-[8px] uppercase tracking-widest rounded">PRODUCTION JOB CARD / জব কার্ড</span>
                    <h1 className="text-xl font-black text-neutral-900 tracking-tight mt-1">{COMPANY_PROFILE.name}</h1>
                    <p className="text-[9px] text-neutral-500 font-bold">{COMPANY_PROFILE.addresses.office}</p>
                    <p className="text-[8.5px] text-neutral-500 font-bold leading-tight mt-0.5">M/C Division Floor Unit • Access Control Area</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <Barcode value={activePreview.jobCardNo} height={20} showText={false} />
                      <span className="text-[8px] font-mono font-bold tracking-wider">{activePreview.jobCardNo}</span>
                    </div>
                    <div className="bg-white border border-slate-200 rounded p-0.5 flex items-center justify-center w-[44px] h-[44px] shadow-3xs shrink-0 select-none">
                      <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(activePreview.jobCardNo)}`} 
                        alt="QR Code" 
                        className="max-w-full max-h-full object-contain"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  </div>
                </div>

                {/* Particulars */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-[10.5px] bg-neutral-50 p-3.5 border border-neutral-200 rounded-lg mt-3">
                  <div>
                    <span className="block text-[8px] uppercase font-bold text-slate-400">Card ID:</span>
                    <span className="font-extrabold text-neutral-900">{activePreview.jobCardNo}</span>
                  </div>
                  <div>
                    <span className="block text-[8px] uppercase font-bold text-slate-400">Buyer Name:</span>
                    <span className="font-extrabold text-neutral-900">{activePreview.buyerName}</span>
                  </div>
                  <div>
                    <span className="block text-[8px] uppercase font-bold text-slate-400">Garments Factory:</span>
                    <span className="font-extrabold text-neutral-900">{activePreview.factoryName}</span>
                  </div>
                  <div>
                    <span className="block text-[8px] uppercase font-bold text-slate-400">PO Number:</span>
                    <span className="font-bold text-neutral-800">{activePreview.poNumber || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="block text-[8px] uppercase font-bold text-slate-400">Style / Brand:</span>
                    <span className="font-bold text-neutral-800">{activePreview.styleNumber || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="block text-[8px] uppercase font-bold text-slate-400">Target Date:</span>
                    <span className="font-extrabold text-slate-900">{activePreview.targetDate || 'N/A'}</span>
                  </div>
                </div>

                {/* Product Description Table styled like Delivery Challan */}
                <div className="border border-neutral-200 rounded-lg overflow-hidden mt-3 text-xs text-left">
                  <table className="w-full text-left text-neutral-700 border-collapse">
                    <thead className="bg-[#f1f5f9] border-b border-neutral-200 font-bold uppercase text-[9px] tracking-wider text-slate-450 select-none">
                      <tr>
                        <th className="py-2 px-3 w-10 text-center border-r border-neutral-150">Sl</th>
                        <th className="py-2 px-3 border-r border-neutral-150">STYLE &amp; PO NUMBER</th>
                        <th className="py-2 px-3 border-r border-neutral-150">DESCRIPTION (ITEM &amp; SIZES SPECIFICATION)</th>
                        <th className="py-2 px-3 text-right">TARGET QTY</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-150 font-medium bg-white">
                      <tr className="bg-white">
                        <td className="py-2.5 px-3 text-center border-r border-neutral-150 font-mono font-bold text-slate-400">1</td>
                        <td className="py-2.5 px-3 border-r border-neutral-150 text-left font-mono">
                          <div className="font-extrabold text-neutral-950 text-[10.5px]">Style: {activePreview.styleNumber || '—'}</div>
                          <div className="text-[9px] text-slate-500 mt-1">PO: {activePreview.poNumber || '—'}</div>
                        </td>
                        <td className="py-2.5 px-3 border-r border-neutral-150 text-left">
                          <p className="font-extrabold text-neutral-955 text-sm leading-tight">{activePreview.itemName}</p>
                          {activePreview.sizeWise && activePreview.sizes && activePreview.sizes.length > 0 ? (
                            <div className="text-[9.5px] text-sky-850 font-mono font-bold mt-1.5 leading-relaxed bg-sky-50 px-2 py-1 rounded">
                              {activePreview.sizes.map(sz => `${sz.size}: ${sz.quantity.toLocaleString()} ${activePreview.unit}`).join(', ')}
                            </div>
                          ) : null}
                          <p className="text-[8.5px] text-neutral-500 italic mt-1 leading-snug">Machine Assigned: {activePreview.machineNo || 'M/C Floor Division'}</p>
                        </td>
                        <td className="py-2.5 px-3 text-right font-extrabold text-[#c62828] font-mono text-sm leading-none">
                          {activePreview.quantity.toLocaleString()} <span className="text-[9px] text-neutral-600 uppercase font-sans font-bold">{activePreview.unit}</span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Tech Specs Block */}
                <div className="grid grid-cols-2 gap-4 mt-3 text-[10.5px] text-left">
                  <div className="border border-neutral-200 rounded-lg p-3 bg-neutral-50/30">
                    <span className="block text-[8px] uppercase font-bold text-slate-450 mb-1">Yarn / Materials Combination:</span>
                    <p className="font-semibold text-neutral-700 leading-normal">{activePreview.materialDetails || 'Raw standard yarn/polyester.'}</p>
                  </div>
                  <div className="border border-neutral-200 rounded-lg p-3 bg-neutral-50/30">
                    <span className="block text-[8px] uppercase font-bold text-slate-450 mb-1">Dyeing & Color Standards:</span>
                    <p className="font-semibold text-neutral-700 leading-normal">{activePreview.colorDetails || 'To match standard swatch sample.'}</p>
                  </div>
                </div>

                {/* Directives */}
                <div className="mt-3 text-[10.5px] text-left">
                  <span className="block text-[8px] uppercase font-bold text-slate-400 mb-1">Floor Manager Instructions:</span>
                  <div className="border border-amber-200 bg-amber-50/30 p-2.5 rounded text-neutral-800 italic leading-snug">
                    {activePreview.remarks || 'Maintain standard quality assurance tests, verify material edge thickness.'}
                  </div>
                </div>

                {/* Bottom Signatures */}
                <div className="grid grid-cols-3 gap-6 text-center text-[7.5px] font-bold text-neutral-500 mt-8">
                  <div className="border-t border-neutral-300 pt-1.5 font-bold">Machine Operator Signature</div>
                  <div className="border-t border-neutral-300 pt-1.5 font-bold">Quality Control Inspector</div>
                  <div className="border-t border-neutral-300 pt-1.5 font-bold">Floor Unit Master Approval</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🧾 Global Hidden Print Container for Job Card */}
      {jobCardToPrint && (
        <>
          {/* On-Screen Interactive Preview Modal */}
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto print:hidden">
            <div className="bg-slate-50 border border-slate-200 rounded-2xl max-w-2xl w-full shadow-lg p-6 space-y-4 text-xs animate-fade-in text-left">
              <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-800 uppercase flex items-center gap-1.5 font-sans">
                  <Printer className="w-4 h-4 text-indigo-600" /> Production Job Card Print Preview (জব কার্ড প্রিভিউ)
                </h3>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const element = document.getElementById('job-card-print-sheet');
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
                          #job-card-print-sheet { display: block !important; visibility: visible !important; width: 100% !important; margin: 0 !important; padding: 0 !important; }
                          #job-card-print-sheet * { visibility: visible !important; }
                          @page { size: A4 portrait; margin: 10mm; }
                        </style>
                      `;
                      printWindow.document.write(`
                        <html>
                          <head>
                            <title>Job Card - ${jobCardToPrint.jobCardNo}</title>
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
                    onClick={() => setJobCardToPrint(null)}
                    className="px-3 py-1.5 bg-slate-250 hover:bg-slate-350 text-slate-700 font-bold rounded-lg cursor-pointer text-[10px]"
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
                <div className="p-6 border border-neutral-200 rounded-xl text-left bg-white relative">
                  <div className="flex justify-between items-start border-b border-slate-200 pb-4">
                    <div>
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-800 font-extrabold text-[8px] uppercase tracking-wider rounded">PRODUCTION JOB CARD / job card</span>
                      <h4 className="text-base font-black text-slate-900 mt-1 uppercase">{COMPANY_PROFILE.name}</h4>
                      <p className="text-[10px] text-slate-500 font-bold mt-0.5">{COMPANY_PROFILE.addresses.office}</p>
                    </div>
                    <div className="text-right flex items-center gap-3">
                      <div className="flex flex-col items-end">
                        <Barcode value={jobCardToPrint.jobCardNo} height={16} showText={true} />
                      </div>
                      <div className="bg-white border border-slate-200 rounded p-0.5 flex items-center justify-center w-[40px] h-[40px] shadow-3xs shrink-0 select-none">
                        <img 
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(jobCardToPrint.jobCardNo)}`} 
                          alt="QR Code" 
                          className="max-w-full max-h-full object-contain"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-[10px] bg-slate-55 p-3 border border-slate-200 rounded-lg mt-3">
                    <div>
                      <p><strong>Job Card No:</strong> {jobCardToPrint.jobCardNo}</p>
                      <p className="mt-1"><strong>Buyer Name:</strong> {jobCardToPrint.buyerName}</p>
                      <p className="mt-1"><strong>Factory:</strong> {jobCardToPrint.factoryName}</p>
                    </div>
                    <div>
                      <p><strong>P.O. Number:</strong> {jobCardToPrint.poNumber || 'N/A'}</p>
                      <p className="mt-1"><strong>Style:</strong> {jobCardToPrint.styleNumber || 'N/A'}</p>
                      <p className="mt-1"><strong>Target Date:</strong> {jobCardToPrint.targetDate}</p>
                    </div>
                  </div>

                  <div className="border border-neutral-200 rounded-lg overflow-hidden mt-3 text-[10px] text-left">
                    <table className="w-full text-left text-neutral-700 border-collapse">
                      <thead className="bg-slate-50 border-b border-slate-200 font-bold uppercase text-[8.5px] select-none">
                        <tr>
                          <th className="py-1 px-2 w-8 text-center border-r border-neutral-200">Sl</th>
                          <th className="py-1 px-2 border-r border-neutral-200">STYLE / REF &amp; PO NUMBER</th>
                          <th className="py-1 px-2 border-r border-neutral-200">PRODUCT DESCRIPTION (STYLE &amp; SIZE WISE)</th>
                          <th className="py-1 px-2 text-right">TARGET QTY</th>
                          <th className="py-1 px-2 text-right">QC OUTPUT CHECK</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-200 font-medium bg-white">
                        <tr className="bg-white">
                          <td className="py-2 px-2 text-center border-r border-neutral-200 font-mono text-[9px] text-slate-400">1</td>
                          <td className="py-2 px-2 border-r border-neutral-200 text-left font-mono text-[9px]">
                            <div className="font-extrabold text-neutral-950 text-[10px]">Style: {jobCardToPrint.styleNumber || '—'}</div>
                            <div className="text-[8px] text-slate-500 mt-0.5">PO: {jobCardToPrint.poNumber || '—'}</div>
                          </td>
                          <td className="py-2 px-2 border-r border-neutral-200 text-left">
                            <p className="font-extrabold text-neutral-950 text-[10px] leading-tight">{jobCardToPrint.itemName}</p>
                            {jobCardToPrint.sizeWise && jobCardToPrint.sizes && jobCardToPrint.sizes.length > 0 ? (
                              <div className="text-[8px] text-sky-850 font-mono font-bold mt-1 leading-normal bg-sky-50/50 px-1.5 py-0.5 rounded border border-sky-100">
                                {jobCardToPrint.sizes.map(sz => `${sz.size}: ${sz.quantity.toLocaleString()} ${jobCardToPrint.unit}`).join(', ')}
                              </div>
                            ) : null}
                          </td>
                          <td className="py-2 px-2 text-right font-extrabold font-mono text-[10px] border-r border-neutral-200">
                            {jobCardToPrint.quantity.toLocaleString()} <span className="text-[8px] text-neutral-600 uppercase font-sans font-bold">{jobCardToPrint.unit}</span>
                          </td>
                          <td className="py-2 px-2 text-right text-stone-300 font-mono text-[9px]">
                            ________________ [ Pcs ]
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div id="job-card-print-sheet" className="hidden print:block relative p-[10mm] font-sans bg-white text-neutral-900 min-h-screen select-text">
          {/* Vertical Margin Barcode (Scannable within 0.5" page margins) */}
          <div className="absolute left-[-32px] top-[40mm] w-[10mm] h-[100mm] flex flex-col items-center justify-center print:flex hidden z-55 pointer-events-none select-none">
            <Barcode value={jobCardToPrint.jobCardNo} vertical={true} height={36} showText={false} />
          </div>

          <div className="p-8 rounded-xl max-w-4xl mx-auto space-y-6 bg-white relative text-left">
            <div className="flex justify-between items-start border-b border-neutral-200 pb-5">
              <div>
                <span className="px-2.5 py-1 bg-slate-100 text-slate-800 font-extrabold text-[9px] uppercase tracking-widest rounded">PRODUCTION JOB CARD / জব কার্ড</span>
                <h1 className="text-2xl font-black text-neutral-905 tracking-tight mt-1.5">{COMPANY_PROFILE.name}</h1>
                <p className="text-[9.5px] text-neutral-500 font-bold mt-0.5">{COMPANY_PROFILE.addresses.office}</p>
                <p className="text-[9px] text-neutral-500 font-bold">M/C Division Area • Production Floor Master Unit</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex flex-col items-end gap-1">
                  <Barcode value={jobCardToPrint.jobCardNo} height={20} showText={true} />
                </div>
                <div className="bg-white border border-slate-200 rounded p-0.5 flex items-center justify-center w-[48px] h-[48px] shadow-3xs shrink-0 select-none">
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(jobCardToPrint.jobCardNo)}`} 
                    alt="QR Code" 
                    className="max-w-full max-h-full object-contain"
                    referrerPolicy="no-referrer"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-3 gap-5 text-xs bg-neutral-50 p-4 border border-neutral-200 rounded-lg text-left">
              <div>
                <span className="block text-[9px] uppercase font-bold text-neutral-400">Job Card No / আইডি (Unique):</span>
                <span className="font-extrabold text-neutral-900">{jobCardToPrint.jobCardNo}</span>
              </div>
              <div>
                <span className="block text-[9px] uppercase font-bold text-neutral-400">Buyer Name / ক্রেতা:</span>
                <span className="font-extrabold text-neutral-900">{jobCardToPrint.buyerName}</span>
              </div>
              <div>
                <span className="block text-[9px] uppercase font-bold text-neutral-400">Garments Factory Name / গার্মেন্টস:</span>
                <span className="font-extrabold text-neutral-900">{jobCardToPrint.factoryName}</span>
              </div>
              <div>
                <span className="block text-[9px] uppercase font-bold text-slate-400">P.O. Number / পিও নাম্বার:</span>
                <span className="font-bold text-neutral-800">{jobCardToPrint.poNumber || 'N/A'}</span>
              </div>
              <div>
                <span className="block text-[9px] uppercase font-bold text-slate-400">Style / ডিজাইন নং:</span>
                <span className="font-bold text-neutral-800">{jobCardToPrint.styleNumber || 'N/A'}</span>
              </div>
              <div>
                <span className="block text-[9px] uppercase font-bold text-slate-400">Target Completion Date / শেষ তারিখ:</span>
                <span className="font-extrabold text-[#c62828]">
                  {jobCardToPrint.targetDate
                    ? new Date(jobCardToPrint.targetDate).toLocaleDateString('bn-BD') + ' (' + jobCardToPrint.targetDate + ')'
                    : 'N/A'}
                </span>
              </div>
            </div>

            <div className="border border-neutral-200 rounded-lg overflow-hidden text-left">
              <div className="bg-neutral-800 text-white px-4 py-2 font-black text-xs uppercase tracking-wider flex justify-between">
                <span>Core Accessory Item Specifications / পণ্যের বিবরণ</span>
                <span>Job Status: {jobCardToPrint.status.toUpperCase()}</span>
              </div>
              <div className="p-4 space-y-4 text-xs">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-b border-neutral-100 pb-3">
                  <div>
                    <span className="block text-[9.5px] uppercase font-black text-neutral-400">Accessory Item Part Name:</span>
                    <span className="text-sm font-extrabold text-neutral-900">{jobCardToPrint.itemName}</span>
                  </div>
                  <div>
                    <span className="block text-[9.5px] uppercase font-black text-neutral-400">Assigned Machine No:</span>
                    <span className="text-sm font-bold text-emerald-800 uppercase">[ {jobCardToPrint.machineNo || 'M/C Division'} ]</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span className="block text-[9.5px] uppercase font-black text-neutral-400">Yarn / Materials Combination (ম্যাটেরিয়ালস):</span>
                    <p className="font-semibold text-neutral-800 leading-relaxed">{jobCardToPrint.materialDetails || 'Raw standard yarn, nylon coil etc.'}</p>
                  </div>
                  <div>
                    <span className="block text-[9.5px] uppercase font-black text-neutral-400">Dyeing & Color Standards (কালার স্পেসিফিকেশন):</span>
                    <p className="font-semibold text-neutral-800 leading-relaxed">{jobCardToPrint.colorDetails || 'To match standard sample lap-dip swatch'}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="border border-neutral-200 rounded-lg overflow-hidden text-left">
              <div className="bg-neutral-100 px-4 py-2 font-black text-xs text-neutral-800 uppercase tracking-wider">
                Production SizeWise Allocations (সাইজ অনুযায়ী উৎপাদনের পরিমাণ - Delivery Challan Style)
              </div>
              <table className="w-full text-left text-xs text-neutral-700">
                <thead className="bg-neutral-50 border-b border-neutral-200 font-bold uppercase text-[9.5px] tracking-wider text-neutral-500">
                  <tr>
                    <th className="py-2.5 px-3 w-10 text-center border-r border-neutral-150">Sl</th>
                    <th className="py-2.5 px-3 border-r border-neutral-150">STYLE &amp; PO NUMBER</th>
                    <th className="py-2.5 px-3 border-r border-neutral-150">PRODUCT DESCRIPTION (STYLE &amp; SIZE WISE)</th>
                    <th className="py-2.5 px-3 text-right">TARGET QUANTITY</th>
                    <th className="py-2.5 px-3 text-center w-40">ACTUAL OUTPUT CHECK</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-150">
                  <tr className="hover:bg-neutral-50/50">
                    <td className="py-3 px-3 text-center border-r border-neutral-150 font-mono text-[9px] text-slate-400">1</td>
                    <td className="py-3 px-3 border-r border-neutral-150 text-left font-mono">
                      <div className="font-extrabold text-neutral-950 text-[10px]">Style: {jobCardToPrint.styleNumber || '—'}</div>
                      <div className="text-[8px] text-slate-500 mt-0.5">PO: {jobCardToPrint.poNumber || '—'}</div>
                    </td>
                    <td className="py-3 px-3 border-r border-neutral-150 text-left">
                      <p className="font-extrabold text-neutral-950 text-[11px] leading-tight">{jobCardToPrint.itemName}</p>
                      {jobCardToPrint.sizeWise && jobCardToPrint.sizes && jobCardToPrint.sizes.length > 0 ? (
                        <div className="text-[9px] text-sky-850 font-mono font-bold mt-1.5 leading-relaxed bg-sky-50 px-2.5 py-1 rounded border border-sky-100">
                          {jobCardToPrint.sizes.map(sz => `${sz.size}: ${sz.quantity.toLocaleString()} ${jobCardToPrint.unit}`).join(', ')}
                        </div>
                      ) : null}
                    </td>
                    <td className="py-3 px-3 text-right font-extrabold font-mono text-[11px] border-r border-neutral-150">
                      {jobCardToPrint.quantity.toLocaleString()} <span className="text-[9px] text-neutral-600 uppercase font-sans font-bold">{jobCardToPrint.unit}</span>
                    </td>
                    <td className="py-3 px-3 text-right text-stone-300 font-mono text-[10px]">
                      ________________ [ Pcs ]
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div>
              <p className="block text-[9px] uppercase font-black text-neutral-400 mb-1">Production Manager Special Directives & Floor Instructions:</p>
              <div className="border border-neutral-200 bg-neutral-50 p-3 rounded-lg text-neutral-800 italic leading-relaxed text-xs">
                {jobCardToPrint.remarks || 'Maintain standard quality assurance tests, double check edge thickness, verify lock strength.'}
              </div>
            </div>

            <div className="pt-12 grid grid-cols-3 gap-10 text-center text-[9px] font-bold text-neutral-500">
              <div>
                <div className="border-t border-neutral-300 pt-1.5" />
                <p className="font-extrabold text-neutral-800">Assigned Machine Operator</p>
                <p className="text-[8px] text-neutral-400 mt-0.5">Signature & Card Swipe</p>
              </div>
              <div>
                <div className="border-t border-neutral-305 pt-1.5" />
                <p className="font-extrabold text-neutral-800">Quality Control Inspector</p>
                <p className="text-[8px] text-neutral-400 mt-0.5">Line Passed Stamp</p>
              </div>
              <div>
                <div className="border-t border-neutral-305 pt-1.5" />
                <p className="font-extrabold text-neutral-800">Production Floor Master</p>
                <p className="text-[8px] text-neutral-400 mt-0.5">Authorized Approval</p>
              </div>
            </div>

            <div className="text-[8.5px] text-neutral-400 pt-6 text-center border-t border-neutral-100">
              Acoola Trims Corp ERP • Automated Production Flow Module. Please register any changes back to system desk.
            </div>
          </div>
        </div>
        </>
      )}

    </div>
  );
}
