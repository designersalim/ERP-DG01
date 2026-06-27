/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { DeliveryChallan, SizeEntry } from '../types';
import { COMPANY_PROFILE } from '../data';
import AcoolaLogo from './AcoolaLogo';
import Barcode from './Barcode';
import { Printer, Eye, Trash2, Calendar, MapPin, CheckCircle, Clock, Sparkles, Check, Truck, Key, ShieldAlert, ShieldCheck, Edit, Plus, X, ArrowUp, ArrowDown } from 'lucide-react';

interface ChallanListProps {
  challans: DeliveryChallan[];
  onDeleteChallan: (id: string) => void;
  onUpdateChallanStatus: (id: string, status: 'Pending' | 'Delivered') => void;
  onUpdateChallan?: (updated: DeliveryChallan) => void;
  onAddChallan?: (newChallan: DeliveryChallan) => void;
  canEdit?: boolean;
}

export default function ChallanList({ 
  challans, 
  onDeleteChallan, 
  onUpdateChallanStatus, 
  onUpdateChallan,
  onAddChallan,
  canEdit = true
}: ChallanListProps) {
  const [activePreview, setActivePreview] = useState<DeliveryChallan | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [editingChallan, setEditingChallan] = useState<DeliveryChallan | null>(null);

  const cDragItem = React.useRef<number | null>(null);
  const cDragOverItem = React.useRef<number | null>(null);

  const handleChallanDragStart = (e: React.DragEvent, index: number) => {
    cDragItem.current = index;
    e.dataTransfer.effectAllowed = "move";
  };

  const handleChallanDragEnd = () => {
    if (editingChallan && cDragItem.current !== null && cDragOverItem.current !== null && cDragItem.current !== cDragOverItem.current) {
      const copyListItems = [...editingChallan.items];
      const dragItemContent = copyListItems[cDragItem.current];
      copyListItems.splice(cDragItem.current, 1);
      copyListItems.splice(cDragOverItem.current, 0, dragItemContent);
      setEditingChallan({
        ...editingChallan,
        items: copyListItems
      });
    }
    cDragItem.current = null;
    cDragOverItem.current = null;
  };

  const moveChallanItemUp = (index: number) => {
    if (!editingChallan || index === 0) return;
    const copyListItems = [...editingChallan.items];
    const temp = copyListItems[index];
    copyListItems[index] = copyListItems[index - 1];
    copyListItems[index - 1] = temp;
    setEditingChallan({
      ...editingChallan,
      items: copyListItems
    });
  };

  const moveChallanItemDown = (index: number) => {
    if (!editingChallan || index === editingChallan.items.length - 1) return;
    const copyListItems = [...editingChallan.items];
    const temp = copyListItems[index];
    copyListItems[index] = copyListItems[index + 1];
    copyListItems[index + 1] = temp;
    setEditingChallan({
      ...editingChallan,
      items: copyListItems
    });
  };

  const moveMItemUp = (index: number) => {
    if (index === 0) return;
    setMItems(prev => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[index - 1];
      copy[index - 1] = temp;
      return copy;
    });
  };

  const moveMItemDown = (index: number) => {
    if (index === mItems.length - 1) return;
    setMItems(prev => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[index + 1];
      copy[index + 1] = temp;
      return copy;
    });
  };

  // States for manual Challan creation modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [mFactoryName, setMFactoryName] = useState('');
  const [mBuyerName, setMBuyerName] = useState('');
  const [mRef, setMRef] = useState('');
  const [mDate, setMDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [mDeliveryAddress, setMDeliveryAddress] = useState('');
  const [mHsCode, setMHsCode] = useState('6217.10.00');
  const [mStatus, setMStatus] = useState<'Pending' | 'Delivered'>('Pending');
  const [mItems, setMItems] = useState<{
    poNumber: string;
    styleNumber: string;
    itemName: string;
    unit: 'Pcs' | 'Dzn' | 'Set' | 'Yds' | 'Roll' | 'Cone' | 'Kg' | 'Mtr' | 'Ctn';
    totalQuantity: number;
    unitPrice: number;
    details: string;
  }[]>([{ poNumber: '', styleNumber: '', itemName: '', unit: 'Pcs', totalQuantity: 1, unitPrice: 0, details: '' }]);

  const addMItemRow = () => {
    setMItems(prev => [...prev, { poNumber: '', styleNumber: '', itemName: '', unit: 'Pcs', totalQuantity: 1, unitPrice: 0, details: '' }]);
  };

  const removeMItemRow = (idx: number) => {
    if (mItems.length <= 1) return;
    setMItems(prev => prev.filter((_, i) => i !== idx));
  };

  const handleCreateManualChallanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mFactoryName.trim() || !mBuyerName.trim()) {
      alert("Please fill in Factory Name and Buyer Name.");
      return;
    }
    
    // Auto generate manual challan serial number (MTC)
    const buyerStr = mBuyerName.trim();
    const words = buyerStr.split(' ').filter(Boolean);
    const buyerPre = words.length >= 2 
      ? (words[0][0] + words[1][0]).toUpperCase() 
      : (buyerStr.length >= 2 ? buyerStr.substring(0, 2).toUpperCase() : buyerStr.substring(0, 1).toUpperCase() + 'X');
    
    const manualChallansCount = challans.filter(ch => ch.id.startsWith('m-') || ch.challanNo.includes('-MTC-')).length;
    const count = 1001 + manualChallansCount;
    const computedChallanNo = `${buyerPre}-MTC-${count}`;

    const newChallan: DeliveryChallan = {
      id: `m-ch-${Date.now()}`,
      challanNo: computedChallanNo,
      factoryName: mFactoryName.trim(),
      buyerName: mBuyerName.trim(),
      ref: mRef.trim() || `MTC-REF-${Date.now().toString().slice(-4)}`,
      date: mDate,
      deliveryAddress: mDeliveryAddress.trim() || 'N/A',
      hsCode: mHsCode.trim() || '6217.10.00',
      status: mStatus,
      createdAt: new Date().toISOString(),
      items: mItems.map((it, idx) => ({
        id: `m-item-${idx}-${Date.now()}`,
        bookingId: 'manual',
        poNumber: it.poNumber.trim() || 'N/A',
        styleNumber: it.styleNumber.trim() || 'N/A',
        itemName: it.itemName.trim() || 'Custom Trim Item',
        unit: it.unit,
        unitPrice: Number(it.unitPrice) || 0,
        totalQuantity: Number(it.totalQuantity) || 0,
        sizeWise: false,
        sizes: [],
        details: it.details.trim() || ''
      }))
    };

    if (onAddChallan) {
      onAddChallan(newChallan);
    }
    
    // Reset and close
    setMFactoryName('');
    setMBuyerName('');
    setMRef('');
    setMDeliveryAddress('');
    setMItems([{ poNumber: '', styleNumber: '', itemName: '', unit: 'Pcs', totalQuantity: 1, unitPrice: 0, details: '' }]);
    setShowCreateModal(false);
    setActivePreview(newChallan);
    alert("Manual Delivery Challan has been created successfully!");
  };

  const [watermarkImage, setWatermarkImage] = useState(() => localStorage.getItem('acoola_global_watermark') || '');
  const [signatureImage, setSignatureImage] = useState(() => localStorage.getItem('acoola_global_signature') || '');

  const [activeGatePassPreview, setActiveGatePassPreview] = useState<{ challan: DeliveryChallan; passData: any } | null>(null);
  const [gatePassToPrint, setGatePassToPrint] = useState<{ challan: DeliveryChallan; passData: any } | null>(null);

  // Compute active gate passes history list
  const gatePassHistory = React.useMemo(() => {
    return challans.map(ch => {
      try {
        const saved = localStorage.getItem(`acoola_gatepass_${ch.id}`);
        if (saved) {
          return {
            challan: ch,
            passData: JSON.parse(saved)
          };
        }
      } catch (e) {}
      return null;
    }).filter(it => it !== null) as { challan: DeliveryChallan; passData: any }[];
  }, [challans]);

  // 🎫 Automated Gate Pass tracking systems
  const [gatePassChallan, setGatePassChallan] = useState<DeliveryChallan | null>(null);
  const [gpVehicle, setGpVehicle] = useState('Covered Van / DM-THA-1440');
  const [gpDriver, setGpDriver] = useState('মোঃ কাশেম মিয়া');
  const [gpDriverPhone, setGpDriverPhone] = useState('01712-345678');
  const [gpSecurityOfficer, setGpSecurityOfficer] = useState('Md. Jahangir Alam (Gate Sergeant)');
  const [gpStatus, setGpStatus] = useState<'Issued' | 'Checked & Out'>('Issued');

  const openGatePass = (ch: DeliveryChallan) => {
    setGatePassChallan(ch);
    try {
      const savedGp = localStorage.getItem(`acoola_gatepass_${ch.id}`);
      if (savedGp) {
        const parsed = JSON.parse(savedGp);
        setGpVehicle(parsed.vehicleNo || 'Covered Van / DM-THA-1440');
        setGpDriver(parsed.driverName || 'মোঃ কাশেম মিয়া');
        setGpDriverPhone(parsed.driverPhone || '01712-345678');
        setGpSecurityOfficer(parsed.securityCheckedBy || 'Md. Jahangir Alam (Gate Sergeant)');
        setGpStatus(parsed.status || 'Issued');
      } else {
        setGpVehicle('Covered Van / DM-THA-1440');
        setGpDriver('মোঃ কাশেম মিয়া');
        setGpDriverPhone('01712-345678');
        setGpSecurityOfficer('Md. Jahangir Alam (Gate Sergeant)');
        setGpStatus('Issued');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveGatePass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!gatePassChallan) return;

    const data = {
      vehicleNo: gpVehicle,
      driverName: gpDriver,
      driverPhone: gpDriverPhone,
      securityCheckedBy: gpSecurityOfficer,
      status: gpStatus
    };

    localStorage.setItem(`acoola_gatepass_${gatePassChallan.id}`, JSON.stringify(data));
    alert("Gate Pass details recorded and locked successfully!");
  };

  const triggerPrintGatePass = (ch: DeliveryChallan) => {
    // Look up saved gatepass data from localStorage or fallback
    const saved = localStorage.getItem(`acoola_gatepass_${ch.id}`);
    const passData = saved ? JSON.parse(saved) : {
      vehicleNo: gpVehicle,
      driverName: gpDriver,
      driverPhone: gpDriverPhone,
      securityCheckedBy: gpSecurityOfficer,
      status: gpStatus
    };

    // Build the isolated printed content for perfect formatting on A4
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
        body, body * {
          visibility: visible !important;
        }
        @media print {
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          #gate-pass-print-extraction {
            width: 210mm !important;
            min-height: 297mm !important;
            height: auto !important;
            margin: 0 !important;
            padding: 10mm 10mm !important;
            box-sizing: border-box !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
          }
        }
      </style>
    `;

    const totalQty = ch.items.reduce((acc, curr) => acc + (curr.sizeWise ? curr.sizes.reduce((sum, s) => sum + s.quantity, 0) : (curr.totalQuantity || 0)), 0);

    const itemsRows = ch.items.map((item, idx) => {
      const itemQty = item.sizeWise ? item.sizes.reduce((sum, s) => sum + s.quantity, 0) : (item.totalQuantity || 0);
      return `
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 6px 10px; text-align: center; border: 1px solid #e2e8f0; font-family: monospace; font-size: 11px;">${idx + 1}</td>
          <td style="padding: 6px 10px; font-weight: bold; border: 1px solid #e2e8f0; font-size: 11px;">${item.itemName}</td>
          <td style="padding: 6px 10px; font-family: monospace; font-size: 10px; border: 1px solid #e2e8f0;">PO: ${item.poNumber || '—'}<br />Style: ${item.styleNumber || '—'}</td>
          <td style="padding: 6px 10px; text-align: right; font-weight: 800; color: #4f46e5; border: 1px solid #e2e8f0; font-size: 11px;">${itemQty.toLocaleString()} ${item.unit}</td>
        </tr>
      `;
    }).join('');

    const gpNo = `GP-2026-${ch.challanNo.replace(/[^0-9]/g, '') || '101'}`;

    printWindow.document.write(`
      <html>
        <head>
          <title>Security Gate Pass - ${ch.challanNo}</title>
          <base href="${window.location.origin}/" />
          ${styleLinks}
          ${customStyles}
        </head>
        <body class="bg-white">
          <div id="gate-pass-print-extraction" style="width: 210mm; min-height: 297mm; padding: 12mm; box-sizing: border-box; background-color: #ffffff; display: flex; flex-direction: column; justify-content: space-between; font-family: system-ui, sans-serif;">
            
            <div style="border: 2px solid #171717; padding: 25px; border-radius: 12px; background-color: #ffffff; flex-grow: 1; display: flex; flex-direction: column; justify-content: space-between;">
              <div>
                <div style="border-bottom: 2px solid #171717; padding-bottom: 15px; display: flex; justify-content: space-between; align-items: flex-start;">
                  <div style="text-align: left;">
                    <span style="padding: 2px 8px; background-color: #f1f5f9; color: #1e293b; font-weight: 800; font-size: 9px; text-transform: uppercase; letter-spacing: 0.1em; border-radius: 4px;">AUTOMATED SECURITY GATE PASS / গেট পাস</span>
                    <h1 style="font-size: 20px; font-weight: 900; color: #171717; margin: 4px 0 0 0; text-transform: uppercase;">${COMPANY_PROFILE.name}</h1>
                    <p style="font-size: 10px; color: #737373; margin: 2px 0 0 0; font-weight: bold;">${COMPANY_PROFILE.addresses.office}</p>
                    <p style="font-size: 9px; color: #737373; margin: 2px 0 0 0; font-weight: bold;">Main Compound Exit Point • Gate Security Desk</p>
                  </div>
                  <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 4px; shrink-0;">
                    <span style="font-weight: 800; font-family: monospace; font-size: 11px; color: #171717;">${gpNo}</span>
                  </div>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; font-size: 11.5px; background-color: #f8fafc; padding: 12px; border: 1px solid #e2e8f0; border-radius: 8px; margin-top: 12px; text-align: left;">
                  <div>
                    <p style="margin: 0; line-height: 1.4;"><strong>Delivered To / গন্তব্য:</strong> ${ch.factoryName}</p>
                    <p style="margin: 3px 0 0 0; line-height: 1.4;"><strong>Buyer Brand Name:</strong> ${ch.buyerName || 'N/A'}</p>
                    <p style="margin: 3px 0 0 0; line-height: 1.4;"><strong>Delivery Address:</strong> ${ch.deliveryAddress || 'Factory Gate compound'}</p>
                  </div>
                  <div>
                    <p style="margin: 0; line-height: 1.4;"><strong>Vehicle Cargo No:</strong> ${passData.vehicleNo}</p>
                    <p style="margin: 3px 0 0 0; line-height: 1.4;"><strong>Driver Name:</strong> ${passData.driverName}</p>
                    <p style="margin: 3px 0 0 0; line-height: 1.4;"><strong>Driver Contact:</strong> ${passData.driverPhone}</p>
                  </div>
                </div>

                <p style="margin: 10px 0 0 0; font-size: 10.5px; color: #64748b; font-style: italic; text-align: left;">
                  Attention Gate Guard: Match loading cargo sheet quantities before unlocking the exit barricade.
                </p>

                <div style="border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; margin-top: 12px; font-size: 11.5px;">
                  <table style="width: 100%; text-align: left; border-collapse: collapse;">
                    <thead style="background-color: #f1f5f9; border-bottom: 1px solid #e2e8f0; font-weight: bold; text-transform: uppercase; font-size: 9px; color: #475569;">
                      <tr>
                        <th style="padding: 5px 10px; border: 1px solid #e2e8f0; width: 40px; text-align: center;">Sl</th>
                        <th style="padding: 5px 10px; border: 1px solid #e2e8f0;">Loaded Accessory Items</th>
                        <th style="padding: 5px 10px; border: 1px solid #e2e8f0;">POs & Sizes</th>
                        <th style="padding: 5px 10px; text-align: right; border: 1px solid #e2e8f0; width: 130px;">Quantity Checked</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${itemsRows}
                      <tr style="background-color: #f8fafc; font-weight: 900; border-top: 2px solid #171717;">
                        <td colSpan="3" style="padding: 8px 10px; text-align: right; font-size: 11px; border: 1px solid #e2e8f0;">TOTAL DISPATCHED QUANTITY:</td>
                        <td style="padding: 8px 10px; text-align: right; font-size: 11.5px; color: #312e81; font-weight: 900; border: 1px solid #e2e8f0;">${totalQty.toLocaleString()} Pcs</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div style="margin-top: 12px; font-size: 11.5px; border: 1px solid #e2e8f0; padding: 8px; border-radius: 6px; background-color: #f8fafc; text-align: left;">
                  <p style="margin: 0;"><strong>Current Passage Tracker Status:</strong> <span style="color: #b91c1c; font-weight: bold; text-transform: uppercase;">${passData.status}</span></p>
                  <p style="margin: 3px 0 0 0;"><strong>Verified Gate Sergeant Duty:</strong> ${passData.securityCheckedBy}</p>
                </div>
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; text-align: center; font-size: 10px; font-weight: bold; color: #64748b; margin-top: 40px;">
                <div style="border-top: 1px solid #cbd5e1; padding-top: 5px;">Gate Guard Verification</div>
                <div style="border-top: 1px solid #cbd5e1; padding-top: 5px;">Warehouse Officer</div>
                <div style="border-top: 1px solid #cbd5e1; padding-top: 5px; color: #1e293b; text-transform: uppercase;">Security Head Approval</div>
              </div>
            </div>

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

  const triggerPrint = (id: string) => {
    // Automatically flag as Delivered upon printing
    onUpdateChallanStatus(id, 'Delivered');
    
    const element = document.getElementById('delivery-challan-print-sheet');
    if (!element) return;

    // Create a new window for secure printable area extraction
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
        body, body * {
          visibility: visible !important;
        }
        #delivery-challan-print-sheet,
        #delivery-challan-print-sheet * {
          visibility: visible !important;
        }
        @media print {
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          #delivery-challan-print-sheet {
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
          <title>Delivery Challan - ${activePreview?.challanNo || ''}</title>
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


  const getDocItemTotalQty = (item: any): number => {
    const originalUnit = item.unit || 'Pcs';
    const isDzn = originalUnit.trim().toLowerCase() === 'dzn';
    const factor = isDzn ? 12 : 1;

    if (item.sizeWise && item.sizes && item.sizes.length > 0) {
      return item.sizes.reduce((sum: number, s: SizeEntry) => sum + (s.quantity * factor), 0);
    }
    return (item.totalQuantity || 0) * factor;
  };

  const grossSumQuantity = (ch: DeliveryChallan) => {
    return ch.items.reduce((acc, curr) => acc + getDocItemTotalQty(curr), 0);
  };

  const getFormattedChallanTotal = (ch: DeliveryChallan) => {
    const list: Array<{ totalQty: number; unit: string }> = [];
    ch.items.forEach(item => {
      if (item.styleBreakdowns && item.styleBreakdowns.length > 0) {
        item.styleBreakdowns.forEach((sb: any) => {
          let totalQty = 0;
          const originalUnit = sb.sizeUnit || item.unit || 'Pcs';
          const isDzn = originalUnit.trim().toLowerCase() === 'dzn';
          const factor = isDzn ? 12 : 1;
          const displayUnit = isDzn ? 'Pcs' : originalUnit;

          if (sb.sizeWise && sb.sizes && sb.sizes.length > 0) {
            totalQty = Math.round(
              sb.sizes.reduce((sum: number, sz: any) => sum + (sz.quantity * factor), 0) * 1e10
            ) / 1e10;
          } else {
            totalQty = (sb.quantity || 0) * factor;
          }
          list.push({ totalQty, unit: displayUnit });
        });
      } else {
        let totalQty = 0;
        const originalUnit = item.unit || 'Pcs';
        const isDzn = originalUnit.trim().toLowerCase() === 'dzn';
        const factor = isDzn ? 12 : 1;
        const displayUnit = isDzn ? 'Pcs' : originalUnit;

        if (item.sizeWise && item.sizes && item.sizes.length > 0) {
          totalQty = Math.round(
            item.sizes.reduce((sum: number, sz: any) => sum + (sz.quantity * factor), 0) * 1e10
          ) / 1e10;
        } else {
          totalQty = (item.totalQuantity || 0) * factor;
        }
        list.push({ totalQty, unit: displayUnit });
      }
    });

    const totals: Record<string, number> = {};
    list.forEach(item => {
      const u = item.unit || 'Pcs';
      totals[u] = Math.round(((totals[u] || 0) + item.totalQty) * 1e10) / 1e10;
    });

    const parts = Object.entries(totals).map(([unit, qty]) => `${qty.toLocaleString()} ${unit}`);
    return parts.length > 0 ? parts.join(', ') : '0 Pcs';
  };

  return (
    <div id="challan-list-section" className="space-y-6">
      <div className="border-b border-slate-200 pb-4 print:hidden flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-950 uppercase tracking-wider">
            Delivery Challan Register
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Historical record of cargo dispatches. Printing a Challan auto-flags it as <strong className="text-gray-900">Delivered</strong>.
          </p>
        </div>
        {onAddChallan && canEdit && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs uppercase tracking-wide flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>New Manual Challan</span>
          </button>
        )}
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-4xl w-full shadow-2xl p-6 relative flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4 bg-slate-50 -mx-6 -mt-6 p-4 rounded-t-2xl">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-emerald-600" />
                <span className="font-extrabold text-slate-800 tracking-tight text-sm uppercase">Generate Manual Delivery Challan</span>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 px-3 bg-slate-205 hover:bg-slate-300 rounded text-xs font-bold text-slate-700 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateManualChallanSubmit} className="flex-1 overflow-y-auto pr-1 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1 text-left">
                  <label className="block text-xs font-extrabold text-slate-700 uppercase">Factory / Source Name *</label>
                  <input
                    type="text"
                    required
                    value={mFactoryName}
                    onChange={(e) => setMFactoryName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-medium text-xs text-slate-800"
                    placeholder="e.g. Acoola Trims Corporation (Unit 2)"
                  />
                </div>

                <div className="space-y-1 text-left">
                  <label className="block text-xs font-extrabold text-slate-700 uppercase">Buyer / Brand Name *</label>
                  <input
                    type="text"
                    required
                    value={mBuyerName}
                    onChange={(e) => setMBuyerName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-medium text-xs text-slate-800"
                    placeholder="e.g. H&amp;M / Zara"
                  />
                </div>

                <div className="space-y-1 text-left">
                  <label className="block text-xs font-extrabold text-slate-700 uppercase">Booking / PO Reference</label>
                  <input
                    type="text"
                    value={mRef}
                    onChange={(e) => setMRef(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-medium text-xs text-slate-800"
                    placeholder="e.g. ATC-PBR-4820"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1 text-left">
                  <label className="block text-xs font-extrabold text-slate-700 uppercase">Challan Date *</label>
                  <input
                    type="date"
                    required
                    value={mDate}
                    onChange={(e) => setMDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-medium text-xs text-slate-800"
                  />
                </div>

                <div className="space-y-1 text-left">
                  <label className="block text-xs font-extrabold text-slate-700 uppercase">HS Tariff Code</label>
                  <input
                    type="text"
                    value={mHsCode}
                    onChange={(e) => setMHsCode(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-medium text-xs text-slate-800 font-mono"
                  />
                </div>

                <div className="space-y-1 text-left">
                  <label className="block text-xs font-extrabold text-slate-700 uppercase">Initial Dispatch Status *</label>
                  <select
                    value={mStatus}
                    onChange={(e) => setMStatus(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-bold cursor-pointer text-xs text-slate-800"
                  >
                    <option value="Pending">Pending / অপেক্ষমান</option>
                    <option value="Delivered">Delivered / প্রেরিত</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1 text-left">
                <label className="block text-xs font-extrabold text-slate-700 uppercase">Delivery Address *</label>
                <textarea
                  required
                  rows={2}
                  value={mDeliveryAddress}
                  onChange={(e) => setMDeliveryAddress(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-medium text-xs text-slate-800"
                  placeholder="e.g. Liz Apparels, Block-B, Tongi Industrial Area, Gazipur."
                />
              </div>

              {/* Line Items builder */}
              <div className="space-y-2 border border-slate-200 p-3.5 rounded-xl bg-slate-50">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="font-extrabold text-slate-700 uppercase tracking-wide text-xs">Dispatch Product Items List</span>
                  <button
                    type="button"
                    onClick={addMItemRow}
                    className="text-[10px] font-black text-emerald-700 hover:text-emerald-900 border border-emerald-200 bg-white rounded px-2.5 py-1 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Item Row</span>
                  </button>
                </div>

                <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
                  {mItems.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-1 md:grid-cols-7 gap-2.5 bg-white p-2.5 rounded-lg border border-slate-200 items-end">
                      <div className="md:col-span-2 space-y-1 text-left">
                        <label className="block text-[9px] font-extrabold text-slate-400 uppercase">Item Decription *</label>
                        <input
                          type="text"
                          required
                          value={item.itemName}
                          onChange={(e) => {
                            const updated = [...mItems];
                            updated[idx].itemName = e.target.value;
                            setMItems(updated);
                          }}
                          className="w-full bg-slate-50 border border-slate-200 rounded p-1 text-xs text-slate-850"
                          placeholder="e.g. Polybag, Cotton Twill Tape, etc."
                        />
                      </div>

                      <div className="space-y-1 text-left">
                        <label className="block text-[9px] font-extrabold text-slate-400 uppercase">PO / Order #</label>
                        <input
                          type="text"
                          value={item.poNumber}
                          onChange={(e) => {
                            const updated = [...mItems];
                            updated[idx].poNumber = e.target.value;
                            setMItems(updated);
                          }}
                          className="w-full bg-slate-50 border border-slate-200 rounded p-1 text-xs text-slate-850"
                          placeholder="PO-8822"
                        />
                      </div>

                      <div className="space-y-1 text-left">
                        <label className="block text-[9px] font-extrabold text-slate-400 uppercase">Style Number</label>
                        <input
                          type="text"
                          value={item.styleNumber}
                          onChange={(e) => {
                            const updated = [...mItems];
                            updated[idx].styleNumber = e.target.value;
                            setMItems(updated);
                          }}
                          className="w-full bg-slate-50 border border-slate-200 rounded p-1 text-xs text-slate-850"
                          placeholder="Style-007"
                        />
                      </div>

                      <div className="space-y-1 text-left">
                        <label className="block text-[9px] font-extrabold text-slate-400 uppercase">Unit *</label>
                        <select
                          value={item.unit}
                          onChange={(e) => {
                            const updated = [...mItems];
                            updated[idx].unit = e.target.value as any;
                            setMItems(updated);
                          }}
                          className="w-full bg-slate-50 border border-slate-200 rounded p-1 text-xs text-slate-850 cursor-pointer"
                        >
                          {['Pcs', 'Dzn', 'Set', 'Yds', 'Roll', 'Cone', 'Kg', 'Mtr', 'Ctn'].map((unit) => (
                            <option key={unit} value={unit}>{unit}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1 text-left">
                        <label className="block text-[9px] font-extrabold text-slate-400 uppercase">Dispatch Qty *</label>
                        <input
                          type="number"
                          required
                          min={1}
                          value={item.totalQuantity}
                          onChange={(e) => {
                            const updated = [...mItems];
                            updated[idx].totalQuantity = Number(e.target.value);
                            setMItems(updated);
                          }}
                          className="w-full bg-slate-50 border border-slate-200 rounded p-1 text-xs text-slate-850 font-bold"
                        />
                      </div>

                      <div className="flex items-center gap-1">
                        <div className="space-y-1 text-left flex-1">
                          <label className="block text-[9px] font-extrabold text-slate-400 uppercase">Est. Rate ($)</label>
                          <input
                            type="number"
                            step="0.0001"
                            value={item.unitPrice}
                            onChange={(e) => {
                              const updated = [...mItems];
                              updated[idx].unitPrice = Number(e.target.value);
                              setMItems(updated);
                            }}
                            className="w-full bg-slate-50 border border-slate-200 rounded p-1 text-xs text-slate-850"
                            placeholder="0.00"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeMItemRow(idx)}
                          disabled={mItems.length <= 1}
                          className="p-1 px-1.5 bg-rose-50 text-rose-600 border border-rose-200 rounded mt-5 disabled:opacity-40 cursor-pointer hover:bg-rose-100 shrink-0"
                          title="Delete Row"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-slate-200 pt-4 flex items-center justify-end gap-3 p-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-750 rounded-lg font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs uppercase"
                >
                  Generate Manual Challan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {challans.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl py-12 text-center text-gray-500 max-w-lg mx-auto print:hidden">
          No Delivery Challans have been generated yet. Create a manual one above or build from book orders!
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* List panel */}
          <div className="lg:col-span-1 space-y-3.5 max-h-[600px] overflow-y-auto pr-1 print:hidden">
            {challans.map((ch) => {
              const isDelivered = ch.status === 'Delivered';
              return (
                <div
                  key={ch.id}
                  onClick={() => setActivePreview(ch)}
                  className={`border rounded-xl p-4 cursor-pointer hover:bg-neutral-50/50 transition-all duration-200 select-none ${
                    activePreview?.id === ch.id 
                      ? 'border-neutral-900 bg-neutral-50 shadow-md' 
                      : 'border-neutral-200 bg-white'
                  }`}
                  id={`challan-card-${ch.id}`}
                >
                  <div className="flex justify-between items-start gap-2.5">
                    <div>
                      <h4 className="font-mono font-bold text-neutral-900 text-sm tracking-tight">{ch.challanNo}</h4>
                      <p className="text-xs font-bold text-neutral-800 tracking-tight mt-0.5">{ch.factoryName}</p>
                    </div>
                    {/* Status Toggle buttons */}
                    <div className="flex flex-col items-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <select
                        value={ch.status}
                        onChange={(e) => onUpdateChallanStatus(ch.id, e.target.value as any)}
                        className={`text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded-md border focus:outline-hidden cursor-pointer ${
                          isDelivered 
                            ? 'bg-neutral-900 text-white border-neutral-950' 
                            : 'bg-white text-neutral-500 border-neutral-200'
                        }`}
                        title="Change Delivery Status"
                      >
                        <option value="Pending">Pending</option>
                        <option value="Delivered">Delivered</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-4 text-[11px] border-t border-neutral-100 pt-3">
                    <div>
                      <span className="text-neutral-400 font-bold block text-[9px] uppercase">Buyer</span>
                      <span className="text-neutral-800 font-semibold truncate block" title={ch.buyerName}>{ch.buyerName || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-neutral-400 font-bold block text-[9px] uppercase">Shipment Date</span>
                      <span className="text-neutral-800 block">{ch.date}</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-[11px] text-neutral-500 mt-2.5">
                    <span>{ch.items.length} order items</span>
                    <span className="font-mono font-bold text-neutral-900">Total: {getFormattedChallanTotal(ch)}</span>
                  </div>

                  {/* Absolute delete or edit click button */}
                  <div className="flex justify-between items-center pt-2 border-t border-neutral-50 mt-2" onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}>
                    <div>
                      {canEdit && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            setEditingChallan(JSON.parse(JSON.stringify(ch)));
                          }}
                          className="inline-flex items-center text-[10px] font-black uppercase tracking-wider text-emerald-700 hover:text-emerald-800 hover:underline py-1 transition-colors cursor-pointer"
                        >
                          ✏️ Edit Challan
                        </button>
                      )}
                    </div>
                    {canEdit && (
                      confirmDeleteId === ch.id ? (
                        <div className="flex items-center gap-1.5" onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}>
                          <span className="text-[10px] text-red-600 font-extrabold uppercase">Confirm?</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              onDeleteChallan(ch.id);
                              if (activePreview?.id === ch.id) setActivePreview(null);
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
                            setConfirmDeleteId(ch.id);
                          }}
                          className="inline-flex items-center text-[10px] font-bold uppercase tracking-wider text-red-600 hover:text-red-700 hover:underline py-1 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3 mr-0.5" /> Delete Register
                        </button>
                      )
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Large Live Interactive Print Preview */}
          <div className="lg:col-span-2 bg-white border border-neutral-250 rounded-xl p-5 shadow-sm space-y-4">
            {activePreview ? (
              <div className="space-y-5">
                
                {/* Document Branding & Assets Segment (Only shown on screen) */}
                <div className="bg-[#007d46]/5 border border-[#007d46]/20 p-4 rounded-xl print:hidden space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-[#007d46]">
                      <Sparkles className="w-4 h-4 text-[#007d46]" />
                      <h4 className="text-xs font-black uppercase tracking-wide">Document Printing Assets &amp; Brand Settings</h4>
                    </div>
                    <span className="text-[10px] text-neutral-500 font-medium">Changes persist globally for all documents</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Watermark Section */}
                    <div className="bg-white p-3 rounded-lg border border-neutral-150 flex flex-col justify-between">
                      <div>
                        <span className="text-[9.5px] uppercase font-black text-neutral-700 block">Jolchap / Watermark Image (Default)</span>
                        <span className="text-[8.5px] text-neutral-400 block leading-tight mt-0.5">
                          This background image will repeat on both PI and Delivery Challan automatically.
                        </span>
                      </div>
                      <div className="flex items-center gap-2 pt-2 border-t border-neutral-100 mt-2">
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
                        <span className="text-[9.5px] uppercase font-black text-neutral-700 block">Seal &amp; Signature Image (Default)</span>
                        <span className="text-[8.5px] text-neutral-400 block leading-tight mt-0.5">
                          Placed right above "For Acoola Trims Corporation" signature line.
                        </span>
                      </div>
                      <div className="flex items-center gap-2 pt-2 border-t border-neutral-100 mt-2">
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

                <div className="flex items-center justify-between border-b border-neutral-150 pb-3 flex-wrap gap-2 print:hidden select-none">
                  <div className="flex flex-col text-left">
                    <span className="text-xs font-extrabold text-neutral-400 uppercase tracking-widest">
                      Challan Live Preview (A4 Scale Layout)
                    </span>
                    <p className="text-[10px] text-amber-600 font-medium leading-tight mt-0.5">
                      Note: If printing within this frame doesn't trigger, please open the application in a <strong>New Tab</strong>.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2.5">
                    {canEdit && (
                      <button
                        type="button"
                        onClick={() => setEditingChallan(JSON.parse(JSON.stringify(activePreview)))}
                        className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-[#007d46] hover:bg-[#006438] text-white font-bold text-xs uppercase tracking-wider rounded-lg shadow-xs transition-colors cursor-pointer"
                      >
                        <Edit className="w-3.5 h-3.5" /> Edit Challan (এডিট)
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => openGatePass(activePreview)}
                      className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider rounded-lg shadow-xs transition-colors cursor-pointer"
                    >
                      <Truck className="w-3.5 h-3.5" /> Security Gate Pass (গেট পাস)
                    </button>
                    <button
                      type="button"
                      onClick={() => triggerPrint(activePreview.id)}
                      className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-neutral-950 hover:bg-neutral-800 text-white font-bold text-xs uppercase tracking-wider rounded-lg shadow-xs transition-colors cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" /> Print Delivery Challan
                    </button>
                  </div>
                </div>

                {/* Print Sheet standard layout styled inside simulated A4 envelope sheets */}
                <div className="w-full overflow-x-auto py-2 bg-neutral-100/40 rounded-xl flex justify-center print:bg-transparent print:p-0 select-text">
                  <div 
                    className="w-[210mm] min-h-[297mm] p-[6mm] sm:p-[10mm] print:p-[8mm] print:pt-[10mm] border-2 border-neutral-300 shadow-md font-sans bg-white print:border-0 print:shadow-none print:w-full print:min-h-0 text-neutral-900 relative box-border flex flex-col justify-between" 
                    id="delivery-challan-print-sheet"
                  >
                    {/* Top Black Accents Strip */}
                    <div className="absolute top-0 left-0 w-full h-2 bg-neutral-950" />

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

                    {/* Top Content Segment */}
                    <div className="space-y-3 pt-1.5">
                      {/* Brand Title Header Block */}
                      <div className="flex flex-col sm:flex-row print:flex-row justify-between items-start gap-3 pb-3 border-b border-neutral-200">
                        <div className="flex items-start gap-3 select-text w-full">
                          {COMPANY_PROFILE.logo && (
                            <div className="w-12 h-12 bg-white border border-neutral-200 rounded p-1 flex items-center justify-center shrink-0 overflow-hidden">
                              <img src={COMPANY_PROFILE.logo} alt="Company Logo" className="max-w-full max-h-full object-contain" />
                            </div>
                          )}
                          <div className="text-left font-sans">
                            <h1 className="text-lg sm:text-xl print:text-xl font-black text-neutral-950 uppercase tracking-tight leading-none">
                              {COMPANY_PROFILE.name.toUpperCase()}
                            </h1>
                            <p className="text-[7.5px] uppercase font-black text-neutral-600 tracking-wider leading-none mt-1">
                              {COMPANY_PROFILE.tagline.toUpperCase()}
                            </p>
                            <div className="text-[9px] text-neutral-700 font-medium space-y-0 pt-1.5 leading-normal">
                              <p><span className="font-bold text-neutral-800">Office:</span> {COMPANY_PROFILE.addresses.office}</p>
                              <p><span className="font-bold text-neutral-805">Factory:</span> {COMPANY_PROFILE.addresses.factory}</p>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2.5 shrink-0 text-right">
                          <div className="space-y-0.5">
                            <h2 className="text-sm sm:text-base print:text-base font-black text-neutral-950 tracking-tight uppercase leading-none font-sans">
                              DELIVERY CHALLAN
                            </h2>
                            <div className="text-[10px] text-neutral-750 font-medium font-mono space-y-0 leading-tight">
                              <p className="font-bold"><span className="text-neutral-600 font-sans text-[7.5px] uppercase">BIN :</span> {COMPANY_PROFILE.bin}</p>
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
                            <Barcode value={activePreview.challanNo} showText={false} />
                          </div>
                        </div>
                      </div>

                      {/* Info blocks: Delivered To & Challan particulars */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 print:grid-cols-2 gap-3 font-sans">
                        <div className="border border-neutral-200 rounded-xl p-3 bg-white print:bg-transparent shadow-2xs flex flex-col justify-between text-left">
                          <div>
                            <span className="text-[8px] uppercase font-bold text-neutral-600 tracking-wider mb-1 block font-black">
                              DELIVERED TO:
                            </span>
                            <h3 className="text-xs font-black text-neutral-955 leading-tight">
                              {activePreview.factoryName}
                            </h3>
                            <p className="text-[9.5px] text-neutral-750 font-medium leading-relaxed mt-1">
                              {activePreview.deliveryAddress || "Standard Factory Compound, Board Bazar, Gazipur"}
                            </p>
                          </div>
                          <div className="pt-2 mt-2 border-t border-neutral-150 text-[9.5px] flex items-center justify-between">
                            <span className="text-neutral-600 font-black uppercase text-[8px]">Buyer Name:</span>
                            <span className="font-bold text-neutral-900">{activePreview.buyerName || 'N/A'}</span>
                          </div>
                        </div>

                        <div className="border border-neutral-200 rounded-xl p-3 bg-white print:bg-transparent shadow-2xs space-y-1.5 text-left">
                          <span className="text-[8px] uppercase font-bold text-neutral-600 tracking-wider mb-0.5 block font-black">
                            CHALLAN DETAILS:
                          </span>
                          <div className="text-[10px] font-medium space-y-1 font-sans divide-y divide-neutral-100 font-bold">
                            <div className="flex justify-between items-center py-0.5">
                              <span className="text-neutral-600 text-[9.5px] font-semibold">Challan No:</span>
                              <span className="font-mono font-extrabold text-neutral-900">{activePreview.challanNo}</span>
                            </div>
                            <div className="flex justify-between items-center pt-1 py-0.5">
                              <span className="text-neutral-600 text-[9.5px] font-semibold">Date (Printed On):</span>
                              <span className="font-bold text-neutral-900">
                                {activePreview.date ? new Date(activePreview.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}
                              </span>
                            </div>
                            <div className="flex justify-between items-center pt-1 py-0.5">
                              <span className="text-neutral-600 text-[9.5px] font-semibold">Vehicle No:</span>
                              <span className="font-bold text-neutral-900">N/A</span>
                            </div>
                            <div className="flex justify-between items-center pt-1 py-0.5">
                              <span className="text-neutral-600 text-[9.5px] font-semibold">H.S. Code:</span>
                              <span className="font-mono font-bold text-neutral-900">{activePreview.hsCode || COMPANY_PROFILE.defaultHsCode}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Items table with full borders on all cells */}
                      <div className="overflow-x-auto mt-2.5">
                        <table className="w-full text-left text-[9.5px] border-collapse border border-neutral-200 font-sans">
                          <thead>
                            <tr className="bg-neutral-50 text-neutral-850 font-black uppercase text-[8.5px] tracking-wider border-b border-neutral-200">
                              <th className="py-1.5 px-2 w-8 text-center border border-neutral-200 text-neutral-700 font-bold">SL</th>
                              <th className="py-1.5 px-2 border border-neutral-200">STYLE / REF &amp; PO NUMBER</th>
                              <th className="py-1.5 px-2 border border-neutral-200">GOODS DESCRIPTION</th>
                              <th className="py-1.5 px-2 text-right border border-neutral-200 w-28">DELIVERED QTY</th>
                            </tr>
                          </thead>
                          <tbody className="text-neutral-900 font-medium">
                            {(() => {
                              const getStyleRows = (items: any[]) => {
                                const list: Array<{
                                  styleNumber: string;
                                  poNumber: string;
                                  itemName: string;
                                  details: string;
                                  sizeBreakdown: string;
                                  totalQty: number;
                                  unit: string;
                                }> = [];

                                items.forEach(item => {
                                  if (item.styleBreakdowns && item.styleBreakdowns.length > 0) {
                                    item.styleBreakdowns.forEach((sb: any) => {
                                      const originalUnit = sb.sizeUnit || item.unit || 'Pcs';
                                      const isDzn = originalUnit.trim().toLowerCase() === 'dzn';
                                      const factor = isDzn ? 12 : 1;
                                      const displayUnit = isDzn ? 'Pcs' : originalUnit;

                                      let sizeBreakdown = '';
                                      let totalQty = 0;
                                      if (sb.sizeWise && sb.sizes && sb.sizes.length > 0) {
                                        sizeBreakdown = sb.sizes
                                          .map((sz: any) => `${sz.size}: ${(sz.quantity * factor).toLocaleString()} ${displayUnit}`)
                                          .join(', ');
                                        totalQty = Math.round(
                                          sb.sizes.reduce((sum: number, sz: any) => sum + (sz.quantity * factor), 0) * 1e10
                                        ) / 1e10;
                                      } else {
                                        totalQty = (sb.quantity || 0) * factor;
                                      }
                                      list.push({
                                        styleNumber: sb.styleNumber || item.styleNumber,
                                        poNumber: item.poNumber,
                                        itemName: item.itemName,
                                        details: item.details,
                                        sizeBreakdown,
                                        totalQty,
                                        unit: displayUnit
                                      });
                                    });
                                  } else {
                                    // Fallback for older items without styleBreakdowns
                                    let sizeBreakdown = '';
                                    let totalQty = 0;
                                    const originalUnit = item.unit || 'Pcs';
                                    const isDzn = originalUnit.trim().toLowerCase() === 'dzn';
                                    const factor = isDzn ? 12 : 1;
                                    const displayUnit = isDzn ? 'Pcs' : originalUnit;
                                    if (item.sizeWise && item.sizes && item.sizes.length > 0) {
                                      sizeBreakdown = item.sizes
                                        .map((sz: any) => `${sz.size}: ${(sz.quantity * factor).toLocaleString()} ${displayUnit}`)
                                        .join(', ');
                                      totalQty = Math.round(
                                        item.sizes.reduce((sum: number, sz: any) => sum + (sz.quantity * factor), 0) * 1e10
                                      ) / 1e10;
                                    } else {
                                      totalQty = (item.totalQuantity || 0) * factor;
                                    }
                                    list.push({
                                      styleNumber: item.styleNumber,
                                      poNumber: item.poNumber,
                                      itemName: item.itemName,
                                      details: item.details,
                                      sizeBreakdown,
                                      totalQty,
                                      unit: displayUnit
                                    });
                                  }
                                });
                                return list;
                              };

                              const styleRows = activePreview ? getStyleRows(activePreview.items) : [];

                              return styleRows.map((row, idx) => (
                                <tr key={idx} className="align-top border-b border-neutral-200">
                                  <td className="py-1 px-1.5 text-center border border-neutral-200 text-neutral-700 font-mono text-[9px]">{idx + 1}</td>
                                  <td className="py-1 px-2 border border-neutral-200 text-left">
                                    <div className="font-extrabold text-neutral-950 font-mono text-[9.5px]">{row.styleNumber || 'N/A'}</div>
                                    {row.poNumber && <div className="text-neutral-700 text-[8.5px] mt-0.5">PO: <span className="font-bold text-neutral-900">{row.poNumber}</span></div>}
                                  </td>
                                  <td className="py-1 px-2 border border-neutral-200 text-left">
                                    <p className="font-extrabold text-neutral-950 leading-tight text-[9.5px]">{row.itemName}</p>
                                    {row.sizeBreakdown && (
                                      <p className="text-[8px] text-sky-800 font-mono font-bold mt-0.5 leading-tight">{row.sizeBreakdown}</p>
                                    )}
                                    {row.details && <p className="text-[8px] text-neutral-500 italic mt-0.5 leading-none">{row.details}</p>}
                                  </td>
                                  <td className="py-1 px-2 text-right font-mono font-extrabold text-neutral-950 text-[9.5px] border border-neutral-200">
                                    {row.totalQty.toLocaleString()} <span className="text-[8px] text-neutral-600 uppercase font-sans font-bold">{row.unit}</span>
                                  </td>
                                </tr>
                              ));
                            })()}
                          </tbody>
                          <tfoot>
                            <tr className="bg-neutral-50 font-black text-neutral-950 text-[9.5px]">
                              <td colSpan={3} className="py-1.5 px-2 text-right border border-neutral-200 font-bold">
                                TOTAL NET DELIVERY QTY:
                              </td>
                              <td className="py-1.5 px-2 text-right font-mono border border-neutral-200 font-black text-neutral-950">
                                {getFormattedChallanTotal(activePreview)}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>

                    {/* Bottom Signature Lines Block */}
                    <div className="mt-8 pt-4 pb-1 font-sans">
                      <div className="grid grid-cols-3 gap-5 text-center text-[9px] text-neutral-650 font-bold">
                        <div className="relative flex flex-col justify-end items-center h-28 text-center">
                          <div className="border-t border-neutral-400 w-full pt-1.5" />
                          <p className="font-black text-neutral-950 text-[10px] leading-none">Customer Received By</p>
                          <p className="text-[8px] text-neutral-600 leading-none mt-0.5 font-bold">Signature &amp; Date</p>
                        </div>
                        <div className="relative flex flex-col justify-end items-center h-28 text-center">
                          <div className="border-t border-neutral-400 w-full pt-1.5" />
                          <p className="font-black text-neutral-950 text-[10px] leading-none">Checked By</p>
                          <p className="text-[8px] text-neutral-600 leading-none mt-0.5 font-bold">Store / Warehouse Dept</p>
                        </div>
                        <div className="relative flex flex-col justify-end items-center h-28 text-center">
                          {signatureImage && (
                            <img 
                              src={signatureImage} 
                              alt="Seal &amp; Signature" 
                              className="absolute bottom-10 max-h-[75px] w-auto object-contain select-text"
                              referrerPolicy="no-referrer"
                            />
                          )}
                          <div className="border-t border-neutral-950 w-full pt-1.5" />
                          <p className="font-black text-neutral-950 text-[10px] leading-none">For {COMPANY_PROFILE.name}</p>
                          <p className="text-[8px] text-neutral-600 leading-none mt-0.5 font-bold">Authorized Representative</p>
                        </div>
                      </div>
                    </div>

                    {/* Footer footnote */}
                    <div className="mt-4 flex justify-between items-center text-[8px] text-neutral-400 font-medium font-sans border-t border-neutral-100 pt-2">
                      <p>This Document is generated by {COMPANY_PROFILE.name} ERP System by Shakhawat.</p>
                      <p className="text-right font-mono text-[7.5px] tracking-wide select-text">PAGE 1 OF 1</p>
                    </div>

                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-gray-400 select-none">
                <Eye className="w-10 h-10 text-neutral-300 mb-2" />
                <p className="text-xs font-semibold text-neutral-500 uppercase tracking-widest">Select a Challan to view Live Preview</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 🎫 Security Gate Pass Central Registry Logs (গেট পাস হিস্ট্রি ও ডাটা রেকর্ড) */}
      <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden shadow-xs mt-6 print:hidden text-left">
        <div className="p-4 bg-slate-50 border-b border-neutral-100 flex flex-col sm:flex-row items-center justify-between gap-3 select-none">
          <div>
            <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              <Truck className="w-4 h-4 text-indigo-650" /> Automated Security Gate Pass Registry Logs (সিকিউরিটি গেট পাস বুক)
            </h3>
            <p className="text-[10px] text-slate-500 font-medium">Auto-generated exit clearance permits connected directly to active delivery challans dispatch records.</p>
          </div>
          <span className="text-[10px] px-2.5 py-1 bg-indigo-50 text-indigo-700 font-extrabold rounded-md font-mono select-none">
            TOTAL RECORDS: {gatePassHistory.length} PASSES
          </span>
        </div>

        {gatePassHistory.length === 0 ? (
          <div className="py-12 text-center text-slate-450 text-xs font-medium bg-white">
            ℹ️ No Gate Passes recorded so far. Click "Security Gate Pass" button inside any active Challan preview to register vehicle exit credentials!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 border-collapse">
              <thead className="bg-[#f8fafc] border-b border-neutral-100 font-extrabold uppercase text-[9px] text-slate-400 select-none">
                <tr>
                  <th className="py-2.5 px-4 w-12 text-center">SL</th>
                  <th className="py-2.5 px-4">Gate Pass ID</th>
                  <th className="py-2.5 px-4">Associated Despatch</th>
                  <th className="py-2.5 px-4">Cargo Transport vehicle</th>
                  <th className="py-2.5 px-4">Driver (Phone)</th>
                  <th className="py-2.5 px-4">Officer Sergeant</th>
                  <th className="py-2.5 px-4 text-center">Seal Status</th>
                  <th className="py-2.5 px-4 text-center">Interactive Operations</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                {gatePassHistory.map((item, idx) => {
                  const isOut = item.passData.status === 'Checked & Out';
                  const passNo = `GP-2026-${item.challan.challanNo.replace(/[^0-9]/g, '') || '101'}`;
                  return (
                    <tr key={item.challan.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-4 text-center font-mono text-slate-400">{idx + 1}</td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">{passNo}</td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900 leading-tight">{item.challan.factoryName}</div>
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">CH-Ref: {item.challan.challanNo}</div>
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-650">{item.passData.vehicleNo}</td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 leading-none">{item.passData.driverName}</div>
                        <div className="text-[10px] text-slate-500 font-mono mt-1">{item.passData.driverPhone}</div>
                      </td>
                      <td className="py-3 px-4 text-[11px] text-slate-600">{item.passData.securityCheckedBy}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex items-center gap-1 text-[9.5px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${
                          isOut ? 'bg-indigo-50 text-indigo-700 border border-indigo-150' : 'bg-emerald-50 text-emerald-700 border border-emerald-150'
                        }`}>
                          {isOut ? <ShieldCheck className="w-3 h-3" /> : <ShieldAlert className="w-3 h-3" />}
                          {item.passData.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-3">
                          <button
                            type="button"
                            onClick={() => setActiveGatePassPreview({ challan: item.challan, passData: item.passData })}
                            className="inline-flex items-center text-[11px] font-bold text-sky-700 hover:text-sky-800 hover:underline transition-colors cursor-pointer"
                          >
                            <Eye className="w-3 h-3 mr-0.5" /> View Pass
                          </button>
                          <button
                            type="button"
                            onClick={() => triggerPrintGatePass(item.challan)}
                            className="inline-flex items-center text-[11px] font-bold text-indigo-700 hover:text-indigo-800 hover:underline transition-colors cursor-pointer"
                          >
                            <Printer className="w-3 h-3 mr-0.5" /> Print Sheet
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

      {/* 2. SECURITY GATE PASS CREATOR INTERACTIVE DIALOG MODAL */}
      {gatePassChallan && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[100] print:hidden animate-fade-in text-left font-sans">
          <div className="bg-white border border-neutral-250 rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden p-6 relative animate-scale-in">
            <button
              type="button"
              onClick={() => setGatePassChallan(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 rounded-lg p-1 transition-colors cursor-pointer"
              title="Close Dialog"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 pb-4 border-b border-slate-100 mb-5">
              <div className="p-2 bg-indigo-50 text-indigo-700 rounded-lg shrink-0">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm uppercase tracking-wider text-slate-900 leading-tight">
                  Automated Security Gate Pass clearance
                </h3>
                <p className="text-[10px] text-slate-400 font-medium">Verify driver identification and log transport vehicle permit licenses.</p>
              </div>
            </div>

            <form onSubmit={handleSaveGatePass} className="space-y-4 font-medium text-slate-700 text-xs">
              <div>
                <label className="block text-[8.5px] font-black text-slate-400 uppercase tracking-widest mb-1">Target dispatching factory</label>
                <div className="px-3.5 py-2 bg-slate-50 border border-slate-150 rounded-lg text-slate-800 font-bold select-none leading-relaxed">
                  🚚 {gatePassChallan.factoryName}
                  <span className="block text-[9.5px] text-slate-450 font-mono font-medium mt-0.5">Reference Challan Tracking ID: {gatePassChallan.challanNo}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[8.5px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Cargo Transport vehicle No</label>
                  <input
                    type="text"
                    required
                    value={gpVehicle}
                    onChange={(e) => setGpVehicle(e.target.value)}
                    className="w-full px-3.5 py-1.5 border border-slate-200 bg-white rounded-lg focus:outline-hidden text-slate-900 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[8.5px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Cargo driver name (পূর্ণ নাম)</label>
                  <input
                    type="text"
                    required
                    value={gpDriver}
                    onChange={(e) => setGpDriver(e.target.value)}
                    className="w-full px-3.5 py-1.5 border border-slate-200 bg-white rounded-lg focus:outline-hidden text-slate-900 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[8.5px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Driver Contact phone No</label>
                  <input
                    type="text"
                    required
                    value={gpDriverPhone}
                    onChange={(e) => setGpDriverPhone(e.target.value)}
                    className="w-full px-3.5 py-1.5 border border-slate-200 bg-white rounded-lg focus:outline-hidden text-slate-900 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[8.5px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Authorized Officer Sergeant</label>
                  <input
                    type="text"
                    required
                    value={gpSecurityOfficer}
                    onChange={(e) => setGpSecurityOfficer(e.target.value)}
                    className="w-full px-3.5 py-1.5 border border-slate-200 bg-white rounded-lg focus:outline-hidden text-slate-900 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[8.5px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Gate Sergeant Exit Clearance Pass status</label>
                <div className="grid grid-cols-2 gap-3">
                  <label className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                    gpStatus === 'Issued' ? 'bg-amber-50/50 border-amber-300 text-amber-800' : 'bg-white border-neutral-150 hover:bg-neutral-50/50'
                  }`}>
                    <input 
                      type="radio" 
                      name="gpStatus" 
                      checked={gpStatus === 'Issued'} 
                      onChange={() => setGpStatus('Issued')} 
                      className="hidden" 
                    />
                    <ShieldAlert className={`w-4 h-4 ${gpStatus === 'Issued' ? 'text-amber-600 animate-pulse' : 'text-slate-400'}`} />
                    <div className="text-left leading-tight">
                      <span className="block font-black uppercase text-[10px]">Issued (লকড)</span>
                      <span className="text-[8.5px] text-slate-450 font-medium">Pending Gate Clearance checks</span>
                    </div>
                  </label>
                  <label className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                    gpStatus === 'Checked & Out' ? 'bg-indigo-50/50 border-indigo-300 text-indigo-800' : 'bg-white border-neutral-150 hover:bg-neutral-50/50'
                  }`}>
                    <input 
                      type="radio" 
                      name="gpStatus" 
                      checked={gpStatus === 'Checked & Out'} 
                      onChange={() => setGpStatus('Checked & Out')} 
                      className="hidden" 
                    />
                    <ShieldCheck className={`w-4 h-4 ${gpStatus === 'Checked & Out' ? 'text-indigo-650' : 'text-slate-400'}`} />
                    <div className="text-left leading-tight">
                      <span className="block font-black uppercase text-[10px]">Checked &amp; Out</span>
                      <span className="text-[8.5px] text-slate-450 font-medium">Cargo passed out compound gateway</span>
                    </div>
                  </label>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100 mt-5">
                <button
                  type="button"
                  onClick={() => triggerPrintGatePass(gatePassChallan)}
                  className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-extrabold uppercase rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1 shrink-0"
                >
                  <Printer className="w-3.5 h-3.5" /> Print Sheet
                </button>
                <button
                  type="submit"
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-extrabold uppercase rounded-lg tracking-wider shadow-md transition-all cursor-pointer text-center"
                >
                  🔒 Lock &amp; Record Gate Details
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. SECURITY GATE PASS DETAILED PREVIEW SHEET OVERLAY (DIALOG PREVIEW ON SCREEN) */}
      {activeGatePassPreview && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-[100] print:hidden animate-fade-in text-left font-sans">
          <div className="bg-white border border-neutral-255 rounded-2xl max-w-2xl w-full shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto my-10 animate-scale-in">
            <button
              type="button"
              onClick={() => setActiveGatePassPreview(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 rounded-lg p-1 transition-colors cursor-pointer"
              title="Close Dialog"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center justify-between border-b border-neutral-100 pb-3.5 mb-4 select-none">
              <div>
                <h3 className="font-extrabold text-xs uppercase tracking-wider text-indigo-750 flex items-center gap-1.5 leading-none">
                  <Truck className="w-4.5 h-4.5 text-indigo-650" /> Gate Pass Preview (গেট পাস রশিদ)
                </h3>
                <p className="text-[9.5px] text-slate-400 font-medium leading-none mt-1">Verified exit clearance records from main logistics park.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  triggerPrintGatePass(activeGatePassPreview.challan);
                  setActiveGatePassPreview(null);
                }}
                className="mr-7 px-3 py-1 bg-neutral-950 hover:bg-neutral-800 text-white text-[10px] uppercase tracking-wider font-extrabold rounded-md shadow-xs transition-colors cursor-pointer flex items-center gap-1"
              >
                <Printer className="w-3 h-3" /> Pin Print
              </button>
            </div>

            {/* Simulated Live Sheet Template representation */}
            <div className="border border-neutral-200 rounded-xl p-5 bg-neutral-50/50 relative">
              <div className="border-b border-neutral-300 pb-4 flex justify-between items-start gap-4">
                <div className="text-left font-sans">
                  <div className="inline-block px-1.5 py-0.5 bg-neutral-200 text-neutral-850 font-black text-[7.5px] uppercase tracking-widest rounded mb-1">AUTOMATED CLEARANCE ENTRY</div>
                  <h4 className="text-lg font-black uppercase text-neutral-900 tracking-tight leading-none">{COMPANY_PROFILE.name}</h4>
                  <p className="text-[8.5px] text-neutral-500 font-bold mt-1 leading-normal">{COMPANY_PROFILE.addresses.office}</p>
                </div>
                <div className="text-right flex flex-col items-end shrink-0">
                  <Barcode value={`GP-2026-${activeGatePassPreview.challan.challanNo.replace(/[^0-9]/g, '') || '101'}`} height={20} showText={false} />
                  <span className="text-[7.5px] font-bold font-mono tracking-wider text-slate-450 mt-0.5">GP-2026-{activeGatePassPreview.challan.challanNo.replace(/[^0-9]/g, '') || '101'}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-[10.5px] font-sans mt-3 border-b border-slate-150 pb-3 text-left">
                <div>
                  <p className="m-0 text-slate-500 text-[8.5px] font-black uppercase tracking-wider">Despatch Consignee</p>
                  <p className="font-extrabold text-[#111827] leading-none mt-1">{activeGatePassPreview.challan.factoryName}</p>
                  <p className="text-slate-500 leading-tight mt-1 text-[9.5px]">{activeGatePassPreview.challan.deliveryAddress || 'Standard Factory Area'}</p>
                  <p className="text-slate-500 leading-none mt-1.5 text-[9.5px]">Buyer brand: <strong className="text-slate-900">{activeGatePassPreview.challan.buyerName || 'N/A'}</strong></p>
                </div>
                <div>
                  <p className="m-0 text-slate-500 text-[8.5px] font-black uppercase tracking-wider">Cargo Logistics Details</p>
                  <p className="font-extrabold text-indigo-700 font-mono mt-1 leading-none">{activeGatePassPreview.passData.vehicleNo}</p>
                  <p className="text-slate-650 leading-tight mt-1 text-[9.5px]">Driver: <strong>{activeGatePassPreview.passData.driverName}</strong></p>
                  <p className="text-slate-500 leading-none mt-1 text-[9.5px]">Driver Mob: <strong className="font-mono text-slate-900">{activeGatePassPreview.passData.driverPhone}</strong></p>
                </div>
              </div>

              <p className="mt-3.5 text-[9.5px] text-slate-400 italic text-left">
                Security Officer Directives: Check loaded items description and matching cargo sizes counts before exit dispatch locks release.
              </p>

              <div className="border border-neutral-200 rounded-lg overflow-hidden mt-3 text-[10px]">
                <table className="w-full text-left text-neutral-700 border-collapse h-full">
                  <thead className="bg-[#f1f5f9] border-b border-neutral-200 font-bold uppercase text-[8px] text-slate-450 select-none">
                    <tr>
                      <th className="py-1 px-3 w-8 text-center border-r border-neutral-150">Sl</th>
                      <th className="py-1 px-3 border-r border-neutral-150">Loaded garment items</th>
                      <th className="py-1 px-3 border-r border-neutral-150">POs and Style reference</th>
                      <th className="py-1 px-3 text-right">Qty verified</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-150 font-medium">
                    {activeGatePassPreview.challan.items.map((item, idx) => (
                      <tr key={item.id} className="bg-white">
                        <td className="py-1.5 px-3 text-center border-r border-neutral-150 font-mono text-[9px] text-slate-400">{idx + 1}</td>
                        <td className="py-1.5 px-3 font-bold border-r border-neutral-150 text-left">{item.itemName}</td>
                        <td className="py-1.5 px-3 font-mono text-[8.5px] border-r border-neutral-150 text-left">Style: <strong className="text-slate-900">{item.styleNumber || '—'}</strong><br />PO: {item.poNumber || '—'}</td>
                        <td className="py-1.5 px-3 text-right font-extrabold text-indigo-750 font-mono">{getDocItemTotalQty(item).toLocaleString()} {item.unit?.trim().toLowerCase() === 'dzn' ? 'Pcs' : (item.unit || 'Pcs')}</td>
                      </tr>
                    ))}
                    <tr className="bg-neutral-50/50 font-bold text-slate-900 select-none border-t border-slate-300">
                      <td colSpan={3} className="py-2 px-3 text-right text-[10px]">TOTAL DISPATCH QTY Checked:</td>
                      <td className="py-2 px-3 text-right text-[10px] text-indigo-700 font-mono font-black">{getFormattedChallanTotal(activeGatePassPreview.challan)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="mt-3.5 text-[10px] leading-relaxed border border-neutral-200 p-2 rounded bg-white text-left font-medium">
                <p>Status: <span className="text-indigo-650 font-extrabold uppercase">{activeGatePassPreview.passData.status}</span></p>
                <p className="mt-0.5">Duty Officer Sergeant Sergeant Sergeant: <strong className="text-slate-800">{activeGatePassPreview.passData.securityCheckedBy}</strong></p>
              </div>

              <div className="grid grid-cols-3 gap-4 text-center text-[7.5px] font-bold text-slate-400 mt-8 select-none">
                <div className="border-t border-neutral-300 pt-1.5">Gate Guard Check</div>
                <div className="border-t border-neutral-300 pt-1.5">Store / Dispatch Dept</div>
                <div className="border-t border-neutral-300 pt-1.5 text-neutral-750 font-extrabold uppercase">Gate Sergeant Seal</div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-5 border-t border-neutral-100 pt-4 select-none shrink-0">
              <button
                type="button"
                onClick={() => setActiveGatePassPreview(null)}
                className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-black uppercase transition-colors cursor-pointer"
              >
                Close Dialog
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. INTERACTIVE CHALLAN EDITING MODAL OVERLAY */}
      {editingChallan && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-55 overflow-y-auto print:hidden animate-fade-in text-left">
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              if (onUpdateChallan) onUpdateChallan(editingChallan);
              setActivePreview(editingChallan);
              setEditingChallan(null);
            }}
            className="bg-white border border-neutral-255 rounded-2xl max-w-4xl w-full shadow-2xl p-6 relative my-10 animate-scale-in flex flex-col max-h-[90vh]"
          >
            {/* Modal Header */}
            <div className="flex justify-between items-center border-b border-neutral-100 pb-3 mb-4 shrink-0 select-none">
              <h3 className="text-sm font-black uppercase text-neutral-950 tracking-wider flex items-center gap-1.5 font-sans">
                <Edit className="w-4 h-4 text-[#007d46]" /> Edit Delivery Challan Details
              </h3>
              <button
                type="button"
                onClick={() => setEditingChallan(null)}
                className="text-slate-400 hover:text-slate-700 text-xl font-bold p-1 cursor-pointer"
              >
                &times;
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="flex-grow overflow-y-auto pr-1.5 space-y-5 font-sans text-xs">
              
              {/* Header Information segment */}
              <div className="bg-slate-50/50 p-4 border border-slate-100 rounded-xl space-y-4 font-medium text-slate-700">
                <span className="block text-[9px] font-black text-slate-400 uppercase tracking-wider select-none">Challan Header Metadata info</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
                  <div>
                    <label className="block text-[8.5px] font-black text-neutral-450 uppercase tracking-widest mb-1.5">Challan reference No</label>
                    <input
                      type="text"
                      required
                      value={editingChallan.challanNo}
                      onChange={(e) => setEditingChallan({ ...editingChallan, challanNo: e.target.value })}
                      className="w-full px-2.5 py-1 text-xs border border-neutral-250 bg-white rounded-md focus:outline-hidden font-mono font-bold text-neutral-950"
                    />
                  </div>
                  <div>
                    <label className="block text-[8.5px] font-black text-neutral-450 uppercase tracking-widest mb-1.5">Despatch date</label>
                    <input
                      type="date"
                      required
                      value={editingChallan.date}
                      onChange={(e) => setEditingChallan({ ...editingChallan, date: e.target.value })}
                      className="w-full px-2.5 py-1 text-xs border border-neutral-250 bg-white rounded-md focus:outline-hidden font-mono font-bold text-neutral-950"
                    />
                  </div>
                  <div>
                    <label className="block text-[8.5px] font-black text-neutral-450 uppercase tracking-widest mb-1.5">Delivery destination factory</label>
                    <input
                      type="text"
                      required
                      value={editingChallan.factoryName}
                      onChange={(e) => setEditingChallan({ ...editingChallan, factoryName: e.target.value })}
                      className="w-full px-2.5 py-1 text-xs border border-neutral-250 bg-white rounded-md focus:outline-hidden font-bold text-neutral-950"
                    />
                  </div>
                  <div>
                    <label className="block text-[8.5px] font-black text-neutral-450 uppercase tracking-widest mb-1.5">Buyer brand name</label>
                    <input
                      type="text"
                      required
                      value={editingChallan.buyerName || ''}
                      onChange={(e) => setEditingChallan({ ...editingChallan, buyerName: e.target.value })}
                      className="w-full px-2.5 py-1 text-xs border border-neutral-250 bg-white rounded-md focus:outline-hidden font-bold text-neutral-950"
                    />
                  </div>
                  <div>
                    <label className="block text-[8.5px] font-black text-neutral-450 uppercase tracking-widest mb-1.5">POs & Style Reference</label>
                    <input
                      type="text"
                      value={editingChallan.ref || ''}
                      onChange={(e) => setEditingChallan({ ...editingChallan, ref: e.target.value })}
                      className="w-full px-2.5 py-1 text-xs border border-neutral-250 bg-white rounded-md focus:outline-hidden font-mono font-bold text-neutral-950"
                      placeholder="e.g. POs/Styles"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  <div>
                    <label className="block text-[8.5px] font-black text-neutral-450 uppercase tracking-widest mb-1.5">Despatch delivery address</label>
                    <input
                      type="text"
                      required
                      value={editingChallan.deliveryAddress || ''}
                      onChange={(e) => setEditingChallan({ ...editingChallan, deliveryAddress: e.target.value })}
                      className="w-full px-2.5 py-1 text-xs border border-neutral-250 bg-white rounded-md focus:outline-hidden font-bold text-neutral-950"
                    />
                  </div>
                  <div>
                    <label className="block text-[8.5px] font-black text-neutral-450 uppercase tracking-widest mb-1.5 font-sans">Garment parts H.S Code classification</label>
                    <input
                      type="text"
                      value={editingChallan.hsCode || ''}
                      placeholder={COMPANY_PROFILE.defaultHsCode}
                      onChange={(e) => setEditingChallan({ ...editingChallan, hsCode: e.target.value })}
                      className="w-full px-2.5 py-1 text-xs border border-neutral-250 bg-white rounded-md focus:outline-hidden font-mono font-bold text-neutral-950"
                    />
                  </div>
                </div>
              </div>

              {/* Items modification lists */}
              <div className="space-y-4 font-medium text-slate-700">
                <div className="flex justify-between items-center select-none">
                  <span className="block text-[9px] font-black text-slate-400 uppercase tracking-wider">Garments accessories loaded packing lists</span>
                  <span className="text-[10px] font-mono text-emerald-700 font-bold">TOTAL REGISTERED DISTINCT ACCESSORIES: {editingChallan.items.length} TYPES</span>
                </div>

                <div className="space-y-3">
                  {editingChallan.items.map((it, idx) => (
                    <div 
                      key={it.id} 
                      draggable
                      onDragStart={(e) => handleChallanDragStart(e, idx)}
                      onDragEnter={() => cDragOverItem.current = idx}
                      onDragEnd={handleChallanDragEnd}
                      onDragOver={(e) => e.preventDefault()}
                      className="border border-neutral-200 rounded-xl p-4 bg-white shadow-3xs hover:border-neutral-300 hover:bg-slate-50/55 transition-all"
                    >
                      <div className="flex justify-between items-center border-b border-neutral-100 pb-2 mb-3">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-neutral-900 text-white font-mono font-black text-[9px] rounded select-none">SL-No: {idx + 1}</span>
                          
                          {/* Drag grip and up/down movement buttons */}
                          <div className="flex items-center gap-1 bg-neutral-100 px-1.5 py-0.5 rounded select-none">
                            <span className="text-gray-400 font-bold text-sm cursor-grab active:cursor-grabbing hover:text-gray-700" title="Hold to drag reorder">⠿</span>
                            <button
                              type="button"
                              onClick={() => moveChallanItemUp(idx)}
                              disabled={idx === 0}
                              className={`p-0.5 rounded ${idx === 0 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:bg-neutral-200 hover:text-neutral-900'} transition-colors`}
                              title="Move Item Up"
                            >
                              <ArrowUp className="w-2.5 h-2.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => moveChallanItemDown(idx)}
                              disabled={idx === editingChallan.items.length - 1}
                              className={`p-0.5 rounded ${idx === editingChallan.items.length - 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-600 hover:bg-neutral-200 hover:text-neutral-900'} transition-colors`}
                              title="Move Item Down"
                            >
                              <ArrowDown className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const newItems = editingChallan.items.filter((_, i) => i !== idx);
                            setEditingChallan({ ...editingChallan, items: newItems });
                          }}
                          className="text-[9px] font-black uppercase text-red-500 hover:text-red-700 border border-red-200 hover:bg-red-50 px-2 py-0.5 rounded transition-all cursor-pointer"
                        >
                          &times; Remove Item
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-4">
                        <div className="md:col-span-2">
                          <label className="block text-[8.5px] font-black text-neutral-400 uppercase tracking-wider mb-1">Garment item accessories name</label>
                          <input
                            type="text"
                            required
                            value={it.itemName}
                            onChange={(e) => {
                              const newItems = [...editingChallan.items];
                              newItems[idx].itemName = e.target.value;
                              setEditingChallan({ ...editingChallan, items: newItems });
                            }}
                            className="w-full px-2.5 py-1 text-xs border border-neutral-250 bg-white rounded-md focus:outline-hidden font-bold text-neutral-950"
                          />
                        </div>
                        <div>
                          <label className="block text-[8.5px] font-black text-neutral-400 uppercase tracking-wider mb-1">POs sequence numbers list</label>
                          <input
                            type="text"
                            required
                            value={it.poNumber || ''}
                            onChange={(e) => {
                              const newItems = [...editingChallan.items];
                              newItems[idx].poNumber = e.target.value;
                              setEditingChallan({ ...editingChallan, items: newItems });
                            }}
                            className="w-full px-2.5 py-1 text-xs border border-neutral-250 bg-white rounded-md focus:outline-hidden font-mono font-bold text-neutral-950"
                          />
                        </div>
                        <div>
                          <label className="block text-[8.5px] font-black text-neutral-400 uppercase tracking-wider mb-1">Buyer Style numbers list</label>
                          <input
                            type="text"
                            required
                            value={it.styleNumber || ''}
                            onChange={(e) => {
                              const newItems = [...editingChallan.items];
                              newItems[idx].styleNumber = e.target.value;
                              setEditingChallan({ ...editingChallan, items: newItems });
                            }}
                            className="w-full px-2.5 py-1 text-xs border border-neutral-250 bg-white rounded-md focus:outline-hidden font-mono font-bold text-neutral-950"
                          />
                        </div>
                        <div>
                          <label className="block text-[8.5px] font-black text-neutral-400 uppercase tracking-wider mb-1">Unit</label>
                          <select
                            value={it.unit || 'Pcs'}
                            onChange={(e) => {
                              const newItems = [...editingChallan.items];
                              newItems[idx].unit = e.target.value as any;
                              setEditingChallan({ ...editingChallan, items: newItems });
                            }}
                            className="w-full px-2.5 py-1 text-xs border border-neutral-250 bg-white rounded-md focus:outline-hidden font-bold text-neutral-950 cursor-pointer"
                          >
                            {['Pcs', 'Dzn', 'Set', 'Yds', 'Roll', 'Cone', 'Kg', 'Mtr', 'Ctn'].map((unit) => (
                              <option key={unit} value={unit}>{unit}</option>
                            ))}
                          </select>
                        </div>
                        <div className="grid grid-cols-2 gap-1.5">
                          <div>
                            <label className="block text-[8.5px] font-black text-neutral-400 uppercase tracking-wider mb-1">Unit Price ($)</label>
                            <input
                              type="number"
                              required
                              min="0"
                              step="0.0001"
                              value={it.unitPrice || 0}
                              onChange={(e) => {
                                const newItems = [...editingChallan.items];
                                newItems[idx].unitPrice = Number(e.target.value);
                                setEditingChallan({ ...editingChallan, items: newItems });
                              }}
                              className="w-full px-1.5 py-1 text-xs border border-neutral-250 bg-white rounded-md focus:outline-hidden font-mono font-bold text-neutral-900"
                            />
                          </div>
                          {!it.sizeWise ? (
                            <div>
                              <label className="block text-[8.5px] font-black text-neutral-400 uppercase tracking-wider mb-1">Flat Qty</label>
                              <input
                                type="number"
                                required
                                min="0"
                                value={it.totalQuantity || 0}
                                onChange={(e) => {
                                  const newItems = [...editingChallan.items];
                                  newItems[idx].totalQuantity = Number(e.target.value);
                                  setEditingChallan({ ...editingChallan, items: newItems });
                                }}
                                className="w-full px-1.5 py-1 text-xs border border-neutral-250 bg-white rounded-md focus:outline-hidden font-mono font-bold text-neutral-900"
                              />
                            </div>
                          ) : (
                            <div className="flex flex-col justify-end pb-1.5 text-center">
                              <span className="text-[8px] font-black text-emerald-600 bg-emerald-50 rounded py-0.5 border border-emerald-100 uppercase">SizeWise</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Size wise section */}
                      {it.sizeWise && (
                        <div className="bg-white border border-neutral-200 rounded-lg p-3.5 mt-2 space-y-2">
                          <div className="flex justify-between items-center text-[8.5px] uppercase font-bold text-neutral-400 tracking-wider">
                            <span>Sizing Quantity Matrix:</span>
                            <button
                              type="button"
                              onClick={() => {
                                const newItems = [...editingChallan.items];
                                const sizesList = [...(it.sizes || [])];
                                sizesList.push({ size: `SZ-${sizesList.length + 1}`, quantity: 0 });
                                newItems[idx].sizes = sizesList;
                                setEditingChallan({ ...editingChallan, items: newItems });
                              }}
                              className="px-1.5 py-0.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-[8px] font-bold rounded uppercase cursor-pointer"
                            >
                              + Add Size
                            </button>
                          </div>
                          
                          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 pt-1">
                            {(it.sizes || []).map((sz, szIdx) => (
                              <div key={szIdx} className="bg-neutral-50/50 p-2 rounded border border-neutral-200 text-center flex flex-col justify-between">
                                <div className="flex justify-between items-center mb-1">
                                  <input
                                    type="text"
                                    value={sz.size}
                                    onChange={(e) => {
                                      const newItems = [...editingChallan.items];
                                      const sizesList = [...it.sizes];
                                      sizesList[szIdx].size = e.target.value;
                                      newItems[idx].sizes = sizesList;
                                      setEditingChallan({ ...editingChallan, items: newItems });
                                    }}
                                    className="w-10 hover:bg-neutral-100 font-extrabold text-[9px] uppercase tracking-tight text-neutral-750 text-center border-none focus:outline-hidden focus:ring-0 bg-transparent p-0"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const newItems = [...editingChallan.items];
                                      const sizesList = it.sizes.filter((_, i) => i !== szIdx);
                                      const totalQty = sizesList.reduce((sum, s) => sum + s.quantity, 0);
                                      newItems[idx].sizes = sizesList;
                                      newItems[idx].totalQuantity = totalQty;
                                      setEditingChallan({ ...editingChallan, items: newItems });
                                    }}
                                    className="text-neutral-400 hover:text-red-600 text-[8px] font-bold p-0.5"
                                    title="Delete Size"
                                  >
                                    &times;
                                  </button>
                                </div>
                                <input
                                  type="number"
                                  min="0"
                                  value={sz.quantity || 0}
                                  onChange={(e) => {
                                    const val = Number(e.target.value);
                                    const newItems = [...editingChallan.items];
                                    const sizesList = [...it.sizes];
                                    sizesList[szIdx].quantity = val;
                                    const totalQty = sizesList.reduce((sum, s) => sum + s.quantity, 0);
                                    newItems[idx].sizes = sizesList;
                                    newItems[idx].totalQuantity = totalQty;
                                    setEditingChallan({ ...editingChallan, items: newItems });
                                  }}
                                  className="w-full text-center font-mono font-bold text-xs bg-white border border-neutral-200 py-0.5 rounded focus:outline-hidden text-neutral-900"
                                />
                              </div>
                            ))}
                          </div>

                          <div className="text-[10px] text-right font-mono text-neutral-500 font-bold pr-2 select-none">
                            Summary Total: <span className="font-black text-neutral-900">{it.totalQuantity.toLocaleString()} {it.unit}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer actions */}
            <div className="flex justify-end gap-3 border-t border-neutral-100 pt-4 mt-4 shrink-0 select-none">
              <button
                type="button"
                onClick={() => setEditingChallan(null)}
                className="px-4 py-2 border border-neutral-250 bg-white rounded-lg text-neutral-700 text-xs font-black uppercase hover:bg-neutral-50 transition-colors cursor-pointer"
              >
                Cancel / Revert
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-[#007d46] hover:bg-[#005e35] active:bg-[#004e2c] text-white rounded-lg text-xs font-black uppercase tracking-wider shadow-md transition-colors cursor-pointer"
              >
                💾 Save Challan Changes
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
