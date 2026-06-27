import React, { useState, useMemo } from 'react';
import { ManualInvoiceBill, BillItem, BankDetails } from '../types';
import { COMPANY_PROFILE, DEFAULT_BANKS } from '../data';
import Barcode from './Barcode';
import { 
  Plus, 
  Trash, 
  FileText, 
  Search, 
  Printer, 
  X, 
  CheckCircle, 
  AlertCircle, 
  Clock, 
  Eye,
  Hash,
  Coins,
  Receipt,
  Edit
} from 'lucide-react';

interface InvoiceBillManagerProps {
  bills: ManualInvoiceBill[];
  onAddBill: (bill: ManualInvoiceBill) => void;
  onUpdateBillStatus: (id: string, status: 'Paid' | 'Unpaid' | 'Partial') => void;
  onDeleteBill: (id: string) => void;
  onUpdateBill?: (bill: ManualInvoiceBill) => void;
  buyerSuggestions?: string[];
  banks?: BankDetails[];
  canEdit?: boolean;
}

export default function InvoiceBillManager({
  bills,
  onAddBill,
  onUpdateBillStatus,
  onDeleteBill,
  onUpdateBill,
  buyerSuggestions = [],
  banks = [],
  canEdit = true
}: InvoiceBillManagerProps) {
  const bankList = banks.length > 0 ? banks : DEFAULT_BANKS;

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Manual Creation form visibility & states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingBillRecord, setEditingBillRecord] = useState<ManualInvoiceBill | null>(null);
  const [clientName, setClientName] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [buyerName, setBuyerName] = useState('');
  const [invoiceNo, setInvoiceNo] = useState(() => `BILL-${Date.now().toString().slice(-6)}`);
  const [paymentStatus, setPaymentStatus] = useState<'Paid' | 'Unpaid' | 'Partial'>('Unpaid');
  const [notes, setNotes] = useState('');
  const [currency, setCurrency] = useState<'USD' | 'BDT'>('USD');
  const [selectedBankId, setSelectedBankId] = useState<string>(() => bankList[0]?.id || '');
  const [activePreview, setActivePreview] = useState<ManualInvoiceBill | null>(null);

  const watermarkImage = useMemo(() => localStorage.getItem('acoola_global_watermark') || '', []);
  const signatureImage = useMemo(() => localStorage.getItem('acoola_global_signature') || '', []);
  
  // Dynamic line items list inside creation form
  const [formItems, setFormItems] = useState<Omit<BillItem, 'id' | 'amount'>[]>([
    { name: '', code: '', quantity: 1, unit: 'Pcs', unitPrice: 0 }
  ]);

  // Handle items array updates
  const handleItemChange = (index: number, field: string, value: any) => {
    setFormItems(prev => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        [field]: value
      };
      return copy;
    });
  };

  const addFormLineItem = () => {
    setFormItems(prev => [
      ...prev,
      { name: '', code: '', quantity: 1, unit: 'Pcs', unitPrice: 0 }
    ]);
  };

  const removeFormLineItem = (index: number) => {
    if (formItems.length === 1) return;
    setFormItems(prev => prev.filter((_, i) => i !== index));
  };

  // Start Edit Mode for manual invoice
  const handleStartEdit = (bill: ManualInvoiceBill) => {
    setEditingBillRecord(bill);
    setInvoiceNo(bill.invoiceNo);
    setPaymentStatus(bill.paymentStatus);
    setCurrency(bill.currency || 'USD');
    setClientName(bill.clientName);
    setClientAddress(bill.clientAddress || '');
    setBuyerName(bill.buyerName || '');
    setSelectedBankId(bill.bankDetails?.id || bankList[0]?.id || '');
    setNotes(bill.notes || '');
    setFormItems(bill.items.map(i => ({
      name: i.name,
      code: i.code === 'N/A' ? '' : i.code,
      quantity: i.quantity,
      unit: i.unit,
      unitPrice: i.unitPrice
    })));
    setShowCreateModal(true);
  };

  // Submit Direct Manual Bill Form
  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim()) {
      alert("Please specify the client / buyer name.");
      return;
    }

    // Verify all item rows hold names
    const invalidItem = formItems.find(item => !item.name.trim() || item.quantity <= 0);
    if (invalidItem) {
      alert("Please check that all lines have a description and quantity is greater than 0.");
      return;
    }

    // Map form items to strict DB BillItem definitions
    const mappedItems: BillItem[] = formItems.map((item, idx) => {
      const qty = Number(item.quantity);
      const rate = Number(item.unitPrice);
      return {
        id: `billitem-${Date.now()}-${idx}`,
        name: item.name,
        code: item.code.toUpperCase() || 'N/A',
        quantity: qty,
        unit: item.unit,
        unitPrice: rate,
        amount: qty * rate,
        currency: currency
      };
    });

    const totalAmount = mappedItems.reduce((sum, i) => sum + i.amount, 0);
    const selectedBank = bankList.find(b => b.id === selectedBankId) || bankList[0];

    if (editingBillRecord) {
      // Editing Mode
      const updatedBill: ManualInvoiceBill = {
        ...editingBillRecord,
        invoiceNo: invoiceNo || editingBillRecord.invoiceNo,
        clientName,
        clientAddress,
        buyerName: buyerName.trim() || clientName,
        items: mappedItems,
        totalAmount,
        paymentStatus,
        currency,
        notes,
        bankDetails: selectedBank
      };
      
      if (onUpdateBill) {
        onUpdateBill(updatedBill);
      } else {
        onDeleteBill(editingBillRecord.id);
        onAddBill(updatedBill);
      }
      alert("Manual bill has been updated successfully!");
    } else {
      // Creation Mode
      const newBillInvoice: ManualInvoiceBill = {
        id: `mb-${Date.now()}`,
        invoiceNo: invoiceNo || `BILL-${Date.now().toString().slice(-6)}`,
        clientName,
        clientAddress,
        buyerName: buyerName.trim() || clientName,
        date: new Date().toLocaleDateString('en-CA'),
        items: mappedItems,
        totalAmount,
        paymentStatus,
        currency,
        notes,
        createdAt: new Date().toISOString(),
        bankDetails: selectedBank
      };

      onAddBill(newBillInvoice);
      alert("New direct manual bill has been issued!");
    }

    closeAndResetForm();
  };

  const closeAndResetForm = () => {
    setShowCreateModal(false);
    setEditingBillRecord(null);
    setClientName('');
    setClientAddress('');
    setBuyerName('');
    setInvoiceNo(`BILL-${Date.now().toString().slice(-6)}`);
    setPaymentStatus('Unpaid');
    setNotes('');
    setCurrency('USD');
    setSelectedBankId(bankList[0]?.id || '');
    setFormItems([{ name: '', code: '', quantity: 1, unit: 'Pcs', unitPrice: 0 }]);
  };

  // Filter bills list
  const filteredBills = useMemo(() => {
    return bills.filter(b => {
      const matchSearch = b.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          b.invoiceNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          b.items.some(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()) || i.code.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchStatus = statusFilter ? b.paymentStatus === statusFilter : true;
      return matchSearch && matchStatus;
    });
  }, [bills, searchTerm, statusFilter]);

  // Elegant Print Billing draft format
  const printBillInvoiceDocument = (bill: ManualInvoiceBill) => {
    const printIframe = document.createElement('iframe');
    printIframe.style.position = 'fixed';
    printIframe.style.right = '0';
    printIframe.style.bottom = '0';
    printIframe.style.width = '0';
    printIframe.style.height = '0';
    printIframe.style.border = '0';
    document.body.appendChild(printIframe);

    const printDoc = printIframe.contentWindow ? printIframe.contentWindow.document : printIframe.contentDocument;
    if (!printDoc) {
      alert("Could not access printing frame.");
      return;
    }

    const curSymbol = bill.currency === 'BDT' ? '৳' : '$';
    const curLabel = bill.currency || 'USD';
    const activeBank = bill.bankDetails || bankList[0] || {
      bankName: 'N/A',
      branch: 'N/A',
      accountName: 'N/A',
      accountNo: 'N/A',
      swiftCode: 'N/A'
    };

    const totalInWords = (num: number) => {
      if (bill.currency === 'BDT') {
        return "Bangladeshi Taka " + num.toFixed(2) + " Only";
      }
      return "United States Dollars " + num.toFixed(2) + " Only";
    };

    const styleLinks = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
      .map(el => el.outerHTML)
      .join('\n');

    const watermarkLogo = COMPANY_PROFILE.logo || '';

    printDoc.write(`
      <html>
        <head>
          <title>COMMERCIAL INVOICE - ${bill.invoiceNo}</title>
          <base href="${window.location.origin}/" />
          ${styleLinks}
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;700&display=swap');
            * {
              box-sizing: border-box;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            body {
              font-family: 'Inter', sans-serif;
              margin: 0;
              padding: 0;
              background-color: #ffffff;
              color: #1e293b;
            }
            @page {
              size: A4 portrait;
              margin: 0 !important;
            }
            .print-container {
              width: 100% !important;
              max-width: 100% !important;
              background: #ffffff !important;
              font-size: 10px;
              color: #1e293b;
              position: relative;
              padding: 12mm 15mm 15mm 15mm !important;
              box-sizing: border-box !important;
            }
            .watermark-container {
              position: absolute;
              top: 0;
              left: 0;
              right: 0;
              bottom: 0;
              display: flex;
              align-items: center;
              justify-content: center;
              pointer-events: none;
              user-select: none;
              opacity: 0.04;
              z-index: 0;
            }
            .watermark-container img {
              max-width: 65%;
              max-height: 40%;
              object-fit: contain;
            }
            .total-row-style1 {
              background-color: #f8fafc !important;
              font-weight: 900 !important;
              color: #1e293b !important;
            }
            .total-row-style2 {
              background-color: #ecfdf5 !important;
              font-weight: 900 !important;
              color: #064e3b !important;
            }
            @media print {
              #commercial-invoice-print-sheet {
                position: relative !important;
                width: 100% !important;
                margin: 0 !important;
                padding: 12mm 15mm 15mm 15mm !important;
                box-sizing: border-box !important;
              }
              body {
                padding: 0 !important;
                margin: 0 !important;
              }
            }
          </style>
        </head>
        <body class="bg-white p-0 m-0">
          <div id="commercial-invoice-print-sheet" class="print-container relative space-y-6">
            <div class="absolute top-0 left-0 w-full h-2 bg-emerald-700"></div>

            ${watermarkLogo ? `
              <div class="watermark-container">
                <img src="${watermarkLogo}" alt="Watermark" />
              </div>
            ` : ''}

            <!-- HEADER -->
            <div class="flex justify-between items-start gap-4 pb-4 border-b border-slate-150 relative z-10">
              <div class="flex items-start gap-3">
                ${COMPANY_PROFILE.logo ? `
                  <div class="w-12 h-12 bg-white border border-slate-150 rounded p-1 flex items-center justify-center shrink-0">
                    <img src="${COMPANY_PROFILE.logo}" alt="brand" class="max-w-full max-h-full object-contain" />
                  </div>
                ` : ''}
                <div>
                  <h1 class="text-xl font-black text-emerald-950 tracking-tight leading-none uppercase m-0">${COMPANY_PROFILE.name}</h1>
                  <p class="text-[8px] font-extrabold text-emerald-700 tracking-widest mt-1 m-0">QUALITY GARMENTS ACCESSORIES MANUFACTURER-SUPPLIER</p>
                  <p class="text-[10px] text-slate-500 mt-2 font-medium leading-tight m-0">
                    Office: ${COMPANY_PROFILE.addresses.office}<br/>
                    Factory: ${COMPANY_PROFILE.addresses.factory}
                  </p>
                </div>
              </div>
              <div class="text-right flex flex-col items-end gap-3 shrink-0">
                <div>
                  <h2 class="text-base font-black text-emerald-800 uppercase tracking-tight m-0">COMMERCIAL BILL / INVOICE</h2>
                  <p class="text-[9.5px] text-slate-600 mt-1 font-medium leading-tight m-0">
                    Mob: ${COMPANY_PROFILE.phones.join(', ')}<br/>
                    ${COMPANY_PROFILE.emails[0]}
                  </p>
                </div>
                <div class="flex gap-2 items-center">
                  <div class="bg-white border border-slate-205 rounded p-1 flex items-center justify-center w-[40px] h-[40px] shadow-sm">
                    <img 
                      src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(bill.invoiceNo)}" 
                      alt="QR Code" 
                      class="max-w-full max-h-full object-contain"
                    />
                  </div>
                </div>
              </div>
            </div>

            <!-- METADATA GRIDS -->
            <div class="grid grid-cols-3 gap-3 relative z-10 text-left">
              
              <!-- Beneficiary details -->
              <div class="border border-slate-200 rounded-xl p-3 flex flex-col justify-between bg-slate-50/50">
                <div>
                  <div class="text-[8px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-1 mb-2">BENEFICIARY / TO:</div>
                  <p class="font-extrabold text-[#0f172a] text-xs uppercase m-0 leading-tight">${bill.clientName}</p>
                  <p class="text-[10px] text-slate-500 font-medium mt-1 leading-snug m-0">${bill.clientAddress || 'Client Registered address not supplied.'}</p>
                </div>
                <div class="border-t border-slate-100 pt-2 mt-3 text-[9.5px]">
                  <div class="flex justify-between"><span class="text-slate-400">Buyer Name:</span> <span class="font-black text-slate-900">${bill.buyerName || bill.clientName}</span></div>
                  <div class="flex justify-between mt-1"><span class="text-slate-400">Doc Reference:</span> <span class="font-bold text-emerald-800">Commercial Bill</span></div>
                </div>
              </div>

              <!-- Advising Bank -->
              <div class="border border-slate-200 rounded-xl p-3 flex flex-col justify-between bg-slate-50/50">
                <div>
                  <div class="text-[8px] font-black text-emerald-700 uppercase tracking-wider border-b border-slate-100 pb-1 mb-2">ADVISING BANK DETAILS:</div>
                  <p class="font-extrabold text-[#0f172a] text-xs m-0 leading-tight">${activeBank.bankName}</p>
                  <p class="text-[10px] text-slate-500 font-medium mt-1 leading-snug font-bold m-0">Branch: ${activeBank.branch}</p>
                </div>
                <div class="border-t border-slate-100 pt-2 mt-3 text-[9.5px] space-y-0.5 font-bold text-slate-705">
                  <div class="flex justify-between"><span class="text-slate-405 font-normal">A/C Name:</span> <span class="font-extrabold text-slate-805 text-[9px] truncate">${activeBank.accountName}</span></div>
                  <div class="flex justify-between"><span class="text-slate-405 font-normal">A/C Number:</span> <span class="font-mono text-slate-850">${activeBank.accountNo}</span></div>
                  <div class="flex justify-between"><span class="text-slate-405 font-normal">Swift Code:</span> <span class="font-mono text-emerald-800">${activeBank.swiftCode || 'N/A'}</span></div>
                  <div class="flex justify-between"><span class="text-slate-405 font-normal">BIN No:</span> <span class="font-mono text-slate-850">${COMPANY_PROFILE.bin}</span></div>
                </div>
              </div>

              <!-- Particulars -->
              <div class="border border-slate-200 rounded-xl p-3 flex flex-col justify-between bg-slate-50/50">
                <div>
                  <div class="text-[8px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-1 mb-2">PI PARTICULARS / INFO:</div>
                  <div class="flex justify-between text-[11px] pb-1 border-b border-dashed border-slate-150 mb-1">
                    <span class="text-slate-500 font-bold">Invoice Number:</span>
                    <span class="font-mono font-extrabold text-indigo-700 text-xs">${bill.invoiceNo}</span>
                  </div>
                  <div class="flex justify-between text-[11px]">
                    <span class="text-slate-500 font-bold">Date Raised:</span>
                    <span class="font-bold text-slate-800">${new Date(bill.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                  </div>
                </div>
                <div class="border-t border-slate-100 pt-2 mt-3 text-[9.5px]">
                  <div class="flex justify-between"><span class="text-slate-400">Settlement Code:</span> <span class="font-extrabold text-slate-800">${bill.paymentStatus.toUpperCase()}</span></div>
                  <div class="flex justify-between mt-1"><span class="text-slate-400">Settling Currency:</span> <span class="font-bold text-slate-800">${curLabel}</span></div>
                  <div class="flex justify-between mt-1"><span class="text-slate-400">H.S. Tariff:</span> <span class="font-mono text-slate-800">${COMPANY_PROFILE.defaultHsCode}</span></div>
                </div>
              </div>

            </div>

            <!-- ITEMS TABLE -->
            <div class="border border-slate-250 rounded-xl overflow-hidden mt-4 bg-white relative z-10 text-left">
              <table class="w-full text-left text-xs border-collapse">
                <thead>
                  <tr class="bg-slate-50 text-slate-505 font-extrabold border-b border-slate-200 text-[10px] uppercase">
                    <th class="p-3 text-center" style="width: 50px;">SL</th>
                    <th class="p-3">Product Description / Quality Standard Label</th>
                    <th class="p-3 text-center" style="width: 100px;">SKU Code</th>
                    <th class="p-3 text-right" style="width: 90px;">Quantity</th>
                    <th class="p-3 text-right" style="width: 100px;">Rate (${curLabel})</th>
                    <th class="p-3 text-right" style="width: 120px;">Amount</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-150">
                  ${bill.items.map((item, idx) => `
                    <tr>
                      <td class="p-2.5 text-center text-slate-400 font-bold">${idx + 1}</td>
                      <td class="p-2.5 text-slate-800 font-extrabold">${item.name}</td>
                      <td class="p-2.5 text-center font-mono font-bold text-[10.5px] text-slate-650">${item.code}</td>
                      <td class="p-2.5 text-right font-mono font-bold">
                        ${item.quantity.toLocaleString()} <span class="text-[10px] text-slate-450 uppercase">${item.unit}</span>
                      </td>
                      <td class="p-2.5 text-right font-mono text-slate-650">${curSymbol} ${item.unitPrice.toFixed(4)}</td>
                      <td class="p-2.5 text-right font-mono font-extrabold text-slate-900">${curSymbol} ${item.amount.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 4 })}</td>
                    </tr>
                  `).join('')}
                  <tr class="total-row-style1">
                    <td colspan="3" class="p-3 text-right text-slate-500 font-extrabold">SUB-TOTAL (নিট মূল্য):</td>
                    <td class="p-3 text-right font-mono">${bill.items.reduce((sum, i) => sum + i.quantity, 0).toLocaleString()}</td>
                    <td class="p-3 text-right">—</td>
                    <td class="p-3 text-right font-mono text-slate-900">${curSymbol} ${bill.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  </tr>
                  <tr class="total-row-style2">
                    <td colspan="5" class="p-3 text-right text-emerald-900 font-black tracking-wider uppercase whitespace-nowrap">GRAND TOTAL DUE (সর্বমোট প্রদেয়):</td>
                    <td class="p-3 text-right font-mono text-base text-emerald-700 tracking-tight whitespace-nowrap font-bold">${curSymbol} ${bill.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- DECLARATIONS / REMARKS -->
            <div class="border border-emerald-100 bg-emerald-50/15 p-3.5 rounded-xl text-[11px] text-slate-600 leading-snug space-y-1 mt-4 relative z-10 text-left">
              <div class="font-black text-emerald-800 tracking-wider text-[8px] uppercase border-b border-emerald-100 pb-1 mb-2">DECLARATIONS &amp; REGULATORY TERMS:</div>
              <div class="font-bold">- Supply Quality: All items supplied are guaranteed sound & in full compliance with ISO standards.</div>
              <div class="font-bold flex gap-1"><span class="text-emerald-700 font-extrabold font-bold">Price in Words:</span> <span class="italic font-extrabold text-slate-800 font-bold">${totalInWords(bill.totalAmount)}</span></div>
              ${bill.notes ? `
                <div class="mt-2.5 border-t border-slate-150/85 pt-2.5">
                  <strong class="text-emerald-700 font-extrabold">Recipient Notes: </strong>
                  <span class="font-medium text-slate-700">${bill.notes}</span>
                </div>
              ` : ''}
            </div>

            <!-- SIGNATURES -->
            <div class="grid grid-cols-2 gap-8 pt-8 mt-6 relative z-10">
              <div class="border-t border-slate-200 text-center text-xs font-extrabold text-slate-500 pt-2 flex flex-col items-center justify-end h-16">
                <span>Customer Signature &amp; Stamp</span>
              </div>
              <div class="border-t border-slate-200 text-center text-xs font-extrabold text-emerald-800 pt-2 flex flex-col items-center justify-end h-16 relative">
                ${signatureImage ? `
                  <img src="${signatureImage}" alt="Sig" class="max-h-12 w-auto mb-1 absolute bottom-6 pointer-events-none" />
                ` : ''}
                <span>For ${COMPANY_PROFILE.name}</span>
              </div>
            </div>

            <!-- FOOTER -->
            <div class="border-t border-slate-150 pt-3 mt-4 flex justify-between items-center text-[10px] text-slate-440 font-bold relative z-10">
              <div>This Document is generated secure by ${COMPANY_PROFILE.name} ERP System by Shakhawat.</div>
              <div class="font-mono text-slate-350">PAGE 1 OF 1</div>
            </div>

          </div>

          <script>
            window.onload = function() {
              window.focus();
              setTimeout(function() {
                window.print();
              }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printDoc.close();

    // Safe, non-intrusive container cleanup after print window finishes opening/canceling
    setTimeout(() => {
      try {
        if (printIframe && printIframe.parentNode) {
          printIframe.parentNode.removeChild(printIframe);
        }
      } catch (err) {
        console.error("Iframe cleanup error:", err);
      }
    }, 15000);
  };

  return (
    <div className="space-y-6 font-sans">
      
      {/* Title Block */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-550 border-b border-slate-100 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-indigo-650" />
            <h2 className="text-lg font-black uppercase text-slate-800 tracking-tight">Direct Invoice / Bills Directory (ইনভয়েস ও বিল)</h2>
          </div>
          <p className="text-[11px] text-slate-550 mt-1">Direct receipts database. Logs direct manual bills alongside product-catalogue generated invoice settlements with print support.</p>
        </div>

        {canEdit && (
          <button
            onClick={() => {
              setInvoiceNo(`BILL-${Date.now().toString().slice(-6)}`);
              setShowCreateModal(true);
            }}
            className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-750 text-white rounded text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer self-start md:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>New Manual Bill</span>
          </button>
        )}
      </div>

      {/* Filter Options */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search invoice lists by client, item matching or bill numbers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-slate-300 rounded-lg pl-8 pr-3 py-1.5 text-xs focus:ring-1 focus:ring-indigo-500 font-medium"
          />
        </div>

        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold focus:ring-1 focus:ring-indigo-500 cursor-pointer text-slate-700"
          >
            <option value="">All Settlement Statuses (সকল পেমেন্ট স্ট্যাটাস)</option>
            <option value="Unpaid">Unpaid / Outstanding (বকেয়া)</option>
            <option value="Paid">Fully Paid (পরিশোধিত)</option>
            <option value="Partial">Partial Settlement (আংশিক পেইড)</option>
          </select>
        </div>
      </div>

      {/* Main Table Segment */}
      {filteredBills.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-slate-300 rounded-2xl bg-white">
          <Receipt className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-bold text-slate-700">No invoicing or bill statements logged.</p>
          <p className="text-[10.5px] text-slate-400 font-medium mt-0.5">Log manually or transition products from the Catalogue.</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm" id="direct-bills-table-block">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 font-black text-slate-500 text-[10px] uppercase">
                <th className="p-3.5 pl-6" style={{ width: '130px' }}>Bill / Serial No</th>
                <th className="p-3.5">Client / Buyer Name</th>
                <th className="p-3.5">Date Raised</th>
                <th className="p-3.5">Linked Item rows</th>
                <th className="p-3.5 text-right">Grand Total / Amount (কারেন্সি)</th>
                <th className="p-3.5 text-center" style={{ width: '130px' }}>Settlement</th>
                <th className="p-3.5 pr-6 text-right" style={{ width: '110px' }}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-150">
              {filteredBills.map(bill => (
                <tr key={bill.id} className="hover:bg-slate-50/55 transition-colors font-sans">
                  <td className="p-3.5 pl-6 font-mono font-bold text-slate-805">
                    {bill.invoiceNo}
                  </td>
                  <td className="p-3.5">
                    <p className="font-extrabold text-slate-900 leading-tight">{bill.clientName}</p>
                    {bill.clientAddress && (
                      <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">{bill.clientAddress}</p>
                    )}
                  </td>
                  <td className="p-3.5 text-slate-500 font-medium">
                    {bill.date}
                  </td>
                  <td className="p-3.5">
                    <span className="font-bold text-slate-700">{bill.items.length} items</span>
                    <span className="text-[10px] text-slate-400 block mt-0.5 truncate max-w-sm" title={bill.items.map(i => i.name).join(', ')}>
                      {bill.items.map(i => i.name).join(', ')}
                    </span>
                  </td>
                  <td className="p-3.5 text-right font-mono font-extrabold text-slate-900 text-sm">
                    {bill.currency === 'BDT' ? '৳' : '$'} {bill.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="p-3.5 text-center">
                    {!canEdit ? (
                      <span className={`text-[10.5px] font-black rounded-lg px-2.5 py-1 text-center font-sans tracking-wide uppercase ${
                        bill.paymentStatus === 'Paid'
                          ? 'bg-emerald-105 text-emerald-800'
                          : bill.paymentStatus === 'Partial'
                          ? 'bg-amber-105 text-amber-800'
                          : 'bg-rose-105 text-rose-800'
                      }`}>
                        {bill.paymentStatus}
                      </span>
                    ) : (
                      <select
                        value={bill.paymentStatus}
                        onChange={(e) => onUpdateBillStatus(bill.id, e.target.value as any)}
                        className={`text-[10.5px] font-black rounded-lg px-2 py-1 text-center font-sans tracking-wide cursor-pointer focus:ring-0 select-none ${
                          bill.paymentStatus === 'Paid'
                            ? 'bg-emerald-100 text-emerald-800'
                            : bill.paymentStatus === 'Partial'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        <option value="Unpaid">UNPAID</option>
                        <option value="Paid">PAID</option>
                        <option value="Partial">PARTIAL</option>
                      </select>
                    )}
                  </td>
                  <td className="p-3.5 pr-6 text-right space-x-1">
                    <button
                      type="button"
                      onClick={() => setActivePreview(bill)}
                      className="p-1.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded text-indigo-700 cursor-pointer"
                      title="Preview Document Interface"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => handleStartEdit(bill)}
                        className="p-1.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded text-amber-700 cursor-pointer"
                        title="Edit Generated Invoice Bill"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => printBillInvoiceDocument(bill)}
                      className="p-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded text-slate-700 cursor-pointer"
                      title="Print Commercial Bill Slip"
                    >
                      <Printer className="w-3.5 h-3.5" />
                    </button>
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Delete bill registry "${bill.invoiceNo}" forever?`)) {
                            onDeleteBill(bill.id);
                          }
                        }}
                        className="p-1.5 bg-rose-100 hover:bg-rose-200 text-rose-750 rounded border border-rose-250 cursor-pointer"
                        title="Delete bill record"
                      >
                        <Trash className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ================= NEW DIRECT BILL CREATION MODAL ================= */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto animate-none">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full shadow-2xl p-6 relative my-8">
            <button
              onClick={closeAndResetForm}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-sm font-black uppercase text-slate-800 tracking-tight flex items-center gap-2 border-b border-slate-100 pb-3 mb-5">
              <Receipt className="w-4.5 h-4.5 text-indigo-650" />
              <span>{editingBillRecord ? 'Update Manual Customer Bill' : 'Issue Manual Customer Bill'}</span>
            </h3>

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs font-sans">
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="block font-bold text-slate-700">Invoice Serial No *</label>
                  <input
                    type="text"
                    required
                    value={invoiceNo}
                    onChange={(e) => setInvoiceNo(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-mono font-bold text-xs"
                    placeholder="e.g. BILL-102"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block font-bold text-slate-700">Invoice Settling Status</label>
                  <select
                    value={paymentStatus}
                    onChange={(e) => setPaymentStatus(e.target.value as any)}
                    className="w-full bg-slate-55 border border-slate-300 rounded-lg p-2 font-bold cursor-pointer text-xs"
                  >
                    <option value="Unpaid">Unpaid / Deferred Outstanding</option>
                    <option value="Paid">Fully Settled &amp; Paid</option>
                    <option value="Partial">Partial Settlement Accrued</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block font-bold text-slate-700">Billing Currency (কারেন্সি) *</label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value as 'USD' | 'BDT')}
                    className="w-full bg-slate-55 border border-slate-300 rounded-lg p-2 font-bold cursor-pointer text-xs"
                  >
                    <option value="USD">USD ($ - US Dollar)</option>
                    <option value="BDT">BDT (৳ - BD Taka)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="block font-bold text-slate-700">Client / Recipient Corporate Name *</label>
                  <input
                    type="text"
                    required
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-extrabold text-xs text-slate-900"
                    placeholder="e.g. Concord Fashion Export Ltd."
                  />
                </div>

                <div className="space-y-1">
                  <label className="block font-bold text-slate-700">Buyer Brand / Name *</label>
                  <input
                    type="text"
                    list="buyer-hints"
                    required
                    value={buyerName}
                    onChange={(e) => setBuyerName(e.target.value)}
                    className="w-full bg-slate-55 border border-indigo-200 outline-indigo-500 rounded-lg p-2 font-extrabold text-xs text-indigo-800"
                    placeholder="e.g. ZARA, H&M, Walmart"
                  />
                  <datalist id="buyer-hints">
                    {buyerSuggestions.map((buyer, bIdx) => (
                      <option key={bIdx} value={buyer} />
                    ))}
                  </datalist>
                </div>

                <div className="space-y-1">
                  <label className="block font-bold text-slate-700">Registered Office Address</label>
                  <input
                    type="text"
                    value={clientAddress}
                    onChange={(e) => setClientAddress(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-medium text-xs"
                    placeholder="e.g. Plot-12, Sector-4, Uttara, Dhaka"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block font-bold text-slate-700">Advising &amp; Receiving Bank Details *</label>
                <select
                  value={selectedBankId}
                  onChange={(e) => setSelectedBankId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-bold cursor-pointer text-xs text-slate-800"
                >
                  {bankList.map((bank) => (
                    <option key={bank.id} value={bank.id}>
                      {bank.bankName} (A/C: {bank.accountNo} - {bank.accountName}) - Swift: {bank.swiftCode}
                    </option>
                  ))}
                </select>
              </div>

              {/* Line Items Builder segment */}
              <div className="space-y-2 border border-slate-200 p-3.5 rounded-xl bg-slate-50">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="font-black text-slate-750 uppercase tracking-wide text-[10.5px]">Itemized Billings Rows</span>
                  <button
                    type="button"
                    onClick={addFormLineItem}
                    className="text-[10px] font-black text-indigo-700 hover:text-indigo-900 border border-indigo-250 bg-white rounded px-2.5 py-1 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Item Row</span>
                  </button>
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {formItems.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 bg-white border border-slate-200 rounded-lg p-2 relative pr-10 items-center">
                      
                      <div className="col-span-5 space-y-0.5">
                        <label className="text-[8.5px] uppercase font-bold text-slate-400">Description Item Title *</label>
                        <input
                          type="text"
                          required
                          value={item.name}
                          onChange={(e) => handleItemChange(idx, 'name', e.target.value)}
                          className="w-full border border-slate-250 rounded p-1 font-bold text-[11px]"
                          placeholder="e.g. Satin Printed Care Label"
                        />
                      </div>

                      <div className="col-span-2 space-y-0.5">
                        <label className="text-[8.5px] uppercase font-bold text-slate-400">SKU Code</label>
                        <input
                          type="text"
                          value={item.code}
                          onChange={(e) => handleItemChange(idx, 'code', e.target.value.toUpperCase())}
                          className="w-full border border-slate-250 rounded p-1 font-mono text-[11px]"
                          placeholder="SR-CAT-1"
                        />
                      </div>

                      <div className="col-span-2 space-y-0.5">
                        <label className="text-[8.5px] uppercase font-bold text-slate-400">Qty *</label>
                        <input
                          type="number"
                          required
                          min="1"
                          value={item.quantity || ''}
                          onChange={(e) => handleItemChange(idx, 'quantity', parseInt(e.target.value) || 0)}
                          className="w-full border border-slate-250 rounded p-1 font-mono text-[11px] font-bold"
                        />
                      </div>

                      <div className="col-span-1.5 col-span-2 space-y-0.5">
                        <label className="text-[8.5px] uppercase font-bold text-slate-400">Rate ({currency}) *</label>
                        <input
                          type="number"
                          step="0.0001"
                          required
                          value={item.unitPrice || ''}
                          onChange={(e) => handleItemChange(idx, 'unitPrice', parseFloat(e.target.value) || 0)}
                          className="w-full border border-slate-250 rounded p-1 font-mono text-[11px] font-bold"
                          placeholder="0.05"
                        />
                      </div>

                      <div className="col-span-1 space-y-0.5">
                        <label className="text-[8.5px] uppercase font-bold text-slate-400">Unit</label>
                        <select
                          value={item.unit}
                          onChange={(e) => handleItemChange(idx, 'unit', e.target.value)}
                          className="w-full border border-slate-250 rounded p-1 text-[11px] font-bold cursor-pointer"
                        >
                          <option value="Pcs">Pcs</option>
                          <option value="Dzn">Dzn</option>
                          <option value="Roll">Roll</option>
                          <option value="Yds">Yds</option>
                          <option value="Set">Set</option>
                          <option value="Kg">Kg</option>
                        </select>
                      </div>

                      {/* Remove Line row */}
                      <button
                        type="button"
                        onClick={() => removeFormLineItem(idx)}
                        disabled={formItems.length === 1}
                        className="absolute right-2 top-3 p-1.5 bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-md disabled:opacity-30 disabled:hover:bg-slate-50 disabled:hover:text-slate-405 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>

                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="block font-bold text-slate-700">Remarks / Bill Notes</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-medium text-xs"
                  placeholder="Insert payment schedule, bank collection instructions or packing specifications remarks details."
                />
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={closeAndResetForm}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-205 text-slate-750 rounded-lg font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold shadow-sm transition-colors cursor-pointer"
                >
                  {editingBillRecord ? 'Save Invoice Updates' : 'Save & Print Bill Draft'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= ON-SCREEN COMMERCIAL INVOICE PREVIEW MODAL ================= */}
      {activePreview && (() => {
        const curSymbol = activePreview.currency === 'BDT' ? '৳' : '$';
        const curLabel = activePreview.currency || 'USD';
        const activeBank = activePreview.bankDetails || bankList[0] || {
          bankName: 'N/A',
          branch: 'N/A',
          accountName: 'N/A',
          accountNo: 'N/A',
          swiftCode: 'N/A'
        };
        
        const totalInWords = (num: number) => {
          if (activePreview.currency === 'BDT') {
            return "Bangladeshi Taka " + num.toFixed(2) + " Only";
          }
          return "United States Dollars " + num.toFixed(2) + " Only";
        };

        return (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-slate-100 border border-slate-200 rounded-2xl max-w-4xl w-full shadow-2xl p-6 relative flex flex-col max-h-[90vh]">
              
              {/* Modal controls */}
              <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4 bg-white -mx-6 -mt-6 p-4 rounded-t-2xl">
                <div className="flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-emerald-650" />
                  <span className="font-extrabold text-slate-800 tracking-tight text-sm uppercase">Invoice Proof Preview: {activePreview.invoiceNo}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => printBillInvoiceDocument(activePreview)}
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-bold uppercase tracking-wide flex items-center gap-1 shadow-sm transition-colors cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print In A4 Sheet</span>
                  </button>
                  <button
                    onClick={() => setActivePreview(null)}
                    className="p-1 px-3 bg-slate-200 hover:bg-slate-300 rounded text-xs font-bold text-slate-700 cursor-pointer"
                  >
                    Close Preview
                  </button>
                </div>
              </div>

              {/* Scrollable preview body */}
              <div id="commercial-invoice-print-sheet" className="flex-1 overflow-y-auto p-4 pt-8 md:p-8 md:pt-12 bg-white border border-slate-200 rounded-xl space-y-6 relative select-text text-slate-800" style={{ fontFamily: 'Inter, sans-serif' }}>
                <div className="absolute top-0 left-0 w-full h-1.5 bg-emerald-700 rounded-t-xl"></div>

                {/* Header block replicating printable design */}
                <div className="flex justify-between items-start gap-4 pb-4 border-b border-slate-150">
                  <div className="flex items-start gap-3">
                    {COMPANY_PROFILE.logo && (
                      <div className="w-12 h-12 bg-white border border-slate-150 rounded p-1 flex items-center justify-center">
                        <img src={COMPANY_PROFILE.logo} alt="brand" className="max-w-full max-h-full object-contain" />
                      </div>
                    )}
                    <div>
                      <h1 className="text-xl font-black text-emerald-950 tracking-tight leading-none uppercase">{COMPANY_PROFILE.name}</h1>
                      <p className="text-[8px] font-extrabold text-emerald-700 tracking-widest mt-1">QUALITY GARMENTS ACCESSORIES MANUFACTURER-SUPPLIER</p>
                      <p className="text-[10px] text-slate-500 mt-2 font-medium leading-tight">
                        Office: {COMPANY_PROFILE.addresses.office}<br/>
                        Factory: {COMPANY_PROFILE.addresses.factory}
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex flex-col items-end gap-3 shrink-0">
                    <div>
                      <h2 className="text-base font-black text-emerald-840 uppercase tracking-tight">COMMERCIAL BILL / INVOICE</h2>
                      <p className="text-[9.5px] text-slate-600 mt-1 font-medium leading-tight select-all">
                        Mob: {COMPANY_PROFILE.phones.join(', ')}<br/>
                        {COMPANY_PROFILE.emails[0]}
                      </p>
                    </div>
                    {/* Barcode and QR code section mirroring PI header */}
                    <div className="flex gap-2 items-center">
                      <div className="bg-white border border-slate-205 rounded p-1.5 flex items-center justify-center w-[44px] h-[44px] shadow-sm">
                        <img 
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(activePreview.invoiceNo)}`} 
                          alt="QR Code" 
                          className="max-w-full max-h-full object-contain"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Meta details grids - mirroring PI */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  
                  {/* Beneficiary details column */}
                  <div className="border border-slate-200 rounded-xl p-3 flex flex-col justify-between bg-slate-50/50">
                    <div>
                      <div className="text-[8px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-1 mb-2">BENEFICIARY / TO:</div>
                      <p className="font-extrabold text-[#0f172a] text-xs uppercase">{activePreview.clientName}</p>
                      <p className="text-[10px] text-slate-500 font-medium mt-1 leading-snug">{activePreview.clientAddress || 'Client Registered address not supplied.'}</p>
                    </div>
                    <div className="border-t border-slate-100 pt-2 mt-3 text-[9.5px]">
                      <div className="flex justify-between"><span className="text-slate-400">Buyer Name:</span> <span className="font-black text-slate-900">{activePreview.buyerName || activePreview.clientName}</span></div>
                      <div className="flex justify-between mt-1"><span className="text-slate-400">Doc Reference:</span> <span className="font-bold text-emerald-800">Commercial Bill</span></div>
                    </div>
                  </div>

                  {/* Advising Receiving Bank details column */}
                  <div className="border border-slate-200 rounded-xl p-3 flex flex-col justify-between bg-slate-50/50">
                    <div>
                      <div className="text-[8px] font-black text-emerald-700 uppercase tracking-wider border-b border-slate-100 pb-1 mb-2">ADVISING BANK DETAILS:</div>
                      <p className="font-extrabold text-[#0f172a] text-xs">{activeBank.bankName}</p>
                      <p className="text-[10px] text-slate-500 font-medium mt-1 leading-snug font-bold">Branch: {activeBank.branch}</p>
                    </div>
                    <div className="border-t border-slate-100 pt-2 mt-3 text-[9.5px] space-y-0.5 font-bold text-slate-705">
                      <div className="flex justify-between"><span className="text-slate-400 font-normal">A/C Name:</span> <span className="font-extrabold text-slate-805 text-[9px]" title={activeBank.accountName}>{activeBank.accountName}</span></div>
                      <div className="flex justify-between"><span className="text-slate-400 font-normal">A/C Number:</span> <span className="font-mono text-slate-800">{activeBank.accountNo}</span></div>
                      <div className="flex justify-between"><span className="text-slate-400 font-normal">Swift Code:</span> <span className="font-mono text-emerald-800">{activeBank.swiftCode || 'N/A'}</span></div>
                      <div className="flex justify-between"><span className="text-slate-400 font-normal">BIN No:</span> <span className="font-mono text-slate-800">{COMPANY_PROFILE.bin}</span></div>
                    </div>
                  </div>

                  {/* Particulars details column */}
                  <div className="border border-slate-200 rounded-xl p-3 flex flex-col justify-between bg-slate-50/50">
                    <div>
                      <div className="text-[8px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-100 pb-1 mb-2">PI PARTICULARS / INFO:</div>
                      <div className="flex justify-between text-[11px] pb-1 border-b border-dashed border-slate-150 mb-1">
                        <span className="text-slate-500 font-medium font-bold">Invoice Number:</span>
                        <span className="font-mono font-extrabold text-indigo-700 text-xs">{activePreview.invoiceNo}</span>
                      </div>
                      <div className="flex justify-between text-[11px]">
                        <span className="text-slate-500 font-medium font-bold">Date Raised:</span>
                        <span className="font-bold text-slate-800">{new Date(activePreview.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                      </div>
                    </div>
                    <div className="border-t border-slate-100 pt-2 mt-3 text-[9.5px]">
                      <div className="flex justify-between"><span className="text-slate-400">Settlement Code:</span> <span className="font-extrabold text-slate-800">{activePreview.paymentStatus.toUpperCase()}</span></div>
                      <div className="flex justify-between mt-1"><span className="text-slate-400">Settling Currency:</span> <span className="font-bold text-slate-800">{curLabel}</span></div>
                      <div className="flex justify-between mt-1"><span className="text-slate-400">H.S. Tariff:</span> <span className="font-mono text-slate-800">{COMPANY_PROFILE.defaultHsCode}</span></div>
                    </div>
                  </div>

                </div>

                {/* Items grid */}
                <div className="border border-slate-250 rounded-xl overflow-hidden mt-4">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-505 font-extrabold border-b border-slate-200 text-[10px] uppercase">
                        <th className="p-3 text-center" style={{ width: '50px' }}>SL</th>
                        <th className="p-3">Product Description / Quality Standard Label</th>
                        <th className="p-3 text-center" style={{ width: '100px' }}>SKU Code</th>
                        <th className="p-3 text-right" style={{ width: '90px' }}>Quantity</th>
                        <th className="p-3 text-right" style={{ width: '100px' }}>Rate ({curLabel})</th>
                        <th className="p-3 text-right" style={{ width: '120px' }}>Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-150">
                      {activePreview.items.map((item, idx) => (
                        <tr key={item.id} className="hover:bg-slate-50/50">
                          <td className="p-2.5 text-center text-slate-400 font-bold">{idx + 1}</td>
                          <td className="p-2.5 text-slate-800 font-extrabold">{item.name}</td>
                          <td className="p-2.5 text-center font-mono font-bold text-[10.5px] text-slate-650">{item.code}</td>
                          <td className="p-2.5 text-right font-mono font-bold">
                            {item.quantity.toLocaleString()} <span className="text-[10px] text-slate-450 uppercase">{item.unit}</span>
                          </td>
                          <td className="p-2.5 text-right font-mono text-slate-650">{curSymbol} {item.unitPrice.toFixed(4)}</td>
                          <td className="p-2.5 text-right font-mono font-extrabold text-slate-900">{curSymbol} {item.amount.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 4 })}</td>
                        </tr>
                      ))}
                      <tr className="bg-slate-50/60 font-black text-slate-800 border-t border-slate-200">
                        <td colSpan={3} className="p-3 text-right text-slate-500 font-extrabold">SUB-TOTAL (নিট মূল্য):</td>
                        <td className="p-3 text-right font-mono">{activePreview.items.reduce((sum, i) => sum + i.quantity, 0).toLocaleString()}</td>
                        <td className="p-3 text-right">—</td>
                        <td className="p-3 text-right font-mono text-slate-900">{curSymbol} {activePreview.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      </tr>
                      <tr className="bg-emerald-50/50 font-black text-emerald-950 text-xs border-t border-slate-200">
                        <td colSpan={5} className="p-3 text-right text-emerald-900 font-black tracking-wider uppercase whitespace-nowrap">GRAND TOTAL DUE (সর্বমোট প্রদেয়):</td>
                        <td className="p-3 text-right font-mono text-base text-emerald-700 tracking-tight whitespace-nowrap font-black">{curSymbol} {activePreview.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Declarations & Remarks */}
                <div className="border border-emerald-100 bg-emerald-50/15 p-3.5 rounded-xl text-[11px] text-slate-600 leading-snug space-y-1 mt-4">
                  <div className="font-black text-emerald-800 tracking-wider text-[8px] uppercase border-b border-emerald-100 pb-1 mb-2">DECLARATIONS &amp; REGULATORY TERMS:</div>
                  <div className="font-bold">- Supply Quality: All items supplied are guaranteed sound & in full compliance with ISO standards.</div>
                  <div className="font-bold flex gap-1"><span className="text-emerald-700 font-extrabold">Price in Words:</span> <span className="italic font-extrabold text-slate-800">{totalInWords(activePreview.totalAmount)}</span></div>
                  {activePreview.notes && (
                    <div className="mt-2.5 border-t border-slate-150/85 pt-2.5">
                      <strong className="text-emerald-700 font-extrabold">Recipient Notes: </strong>
                      <span className="font-medium text-slate-700">{activePreview.notes}</span>
                    </div>
                  )}
                </div>

                {/* Signatures placeholder */}
                <div className="grid grid-cols-2 gap-8 pt-8 mt-6">
                  <div className="border-t border-slate-200 text-center text-xs font-extrabold text-slate-500 pt-2 flex flex-col items-center justify-end h-16">
                    <span>Customer Signature &amp; Stamp</span>
                  </div>
                  <div className="border-t border-slate-200 text-center text-xs font-extrabold text-emerald-800 pt-2 flex flex-col items-center justify-end h-16 relative">
                    {signatureImage && (
                      <img src={signatureImage} alt="Sig" className="max-h-12 w-auto mb-1 absolute bottom-6 pointer-events-none" />
                    )}
                    <span>For {COMPANY_PROFILE.name}</span>
                  </div>
                </div>

                {/* ERP footers matching exactly */}
                <div className="border-t border-slate-150 pt-3 mt-4 flex justify-between items-center text-[10px] text-slate-400 font-bold">
                  <div>This Document is generated secure by {COMPANY_PROFILE.name} ERP System by Shakhawat.</div>
                  <div className="font-mono text-slate-350">PAGE 1 OF 1</div>
                </div>

              </div>

            </div>
          </div>
        );
      })()}

    </div>
  );
}
