import React, { useState, useEffect, useMemo } from 'react';
import { ProformaInvoice } from '../types';
import { COMPANY_PROFILE } from '../data';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
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
  Search
} from 'lucide-react';

interface MergedTableItem {
  item: any;
  isFirstOfGroup: boolean;
  groupSize: number;
  stylePoRef: string;
}

function computeMergedItems(items: any[]): MergedTableItem[] {
  const groups: Record<string, any[]> = {};
  items.forEach(item => {
    const style = item.styleNumber || '';
    const po = item.poNumber || '';
    const key = `${style}|||${po}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  });
  
  const result: MergedTableItem[] = [];
  Object.entries(groups).forEach(([key, groupItems]) => {
    const [style, po] = key.split('|||');
    const stylePoRef = [style, po].filter(Boolean).join(' / ');
    groupItems.forEach((item, idx) => {
      result.push({
        item,
        isFirstOfGroup: idx === 0,
        groupSize: groupItems.length,
        stylePoRef: stylePoRef || 'N/A'
      });
    });
  });
  return result;
}

interface LcDocumentGeneratorProps {
  pis: ProformaInvoice[];
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
  truckNo: string;
  truckChallanNo: string;
  totalPackages: string;
  grossWeight: string;
  netWeight: string;
  driverName: string;
  selectedPiNo: string;
  totalAmount: number;
  currency: string;
  
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
}

export default function LcDocumentGenerator({ pis }: LcDocumentGeneratorProps) {
  // Input states
  const [lcNo, setLcNo] = useState('ATC-LC-2026-9921');
  const [lcDate, setLcDate] = useState(new Date().toISOString().substring(0, 10));
  const [lcBankName, setLcBankName] = useState('Eastern Bank PLC');
  const [lcBranch, setLcBranch] = useState('Principal Branch, Dilkusha C/A');
  const [lcAddress, setLcAddress] = useState('Dilkusha C/A, Dhaka-1000, Bangladesh');
  const [exportScNo, setExportScNo] = useState('SC-ATC-RE-7811');
  const [exportScDate, setExportScDate] = useState(new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10));
  const [selectedPiId, setSelectedPiId] = useState('');
  
  // Custom manual override amount option
  const [customLcAmount, setCustomLcAmount] = useState<string>('');

  // Logistics info states
  const [truckNo, setTruckNo] = useState('Dhaka Metro GA-4982');
  const [truckChallanNo, setTruckChallanNo] = useState('TC-99831');
  const [driverName, setDriverName] = useState('Md. Zaman');
  const [truckRent, setTruckRent] = useState('12500');
  const [totalPackages, setTotalPackages] = useState('15 Cartons');
  const [grossWeight, setGrossWeight] = useState('245.00 Kgs');
  const [netWeight, setNetWeight] = useState('215.00 Kgs');

  // Currently generated active document pack
  const [activePack, setActivePack] = useState<LcDocumentPack | null>(null);
  const [activeDocTab, setActiveDocTab] = useState<number>(1); // 1 to 10
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Generation & Amendment history states
  const [generationHistory, setGenerationHistory] = useState<LcHistoryEntry[]>([]);
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
            updatedPack.deliveryChallanText = `The goods detailed below have been delivered in sound merchantable condition to the factory site on account of PI No: ${piInvoiceNo} Dated ${refDate}. LC NO: ${lcNoVal} Dated ${lcDateVal} Drawn Under ${lcBankNameVal.toUpperCase()}, ${lcBranchVal} - ${lcAddressVal}. Export SC No: ${exportScNoVal} Dated ${exportScDateVal}.\n\nAll goods are received properly with good condition. Please receive and acknowledge under seal.`;
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

  // Pre-fill fields when PI changes
  useEffect(() => {
    if (selectedPi) {
      // Prioritize the PI's own weight specifications if they exist and are non-empty/valid
      const piNet = selectedPi.netWeight && selectedPi.netWeight !== 'N/A' && selectedPi.netWeight !== '' ? selectedPi.netWeight : '';
      const piGross = selectedPi.grossWeight && selectedPi.grossWeight !== 'N/A' && selectedPi.grossWeight !== '' ? selectedPi.grossWeight : '';

      // Programmatically calculate total weights fallback
      const calcNetFallback = selectedPi.items.reduce((sum, item) => {
        let factor = 0.015;
        const u = item.unit?.toLowerCase() || 'pcs';
        if (u === 'pcs') factor = 0.012;
        else if (u === 'dzn') factor = 0.144;
        else if (u === 'set') factor = 0.025;
        else if (u === 'yds') factor = 0.035;
        else if (u === 'roll') factor = 1.85;
        return sum + (item.totalQuantity * factor);
      }, 0);
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
      
      const calculatedCartons = selectedPi.items.reduce((sum, item) => sum + getItemCartonQty(item.itemName, item.totalQuantity), 0);
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
    return pi.items.reduce((sum, item) => sum + (item.totalQuantity * item.unitPrice), 0);
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

    const piTotal = currentComputedTotal;
    const moneyInWords = numberToWords(piTotal);

    const piNet = netWeight.toLowerCase().includes('kg') ? netWeight : `${netWeight} Kgs`;
    const piGross = grossWeight.toLowerCase().includes('kg') ? grossWeight : `${grossWeight} Kgs`;
    const piPackages = `${computedTotalCartons} Cartons`;

    // Advanced dynamic bank data mapping helpers
    const piBankName = selectedPi.bankDetails?.bankName || 'SHAHJALAL ISLAMI BANK LIMITED';
    const piBankBranch = selectedPi.bankDetails?.branch || 'ESKATON BRANCH';
    const piBankAddress = selectedPi.bankDetails?.address || 'ESKATON FANTASIA (1ST FLOOR) 122-123, NEW ESKTON ROAD, RAMNA, DHAKA-1000, BANGLADESH';

    // Initial default contents for all 10 documents representing reference requirements mapped dynamically
    const defaultPack: LcDocumentPack = {
      lcNo,
      lcDate,
      lcBankName,
      lcBranch,
      lcAddress,
      exportScNo,
      exportScDate,
      truckNo,
      truckChallanNo,
      totalPackages: piPackages,
      grossWeight: piGross,
      netWeight: piNet,
      driverName,
      selectedPiNo: selectedPi.invoiceNo,
      totalAmount: piTotal,
      currency: 'USD',

      billOfExchange1Text: `${COMPANY_PROFILE.name.toUpperCase()}\n\nEXCHANGE FOR $ ${piTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}\n\nDRAWN UNDER ${lcBankName.toUpperCase()}, (${lcBranch.toUpperCase()}) ${lcAddress.toUpperCase()}. 120 DAYS SIGHT FROM THE DATE OF ACCEPTANCE OF THIS FIRST OF EXCHANGE (SECOND OF THE SAME TENOR AND, DATE BEING UNPAID) PAY TO THE ORDER OF ${piBankName.toUpperCase()}, (${piBankBranch.toUpperCase()}), ${piBankAddress.toUpperCase()} THE SUM OF SAY U.S DOLLARS: ${moneyInWords}.\n\nDC NO: ${lcNo} DATE ${lcDate}\nEXPORT S/C NO. ${exportScNo} DATE ${exportScDate}\n\nVALUE RECEIVED AGAINST SHIPMENT OF GARMENT TRIM ACCESSORIES OVER SHORE`,
      
      billOfExchange2Text: `${COMPANY_PROFILE.name.toUpperCase()}\n\nEXCHANGE FOR $ ${piTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}\n\nDRAWN UNDER ${lcBankName.toUpperCase()}, (${lcBranch.toUpperCase()}) ${lcAddress.toUpperCase()}. 120 DAYS SIGHT FROM THE DATE OF ACCEPTANCE OF THIS SECOND OF EXCHANGE (FIRST OF THE SAME TENOR AND, DATE BEING UNPAID) PAY TO THE ORDER OF ${piBankName.toUpperCase()}, (${piBankBranch.toUpperCase()}), ${piBankAddress.toUpperCase()} THE SUM OF SAY U.S DOLLARS: ${moneyInWords}.\n\nDC NO: ${lcNo} DATE ${lcDate}\nEXPORT S/C NO. ${exportScNo} DATE ${exportScDate}\n\nVALUE RECEIVED AGAINST SHIPMENT OF GARMENT TRIM ACCESSORIES OVER SHORE`,
      
      deliveryChallanText: `The goods detailed below have been delivered in sound merchantable condition to the factory site on account of PI No: ${selectedPi.invoiceNo} Dated ${selectedPi.date || ''}. LC NO: ${lcNo} Dated ${lcDate} Drawn Under ${lcBankName.toUpperCase()}, ${lcBranch} - ${lcAddress}. Export SC No: ${exportScNo} Dated ${exportScDate}.\n\nAll goods are received properly with good condition. Please receive and acknowledge under seal.`,
      
      packingListText: `LC NO: ${lcNo} Dated ${lcDate} Drawn Under ${lcBankName.toUpperCase()}, ${lcBranch} - ${lcAddress}. Export SC No: ${exportScNo} Dated ${exportScDate}.\n\nAll goods are received properly with good condition.`,
      
      commercialInvoiceText: `LC NO: ${lcNo} Dated ${lcDate} Drawn Under ${lcBankName.toUpperCase()}, ${lcBranch} - ${lcAddress}. Export SC No: ${exportScNo} Dated ${exportScDate}.`,
      
      weightMeasurementText: `LC NO: ${lcNo} Dated ${lcDate} Drawn Under ${lcBankName.toUpperCase()}, ${lcBranch} - ${lcAddress}. Export SC No: ${exportScNo} Dated ${exportScDate}.\n\nAll goods are received properly with good condition.`,
      
      beneficiaryCertText: `Delivery Of Printing & Accessories goods as per our Proforma Invoice No. ${selectedPi.invoiceNo}, DATE- ${selectedPi.date || ''}, Establishment Against LC No. ${lcNo}, Date. ${lcDate}, Import against export sales Contract No. ${exportScNo}, Dated: ${exportScDate}, Applicant’s TIN NO. ${(selectedPi as any)?.buyerTin || "028374192083"}, BIN No. ${(selectedPi as any)?.buyerBin || "001925348-0201"}, HS Code no. 6217.10.00. Of Account of ${selectedPi.factoryName}, ${selectedPi.factoryAddress || ''}.\n\nWe have Certificate that the merchandise is of Bangladesh Origin.`,
      
      certificateOfOriginText: `WE HEREBY CERTIFY THAT THE UNDER-MENTIONED GOODS DISPATCHED TO M/S ${selectedPi.factoryName} ${selectedPi.factoryAddress || ''} ARE OF BANGLADESH ORIGIN AND MANUFACTURED IN INDIGENOUS PRODUCTION FACILITIES OF ${COMPANY_PROFILE.name.toUpperCase()} IN DHAKA, BANGLADESH.`,
      
      purchaseAppText: `Dear Sir,\nPlease Negotiation/purchase against L/C No. and others information are given below :\n\nL/C Opening Bank : ${lcBankName.toUpperCase()}\n                  ${lcBranch.toUpperCase()}, ${lcAddress.toUpperCase()}\nBTB L/C NO.& DATED : ${lcNo} DATE ${lcDate}\nL/C VALUE : $ ${piTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}\nPurchase Amount : 90%\n\nPlease take necessary action from your end.\n\nB. Regards\n\nMD Akbar Hossain`,
      
      truckChallanText: `Land consignment delivery challan representing transport of goods by Covered Van No: ${truckNo} from ${COMPANY_PROFILE.name} industrial factory point to applicant's premises.`
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

    setActivePack(defaultPack);
    setActiveDocTab(1); // Open Bill of Exchange 1st copy by default
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
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800;900&display=swap');
        body { margin: 0; padding: 12mm !important; background-color: #ffffff; color: #171717; font-family: 'Poppins', sans-serif !important; }
        .lc-a4-sheet { display: block !important; visibility: visible !important; width: 100% !important; margin: 0 !important; padding: 0 !important; border: none !important; box-shadow: none !important; }
        .lc-a4-sheet * { visibility: visible !important; font-family: 'Poppins', sans-serif !important; }
        @page { size: A4 portrait; margin: 12mm; }
      </style>
    `;

    printWindow.document.write(`
      <html>
        <head>
          <title>LC Doc-${activeDocTab} - ${activePack.lcNo}</title>
          ${styleLinks}
          ${customStyles}
        </head>
        <body class="bg-white">
          ${element.outerHTML}
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
    try {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      for (let i = 1; i <= 10; i++) {
        const pageElement = document.getElementById(`pdf-page-${i}`);
        if (!pageElement) continue;

        // Take high-DPI screenshot of vector elements perfectly simulating A4 96DPI viewport
        const canvas = await html2canvas(pageElement, {
          scale: 2, // Sharp crisp printing
          useCORS: true,
          allowTaint: true,
          logging: false,
          backgroundColor: '#ffffff',
          scrollX: 0,
          scrollY: 0,
          windowWidth: 794,
          windowHeight: 1122
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        
        if (i > 1) {
          pdf.addPage();
        }
        
        // Render image bleed A4
        pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297);
      }

      pdf.save(`LC_Complete_Document_Pack_${activePack.lcNo}.pdf`);
    } catch (error) {
      console.error("PDF generation error:", error);
      alert("Error occurred while generating combined PDF. Please try again.");
    } finally {
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
      10: 'truckChallanText'
    };
    
    const fieldKey = mapping[tabIndex];
    if (fieldKey) {
      setActivePack({
        ...activePack,
        [fieldKey]: text
      });
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
      10: 'truckChallanText'
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
  ];

  // Dynamic formatting / scaling logic variables derived typesafely to fit single-page limits
  const itemCount = selectedPi?.items?.length || 1;
  const isCompact = itemCount > 5;
  const dynamicTextSize = isCompact ? 'text-[8.5pt]' : 'text-[9.5pt]';
  const dynamicHeadingSize = isCompact ? 'text-[10pt]' : 'text-[11pt]';
  const dynamicPadding = isCompact ? (itemCount > 10 ? 'py-1 px-1.5' : 'py-1.5 px-2.5') : 'py-2 px-3';
  const dynamicSpacing = isCompact ? (itemCount > 10 ? 'space-y-0.5' : 'space-y-2') : 'space-y-3';

  // Programmatic item-wise and quantity-wise weight calculations
  const getItemCartonQty = (itemName: string, quantity: number): number => {
    const lower = itemName.toLowerCase();
    let pcsPerCarton = 20000;
    if (lower.includes('label')) {
      pcsPerCarton = 30000;
    } else if (lower.includes('hang tag') && lower.includes('string')) {
      pcsPerCarton = 20000;
    } else if (lower.includes('tag string')) {
      pcsPerCarton = 20000;
    } else if (lower.includes('hang tag') || lower.includes('tag')) {
      pcsPerCarton = 10000;
    } else if (lower.includes('sticker')) {
      pcsPerCarton = 50000;
    }
    return Math.max(1, Math.ceil(quantity / pcsPerCarton));
  };

  const computedTotalCartons = useMemo(() => {
    if (!selectedPi) return 0;
    return selectedPi.items.reduce((sum, item) => sum + getItemCartonQty(item.itemName, item.totalQuantity), 0);
  }, [selectedPi]);

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

  const getEnforcedCartons = () => {
    return `${computedTotalCartons} Cartons`;
  };

  const piBankName = selectedPi?.bankDetails?.bankName || 'SHAHJALAL ISLAMI BANK LIMITED';
  const piBankBranch = selectedPi?.bankDetails?.branch || 'ESKATON BRANCH';
  const piBankAddress = selectedPi?.bankDetails?.address || 'ESKATON FANTASIA (1ST FLOOR) 122-123, NEW ESKTON ROAD, RAMNA, DHAKA-1000, BANGLADESH';

  // Uniform Corporate Layout Header
  const renderDocHeader = (docNo: number, title: string) => {
    const compName = COMPANY_PROFILE.name || "ACOOLA TRIMS CORPORATION";
    const compWords = compName.split(/\s+/);
    const firstTwoWords = compWords.slice(0, 2).join(' ');
    const remainingWords = compWords.slice(2).join(' ');
    
    const firstColor = COMPANY_PROFILE.line1Color || '#007D46';
    const secondColor = COMPANY_PROFILE.line2Color || '#ed1c24';
    const tagline = COMPANY_PROFILE.tagline || 'All Kinds of Garments Accessories Manufacturer & Supplier';
    
    const emailStr = COMPANY_PROFILE.emails.join(', ');
    const phoneStr = COMPANY_PROFILE.phones.map(p => {
      const clean = p.trim();
      if (clean.startsWith('+')) return clean;
      if (clean.startsWith('880')) return `+${clean}`;
      if (clean.startsWith('0')) return `+880 ${clean.slice(1)}`;
      return `+880 ${clean}`;
    }).join(', ');

    const showLogo = !!(COMPANY_PROFILE.logo && COMPANY_PROFILE.useLogoInHeader);

    return (
      /* MODE A/B: UNIFIED PREMIUM TEXT/GRAPHIC HEADER */
      <div className="w-full font-sans text-left mb-1 shrink-0">
        <div className="flex items-center justify-between w-full pb-1 select-none">
          <div className="flex items-center min-w-0 flex-1" style={{ gap: '3mm' }}>
            {showLogo && (
              <div className="w-[72px] h-[72px] flex items-center justify-center bg-white shrink-0 overflow-hidden">
                <img 
                  src={COMPANY_PROFILE.logo} 
                  alt="Company Logo" 
                  className="max-w-full max-h-full object-contain" 
                  referrerPolicy="no-referrer" 
                />
              </div>
            )}
            {COMPANY_PROFILE.headerTitleImg ? (
              /* Left Block Graphic Override Case (SVG, PNG, JPG Title Graphic) next to physical logo block */
              <div className="h-[75px] flex items-center shrink-0 min-w-0 flex-1 w-full">
                <img 
                  src={COMPANY_PROFILE.headerTitleImg} 
                  alt="Corporate Title Banner" 
                  className="w-full h-[75px] object-contain object-left block" 
                  referrerPolicy="no-referrer"
                />
              </div>
            ) : (
              /* Left Block: Styled Text with default normal margins and word spacing */
              <div className="text-left font-['Poppins'] min-w-0 flex-1 w-full" style={{ fontFamily: "'Poppins', sans-serif" }}>
                <h1 className="font-extrabold uppercase text-[15pt] tracking-tight leading-none mb-1 text-slate-900">
                  <span style={{ color: firstColor }}>{firstTwoWords} </span>
                  <span style={{ color: secondColor }}>{remainingWords}</span>
                </h1>
                <p className="font-bold text-[8.5pt] text-slate-800 leading-snug mb-0.5">
                  {tagline}
                </p>
                <p className="font-medium text-[7.5pt] text-slate-600 leading-normal" style={{ whiteSpace: 'nowrap' }}>
                  E-mail: {emailStr} <span className="font-bold text-slate-400 mx-1">I</span> Phone: {phoneStr}
                </p>
              </div>
            )}
          </div>

          {/* Right Block: Vertical Divider & Dynamic QR Code (Strictly included on all documents) */}
          <div className="flex items-center shrink-0 h-[60px]" style={{ paddingLeft: '3mm', gap: '3mm' }}>
            <div className="w-[2.5px] h-full shrink-0 rounded-full" style={{ width: '2.5px', backgroundColor: '#0f172a', borderLeft: '2.5px solid #0f172a', webkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }} />
            <div className="border border-slate-900 p-0.5 bg-white flex items-center justify-center shrink-0 w-[54px] h-[54px]">
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(lcNo)}`}
                alt="LC QR Code"
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
                crossOrigin="anonymous"
              />
            </div>
          </div>
        </div>

        {/* Thick Page-Wide Colored Dividing Lines (No Left/Right Margin, exactly 210mm wide) */}
        <div className="ml-[-15mm] mr-[-15mm] flex flex-col gap-[2px] mt-1.5 select-none shrink-0" style={{ width: '210mm' }}>
          {COMPANY_PROFILE.line1Active && (
            <div className="w-full" style={{ height: '3px', minHeight: '3px', backgroundColor: COMPANY_PROFILE.line1Color, borderTop: `3px solid ${COMPANY_PROFILE.line1Color}`, webkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }} />
          )}
          {COMPANY_PROFILE.line2Active && (
            <div className="w-full" style={{ height: '3px', minHeight: '3px', backgroundColor: COMPANY_PROFILE.line2Color, borderTop: `3px solid ${COMPANY_PROFILE.line2Color}`, webkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }} />
          )}
        </div>

        {/* Centered Document Title inside default layout margins */}
        <div className="text-center mt-2.5 mb-2">
          <h2 className="text-[13pt] font-black uppercase text-slate-950 tracking-wider font-['Poppins'] inline-block border-b border-slate-950 pb-1 px-4" style={{ fontFamily: "'Poppins', sans-serif", borderBottomWidth: '0.5pt' }}>
            {title}
          </h2>
        </div>
      </div>
    );
  };

  const renderDocFooter = () => {
    const firstColor = COMPANY_PROFILE.line1Color || '#007D46';

    return (
      <div 
        className="flex flex-col items-center justify-center text-center font-['Poppins'] select-all"
        style={{ 
          position: 'absolute', 
          bottom: '5mm', 
          left: '0mm', 
          right: '0mm', 
          width: '210mm',
          fontFamily: "'Poppins', sans-serif" 
        }}
      >
        <div className="w-full">
          {/* Page-Wide Edge-To-Edge Horizontal Line (No margins, width 210mm) */}
          <div className="w-full mb-2" style={{ height: '2px', minHeight: '2px', backgroundColor: firstColor, borderTop: `2px solid ${firstColor}`, webkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }} />
          
          <div className="px-[15mm]">
            <p className="font-medium text-slate-800 leading-snug text-center" style={{ fontSize: '10pt' }}>
              Office: House No: 03, Road No: 07, Block-C, Mirpur-13, Dhaka-1216, Bangladesh.
            </p>
            <p className="font-medium text-slate-800 leading-snug mt-0.5 text-center" style={{ fontSize: '10pt' }}>
              Factory: 135/3, Arambagh, Motijheel, Dhaka-1000, Bangaldesh.
            </p>
          </div>
        </div>
      </div>
    );
  };

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
            <label className="block font-bold text-slate-700 font-sans">Export SC Number</label>
            <input
              type="text"
              value={exportScNo}
              onChange={(e) => setExportScNo(e.target.value)}
              placeholder="SC-ATC"
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 focus:bg-white text-xs text-slate-700"
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
            <label className="block font-bold text-slate-700 font-sans">Gross Weight (G.W.)</label>
            <input
              type="text"
              value={grossWeight}
              onChange={(e) => setGrossWeight(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 focus:bg-white text-xs font-semibold"
            />
          </div>

          <div className="lg:col-span-4 pt-4 flex flex-wrap gap-4 justify-end">
            <button
              type="button"
              onClick={handleCreateDocumentsPack}
              className="bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-[12px] uppercase px-5 py-2.5 rounded-lg cursor-pointer flex items-center justify-center gap-2 shadow Transition-all duration-150"
            >
              <Sparkles className="w-4 h-4" /> Generate Complete LC Pack (১০ টি এলসি ডকুমেন্ট তৈরি করুন)
            </button>
          </div>
        </div>
      </div>

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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Live Inline Textarea Editor to support "editable after creating" */}
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl space-y-2 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <h4 className="font-extrabold text-amber-900 text-xs flex items-center gap-1.5 uppercase font-sans">
                      ✍️ Edit Draft Copy (Document No: {activeDocTab})
                    </h4>
                  </div>
                  <p className="text-[10px] text-amber-800 font-medium font-sans mt-0.5">Editing text below updates the active document draft live prior to printing/compilation.</p>
                </div>
                <textarea
                  value={getDocVal(activeDocTab)}
                  onChange={(e) => updateDocText(activeDocTab, e.target.value)}
                  className="w-full bg-white border border-amber-250 rounded-lg p-3 font-sans text-xs text-neutral-800 h-32 focus:outline-none focus:ring-1 focus:ring-amber-500 shadow-inner mt-2 flex-grow"
                />
              </div>

              {/* LC Amendment History & Form Tracker */}
              <div className="bg-violet-50 border border-violet-200 p-4 rounded-xl space-y-3 flex flex-col justify-between">
                <div>
                  <h4 className="font-extrabold text-violet-900 text-xs flex items-center gap-1.5 uppercase font-sans">
                    ������️ LC Amendment History &amp; Tracker
                  </h4>
                  <p className="text-[10px] text-violet-800 font-medium font-sans mt-0.5">Track and record official letter of credit amendments. Updates synchronize back to logs.</p>
                </div>

                {/* Active Amendments Trail List inside Tracking Panel */}
                {currentAmendments.length > 0 && (
                  <div className="border border-violet-200 bg-white rounded-lg p-2.5 max-h-[140px] overflow-y-auto space-y-2 scrollbar-thin shadow-2xs">
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
                    <label className="block font-bold text-violet-700">Updated L/C Amount ($)</label>
                    <input
                      type="number"
                      placeholder="Amount"
                      value={amendAmountInput}
                      onChange={(e) => setAmendAmountInput(e.target.value)}
                      className="w-full bg-white border border-violet-200 rounded px-2 py-1 text-xs font-bold"
                    />
                  </div>
                  <div className="space-y-0.5 col-span-2">
                    <label className="block font-bold text-violet-700">Amended Clauses / Description</label>
                    <textarea
                      placeholder="e.g. Payment term shifted from 120 days to 90 days sight; Shipment deadline extended."
                      value={amendClauseInput}
                      onChange={(e) => setAmendClauseInput(e.target.value)}
                      className="w-full bg-white border border-violet-200 rounded px-2 py-1 text-xs h-12 resize-none"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 pt-1">
                  <span className="text-[9px] font-bold text-violet-600 bg-violet-100/50 px-2 py-0.5 rounded">
                    {currentAmendments.length > 0 ? `🚨 ${currentAmendments.length} Active Amendment(s)` : '✓ Original Copy'}
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
                        if (h.lcNo === activePack.lcNo) {
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
                    className="bg-violet-700 hover:bg-violet-800 text-white font-extrabold uppercase px-3 py-1.5 rounded text-[10px] cursor-pointer"
                  >
                    Log L/C Amendment
                  </button>
                </div>
              </div>
            </div>

            {/* Simulated Paper Sheets for Active Preview */}
            <div className="bg-slate-200 border border-slate-350 p-4 md:p-8 rounded-2xl flex justify-center overflow-x-auto min-h-[90vh]">
              
              {/* Dynamic rendering container matching exact PDF export styling */}
              <div 
                id={`lc-print-sheet-${activeDocTab}`} 
                className="w-[210mm] h-[297mm] bg-white text-slate-900 pt-[5mm] px-[15mm] pb-[15mm] border border-neutral-300 shadow-xl relative text-left box-border flex flex-col justify-between font-sans leading-relaxed text-xs overflow-hidden"
                style={{ fontFamily: '"Poppins", sans-serif' }}
              >
                {/* Central Document Watermark */}
                {COMPANY_PROFILE.logo && COMPANY_PROFILE.useLogoInLc && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0 overflow-hidden" style={{ opacity: 0.05 }}>
                    <img src={COMPANY_PROFILE.logo} alt="Watermark" className="w-[50%] max-w-[280px] object-contain" />
                  </div>
                )}
                
                <div className="relative z-10">
                  {/* Global Uniform Header */}
                  {activeDocTab !== 10 && renderDocHeader(activeDocTab, documentTabs[activeDocTab - 1].title.toUpperCase())}

                  {/* Document 1 & 2: Bill of Exchange Copy */}
                  {(activeDocTab === 1 || activeDocTab === 2) && (
                    <div className="space-y-6 mt-6">
                      <div className="grid grid-cols-2 gap-4 text-[10.5px] font-bold border-b border-dashed border-slate-300 pb-3">
                        <div className="space-y-0.5">
                          <p><strong>Ref PI/Invoice No:</strong> {selectedPi?.invoiceNo}</p>
                          <p><strong>Ref PI Date:</strong> {selectedPi?.date}</p>
                          <p><strong>Export Contract No:</strong> {activePack.exportScNo}</p>
                        </div>
                        <div className="space-y-0.5 text-right">
                          <p className="text-xs font-black text-slate-900">Exchange Amount: USD ${activePack.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                          <p className="font-mono text-[9px] text-slate-500">{activeDocTab === 1 ? 'Sole First Copy' : 'Sole Second Copy'}</p>
                        </div>
                      </div>

                      <div className="font-sans leading-relaxed whitespace-pre-wrap select-text p-4 bg-slate-50 rounded-xl border border-slate-200 text-[10.5px]">
                        {getDocVal(activeDocTab)}
                      </div>

                      <div className="grid grid-cols-1 gap-2 text-[10.5px]">
                        <p className="font-extrabold text-neutral-900">TO,</p>
                        <p className="font-bold">{activePack.lcBankName.toUpperCase()}</p>
                        <p className="font-medium text-slate-600">{activePack.lcBranch} - {activePack.lcAddress}</p>
                      </div>
                    </div>
                  )}

                  {/* Document 3: Delivery Challan */}
                  {activeDocTab === 3 && (
                    <div className={`${dynamicSpacing} mt-4`}>
                      <div className="grid grid-cols-2 gap-4 text-[10px] font-bold bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                        <div className="space-y-0.5">
                          <p><strong>Ref PI NO:</strong> {activePack.selectedPiNo}</p>
                          <p><strong>Dispatch Date:</strong> {new Date().toLocaleDateString()}</p>
                          <p><strong>L/C No:</strong> {activePack.lcNo} Dated {activePack.lcDate}</p>
                        </div>
                        <div className="space-y-0.5 text-right">
                          <p><strong>Buyer Factory:</strong> {selectedPi?.factoryName}</p>
                          <p><strong>Covered Van No:</strong> {activePack.truckNo}</p>
                          <p><strong>Driver Name:</strong> {activePack.driverName}</p>
                        </div>
                      </div>

                      <table className={`w-full ${dynamicTextSize} text-left border-collapse mt-2 text-neutral-800 font-sans border border-slate-300`}>
                        <thead>
                          <tr className="bg-slate-100 border-b border-slate-300 font-black">
                            <th className={`${dynamicPadding} border border-slate-300`}>Item Name / Particulars</th>
                            <th className={`${dynamicPadding} border border-slate-300`}>Style/PO Reference</th>
                            <th className={`${dynamicPadding} border border-slate-300 text-right`}>Delivered Quantity</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {(() => {
                            const rawItems = selectedPi?.items || [];
                            const mergedList = computeMergedItems(rawItems);
                            return mergedList.map((m, idx) => (
                              <tr key={idx} className="border-b border-slate-200">
                                <td className={`${dynamicPadding} border border-slate-300 font-semibold`}>
                                  {m.item.itemName}
                                  {m.item.sizes && m.item.sizes.length > 0 && (
                                    <span className="block text-[8px] font-normal text-slate-500 mt-0.5">
                                      {m.item.sizes.map(s => `${s.size}: ${s.quantity.toLocaleString()}`).join(' | ')}
                                    </span>
                                  )}
                                </td>
                                {m.isFirstOfGroup && (
                                  <td rowSpan={m.groupSize} className={`${dynamicPadding} border border-slate-300 font-bold bg-slate-50/50 align-middle text-slate-800`}>
                                    {m.stylePoRef}
                                  </td>
                                )}
                                <td className={`${dynamicPadding} border border-slate-300 text-right font-black`}>
                                  {m.item.totalQuantity.toLocaleString()} {m.item.unit}
                                </td>
                              </tr>
                            ));
                          })()}
                        </tbody>
                      </table>

                      <div className={`grid grid-cols-3 gap-2 ${dynamicTextSize} font-bold text-slate-700 bg-slate-50/70 p-2.5 border border-dashed border-slate-200`}>
                        <p>Gross Weight: {distributedWeights.totalGross.toFixed(2)} Kgs</p>
                        <p className="text-center">Net Weight: {distributedWeights.totalNet.toFixed(2)} Kgs</p>
                        <p className="text-right">Total Packages: {getEnforcedCartons()}</p>
                      </div>

                      <p className={`${dynamicTextSize} text-neutral-800 italic leading-relaxed mt-2`} style={{ textAlign: 'justify', textAlignLast: 'left' }}>{activePack.deliveryChallanText}</p>
                    </div>
                  )}

                  {/* Document 4: Packing List */}
                  {activeDocTab === 4 && (
                    <div className={`${dynamicSpacing} mt-4`}>
                      <div className="grid grid-cols-2 gap-4 text-[10px] font-bold bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                        <div className="space-y-0.5">
                          <p><strong>Ref PI NO:</strong> {selectedPi?.invoiceNo}</p>
                          <p><strong>Date:</strong> {new Date().toLocaleDateString()}</p>
                          <p><strong>Buyer Factory:</strong> {selectedPi?.factoryName}</p>
                        </div>
                        <div className="space-y-0.5 text-right">
                          <p><strong>L/C No:</strong> {activePack.lcNo}</p>
                          <p><strong>L/C Date:</strong> {activePack.lcDate}</p>
                          <p><strong>Total Cases:</strong> {getEnforcedCartons()}</p>
                        </div>
                      </div>

                      <table className={`w-full ${dynamicTextSize} text-left border-collapse mt-2 text-neutral-800 font-sans border border-slate-300`}>
                        <thead>
                          <tr className="bg-slate-100 border-b border-slate-300 font-black">
                            <th className={`${dynamicPadding} border border-slate-300`}>Particulars Description</th>
                            <th className={`${dynamicPadding} border border-slate-300`}>Style/PO Reference</th>
                            <th className={`${dynamicPadding} border border-slate-300 text-right`}>FOB Qty</th>
                            <th className={`${dynamicPadding} border border-slate-300 text-right`}>Carton Quantity</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {(() => {
                            const rawItems = selectedPi?.items || [];
                            const mergedList = computeMergedItems(rawItems);
                            return mergedList.map((m, idx) => {
                              const cartonQty = getItemCartonQty(m.item.itemName, m.item.totalQuantity);
                              return (
                                <tr key={idx} className="border-b border-slate-200">
                                  <td className={`${dynamicPadding} border border-slate-300 font-semibold`}>
                                    {m.item.itemName}
                                  </td>
                                  {m.isFirstOfGroup && (
                                    <td rowSpan={m.groupSize} className={`${dynamicPadding} border border-slate-300 font-bold bg-slate-50/50 align-middle text-slate-800`}>
                                      {m.stylePoRef}
                                    </td>
                                  )}
                                  <td className={`${dynamicPadding} border border-slate-300 text-right font-black`}>
                                    {m.item.totalQuantity.toLocaleString()} {m.item.unit}
                                  </td>
                                  <td className={`${dynamicPadding} border border-slate-300 text-right font-bold text-slate-700`}>
                                    {cartonQty} CTN{cartonQty > 1 ? 's' : ''}
                                  </td>
                                </tr>
                              );
                            });
                          })()}
                          <tr className="bg-slate-50 font-extrabold border-t border-slate-300 text-slate-900">
                            <td className={`${dynamicPadding} border border-slate-300`}>GRAND TOTAL PACKAGES:</td>
                            <td className={`${dynamicPadding} border border-slate-300`}>-</td>
                            <td className={`${dynamicPadding} border border-slate-300 text-right font-black`}>-</td>
                            <td className={`${dynamicPadding} border border-slate-300 text-right text-emerald-800 font-black`}>{getEnforcedCartons()}</td>
                          </tr>
                        </tbody>
                      </table>

                      <div className="border border-slate-300 p-2.5 rounded-lg mt-3 bg-slate-50 text-[9px] text-neutral-800 font-bold">
                        <p>🚛 Consignment Details: Transported by Covered Van {activePack.truckNo} under seal ID: PL-ATC-001</p>
                      </div>

                      <p className={`${dynamicTextSize} text-neutral-800 italic mt-2`} style={{ textAlign: 'justify', textAlignLast: 'left' }}>{activePack.packingListText}</p>
                    </div>
                  )}

                  {/* Document 5: Commercial Invoice */}
                  {activeDocTab === 5 && (
                    <div className={`${dynamicSpacing} mt-4`}>
                      <div className="grid grid-cols-2 gap-4 text-[10px] font-bold bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                        <div className="space-y-0.5">
                          <p><strong>Ref PI NO:</strong> {selectedPi?.invoiceNo}</p>
                          <p><strong>Date:</strong> {new Date().toLocaleDateString()}</p>
                          <p><strong>L/C No:</strong> {activePack.lcNo} Dated {activePack.lcDate}</p>
                        </div>
                        <div className="space-y-0.5 text-right">
                          <p><strong>Exporter:</strong> {COMPANY_PROFILE.name}</p>
                          <p><strong>Buyer Factory:</strong> {selectedPi?.factoryName}</p>
                          <p><strong>HS Code:</strong> {selectedPi?.hsCode || '6217.10.00'}</p>
                        </div>
                      </div>

                      <table className={`w-full ${dynamicTextSize} text-left border-collapse mt-2 text-neutral-800 font-sans border border-slate-300`}>
                        <thead>
                          <tr className="bg-slate-100 border-b border-slate-330 font-black">
                            <th className={`${dynamicPadding} border border-slate-300`}>Item Accessories</th>
                            <th className={`${dynamicPadding} border border-slate-300`}>Style/PO Reference</th>
                            <th className={`${dynamicPadding} border border-slate-300 text-right`}>Quantity</th>
                            <th className={`${dynamicPadding} border border-slate-300 text-right`}>Unit Price</th>
                            <th className={`${dynamicPadding} border border-slate-300 text-right`}>FOB Price</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {(() => {
                            const rawItems = selectedPi?.items || [];
                            const mergedList = computeMergedItems(rawItems);
                            return mergedList.map((m, idx) => (
                              <tr key={idx} className="border-b border-slate-200">
                                <td className={`${dynamicPadding} border border-slate-300 font-semibold`}>
                                  {m.item.itemName}
                                </td>
                                {m.isFirstOfGroup && (
                                  <td rowSpan={m.groupSize} className={`${dynamicPadding} border border-slate-300 font-bold bg-slate-50/50 align-middle text-slate-800`}>
                                    {m.stylePoRef}
                                  </td>
                                )}
                                <td className={`${dynamicPadding} border border-slate-300 text-right font-bold`}>
                                  {m.item.totalQuantity.toLocaleString()} {m.item.unit}
                                </td>
                                <td className={`${dynamicPadding} border border-slate-300 text-right font-mono`}>
                                  ${m.item.unitPrice.toFixed(4)}
                                </td>
                                <td className={`${dynamicPadding} border border-slate-300 text-right font-black`}>
                                  ${(m.item.totalQuantity * m.item.unitPrice).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </td>
                              </tr>
                            ));
                          })()}
                          <tr className="bg-slate-100 font-black border-t border-slate-350">
                            <td className={`${dynamicPadding} border border-slate-300`}>GRAND TOTAL FOB VALUE:</td>
                            <td className={`${dynamicPadding} border border-slate-300`}>-</td>
                            <td className={`${dynamicPadding} border border-slate-300 text-right font-black`}>-</td>
                            <td className={`${dynamicPadding} border border-slate-300 text-right font-black`}>-</td>
                            <td className={`${dynamicPadding} border border-slate-300 text-right text-emerald-800 font-black`}>
                              ${activePack.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        </tbody>
                      </table>

                      <p className={`${dynamicTextSize} text-neutral-800 italic mt-2`} style={{ textAlign: 'justify', textAlignLast: 'left' }}>{activePack.commercialInvoiceText}</p>
                    </div>
                  )}

                  {/* Document 6: Weight & Measurement List */}
                  {activeDocTab === 6 && (
                     <div className={`${dynamicSpacing} mt-4`}>
                       <div className="grid grid-cols-2 gap-4 text-[10px] font-bold bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                         <div className="space-y-0.5">
                           <p><strong>Ref PI NO:</strong> {selectedPi?.invoiceNo}</p>
                           <p><strong>Date:</strong> {new Date().toLocaleDateString()}</p>
                           <p><strong>L/C No:</strong> {activePack.lcNo}</p>
                         </div>
                         <div className="space-y-0.5 text-right w-full">
                           <p><strong>Gross Weight:</strong> {distributedWeights.totalGross.toFixed(2)} Kgs</p>
                           <p><strong>Net Weight:</strong> {distributedWeights.totalNet.toFixed(2)} Kgs</p>
                           <p><strong>Total packages:</strong> {getEnforcedCartons()}</p>
                         </div>
                       </div>
 
                       <div className="border border-slate-200 rounded-xl overflow-hidden mt-3 text-xs font-sans">
                         <table className="w-full text-left font-sans text-[10.5px] border border-slate-300">
                            <thead>
                              <tr className="bg-slate-100 border-b border-slate-350 font-bold text-slate-700">
                                <th className="p-2 border border-slate-300">Item Description</th>
                                <th className="p-2 border border-slate-300">Style/PO Reference</th>
                                <th className="p-2 border border-slate-300 text-right">Quantity</th>
                                <th className="p-2 border border-slate-300 text-right">Net Weight (Kgs)</th>
                                <th className="p-2 border border-slate-300 text-right">Gross Weight (Kgs)</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-slate-800">
                              {(() => {
                                const rawItems = selectedPi?.items || [];
                                const mergedList = computeMergedItems(rawItems);
                                return mergedList.map((m, idx) => {
                                  const rawIdx = rawItems.findIndex(x => x.id === m.item.id);
                                  const net = distributedWeights.net[rawIdx] || 0;
                                  const gross = distributedWeights.gross[rawIdx] || 0;
                                  return (
                                    <tr key={idx} className="font-semibold text-slate-800 hover:bg-slate-50/50">
                                      <td className="p-2 border border-slate-300">{m.item.itemName}</td>
                                      {m.isFirstOfGroup && (
                                        <td rowSpan={m.groupSize} className="p-2 border border-slate-300 font-bold bg-slate-50/50 align-middle text-slate-800">
                                          {m.stylePoRef}
                                        </td>
                                      )}
                                      <td className="p-2 border border-slate-300 text-right">{m.item.totalQuantity.toLocaleString()} {m.item.unit}</td>
                                      <td className="p-2 border border-slate-300 text-right font-mono">{net.toFixed(2)} Kgs</td>
                                      <td className="p-2 border border-slate-300 text-right font-mono">{gross.toFixed(2)} Kgs</td>
                                    </tr>
                                  );
                                });
                              })()}
                              <tr className="bg-slate-200 font-extrabold text-slate-900 border-t border-slate-300">
                                <td className="p-2 border border-slate-300">GRAND TOTAL REGISTERED WEIGHTS:</td>
                                <td className="p-2 border border-slate-300">-</td>
                                <td className="p-2 border border-slate-300 text-right font-black">-</td>
                                <td className="p-2 border border-slate-300 text-right font-mono">{distributedWeights.totalNet.toFixed(2)} Kgs</td>
                                <td className="p-2 border border-slate-300 text-right font-mono">{distributedWeights.totalGross.toFixed(2)} Kgs</td>
                              </tr>
                            </tbody>
                          </table>
                       </div>

                       <p className={`${dynamicTextSize} text-neutral-800 italic mt-2`} style={{ textAlign: 'justify', textAlignLast: 'left' }}>{activePack.weightMeasurementText}</p>
                     </div>
                   )}

                  {/* Document 7: Beneficiary Certificate */}
                  {activeDocTab === 7 && (
                    <div className="space-y-4 mt-6">
                      <div className="grid grid-cols-2 gap-4 text-[10.5px] font-bold bg-slate-50 p-3 rounded-xl border border-slate-200">
                        <div className="space-y-0.5">
                          <p><strong>Ref PI NO:</strong> {selectedPi?.invoiceNo}</p>
                          <p><strong>Date:</strong> {new Date().toLocaleDateString()}</p>
                          <p><strong>L/C No:</strong> {activePack.lcNo}</p>
                        </div>
                        <div className="space-y-0.5 text-right">
                          <p><strong>L/C Bank:</strong> {activePack.lcBankName}</p>
                          <p><strong>Applicant:</strong> {selectedPi?.factoryName}</p>
                        </div>
                      </div>

                      <div className="space-y-4 text-[11px] text-neutral-800 leading-relaxed mt-4">
                        <h3 className="text-xs font-black border-b-[2px] border-slate-800 pb-1 uppercase tracking-tight">Atteestation Statement:</h3>
                        <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl leading-relaxed whitespace-pre-wrap font-sans text-neutral-800 text-[10.5px]">
                          {getDocVal(7)}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Document 8: Certificate of Origin */}
                  {activeDocTab === 8 && (
                    <div className="space-y-4 mt-6">
                      <div className="grid grid-cols-2 gap-4 text-[10.5px] font-bold bg-slate-50 p-3 rounded-xl border border-slate-200">
                        <div className="space-y-0.5">
                          <p><strong>COO Ref:</strong> {selectedPi?.invoiceNo}</p>
                          <p><strong>Date:</strong> {new Date().toLocaleDateString()}</p>
                          <p><strong>Country of Manufacture:</strong> Bangladesh</p>
                        </div>
                        <div className="space-y-0.5 text-right font-bold w-full">
                          <p className="text-slate-500 font-bold">Consignee:</p>
                          <p className="text-slate-900 font-bold">{selectedPi?.factoryName}</p>
                          {selectedPi?.factoryAddress && (
                            <p className="text-slate-600 font-medium text-[9px] leading-snug">{selectedPi.factoryAddress}</p>
                          )}
                        </div>
                      </div>

                      <div className="space-y-4 text-[11px] mt-4 leading-relaxed">
                        <h3 className="text-xs font-black border-b-[2px] border-slate-800 pb-1 uppercase tracking-tight">Declarations Decree:</h3>
                        <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-center font-sans text-neutral-850 text-[10.5px]">
                          {getDocVal(8)}
                        </div>
                        <div className="border border-emerald-300 p-3 rounded-lg text-[9px] font-bold text-center uppercase tracking-wider text-emerald-800 bg-emerald-50">
                          🇧🇩 100% INDIGENOUS PRODUCTION FACILITIES REPORT PASSED
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Document 9: Purchase Application */}
                  {activeDocTab === 9 && (
                    <div className="space-y-4 mt-5">
                      <div className="text-[10px] font-bold">
                        <p><strong>Date:</strong> {new Date().toLocaleDateString()}</p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-[10px] font-bold text-slate-700 leading-relaxed bg-slate-50 p-3 border border-slate-200 rounded-xl">
                          <p className="text-[8px] uppercase font-bold text-slate-400">To Negotiating Bank:</p>
                          <p className="font-extrabold text-slate-900 mt-1">{piBankName}</p>
                          <p className="font-medium">{piBankBranch}</p>
                          <p className="text-slate-500 font-normal leading-tight mt-0.5">{piBankAddress}</p>
                        </div>

                        <div className="text-[10px] font-bold text-slate-705 leading-relaxed bg-slate-50 p-3 border border-slate-200 rounded-xl">
                          <p className="text-[8px] uppercase font-bold text-slate-400">L/C Opening Bank Details:</p>
                          <p className="font-extrabold text-slate-900 mt-1">{activePack.lcBankName.toUpperCase()}</p>
                          <p className="font-medium">{activePack.lcBranch}</p>
                          <p className="text-slate-500 font-normal leading-tight mt-0.5">{activePack.lcAddress}</p>
                        </div>
                      </div>

                      <div className="space-y-3 mt-4 text-[10px] leading-relaxed">
                        <p><strong>Subject: Negotiation &amp; Purchase of Export Bills for USD ${activePack.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })} outstanding under L/C No {activePack.lcNo}</strong></p>
                        <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl whitespace-pre-wrap font-sans text-neutral-800 text-[10px]">
                          {getDocVal(9)}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Document 10: Truck Challan */}
                  {activeDocTab === 10 && (
                    <div className={`${dynamicSpacing} mt-3 flex flex-col justify-between font-sans`}>
                      {/* Agency Header Banner */}
                      <div className="text-center border-b-2 border-slate-900 pb-2 font-sans">
                        <h2 className="text-sm font-black tracking-tight text-slate-950 font-sans">M/S ASIA TRANSPORT AGENCY</h2>
                        <p className="text-[7.5px] font-bold text-slate-500 uppercase tracking-widest font-sans mt-0.5">Head Office & Cargo Logistics Partner</p>
                        <div className="grid grid-cols-2 gap-2 text-[7px] text-slate-500 font-medium font-sans mt-1">
                          <p className="text-left leading-tight"><strong>Dhaka Office:</strong> 91-Tejgaon Truck Stand, 1-Railgate, Dhaka-1208</p>
                          <p className="text-right leading-tight"><strong>Chattogram Office:</strong> 809-Noar Chamber (2nd Floor), Kadamtali, Chattogram</p>
                        </div>
                      </div>

                      {/* Driver & Vehicle Static Replication */}
                      <div className="grid grid-cols-3 gap-2 border border-slate-200 rounded-lg p-2 bg-slate-50 text-[8.5px] leading-relaxed font-sans mt-2">
                        <div>
                          <p><strong className="text-slate-500">Driver Name:</strong> <span className="text-slate-900 font-bold">Md. Zaman</span></p>
                          <p><strong className="text-slate-500">Father's Name:</strong> <span className="text-slate-800">Md. Karim</span></p>
                        </div>
                        <div>
                          <p><strong className="text-slate-500">Village:</strong> <span className="text-slate-800">Mithabon</span></p>
                          <p><strong className="text-slate-500">Thana:</strong> <span className="text-slate-800">Barhatta</span></p>
                        </div>
                        <div>
                          <p><strong className="text-slate-500">License No:</strong> <span className="text-slate-900 font-bold">4501</span></p>
                          <p><strong className="text-slate-500">Vehicle No:</strong> <span className="text-slate-900 font-black">Dhaka Metro GA-4982</span></p>
                        </div>
                      </div>

                      {/* Where From & Where To */}
                      <div className="grid grid-cols-2 gap-2 border border-dashed border-slate-200 rounded p-1.5 text-[8.5px] font-sans mt-2">
                        <p><strong className="text-slate-500">From:</strong> <span className="text-slate-900 font-bold">Mirpur-13</span></p>
                        <p><strong className="text-slate-500">To Factory:</strong> <span className="text-slate-900 font-black">{selectedPi?.factoryAddress || "135/3, Arambagh, Motijheel, Dhaka-1000, Bangaldesh."}</span></p>
                      </div>

                      {/* Dynamic Mappings */}
                      <div className="grid grid-cols-2 gap-4 text-[8.5px] font-sans leading-tight mt-2 bg-slate-50/50 p-2 border border-slate-100 rounded-lg">
                        <div className="space-y-0.5">
                          <p><strong className="text-slate-500">L/C No:</strong> <span className="text-slate-900 font-bold">{activePack.lcNo}</span></p>
                          <p><strong className="text-slate-500">L/C Date:</strong> <span className="text-slate-800">{activePack.lcDate}</span></p>
                        </div>
                        <div className="space-y-0.5 text-right">
                          <p><strong className="text-slate-500">PI Reference:</strong> <span className="text-slate-800 font-semibold">{selectedPi?.invoiceNo} (Date: {selectedPi?.date})</span></p>
                          <p><strong className="text-slate-500">Beneficiary Conc:</strong> <span className="text-slate-900 font-bold">{((selectedPi as any)?.beneficiary) || COMPANY_PROFILE.name}</span></p>
                        </div>
                      </div>

                      <div className="border border-slate-300 rounded-lg overflow-hidden mt-2 font-sans bg-white pb-1">
                        <table className="w-full text-[8.5px] font-sans border-collapse border border-slate-300">
                          <thead>
                            <tr className="bg-slate-100 border-b border-slate-300 font-bold text-slate-800">
                              <th className="p-1.5 border border-slate-300">Goods Description</th>
                              <th className="p-1.5 border border-slate-300">Style/PO Reference</th>
                              <th className="p-1.5 border border-slate-300 text-right">Despatched Qty</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(() => {
                              const rawItems = selectedPi?.items || [];
                              const mergedList = computeMergedItems(rawItems);
                              return mergedList.map((m, idx) => (
                                <tr key={idx} className="border-b border-slate-250 font-semibold text-slate-900">
                                  <td className="p-1.5 border border-slate-300">{m.item.itemName}</td>
                                  {m.isFirstOfGroup && (
                                    <td rowSpan={m.groupSize} className="p-1.5 border border-slate-300 font-bold bg-slate-50/50 align-middle text-slate-800">
                                      {m.stylePoRef}
                                    </td>
                                  )}
                                  <td className="p-1.5 border border-slate-300 text-right">{m.item.totalQuantity.toLocaleString()} {m.item.unit}</td>
                                </tr>
                              ));
                            })()}
                          </tbody>
                        </table>
                      </div>
                      <div className="text-[8.5px] font-sans font-bold text-slate-600 mt-2">
                        <p><strong className="text-slate-500">Export Sales Contract:</strong> {activePack.exportScNo} (Date: {activePack.exportScDate})</p>
                      </div>

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
                            setActivePack(item.packData);
                            // Populate state fields
                            setLcNo(item.packData.lcNo);
                            setLcDate(item.packData.lcDate);
                            setLcBankName(item.packData.lcBankName);
                            setLcBranch(item.packData.lcBranch);
                            setLcAddress(item.packData.lcAddress);
                            setExportScNo(item.packData.exportScNo);
                            setExportScDate(item.packData.exportScDate);
                            setTruckNo(item.packData.truckNo);
                            setTruckChallanNo(item.packData.truckChallanNo);
                            setTotalPackages(item.packData.totalPackages);
                            setGrossWeight(item.packData.grossWeight);
                            setNetWeight(item.packData.netWeight);
                            setDriverName(item.packData.driverName);
                            // Find matching PI to restore preview items and set SelectedPiId
                            const originalPi = pis.find(p => p.invoiceNo === item.piNo);
                            if (originalPi) {
                              setSelectedPiId(originalPi.id);
                            }
                            setActiveDocTab(1);
                            alert(`LC Pack ${item.lcNo} has been restored successfully! You can edit, view or manage its amendment history live.`);
                          }}
                          className="bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 font-bold px-2.5 py-1 rounded transition"
                        >
                          Re-Load
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm("Are you sure you want to permanently delete this LC generation pack record?")) {
                              const updated = generationHistory.filter(h => h.id !== item.id && h.lcNo !== item.lcNo);
                              saveHistory(updated);
                              if (activePack && activePack.lcNo === item.lcNo) {
                                setActivePack(null);
                              }
                            }
                          }}
                          className="bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold px-2 py-1 rounded transition"
                        >
                          Delete
                        </button>
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
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(pIdx => (
            <div 
              key={pIdx}
              id={`pdf-page-${pIdx}`} 
              className="w-[210mm] h-[297mm] bg-white text-slate-900 pt-[5mm] px-[15mm] pb-[15mm] box-border relative flex flex-col justify-between font-sans leading-relaxed text-xs overflow-hidden"
              style={{ fontFamily: '"Poppins", sans-serif' }}
            >
              {/* Central Document Watermark */}
              {COMPANY_PROFILE.logo && COMPANY_PROFILE.useLogoInLc && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0 overflow-hidden" style={{ opacity: 0.05 }}>
                  <img src={COMPANY_PROFILE.logo} alt="Watermark" className="w-[50%] max-w-[280px] object-contain" />
                </div>
              )}

              <div className="relative z-10 font-sans">
                {/* Global uniform header */}
                {pIdx !== 10 && renderDocHeader(pIdx, documentTabs[pIdx - 1].title.toUpperCase())}

                {/* Documents 1 & 2: Bill of Exchange */}
                {(pIdx === 1 || pIdx === 2) && (
                  <div className="space-y-6 mt-6 font-sans">
                    <div className="grid grid-cols-2 gap-4 text-[10.5px] font-bold border-b border-dashed border-slate-300 pb-3 font-sans">
                      <div className="space-y-0.5">
                        <p><strong>Ref PI/Invoice No:</strong> {selectedPi?.invoiceNo}</p>
                        <p><strong>Ref PI Date:</strong> {selectedPi?.date}</p>
                        <p><strong>Export Contract No:</strong> {activePack.exportScNo}</p>
                      </div>
                      <div className="space-y-0.5 text-right font-sans">
                        <p className="text-xs font-black text-slate-900">Exchange Amount: USD ${activePack.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                        <p className="font-mono text-[9px] text-slate-500">{pIdx === 1 ? 'Sole First Copy' : 'Sole Second Copy'}</p>
                      </div>
                    </div>

                    <div className="leading-relaxed whitespace-pre-wrap select-text p-4 bg-slate-50 rounded-xl border border-slate-200 text-[10.5px] font-sans">
                      {getDocVal(pIdx)}
                    </div>

                    <div className="grid grid-cols-1 gap-2 text-[10.5px] font-sans">
                      <p className="font-extrabold text-neutral-900">TO,</p>
                      <p className="font-bold">{activePack.lcBankName.toUpperCase()}</p>
                      <p className="font-medium text-slate-600">{activePack.lcBranch} - {activePack.lcAddress}</p>
                    </div>
                  </div>
                )}

                {/* Document 3: Delivery Challan */}
                {pIdx === 3 && (
                  <div className={`${dynamicSpacing} mt-4 font-sans`}>
                    <div className="grid grid-cols-2 gap-4 text-[10px] font-bold bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                      <div className="space-y-0.5">
                        <p><strong>Ref PI NO:</strong> {activePack.selectedPiNo}</p>
                        <p><strong>Dispatch Date:</strong> {new Date().toLocaleDateString()}</p>
                        <p><strong>L/C No:</strong> {activePack.lcNo} Dated {activePack.lcDate}</p>
                      </div>
                      <div className="space-y-0.5 text-right">
                        <p><strong>Buyer Factory:</strong> {selectedPi?.factoryName}</p>
                        <p><strong>Covered Van No:</strong> {activePack.truckNo}</p>
                        <p><strong>Driver Name:</strong> {activePack.driverName}</p>
                      </div>
                    </div>

                    <table className={`w-full ${dynamicTextSize} text-left border-collapse mt-2 text-neutral-800 font-sans border border-slate-300`}>
                      <thead>
                        <tr className="bg-slate-100 border-b border-slate-300 font-black">
                          <th className={`${dynamicPadding} border border-slate-300`}>Item Name / Particulars</th>
                          <th className={`${dynamicPadding} border border-slate-300`}>Style/PO Reference</th>
                          <th className={`${dynamicPadding} border border-slate-300 text-right`}>Delivered Quantity</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(() => {
                          const rawItems = selectedPi?.items || [];
                          const mergedList = computeMergedItems(rawItems);
                          return mergedList.map((m, idx) => (
                            <tr key={idx} className="border-b border-slate-200">
                              <td className={`${dynamicPadding} border border-slate-300 font-semibold`}>
                                {m.item.itemName}
                                {m.item.sizes && m.item.sizes.length > 0 && (
                                  <span className="block text-[8px] font-normal text-slate-500 mt-0.5">
                                    {m.item.sizes.map(s => `${s.size}: ${s.quantity.toLocaleString()}`).join(' | ')}
                                  </span>
                                )}
                              </td>
                              {m.isFirstOfGroup && (
                                <td rowSpan={m.groupSize} className={`${dynamicPadding} border border-slate-300 font-bold bg-slate-50/50 align-middle text-slate-800`}>
                                  {m.stylePoRef}
                                </td>
                              )}
                              <td className={`${dynamicPadding} border border-slate-300 text-right font-black`}>
                                {m.item.totalQuantity.toLocaleString()} {m.item.unit}
                              </td>
                            </tr>
                          ));
                        })()}
                      </tbody>
                    </table>

                    <div className={`grid grid-cols-3 gap-2 ${dynamicTextSize} font-bold text-slate-700 bg-slate-50/75 p-2.5 border border-dashed border-slate-200`}>
                      <p>Gross Weight: {distributedWeights.totalGross.toFixed(2)} Kgs</p>
                      <p className="text-center">Net Weight: {distributedWeights.totalNet.toFixed(2)} Kgs</p>
                      <p className="text-right">Total Packages: {getEnforcedCartons()}</p>
                    </div>

                    <p className={`${dynamicTextSize} text-neutral-800 italic leading-relaxed mt-2`} style={{ textAlign: 'justify', textAlignLast: 'left' }}>{activePack.deliveryChallanText}</p>
                  </div>
                )}

                {/* Document 4: Packing List */}
                {pIdx === 4 && (
                  <div className={`${dynamicSpacing} mt-4 font-sans`}>
                    <div className="grid grid-cols-2 gap-4 text-[10px] font-bold bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                      <div className="space-y-0.5">
                        <p><strong>Ref PI NO:</strong> {selectedPi?.invoiceNo}</p>
                        <p><strong>Date:</strong> {new Date().toLocaleDateString()}</p>
                        <p><strong>Buyer Factory:</strong> {selectedPi?.factoryName}</p>
                      </div>
                      <div className="space-y-0.5 text-right">
                        <p><strong>L/C No:</strong> {activePack.lcNo}</p>
                        <p><strong>L/C Date:</strong> {activePack.lcDate}</p>
                        <p><strong>Total Cases:</strong> {getEnforcedCartons()}</p>
                      </div>
                    </div>

                    <table className={`w-full ${dynamicTextSize} text-left border-collapse mt-2 text-neutral-800 font-sans border border-slate-300`}>
                      <thead>
                        <tr className="bg-slate-100 border-b border-slate-300 font-black">
                          <th className={`${dynamicPadding} border border-slate-300`}>Item Name / Particulars</th>
                          <th className={`${dynamicPadding} border border-slate-300`}>Style/PO Reference</th>
                          <th className={`${dynamicPadding} border border-slate-300 text-right`}>Delivered Quantity</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(() => {
                          const rawItems = selectedPi?.items || [];
                          const mergedList = computeMergedItems(rawItems);
                          return mergedList.map((m, idx) => (
                            <tr key={idx} className="border-b border-slate-200">
                              <td className={`${dynamicPadding} border border-slate-300 font-semibold`}>
                                {m.item.itemName}
                                {m.item.sizes && m.item.sizes.length > 0 && (
                                  <span className="block text-[8px] font-normal text-slate-500 mt-0.5">
                                    {m.item.sizes.map(s => `${s.size}: ${s.quantity.toLocaleString()}`).join(' | ')}
                                  </span>
                                )}
                              </td>
                              {m.isFirstOfGroup && (
                                <td rowSpan={m.groupSize} className={`${dynamicPadding} border border-slate-300 font-bold bg-slate-50/50 align-middle text-slate-800`}>
                                  {m.stylePoRef}
                                </td>
                              )}
                              <td className={`${dynamicPadding} border border-slate-300 text-right font-black`}>
                                {m.item.totalQuantity.toLocaleString()} {m.item.unit}
                              </td>
                            </tr>
                          ));
                        })()}
                      </tbody>
                    </table>

                    <p className={`${dynamicTextSize} text-neutral-800 italic mt-2`} style={{ textAlign: 'justify', textAlignLast: 'left' }}>{activePack.packingListText}</p>
                  </div>
                )}

                {/* Document 5: Commercial Invoice */}
                {pIdx === 5 && (
                  <div className={`${dynamicSpacing} mt-4 font-sans`}>
                    <div className="grid grid-cols-2 gap-4 text-[10px] font-bold bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                      <div className="space-y-0.5">
                        <p><strong>Ref PI NO:</strong> {selectedPi?.invoiceNo}</p>
                        <p><strong>Date:</strong> {new Date().toLocaleDateString()}</p>
                        <p><strong>L/C No:</strong> {activePack.lcNo} Dated {activePack.lcDate}</p>
                      </div>
                      <div className="space-y-0.5 text-right">
                        <p><strong>Exporter:</strong> {COMPANY_PROFILE.name}</p>
                        <p><strong>Buyer Name:</strong> {selectedPi?.buyerName}</p>
                        <p><strong>HS Code:</strong> {selectedPi?.hsCode || '6217.10.00'}</p>
                      </div>
                    </div>

                    <table className={`w-full ${dynamicTextSize} text-left border-collapse mt-2 text-neutral-800 font-sans border border-slate-300`}>
                      <thead>
                        <tr className="bg-slate-100 border-b border-slate-300 font-black">
                          <th className={`${dynamicPadding} border border-slate-300`}>Item Name / Particulars</th>
                          <th className={`${dynamicPadding} border border-slate-300`}>Style/PO Reference</th>
                          <th className={`${dynamicPadding} border border-slate-300 text-right`}>Delivered Quantity</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(() => {
                          const rawItems = selectedPi?.items || [];
                          const mergedList = computeMergedItems(rawItems);
                          return mergedList.map((m, idx) => (
                            <tr key={idx} className="border-b border-slate-200">
                              <td className={`${dynamicPadding} border border-slate-300 font-semibold`}>
                                {m.item.itemName}
                                {m.item.sizes && m.item.sizes.length > 0 && (
                                  <span className="block text-[8px] font-normal text-slate-500 mt-0.5">
                                    {m.item.sizes.map(s => `${s.size}: ${s.quantity.toLocaleString()}`).join(' | ')}
                                  </span>
                                )}
                              </td>
                              {m.isFirstOfGroup && (
                                <td rowSpan={m.groupSize} className={`${dynamicPadding} border border-slate-300 font-bold bg-slate-50/50 align-middle text-slate-800`}>
                                  {m.stylePoRef}
                                </td>
                              )}
                              <td className={`${dynamicPadding} border border-slate-300 text-right font-black`}>
                                {m.item.totalQuantity.toLocaleString()} {m.item.unit}
                              </td>
                            </tr>
                          ));
                        })()}
                      </tbody>
                    </table>

                    <p className={`${dynamicTextSize} text-neutral-800 italic mt-2`} style={{ textAlign: 'justify', textAlignLast: 'left' }}>{activePack.commercialInvoiceText}</p>
                  </div>
                )}

                 {/* Document 6: Weight Spec */}
                 {pIdx === 6 && (
                   <div className={`${dynamicSpacing} mt-4 font-sans`}>
                     <div className="grid grid-cols-2 gap-4 text-[10px] font-bold bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                       <div className="space-y-0.5">
                         <p><strong>Ref PI NO:</strong> {selectedPi?.invoiceNo}</p>
                         <p><strong>Date:</strong> {new Date().toLocaleDateString()}</p>
                         <p><strong>L/C No:</strong> {activePack.lcNo}</p>
                       </div>
                       <div className="space-y-0.5 text-right font-bold w-full">
                         <p>Total Gross Weight: {distributedWeights.totalGross.toFixed(2)} Kgs</p>
                         <p>Total Net Weight: {distributedWeights.totalNet.toFixed(2)} Kgs</p>
                         <p>Total packages: {getEnforcedCartons()}</p>
                       </div>
                     </div>

                     <div className="border border-slate-200 rounded-xl overflow-hidden mt-3 text-xs font-sans">
                         <table className="w-full text-left font-sans text-[10.5px] border border-slate-300">
                            <thead>
                              <tr className="bg-slate-100 border-b border-slate-350 font-bold text-slate-700">
                                <th className="p-2 border border-slate-300">Item Description</th>
                                <th className="p-2 border border-slate-300">Style/PO Reference</th>
                                <th className="p-2 border border-slate-300 text-right">Quantity</th>
                                <th className="p-2 border border-slate-300 text-right">Net Weight (Kgs)</th>
                                <th className="p-2 border border-slate-300 text-right">Gross Weight (Kgs)</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-slate-800">
                              {(() => {
                                const rawItems = selectedPi?.items || [];
                                const mergedList = computeMergedItems(rawItems);
                                return mergedList.map((m, idx) => {
                                  const rawIdx = rawItems.findIndex(x => x.id === m.item.id);
                                  const net = distributedWeights.net[rawIdx] || 0;
                                  const gross = distributedWeights.gross[rawIdx] || 0;
                                  return (
                                    <tr key={idx} className="font-semibold text-slate-800 hover:bg-slate-50/50">
                                      <td className="p-2 border border-slate-300">{m.item.itemName}</td>
                                      {m.isFirstOfGroup && (
                                        <td rowSpan={m.groupSize} className="p-2 border border-slate-300 font-bold bg-slate-50/50 align-middle text-slate-800">
                                          {m.stylePoRef}
                                        </td>
                                      )}
                                      <td className="p-2 border border-slate-300 text-right">{m.item.totalQuantity.toLocaleString()} {m.item.unit}</td>
                                      <td className="p-2 border border-slate-300 text-right font-mono">{net.toFixed(2)} Kgs</td>
                                      <td className="p-2 border border-slate-300 text-right font-mono">{gross.toFixed(2)} Kgs</td>
                                    </tr>
                                  );
                                });
                              })()}
                              <tr className="bg-slate-200 font-extrabold text-slate-900 border-t border-slate-300">
                                <td className="p-2 border border-slate-300">GRAND TOTAL REGISTERED WEIGHTS:</td>
                                <td className="p-2 border border-slate-300">-</td>
                                <td className="p-2 border border-slate-300 text-right font-black">-</td>
                                <td className="p-2 border border-slate-300 text-right font-mono">{distributedWeights.totalNet.toFixed(2)} Kgs</td>
                                <td className="p-2 border border-slate-300 text-right font-mono">{distributedWeights.totalGross.toFixed(2)} Kgs</td>
                              </tr>
                            </tbody>
                          </table>
                     </div>

                     <p className={`${dynamicTextSize} text-neutral-800 italic mt-2`} style={{ textAlign: 'justify', textAlignLast: 'left' }}>{activePack.weightMeasurementText}</p>
                   </div>
                 )}

                {/* Document 7: Beneficiary Compliances */}
                {pIdx === 7 && (
                  <div className="space-y-4 mt-6 font-sans">
                    <div className="grid grid-cols-2 gap-4 text-[10.5px] font-bold bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <div className="space-y-0.5">
                        <p><strong>Ref PI NO:</strong> {selectedPi?.invoiceNo}</p>
                        <p><strong>Date:</strong> {new Date().toLocaleDateString()}</p>
                        <p><strong>L/C No:</strong> {activePack.lcNo}</p>
                      </div>
                      <div className="space-y-0.5 text-right">
                        <p><strong>Applicant:</strong> {selectedPi?.factoryName}</p>
                        <p><strong>Invoice No:</strong> INV-{selectedPi?.invoiceNo}</p>
                      </div>
                    </div>

                    <div className="space-y-4 text-[11px] text-neutral-800 leading-relaxed mt-4 font-sans">
                      <h3 className="text-xs font-black border-b border-slate-800 pb-1 uppercase tracking-tight">Atteestation Statement:</h3>
                      <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl leading-relaxed whitespace-pre-wrap font-sans text-neutral-800 text-[10.5px]">
                        {getDocVal(7)}
                      </div>
                    </div>
                  </div>
                )}

                {/* Document 8: Certificate of Origin */}
                {pIdx === 8 && (
                  <div className="space-y-4 mt-6 font-sans">
                    <div className="grid grid-cols-2 gap-4 text-[10.5px] font-bold bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <div className="space-y-0.5">
                        <p><strong>COO Ref:</strong> {selectedPi?.invoiceNo}</p>
                        <p><strong>Date:</strong> {new Date().toLocaleDateString()}</p>
                        <p><strong>Country of Manufacture:</strong> Bangladesh</p>
                      </div>
                      <div className="space-y-0.5 text-right font-bold w-full">
                        <p className="text-slate-500">Consignee:</p>
                        <p className="text-slate-900">{selectedPi?.factoryName}</p>
                        {selectedPi?.factoryAddress && (
                          <p className="text-slate-600 font-medium text-[9px] leading-snug">{selectedPi.factoryAddress}</p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-4 text-[11px] mt-4 leading-relaxed font-sans">
                      <h3 className="text-xs font-black border-b-[2px] border-slate-800 pb-1 uppercase tracking-tight">Declarations Decree:</h3>
                      <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-center font-sans text-neutral-850 text-[10.5px]">
                        {getDocVal(8)}
                      </div>
                    </div>
                  </div>
                )}

                {/* Document 9: Purchase Application */}
                {pIdx === 9 && (
                  <div className="space-y-4 mt-5 font-sans">
                    <div className="text-[10px] font-bold font-sans">
                      <p><strong>Date:</strong> {new Date().toLocaleDateString()}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 font-sans">
                      <div className="text-[10px] font-bold text-slate-700 leading-relaxed bg-slate-50 p-3 border border-slate-200 rounded-xl">
                        <p className="text-[8px] uppercase font-bold text-slate-400">To Negotiating Bank:</p>
                        <p className="font-extrabold text-slate-900 mt-1">{piBankName}</p>
                        <p className="font-medium">{piBankBranch}</p>
                        <p className="text-slate-500 font-normal leading-tight mt-0.5">{piBankAddress}</p>
                      </div>

                      <div className="text-[10px] font-bold text-slate-705 leading-relaxed bg-slate-50 p-3 border border-slate-200 rounded-xl">
                        <p className="text-[8px] uppercase font-bold text-slate-400">L/C Opening Bank Details:</p>
                        <p className="font-extrabold text-slate-900 mt-1">{activePack.lcBankName.toUpperCase()}</p>
                        <p className="font-medium">{activePack.lcBranch}</p>
                        <p className="text-slate-500 font-normal leading-tight mt-0.5">{activePack.lcAddress}</p>
                      </div>
                    </div>

                    <div className="space-y-3 mt-4 text-[10px] leading-relaxed font-sans">
                      <p><strong>Subject: Negotiation &amp; Purchase of Export Bills for USD ${activePack.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })} outstanding under L/C No {activePack.lcNo}</strong></p>
                      <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl whitespace-pre-wrap font-sans text-neutral-800 text-[10px]">
                        {getDocVal(9)}
                      </div>
                    </div>
                  </div>
                )}

                {/* Document 10: Transport Challan */}
                {pIdx === 10 && (
                  <div className={`${dynamicSpacing} mt-3 flex flex-col justify-between font-sans`}>
                    {/* Agency Header Banner */}
                    <div className="text-center border-b-2 border-slate-900 pb-2 font-sans">
                      <h2 className="text-sm font-black tracking-tight text-slate-950 font-sans">M/S ASIA TRANSPORT AGENCY</h2>
                      <p className="text-[7.5px] font-bold text-slate-500 uppercase tracking-widest font-sans mt-0.5">Head Office & Cargo Logistics Partner</p>
                      <div className="grid grid-cols-2 gap-2 text-[7px] text-slate-500 font-medium font-sans mt-1">
                        <p className="text-left leading-tight"><strong>Dhaka Office:</strong> 91-Tejgaon Truck Stand, 1-Railgate, Dhaka-1208</p>
                        <p className="text-right leading-tight"><strong>Chattogram Office:</strong> 809-Noar Chamber (2nd Floor), Kadamtali, Chattogram</p>
                      </div>
                    </div>

                    {/* Driver & Vehicle Static Replication */}
                    <div className="grid grid-cols-3 gap-2 border border-slate-200 rounded-lg p-2 bg-slate-50 text-[8.5px] leading-relaxed font-sans mt-2">
                      <div>
                        <p><strong className="text-slate-500">Driver Name:</strong> <span className="text-slate-900 font-bold">Md. Zaman</span></p>
                        <p><strong className="text-slate-500">Father's Name:</strong> <span className="text-slate-800">Md. Karim</span></p>
                      </div>
                      <div>
                        <p><strong className="text-slate-500">Village:</strong> <span className="text-slate-800">Mithabon</span></p>
                        <p><strong className="text-slate-500">Thana:</strong> <span className="text-slate-800">Barhatta</span></p>
                      </div>
                      <div>
                        <p><strong className="text-slate-500">License No:</strong> <span className="text-slate-900 font-bold">4501</span></p>
                        <p><strong className="text-slate-500">Vehicle No:</strong> <span className="text-slate-900 font-black">Dhaka Metro GA-4982</span></p>
                      </div>
                    </div>

                    {/* Where From & Where To */}
                    <div className="grid grid-cols-2 gap-2 border border-dashed border-slate-200 rounded p-1.5 text-[8.5px] font-sans mt-2">
                      <p><strong className="text-slate-500">From:</strong> <span className="text-slate-900 font-bold">Mirpur-13</span></p>
                      <p><strong className="text-slate-500">To Factory:</strong> <span className="text-slate-900 font-black">{selectedPi?.factoryAddress || "135/3, Arambagh, Motijheel, Dhaka-1000, Bangaldesh."}</span></p>
                    </div>

                    {/* Dynamic Mappings */}
                    <div className="grid grid-cols-2 gap-4 text-[8.5px] font-sans leading-tight mt-2 bg-slate-50/50 p-2 border border-slate-100 rounded-lg">
                      <div className="space-y-0.5">
                        <p><strong className="text-slate-500">L/C No:</strong> <span className="text-slate-900 font-bold">{activePack.lcNo}</span></p>
                        <p><strong className="text-slate-500">L/C Date:</strong> <span className="text-slate-800">{activePack.lcDate}</span></p>
                      </div>
                      <div className="space-y-0.5 text-right">
                        <p><strong className="text-slate-500">PI Reference:</strong> <span className="text-slate-800 font-semibold">{selectedPi?.invoiceNo} (Date: {selectedPi?.date})</span></p>
                        <p><strong className="text-slate-500">Beneficiary Conc:</strong> <span className="text-slate-900 font-bold">{((selectedPi as any)?.beneficiary) || COMPANY_PROFILE.name}</span></p>
                      </div>
                    </div>

                    <div className="border border-slate-300 rounded-lg overflow-hidden mt-2 font-sans bg-white pb-1">
                        <table className="w-full text-[8.5px] font-sans border-collapse border border-slate-300">
                          <thead>
                            <tr className="bg-slate-100 border-b border-slate-300 font-bold text-slate-800">
                              <th className="p-1.5 border border-slate-300">Goods Description</th>
                              <th className="p-1.5 border border-slate-300">Style/PO Reference</th>
                              <th className="p-1.5 border border-slate-300 text-right">Despatched Qty</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(() => {
                              const rawItems = selectedPi?.items || [];
                              const mergedList = computeMergedItems(rawItems);
                              return mergedList.map((m, idx) => (
                                <tr key={idx} className="border-b border-slate-250 font-semibold text-slate-900">
                                  <td className="p-1.5 border border-slate-300">{m.item.itemName}</td>
                                  {m.isFirstOfGroup && (
                                    <td rowSpan={m.groupSize} className="p-1.5 border border-slate-300 font-bold bg-slate-50/50 align-middle text-slate-800">
                                      {m.stylePoRef}
                                    </td>
                                  )}
                                  <td className="p-1.5 border border-slate-300 text-right">{m.item.totalQuantity.toLocaleString()} {m.item.unit}</td>
                                </tr>
                              ));
                            })()}
                          </tbody>
                        </table>
                      </div>
                      <div className="text-[8.5px] font-sans font-bold text-slate-600 mt-2">
                        <p><strong className="text-slate-500">Export Sales Contract:</strong> {activePack.exportScNo} (Date: {activePack.exportScDate})</p>
                      </div>

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
