import React, { useState, useEffect, useMemo } from 'react';
import { ProformaInvoice } from '../types';
import { COMPANY_PROFILE } from '../data';
import { jsPDF } from 'jspdf';
// @ts-ignore
import html2pdf from 'html2pdf.js';
import html2canvas, { withSafeColorContext } from '../lib/safeHtml2Canvas';
import { 
  Printer, 
  FileText, 
  Check, 
  Sparkles, 
  HelpCircle, 
  Grid, 
  Layers, 
  DollarSign, 
  Scale, 
  Truck, 
  RefreshCw, 
  Globe, 
  FileSignature, 
  Landmark, 
  BookOpen,
  Download,
  AlertCircle,
  Search,
  Eye,
  Edit3
} from 'lucide-react';

interface LcDocumentGeneratorProps {
  pis: ProformaInvoice[];
  initialHistory?: LcHistoryEntry[];
  onHistoryChange?: (history: LcHistoryEntry[]) => void;
  canEdit?: boolean;
}

interface LcAmendment {
  id: string;
  amendmentDate: string;
  amendedClauses: string;
  updatedAmount: number;
}

interface LcHistoryEntry {
  id: string;
  lcNo: string;
  piNo: string;
  generationDateTime: string;
  beneficiaryName: string;
  totalAmount: number;
  currency: string;
  packData: LcDocumentPack;
  amendments: LcAmendment[];
}

interface LcDocumentPack {
  lcNo: string;
  lcDate: string;
  lcBankName: string;
  lcBranch: string;
  lcAddress: string;
  exportScNo: string;
  exportScDate: string;
  hsCode: string;
  truckNo: string;
  truckChallanNo: string;
  totalPackages: string;
  grossWeight: string;
  netWeight: string;
  driverName: string;
  selectedPiNo: string;
  totalAmount: number;
  currency: string;
  lcTerms: string;
  applicantIrc?: string;
  applicantVat?: string;
  issuingBankBin?: string;
  beneficiaryBin?: string;
  
  // Custom edited copy for each document to provide "editable after creating"
  billOfExchange1Text: string;
  billOfExchange2Text: string;
  deliveryChallanText: string;
  packingListText: string;
  commercialInvoiceText: string;
  weightMeasurementText: string;
  beneficiaryCertText: string;
  certificateOfOriginText: string;
  purchaseAppText: string;
  truckChallanText: string;
  inspectionCertText: string;
  docDate: string;
  docFontSize?: string;
  docRowHeight?: string;
}

export default function LcDocumentGenerator({ pis, initialHistory, onHistoryChange, canEdit = true }: LcDocumentGeneratorProps) {
  // Helper to format/truncate styles to max 3 items
  const formatStyleListLc = (styleString: string) => {
    if (!styleString) return '';
    const styleList = styleString.split(',').map(s => s.trim()).filter(Boolean);
    if (styleList.length <= 3) return styleList.join(', ');
    return `${styleList.slice(0, 3).join(', ')}, (...)`;
  };

  // Input states
  const [lcNo, setLcNo] = useState('ATC-LC-2026-9921');
  const [lcDate, setLcDate] = useState(new Date().toISOString().substring(0, 10));
  const [defaultDocDate, setDefaultDocDate] = useState(new Date().toISOString().substring(0, 10));
  const [lcBankName, setLcBankName] = useState('Eastern Bank PLC');
  const [lcBranch, setLcBranch] = useState('Principal Branch, Dilkusha C/A');
  const [lcAddress, setLcAddress] = useState('Dilkusha C/A, Dhaka-1000, Bangladesh');
  const [exportScNo, setExportScNo] = useState('SC-ATC-RE-7811');
  const [exportScDate, setExportScDate] = useState(new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10));
  const [selectedPiId, setSelectedPiId] = useState('');
  
  // Custom manual override amount option
  const [customLcAmount, setCustomLcAmount] = useState<string>('');
  const [lcTerms, setLcTerms] = useState<string>('120 DAYS SIGHT');
  const [hsCode, setHsCode] = useState<string>('6217.10.00');

  // Dynamic fields for Bill of Exchange
  const [applicantIrc, setApplicantIrc] = useState('IRC-BD-48921');
  const [applicantVat, setApplicantVat] = useState('VAT-9912034');
  const [issuingBankBin, setIssuingBankBin] = useState('BIN-00129384');
  const [beneficiaryBin, setBeneficiaryBin] = useState(COMPANY_PROFILE.bin || '002903407-0202');
  const [lcCompanyName, setLcCompanyName] = useState('');
  const [lcCompanyAddress, setLcCompanyAddress] = useState('');

  // Logistics info states
  const [truckNo, setTruckNo] = useState('Dhaka Metro GA-4982');
  const [truckChallanNo, setTruckChallanNo] = useState('TC-99831');
  const [driverName, setDriverName] = useState('Md. Zaman');
  const [truckRent, setTruckRent] = useState('12500');
  const [totalPackages, setTotalPackages] = useState('15 Cartons');
  const [grossWeight, setGrossWeight] = useState('245.00 Kgs');
  const [netWeight, setNetWeight] = useState('215.00 Kgs');
  const [truckChallanHeader, setTruckChallanHeader] = useState('');

  // Currently generated active document pack
  const [activePack, setActivePack] = useState<LcDocumentPack | null>(null);
  const [activePackId, setActivePackId] = useState<string | null>(null);
  const [lcWorkspaceMode, setLcWorkspaceMode] = useState<'preview' | 'edit'>('preview');
  const [activeDocTab, setActiveDocTab] = useState<number>(1); // 1 to 11
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Selector configs for toggling 'Freight Prepaid' and 'The goods received in good condition' across documents
  const [freightDocs, setFreightDocs] = useState<Record<string, boolean>>({
    delivery: true,
    packing: true,
    invoice: true,
    weight: true,
    truck: true,
  });
  const [freightColor, setFreightColor] = useState<string>('#2563eb'); // Default Blue

  const [goodsReceivedDocs, setGoodsReceivedDocs] = useState<Record<string, boolean>>({
    delivery: true,
    packing: true,
    invoice: true,
    weight: true,
    truck: true,
  });
  const [goodsReceivedColor, setGoodsReceivedColor] = useState<string>('#16a34a'); // Default Green

  const [printWithHeader, setPrintWithHeader] = useState<boolean>(true);
  const [printWithFooter, setPrintWithFooter] = useState<boolean>(true);
  const [printWithWatermark, setPrintWithWatermark] = useState<boolean>(true);

  const [docFontSize, setDocFontSize] = useState<string>('9.5pt');
  const [docRowHeight, setDocRowHeight] = useState<string>('4.5mm');

  const formatDateToDDMMYYYY = (dateVal: any): string => {
    if (!dateVal) return 'N/A';
    if (typeof dateVal === 'string' && /^\d{2}[7pt]\d{2}[7pt]\d{4}$/.test(dateVal.trim())) {
      return dateVal.trim();
    }
    try {
      const cleanStr = String(dateVal).trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(cleanStr)) {
        const parts = cleanStr.split('-');
        return `${parts[2]}.${parts[1]}.${parts[0]}`;
      }
      if (cleanStr.includes('/')) {
        const slashParts = cleanStr.split('/');
        if (slashParts.length === 3) {
          if (slashParts[0].length === 4) {
            return `${slashParts[2].padStart(2, '0')}.${slashParts[1].padStart(2, '0')}.${slashParts[0]}`;
          }
          return `${slashParts[0].padStart(2, '0')}.${slashParts[1].padStart(2, '0')}.${slashParts[2]}`;
        }
      }
      const d = new Date(dateVal);
      if (!isNaN(d.getTime())) {
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return `${day}.${month}.${year}`;
      }
    } catch (e) {
      console.error("Error formatting date", e);
    }
    const finalStr = String(dateVal).trim();
    return finalStr.replace(/[\/\-]/g, '.');
  };

  const renderDocumentSubHeader = (docNo: number, isPrint: boolean = false) => {
    if (!selectedPi || !activePack) return null;

    // Remove subheader for Bill of Exchange (1, 2), Beneficiary Certificate (7), Certificate of Origin (8), Inspection Certificate (11)
    if (docNo === 1 || docNo === 2 || docNo === 7 || docNo === 8 || docNo === 11) {
      return null;
    }

    const generationDateStr = formatDateToDDMMYYYY(activePack?.docDate || new Date().toISOString().substring(0, 10));
    
    const factoryAddr = selectedPi.factoryAddress || 'N/A';
    const buyer = selectedPi.buyerName || 'N/A';
    
    return (
      <div 
        className="grid grid-cols-2 gap-4 text-[9pt] font-semibold bg-transparent select-all mb-4"
        style={{ fontFamily: "'Roboto', sans-serif" }}
      >
        {/* Left Side */}
        <div className="space-y-0.5 text-left min-w-0">
          {/* Line 1: Factory Name */}
          <div className="text-[10pt] font-black text-slate-950 uppercase tracking-tight break-words">
            {selectedPi.factoryName}
          </div>
          {/* Line 2 & 3: Factory Address */}
          <div className="text-[9pt] text-slate-600 font-medium leading-tight uppercase break-words overflow-visible">
            {factoryAddr}
          </div>
          {/* Line 4: LC NO & Date */}
          <div className="text-[9pt] text-slate-805 font-medium border-t border-slate-200/60 pt-0.5 uppercase tracking-wide">
            L/C NO: <strong className="font-extrabold text-slate-950">{activePack.lcNo || 'N/A'}</strong> &amp; DATE: <strong className="font-extrabold text-slate-950">{formatDateToDDMMYYYY(activePack.lcDate) || 'N/A'}</strong>
          </div>
          {/* Line 5: HS CODE */}
          <div className="text-[9pt] text-slate-805 font-medium uppercase tracking-wide">
            HS CODE: <strong className="font-extrabold text-slate-950">{activePack.hsCode || '6217.10.00'}</strong>
          </div>
        </div>
        
        {/* Right Side */}
        <div className="space-y-0.5 text-right min-w-0">
          {/* Line 1: Document Generation Date */}
          <div className="text-[10pt] font-medium text-slate-600 uppercase tracking-tight break-words">
            DATE: <strong className="font-extrabold text-slate-950">{generationDateStr}</strong>
          </div>
          {/* Line 2: Buyer */}
          <div className="text-[9pt] text-slate-600 font-medium uppercase tracking-tight break-words">
            BUYER: <strong className="font-extrabold text-slate-950">{buyer}</strong>
          </div>
          {/* Line 3: PI NO */}
          <div className="text-[9pt] text-slate-600 font-medium uppercase tracking-tight break-words">
            PI NO: <strong className="font-extrabold text-slate-950">{selectedPi.invoiceNo}</strong>
          </div>
          {/* Line 4: PI Date */}
          <div className="text-[9pt] text-slate-850 font-medium border-t border-slate-250/60 pt-0.5 uppercase tracking-wide">
            PI DATE: <strong className="font-extrabold text-slate-950">{formatDateToDDMMYYYY(selectedPi.date)}</strong>
          </div>
        </div>
      </div>
    );
  };

  const renderWatermarkInColumn = (docKey: 'delivery' | 'packing' | 'invoice' | 'weight' | 'truck') => {
    const showFreight = freightDocs[docKey];
    const showGoodsObj = goodsReceivedDocs[docKey];
    if (!showFreight && !showGoodsObj) return null;

    return (
      <div className="mt-4 pt-3 border-t border-slate-200/80 font-sans text-center flex flex-col items-center justify-center gap-1.5 select-none overflow-hidden">
        {showFreight && (
          <div 
            className="text-[9pt] uppercase font-black px-1.5 py-0.5 rounded leading-none w-fit shrink-0 select-none print:opacity-80 font-sans"
            style={{ 
              transform: 'rotate(-4deg)', 
              display: 'inline-block',
              fontWeight: 900,
              opacity: 0.8,
              fontFamily: "'Roboto', sans-serif",
              color: freightColor,
              borderColor: `${freightColor}66`,
              borderStyle: 'solid',
              borderWidth: '1px'
            }}
          >
            Freight Prepaid
          </div>
        )}
        {showGoodsObj && (
          <div 
            className="text-[8pt] uppercase font-black px-1.5 py-0.5 rounded leading-none w-fit shrink-0 select-none print:opacity-80 mt-1 font-sans"
            style={{ 
              transform: 'rotate(-2deg)', 
              display: 'inline-block',
              fontWeight: 900,
              opacity: 0.8,
              fontFamily: "'Roboto', sans-serif",
              color: goodsReceivedColor,
              borderColor: `${goodsReceivedColor}66`,
              borderStyle: 'solid',
              borderWidth: '1px'
            }}
          >
            The goods received in good condition
          </div>
        )}
      </div>
    );
  };

  const renderStyleAndPoColumn = (watermarkKey?: 'delivery' | 'packing' | 'invoice' | 'weight' | 'truck') => {
    return (
      <td rowSpan={consolidatedItems.length} className="py-1 px-2 border border-slate-300 bg-white font-mono align-top w-[200px]" style={{ fontSize: '8pt', width: '200px' }}>
        <div className="space-y-1.5">
          <div>
            <span className="text-[8pt] uppercase font-bold text-slate-505 block leading-none mb-0.5" style={{ fontSize: '8pt' }}>STYLE / REF:</span>
            <div className="font-extrabold text-slate-905 flex flex-wrap gap-1 leading-tight">
              {allUniqueStylesForLc.length > 0 ? (
                allUniqueStylesForLc.map((style, stIdx) => (
                  <span key={stIdx} className="bg-slate-105 border border-slate-200 text-slate-800 px-1 rounded-sm text-[8pt] font-semibold" style={{ fontSize: '8pt' }}>{style}</span>
                ))
              ) : (
                <span className="text-slate-450 italic font-sans font-normal" style={{ fontSize: '8pt' }}>N/A</span>
              )}
            </div>
          </div>
          {allUniquePOsForLc.length > 0 && (
            <div className="pt-1.5 border-t border-slate-205">
              <span className="text-[8pt] uppercase font-bold text-slate-505 block leading-none mb-0.5" style={{ fontSize: '8pt' }}>PO NUMBER:</span>
              <div className="font-extrabold text-slate-905 flex flex-wrap gap-1 leading-tight">
                {allUniquePOsForLc.map((po, poIdx) => (
                  <span key={poIdx} className="bg-slate-50 border border-slate-200 text-slate-855 px-1 rounded-sm text-[8pt] font-semibold" style={{ fontSize: '8pt' }}>{po}</span>
                ))}
              </div>
            </div>
          )}
          {watermarkKey && renderWatermarkInColumn(watermarkKey)}
        </div>
      </td>
    );
  };

  // Generation & Amendment history states
  const [localHistory, setLocalHistory] = useState<LcHistoryEntry[]>([]);
  const generationHistory = initialHistory !== undefined ? initialHistory : localHistory;
  
  const setGenerationHistory = (valOrFn: any) => {
    let next: LcHistoryEntry[];
    if (typeof valOrFn === 'function') {
      next = valOrFn(generationHistory);
    } else {
      next = valOrFn;
    }
    if (onHistoryChange) {
      onHistoryChange(next);
    } else {
      setLocalHistory(next);
    }
  };

  const [historySearchQuery, setHistorySearchQuery] = useState('');

  const currentAmendments = useMemo(() => {
    if (!activePack) return [];
    const entity = generationHistory.find(h => h.lcNo === activePack.lcNo);
    return entity ? entity.amendments || [] : [];
  }, [activePack, generationHistory]);

  const filteredHistory = useMemo(() => {
    return generationHistory.filter(item => {
      const q = historySearchQuery.toLowerCase();
      return item.lcNo.toLowerCase().includes(q) || item.piNo.toLowerCase().includes(q);
    });
  }, [generationHistory, historySearchQuery]);

  // Amendment input states
  const [amendClauseInput, setAmendClauseInput] = useState('');
  const [amendAmountInput, setAmendAmountInput] = useState('');
  const [amendDateInput, setAmendDateInput] = useState(new Date().toISOString().substring(0, 10));

  useEffect(() => {
    if (initialHistory !== undefined) return;
    try {
      const stored = localStorage.getItem('lc_generation_history');
      if (stored) {
        const parsed = JSON.parse(stored) as LcHistoryEntry[];
        // Sanitize first, and automatically migrate old cached Delivery Challan text formats to have full LC info dynamically
        const withIds = parsed.map((item, idx) => {
          let updatedPack = item.packData ? { ...item.packData } : null;
          if (updatedPack && updatedPack.deliveryChallanText && !updatedPack.deliveryChallanText.includes('LC NO:')) {
            const piInvoiceNo = updatedPack.selectedPiNo || item.piNo;
            const correspondingPi = pis.find(p => p.invoiceNo === piInvoiceNo);
            const refDate = correspondingPi?.date || '';
            const lcNoVal = updatedPack.lcNo || '';
            const lcDateVal = updatedPack.lcDate || '';
            const lcBankNameVal = updatedPack.lcBankName || '';
            const lcBranchVal = updatedPack.lcBranch || '';
            const lcAddressVal = updatedPack.lcAddress || '';
            const exportScNoVal = updatedPack.exportScNo || '';
            const exportScDateVal = updatedPack.exportScDate || '';
            updatedPack.deliveryChallanText = `The goods detailed below have been delivered in sound merchantable condition to the factory site on account of PI No: **${piInvoiceNo}**, Dated :**${formatDateToDDMMYYYY(refDate)}**. LC NO: **${lcNoVal}**, Dated :**${formatDateToDDMMYYYY(lcDateVal)}**. Drawn Under **${lcBankNameVal.toUpperCase()}**, ${lcBranchVal}, ADDRESS: ${lcAddressVal}. Export SC No: **${exportScNoVal}** Dated :**${formatDateToDDMMYYYY(exportScDateVal)}**. All goods are received properly with good condition. Please receive and acknowledge under seal.`;
          }
          return {
            ...item,
            id: item.id || `gen-${Date.now()}-${idx}`,
            packData: updatedPack || item.packData
          };
        });
        setGenerationHistory(updatedEntries => {
          // Compare objects to avoid unnecessary state transitions
          if (JSON.stringify(updatedEntries) !== JSON.stringify(withIds)) {
            return withIds;
          }
          return updatedEntries;
        });
      }
    } catch (e) {
      console.error("Error reading LC generation history:", e);
    }
  }, [pis]);

  const saveHistory = (updated: LcHistoryEntry[]) => {
    setGenerationHistory(updated);
    try {
      localStorage.setItem('lc_generation_history', JSON.stringify(updated));
    } catch (e) {
      console.error("Error saving LC generation history:", e);
    }
  };

  const updatePackField = (field: keyof LcDocumentPack, value: any) => {
    if (!activePack) return;
    const updatedPack = {
      ...activePack,
      [field]: value
    };
    setActivePack(updatedPack);

    // Sync back to history list
    const updatedHistory = generationHistory.map(h => {
      if (h.id === activePackId || h.lcNo === activePack.lcNo) {
        return {
          ...h,
          packData: updatedPack,
          lcNo: field === 'lcNo' ? value : h.lcNo
        };
      }
      return h;
    });
    saveHistory(updatedHistory);
  };

  const getFormattedCurrentDate = (): string => {
    const d = new Date();
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  };

  // Quick select PI
  const selectedPi = useMemo(() => {
    return pis.find(p => p.id === selectedPiId) || null;
  }, [pis, selectedPiId]);

  useEffect(() => {
    if (selectedPi) {
      setLcCompanyName(selectedPi.factoryName || '');
      setLcCompanyAddress(selectedPi.factoryAddress || '');
    }
  }, [selectedPi]);

  // Consolidated items (similar grouping style to PI)
  const consolidatedItems = useMemo(() => {
    if (!selectedPi) return [];
    const groupMap = new Map<string, {
      id: string; itemName: string; styleNumber: string; poNumber: string;
      unit: string; unitPrice: number; totalQuantity: number; details: string;
      sizes: { size: string; quantity: number }[];
    }>();

    selectedPi.items.forEach(item => {
      const key = `${item.itemName}||${item.unit}`;
      if (groupMap.has(key)) {
        const existing = groupMap.get(key)!;
        existing.totalQuantity = Math.round((existing.totalQuantity + item.totalQuantity) * 1e10) / 1e10;
        if (item.styleNumber && !existing.styleNumber.includes(item.styleNumber)) {
          existing.styleNumber = [existing.styleNumber, item.styleNumber].filter(Boolean).join(', ');
        }
        if (item.poNumber && !existing.poNumber.includes(item.poNumber)) {
          existing.poNumber = [existing.poNumber, item.poNumber].filter(Boolean).join(', ');
        }
        if (item.sizes && item.sizes.length > 0) {
          item.sizes.forEach(s => {
            const ex = existing.sizes.find(e => e.size === s.size);
            if (ex) { ex.quantity += s.quantity; } else { existing.sizes.push({ size: s.size, quantity: s.quantity }); }
          });
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
          details: item.details || '',
          sizes: item.sizes ? [...item.sizes] : []
        });
      }
    });

    return Array.from(groupMap.values());
  }, [selectedPi]);

  const allUniqueStylesForLc = useMemo(() => {
    if (!selectedPi) return [];
    return Array.from(
      new Set(
        (selectedPi.items || [])
          .map(i => i.styleNumber)
          .filter(Boolean)
          .flatMap(s => s.split(',').map(sub => sub.trim()).filter(Boolean))
      )
    );
  }, [selectedPi]);

  const allUniquePOsForLc = useMemo(() => {
    if (!selectedPi) return [];
    return Array.from(
      new Set(
        (selectedPi.items || [])
          .map(i => i.poNumber)
          .filter(Boolean)
          .flatMap(p => p.split(',').map(sub => sub.trim()).filter(Boolean))
      )
    );
  }, [selectedPi]);

  // Pre-fill fields when PI changes
  useEffect(() => {
    if (selectedPi) {
      // Prioritize the PI's own weight specifications if they exist and are non-empty/valid
      const piNet = selectedPi.netWeight && selectedPi.netWeight !== 'N/A' && selectedPi.netWeight !== '' ? selectedPi.netWeight : '';
      const piGross = selectedPi.grossWeight && selectedPi.grossWeight !== 'N/A' && selectedPi.grossWeight !== '' ? selectedPi.grossWeight : '';

      // Programmatically calculate total weights fallback
      const piTotalUSD = selectedPi.items.reduce((sum, item) => sum + (item.totalQuantity * item.unitPrice), 0);
      const calcNetFallback = piTotalUSD / 5.37;
      const calcGrossFallback = calcNetFallback * 1.12;

      if (piNet) {
        setNetWeight(piNet.includes('Kgs') || piNet.toLowerCase().includes('kg') ? piNet : `${piNet} Kgs`);
      } else {
        setNetWeight(`${calcNetFallback.toFixed(2)} Kgs`);
      }

      if (piGross) {
        setGrossWeight(piGross.includes('Kgs') || piGross.toLowerCase().includes('kg') ? piGross : `${piGross} Kgs`);
      } else {
        setGrossWeight(`${calcGrossFallback.toFixed(2)} Kgs`);
      }
      
      const calculatedCartons = selectedPi.items.reduce((sum, item) => sum + getItemCartonQty(item.itemName, item.totalQuantity, item.unit), 0);
      setTotalPackages(`${calculatedCartons} Cartons`);
    }
  }, [selectedPi]);

  // Number to Words function (in USD)
  const numberToWords = (num: number): string => {
    const a = ['', 'one ', 'two ', 'three ', 'four ', 'five ', 'six ', 'seven ', 'eight ', 'nine ', 'ten ', 'eleven ', 'twelve ', 'thirteen ', 'fourteen ', 'fifteen ', 'sixteen ', 'seventeen ', 'eighteen ', 'nineteen '];
    const b = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

    const numString = num.toFixed(2);

    // handle decimals
    const parts = numString.split('.');
    const integerValue = parseInt(parts[0], 10);
    const decimalValue = parseInt(parts[1], 10);

    const helper = (n: number): string => {
      if (n < 20) return a[n];
      if (n < 100) return b[Math.floor(n / 10)] + ' ' + a[n % 10];
      if (n < 1000) return a[Math.floor(n / 100)] + 'hundred ' + (n % 100 !== 0 ? 'and ' + helper(n % 100) : '');
      if (n < 1000000) return helper(Math.floor(n / 1000)) + 'thousand ' + (n % 1000 !== 0 ? ' ' + helper(n % 1000) : '');
      return helper(Math.floor(n / 1000000)) + 'million ' + (n % 1000000 !== 0 ? ' ' + helper(n % 1000000) : '');
    };

    let words = helper(integerValue).trim();
    if (words === '') words = 'zero';

    let finalStr = words + ' US Dollars';
    if (decimalValue > 0) {
      const decWords = helper(decimalValue).trim();
      finalStr += ' and ' + decWords + ' Cents';
    } else {
      finalStr += ' Only';
    }

    return finalStr.toUpperCase();
  };

  const calculatePiTotal = (pi: ProformaInvoice) => {
    const total = pi.items.reduce((sum, item) => sum + (item.totalQuantity * item.unitPrice), 0);
    return Math.round(total * 100) / 100;
  };

  const currentComputedTotal = useMemo(() => {
    if (customLcAmount) {
      const parsed = parseFloat(customLcAmount);
      return isNaN(parsed) ? 0 : parsed;
    }
    return selectedPi ? calculatePiTotal(selectedPi) : 0;
  }, [selectedPi, customLcAmount]);

  const handleCreateDocumentsPack = () => {
    if (!selectedPi) {
      alert('Please select a Proforma Invoice (PI) first!');
      return;
    }

    const piTotal = Math.round(currentComputedTotal * 100) / 100;
    const moneyInWords = numberToWords(piTotal);

    const piNet = netWeight.toLowerCase().includes('kg') ? netWeight : `${netWeight} Kgs`;
    const piGross = grossWeight.toLowerCase().includes('kg') ? grossWeight : `${grossWeight} Kgs`;
    const piPackages = `${computedTotalCartons} Cartons`;

    // Advanced dynamic bank data mapping helpers
    const piBankName = selectedPi.bankDetails?.bankName || 'SHAHJALAL ISLAMI BANK LIMITED';
    const piBankBranch = selectedPi.bankDetails?.branch || 'ESKATON BRANCH';
    const piBankAddress = selectedPi.bankDetails?.address || 'ESKATON FANTASIA (1ST FLOOR) 122-123, NEW ESKTON ROAD, RAMNA, DHAKA-1000, BANGLADESH';
    const piAccountName = selectedPi.bankDetails?.accountName || COMPANY_PROFILE.name || 'ACOOLA TRIMS CORPORATION';
    const piAccountNo = selectedPi.bankDetails?.accountNo || 'N/A';

    const lcCompanyNameVal = lcCompanyName || selectedPi.factoryName;
    const lcCompanyAddressVal = lcCompanyAddress || selectedPi.factoryAddress || '';

    // Initial default contents for all 10 documents representing reference requirements mapped dynamically
    const defaultPack: LcDocumentPack = {
      lcNo,
      lcDate,
      lcBankName,
      lcBranch,
      lcAddress,
      exportScNo,
      exportScDate,
      hsCode,
      truckNo,
      truckChallanNo,
      totalPackages: piPackages,
      grossWeight: piGross,
      netWeight: piNet,
      driverName,
      selectedPiNo: selectedPi.invoiceNo,
      totalAmount: piTotal,
      currency: 'USD',
      lcTerms,
      applicantIrc,
      applicantVat,
      issuingBankBin,
      beneficiaryBin,
      docFontSize,
      docRowHeight,

      billOfExchange1Text: `**${COMPANY_PROFILE.name.toUpperCase()}**

EXCHANGE FOR $ ${piTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}

DRAWN UNDER **${lcBankName.toUpperCase()}**, ${lcBranch.toUpperCase()}, ADDRESS: ${lcAddress.toUpperCase()}, **${lcTerms.toUpperCase()}** OF **THIS FIRST** OF EXCHANGE (SECOND OF THE SAME TENOR AND DATE BEING UNPAID) PAY TO THE ORDER OF **${piBankName.toUpperCase()}**, ${piBankBranch.toUpperCase()}, ADDRESS: ${piBankAddress.toUpperCase()}. THE SUM OF SAY U.S DOLLARS: **${moneyInWords.toUpperCase()}**

LC NO: **${lcNo}**, DATED : ${formatDateToDDMMYYYY(lcDate)}
EXPORT S/C NO. **${exportScNo}**, DATED :${formatDateToDDMMYYYY(exportScDate)}

Value received against **${COMPANY_PROFILE.companyItems.toUpperCase()}** goods and charges the same to the account of ${lcCompanyNameVal}, ${lcCompanyAddressVal}. Goods are of Bangladesh Origin under H.S. Code No. **${hsCode}**

Applicant’s IRC No. **${applicantIrc}**, and Applicant’s VAT No.  **${applicantVat}**. Issuing Bank’s BIN No.  **${issuingBankBin}** and Beneficiary BIN No. **${beneficiaryBin}**

To,
**${lcBankName.toUpperCase()}**
${lcBranch.toUpperCase()}
${lcAddress.toUpperCase()}`,
      
      billOfExchange2Text: `**${COMPANY_PROFILE.name.toUpperCase()}**

EXCHANGE FOR $ ${piTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}

DRAWN UNDER **${lcBankName.toUpperCase()}**, ${lcBranch.toUpperCase()}, ADDRESS: ${lcAddress.toUpperCase()}, **${lcTerms.toUpperCase()}** OF **THIS SECOND** OF EXCHANGE (FIRST OF THE SAME TENOR AND DATE BEING UNPAID) PAY TO THE ORDER OF **${piBankName.toUpperCase()}**, ${piBankBranch.toUpperCase()}, ADDRESS: ${piBankAddress.toUpperCase()}. THE SUM OF SAY U.S DOLLARS: **${moneyInWords.toUpperCase()}**

LC NO: **${lcNo}**, DATED : ${formatDateToDDMMYYYY(lcDate)}
EXPORT S/C NO. **${exportScNo}**, DATED :${formatDateToDDMMYYYY(exportScDate)}

Value received against **${COMPANY_PROFILE.companyItems.toUpperCase()}** goods and charges the same to the account of ${lcCompanyNameVal}, ${lcCompanyAddressVal}. Goods are of Bangladesh Origin under H.S. Code No. **${hsCode}**

Applicant’s IRC No. **${applicantIrc}**, and Applicant’s VAT No.  **${applicantVat}**. Issuing Bank’s BIN No.  **${issuingBankBin}** and Beneficiary BIN No. **${beneficiaryBin}**

To,
**${lcBankName.toUpperCase()}**
${lcBranch.toUpperCase()}
${lcAddress.toUpperCase()}`,
      
      deliveryChallanText: `The goods detailed below have been delivered in sound merchantable condition to the factory site on account of PI No: **${selectedPi.invoiceNo}**, Dated :**${formatDateToDDMMYYYY(selectedPi.date)}**. LC NO: **${lcNo}**, Dated :**${formatDateToDDMMYYYY(lcDate)}**. Drawn Under **${lcBankName.toUpperCase()}**, ${lcBranch}, ADDRESS: ${lcAddress}. Export SC No: **${exportScNo}** Dated :**${formatDateToDDMMYYYY(exportScDate)}**. All goods are received properly with good condition. Please receive and acknowledge under seal.`,
      
      packingListText: `LC NO: **${lcNo}**, Dated :**${formatDateToDDMMYYYY(lcDate)}**. Drawn Under **${lcBankName.toUpperCase()}**, ${lcBranch}, ADDRESS: ${lcAddress}. Export SC No: **${exportScNo}** Dated :**${formatDateToDDMMYYYY(exportScDate)}**. All goods are received properly with good condition.`,
      
      commercialInvoiceText: `LC NO: **${lcNo}**, Dated :**${formatDateToDDMMYYYY(lcDate)}**. Drawn Under **${lcBankName.toUpperCase()}**, ${lcBranch}, ADDRESS: ${lcAddress}. Export SC No: **${exportScNo}** Dated :**${formatDateToDDMMYYYY(exportScDate)}**. All goods are received properly with good condition.`,
      
      weightMeasurementText: `LC NO: **${lcNo}**, Dated :**${formatDateToDDMMYYYY(lcDate)}**. Drawn Under **${lcBankName.toUpperCase()}**, ${lcBranch}, ADDRESS: ${lcAddress}. Export SC No: **${exportScNo}** Dated :**${formatDateToDDMMYYYY(exportScDate)}**. All goods are received properly with good condition.`,
      
      beneficiaryCertText: `We hereby certify that the shipment consists of ${COMPANY_PROFILE.companyItems} Goods supplied as per our Proforma Invoice No. ${selectedPi.invoiceNo} Dated ${formatDateToDDMMYYYY(selectedPi.date)}, established against L/C No. ${lcNo} Dated ${formatDateToDDMMYYYY(lcDate)}, under Export Sales Contract No. ${exportScNo} Dated ${formatDateToDDMMYYYY(exportScDate)}, for the account of ${selectedPi.factoryName}, Address: ${selectedPi.factoryAddress || ''}, under HS Code ${hsCode || '6217.10.00'}.

We further certify that the goods have been supplied in accordance with the terms and conditions of the above-mentioned Proforma Invoice, L/C, and Export Sales Contract.

We have Certificate that the merchandise is of Bangladesh Origin.

All information stated herein is true and correct to the best of our knowledge and belief.`,
      
      certificateOfOriginText: `We hereby certify that the shipment consists of ${COMPANY_PROFILE.companyItems} Goods supplied as per our Proforma Invoice No. ${selectedPi.invoiceNo} Dated ${formatDateToDDMMYYYY(selectedPi.date)}, established against L/C No. ${lcNo} Dated ${formatDateToDDMMYYYY(lcDate)}, under Export Sales Contract No. ${exportScNo} Dated ${formatDateToDDMMYYYY(exportScDate)}, for the account of ${selectedPi.factoryName}, Address: ${selectedPi.factoryAddress || ''}, under HS Code ${hsCode || '6217.10.00'}.

We have Certificate that the merchandise is of Bangladesh Origin.

This certificate is issued at the request of the beneficiary for presentation to the concerned parties and authorities.`,
      
      purchaseAppText: `Dear Sir,
Please Negotiation/purchase against L/C No. and others information are given below :

L/C Opening Bank   : ${lcBankName.toUpperCase()}
Branch             : ${lcBranch.toUpperCase()}
Address            : ${lcAddress.toUpperCase()}
BTB L/C NO & DATE  : ${lcNo} DATE ${lcDate}
L/C VALUE          : USD $${piTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
A/C Name           : ${piAccountName.toUpperCase()}
A/C NO             : ${piAccountNo.toUpperCase()}
Purchase Amount    : 90%

Please arrange to negotiate above bill with the L/C Opening Bank.
Please take necessary action from your end.

Best Regards




${COMPANY_PROFILE.ownerName}`,
      
      truckChallanText: `Land consignment delivery challan representing transport of goods by Covered Van No: ${truckNo} from ${COMPANY_PROFILE.name} industrial factory point to applicant's premises.`,
      inspectionCertText: `We hereby certify that the shipment consists of ${COMPANY_PROFILE.companyItems} Goods supplied as per our Proforma Invoice No. ${selectedPi.invoiceNo} Dated ${formatDateToDDMMYYYY(selectedPi.date)}, established against L/C No. ${lcNo} Dated ${formatDateToDDMMYYYY(lcDate)}, under Export Sales Contract No. ${exportScNo} Dated ${formatDateToDDMMYYYY(exportScDate)}, for the account of ${selectedPi.factoryName}, Address: ${selectedPi.factoryAddress || ''}, under HS Code ${hsCode || '6217.10.00'}.

We further certify that the goods have been supplied in accordance with the terms and conditions of the above-mentioned Proforma Invoice, L/C, and Export Sales Contract.

We have Certificate that the merchandise is of Bangladesh Origin.

All information stated herein is true and correct to the best of our knowledge and belief.`,
      docDate: defaultDocDate || new Date().toISOString().substring(0, 10)
    };

    // Save generation metadata into persistent memory (logs)
    const existingEntry = generationHistory.find(h => h.lcNo === lcNo);
    const savedAmendments = existingEntry ? existingEntry.amendments : [];
    
    const newEntry: LcHistoryEntry = {
      id: existingEntry ? existingEntry.id : `gen-${Date.now()}`,
      lcNo,
      piNo: selectedPi.invoiceNo,
      generationDateTime: `${new Date().toLocaleTimeString()} ${getFormattedCurrentDate()}`,
      beneficiaryName: COMPANY_PROFILE.name,
      totalAmount: piTotal,
      currency: 'USD',
      packData: defaultPack,
      amendments: savedAmendments
    };

    let updatedHistory;
    if (existingEntry) {
      updatedHistory = generationHistory.map(h => h.id === existingEntry.id ? newEntry : h);
    } else {
      updatedHistory = [newEntry, ...generationHistory];
    }
    saveHistory(updatedHistory);

    setActivePackId(newEntry.id);
    setActivePack(defaultPack);
    setLcWorkspaceMode('preview');
    setActiveDocTab(1); // Open Bill of Exchange 1st copy by default
  };

  const getDynamicFileName = (docTitle: string): string => {
    if (!activePack) return '';
    const amtStr = activePack.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return `LC NO - ${activePack.lcNo} PI NO - ${activePack.selectedPiNo} AMOUNT - USD $${amtStr} ${docTitle}`;
  };

  const handlePrintCurrentDoc = () => {
    if (!activePack) return;
    const sheetId = `lc-print-sheet-${activeDocTab}`;
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
        @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700;900&display=swap');
        * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        body { margin: 0 !important; padding: 0 !important; background-color: #ffffff; color: #171717; font-family: 'Roboto', sans-serif !important; }
        [id^="lc-print-sheet-"] {
          display: flex !important; flex-direction: column !important; justify-content: space-between !important;
          width: 210mm !important; height: 297mm !important;
          padding-top: 5mm !important;
          padding-left: 15mm !important;
          padding-right: 15mm !important;
          padding-bottom: 15mm !important;
          box-sizing: border-box !important;
          position: relative !important;
          background-color: #ffffff !important;
          border: none !important; box-shadow: none !important;
          overflow: hidden !important;
        }
        [id^="lc-print-sheet-"] * { 
          visibility: visible !important; 
          font-family: 'Roboto', sans-serif !important; 
          text-transform: uppercase !important;
        }
        [id^="lc-print-sheet-"] *:not(.lc-document-title-header):not(.truck-challan-title):not(.lc-company-logo-img):not(.lc-qr-code-img):not(button):not(svg):not(path) {
          font-size: ${currentFontSize} !important;
        }
        .lc-doc-large-text,
        .lc-doc-large-text *,
        [id^="pdf-page-"] .lc-doc-large-text,
        [id^="pdf-page-"] .lc-doc-large-text *,
        [id^="lc-print-sheet-"] .lc-doc-large-text,
        [id^="lc-print-sheet-"] .lc-doc-large-text * {
          font-size: calc(${currentFontSize} + 1.5pt) !important;
        }
        .truck-challan-title {
          font-size: 24pt !important;
          font-weight: 900 !important;
          white-space: nowrap !important;
          letter-spacing: -0.04em !important;
        }
        [id^="lc-print-sheet-"] table tr {
          height: ${currentRowHeight} !important;
        }
        [id^="lc-print-sheet-"] table tr td,
        [id^="lc-print-sheet-"] table tr th {
          height: ${currentRowHeight} !important;
          padding-top: 0.1mm !important;
          padding-bottom: 0.1mm !important;
          line-height: 1.1 !important;
        }
        @page { size: A4 portrait; margin: 0mm; }
      </style>
    `;

    const currentTabTitle = documentTabs.find(t => t.index === activeDocTab)?.title || 'DOCUMENT';
    printWindow.document.write(`
      <html>
        <head>
          <title>${getDynamicFileName(currentTabTitle.toUpperCase())}</title>
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

  // High-fidelity Combined PDF export library mapping
  const handleDownloadPdfPack = async () => {
    if (!activePack) return;
    setIsExporting(true);

    const anchor = document.getElementById('lc-pdf-export-anchor') as HTMLElement | null;

    let originalStyles: { [key: string]: string } = {};
    let childOriginalStyles: { el: HTMLElement; style: string }[] = [];

    // Temporarily bring off-screen container on-screen and set absolute pixel dimensions
    if (anchor) {
      originalStyles = {
        position: anchor.style.position,
        left: anchor.style.left,
        top: anchor.style.top,
        width: anchor.style.width,
        zIndex: anchor.style.zIndex,
        pointerEvents: anchor.style.pointerEvents,
      };

      anchor.style.position = 'fixed';
      anchor.style.left = '0px';
      anchor.style.top = '0px';
      anchor.style.width = '794px';
      anchor.style.zIndex = '9999';
      anchor.style.pointerEvents = 'none';

      // Set fixed styles on all nested pages to prevent any responsive collapsing
      const pages = anchor.querySelectorAll('[id^="pdf-page-"]');
      pages.forEach((p: any) => {
        childOriginalStyles.push({
          el: p,
          style: p.getAttribute('style') || '',
        });
        p.style.setProperty('width', '793.7px', 'important');
        p.style.setProperty('height', '1122.5px', 'important');
        p.style.setProperty('min-width', '793.7px', 'important');
        p.style.setProperty('min-height', '1122.5px', 'important');
        p.style.setProperty('max-width', '793.7px', 'important');
        p.style.setProperty('max-height', '1122.5px', 'important');
        p.style.setProperty('padding-top', '4mm', 'important');
        p.style.setProperty('padding-left', '15mm', 'important');
        p.style.setProperty('padding-right', '15mm', 'important');
        p.style.setProperty('padding-bottom', '15mm', 'important');
        p.style.setProperty('box-sizing', 'border-box', 'important');
        p.style.setProperty('overflow', 'hidden', 'important');
      });
    }

    // Allow browser to do layout pass before capturing
    await new Promise<void>(r => setTimeout(r, 600));

    try {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true
      });

      for (let pIdx = 1; pIdx <= 11; pIdx++) {
        const pageEl = document.getElementById(`pdf-page-${pIdx}`);
        if (!pageEl) {
          console.warn(`Could not find element pdf-page-${pIdx}`);
          continue;
        }

        // Capture page using safe html2canvas with viewport lock properties matching the original aspect ratio
        const canvas = await withSafeColorContext(() => 
          html2canvas(pageEl, {
            scale: 2.5,             // Ensures high-resolution for SVG logos and text banner
            useCORS: true,
            logging: false,
            windowWidth: 794,    // Match the exact width for layout rendering
            scrollX: 0,
            scrollY: 0
          })
        );

        const imgData = canvas.toDataURL('image/jpeg', 0.98);
        
        if (pIdx > 1) {
          pdf.addPage();
        }
        
        pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
      }

      pdf.save(`${getDynamicFileName('COMPLETE PACK')}.pdf`);
    } catch (error: any) {
      console.error("PDF generation error:", error);
      alert(`Error occurred while generating combined PDF: ${error?.message || error}. Please try again.`);
    } finally {
      // Restore hidden off-screen position and original styles
      if (anchor) {
        anchor.style.position = originalStyles.position || 'fixed';
        anchor.style.left = originalStyles.left || '-9999px';
        anchor.style.top = originalStyles.top || '0px';
        anchor.style.width = originalStyles.width || '210mm';
        anchor.style.zIndex = originalStyles.zIndex || '-1';
        anchor.style.pointerEvents = originalStyles.pointerEvents || 'none';

        childOriginalStyles.forEach((item) => {
          if (item.style) {
            item.el.setAttribute('style', item.style);
          } else {
            item.el.removeAttribute('style');
          }
        });
      }
      setIsExporting(false);
    }
  };

  const updateDocText = (tabIndex: number, text: string) => {
    if (!activePack) return;
    const mapping: Record<number, keyof LcDocumentPack> = {
      1: 'billOfExchange1Text',
      2: 'billOfExchange2Text',
      3: 'deliveryChallanText',
      4: 'packingListText',
      5: 'commercialInvoiceText',
      6: 'weightMeasurementText',
      7: 'beneficiaryCertText',
      8: 'certificateOfOriginText',
      9: 'purchaseAppText',
      10: 'truckChallanText',
      11: 'inspectionCertText'
    };
    
    const fieldKey = mapping[tabIndex];
    if (fieldKey) {
      const updatedPack = {
        ...activePack,
        [fieldKey]: text
      };
      setActivePack(updatedPack);

      // Save updated pack into history to trigger automatic Firestore/localStorage sync
      const updatedHistory = generationHistory.map(h => {
        if (h.id === activePackId || h.lcNo === activePack.lcNo) {
          return {
            ...h,
            packData: updatedPack
          };
        }
        return h;
      });
      saveHistory(updatedHistory);
    }
  };

  const getDocVal = (tabIndex: number): string => {
    if (!activePack) return '';
    const mapping: Record<number, keyof LcDocumentPack> = {
      1: 'billOfExchange1Text',
      2: 'billOfExchange2Text',
      3: 'deliveryChallanText',
      4: 'packingListText',
      5: 'commercialInvoiceText',
      6: 'weightMeasurementText',
      7: 'beneficiaryCertText',
      8: 'certificateOfOriginText',
      9: 'purchaseAppText',
      10: 'truckChallanText',
      11: 'inspectionCertText'
    };
    return (activePack[mapping[tabIndex]] as string) || '';
  };

  const documentTabs = [
    { index: 1, title: 'Bill of Exchange 1st', icon: <DollarSign className="w-3.5 h-3.5 text-rose-500" /> },
    { index: 2, title: 'Bill of Exchange 2nd', icon: <DollarSign className="w-3.5 h-3.5 text-red-500" /> },
    { index: 3, title: 'Delivery Challan', icon: <Truck className="w-3.5 h-3.5 text-emerald-500" /> },
    { index: 4, title: 'Packing/Cartons List', icon: <Layers className="w-3.5 h-3.5 text-amber-500" /> },
    { index: 5, title: 'Commercial Invoice', icon: <FileText className="w-3.5 h-3.5 text-indigo-500" /> },
    { index: 6, title: 'Weight & Measurements List', icon: <Scale className="w-3.5 h-3.5 text-pink-500" /> },
    { index: 7, title: 'Beneficiary Certificate', icon: <FileSignature className="w-3.5 h-3.5 text-purple-500" /> },
    { index: 8, title: 'Certificate of Origin', icon: <Globe className="w-3.5 h-3.5 text-teal-500" /> },
    { index: 9, title: 'Purchase Application', icon: <Landmark className="w-3.5 h-3.5 text-violet-500" /> },
    { index: 10, title: 'Truck Air Challan', icon: <Truck className="w-3.5 h-3.5 text-rose-500" /> },
    { index: 11, title: 'Inspection Certificate', icon: <FileSignature className="w-3.5 h-3.5 text-purple-500" /> },
  ];

  // Dynamic formatting / scaling logic variables derived typesafely to fit single-page limits
  const itemCount = selectedPi?.items?.length || 1;
  const isCompact = itemCount > 5;
  const dynamicTextSize = 'text-[8.5pt]';
  const dynamicHeadingSize = isCompact ? 'text-[9pt]' : 'text-[10pt]';
  const dynamicPadding = isCompact ? (itemCount > 10 ? 'py-1 px-1.5' : 'py-1.5 px-2.5') : 'py-2 px-3';
  const dynamicSpacing = isCompact ? (itemCount > 10 ? 'space-y-0.5' : 'space-y-2') : 'space-y-3';

  const renderFormattedDocText = (text: string) => {
    if (!text) return '';
    let temp = text;
    temp = temp
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    // Dynamic Markdown Bold Support
    temp = temp.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Dynamic Markdown Italic Support
    temp = temp.replace(/\*(.*?)\*/g, '<em>$1</em>');

    const terms: string[] = [];
    if (activePack) {
      if (activePack.lcNo) terms.push(activePack.lcNo);
      if (activePack.lcNo) terms.push(activePack.lcNo.toUpperCase());
      if (activePack.lcDate) terms.push(activePack.lcDate);
      if (activePack.exportScNo) terms.push(activePack.exportScNo);
      if (activePack.exportScNo) terms.push(activePack.exportScNo.toUpperCase());
      if (activePack.exportScDate) terms.push(activePack.exportScDate);
      if (activePack.lcBankName) terms.push(activePack.lcBankName);
      if (activePack.lcBankName) terms.push(activePack.lcBankName.toUpperCase());
      if (activePack.lcBranch) terms.push(activePack.lcBranch);
      if (activePack.lcBranch) terms.push(activePack.lcBranch.toUpperCase());
      if (activePack.lcAddress) terms.push(activePack.lcAddress);
      if (activePack.lcAddress) terms.push(activePack.lcAddress.toUpperCase());
      if (activePack.truckNo) terms.push(activePack.truckNo);
      if (activePack.driverName) terms.push(activePack.driverName);
      if (activePack.sealId) terms.push(activePack.sealId);
      if (activePack.lcAccountNo) terms.push(activePack.lcAccountNo);
      if (activePack.lcAccountName) terms.push(activePack.lcAccountName);
      if (activePack.lcRoutingNo) terms.push(activePack.lcRoutingNo);
      if (activePack.totalAmount) {
        terms.push(activePack.totalAmount.toString());
        terms.push(activePack.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 }));
      }
    }
    if (selectedPi) {
      if (selectedPi.invoiceNo) terms.push(selectedPi.invoiceNo);
      if (selectedPi.date) {
        terms.push(selectedPi.date);
        terms.push(formatDateToDDMMYYYY(selectedPi.date));
      }
      if (selectedPi.factoryName) terms.push(selectedPi.factoryName);
      if (selectedPi.factoryAddress) terms.push(selectedPi.factoryAddress);
      if (selectedPi.buyerName) terms.push(selectedPi.buyerName);
    }
    if (activePack) {
      if (activePack.lcDate) terms.push(formatDateToDDMMYYYY(activePack.lcDate));
      if (activePack.exportScDate) terms.push(formatDateToDDMMYYYY(activePack.exportScDate));
    }
    if (COMPANY_PROFILE.name) terms.push(COMPANY_PROFILE.name);
    if (COMPANY_PROFILE.bin) terms.push(COMPANY_PROFILE.bin);
    if (COMPANY_PROFILE.tin) terms.push(COMPANY_PROFILE.tin);
    if (COMPANY_PROFILE.ownerName) terms.push(COMPANY_PROFILE.ownerName);
    if (COMPANY_PROFILE.companyItems) {
      terms.push(COMPANY_PROFILE.companyItems);
      terms.push(COMPANY_PROFILE.companyItems.toUpperCase());
    }

    const uniqueTerms = Array.from(new Set(terms.filter(t => t && t.trim().length > 2)));
    uniqueTerms.sort((a, b) => b.length - a.length);

    const genericLabels = [
      "LC NO:", "LC DATE:", "PI NO:", "PI DATE:", "EXPORT S/C NO:", "EXPORT SC NO:", "EXPORT S/C NO.",
      "DRAWN UNDER", "SUM OF SAY", "VALUE RECEIVED", "BTB L/C NO & DATE", "BTB L/C NO &amp; DATE", "Establishment Against LC No."
    ];

    const acTerms = ["A/C Name:", "A/C NO:", "Account Name:", "Account No:"];

    // Highlight helper to only replace plain text parts outside HTML tags
    const parts = temp.split(/(<[^>]+>)/g);
    const highlightedParts = parts.map(part => {
      if (part.startsWith('<') && part.endsWith('>')) {
        return part; // keep HTML tags intact
      }
      let textPart = part;
      
      // Highlight unique terms with lookbehind/lookahead to prevent partial word breaking
      for (const term of uniqueTerms) {
        const escaped = term.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        const regex = new RegExp(`(?<![a-zA-Z0-9<>/])(${escaped})(?![a-zA-Z0-9<>/])`, 'gi');
        textPart = textPart.replace(regex, '<strong>$1</strong>');
      }

      // Highlight generic labels
      for (const label of genericLabels) {
        const escaped = label.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        const regex = new RegExp(`(?<![a-zA-Z0-9<>/])(${escaped})(?![a-zA-Z0-9<>/])`, 'gi');
        textPart = textPart.replace(regex, '<strong>$1</strong>');
      }

      // Highlight acTerms
      for (const ac of acTerms) {
        const escaped = ac.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        const regex = new RegExp(`(?<![a-zA-Z0-9<>/])(${escaped})(?![a-zA-Z0-9<>/])`, 'gi');
        textPart = textPart.replace(regex, '<strong>$1</strong>');
      }
      return textPart;
    });

    temp = highlightedParts.join('');

    // Pre-process lines to align and structure colon-separated key-value details in Purchase Application and other docs
    const lines = temp.split('\n');
    const processedLines = lines.map(line => {
      const colonIndex = line.indexOf(':');
      if (colonIndex > -1) {
        const keyPart = line.substring(0, colonIndex);
        const valuePart = line.substring(colonIndex + 1);
        const cleanKey = keyPart.replace(/<[^>]+>/g, '').trim();
        const normalized = cleanKey.toLowerCase().replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
        
        const targetKeys = [
          'l/c opening bank',
          'branch',
          'address',
          'btb l/c no & date',
          'btb l/c no &amp; date',
          'l/c value',
          'a/c name',
          'a/c no',
          'purchase amount'
        ];
        
        if (targetKeys.includes(normalized)) {
          const displayKey = keyPart.trim();
          const displayValue = valuePart.trim();
          return `<div style="display: flex; align-items: flex-start; margin-bottom: 2px; font-family: 'Roboto', sans-serif;"><span style="display: inline-block; width: 155px; font-weight: bold; flex-shrink: 0; text-transform: uppercase;">${displayKey}</span><span style="display: inline-block; width: 15px; font-weight: bold; flex-shrink: 0; text-align: center;">:</span><span style="flex-grow: 1; text-transform: uppercase;">${displayValue}</span></div>`;
        }
      }
      return line;
    });

    // Join lines carefully to prevent double newlines next to block-level flex divs
    let finalHtml = '';
    for (let i = 0; i < processedLines.length; i++) {
      const current = processedLines[i];
      const next = processedLines[i + 1];
      finalHtml += current;
      if (next !== undefined) {
        if (current.includes('display: flex;') || next.includes('display: flex;')) {
          // No literal newline since block-level divs stack naturally
        } else {
          finalHtml += '\n';
        }
      }
    }

    return <div dangerouslySetInnerHTML={{ __html: finalHtml }} className="whitespace-pre-wrap select-text text-[10pt]" style={{ fontSize: '10pt' }} />;
  };

  // Programmatic item-wise and quantity-wise weight calculations
  const calculateItemNetWeight = (item: any) => {
    let factor = 0.015;
    const u = item.unit?.toLowerCase() || 'pcs';
    if (u === 'pcs') factor = 0.012;
    else if (u === 'dzn') factor = 0.144;
    else if (u === 'set') factor = 0.025;
    else if (u === 'yds') factor = 0.035;
    else if (u === 'roll') factor = 1.85;
    return item.totalQuantity * factor;
  };

  const calculateItemGrossWeight = (item: any) => {
    return calculateItemNetWeight(item) * 1.12; // Gross weight adds standard 12% factor for packaging/carton
  };

  const computedTotalNetWeight = useMemo(() => {
    if (!selectedPi) return 0;
    return selectedPi.items.reduce((sum, item) => sum + calculateItemNetWeight(item), 0);
  }, [selectedPi]);

  const computedTotalGrossWeight = useMemo(() => {
    if (!selectedPi) return 0;
    return selectedPi.items.reduce((sum, item) => sum + calculateItemGrossWeight(item), 0);
  }, [selectedPi]);

  const getTargetNetWeight = () => {
    const piWs = selectedPi?.netWeight;
    const ws = (piWs && piWs !== 'N/A' && piWs !== '') ? piWs : (activePack ? activePack.netWeight : netWeight);
    if (!ws) return 0;
    const match = ws.match(/[\d.]+/);
    return match ? parseFloat(match[0]) : 0;
  };

  const getTargetGrossWeight = () => {
    const piWs = selectedPi?.grossWeight;
    const ws = (piWs && piWs !== 'N/A' && piWs !== '') ? piWs : (activePack ? activePack.grossWeight : grossWeight);
    if (!ws) return 0;
    const match = ws.match(/[\d.]+/);
    return match ? parseFloat(match[0]) : 0;
  };

  const distributedWeights = useMemo(() => {
    if (!selectedPi) return { net: [], gross: [], totalNet: 0, totalGross: 0 };
    
    const targetNet = getTargetNetWeight();
    const targetGross = getTargetGrossWeight();

    const items = selectedPi.items;
    if (items.length === 0) return { net: [], gross: [], totalNet: 0, totalGross: 0 };

    const rawNets = items.map(item => calculateItemNetWeight(item));
    const totalRawNet = rawNets.reduce((a, b) => a + b, 0);

    const rawGrosses = items.map(item => calculateItemGrossWeight(item));
    const totalRawGross = rawGrosses.reduce((a, b) => a + b, 0);

    let distributedNets: number[] = [];
    if (totalRawNet > 0) {
      distributedNets = rawNets.map(r => (r / totalRawNet) * targetNet);
    } else {
      distributedNets = items.map(() => targetNet / items.length);
    }

    let distributedGrosses: number[] = [];
    if (totalRawGross > 0) {
      distributedGrosses = rawGrosses.map(r => (r / totalRawGross) * targetGross);
    } else {
      distributedGrosses = items.map(() => targetGross / items.length);
    }

    const roundedNets = distributedNets.map(val => parseFloat(val.toFixed(2)));
    const roundedGrosses = distributedGrosses.map(val => parseFloat(val.toFixed(2)));

    const sumRoundedNet = roundedNets.reduce((a, b) => a + b, 0);
    const sumRoundedGross = roundedGrosses.reduce((a, b) => a + b, 0);

    const diffNet = parseFloat((targetNet - sumRoundedNet).toFixed(2));
    const diffGross = parseFloat((targetGross - sumRoundedGross).toFixed(2));

    if (roundedNets.length > 0 && Math.abs(diffNet) > 0.001) {
      roundedNets[roundedNets.length - 1] = parseFloat((roundedNets[roundedNets.length - 1] + diffNet).toFixed(2));
    }
    if (roundedGrosses.length > 0 && Math.abs(diffGross) > 0.001) {
      roundedGrosses[roundedGrosses.length - 1] = parseFloat((roundedGrosses[roundedGrosses.length - 1] + diffGross).toFixed(2));
    }

    return {
      net: roundedNets,
      gross: roundedGrosses,
      totalNet: targetNet,
      totalGross: targetGross
    };
  }, [selectedPi, activePack, netWeight, grossWeight]);

  const consolidatedWeights = useMemo(() => {
    if (consolidatedItems.length === 0) return { net: [], gross: [], totalNet: 0, totalGross: 0 };
    const targetNet = getTargetNetWeight();
    const targetGross = getTargetGrossWeight();

    const rawNets = consolidatedItems.map(item => calculateItemNetWeight(item));
    const totalRawNet = rawNets.reduce((a, b) => a + b, 0);

    const rawGrosses = consolidatedItems.map(item => calculateItemGrossWeight(item));
    const totalRawGross = rawGrosses.reduce((a, b) => a + b, 0);

    let distributedNets: number[] = [];
    if (totalRawNet > 0) {
      distributedNets = rawNets.map(r => (r / totalRawNet) * targetNet);
    } else {
      distributedNets = consolidatedItems.map(() => targetNet / consolidatedItems.length);
    }

    let distributedGrosses: number[] = [];
    if (totalRawGross > 0) {
      distributedGrosses = rawGrosses.map(r => (r / totalRawGross) * targetGross);
    } else {
      distributedGrosses = consolidatedItems.map(() => targetGross / consolidatedItems.length);
    }

    const roundedNets = distributedNets.map(val => parseFloat(val.toFixed(2)));
    const roundedGrosses = distributedGrosses.map(val => parseFloat(val.toFixed(2)));

    const sumRoundedNet = roundedNets.reduce((a, b) => a + b, 0);
    const sumRoundedGross = roundedGrosses.reduce((a, b) => a + b, 0);

    const diffNet = parseFloat((targetNet - sumRoundedNet).toFixed(2));
    const diffGross = parseFloat((targetGross - sumRoundedGross).toFixed(2));

    if (roundedNets.length > 0 && Math.abs(diffNet) > 0.001) {
      roundedNets[roundedNets.length - 1] = parseFloat((roundedNets[roundedNets.length - 1] + diffNet).toFixed(2));
    }
    if (roundedGrosses.length > 0 && Math.abs(diffGross) > 0.001) {
      roundedGrosses[roundedGrosses.length - 1] = parseFloat((roundedGrosses[roundedGrosses.length - 1] + diffGross).toFixed(2));
    }

    return {
      net: roundedNets,
      gross: roundedGrosses,
      totalNet: targetNet,
      totalGross: targetGross
    };
  }, [consolidatedItems, activePack, netWeight, grossWeight]);

  function getItemCartonQty(itemName: string, quantity: number, unit?: string, index?: number): number {
    if (index !== undefined && consolidatedWeights.net[index] !== undefined) {
      const net = consolidatedWeights.net[index];
      return Math.max(1, Math.ceil(net / 60));
    }
    const foundIdx = consolidatedItems.findIndex(i => i.itemName === itemName && (unit ? i.unit === unit : true));
    if (foundIdx !== -1 && consolidatedWeights.net[foundIdx] !== undefined) {
      const net = consolidatedWeights.net[foundIdx];
      return Math.max(1, Math.ceil(net / 60));
    }
    const itemObj = { itemName, totalQuantity: quantity, unit };
    const rawNet = calculateItemNetWeight(itemObj);
    return Math.max(1, Math.ceil(rawNet / 60));
  }

  const computedTotalCartons = useMemo(() => {
    if (consolidatedItems.length === 0) return 0;
    return consolidatedItems.reduce((sum, item, idx) => {
      const net = consolidatedWeights.net[idx] || 0;
      const cartonQty = Math.max(1, Math.ceil(net / 60));
      return sum + cartonQty;
    }, 0);
  }, [consolidatedItems, consolidatedWeights]);

  const getEnforcedCartons = () => {
    return `${computedTotalCartons} Cartons`;
  };

  const piBankName = selectedPi?.bankDetails?.bankName || 'SHAHJALAL ISLAMI BANK LIMITED';
  const piBankBranch = selectedPi?.bankDetails?.branch || 'ESKATON BRANCH';
  const piBankAddress = selectedPi?.bankDetails?.address || 'ESKATON FANTASIA (1ST FLOOR) 122-123, NEW ESKTON ROAD, RAMNA, DHAKA-1000, BANGLADESH';  // Uniform Corporate Layout Header
  const renderDocHeader = (docNo: number, title: string, isPdfExport: boolean = false) => {
    const compName = COMPANY_PROFILE.name || "ACOOLA TRIMS CORPORATION";
    const compWords = compName.split(/\s+/);
    const firstTwoWords = compWords.slice(0, 2).join(' ');
    const remainingWords = compWords.slice(2).join(' ');
    
    const firstColor = COMPANY_PROFILE.line1Color || COMPANY_PROFILE.firstColor || '#007D46';
    const secondColor = COMPANY_PROFILE.line2Color || COMPANY_PROFILE.secondColor || '#ed1c24';
    const tagline = COMPANY_PROFILE.tagline || 'All Kinds of Garments Accessories Manufacturer & Supplier';
    
    const showLogo = !!(COMPANY_PROFILE.logo && COMPANY_PROFILE.useLogoInHeader);

    if (!printWithHeader) {
      return (
        <div className="w-full font-sans text-left shrink-0">
          {/* 0.9 inches empty space if blank header is selected */}
          <div style={{ height: '0.9in' }} className="w-full" />
          
          {/* 2mm gap under the blank space */}
          <div style={{ height: '2mm' }} className="w-full shrink-0" />

          {/* Centered Document Title inside default layout margins */}
          <div className="text-center mt-0 mb-1.5 relative font-sans">
            <h2 className="lc-document-title-header text-[12pt] font-black uppercase text-slate-950 tracking-wider font-['Roboto'] inline-block border-b border-slate-950 pb-1 px-4" style={{ fontFamily: "'Roboto', sans-serif", borderBottomWidth: '1.25pt' }}>
              {title}
            </h2>
            {(docNo === 1 || docNo === 2 || docNo === 7 || docNo === 8 || docNo === 11) && (
              <div className="text-right text-[9.5pt] font-extrabold text-slate-950 pr-4 mt-0.5" style={{ fontSize: '9.5pt' }}>
                Date: {formatDateToDDMMYYYY(activePack ? activePack.docDate : new Date().toISOString().substring(0, 10))}
              </div>
            )}
          </div>
        </div>
      );
    }

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
                <div className="text-left font-['Roboto'] min-w-0 w-full flex flex-col justify-center pl-1 font-sans" style={{ fontFamily: "'Roboto', sans-serif" }}>
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
                src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(lcNo)}`}
                alt="LC QR Code"
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
        <div className="text-center mt-0 mb-1.5 relative font-sans">
          <h2 className="lc-document-title-header text-[13pt] font-black uppercase text-slate-950 tracking-wider font-['Roboto'] inline-block border-b border-slate-950 pb-1 px-4" style={{ fontFamily: "'Roboto', sans-serif", borderBottomWidth: '1.25pt' }}>
            {title}
          </h2>
          {(docNo === 1 || docNo === 2 || docNo === 7 || docNo === 8 || docNo === 11) && (
            <div className="text-right text-[9.5pt] font-extrabold text-slate-950 pr-4 mt-0.5" style={{ fontSize: '9.5pt' }}>
              Date: {formatDateToDDMMYYYY(activePack ? activePack.docDate : new Date().toISOString().substring(0, 10))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderDocFooter = () => {
    if (!printWithFooter) {
      return <div style={{ height: '1.3in' }} className="w-full shrink-0" />;
    }

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
            className="w-[210mm] block object-contain"
            style={{ width: '210mm', height: 'auto', display: 'block' }}
          />
        </div>
      );
    }

    const firstColor = COMPANY_PROFILE.line1Color || '#007D46';
    const officeAddr = COMPANY_PROFILE.addresses?.office || "House No-03, Road No-07, Block-C, Mirpur-13, Dhaka-1216, Bangladesh.";
    const factoryAddr = COMPANY_PROFILE.addresses?.factory || "135/5, Arambagh, Motijheel, Dhaka-1000, Bangladesh.";
    const emailStr = COMPANY_PROFILE.emails?.[0] || "acoolatrims@gmail.com";
    const phoneStr = COMPANY_PROFILE.phones?.[0] || "01778262909";

    return (
      <div 
        className="flex flex-col items-center justify-center text-center font-['Roboto'] select-all"
        style={{ 
          position: 'absolute', 
          bottom: '4mm', 
          left: '0mm', 
          width: '210mm',
          fontFamily: "'Roboto', sans-serif" 
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

  const currentFontSize = activePack?.docFontSize || docFontSize || '9.5pt';
  const currentRowHeight = activePack?.docRowHeight || docRowHeight || '4.5mm';

  return (
    <div className="space-y-6 font-sans">
      {/* Upper Tab Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-4 font-sans">
        <div>
          <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-1.5 leading-none font-sans">
            📜 LC Documents Hub &amp; PDF Package Compiler
          </h2>
          <p className="text-xs text-slate-500 mt-1 font-sans">
            Select an existing Proforma Invoice (PI) and configure Bank details to print or export a highly-polished, unified, single-page-fitted 10-Document banking packet.
          </p>
        </div>
      </div>

      {/* Inputs Configuration Panel */}
      {canEdit && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <h3 className="text-xs font-black uppercase text-slate-800 flex items-center gap-2 mb-4 font-sans">
          <Grid className="w-4 h-4 text-emerald-600" /> 1. Letter of Credit (L/C) &amp; Bank Details
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs text-left font-sans">
          <div className="space-y-1">
            <label className="block font-bold text-slate-700 font-sans">Select Proforma Invoice (PI)*</label>
            <select
              value={selectedPiId}
              onChange={(e) => {
                setSelectedPiId(e.target.value);
                setActivePack(null); // Reset active document pack when PI changes
              }}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-bold focus:bg-white text-xs"
            >
              <option value="">-- Choose PI --</option>
              {pis.map(p => (
                <option key={p.id} value={p.id}>
                  {p.invoiceNo} - {p.factoryName} (FOB: ${calculatePiTotal(p).toLocaleString()})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="block font-bold text-slate-700 font-sans">L/C Amount Override (USD)</label>
            <input
              type="number"
              step="0.01"
              value={customLcAmount}
              onChange={(e) => setCustomLcAmount(e.target.value)}
              placeholder={selectedPi ? `PI Total is $${calculatePiTotal(selectedPi).toLocaleString()}` : "Manual Value Override"}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 focus:bg-white text-xs font-bold"
            />
          </div>

          <div className="space-y-1">
            <label className="block font-bold text-slate-700 font-sans">L/C Date</label>
            <input
              type="date"
              value={lcDate}
              onChange={(e) => setLcDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 focus:bg-white text-xs"
            />
          </div>

          <div className="space-y-1">
            <label className="block font-bold text-amber-800 font-sans">📅 Document Date (ডকুমেন্ট তারিখ)*</label>
            <input
              type="date"
              value={defaultDocDate}
              onChange={(e) => setDefaultDocDate(e.target.value)}
              className="w-full bg-amber-50 border border-amber-300 rounded-lg px-3 py-1.5 focus:bg-white text-xs font-bold text-slate-800"
            />
          </div>

          <div className="space-y-1">
            <label className="block font-bold text-slate-700 font-sans">L/C Number*</label>
            <input
              type="text"
              value={lcNo}
              onChange={(e) => setLcNo(e.target.value)}
              placeholder="e.g. ATC-LC-2026-9921"
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 font-bold text-blue-800 focus:bg-white text-xs"
            />
          </div>

          <div className="space-y-1">
            <label className="block font-bold text-slate-700 font-sans">L/C Opening / Advising Bank*</label>
            <input
              type="text"
              value={lcBankName}
              onChange={(e) => setLcBankName(e.target.value)}
              placeholder="Manual Opened Bank"
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 focus:bg-white text-xs font-bold"
            />
          </div>

          <div className="space-y-1">
            <label className="block font-bold text-slate-700 font-sans">L/C Bank Branch*</label>
            <input
              type="text"
              value={lcBranch}
              onChange={(e) => setLcBranch(e.target.value)}
              placeholder="e.g. Principal Branch, Dhaka"
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 focus:bg-white text-xs"
            />
          </div>

          <div className="space-y-1">
            <label className="block font-bold text-slate-700 font-sans">L/C Bank Address*</label>
            <input
              type="text"
              value={lcAddress}
              onChange={(e) => setLcAddress(e.target.value)}
              placeholder="Dilkusha, Dhaka, Bangladesh"
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 focus:bg-white text-xs"
            />
          </div>

          <div className="space-y-1">
            <label className="block font-bold text-slate-700 font-sans">L/C Terms*</label>
            <input
              type="text"
              value={lcTerms}
              onChange={(e) => setLcTerms(e.target.value)}
              placeholder="e.g. 120 DAYS SIGHT"
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 focus:bg-white text-xs font-bold font-sans"
            />
          </div>

          <div className="space-y-1">
            <label className="block font-bold text-slate-700 font-sans">Applicant's IRC No.</label>
            <input
              type="text"
              value={applicantIrc}
              onChange={(e) => setApplicantIrc(e.target.value)}
              placeholder="e.g. IRC-BD-48921"
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 focus:bg-white text-xs font-mono font-bold"
            />
          </div>

          <div className="space-y-1">
            <label className="block font-bold text-slate-700 font-sans">Applicant's VAT No.</label>
            <input
              type="text"
              value={applicantVat}
              onChange={(e) => setApplicantVat(e.target.value)}
              placeholder="e.g. VAT-9912034"
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 focus:bg-white text-xs font-mono font-bold"
            />
          </div>

          <div className="space-y-1">
            <label className="block font-bold text-slate-700 font-sans">Issuing Bank's BIN No.</label>
            <input
              type="text"
              value={issuingBankBin}
              onChange={(e) => setIssuingBankBin(e.target.value)}
              placeholder="e.g. BIN-00129384"
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 focus:bg-white text-xs font-mono font-bold"
            />
          </div>

          <div className="space-y-1">
            <label className="block font-bold text-slate-700 font-sans">Beneficiary BIN No.</label>
            <input
              type="text"
              value={beneficiaryBin}
              onChange={(e) => setBeneficiaryBin(e.target.value)}
              placeholder="e.g. 002903407-0202"
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 focus:bg-white text-xs font-mono font-bold"
            />
          </div>

          <div className="space-y-1">
            <label className="block font-bold text-slate-700 font-sans">LC Company Name</label>
            <input
              type="text"
              value={lcCompanyName}
              onChange={(e) => setLcCompanyName(e.target.value)}
              placeholder="Custom LC Company Name"
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 focus:bg-white text-xs font-bold"
            />
          </div>

          <div className="space-y-1">
            <label className="block font-bold text-slate-700 font-sans">LC Company Address</label>
            <textarea
              value={lcCompanyAddress}
              onChange={(e) => setLcCompanyAddress(e.target.value)}
              placeholder="Custom LC Company Address"
              rows={2}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 focus:bg-white text-xs font-medium"
            />
          </div>

          <div className="space-y-1">
            <label className="block font-bold text-slate-700 font-sans">Export SC Number</label>
            <input
              type="text"
              value={exportScNo}
              onChange={(e) => setExportScNo(e.target.value)}
              placeholder="SC-ATC"
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 focus:bg-white text-xs text-slate-700"
            />
          </div>

          <div className="space-y-1">
            <label className="block font-bold text-slate-700 font-sans">Export SC Date</label>
            <input
              type="date"
              value={exportScDate}
              onChange={(e) => setExportScDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 focus:bg-white text-xs text-slate-700"
            />
          </div>

          <div className="space-y-1">
            <label className="block font-bold text-slate-700 font-sans">HS Code</label>
            <input
              type="text"
              value={hsCode}
              onChange={(e) => setHsCode(e.target.value)}
              placeholder="e.g. 6217.10.00"
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 focus:bg-white text-xs text-slate-700 font-mono font-bold"
            />
          </div>

          <div className="space-y-1 font-sans">
            <label className="block font-bold text-slate-700">Covered Van / Truck No</label>
            <input
              type="text"
              value={truckNo}
              onChange={(e) => setTruckNo(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 focus:bg-white text-xs"
            />
          </div>

          <div className="space-y-1">
            <label className="block font-bold text-slate-700 font-sans">Van Challan Code</label>
            <input
              type="text"
              value={truckChallanNo}
              onChange={(e) => setTruckChallanNo(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 focus:bg-white text-xs"
            />
          </div>

          <div className="space-y-1">
            <label className="block font-bold text-slate-700 font-sans">Van Driver Name</label>
            <input
              type="text"
              value={driverName}
              onChange={(e) => setDriverName(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 focus:bg-white text-xs"
            />
          </div>

          <div className="space-y-1 font-sans">
            <label className="block font-bold text-slate-705">Transportation Rent (৳ BDT)</label>
            <input
              type="number"
              value={truckRent}
              onChange={(e) => setTruckRent(e.target.value)}
              placeholder="e.g. 12500"
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 focus:bg-white text-xs font-bold"
            />
          </div>

          <div className="space-y-1 font-sans col-span-2">
            <label className="block font-bold text-slate-700">Truck Challan Header Graphic (Raw SVG / Design Image)</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={truckChallanHeader}
                onChange={(e) => setTruckChallanHeader(e.target.value)}
                placeholder="Paste Raw SVG, Base64 image, or Image URL here..."
                className="flex-1 bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 focus:bg-white text-xs"
              />
              <label className="bg-slate-200 text-slate-800 hover:bg-slate-300 px-3 py-1.5 rounded-lg text-[11px] font-extrabold cursor-pointer transition flex items-center shrink-0">
                <span>Upload Image</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        if (event.target?.result) {
                          setTruckChallanHeader(event.target.result as string);
                        }
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
              </label>
            </div>
            <p className="text-[9.5px] text-slate-500 font-medium">Allows raw SVG code strings or standard uploaded images. Overrides the default transport agency banner header.</p>
          </div>

          <div className="space-y-1">
            <label className="block font-bold text-slate-700 font-sans">Net Weight (N.W.)</label>
            <input
              type="text"
              value={netWeight}
              onChange={(e) => setNetWeight(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 focus:bg-white text-xs font-semibold"
            />
          </div>

           <div className="space-y-1">
            <label className="block font-bold text-slate-705 font-sans">Gross Weight (G.W.)</label>
            <input
              type="text"
              value={grossWeight}
              onChange={(e) => setGrossWeight(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 focus:bg-white text-xs font-semibold"
            />
          </div>

          {/* Document Layout styling options */}
          <div className="space-y-1">
            <label className="block font-bold text-emerald-800 font-sans flex items-center gap-1.5">
              <span>📄 Document Font Size</span>
            </label>
            <select
              value={docFontSize}
              onChange={(e) => {
                const val = e.target.value;
                setDocFontSize(val);
                if (activePack) {
                  updatePackField('docFontSize', val);
                }
              }}
              className="w-full bg-emerald-50/40 border border-emerald-200 text-emerald-950 font-bold rounded-lg px-3 py-1.5 text-xs cursor-pointer focus:bg-white"
            >
              {['7pt', '7.5pt', '8pt', '8.5pt', '9pt', '9.5pt', '10pt', '10.5pt', '11pt', '11.5pt', '12pt', '13pt', '14pt'].map((sz) => (
                <option key={sz} value={sz}>{sz}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="block font-bold text-emerald-800 font-sans flex items-center gap-1.5">
              <span>📏 Table Row Height</span>
            </label>
            <select
              value={docRowHeight}
              onChange={(e) => {
                const val = e.target.value;
                setDocRowHeight(val);
                if (activePack) {
                  updatePackField('docRowHeight', val);
                }
              }}
              className="w-full bg-emerald-50/40 border border-emerald-200 text-emerald-950 font-bold rounded-lg px-3 py-1.5 text-xs cursor-pointer focus:bg-white"
            >
              {['2.5mm', '3mm', '3.5mm', '4mm', '4.5mm', '5mm', '5.5mm', '6mm', '6.5mm', '7mm', '7.5mm', '8mm', '8.5mm', '9mm', '9.5mm', '10mm', '11mm', '12mm', '13mm', '14mm', '15mm'].map((h) => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
          </div>

          <div className="lg:col-span-4 border-t border-slate-200/80 pt-4 mt-2 space-y-3">
            <span className="block text-[11px] font-black text-slate-800 uppercase tracking-widest">
              Style &amp; PO Column Watermarks (Selectable features):
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-50/70 p-3 rounded-lg border border-slate-200 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-1.5 mb-1.5">
                  <span className="block text-[10.5px] font-extrabold text-blue-700 uppercase">
                    Include &ldquo;Freight Prepaid&rdquo; on:
                  </span>
                  {/* Color selector bubble badges */}
                  <div className="flex items-center gap-1 bg-white px-1.5 py-0.5 rounded border border-slate-200 shadow-3xs">
                    {[
                      { name: 'Blue', value: '#2563eb', bg: 'bg-blue-600' },
                      { name: 'Red', value: '#dc2626', bg: 'bg-red-600' },
                      { name: 'Green', value: '#16a34a', bg: 'bg-green-600' },
                      { name: 'Orange', value: '#ea580c', bg: 'bg-orange-600' },
                      { name: 'Teal', value: '#0d9488', bg: 'bg-teal-600' },
                      { name: 'Rose', value: '#e11d48', bg: 'bg-rose-600' },
                    ].map((col) => (
                      <button
                        key={col.value}
                        type="button"
                        onClick={() => setFreightColor(col.value)}
                        className={`w-3 h-3 rounded-full transition-transform ${col.bg} ${
                          freightColor === col.value ? 'ring-2 ring-offset-1 ring-slate-850 scale-110' : 'hover:scale-110 opacity-75'
                        }`}
                        title={`Select color: ${col.name}`}
                      />
                    ))}
                    <div className="w-[1px] h-3 bg-slate-300 mx-0.5" />
                    <label className="relative cursor-pointer flex items-center justify-center" title="Pick any custom color">
                      <input 
                        type="color" 
                        value={freightColor} 
                        onChange={(e) => setFreightColor(e.target.value)} 
                        className="w-4.5 h-4.5 p-0 border-0 bg-transparent cursor-pointer outline-hidden"
                      />
                    </label>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-[10px] font-semibold text-slate-700">
                  <label className="flex items-center gap-1.5 cursor-pointer hover:text-slate-900 transition">
                    <input type="checkbox" checked={freightDocs.delivery} onChange={(e) => setFreightDocs({...freightDocs, delivery: e.target.checked})} className="rounded text-rose-600 focus:ring-rose-500 scale-90" />
                    <span>Deliv. Challan</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer hover:text-slate-900 transition">
                    <input type="checkbox" checked={freightDocs.packing} onChange={(e) => setFreightDocs({...freightDocs, packing: e.target.checked})} className="rounded text-rose-600 focus:ring-rose-500 scale-90" />
                    <span>Packing List</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer hover:text-slate-900 transition">
                    <input type="checkbox" checked={freightDocs.invoice} onChange={(e) => setFreightDocs({...freightDocs, invoice: e.target.checked})} className="rounded text-rose-600 focus:ring-rose-500 scale-90" />
                    <span>Comm. Invoice</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer hover:text-slate-900 transition">
                    <input type="checkbox" checked={freightDocs.weight} onChange={(e) => setFreightDocs({...freightDocs, weight: e.target.checked})} className="rounded text-rose-600 focus:ring-rose-500 scale-90" />
                    <span>Weight List</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer hover:text-slate-900 transition">
                    <input type="checkbox" checked={freightDocs.truck} onChange={(e) => setFreightDocs({...freightDocs, truck: e.target.checked})} className="rounded text-rose-600 focus:ring-rose-500 scale-90" />
                    <span>Truck Challan</span>
                  </label>
                </div>
              </div>

              <div className="bg-slate-50/70 p-3 rounded-lg border border-slate-200 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-1.5 mb-1.5">
                  <span className="block text-[10.5px] font-extrabold text-blue-700 uppercase">
                    Include &ldquo;The goods received in good condition&rdquo; on:
                  </span>
                  {/* Color selector bubble badges */}
                  <div className="flex items-center gap-1 bg-white px-1.5 py-0.5 rounded border border-slate-200 shadow-3xs">
                    {[
                      { name: 'Blue', value: '#2563eb', bg: 'bg-blue-600' },
                      { name: 'Red', value: '#dc2626', bg: 'bg-red-600' },
                      { name: 'Green', value: '#16a34a', bg: 'bg-green-600' },
                      { name: 'Orange', value: '#ea580c', bg: 'bg-orange-600' },
                      { name: 'Teal', value: '#0d9488', bg: 'bg-teal-600' },
                      { name: 'Rose', value: '#e11d48', bg: 'bg-rose-600' },
                    ].map((col) => (
                      <button
                        key={col.value}
                        type="button"
                        onClick={() => setGoodsReceivedColor(col.value)}
                        className={`w-3 h-3 rounded-full transition-transform ${col.bg} ${
                          goodsReceivedColor === col.value ? 'ring-2 ring-offset-1 ring-slate-850 scale-110' : 'hover:scale-110 opacity-75'
                        }`}
                        title={`Select color: ${col.name}`}
                      />
                    ))}
                    <div className="w-[1px] h-3 bg-slate-300 mx-0.5" />
                    <label className="relative cursor-pointer flex items-center justify-center" title="Pick any custom color">
                      <input 
                        type="color" 
                        value={goodsReceivedColor} 
                        onChange={(e) => setGoodsReceivedColor(e.target.value)} 
                        className="w-4.5 h-4.5 p-0 border-0 bg-transparent cursor-pointer outline-hidden"
                      />
                    </label>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-[10px] font-semibold text-slate-700">
                  <label className="flex items-center gap-1.5 cursor-pointer hover:text-slate-900 transition">
                    <input type="checkbox" checked={goodsReceivedDocs.delivery} onChange={(e) => setGoodsReceivedDocs({...goodsReceivedDocs, delivery: e.target.checked})} className="rounded text-blue-600 focus:ring-blue-500 scale-90" />
                    <span>Deliv. Challan</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer hover:text-slate-900 transition">
                    <input type="checkbox" checked={goodsReceivedDocs.packing} onChange={(e) => setGoodsReceivedDocs({...goodsReceivedDocs, packing: e.target.checked})} className="rounded text-blue-600 focus:ring-blue-500 scale-90" />
                    <span>Packing List</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer hover:text-slate-900 transition">
                    <input type="checkbox" checked={goodsReceivedDocs.invoice} onChange={(e) => setGoodsReceivedDocs({...goodsReceivedDocs, invoice: e.target.checked})} className="rounded text-blue-600 focus:ring-blue-500 scale-90" />
                    <span>Comm. Invoice</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer hover:text-slate-900 transition">
                    <input type="checkbox" checked={goodsReceivedDocs.weight} onChange={(e) => setGoodsReceivedDocs({...goodsReceivedDocs, weight: e.target.checked})} className="rounded text-blue-600 focus:ring-blue-500 scale-90" />
                    <span>Weight List</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer hover:text-slate-900 transition">
                    <input type="checkbox" checked={goodsReceivedDocs.truck} onChange={(e) => setGoodsReceivedDocs({...goodsReceivedDocs, truck: e.target.checked})} className="rounded text-blue-600 focus:ring-blue-500 scale-90" />
                    <span>Truck Challan</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {canEdit && (
            <div className="lg:col-span-4 pt-4 flex flex-wrap gap-4 justify-end">
              <button
                type="button"
                onClick={handleCreateDocumentsPack}
                className="bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-[12px] uppercase px-5 py-2.5 rounded-lg cursor-pointer flex items-center justify-center gap-2 shadow Transition-all duration-150"
              >
                <Sparkles className="w-4 h-4" /> Generate Complete LC Pack (১০ টি এলসি ডকুমেন্ট তৈরি করুন)
              </button>
            </div>
          )}
        </div>
      </div>
      )}

      {activePack ? (
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 text-xs text-left font-sans">
          {/* Docs Selector Sidebar */}
          <div className="xl:col-span-1 space-y-2">
            <div className="bg-slate-900 text-white px-4 py-3 rounded-t-xl font-bold flex items-center gap-1.5 font-sans uppercase text-[11px]">
              <BookOpen className="w-4 h-4 text-emerald-400" /> LC Bundle Pages
            </div>
            <div className="bg-white border border-slate-200 p-2.5 rounded-b-xl shadow-xs space-y-1.5 font-sans">
              {documentTabs.map(tab => (
                <button
                  key={tab.index}
                  type="button"
                  onClick={() => setActiveDocTab(tab.index)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg font-bold flex items-center gap-2 text-[11px] ${
                    activeDocTab === tab.index
                      ? 'bg-emerald-600 text-white shadow font-extrabold'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                    activeDocTab === tab.index ? 'bg-white text-emerald-700' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {tab.index}
                  </span>
                  <span>{tab.title}</span>
                </button>
              ))}

              <div className="pt-4 border-t border-slate-200 space-y-2">
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 space-y-2 text-left mb-1 select-none">
                  <span className="block text-[10px] font-extrabold uppercase text-slate-500 tracking-wider">🖨️ Print Settings</span>
                  <div className="space-y-1.5 text-[11px] font-semibold text-slate-700">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        checked={printWithHeader} 
                        onChange={(e) => setPrintWithHeader(e.target.checked)} 
                        className="rounded text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5 border-slate-300"
                      />
                      <span>Include Header Logo &amp; Banner</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        checked={printWithFooter} 
                        onChange={(e) => setPrintWithFooter(e.target.checked)} 
                        className="rounded text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5 border-slate-300"
                      />
                      <span>Include Footer Address &amp; Contacts</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        checked={printWithWatermark} 
                        onChange={(e) => setPrintWithWatermark(e.target.checked)} 
                        className="rounded text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5 border-slate-300"
                      />
                      <span>Include Background Watermark</span>
                    </label>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handlePrintCurrentDoc}
                  className="w-full bg-slate-905 border border-slate-800 hover:bg-slate-100 text-slate-900 font-extrabold uppercase py-2.5 rounded-lg flex items-center justify-center gap-1.5 shadow-xs cursor-pointer text-[10.5px]"
                >
                  <Printer className="w-4 h-4 text-slate-600" /> Print Active Tab
                </button>
                <button
                  type="button"
                  disabled={isExporting}
                  onClick={handleDownloadPdfPack}
                  className="w-full bg-violet-700 hover:bg-violet-800 font-extrabold text-white uppercase py-2.5 rounded-lg flex items-center justify-center gap-1.5 shadow-sm disabled:bg-violet-400 cursor-pointer text-[10.5px]"
                >
                  {isExporting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Compiling 10 Pages...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      Download Combined PDF
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Interactive Live Editor and Live A4 Simulate Paper layout */}
          <div className="xl:col-span-3 space-y-6">
            {/* Header control bar for workspace mode tab selecting */}
            {canEdit && (
              <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs flex items-center justify-between flex-wrap gap-2.5">
                <div className="flex items-center gap-1.5 font-sans">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-pulse" />
                  <span className="font-extrabold uppercase text-[10px] tracking-wider text-slate-500">Workspace View Mode:</span>
                </div>
                <div className="flex bg-slate-100 p-1 rounded-lg gap-1 border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setLcWorkspaceMode('preview')}
                    className={`px-3 py-1.5 text-xs font-black rounded-md flex items-center gap-1.5 transition cursor-pointer ${
                      lcWorkspaceMode === 'preview'
                        ? 'bg-white text-slate-900 shadow-xs animate-fade-in'
                        : 'text-slate-650 hover:text-slate-900'
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5" /> Preview mode (শুধুমাত্র দেখুন)
                  </button>
                  <button
                    type="button"
                    onClick={() => setLcWorkspaceMode('edit')}
                    className={`px-3 py-1.5 text-xs font-black rounded-md flex items-center gap-1.5 transition cursor-pointer ${
                      lcWorkspaceMode === 'edit'
                        ? 'bg-amber-600 text-white shadow-xs animate-fade-in'
                        : 'text-slate-650 hover:text-slate-900'
                    }`}
                  >
                    <Edit3 className="w-3.5 h-3.5" /> Edit mode (এডিট বা পরিবর্তন করুন)
                  </button>
                </div>
              </div>
            )}

            {/* Conditional Workspace View */}
            {canEdit && lcWorkspaceMode === 'edit' ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* 1. Live Inline Textarea Editor */}
                <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl space-y-2 flex flex-col justify-between lg:col-span-2">
                  <div>
                    <div className="flex items-center justify-between">
                      <h4 className="font-extrabold text-amber-900 text-xs flex items-center gap-1.5 uppercase font-sans">
                        ✍️ Edit Draft Copy (Document No: {activeDocTab})
                      </h4>
                    </div>
                    <p className="text-[10px] text-amber-800 font-medium font-sans mt-0.5">Editing text below updates the active document draft live prior to printing/compilation.</p>
                  </div>
                  
                  {/* Option to edit Document Date & LC Number */}
                  <div className="grid grid-cols-2 gap-3 mt-1 text-[10px] font-sans pb-2 border-b border-amber-200/55">
                    <div>
                      <label className="block font-bold text-amber-800 uppercase tracking-wide">📅 Document Date (ডকুমেন্ট তারিখ)</label>
                      <input
                        type="date"
                        value={activePack.docDate || ''}
                        onChange={(e) => updatePackField('docDate', e.target.value)}
                        className="w-full bg-white border border-amber-250 rounded px-2.5 py-1 text-xs font-bold text-slate-800 mt-0.5"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-amber-800 uppercase tracking-wide">🔢 L/C Number (এলসি নাম্বার)</label>
                      <input
                        type="text"
                        value={activePack.lcNo || ''}
                        onChange={(e) => updatePackField('lcNo', e.target.value)}
                        className="w-full bg-white border border-amber-250 rounded px-2.5 py-1 text-xs font-bold text-slate-800 mt-0.5"
                      />
                    </div>
                  </div>

                  <textarea
                    value={getDocVal(activeDocTab)}
                    onChange={(e) => updateDocText(activeDocTab, e.target.value)}
                    className="w-full bg-white border border-amber-250 rounded-lg p-3 font-sans text-xs text-neutral-800 h-44 focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-inner mt-2 flex-grow"
                  />
                </div>

                {/* 2. LC Amendment History & Form Tracker */}
                <div className="bg-violet-50 border border-violet-200 p-4 rounded-xl space-y-3 flex flex-col justify-between lg:col-span-1">
                  <div>
                    <h4 className="font-extrabold text-violet-900 text-xs flex items-center gap-1.5 uppercase font-sans">
                      🛠️ LC Amendment Tracker
                    </h4>
                    <p className="text-[10px] text-violet-800 font-medium font-sans mt-0.5">Track and record official letter of credit amendments. Updates synchronize.</p>
                  </div>

                  {/* Active Amendments Trail List */}
                  {currentAmendments.length > 0 && (
                    <div className="border border-violet-200 bg-white rounded-lg p-2.5 max-h-[120px] overflow-y-auto space-y-2 scrollbar-thin shadow-2xs">
                      <span className="block text-[8.5px] uppercase font-black tracking-wider text-violet-600 border-b pb-1">
                        📋 Documented Amendment Trails ({currentAmendments.length})
                      </span>
                      <div className="space-y-2 divide-y divide-violet-100">
                        {currentAmendments.map((am, amIdx) => (
                          <div key={am.id || amIdx} className="text-[10px] pt-1.5 first:pt-0">
                            <div className="flex justify-between items-center text-violet-950 font-extrabold font-mono">
                              <span>Date: {am.amendmentDate}</span>
                              <span className="text-violet-800">Amt: ${am.updatedAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                            <p className="text-slate-650 leading-tight mt-1 font-sans font-medium break-all">{am.amendedClauses}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Form controls */}
                  <div className="grid grid-cols-2 gap-2 text-[10px] font-sans">
                    <div className="space-y-0.5 col-span-1">
                      <label className="block font-bold text-violet-700">Amendment Date</label>
                      <input
                        type="date"
                        value={amendDateInput}
                        onChange={(e) => setAmendDateInput(e.target.value)}
                        className="w-full bg-white border border-violet-200 rounded px-2 py-1 text-xs"
                      />
                    </div>
                    <div className="space-y-0.5 col-span-1">
                      <label className="block font-bold text-violet-700">Updated L/C Cost ($)</label>
                      <input
                        type="number"
                        placeholder="Amount"
                        value={amendAmountInput}
                        onChange={(e) => setAmendAmountInput(e.target.value)}
                        className="w-full bg-white border border-violet-200 rounded px-2 py-1 text-xs font-bold"
                      />
                    </div>
                    <div className="space-y-0.5 col-span-2">
                      <label className="block font-bold text-violet-700">Amended Clauses</label>
                      <textarea
                        placeholder="e.g. Shipment deadline extended."
                        value={amendClauseInput}
                        onChange={(e) => setAmendClauseInput(e.target.value)}
                        className="w-full bg-white border border-violet-200 rounded px-2 py-1 text-xs h-10 resize-none"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-1 pt-1 index-wrap">
                    <span className="text-[9px] font-bold text-violet-600 bg-violet-100/50 px-2 py-0.5 rounded">
                      {currentAmendments.length > 0 ? `🚨 ${currentAmendments.length} Amend` : '✓ Original Copy'}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        if (!amendClauseInput.trim()) {
                          alert("Please provide the amended clauses description!");
                          return;
                        }
                        const parsedAmount = parseFloat(amendAmountInput);
                        const updatedAmount = isNaN(parsedAmount) ? activePack.totalAmount : parsedAmount;
                        
                        const newAmendment: LcAmendment = {
                          id: `amend-${Date.now()}`,
                          amendmentDate: amendDateInput,
                          amendedClauses: amendClauseInput,
                          updatedAmount: updatedAmount
                        };

                        // Update activePack in state
                        const updatedPack = {
                          ...activePack,
                          totalAmount: updatedAmount,
                          billOfExchange1Text: activePack.billOfExchange1Text.replace(
                            /EXCHANGE FOR \$ [0-9,.]+/g,
                            `EXCHANGE FOR $ ${updatedAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                          ),
                          billOfExchange2Text: activePack.billOfExchange2Text.replace(
                            /EXCHANGE FOR \$ [0-9,.]+/g,
                            `EXCHANGE FOR $ ${updatedAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                          )
                        };
                        setActivePack(updatedPack);

                        // Synchronize history entry
                        const updatedHistory = generationHistory.map(h => {
                          if (h.id === activePackId || h.lcNo === activePack.lcNo) {
                            return {
                              ...h,
                              totalAmount: updatedAmount,
                              packData: updatedPack,
                              amendments: [...(h.amendments || []), newAmendment]
                            };
                          }
                          return h;
                        });
                        saveHistory(updatedHistory);
                        
                        setAmendClauseInput('');
                        setAmendAmountInput('');
                        alert("L/C Amendment has been logged and synchronized to history!");
                      }}
                      className="bg-violet-700 hover:bg-violet-800 text-white font-extrabold uppercase px-2.5 py-1.5 rounded text-[10px] cursor-pointer"
                    >
                      Log amendment
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-3 text-left">
                <div className="flex items-start gap-2 text-slate-700">
                  <Eye className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5 animate-pulse" />
                  <div>
                    <h5 className="font-extrabold text-xs uppercase text-slate-800">👁️ Document Preview Active</h5>
                    <p className="text-[10px] text-slate-500 mt-0.5">You are currently looking at the finalized document paper preview. Click the edit button below or switch modes above to modify document texts, date, or log official LC amendments.</p>
                  </div>
                </div>
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => setLcWorkspaceMode('edit')}
                    className="bg-amber-600 hover:bg-amber-700 text-white font-black hover:scale-[1.02] transform transition-all text-xs uppercase px-4 py-2 rounded-lg cursor-pointer flex items-center gap-1.5 shrink-0"
                  >
                    <Edit3 className="w-4 h-4" /> Edit This Page
                  </button>
                )}
              </div>
            )}

            {/* Simulated Paper Sheets for Active Preview */}
            <div className="bg-slate-200 border border-slate-350 p-4 md:p-8 rounded-2xl flex justify-center overflow-x-auto min-h-[90vh]">
              
              {/* Dynamic rendering container matching exact PDF export styling */}
              <div 
                id={`lc-print-sheet-${activeDocTab}`} 
                className="w-[210mm] h-[297mm] bg-white text-slate-900 pt-[2mm] px-[15mm] pb-[15mm] border border-neutral-300 shadow-xl relative text-left box-border flex flex-col justify-between font-sans leading-relaxed text-xs overflow-hidden"
                style={{ fontFamily: '"Roboto", sans-serif' }}
              >
                <style>{`
                  [id^="lc-print-sheet-"] *:not(.lc-document-title-header):not(.truck-challan-title):not(.lc-company-logo-img):not(.lc-qr-code-img):not(button):not(svg):not(path) {
                    font-size: ${currentFontSize} !important;
                  }
                  .lc-doc-large-text,
                  .lc-doc-large-text *,
                  [id^="pdf-page-"] .lc-doc-large-text,
                  [id^="pdf-page-"] .lc-doc-large-text *,
                  [id^="lc-print-sheet-"] .lc-doc-large-text,
                  [id^="lc-print-sheet-"] .lc-doc-large-text * {
                    font-size: calc(${currentFontSize} + 1.5pt) !important;
                  }
                  .truck-challan-title {
                    font-size: 24pt !important;
                    font-weight: 900 !important;
                    white-space: nowrap !important;
                    letter-spacing: -0.04em !important;
                  }
                  [id^="lc-print-sheet-"] table tr {
                    height: ${currentRowHeight} !important;
                  }
                  [id^="lc-print-sheet-"] table tr td,
                  [id^="lc-print-sheet-"] table tr th {
                    height: ${currentRowHeight} !important;
                    padding-top: 0.1mm !important;
                    padding-bottom: 0.1mm !important;
                    line-height: 1.1 !important;
                  }
                `}</style>
                {/* Central Document Watermark */}
                {printWithWatermark && COMPANY_PROFILE.logo && COMPANY_PROFILE.useLogoInLc && activeDocTab !== 10 && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0 overflow-hidden" style={{ opacity: 0.11 }}>
                    <img 
                      src={COMPANY_PROFILE.logo} 
                      alt="Watermark" 
                      className="w-[60%] max-w-[340px] object-contain" 
                      referrerPolicy="no-referrer"
                      crossOrigin="anonymous"
                    />
                  </div>
                )}
                
                <div className="relative z-10">
                  {/* Global Uniform Header */}
                  {activeDocTab !== 10 && renderDocHeader(activeDocTab, documentTabs[activeDocTab - 1].title.toUpperCase())}

                  {/* Document 1 & 2: Bill of Exchange Copy */}
                  {(activeDocTab === 1 || activeDocTab === 2) && (
                    <div className="space-y-6 mt-6 lc-doc-large-text">
                      {renderDocumentSubHeader(activeDocTab)}

                      <div className="font-sans leading-relaxed whitespace-pre-wrap select-text py-2">
                        {renderFormattedDocText(getDocVal(activeDocTab))}
                      </div>
                    </div>
                  )}

                  {/* Document 3: Delivery Challan */}
                  {activeDocTab === 3 && (
                    <div className={`${dynamicSpacing} mt-4`}>
                      {renderDocumentSubHeader(3)}

                      <table className="w-full text-left border-collapse mt-2 text-neutral-800 font-sans border border-slate-300" style={{ fontSize: '6.5pt' }}>
                        <thead>
                          <tr className="bg-slate-100 font-extrabold uppercase border border-slate-300 text-[8.5pt]" style={{ fontSize: '8pt', height: '4mm' }}>
                            <th className="py-0.5 px-2 border border-slate-300" style={{ height: '4mm' }}>Product / Item Name</th>
                            <th className="py-0.5 px-2 border border-slate-300" style={{ height: '4mm' }}>Style & PO Number</th>
                            <th className="py-0.5 px-2 border border-slate-300 text-right" style={{ height: '4mm' }}>Quantity</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-300 border border-slate-300 text-[7.5pt]" style={{ fontSize: '6.5pt' }}>
                          {consolidatedItems.map((item, idx) => (
                            <tr key={idx} className="border border-slate-300" style={{ height: '4mm', minHeight: '4mm' }}>
                              <td className="py-0.5 px-2 border border-slate-300 font-semibold align-middle" style={{ fontSize: '6.5pt', height: '4mm' }}>{item.itemName}</td>
                              {idx === 0 && renderStyleAndPoColumn('delivery')}
                              <td className="py-0.5 px-2 border border-slate-300 text-right font-black align-middle" style={{ fontSize: '6.5pt', height: '4mm' }}>{item.totalQuantity.toLocaleString()} {item.unit}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      <div className={`grid grid-cols-3 gap-2 ${dynamicTextSize} font-bold text-slate-800 py-1.5 mt-2`}>
                        <p>Gross Weight: {distributedWeights.totalGross.toFixed(2)} Kgs</p>
                        <p className="text-center">Net Weight: {distributedWeights.totalNet.toFixed(2)} Kgs</p>
                        <p className="text-right">Total Packages: {getEnforcedCartons()}</p>
                      </div>

                      <div className={`${dynamicTextSize} text-neutral-800 italic leading-relaxed mt-2`} style={{ textAlign: 'justify', textAlignLast: 'left' }}>
                        {renderFormattedDocText(activePack.deliveryChallanText)}
                      </div>
                    </div>
                  )}

                  {/* Document 4: Packing List */}
                  {activeDocTab === 4 && (
                    <div className={`${dynamicSpacing} mt-4`}>
                      {renderDocumentSubHeader(4)}

                      <table className="w-full text-left border-collapse mt-2 text-neutral-800 font-sans border border-slate-300" style={{ fontSize: '6.5pt' }}>
                        <thead>
                          <tr className="bg-slate-100 font-extrabold uppercase border border-slate-300 text-[8.5pt]" style={{ fontSize: '8pt', height: '4mm' }}>
                            <th className="py-0.5 px-2 border border-slate-300" style={{ height: '4mm' }}>Product / Item Name</th>
                            <th className="py-0.5 px-2 border border-slate-300" style={{ height: '4mm' }}>Style & PO Number</th>
                            <th className="py-0.5 px-2 border border-slate-300 text-right" style={{ height: '4mm' }}>Quantity</th>
                            <th className="py-0.5 px-2 border border-slate-300 text-right" style={{ height: '4mm' }}>Carton Quantity</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-300 border border-slate-300 text-[7.5pt]" style={{ fontSize: '6.5pt' }}>
                          {consolidatedItems.map((item, idx) => {
                            const cartonQty = getItemCartonQty(item.itemName, item.totalQuantity, item.unit, idx);
                            return (
                              <tr key={idx} className="border border-slate-300" style={{ height: '4mm', minHeight: '4mm' }}>
                                <td className="py-0.5 px-2 border border-slate-300 font-semibold align-middle" style={{ fontSize: '6.5pt', height: '4mm' }}>{item.itemName}</td>
                                {idx === 0 && renderStyleAndPoColumn('packing')}
                                <td className="py-0.5 px-2 border border-slate-300 text-right font-black align-middle" style={{ fontSize: '6.5pt', height: '4mm' }}>{item.totalQuantity.toLocaleString()} {item.unit}</td>
                                <td className="py-0.5 px-2 border border-slate-300 text-right font-bold text-slate-705 align-middle" style={{ fontSize: '6.5pt', height: '4mm' }}>{cartonQty} CTN{cartonQty > 1 ? 's' : ''}</td>
                              </tr>
                            );
                          })}
                          <tr className="bg-slate-105 font-extrabold border-t border-slate-300 text-slate-900 text-[7.5pt]" style={{ fontSize: '6.5pt', height: '4mm' }}>
                            <td className="py-0.5 px-2 border border-slate-300 font-extrabold" style={{ height: '4mm' }}>GRAND TOTAL PACKAGES:</td>
                            <td className="py-0.5 px-2 border border-slate-300 text-right font-mono" style={{ height: '4mm' }}>-</td>
                            <td className="py-0.5 px-2 border border-slate-300 text-right font-mono" style={{ height: '4mm' }}>-</td>
                            <td className="py-0.5 px-2 border border-slate-300 text-right text-emerald-800 font-black" style={{ height: '4mm' }}>{getEnforcedCartons()}</td>
                          </tr>
                        </tbody>
                      </table>

                      {/* Consignment block omitted as per request */}

                      <div className={`${dynamicTextSize} text-neutral-800 italic leading-relaxed mt-2`} style={{ textAlign: 'justify', textAlignLast: 'left' }}>
                        {renderFormattedDocText(activePack.packingListText)}
                      </div>
                    </div>
                  )}

                  {/* Document 5: Commercial Invoice */}
                  {activeDocTab === 5 && (
                    <div className={`${dynamicSpacing} mt-4`}>
                      {renderDocumentSubHeader(5)}

                      <table className="w-full text-left border-collapse mt-2 text-neutral-800 font-sans border border-slate-300" style={{ fontSize: '6.5pt' }}>
                        <thead>
                          <tr className="bg-slate-100 font-extrabold uppercase border border-slate-300 text-[8.5pt]" style={{ fontSize: '8pt', height: '4mm' }}>
                            <th className="py-0.5 px-2 border border-slate-300" style={{ height: '4mm' }}>Item Accessories</th>
                            <th className="py-0.5 px-2 border border-slate-300" style={{ height: '4mm' }}>Style & PO Number</th>
                            <th className="py-0.5 px-2 border border-slate-300 text-right" style={{ height: '4mm' }}>Quantity</th>
                            <th className="py-0.5 px-2 border border-slate-300 text-right" style={{ height: '4mm' }}>Unit Price</th>
                            <th className="py-0.5 px-2 border border-slate-300 text-right" style={{ height: '4mm' }}>FOB Price</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-300 border border-slate-300 text-[7.5pt]" style={{ fontSize: '6.5pt' }}>
                          {consolidatedItems.map((item, idx) => (
                            <tr key={idx} className="border border-slate-300" style={{ height: '4mm', minHeight: '4mm' }}>
                              <td className="py-0.5 px-2 border border-slate-300 font-semibold align-middle" style={{ fontSize: '6.5pt', height: '4mm' }}>{item.itemName}</td>
                               {idx === 0 && renderStyleAndPoColumn('invoice')}
                              <td className="py-0.5 px-2 border border-slate-300 text-right font-black align-middle" style={{ fontSize: '6.5pt', height: '4mm' }}>{item.totalQuantity.toLocaleString()} {item.unit}</td>
                              <td className="py-0.5 px-2 border border-slate-300 text-right font-mono align-middle" style={{ fontSize: '6.5pt', height: '4mm' }}>${item.unitPrice.toFixed(4)}</td>
                              <td className="py-0.5 px-2 border border-slate-300 text-right font-black align-middle" style={{ fontSize: '6.5pt', height: '4mm' }}>${(item.totalQuantity * item.unitPrice).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                            </tr>
                          ))}
                          <tr className="bg-slate-105 font-extrabold border-t border-slate-300 text-[7.5pt]" style={{ fontSize: '6.5pt', height: '4mm' }}>
                            <td colSpan={4} className="py-0.5 px-2 border border-slate-300 font-black" style={{ height: '4mm' }}>GRAND TOTAL FOB VALUE:</td>
                            <td className="py-0.5 px-2 border border-slate-300 text-right text-emerald-800 font-black" style={{ fontSize: '6.5pt', height: '4mm' }}>${activePack.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                          </tr>
                        </tbody>
                      </table>

                      <div className={`${dynamicTextSize} text-neutral-800 italic leading-relaxed mt-2`} style={{ textAlign: 'justify', textAlignLast: 'left' }}>
                        {renderFormattedDocText(activePack.commercialInvoiceText)}
                      </div>
                    </div>
                  )}

                  {/* Document 6: Weight & Measurement List */}
                  {activeDocTab === 6 && (
                      <div className={`${dynamicSpacing} mt-4`}>
                        {renderDocumentSubHeader(6)}
   
                        <div className="border border-slate-200 rounded-xl overflow-hidden mt-3 text-xs font-sans">
                          <table className="w-full text-left font-sans border-collapse border border-slate-300" style={{ fontSize: '6.5pt' }}>
                            <thead>
                              <tr className="bg-slate-100 font-extrabold uppercase border border-slate-300 text-slate-700 text-[8.5pt]" style={{ fontSize: '8pt', height: '4mm' }}>
                                <th className="py-0.5 px-2 border border-slate-300" style={{ height: '4mm' }}>Product / Item Name</th>
                                <th className="py-0.5 px-2 border border-slate-300" style={{ height: '4mm' }}>Style & PO Number</th>
                                <th className="py-0.5 px-2 border border-slate-300 text-right" style={{ height: '4mm' }}>Quantity</th>
                                <th className="py-0.5 px-2 border border-slate-300 text-right" style={{ height: '4mm' }}>Net Weight (Kgs)</th>
                                <th className="py-0.5 px-2 border border-slate-300 text-right" style={{ height: '4mm' }}>Gross Weight (Kgs)</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-300 border border-slate-300 text-slate-800 text-[7.5pt]" style={{ fontSize: '6.5pt' }}>
                              {consolidatedItems.map((item, idx) => {
                                const net = consolidatedWeights.net[idx] || 0;
                                const gross = consolidatedWeights.gross[idx] || 0;
                                return (
                                  <tr key={idx} className="font-semibold text-slate-850 border border-slate-300" style={{ height: '4mm', minHeight: '4mm' }}>
                                    <td className="py-0.5 px-2 border border-slate-300 align-middle" style={{ fontSize: '6.5pt', height: '4mm' }}>{item.itemName}</td>
                                    {idx === 0 && renderStyleAndPoColumn('weight')}
                                    <td className="py-0.5 px-2 border border-slate-300 text-right align-middle" style={{ fontSize: '6.5pt', height: '4mm' }}>{item.totalQuantity.toLocaleString()} {item.unit}</td>
                                    <td className="py-0.5 px-2 border border-slate-300 text-right font-mono align-middle" style={{ fontSize: '6.5pt', height: '4mm' }}>{net.toFixed(2)} Kgs</td>
                                    <td className="py-0.5 px-2 border border-slate-300 text-right font-mono align-middle" style={{ fontSize: '6.5pt', height: '4mm' }}>{gross.toFixed(2)} Kgs</td>
                                  </tr>
                                );
                              })}
                              <tr className="bg-slate-200 font-extrabold text-slate-900 border-t border-slate-300 text-[7.5pt]" style={{ fontSize: '6.5pt', height: '4mm' }}>
                                <td className="py-0.5 px-2 border border-slate-300 font-extrabold" colSpan={3} style={{ height: '4mm' }}>GRAND TOTAL REGISTERED WEIGHTS:</td>
                                <td className="py-0.5 px-2 border border-slate-300 text-right font-mono text-emerald-800 font-black" style={{ fontSize: '6.5pt', height: '4mm' }}>{consolidatedWeights.totalNet.toFixed(2)} Kgs</td>
                                <td className="py-0.5 px-2 border border-slate-300 text-right font-mono text-emerald-800 font-black" style={{ fontSize: '6.5pt', height: '4mm' }}>{consolidatedWeights.totalGross.toFixed(2)} Kgs</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
   
                        <div className={`${dynamicTextSize} text-neutral-800 italic leading-relaxed mt-2`} style={{ textAlign: 'justify', textAlignLast: 'left' }}>
                          {renderFormattedDocText(activePack.weightMeasurementText)}
                        </div>
                       </div>
                     )}

                  {/* Document 7: Beneficiary Certificate */}
                  {activeDocTab === 7 && (
                    <div className="space-y-4 mt-6 lc-doc-large-text">
                      {renderDocumentSubHeader(7)}

                      <div className="space-y-4 leading-relaxed mt-4">
                        <h3 className="text-xs font-black border-b-[2px] border-slate-800 pb-1 uppercase tracking-tight">Atteestation Statement:</h3>
                        <div className="leading-relaxed whitespace-pre-wrap font-sans py-1">
                          {renderFormattedDocText(getDocVal(7))}
                        </div>
                      </div>
                    </div>
                  )}

                   {/* Document 8: Certificate of Origin */}
                   {activeDocTab === 8 && (
                      <div className="space-y-4 mt-6 lc-doc-large-text">
                        {renderDocumentSubHeader(8)}
 
                       <div className="space-y-4 mt-4 leading-relaxed">
                         <h3 className="text-xs font-black border-b-[2px] border-slate-800 pb-1 uppercase tracking-tight">Declarations Decree:</h3>
                         <div className="font-sans py-1" style={{ textAlign: 'justify', textAlignLast: 'left' }}>
                           {renderFormattedDocText(getDocVal(8).trim())}
                         </div>
                         <div className="font-black text-center uppercase tracking-wider text-emerald-800 py-1">
                           🇧🇩 100% INDIGENOUS PRODUCTION FACILITIES REPORT PASSED
                         </div>
                       </div>
                     </div>
                   )}

                  {/* Document 9: Purchase Application */}
                  {activeDocTab === 9 && (
                    <div className="space-y-4 mt-5">
                      <div className="text-[10px] font-bold">
                        <p><strong>Date:</strong> {formatDateToDDMMYYYY(activePack?.docDate || new Date().toISOString().substring(0, 10))}</p>
                        <p><strong>HS Code:</strong> {activePack.hsCode || '6217.10.00'}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-[10px] font-bold text-slate-700 leading-relaxed py-1">
                          <p className="text-[8px] uppercase font-bold text-slate-400">To Negotiating Bank:</p>
                          <p className="font-extrabold text-slate-900 mt-1">{piBankName}</p>
                          <p className="font-medium">{piBankBranch}</p>
                          <p className="text-slate-500 font-normal leading-tight mt-0.5">{piBankAddress}</p>
                        </div>

                        <div className="text-[10px] font-bold text-slate-755 leading-relaxed py-1">
                          <p className="text-[8px] uppercase font-bold text-slate-400">L/C Opening Bank Details:</p>
                          <p className="font-extrabold text-slate-900 mt-1">{activePack.lcBankName.toUpperCase()}</p>
                          <p className="font-medium">{activePack.lcBranch}</p>
                          <p className="text-slate-500 font-normal leading-tight mt-0.5">{activePack.lcAddress}</p>
                        </div>
                      </div>

                      <div className="space-y-3 mt-4 text-[10px] leading-relaxed">
                        <p><strong>Subject: Negotiation &amp; Purchase of Export Bills for USD ${activePack.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })} outstanding under L/C No {activePack.lcNo}</strong></p>
                        <div className="whitespace-pre-wrap font-sans text-neutral-800 text-[10px] py-1">
                          {renderFormattedDocText(getDocVal(9))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Document 10: Truck Challan */}
                  {activeDocTab === 10 && (
                    <div className={`${dynamicSpacing} mt-3 flex flex-col justify-between font-sans`}>
                      {/* Agency Header Banner */}
                      {!printWithHeader ? (
                        <div style={{ height: '0.9in' }} className="w-full shrink-0" />
                      ) : truckChallanHeader ? (
                        <>
                          <div className="text-center shrink-0" style={{ height: '0.9in', overflow: 'hidden' }}>
                            {truckChallanHeader.trim().startsWith('<svg') ? (
                              <div className="flex justify-center h-full w-full object-contain overflow-hidden" dangerouslySetInnerHTML={{ __html: truckChallanHeader }} />
                            ) : (
                              <img src={truckChallanHeader} alt="Truck Challan Header Banner" className="h-[0.9in] mx-auto object-contain" referrerPolicy="no-referrer" />
                            )}
                          </div>
                          <div className="w-auto ml-[-15mm] mr-[-15mm] border-b-2 border-slate-900 shrink-0" />
                        </>
                      ) : (
                        <>
                          <div className="flex justify-between items-stretch pb-1 font-sans shrink-0" style={{ height: '0.9in' }}>
                            {/* Left Panel (71% width) - Left Side */}
                            <div className="w-[71%] text-left flex flex-col justify-end select-text pr-[3mm] pb-0.5">
                              <h1 className="truck-challan-title text-[24pt] font-black tracking-tighter text-slate-950 font-sans uppercase leading-none pb-0.5 whitespace-nowrap" style={{ fontWeight: 900, fontSize: '24pt', whiteSpace: 'nowrap', letterSpacing: '-0.04em' }}>
                                M/S ASIA TRANSPORT AGENCY
                              </h1>
                              <p className="text-[7.5px] font-bold text-slate-500 uppercase tracking-wider leading-tight font-sans mt-0.5">
                                Transport Contractors and Commission Agents
                              </p>
                            </div>
                            
                            {/* Right Panel (29% width) - Right Side with 3mm gap */}
                            <div className="w-[29%] text-right flex flex-col justify-end text-slate-800 text-[6.5px] font-sans font-semibold space-y-0.5 leading-tight pl-[3mm] border-l border-slate-200">
                              <p className="leading-tight"><strong className="text-slate-950">Dhaka Office:</strong> 91-Tejgaon Truck Stand,<br />1-Railgate, Dhaka-1208.</p>
                              <p className="leading-tight mt-0.5"><strong className="text-slate-950">Chattogram Office:</strong> 809-Noar Chamber (2nd Floor), Kadamtali, Chattogram.</p>
                            </div>
                          </div>
                          {/* Edge-to-edge solid black divider line with NO margin */}
                          <div className="w-auto ml-[-15mm] mr-[-15mm] border-b-2 border-slate-900 shrink-0" />
                        </>
                      )}

                      {/* 2mm gap under header/empty space if header has logo & banner */}
                      <div style={{ height: '2mm' }} className="w-full shrink-0" />

                      {/* Centered Document Title */}
                      <div className="text-center mt-0 mb-1.5 font-sans shrink-0">
                        <h2 className="lc-document-title-header text-[13pt] font-black uppercase text-slate-950 tracking-wider font-['Roboto'] inline-block border-b border-slate-950 pb-1 px-4" style={{ fontFamily: "'Roboto', sans-serif", borderBottomWidth: '1.25pt' }}>
                          TRANSPORT CHALLAN
                        </h2>
                      </div>

                      {/* Section 1: Driver Details (No Outline Box, Only Divider Line) */}
                      <div className="grid grid-cols-3 gap-2 pb-2 mb-2 border-b border-slate-300 text-[8.5px] leading-relaxed font-sans mt-2">
                        <div>
                          <p><strong className="text-slate-500">Driver Name:</strong> <span className="text-slate-900 font-bold">{driverName}</span></p>
                          <p><strong className="text-slate-500">Father's Name:</strong> <span className="text-slate-800">Md. Karim</span></p>
                        </div>
                        <div>
                          <p><strong className="text-slate-500">Village:</strong> <span className="text-slate-800">Mithabon</span></p>
                          <p><strong className="text-slate-500">Thana:</strong> <span className="text-slate-800">Barhatta</span></p>
                        </div>
                        <div>
                          <p><strong className="text-slate-500">License No:</strong> <span className="text-slate-905 font-bold">4501</span></p>
                        </div>
                      </div>

                      {/* Section 2: Addresses & Vehicle (No Outline Box, Only Divider Line) */}
                      <div className="grid grid-cols-2 gap-x-4 gap-y-2 pb-2 mb-2 border-b border-slate-300 text-[8.5px] font-sans mt-2">
                        <div>
                          <p><strong className="text-slate-500">From:</strong> <span className="text-slate-900 font-extrabold">{COMPANY_PROFILE.name}</span></p>
                          <p><strong className="text-slate-500">Address:</strong> <span className="text-slate-800">{COMPANY_PROFILE.addresses.office}</span></p>
                        </div>
                        <div>
                          <p><strong className="text-slate-500">To:</strong> <span className="text-slate-900 font-extrabold">{selectedPi?.factoryName || "FACTORY SITE"}</span></p>
                          <p><strong className="text-slate-500">Address:</strong> <span className="text-slate-800">{selectedPi?.factoryAddress || "135/3, Arambagh, Motijheel, Dhaka-1000, Bangladesh."}</span></p>
                        </div>
                        <div className="col-span-2 border-t border-slate-200/50 pt-1">
                          <p><strong className="text-slate-500">Vehicle NO:</strong> <span className="text-slate-900 font-black tracking-wide uppercase">{truckNo}</span></p>
                        </div>
                      </div>

                      {/* Section 3: L/C & PI Reference details (No Outline Box, Only Divider Line) */}
                      <div className="grid grid-cols-2 gap-4 text-[8.5px] font-sans leading-tight mt-2 pb-2 mb-2 border-b border-slate-300">
                        <div className="space-y-0.5">
                          <p><strong className="text-slate-500">L/C No:</strong> <span className="text-slate-900 font-bold">{activePack.lcNo}</span></p>
                          <p><strong className="text-slate-500">L/C Date:</strong> <span className="text-slate-800">{formatDateToDDMMYYYY(activePack.lcDate)}</span></p>
                          <p><strong className="text-slate-500">Export SC NO:</strong> <span className="text-slate-900 font-bold">{activePack.exportScNo || "N/A"}</span></p>
                          <p><strong className="text-slate-500">HS Code:</strong> <span className="text-slate-900 font-bold">{activePack.hsCode || "6217.10.00"}</span></p>
                        </div>
                        <div className="space-y-0.5 text-right">
                          <p><strong className="text-slate-500">PI Reference:</strong> <span className="text-slate-800 font-semibold">{selectedPi?.invoiceNo} (Date: {formatDateToDDMMYYYY(selectedPi?.date)})</span></p>
                          <p><strong className="text-slate-500">Beneficiary Conc:</strong> <span className="text-slate-900 font-bold">{((selectedPi as any)?.beneficiary) || COMPANY_PROFILE.name}</span></p>
                          <p><strong className="text-slate-500">Export SC Date:</strong> <span className="text-slate-800 font-bold">{formatDateToDDMMYYYY(activePack.exportScDate)}</span></p>
                        </div>
                      </div>
                      <table className="w-full text-left border-collapse mt-2 text-neutral-800 font-sans border border-slate-300" style={{ fontSize: '6.5pt' }}>
                        <thead>
                          <tr className="bg-slate-100 font-extrabold uppercase border border-slate-300 text-[8.5pt]" style={{ fontSize: '8pt', height: '4mm' }}>
                            <th className="py-0.5 px-2 border border-slate-300" style={{ height: '4mm' }}>Product / Item Name</th>
                            <th className="py-0.5 px-2 border border-slate-300" style={{ height: '4mm' }}>Style & PO Number</th>
                            <th className="py-0.5 px-2 border border-slate-300 text-right" style={{ height: '4mm' }}>Quantity</th>
                            <th className="py-0.5 px-2 border border-slate-300 text-right" style={{ height: '4mm' }}>Carton Qty</th>
                            <th className="py-0.5 px-2 border border-slate-300 text-center" style={{ height: '4mm' }}>Rent</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-300 border border-slate-300 text-[7.5pt]" style={{ fontSize: '6.5pt' }}>
                          {consolidatedItems.map((item, idx) => {
                            const cartonQty = getItemCartonQty(item.itemName, item.totalQuantity, item.unit, idx);
                            return (
                              <tr key={idx} className="border border-slate-300" style={{ height: '4mm', minHeight: '4mm' }}>
                                <td className="py-0.5 px-2 border border-slate-300 font-semibold align-middle" style={{ fontSize: '6.5pt', height: '4mm' }}>{item.itemName}</td>
                                {idx === 0 && renderStyleAndPoColumn('truck')}
                                <td className="py-0.5 px-2 border border-slate-300 text-right font-black align-middle" style={{ fontSize: '6.5pt', height: '4mm' }}>{item.totalQuantity.toLocaleString()} {item.unit}</td>
                                <td className="py-0.5 px-2 border border-slate-300 text-right font-bold text-slate-705 align-middle" style={{ fontSize: '6.5pt', height: '4mm' }}>{cartonQty} CTN{cartonQty > 1 ? 's' : ''}</td>
                                {idx === 0 && (
                                  <td rowSpan={consolidatedItems.length} className="py-1 px-2 border border-slate-300 text-center text-slate-950 font-black align-middle bg-slate-50/70 w-[120px]" style={{ fontSize: '6.5pt' }}>
                                    ৳ {parseFloat(truckRent || '0').toLocaleString()} BDT
                                  </td>
                                )}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>

                      {/* Dynamic Rent & Packages */}
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        <div className="border border-slate-200 rounded-lg p-2 bg-slate-50 text-[9px] font-bold font-sans text-center">
                          <p className="text-slate-500 text-[7px] uppercase tracking-wider">Total Cartons / Packages</p>
                          <p className="text-slate-950 font-black text-xs mt-1">{getEnforcedCartons()}</p>
                        </div>
                        <div className="border border-slate-200 rounded-lg p-2 bg-slate-50 text-[9px] font-bold font-sans text-center">
                          <p className="text-slate-500 text-[7px] uppercase tracking-wider">Transportation Rent (Freight)</p>
                          <p className="text-slate-950 font-black text-xs mt-1">৳ {parseFloat(truckRent || '0').toLocaleString()} BDT Only</p>
                        </div>
                      </div>

                      {/* Signatures for Truck Challan */}
                      <div className="grid grid-cols-3 gap-4 pt-8 mt-6 text-center text-[7.5px] font-bold text-slate-505 uppercase">
                        <div>
                          <div className="border-t border-slate-300 pt-1" />
                          <p className="font-extrabold text-slate-800">Receiver's Signature</p>
                        </div>
                        <div>
                          <div className="border-t border-slate-300 pt-1" />
                          <p className="font-extrabold text-slate-800">Driver's Signature</p>
                        </div>
                        <div>
                          <div className="border-t border-slate-300 pt-1" />
                          <p className="font-extrabold text-slate-800">For Asia Transport Agency</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Document 11: Inspection Certificate */}
                  {activeDocTab === 11 && (
                    <div className="space-y-4 mt-6 lc-doc-large-text">
                      {renderDocumentSubHeader(11)}

                      <div className="space-y-4 leading-relaxed mt-4">
                        <h3 className="text-xs font-black border-b-[2px] border-slate-800 pb-1 uppercase tracking-tight">Atteestation Statement:</h3>
                        <div className="leading-relaxed whitespace-pre-wrap font-sans py-1">
                          {renderFormattedDocText(getDocVal(11))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Unified Corporate Footer on bottom margin */}
                {activeDocTab !== 10 && renderDocFooter()}
              </div>

            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-dashed border-slate-300 p-12 text-center rounded-2xl flex flex-col items-center justify-center space-y-3 font-sans">
          <BookOpen className="w-10 h-10 text-slate-300 animate-pulse" />
          <h4 className="text-sm font-black text-slate-700">No LC Document Pack Active Yet</h4>
          <p className="text-xs text-slate-500 max-w-sm">Select an active Proforma Invoice (PI) above and click on "Generate Complete LC Pack" to formulate the document kit.</p>
        </div>
      )}

      {/* Searchable LC Generation & Amendment History Log Table */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm text-xs font-sans p-6 text-left">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 gap-4">
          <div>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight flex items-center gap-1.5 leading-none">
              📜 LC Generations History &amp; Ledger Log Tracker
            </h3>
            <p className="text-[11px] text-slate-500 mt-1">All processed bundle generations and documented amendments are persistently archived below.</p>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by LC No or Invoice No..."
              value={historySearchQuery}
              onChange={(e) => setHistorySearchQuery(e.target.value)}
              className="pl-8 pr-4 py-1.5 border border-slate-300 rounded-lg text-xs bg-slate-50 focus:bg-white w-64 focus:outline-none placeholder-slate-400 font-medium"
            />
          </div>
        </div>

        {filteredHistory.length === 0 ? (
          <div className="text-center py-10 text-slate-400 font-medium flex flex-col items-center justify-center space-y-2">
            <BookOpen className="w-8 h-8 text-slate-300 animate-pulse" />
            <p>No historical LC generation packs found matching criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto mt-4">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-extrabold border-b border-slate-200 uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">L/C Number</th>
                  <th className="py-3 px-4">PI Number</th>
                  <th className="py-3 px-4">Date/Time Processed</th>
                  <th className="py-3 px-4">Beneficiary Name</th>
                  <th className="py-3 px-4 text-right">L/C Amount</th>
                  <th className="py-3 px-4 text-center">Amendments</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredHistory.map((item) => (
                  <React.Fragment key={item.id}>
                    <tr className="hover:bg-slate-50/70 transition-colors font-medium">
                      <td className="py-3 px-4 font-black text-slate-900">{item.lcNo}</td>
                      <td className="py-3 px-4 font-bold text-slate-500">PI-{item.piNo}</td>
                      <td className="py-3 px-4 text-slate-500 text-[11px] font-mono">{item.generationDateTime}</td>
                      <td className="py-3 px-4 text-slate-600 font-semibold">{item.beneficiaryName}</td>
                      <td className="py-3 px-4 text-right font-black text-emerald-800">${item.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${item.amendments.length > 0 ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-slate-50 text-slate-400'}`}>
                          {item.amendments.length} logged
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center space-x-2">
                        <button
                          type="button"
                          onClick={() => {
                            setActivePackId(item.id);
                            setLcWorkspaceMode(canEdit ? 'edit' : 'preview');
                            setActivePack(item.packData);
                            // Populate state fields
                            setLcNo(item.packData.lcNo);
                            setDefaultDocDate(item.packData.docDate || new Date().toISOString().substring(0, 10));
                            setLcDate(item.packData.lcDate);
                            setLcBankName(item.packData.lcBankName);
                            setLcBranch(item.packData.lcBranch);
                            setLcAddress(item.packData.lcAddress);
                            setExportScNo(item.packData.exportScNo);
                            setExportScDate(item.packData.exportScDate);
                            setLcTerms(item.packData.lcTerms || '120 DAYS SIGHT');
                            setHsCode(item.packData.hsCode || '6217.10.00');
                            setApplicantIrc(item.packData.applicantIrc || 'IRC-BD-48921');
                            setApplicantVat(item.packData.applicantVat || 'VAT-9912034');
                            setIssuingBankBin(item.packData.issuingBankBin || 'BIN-00129384');
                            setBeneficiaryBin(item.packData.beneficiaryBin || COMPANY_PROFILE.bin || '002903407-0202');
                            setTruckNo(item.packData.truckNo);
                            setTruckChallanNo(item.packData.truckChallanNo);
                            setTotalPackages(item.packData.totalPackages);
                            setGrossWeight(item.packData.grossWeight);
                            setNetWeight(item.packData.netWeight);
                            setDriverName(item.packData.driverName);
                            setDocFontSize(item.packData.docFontSize || '9.5pt');
                            setDocRowHeight(item.packData.docRowHeight || '4.5mm');
                            // Find matching PI to restore preview items and set SelectedPiId
                            const originalPi = pis.find(p => p.invoiceNo === item.piNo);
                            if (originalPi) {
                              setSelectedPiId(originalPi.id);
                            }
                            setActiveDocTab(1);
                            alert(canEdit ? `LC Pack ${item.lcNo} has been restored successfully in Edit workspace! You can edit, view or manage its amendment history live.` : `LC Pack ${item.lcNo} has been loaded in Preview workspace!`);
                          }}
                          className={`border px-2.5 py-1 rounded transition cursor-pointer font-bold ${
                            canEdit
                              ? 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-800'
                              : 'bg-indigo-50 hover:bg-indigo-100 border-indigo-200 text-indigo-800'
                          }`}
                        >
                          {canEdit ? 'Edit & Re-Load' : 'View / Preview'}
                        </button>
                        {canEdit && (
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm("Are you sure you want to permanently delete this specific LC generation version record?")) {
                                const updated = generationHistory.filter(h => h.id !== item.id);
                                saveHistory(updated);
                                if (activePackId === item.id) {
                                  setActivePack(null);
                                  setActivePackId(null);
                                }
                              }
                            }}
                            className="bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold px-2 py-1 rounded transition"
                          >
                            Delete
                          </button>
                        )}
                      </td>
                    </tr>
                    
                    {/* Amendments logs inline nested list */}
                    {item.amendments.length > 0 && (
                      <tr className="bg-slate-50/50">
                        <td colSpan={7} className="py-2.5 px-6">
                          <div className="border bg-white rounded-lg p-3 space-y-2 shadow-inner border-slate-200">
                            <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">📋 Amendment Trails Log</p>
                            <div className="divide-y divide-slate-100 text-[11px] font-sans">
                              {item.amendments.map((am, amIdx) => (
                                <div key={am.id} className="py-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                  <div>
                                    <span className="font-bold text-violet-700 mr-2">#{amIdx + 1}</span>
                                    <span className="font-medium text-slate-800">{am.amendedClauses}</span>
                                  </div>
                                  <div className="flex items-center gap-3 self-end sm:self-auto shrink-0 font-mono text-[10px] text-slate-500">
                                    <span>Date: {am.amendmentDate}</span>
                                    <span className="font-extrabold text-neutral-900 bg-neutral-100 px-1.5 py-0.5 rounded">New LC Amt: ${am.updatedAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* =========================================================================
          PDF Pages Rendering Target Anchor (Hidden Container used only for jsPDF compiler)
          ========================================================================= */}
      {activePack && (
        <div id="lc-pdf-export-anchor" className="fixed top-0 pointer-events-none select-none" style={{ left: '-9999px', width: '210mm', zIndex: -1 }}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(pIdx => (
            <div 
              key={pIdx}
              id={`pdf-page-${pIdx}`} 
              className="w-[210mm] h-[297mm] bg-white text-slate-900 pt-[2mm] px-[15mm] pb-[15mm] box-border relative flex flex-col justify-between font-sans leading-relaxed text-xs overflow-hidden"
              style={{ fontFamily: '"Roboto", sans-serif' }}
            >
              {/* Central Document Watermark */}
              {printWithWatermark && COMPANY_PROFILE.logo && COMPANY_PROFILE.useLogoInLc && pIdx !== 10 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0 overflow-hidden" style={{ opacity: 0.11 }}>
                  <img 
                    src={COMPANY_PROFILE.logo} 
                    alt="Watermark" 
                    className="w-[60%] max-w-[340px] object-contain" 
                    referrerPolicy="no-referrer"
                    crossOrigin="anonymous"
                  />
                </div>
              )}

              <div className="relative z-10 font-sans">
                {/* Global uniform header */}
                {pIdx !== 10 && renderDocHeader(pIdx, documentTabs[pIdx - 1].title.toUpperCase(), true)}

                {/* Documents 1 & 2: Bill of Exchange */}
                {(pIdx === 1 || pIdx === 2) && (
                  <div className="space-y-6 mt-6 font-sans lc-doc-large-text">
                    <div className="leading-relaxed whitespace-pre-wrap select-text py-2 font-sans">
                      {renderFormattedDocText(getDocVal(pIdx))}
                    </div>
                  </div>
                )}

                {/* Document 3: Delivery Challan */}
                {pIdx === 3 && (
                  <div className={`${dynamicSpacing} mt-4 font-sans`}>
                    <div className="grid grid-cols-2 gap-4 text-[10px] font-bold py-1.5 mb-2">
                      <div className="space-y-0.5">
                        <p><strong>Ref PI NO:</strong> {activePack.selectedPiNo}</p>
                        <p><strong>Dispatch Date:</strong> {formatDateToDDMMYYYY(activePack?.docDate || new Date().toISOString().substring(0, 10))}</p>
                        <p><strong>L/C No:</strong> {activePack.lcNo} Dated {formatDateToDDMMYYYY(activePack.lcDate)}</p>
                        <p><strong>HS Code:</strong> {activePack.hsCode || '6217.10.00'}</p>
                      </div>
                      <div className="space-y-0.5 text-right">
                        <p><strong>Buyer Factory:</strong> {selectedPi?.factoryName}</p>
                        <p><strong>Covered Van No:</strong> {activePack.truckNo}</p>
                        <p><strong>Driver Name:</strong> {activePack.driverName}</p>
                      </div>
                    </div>

                    <table className="w-full text-left border-collapse mt-2 text-neutral-800 font-sans border border-slate-300" style={{ fontSize: '6.5pt' }}>
                      <thead>
                        <tr className="bg-slate-100 font-extrabold uppercase border border-slate-300 text-[8.5pt]" style={{ fontSize: '8pt', height: '4mm' }}>
                          <th className="py-0.5 px-2 border border-slate-300" style={{ height: '4mm' }}>Product / Item Name</th>
                          <th className="py-0.5 px-2 border border-slate-300" style={{ height: '4mm' }}>Style & PO Number</th>
                          <th className="py-0.5 px-2 border border-slate-300 text-right" style={{ height: '4mm' }}>Quantity</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-305 border border-slate-300 text-[7.5pt]" style={{ fontSize: '6.5pt' }}>
                        {consolidatedItems.map((item, idx) => (
                          <tr key={idx} className="border border-slate-300" style={{ height: '4mm', minHeight: '4mm' }}>
                            <td className="py-0.5 px-2 border border-slate-300 font-semibold align-middle" style={{ fontSize: '6.5pt', height: '4mm' }}>
                              {item.itemName}
                            </td>
                            {idx === 0 && renderStyleAndPoColumn('delivery')}
                            <td className="py-0.5 px-2 border border-slate-300 text-right font-black align-middle" style={{ fontSize: '6.5pt', height: '4mm' }}>{item.totalQuantity.toLocaleString()} {item.unit}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    <div className={`grid grid-cols-3 gap-2 ${dynamicTextSize} font-bold text-slate-800 py-1.5 mt-2`}>
                      <p>Gross Weight: {distributedWeights.totalGross.toFixed(2)} Kgs</p>
                      <p className="text-center">Net Weight: {distributedWeights.totalNet.toFixed(2)} Kgs</p>
                      <p className="text-right">Total Packages: {getEnforcedCartons()}</p>
                    </div>

                    <div className={`${dynamicTextSize} text-neutral-800 italic leading-relaxed mt-2`} style={{ textAlign: 'justify', textAlignLast: 'left' }}>
                      {renderFormattedDocText(activePack.deliveryChallanText)}
                    </div>
                  </div>
                )}

                {/* Document 4: Packing List */}
                {pIdx === 4 && (
                  <div className={`${dynamicSpacing} mt-4 font-sans`}>
                    <div className="grid grid-cols-2 gap-4 text-[10px] font-bold py-1.5 mb-2">
                      <div className="space-y-0.5">
                        <p><strong>Ref PI NO:</strong> {selectedPi?.invoiceNo}</p>
                        <p><strong>Date:</strong> {formatDateToDDMMYYYY(activePack?.docDate || new Date().toISOString().substring(0, 10))}</p>
                        <p><strong>Buyer Factory:</strong> {selectedPi?.factoryName}</p>
                        <p><strong>HS Code:</strong> {activePack.hsCode || '6217.10.00'}</p>
                      </div>
                      <div className="space-y-0.5 text-right">
                        <p><strong>L/C No:</strong> {activePack.lcNo}</p>
                        <p><strong>L/C Date:</strong> {formatDateToDDMMYYYY(activePack.lcDate)}</p>
                        <p><strong>Total Cases:</strong> {getEnforcedCartons()}</p>
                      </div>
                    </div>

                    <table className="w-full text-left border-collapse mt-2 text-neutral-800 font-sans border border-slate-300" style={{ fontSize: '6.5pt' }}>
                      <thead>
                        <tr className="bg-slate-100 font-extrabold uppercase border border-slate-300 text-[8.5pt]" style={{ fontSize: '8pt', height: '4mm' }}>
                          <th className="py-0.5 px-2 border border-slate-300" style={{ height: '4mm' }}>Product / Item Name</th>
                          <th className="py-0.5 px-2 border border-slate-300" style={{ height: '4mm' }}>Style & PO Number</th>
                          <th className="py-0.5 px-2 border border-slate-300 text-right" style={{ height: '4mm' }}>Quantity</th>
                          <th className="py-0.5 px-2 border border-slate-300 text-right" style={{ height: '4mm' }}>Carton Quantity</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-300 border border-slate-300 text-[7.5pt]" style={{ fontSize: '6.5pt' }}>
                        {consolidatedItems.map((item, idx) => {
                          const cartonQty = getItemCartonQty(item.itemName, item.totalQuantity, item.unit, idx);
                          return (
                            <tr key={idx} className="border border-slate-300" style={{ height: '4mm', minHeight: '4mm' }}>
                              <td className="py-0.5 px-2 border border-slate-300 font-semibold align-middle" style={{ fontSize: '6.5pt', height: '4mm' }}>{item.itemName}</td>
                              {idx === 0 && renderStyleAndPoColumn('packing')}
                              <td className="py-0.5 px-2 border border-slate-300 text-right font-black align-middle" style={{ fontSize: '6.5pt', height: '4mm' }}>{item.totalQuantity.toLocaleString()} {item.unit}</td>
                              <td className="py-0.5 px-2 border border-slate-300 text-right font-bold text-slate-705 align-middle" style={{ fontSize: '6.5pt', height: '4mm' }}>{cartonQty} CTN{cartonQty > 1 ? 's' : ''}</td>
                            </tr>
                          );
                        })}
                        <tr className="bg-slate-105 font-extrabold border-t border-slate-300 text-slate-900 text-[7.5pt]" style={{ fontSize: '6.5pt', height: '4mm' }}>
                          <td className="py-0.5 px-2 border border-slate-300 font-extrabold" style={{ height: '4mm' }}>GRAND TOTAL PACKAGES:</td>
                          <td className="py-0.5 px-2 border border-slate-300 text-right font-mono" style={{ height: '4mm' }}>-</td>
                          <td className="py-0.5 px-2 border border-slate-300 text-right font-mono" style={{ height: '4mm' }}>-</td>
                          <td className="py-0.5 px-2 border border-slate-300 text-right text-emerald-800 font-black" style={{ height: '4mm' }}>{getEnforcedCartons()}</td>
                        </tr>
                      </tbody>
                    </table>

                    <div className={`${dynamicTextSize} text-neutral-800 italic leading-relaxed mt-2`} style={{ textAlign: 'justify', textAlignLast: 'left' }}>
                      {renderFormattedDocText(activePack.packingListText)}
                    </div>
                  </div>
                )}

                {/* Document 5: Commercial Invoice */}
                {pIdx === 5 && (
                  <div className={`${dynamicSpacing} mt-4 font-sans`}>
                    <div className="grid grid-cols-2 gap-4 text-[10px] font-bold py-1.5 mb-2">
                      <div className="space-y-0.5">
                        <p><strong>Ref PI NO:</strong> {selectedPi?.invoiceNo}</p>
                        <p><strong>Date:</strong> {formatDateToDDMMYYYY(activePack?.docDate || new Date().toISOString().substring(0, 10))}</p>
                        <p><strong>L/C No:</strong> {activePack.lcNo} Dated {formatDateToDDMMYYYY(activePack.lcDate)}</p>
                      </div>
                      <div className="space-y-0.5 text-right">
                        <p><strong>Exporter:</strong> {COMPANY_PROFILE.name}</p>
                        <p><strong>Buyer Name:</strong> {selectedPi?.buyerName}</p>
                        <p><strong>HS Code:</strong> {activePack.hsCode || '6217.10.00'}</p>
                      </div>
                    </div>

                    <table className="w-full text-left border-collapse mt-2 text-neutral-800 font-sans border border-slate-300" style={{ fontSize: '6.5pt' }}>
                      <thead>
                        <tr className="bg-slate-100 font-extrabold uppercase border border-slate-300 text-[8.5pt]" style={{ fontSize: '8pt', height: '4mm' }}>
                          <th className="py-0.5 px-2 border border-slate-300" style={{ height: '4mm' }}>Item Accessories</th>
                          <th className="py-0.5 px-2 border border-slate-300" style={{ height: '4mm' }}>Style & PO Number</th>
                          <th className="py-0.5 px-2 border border-slate-300 text-right" style={{ height: '4mm' }}>Quantity</th>
                          <th className="py-0.5 px-2 border border-slate-300 text-right" style={{ height: '4mm' }}>Unit Price</th>
                          <th className="py-0.5 px-2 border border-slate-300 text-right" style={{ height: '4mm' }}>FOB Price</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-300 border border-slate-300 text-[7.5pt]" style={{ fontSize: '6.5pt' }}>
                        {consolidatedItems.map((item, idx) => (
                          <tr key={idx} className="border border-slate-300" style={{ height: '4mm', minHeight: '4mm' }}>
                            <td className="py-0.5 px-2 border border-slate-300 font-semibold align-middle" style={{ fontSize: '6.5pt', height: '4mm' }}>{item.itemName}</td>
                            {idx === 0 && renderStyleAndPoColumn('invoice')}
                            <td className="py-0.5 px-2 border border-slate-300 text-right font-black align-middle" style={{ fontSize: '6.5pt', height: '4mm' }}>{item.totalQuantity.toLocaleString()} {item.unit}</td>
                            <td className="py-0.5 px-2 border border-slate-300 text-right font-mono align-middle" style={{ fontSize: '6.5pt', height: '4mm' }}>${item.unitPrice.toFixed(4)}</td>
                            <td className="py-0.5 px-2 border border-slate-300 text-right font-black align-middle" style={{ fontSize: '6.5pt', height: '4mm' }}>${(item.totalQuantity * item.unitPrice).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                          </tr>
                        ))}
                        <tr className="bg-slate-100 font-extrabold border-t border-slate-300 text-[7.5pt]" style={{ fontSize: '6.5pt', height: '4mm' }}>
                          <td colSpan={4} className="py-0.5 px-2 border border-slate-300 font-black" style={{ height: '4mm' }}>GRAND TOTAL FOB VALUE:</td>
                          <td className="py-0.5 px-2 border border-slate-300 text-right text-emerald-800 font-black" style={{ fontSize: '6.5pt', height: '4mm' }}>${activePack.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        </tr>
                      </tbody>
                    </table>

                    <div className={`${dynamicTextSize} text-neutral-800 italic leading-relaxed mt-2`} style={{ textAlign: 'justify', textAlignLast: 'left' }}>
                      {renderFormattedDocText(activePack.commercialInvoiceText)}
                    </div>
                  </div>
                )}

                 {/* Document 6: Weight Spec */}
                 {pIdx === 6 && (
                   <div className={`${dynamicSpacing} mt-4 font-sans`}>
                     <div className="grid grid-cols-2 gap-4 text-[10px] font-bold py-1.5 mb-2">
                       <div className="space-y-0.5">
                         <p><strong>Ref PI NO:</strong> {selectedPi?.invoiceNo}</p>
                         <p><strong>Date:</strong> {formatDateToDDMMYYYY(activePack?.docDate || new Date().toISOString().substring(0, 10))}</p>
                         <p><strong>L/C No:</strong> {activePack.lcNo}</p>
                         <p><strong>HS Code:</strong> {activePack.hsCode || '6217.10.00'}</p>
                       </div>
                       <div className="space-y-0.5 text-right font-bold w-full">
                         <p>Total Gross Weight: {distributedWeights.totalGross.toFixed(2)} Kgs</p>
                         <p>Total Net Weight: {distributedWeights.totalNet.toFixed(2)} Kgs</p>
                         <p>Total packages: {getEnforcedCartons()}</p>
                       </div>
                     </div>

                     <div className="border border-slate-200 rounded-xl overflow-hidden mt-3 text-xs font-sans">
                       <table className="w-full text-left font-sans border-collapse border border-slate-300" style={{ fontSize: '6.5pt' }}>
                         <thead>
                           <tr className="bg-slate-100 font-extrabold uppercase border border-slate-300 text-slate-700 text-[8.5pt]" style={{ fontSize: '8pt', height: '4mm' }}>
                             <th className="py-0.5 px-2 border border-slate-300" style={{ height: '4mm' }}>Product / Item Name</th>
                             <th className="py-0.5 px-2 border border-slate-300" style={{ height: '4mm' }}>Style & PO Number</th>
                             <th className="py-0.5 px-2 border border-slate-300 text-right" style={{ height: '4mm' }}>Quantity</th>
                             <th className="py-0.5 px-2 border border-slate-300 text-right" style={{ height: '4mm' }}>Net Weight (Kgs)</th>
                             <th className="py-0.5 px-2 border border-slate-300 text-right" style={{ height: '4mm' }}>Gross Weight (Kgs)</th>
                           </tr>
                         </thead>
                         <tbody className="divide-y divide-slate-300 border border-slate-300 text-slate-800 text-[7.5pt]" style={{ fontSize: '6.5pt' }}>
                           {consolidatedItems.map((item, idx) => {
                             const net = consolidatedWeights.net[idx] || 0;
                             const gross = consolidatedWeights.gross[idx] || 0;
                             return (
                               <tr key={idx} className="font-semibold text-slate-800 border border-slate-300" style={{ height: '4mm', minHeight: '4mm' }}>
                                 <td className="py-0.5 px-2 border border-slate-300 align-middle" style={{ fontSize: '6.5pt', height: '4mm' }}>{item.itemName}</td>
                                                                   {idx === 0 && renderStyleAndPoColumn('weight')}
                                 <td className="py-0.5 px-2 border border-slate-300 text-right align-middle" style={{ fontSize: '6.5pt', height: '4mm' }}>{item.totalQuantity.toLocaleString()} {item.unit}</td>
                                 <td className="py-0.5 px-2 border border-slate-300 text-right font-mono align-middle" style={{ fontSize: '6.5pt', height: '4mm' }}>{net.toFixed(2)} Kgs</td>
                                 <td className="py-0.5 px-2 border border-slate-300 text-right font-mono align-middle" style={{ fontSize: '6.5pt', height: '4mm' }}>{gross.toFixed(2)} Kgs</td>
                               </tr>
                             );
                           })}
                           <tr className="bg-slate-200 font-extrabold text-slate-900 border-t border-slate-300 text-[7.5pt]" style={{ fontSize: '6.5pt', height: '4mm' }}>
                             <td className="py-0.5 px-2 border border-slate-300 font-extrabold" colSpan={3} style={{ height: '4mm' }}>GRAND TOTAL REGISTERED WEIGHTS:</td>
                             <td className="py-0.5 px-2 border border-slate-300 text-right font-mono text-emerald-800 font-black" style={{ fontSize: '6.5pt', height: '4mm' }}>{consolidatedWeights.totalNet.toFixed(2)} Kgs</td>
                             <td className="py-0.5 px-2 border border-slate-300 text-right font-mono text-emerald-800 font-black" style={{ fontSize: '6.5pt', height: '4mm' }}>{consolidatedWeights.totalGross.toFixed(2)} Kgs</td>
                           </tr>
                         </tbody>
                       </table>
                     </div>

                     <div className={`${dynamicTextSize} text-neutral-800 italic leading-relaxed mt-2`} style={{ textAlign: 'justify', textAlignLast: 'left' }}>
                       {renderFormattedDocText(activePack.weightMeasurementText)}
                     </div>
                   </div>
                 )}

                {/* Document 7: Beneficiary Compliances */}
                {pIdx === 7 && (
                  <div className="space-y-4 mt-6 font-sans lc-doc-large-text">
                    <div className="space-y-4 leading-relaxed mt-4 font-sans">
                      <h3 className="text-xs font-black border-b border-slate-800 pb-1 uppercase tracking-tight">Atteestation Statement:</h3>
                      <div className="leading-relaxed whitespace-pre-wrap font-sans py-1">
                        {renderFormattedDocText(getDocVal(7))}
                      </div>
                    </div>
                  </div>
                )}

                 {/* Document 8: Certificate of Origin */}
                 {pIdx === 8 && (
                    <div className="space-y-4 mt-6 font-sans lc-doc-large-text">
                      <div className="space-y-4 mt-4 leading-relaxed font-sans">
                        <h3 className="text-xs font-black border-b-[2px] border-slate-800 pb-1 uppercase tracking-tight">Declarations Decree:</h3>
                        <div className="font-sans py-1" style={{ textAlign: 'justify', textAlignLast: 'left' }}>
                           {renderFormattedDocText(getDocVal(8).trim())}
                        </div>
                      </div>
                    </div>
                  )}

                {/* Document 9: Purchase Application */}
                {pIdx === 9 && (
                  <div className="space-y-4 mt-5 font-sans">
                    <div className="text-[10px] font-bold font-sans">
                      <p><strong>Date:</strong> {formatDateToDDMMYYYY(activePack?.docDate || new Date().toISOString().substring(0, 10))}</p>
                      <p><strong>HS Code:</strong> {activePack.hsCode || '6217.10.00'}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 font-sans">
                      <div className="text-[10px] font-bold text-slate-700 leading-relaxed py-1">
                        <p className="text-[8px] uppercase font-bold text-slate-400">To Negotiating Bank:</p>
                        <p className="font-extrabold text-slate-900 mt-1">{piBankName}</p>
                        <p className="font-medium">{piBankBranch}</p>
                        <p className="text-slate-500 font-normal leading-tight mt-0.5">{piBankAddress}</p>
                      </div>

                      <div className="text-[10px] font-bold text-slate-705 leading-relaxed py-1">
                        <p className="text-[8px] uppercase font-bold text-slate-400">L/C Opening Bank Details:</p>
                        <p className="font-extrabold text-slate-900 mt-1">{activePack.lcBankName.toUpperCase()}</p>
                        <p className="font-medium">{activePack.lcBranch}</p>
                        <p className="text-slate-500 font-normal leading-tight mt-0.5">{activePack.lcAddress}</p>
                      </div>
                    </div>

                    <div className="space-y-3 mt-4 text-[10px] leading-relaxed font-sans">
                      <p><strong>Subject: Negotiation &amp; Purchase of Export Bills for USD ${activePack.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })} outstanding under L/C No {activePack.lcNo}</strong></p>
                      <div className="whitespace-pre-wrap font-sans text-neutral-800 text-[10px] py-1">
                        {renderFormattedDocText(getDocVal(9))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Document 10: Transport Challan */}
                {pIdx === 10 && (
                  <div className={`${dynamicSpacing} mt-3 flex flex-col justify-between font-sans`}>
                    {/* Agency Header Banner */}
                    {!printWithHeader ? (
                      <div style={{ height: '0.9in' }} className="w-full shrink-0" />
                    ) : truckChallanHeader ? (
                      <>
                        <div className="text-center shrink-0" style={{ height: '0.9in', overflow: 'hidden' }}>
                          {truckChallanHeader.trim().startsWith('<svg') ? (
                            <div className="flex justify-center h-full w-full object-contain overflow-hidden" dangerouslySetInnerHTML={{ __html: truckChallanHeader }} />
                          ) : (
                            <img src={truckChallanHeader} alt="Truck Challan Header Banner" className="h-[0.9in] mx-auto object-contain" referrerPolicy="no-referrer" />
                          )}
                        </div>
                        <div className="w-auto ml-[-15mm] mr-[-15mm] border-b-2 border-slate-900 shrink-0" />
                      </>
                    ) : (
                      <>
                        <div className="flex justify-between items-stretch pb-1 font-sans shrink-0" style={{ height: '0.9in' }}>
                          {/* Left Panel (71% width) - Left Side */}
                          <div className="w-[71%] text-left flex flex-col justify-end select-text pr-[3mm] pb-0.5">
                            <h1 className="truck-challan-title text-[24pt] font-black tracking-tighter text-slate-950 font-sans uppercase leading-none pb-0.5 whitespace-nowrap" style={{ fontWeight: 900, fontSize: '24pt', whiteSpace: 'nowrap', letterSpacing: '-0.04em' }}>
                              M/S ASIA TRANSPORT AGENCY
                            </h1>
                            <p className="text-[7.5px] font-bold text-slate-500 uppercase tracking-wider leading-tight font-sans mt-0.5">
                              Transport Contractors and Commission Agents
                            </p>
                          </div>
                          
                          {/* Right Panel (29% width) - Right Side with 3mm gap */}
                          <div className="w-[29%] text-right flex flex-col justify-end text-slate-800 text-[6.5px] font-sans font-semibold space-y-0.5 leading-tight pl-[3mm] border-l border-slate-200">
                            <p className="leading-tight"><strong className="text-slate-950">Dhaka Office:</strong> 91-Tejgaon Truck Stand,<br />1-Railgate, Dhaka-1208.</p>
                            <p className="leading-tight mt-0.5"><strong className="text-slate-950">Chattogram Office:</strong> 809-Noar Chamber (2nd Floor), Kadamtali, Chattogram.</p>
                          </div>
                        </div>
                        {/* Edge-to-edge solid black divider line with NO margin */}
                        <div className="w-auto ml-[-15mm] mr-[-15mm] border-b-2 border-slate-900 shrink-0" />
                      </>
                    )}

                    {/* 2mm gap under header/empty space if header has logo & banner */}
                    <div style={{ height: '2mm' }} className="w-full shrink-0" />

                    {/* Centered Document Title */}
                    <div className="text-center mt-0 mb-1.5 font-sans shrink-0">
                      <h2 className="lc-document-title-header text-[13pt] font-black uppercase text-slate-950 tracking-wider font-['Roboto'] inline-block border-b border-slate-950 pb-1 px-4" style={{ fontFamily: "'Roboto', sans-serif", borderBottomWidth: '1.25pt' }}>
                        TRANSPORT CHALLAN
                      </h2>
                    </div>

                    {/* Section 1: Driver Details (No Outline Box, Only Divider Line) */}
                    <div className="grid grid-cols-3 gap-2 pb-2 mb-2 border-b border-slate-300 text-[8.5px] leading-relaxed font-sans mt-2">
                      <div>
                        <p><strong className="text-slate-500">Driver Name:</strong> <span className="text-slate-900 font-bold">{driverName}</span></p>
                        <p><strong className="text-slate-500">Father's Name:</strong> <span className="text-slate-800">Md. Karim</span></p>
                      </div>
                      <div>
                        <p><strong className="text-slate-500">Village:</strong> <span className="text-slate-800">Mithabon</span></p>
                        <p><strong className="text-slate-500">Thana:</strong> <span className="text-slate-800">Barhatta</span></p>
                      </div>
                      <div>
                        <p><strong className="text-slate-500">License No:</strong> <span className="text-slate-905 font-bold">4501</span></p>
                      </div>
                    </div>

                    {/* Section 2: Addresses & Vehicle (No Outline Box, Only Divider Line) */}
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 pb-2 mb-2 border-b border-slate-300 text-[8.5px] font-sans mt-2">
                      <div>
                        <p><strong className="text-slate-500">From:</strong> <span className="text-slate-900 font-extrabold">{COMPANY_PROFILE.name}</span></p>
                        <p><strong className="text-slate-500">Address:</strong> <span className="text-slate-800">{COMPANY_PROFILE.addresses.office}</span></p>
                      </div>
                      <div>
                        <p><strong className="text-slate-500">To:</strong> <span className="text-slate-900 font-extrabold">{selectedPi?.factoryName || "FACTORY SITE"}</span></p>
                        <p><strong className="text-slate-500">Address:</strong> <span className="text-slate-800">{selectedPi?.factoryAddress || "135/3, Arambagh, Motijheel, Dhaka-1000, Bangladesh."}</span></p>
                      </div>
                      <div className="col-span-2 border-t border-slate-200/50 pt-1">
                        <p><strong className="text-slate-500">Vehicle NO:</strong> <span className="text-slate-900 font-black tracking-wide uppercase">{truckNo}</span></p>
                      </div>
                    </div>

                    {/* Section 3: L/C & PI Reference details (No Outline Box, Only Divider Line) */}
                    <div className="grid grid-cols-2 gap-4 text-[8.5px] font-sans leading-tight mt-2 pb-2 mb-2 border-b border-slate-300">
                      <div className="space-y-0.5">
                        <p><strong className="text-slate-500">L/C No:</strong> <span className="text-slate-900 font-bold">{activePack.lcNo}</span></p>
                        <p><strong className="text-slate-500">L/C Date:</strong> <span className="text-slate-800">{formatDateToDDMMYYYY(activePack.lcDate)}</span></p>
                        <p><strong className="text-slate-500">Export SC NO:</strong> <span className="text-slate-900 font-bold">{activePack.exportScNo || "N/A"}</span></p>
                        <p><strong className="text-slate-500">HS Code:</strong> <span className="text-slate-900 font-bold">{activePack.hsCode || "6217.10.00"}</span></p>
                      </div>
                      <div className="space-y-0.5 text-right">
                        <p><strong className="text-slate-500">PI Reference:</strong> <span className="text-slate-800 font-semibold">{selectedPi?.invoiceNo} (Date: {formatDateToDDMMYYYY(selectedPi?.date)})</span></p>
                        <p><strong className="text-slate-500">Beneficiary Conc:</strong> <span className="text-slate-900 font-bold">{((selectedPi as any)?.beneficiary) || COMPANY_PROFILE.name}</span></p>
                        <p><strong className="text-slate-500">Export SC Date:</strong> <span className="text-slate-800 font-bold">{formatDateToDDMMYYYY(activePack.exportScDate)}</span></p>
                      </div>
                    </div>

                    {/* 5-Column Consolidated Transport Table */}
                    <table className="w-full text-left border-collapse mt-2 text-neutral-800 font-sans border border-slate-300" style={{ fontSize: '6.5pt' }}>
                      <thead>
                        <tr className="bg-slate-100 font-extrabold uppercase border border-slate-300 text-[8.5pt]" style={{ fontSize: '8pt', height: '4mm' }}>
                          <th className="py-0.5 px-2 border border-slate-300" style={{ height: '4mm' }}>Product / Item Name</th>
                          <th className="py-0.5 px-2 border border-slate-300" style={{ height: '4mm' }}>Style & PO Number</th>
                          <th className="py-0.5 px-2 border border-slate-300 text-right" style={{ height: '4mm' }}>Quantity</th>
                          <th className="py-0.5 px-2 border border-slate-300 text-right" style={{ height: '4mm' }}>Carton Qty</th>
                          <th className="py-0.5 px-2 border border-slate-300 text-center" style={{ height: '4mm' }}>Rent</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-300 border border-slate-300 text-[7.5pt]" style={{ fontSize: '6.5pt' }}>
                        {consolidatedItems.map((item, idx) => {
                          const cartonQty = getItemCartonQty(item.itemName, item.totalQuantity, item.unit, idx);
                          return (
                            <tr key={idx} className="border border-slate-300" style={{ height: '4mm', minHeight: '4mm' }}>
                              <td className="py-0.5 px-2 border border-slate-300 font-semibold align-middle" style={{ fontSize: '6.5pt', height: '4mm' }}>{item.itemName}</td>
                              {idx === 0 && (
                                <td rowSpan={consolidatedItems.length} className="py-1 px-2 border border-slate-300 bg-white font-mono align-top w-[200px]" style={{ fontSize: '6.5pt', width: '200px' }}>
                                  <div className="space-y-1.5">
                                    <div>
                                      <span className="text-[5.5pt] uppercase font-bold text-slate-505 block leading-none mb-0.5" style={{ fontSize: '5.5pt' }}>STYLE / REF:</span>
                                      <div className="font-extrabold text-slate-905 flex flex-wrap gap-1 leading-tight">
                                        {allUniqueStylesForLc.length > 0 ? (
                                          allUniqueStylesForLc.map((style, stIdx) => (
                                            <span key={stIdx} className="bg-slate-105 border border-slate-200 text-slate-800 px-1 rounded-sm text-[5.5pt] font-semibold" style={{ fontSize: '5.5pt' }}>{style}</span>
                                          ))
                                        ) : (
                                          <span className="text-slate-450 italic font-sans font-normal" style={{ fontSize: '5.5pt' }}>N/A</span>
                                        )}
                                      </div>
                                    </div>
                                    {allUniquePOsForLc.length > 0 && (
                                      <div className="pt-1.5 border-t border-slate-205">
                                        <span className="text-[5.5pt] uppercase font-bold text-slate-505 block leading-none mb-0.5" style={{ fontSize: '5.5pt' }}>PO NUMBER:</span>
                                        <div className="font-extrabold text-slate-905 flex flex-wrap gap-1 leading-tight">
                                          {allUniquePOsForLc.map((po, poIdx) => (
                                            <span key={poIdx} className="bg-slate-50 border border-slate-200 text-slate-805 px-1 rounded-sm text-[5.5pt] font-semibold" style={{ fontSize: '5.5pt' }}>{po}</span>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </td>
                              )}
                              <td className="py-0.5 px-2 border border-slate-300 text-right font-black align-middle" style={{ fontSize: '6.5pt', height: '4mm' }}>{item.totalQuantity.toLocaleString()} {item.unit}</td>
                              <td className="py-0.5 px-2 border border-slate-300 text-right font-bold text-slate-705 align-middle" style={{ fontSize: '6.5pt', height: '4mm' }}>{cartonQty} CTN{cartonQty > 1 ? 's' : ''}</td>
                              {idx === 0 && (
                                <td rowSpan={consolidatedItems.length} className="py-1 px-2 border border-slate-300 text-center text-slate-950 font-black align-middle bg-slate-50/70 w-[120px]" style={{ fontSize: '6.5pt' }}>
                                  ৳ {parseFloat(truckRent || '0').toLocaleString()} BDT
                                </td>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>

                    {/* Dynamic Rent & Packages */}
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <div className="border border-slate-200 rounded-lg p-2 bg-slate-50 text-[9px] font-bold font-sans text-center">
                        <p className="text-slate-500 text-[7px] uppercase tracking-wider">Total Cartons / Packages</p>
                        <p className="text-slate-950 font-black text-xs mt-1">{getEnforcedCartons()}</p>
                      </div>
                      <div className="border border-slate-200 rounded-lg p-2 bg-slate-50 text-[9px] font-bold font-sans text-center">
                        <p className="text-slate-500 text-[7px] uppercase tracking-wider">Transportation Rent (Freight)</p>
                        <p className="text-slate-950 font-black text-xs mt-1">৳ {parseFloat(truckRent || '0').toLocaleString()} BDT Only</p>
                      </div>
                    </div>

                    {/* Signatures for Truck Challan */}
                    <div className="grid grid-cols-3 gap-4 pt-8 border-t border-slate-200 mt-6 text-center text-[7.5px] font-bold text-slate-500 uppercase">
                      <div>
                        <div className="border-t border-slate-300 pt-1" />
                        <p className="font-extrabold text-slate-800">Receiver's Signature</p>
                      </div>
                      <div>
                        <div className="border-t border-slate-300 pt-1" />
                        <p className="font-extrabold text-slate-800">Driver's Signature</p>
                      </div>
                      <div>
                        <div className="border-t border-slate-300 pt-1" />
                        <p className="font-extrabold text-slate-800">For Asia Transport Agency</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Document 11: Inspection Certificate */}
                {pIdx === 11 && (
                  <div className="space-y-4 mt-6 font-sans lc-doc-large-text">
                    <div className="space-y-4 leading-relaxed mt-4 font-sans">
                      <h3 className="text-xs font-black border-b border-slate-800 pb-1 uppercase tracking-tight">Atteestation Statement:</h3>
                      <div className="leading-relaxed whitespace-pre-wrap font-sans py-1">
                        {renderFormattedDocText(getDocVal(11))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Uniform corporate footer */}
              {pIdx !== 10 && renderDocFooter()}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
