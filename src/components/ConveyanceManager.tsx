import React, { useState, useMemo } from 'react';
import { ConveyanceEntry } from '../types';
import { 
  Plus, 
  Trash2, 
  Edit, 
  Calendar, 
  Search, 
  TrendingDown, 
  TrendingUp, 
  Coins, 
  Printer, 
  X,
  FileText
} from 'lucide-react';
import { COMPANY_PROFILE } from '../data';

interface ConveyanceManagerProps {
  conveyances: ConveyanceEntry[];
  onAddConveyance: (conveyance: Omit<ConveyanceEntry, 'id' | 'createdAt'>) => void;
  onUpdateConveyance: (conveyance: ConveyanceEntry) => void;
  onDeleteConveyance: (id: string) => void;
  sessionUser?: any;
  canEdit?: boolean;
}

export default function ConveyanceManager({
  conveyances,
  onAddConveyance,
  onUpdateConveyance,
  onDeleteConveyance,
  sessionUser,
  canEdit = true
}: ConveyanceManagerProps) {
  // Check authorization roles
  const isManagerOrAdmin = useMemo(() => {
    if (!sessionUser) return false;
    if (sessionUser.isMasterAdmin) return true;
    const designation = (sessionUser.designation || '').trim().toLowerCase();
    const role = (sessionUser.role || '').trim().toLowerCase();
    const authorizedRoles = [
      'manage',
      'manager',
      'assistant manager',
      'director',
      'managing director',
      'admin',
      'accounts',
      'owner',
      'proprietor'
    ];
    return authorizedRoles.includes(designation) || authorizedRoles.includes(role);
  }, [sessionUser]);

  // Normal user can only see their own records
  const visibleConveyances = useMemo(() => {
    if (isManagerOrAdmin) {
      return conveyances;
    }
    return conveyances.filter(c => {
      const emailMatch = c.createdBy && sessionUser?.email && c.createdBy.trim().toLowerCase() === sessionUser.email.trim().toLowerCase();
      const nameMatch = sessionUser?.name && c.employeeName.trim().toLowerCase() === sessionUser.name.trim().toLowerCase();
      const noCreatorFallback = !c.createdBy && sessionUser?.name && c.employeeName.trim().toLowerCase() === sessionUser.name.trim().toLowerCase();
      return emailMatch || nameMatch || noCreatorFallback;
    });
  }, [conveyances, isManagerOrAdmin, sessionUser]);

  // Navigation tabs
  const [activeSubTab, setActiveSubTab] = useState<'all' | 'report' | 'custom-sheet'>('all');
  
  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMonth, setFilterMonth] = useState<string>('ALL'); // '01'-'12' or 'ALL'
  const [filterYear, setFilterYear] = useState<string>('2026');
  const [filterEmployee, setFilterEmployee] = useState<string>('ALL');

  // Selected checkbox IDs for bulk actions
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Modal / Form state
  const [showModal, setShowModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<ConveyanceEntry | null>(null);

  // Form Fields
  const [empName, setEmpName] = useState('');
  const [convDate, setConvDate] = useState(() => new Date().toISOString().substring(0, 10));
  const [convAmount, setConvAmount] = useState('');
  const [convType, setConvType] = useState<'Due' | 'Joma'>('Due');
  const [convPurpose, setConvPurpose] = useState('');

  // Extract unique employee names for suggestion & filter
  const employeeNames = useMemo(() => {
    const namesSet = new Set<string>();
    visibleConveyances.forEach(c => {
      if (c.employeeName.trim()) {
        namesSet.add(c.employeeName.trim());
      }
    });
    return Array.from(namesSet).sort();
  }, [visibleConveyances]);

  // Overall calculations
  const summaryStats = useMemo(() => {
    let dueSum = 0;
    let jomaSum = 0;
    visibleConveyances.forEach(c => {
      if (c.type === 'Due') {
        dueSum += c.amount;
      } else {
        jomaSum += c.amount;
      }
    });
    return {
      totalDue: dueSum,
      totalJoma: jomaSum,
      balanceDue: Math.max(0, dueSum - jomaSum),
      balanceJoma: Math.max(0, jomaSum - dueSum)
    };
  }, [visibleConveyances]);

  // Handle Edit click
  const handleEditClick = (entry: ConveyanceEntry) => {
    setEditingEntry(entry);
    setEmpName(entry.employeeName);
    setConvDate(entry.date);
    setConvAmount(String(entry.amount));
    setConvType(entry.type);
    setConvPurpose(entry.purpose);
    setShowModal(true);
  };

  // Close and clear form
  const handleCloseModal = () => {
    setEditingEntry(null);
    setEmpName('');
    setConvDate(new Date().toISOString().substring(0, 10));
    setConvAmount('');
    setConvType('Due');
    setConvPurpose('');
    setShowModal(false);
  };

  const handleOpenNewModal = () => {
    if (!isManagerOrAdmin && sessionUser) {
      setEmpName(sessionUser.name || '');
    } else {
      setEmpName('');
    }
    setConvDate(new Date().toISOString().substring(0, 10));
    setConvAmount('');
    setConvType('Due');
    setConvPurpose('');
    setEditingEntry(null);
    setShowModal(true);
  };

  // Handle submit (Create or Update)
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!empName.trim() || !convAmount || !convPurpose.trim()) {
      alert("অনুগ্রহ করে সব তথ্য প্রদান করুন।");
      return;
    }

    const amountNum = parseFloat(convAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      alert("যথাযথ টাকার অংক প্রধান করুন।");
      return;
    }

    if (editingEntry) {
      onUpdateConveyance({
        ...editingEntry,
        employeeName: empName.trim(),
        date: convDate,
        amount: amountNum,
        type: convType,
        purpose: convPurpose.trim()
      });
    } else {
      onAddConveyance({
        employeeName: empName.trim(),
        date: convDate,
        amount: amountNum,
        type: convType,
        purpose: convPurpose.trim()
      });
    }

    handleCloseModal();
  };

  // Filtered List for Table
  const filteredConveyances = useMemo(() => {
    return visibleConveyances.filter(c => {
      // 1. Search Query (Employee Name or Purpose)
      const matchesSearch = 
        c.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.purpose.toLowerCase().includes(searchQuery.toLowerCase());
      
      // 2. Month Filter
      const entryMonth = c.date.substring(5, 7); // YYYY-MM-DD
      const matchesMonth = filterMonth === 'ALL' || entryMonth === filterMonth;

      // 3. Year Filter
      const entryYear = c.date.substring(0, 4);
      const matchesYear = filterYear === 'ALL' || entryYear === filterYear;

      // 4. Employee Filter
      const matchesEmployee = filterEmployee === 'ALL' || c.employeeName.trim() === filterEmployee;

      return matchesSearch && matchesMonth && matchesYear && matchesEmployee;
    }).sort((a,b) => b.date.localeCompare(a.date)); // Sort by date descending
  }, [visibleConveyances, searchQuery, filterMonth, filterYear, filterEmployee]);

  // Checkbox select helpers
  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleToggleAll = () => {
    if (selectedIds.size === filteredConveyances.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredConveyances.map(c => c.id)));
    }
  };

  const handleBulkDelete = () => {
    if (!confirm(`Are you sure you want to bulk-delete the ${selectedIds.size} selected conveyance entries? This is a permanent administrative overwrite.`)) {
      return;
    }
    selectedIds.forEach(id => {
      onDeleteConveyance(id);
    });
    setSelectedIds(new Set());
    alert("Bulk deletion completed successfully!");
  };

  const selectedConveyances = useMemo(() => {
    return visibleConveyances.filter(c => selectedIds.has(c.id)).sort((a,b) => b.date.localeCompare(a.date));
  }, [visibleConveyances, selectedIds]);

  const customReportData = useMemo(() => {
    const map: Record<string, { due: number; joma: number; count: number }> = {};
    selectedConveyances.forEach(c => {
      const name = c.employeeName.trim();
      if (!map[name]) {
        map[name] = { due: 0, joma: 0, count: 0 };
      }
      if (c.type === 'Due') {
        map[name].due += c.amount;
      } else {
        map[name].joma += c.amount;
      }
      map[name].count += 1;
    });
    return Object.keys(map).map(name => {
      const due = map[name].due;
      const joma = map[name].joma;
      return {
        name,
        totalDue: due,
        totalJoma: joma,
        balance: due - joma,
        count: map[name].count
      };
    });
  }, [selectedConveyances]);

  // Report Specific Calc: group by Name for summary
  const reportData = useMemo(() => {
    const map: Record<string, { due: number; joma: number; count: number }> = {};
    
    // Only perform summary on entries matching chosen month, year & employee!
    visibleConveyances.forEach(c => {
      const entryMonth = c.date.substring(5, 7);
      const entryYear = c.date.substring(0, 4);
      
      const matchesMonth = filterMonth === 'ALL' || entryMonth === filterMonth;
      const matchesYear = filterYear === 'ALL' || entryYear === filterYear;
      const matchesEmployee = filterEmployee === 'ALL' || c.employeeName.trim().toLowerCase() === filterEmployee.trim().toLowerCase();
      
      if (matchesMonth && matchesYear && matchesEmployee) {
        const name = c.employeeName.trim();
        if (!map[name]) {
          map[name] = { due: 0, joma: 0, count: 0 };
        }
        if (c.type === 'Due') {
          map[name].due += c.amount;
        } else {
          map[name].joma += c.amount;
        }
        map[name].count += 1;
      }
    });

    return Object.keys(map).map(name => {
      const due = map[name].due;
      const joma = map[name].joma;
      return {
        name,
        totalDue: due,
        totalJoma: joma,
        balance: due - joma, // Positive means employee spent more (Due/পাওনা), negative means employee has advance cash (Joma)
        count: map[name].count
      };
    });
  }, [visibleConveyances, filterMonth, filterYear, filterEmployee]);

  // Print friendly command using high-fidelity window rendering fallback method
  const triggerPrintReport = () => {
    const element = document.getElementById('conveyance-statement-print');
    if (!element) return;

    // Capture system stylesheets to style cloned content element
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
          font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        }
        @media print {
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            background-color: #ffffff !important;
          }
          #conveyance-statement-print {
            position: relative !important;
            width: 100% !important;
            max-width: 100% !important;
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

    const printWindow = window.open('', '_blank', 'width=1000,height=800');
    if (!printWindow) {
      // Direct window fallback in case popups are blocked inside sandbox environments
      window.focus();
      window.print();
      return;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>Office Conveyance Statement - ${filterMonth}/${filterYear}</title>
          <base href="${window.location.origin}/" />
          ${styleLinks}
          ${customStyles}
        </head>
        <body class="bg-white">
          <div class="w-full flex justify-center p-6">
            <div class="w-full max-w-4xl">
              ${element.outerHTML}
            </div>
          </div>
          <script>
            function doPrint() {
              window.focus();
              window.print();
              setTimeout(() => { window.close(); }, 1200);
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

  const triggerPrintCustomReport = () => {
    const element = document.getElementById('conveyance-custom-statement-print');
    if (!element) return;

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
          font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
        }
        @media print {
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            background-color: #ffffff !important;
          }
          #conveyance-custom-statement-print {
            position: relative !important;
            width: 100% !important;
            max-width: 100% !important;
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

    const printWindow = window.open('', '_blank', 'width=1000,height=800');
    if (!printWindow) {
      window.focus();
      window.print();
      return;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>Custom Selected Conveyance Statement</title>
          <base href="${window.location.origin}/" />
          ${styleLinks}
          ${customStyles}
        </head>
        <body class="bg-white">
          <div class="w-full flex justify-center p-6">
            <div class="w-full max-w-4xl">
              ${element.outerHTML}
            </div>
          </div>
          <script>
            function doPrint() {
              window.focus();
              window.print();
              setTimeout(() => { window.close(); }, 1200);
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

  return (
    <div className="space-y-6">
      {/* Upper Tab Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-4">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900 tracking-tight flex items-center gap-1.5 leading-none">
            💼 অফিস কনভেন্স হাব (Office Conveyance Ledger)
          </h2>
          <p className="text-xs text-slate-500 mt-1">অফিসের কর্মকর্তা ও কর্মচারীদের যাতায়াত ও বিবিধ খরচ (Due / Joma) এন্ট্রি এবং মাসিক ব্যালেন্স রিপোর্ট শিট।</p>
        </div>

        <div className="flex items-center gap-2">
          {/* Sub Navigation */}
          <div className="flex p-0.5 bg-slate-100 rounded-lg border border-slate-200">
            <button
              onClick={() => setActiveSubTab('all')}
              className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                activeSubTab === 'all' 
                  ? 'bg-white text-slate-900 shadow-xs' 
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              রেকর্ড সমূহ (Entries)
            </button>
            {isManagerOrAdmin && (
              <button
                onClick={() => setActiveSubTab('report')}
                className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                  activeSubTab === 'report' 
                    ? 'bg-white text-slate-900 shadow-xs' 
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                মাসিক রিপোর্ট (Monthly Report)
              </button>
            )}
          </div>

          {canEdit && (
            <button
              onClick={handleOpenNewModal}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-xs uppercase tracking-wider"
            >
              <Plus className="w-3.5 h-3.5" /> নতুন কনভেন্স এন্ট্রি
            </button>
          )}
        </div>
      </div>

      {/* Visual Analytics Counter Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 print:hidden">
        {/* Card 1: Total Due */}
        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs flex items-center gap-3">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
            <TrendingDown className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-[9.5px] uppercase font-bold tracking-wider text-slate-400">মোট কনভেন্স খরচ (Due)</span>
            <span className="text-lg font-black text-neutral-900 leading-none">৳{summaryStats.totalDue.toLocaleString()}</span>
            <span className="block text-[9px] text-slate-500 mt-0.5 font-medium">অফিসের মোট দাবিদাওয়া</span>
          </div>
        </div>

        {/* Card 2: Total Joma */}
        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs flex items-center gap-3">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-[9.5px] uppercase font-bold tracking-wider text-slate-400">মোট পরিশোধ (Joma)</span>
            <span className="text-lg font-black text-neutral-900 leading-none">৳{summaryStats.totalJoma.toLocaleString()}</span>
            <span className="block text-[9px] text-slate-500 mt-0.5 font-medium">কর্মচারীকে মোট প্রদানকৃত টাকা</span>
          </div>
        </div>

        {/* Card 3: Net Outstanding Balance Due */}
        <div className="bg-white border-2 border-dashed border-rose-200/80 p-4 rounded-xl bg-rose-50/20 flex items-center gap-3">
          <div className="p-3 bg-rose-50 text-rose-600 rounded-lg">
            <Coins className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-[9.5px] uppercase font-bold tracking-wider text-rose-800">নেট বকেয়া কনভেন্স (Due)</span>
            <span className="text-lg font-black text-rose-950 leading-none">৳{summaryStats.balanceDue.toLocaleString()}</span>
            <span className="block text-[9px] text-rose-700 mt-0.5 font-medium">অফিসের বকেয়া রিইমবার্সমেন্ট</span>
          </div>
        </div>

        {/* Card 4: Advance Cash Joma */}
        <div className="bg-white border border-amber-200 p-4 rounded-xl bg-amber-50/20 flex items-center gap-3">
          <div className="p-3 bg-amber-100 text-amber-700 rounded-lg">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <span className="block text-[9.5px] uppercase font-bold tracking-wider text-amber-800">মোট অগ্রিম বরাদ্দ (Joma)</span>
            <span className="text-lg font-black text-amber-950 leading-none">৳{summaryStats.balanceJoma.toLocaleString()}</span>
            <span className="block text-[9px] text-amber-700 mt-0.5 font-medium">কর্মচারীদের অগ্রিম জমার ব্যালেন্স</span>
          </div>
        </div>
      </div>

      {/* Main Workspace based on Sub Tabs Selection */}
      {activeSubTab === 'all' ? (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs print:hidden">
          {/* Filtering Header Toolbar */}
          <div className="p-4 bg-slate-50 border-b border-gray-150 flex flex-col md:flex-row md:items-center justify-between gap-3.5">
            {/* Search Input */}
            <div className="relative flex-1 group max-w-md">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400 group-hover:text-slate-650 transition-colors" />
              <input
                type="text"
                placeholder="কর্মচারীর নাম অথবা উদ্দেশ্য দিয়ে খুঁজুন..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white text-xs text-neutral-850 pl-9 pr-4 py-2 rounded-lg border border-slate-250 focus:ring-1 focus:ring-slate-400 focus:border-slate-400 outline-none hover:border-slate-300 transition-colors placeholder:text-slate-400 placeholder:font-medium font-sans font-semibold"
              />
            </div>

            {/* Dropdown Filters */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Employee Filter */}
              {isManagerOrAdmin && (
                <div className="flex items-center gap-1 text-xs">
                  <span className="text-slate-500 font-bold whitespace-nowrap">কর্মচারী:</span>
                  <select
                    value={filterEmployee}
                    onChange={(e) => setFilterEmployee(e.target.value)}
                    className="bg-white border border-slate-250 py-1.5 px-2.5 rounded-lg text-xs font-bold outline-none text-neutral-850"
                  >
                    <option value="ALL">সকল কর্মচারী </option>
                    {employeeNames.map(name => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Month Selector */}
              <div className="flex items-center gap-1 text-xs">
                <span className="text-slate-500 font-bold whitespace-nowrap">মাস:</span>
                <select
                  value={filterMonth}
                  onChange={(e) => setFilterMonth(e.target.value)}
                  className="bg-white border border-slate-250 py-1.5 px-2.5 rounded-lg text-xs font-bold outline-none text-neutral-850"
                >
                  <option value="ALL">সকল মাস</option>
                  <option value="01">জানুয়ারি (January)</option>
                  <option value="02">ফেব্রুয়ারি (February)</option>
                  <option value="03">মার্চ (March)</option>
                  <option value="04">এপ্রিল (April)</option>
                  <option value="05">মে (May)</option>
                  <option value="06">জুন (June)</option>
                  <option value="07">জুলাই (July)</option>
                  <option value="08">আগস্ট (August)</option>
                  <option value="09">সেপ্টেম্বর (September)</option>
                  <option value="10">অক্টোবর (October)</option>
                  <option value="11">নভেম্বর (November)</option>
                  <option value="12">ডিসেম্বর (December)</option>
                </select>
              </div>

              {/* Year Selector */}
              <div className="flex items-center gap-1 text-xs">
                <span className="text-slate-500 font-bold whitespace-nowrap">বছর:</span>
                <select
                  value={filterYear}
                  onChange={(e) => setFilterYear(e.target.value)}
                  className="bg-white border border-slate-250 py-1.5 px-2.5 rounded-lg text-xs font-bold outline-none text-neutral-850"
                >
                  <option value="2026">২০২৬ (2026)</option>
                  <option value="2027">২০২৭ (2027)</option>
                  <option value="2025">২০২৫ (2025)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Table records */}
          {/* Bulk actions selection panel */}
          {selectedIds.size > 0 && (
            <div className="bg-emerald-50 border border-emerald-200 p-3 px-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 animate-fade-in shadow-xs print:hidden m-4">
              <div className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                <span className="flex items-center justify-center w-5 h-5 bg-emerald-600 text-white rounded-full text-[10px] font-black">{selectedIds.size}</span>
                <span>রেকর্ড নির্বাচিত হয়েছে (Selected Entries)</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveSubTab('custom-sheet')}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-black flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
                >
                  <FileText className="w-3.5 h-3.5" /> নির্বাচিত শিট তৈরি করুন (Prepare Sheet)
                </button>
                {canEdit && (
                  <button
                    type="button"
                    onClick={handleBulkDelete}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-black flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> একসাথে ডিলিট (Bulk Delete)
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedIds(new Set())}
                  className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-bold cursor-pointer transition-all"
                >
                  Clear Selection
                </button>
              </div>
            </div>
          )}

          {filteredConveyances.length === 0 ? (
            <div className="py-14 text-center text-slate-400 text-xs font-sans">
              <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              কোন কনভেন্স রেকর্ড পাওয়া যায়নি।
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] text-slate-400 uppercase font-black tracking-widest font-sans">
                    <th className="py-3 px-4 w-12 text-center">
                      <input
                        type="checkbox"
                        checked={filteredConveyances.length > 0 && selectedIds.size === filteredConveyances.length}
                        onChange={handleToggleAll}
                        className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                      />
                    </th>
                    <th className="py-3 px-4">তারিখ (Date)</th>
                    <th className="py-3 px-4">কর্মচারীর নাম (Name)</th>
                    <th className="py-3 px-4">উদ্দেশ্য / বিবরণ (Purpose)</th>
                    <th className="py-3 px-4">টাইপ (Type)</th>
                    <th className="py-3 px-4 text-right">টাকা (Amount)</th>
                    <th className="py-3 px-4 text-center">অ্যাকশন (Actions)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-150 text-slate-700 font-medium font-sans">
                  {filteredConveyances.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(c.id)}
                          onChange={() => handleToggleSelect(c.id)}
                          className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                        />
                      </td>
                      <td className="py-3 px-4 font-mono font-bold whitespace-nowrap">{c.date}</td>
                      <td className="py-3 px-4 font-bold text-slate-900">{c.employeeName}</td>
                      <td className="py-3 px-4 font-semibold text-slate-650 max-w-sm truncate" title={c.purpose}>
                        {c.purpose}
                      </td>
                      <td className="py-3 px-4">
                        {c.type === 'Due' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black uppercase text-indigo-700 bg-indigo-50 border border-indigo-100">
                            Due বকেয়া খরচ
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black uppercase text-emerald-700 bg-emerald-50 border border-emerald-100">
                            Joma জমা সমন্বয়
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        ৳{c.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {canEdit && (
                            <>
                              <button
                                onClick={() => handleEditClick(c)}
                                className="bg-white text-slate-500 hover:text-indigo-600 p-1 rounded border border-slate-200 hover:bg-slate-50 cursor-pointer"
                                title="Edit Record"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm("এই কনভেন্স রেকর্ডটি ডিলিট করতে চান? অল রেজার্ভড ফাইল আপডেট হবে।")) {
                                    onDeleteConveyance(c.id);
                                  }
                                }}
                                className="bg-white text-slate-500 hover:text-rose-600 p-1 rounded border border-slate-200 hover:bg-slate-50 cursor-pointer"
                                title="Delete Record"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : activeSubTab === 'custom-sheet' ? (
        /* PRINT FRIENDLY RENDER: Custom Selected Conveyance Statement */
        <div className="space-y-6">
          {/* Sub Toolbar */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between print:hidden">
            <button
              onClick={() => { setActiveSubTab('all'); setSelectedIds(new Set()); }}
              className="px-3.5 py-1.5 bg-slate-150 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold cursor-pointer transition-colors inline-flex items-center gap-1.5"
            >
              &larr; রেকর্ড তালিকায় ফিরে যান (Back to Entries)
            </button>
            
            <button
              onClick={triggerPrintCustomReport}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-neutral-900 hover:bg-neutral-950 text-white rounded-lg text-xs font-bold uppercase tracking-wider cursor-pointer shadow-sm ml-2"
            >
              <Printer className="w-4 h-4" /> প্রিন্ট / PDF ডাউনলোড (Print Sheet)
            </button>
          </div>

          {/* Elegant Statement Document for Custom Sheet */}
          <div id="conveyance-custom-statement-print" className="bg-white border border-slate-300 shadow-sm p-6 sm:p-10 rounded-xl font-sans text-xs text-slate-800 space-y-8 select-all max-w-4xl mx-auto print:border-none print:shadow-none print:-m-6">
            
            {/* Report Header Logo Section */}
            <div className="flex justify-between items-start border-b-2 border-slate-800 pb-5">
              <div>
                <h1 className="text-xl font-extrabold uppercase tracking-tight text-neutral-950 font-mono">{COMPANY_PROFILE.name}</h1>
                <p className="text-[10px] text-slate-500 font-medium leading-normal mt-0.5">{COMPANY_PROFILE.addresses.office}</p>
                <p className="text-[9.5px] text-slate-500 font-mono mt-0.5">Cell: {COMPANY_PROFILE.phones[0]} • Email: {COMPANY_PROFILE.emails[0]}</p>
              </div>
              <div className="text-right">
                <span className="inline-block px-3 py-1 bg-neutral-100 uppercase tracking-widest text-[9.5px] font-black border border-neutral-300">
                  Custom Conveyance Statement
                </span>
                <p className="text-[10px] text-slate-500 font-medium font-mono mt-2">
                  Statement Date: <strong className="text-neutral-900">{new Date().toLocaleDateString('eb-GB', {year: 'numeric', month: 'short', day: 'numeric'})}</strong>
                </p>
                <p className="text-[10px] text-slate-650 font-bold mt-1">
                  Selected Period: <strong className="text-indigo-900 uppercase">
                    Custom Selection ({selectedConveyances.length} Entries)
                  </strong>
                </p>
              </div>
            </div>

            {/* Document Title bar */}
            <div className="text-center bg-slate-50 p-3 rounded-lg border border-slate-200">
              <h3 className="text-xs uppercase font-black tracking-widest text-slate-800 font-sans">
                কর্মকর্তা ও কর্মচারীদের অফিসিয়াল যাতায়াত বিল বিবরণী (Custom Selected Statement)
              </h3>
            </div>

            {/* Employee ledger balances summary table */}
            <div className="space-y-2">
              <h4 className="text-[10.5px] font-bold text-slate-900 border-l-2 border-indigo-600 pl-2">
                কর্মচারী ভিত্তিক সংক্ষিপ্ত সারাংশ (Employeewise Outstanding Overview)
              </h4>
              {customReportData.length === 0 ? (
                <p className="text-xs text-slate-400 py-3 text-center">কোন নির্বাচিত রেকর্ড পাওয়া যায়নি।</p>
              ) : (
                <table className="w-full text-xs text-left border-collapse border border-slate-300">
                  <thead>
                    <tr className="bg-slate-100 text-[10px] uppercase font-black text-slate-700 tracking-wider">
                      <th className="p-2 border border-slate-300">কর্মচারীর নাম (Employee Name)</th>
                      <th className="p-2 border border-slate-300 text-center">এন্ট্রি সংখ্যা</th>
                      <th className="p-2 border border-slate-300 text-right">মোট খরচ (Due/Spent)</th>
                      <th className="p-2 border border-slate-300 text-right">মোট সমন্বয় (Joma/Paid)</th>
                      <th className="p-2 border border-slate-300 text-right">অবশিষ্ট ব্যালেন্স (Outstanding)</th>
                    </tr>
                  </thead>
                  <tbody className="font-semibold text-slate-800">
                    {customReportData.map((row, idx) => {
                      const isDue = row.balance > 0;
                      const isZero = row.balance === 0;
                      return (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="p-2 border border-slate-300 font-bold text-slate-950">{row.name}</td>
                          <td className="p-2 border border-slate-300 text-center font-mono">{row.count}</td>
                          <td className="p-2 border border-slate-300 text-right font-mono">৳{row.totalDue.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                          <td className="p-2 border border-slate-300 text-right font-mono">৳{row.totalJoma.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                          <td className="p-2 border border-slate-300 text-right font-mono">
                            {isZero ? (
                              <span className="text-slate-500">পরিশোধিত/সমান</span>
                            ) : isDue ? (
                              <span className="text-rose-700 font-bold">৳{row.balance.toLocaleString(undefined, {minimumFractionDigits: 2})} (বকেয়া)</span>
                            ) : (
                              <span className="text-emerald-700 font-bold">৳{Math.abs(row.balance).toLocaleString(undefined, {minimumFractionDigits: 2})} (জমা অগ্রিম)</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                    {/* Totals Summary */}
                    <tr className="bg-slate-50 font-black text-neutral-950">
                      <td className="p-2 border border-slate-300 text-right font-black" colSpan={2}>সর্বমোট (Grand Total):</td>
                      <td className="p-2 border border-slate-300 text-right font-mono">
                        ৳{customReportData.reduce((acc, r) => acc + r.totalDue, 0).toLocaleString(undefined, {minimumFractionDigits: 2})}
                      </td>
                      <td className="p-2 border border-slate-300 text-right font-mono">
                        ৳{customReportData.reduce((acc, r) => acc + r.totalJoma, 0).toLocaleString(undefined, {minimumFractionDigits: 2})}
                      </td>
                      <td className="p-2 border border-slate-300 text-right font-mono">
                        {(() => {
                          const netBalance = customReportData.reduce((acc, r) => acc + r.balance, 0);
                          return netBalance === 0 ? (
                            <span>৳০.০০</span>
                          ) : netBalance > 0 ? (
                            <span className="text-rose-750">৳{netBalance.toLocaleString(undefined, {minimumFractionDigits: 2})} (মোট পেতে হবে)</span>
                          ) : (
                            <span className="text-emerald-700">৳{Math.abs(netBalance).toLocaleString(undefined, {minimumFractionDigits: 2})} (মোট অগ্রিম জমার পরিমাণ)</span>
                          );
                        })()}
                      </td>
                    </tr>
                  </tbody>
                </table>
              )}
            </div>

            {/* Individual Records breakdown list */}
            <div className="space-y-4 pt-4 border-t border-slate-200">
              <h4 className="text-[10.5px] font-bold text-slate-900 border-l-2 border-indigo-600 pl-2">
                বিস্তারিত লেনদেন তালিকা (Detailed Transactions Breakdown)
              </h4>
              <table className="w-full text-[11px] text-left border-collapse border border-slate-250">
                <thead>
                  <tr className="bg-slate-50 text-[9.5px] uppercase font-black text-slate-700 border-b border-slate-250">
                    <th className="p-2 border border-slate-250">তারিখ (Date)</th>
                    <th className="p-2 border border-slate-250">কর্মচারী (Employee Name)</th>
                    <th className="p-2 border border-slate-250">বিবরণ / উদ্দেশ্য (Remarks/Purpose)</th>
                    <th className="p-2 border border-slate-250">টাইপ (Type)</th>
                    <th className="p-2 border border-slate-250 text-right">যার মূল্য (Amount)</th>
                  </tr>
                </thead>
                <tbody className="font-semibold text-slate-700">
                  {selectedConveyances.map((c, i) => (
                    <tr key={c.id || i} className="border-b border-slate-200">
                      <td className="p-2 border border-slate-250 font-mono font-bold whitespace-nowrap">{c.date}</td>
                      <td className="p-2 border border-slate-250 font-bold text-slate-950">{c.employeeName}</td>
                      <td className="p-2 border border-slate-250 leading-relaxed max-w-xs break-words">{c.purpose}</td>
                      <td className="p-2 border border-slate-250 font-bold">
                        {c.type === 'Due' ? 'Due খরচ' : 'Joma ক্যাশ'}
                      </td>
                      <td className="p-2 border border-slate-250 text-right font-mono font-black text-slate-950">
                        ৳{c.amount.toLocaleString(undefined, {minimumFractionDigits: 2})}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Signatures */}
            <div className="pt-24 grid grid-cols-3 gap-8 text-center text-[10px] font-black uppercase text-slate-650 tracking-wider">
              <div>
                <div className="border-t border-slate-400 pt-1.5 w-40 mx-auto">Prepared By</div>
                <p className="text-[9px] text-slate-400 font-semibold normal-case mt-1">Accounts signature</p>
              </div>
              <div>
                <div className="border-t border-slate-400 pt-1.5 w-40 mx-auto">Verified By</div>
                <p className="text-[9px] text-slate-400 font-semibold normal-case mt-1">Audit office check</p>
              </div>
              <div>
                <div className="border-t border-slate-400 pt-1.5 w-40 mx-auto">Manager / MD Approval</div>
                <p className="text-[9px] text-slate-400 font-semibold normal-case mt-1">Authorised executive</p>
              </div>
            </div>

            {/* Policy Notes footer */}
            <div className="pt-8 border-t border-slate-200/80 text-[8.5px] leading-relaxed text-slate-400 text-center font-medium">
              * This conveyance summary statement is automatically compiled from Acoola Trims ERP internal ledgers. Standard approval verification is mandatory before final settlement.
            </div>
          </div>
        </div>
      ) : (
        /* PRINT FRIENDLY RENDER: Monthly Conveyance Statement */
        <div className="space-y-6">
          {/* Sub Toolbar */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-wrap items-center justify-between gap-4 print:hidden">
            <div className="text-xs text-slate-650 font-bold flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span>👤 কর্মচারী (Employee Name):</span>
                <select
                  value={filterEmployee}
                  onChange={(e) => setFilterEmployee(e.target.value)}
                  className="bg-white border border-slate-250 py-1.5 px-2.5 rounded-lg text-xs font-bold outline-none text-neutral-850 cursor-pointer"
                >
                  <option value="ALL">সকল কর্মচারী (All Employees)</option>
                  {employeeNames.map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <span>📅 মাস ও বছর:</span>
                <select
                  value={filterMonth}
                  onChange={(e) => setFilterMonth(e.target.value)}
                  className="bg-white border border-slate-250 py-1.5 px-2.5 rounded-lg text-xs font-bold outline-none text-neutral-850 cursor-pointer"
                >
                  <option value="ALL">সকল মাস</option>
                  <option value="01">জানুয়ারি (January)</option>
                  <option value="02">ফেব্রুয়ারি (February)</option>
                  <option value="03">মার্চ (March)</option>
                  <option value="04">এপ্রিল (April)</option>
                  <option value="05">মে (May)</option>
                  <option value="06">জুন (June)</option>
                  <option value="07">জুলাই (July)</option>
                  <option value="08">আগস্ট (August)</option>
                  <option value="09">সেপ্টেম্বর (September)</option>
                  <option value="10">অক্টোবর (October)</option>
                  <option value="11">নভেম্বর (November)</option>
                  <option value="12">ডিসেম্বর (December)</option>
                </select>
                <select
                  value={filterYear}
                  onChange={(e) => setFilterYear(e.target.value)}
                  className="bg-white border border-slate-250 py-1.5 px-2.5 rounded-lg text-xs font-bold outline-none cursor-pointer text-neutral-850"
                >
                  <option value="2026">2026</option>
                  <option value="2027">2027</option>
                  <option value="2025">2025</option>
                </select>
              </div>
            </div>
            
            <button
              onClick={triggerPrintReport}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-neutral-900 hover:bg-neutral-950 text-white rounded-lg text-xs font-bold uppercase tracking-wider cursor-pointer shadow-sm ml-2"
            >
              <Printer className="w-4 h-4" /> প্রিন্ট / PDF ডাউনলোড
            </button>
          </div>

          {/* Elegant Statement Document */}
          <div id="conveyance-statement-print" className="bg-white border border-slate-300 shadow-sm p-6 sm:p-10 rounded-xl font-sans text-xs text-slate-800 space-y-8 select-all max-w-4xl mx-auto print:border-none print:shadow-none print:-m-6">
            
            {/* Report Header Logo Section */}
            <div className="flex justify-between items-start border-b-2 border-slate-800 pb-5">
              <div>
                <h1 className="text-xl font-extrabold uppercase tracking-tight text-neutral-950 font-mono">{COMPANY_PROFILE.name}</h1>
                <p className="text-[10px] text-slate-500 font-medium leading-normal mt-0.5">{COMPANY_PROFILE.addresses.office}</p>
                <p className="text-[9.5px] text-slate-500 font-mono mt-0.5">Cell: {COMPANY_PROFILE.phones[0]} • Email: {COMPANY_PROFILE.emails[0]}</p>
              </div>
              <div className="text-right">
                <span className="inline-block px-3 py-1 bg-neutral-100 uppercase tracking-widest text-[9.5px] font-black border border-neutral-300">
                  Conveyance Statement
                </span>
                <p className="text-[10px] text-slate-500 font-medium font-mono mt-2">
                  Statement Date: <strong className="text-neutral-900">{new Date().toLocaleDateString('eb-GB', {year: 'numeric', month: 'short', day: 'numeric'})}</strong>
                </p>
                <p className="text-[10px] text-slate-650 font-bold mt-1">
                  Selected Period: <strong className="text-indigo-900 uppercase">
                    {filterMonth === 'ALL' ? 'ALL MONTHS' : `Month - ${filterMonth}`} ({filterYear})
                  </strong>
                </p>
                {filterEmployee !== 'ALL' && (
                  <p className="text-[10.5px] text-rose-700 font-bold mt-1">
                    Employee: <strong className="uppercase font-black text-rose-800">{filterEmployee}</strong>
                  </p>
                )}
              </div>
            </div>

            {/* Document Title bar */}
            <div className="text-center bg-slate-50 p-3 rounded-lg border border-slate-200">
              <h3 className="text-xs uppercase font-black tracking-widest text-slate-800 font-sans">
                কর্মকর্তা ও কর্মচারীদের অফিসিয়াল যাতায়াত বিল বিবরণী (মাসিক কনভেন্স স্টেটমেন্ট)
              </h3>
            </div>

            {/* Employee ledger balances summary table */}
            <div className="space-y-2">
              <h4 className="text-[10.5px] font-bold text-slate-900 border-l-2 border-indigo-600 pl-2">
                কর্মচারী ভিত্তিক সংক্ষিপ্ত সারাংশ (Employeewise Outstanding Overview)
              </h4>
              {reportData.length === 0 ? (
                <p className="text-xs text-slate-400 py-3 text-center">এই নির্বাচিত মেয়াদের মাঝে কোন রেকর্ড পাওয়া যায়নি।</p>
              ) : (
                <table className="w-full text-xs text-left border-collapse border border-slate-300">
                  <thead>
                    <tr className="bg-slate-100 text-[10px] uppercase font-black text-slate-700 tracking-wider">
                      <th className="p-2 border border-slate-300">কর্মচারীর নাম (Employee Name)</th>
                      <th className="p-2 border border-slate-300 text-center">এন্ট্রি সংখ্যা</th>
                      <th className="p-2 border border-slate-300 text-right">মোট খরচ (Due/Spent)</th>
                      <th className="p-2 border border-slate-300 text-right">মোট সমন্বয় (Joma/Paid)</th>
                      <th className="p-2 border border-slate-300 text-right">অবশিষ্ট ব্যালেন্স (Outstanding)</th>
                      {isManagerOrAdmin && <th className="p-2 border border-slate-300 text-center print:hidden">পৃথক শিট (Individual Sheet)</th>}
                    </tr>
                  </thead>
                  <tbody className="font-semibold text-slate-800">
                    {reportData.map((row, idx) => {
                      const isDue = row.balance > 0;
                      const isZero = row.balance === 0;
                      return (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="p-2 border border-slate-300 font-bold text-slate-950">{row.name}</td>
                          <td className="p-2 border border-slate-300 text-center font-mono">{row.count}</td>
                          <td className="p-2 border border-slate-300 text-right font-mono">৳{row.totalDue.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                          <td className="p-2 border border-slate-300 text-right font-mono">৳{row.totalJoma.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                          <td className="p-2 border border-slate-300 text-right font-mono">
                            {isZero ? (
                              <span className="text-slate-500">পরিশোধিত/সমান</span>
                            ) : isDue ? (
                              <span className="text-rose-700 font-bold">৳{row.balance.toLocaleString(undefined, {minimumFractionDigits: 2})} (বকেয়া)</span>
                            ) : (
                              <span className="text-emerald-700 font-bold">৳{Math.abs(row.balance).toLocaleString(undefined, {minimumFractionDigits: 2})} (জমা অগ্রিম)</span>
                            )}
                          </td>
                          {isManagerOrAdmin && (
                            <td className="p-2 border border-slate-300 text-center print:hidden">
                              <button
                                type="button"
                                onClick={() => {
                                  setFilterEmployee(row.name);
                                  setTimeout(() => {
                                    triggerPrintReport();
                                  }, 400);
                                }}
                                className="px-2.5 py-1 bg-indigo-600 text-white hover:bg-indigo-700 rounded text-[9px] font-black cursor-pointer transition-all"
                              >
                                Print Sheet
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                    {/* Totals Summary */}
                    <tr className="bg-slate-50 font-black text-neutral-950">
                      <td className="p-2 border border-slate-300 text-right font-black" colSpan={isManagerOrAdmin ? 3 : 2}>সর্বমোট (Grand Total):</td>
                      <td className="p-2 border border-slate-300 text-right font-mono">
                        ৳{reportData.reduce((acc, r) => acc + r.totalDue, 0).toLocaleString(undefined, {minimumFractionDigits: 2})}
                      </td>
                      <td className="p-2 border border-slate-300 text-right font-mono">
                        ৳{reportData.reduce((acc, r) => acc + r.totalJoma, 0).toLocaleString(undefined, {minimumFractionDigits: 2})}
                      </td>
                      <td className="p-2 border border-slate-300 text-right font-mono">
                        {(() => {
                          const netBalance = reportData.reduce((acc, r) => acc + r.balance, 0);
                          return netBalance === 0 ? (
                            <span>৳০.০০</span>
                          ) : netBalance > 0 ? (
                            <span className="text-rose-750">৳{netBalance.toLocaleString(undefined, {minimumFractionDigits: 2})} (মোট পেতে হবে)</span>
                          ) : (
                            <span className="text-emerald-700">৳{Math.abs(netBalance).toLocaleString(undefined, {minimumFractionDigits: 2})} (মোট অগ্রিম জমার পরিমাণ)</span>
                          );
                        })()}
                      </td>
                    </tr>
                  </tbody>
                </table>
              )}
            </div>

            {/* Individual Records breakdown list */}
            <div className="space-y-4 pt-4 border-t border-slate-200">
              <h4 className="text-[10.5px] font-bold text-slate-900 border-l-2 border-indigo-600 pl-2">
                বিস্তারিত লেনদেন তালিকা (Detailed Transactions Breakdown)
              </h4>
              <table className="w-full text-[11px] text-left border-collapse border border-slate-250">
                <thead>
                  <tr className="bg-slate-50 text-[9.5px] uppercase font-black text-slate-700 border-b border-slate-250">
                    <th className="p-2 border border-slate-250">তারিখ (Date)</th>
                    <th className="p-2 border border-slate-250">কর্মচারী (Employee Name)</th>
                    <th className="p-2 border border-slate-250">বিবরণ / উদ্দেশ্য (Remarks/Purpose)</th>
                    <th className="p-2 border border-slate-250">টাইপ (Type)</th>
                    <th className="p-2 border border-slate-250 text-right">যার মূল্য (Amount)</th>
                  </tr>
                </thead>
                <tbody className="font-semibold text-slate-700">
                  {filteredConveyances.map((c, i) => (
                    <tr key={c.id || i} className="border-b border-slate-200">
                      <td className="p-2 border border-slate-250 font-mono font-bold whitespace-nowrap">{c.date}</td>
                      <td className="p-2 border border-slate-250 font-bold text-slate-950">{c.employeeName}</td>
                      <td className="p-2 border border-slate-250 leading-relaxed max-w-xs break-words">{c.purpose}</td>
                      <td className="p-2 border border-slate-250 font-bold">
                        {c.type === 'Due' ? 'Due খরচ' : 'Joma ক্যাশ'}
                      </td>
                      <td className="p-2 border border-slate-250 text-right font-mono font-black text-slate-950">
                        ৳{c.amount.toLocaleString(undefined, {minimumFractionDigits: 2})}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Signatures */}
            <div className="pt-24 grid grid-cols-3 gap-8 text-center text-[10px] font-black uppercase text-slate-650 tracking-wider">
              <div>
                <div className="border-t border-slate-400 pt-1.5 w-40 mx-auto">Prepared By</div>
                <p className="text-[9px] text-slate-400 font-semibold normal-case mt-1">Accounts signature</p>
              </div>
              <div>
                <div className="border-t border-slate-400 pt-1.5 w-40 mx-auto">Verified By</div>
                <p className="text-[9px] text-slate-400 font-semibold normal-case mt-1">Audit office check</p>
              </div>
              <div>
                <div className="border-t border-slate-400 pt-1.5 w-40 mx-auto">Manager / MD Approval</div>
                <p className="text-[9px] text-slate-400 font-semibold normal-case mt-1">Authorised executive</p>
              </div>
            </div>

            {/* Policy Notes footer */}
            <div className="pt-8 border-t border-slate-200/80 text-[8.5px] leading-relaxed text-slate-400 text-center font-medium">
              * This conveyance summary statement is automatically compiled from Acoola Trims ERP internal ledgers. Standard approval verification is mandatory before final settlement.
            </div>
          </div>
        </div>
      )}

      {/* POPUP MODAL: Add & Edit Conveyance Entry Form */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <form 
            onSubmit={handleSubmit}
            className="bg-white border border-neutral-255 rounded-2xl max-w-md w-full shadow-2xl p-6 relative animate-scale-in my-10"
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={handleCloseModal}
              className="absolute top-4 right-4 p-1 rounded-full text-slate-400 hover:text-slate-650 hover:bg-slate-100 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-xs font-black uppercase text-neutral-950 tracking-wider border-b border-gray-150 pb-3 mb-4">
              {editingEntry ? '✏️ কনভেন্স এন্ট্রি এডিট করুন' : '📝 নতুন কনভেন্স এন্ট্রি যুক্ত করুন'}
            </h3>

            <div className="space-y-4">
              {/* Employee Name */}
              <div>
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">কর্মচারীর নাম (Employee Name) *</label>
                <input
                  type="text"
                  required
                  placeholder="যেমন: মোঃ সালিম, রিয়াদ, ইত্যাদি"
                  value={empName}
                  onChange={(e) => setEmpName(e.target.value)}
                  readOnly={!isManagerOrAdmin}
                  className={`w-full px-3 py-2 text-xs font-semibold border border-gray-300 rounded-lg outline-none focus:ring-1 focus:ring-indigo-500 ${!isManagerOrAdmin ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : ''}`}
                  list="employee-suggestions"
                />
                <datalist id="employee-suggestions">
                  {employeeNames.map(name => (
                    <option key={name} value={name} />
                  ))}
                </datalist>
                <p className="text-[9px] text-slate-400 mt-0.5">ড্রপডাউনে ইতিপূর্বে ব্যবহৃত নামগুলো চলে আসবে।</p>
              </div>

              {/* Date & Type */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">তারিখ (Date) *</label>
                  <input
                    type="date"
                    required
                    value={convDate}
                    onChange={(e) => setConvDate(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs font-semibold border border-gray-300 rounded-lg outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">এন্ট্রির ধরণ (Type) *</label>
                  <select
                    value={convType}
                    onChange={(e) => setConvType(e.target.value as 'Due' | 'Joma')}
                    className="w-full px-3 py-1.5 bg-white text-xs font-bold border border-gray-300 rounded-lg outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="Due">Due (বকেয়া খরচ)</option>
                    <option value="Joma">Joma (জমা / ক্যাশ রিসিভড)</option>
                  </select>
                </div>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">টাকার পরিমাণ (Amount BDT) *</label>
                <input
                  type="number"
                  step="any"
                  required
                  min="0.01"
                  placeholder="যেমন: ৫০০.০০"
                  value={convAmount}
                  onChange={(e) => setConvAmount(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono font-bold border border-gray-300 rounded-lg outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Purpose */}
              <div>
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1">যাতায়াত উদ্দেশ্য ও বিবরণ (Purpose/Description) *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="যেমন: ঢাকা থেকে চট্টগ্রাম ফ্যাক্টরি যাতায়াত ভাড়া (বাস ভাড়া ৫০০০/-)"
                  value={convPurpose}
                  onChange={(e) => setConvPurpose(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-semibold border border-gray-300 rounded-lg outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex justify-end gap-2.5 pt-4 border-t border-gray-150 mt-5">
              <button
                type="button"
                onClick={handleCloseModal}
                className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-bold text-slate-650 cursor-pointer transition-colors"
              >
                বাতিল করুন
              </button>
              <button
                type="submit"
                className="px-5 py-1.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-lg text-xs font-bold shadow-sm cursor-pointer transition-colors"
              >
                {editingEntry ? 'আপডেট করুন' : 'সংরক্ষণ করুন'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
