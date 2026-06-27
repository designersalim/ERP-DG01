import React, { useState, useMemo, useRef } from 'react';
import { COMPANY_PROFILE } from '../data';
import { jsPDF } from 'jspdf';
// @ts-ignore
import html2pdf from 'html2pdf.js';
import html2canvas, { withSafeColorContext } from '../lib/safeHtml2Canvas';
import { 
  Printer, 
  Download, 
  Plus, 
  Trash2, 
  FileText, 
  Sparkles, 
  DollarSign, 
  Layers, 
  Check, 
  HelpCircle,
  Image
} from 'lucide-react';

export type QuoteUnitType = 'Pcs' | 'Dzn' | 'Set' | 'Yds' | 'Roll' | 'Cone' | 'Kg' | 'Mtr' | 'Ctn';

interface QuoteItem {
  id: string;
  itemName: string;
  styleNumber: string;
  quantity: number;
  unit: QuoteUnitType;
  priceUnit?: QuoteUnitType;
  unitPrice: number;
  itemImage?: string;
}

interface PriceQuotationProps {
  initialQuotes?: any[];
  onQuotesChange?: (quotes: any[]) => void;
  onDeleteQuote?: (id: string, quote: any) => void;
  sessionUser?: any;
  canEdit?: boolean;
}

export default function PriceQuotation({ initialQuotes, onQuotesChange, onDeleteQuote, sessionUser, canEdit: propCanEdit }: PriceQuotationProps = {}) {
  const canEdit = useMemo(() => {
    if (propCanEdit !== undefined) return propCanEdit;
    if (!sessionUser) return true;
    if (sessionUser.isMasterAdmin) return true;
    return !!sessionUser.writeAccess?.['quote-builder'];
  }, [sessionUser, propCanEdit]);

  const [quoteNo, setQuoteNo] = useState(`ATC-PQ-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
  const [quoteDate, setQuoteDate] = useState(new Date().toISOString().substring(0, 10));
  const [clientName, setClientName] = useState('RUPA KNITWEAR (PVT.) LTD');
  const [clientAddress, setClientAddress] = useState('KUNIA, BOARD BAZAR, GAZIPUR, BANGLADESH');
  const [validity, setValidity] = useState('30 Days from issue date');
  const [deliveryTerms, setDeliveryTerms] = useState('Within 7-10 working days after receiving confirmed L/C or Advance TT.');
  const [paymentTerms, setPaymentTerms] = useState('100% Irrevocable Letter of Credit (L/C) at sight or Advance Telegraphic Transfer (T/T).');
  const [vatTaxStr, setVatTaxStr] = useState('All prices are exclusive of VAT & Tax unless specified otherwise.');
  const [contactPerson, setContactPerson] = useState('Mr. Shakhawat (Marketing Executive)');
  const [quotationImage, setQuotationImage] = useState<string | null>(null);
  const [customSignature, setCustomSignature] = useState<string | null>(null);
  
  // Quote Line Items
  const [items, setItems] = useState<QuoteItem[]>([
    { id: '1', itemName: 'Standard Elastic Band (Super Soft)', styleNumber: 'ST-99827', quantity: 25000, unit: 'Yds', unitPrice: 0.125, priceUnit: 'Yds' },
    { id: '2', itemName: 'Apparel Sewing Thread Thread-A', styleNumber: 'ST-2018', quantity: 5000, unit: 'Roll', unitPrice: 0.65, priceUnit: 'Roll' },
    { id: '3', itemName: 'Satin Printed Label (Dual Color)', styleNumber: 'ST-7112', quantity: 150000, unit: 'Pcs', unitPrice: 0.0085, priceUnit: 'Pcs' },
  ]);

  // Form input states for adding a new item
  const [newItemName, setNewItemName] = useState('');
  const [newItemStyle, setNewItemStyle] = useState('');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [newItemQty, setNewItemQty] = useState('10000');
  const [newItemUnit, setNewItemUnit] = useState<QuoteUnitType>('Pcs');
  const [newItemPriceUnit, setNewItemPriceUnit] = useState<QuoteUnitType>('Pcs');
  const [newItemPrice, setNewItemPrice] = useState('0.05');
  const [newItemImage, setNewItemImage] = useState<string | null>(null);

  const printTargetRef = useRef<HTMLDivElement>(null);

  // Helper method to calculate single item amount considering Pcs to Dzn conversion
  const calculateItemTotal = (item: QuoteItem): number => {
    const qty = item.quantity;
    const price = item.unitPrice;
    const pUnit = item.priceUnit || item.unit;
    if (pUnit === 'Dzn' && item.unit === 'Pcs') {
      return (qty / 12) * price;
    }
    return qty * price;
  };

  const totalAmount = useMemo(() => {
    return items.reduce((sum, item) => sum + calculateItemTotal(item), 0);
  }, [items]);

  // Quotation History List State
  const [localQuotes, setLocalQuotes] = useState<any[]>(() => {
    const saved = localStorage.getItem('acoola_quotations');
    return saved ? JSON.parse(saved) : [];
  });

  const savedQuotes = initialQuotes !== undefined ? initialQuotes : localQuotes;

  const [activeQuoteId, setActiveQuoteId] = useState<string | null>(null);

  // Load website price quote requests from localStorage
  const [websiteRequests, setWebsiteRequests] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('acoola_client_inquiries');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [activeWebInquiryId, setActiveWebInquiryId] = useState<string | null>(null);

  const handleLoadWebInquiry = (req: any) => {
    setActiveWebInquiryId(req.id);
    setQuoteNo(`ATC-PQ-WEB-${req.id.substring(3, 8).toUpperCase()}`);
    setQuoteDate(new Date().toISOString().substring(0, 10));
    setClientName(req.companyName || req.clientEmail?.split('@')[0]?.toUpperCase() || 'WEBSITE CLIENT');
    setClientAddress(req.address || req.clientEmail || 'Via public website contact portal');
    setValidity('30 Days from issue date');
    setDeliveryTerms('Within 5-7 working days of confirmed contract / Purchase Order.');
    setPaymentTerms('Standard Merchandising LC or Advance TT Payments.');
    setContactPerson(req.clientEmail || 'Client Representative');
    
    // Auto populate single line item based on the customer inquiry choice
    setItems([
      { 
        id: '1', 
        itemName: req.itemName, 
        styleNumber: `REQ-${req.id.substring(3, 7).toUpperCase()}`, 
        quantity: Number(req.quantity) || 10000, 
        unit: 'Pcs', 
        unitPrice: 0.05, 
        priceUnit: 'Pcs' 
      }
    ]);
    
    setQuotationImage(null);
    setCustomSignature(null);
    setActiveQuoteId(null);
    alert(`Website Request Loaded Successfully!\n\nClient Contact: ${req.clientEmail}\nItem Name: ${req.itemName}\nQuantity: ${req.quantity} Pcs\nSpec Details: ${req.specDetails || 'None'}\n\nYou can now adjust prices or add more items, and then click "Save to History" or "Print" to automatically issue and finalize this quotation.`);
  };

  // Helper helper to write back list
  const persistQuotes = (updatedList: any[]) => {
    if (onQuotesChange) {
      onQuotesChange(updatedList);
    } else {
      setLocalQuotes(updatedList);
    }
    localStorage.setItem('acoola_quotations', JSON.stringify(updatedList));
  };

  const autoSaveToHistory = () => {
    if (!clientName.trim() || items.length === 0) return;
    const newQuoteObj = {
      id: activeQuoteId || `pq-${Date.now()}`,
      quoteNo,
      quoteDate,
      clientName,
      clientAddress,
      validity,
      deliveryTerms,
      paymentTerms,
      vatTaxStr,
      contactPerson,
      items,
      totalAmount,
      quotationImage,
      customSignature,
      updatedAt: new Date().toISOString()
    };
    
    let updatedList;
    if (activeQuoteId) {
      updatedList = savedQuotes.map(q => q.id === activeQuoteId ? newQuoteObj : q);
    } else {
      updatedList = [newQuoteObj, ...savedQuotes];
      setActiveQuoteId(newQuoteObj.id);
    }
    persistQuotes(updatedList);
  };

  const handleSaveQuotation = () => {
    if (!clientName.trim()) {
      alert("Please provide a client name before saving.");
      return;
    }
    
    if (items.length === 0) {
      alert("Quotation must contain at least one item line.");
      return;
    }
    
    const newQuoteObj = {
      id: activeQuoteId || `pq-${Date.now()}`,
      quoteNo,
      quoteDate,
      clientName,
      clientAddress,
      validity,
      deliveryTerms,
      paymentTerms,
      vatTaxStr,
      contactPerson,
      items,
      totalAmount,
      quotationImage,
      customSignature,
      updatedAt: new Date().toISOString()
    };

    let updatedList;
    if (activeQuoteId) {
      updatedList = savedQuotes.map(q => q.id === activeQuoteId ? newQuoteObj : q);
      alert("Price quotation draft updated successfully!");
    } else {
      updatedList = [newQuoteObj, ...savedQuotes];
      setActiveQuoteId(newQuoteObj.id);
      alert("New price quotation saved to history!");
    }
    persistQuotes(updatedList);

    // If this quote was generated based on a website inquiry, update its status
    if (activeWebInquiryId) {
      const updatedReqs = websiteRequests.map(req => 
        req.id === activeWebInquiryId ? { ...req, status: 'Price Quoted' as const } : req
      );
      setWebsiteRequests(updatedReqs);
      localStorage.setItem('acoola_client_inquiries', JSON.stringify(updatedReqs));
      setActiveWebInquiryId(null);
      alert("Website Price Quotation has been successfully issued! Visitor request marked as 'Price Quoted'.");
    }
  };

  const handleStartFresh = () => {
    setQuoteNo(`ATC-PQ-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
    setQuoteDate(new Date().toISOString().substring(0, 10));
    setClientName('NEW PROSPECT CLIENT');
    setClientAddress('');
    setValidity('30 Days from issue date');
    setDeliveryTerms('Within 7-10 working days after receiving confirmed L/C or Advance TT.');
    setPaymentTerms('100% Irrevocable Letter of Credit (L/C) at sight or Advance Telegraphic Transfer (T/T).');
    setVatTaxStr('All prices are exclusive of VAT & Tax unless specified otherwise.');
    setContactPerson('Mr. Shakhawat (Marketing Executive)');
    setItems([]);
    setQuotationImage(null);
    setCustomSignature(null);
    setActiveQuoteId(null);
    setActiveWebInquiryId(null);
  };

  const handleLoadQuotation = (q: any) => {
    setActiveQuoteId(q.id);
    setQuoteNo(q.quoteNo);
    setQuoteDate(q.quoteDate);
    setClientName(q.clientName || '');
    setClientAddress(q.clientAddress || '');
    setValidity(q.validity || '30 Days from issue date');
    setDeliveryTerms(q.deliveryTerms || '');
    setPaymentTerms(q.paymentTerms || '');
    setVatTaxStr(q.vatTaxStr || 'All prices are exclusive of VAT & Tax unless specified otherwise.');
    setContactPerson(q.contactPerson || '');
    setItems(q.items || []);
    setQuotationImage(q.quotationImage || null);
    setCustomSignature(q.customSignature || null);
  };

  const handleDeleteSavedQuote = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this quotation from history?")) return;
    const q = savedQuotes.find(item => item.id === id);
    if (q && onDeleteQuote) {
      onDeleteQuote(id, q);
    } else {
      const filtered = savedQuotes.filter(q => q.id !== id);
      persistQuotes(filtered);
    }
    if (activeQuoteId === id) {
      handleStartFresh();
    }
  };

  const handleEditItem = (it: QuoteItem) => {
    setEditingItemId(it.id);
    setNewItemName(it.itemName);
    setNewItemStyle(it.styleNumber === 'N/A' ? '' : it.styleNumber);
    setNewItemQty(it.quantity.toString());
    setNewItemUnit(it.unit);
    setNewItemPriceUnit(it.priceUnit || it.unit);
    setNewItemPrice(it.unitPrice.toString());
    setNewItemImage(it.itemImage || null);
  };

  const handleAddItem = () => {
    if (!newItemName.trim()) {
      alert("Please provide an item description Name.");
      return;
    }
    const qty = parseFloat(newItemQty);
    const prc = parseFloat(newItemPrice);
    if (isNaN(qty) || qty <= 0) {
      alert("Please specify a valid quantity.");
      return;
    }
    if (isNaN(prc) || prc < 0) {
      alert("Please specify a valid unit price.");
      return;
    }

    if (editingItemId) {
      setItems(items.map(it => it.id === editingItemId ? {
        ...it,
        itemName: newItemName.trim(),
        styleNumber: newItemStyle.trim() || 'N/A',
        quantity: qty,
        unit: newItemUnit,
        priceUnit: newItemPriceUnit,
        unitPrice: prc,
        itemImage: newItemImage || undefined
      } : it));
      setEditingItemId(null);
    } else {
      const newItem: QuoteItem = {
        id: `item-${Date.now()}`,
        itemName: newItemName.trim(),
        styleNumber: newItemStyle.trim() || 'N/A',
        quantity: qty,
        unit: newItemUnit,
        priceUnit: newItemPriceUnit,
        unitPrice: prc,
        itemImage: newItemImage || undefined
      };
      setItems([...items, newItem]);
    }

    setNewItemName('');
    setNewItemStyle('');
    setNewItemQty('10000');
    setNewItemUnit('Pcs');
    setNewItemPriceUnit('Pcs');
    setNewItemPrice('0.05');
    setNewItemImage(null);
  };

  const handleRemoveItem = (id: string) => {
    setItems(items.filter(it => it.id !== id));
  };

  const handlePrint = () => {
    autoSaveToHistory();
    const element = document.getElementById('price-quotation-a4-preview');
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
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800;900&display=swap');
        * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        body { margin: 0 !important; padding: 0 !important; background-color: #ffffff; color: #171717; font-family: 'Poppins', sans-serif !important; }
        #price-quotation-a4-preview {
          display: flex !important; flex-direction: column !important; justify-content: space-between !important;
          width: 210mm !important; height: 297mm !important;
          padding-top: 5mm !important;
          padding-left: 15mm !important;
          padding-right: 15mm !important;
          padding-bottom: 15mm !important;
          box-sizing: border-box !important;
          position: relative !important;
          border: none !important; box-shadow: none !important;
          overflow: hidden !important;
        }
        #price-quotation-a4-preview * { 
          visibility: visible !important; 
          font-family: 'Poppins', sans-serif !important; 
        }
        #price-quotation-a4-preview *:not(.lc-document-title-header):not(.lc-company-logo-img):not(.lc-qr-code-img):not(button):not(svg):not(path) {
          font-size: 8.5pt !important;
        }
        #price-quotation-a4-preview table tr {
          height: 4mm !important;
        }
        #price-quotation-a4-preview table tr td,
        #price-quotation-a4-preview table tr th {
          height: 4mm !important;
          padding-top: 0.5mm !important;
          padding-bottom: 0.5mm !important;
          line-height: 1.2 !important;
        }
        @page { size: A4 portrait; margin: 0mm; }
      </style>
    `;

    printWindow.document.write(`
      <html>
        <head>
          <title>Price Quotation - ${quoteNo}</title>
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
              setTimeout(function() { window.close(); }, 1500);
            }
            if (document.readyState === 'complete') {
              setTimeout(doPrint, 800);
            } else {
              window.focus();
              window.addEventListener('load', function() { setTimeout(doPrint, 800); });
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleExportPDF = async () => {
    autoSaveToHistory();
    const element = document.getElementById('price-quotation-a4-preview');
    if (!element) return;

    // Save original styles of the element
    const originalStyle = element.getAttribute('style') || '';

    try {
      // Force scaling styles for exact layout output
      element.style.setProperty('width', '1200px', 'important');
      element.style.setProperty('height', '1697px', 'important');
      element.style.setProperty('min-width', '1200px', 'important');
      element.style.setProperty('min-height', '1697px', 'important');
      element.style.setProperty('max-width', '1200px', 'important');
      element.style.setProperty('max-height', '1697px', 'important');
      element.style.setProperty('padding', '28px 86px 86px 86px', 'important');
      element.style.setProperty('box-sizing', 'border-box', 'important');
      element.style.setProperty('overflow', 'visible', 'important');

      const options = {
        margin: [0, 0, 0, 0] as [number, number, number, number],
        filename: `Price_Quotation_${quoteNo}.pdf`,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { 
          scale: 2.5, 
          useCORS: true,
          logging: false,
          windowWidth: 1200,
          backgroundColor: '#ffffff'
        },
        jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const },
        pagebreak: { mode: ['css' as const, 'legacy' as const] }
      };

      // This method ensures real text layers are embedded into the PDF using html2pdf inside withSafeColorContext
      await withSafeColorContext(async () => {
        await html2pdf().set(options).from(element).save();
      });
    } catch (e: any) {
      console.error(e);
      alert('Error rendering crisp PDF. Please try again.');
    } finally {
      // Restore original styles
      if (originalStyle) {
        element.setAttribute('style', originalStyle);
      } else {
        element.removeAttribute('style');
      }
    }
  };

  const compName = COMPANY_PROFILE.name || "ACOOLA TRIMS CORPORATION";
  const compWords = compName.split(/\s+/);
  const firstTwoWords = compWords.slice(0, 2).join(' ');
  const remainingWords = compWords.slice(2).join(' ');

  const firstColor = COMPANY_PROFILE.line1Color || COMPANY_PROFILE.firstColor || '#007D46';
  const secondColor = COMPANY_PROFILE.line2Color || COMPANY_PROFILE.secondColor || '#ed1c24';
  const tagline = COMPANY_PROFILE.tagline || 'All Kinds of Garments Accessories Manufacturer & Supplier';

  const emailStr = COMPANY_PROFILE.emails.join(', ');
  const phoneStr = COMPANY_PROFILE.phones.map(p => {
    const clean = p.trim();
    if (clean.startsWith('+')) return clean;
    if (clean.startsWith('880')) return `+${clean}`;
    if (clean.startsWith('0')) return `+880 ${clean.slice(1)}`;
    return `+880 ${clean}`;
  }).join(', ');

  const contactText = `E-mail: ${emailStr} I Phone: ${phoneStr}`;
  const nameLength = compName.length || 1;
  const nameFontSize = `${Math.max(16, Math.min(26, (550 / nameLength)))}px`;

  const taglineLength = tagline.length || 1;
  const taglineFontSize = `${Math.max(8.5, Math.min(13.5, (620 / taglineLength)))}px`;

  const contactLength = contactText.length || 1;
  const contactFontSize = `${Math.max(7, Math.min(10.5, (950 / contactLength)))}px`;

  const renderDocHeader = (title: string) => {
    const compName = COMPANY_PROFILE.name || "ACOOLA TRIMS CORPORATION";
    const compWords = compName.split(/\s+/);
    const firstTwoWords = compWords.slice(0, 2).join(' ');
    const remainingWords = compWords.slice(2).join(' ');
    
    const firstColor = COMPANY_PROFILE.line1Color || COMPANY_PROFILE.firstColor || '#007D46';
    const secondColor = COMPANY_PROFILE.line2Color || COMPANY_PROFILE.secondColor || '#ed1c24';
    const tagline = COMPANY_PROFILE.tagline || 'All Kinds of Garments Accessories Manufacturer & Supplier';
    
    const showLogo = !!(COMPANY_PROFILE.logo && COMPANY_PROFILE.useLogoInHeader);

    return (
      /* MODE A/B: UNIFIED PREMIUM TEXT/GRAPHIC HEADER */
      <div 
         className="w-full font-sans text-left shrink-0"
        style={{
          '--line-1-color': firstColor,
          '--line-2-color': secondColor,
          marginTop: '0mm'
        } as React.CSSProperties}
      >
        <div style={{ height: '0.9in', display: 'flex', flexDirection: 'column', justifyContent: 'center' }} className="w-full relative">
          <div className="flex items-center w-full select-none font-sans" style={{ height: '100%' }}>
            {/* Logo */}
            {showLogo && (
              <div className="w-[0.9in] h-[0.9in] flex items-center justify-center bg-white shrink-0 overflow-hidden" style={{ marginRight: '2mm' }}>
                <img 
                  src={COMPANY_PROFILE.logo} 
                  alt="Company Logo" 
                  className="max-w-full max-h-full object-contain" 
                  referrerPolicy="no-referrer" 
                  crossOrigin="anonymous"
                />
              </div>
            )}
            
            {/* Banner Image or Text */}
            <div className="flex-1 flex items-center min-w-0" style={{ height: '0.9in' }}>
              {COMPANY_PROFILE.headerTitleImg ? (
                <img 
                  src={COMPANY_PROFILE.headerTitleImg} 
                  alt="Corporate Title Banner" 
                  className="h-full w-full block animate-fade-in" 
                  style={{ 
                    height: '0.9in', 
                    width: '100%', 
                    objectFit: 'fill',
                    display: 'block'
                  }}
                  referrerPolicy="no-referrer"
                  crossOrigin="anonymous"
                />
              ) : (
                /* Text block */
                <div className="text-left font-['Poppins'] min-w-0 w-full flex flex-col justify-center pl-1 font-sans" style={{ fontFamily: "'Poppins', sans-serif" }}>
                  <h1 className="font-extrabold uppercase text-[13pt] tracking-tight leading-none mb-1 text-slate-900">
                    <span style={{ color: firstColor }}>{firstTwoWords} </span>
                    <span style={{ color: secondColor }}>{remainingWords}</span>
                  </h1>
                  <p className="font-bold text-[7.5pt] text-slate-800 leading-snug">
                    {tagline}
                  </p>
                </div>
              )}
            </div>

            {/* Solid Line before QR Code */}
            <div className="w-[2px] h-[0.8in] shrink-0" style={{ marginLeft: '2mm', marginRight: '2mm', width: '2px', height: '0.8in', borderLeft: '2.5px solid #1e293b', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }} />

            {/* QR block */}
            <div className="border border-slate-900 p-0.5 bg-white flex items-center justify-center shrink-0 w-[0.8in] h-[0.8in]">
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(quoteNo)}`}
                alt="Quotation QR Code"
                className="w-full h-full object-contain animate-fade-in"
                referrerPolicy="no-referrer"
                crossOrigin="anonymous"
              />
            </div>
          </div>
        </div>

        {/* Thick Page-Wide Colored Dividing Lines */}
        <div className="ml-[-15mm] mr-[-15mm] flex flex-col gap-[2px] mt-1 select-none shrink-0 border-none bg-transparent">
          {COMPANY_PROFILE.line1Active && (
            <div className="w-full" style={{ height: '0px', borderTop: `3.5px solid ${firstColor}`, WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }} />
          )}
          {COMPANY_PROFILE.line2Active && (
            <div className="w-full" style={{ height: '0px', borderTop: `3.5px solid ${secondColor}`, WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }} />
          )}
        </div>

        {/* 2mm gap under the lines */}
        <div style={{ height: '2mm' }} className="w-full shrink-0" />

        {/* Centered Document Title */}
        <div className="text-center mt-0 mb-1.5 font-sans">
          <h2 className="lc-document-title-header text-[13pt] font-black uppercase text-slate-950 tracking-wider font-['Poppins'] inline-block border-b border-slate-955 pb-1 px-4" style={{ fontFamily: "'Poppins', sans-serif", borderBottomWidth: '1.25pt' }}>
            {title}
          </h2>
        </div>
      </div>
    );
  };

  const renderDocFooter = () => {
    if (COMPANY_PROFILE.useFooterImg && COMPANY_PROFILE.footerImg) {
      return (
        <div 
          className="w-full"
          style={{ 
            position: 'absolute', 
            bottom: '0px', 
            left: '0mm', 
            width: '210mm',
            overflow: 'hidden'
          }}
        >
          <img 
            src={COMPANY_PROFILE.footerImg} 
            alt="Corporate Footer" 
            className="w-full block object-contain"
            style={{ width: '210mm', height: 'auto', display: 'block' }}
          />
        </div>
      );
    }

    const firstColor = COMPANY_PROFILE.line1Color || COMPANY_PROFILE.firstColor || '#007D46';
    const officeAddr = COMPANY_PROFILE.addresses?.office || "House No-03, Road No-07, Block-C, Mirpur-13, Dhaka-1216, Bangladesh.";
    const factoryAddr = COMPANY_PROFILE.addresses?.factory || "135/5, Arambagh, Motijheel, Dhaka-1000, Bangladesh.";
    const emailStr = COMPANY_PROFILE.emails?.[0] || "acoolatrims@gmail.com";
    const phoneStr = COMPANY_PROFILE.phones?.[0] || "01778262909";

    return (
      <div 
        className="flex flex-col items-center justify-center text-center font-['Poppins'] select-all"
        style={{ 
          position: 'absolute', 
          bottom: '4mm', 
          left: '0mm', 
          width: '210mm',
          fontFamily: "'Poppins', sans-serif" 
        }}
      >
        <div className="w-full">
          {/* Page-Wide Edge-To-Edge Horizontal Line (No margins, width 210mm) */}
          <div className="w-full mb-2" style={{ height: '2px', minHeight: '2px', backgroundColor: firstColor, borderTop: `2px solid ${firstColor}`, WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact', width: '210mm' }} />
          
          <div className="w-full text-center text-slate-800 text-[8pt]" style={{ fontSize: '10pt' }}>
            <p className="font-bold tracking-tight" style={{ fontSize: '10pt' }}>Office: {officeAddr}</p>
            <p className="font-bold tracking-tight mt-0.5" style={{ fontSize: '10pt' }}>Factory: {factoryAddr}</p>
            <p className="font-bold mt-0.5 text-slate-900" style={{ fontSize: '10pt' }}>
              Email: {emailStr} | Phone: {phoneStr}
            </p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-4">
        <div>
          <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-1.5 leading-none">
            💰 Price Quotation &amp; Offer Sheet Generator
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Generate and print pristine pricing quotes for prospective apparel clients using synchronized corporate schemas.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canEdit && (
            <>
              <button
                type="button"
                onClick={handleStartFresh}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold uppercase tracking-wider rounded-lg shadow-xs cursor-pointer border border-slate-300"
              >
                <Plus className="w-3.5 h-3.5" /> Start New
              </button>
              <button
                type="button"
                onClick={handleSaveQuotation}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-750 hover:bg-emerald-700 text-white text-xs font-bold uppercase tracking-wider rounded-lg shadow-xs cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" /> {activeQuoteId ? "Update History" : "Save to History"}
              </button>
            </>
          )}
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-900 hover:bg-slate-850 text-white text-xs font-bold uppercase tracking-wider rounded-lg shadow cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" /> Print Quotation
          </button>
          <button
            type="button"
            onClick={handleExportPDF}
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#007D46] hover:bg-[#005c33] text-white text-xs font-bold uppercase tracking-wider rounded-lg shadow cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" /> Export PDF
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* Form Controls Sidebar Section */}
        <div className="xl:col-span-2 space-y-4 text-left">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs p-5 space-y-4">
            <h3 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider border-b pb-2">📦 Quotation Logistics Card</h3>
            
            <div className="grid grid-cols-2 gap-2 text-[11px] font-sans">
              <div className="space-y-0.5 col-span-1">
                <label className="block font-bold text-slate-650">Quotation Ref No</label>
                <input
                  type="text"
                  value={quoteNo}
                  onChange={(e) => setQuoteNo(e.target.value)}
                  disabled={!canEdit}
                  className="w-full bg-slate-50 border border-slate-250 rounded px-2 py-1 text-xs font-bold disabled:opacity-70"
                />
              </div>
              <div className="space-y-0.5 col-span-1">
                <label className="block font-bold text-slate-650">Quotation Date</label>
                <input
                  type="date"
                  value={quoteDate}
                  onChange={(e) => setQuoteDate(e.target.value)}
                  disabled={!canEdit}
                  className="w-full bg-slate-50 border border-slate-250 rounded px-2 py-1 text-xs disabled:opacity-70"
                />
              </div>
              <div className="space-y-0.5 col-span-2">
                <label className="block font-bold text-slate-650">Client Factory / Company Name</label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  disabled={!canEdit}
                  className="w-full bg-slate-50 border border-slate-250 rounded px-2 py-1 text-xs font-bold disabled:opacity-70"
                />
              </div>
              <div className="space-y-0.5 col-span-2">
                <label className="block font-bold text-slate-650">Registered Shipping / Factory Address</label>
                <textarea
                  value={clientAddress}
                  onChange={(e) => setClientAddress(e.target.value)}
                  disabled={!canEdit}
                  className="w-full bg-slate-50 border border-slate-250 rounded px-2 py-1 text-xs h-12 resize-none disabled:opacity-70"
                />
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs p-5 space-y-4">
            <h3 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider border-b pb-2">
              {canEdit ? "🛠️ Line Items Matrix Editor" : "🛠️ Line Items"}
            </h3>
            
            {canEdit ? (
              <div className="space-y-2 text-[11px] font-sans">
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2 space-y-0.5">
                  <label className="block font-bold text-slate-650">Item Name Description</label>
                  <input
                    type="text"
                    placeholder="e.g. Satin Printed Labels"
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    className="w-full bg-slate-50/70 border border-slate-250 rounded px-2 py-1.5 text-xs font-medium"
                  />
                </div>
                <div className="col-span-1 space-y-0.5">
                  <label className="block font-bold text-slate-650">Style / Ref No</label>
                  <input
                    type="text"
                    placeholder="Ref-001"
                    value={newItemStyle}
                    onChange={(e) => setNewItemStyle(e.target.value)}
                    className="w-full bg-slate-50/70 border border-slate-250 rounded px-2 py-1.5 text-xs font-mono font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-2">
                <div className="col-span-1 space-y-0.5">
                  <label className="block font-bold text-slate-650">Target Quantity</label>
                  <input
                    type="number"
                    value={newItemQty}
                    onChange={(e) => setNewItemQty(e.target.value)}
                    className="w-full bg-slate-50/70 border border-slate-250 rounded px-2 py-1.5 text-xs font-bold"
                  />
                </div>
                <div className="col-span-1 space-y-0.5">
                  <label className="block font-bold text-slate-650">Qty Unit</label>
                  <select
                    value={newItemUnit}
                    onChange={(e) => {
                      const val = e.target.value as QuoteUnitType;
                      setNewItemUnit(val);
                      setNewItemPriceUnit(val);
                    }}
                    className="w-full bg-white border border-slate-250 rounded px-2 py-1.5 text-xs"
                  >
                    <option value="Pcs">Pcs</option>
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
                <div className="col-span-1 space-y-0.5">
                  <label className="block font-bold text-slate-650">Unit Price ($)</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={newItemPrice}
                    onChange={(e) => setNewItemPrice(e.target.value)}
                    className="w-full bg-slate-50/70 border border-slate-250 rounded px-2 py-1.5 text-xs font-bold"
                  />
                </div>
                <div className="col-span-1 space-y-0.5">
                  <label className="block font-bold text-slate-650">Price Unit</label>
                  <select
                    value={newItemPriceUnit}
                    onChange={(e) => setNewItemPriceUnit(e.target.value as QuoteUnitType)}
                    className="w-full bg-white border border-[#007D46] rounded px-2 py-1.5 text-xs font-bold text-[#007D46]"
                  >
                    <option value="Pcs">Pcs</option>
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
              </div>

              {/* Item-wise Image Upload option */}
              <div className="bg-slate-50/50 border border-slate-150 rounded-lg p-2 flex items-center justify-between gap-3 text-[11px] font-sans mt-2">
                <div className="flex-1">
                  <span className="block font-bold text-slate-700">Item Picture/Sketch (ঐচ্ছিক ইমেজ)</span>
                  <span className="text-[9px] text-slate-400">Add custom image shown under style index</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    accept="image/*"
                    id="item-direct-file-upload"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        if (file.size > 1024 * 1024) {
                          alert("Please choose an image under 1MB.");
                          return;
                        }
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setNewItemImage(reader.result as string);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                  <label htmlFor="item-direct-file-upload" className="bg-white border border-slate-250 rounded px-2.5 py-1.5 font-bold hover:bg-slate-100 cursor-pointer text-xs flex items-center gap-1">
                    <Image className="w-3.5 h-3.5 text-indigo-500" />
                    <span>{newItemImage ? 'Change Image' : 'Choose Image'}</span>
                  </label>
                  {newItemImage && (
                    <div className="relative w-10 h-8 border border-slate-200 bg-white rounded overflow-hidden flex items-center justify-center shrink-0">
                      <img src={newItemImage} alt="item-preview" className="max-h-full max-w-full object-contain" />
                      <button
                        type="button"
                        onClick={() => setNewItemImage(null)}
                        className="absolute -top-0.5 -right-0.5 bg-red-600 text-white rounded-full w-3.5 h-3.5 leading-none flex items-center justify-center text-[7px] font-bold"
                      >
                        ×
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={handleAddItem}
                className={`w-full font-extrabold uppercase py-2 rounded-lg text-xs tracking-wider flex items-center justify-center gap-1 cursor-pointer mt-2 transition-all ${
                  editingItemId 
                    ? 'bg-amber-600 hover:bg-amber-750 text-white shadow-md' 
                    : 'bg-slate-900 hover:bg-slate-850 text-white'
                }`}
              >
                {editingItemId ? (
                  <>
                    <Check className="w-4 h-4" /> Update/Correct Item Line (আইটেম সংশোধন করুন)
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" /> Add Item Line
                  </>
                )}
              </button>
            </div>
          ) : null}

            <div className="border border-slate-150 rounded-lg max-h-48 overflow-y-auto divide-y divide-slate-100 bg-slate-50">
              {items.length === 0 ? (
                <p className="p-4 text-[11px] text-slate-400 font-medium text-center italic">No quotation line items added yet.</p>
              ) : (
                items.map((it) => (
                  <div key={it.id} className="p-2.5 flex items-center justify-between text-[11px] font-sans hover:bg-white transition-colors">
                    <div className="min-w-0 flex-1 pr-3 flex items-center gap-2">
                      {it.itemImage && (
                        <div className="w-8 h-8 border border-slate-200 rounded overflow-hidden bg-white shrink-0 flex items-center justify-center">
                          <img src={it.itemImage} alt="item thumbnail" className="max-h-full max-w-full object-contain" />
                        </div>
                      )}
                      <div>
                        <p className="font-extrabold text-slate-950 truncate">{it.itemName}</p>
                        <p className="text-[10px] text-slate-500 font-bold mt-0.5">
                          Style: {it.styleNumber} | {it.quantity.toLocaleString()} {it.unit} @ ${it.unitPrice.toFixed(4)} / {it.priceUnit || it.unit}
                          {it.priceUnit === 'Dzn' && it.unit === 'Pcs' && (
                            <span className="text-emerald-750 font-extrabold ml-1">✓ Pcs converted to Dzn for total: {(it.quantity / 12).toLocaleString(undefined, { maximumFractionDigits: 2 })} Dzn</span>
                          )}
                        </p>
                      </div>
                    </div>
                    {canEdit && (
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleEditItem(it)}
                          className="text-amber-600 hover:bg-amber-50 p-1.5 rounded-md cursor-pointer transition-colors"
                          title="Edit Item"
                        >
                          <FileText className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(it.id)}
                          className="text-red-600 hover:bg-red-50 p-1.5 rounded-md cursor-pointer transition-colors"
                          title="Delete Item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs p-5 space-y-3 text-[11px] font-sans">
            <h3 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider border-b pb-2">📄 Quotation Terms &amp; Policies</h3>
            
            <div className="space-y-2">
              <div className="space-y-0.5">
                <label className="block font-bold text-slate-650">Offer Validity</label>
                <input
                  type="text"
                  value={validity}
                  onChange={(e) => setValidity(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-250 rounded px-2 py-1 text-xs"
                />
              </div>
              <div className="space-y-0.5">
                <label className="block font-bold text-slate-650">Delivery Timeline</label>
                <input
                  type="text"
                  value={deliveryTerms}
                  onChange={(e) => setDeliveryTerms(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-250 rounded px-2 py-1 text-xs"
                />
              </div>
              <div className="space-y-0.5">
                <label className="block font-bold text-slate-650">Payment Terms</label>
                <input
                  type="text"
                  value={paymentTerms}
                  onChange={(e) => setPaymentTerms(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-250 rounded px-2 py-1 text-xs"
                />
              </div>
              <div className="space-y-0.5">
                <label className="block font-bold text-slate-650">Sales Sign-off Slogan / Rep Name</label>
                <input
                  type="text"
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-250 rounded px-2 py-1 text-xs"
                />
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs p-5 space-y-3 text-[11px] font-sans">
            <h3 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider border-b pb-2 flex items-center justify-between">
              <span>🖼️ Reference Image / Drawing</span>
              {quotationImage && (
                <button
                  type="button"
                  onClick={() => setQuotationImage(null)}
                  className="text-red-500 font-bold hover:underline bg-transparent border-0 cursor-pointer text-[9px] uppercase"
                >
                  Clear Image
                </button>
              )}
            </h3>
            
            <div className="space-y-2">
              <input
                type="file"
                accept="image/*"
                id="doc-quotation-image"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    if (file.size > 2 * 1024 * 1024) {
                      alert("Please choose a file under 2MB.");
                      return;
                    }
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      setQuotationImage(reader.result as string);
                    };
                    reader.readAsDataURL(file);
                  }
                }}
              />
              <label htmlFor="doc-quotation-image" className="w-full bg-slate-50 border border-slate-250 border-dashed rounded px-4 py-3 text-center cursor-pointer hover:bg-slate-100 flex flex-col items-center justify-center gap-1">
                <Image className="w-5 h-5 text-slate-500 animate-bounce" />
                <span className="font-extrabold text-slate-700 text-xs text-[11px]">Upload Quotation Image / Sketch</span>
                <span className="text-[9.5px] text-slate-400">Supports JPG, PNG up to 2MB</span>
              </label>
              {quotationImage && (
                <div className="border border-slate-200 rounded-lg overflow-hidden bg-slate-50 relative flex justify-center items-center h-28">
                  <img src={quotationImage} alt="Quotation preview" className="max-h-full max-w-full object-contain" />
                </div>
              )}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs p-5 space-y-3 text-[11px] font-sans">
            <h3 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider border-b pb-2 flex items-center justify-between">
              <span>✍️ Direct Signature / Seal</span>
              {customSignature && (
                <button
                  type="button"
                  onClick={() => setCustomSignature(null)}
                  className="text-red-500 font-bold hover:underline bg-transparent border-0 cursor-pointer text-[9px] uppercase"
                >
                  Clear Signature
                </button>
              )}
            </h3>
            
            <div className="space-y-2">
              <input
                type="file"
                accept="image/*"
                id="doc-custom-signature"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    if (file.size > 1024 * 1024) {
                      alert("Please choose a file under 1MB.");
                      return;
                    }
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      setCustomSignature(reader.result as string);
                    };
                    reader.readAsDataURL(file);
                  }
                }}
              />
              <label htmlFor="doc-custom-signature" className="w-full bg-slate-50 border border-slate-250 border-dashed rounded px-4 py-3 text-center cursor-pointer hover:bg-slate-100 flex flex-col items-center justify-center gap-1">
                <FileText className="w-5 h-5 text-pink-500" />
                <span className="font-extrabold text-slate-700 text-xs text-[11px]">Upload Direct Signature Image / Seal</span>
                <span className="text-[9.5px] text-slate-400">Transparent PNG is recommended (under 1MB)</span>
              </label>
              {customSignature && (
                <div className="border border-slate-200 rounded-lg overflow-hidden bg-slate-50 relative flex justify-center items-center h-16">
                  <img src={customSignature} alt="Signature preview" className="max-h-full max-w-full object-contain mix-blend-multiply" />
                </div>
              )}
            </div>
          </div>

          {/* 🌐 Website Price Quotation Requests */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs p-5 space-y-3 text-[11px] font-sans text-left">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                🌐 Website Quotation Requests
              </h3>
              <span className="bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded-full text-[9px] font-black">
                {websiteRequests.filter(r => r.status === 'Pending Review').length} Pending
              </span>
            </div>
            
            <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 space-y-1">
              {websiteRequests.filter(r => r.status !== 'Price Quoted').length === 0 ? (
                <p className="py-6 text-center text-slate-400 italic">No pending inquiries from website.</p>
              ) : (
                websiteRequests.filter(r => r.status !== 'Price Quoted').map((req) => {
                  const isCurrentInquiryActive = activeWebInquiryId === req.id;
                  return (
                    <div 
                      key={req.id}
                      className={`p-2.5 rounded-lg border transition-all flex flex-col gap-1.5 text-[10.5px] ${
                        isCurrentInquiryActive 
                          ? 'border-indigo-505 bg-indigo-50/40 shadow-xs' 
                          : 'border-slate-100 hover:border-slate-250 bg-slate-50/10'
                      }`}
                    >
                      <div className="flex justify-between items-start gap-1">
                        <div className="min-w-0 flex-1">
                          <p className="font-extrabold text-indigo-950 font-sans text-[11px] truncate">{req.itemName}</p>
                          <span className="text-[8.5px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-bold uppercase font-mono">{req.category || 'General'}</span>
                        </div>
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase shrink-0 ${
                          req.status === 'Price Quoted' 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {req.status === 'Price Quoted' ? 'Quoted' : 'Pending'}
                        </span>
                      </div>
                      
                      <div className="text-[9.5px] font-medium text-slate-600">
                        <p className="truncate"><strong className="text-slate-800">Email:</strong> {req.clientEmail}</p>
                        <p className="mt-0.5"><strong className="text-slate-800">QTY Needed:</strong> {req.quantity?.toLocaleString() || '10,000'} Pcs</p>
                        {req.specDetails && (
                          <p className="text-[9px] bg-slate-50 p-1.5 rounded mt-1 border border-slate-100 text-slate-500 italic max-h-12 overflow-y-auto select-none">
                            "{req.specDetails}"
                          </p>
                        )}
                      </div>

                      <div className="flex justify-between items-center mt-1 border-t pt-2 border-slate-100/70">
                        <span className="text-[8.5px] font-semibold text-slate-400 font-mono">{req.date || new Date().toISOString().substring(0, 10)}</span>
                        {req.status !== 'Price Quoted' ? (
                          <button
                            type="button"
                            onClick={() => handleLoadWebInquiry(req)}
                            className="px-2 py-1 text-[9.5px] font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded shadow-xs cursor-pointer flex items-center gap-1 uppercase tracking-wider"
                          >
                            <span>⚡ Build &amp; Issue</span>
                          </button>
                        ) : (
                          <span className="text-[9px] font-bold text-emerald-600 flex items-center gap-0.5">
                            ✓ Quote Issued
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* 📜 Saved Quotations History Card */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xs p-5 space-y-3 text-[11px] font-sans">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                📜 Saved Quotations History
              </h3>
              <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded-full text-[9px] font-black">
                {savedQuotes.length}
              </span>
            </div>
            
            <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 space-y-1">
              {savedQuotes.length === 0 ? (
                <p className="py-6 text-center text-slate-400 italic">No saved quotations in history yet.</p>
              ) : (
                savedQuotes.map((q) => {
                  const isActive = activeQuoteId === q.id;
                  return (
                    <div 
                      key={q.id}
                      onClick={() => handleLoadQuotation(q)}
                      className={`p-2.5 rounded-lg border transition-all cursor-pointer flex items-center justify-between gap-2 text-[10.5px] ${
                        isActive 
                          ? 'border-emerald-500 bg-emerald-50/40 shadow-xs' 
                          : 'border-slate-100 hover:border-slate-350 hover:bg-slate-50/50'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-black text-slate-950 font-mono text-[11px]">{q.quoteNo}</span>
                          <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-bold">{q.quoteDate}</span>
                        </div>
                        <p className="font-bold text-slate-700 truncate mt-1">{q.clientName || "Unnamed Client"}</p>
                        <p className="text-[9.5px] font-medium text-slate-500 mt-0.5 flex items-center gap-1">
                          <span>{q.items?.length || 0} items</span>
                          <span>•</span>
                          <span className="text-emerald-700 font-bold">FOB ${parseFloat(q.totalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => handleLoadQuotation(q)}
                          className="px-2 py-1 text-[10px] font-black uppercase text-emerald-800 bg-emerald-50 border border-emerald-200 rounded hover:bg-emerald-100 transition-all cursor-pointer"
                          title={canEdit ? "Load and Edit this draft" : "Load Preview"}
                        >
                          {canEdit ? "Edit" : "View"}
                        </button>
                        {canEdit && (
                          <button
                            type="button"
                            onClick={(e) => handleDeleteSavedQuote(e, q.id)}
                            className="p-1.5 rounded text-red-600 hover:bg-red-50 hover:text-red-700 cursor-pointer transition-all"
                            title="Delete from history"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Live A4 Sheet Preview Section */}
        <div className="xl:col-span-3 flex justify-center text-left">
          <div className="bg-slate-200 border border-slate-350 p-4 md:p-8 rounded-2xl flex justify-center overflow-x-auto min-h-[90vh] w-full">
            {/* A4 Sheet Container */}
            <div 
              id="price-quotation-a4-preview"
              ref={printTargetRef}
              className="w-[210mm] h-[297mm] bg-white text-slate-900 pt-[2mm] px-[15mm] pb-[15mm] border border-neutral-300 shadow-xl relative text-left box-border flex flex-col justify-between font-sans leading-relaxed text-xs overflow-hidden select-text shrink-0"
              style={{ fontFamily: '"Poppins", sans-serif', width: '210mm', height: '297mm', position: 'relative' }}
            >
              <style>{`
                #price-quotation-a4-preview *:not(.lc-document-title-header):not(.lc-company-logo-img):not(.lc-qr-code-img):not(button):not(svg):not(path) {
                  font-size: 8.5pt !important;
                }
                #price-quotation-a4-preview table tr {
                  height: 4mm !important;
                }
                #price-quotation-a4-preview table tr td,
                #price-quotation-a4-preview table tr th {
                  height: 4mm !important;
                  padding-top: 0.5mm !important;
                  padding-bottom: 0.5mm !important;
                  line-height: 1.2 !important;
                }
              `}</style>
              <div>
                {/* Dynamic Unified Header Block */}
                {renderDocHeader("PRICE QUOTATION")}

                {/* Logistics Registry Information */}
                <div className="grid grid-cols-2 gap-4 text-[10.5px] font-sans border-b border-slate-100 pb-3 mb-4 leading-normal">
                  <div>
                    <p className="text-slate-500 font-bold uppercase tracking-wider text-[8px] mb-1">Quotation Issued For:</p>
                    <p className="font-extrabold text-slate-950 text-[11px]">{clientName}</p>
                    <p className="text-slate-600 font-medium mt-0.5">{clientAddress}</p>
                  </div>
                  <div className="text-right flex flex-col justify-end">
                    <p><strong>Quotation Ref:</strong> <span className="font-bold text-slate-950 font-mono">{quoteNo}</span></p>
                    <p className="mt-0.5"><strong>Issue Date:</strong> {quoteDate}</p>
                    <p className="mt-0.5"><strong>Validity Term:</strong> <span className="text-red-700 font-bold">{validity}</span></p>
                  </div>
                </div>

                {/* Standard Apparel Trim pricing quotation message */}
                <p className="text-[10.5px] leading-relaxed text-slate-750 font-sans mb-4">
                  We are pleased to submit our most competitive price quotation with details of specifications for high-quality garment trim sewing accessories, labels, and components manufactured in Bangladesh as requested:
                </p>

                {/* Line Item Table Rendering */}
                <table className="w-full text-left text-[10.5px] border-collapse font-sans">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-300 font-extrabold text-[#007D46] uppercase tracking-wider text-[9.5px]">
                      <th className="py-2.5 px-3">S/N</th>
                      <th className="py-2.5 px-2">Detailed Item Specifications</th>
                      <th className="py-2.5 px-2 text-center" style={{ width: '45px' }}>Image</th>
                      <th className="py-2.5 px-2">Style / Ref</th>
                      <th className="py-2.5 px-2 text-right">Target FOB Qty</th>
                      <th className="py-2.5 px-2 text-right">Unit Price</th>
                      <th className="py-2.5 px-3 text-right">Quoted FOB Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-750">
                    {items.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-6 px-3 text-center text-slate-400 italic font-medium">No quotation items declared inside matrix.</td>
                      </tr>
                    ) : (
                      items.map((it, idx) => (
                        <tr key={it.id} className="hover:bg-slate-50/50 font-semibold text-slate-800">
                          <td className="py-2 px-3 font-bold text-slate-500">{idx + 1}</td>
                          <td className="py-2 px-2 font-extrabold text-slate-950">{it.itemName}</td>
                          <td className="py-1 px-2 text-center">
                            {it.itemImage ? (
                              <div className="w-8 h-8 mx-auto border border-slate-150 rounded bg-white overflow-hidden flex items-center justify-center shrink-0">
                                <img src={it.itemImage} alt="item-ref" className="max-h-full max-w-full object-contain shrink-0" />
                              </div>
                            ) : (
                              <span className="text-[9px] text-slate-300">—</span>
                            )}
                          </td>
                          <td className="py-2 px-2 font-mono text-slate-500">{it.styleNumber}</td>
                          <td className="py-2 px-2 text-right font-black text-slate-900">{it.quantity.toLocaleString()} {it.unit}</td>
                          <td className="py-2 px-2 text-right font-mono">${it.unitPrice.toFixed(4)} / {it.priceUnit || it.unit}</td>
                          <td className="py-2 px-3 text-right font-black text-slate-950">${calculateItemTotal(it).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        </tr>
                      ))
                    )}
                    <tr className="bg-slate-50 font-black text-slate-900 border-t border-slate-300 text-[11px]">
                      <td colSpan={6} className="py-2.5 px-3 uppercase tracking-tight">CUMULATIVE NET FOB VALUE (USD):</td>
                      <td className="py-2.5 px-3 text-right text-emerald-800 font-extrabold" style={{ color: firstColor }}>
                        ${totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* Optional Uploaded Quotation Sketch */}
                {quotationImage && (
                  <div className="mt-4 border border-slate-200/60 rounded-xl p-2 bg-slate-55/40 flex items-center justify-center max-h-28 overflow-hidden mb-4 shrink-0 shadow-xs">
                    <img src={quotationImage} alt="Reference Specification Drawing" className="max-h-24 max-w-full object-contain mix-blend-multiply" />
                  </div>
                )}

                {/* Additional commercial / payment policies */}
                <div className="mt-4 border border-slate-150 rounded-xl p-2.5 bg-slate-50/50 space-y-1 text-[9.5px] text-slate-750 leading-relaxed font-sans mb-4">
                  <p className="font-extrabold uppercase text-[7.5px] text-slate-500 tracking-wider mb-1">🏷️ Commercial Terms &amp; Guidelines</p>
                  <p><strong>01. Basis of Price:</strong> FOB Dhaka, Net unit rate currency in U.S. Dollars (USD).</p>
                  <p><strong>02. Delivery Lead:</strong> {deliveryTerms}</p>
                  <p><strong>03. Payment Mechanism:</strong> {paymentTerms}</p>
                  <p><strong>04. Tax Excludes:</strong> {vatTaxStr}</p>
                </div>

                {/* Signature Panel */}
                <div className="grid grid-cols-2 gap-4 pt-3 mt-3 text-[10px] font-sans">
                  <div className="text-left font-medium text-slate-600">
                    <p className="font-bold text-slate-900">Buyer Acceptance Seal:</p>
                    <div className="h-8 border-b border-dashed border-slate-300 w-36 mt-3"></div>
                    <p className="mt-1 text-[9.5px]">Authorized Purchase Seal &amp; Signature</p>
                  </div>
                  <div className="text-right font-medium text-slate-600 flex flex-col items-end">
                    <p className="font-bold text-slate-900">For {COMPANY_PROFILE.name}:</p>
                    <div 
                      className="h-10 mt-2 flex flex-col justify-end items-end relative w-48 cursor-pointer hover:opacity-80 transition-opacity"
                      title="Click to upload custom signature/seal"
                      onClick={() => document.getElementById('doc-custom-signature')?.click()}
                    >
                      {customSignature ? (
                        <img 
                          src={customSignature} 
                          alt="Signature Seal" 
                          className="h-8 max-w-full object-contain mix-blend-multiply mr-4" 
                        />
                      ) : sessionUser?.signatureUrl ? (
                        <img 
                          src={sessionUser.signatureUrl} 
                          alt="Signature Seal" 
                          className="h-8 max-w-full object-contain mix-blend-multiply mr-4" 
                        />
                      ) : (
                        <p className="font-mono text-[10px] font-black italic tracking-wider text-slate-850 border-b border-slate-350 px-2 leading-none pb-0.5" style={{ color: firstColor }}>
                          {sessionUser?.name || contactPerson || COMPANY_PROFILE.ownerName || "Shakhawat Salim"}
                        </p>
                      )}
                    </div>
                    {(customSignature || sessionUser?.signatureUrl) && (
                      <div className="border-t border-slate-200 w-48 mt-1"></div>
                    )}
                    <p className="mt-1 font-bold text-slate-950 text-[10px]">
                      {sessionUser?.name || contactPerson || COMPANY_PROFILE.ownerName || "Shakhawat Salim"}
                    </p>
                    <p className="text-[9px] text-slate-500 leading-tight">
                      {sessionUser?.designation || "Marketing & Apparel Logistics Coordinator"} {sessionUser?.department ? `| ${sessionUser.department}` : ''}
                    </p>
                  </div>
                </div>
              </div>

              {/* Dynamic Unified Footer Block */}
              {renderDocFooter()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
