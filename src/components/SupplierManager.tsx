import React, { useState, useMemo } from 'react';
import { Supplier, SupplierWorkOrder, SupplierPayment, WorkOrderItem } from '../types';
import { 
  Building2, 
  Briefcase, 
  Plus, 
  Trash2, 
  Edit, 
  CreditCard, 
  ArrowLeft, 
  Calendar, 
  DollarSign, 
  ClipboardList, 
  FileText, 
  Printer, 
  TrendingUp, 
  UserCheck, 
  CheckCircle, 
  Search,
  ChevronRight,
  Info
} from 'lucide-react';
import { COMPANY_PROFILE as COMPANY_PROFILE_RAW } from '../data';

interface SupplierManagerProps {
  suppliers: Supplier[];
  workOrders: SupplierWorkOrder[];
  payments: SupplierPayment[];
  onAddSupplier: (sup: Omit<Supplier, 'id'>) => void;
  onUpdateSupplier: (sup: Supplier) => void;
  onDeleteSupplier: (id: string) => void;
  onAddWorkOrder: (wo: Omit<SupplierWorkOrder, 'id'>) => void;
  onUpdateWorkOrder: (wo: SupplierWorkOrder) => void;
  onDeleteWorkOrder: (id: string) => void;
  onAddPayment: (pay: Omit<SupplierPayment, 'id'>) => void;
  onDeletePayment: (id: string) => void;
  companyProfile?: any;
  canEdit?: boolean;
}

export default function SupplierManager({
  suppliers,
  workOrders,
  payments,
  onAddSupplier,
  onUpdateSupplier,
  onDeleteSupplier,
  onAddWorkOrder,
  onUpdateWorkOrder,
  onDeleteWorkOrder,
  onAddPayment,
  onDeletePayment,
  companyProfile,
  canEdit = true
}: SupplierManagerProps) {
  const COMPANY_PROFILE = companyProfile || COMPANY_PROFILE_RAW;
  // Navigation states
  const [activeSubTab, setActiveSubTab] = useState<'directory' | 'report'>('directory');
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals / Form visibilities
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  
  const [showWOModal, setShowWOModal] = useState(false);
  const [editingWorkOrder, setEditingWorkOrder] = useState<SupplierWorkOrder | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Document specific previews for prints
  const [previewWOData, setPreviewWOData] = useState<SupplierWorkOrder | null>(null);
  const [previewPaymentData, setPreviewPaymentData] = useState<SupplierPayment | null>(null);

  // Supplier Form state
  const [supName, setSupName] = useState('');
  const [supContact, setSupContact] = useState('');
  const [supPhone, setSupPhone] = useState('');
  const [supEmail, setSupEmail] = useState('');
  const [supAddress, setSupAddress] = useState('');

  // Work Order Form state
  const [woDate, setWoDate] = useState(() => new Date().toISOString().substring(0, 10));
  const [woNotes, setWoNotes] = useState('');
  const [woDeliveryTerms, setWoDeliveryTerms] = useState(
    '1. Delivery schedule: Within 7 working days from order confirmation\n2. Challan required: Materials delivery must be with dynamic challan copy\n3. Billing alignment: Ledger adjustments apply upon validation checks'
  );
  const [woItems, setWoItems] = useState<Omit<WorkOrderItem, 'id' | 'amount'>[]>([
    { itemName: '', quantity: 1, unitPrice: 0, unit: 'Kg' }
  ]);

  // Payment Form state
  const [payDate, setPayDate] = useState(() => new Date().toISOString().substring(0, 10));
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('Bank Transfer');
  const [payRef, setPayRef] = useState('');
  const [payRemarks, setPayRemarks] = useState('');

  // Report filters (Month/Year Picker)
  const [reportYear, setReportYear] = useState('2026');
  const [reportMonth, setReportMonth] = useState('ALL'); // '01' through '12' or 'ALL'

  // Calculations map per Supplier
  const supplierLedgerList = useMemo(() => {
    return suppliers.map(sup => {
      // historical orders
      const orders = workOrders.filter(w => w.supplierId === sup.id);
      const ordersTotal = orders.reduce((sum, o) => sum + o.totalAmount, 0);

      // historical payments
      const pays = payments.filter(p => p.supplierId === sup.id);
      const paysTotal = pays.reduce((sum, p) => sum + p.amount, 0);

      return {
        ...sup,
        orders,
        pays,
        totalBilled: ordersTotal,
        totalPaid: paysTotal,
        outstandingDue: ordersTotal - paysTotal
      };
    });
  }, [suppliers, workOrders, payments]);

  // Active viewed ledger profile
  const activeLedger = useMemo(() => {
    if (!selectedSupplierId) return null;
    return supplierLedgerList.find(s => s.id === selectedSupplierId) || null;
  }, [selectedSupplierId, supplierLedgerList]);

  // Soruted Chronological Transactions List with Running Balance for Individual Vendor Report
  const chronologicalTransactions = useMemo(() => {
    if (!activeLedger) return [];
    
    interface LedgerTx {
      id: string;
      date: string;
      type: 'Work Order' | 'Payment';
      refNo: string;
      billed: number;
      paid: number;
      runningBalance: number;
      remarks: string;
    }

    const txs: LedgerTx[] = [];

    // Add work orders which increase BDT balance due
    activeLedger.orders.forEach(wo => {
      txs.push({
        id: wo.id,
        date: wo.date,
        type: 'Work Order',
        refNo: wo.workOrderNo,
        billed: wo.totalAmount,
        paid: 0,
        runningBalance: 0,
        remarks: wo.notes || 'Materials / Service order'
      });
    });

    // Add payments which decrease BDT balance due
    activeLedger.pays.forEach(pay => {
      txs.push({
        id: pay.id,
        date: pay.date,
        type: 'Payment',
        refNo: pay.referenceNo || `PAY-REC-${pay.id.substring(0, 6).toUpperCase()}`,
        billed: 0,
        paid: pay.amount,
        runningBalance: 0,
        remarks: `${pay.paymentMethod}${pay.remarks ? ' - ' + pay.remarks : ''}`
      });
    });

    // Sort chronologically ascending
    txs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Calculate running balance accumulatively
    let running = 0;
    txs.forEach(t => {
      running += (t.billed - t.paid);
      t.runningBalance = running;
    });

    return txs;
  }, [activeLedger]);

  // Filtered Suppliers for directories
  const filteredSuppliers = useMemo(() => {
    return supplierLedgerList.filter(s => {
      const q = searchQuery.toLowerCase();
      return (
        s.name.toLowerCase().includes(q) ||
        (s.contactPerson?.toLowerCase() || '').includes(q) ||
        (s.phone || '').includes(q)
      );
    });
  }, [supplierLedgerList, searchQuery]);

  // Reset forms helper
  const openAddSupplierForm = () => {
    setEditingSupplier(null);
    setSupName('');
    setSupContact('');
    setSupPhone('');
    setSupEmail('');
    setSupAddress('');
    setShowSupplierModal(true);
  };

  const openEditSupplierForm = (sup: Supplier, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSupplier(sup);
    setSupName(sup.name);
    setSupContact(sup.contactPerson || '');
    setSupPhone(sup.phone || '');
    setSupEmail(sup.email || '');
    setSupAddress(sup.address || '');
    setShowSupplierModal(true);
  };

  const saveSupplierSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supName.trim()) return;

    if (editingSupplier) {
      onUpdateSupplier({
        ...editingSupplier,
        name: supName,
        contactPerson: supContact,
        phone: supPhone,
        email: supEmail,
        address: supAddress
      });
    } else {
      onAddSupplier({
        name: supName,
        contactPerson: supContact,
        phone: supPhone,
        email: supEmail,
        address: supAddress,
        createdAt: new Date().toISOString()
      });
    }
    setShowSupplierModal(false);
  };

  // Add Item to active WorkOrder draft
  const appendWoDraftItem = () => {
    setWoItems(prev => [...prev, { itemName: '', quantity: 1, unitPrice: 0, unit: 'Kg' }]);
  };

  const removeWoDraftItem = (index: number) => {
    if (woItems.length <= 1) return;
    setWoItems(prev => prev.filter((_, idx) => idx !== index));
  };

  const updateWoDraftField = (index: number, key: 'itemName' | 'quantity' | 'unitPrice' | 'unit', val: any) => {
    setWoItems(prev => prev.map((item, idx) => {
      if (idx === index) {
        return {
          ...item,
          [key]: key === 'quantity' || key === 'unitPrice' ? Number(val) : val
        };
      }
      return item;
    }));
  };

  // Save or edit Work Order
  const saveWorkOrderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplierId) return;

    const validatedItems: WorkOrderItem[] = woItems
      .filter(item => item.itemName.trim().length > 0)
      .map((item, idx) => ({
        id: editingWorkOrder && editingWorkOrder.items[idx]
          ? editingWorkOrder.items[idx].id
          : `woi-${Date.now()}-${idx}`,
        itemName: item.itemName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        unit: item.unit as any,
        amount: Number((item.quantity * item.unitPrice).toFixed(2))
      }));

    if (validatedItems.length === 0) return;

    const woTotal = validatedItems.reduce((sum, item) => sum + item.amount, 0);

    if (editingWorkOrder) {
      onUpdateWorkOrder({
        ...editingWorkOrder,
        date: woDate,
        items: validatedItems,
        totalAmount: woTotal,
        notes: woNotes,
        deliveryTerms: woDeliveryTerms
      });
    } else {
      const orderNumber = `ATC-WO-${reportYear}-${Date.now().toString().substring(7)}`;
      onAddWorkOrder({
        workOrderNo: orderNumber,
        supplierId: selectedSupplierId,
        supplierName: activeLedger?.name || 'Unknown Supplier',
        date: woDate,
        items: validatedItems,
        totalAmount: woTotal,
        notes: woNotes,
        deliveryTerms: woDeliveryTerms,
        createdAt: new Date().toISOString()
      });
    }

    // Reset WO draft / close modal
    setEditingWorkOrder(null);
    setWoDate(new Date().toISOString().substring(0, 10));
    setWoNotes('');
    setWoDeliveryTerms('1. Delivery schedule: Within 7 working days from order confirmation\n2. Challan required: Materials delivery must be with dynamic challan copy\n3. Billing alignment: Ledger adjustments apply upon validation checks');
    setWoItems([{ itemName: '', quantity: 1, unitPrice: 0, unit: 'Kg' }]);
    setShowWOModal(false);
  };

  const handleStartEditWorkOrder = (wo: SupplierWorkOrder) => {
    setEditingWorkOrder(wo);
    setWoDate(wo.date);
    setWoNotes(wo.notes || '');
    setWoDeliveryTerms(wo.deliveryTerms || '1. Delivery schedule: Within 7 working days from order confirmation\n2. Challan required: Materials delivery must be with dynamic challan copy\n3. Billing alignment: Ledger adjustments apply upon validation checks');
    setWoItems(wo.items.map(item => ({
      itemName: item.itemName,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      unit: item.unit
    })));
    setShowWOModal(true);
  };

  // Save Payment to Supplier ledger
  const savePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplierId || !payAmount) return;

    const parsedAmount = parseFloat(payAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) return;

    onAddPayment({
      supplierId: selectedSupplierId,
      supplierName: activeLedger?.name || 'Unknown Supplier',
      date: payDate,
      amount: parsedAmount,
      paymentMethod: payMethod,
      referenceNo: payRef,
      remarks: payRemarks,
      createdAt: new Date().toISOString()
    });

    setPayAmount('');
    setPayRef('');
    setPayRemarks('');
    setShowPaymentModal(false);
  };

  // Robust Taka (BDT) number to words formatter for voucher/receipt sheets
  const amountToWordsBDT = (num: number): string => {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    
    const numParts = num.toString().split('.');
    const integerPart = parseInt(numParts[0], 10);
    const decimalPart = numParts[1] ? parseInt(numParts[1].substring(0, 2), 10) : 0;

    const helper = (n: number): string => {
      if (n === 0) return '';
      if (n < 20) return ones[n] + ' ';
      if (n < 100) return tens[Math.floor(n / 10)] + ' ' + ones[n % 10] + ' ';
      if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred ' + helper(n % 100);
      if (n < 100000) return helper(Math.floor(n / 1000)) + ' Thousand ' + helper(n % 1000);
      if (n < 10000000) return helper(Math.floor(n / 100000)) + ' Lakh ' + helper(n % 100000);
      return helper(Math.floor(n / 10000000)) + ' Crore ' + helper(n % 10000000);
    };

    const integerWords = integerPart === 0 ? 'Zero' : helper(integerPart).trim();
    const decimalWords = decimalPart > 0 ? ' and ' + helper(decimalPart).trim() + ' Paisa' : '';
    
    return `Taka ${integerWords}${decimalWords} Only.`;
  };

  // Generate clean printing logic (iframe-resilient, bypassing blocked popup windows)
  const triggerPrintContent = (elementId: string, title: string) => {
    const element = document.getElementById(elementId);
    if (!element) {
      alert(`Target print element #${elementId} not found.`);
      return;
    }

    // 1. Create a hidden iframe
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.name = `print_frame_${Date.now()}`;
    document.body.appendChild(iframe);

    // Schedule safe cleanup in parent thread
    setTimeout(() => {
      try {
        if (iframe && iframe.parentNode) {
          iframe.parentNode.removeChild(iframe);
        }
      } catch (e) {
        console.warn("Iframe cleanup error:", e);
      }
    }, 60000);

    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (!doc) {
      alert('Could not access print iframe document object.');
      return;
    }

    // 2. Head includes (add all style links to preserve Tailwind styles)
    let stylesHtml = '';
    const styleElements = document.querySelectorAll('style, link[rel="stylesheet"]');
    styleElements.forEach(el => {
      stylesHtml += el.outerHTML;
    });

    const isPaymentSlip = elementId === 'printable-payment-slip';

    // 3. Write isolated printable document containing standard layouts without overflow or breaking
    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <base href="${window.location.origin}/" />
          <title>${title}</title>
          ${stylesHtml}
          <style>
            @page {
              size: A4;
              margin: 8mm;
            }
            body {
              background: white !important;
              color: black !important;
              font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji" !important;
              padding: 0 !important;
              margin: 0 !important;
            }
            /* Clean containment on single A4 page */
            .print-container {
              width: ${isPaymentSlip ? '180mm' : '194mm'} !important;
              max-width: 100% !important;
              margin: 0 auto !important;
              box-shadow: none !important;
              border: none !important;
              padding: 0 !important;
              page-break-inside: avoid !important;
            }
          </style>
        </head>
        <body class="bg-white text-black text-xs">
          <div class="print-container font-sans">
            ${element.outerHTML}
          </div>
          <script>
            window.onload = function() {
              window.focus();
              setTimeout(function() {
                window.print();
              }, 500);
            };
          <\/script>
        </body>
      </html>
    `);
    doc.close();
  };

  // Outstanding Report calculation list
  const monthlyOutstandingReportData = useMemo(() => {
    return suppliers.map(sup => {
      // Find orders matching filter
      const allOrders = workOrders.filter(w => w.supplierId === sup.id);
      const filteredOrders = allOrders.filter(w => {
        if (reportMonth === 'ALL') return true;
        // date format: "YYYY-MM-DD" -> month index is idx 5-7
        const orderMonth = w.date.substring(5, 7);
        const orderYear = w.date.substring(0, 4);
        return orderMonth === reportMonth && orderYear === reportYear;
      });

      const totalBilledVal = filteredOrders.reduce((sum, o) => sum + o.totalAmount, 0);

      // Find payments matching filter
      const allPays = payments.filter(p => p.supplierId === sup.id);
      const filteredPays = allPays.filter(p => {
        if (reportMonth === 'ALL') return true;
        const payMonth = p.date.substring(5, 7);
        const payYear = p.date.substring(0, 4);
        return payMonth === reportMonth && payYear === reportYear;
      });

      const totalPaidVal = filteredPays.reduce((sum, p) => sum + p.amount, 0);

      // Total lifetime values for current balance
      const lifetimeBilled = allOrders.reduce((sum, o) => sum + o.totalAmount, 0);
      const lifetimePaid = allPays.reduce((sum, p) => sum + p.amount, 0);
      const lifetimeDue = lifetimeBilled - lifetimePaid;

      return {
        supplierId: sup.id,
        supplierName: sup.name,
        ordersCount: filteredOrders.length,
        billedAmount: totalBilledVal,
        paidAmount: totalPaidVal,
        netDueInPeriod: totalBilledVal - totalPaidVal,
        currentOutstanding: lifetimeDue
      };
    });
  }, [suppliers, workOrders, payments, reportMonth, reportYear]);

  // Active document-specific supplier helpers to prevent state glitches/omissions
  const woSupplier = useMemo(() => {
    if (!previewWOData) return null;
    return suppliers.find(s => s.id === previewWOData.supplierId) || null;
  }, [previewWOData, suppliers]);

  const paySupplier = useMemo(() => {
    if (!previewPaymentData) return null;
    return suppliers.find(s => s.id === previewPaymentData.supplierId) || null;
  }, [previewPaymentData, suppliers]);

  return (
    <div className="space-y-6" id="supplier-management-workspace">
      
      {/* Top action block / Tabs header */}
      <div className="border-b border-gray-150 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h2 className="text-xl font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
            <Building2 className="w-5 h-5 text-indigo-650" />
            Supplier Core Register
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Build and manage manufacturing supply links, monthly work orders, and historical payments.
          </p>
        </div>

        {/* Header Tabs Navigation */}
        <div className="flex gap-2 bg-neutral-100 p-1 rounded-xl shadow-3xs" id="supplier-subheader-tabs">
          <button
            type="button"
            onClick={() => { setActiveSubTab('directory'); setSelectedSupplierId(null); }}
            className={`px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded-lg cursor-pointer transition-all ${
              activeSubTab === 'directory' && !selectedSupplierId
                ? 'bg-indigo-650 text-white shadow-xs'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Suppliers Ledger
          </button>
          <button
            type="button"
            onClick={() => { setActiveSubTab('report'); setSelectedSupplierId(null); }}
            className={`px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded-lg cursor-pointer transition-all ${
              activeSubTab === 'report'
                ? 'bg-indigo-650 text-white shadow-xs'
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Outstanding Due Report
          </button>
        </div>
      </div>

      {/* Directory Tab Content */}
      {activeSubTab === 'directory' && !selectedSupplierId && (
        <div className="space-y-5 animate-fade-in print:hidden" id="supplier-directory-section">
          {/* Top Actions Block */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative max-w-sm w-full">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-neutral-400">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search supplier by name, contact, phone..."
                className="w-full pl-9 pr-4 py-1.5 text-xs border border-neutral-250 rounded-xl bg-white shadow-3xs focus:ring-2 focus:ring-indigo-500 outline-hidden focus:border-indigo-500"
              />
            </div>
            {canEdit && (
              <button
                type="button"
                onClick={openAddSupplierForm}
                className="px-4 py-1.5 bg-indigo-650 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-black uppercase tracking-wider rounded-lg shadow-sm font-sans flex items-center justify-center gap-1 cursor-pointer transition-all"
              >
                <Plus className="w-4 h-4" /> Add New Supplier
              </button>
            )}
          </div>

          {/* Supplier Grid list */}
          {filteredSuppliers.length === 0 ? (
            <div className="bg-white border border-dashed border-neutral-250 rounded-xl py-12 text-center max-w-md mx-auto p-4">
              <ClipboardList className="w-10 h-10 text-neutral-300 mx-auto mb-3" />
              <p className="text-sm font-extrabold text-neutral-850">No Suppliers Found</p>
              <p className="text-xs text-neutral-500 mt-1 leading-normal">
                No supplier matches your query. Create a new supplier profile to start tracking manufacturing orders.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" id="suppliers-ledger-grid">
              {filteredSuppliers.map((sup) => {
                const isOutstanding = sup.outstandingDue > 0;
                return (
                  <div
                    key={sup.id}
                    onClick={() => setSelectedSupplierId(sup.id)}
                    className="bg-white border border-neutral-200 hover:border-indigo-300 rounded-xl p-[18px] shadow-3xs select-none hover:shadow-xs hover:bg-neutral-50/20 cursor-pointer relative overflow-hidden transition-all group duration-200"
                  >
                    {/* Top Accents */}
                    <div className="flex justify-between items-start gap-2.5">
                      <div>
                        <h3 className="font-extrabold text-[#007d46] text-sm tracking-tight leading-snug group-hover:text-indigo-900 group-hover:underline">{sup.name}</h3>
                        {sup.contactPerson && (
                          <p className="text-[11px] text-neutral-500 font-bold mt-1 uppercase flex items-center gap-1 font-sans">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                            {sup.contactPerson}
                          </p>
                        )}
                      </div>
                      
                      {/* Due Alert badge */}
                      <span className={`text-[9px] px-2 py-0.5 rounded-sm font-black uppercase tracking-wider block border select-none leading-none ${
                        isOutstanding 
                          ? 'bg-rose-50 text-rose-700 border-rose-250' 
                          : 'bg-emerald-50 text-emerald-850 border-emerald-200'
                      }`}>
                        {isOutstanding ? 'Due Outstanding' : 'All Clear'}
                      </span>
                    </div>

                    {/* Contacts info details */}
                    <div className="mt-4 space-y-1 text-xs border-y border-neutral-100 py-3 font-sans">
                      {sup.phone && (
                        <p className="text-neutral-700 font-medium">
                          <span className="text-neutral-400 font-bold">Mob: </span>
                          <span className="font-mono">{sup.phone}</span>
                        </p>
                      )}
                      {sup.email && (
                        <p className="text-neutral-700 truncate font-medium">
                          <span className="text-neutral-400 font-bold">Email: </span>
                          {sup.email}
                        </p>
                      )}
                      {sup.address && (
                        <p className="text-neutral-500 text-[10.5px] truncate font-medium mt-1 leading-relaxed">
                          <span className="text-neutral-400 font-bold">Addr: </span>
                          {sup.address}
                        </p>
                      )}
                    </div>

                    {/* Simple summary numbers footer */}
                    <div className="mt-4 flex justify-between items-center text-[11px]">
                      <div>
                        <span className="text-[8.5px] text-neutral-400 font-black uppercase block">Orders</span>
                        <span className="font-mono text-neutral-800 font-extrabold">{sup.orders.length} orders</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[8.5px] text-rose-400 font-black uppercase block">Balance Due</span>
                        <span className={`font-mono text-xs font-black ${isOutstanding ? 'text-rose-650' : 'text-emerald-700'}`}>
                          ৳{sup.outstandingDue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} BDT
                        </span>
                      </div>
                    </div>

                    {/* Actions block hovering visible */}
                    {canEdit && (
                      <div className="absolute top-2.5 right-2.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={(e) => openEditSupplierForm(sup, e)}
                          className="p-1.5 bg-neutral-100 hover:bg-neutral-200 rounded-lg text-neutral-600 transition-colors"
                          title="Edit Supplier"
                          id={`edit-sup-${sup.id}`}
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Are you sure you want to delete ${sup.name}?`)) {
                              onDeleteSupplier(sup.id);
                            }
                          }}
                          className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition-colors"
                          title="Delete Supplier"
                          id={`delete-sup-${sup.id}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Profile Ledger Screen (View detail of single active supplier) */}
      {activeSubTab === 'directory' && selectedSupplierId && activeLedger && (
        <div className="space-y-6 animate-fade-in print:hidden" id="supplier-profile-ledger-view">
          
          {/* Top header navigation buttons */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-150 pb-4">
            <button
              type="button"
              onClick={() => setSelectedSupplierId(null)}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-neutral-50 rounded-lg border border-neutral-250 text-neutral-700 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer self-start"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to List
            </button>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => triggerPrintContent('supplier-wise-statement-print-sheet', `Supplier-Statement-${activeLedger.name}`)}
                className="px-4 py-1.5 bg-neutral-950 hover:bg-neutral-850 text-white text-xs font-black uppercase tracking-wider rounded-lg shadow-sm font-sans flex items-center justify-center gap-1.5 cursor-pointer transition-all"
              >
                <Printer className="w-4 h-4" /> Print Account Statement
              </button>
              {canEdit && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingWorkOrder(null);
                      setWoDate(new Date().toISOString().substring(0, 10));
                      setWoNotes('');
                      setWoItems([{ itemName: '', quantity: 1, unitPrice: 0, unit: 'Kg' }]);
                      setShowWOModal(true);
                    }}
                    className="px-4 py-1.5 bg-[#007d46] hover:bg-[#006438] active:bg-[#00522e] text-white text-xs font-black uppercase tracking-wider rounded-lg shadow-sm font-sans flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                  >
                    <Plus className="w-4 h-4" /> New Work Order
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowPaymentModal(true)}
                    className="px-4 py-1.5 bg-indigo-650 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-black uppercase tracking-wider rounded-lg shadow-sm font-sans flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                  >
                    <CreditCard className="w-4 h-4" /> Record Payment
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Ledger top metrics summaries and profile details card */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Contact profile metadata */}
            <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-5 shadow-3xs flex flex-col justify-between">
              <div>
                <span className="text-[8.5px] uppercase font-black text-indigo-750 tracking-wider block mb-1">Supplier Profile Details</span>
                <h3 className="text-base font-black text-neutral-950 leading-snug">{activeLedger.name}</h3>
                <div className="mt-4 space-y-2.5 text-xs text-neutral-700 font-medium font-sans">
                  {activeLedger.contactPerson && (
                    <p className="flex items-start gap-1.5">
                      <UserCheck className="w-4 h-4 text-neutral-400 shrink-0 mt-0.5" />
                      <span>
                        <strong className="text-neutral-500 font-bold block uppercase text-[9px]">Contact Rep:</strong>
                        <span className="font-semibold text-neutral-900">{activeLedger.contactPerson}</span>
                      </span>
                    </p>
                  )}
                  {activeLedger.phone && (
                    <p className="flex items-start gap-1.5">
                      <Calendar className="w-4 h-4 text-neutral-400 shrink-0 mt-0.5" />
                      <span>
                        <strong className="text-neutral-500 font-bold block uppercase text-[9px]">Phone / Mobile:</strong>
                        <span className="font-semibold font-mono text-neutral-900">{activeLedger.phone}</span>
                      </span>
                    </p>
                  )}
                  {activeLedger.email && (
                    <p className="flex items-start gap-1.5">
                      <ClipboardList className="w-4 h-4 text-neutral-400 shrink-0 mt-0.5" />
                      <span>
                        <strong className="text-neutral-500 font-bold block uppercase text-[9px]">Primary Email:</strong>
                        <span className="font-semibold text-neutral-900">{activeLedger.email}</span>
                      </span>
                    </p>
                  )}
                  {activeLedger.address && (
                    <p className="flex items-start gap-1.5">
                      <Building2 className="w-4 h-4 text-neutral-400 shrink-0 mt-0.5" />
                      <span>
                        <strong className="text-neutral-500 font-bold block uppercase text-[9px]">Office Address:</strong>
                        <span className="font-semibold text-neutral-800 leading-normal block">{activeLedger.address}</span>
                      </span>
                    </p>
                  )}
                </div>
              </div>
              <div className="pt-4 border-t border-neutral-150 mt-4 text-[10px] text-neutral-400 font-mono">
                System Record Registered: {new Date(activeLedger.createdAt).toLocaleDateString()}
              </div>
            </div>

            {/* Billing Ledger Aggregates Metrics Card */}
            <div className="bg-white border border-neutral-200 rounded-xl p-5 shadow-3xs flex flex-col justify-between lg:col-span-2">
              <div>
                <span className="text-[8.5px] uppercase font-black text-indigo-750 tracking-wider block mb-2">Ledger Financial Summary</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                  
                  <div className="bg-neutral-50/70 border border-neutral-200/50 p-4 rounded-xl">
                    <span className="text-[9.5px] text-neutral-400 font-bold block uppercase tracking-wider">Total Work Orders</span>
                    <span className="text-[20px] font-mono font-black text-neutral-950 block mt-1">
                      ৳{activeLedger.totalBilled.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} BDT
                    </span>
                    <p className="text-[9px] text-neutral-500 mt-1.5 font-sans font-bold uppercase">{activeLedger.orders.length} generated orders</p>
                  </div>

                  <div className="bg-neutral-50/70 border border-neutral-200/50 p-4 rounded-xl">
                    <span className="text-[9.5px] text-neutral-400 font-bold block uppercase tracking-wider">Total Paid Out</span>
                    <span className="text-[20px] font-mono font-black text-emerald-700 block mt-1">
                      ৳{activeLedger.totalPaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} BDT
                    </span>
                    <p className="text-[9px] text-emerald-500 mt-1.5 font-sans font-bold uppercase">{activeLedger.pays.length} payment receipts</p>
                  </div>

                  <div className={`border p-4 rounded-xl ${activeLedger.outstandingDue > 0 ? 'bg-rose-50/50 border-rose-200' : 'bg-emerald-50/50 border-emerald-200'}`}>
                    <span className="text-[9.5px] text-neutral-400 font-bold block uppercase tracking-wider">Net Outstanding Due</span>
                    <span className={`text-[20px] font-mono font-black block mt-1 ${activeLedger.outstandingDue > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                      ৳{activeLedger.outstandingDue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} BDT
                    </span>
                    <p className="text-[9px] text-neutral-500 mt-1.5 font-sans font-bold uppercase">
                      {activeLedger.outstandingDue > 0 ? 'Due for clearance' : 'Fully settled balance'}
                    </p>
                  </div>

                </div>
              </div>

              {/* Warnings and quick directions */}
              <div className="mt-4 p-3 bg-indigo-50 border border-indigo-200/50 text-indigo-900 rounded-lg text-xs leading-relaxed flex items-start gap-2">
                <Info className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                <p className="font-semibold text-neutral-850">
                  Payments logged here dynamically adjust the net balance due to <strong>{activeLedger.name}</strong>. Record payment receipts instantly to keep clean account statements ready for audit.
                </p>
              </div>
            </div>
          </div>

          {/* Dynamic Order & Payment History Blocks split columns */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Order History Listing */}
            <div className="bg-white border border-neutral-250 rounded-xl p-[18px] shadow-3xs">
              <div className="flex justify-between items-center pb-3.5 border-b border-neutral-100 mb-3.5">
                <h4 className="text-xs font-black text-neutral-950 uppercase tracking-widest flex items-center gap-1">
                  <FileText className="w-4 h-4 text-neutral-500" />
                  Work Orders ({activeLedger.orders.length})
                </h4>
              </div>

              {activeLedger.orders.length === 0 ? (
                <div className="py-8 text-center text-neutral-400 text-xs">No historical Work Orders recorded.</div>
              ) : (
                <div className="space-y-3.5 max-h-[400px] overflow-y-auto pr-1">
                  {activeLedger.orders.map((wo) => (
                    <div key={wo.id} className="border border-neutral-200 bg-neutral-50/30 hover:bg-neutral-50 rounded-lg p-3.5 relative group">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="font-mono font-black text-indigo-900 text-[11.5px] block">{wo.workOrderNo}</span>
                          <span className="text-[9.5px] text-neutral-400 font-bold font-mono">{wo.date}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-mono font-bold text-neutral-900 text-xs block">৳{wo.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                          <span className="text-[8.5px] text-neutral-400 uppercase font-black">{wo.items.length} line items</span>
                        </div>
                      </div>

                      <div className="mt-2.5 pt-2 border-t border-dashed border-neutral-200">
                        <table className="w-full text-left text-[9px] text-neutral-600 font-semibold font-sans">
                          <tbody>
                            {wo.items.map((item, id) => (
                              <tr key={item.id}>
                                <td className="py-0.5 max-w-[150px] truncate">{item.itemName}</td>
                                <td className="py-0.5 text-right font-mono">{item.quantity.toLocaleString()} {item.unit} x ৳{item.unitPrice.toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {wo.notes && (
                        <p className="mt-2 text-[9px] text-neutral-400 italic font-medium leading-normal border-t border-neutral-100 pt-1.5 truncate" title={wo.notes}>
                          *Notes: {wo.notes}
                        </p>
                      )}

                      {/* Print Overlay trigger button */}
                      <div className="mt-3.5 pt-2 border-t border-neutral-200/50 flex justify-between items-center">
                        <button
                          type="button"
                          onClick={() => setPreviewWOData(wo)}
                          className="inline-flex items-center gap-1 text-[10px] uppercase font-black tracking-wider text-indigo-750 hover:text-indigo-900 cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5" /> View / Print WO
                        </button>
                        
                        {canEdit && (
                          <span className="flex items-center gap-2.5">
                            <button
                              type="button"
                              onClick={() => handleStartEditWorkOrder(wo)}
                              className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold uppercase tracking-wider cursor-pointer"
                            >
                              Edit Order
                            </button>
                            
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm("Delete this Work Order register? Supplier total billing and due balance will update.")) {
                                  onDeleteWorkOrder(wo.id);
                                }
                              }}
                              className="text-[10px] text-rose-600 hover:text-rose-800 font-bold uppercase tracking-wider cursor-pointer"
                            >
                              Delete Order
                            </button>
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Payment History Listing */}
            <div className="bg-white border border-neutral-250 rounded-xl p-[18px] shadow-3xs">
              <div className="flex justify-between items-center pb-3.5 border-b border-neutral-100 mb-3.5">
                <h4 className="text-xs font-black text-neutral-950 uppercase tracking-widest flex items-center gap-1">
                  <CreditCard className="w-4 h-4 text-neutral-500" />
                  Payments Log ({activeLedger.pays.length})
                </h4>
              </div>

              {activeLedger.pays.length === 0 ? (
                <div className="py-8 text-center text-neutral-400 text-xs">No payment receipts logged for this supplier.</div>
              ) : (
                <div className="space-y-3.5 max-h-[400px] overflow-y-auto pr-1">
                  {activeLedger.pays.map((pay) => (
                    <div key={pay.id} className="border border-neutral-200 bg-neutral-50/30 hover:bg-neutral-50 rounded-lg p-3.5">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[11px] font-black text-emerald-800 uppercase block">{pay.paymentMethod}</span>
                          <span className="text-[9.5px] text-neutral-400 font-bold font-mono">{pay.date}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-mono font-black text-emerald-700 text-sm block">-৳{pay.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                          {pay.referenceNo && (
                            <span className="text-[9px] font-mono text-neutral-500 font-bold bg-neutral-100 px-1 py-0.5 rounded block max-w-[120px] truncate mt-0.5 ml-auto">
                              Ref: {pay.referenceNo}
                            </span>
                          )}
                        </div>
                      </div>

                      {pay.remarks && (
                        <p className="mt-2 text-[10px] text-neutral-500 font-semibold leading-relaxed border-t border-dashed border-neutral-105 pt-1.5">
                          {pay.remarks}
                        </p>
                      )}

                      <div className="mt-3 flex justify-between items-center pt-2 border-t border-neutral-100">
                        <button
                          type="button"
                          onClick={() => setPreviewPaymentData(pay)}
                          className="inline-flex items-center gap-1 text-[10px] uppercase font-black tracking-wider text-emerald-800 hover:text-emerald-950 cursor-pointer"
                        >
                          <Printer className="w-3.5 h-3.5" /> View / Print Slip
                        </button>

                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm("Delete this payment receipt? This will add the amount back to outstanding due.")) {
                                onDeletePayment(pay.id);
                              }
                            }}
                            className="text-[10px] text-rose-600 hover:text-rose-800 font-bold uppercase tracking-wider cursor-pointer"
                          >
                            Delete Slip
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

        </div>
      )}

      {/* Outstanding Monthly Due Report View */}
      {activeSubTab === 'report' && (
        <div className="space-y-5 animate-fade-in" id="supplier-report-view">
          
          {/* Report Filters Form block */}
          <div className="bg-white border border-neutral-200 rounded-xl p-4 shadow-3xs flex flex-wrap gap-4 items-center justify-between print:hidden">
            <div className="flex flex-wrap gap-3 items-center">
              <div>
                <label className="block text-[9.5px] font-black text-neutral-500 uppercase tracking-wider mb-1">Select Year</label>
                <select
                  value={reportYear}
                  onChange={(e) => setReportYear(e.target.value)}
                  className="px-3 py-1 text-xs border border-neutral-250 bg-white rounded-lg focus:ring-indigo-500 outline-hidden font-bold"
                >
                  <option value="2025">2021</option>
                  <option value="2026">2026</option>
                  <option value="2027">2027</option>
                  <option value="2028">2028</option>
                </select>
              </div>

              <div>
                <label className="block text-[9.5px] font-black text-neutral-500 uppercase tracking-wider mb-1">Select Period (Month)</label>
                <select
                  value={reportMonth}
                  onChange={(e) => setReportMonth(e.target.value)}
                  className="px-3 py-1 text-xs border border-neutral-250 bg-white rounded-lg focus:ring-indigo-500 outline-hidden font-bold"
                >
                  <option value="ALL">ALL (Lifetime Dues)</option>
                  <option value="01">January</option>
                  <option value="02">February</option>
                  <option value="03">March</option>
                  <option value="04">April</option>
                  <option value="05">May</option>
                  <option value="06">June</option>
                  <option value="07">July</option>
                  <option value="08">August</option>
                  <option value="09">September</option>
                  <option value="10">October</option>
                  <option value="11">November</option>
                  <option value="12">December</option>
                </select>
              </div>
            </div>

            <button
              type="button"
              onClick={() => triggerPrintContent('supplier-outstanding-due-report-print', 'Supplier Monthly Outstanding Balance Report')}
              className="px-4 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-black uppercase tracking-wider rounded-lg shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-4 h-4" /> Print Statement Report
            </button>
          </div>

          {/* Printable visual frame */}
          <div className="w-full overflow-x-auto py-2 bg-neutral-100/40 rounded-xl flex justify-center print:bg-transparent print:p-0 select-text">
            <div 
              className="w-[210mm] min-h-[297mm] p-[10mm] border-2 border-neutral-300 shadow-md font-sans bg-white print:border-0 print:shadow-none print:w-full print:p-0 print:min-h-0 text-neutral-900 relative box-border flex flex-col justify-between"
              id="supplier-outstanding-due-report-print"
            >
              {/* Report Header */}
              <div className="space-y-4">
                <div className="border-b-2 border-neutral-950 pb-3 flex justify-between items-start">
                  <div>
                    <h1 className="text-xl font-black text-neutral-950 uppercase tracking-tight leading-none">
                      {COMPANY_PROFILE.name.toUpperCase()}
                    </h1>
                    <p className="text-[8px] font-black tracking-wider text-neutral-500 uppercase leading-none mt-1.5">
                      SUPPLIERS LEDGER STATEMENT &amp; OUTSTANDING DUES
                    </p>
                  </div>
                  <div className="text-right text-[10px] font-mono select-text text-neutral-600 space-y-0.5">
                    <p className="font-bold text-neutral-800">Date: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    <p>Report Period: <strong className="font-black text-neutral-950">{reportMonth === 'ALL' ? 'Lifetime / Consolidated' : `${new Date(Number(reportYear), Number(reportMonth) - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`}</strong></p>
                  </div>
                </div>

                {/* Main Table Records */}
                <table className="w-full text-left text-[10.5px] border-collapse border border-neutral-300 mt-4 leading-normal select-text">
                  <thead>
                    <tr className="bg-neutral-50 text-neutral-950 font-black uppercase text-[10px] tracking-wider border-b border-neutral-300">
                      <th className="py-2.5 px-3 border border-neutral-300 w-10 text-center">SL</th>
                      <th className="py-2.5 px-3 border border-neutral-300">Supplier Name</th>
                      <th className="py-2.5 px-3 border border-neutral-300 text-center">Total Orders</th>
                      <th className="py-2.5 px-3 border border-neutral-300 text-right">Billed Value (BDT ৳)</th>
                      <th className="py-2.5 px-3 border border-neutral-300 text-right">Cleared/Paid (BDT ৳)</th>
                      <th className="py-2.5 px-3 border border-neutral-300 text-right">Outstanding Balance (BDT ৳)</th>
                    </tr>
                  </thead>
                  <tbody className="text-neutral-900 font-medium font-sans">
                    {monthlyOutstandingReportData.map((row, idx) => (
                      <tr key={row.supplierId} className="border-b border-neutral-200">
                        <td className="py-2 px-3 text-center border border-neutral-200 font-mono">{idx + 1}</td>
                        <td className="py-2 px-3 border border-neutral-200 font-bold text-neutral-950">{row.supplierName}</td>
                        <td className="py-2 px-3 text-center border border-neutral-200 font-mono font-bold">{row.ordersCount}</td>
                        <td className="py-2 px-3 text-right border border-neutral-200 font-mono">৳{row.billedAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td className="py-2 px-3 text-right border border-neutral-200 font-mono text-emerald-800 font-bold">৳{row.paidAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td className="py-2 px-3 text-right border border-neutral-200 font-mono font-black text-neutral-900">
                          ৳{row.currentOutstanding.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}

                    {/* Summary Totals Row */}
                    <tr className="bg-neutral-50 font-black text-neutral-950 uppercase border-t border-neutral-300">
                      <td colSpan={2} className="py-2.5 px-3 border border-neutral-300 text-right uppercase">Accounts Totals:</td>
                      <td className="py-2.5 px-3 border border-neutral-300 text-center font-mono">
                        {monthlyOutstandingReportData.reduce((acc, row) => acc + row.ordersCount, 0)}
                      </td>
                      <td className="py-2.5 px-3 border border-neutral-300 text-right font-mono">
                        ৳{monthlyOutstandingReportData.reduce((acc, row) => acc + row.billedAmount, 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 px-3 border border-neutral-300 text-right font-mono text-emerald-800">
                        ৳{monthlyOutstandingReportData.reduce((acc, row) => acc + row.paidAmount, 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 px-3 border border-neutral-300 text-right font-mono text-neutral-950 font-black">
                        ৳{monthlyOutstandingReportData.reduce((acc, row) => acc + row.currentOutstanding, 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Bottom Signatures Block */}
              <div className="mt-20 pt-8 pb-3 select-none">
                <div className="grid grid-cols-2 gap-20 text-center text-[10px] text-neutral-600 font-bold">
                  <div className="space-y-1">
                    <div className="border-t border-neutral-400 w-44 mx-auto" />
                    <p className="font-extrabold text-neutral-900 leading-none">Accounts Manager</p>
                    <p className="text-[8px] text-neutral-400 leading-none mt-0.5">Signature &amp; Date</p>
                  </div>
                  <div className="space-y-1">
                    <div className="border-t border-neutral-400 w-44 mx-auto" />
                    <p className="font-extrabold text-neutral-900 leading-none">Managing Director</p>
                    <p className="text-[8px] text-neutral-400 leading-none mt-0.5">Authorized Signatory</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
        </div>
      )}

      {/* POPUP MODAL: Add/Edit Supplier */}
      {showSupplierModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <form 
            onSubmit={saveSupplierSubmit} 
            className="bg-white border border-neutral-255 rounded-2xl max-w-lg w-full shadow-2xl p-6 relative animate-scale-in"
          >
            <h3 className="text-sm font-black uppercase text-neutral-950 tracking-wider border-b border-gray-100 pb-3 mb-4">
              {editingSupplier ? '✏️ Edit Supplier Details' : '🏭 Register New Partner Supplier'}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">Company/Supplier Name *</label>
                <input
                  type="text"
                  required
                  value={supName}
                  onChange={(e) => setSupName(e.target.value)}
                  placeholder="e.g. Aman Spinning Mills Ltd"
                  className="w-full px-3 py-1.5 text-xs font-semibold border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 outline-hidden"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">Contact Person</label>
                  <input
                    type="text"
                    value={supContact}
                    onChange={(e) => setSupContact(e.target.value)}
                    placeholder="e.g. Mr. Rafiqul Islam"
                    className="w-full px-3 py-1.5 text-xs font-semibold border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">Phone / Mobile</label>
                  <input
                    type="text"
                    value={supPhone}
                    onChange={(e) => setSupPhone(e.target.value)}
                    placeholder="e.g. 0171100223"
                    className="w-full px-3 py-1.5 text-xs font-mono font-semibold border border-gray-300 rounded-md"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">Email Address</label>
                <input
                  type="email"
                  value={supEmail}
                  onChange={(e) => setSupEmail(e.target.value)}
                  placeholder="e.g. orders@amanspinning.com"
                  className="w-full px-3 py-1.5 text-xs font-semibold border border-gray-300 rounded-md"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">Office / Factory Address</label>
                <textarea
                  value={supAddress}
                  onChange={(e) => setSupAddress(e.target.value)}
                  rows={2}
                  placeholder="e.g. House-45, Road-12, Sector-3, Uttara, Dhaka"
                  className="w-full px-3 py-1.5 text-xs font-semibold border border-gray-300 rounded-md"
                />
              </div>
            </div>

            <div className="mt-6 flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowSupplierModal(false)}
                className="px-4 py-2 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs uppercase tracking-wider rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-indigo-650 hover:bg-indigo-700 active:bg-indigo-800 text-white font-extrabold text-xs uppercase tracking-wider rounded-lg shadow-md transition-all cursor-pointer"
              >
                {editingSupplier ? 'Save Changes' : 'Register Supplier'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* POPUP MODAL: Generate New Supplier Work Order (WO) */}
      {showWOModal && activeLedger && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <form 
            onSubmit={saveWorkOrderSubmit} 
            className="bg-white border border-neutral-255 rounded-2xl max-w-2xl w-full shadow-2xl p-6 relative my-10 animate-scale-in"
          >
            <h3 className="text-xs font-black uppercase text-neutral-950 tracking-wider border-b border-gray-150 pb-3 mb-4">
              📝 {editingWorkOrder ? 'Edit Work Order for:' : 'Create New Work Order for:'} {activeLedger.name}
            </h3>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">Order Issue Date</label>
                  <input
                    type="date"
                    required
                    value={woDate}
                    onChange={(e) => setWoDate(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs font-mono font-semibold border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">Company Issuer</label>
                  <input
                    type="text"
                    disabled
                    value={COMPANY_PROFILE.name}
                    className="w-full px-3 py-1.5 text-xs font-semibold bg-gray-50 text-gray-400 border border-gray-200 rounded-md"
                  />
                </div>
              </div>

              {/* Items List inside draft */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider">Line Items Info *</label>
                  <button
                    type="button"
                    onClick={appendWoDraftItem}
                    className="text-[10px] bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-2 py-0.5 font-bold uppercase rounded border border-indigo-200"
                  >
                    + Add row Item
                  </button>
                </div>

                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                  {woItems.map((item, idx) => (
                    <div key={idx} className="flex gap-2 items-center bg-gray-50 p-2.5 rounded-lg border border-gray-200">
                      <div className="flex-1">
                        <input
                          type="text"
                          required
                          placeholder="e.g. 100% Cotton Yarn 40/1"
                          value={item.itemName}
                          onChange={(e) => updateWoDraftField(idx, 'itemName', e.target.value)}
                          className="w-full p-1.5 text-xs font-semibold border border-gray-300 bg-white rounded-md"
                        />
                      </div>
                      <div className="w-18">
                        <input
                          type="number"
                          step="any"
                          required
                          min="0.01"
                          placeholder="Qty"
                          value={item.quantity || ''}
                          onChange={(e) => updateWoDraftField(idx, 'quantity', e.target.value)}
                          className="w-full p-1.5 text-xs font-mono font-semibold border border-gray-300 bg-white rounded-md"
                        />
                      </div>
                      <div className="w-16">
                        <select
                          value={item.unit}
                          onChange={(e) => updateWoDraftField(idx, 'unit', e.target.value)}
                          className="w-full p-1.5 text-xs font-semibold border border-gray-300 bg-white rounded-md"
                        >
                          <option value="Kg">Kg</option>
                          <option value="Pcs">Pcs</option>
                          <option value="Dzn">Dzn</option>
                          <option value="Yds">Yds</option>
                          <option value="Mtr">Mtr</option>
                          <option value="Set">Set</option>
                          <option value="Roll">Roll</option>
                        </select>
                      </div>
                      <div className="w-20">
                        <input
                          type="number"
                          step="0.001"
                          required
                          min="0.001"
                          placeholder="Unit Price (BDT)"
                          value={item.unitPrice || ''}
                          onChange={(e) => updateWoDraftField(idx, 'unitPrice', e.target.value)}
                          className="w-full p-1.5 text-xs font-mono font-semibold border border-gray-300 bg-white rounded-md"
                        />
                      </div>
                      
                      {/* Close button row */}
                      <button
                        type="button"
                        onClick={() => removeWoDraftItem(idx)}
                        disabled={woItems.length <= 1}
                        className="text-rose-500 hover:text-rose-700 disabled:opacity-40 p-1 bg-white hover:bg-neutral-100 rounded border border-gray-200"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">Remarks &amp; Special Instructions</label>
                  <textarea
                    value={woNotes}
                    onChange={(e) => setWoNotes(e.target.value)}
                    rows={3}
                    placeholder="e.g. Quality standard must meet OEKO-TEX certificate standards. Thread shrinkage < 1.2%."
                    className="w-full px-3 py-1.5 text-xs font-semibold border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">Delivery &amp; Billing Terms (Custom conditions)</label>
                  <textarea
                    value={woDeliveryTerms}
                    onChange={(e) => setWoDeliveryTerms(e.target.value)}
                    rows={3}
                    placeholder="1. Delivery schedule: Within 7 working days...&#10;2. Challan required...&#10;3. Billing alignment..."
                    className="w-full px-3 py-1.5 text-xs font-semibold border border-gray-300 rounded-md font-sans"
                  />
                </div>
              </div>
            </div>

            {/* Total draft calculated live summary */}
            <div className="mt-4 p-3 bg-neutral-50 rounded-lg flex justify-between items-center text-xs text-neutral-600 font-bold">
              <span>Items Total Total:</span>
              <span className="font-mono text-neutral-950 font-black text-sm">
                ৳{woItems.reduce((acc, current) => acc + ((current.quantity || 0) * (current.unitPrice || 0)), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} BDT
              </span>
            </div>

            <div className="mt-5 flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowWOModal(false)}
                className="px-4 py-2 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs uppercase tracking-wider rounded-lg transition-colors cursor-pointer"
              >
                Close Dialog
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-[#007d46] hover:bg-[#006438] text-white font-extrabold text-xs uppercase tracking-wider rounded-lg shadow-md transition-all cursor-pointer"
              >
                {editingWorkOrder ? 'Save Changes' : 'Generate Work Order'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* POPUP MODAL: Record Supplier Payment */}
      {showPaymentModal && activeLedger && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <form 
            onSubmit={savePaymentSubmit}
            className="bg-white border border-neutral-255 rounded-2xl max-w-md w-full shadow-2xl p-6 relative animate-scale-in"
          >
            <h3 className="text-xs font-black uppercase text-neutral-950 tracking-wider border-b border-gray-150 pb-3 mb-4">
              💳 Record Payment to: {activeLedger.name}
            </h3>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">Payment Date</label>
                  <input
                    type="date"
                    required
                    value={payDate}
                    onChange={(e) => setPayDate(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs font-mono font-semibold border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">Amount Paid (BDT ৳) *</label>
                  <input
                    type="number"
                    step="any"
                    required
                    min="0.01"
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    placeholder="e.g. 1500"
                    className="w-full px-3 py-1.5 text-xs font-mono font-bold border border-gray-300 rounded-md focus:ring-green-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">Payment Method</label>
                  <select
                    value={payMethod}
                    onChange={(e) => setPayMethod(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs border border-gray-350 bg-white rounded-md font-bold"
                  >
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Cash">Cash Handover</option>
                    <option value="Check">Check / Cheque</option>
                    <option value="Mobile Banking">Mobile Money (bKash/Nagad)</option>
                    <option value="L/C Allocation">L/C Allocation</option>
                    <option value="Other">Other Method</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">Txn / Bank Ref No</label>
                  <input
                    type="text"
                    value={payRef}
                    onChange={(e) => setPayRef(e.target.value)}
                    placeholder="e.g. TXN-98123045"
                    className="w-full px-3 py-1.5 text-xs font-mono font-bold border border-gray-300 rounded-md"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">Remarks / Notes</label>
                <textarea
                  value={payRemarks}
                  onChange={(e) => setPayRemarks(e.target.value)}
                  rows={2}
                  placeholder="e.g. Partial payment against Yarn Order No. WO-001 by Mutual Trust Bank PLC."
                  className="w-full px-3 py-1.5 text-xs font-semibold border border-gray-300 rounded-md"
                />
              </div>
            </div>

            {/* Live outstanding comparison statement */}
            <div className="mt-4 p-3 bg-rose-50/50 rounded-lg flex justify-between items-center text-[10.5px] leading-none font-bold text-neutral-600">
              <span>Current Outstanding Due:</span>
              <span className="font-mono font-black text-rose-700">৳{activeLedger.outstandingDue.toLocaleString(undefined, { minimumFractionDigits: 2 })} BDT</span>
            </div>

            <div className="mt-6 flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowPaymentModal(false)}
                className="px-4 py-2 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs uppercase tracking-wider rounded-lg transition-colors cursor-pointer"
              >
                Close Form
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-indigo-650 hover:bg-indigo-700 text-white font-extrabold text-xs uppercase tracking-wider rounded-lg shadow-md transition-all cursor-pointer"
              >
                Record Payment
              </button>
            </div>
          </form>
        </div>
      )}

      {/* DETAILED PRINT SHEETS PREVIEWS MODALS (HIDDEN IN GENERAL WORKSPACE) */}
      
      {/* 1. Print Work Order Modal template overlay preview */}
      {previewWOData && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl p-6 shadow-2xl max-w-3xl w-full my-10 relative">
            <button
              type="button"
              onClick={() => setPreviewWOData(null)}
              className="absolute top-4 right-4 text-neutral-500 hover:text-neutral-800 text-xl font-bold cursor-pointer print:hidden"
            >
              &times;
            </button>
            
            <div className="flex justify-between items-center border-b border-neutral-100 pb-3 mb-4 print:hidden">
              <h3 className="text-xs font-black uppercase text-neutral-900 tracking-wider">Preview Work Order Document</h3>
              <button
                type="button"
                onClick={() => triggerPrintContent('printable-wo-sheet', `Work Order-${previewWOData.workOrderNo}`)}
                className="inline-flex items-center gap-1 px-4 py-1.5 bg-[#007d46] text-white text-xs font-black uppercase rounded-lg cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" /> Print Work Order
              </button>
            </div>

            {/* Standard envelope sheet layout printable */}
            <div className="bg-neutral-100/40 p-4 rounded-xl flex justify-center max-h-[500px] overflow-y-auto print:max-h-none print:p-0">
              <div 
                className="w-[210mm] min-h-[297mm] p-[8mm] shadow-xs font-sans bg-white text-neutral-900 relative box-border flex flex-col justify-between overflow-hidden"
                id="printable-wo-sheet"
              >
                {/* Central Document Watermark */}
                {COMPANY_PROFILE.logo && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0 overflow-hidden" style={{ opacity: 0.05 }}>
                    <img src={COMPANY_PROFILE.logo} alt="Watermark" className="w-[50%] max-w-[280px] object-contain" />
                  </div>
                )}
                <div className="space-y-4 relative z-10 font-sans">
                  {/* Banner header band */}
                  <div className="border-b-2 border-neutral-950 pb-3 flex justify-between items-start">
                    <div className="flex items-start gap-4 text-left">
                      {COMPANY_PROFILE.logo && (
                        <div className="w-12 h-12 bg-white border border-neutral-200 rounded p-1 flex items-center justify-center shrink-0 overflow-hidden">
                          <img src={COMPANY_PROFILE.logo} alt="Company Logo" className="max-w-full max-h-full object-contain" />
                        </div>
                      )}
                      <div>
                        <h1 className="text-base sm:text-[18px] font-black text-neutral-950 uppercase tracking-tight leading-none font-sans">
                          {COMPANY_PROFILE.name.toUpperCase()}
                        </h1>
                      <p className="text-[7.5px] uppercase font-black text-neutral-500 tracking-wider leading-none mt-1">
                        {COMPANY_PROFILE.tagline || 'QUALITY GARMENTS ACCESSORIES MANUFACTURER & SUPPLIER'}
                      </p>
                      <div className="text-[9px] text-neutral-700 font-medium space-y-0.5 pt-2 leading-relaxed font-sans">
                        <p><span className="font-bold text-neutral-800">Office:</span> {COMPANY_PROFILE.addresses.office}</p>
                        <p><span className="font-bold text-neutral-800">Factory:</span> {COMPANY_PROFILE.addresses.factory}</p>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                      <h2 className="text-base font-black text-neutral-950 tracking-tight uppercase leading-none">
                        OFFICIAL WORK ORDER
                      </h2>
                      <div className="text-[9px] text-neutral-750 font-medium font-mono space-y-0.5 pt-2 leading-tight">
                        <p className="font-bold"><span className="text-neutral-600 font-sans text-[8px] uppercase">BIN :</span> {COMPANY_PROFILE.bin}</p>
                        <p><span className="text-neutral-600 font-sans text-[8px] uppercase">Mob :</span> {COMPANY_PROFILE.phones.join(', ')}</p>
                        <p><span className="text-neutral-600 font-sans text-[8px] uppercase">Email: </span> {COMPANY_PROFILE.emails[0]}</p>
                      </div>
                    </div>
                  </div>

                  {/* To / Supplier Address Block */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="border border-neutral-200 rounded-xl p-3 bg-white">
                      <span className="text-[8px] uppercase font-bold text-neutral-600 block mb-1">ORDERED TO SUPPLIER:</span>
                      <h3 className="text-xs font-black text-neutral-950">{previewWOData.supplierName}</h3>
                      {woSupplier?.contactPerson && (
                        <p className="text-[9px] text-neutral-700 font-semibold mt-1">Attn: {woSupplier.contactPerson}</p>
                      )}
                      {woSupplier?.address && (
                        <p className="text-[9px] text-neutral-500 leading-normal mt-0.5">{woSupplier.address}</p>
                      )}
                      {woSupplier?.phone && (
                        <p className="text-[9px] font-mono font-bold mt-1 text-neutral-900">Phone: {woSupplier.phone}</p>
                      )}
                    </div>
                    <div className="border border-neutral-200 rounded-xl p-3 bg-white">
                      <span className="text-[8px] uppercase font-bold text-neutral-600 block mb-1">WORK ORDER DETAILS:</span>
                      <div className="text-[9.5px] font-medium space-y-1 font-sans font-bold">
                        <div className="flex justify-between">
                          <span className="text-neutral-600">WO Number:</span>
                          <span className="font-mono font-extrabold text-neutral-900">{previewWOData.workOrderNo}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-neutral-600">Order Date:</span>
                          <span className="text-neutral-900">{previewWOData.date}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-neutral-600">Currency:</span>
                          <span className="text-neutral-900">BDT (৳)</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Table items list */}
                  <div className="overflow-x-auto mt-2.5">
                    <table className="w-full text-left text-[9.5px] border-collapse border border-neutral-200">
                      <thead>
                        <tr className="bg-neutral-50 text-neutral-850 font-black uppercase text-[8.5px] border-b border-neutral-200">
                          <th className="py-2 px-2 w-8 text-center border border-neutral-200 text-neutral-700 font-bold">SL</th>
                          <th className="py-2 px-2 border border-neutral-200">GOODS DESCRIPTION &amp; SPECIFICATIONS</th>
                          <th className="py-2 px-2 border border-neutral-200 text-center w-24">QUANTITY</th>
                          <th className="py-2 px-2 border border-neutral-200 text-right w-24">UNIT PRICE</th>
                          <th className="py-2 px-2 border border-neutral-200 text-right w-24">NET AMOUNT</th>
                        </tr>
                      </thead>
                      <tbody className="text-neutral-900 font-medium">
                        {previewWOData.items.map((item, idx) => (
                          <tr key={item.id} className="align-middle border-b border-neutral-200">
                            <td className="py-2 px-1.5 text-center border border-neutral-200 text-neutral-700 font-mono text-[9px]">{idx + 1}</td>
                            <td className="py-2 px-2 border border-neutral-200 font-extrabold text-neutral-950 font-sans">{item.itemName}</td>
                            <td className="py-2 px-2 text-center border border-neutral-200 font-mono font-bold">{item.quantity.toLocaleString()} <span className="text-[8px] font-sans text-neutral-450 uppercase">{item.unit}</span></td>
                            <td className="py-2 px-2 text-right border border-neutral-200 font-mono font-bold">৳{item.unitPrice.toFixed(2)}</td>
                            <td className="py-2 px-2 text-right border border-neutral-200 font-mono font-black">৳{item.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                          </tr>
                        ))}

                        {/* Totals row */}
                        <tr className="bg-neutral-50/50">
                          <td colSpan={4} className="py-2 px-2 text-right border border-neutral-200 font-black uppercase text-[8.5px]">Total Amount (BDT):</td>
                          <td className="py-2 px-2 text-right border border-neutral-200 font-mono font-black text-neutral-950 text-xs">
                            ৳{previewWOData.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Delivery & quality terms block with generous padding to prevent data overlaps */}
                  <div className="grid grid-cols-2 gap-4 mt-4 text-[9px]">
                    <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-lg space-y-1">
                      <span className="text-[7.5px] uppercase font-black text-neutral-500 tracking-wider block mb-1">DELIVERY &amp; BILLING TERMS:</span>
                      <ul className="text-[8px] text-neutral-700 space-y-1 font-sans list-disc pl-3 leading-normal text-left">
                        {(previewWOData.deliveryTerms || '1. Delivery schedule: Within 7 working days from order confirmation\n2. Challan required: Materials delivery must be with dynamic challan copy\n3. Billing alignment: Ledger adjustments apply upon validation checks')
                          .split('\n')
                          .map(line => line.trim())
                          .filter(line => line.length > 0)
                          .map((line, idx) => (
                            <li key={idx}>{line}</li>
                          ))}
                      </ul>
                    </div>
                    
                    <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-lg">
                      <span className="text-[7.5px] uppercase font-black text-neutral-500 tracking-wider block mb-1">REMARKS &amp; SPECIAL INSTRUCTIONS:</span>
                      <p className="text-[8.5px] text-neutral-700 font-medium leading-relaxed font-sans pt-1">
                        {previewWOData.notes || 'Strict compliance with requested dimensional sizes and color fastness SLA is expected. Please submit invoice copy to Accounts department upon completing delivery.'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Signatures template block */}
                <div className="mt-12 pb-1 select-none">
                  <div className="grid grid-cols-2 gap-10 text-center text-[9px] text-neutral-650 font-bold">
                    <div className="space-y-0.5 pt-8">
                      <div className="border-t border-neutral-450 w-32 mx-auto pt-1.5" />
                      <p className="font-black text-neutral-950 text-[10px] leading-none">Accepted &amp; Confirmed By</p>
                      <p className="text-[8px] text-neutral-400 leading-none mt-0.5">Authorized Representative Stamp &amp; Date</p>
                    </div>
                    <div className="space-y-0.5 pt-8">
                      <div className="border-t border-neutral-950 w-32 mx-auto pt-1.5" />
                      <p className="font-extrabold text-neutral-950 text-[10px] leading-none">For {COMPANY_PROFILE.name}</p>
                      <p className="text-[8px] text-neutral-400 leading-none mt-0.5">Purchasing &amp; Accounts Logistics Manager</p>
                    </div>
                  </div>
                </div>

              </div>
            </div>
            
          </div>
        </div>
      )}

      {/* 2. Print Payment Slip Modal overlay preview */}
      {previewPaymentData && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 shadow-2xl max-w-2xl w-full relative">
            <button
              type="button"
              onClick={() => setPreviewPaymentData(null)}
              className="absolute top-4 right-4 text-neutral-500 hover:text-neutral-800 text-xl font-bold cursor-pointer print:hidden"
            >
              &times;
            </button>
            
            <div className="flex justify-between items-center border-b border-neutral-100 pb-3 mb-4 print:hidden">
              <h3 className="text-xs font-black uppercase text-neutral-900 tracking-wider">Preview Payment Slip</h3>
              <button
                type="button"
                onClick={() => triggerPrintContent('printable-payment-slip', `PaymentSlip-${previewPaymentData.id}`)}
                className="inline-flex items-center gap-1 px-4 py-1.5 bg-[#007d46] text-white text-xs font-black uppercase rounded-lg cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" /> Print Payment Slip
              </button>
            </div>

            {/* Print Sheet */}
            <div className="bg-neutral-100/40 p-4 rounded-xl flex justify-center print:p-0">
              <div 
                className="w-[180mm] p-[8mm] shadow-xs font-sans bg-white text-neutral-900 relative box-border flex flex-col justify-between overflow-hidden"
                id="printable-payment-slip"
              >
                {/* Central Document Watermark */}
                {COMPANY_PROFILE.logo && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0 overflow-hidden" style={{ opacity: 0.05 }}>
                    <img src={COMPANY_PROFILE.logo} alt="Watermark" className="w-[50%] max-w-[280px] object-contain" />
                  </div>
                )}
                
                <div className="space-y-4 relative z-10 font-sans">
                  {/* Corporate Header Section */}
                    <div className="border-b-2 border-neutral-950 pb-2 flex justify-between items-start">
                      <div className="flex items-start gap-3 w-full">
                        {COMPANY_PROFILE.logo && (
                          <div className="w-12 h-12 bg-white border border-neutral-200 rounded p-1 flex items-center justify-center shrink-0 overflow-hidden">
                            <img src={COMPANY_PROFILE.logo} alt="Company Logo" className="max-w-full max-h-full object-contain" />
                          </div>
                        )}
                        <div>
                          <h1 className="text-base font-black text-neutral-950 uppercase tracking-tight leading-none font-sans">
                            {COMPANY_PROFILE.name.toUpperCase()}
                          </h1>
                          <div className="text-[7.5px] text-neutral-600 space-y-0.5 mt-1 leading-tight font-sans">
                            <p>{COMPANY_PROFILE.addresses.office}</p>
                            <p>BIN: {COMPANY_PROFILE.bin}</p>
                          </div>
                          <p className="text-[8px] uppercase font-black text-neutral-500 tracking-widest mt-2 bg-neutral-150 px-2 py-0.5 rounded inline-block font-sans">
                            DEBIT PAYMENT VOUCHER (পরিশোধ রশিদ)
                          </p>
                        </div>
                      </div>
                      <div className="text-right text-[9px] font-mono select-text text-neutral-600 space-y-0.5 shrink-0">
                        <p className="font-extrabold text-neutral-900"><span className="font-sans text-[8px] font-normal text-neutral-500 uppercase">Voucher No:</span> DV-{previewPaymentData.id.slice(-6).toUpperCase()}</p>
                        <p><span className="font-sans text-[8px] font-normal text-neutral-500 uppercase">Issue Date:</span> {previewPaymentData.date}</p>
                      </div>
                    </div>

                  {/* Vendor & Disbursed Accounts details */}
                  <div className="grid grid-cols-2 gap-3 text-[9.5px]">
                    <div className="border border-neutral-200 rounded-lg p-3 bg-white space-y-1">
                      <span className="text-[7.5px] uppercase font-bold text-neutral-500 block">DISBURSED TO VENDEE:</span>
                      <h3 className="font-black text-neutral-950 text-xs">{previewPaymentData.supplierName}</h3>
                      {paySupplier?.contactPerson && <p className="text-neutral-700 font-semibold">Attn: {paySupplier.contactPerson}</p>}
                      {paySupplier?.address && <p className="text-neutral-500 leading-normal">{paySupplier.address}</p>}
                      {paySupplier?.phone && <p className="font-mono text-neutral-900">Phone: {paySupplier.phone}</p>}
                    </div>

                    <div className="border border-neutral-200 rounded-lg p-3 bg-white space-y-2">
                      <span className="text-[7.5px] uppercase font-bold text-neutral-500 block">SOURCE AND FUND METHOD:</span>
                      <div className="space-y-1 font-sans">
                        <div className="flex justify-between font-bold">
                          <span className="text-neutral-500">Method:</span>
                          <span className="text-neutral-950">{previewPaymentData.paymentMethod}</span>
                        </div>
                        <div className="flex justify-between font-bold">
                          <span className="text-neutral-500">Fund Source:</span>
                          <span className="text-neutral-950 font-mono">
                            {previewPaymentData.paymentMethod === 'Cash' 
                              ? 'Corporate Cash Drawer' 
                              : `Clearing Bank (${previewPaymentData.referenceNo || 'A/C-6819'})`}
                          </span>
                        </div>
                        {previewPaymentData.referenceNo && (
                          <div className="flex justify-between font-bold">
                            <span className="text-neutral-500">Txn/Inst. No:</span>
                            <span className="text-neutral-950 font-mono">{previewPaymentData.referenceNo}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Payment Accounts Table Block */}
                  <div className="border border-neutral-200 rounded-lg overflow-hidden">
                    <table className="w-full text-left text-[10px] leading-normal font-sans">
                      <thead>
                        <tr className="bg-neutral-50 text-neutral-950 font-bold border-b border-neutral-200 text-[8.5px]">
                          <th className="py-2 px-3">LEDGER HEAD &amp; DISBURSEMENT DETAILS</th>
                          <th className="py-2 px-3 text-right">TOTAL DISBURSED NET AMOUNT</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-neutral-100 font-medium">
                          <td className="py-3 px-3">
                            <p className="font-extrabold text-neutral-950">Accounts Payable Outstanding Settled</p>
                            <p className="text-neutral-500 text-[8px] pt-1">Memo remarks: {previewPaymentData.remarks || 'Standard ledger adjustment disbursement.'}</p>
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-black text-neutral-950 text-xs">
                            ৳{previewPaymentData.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        </tr>
                        {/* Word conversion text */}
                        <tr className="bg-neutral-50/50">
                          <td colSpan={2} className="py-2 px-3 text-[9px] font-semibold text-neutral-800 leading-normal border-t border-neutral-200">
                            <span className="text-neutral-500 text-[8px] tracking-wider block font-black uppercase">Amount in Words (BDT Taka):</span>
                            <p className="font-extrabold text-neutral-950 pt-0.5">{amountToWordsBDT(previewPaymentData.amount)}</p>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Secure bottoms space for Authorized Signatures Signoff with zero overlapping */}
                <div className="mt-14 pb-1 select-none font-bold text-neutral-650 text-center text-[8.5px] grid grid-cols-4 gap-4 px-2 pt-6">
                  <div>
                    <div className="border-t border-neutral-300 w-full pt-1.5" />
                    Prepared By Accounts
                  </div>
                  <div>
                    <div className="border-t border-neutral-300 w-full pt-1.5" />
                    Verified / Audited
                  </div>
                  <div>
                    <div className="border-t border-neutral-300 w-full pt-1.5" />
                    Authorized Stamp
                  </div>
                  <div>
                    <div className="border-t border-neutral-900 w-full pt-1.5 text-neutral-950 font-black" />
                    Receiver Stamp &amp; Date
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* 3. Printed Account Statement Sheet Container */}
      {selectedSupplierId && activeLedger && (
        <div className="hidden">
          <div 
            className="w-[210mm] p-[10mm] font-sans bg-white text-neutral-900 relative box-border flex flex-col justify-between overflow-hidden"
            id="supplier-wise-statement-print-sheet"
          >
            {/* Central Document Watermark */}
            {COMPANY_PROFILE.logo && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0 overflow-hidden" style={{ opacity: 0.05 }}>
                <img src={COMPANY_PROFILE.logo} alt="Watermark" className="w-[50%] max-w-[280px] object-contain" />
              </div>
            )}
            
            <div className="space-y-4 relative z-10 font-sans">
              {/* Report Header with elegant two-line address */}
                <div className="border-b-2 border-neutral-950 pb-3 flex justify-between items-start">
                  <div className="flex items-start gap-3">
                    {COMPANY_PROFILE.logo && (
                      <div className="w-12 h-12 bg-white border border-neutral-200 rounded p-1 flex items-center justify-center shrink-0 overflow-hidden">
                        <img src={COMPANY_PROFILE.logo} alt="Company Logo" className="max-w-full max-h-full object-contain" />
                      </div>
                    )}
                    <div>
                      <h1 className="text-[17px] font-black text-neutral-950 uppercase tracking-tight leading-none font-sans">
                        {COMPANY_PROFILE.name.toUpperCase()}
                      </h1>
                      <p className="text-[7.5px] uppercase font-black text-neutral-500 tracking-wider leading-none mt-1.5 font-sans">
                        {COMPANY_PROFILE.tagline || 'QUALITY GARMENTS ACCESSORIES MANUFACTURER & SUPPLIER'}
                      </p>
                      <div className="text-[8.5px] text-neutral-600 font-medium space-y-0.5 mt-2 leading-tight font-sans font-sans">
                        <p><span className="font-bold text-neutral-800">Office:</span> {COMPANY_PROFILE.addresses.office}</p>
                        <p><span className="font-bold text-neutral-800">Factory:</span> {COMPANY_PROFILE.addresses.factory}</p>
                      </div>
                      <p className="text-[9.5px] text-neutral-900 font-extrabold uppercase mt-2.5 bg-neutral-100 px-2 py-0.5 rounded inline-block font-sans">
                        Supplier Statement of Account (হিসাব বিবরণী)
                      </p>
                    </div>
                  </div>
                  <div className="text-right text-[9px] font-mono select-text text-neutral-600 space-y-0.5">
                    <p className="font-bold text-neutral-800">Date Issued: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    <p>BIN: {COMPANY_PROFILE.bin}</p>
                  </div>
                </div>

              {/* Vendor Profile Block */}
              <div className="border border-neutral-200 rounded-xl p-3 bg-neutral-50/20 space-y-1 text-[10px]">
                <span className="text-[8px] uppercase font-black text-neutral-400 block">Vendor Partner Details:</span>
                <h3 className="text-xs font-black text-neutral-950">{activeLedger.name}</h3>
                {activeLedger.contactPerson && <p className="text-neutral-700 font-bold">Attn: {activeLedger.contactPerson}</p>}
                {activeLedger.address && <p className="text-neutral-500 leading-normal font-medium">{activeLedger.address}</p>}
                {activeLedger.phone && <p className="font-mono font-bold text-neutral-900">Phone: {activeLedger.phone}</p>}
              </div>

              {/* Account Metrics Grid using NO RED / completely compliant grayscale/emerald styling */}
              <div className="grid grid-cols-3 gap-3">
                <div className="border border-neutral-200 p-2.5 rounded-lg bg-neutral-50/50">
                  <span className="text-[8px] uppercase font-bold text-neutral-500 block">Total Billed Amt (৳):</span>
                  <span className="text-xs font-black font-mono text-neutral-900">৳{activeLedger.totalBilled.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="border border-neutral-250 p-2.5 rounded-lg bg-emerald-50/20">
                  <span className="text-[8px] uppercase font-bold text-[#007d46] block">Total Settled Cleared (৳):</span>
                  <span className="text-xs font-black font-mono text-[#007d46]">৳{activeLedger.totalPaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="border border-neutral-200 p-2.5 rounded-lg bg-neutral-50/50">
                  <span className="text-[8px] uppercase font-bold text-neutral-500 block">Net Outstanding Balance (৳):</span>
                  <span className="text-xs font-black font-mono text-neutral-950">
                    ৳{activeLedger.outstandingDue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Chronological Ledger Transactions Table */}
              <div className="overflow-x-auto mt-4">
                <table className="w-full text-left text-[10px] border-collapse border border-neutral-300 leading-normal select-text">
                  <thead>
                    <tr className="bg-neutral-100 text-neutral-950 font-black uppercase text-[8.5px] tracking-wider border-b border-neutral-300">
                      <th className="py-2 px-2.5 border border-neutral-300 w-10 text-center">SL</th>
                      <th className="py-2 px-2.5 border border-neutral-300">Date</th>
                      <th className="py-2 px-2.5 border border-neutral-300">Particulars Details</th>
                      <th className="py-2 px-2.5 border border-neutral-300 font-mono">Doc/Ref No</th>
                      <th className="py-2 px-2.5 border border-neutral-300 text-right">Debit / Billed (৳)</th>
                      <th className="py-2 px-2.5 border border-neutral-300 text-right">Credit / Cleared (৳)</th>
                      <th className="py-2 px-2.5 border border-neutral-300 text-right">Balance Due (৳)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-neutral-200 font-bold bg-neutral-50/30 text-neutral-500 text-[9px]">
                      <td className="py-1.5 px-2.5 text-center border border-neutral-150 font-mono">-</td>
                      <td className="py-1.5 px-2.5 border border-neutral-150">-</td>
                      <td className="py-1.5 px-2.5 border border-neutral-150 uppercase tracking-wider font-extrabold text-[8px]">OPENING BALANCES RECORD</td>
                      <td className="py-1.5 px-2.5 border border-neutral-150 font-mono text-center">-</td>
                      <td className="py-1.5 px-2.5 text-right border border-neutral-150 font-mono">৳0.00</td>
                      <td className="py-1.5 px-2.5 text-right border border-neutral-150 font-mono">৳0.00</td>
                      <td className="py-1.5 px-2.5 text-right border border-neutral-150 font-mono">৳0.00</td>
                    </tr>
                    {chronologicalTransactions.map((tx, idx) => (
                      <tr key={idx} className="border-b border-neutral-200 hover:bg-neutral-50/10">
                        <td className="py-2 px-2.5 text-center border border-neutral-200 font-mono leading-tight">{idx + 1}</td>
                        <td className="py-2 px-2.5 border border-neutral-200 font-mono text-neutral-700 whitespace-nowrap">{tx.date}</td>
                        <td className="py-2 px-2.5 border border-neutral-200 font-sans">
                          <span className="font-bold text-neutral-950 block leading-snug">{tx.type}</span>
                          <span className="text-neutral-500 text-[8px] leading-tight block truncate max-w-[200px]" title={tx.remarks}>{tx.remarks}</span>
                        </td>
                        <td className="py-2 px-2.5 border border-neutral-200 font-mono text-[9px] font-bold text-neutral-800">{tx.refNo}</td>
                        <td className="py-2 px-2.5 text-right border border-neutral-200 font-mono text-neutral-800">
                          {tx.billed > 0 ? `৳${tx.billed.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}
                        </td>
                        <td className="py-2 px-2.5 text-right border border-neutral-200 font-mono text-emerald-800 font-bold">
                          {tx.paid > 0 ? `৳${tx.paid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}
                        </td>
                        <td className="py-2 px-2.5 text-right border border-neutral-200 font-mono text-neutral-950 font-bold">
                          ৳{tx.runningBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                    {/* End Total Ledger summary calculation rows */}
                    <tr className="bg-neutral-100/50 font-black text-neutral-950 border-t-2 border-neutral-400">
                      <td colSpan={4} className="py-2.5 px-2.5 border border-neutral-300 text-right uppercase text-[8px] tracking-wider">Calculated Totals:</td>
                      <td className="py-2.5 px-2.5 border border-neutral-300 text-right font-mono">
                        ৳{activeLedger.totalBilled.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 px-2.5 border border-neutral-300 text-right font-mono text-emerald-800">
                        ৳{activeLedger.totalPaid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-2.5 px-2.5 border border-neutral-300 text-right font-mono font-black text-neutral-950">
                        ৳{activeLedger.outstandingDue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Bottom Accounts signatures block */}
            <div className="mt-16 pt-5 pb-2 select-none">
              <div className="grid grid-cols-2 gap-16 text-center text-[9px] text-neutral-500 font-bold">
                <div className="space-y-1">
                  <div className="border-t border-neutral-400 w-36 mx-auto" />
                  <p className="font-extrabold text-neutral-900 leading-none">Accounts Department</p>
                  <p className="text-[8px] text-neutral-400 leading-none mt-0.5">Signature &amp; Date</p>
                </div>
                <div className="space-y-1">
                  <div className="border-t border-neutral-400 w-36 mx-auto" />
                  <p className="font-extrabold text-neutral-900 leading-none">Managing Director</p>
                  <p className="text-[8px] text-neutral-300 leading-none mt-0.5 font-sans uppercase">Authorized Seal</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
