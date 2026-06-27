import React, { useMemo, useCallback } from 'react';
import { 
  Booking, 
  DeliveryChallan, 
  ProformaInvoice, 
  BankDetails, 
  Supplier, 
  SupplierWorkOrder, 
  SupplierPayment, 
  ConveyanceEntry, 
  ProductItemCatalog, 
  ManualInvoiceBill 
} from '../types';
import { 
  Layers, 
  Truck, 
  FileSpreadsheet, 
  Briefcase, 
  DollarSign, 
  Coins, 
  Landmark, 
  ShoppingBag, 
  Plus, 
  ArrowRight,
  Activity,
  UserCheck,
  ClipboardList,
  AlertCircle
} from 'lucide-react';

interface DashboardTabProps {
  bookings: Booking[];
  challans: DeliveryChallan[];
  pis: ProformaInvoice[];
  banks: BankDetails[];
  suppliers: Supplier[];
  workOrders: SupplierWorkOrder[];
  payments: SupplierPayment[];
  conveyances: ConveyanceEntry[];
  products: ProductItemCatalog[];
  manualBills: ManualInvoiceBill[];
  activeBankShortForms: string;
  totalBookingsValue: number;
  totalDeliveredValue: number;
  totalInvoicedValue: number;
  activePisCount: number;
  totalSuppliersOutstandingDue: number;
  conveyanceStats: {
    totalDue: number;
    totalJoma: number;
    netOutstandingDue: number;
  };
  onNavigate: (tab: 'bookings' | 'challans' | 'pis' | 'banks' | 'booking-form' | 'suppliers' | 'conveyance' | 'job-cards' | 'commercial-invoices' | 'products-catalogue' | 'invoice-bill') => void;
}

export default function DashboardTab({
  bookings,
  challans,
  pis,
  banks,
  suppliers,
  workOrders,
  payments,
  conveyances,
  products,
  manualBills,
  activeBankShortForms,
  totalBookingsValue,
  totalDeliveredValue,
  totalInvoicedValue,
  activePisCount,
  totalSuppliersOutstandingDue,
  conveyanceStats,
  onNavigate
}: DashboardTabProps) {

  // Helper to compute booking value accurately matching App.tsx logic
  const getBookingValue = useCallback((b: Booking): number => {
    let bkVal = 0;
    if (b.styleBreakdowns && b.styleBreakdowns.length > 0) {
      bkVal = b.styleBreakdowns.reduce((sSum, sb) => {
        if (sb.sizeWise) {
          const totalPcs = sb.sizes.reduce((sh, sz) => sh + (sz.quantity || 0), 0);
          const sizeUnit = sb.sizeUnit || 'Pcs';
          const needsConversion = sizeUnit === 'Pcs' && b.unit === 'Dzn';
          const displayQty = needsConversion ? (totalPcs / 12) : totalPcs;
          return sSum + (displayQty * (b.unitPrice || 0));
        } else {
          return sSum + ((sb.quantity || 0) * (b.unitPrice || 0));
        }
      }, 0);
    } else {
      if (b.sizeWise) {
        const totalPcs = (b.sizes || []).reduce((acc, s) => acc + (s.quantity || 0), 0);
        const needsConversion = b.unit === 'Dzn';
        const displayQty = needsConversion ? (totalPcs / 12) : totalPcs;
        bkVal = displayQty * (b.unitPrice || 0);
      } else {
        bkVal = (b.quantity || 0) * (b.unitPrice || 0);
      }
    }
    return bkVal;
  }, []);

  // Extra computed stats for rich visual insights
  const pendingChallansCount = useMemo(() => challans.filter(c => c.status === 'Pending').length, [challans]);
  const deliveredChallansCount = useMemo(() => challans.filter(c => c.status === 'Delivered').length, [challans]);

  // Total Manual Bill outstanding (Sum of unpaid and partial bills)
  const manualInvoicesTotal = useMemo(() => {
    return manualBills.reduce((sum, b) => b.paymentStatus !== 'Paid' ? sum + b.totalAmount : sum, 0);
  }, [manualBills]);

  // Calculate challan status distribution percentages
  const statusDistribution = useMemo(() => {
    const total = challans.length;
    if (total === 0) return { pending: 0, delivered: 0 };
    return {
      pending: Math.round((challans.filter(c => c.status === 'Pending').length / total) * 100),
      delivered: Math.round((challans.filter(c => c.status === 'Delivered').length / total) * 100),
    };
  }, [challans]);

  // Top Buyers list from bookings
  const topBuyers = useMemo(() => {
    const buyerMap: Record<string, { count: number; value: number }> = {};
    bookings.forEach(b => {
      const buyer = b.buyerName || 'Unknown Buyer';
      const value = getBookingValue(b);
      if (!buyerMap[buyer]) {
        buyerMap[buyer] = { count: 0, value: 0 };
      }
      buyerMap[buyer].count += 1;
      buyerMap[buyer].value += value;
    });

    return Object.entries(buyerMap)
      .map(([name, stats]) => ({ name, ...stats }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [bookings, getBookingValue]);

  // Recent bookings
  const recentActiveBookings = useMemo(() => {
    return bookings.slice(0, 5);
  }, [bookings]);

  // Dynamic Monthly Booking value Trend calculation for SVG Chart
  const bookingGraphPoints = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    // Initialize last 6 months list
    const last6Months = [];
    const d = new Date();
    for (let i = 5; i >= 0; i--) {
      const past = new Date(d.getFullYear(), d.getMonth() - i, 1);
      last6Months.push({
        monthIndex: past.getMonth(),
        year: past.getFullYear(),
        label: `${months[past.getMonth()]} ${past.getFullYear().toString().slice(-2)}`,
        value: 0
      });
    }

    // Accumulate actual booking data
    bookings.forEach(b => {
      try {
        const bDate = new Date(b.createdAt);
        const mIdx = bDate.getMonth();
        const yr = bDate.getFullYear();
        
        const matchingMonth = last6Months.find(m => m.monthIndex === mIdx && m.year === yr);
        if (matchingMonth) {
          matchingMonth.value += getBookingValue(b);
        }
      } catch (err) {}
    });

    const maxVal = Math.max(...last6Months.map(m => m.value), 100);

    // Build SVG path points
    const width = 500;
    const height = 150;
    const padding = 30;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    const points = last6Months.map((m, idx) => {
      const x = padding + (idx / 5) * chartWidth;
      const progress = m.value / maxVal;
      const y = height - padding - progress * chartHeight;
      return { x, y, label: m.label, value: m.value };
    });

    const linePath = points.length > 0 
      ? `M ${points[0].x} ${points[0].y} ` + points.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ')
      : '';

    const areaPath = points.length > 0
      ? `${linePath} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`
      : '';

    return { points, maxVal, linePath, areaPath };
  }, [bookings, getBookingValue]);

  // Accessories product category split from real live bookings items
  const productCategorySplit = useMemo(() => {
    const categories: Record<string, number> = {};
    bookings.forEach(b => {
      const name = (b.itemName || '').trim().toLowerCase();
      let cat = 'Other Trims';
      if (name.includes('poly') || name.includes('bag')) cat = 'Poly Bags';
      else if (name.includes('label')) cat = 'Labels/Tags';
      else if (name.includes('hang') || name.includes('tag')) cat = 'Hangtags';
      else if (name.includes('carton') || name.includes('box')) cat = 'Carton boxes';
      else if (name.includes('tape') || name.includes('ribbon')) cat = 'Tapes';
      else if (name.includes('thread') || name.includes('yarn')) cat = 'Sewing Threads';
      
      categories[cat] = (categories[cat] || 0) + getBookingValue(b);
    });

    const total = Object.values(categories).reduce((acc, v) => acc + v, 0) || 1;
    return Object.entries(categories).map(([name, val]) => ({
      name,
      value: val,
      percent: Math.round((val / total) * 100)
    })).sort((a,b) => b.value - a.value).slice(0, 4);
  }, [bookings, getBookingValue]);

  // Automated smart ERP alert events
  const activeSystemAlerts = useMemo(() => {
    const alertsList = [];
    
    const unpaidInvoices = manualBills.filter(b => b.paymentStatus !== 'Paid');
    if (unpaidInvoices.length > 0) {
      const sumDue = unpaidInvoices.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
      alertsList.push({
        type: 'danger',
        title: 'Outstanding Client receivables Balance',
        desc: `${unpaidInvoices.length} manual customer invoices are currently unpaid, totaling $${sumDue.toLocaleString(undefined, { maximumFractionDigits: 1 })}.`
      });
    }

    const pendingDeliveries = challans.filter(c => c.status === 'Pending');
    if (pendingDeliveries.length > 0) {
      alertsList.push({
        type: 'warning',
        title: 'Pending Dispatch Deliveries',
        desc: `${pendingDeliveries.length} delivery challans are waiting for dispatch and gate security sergeant check-out clearance.`
      });
    }

    if (totalSuppliersOutstandingDue > 50000) {
      alertsList.push({
        type: 'info',
        title: 'High Supplier Outstanding balance',
        desc: `Primary raw material supplier outstanding balance is BDT ${totalSuppliersOutstandingDue.toLocaleString()}. Review procurement bills.`
      });
    }

    // Default suggestions if things are very clean
    if (alertsList.length === 0) {
      alertsList.push({
        type: 'success',
        title: 'All ERP Systems Operating Fully nominal',
        desc: 'All custom client invoices processed and dispatches fully updated.'
      });
    }

    return alertsList;
  }, [manualBills, challans, totalSuppliersOutstandingDue]);

  return (
    <div className="space-y-6 animate-fade-in text-slate-800" id="executive-dashboard-view">
      
      {/* Header Block with Date and Intro */}
      <div className="border-b border-slate-100 pb-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div>
          <h2 className="text-lg font-black uppercase text-slate-900 tracking-tight flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-650" />
            <span>Executive Business Dashboard &amp; Analytics</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">Real-time enterprise statistics, financial counters, and operations monitoring.</p>
        </div>
        <div className="text-[10px] bg-slate-100 border border-slate-200 text-slate-600 px-3 py-1.5 rounded-lg font-mono font-bold select-none shadow-3xs">
          SYSTEM DATE: {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {/* Grid of Dense KPI Counters */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        
        {/* Metric Card 1 */}
        <div className="bg-white border border-slate-150 rounded-xl p-4 shadow-3xs hover:shadow-2xs transition-all duration-200 flex items-center gap-3">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="block text-[9px] uppercase text-slate-400 font-bold tracking-wider truncate">Total Bookings</span>
            <span className="text-base font-black text-slate-950 leading-tight block">{bookings.length} Orders</span>
            <span className="text-[9px] font-mono text-slate-500 font-semibold block mt-0.5 truncate">
              Value: ${totalBookingsValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </span>
          </div>
        </div>

        {/* Metric Card 2 */}
        <div className="bg-white border border-slate-150 rounded-xl p-4 shadow-3xs hover:shadow-2xs transition-all duration-200 flex items-center gap-3">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-lg shrink-0">
            <Truck className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="block text-[9px] uppercase text-slate-400 font-bold tracking-wider truncate">Dispatches (Challan)</span>
            <span className="text-base font-black text-slate-950 leading-tight block">{challans.length} Challans</span>
            <span className="text-[9px] font-mono text-amber-700 font-semibold block mt-0.5 truncate">
              {pendingChallansCount} Pending Delivery
            </span>
          </div>
        </div>

        {/* Metric Card 3 */}
        <div className="bg-white border border-slate-150 rounded-xl p-4 shadow-3xs hover:shadow-2xs transition-all duration-200 flex items-center gap-3">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg shrink-0">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="block text-[9px] uppercase text-slate-400 font-bold tracking-wider truncate">Active PIs Raised</span>
            <span className="text-base font-black text-slate-950 leading-tight block">{activePisCount} Documents</span>
            <span className="text-[9px] font-mono text-emerald-700 font-bold block mt-0.5 truncate">
              ${totalInvoicedValue.toLocaleString(undefined, { maximumFractionDigits: 0 })} Value
            </span>
          </div>
        </div>

        {/* Metric Card 4 */}
        <div className="bg-white border border-slate-150 rounded-xl p-4 shadow-3xs hover:shadow-2xs transition-all duration-200 flex items-center gap-3">
          <div className="p-3 bg-red-50 text-red-600 rounded-lg shrink-0">
            <DollarSign className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="block text-[9px] uppercase text-slate-400 font-bold tracking-wider truncate">Supplier Outstanding</span>
            <span className="text-base font-black text-[#c62828] leading-tight block">৳{totalSuppliersOutstandingDue.toLocaleString()}</span>
            <span className="text-[9px] font-mono text-slate-500 font-semibold block mt-0.5 truncate">
              {suppliers.length} Active Suppliers
            </span>
          </div>
        </div>

        {/* Metric Card 5 */}
        <div className="bg-white border border-slate-150 rounded-xl p-4 shadow-3xs hover:shadow-2xs transition-all duration-200 flex items-center gap-3">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-lg shrink-0">
            <Coins className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="block text-[9px] uppercase text-slate-400 font-bold tracking-wider truncate">Conveyance net Due</span>
            <span className="text-base font-black text-[#311b92] leading-tight block">৳{conveyanceStats.netOutstandingDue.toLocaleString()}</span>
            <span className="text-[9px] font-mono text-purple-700 font-bold block mt-0.5 truncate">
              Due ৳{conveyanceStats.totalDue.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Metric Card 6 - Products Catalog */}
        <div className="bg-white border border-slate-150 rounded-xl p-4 shadow-3xs hover:shadow-2xs transition-all duration-200 flex items-center gap-3">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg shrink-0">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <span className="block text-[9px] uppercase text-slate-400 font-bold tracking-wider truncate">Product Items</span>
            <span className="text-base font-black text-slate-950 leading-tight block">{products.length} Products</span>
            <span className="text-[9px] font-mono text-indigo-700 font-semibold block mt-0.5 truncate">
              In Catalog Database
            </span>
          </div>
        </div>

        {/* Metric Card 7 - Corporate Banks */}
        <div className="bg-white border border-slate-150 rounded-xl p-4 shadow-3xs hover:shadow-2xs transition-all duration-200 flex items-center gap-3 col-span-1 md:col-span-2 xl:col-span-1">
          <div className="p-3 bg-sky-50 text-sky-600 rounded-lg shrink-0">
            <Landmark className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="block text-[9px] uppercase text-slate-400 font-bold tracking-wider truncate">Active Bank Accounts</span>
            <span className="text-base font-black text-slate-950 leading-tight block truncate">{banks.length} Accounts</span>
            <span className="text-[9.5px] font-mono text-sky-700 font-bold block mt-0.5 truncate" title={activeBankShortForms}>
              {activeBankShortForms || 'No banks setup'}
            </span>
          </div>
        </div>

        {/* Metric Card 8 - Outstanding Manual Bills */}
        <div className="bg-white border border-slate-150 rounded-xl p-4 shadow-3xs hover:shadow-2xs transition-all duration-200 flex items-center gap-3 col-span-2">
          <div className="p-3 bg-rose-50 text-rose-600 rounded-lg shrink-0">
            <ClipboardList className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="block text-[9px] uppercase text-slate-400 font-bold tracking-wider truncate">Outstanding Client Bills</span>
            <span className="text-base font-black text-rose-700 leading-tight block">
              {manualBills.filter(b => b.paymentStatus !== 'Paid').length} Unpaid Bill(s)
            </span>
            <span className="text-[9.5px] font-mono text-rose-600 font-extrabold block mt-0.5 truncate">
              Receivable Balance: ${manualInvoicesTotal.toLocaleString(undefined, { maximumFractionDigits: 1 })}
            </span>
          </div>
        </div>

      </div>

      {/* Visual Analytics Segment */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Core Financial Comparison & Analytics */}
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-3xs space-y-4 lg:col-span-2">
          <div className="flex justify-between items-center border-b border-slate-100 pb-2">
            <h3 className="text-xs font-black uppercase text-slate-805 tracking-wider flex items-center gap-2">
              <span>Historical Booking Revenue trend</span>
            </h3>
            <span className="text-[10px] bg-emerald-50 text-emerald-800 font-bold px-2 py-0.5 rounded font-mono">USD $</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-1">
            {/* Visual Progress/Comparison chart of Order book and invoiced balance */}
            <div className="space-y-4 md:col-span-1 border-r border-slate-100 pr-4 text-left">
              <div>
                <div className="flex justify-between text-[11px] font-bold text-slate-700 mb-1">
                  <span>Active Bookings</span>
                  <span>${totalBookingsValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
                  <div className="bg-blue-600 h-full rounded-full transition-all duration-500" style={{ width: '100%' }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] font-bold text-slate-700 mb-1">
                  <span>Proforma Invoiced</span>
                  <span>${totalInvoicedValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
                  <div 
                    className="bg-emerald-600 h-full rounded-full transition-all duration-500" 
                    style={{ width: `${totalBookingsValue > 0 ? (totalInvoicedValue / totalBookingsValue) * 100 : 0}%` }}
                  ></div>
                </div>
                <span className="text-[9px] text-slate-400 font-bold mt-1 block">
                  {totalBookingsValue > 0 ? Math.round((totalInvoicedValue / totalBookingsValue) * 100) : 0}% ratio raised.
                </span>
              </div>

              {/* Dynamic decorative trend bars - Now custom interactive SVG Mini Trends Chart mirroring live values */}
              <div className="border border-slate-150 rounded-lg p-2.5 bg-slate-50 relative flex flex-col justify-between h-[100px] overflow-hidden">
                <span className="text-[8.5px] uppercase font-black text-slate-400 tracking-wide">Registry Liquidity Meter</span>
                <div className="flex items-end justify-between gap-1 h-10 w-full">
                  <div className="bg-blue-400 rounded-t w-full" style={{ height: `${Math.min(100, bookings.length * 4 + 15)}%` }} title="Total Bookings"></div>
                  <div className="bg-emerald-400 rounded-t w-full" style={{ height: `${Math.min(100, activePisCount * 6 + 20)}%` }} title="PIs Raised"></div>
                  <div className="bg-amber-400 rounded-t w-full" style={{ height: `${Math.min(100, challans.length * 6 + 15)}%` }} title="Dispatches"></div>
                  <div className="bg-rose-450 rounded-t w-full" style={{ height: `${Math.min(100, (manualBills.length * 10) + 10)}%` }} title="Direct bills"></div>
                </div>
                <div className="grid grid-cols-4 gap-0.5 text-center font-mono text-[6.5px] text-slate-400 mt-1 border-t border-slate-200/40 pt-1">
                  <span>BK</span>
                  <span>PI</span>
                  <span>CH</span>
                  <span>BL</span>
                </div>
              </div>
            </div>

            {/* Custom Dynamic SVG Area Chart plotting the recent bookings values */}
            <div className="md:col-span-2 flex flex-col justify-between">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] font-bold text-slate-505">6-Month Booking Value Pipeline</span>
                <span className="text-[9px] text-slate-400 italic">Dynamic aggregate graph (USD)</span>
              </div>
              
              <div className="relative flex-1 bg-white border border-slate-150 rounded-xl p-2 min-h-[160px] flex items-center justify-center">
                {bookings.length === 0 ? (
                  <span className="text-xs text-slate-404 select-none font-bold">No active booking history.</span>
                ) : (
                  <svg viewBox="0 0 500 150" className="w-full h-full">
                    <defs>
                      <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#2563eb" stopOpacity="0.25"/>
                        <stop offset="100%" stopColor="#2563eb" stopOpacity="0.0"/>
                      </linearGradient>
                    </defs>
                    
                    {/* Grid Lines */}
                    <line x1="30" y1="20" x2="470" y2="20" stroke="#f1f5f9" strokeWidth="1" />
                    <line x1="30" y1="60" x2="470" y2="60" stroke="#f1f5f9" strokeWidth="1" />
                    <line x1="30" y1="100" x2="470" y2="100" stroke="#f1f5f9" strokeWidth="1" />
                    <line x1="30" y1="120" x2="470" y2="120" stroke="#cbd5e1" strokeWidth="1.5" />

                    {/* Area path */}
                    {bookingGraphPoints.areaPath && (
                      <path d={bookingGraphPoints.areaPath} fill="url(#chartGradient)" />
                    )}

                    {/* Trend Line */}
                    {bookingGraphPoints.linePath && (
                      <path d={bookingGraphPoints.linePath} fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    )}

                    {/* Interactive circles and labels */}
                    {bookingGraphPoints.points.map((pt, index) => (
                      <g key={index}>
                        <circle cx={pt.x} cy={pt.y} r="4" fill="#ffffff" stroke="#2563eb" strokeWidth="2" />
                        
                        {/* Hover Tooltip Value */}
                        <text x={pt.x} y={pt.y - 8} fontSize="7" fontWeight="900" textAnchor="middle" fill="#0f172a" className="font-mono">
                          ${pt.value > 1000 ? `${(pt.value / 1000).toFixed(1)}k` : pt.value.toFixed(0)}
                        </text>

                        {/* Month label */}
                        <text x={pt.x} y="138" fontSize="8" fontWeight="bold" textAnchor="middle" fill="#64748b" className="font-sans">
                          {pt.label}
                        </text>
                      </g>
                    ))}
                  </svg>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Status Distribution and Category Split bento container */}
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-3xs space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-2">
            <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider">
              Product Categories Split
            </h3>
            <span className="text-[10px] text-slate-404 font-bold uppercase font-mono">Real-time</span>
          </div>

          <div className="space-y-3.5 pt-1 text-xs text-left">
            {productCategorySplit.length === 0 ? (
              <div className="p-6 text-center text-slate-455 font-bold text-xs">No accessories category record.</div>
            ) : (
              productCategorySplit.map((cat, idx) => {
                const colors = ['bg-indigo-600', 'bg-sky-500', 'bg-emerald-500', 'bg-amber-500'];
                const colCode = colors[idx] || 'bg-slate-400';
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between font-bold text-slate-655">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className={`w-2 h-2 rounded-full ${colCode}`}></span>
                        <span className="truncate">{cat.name} ({cat.percent}%)</span>
                      </div>
                      <span className="font-mono text-[10.5px] font-black">${cat.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                    </div>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <div className={`${colCode} h-full rounded-full`} style={{ width: `${cat.percent}%` }}></div>
                    </div>
                  </div>
                );
              })
            )}

            {/* Delivery progress simple meter right below */}
            <div className="border-t border-slate-100 pt-3 mt-3">
              <div className="flex justify-between items-center mb-1 text-[11px] font-bold text-slate-705">
                <span>Challan dispatches Rate</span>
                <span>{statusDistribution.delivered}% Sent</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden flex">
                <div className="bg-amber-400 h-full" style={{ width: `${statusDistribution.pending}%` }} title="Pending"></div>
                <div className="bg-emerald-500 h-full" style={{ width: `${statusDistribution.delivered}%` }} title="Delivered"></div>
              </div>
              <div className="flex justify-between text-[7.5px] font-black text-slate-400 mt-1 uppercase font-mono">
                <span>Pending ({pendingChallansCount})</span>
                <span>Delivered ({deliveredChallansCount})</span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Smart ERP Alerts & Ops Advisory Center */}
      <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-3xs space-y-4 print:hidden">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
          <AlertCircle className="w-4 h-4 text-emerald-650" />
          <h3 className="text-xs font-black uppercase text-slate-805 tracking-wider">
            System Operations checklist &amp; smart alert Advisor
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-1 text-left">
          {activeSystemAlerts.map((alert, index) => {
            let borderCls = 'border-slate-200 bg-slate-50/50';
            let titleCls = 'text-slate-800';
            let iconBox = 'bg-slate-100 text-slate-600';

            if (alert.type === 'danger') {
              borderCls = 'border-rose-154 bg-rose-50/30';
              titleCls = 'text-rose-900';
              iconBox = 'bg-rose-50 text-rose-600';
            } else if (alert.type === 'warning') {
              borderCls = 'border-amber-154 bg-amber-50/30';
              titleCls = 'text-amber-900';
              iconBox = 'bg-amber-50 text-amber-605';
            } else if (alert.type === 'success') {
              borderCls = 'border-emerald-154 bg-emerald-50/20';
              titleCls = 'text-emerald-950';
              iconBox = 'bg-emerald-50 text-emerald-600';
            } else if (alert.type === 'info') {
              borderCls = 'border-sky-154 bg-sky-50/30';
              titleCls = 'text-sky-900';
              iconBox = 'bg-sky-50 text-sky-600';
            }

            return (
              <div key={index} className={`border p-3.5 rounded-xl flex items-start gap-3 transition-all ${borderCls}`}>
                <div className={`p-2 rounded-lg shrink-0 ${iconBox}`}>
                  <AlertCircle className="w-4 h-4" />
                </div>
                <div className="text-left text-xs space-y-1">
                  <span className={`block font-extrabold uppercase text-[10px] tracking-tight leading-none ${titleCls}`}>
                    {alert.title}
                  </span>
                  <p className="text-slate-505 font-medium leading-relaxed text-[10.5px]">
                    {alert.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Workspace Interactive Bento Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Quick launcher Shortcuts Board */}
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-3xs space-y-4">
          <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2">
            <span>Corporate Quick Operations launcher</span>
          </h3>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <button
              onClick={() => onNavigate('booking-form')}
              className="p-3 text-left border border-slate-150 rounded-xl hover:border-slate-350 hover:bg-slate-50 transition-all flex flex-col justify-between h-[90px] select-none cursor-pointer"
            >
              <div className="p-1 px-2.5 bg-blue-50 text-blue-600 rounded-lg text-[9px] font-black w-fit uppercase">Add</div>
              <div>
                <span className="block font-black text-slate-800 text-[11px] uppercase tracking-dense">New Booking</span>
                <span className="block text-[8px] text-slate-450 mt-0.5">Register customer orders</span>
              </div>
            </button>

            <button
              onClick={() => onNavigate('invoice-bill')}
              className="p-3 text-left border border-slate-150 rounded-xl hover:border-slate-350 hover:bg-slate-50 transition-all flex flex-col justify-between h-[90px] select-none cursor-pointer"
            >
              <div className="p-1 px-2.5 bg-emerald-50 text-emerald-600 rounded-lg text-[9px] font-black w-fit uppercase font-sans">Issue</div>
              <div>
                <span className="block font-black text-slate-800 text-[11px] uppercase tracking-dense">Customer Bill</span>
                <span className="block text-[8px] text-slate-450 mt-0.5">Commercial bill generator</span>
              </div>
            </button>

            <button
              onClick={() => onNavigate('suppliers')}
              className="p-3 text-left border border-slate-150 rounded-xl hover:border-slate-350 hover:bg-slate-50 transition-all flex flex-col justify-between h-[90px] select-none cursor-pointer"
            >
              <div className="p-1 px-2 bg-rose-50 text-rose-600 rounded-lg text-[9px] font-black w-fit uppercase">Manage</div>
              <div>
                <span className="block font-black text-slate-800 text-[11px] uppercase tracking-dense">Suppliers Hub</span>
                <span className="block text-[8px] text-slate-450 mt-0.5">Supplier registry &amp; ledge</span>
              </div>
            </button>

            <button
              onClick={() => onNavigate('conveyance')}
              className="p-3 text-left border border-slate-150 rounded-xl hover:border-slate-350 hover:bg-slate-50 transition-all flex flex-col justify-between h-[90px] select-none cursor-pointer"
            >
              <div className="p-1 px-2 bg-purple-50 text-purple-650 rounded-lg text-[9px] font-black w-fit uppercase">Expense</div>
              <div>
                <span className="block font-black text-slate-800 text-[11px] uppercase tracking-dense">Conveyances</span>
                <span className="block text-[8px] text-slate-450 mt-0.5">Record office expenses</span>
              </div>
            </button>

            <button
              onClick={() => onNavigate('products-catalogue')}
              className="p-3 text-left border border-slate-150 rounded-xl hover:border-slate-350 hover:bg-slate-50 transition-all flex flex-col justify-between h-[90px] select-none cursor-pointer"
            >
              <div className="p-1 px-2 bg-indigo-50 text-indigo-650 rounded-lg text-[9px] font-black w-fit uppercase">Catalog</div>
              <div>
                <span className="block font-black text-slate-800 text-[11px] uppercase tracking-dense">Product Items</span>
                <span className="block text-[8px] text-slate-450 mt-0.5">Access active items list</span>
              </div>
            </button>

            <button
              onClick={() => onNavigate('banks')}
              className="p-3 text-left border border-slate-150 rounded-xl hover:border-slate-350 hover:bg-slate-50 transition-all flex flex-col justify-between h-[90px] select-none cursor-pointer"
            >
              <div className="p-1 px-2 bg-sky-50 text-sky-600 rounded-lg text-[9px] font-black w-fit uppercase">Setup</div>
              <div>
                <span className="block font-black text-slate-800 text-[11px] uppercase tracking-dense">Bank Setting</span>
                <span className="block text-[8px] text-slate-450 mt-0.5">Modify corporate accounts</span>
              </div>
            </button>
          </div>
        </div>

        {/* Priority Ongoing production bookings list section */}
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-3xs space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-2">
            <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider">
              Priority Work Orders List
            </h3>
            <button 
              onClick={() => onNavigate('bookings')} 
              className="text-[10px] text-emerald-700 hover:underline font-black uppercase tracking-wide cursor-pointer"
            >
              View All
            </button>
          </div>

          <div className="space-y-3.5 pt-1">
            {recentActiveBookings.length === 0 ? (
              <div className="p-6 text-center text-slate-400 font-bold text-xs">
                No active bookings in production pipeline.
              </div>
            ) : (
              recentActiveBookings.map((b) => {
                const totalValue = getBookingValue(b);
                const itemsCount = b.styleBreakdowns && b.styleBreakdowns.length > 0 
                  ? b.styleBreakdowns.length 
                  : (b.sizeWise ? b.sizes.length : 1);
                const bookingDate = b.createdAt ? new Date(b.createdAt).toLocaleDateString() : 'N/A';

                return (
                  <div key={b.id} className="flex justify-between items-start border-b border-slate-50 pb-2.5 last:border-0 last:pb-0">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-extrabold text-xs text-slate-900">PO: {b.poNumber}</span>
                        {b.styleNumber && (
                          <span className="text-[9px] font-mono font-bold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded uppercase">
                            Style: {b.styleNumber}
                          </span>
                        )}
                      </div>
                      <span className="block text-[10px] text-slate-500 font-extrabold mt-0.5 uppercase tracking-dense">
                        {b.factoryName} ({b.buyerName})
                      </span>
                      <span className="block text-[9px] text-slate-400 font-medium">
                        {b.itemName} | {itemsCount} spec(s) | Created: {bookingDate}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="block text-xs font-black text-slate-900">
                        ${totalValue.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                      </span>
                      <span className="block text-[8px] font-mono text-slate-450 uppercase">{b.ref || 'No Ref'}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Top active buyers listing */}
        <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-3xs space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-2">
            <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider">
              Top Buyers &amp; Brands
            </h3>
            <span className="text-[10px] text-slate-400 font-mono font-bold">Value Sorted</span>
          </div>

          <div className="space-y-4 pt-1 text-xs">
            {topBuyers.length === 0 ? (
              <div className="p-6 text-center text-slate-400 font-bold text-xs">No buyers record found.</div>
            ) : (
              topBuyers.map((buyer, idx) => (
                <div key={idx} className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-slate-100 border border-slate-200 rounded-lg flex items-center justify-center font-black text-xs text-slate-500 select-none">
                      #{idx + 1}
                    </div>
                    <div>
                      <span className="block font-extrabold text-slate-905">{buyer.name}</span>
                      <span className="block text-[8.5px] text-slate-450 uppercase tracking-dense">{buyer.count} dynamic bookings active</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="block font-black text-slate-900">${buyer.value.toLocaleString(undefined, { maximumFractionDigits: 1 })}</span>
                    <span className="block text-[8.5px] font-semibold text-emerald-700 font-sans">Corporate Brand</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
