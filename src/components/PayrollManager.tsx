import React, { useState, useMemo } from 'react';
import { Employee, PayrollPeriod, PayrollItem } from '../types';
import { COMPANY_PROFILE } from '../data';
import Barcode from './Barcode';
import { Printer, Upload, CheckCircle2, ShieldAlert, BadgeInfo, ToggleLeft, ToggleRight, UserPlus, ClipboardList, Edit3, Trash2, ArrowRight, Download, Eye, FileSpreadsheet, Lock, RefreshCw, Layers } from 'lucide-react';

// Helper to convert BDT amounts to English Words
const amountToWordsBDT = (num: number) => {
  const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  
  const cleanNum = Math.floor(num);
  const paisa = Math.round((num - cleanNum) * 100);

  const toWords = (n: number): string => {
    if (n < 0) return '';
    if (n < 20) return a[n];
    if (n < 100) return b[Math.floor(n / 10)] + ' ' + a[n % 10];
    if (n < 1000) return a[Math.floor(n / 100)] + ' Hundred ' + toWords(n % 100);
    if (n < 100000) return toWords(Math.floor(n / 1000)) + ' Thousand ' + toWords(n % 1000);
    if (n < 1000000) return toWords(Math.floor(n / 100000)) + ' Lakh ' + toWords(n % 100000);
    return toWords(Math.floor(n / 10000000)) + ' Crore ' + toWords(n % 10000000);
  };

  const wordStr = toWords(cleanNum).trim();
  const paisaStr = paisa > 0 ? ` and Paisa ${toWords(paisa).trim()}` : '';
  return `Taka ${wordStr}${paisaStr} Only.`;
};

// Helper function to calculate spreadsheet payroll values exactly according to requirements
const calculatePayrollFields = (
  grossSalary: number,
  presentDays: number,
  absentDays: number,
  conveyanceBill: number,
  extraDutyFee: number,
  mobileSnackBill: number,
  advance: number,
  epf: number,
  health: number,
  tax: number
) => {
  const totalWorkingDays = 30;
  const paidDays = presentDays; // Paid Days is equal to presentDays (30 minus LOP/absent days)

  // 1. Basic Salary : =(C9/E4)*E6*70%
  const calculatedBasicSalary = Math.round((grossSalary / totalWorkingDays) * paidDays * 0.70);

  // 2. House Rent : =C11*20%
  const houseRentAllowance = Math.round(calculatedBasicSalary * 0.20);

  // 3. Conveyance Allowances: =(1600/E4)*E6
  const conveyanceAllowance = Math.round((1600 / totalWorkingDays) * paidDays);

  // 4. Medical Allowances: =(1250/E4)*E6
  const medicalAllowance = Math.round((1250 / totalWorkingDays) * paidDays);

  // 5. Special Allowances: =(C9/E4)*E6-SUM(C11:C14)
  const sumC11C14 = calculatedBasicSalary + houseRentAllowance + conveyanceAllowance + medicalAllowance;
  const specialAllowance = Math.max(0, Math.round(((grossSalary / totalWorkingDays) * paidDays) - sumC11C14));

  // Remainder/Deduction for leave
  const unpaidLeaveDeduction = Math.round((grossSalary / totalWorkingDays) * absentDays);

  // Total Earnings (Net Salary)
  const netSalaryVal = calculatedBasicSalary + houseRentAllowance + conveyanceAllowance + medicalAllowance + specialAllowance + mobileSnackBill + conveyanceBill + extraDutyFee;

  // Total Deductions
  const totalDeductions = epf + health + tax + advance;

  // Net Cash Payout (Net Pay)
  const netPayable = Math.max(0, netSalaryVal - totalDeductions);

  return {
    calculatedBasicSalary,
    houseRentAllowance,
    conveyanceAllowance,
    medicalAllowance,
    specialAllowance,
    unpaidLeaveDeduction,
    netSalaryVal,
    totalDeductions,
    netPayable
  };
};

interface PayrollManagerProps {
  initialEmployees?: Employee[];
  onEmployeesChange?: (employees: Employee[]) => void;
  initialPayrolls?: PayrollPeriod[];
  onPayrollsChange?: (payrolls: PayrollPeriod[]) => void;
  canEdit?: boolean;
}

export default function PayrollManager({
  initialEmployees,
  onEmployeesChange,
  initialPayrolls,
  onPayrollsChange,
  canEdit = true
}: PayrollManagerProps = {}) {
  const [selectedMonth, setSelectedMonth] = useState('05'); // Default to May
  const [selectedYear, setSelectedYear] = useState('2026');   // Default to 2026
  
  // Define employees list inside state, with pre-populated values for instant UX
  const [localEmployees, setLocalEmployees] = useState<Employee[]>(() => {
    try {
      const saved = localStorage.getItem('acoola_employees');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [
      { id: 'ACD220201', name: 'Shakhawat Hossain', designation: 'Manager', department: 'Accessories & Design', basicSalary: 40000, mobile: '01778262909', joiningDate: '2022-11-02' },
      { id: 'EMP-1001', name: 'মোঃ সালিম', designation: 'General Manager (ERP Ops)', department: 'ERP Operations', basicSalary: 45000, mobile: '01711223344', joiningDate: '2022-01-15' },
      { id: 'EMP-1002', name: 'রিয়াদ হাসান', designation: 'Senior Merchant Admin', department: 'Merchandising', basicSalary: 32050, mobile: '01811223345', joiningDate: '2023-03-10' },
      { id: 'EMP-1003', name: 'আসাদুল্লাহ শেখ', designation: 'CAD Pattern Master', department: 'CAD Design & Pattern', basicSalary: 28000, mobile: '01911223346', joiningDate: '2021-08-01' },
      { id: 'EMP-1004', name: 'মোছাঃ ফাতেমা বেগম', designation: 'Senior Quality Inspector', department: 'Quality Control', basicSalary: 24000, mobile: '01511223347', joiningDate: '2024-02-12' },
      { id: 'EMP-1005', name: 'মোঃ আব্দুল হান্নান', designation: 'Machine Maintenance Supervisor', department: 'Maintenance', basicSalary: 26000, mobile: '01611223348', joiningDate: '2023-11-20' }
    ];
  });

  const employees = initialEmployees !== undefined ? initialEmployees : localEmployees;
  const setEmployees = (updated: Employee[]) => {
    if (onEmployeesChange) {
      onEmployeesChange(updated);
    } else {
      setLocalEmployees(updated);
    }
  };

  const [localPayrolls, setLocalPayrolls] = useState<PayrollPeriod[]>(() => {
    try {
      const saved = localStorage.getItem('acoola_payrolls');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return [];
  });

  const payrollPeriods = initialPayrolls !== undefined ? initialPayrolls : localPayrolls;
  const setPayrollPeriods = (updated: PayrollPeriod[]) => {
    if (onPayrollsChange) {
      onPayrollsChange(updated);
    } else {
      setLocalPayrolls(updated);
    }
  };

  // Config toggles
  const [enableEpf, setEnableEpf] = useState(false);
  const [enableHealth, setEnableHealth] = useState(false);
  const [enableTax, setEnableTax] = useState(false);

  // New employee form
  const [showAddEmp, setShowAddEmp] = useState(false);
  const [empId, setEmpId] = useState('');
  const [empName, setEmpName] = useState('');
  const [empDesignation, setEmpDesignation] = useState('');
  const [empSalary, setEmpSalary] = useState('');
  const [empMobile, setEmpMobile] = useState('');
  const [empDepartment, setEmpDepartment] = useState('');

  // Active inputs grid mapping (Employee ID -> Input details)
  const [gridInputs, setGridInputs] = useState<Record<string, {
    presentDays: number;
    absentDays: number;
    conveyanceBill: number;
    extraDutyFee: number;
    mobileSnackBill: number;
    advance: number;
    epf: number;
    health: number;
    tax: number;
  }>>({});

  // Excel paste/upload dialog modal state
  const [showExcelUpload, setShowExcelUpload] = useState(false);
  const [excelRawText, setExcelRawText] = useState('');

  // Payroll processing state
  // 'input' -> entering/uploading, 'draft' -> previewing calculations before approval, 'approved' -> locked
  const [payrollState, setPayrollState] = useState<'input' | 'draft' | 'approved'>('input');
  const [draftPeriod, setDraftPeriod] = useState<PayrollPeriod | null>(null);

  // Current approved payroll display
  const [viewingApprovedPeriod, setViewingApprovedPeriod] = useState<PayrollPeriod | null>(null);
  const [paySlipToPrint, setPaySlipToPrint] = useState<{ item: PayrollItem; period: { month: string; year: string } } | null>(null);
  const [editingSlipData, setEditingSlipData] = useState<PayrollItem | null>(null);

  const saveEditedPaySlip = (currentData: PayrollItem) => {
    if (!paySlipToPrint) return;
    
    // Find matching period
    const targetPeriod = payrollPeriods.find(p => p.month === paySlipToPrint.period.month && p.year === paySlipToPrint.period.year);
    if (!targetPeriod) return;

    // Recalculate everything inside the slip item
    const gross = currentData.grossSalary || currentData.basicSalary;
    const pDays = currentData.paidDays !== undefined ? currentData.paidDays : 30;
    const basic = currentData.calculatedBasicSalary !== undefined ? currentData.calculatedBasicSalary : Math.round(gross * 0.70);
    const houseRent = currentData.houseRentAllowance !== undefined ? currentData.houseRentAllowance : Math.round(basic * 0.20);
    const convAllowance = currentData.conveyanceAllowance !== undefined ? currentData.conveyanceAllowance : Math.round((1600 / 30) * pDays);
    const medAllowance = currentData.medicalAllowance !== undefined ? currentData.medicalAllowance : Math.round((1250 / 30) * pDays);
    const specAllowance = currentData.specialAllowance !== undefined ? currentData.specialAllowance : Math.max(0, Math.round(((gross / 30) * pDays) - (basic + houseRent + convAllowance + medAllowance)));
    const mobSnack = currentData.mobileSnackBill || 0;
    const convBill = currentData.conveyanceBill || 0;
    const extraDuty = currentData.extraDutyFee || 0;
    const adv = currentData.advance || 0;

    const totalEarnings = basic + houseRent + convAllowance + medAllowance + specAllowance + mobSnack + convBill + extraDuty;
    const epfVal = currentData.epf || 0;
    const healthVal = currentData.healthInsurance || 0;
    const taxVal = currentData.professionalTax || 0;
    const totalDeductions = epfVal + healthVal + taxVal + adv;
    const netPayable = totalEarnings - totalDeductions;

    const updatedItem: PayrollItem = {
      ...currentData,
      calculatedBasicSalary: basic,
      houseRentAllowance: houseRent,
      conveyanceAllowance: convAllowance,
      medicalAllowance: medAllowance,
      specialAllowance: specAllowance,
      netPayable: netPayable
    };

    const updatedItems = targetPeriod.items.map(item => item.employeeId === updatedItem.employeeId ? updatedItem : item);
    const updatedPeriod: PayrollPeriod = {
      ...targetPeriod,
      items: updatedItems
    };

    const updatedPeriods = payrollPeriods.map(p => p.id === targetPeriod.id ? updatedPeriod : p);
    
    savePayrollsToStorage(updatedPeriods);
    setPaySlipToPrint({ item: updatedItem, period: paySlipToPrint.period });
    setEditingSlipData(null);
  };

  const saveEmployeesToStorage = (updated: Employee[]) => {
    setEmployees(updated);
    localStorage.setItem('acoola_employees', JSON.stringify(updated));
  };

  const savePayrollsToStorage = (updated: PayrollPeriod[]) => {
    setPayrollPeriods(updated);
    localStorage.setItem('acoola_payrolls', JSON.stringify(updated));
  };

  // Get current active grid inputs (initialize for any employee without inputs)
  const initializedInputs = useMemo(() => {
    const nextInputs = { ...gridInputs };
    let changed = false;
    employees.forEach(emp => {
      if (!nextInputs[emp.id]) {
        // Pre-fill some defaults for Shakhawat Hossain to make the preview match the Excel sheet of the user!
        const isShakhawat = emp.id === 'ACD220201' || emp.name.includes('Shakhawat');
        nextInputs[emp.id] = {
          presentDays: 30,
          absentDays: 0,
          conveyanceBill: 0,
          extraDutyFee: 0,
          mobileSnackBill: isShakhawat ? 1000 : 0,
          advance: isShakhawat ? 5000 : 0,
          epf: 0,
          health: 0,
          tax: 0
        };
        changed = true;
      }
    });
    if (changed) {
      setGridInputs(nextInputs);
    }
    return nextInputs;
  }, [employees, gridInputs]);

  // Fetch from Conveyance Hub by Name & ID (matches 'Due' conveyance entries for the current employee and month/year)
  const fetchConveyanceFromHubForEmployee = (empName: string, empId: string) => {
    try {
      const saved = localStorage.getItem('acoola_conveyances');
      const list: any[] = saved ? JSON.parse(saved) : [];
      const prefix = `${selectedYear}-${selectedMonth}`;
      
      const totalDue = list
        .filter(c => {
          const nameMatch = c.employeeName && c.employeeName.trim().toLowerCase() === empName.trim().toLowerCase();
          const dateMatch = c.date && c.date.startsWith(prefix);
          const typeMatch = c.type === 'Due';
          return nameMatch && dateMatch && typeMatch;
        })
        .reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

      handleCellChange(empId, 'conveyanceBill', totalDue);
    } catch (e) {
      console.error(e);
    }
  };

  // Handle single cell manual change
  const handleCellChange = (empId: string, field: string, val: number) => {
    setGridInputs(prev => {
      const cell = prev[empId] ? { ...prev[empId] } : {
        presentDays: 30,
        absentDays: 0,
        conveyanceBill: 0,
        extraDutyFee: 0,
        mobileSnackBill: 0,
        advance: 0,
        epf: 0,
        health: 0,
        tax: 0
      };

      if (field === 'presentDays') {
        cell.presentDays = val;
        cell.absentDays = Math.max(0, 30 - val); // auto inverse absent based on 30 day base
      } else if (field === 'absentDays') {
        cell.absentDays = val;
        cell.presentDays = Math.max(0, 30 - val); // auto inverse present based on 30 day base
      } else if (field === 'conveyanceBill') {
        cell.conveyanceBill = val;
      } else if (field === 'extraDutyFee') {
        cell.extraDutyFee = val;
      } else if (field === 'mobileSnackBill') {
        cell.mobileSnackBill = val;
      } else if (field === 'advance') {
        cell.advance = val;
      } else if (field === 'epf') {
        cell.epf = val;
      } else if (field === 'health') {
        cell.health = val;
      } else if (field === 'tax') {
        cell.tax = val;
      }

      return {
        ...prev,
        [empId]: cell
      };
    });
  };

  // Add a new Employee Group dynamically
  const handleAddEmployeeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!empId || !empName || !empSalary) return;

    const newEmp: Employee = {
      id: empId.trim().toUpperCase(),
      name: empName.trim(),
      designation: empDesignation.trim() || 'Staff Operator',
      department: empDepartment.trim() || undefined,
      basicSalary: parseFloat(empSalary) || 12000,
      mobile: empMobile.trim() || undefined,
      joiningDate: new Date().toISOString().substring(0, 10)
    };

    const updated = [...employees, newEmp];
    saveEmployeesToStorage(updated);
    
    // reset form
    setEmpId('');
    setEmpName('');
    setEmpDesignation('');
    setEmpSalary('');
    setEmpMobile('');
    setEmpDepartment('');
    setShowAddEmp(false);
  };

  const handleDeleteEmployee = (id: string) => {
    const updated = employees.filter(e => e.id !== id);
    saveEmployeesToStorage(updated);
  };

  // 💡 Pro-Tip: Fast Excel Pasting Simulator
  const handleExcelPasteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!excelRawText.trim()) return;

    // Split text by lines
    const lines = excelRawText.split('\n');
    const tempInputs = { ...gridInputs };

    lines.forEach(line => {
      // Split line by comma, semicolon, or tab character (for Excel pasting)
      const parts = line.split(/[,\t;]/);
      if (parts.length < 2) return;

      const pId = parts[0].trim().toUpperCase();
      // Match ID against existing list
      const matchedEmployee = employees.find(emp => emp.id === pId || emp.id.replace('EMP-', '') === pId);
      if (!matchedEmployee) return;

      const present = parseInt(parts[1]) || 30;
      const absent = Math.max(0, 30 - present);
      const conv = parseFloat(parts[2]) || 0;
      const extraD = parseFloat(parts[3]) || 0;
      const epfCost = parseFloat(parts[4]) || 0;
      const healthCost = parseFloat(parts[5]) || 0;
      const taxCost = parseFloat(parts[6]) || 0;

      tempInputs[matchedEmployee.id] = {
        presentDays: present,
        absentDays: absent,
        conveyanceBill: conv,
        extraDutyFee: extraD,
        mobileSnackBill: 0,
        advance: 0,
        epf: epfCost,
        health: healthCost,
        tax: taxCost
      };
    });

    setGridInputs(tempInputs);
    setShowExcelUpload(false);
    setExcelRawText('');
  };

  // Action #1: Process payroll -> calculates net payable salary and locks in Draft status
  const triggerProcessPayroll = () => {
    const periodId = `${selectedYear}-${selectedMonth}`;
    
    // Check if this period was already approved historical
    const isApproved = payrollPeriods.some(p => p.id === periodId && p.status === 'Approved');
    if (isApproved) {
      alert("This payroll period is already approved and locked in database! Please check historically listed periods.");
      return;
    }

    const items: PayrollItem[] = employees.map(emp => {
      const inputs = gridInputs[emp.id] || {
        presentDays: 30,
        absentDays: 0,
        conveyanceBill: 0,
        extraDutyFee: 0,
        mobileSnackBill: 0,
        advance: 0,
        epf: 0,
        health: 0,
        tax: 0
      };

      const epfDeduct = enableEpf ? inputs.epf : 0;
      const healthDeduct = enableHealth ? inputs.health : 0;
      const taxDeduct = enableTax ? inputs.tax : 0;

      const calcs = calculatePayrollFields(
        emp.basicSalary,
        inputs.presentDays,
        inputs.absentDays,
        inputs.conveyanceBill,
        inputs.extraDutyFee,
        inputs.mobileSnackBill,
        inputs.advance,
        epfDeduct,
        healthDeduct,
        taxDeduct
      );

      return {
        id: `payitem-${Date.now()}-${emp.id}`,
        employeeId: emp.id,
        employeeName: emp.name,
        designation: emp.designation,
        department: emp.department,
        basicSalary: emp.basicSalary, // baseline gross
        presentDays: inputs.presentDays,
        absentDays: inputs.absentDays,
        unpaidLeaveDeduction: calcs.unpaidLeaveDeduction,
        conveyanceBill: inputs.conveyanceBill,
        extraDutyFee: inputs.extraDutyFee,
        epf: epfDeduct,
        healthInsurance: healthDeduct,
        professionalTax: taxDeduct,
        netPayable: calcs.netPayable,
        isApproved: false,
        grossSalary: emp.basicSalary,
        totalWorkingDays: 30,
        paidDays: inputs.presentDays,
        calculatedBasicSalary: calcs.calculatedBasicSalary,
        houseRentAllowance: calcs.houseRentAllowance,
        conveyanceAllowance: calcs.conveyanceAllowance,
        medicalAllowance: calcs.medicalAllowance,
        specialAllowance: calcs.specialAllowance,
        mobileSnackBill: inputs.mobileSnackBill,
        advance: inputs.advance
      };
    });

    setDraftPeriod({
      id: periodId,
      month: selectedMonth,
      year: selectedYear,
      status: 'Draft',
      items
    });
    setPayrollState('draft');
  };

  // Allows manual edit inside draft sheet view before final approval!
  const handleDraftItemEdit = (index: number, field: keyof PayrollItem, val: number) => {
    if (!draftPeriod) return;

    setDraftPeriod(prev => {
      if (!prev) return null;
      const updatedItems = [...prev.items];
      const item = { ...updatedItems[index] };
      
      // Update the specific value
      if (field === 'conveyanceBill') item.conveyanceBill = val;
      if (field === 'extraDutyFee') item.extraDutyFee = val;
      if (field === 'epf') item.epf = val;
      if (field === 'healthInsurance') item.healthInsurance = val;
      if (field === 'professionalTax') item.professionalTax = val;
      if (field === 'mobileSnackBill') item.mobileSnackBill = val;
      if (field === 'advance') item.advance = val;
      if (field === 'presentDays') {
        item.presentDays = val;
        item.absentDays = Math.max(0, 30 - val);
      }
      if (field === 'absentDays') {
        item.absentDays = val;
        item.presentDays = Math.max(0, 30 - val);
      }

      // Recalculate net payable using helper
      const calcs = calculatePayrollFields(
        item.basicSalary,
        item.presentDays,
        item.absentDays,
        item.conveyanceBill,
        item.extraDutyFee,
        item.mobileSnackBill || 0,
        item.advance || 0,
        item.epf,
        item.healthInsurance,
        item.professionalTax
      );

      item.calculatedBasicSalary = calcs.calculatedBasicSalary;
      item.houseRentAllowance = calcs.houseRentAllowance;
      item.conveyanceAllowance = calcs.conveyanceAllowance;
      item.medicalAllowance = calcs.medicalAllowance;
      item.specialAllowance = calcs.specialAllowance;
      item.unpaidLeaveDeduction = calcs.unpaidLeaveDeduction;
      item.netPayable = calcs.netPayable;
      item.paidDays = item.presentDays;

      updatedItems[index] = item;
      return {
        ...prev,
        items: updatedItems
      };
    });
  };

  // Action #2: Approve -> Saves Draft to global arrays and commits pay-slip triggers
  const triggerApproveSection = () => {
    if (!draftPeriod) return;

    const approved: PayrollPeriod = {
      ...draftPeriod,
      status: 'Approved',
      processedAt: new Date().toISOString(),
      items: draftPeriod.items.map(i => ({ ...i, isApproved: true }))
    };

    // Filter out previous entry for the same month/year if any
    const cleared = payrollPeriods.filter(p => p.id !== approved.id);
    const updatedPeriods = [approved, ...cleared];
    
    savePayrollsToStorage(updatedPeriods);
    setViewingApprovedPeriod(approved);
    setPayrollState('approved');
  };

  const handleDeletePeriod = (id: string) => {
    const updated = payrollPeriods.filter(p => p.id !== id);
    savePayrollsToStorage(updated);
  };

  // Printable Individual Pay Slip layout
  const triggerPrintPaySlip = (item: PayrollItem, period: { month: string; year: string }) => {
    setPaySlipToPrint({ item, period });
  };

  return (
    <div className="space-y-6">
      {/* Upper Tab Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-4">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900 tracking-tight flex items-center gap-1.5 leading-none">
            ⚙️ এমপ্লয়ি পে-রোল ও স্যালারি শীট প্রসেসর (Payroll Hub)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            মাসের শেষে সব কর্মচারীর কার্যদিবস, অনুপস্থিত কালেকশন, কাস্টম ট্যাক্স ও ইন্স্যুরেন্স বসিয়ে দ্রুত মাসিক পে-রোল ড্রাফট করুন ও চূড়ান্ত পে-স্লিপ প্রিন্ট করুন।
          </p>
        </div>

        {canEdit && (
          <div className="flex gap-2">
            <button
              onClick={() => setShowExcelUpload(true)}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
            >
              <Upload className="w-4 h-4" /> Excel Upload / Paste
            </button>
            <button
              onClick={() => setShowAddEmp(true)}
              className="px-3.5 py-1.5 bg-neutral-900 hover:bg-neutral-950 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" /> নতুন স্টাফ যোগ করুন (Add Employee)
            </button>
          </div>
        )}
      </div>

      {/* Main interactive state machine switcher panels */}
      {payrollState === 'input' && (
        <div className="space-y-4">
          
          {/* Calendar Selector Bar + Additional settings toggles */}
          <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
              <div className="flex items-center gap-3">
                <span className="text-xs uppercase font-extrabold text-slate-400">Salary Period Selector:</span>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="bg-slate-50 border border-slate-250 py-1.5 px-3 rounded-lg text-xs font-bold font-sans outline-none text-neutral-850"
                >
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
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="bg-slate-50 border border-slate-250 py-1.5 px-3 rounded-lg text-xs font-bold font-sans outline-none text-neutral-850"
                >
                  <option value="2025">2025</option>
                  <option value="2026">2026</option>
                  <option value="2027">2027</option>
                </select>
              </div>

              {/* Toggles for EPF, Insurance & professional tax */}
              <div className="flex items-center gap-4 text-xs font-semibold pl-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10.5px] uppercase font-bold text-slate-400">EPF Fund:</span>
                  <button 
                    onClick={() => setEnableEpf(!enableEpf)} 
                    className="cursor-pointer text-slate-550 hover:text-slate-800 transition-colors"
                  >
                    {enableEpf ? <ToggleRight className="w-8 h-8 text-emerald-600" /> : <ToggleLeft className="w-8 h-8 text-slate-300" />}
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-[10.5px] uppercase font-bold text-slate-400">Health Ins:</span>
                  <button 
                    onClick={() => setEnableHealth(!enableHealth)} 
                    className="cursor-pointer text-slate-550 hover:text-slate-800 transition-colors"
                  >
                    {enableHealth ? <ToggleRight className="w-8 h-8 text-emerald-600" /> : <ToggleLeft className="w-8 h-8 text-slate-300" />}
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-[10.5px] uppercase font-bold text-slate-400">Income Tax:</span>
                  <button 
                    onClick={() => setEnableTax(!enableTax)} 
                    className="cursor-pointer text-slate-550 hover:text-slate-800 transition-colors"
                  >
                    {enableTax ? <ToggleRight className="w-8 h-8 text-emerald-600" /> : <ToggleLeft className="w-8 h-8 text-slate-300" />}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Input Grid Table */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-gray-150 text-[10px] uppercase font-extrabold tracking-wider text-slate-400">
                    <th className="py-3 px-4">Employee ID & Name / কর্মকর্তা</th>
                    <th className="py-3 px-4 text-center">Gross Salary / গ্রস</th>
                    <th className="py-3 px-4 text-center">Present / Paid Days</th>
                    <th className="py-3 px-4 text-center">Absent Days</th>
                    <th className="py-3 px-4 text-center font-extrabold text-slate-500">Mobile/Snack (৳)</th>
                    <th className="py-3 px-4 text-center font-extrabold text-indigo-600">Conveyance (৳)</th>
                    <th className="py-3 px-4 text-center font-extrabold text-slate-500">Extra Duty (৳)</th>
                    <th className="py-3 px-4 text-center font-extrabold text-rose-600">Advance (৳)</th>
                    {enableEpf && <th className="py-3 px-4 text-center">EPF (৳)</th>}
                    {enableHealth && <th className="py-3 px-4 text-center">Insurance (৳)</th>}
                    {enableTax && <th className="py-3 px-4 text-center">Tax (৳)</th>}
                    <th className="py-3 px-4 text-right">Delete</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-150">
                  {employees.map(emp => {
                    const inputs = initializedInputs[emp.id] || {
                      presentDays: 30,
                      absentDays: 0,
                      conveyanceBill: 0,
                      extraDutyFee: 0,
                      mobileSnackBill: 0,
                      advance: 0,
                      epf: 0,
                      health: 0,
                      tax: 0
                    };

                    return (
                      <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3 px-4">
                          <span className="block font-black text-slate-900 leading-tight">{emp.name}</span>
                          <span className="text-[9.5px] font-bold text-slate-400 mt-0.5">{emp.id} • {emp.designation}</span>
                          {emp.department && (
                            <span className="block text-[9px] font-black text-emerald-600 mt-0.5 uppercase tracking-wide bg-emerald-50 px-1 py-0.5 rounded w-max">
                              📁 {emp.department}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center font-black text-slate-700">
                          ৳{emp.basicSalary.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <input
                            type="number"
                            min={0}
                            max={30}
                            value={inputs.presentDays}
                            onChange={(e) => handleCellChange(emp.id, 'presentDays', parseInt(e.target.value) || 0)}
                            className="w-12 bg-slate-50 border border-slate-200 rounded p-1 text-center font-bold text-slate-800"
                          />
                        </td>
                        <td className="py-3 px-4 text-center">
                          <input
                            type="number"
                            min={0}
                            max={30}
                            value={inputs.absentDays}
                            onChange={(e) => handleCellChange(emp.id, 'absentDays', parseInt(e.target.value) || 0)}
                            className="w-12 bg-rose-50/50 border border-rose-200 text-rose-850 rounded p-1 text-center font-bold"
                          />
                        </td>
                        <td className="py-3 px-4 text-center">
                          <input
                            type="number"
                            value={inputs.mobileSnackBill || 0}
                            onChange={(e) => handleCellChange(emp.id, 'mobileSnackBill', parseFloat(e.target.value) || 0)}
                            className="w-16 bg-slate-50 border border-slate-200 rounded p-1 text-center font-semibold text-slate-800"
                          />
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <input
                              type="number"
                              value={inputs.conveyanceBill}
                              onChange={(e) => handleCellChange(emp.id, 'conveyanceBill', parseFloat(e.target.value) || 0)}
                              className="w-16 bg-slate-50 border border-slate-200 rounded p-1 text-center font-bold text-indigo-700 focus:border-indigo-500"
                            />
                            <button
                              onClick={() => fetchConveyanceFromHubForEmployee(emp.name, emp.id)}
                              title="Fetch unpaid conveyances from Conveyance Hub for this employee name and selected month"
                              className="p-1 hover:bg-slate-100 border border-slate-200 hover:border-indigo-400 hover:text-indigo-600 rounded text-slate-400 transition-all cursor-pointer"
                            >
                              <RefreshCw className="w-3 h-3 animate-pulse" />
                            </button>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <input
                            type="number"
                            value={inputs.extraDutyFee}
                            onChange={(e) => handleCellChange(emp.id, 'extraDutyFee', parseFloat(e.target.value) || 0)}
                            className="w-16 bg-slate-50 border border-slate-200 rounded p-1 text-center font-semibold text-slate-800"
                          />
                        </td>
                        <td className="py-3 px-4 text-center">
                          <input
                            type="number"
                            value={inputs.advance || 0}
                            onChange={(e) => handleCellChange(emp.id, 'advance', parseFloat(e.target.value) || 0)}
                            className="w-16 bg-rose-50 border border-rose-200 rounded p-1 text-center font-black text-rose-700"
                          />
                        </td>

                        {enableEpf && (
                          <td className="py-3 px-4 text-center">
                            <input
                              type="number"
                              value={inputs.epf}
                              onChange={(e) => handleCellChange(emp.id, 'epf', parseFloat(e.target.value) || 0)}
                              className="w-14 bg-slate-50 border border-slate-200 rounded p-1 text-center text-slate-800 font-medium"
                            />
                          </td>
                        )}

                        {enableHealth && (
                          <td className="py-3 px-4 text-center">
                            <input
                              type="number"
                              value={inputs.health}
                              onChange={(e) => handleCellChange(emp.id, 'health', parseFloat(e.target.value) || 0)}
                              className="w-14 bg-slate-50 border border-slate-200 rounded p-1 text-center text-slate-800 font-medium"
                            />
                          </td>
                        )}

                        {enableTax && (
                          <td className="py-3 px-4 text-center">
                            <input
                              type="number"
                              value={inputs.tax}
                              onChange={(e) => handleCellChange(emp.id, 'tax', parseFloat(e.target.value) || 0)}
                              className="w-14 bg-slate-50 border border-slate-200 rounded p-1 text-center text-slate-800 font-medium"
                            />
                          </td>
                        )}

                        <td className="py-3 px-4 text-right">
                          {canEdit && (
                            <button
                              onClick={() => handleDeleteEmployee(emp.id)}
                              className="p-1 border border-rose-100 hover:border-rose-450 hover:text-rose-500 rounded text-slate-400 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Bottom Processing Control button */}
            <div className="p-4 bg-slate-50 border-t border-gray-150 flex justify-end">
              <button
                onClick={triggerProcessPayroll}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-extrabold uppercase tracking-widest text-xs rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm transition-colors"
              >
                <span>Process Payroll</span> <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* 📅 Historical Approved Payroll Periods List (অনুমোদিত পে-রোল ও পূর্ববর্তী হিস্ট্রি) */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs mt-6">
            <div className="p-4 bg-slate-50 border-b border-slate-150 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div>
                <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-800 flex items-center gap-1.5 font-sans">
                  <ClipboardList className="w-4 h-4 text-emerald-600" /> Historical Approved Payroll Registry (পূর্ববর্তী পে-রোল বুক)
                </h3>
                <p className="text-[10px] text-slate-500 font-medium">Prerecorded month-end salary pay slips compiled and stored for employee tracking audits.</p>
              </div>
              <span className="text-[10px] px-2.5 py-1 bg-slate-100 text-slate-700 font-extrabold rounded-md font-sans">
                Saved Runs: {payrollPeriods.length}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-gray-150 text-[10px] uppercase font-extrabold tracking-wider text-slate-400">
                    <th className="py-3 px-4">Salary Period / মাস</th>
                    <th className="py-3 px-4 text-center">Staff Covered / কর্মী সংখ্যা</th>
                    <th className="py-3 px-4 text-right">Net Remitted Sum (৳)</th>
                    <th className="py-3 px-4 text-center">Approved At / সময়কাল</th>
                    <th className="py-3 px-4 text-right">Actions / বিস্তারিত</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-150">
                  {payrollPeriods.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-10 text-center text-slate-400 font-bold">
                        No approved payroll history recorded in local storage database. Generate one using the form above.
                      </td>
                    </tr>
                  ) : (
                    payrollPeriods.map(period => {
                      const periodIdBengali: Record<string, string> = {
                        '01': 'জানুয়ারি', '02': 'ফেব্রুয়ারি', '03': 'মার্চ', '04': 'এপ্রিল', '05': 'মে', '06': 'জুন',
                        '07': 'জুলাই', '08': 'আগস্ট', '09': 'সেপ্টেম্বর', '10': 'অক্টোবর', '11': 'নভেম্বর', '12': 'ডিসে'
                      };
                      const monthStr = periodIdBengali[period.month] || period.month;
                      const totalNet = period.items.reduce((sum, item) => sum + item.netPayable, 0);

                      return (
                        <tr key={period.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3.5 px-4 font-black text-slate-900 uppercase">
                            📅 {monthStr} - {period.year}
                          </td>
                          <td className="py-3.5 px-4 text-center font-bold text-slate-700">
                            {period.items.length} Staff Personnel
                          </td>
                          <td className="py-3.5 px-4 text-right font-extrabold text-emerald-850 text-emerald-800">
                            ৳ {totalNet.toLocaleString()}
                          </td>
                          <td className="py-3.5 px-4 text-center text-slate-500 font-mono text-[10.5px]">
                            {period.processedAt ? new Date(period.processedAt).toLocaleString() : 'N/A'}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex justify-end gap-1.5 font-sans">
                              <button
                                onClick={() => {
                                  setViewingApprovedPeriod(period);
                                  setPayrollState('approved');
                                }}
                                className="px-2.5 py-1.5 border border-slate-200 hover:border-indigo-650 font-extrabold uppercase text-[9.5px] rounded-lg cursor-pointer flex items-center gap-1 hover:text-indigo-700 transition-colors"
                              >
                                <Eye className="w-3.5 h-3.5 text-slate-450" /> View Sheet
                              </button>
                              {canEdit && (
                                <button
                                  onClick={() => handleDeletePeriod(period.id)}
                                  className="px-2.5 py-1.5 border border-slate-200 hover:border-red-650 font-extrabold uppercase text-[9.5px] rounded-lg cursor-pointer flex items-center gap-1 hover:text-red-700 transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5 text-slate-450" /> Delete Record
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: DRAFT REVIEW SHEET */}
      {payrollState === 'draft' && draftPeriod && (
        <div className="space-y-4">
          <div className="bg-amber-50/50 border border-amber-250 p-4 rounded-xl flex items-start gap-3">
            <BadgeInfo className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-extrabold text-amber-900">DRAFT SALARY SHEET PREVIEW (খসড়া পে-রোল রিভিউ)</p>
              <p className="text-xs text-amber-800 mt-1">
                নিচে সবার হিসাবকৃত বেতন বিবরণী রয়েছে। এটি ফাইনাল করার আগে চেক করে নিন। কোনো ভুল থাকলে সরাসরি টেবিল রো-তে ক্লিক করে এডিট করতে পারবেন।
              </p>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-550 bg-slate-50 text-slate-600 border-b border-slate-200 text-[9.5px] uppercase font-extrabold tracking-wider">
                    <th className="py-3 px-4">Staff ID, Name & Department</th>
                    <th className="py-3 px-4 text-right">Gross Salary / গ্রস</th>
                    <th className="py-3 px-4 text-center">Unpaid Days</th>
                    <th className="py-3 px-4 text-right text-rose-550">Absent LOP (-)</th>
                    <th className="py-3 px-4 text-center text-slate-500">Mobile/Snack (+)</th>
                    <th className="py-3 px-4 text-center text-indigo-600">Conveyance (+)</th>
                    <th className="py-3 px-4 text-center text-indigo-600">Extra Duty (+)</th>
                    <th className="py-3 px-4 text-center text-rose-600">Advance (-)</th>
                    {enableEpf && <th className="py-3 px-4 text-right">EPF (-)</th>}
                    {enableHealth && <th className="py-3 px-4 text-right">Health (-)</th>}
                    {enableTax && <th className="py-3 px-4 text-right">Tax (-)</th>}
                    <th className="py-3 px-4 text-right text-emerald-700 font-extrabold">Net Payable</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-150">
                  {draftPeriod.items.map((item, idx) => (
                    <tr key={item.employeeId} className="hover:bg-slate-50/50 transition-colors bg-white">
                      <td className="py-3 px-4">
                        <span className="block font-black text-slate-900">{item.employeeName}</span>
                        <span className="text-[9.5px] font-bold text-slate-400 mt-0.5">{item.employeeId}</span>
                        {item.department && (
                          <span className="block text-[8.5px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-1 py-0.5 rounded w-max mt-0.5">📁 {item.department}</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold">৳ {item.basicSalary.toLocaleString()}</td>
                      <td className="py-3 px-4 text-center">
                        <input
                          type="number"
                          value={item.absentDays}
                          onChange={(e) => handleDraftItemEdit(idx, 'absentDays', parseInt(e.target.value) || 0)}
                          className="w-12 bg-slate-50 border border-slate-200 rounded text-center font-bold p-0.5"
                        />
                      </td>
                      <td className="py-3 px-4 text-right text-rose-600 font-semibold">
                        ৳ {item.unpaidLeaveDeduction.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <input
                          type="number"
                          value={item.mobileSnackBill || 0}
                          onChange={(e) => handleDraftItemEdit(idx, 'mobileSnackBill', parseFloat(e.target.value) || 0)}
                          className="w-16 bg-slate-50 border border-slate-200 rounded text-right font-mono p-0.5"
                        />
                      </td>
                      <td className="py-3 px-4 text-center">
                        <input
                          type="number"
                          value={item.conveyanceBill}
                          onChange={(e) => handleDraftItemEdit(idx, 'conveyanceBill', parseFloat(e.target.value) || 0)}
                          className="w-16 bg-slate-50 border border-slate-200 rounded text-right font-mono p-0.5"
                        />
                      </td>
                      <td className="py-3 px-4 text-center">
                        <input
                          type="number"
                          value={item.extraDutyFee}
                          onChange={(e) => handleDraftItemEdit(idx, 'extraDutyFee', parseFloat(e.target.value) || 0)}
                          className="w-16 bg-slate-50 border border-slate-200 rounded text-right font-mono p-0.5"
                        />
                      </td>
                      <td className="py-3 px-4 text-center">
                        <input
                          type="number"
                          value={item.advance || 0}
                          onChange={(e) => handleDraftItemEdit(idx, 'advance', parseFloat(e.target.value) || 0)}
                          className="w-16 bg-rose-50 border border-rose-200 rounded text-right text-rose-700 font-bold p-0.5"
                        />
                      </td>

                      {enableEpf && (
                        <td className="py-3 px-4 text-center">
                          <input
                            type="number"
                            value={item.epf}
                            onChange={(e) => handleDraftItemEdit(idx, 'epf', parseFloat(e.target.value) || 0)}
                            className="w-14 bg-slate-50 border border-slate-200 rounded text-right font-mono p-0.5"
                          />
                        </td>
                      )}

                      {enableHealth && (
                        <td className="py-3 px-4 text-center">
                          <input
                            type="number"
                            value={item.healthInsurance}
                            onChange={(e) => handleDraftItemEdit(idx, 'healthInsurance', parseFloat(e.target.value) || 0)}
                            className="w-14 bg-slate-50 border border-slate-200 rounded text-right font-mono p-0.5"
                          />
                        </td>
                      )}

                      {enableTax && (
                        <td className="py-3 px-4 text-center">
                          <input
                            type="number"
                            value={item.professionalTax}
                            onChange={(e) => handleDraftItemEdit(idx, 'professionalTax', parseFloat(e.target.value) || 0)}
                            className="w-14 bg-slate-50 border border-slate-200 rounded text-right font-mono p-0.5"
                          />
                        </td>
                      )}

                      <td className="py-3 px-4 text-right font-extrabold text-emerald-800 bg-emerald-50/10">
                        ৳ {item.netPayable.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-slate-50 font-black border-t-2 border-slate-250 text-slate-800">
                    <td className="py-3 px-4 uppercase text-[9px]">Calculated Totals:</td>
                    <td className="py-3 px-4 text-right">৳ {draftPeriod.items.reduce((sum, item) => sum + item.basicSalary, 0).toLocaleString()}</td>
                    <td className="py-3 px-4"></td>
                    <td className="py-3 px-4 text-right text-rose-700">৳ {draftPeriod.items.reduce((sum, item) => sum + item.unpaidLeaveDeduction, 0).toLocaleString()}</td>
                    <td className="py-3 px-4 text-center">৳ {draftPeriod.items.reduce((sum, item) => sum + (item.mobileSnackBill || 0), 0).toLocaleString()}</td>
                    <td className="py-3 px-4 text-center text-indigo-700">৳ {draftPeriod.items.reduce((sum, item) => sum + item.conveyanceBill, 0).toLocaleString()}</td>
                    <td className="py-3 px-4 text-center text-indigo-700">৳ {draftPeriod.items.reduce((sum, item) => sum + item.extraDutyFee, 0).toLocaleString()}</td>
                    <td className="py-3 px-4 text-center text-rose-700">৳ {draftPeriod.items.reduce((sum, item) => sum + (item.advance || 0), 0).toLocaleString()}</td>
                    {enableEpf && <td className="py-3 px-4 text-right">৳ {draftPeriod.items.reduce((sum, item) => sum + item.epf, 0).toLocaleString()}</td>}
                    {enableHealth && <td className="py-3 px-4 text-right">৳ {draftPeriod.items.reduce((sum, item) => sum + item.healthInsurance, 0).toLocaleString()}</td>}
                    {enableTax && <td className="py-3 px-4 text-right">৳ {draftPeriod.items.reduce((sum, item) => sum + item.professionalTax, 0).toLocaleString()}</td>}
                    <td className="py-3 px-4 text-right text-emerald-800 text-sm">৳ {draftPeriod.items.reduce((sum, item) => sum + item.netPayable, 0).toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="p-4 bg-slate-50 border-t border-gray-150 flex justify-between gap-3">
              <button
                type="button"
                onClick={() => setPayrollState('input')}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 font-bold rounded-lg cursor-pointer"
              >
                Back to Input Editor
              </button>
              <button
                onClick={triggerApproveSection}
                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold uppercase text-xs rounded-xl cursor-pointer shadow-sm transition-colors"
              >
                Approve & Generate Pay Slips
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 3: APPROVED HISTORICAL / ACTIVE DETAIL VIEW */}
      {payrollState === 'approved' && viewingApprovedPeriod && (
        <div className="space-y-4">
          <div className="bg-emerald-50 border border-emerald-250 p-4 rounded-xl flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <div>
                <p className="font-extrabold text-emerald-950">PAYROLL COMPLETED & APPROVED (বেতন চূড়ান্তকরণ সম্পন্ন)</p>
                <p className="text-xs text-emerald-800 leading-tight">Approved payroll sheet for {viewingApprovedPeriod.month}/{viewingApprovedPeriod.year} is locked securely in system databases. You can now print individual salary slips.</p>
              </div>
            </div>
            
            <button
              onClick={() => { setPayrollState('input'); setViewingApprovedPeriod(null); }}
              className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold font-sans cursor-pointer text-slate-700 transition-colors shadow-xs"
            >
              Process Another Month
            </button>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <div className="p-4 bg-slate-50 border-b border-gray-150 font-black text-xs text-slate-800 uppercase">
              Approved salary list - May 2026
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-gray-150 text-[10px] uppercase font-extrabold tracking-wider text-slate-400">
                    <th className="py-3 px-4">Staff ID & Name</th>
                    <th className="py-3 px-4">Designation & Department</th>
                    <th className="py-3 px-4 text-right">Gross Salary / গ্রস</th>
                    <th className="py-3 px-4 text-center">Unpaid Absent</th>
                    <th className="py-3 px-4 text-right text-emerald-700 font-extrabold">Net Remitted Salary</th>
                    <th className="py-3 px-4 text-right">PDF Pay-Slip</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-150">
                  {viewingApprovedPeriod.items.map(item => (
                    <tr key={item.employeeId} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3.5 px-4">
                        <span className="block font-black text-slate-900 leading-tight">{item.employeeName}</span>
                        <span className="text-[9.5px] font-bold text-slate-400 mt-0.5">{item.employeeId}</span>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-550">
                        <span className="block">{item.designation}</span>
                        {item.department && (
                          <span className="inline-block text-[8.5px] font-extrabold text-emerald-600 bg-emerald-50 px-1 py-0.2 rounded mt-0.5">📁 {item.department}</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-slate-700">৳ {item.basicSalary.toLocaleString()} BDT</td>
                      <td className="py-3.5 px-4 text-center font-bold text-rose-700">{item.absentDays} Days</td>
                      <td className="py-3.5 px-4 text-right font-black text-emerald-800 bg-emerald-50/10">৳ {item.netPayable.toLocaleString()} BDT</td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => triggerPrintPaySlip(item, viewingApprovedPeriod)}
                          className="px-3 py-1 bg-neutral-900 hover:bg-neutral-950 text-white rounded font-bold tracking-wider text-[10px] uppercase inline-flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
                        >
                          <Printer className="w-3.5 h-3.5" /> Pay Slip
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Excel Drag and copy-paste Modal */}
      {showExcelUpload && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 p-6 rounded-2xl max-w-lg w-full shadow-lg space-y-4 text-xs">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-800 uppercase flex items-center gap-1.5">
                <FileSpreadsheet className="w-4 h-4 text-indigo-600" /> Excel Spreadsheet Data Import Simulator
              </h3>
            </div>

            <form onSubmit={handleExcelPasteSubmit} className="space-y-4">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-150">
                <p className="font-extrabold text-slate-700 uppercase block text-[9px] mb-1">CSV Format / এক্সেল শিট ফরম্যাট:</p>
                <code className="text-[10px] text-slate-900 font-mono block select-all bg-white p-2 border border-slate-200 rounded leading-relaxed">
                  EMP-1001, presentDays, conveyanceFee, extraDutyFee<br />
                  EMP-1002, 28, 500, 1200<br />
                  EMP-1003, 26, 800, 2000
                </code>
                <p className="text-[9.5px] font-medium text-slate-500 mt-2 block">
                  Copy rows from your excel worksheet specifying Employee ID, Present days, Conveyance, Extra Shift duty fees and paste inside the container below.
                </p>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Paste Excel Content Here</label>
                <textarea
                  required
                  value={excelRawText}
                  onChange={(e) => setExcelRawText(e.target.value)}
                  placeholder="EMP-1001, 26, 500, 1200&#10;EMP-1002, 28, 1200, 800"
                  className="w-full h-32 bg-slate-50 border border-slate-250 rounded-lg p-3 font-mono text-xs focus:border-indigo-500 outline-none"
                />
              </div>

              <div className="flex gap-2.5">
                <button
                  type="submit"
                  className="flex-1 py-2 bg-indigo-650 hover:bg-indigo-700 text-white font-extrabold text-xs uppercase tracking-wide rounded-lg cursor-pointer transition-colors"
                >
                  Parse & Populated data
                </button>
                <button
                  type="button"
                  onClick={() => setShowExcelUpload(false)}
                  className="px-3.5 py-2 bg-slate-105 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 font-bold"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Employee popup modal */}
      {showAddEmp && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 p-6 rounded-2xl max-w-sm w-full shadow-lg space-y-4 text-xs">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-slate-800 uppercase flex items-center gap-1.5">
                <UserPlus className="w-4 h-4 text-emerald-600" /> Add Corporate Staff (স্টাফ প্রোফাইল)
              </h3>
            </div>

            <form onSubmit={handleAddEmployeeSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Employee ID (ইউনিক আইডি)</label>
                  <input
                    type="text"
                    required
                    placeholder="EMP-1006"
                    value={empId}
                    onChange={(e) => setEmpId(e.target.value)}
                    className="w-full border border-slate-250 py-2 px-3 rounded-lg text-xs font-black outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Basic BDT Salary (মূল বেতন)</label>
                  <input
                    type="number"
                    required
                    placeholder="25000"
                    value={empSalary}
                    onChange={(e) => setEmpSalary(e.target.value)}
                    className="w-full border border-slate-250 py-2 px-3 rounded-lg text-xs font-extrabold outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Employee Name (পূর্ণ নাম)</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. মোঃ রাকিবুল ইসলাম"
                  value={empName}
                  onChange={(e) => setEmpName(e.target.value)}
                  className="w-full border border-slate-250 py-2 px-3 rounded-lg text-xs font-bold outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Department (বিভাগ)</label>
                <input
                  type="text"
                  placeholder="e.g. Accessories & Design, Merchandising"
                  value={empDepartment}
                  onChange={(e) => setEmpDepartment(e.target.value)}
                  className="w-full border border-slate-250 py-2 px-3 rounded-lg text-xs font-semibold outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Designation (পদবি)</label>
                  <input
                    type="text"
                    placeholder="e.g. Operator, Merchant"
                    value={empDesignation}
                    onChange={(e) => setEmpDesignation(e.target.value)}
                    className="w-full border border-slate-250 py-2 px-3 rounded-lg text-xs font-semibold outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Mobile number</label>
                  <input
                    type="text"
                    placeholder="017xxxxxxxx"
                    value={empMobile}
                    onChange={(e) => setEmpMobile(e.target.value)}
                    className="w-full border border-slate-250 py-2 px-3 rounded-lg text-xs font-semibold outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs uppercase rounded-lg cursor-pointer shadow-sm"
                >
                  Save Employee Profile
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddEmp(false)}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 💳 Global Hidden Print & On-Screen Preview Container for Payslip */}
      {paySlipToPrint && (
        <>
          {/* On-Screen Interactive Preview Modal */}
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto print:hidden">
            <div className="bg-slate-50 border border-slate-200 rounded-2xl max-w-2xl w-full shadow-lg p-6 space-y-4 text-xs animate-fade-in text-left">
              <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-800 uppercase flex items-center gap-1.5 font-sans">
                  <Printer className="w-4 h-4 text-indigo-600" /> Pay Slip Print Preview (বেতন স্লিপ প্রিভিউ)
                </h3>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const element = document.getElementById('payslip-print-sheet');
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
                          body { margin: 0; padding: 0 !important; background-color: #ffffff; color: #171717; font-family: sans-serif; }
                          #payslip-print-sheet { 
                            display: block !important; 
                            visibility: visible !important; 
                            width: 100% !important; 
                            margin: 0 !important; 
                            padding: 12mm 15mm 15mm 15mm !important; 
                            box-sizing: border-box !important;
                            position: relative !important;
                          }
                          #payslip-print-sheet * { visibility: visible !important; }
                          @page { size: A4 portrait; margin: 0 !important; }
                        </style>
                      `;
                      printWindow.document.write(`
                        <html>
                          <head>
                            <title>Pay Slip - ${paySlipToPrint.item.employeeName}</title>
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
                  {editingSlipData ? (
                    <>
                      <button
                        type="button"
                        onClick={() => saveEditedPaySlip(editingSlipData)}
                        className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[10px] uppercase tracking-wider rounded-lg flex items-center gap-1 cursor-pointer transition-all shadow-xs"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Save Changes
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingSlipData(null)}
                        className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg cursor-pointer text-[10px]"
                      >
                        Cancel Edit
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setEditingSlipData({ ...paySlipToPrint.item })}
                      className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[10px] uppercase tracking-wider rounded-lg flex items-center gap-1 cursor-pointer transition-all shadow-xs"
                    >
                      <Edit3 className="w-3.5 h-3.5" /> Edit Payslip
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setPaySlipToPrint(null);
                      setEditingSlipData(null);
                    }}
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
                <div className="p-4 border border-slate-200 rounded-lg text-left bg-white font-sans max-w-xl mx-auto">
                  {/* Ledger math calculations block */}
                  {(() => {
                    const item = editingSlipData || paySlipToPrint.item;
                    const gross = item.grossSalary || item.basicSalary;
                    const pDays = item.paidDays !== undefined ? item.paidDays : 30;
                    const basic = item.calculatedBasicSalary !== undefined ? item.calculatedBasicSalary : Math.round(gross * 0.70);
                    const houseRent = item.houseRentAllowance !== undefined ? item.houseRentAllowance : Math.round(basic * 0.20);
                    const convAllowance = item.conveyanceAllowance !== undefined ? item.conveyanceAllowance : Math.round((1600 / 30) * pDays);
                    const medAllowance = item.medicalAllowance !== undefined ? item.medicalAllowance : Math.round((1250 / 30) * pDays);
                    const specAllowance = item.specialAllowance !== undefined ? item.specialAllowance : Math.max(0, Math.round(((gross / 30) * pDays) - (basic + houseRent + convAllowance + medAllowance)));
                    const mobSnack = item.mobileSnackBill || 0;
                    const convBill = item.conveyanceBill || 0;
                    const extraDuty = item.extraDutyFee || 0;
                    const adv = item.advance || 0;

                    const totalEarnings = basic + houseRent + convAllowance + medAllowance + specAllowance + mobSnack + convBill + extraDuty;
                    const epfVal = item.epf || 0;
                    const healthVal = item.healthInsurance || 0;
                    const taxVal = item.professionalTax || 0;
                    const totalDeductions = epfVal + healthVal + taxVal + adv;
                    const netPayable = totalEarnings - totalDeductions;

                    return (
                      <>
                        {/* Replicating the robust visual layout styling of PI/Invoice header */}
                        <div className="flex justify-between items-start gap-4 pb-4 border-b-2 border-emerald-700">
                          <div className="flex items-start gap-3">
                            {COMPANY_PROFILE.logo && (
                              <div className="w-12 h-12 bg-white border border-slate-150 rounded p-1 flex items-center justify-center shrink-0">
                                <img src={COMPANY_PROFILE.logo} alt="brand" className="max-w-full max-h-full object-contain" />
                              </div>
                            )}
                            <div>
                              <h1 className="text-base font-black text-emerald-950 tracking-tight leading-none uppercase">{COMPANY_PROFILE.name}</h1>
                              <p className="text-[7.5px] font-extrabold text-emerald-700 tracking-widest mt-1 uppercase">QUALITY GARMENTS ACCESSORIES MANUFACTURER-SUPPLIER</p>
                              <p className="text-[9px] text-slate-500 mt-2 font-medium leading-tight">
                                Office: {COMPANY_PROFILE.addresses.office}<br/>
                                Factory: {COMPANY_PROFILE.addresses.factory}
                              </p>
                            </div>
                          </div>
                          <div className="text-right flex flex-col items-end gap-2.5 shrink-0">
                            <div>
                              <h2 className="text-sm font-black text-emerald-800 uppercase tracking-tight font-sans">STAFF SALARY PAY SLIP</h2>
                              <p className="text-[8.5px] text-slate-500 font-medium leading-tight mt-0.5">
                                Mob: {COMPANY_PROFILE.phones.join(', ')}<br/>
                                {COMPANY_PROFILE.emails[0]}
                              </p>
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="bg-emerald-600 text-white px-2.5 py-0.5 text-[8.5px] font-black rounded uppercase">PAID / পরিশোধিত</span>
                              <span className="text-[9px] font-black text-emerald-700 bg-emerald-50 px-1.5 py-0.5 border border-emerald-250/30 rounded uppercase font-bold">
                                {(() => {
                                  const monthNames: Record<string, string> = {
                                    '01': 'Jan', '02': 'Feb', '03': 'Mar', '04': 'Apr', '05': 'May', '06': 'Jun',
                                    '07': 'Jul', '08': 'Aug', '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dec'
                                  };
                                  return monthNames[paySlipToPrint.period.month] || paySlipToPrint.period.month;
                                })()} {paySlipToPrint.period.year}
                              </span>
                            </div>
                            <p className="text-[8.5px] font-mono font-bold mt-1 text-slate-600">Slip Ref ID: SLP-{paySlipToPrint.period.year}-{paySlipToPrint.period.month}-{paySlipToPrint.item.employeeId}</p>
                            <div className="mt-1 flex items-center justify-end">
                              <div className="bg-white border border-slate-200 rounded p-0.5 flex items-center justify-center w-[38px] h-[38px] shadow-3xs shrink-0">
                                <img 
                                  src={`https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(`SLP-${paySlipToPrint.period.year}-${paySlipToPrint.period.month}-${paySlipToPrint.item.employeeId}`)}`} 
                                  alt="QR Code" 
                                  className="max-w-full max-h-full object-contain"
                                  referrerPolicy="no-referrer"
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-[10px] mt-3 bg-slate-50 p-2.5 border border-slate-200 rounded">
                          <div>
                            <p><strong>Name / নাম:</strong> {paySlipToPrint.item.employeeName}</p>
                            <p className="mt-1"><strong>Staff ID / কোড:</strong> {paySlipToPrint.item.employeeId}</p>
                            <p className="mt-1"><strong>Designation / পদবি:</strong> {paySlipToPrint.item.designation}</p>
                            {paySlipToPrint.item.department && (
                              <p className="mt-1 text-emerald-700 font-bold"><strong>Department / বিভাগ:</strong> {paySlipToPrint.item.department}</p>
                            )}
                          </div>
                          <div>
                            {editingSlipData ? (
                              <>
                                <div className="flex items-center gap-1.5">
                                  <strong>Contract Gross Salary:</strong>
                                  <input 
                                    type="number" 
                                    value={gross} 
                                    onChange={e => {
                                      const val = Number(e.target.value);
                                      setEditingSlipData({ ...editingSlipData, grossSalary: val, basicSalary: val });
                                    }} 
                                    className="w-20 px-1 py-0.5 border border-slate-300 rounded bg-white text-slate-900 font-semibold" 
                                  />
                                </div>
                                <div className="mt-1 flex items-center gap-1.5">
                                  <strong>Paid Days / কার্যকাল:</strong>
                                  <input 
                                    type="number" 
                                    value={pDays} 
                                    onChange={e => {
                                      const val = Number(e.target.value);
                                      setEditingSlipData({ ...editingSlipData, paidDays: val });
                                    }} 
                                    className="w-16 px-1 py-0.5 border border-slate-300 rounded bg-white text-slate-900 font-semibold" 
                                  />
                                </div>
                              </>
                            ) : (
                              <>
                                <p><strong>Contract Gross Salary:</strong> ৳ {gross.toLocaleString()}</p>
                                <p className="mt-1"><strong>Paid / Present Days / কার্যকাল:</strong> {pDays} Days</p>
                              </>
                            )}
                            <p className="mt-1 text-rose-700"><strong>Absent / LOP Days:</strong> {30 - pDays} Days (৳{paySlipToPrint.item.unpaidLeaveDeduction.toLocaleString()})</p>
                          </div>
                        </div>

                        {/* Interactive Credits/Debits table block */}
                        <div className="grid grid-cols-2 border border-slate-300 rounded-lg overflow-hidden text-[9px] mt-4">
                          {/* Earnings side */}
                          <div className="border-r border-slate-300">
                            <div className="bg-slate-100 font-extrabold py-1.5 px-2 border-b border-slate-200 uppercase tracking-wider text-slate-700">Earnings (আয়)</div>
                            <div className="divide-y divide-slate-100 p-1">
                              <div className="flex justify-between items-center py-1 px-1.5 font-bold text-slate-800">
                                <span>Basic Salary (মূল)</span>
                                {editingSlipData ? (
                                  <input 
                                    type="number" 
                                    value={basic} 
                                    onChange={e => setEditingSlipData({ ...editingSlipData, calculatedBasicSalary: Number(e.target.value) })}
                                    className="w-20 px-1 py-0.5 border border-slate-300 rounded bg-white font-bold text-right text-xs text-slate-900"
                                  />
                                ) : (
                                  <span>৳{basic.toLocaleString()}</span>
                                )}
                              </div>
                              <div className="flex justify-between items-center py-1 px-1.5">
                                <span>House Rent (বাড়ি ভাড়া)</span>
                                {editingSlipData ? (
                                  <input 
                                    type="number" 
                                    value={houseRent} 
                                    onChange={e => setEditingSlipData({ ...editingSlipData, houseRentAllowance: Number(e.target.value) })}
                                    className="w-20 px-1 py-0.5 border border-slate-300 rounded bg-white text-right text-xs text-slate-900"
                                  />
                                ) : (
                                  <span>৳{houseRent.toLocaleString()}</span>
                                )}
                              </div>
                              <div className="flex justify-between items-center py-1 px-1.5">
                                <span>Conv. Allowance (যাতায়াত)</span>
                                {editingSlipData ? (
                                  <input 
                                    type="number" 
                                    value={convAllowance} 
                                    onChange={e => setEditingSlipData({ ...editingSlipData, conveyanceAllowance: Number(e.target.value) })}
                                    className="w-20 px-1 py-0.5 border border-slate-300 rounded bg-white text-right text-xs text-slate-900"
                                  />
                                ) : (
                                  <span>৳{convAllowance.toLocaleString()}</span>
                                )}
                              </div>
                              <div className="flex justify-between items-center py-1 px-1.5">
                                <span>Medical Allowance (চিকিৎসা)</span>
                                {editingSlipData ? (
                                  <input 
                                    type="number" 
                                    value={medAllowance} 
                                    onChange={e => setEditingSlipData({ ...editingSlipData, medicalAllowance: Number(e.target.value) })}
                                    className="w-20 px-1 py-0.5 border border-slate-300 rounded bg-white text-right text-xs text-slate-900"
                                  />
                                ) : (
                                  <span>৳{medAllowance.toLocaleString()}</span>
                                )}
                              </div>
                              <div className="flex justify-between items-center py-1 px-1.5">
                                <span>Special Allowance (বিশেষ)</span>
                                {editingSlipData ? (
                                  <input 
                                    type="number" 
                                    value={specAllowance} 
                                    onChange={e => setEditingSlipData({ ...editingSlipData, specialAllowance: Number(e.target.value) })}
                                    className="w-20 px-1 py-0.5 border border-slate-300 rounded bg-white text-right text-xs text-slate-900"
                                  />
                                ) : (
                                  <span>৳{specAllowance.toLocaleString()}</span>
                                )}
                              </div>
                              {(mobSnack > 0 || editingSlipData) && (
                                <div className="flex justify-between items-center py-1 px-1.5 font-medium text-emerald-800 bg-emerald-50/50">
                                  <span>Mobile & Snack (নাস্তা)</span>
                                  {editingSlipData ? (
                                    <input 
                                      type="number" 
                                      value={mobSnack} 
                                      onChange={e => setEditingSlipData({ ...editingSlipData, mobileSnackBill: Number(e.target.value) })}
                                      className="w-20 px-1 py-0.5 border border-slate-300 rounded bg-white text-right text-xs text-emerald-950 font-semibold"
                                    />
                                  ) : (
                                    <span>৳{mobSnack.toLocaleString()}</span>
                                  )}
                                </div>
                              )}
                              {(convBill > 0 || editingSlipData) && (
                                <div className="flex justify-between items-center py-1 px-1.5 font-medium text-indigo-800 bg-indigo-50/50">
                                  <span>Conveyance Bill (কাস্টম)</span>
                                  {editingSlipData ? (
                                    <input 
                                      type="number" 
                                      value={convBill} 
                                      onChange={e => setEditingSlipData({ ...editingSlipData, conveyanceBill: Number(e.target.value) })}
                                      className="w-20 px-1 py-0.5 border border-slate-300 rounded bg-white text-right text-xs text-indigo-955 font-semibold"
                                    />
                                  ) : (
                                    <span>৳{convBill.toLocaleString()}</span>
                                  )}
                                </div>
                              )}
                              {(extraDuty > 0 || editingSlipData) && (
                                <div className="flex justify-between items-center py-1 px-1.5">
                                  <span>Extra Duty OT (ওভারটাইম)</span>
                                  {editingSlipData ? (
                                    <input 
                                      type="number" 
                                      value={extraDuty} 
                                      onChange={e => setEditingSlipData({ ...editingSlipData, extraDutyFee: Number(e.target.value) })}
                                      className="w-20 px-1 py-0.5 border border-slate-300 rounded bg-white text-right text-xs text-slate-900"
                                    />
                                  ) : (
                                    <span>৳{extraDuty.toLocaleString()}</span>
                                  )}
                                </div>
                              )}
                              <div className="flex justify-between py-1.5 px-1.5 font-black border-t border-slate-200 bg-slate-100/50 text-slate-850">
                                <span>Total Gross Earnings:</span><span>৳{totalEarnings.toLocaleString()}</span>
                              </div>
                            </div>
                          </div>

                          {/* Deductions side */}
                          <div className="flex flex-col justify-between">
                            <div>
                              <div className="bg-slate-100 font-extrabold py-1.5 px-2 border-b border-slate-200 uppercase tracking-wider text-slate-700">Deductions (কর্তন)</div>
                              <div className="divide-y divide-slate-100 p-1">
                                <div className="flex justify-between items-center py-1 px-1.5 font-bold text-rose-700 bg-rose-50/50">
                                  <span>Advance Debited (অগ্রিম)</span>
                                  {editingSlipData ? (
                                    <input 
                                      type="number" 
                                      value={adv} 
                                      onChange={e => setEditingSlipData({ ...editingSlipData, advance: Number(e.target.value) })}
                                      className="w-20 px-1 py-0.5 border border-rose-300 rounded bg-white font-bold text-right text-xs text-rose-950"
                                    />
                                  ) : (
                                    <span>৳{adv.toLocaleString()}</span>
                                  )}
                                </div>
                                {(epfVal > 0 || editingSlipData) && (
                                  <div className="flex justify-between items-center py-1 px-1.5 text-slate-600">
                                    <span>Provident Fund (EPF)</span>
                                    {editingSlipData ? (
                                      <input 
                                        type="number" 
                                        value={epfVal} 
                                        onChange={e => setEditingSlipData({ ...editingSlipData, epf: Number(e.target.value) })}
                                        className="w-20 px-1 py-0.5 border border-slate-300 rounded bg-white text-right text-xs text-slate-900"
                                      />
                                    ) : (
                                      <span>৳{epfVal.toLocaleString()}</span>
                                    )}
                                  </div>
                                )}
                                {(healthVal > 0 || editingSlipData) && (
                                  <div className="flex justify-between items-center py-1 px-1.5 text-slate-600">
                                    <span>Health Insurance</span>
                                    {editingSlipData ? (
                                      <input 
                                        type="number" 
                                        value={healthVal} 
                                        onChange={e => setEditingSlipData({ ...editingSlipData, healthInsurance: Number(e.target.value) })}
                                        className="w-20 px-1 py-0.5 border border-slate-300 rounded bg-white text-right text-xs text-slate-900"
                                      />
                                    ) : (
                                      <span>৳{healthVal.toLocaleString()}</span>
                                    )}
                                  </div>
                                )}
                                {(taxVal > 0 || editingSlipData) && (
                                  <div className="flex justify-between items-center py-1 px-1.5 text-slate-600">
                                    <span>Professional Tax (কর)</span>
                                    {editingSlipData ? (
                                      <input 
                                        type="number" 
                                        value={taxVal} 
                                        onChange={e => setEditingSlipData({ ...editingSlipData, professionalTax: Number(e.target.value) })}
                                        className="w-20 px-1 py-0.5 border border-slate-300 rounded bg-white text-right text-xs text-slate-900"
                                      />
                                    ) : (
                                      <span>৳{taxVal.toLocaleString()}</span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="p-1 border-t border-slate-200">
                              <div className="flex justify-between py-1.5 px-1.5 font-black bg-slate-100/50 text-slate-850">
                                <span>Total Deductions:</span><span>৳{totalDeductions.toLocaleString()}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Grand Net Pay Cash */}
                        <div className="mt-4 bg-emerald-600 text-white p-2.5 rounded-lg flex justify-between items-center text-[11px] font-black uppercase tracking-wider shadow-sm">
                          <span>Net BDT Payable Cash Salary (নিট প্রদেয় বেতন):</span>
                          <span className="text-sm">৳ {netPayable.toLocaleString()} BDT</span>
                        </div>

                        <div className="mt-2 text-[10px] font-bold text-slate-705 bg-slate-50 border border-slate-200 p-2 rounded flex justify-between">
                          <span>In Words:</span>
                          <span className="italic font-black text-emerald-800">{amountToWordsBDT(netPayable)}</span>
                        </div>

                        <div className="grid grid-cols-2 gap-8 text-[8px] font-bold text-slate-400 mt-12 text-center">
                          <div className="border-t border-slate-200 pt-1 uppercase font-extrabold">Received Employee Signature</div>
                          <div className="border-t border-slate-200 pt-1 uppercase font-extrabold">Accounts HR Directorate</div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>

          {/* Hidden Print Container actually targetted by @media print rules */}
          <div id="payslip-print-sheet" className="hidden print:block relative p-[10mm] font-sans bg-white text-neutral-900 min-h-screen select-text">
            <div className="absolute top-0 left-0 w-full h-2 bg-emerald-700"></div>
            <div className="p-8 max-w-2xl mx-auto bg-white relative text-left">
              {(() => {
                const item = paySlipToPrint.item;
                const gross = item.grossSalary || item.basicSalary;
                const pDays = item.paidDays !== undefined ? item.paidDays : 30;
                const basic = item.calculatedBasicSalary !== undefined ? item.calculatedBasicSalary : Math.round(gross * 0.70);
                const houseRent = item.houseRentAllowance !== undefined ? item.houseRentAllowance : Math.round(basic * 0.20);
                const convAllowance = item.conveyanceAllowance !== undefined ? item.conveyanceAllowance : Math.round((1600 / 30) * pDays);
                const medAllowance = item.medicalAllowance !== undefined ? item.medicalAllowance : Math.round((1250 / 30) * pDays);
                const specAllowance = item.specialAllowance !== undefined ? item.specialAllowance : Math.max(0, Math.round(((gross / 30) * pDays) - (basic + houseRent + convAllowance + medAllowance)));
                const mobSnack = item.mobileSnackBill || 0;
                const convBill = item.conveyanceBill || 0;
                const extraDuty = item.extraDutyFee || 0;
                const adv = item.advance || 0;

                const totalEarnings = basic + houseRent + convAllowance + medAllowance + specAllowance + mobSnack + convBill + extraDuty;
                const epfVal = item.epf || 0;
                const healthVal = item.healthInsurance || 0;
                const taxVal = item.professionalTax || 0;
                const totalDeductions = epfVal + healthVal + taxVal + adv;
                const netPayable = item.netPayable;

                return (
                  <>
                    {/* Replicating the robust visual layout styling of PI/Invoice header */}
                    <div className="flex justify-between items-start gap-4 pb-4 border-b-2 border-emerald-700">
                      <div className="flex items-start gap-3">
                        {COMPANY_PROFILE.logo && (
                          <div className="w-12 h-12 bg-white border border-slate-150 rounded p-1 flex items-center justify-center shrink-0">
                            <img src={COMPANY_PROFILE.logo} alt="brand" className="max-w-full max-h-full object-contain" />
                          </div>
                        )}
                        <div>
                          <h1 className="text-base font-black text-emerald-950 tracking-tight leading-none uppercase">{COMPANY_PROFILE.name}</h1>
                          <p className="text-[7.5px] font-extrabold text-emerald-700 tracking-widest mt-1 uppercase">QUALITY GARMENTS ACCESSORIES MANUFACTURER-SUPPLIER</p>
                          <p className="text-[9px] text-slate-500 mt-2 font-medium leading-tight">
                            Office: {COMPANY_PROFILE.addresses.office}<br/>
                            Factory: {COMPANY_PROFILE.addresses.factory}
                          </p>
                        </div>
                      </div>
                      <div className="text-right flex flex-col items-end gap-1.5 shrink-0">
                        <div>
                          <h2 className="text-sm font-black text-emerald-800 uppercase tracking-tight font-sans">STAFF SALARY PAY SLIP</h2>
                          <p className="text-[8.5px] text-slate-500 font-medium leading-tight mt-0.5">
                            Mob: {COMPANY_PROFILE.phones.join(', ')}<br/>
                            {COMPANY_PROFILE.emails[0]}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="bg-emerald-600 text-white px-2.5 py-0.5 text-[8.5px] font-black rounded uppercase">PAID / পরিশোধিত</span>
                          <span className="text-[9px] font-black text-emerald-700 bg-emerald-50 px-1.5 py-0.5 border border-emerald-250/30 rounded uppercase font-bold">
                            {(() => {
                              const monthNames: Record<string, string> = {
                                '01': 'Jan', '02': 'Feb', '03': 'Mar', '04': 'Apr', '05': 'May', '06': 'Jun',
                                '07': 'Jul', '08': 'Aug', '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dec'
                              };
                              return monthNames[paySlipToPrint.period.month] || paySlipToPrint.period.month;
                            })()} {paySlipToPrint.period.year}
                          </span>
                        </div>
                        <p className="text-[8.5px] font-mono font-bold mt-1 text-slate-600">Slip Ref ID: SLP-{paySlipToPrint.period.year}-{paySlipToPrint.period.month}-{paySlipToPrint.item.employeeId}</p>
                        <div className="mt-1 flex items-center justify-end">
                          <div className="bg-white border border-slate-200 rounded p-0.5 flex items-center justify-center w-[38px] h-[38px] shadow-3xs shrink-0">
                            <img 
                              src={`https://api.qrserver.com/v1/create-qr-code/?size=80x80&data=${encodeURIComponent(`SLP-${paySlipToPrint.period.year}-${paySlipToPrint.period.month}-${paySlipToPrint.item.employeeId}`)}`} 
                              alt="QR Code" 
                              className="max-w-full max-h-full object-contain"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-xs mt-4 bg-slate-50 p-4 border border-slate-350 rounded-lg text-left">
                      <div>
                        <p className="m-0"><strong>Employee Name / কর্মকর্তা:</strong> {paySlipToPrint.item.employeeName}</p>
                        <p className="mt-1.5 font-mono"><strong>Employee ID / কোড:</strong> {paySlipToPrint.item.employeeId}</p>
                        <p className="mt-1.5"><strong>Designation / পদবি:</strong> {paySlipToPrint.item.designation}</p>
                        {paySlipToPrint.item.department && (
                          <p className="mt-1.5 text-emerald-800 font-bold"><strong>Department / বিভাগ:</strong> {paySlipToPrint.item.department}</p>
                        )}
                      </div>
                      <div>
                        <p className="m-0 font-bold"><strong>Gross Salary Standard:</strong> ৳ {gross.toLocaleString()}</p>
                        <p className="mt-1.5"><strong>Total Present Days:</strong> {pDays} Days / {30} Days Base</p>
                        <p className="mt-1.5 text-rose-800 font-semibold"><strong>LOP / Absent Deductions:</strong> {30 - pDays} Days (৳ {paySlipToPrint.item.unpaidLeaveDeduction.toLocaleString()})</p>
                      </div>
                    </div>

                    {/* Dual breakdown table split on printable sheet too */}
                    <div className="grid grid-cols-2 border border-slate-400 rounded-lg overflow-hidden text-xs mt-6 text-left">
                      {/* Earnings Column */}
                      <div className="border-r border-slate-400">
                        <div className="bg-slate-100 font-black py-2 px-3 border-b border-slate-400 uppercase tracking-wider text-slate-800 text-[10px]">Earnings Details (আয় খতিয়ান)</div>
                        <div className="divide-y divide-slate-200 p-1 bg-white">
                          <div className="flex justify-between py-1.5 px-2 font-bold text-slate-900 border-none">
                            <span>Basic Salary (মূল বেতন)</span><span>৳ {basic.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between py-1.5 px-2">
                            <span>House Rent (২৫% বাড়ি ভাড়া)</span><span>৳ {houseRent.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between py-1.5 px-2">
                            <span>Conveyance Allowance</span><span>৳ {convAllowance.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between py-1.5 px-2">
                            <span>Medical Allowance</span><span>৳ {medAllowance.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between py-1.5 px-2">
                            <span>Special Allowance</span><span>৳ {specAllowance.toLocaleString()}</span>
                          </div>
                          {mobSnack > 0 && (
                            <div className="flex justify-between py-1.5 px-2 text-emerald-800 font-bold bg-emerald-50">
                              <span>Mobile & Snack Bill</span><span>৳ {mobSnack.toLocaleString()}</span>
                            </div>
                          )}
                          {convBill > 0 && (
                            <div className="flex justify-between py-1.5 px-2 text-indigo-800 font-bold bg-indigo-50">
                              <span>Custom Conveyance Bill</span><span>৳ {convBill.toLocaleString()}</span>
                            </div>
                          )}
                          {extraDuty > 0 && (
                            <div className="flex justify-between py-1.5 px-2">
                              <span>OT Extra Shift Duty</span><span>৳ {extraDuty.toLocaleString()}</span>
                            </div>
                          )}
                          <div className="flex justify-between py-2 px-2 font-black border-t-2 border-slate-350 bg-slate-100 text-slate-905">
                            <span>Total Earnings Sum:</span><span>৳ {totalEarnings.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>

                      {/* Deductions Column */}
                      <div className="flex flex-col justify-between bg-white text-left">
                        <div>
                          <div className="bg-slate-100 font-black py-2 px-3 border-b border-slate-400 uppercase tracking-wider text-slate-800 text-[10px]">Deductions Details (কর্তন বিবরণ)</div>
                          <div className="divide-y divide-slate-200 p-2 text-left bg-white">
                            <div className="flex justify-between py-1.5 px-2 font-bold text-rose-800 bg-rose-50 border-none">
                              <span>Advance Debited (অগ্রিম)</span><span>৳ {adv.toLocaleString()}</span>
                            </div>
                            {epfVal > 0 && (
                              <div className="flex justify-between py-1.5 px-2 text-slate-650">
                                <span>Employee EPF Contribution</span><span>৳ {epfVal.toLocaleString()}</span>
                              </div>
                            )}
                            {healthVal > 0 && (
                              <div className="flex justify-between py-1.5 px-2 text-slate-650">
                                <span>Health Insurance ESI Premium</span><span>৳ {healthVal.toLocaleString()}</span>
                              </div>
                            )}
                            {taxVal > 0 && (
                              <div className="flex justify-between py-1.5 px-2 text-slate-650">
                                <span>Professional Income Tax</span><span>৳ {taxVal.toLocaleString()}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="p-1 border-t-2 border-slate-355 bg-white">
                          <div className="flex justify-between py-2 px-2 font-black bg-slate-100 text-slate-905">
                            <span>Total Deductions Sum:</span><span>৳ {totalDeductions.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Final Rem remitted cash block */}
                    <div className="mt-4 bg-emerald-600 text-white p-3 rounded-lg flex justify-between items-center text-[11px] font-black uppercase tracking-wider shadow-sm">
                      <span>Net BDT Payable Cash Salary (নিট প্রদেয় বেতন):</span>
                      <span className="text-sm font-black text-white">৳ {netPayable.toLocaleString()} BDT</span>
                    </div>

                    <div className="mt-2 text-[10px] font-bold text-slate-705 bg-slate-50 border border-slate-200 p-2 rounded flex justify-between">
                      <span>In Words / কথায়:</span>
                      <span className="italic font-black text-emerald-800">{amountToWordsBDT(netPayable)}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-12 text-center text-[10px] font-black text-slate-600 mt-28">
                      <div className="border-t border-slate-900 pt-2 uppercase font-black">Received Employee Signature</div>
                      <div className="border-t border-slate-900 pt-2 uppercase font-black">Authorized Signature • Managing Director</div>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
