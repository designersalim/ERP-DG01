/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Booking, BankDetails, ProformaInvoice, DeliveryChallan, DocumentItem, Supplier, SupplierWorkOrder, SupplierPayment, ConveyanceEntry, JobCard, CommercialInvoice, ProductItemCatalog, ManualInvoiceBill, Quotation, LcHistoryEntry, PaymentReceived, JobOpportunity, JobApplication, MoneyReceipt } from './types';
import { COMPANY_PROFILE, DEFAULT_BANKS, INITIAL_BOOKINGS, INITIAL_CHALLANS, INITIAL_PIS, INITIAL_SUPPLIERS, INITIAL_WORK_ORDERS, INITIAL_SUP_PAYMENTS, INITIAL_PRODUCTS, INITIAL_MANUAL_BILLS } from './data';
import CareersTabManager from './components/CareersTabManager';
import MoneyReceiptGenerator from './components/MoneyReceiptGenerator';
import WebsitePagesManager from './components/WebsitePagesManager';
import { DEFAULT_WEBSITE_PAGES, WebPageConfig } from './utils/defaultPages';
import BookingList from './components/BookingList';
import BookingForm from './components/BookingForm';
import CreateDocument from './components/CreateDocument';
import ChallanList from './components/ChallanList';
import PiList from './components/PiList';
import BankManager from './components/BankManager';
import SupplierManager from './components/SupplierManager';
import ConveyanceManager from './components/ConveyanceManager';
import JobCardManager from './components/JobCardManager';
import CommercialInvoiceHub from './components/CommercialInvoiceHub';
import PartyLedgerAgeing from './components/PartyLedgerAgeing';
import PayrollManager from './components/PayrollManager';
import LcDocumentGenerator from './components/LcDocumentGenerator';
import SystemProfileManager from './components/SystemProfileManager';
import BiometricAttendance from './components/BiometricAttendance';
import PriceQuotation from './components/PriceQuotation';
import ProductCatalogue from './components/ProductCatalogue';
import InvoiceBillManager from './components/InvoiceBillManager';
import DashboardTab from './components/DashboardTab';
import AIChatbot from './components/AIChatbot';
import CorporateWebsite from './components/CorporateWebsite';
import { UserAccount, DatabaseHostingConfig } from './types';
import { 
  googleSignIn, 
  googleSignOut, 
  initAuth, 
  uploadBackupFileToDrive, 
  downloadBackupFileFromDrive, 
  findBackupFile,
  ERPBackupData
} from './lib/driveSync';
import { User } from 'firebase/auth';
import { collection, doc, onSnapshot, setDoc, deleteDoc } from 'firebase/firestore';
import { db, auth, firebaseConfig } from './lib/driveSync';
import { 
  Cloud, 
  CloudOff, 
  CloudDownload, 
  CloudUpload, 
  CheckCircle2, 
  AlertTriangle,
  Loader2,
  RefreshCw,
  FileText, 
  Layers, 
  Truck, 
  FileSpreadsheet, 
  Landmark, 
  Plus, 
  RotateCcw, 
  Briefcase, 
  Mail, 
  Phone, 
  Building2, 
  CheckCircle, 
  DollarSign, 
  Calculator,
  Compass,
  Copy,
  Coins,
  ClipboardList,
  BarChart3,
  LayoutDashboard,
  ShieldCheck,
  Cpu,
  Users,
  ShoppingBag,
  Receipt,
  LogOut,
  Search,
  Sun,
  Moon,
  Globe
} from 'lucide-react';

export default function App() {
  // Load initial states from LocalStorage or fallback to prepopulated data
  const [bookings, setBookings] = useState<Booking[]>(() => {
    try {
      const saved = localStorage.getItem('acoola_bookings');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.map(b => ({
            ...b,
            sizes: Array.isArray(b.sizes) ? b.sizes : [],
            poNumber: b.poNumber || '',
            styleNumber: b.styleNumber || '',
            itemName: b.itemName || '',
            unitPrice: typeof b.unitPrice === 'number' ? b.unitPrice : 0,
            quantity: typeof b.quantity === 'number' ? b.quantity : 0,
            sizeWise: typeof b.sizeWise === 'boolean' ? b.sizeWise : false,
          }));
        }
      }
    } catch (e) {
      console.error("Error parsing bookings from localStorage:", e);
    }
    return INITIAL_BOOKINGS;
  });

  const [pis, setPis] = useState<ProformaInvoice[]>(() => {
    try {
      const saved = localStorage.getItem('acoola_pis');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.map(p => ({
            ...p,
            items: Array.isArray(p.items) ? p.items.map(item => ({
              ...item,
              sizes: Array.isArray(item.sizes) ? item.sizes : [],
              totalQuantity: typeof item.totalQuantity === 'number' ? item.totalQuantity : 0,
              unitPrice: typeof item.unitPrice === 'number' ? item.unitPrice : 0,
            })) : [],
            terms: Array.isArray(p.terms) ? p.terms : [],
          }));
        }
      }
    } catch (e) {
      console.error("Error parsing PIs from localStorage:", e);
    }
    return INITIAL_PIS;
  });

  const [challans, setChallans] = useState<DeliveryChallan[]>(() => {
    try {
      const saved = localStorage.getItem('acoola_challans');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.map(c => ({
            ...c,
            items: Array.isArray(c.items) ? c.items.map(item => ({
              ...item,
              sizes: Array.isArray(item.sizes) ? item.sizes : [],
              totalQuantity: typeof item.totalQuantity === 'number' ? item.totalQuantity : 0,
              unitPrice: typeof item.unitPrice === 'number' ? item.unitPrice : 0,
            })) : [],
          }));
        }
      }
    } catch (e) {
      console.error("Error parsing challans from localStorage:", e);
    }
    return INITIAL_CHALLANS;
  });

  const [banks, setBanks] = useState<BankDetails[]>(() => {
    try {
      const saved = localStorage.getItem('acoola_banks');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch (e) {
      console.error("Error parsing banks from localStorage:", e);
    }
    return DEFAULT_BANKS;
  });

  const [suppliers, setSuppliers] = useState<Supplier[]>(() => {
    try {
      const saved = localStorage.getItem('acoola_suppliers');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error("Error parsing suppliers", e);
    }
    return INITIAL_SUPPLIERS;
  });

  const [workOrders, setWorkOrders] = useState<SupplierWorkOrder[]>(() => {
    try {
      const saved = localStorage.getItem('acoola_work_orders');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error("Error parsing work orders", e);
    }
    return INITIAL_WORK_ORDERS;
  });

  const [payments, setPayments] = useState<SupplierPayment[]>(() => {
    try {
      const saved = localStorage.getItem('acoola_sup_payments');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error("Error parsing supplier payments", e);
    }
    return INITIAL_SUP_PAYMENTS;
  });

  const [conveyances, setConveyances] = useState<ConveyanceEntry[]>(() => {
    try {
      const saved = localStorage.getItem('acoola_conveyances');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error("Error parsing conveyances", e);
    }
    return [
      {
        id: 'conv-1',
        employeeName: 'মোঃ সালিম',
        date: new Date().toISOString().substring(0, 10),
        amount: 1200,
        type: 'Due',
        purpose: 'উত্তরা থেকে মতিঝিল অফিস যাতায়াত ভাড়া (সিএনজি ও দুপুরের লাঞ্চ)',
        createdAt: new Date().toISOString()
      },
      {
        id: 'conv-2',
        employeeName: 'রিয়াদ হাসান',
        date: new Date().toISOString().substring(0, 10),
        amount: 500,
        type: 'Due',
        purpose: 'পোস্ট অফিসে জরুরী অফিশিয়াল ডকুমেন্ট কুরিয়ার এবং রিকশা ভাড়া',
        createdAt: new Date().toISOString()
      },
      {
        id: 'conv-3',
        employeeName: 'মোঃ সালিম',
        date: new Date().toISOString().substring(0, 10),
        amount: 1500,
        type: 'Joma',
        purpose: 'অফিস অগ্রিম তহবিল থেকে কনভেন্স সমন্বয় বাবদ ক্যাশ প্রাপ্তি',
        createdAt: new Date().toISOString()
      }
    ];
  });

  // Dynamic system company profile state
  const [companyProfile, setCompanyProfile] = useState(() => {
    const defaultProfile = {
      name: COMPANY_PROFILE.name || "Acoola Trims Corporation",
      tagline: "All Kinds of Garments Accessories Manufacturer & Supplier",
      companyItems: "GARMENTS ACCESSORIES",
      emails: COMPANY_PROFILE.emails || ["admin@acoolatrims.com"],
      phones: COMPANY_PROFILE.phones || ["+8801711002233"],
      addresses: COMPANY_PROFILE.addresses || {
        office: "Plot-28, Sector-03, Tongi I/A, Gazipur, Dhaka",
        factory: "Plot-28, Sector-03, Tongi I/A, Gazipur, Dhaka"
      },
      bin: COMPANY_PROFILE.bin || "002903407-0202",
      tin: COMPANY_PROFILE.tin || "028374192083",
      logo: COMPANY_PROFILE.logo || "",
      websiteIntro: "We manufacture certified superior trim styles for garments exporters. Standard quality labels, barcodes, offset tags, boxes, and accessories from our central unit in Motijheel Arambagh."
    };
    try {
      const saved = localStorage.getItem('acoola_profile');
      if (saved) {
        return { ...defaultProfile, ...JSON.parse(saved) };
      }
    } catch {}
    return defaultProfile;
  });

  // RBAC permissions and session management
  const [sessionUser, setSessionUser] = useState<{ email: string; allowedTabs: string[]; writeAccess: Record<string, boolean>; isMasterAdmin: boolean; name?: string; designation?: string; department?: string; signatureUrl?: string } | null>(() => {
    try {
      const cached = localStorage.getItem('acoola_session_user');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });

  const [userAccounts, setUserAccounts] = useState<UserAccount[]>([]);
  const [dbConfigs, setDbConfigs] = useState<DatabaseHostingConfig[]>([]);

  const [viewMode, setViewMode] = useState<'website' | 'erp' | 'client-portal'>(() => {
    const activeClient = localStorage.getItem('acoola_logged_client');
    if (activeClient) return 'client-portal';
    return 'website';
  });

  const hasTabAccess = (tabId: string) => {
    if (!sessionUser) return false;
    if (tabId === 'customer-profiles') return true;
    if (sessionUser.isMasterAdmin) return true;
    return sessionUser.allowedTabs?.includes(tabId);
  };

  const hasWriteAccess = (tabId: string) => {
    if (!sessionUser) return false;
    if (sessionUser.isMasterAdmin) return true;
    return !!sessionUser.writeAccess?.[tabId];
  };

  // Real-time synchronization of deleted or modified user accounts
  useEffect(() => {
    if (!sessionUser || sessionUser.isMasterAdmin) return;
    if (!firstLoads.current['user_accounts']) return;

    const activeAccount = userAccounts.find(
      (acc) => acc.email.trim().toLowerCase() === sessionUser.email.trim().toLowerCase()
    );

    if (!activeAccount) {
      alert("Your operator credentials have been revoked or deleted by the administrator. Logging out...");
      setSessionUser(null);
      localStorage.removeItem('acoola_session_user');
    } else {
      const pChanged = 
        JSON.stringify(activeAccount.allowedTabs || []) !== JSON.stringify(sessionUser.allowedTabs || []) ||
        JSON.stringify(activeAccount.writeAccess || {}) !== JSON.stringify(sessionUser.writeAccess || {});
      
      if (pChanged) {
        console.log("Operator permissions updated in real-time. Patching session credentials...");
        const updated = {
          ...sessionUser,
          allowedTabs: activeAccount.allowedTabs || [],
          writeAccess: activeAccount.writeAccess || {}
        };
        setSessionUser(updated);
        localStorage.setItem('acoola_session_user', JSON.stringify(updated));
      }
    }
  }, [userAccounts, sessionUser]);

  // Current active viewport
  const [activeTab, setActiveTab] = useState<'dashboard' | 'bookings' | 'challans' | 'pis' | 'banks' | 'booking-form' | 'doc-builder' | 'suppliers' | 'conveyance' | 'job-cards' | 'commercial-invoices' | 'party-ledger' | 'payroll' | 'lc-documents' | 'profile-updates' | 'quote-builder' | 'products-catalogue' | 'invoice-bill' | 'attendance-logs' | 'careers-erp' | 'money-receipts' | 'website-pages' | 'customer-profiles'>('dashboard');

  // Dynamic Browser Tab Title and Favicon Synchronization
  useEffect(() => {
    try {
      const companyName = companyProfile.name || "Acoola Trims Corporation";
      document.title = `${companyName} ERP`;

      let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.getElementsByTagName('head')[0].appendChild(link);
      }

      const logoUrl = companyProfile.logo;
      if (logoUrl) {
        link.href = logoUrl;
      } else {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#007D46';
          ctx.beginPath();
          ctx.arc(32, 32, 30, 0, 2 * Math.PI);
          ctx.fill();
          
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.stroke();

          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 36px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          const char = companyName.charAt(0).toUpperCase() || 'A';
          ctx.fillText(char, 32, 32);
          
          link.href = canvas.toDataURL('image/png');
        }
      }
    } catch (e) {
      console.error("Failed to update favicon or document title", e);
    }
  }, []);

  // Self-healing navigation to avoid blank screens for restricted users
  useEffect(() => {
    if (sessionUser && !sessionUser.isMasterAdmin) {
      if (!hasTabAccess(activeTab)) {
        const firstAllowed = sessionUser.allowedTabs[0] || 'dashboard';
        setActiveTab(firstAllowed as any);
      }
    }
  }, [activeTab, sessionUser]);

  // persistent Job Card registries State
  const [jobCards, setJobCards] = useState<JobCard[]>(() => {
    try {
      const saved = localStorage.getItem('acoola_jobcards');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  const handleAddJobCard = (jc: JobCard) => {
    const updated = [...jobCards.filter(c => c.bookingId !== jc.bookingId), jc];
    setJobCards(updated);
    localStorage.setItem('acoola_jobcards', JSON.stringify(updated));
  };

  const handleUpdateJobCard = (jc: JobCard) => {
    const updated = jobCards.map(c => c.id === jc.id || c.bookingId === jc.bookingId ? jc : c);
    setJobCards(updated);
    localStorage.setItem('acoola_jobcards', JSON.stringify(updated));
  };

  const handleDeleteJobCard = (id: string) => {
    const updated = jobCards.filter(c => c.id !== id);
    setJobCards(updated);
    localStorage.setItem('acoola_jobcards', JSON.stringify(updated));
  };

  // persistent Trade Invoice registries State
  const [commercialInvoices, setCommercialInvoices] = useState<CommercialInvoice[]>(() => {
    try {
      const saved = localStorage.getItem('acoola_commercial_invoices');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  const handleAddCommercialInvoice = (ci: CommercialInvoice) => {
    const updated = [...commercialInvoices, ci];
    setCommercialInvoices(updated);
    localStorage.setItem('acoola_commercial_invoices', JSON.stringify(updated));
  };

  const handleUpdateCommercialInvoice = (updatedCi: CommercialInvoice) => {
    const updated = commercialInvoices.map(ci => ci.id === updatedCi.id ? updatedCi : ci);
    setCommercialInvoices(updated);
    localStorage.setItem('acoola_commercial_invoices', JSON.stringify(updated));
  };

  const handleDeleteCommercialInvoice = (id: string) => {
    const updated = commercialInvoices.filter(c => c.id !== id);
    setCommercialInvoices(updated);
    localStorage.setItem('acoola_commercial_invoices', JSON.stringify(updated));
  };

  // persistent Product Catalogue State
  const [products, setProducts] = useState<ProductItemCatalog[]>(() => {
    try {
      const saved = localStorage.getItem('acoola_products');
      if (saved) return JSON.parse(saved);
    } catch {}
    return INITIAL_PRODUCTS;
  });

  const handleAddProduct = (prod: ProductItemCatalog) => {
    const updated = [...products, prod];
    setProducts(updated);
    localStorage.setItem('acoola_products', JSON.stringify(updated));
  };

  const handleUpdateProduct = (prod: ProductItemCatalog) => {
    const updated = products.map(p => p.id === prod.id ? prod : p);
    setProducts(updated);
    localStorage.setItem('acoola_products', JSON.stringify(updated));
  };

  const handleDeleteProduct = (id: string) => {
    const updated = products.filter(p => p.id !== id);
    setProducts(updated);
    localStorage.setItem('acoola_products', JSON.stringify(updated));
  };

  // persistent Direct Manual Bills/Invoices State
  const [manualBills, setManualBills] = useState<ManualInvoiceBill[]>(() => {
    try {
      const saved = localStorage.getItem('acoola_manual_bills');
      if (saved) return JSON.parse(saved);
    } catch {}
    return INITIAL_MANUAL_BILLS;
  });

  const handleAddManualBill = (bill: ManualInvoiceBill) => {
    const updated = [bill, ...manualBills];
    setManualBills(updated);
    localStorage.setItem('acoola_manual_bills', JSON.stringify(updated));
  };

  const handleUpdateManualBillStatus = (id: string, status: 'Paid' | 'Unpaid' | 'Partial') => {
    const updated = manualBills.map(b => b.id === id ? { ...b, paymentStatus: status } : b);
    setManualBills(updated);
    localStorage.setItem('acoola_manual_bills', JSON.stringify(updated));
  };

  const handleUpdateManualBill = (bill: ManualInvoiceBill) => {
    const updated = manualBills.map(b => b.id === bill.id ? bill : b);
    setManualBills(updated);
    localStorage.setItem('acoola_manual_bills', JSON.stringify(updated));
  };

  const handleDeleteManualBill = (id: string) => {
    const updated = manualBills.filter(b => b.id !== id);
    setManualBills(updated);
    localStorage.setItem('acoola_manual_bills', JSON.stringify(updated));
  };

  // persistent Recruiting Careers Portal State
  const [jobOpportunities, setJobOpportunities] = useState<JobOpportunity[]>(() => {
    try {
      const saved = localStorage.getItem('acoola_job_opportunities');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  const [jobApplications, setJobApplications] = useState<JobApplication[]>(() => {
    try {
      const saved = localStorage.getItem('acoola_job_applications');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  const handleAddJobOpportunity = (job: JobOpportunity) => {
    const updated = [job, ...jobOpportunities.filter(j => j.id !== job.id)];
    setJobOpportunities(updated);
    localStorage.setItem('acoola_job_opportunities', JSON.stringify(updated));
  };

  const handleDeleteJobOpportunity = (id: string) => {
    const updated = jobOpportunities.filter(j => j.id !== id);
    setJobOpportunities(updated);
    localStorage.setItem('acoola_job_opportunities', JSON.stringify(updated));
  };

  const handleAddJobApplication = (app: JobApplication) => {
    const updated = [app, ...jobApplications];
    setJobApplications(updated);
    localStorage.setItem('acoola_job_applications', JSON.stringify(updated));
  };

  const handleDeleteJobApplication = (id: string) => {
    const updated = jobApplications.filter(a => a.id !== id);
    setJobApplications(updated);
    localStorage.setItem('acoola_job_applications', JSON.stringify(updated));
  };

  // persistent Registered Clients (Customer Profiles) State
  const [registeredClients, setRegisteredClients] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('acoola_registered_clients');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  // persistent Price Quotations State
  const [quotations, setQuotations] = useState<Quotation[]>(() => {
    try {
      const saved = localStorage.getItem('acoola_quotations');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  // persistent LC History / LC Documents Pack State
  const [lcHistory, setLcHistory] = useState<LcHistoryEntry[]>(() => {
    try {
      const saved = localStorage.getItem('lc_generation_history');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  // persistent Buyer Payments / Party Ledger & Ageing State
  const [buyerPayments, setBuyerPayments] = useState<PaymentReceived[]>(() => {
    try {
      const saved = localStorage.getItem('acoola_buyer_payments');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      {
        id: 'rec-1',
        factoryName: 'Interlink Apparel Ltd',
        date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10),
        amount: 3200,
        paymentMethod: 'Bank Transfer',
        bankRef: 'EBL-29931'
      },
      {
        id: 'rec-2',
        factoryName: 'Dekko Garments Ltd',
        date: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10),
        amount: 1500,
        paymentMethod: 'Check Received',
        bankRef: 'DBBL-CHQ-1100'
      }
    ];
  });

  // persistent Payroll Employees State
  const [employees, setEmployees] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('acoola_employees');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      { id: 'ACD220201', name: 'Shakhawat Hossain', designation: 'Manager', department: 'Accessories & Design', basicSalary: 40000, mobile: '01778262909', joiningDate: '2022-11-02' },
      { id: 'EMP-1001', name: 'মোঃ সালিম', designation: 'General Manager (ERP Ops)', department: 'ERP Operations', basicSalary: 45000, mobile: '01711223344', joiningDate: '2022-01-15' },
      { id: 'EMP-1002', name: 'রিয়াদ হাসান', designation: 'Senior Merchant Admin', department: 'Merchandising', basicSalary: 32050, mobile: '01811223345', joiningDate: '2023-03-10' },
      { id: 'EMP-1003', name: 'আসাদুল্লাহ শেখ', designation: 'CAD Pattern Master', department: 'CAD Design & Pattern', basicSalary: 28000, mobile: '01911223346', joiningDate: '2021-08-01' },
      { id: 'EMP-1004', name: 'মোছাঃ ফাতেমা বেগম', designation: 'Senior Quality Inspector', department: 'Quality Control', basicSalary: 24000, mobile: '01511223347', joiningDate: '2024-02-12' },
      { id: 'EMP-1005', name: 'মোঃ আব্দুল হান্নান', designation: 'Machine Maintenance Supervisor', department: 'Maintenance', basicSalary: 26000, mobile: '01611223348', joiningDate: '2023-11-20' }
    ];
  });

  // persistent Payroll Periods State
  const [payrolls, setPayrolls] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('acoola_payrolls');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  // persistent Website Pages State with DEFAULT_WEBSITE_PAGES fallback
  const [websitePages, setWebsitePages] = useState<WebPageConfig[]>(() => {
    try {
      const saved = localStorage.getItem('acoola_website_pages');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          let updated = false;
          const mapped = parsed.map((p, idx) => {
            if (p.order === undefined) {
              updated = true;
              return { ...p, order: idx };
            }
            return p;
          });
          if (updated) {
            localStorage.setItem('acoola_website_pages', JSON.stringify(mapped));
          }
          return mapped.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        }
      }
    } catch {}
    const defaultPages = DEFAULT_WEBSITE_PAGES.map((p, idx) => ({ ...p, order: idx }));
    return defaultPages;
  });

  // Booking currently being edited (null if creating a new one)
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);

  // Buffer state while building a document
  const [docBuilderConfig, setDocBuilderConfig] = useState<{ bookings: Booking[]; type: 'pi' | 'challan' } | null>(null);

  // Reset confirmation popup modal visibility state
  const [showResetConfirmModal, setShowResetConfirmModal] = useState(false);

  // --- Google Drive Cloud Sync States ---
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [cloudToken, setCloudToken] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error' | 'restoring'>('idle');
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(() => {
    return localStorage.getItem('acoola_last_sync_time');
  });
  const [cloudFileInfo, setCloudFileInfo] = useState<{ id: string; modifiedTime: string } | null>(null);
  const [showCloudModal, setShowCloudModal] = useState(false);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [cloudErrorMsg, setCloudErrorMsg] = useState<string | null>(null);
  const [showAuthTroubleshoot, setShowAuthTroubleshoot] = useState(false);
  const [copiedDomain, setCopiedDomain] = useState(false);

  // --- Dark Mode State ---
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('acoola_dark_mode') === 'true';
  });

  // --- Global Search States ---
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');

  // Synchronize Dark Mode client class
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('acoola_dark_mode', 'true');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('acoola_dark_mode', 'false');
    }
  }, [darkMode]);

  // Ctrl+K Global Search shortcut registry
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setShowGlobalSearch(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // --- Real-time Auto-Sync States (Every 1 minute background save) ---
  const [autoSyncEnabled, setAutoSyncEnabled] = useState<boolean>(() => {
    return localStorage.getItem('acoola_auto_sync') !== 'false';
  });
  const [autoSyncStatus, setAutoSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [lastSyncedSignature, setLastSyncedSignature] = useState<string>(() => {
    return localStorage.getItem('acoola_last_synced_signature') || '';
  });

  const currentSignature = useMemo(() => {
    return JSON.stringify({
      bookings,
      pis,
      challans,
      banks,
      suppliers,
      workOrders,
      payments,
      conveyances,
      manualBills,
      jobCards,
      commercialInvoices,
      products
    });
  }, [bookings, pis, challans, banks, suppliers, workOrders, payments, conveyances, manualBills, jobCards, commercialInvoices, products]);

  // Sync autoSyncEnabled preference to LocalStorage
  useEffect(() => {
    localStorage.setItem('acoola_auto_sync', String(autoSyncEnabled));
  }, [autoSyncEnabled]);

  // Set the initial signature representation on mount so we don't treat initial loading as a new edit
  useEffect(() => {
    if (!lastSyncedSignature && currentSignature) {
      setLastSyncedSignature(currentSignature);
      localStorage.setItem('acoola_last_synced_signature', currentSignature);
    }
  }, [currentSignature, lastSyncedSignature]);

  // Auto Sync daemon: Executes background checks every 60 seconds (1 minute)
  useEffect(() => {
    if (!cloudToken || !autoSyncEnabled) return;

    const intervalId = setInterval(async () => {
      // Check if signature changed (meaning there is some unsaved local changes compared to last sync session)
      if (currentSignature !== lastSyncedSignature) {
        console.log("AutoSync engine: detected unsaved database modifications. Performing silent background cloud backup...");
        setAutoSyncStatus('syncing');
        try {
          const backupData: ERPBackupData = {
            bookings,
            pis,
            challans,
            banks,
            suppliers,
            workOrders,
            payments,
            conveyances,
            manualBills,
            jobCards,
            commercialInvoices,
            products,
            updatedAt: new Date().toISOString()
          };
          await uploadBackupFileToDrive(cloudToken, backupData);
          
          const nowString = new Date().toLocaleString();
          setLastSyncTime(nowString);
          localStorage.setItem('acoola_last_sync_time', nowString);
          setLastSyncedSignature(currentSignature);
          localStorage.setItem('acoola_last_synced_signature', currentSignature);
          setAutoSyncStatus('success');
          
          // Rechecks drive file information silently
          await checkDriveFile(cloudToken);
          
          setTimeout(() => setAutoSyncStatus('idle'), 4005);
        } catch (err: any) {
          console.error("Auto Sync Engine runtime error (background pipeline):", err);
          setAutoSyncStatus('error');
          setTimeout(() => setAutoSyncStatus('idle'), 6005);
        }
      }
    }, 60000); // 1 minute interval

    return () => clearInterval(intervalId);
  }, [cloudToken, autoSyncEnabled, currentSignature, lastSyncedSignature, bookings, pis, challans, banks, suppliers, workOrders, payments, conveyances, manualBills, jobCards, commercialInvoices, products]);

  // --- EXE-style Setup Installation Wizard states ---
  const [installStep, setInstallStep] = useState<number>(1);
  const [installProgress, setInstallProgress] = useState<number>(0);
  const [installFolder, setInstallFolder] = useState<string>("C:\\Program Files\\Acoola Trims Corporation\\ERP Enterprise");
  const [eulaAccepted, setEulaAccepted] = useState<boolean>(false);
  const [installingText, setInstallingText] = useState<string>("Initializing InnoSetup extraction core...");

  // --- PWA Installation Event Listener state ---
  const [installPrompt, setInstallPrompt] = useState<any>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallApp = () => {
    setInstallStep(1);
    setInstallProgress(0);
    setEulaAccepted(false);
    setShowInstallModal(true);
  };

  const startInstallationAnim = () => {
    setInstallStep(4);
    setInstallProgress(0);
    setInstallingText("Initializing temporary extraction directory...");
    
    const msgs = [
      "Initializing extraction engine...",
      "Extracting acoola_trims_erp_v1_0_0.bin...",
      "Generating environment layout system parameters...",
      "Creating directory path: " + installFolder + "...",
      "Deploying service_worker.js configuration parameters...",
      "Extracting local UI modules framework widgets...",
      "Mapping local cache schema definitions...",
      "Precompiling client-side database modules...",
      "Writing manifest.json assets indices...",
      "Registering system registry files & icons...",
      "Wrapping assemblies and building desktop portal...",
      "Acoola Trims Enterprise ERP installation final checks..."
    ];
    
    let currentPercent = 0;
    const interval = setInterval(() => {
      currentPercent += 2; // Increments by 2%
      if (currentPercent > 100) currentPercent = 100;
      
      setInstallProgress(currentPercent);
      
      const idx = Math.floor((currentPercent / 100) * msgs.length);
      if (idx < msgs.length) {
        setInstallingText(msgs[idx]);
      }
      
      if (currentPercent >= 100) {
        clearInterval(interval);
        setInstallStep(5);
      }
    }, 70); // Full install takes about 3.5 seconds
  };

  const triggerNativeInstall = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const choiceResult = await installPrompt.userChoice;
    if (choiceResult.outcome === 'accepted') {
      console.log('User accepted the install prompt');
      setInstallPrompt(null);
    }
  };

  const handleDownloadBat = () => {
    const batText = `@echo off
title Acoola Trims Corporation ERP Launcher
color 0A
echo ==========================================================
echo       ACOOLA TRIMS CORPORATION ERP ENTERPRISE SHELL
echo ==========================================================
echo.
echo [INFO] Standalone local desktop window pipeline initializing...
echo [INFO] Establishing secure sandbox boundary...
echo [INFO] Loading app shell window assets...
echo.

:: Launch google chrome or msedge in specialized standalone borderless app window mode
:: This provides a gorgeous zero-overhead native application experience!
start "" chrome --app="https://ais-dev-4rq64ijmkajmhmqedlxezz-65798366455.asia-southeast1.run.app" --class="AcoolaTrimsERP" --title="Acoola Trims ERP" --disable-gpu

if %errorlevel% neq 0 (
    echo [WARNING] Google Chrome App mode failed. Falling back to Microsoft Edge...
    start "" msedge --app="https://ais-dev-4rq64ijmkajmhmqedlxezz-65798366455.asia-southeast1.run.app"
)

echo.
echo [SUCCESS] Standalone Application Frame running securely!
echo [SUCCESS] You can safely minimize or close this backend terminal.
timeout /t 3 >nul
exit
`;
    try {
      const blob = new Blob([batText], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'Acoola_Trims_ERP_Launcher.bat';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Failed to generate BAT setup script:", e);
    }
  };

  // Run firebase auth listener
  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setCurrentUser(user);
        setCloudToken(token || null);
        if (token) {
          checkDriveFile(token);
        }
      },
      () => {
        setCurrentUser(null);
        setCloudToken(null);
      }
    );

    const handleExpired = () => {
      console.warn("Detected expired or invalid Google Drive key signature (401). Resetting Drive session...");
      setCloudToken(null);
      setCloudFileInfo(null);
      setSyncStatus('idle');
      setAutoSyncStatus('idle');
    };

    window.addEventListener('acoola_drive_token_expired', handleExpired);

    return () => {
      unsubscribe();
      window.removeEventListener('acoola_drive_token_expired', handleExpired);
    };
  }, []);

  // --- Standardized Firestore Error Logging Infrastructure ---
  enum OperationType {
    CREATE = 'create',
    UPDATE = 'update',
    DELETE = 'delete',
    LIST = 'list',
    GET = 'get',
    WRITE = 'write',
  }

  interface FirestoreErrorInfo {
    error: string;
    operationType: OperationType;
    path: string | null;
    authInfo: {
      userId?: string | null;
      email?: string | null;
      emailVerified?: boolean | null;
      isAnonymous?: boolean | null;
      tenantId?: string | null;
      providerInfo?: {
        providerId?: string | null;
        email?: string | null;
      }[];
    }
  }

  const handleFirestoreError = (error: unknown, operationType: OperationType, path: string | null) => {
    const errInfo: FirestoreErrorInfo = {
      error: error instanceof Error ? error.message : String(error),
      authInfo: {
        userId: auth.currentUser?.uid,
        email: auth.currentUser?.email,
        emailVerified: auth.currentUser?.emailVerified,
        isAnonymous: auth.currentUser?.isAnonymous,
        tenantId: auth.currentUser?.tenantId,
        providerInfo: auth.currentUser?.providerData?.map(provider => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || []
      },
      operationType,
      path
    };
    console.error('Firestore Error Detailed: ', JSON.stringify(errInfo));
  };

  // Helper to remove any undefined fields before saving to Firestore to prevent crashes
  const sanitizeForFirestore = (val: any): any => {
    if (val === undefined) return null;
    if (val === null) return null;
    if (Array.isArray(val)) {
      return val.map(sanitizeForFirestore);
    }
    if (typeof val === 'object') {
      const res: any = {};
      for (const key of Object.keys(val)) {
        const cleanVal = sanitizeForFirestore(val[key]);
        if (cleanVal !== undefined) {
          res[key] = cleanVal;
        }
      }
      return res;
    }
    return val;
  };

  // --- Real-time Bidirectional Firestore Sync Engine ---
  const lastCloudSigs = React.useRef<Record<string, string>>({});
  const isSyncingFromCloud = React.useRef<Record<string, boolean>>({});
  const isWritingToCloud = React.useRef<Record<string, boolean>>({});
  const firstLoads = React.useRef<Record<string, boolean>>({});

  const getSignature = (path: string, items: any[]) => {
    if (!Array.isArray(items)) return '[]';
    if (path === 'website_pages') {
      const sorted = [...items].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      return JSON.stringify(sorted.map(x => ({
        id: x.id,
        title: x.title,
        customDesignEnabled: !!x.customDesignEnabled,
        customHtmlCode: x.customHtmlCode || '',
        isHidden: !!x.isHidden,
        order: x.order ?? 0
      })));
    }
    return JSON.stringify(items.map(x => x.id).sort());
  };

  useEffect(() => {
    const collectionsToSync = [
      { path: 'bookings', setter: setBookings },
      { path: 'pis', setter: setPis },
      { path: 'challans', setter: setChallans },
      { path: 'banks', setter: setBanks },
      { path: 'suppliers', setter: setSuppliers },
      { path: 'work_orders', setter: setWorkOrders },
      { path: 'sup_payments', setter: setPayments },
      { path: 'conveyances', setter: setConveyances },
      { path: 'products', setter: setProducts },
      { path: 'manual_bills', setter: setManualBills },
      { path: 'jobcards', setter: setJobCards },
      { path: 'commercial_invoices', setter: setCommercialInvoices },
      { path: 'user_accounts', setter: setUserAccounts },
      { path: 'db_configs', setter: setDbConfigs },
      { path: 'quotations', setter: setQuotations },
      { path: 'lc_history', setter: setLcHistory },
      { path: 'buyer_payments', setter: setBuyerPayments },
      { path: 'employees', setter: setEmployees },
      { path: 'payrolls', setter: setPayrolls },
      { path: 'registered_clients', setter: setRegisteredClients },
      { path: 'website_pages', setter: setWebsitePages }
    ];

    const mergeCollections = (path: string, local: any[], remote: any[]) => {
      const mergedMap = new Map();
      remote.forEach(item => {
        if (item && item.id) {
          mergedMap.set(item.id, item);
        }
      });
      local.forEach(item => {
        if (item && item.id) {
          if (mergedMap.has(item.id)) {
            const existing = mergedMap.get(item.id);
            mergedMap.set(item.id, { ...existing, ...item });
          } else {
            mergedMap.set(item.id, item);
          }
        }
      });
      const mergedList = Array.from(mergedMap.values());
      if (path === 'website_pages') {
        return mergedList.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
      }
      return mergedList;
    };

    const unsubscribes = collectionsToSync.map(({ path, setter }) => {
      const colRef = collection(db, 'erp_company_data', 'shared_workspace', path);

      return onSnapshot(colRef, async (snapshot) => {
        if (isWritingToCloud.current[path]) {
          console.log(`[Firebase Sync] Preserving local state: Ignoring intermediate cloud snapshot on ${path} while writing is active.`);
          return;
        }

        const remoteItems: any[] = [];
        snapshot.forEach((docSnap) => {
          remoteItems.push(docSnap.data());
        });

        const localStorageKeyMap: Record<string, string> = {
          bookings: 'acoola_bookings',
          pis: 'acoola_pis',
          challans: 'acoola_challans',
          banks: 'acoola_banks',
          suppliers: 'acoola_suppliers',
          work_orders: 'acoola_work_orders',
          sup_payments: 'acoola_sup_payments',
          conveyances: 'acoola_conveyances',
          products: 'acoola_products',
          manual_bills: 'acoola_manual_bills',
          jobcards: 'acoola_jobcards',
          commercial_invoices: 'acoola_commercial_invoices',
          user_accounts: 'acoola_user_accounts',
          db_configs: 'acoola_db_hosting_config',
          quotations: 'acoola_quotations',
          lc_history: 'lc_generation_history',
          buyer_payments: 'acoola_buyer_payments',
          employees: 'acoola_employees',
          payrolls: 'acoola_payrolls',
          website_pages: 'acoola_website_pages'
        };
        const storageKey = localStorageKeyMap[path];

        // 1. Smart Merge on first load of the collection session
        if (!firstLoads.current[path]) {
          firstLoads.current[path] = true;
          
          const savedStr = storageKey ? localStorage.getItem(storageKey) : null;
          let currentLocal: any[] = [];
          if (savedStr) {
            try {
              currentLocal = JSON.parse(savedStr);
              if (!Array.isArray(currentLocal)) currentLocal = [];
            } catch (e) {
              console.error(`Error parsing stored cache for ${path}:`, e);
            }
          }

          if (currentLocal.length > 0 || remoteItems.length > 0) {
            const merged = mergeCollections(path, currentLocal, remoteItems);
            const remoteSig = getSignature(path, remoteItems);
            const mergedSig = getSignature(path, merged);

            lastCloudSigs.current[path] = remoteSig;
            isSyncingFromCloud.current[path] = true;
            setter(merged);

            // If the merged set has more records or is different from remote, immediately sync those up to cloud
            if (remoteSig !== mergedSig) {
              console.log(`[Firebase Sync] Synchronizing initial/reconnected state differences to cloud for: ${path}`);
              isWritingToCloud.current[path] = true;
              try {
                for (const item of merged) {
                  await setDoc(doc(colRef, item.id), sanitizeForFirestore(item));
                }
                lastCloudSigs.current[path] = mergedSig;
              } catch (err) {
                handleFirestoreError(err, OperationType.WRITE, `erp_company_data/shared_workspace/${path}`);
              } finally {
                setTimeout(() => {
                  isWritingToCloud.current[path] = false;
                }, 1200);
              }
            }

            setTimeout(() => {
              isSyncingFromCloud.current[path] = false;
            }, 300);
            return;
          }
        }

        // Seeding database if Firestore is empty but we have local backup in localStorage
        if (snapshot.empty && remoteItems.length === 0) {
          let savedStr = storageKey ? localStorage.getItem(storageKey) : null;
          if (!savedStr && path === 'website_pages') {
            savedStr = JSON.stringify(DEFAULT_WEBSITE_PAGES);
          }
          if (savedStr) {
            try {
              const savedArray = JSON.parse(savedStr);
              if (Array.isArray(savedArray) && savedArray.length > 0) {
                console.log(`[Firebase Sync] Seeding remote collection ${path} containing ${savedArray.length} items.`);
                isWritingToCloud.current[path] = true;
                try {
                  for (const item of savedArray) {
                    await setDoc(doc(colRef, item.id), sanitizeForFirestore(item));
                  }
                  lastCloudSigs.current[path] = getSignature(path, savedArray);
                } catch (err) {
                  handleFirestoreError(err, OperationType.WRITE, `erp_company_data/shared_workspace/${path}`);
                } finally {
                  setTimeout(() => { isWritingToCloud.current[path] = false; }, 1200);
                }
                return;
              }
            } catch (e) {
              console.error(`Seeding verification or parsing error for ${path}:`, e);
            }
          }
        }

        const remoteSig = getSignature(path, remoteItems);
        lastCloudSigs.current[path] = remoteSig;

        isSyncingFromCloud.current[path] = true;
        
        // Sorting or setting remote data
        setter(remoteItems);

        setTimeout(() => {
          isSyncingFromCloud.current[path] = false;
        }, 300);
      }, (err) => {
        handleFirestoreError(err, OperationType.LIST, `erp_company_data/shared_workspace/${path}`);
      });
    });

    return () => {
      unsubscribes.forEach(unsub => unsub());
    };
  }, []);

  const syncLocalToCloud = async (path: string, localItems: any[]) => {
    if (isSyncingFromCloud.current[path]) return;
    if (isWritingToCloud.current[path]) return;

    const colRef = collection(db, 'erp_company_data', 'shared_workspace', path);
    const localSig = getSignature(path, localItems);

    if (lastCloudSigs.current[path] !== undefined && lastCloudSigs.current[path] !== localSig) {
      console.log(`[Firebase Sync] Divergence detected in ${path}. Syncing local changes to cloud.`);
      isWritingToCloud.current[path] = true;
      try {
        // 1. Write or update all current local items on server
        for (const item of localItems) {
          await setDoc(doc(colRef, item.id), sanitizeForFirestore(item));
        }

        // 2. Clear out deleted items from Firestore
        if (lastCloudSigs.current[path]) {
          try {
            const parsedSigs = JSON.parse(lastCloudSigs.current[path]);
            const remoteIds: string[] = Array.isArray(parsedSigs)
              ? parsedSigs.map((x: any) => typeof x === 'object' && x !== null ? x.id : x)
              : [];
            const localIds = localItems.map(x => x.id);
            const deletedIds = remoteIds.filter(id => id && !localIds.includes(id));
            for (const delId of deletedIds) {
              console.log(`[Firebase Sync] Deleting remote item: ${path}/${delId}`);
              await deleteDoc(doc(colRef, delId));
            }
          } catch (e) {
            console.error("Error parsing previous remote list IDs in sync:", e);
          }
        }
        lastCloudSigs.current[path] = localSig;
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `erp_company_data/shared_workspace/${path}`);
      } finally {
        setTimeout(() => {
          isWritingToCloud.current[path] = false;
        }, 1200);
      }
    }
  };

  useEffect(() => { syncLocalToCloud('bookings', bookings); }, [bookings]);
  useEffect(() => { syncLocalToCloud('pis', pis); }, [pis]);
  useEffect(() => { syncLocalToCloud('challans', challans); }, [challans]);
  useEffect(() => { syncLocalToCloud('banks', banks); }, [banks]);
  useEffect(() => { syncLocalToCloud('suppliers', suppliers); }, [suppliers]);
  useEffect(() => { syncLocalToCloud('work_orders', workOrders); }, [workOrders]);
  useEffect(() => { syncLocalToCloud('sup_payments', payments); }, [payments]);
  useEffect(() => { syncLocalToCloud('conveyances', conveyances); }, [conveyances]);
  useEffect(() => { syncLocalToCloud('products', products); }, [products]);
  useEffect(() => { syncLocalToCloud('manual_bills', manualBills); }, [manualBills]);
  useEffect(() => { syncLocalToCloud('jobcards', jobCards); }, [jobCards]);
  useEffect(() => { syncLocalToCloud('commercial_invoices', commercialInvoices); }, [commercialInvoices]);
  useEffect(() => { syncLocalToCloud('quotations', quotations); }, [quotations]);
  useEffect(() => { syncLocalToCloud('lc_history', lcHistory); }, [lcHistory]);
  useEffect(() => { syncLocalToCloud('buyer_payments', buyerPayments); }, [buyerPayments]);
  useEffect(() => { syncLocalToCloud('employees', employees); }, [employees]);
  useEffect(() => { syncLocalToCloud('payrolls', payrolls); }, [payrolls]);
  useEffect(() => { syncLocalToCloud('website_pages', websitePages); }, [websitePages]);
  useEffect(() => { syncLocalToCloud('registered_clients', registeredClients); }, [registeredClients]);

  const checkDriveFile = async (token: string) => {
    try {
      const info = await findBackupFile(token);
      setCloudFileInfo(info);
    } catch (err: any) {
      console.error('Error finding backup file:', err);
    }
  };

  const handleCopyDomain = () => {
    try {
      navigator.clipboard.writeText(window.location.hostname);
      setCopiedDomain(true);
      setTimeout(() => setCopiedDomain(false), 2000);
    } catch (e) {
      console.error("Clipboard copy failed", e);
    }
  };

  const handleCloudLogin = async () => {
    setSyncStatus('syncing');
    setCloudErrorMsg(null);
    try {
      const res = await googleSignIn();
      if (res) {
        setCurrentUser(res.user);
        setCloudToken(res.accessToken);
        await checkDriveFile(res.accessToken);
        setSyncStatus('success');
        setTimeout(() => setSyncStatus('idle'), 3000);
      }
    } catch (err: any) {
      setSyncStatus('error');
      setCloudErrorMsg(err.message || 'Login failed');
    }
  };

  const handleCloudLogout = async () => {
    try {
      await googleSignOut();
      setCurrentUser(null);
      setCloudToken(null);
      setCloudFileInfo(null);
    } catch (err: any) {
      console.error('Logout error:', err);
    }
  };

  const handleBackupToCloud = async () => {
    const token = cloudToken;
    if (!token) {
      setCloudErrorMsg('Please link your Google account first!');
      return;
    }
    setSyncStatus('syncing');
    setCloudErrorMsg(null);
    try {
      const backupData: ERPBackupData = {
        bookings,
        pis,
        challans,
        banks,
        suppliers,
        workOrders,
        payments,
        conveyances,
        manualBills,
        jobCards,
        commercialInvoices,
        products,
        updatedAt: new Date().toISOString()
      };
      await uploadBackupFileToDrive(token, backupData);
      
      const nowString = new Date().toLocaleString();
      setLastSyncTime(nowString);
      localStorage.setItem('acoola_last_sync_time', nowString);
      
      // Update signature so auto-sync knows we are in sync
      const backupSig = JSON.stringify({
        bookings,
        pis,
        challans,
        banks,
        suppliers,
        workOrders,
        payments,
        conveyances,
        manualBills,
        jobCards,
        commercialInvoices,
        products
      });
      setLastSyncedSignature(backupSig);
      localStorage.setItem('acoola_last_synced_signature', backupSig);
      
      await checkDriveFile(token);
      setSyncStatus('success');
      setTimeout(() => setSyncStatus('idle'), 3000);
    } catch (err: any) {
      setSyncStatus('error');
      setCloudErrorMsg(err.message || 'Backup failed');
    }
  };

  const handleRestoreFromCloud = async () => {
    const token = cloudToken;
    if (!token) {
      setCloudErrorMsg('Please link your Google account first!');
      return;
    }
    if (!cloudFileInfo?.id) {
      setCloudErrorMsg('No backup file found on your Google Drive to restore.');
      return;
    }

    const confirmRestore = window.confirm(
      'আপনি কি গুগল ড্রাইভ ব্যাকআপ থেকে ডাটা রিস্টোর করতে চান? এটি আপনার কম্পিউটারের বর্তমান ডাটা সম্পূর্ণরূপে মুছে নতুন ডাটা রিস্টোর করবে।'
    );
    if (!confirmRestore) return;

    setSyncStatus('restoring');
    setCloudErrorMsg(null);
    try {
      const data = await downloadBackupFileFromDrive(token, cloudFileInfo.id);
      if (data) {
        if (Array.isArray(data.bookings)) setBookings(data.bookings);
        if (Array.isArray(data.pis)) setPis(data.pis);
        if (Array.isArray(data.challans)) setChallans(data.challans);
        if (Array.isArray(data.banks)) setBanks(data.banks);
        if (Array.isArray(data.suppliers)) setSuppliers(data.suppliers);
        if (Array.isArray(data.workOrders)) setWorkOrders(data.workOrders);
        if (Array.isArray(data.payments)) setPayments(data.payments);
        if (Array.isArray(data.conveyances)) setConveyances(data.conveyances);
        if (Array.isArray(data.manualBills)) setManualBills(data.manualBills);
        if (Array.isArray(data.jobCards)) setJobCards(data.jobCards);
        if (Array.isArray(data.commercialInvoices)) setCommercialInvoices(data.commercialInvoices);
        if (Array.isArray(data.products)) setProducts(data.products);
        
        // Update signature with restored state
        const restoredSig = JSON.stringify({
          bookings: data.bookings || [],
          pis: data.pis || [],
          challans: data.challans || [],
          banks: data.banks || [],
          suppliers: data.suppliers || [],
          workOrders: data.workOrders || [],
          payments: data.payments || [],
          conveyances: data.conveyances || [],
          manualBills: data.manualBills || [],
          jobCards: data.jobCards || [],
          commercialInvoices: data.commercialInvoices || [],
          products: data.products || []
        });
        setLastSyncedSignature(restoredSig);
        localStorage.setItem('acoola_last_synced_signature', restoredSig);

        alert('ডাটা সফলভাবে গুগল ড্রাইভ থেকে রিস্টোর করা হয়েছে!');
        setSyncStatus('success');
        setTimeout(() => setSyncStatus('idle'), 3000);
        setShowCloudModal(false);
      } else {
        throw new Error('Retrieved data payload is empty or invalid.');
      }
    } catch (err: any) {
      setSyncStatus('error');
      setCloudErrorMsg(err.message || 'Restore failed');
    }
  };

  // Persist back to LocalStorage whenever structures change
  useEffect(() => {
    localStorage.setItem('acoola_bookings', JSON.stringify(bookings));
  }, [bookings]);

  useEffect(() => {
    localStorage.setItem('acoola_pis', JSON.stringify(pis));
  }, [pis]);

  useEffect(() => {
    localStorage.setItem('acoola_challans', JSON.stringify(challans));
  }, [challans]);

  useEffect(() => {
    localStorage.setItem('acoola_banks', JSON.stringify(banks));
  }, [banks]);

  useEffect(() => {
    localStorage.setItem('acoola_suppliers', JSON.stringify(suppliers));
  }, [suppliers]);

  useEffect(() => {
    localStorage.setItem('acoola_work_orders', JSON.stringify(workOrders));
  }, [workOrders]);

  useEffect(() => {
    localStorage.setItem('acoola_sup_payments', JSON.stringify(payments));
  }, [payments]);

  useEffect(() => {
    localStorage.setItem('acoola_conveyances', JSON.stringify(conveyances));
  }, [conveyances]);

  useEffect(() => {
    localStorage.setItem('acoola_products', JSON.stringify(products));
  }, [products]);

  useEffect(() => {
    localStorage.setItem('acoola_manual_bills', JSON.stringify(manualBills));
  }, [manualBills]);

  useEffect(() => {
    localStorage.setItem('acoola_website_pages', JSON.stringify(websitePages));
  }, [websitePages]);

  useEffect(() => {
    localStorage.setItem('acoola_jobcards', JSON.stringify(jobCards));
  }, [jobCards]);

  useEffect(() => {
    localStorage.setItem('acoola_commercial_invoices', JSON.stringify(commercialInvoices));
  }, [commercialInvoices]);

  // Autocomplete collection builders dynamically calculated from active content
  const autoGarments = useMemo(() => bookings.map(b => b.factoryName || ''), [bookings]);
  const autoBuyers = useMemo(() => bookings.map(b => b.buyerName || ''), [bookings]);
  const autoPos = useMemo(() => bookings.map(b => b.poNumber || ''), [bookings]);
  const autoStyles = useMemo(() => bookings.map(b => b.styleNumber || ''), [bookings]);
  const autoAddresses = useMemo(() => bookings.map(b => b.deliveryAddress || ''), [bookings]);

  // Analytics helper metrics
  const totalBookingsValue = useMemo(() => {
    return bookings.reduce((sum, b) => {
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
      return sum + bkVal;
    }, 0);
  }, [bookings]);

  const totalDeliveredValue = useMemo(() => {
    const deliveredChallans = challans.filter(c => c.status === 'Delivered');
    return deliveredChallans.reduce((sum, c) => {
      return sum + (c.items || []).reduce((acc, item) => acc + ((item.totalQuantity || 0) * (item.unitPrice || 0)), 0);
    }, 0);
  }, [challans]);

  const activePisCount = useMemo(() => {
    return pis.filter(p => !p.isPurchased).length;
  }, [pis]);

  const totalInvoicedValue = useMemo(() => {
    const active = pis.filter(p => !p.isPurchased);
    return active.reduce((sum, p) => {
      return sum + (p.items || []).reduce((acc, item) => acc + ((item.totalQuantity || 0) * (item.unitPrice || 0)), 0);
    }, 0);
  }, [pis]);

  const activeBankShortForms = useMemo(() => {
    return banks.map(b => {
      const name = b.bankName;
      if (name.toLowerCase().includes("mutual trust")) return "MTB";
      if (name.toLowerCase().includes("dhaka bank")) return "Dhaka Bank";
      if (name.toLowerCase().includes("islami bank")) return "IBBL";
      if (name.toLowerCase().includes("eastern bank")) return "EBL";
      if (b.swiftCode && b.swiftCode.length >= 4) {
        const potential = b.swiftCode.substring(0, 4).toUpperCase();
        if (potential && !potential.includes("X")) return potential;
      }
      const filtered = name.replace(/\b(PLC|Ltd|Limited|Corporation|Bank|Plc)\b/gi, '').trim();
      const parts = filtered.split(/\s+/).filter(w => w.length > 0);
      if (parts.length > 0) {
        if (parts.length === 1) return parts[0];
        return parts.map(w => w[0].toUpperCase()).join('');
      }
      return name;
    }).join(' & ');
  }, [banks]);

  // Supplier and Conveyance statistics calculations for Dashboard Metrics
  const totalSuppliersOutstandingDue = useMemo(() => {
    const ordersTotal = workOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    const paysTotal = payments.reduce((sum, p) => sum + p.amount, 0);
    return ordersTotal - paysTotal;
  }, [workOrders, payments]);

  const conveyanceStats = useMemo(() => {
    let dueSum = 0;
    let jomaSum = 0;
    conveyances.forEach(c => {
      if (c.type === 'Due') {
        dueSum += c.amount;
      } else {
        jomaSum += c.amount;
      }
    });
    return {
      totalDue: dueSum,
      totalJoma: jomaSum,
      netOutstandingDue: Math.max(0, dueSum - jomaSum)
    };
  }, [conveyances]);

  // CRUD actions handlers
  const handleSaveBooking = (booking: Booking) => {
    if (editingBooking) {
      setBookings(prev => prev.map(b => b.id === booking.id ? booking : b));
    } else {
      setBookings(prev => [booking, ...prev]);
    }
    setEditingBooking(null);
    setActiveTab('bookings');
  };

  const handleUpdateBookingStatus = (id: string, status: 'Pending' | 'Delivered') => {
    setBookings(prev => prev.map(b => b.id === id ? { ...b, status } : b));
  };

  const handleEditBookingClick = (booking: Booking) => {
    setEditingBooking(booking);
    setActiveTab('booking-form');
  };

  const handleDeleteBooking = (id: string) => {
    setBookings(prev => prev.filter(b => b.id !== id));
  };

  const handleDuplicateBooking = (booking: Booking) => {
    const deepClone: Booking = JSON.parse(JSON.stringify(booking));
    deepClone.id = `bk-${Date.now()}`;
    deepClone.createdAt = new Date().toISOString();
    setBookings(prev => [deepClone, ...prev]);
  };

  const handleStartDocBuild = (selBookings: Booking[], type: 'pi' | 'challan') => {
    setDocBuilderConfig({ bookings: selBookings, type });
    setActiveTab('doc-builder');
  };

  const handleGeneratePi = (newPi: ProformaInvoice) => {
    setPis(prev => [newPi, ...prev]);
    setDocBuilderConfig(null);
    setActiveTab('pis');
  };

  const handleGenerateChallan = (newChallan: DeliveryChallan) => {
    setChallans(prev => [newChallan, ...prev]);
    setDocBuilderConfig(null);
    setActiveTab('challans');
  };

   // Callback to allow updating PI line items & weights on the fly
   const handleUpdatePiItems = (
     piId: string, 
     updatedItems: DocumentItem[], 
     netWeight?: string, 
     grossWeight?: string, 
     terms?: string[],
     invoiceNo?: string,
     date?: string
   ) => {
     setPis(prev => prev.map(p => {
       if (p.id === piId) {
         return {
           ...p,
           items: updatedItems,
           netWeight: netWeight !== undefined ? netWeight : p.netWeight,
           grossWeight: grossWeight !== undefined ? grossWeight : p.grossWeight,
           terms: terms !== undefined ? terms : p.terms,
           invoiceNo: invoiceNo !== undefined ? invoiceNo : p.invoiceNo,
           date: date !== undefined ? date : p.date
         };
       }
       return p;
     }));
   };

  const handleUpdateChallanStatus = (id: string, status: 'Pending' | 'Delivered') => {
    setChallans(prev => prev.map(ch => ch.id === id ? { ...ch, status } : ch));
  };

  const handleUpdateChallan = (updatedChallan: DeliveryChallan) => {
    setChallans(prev => prev.map(ch => ch.id === updatedChallan.id ? updatedChallan : ch));
  };

  const handleDeletePi = (id: string) => {
    setPis(prev => prev.filter(p => p.id !== id));
  };

  const handleDeleteChallan = (id: string) => {
    setChallans(prev => prev.filter(c => c.id !== id));
  };

  const handleAddChallan = (newChallan: DeliveryChallan) => {
    setChallans(prev => [newChallan, ...prev]);
  };

  const handleTogglePurchasePi = (id: string) => {
    setPis(prev => prev.map(p => p.id === id ? { ...p, isPurchased: !p.isPurchased } : p));
  };

  // Custom bank callbacks
  const handleAddBank = (newBank: Omit<BankDetails, 'id'>) => {
    const bankWithId: BankDetails = {
      ...newBank,
      id: `bank-${Date.now()}`
    };
    setBanks(prev => [...prev, bankWithId]);
  };

  const handleUpdateBank = (updated: BankDetails) => {
    setBanks(prev => prev.map(b => b.id === updated.id ? updated : b));
  };

  const handleDeleteBank = (id: string) => {
    setBanks(prev => prev.filter(b => b.id !== id));
  };

  // Supplier Core Callbacks
  const handleAddSupplier = (newSup: Omit<Supplier, 'id'>) => {
    const withId: Supplier = {
      ...newSup,
      id: `sup-${Date.now()}`
    };
    setSuppliers(prev => [...prev, withId]);
  };

  const handleUpdateSupplier = (updated: Supplier) => {
    setSuppliers(prev => prev.map(s => s.id === updated.id ? updated : s));
  };

  const handleDeleteSupplier = (id: string) => {
    setSuppliers(prev => prev.filter(s => s.id !== id));
    // Cascade delete workOrders and payments associated with this supplier for data integrity
    setWorkOrders(prev => prev.filter(w => w.supplierId !== id));
    setPayments(prev => prev.filter(p => p.supplierId !== id));
  };

  const handleAddWorkOrder = (newWo: Omit<SupplierWorkOrder, 'id'>) => {
    const withId: SupplierWorkOrder = {
      ...newWo,
      id: `wo-${Date.now()}`
    };
    setWorkOrders(prev => [withId, ...prev]);
  };

  const handleDeleteWorkOrder = (id: string) => {
    setWorkOrders(prev => prev.filter(w => w.id !== id));
  };

  const handleAddPayment = (newPay: Omit<SupplierPayment, 'id'>) => {
    const withId: SupplierPayment = {
      ...newPay,
      id: `pay-${Date.now()}`
    };
    setPayments(prev => [withId, ...prev]);
  };

  const handleDeletePayment = (id: string) => {
    setPayments(prev => prev.filter(p => p.id !== id));
  };

  const handleUpdateWorkOrder = (updated: SupplierWorkOrder) => {
    setWorkOrders(prev => prev.map(w => w.id === updated.id ? updated : w));
  };

  // Office Conveyance Callbacks
  const handleAddConveyance = (newConv: Omit<ConveyanceEntry, 'id' | 'createdAt'>) => {
    const withId: ConveyanceEntry = {
      ...newConv,
      id: `conv-${Date.now()}`,
      createdAt: new Date().toISOString(),
      createdBy: sessionUser?.email || ''
    };
    setConveyances(prev => [withId, ...prev]);
  };

  const handleUpdateConveyance = (updated: ConveyanceEntry) => {
    setConveyances(prev => prev.map(c => c.id === updated.id ? updated : c));
  };

  const handleDeleteConveyance = (id: string) => {
    setConveyances(prev => prev.filter(c => c.id !== id));
  };

  // Trigger reset verification popup
  const handleResetDatabase = () => {
    setShowResetConfirmModal(true);
  };

  const handleConfirmReset = () => {
    localStorage.removeItem('acoola_bookings');
    localStorage.removeItem('acoola_pis');
    localStorage.removeItem('acoola_challans');
    localStorage.removeItem('acoola_banks');
    localStorage.removeItem('acoola_suppliers');
    localStorage.removeItem('acoola_work_orders');
    localStorage.removeItem('acoola_sup_payments');
    localStorage.removeItem('acoola_conveyances');
    
    setBookings([]);
    setPis([]);
    setChallans([]);
    setBanks(DEFAULT_BANKS);
    setSuppliers(INITIAL_SUPPLIERS);
    setWorkOrders(INITIAL_WORK_ORDERS);
    setPayments(INITIAL_SUP_PAYMENTS);
    setConveyances([]);
    
    setEditingBooking(null);
    setDocBuilderConfig(null);
    setActiveTab('bookings');
    setShowResetConfirmModal(false);
  };

  const globalSearchResults = useMemo(() => {
    if (!globalSearchQuery.trim()) return [];
    const q = globalSearchQuery.toLowerCase();
    const results: Array<{
      id: string;
      title: string;
      subtitle: string;
      category: string;
      tab: string;
    }> = [];

    // 1. Search Bookings
    bookings.forEach(b => {
      if (
        b.id.toLowerCase().includes(q) ||
        (b.poNumber && b.poNumber.toLowerCase().includes(q)) ||
        (b.styleNumber && b.styleNumber.toLowerCase().includes(q)) ||
        (b.buyerName && b.buyerName.toLowerCase().includes(q)) ||
        (b.factoryName && b.factoryName.toLowerCase().includes(q)) ||
        (b.itemName && b.itemName.toLowerCase().includes(q))
      ) {
        results.push({
          id: `b-${b.id}`,
          title: `Booking: ${b.poNumber || 'N/A'} - ${b.styleNumber || 'Style'}`,
          subtitle: `Buyer: ${b.buyerName} | Factory: ${b.factoryName} | Qty: ${b.quantity} ${b.sizeWise ? '(Size-wise)' : ''}`,
          category: 'Bookings (বুকিং)',
          tab: 'bookings'
        });
      }
    });

    // 2. Search PIs
    pis.forEach(pi => {
      if (
        pi.invoiceNo.toLowerCase().includes(q) ||
        pi.buyerName.toLowerCase().includes(q) ||
        (pi.exporterName && pi.exporterName.toLowerCase().includes(q))
      ) {
        results.push({
          id: `pi-${pi.id}`,
          title: `PI: ${pi.invoiceNo}`,
          subtitle: `Buyer: ${pi.buyerName} | Date: ${pi.date} | Total items: ${pi.items.length}`,
          category: 'Proforma Invoices (প্রোফর্মা ইনভয়েস)',
          tab: 'pis'
        });
      }
    });

    // 3. Search Challans
    challans.forEach(ch => {
      if (
        ch.challanNo.toLowerCase().includes(q) ||
        ch.buyerName.toLowerCase().includes(q) ||
        ch.factoryName.toLowerCase().includes(q)
      ) {
        results.push({
          id: `ch-${ch.id}`,
          title: `Challan: ${ch.challanNo}`,
          subtitle: `Buyer: ${ch.buyerName} | Factory: ${ch.factoryName} | Date: ${ch.date}`,
          category: 'Delivery Challans (চালান)',
          tab: 'challans'
        });
      }
    });

    // 4. Search Products Catalogue
    products.forEach(p => {
      if (
        p.name.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q))
      ) {
        results.push({
          id: `p-${p.id}`,
          title: `Product: ${p.name} (${p.code})`,
          subtitle: `Category: ${p.category} | Price: ${p.currency === 'BDT' ? '৳' : '$'}${p.unitPrice.toFixed(4)}`,
          category: 'Products Catalogue (প্রোডাক্ট ক্যাটালগ)',
          tab: 'products-catalogue'
        });
      }
    });

    // 5. Search Suppliers
    suppliers.forEach(s => {
      if (
        s.name.toLowerCase().includes(q) ||
        (s.companyName && s.companyName.toLowerCase().includes(q)) ||
        (s.contactPerson && s.contactPerson.toLowerCase().includes(q)) ||
        (s.phone && s.phone.toLowerCase().includes(q))
      ) {
        results.push({
          id: `s-${s.id}`,
          title: `Supplier: ${s.name}`,
          subtitle: `Company: ${s.companyName || 'N/A'} | Contact: ${s.contactPerson || 'N/A'} | Phone: ${s.phone || 'N/A'}`,
          category: 'Suppliers (সরবরাহকারী)',
          tab: 'suppliers'
        });
      }
    });

    // 6. Search Manual Bills
    manualBills.forEach(mb => {
      if (
        mb.invoiceNo.toLowerCase().includes(q) ||
        mb.clientName.toLowerCase().includes(q)
      ) {
        results.push({
          id: `mb-${mb.id}`,
          title: `Invoice Bill: ${mb.invoiceNo}`,
          subtitle: `Client: ${mb.clientName} | Amount: ${mb.currency === 'BDT' ? '৳' : '$'}${mb.totalAmount} | Status: ${mb.paymentStatus}`,
          category: 'Direct Invoice Bills (বিল)',
          tab: 'invoice-bill'
        });
      }
    });

    return results.slice(0, 15);
  }, [globalSearchQuery, bookings, pis, challans, products, suppliers, manualBills]);

  if (viewMode === 'website' || viewMode === 'client-portal' || !sessionUser) {
    return (
      <CorporateWebsite
        userAccounts={userAccounts}
        sessionUser={sessionUser}
        pagesConfigs={websitePages}
        products={products}
        jobOpportunities={jobOpportunities}
        onAddJobApplication={handleAddJobApplication}
        onLoginSuccess={(user) => {
          setSessionUser(user);
          setViewMode('erp');
        }}
        onLogout={() => {
          setSessionUser(null);
          localStorage.removeItem('acoola_session_user');
          setViewMode('website');
        }}
        viewMode={viewMode}
        setViewMode={setViewMode}
        companyProfile={companyProfile}
        quotations={quotations}
        registeredClients={registeredClients}
        setRegisteredClients={setRegisteredClients}
      />
    );
  }

  return (
    <div className="min-h-screen md:h-screen bg-[#f1f5f9] text-slate-900 font-sans flex flex-col md:flex-row print:bg-white print:text-black overflow-x-hidden md:overflow-hidden" id="acoola-app-root">
      
      {/* Left Sidebar - High Density Dark Mode Theme */}
      <aside className="w-full md:w-64 bg-slate-950 text-white flex flex-col shrink-0 border-r border-slate-900 print:hidden shadow-xl md:h-full" id="company-sidebar">
        {/* Sidebar Header Block */}
        <div className="p-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            {COMPANY_PROFILE.logo ? (
              <div className="w-10 h-10 bg-white p-1 rounded-lg shrink-0 flex items-center justify-center overflow-hidden shadow-sm">
                <img src={COMPANY_PROFILE.logo} alt="Brand Logo" className="max-w-full max-h-full object-contain" />
              </div>
            ) : (
              <div className="bg-[#007d46] text-white p-2 rounded-lg shrink-0">
                <Building2 className="w-5 h-5" />
              </div>
            )}
            <div>
              <h1 className="text-xs font-black tracking-wider text-emerald-400 font-display uppercase leading-tight select-none">
                {COMPANY_PROFILE.name}
              </h1>
              <p className="text-[9px] text-slate-450 uppercase tracking-widest leading-none mt-1 font-semibold">
                ERP SYSTEM v2.1
              </p>
            </div>
          </div>
        </div>

        {/* Sidebar Interactive Navigation Menu */}
        <nav className="flex-1 p-3.5 space-y-1.5 overflow-y-auto" id="sidebar-nav">
          <span className="block text-[9px] uppercase font-bold text-slate-500 tracking-wider mb-2 px-2.5">Core Operations</span>
          
          {hasTabAccess('dashboard') && (
            <button
              onClick={() => { setActiveTab('dashboard'); setEditingBooking(null); }}
              className={`w-full text-left px-3 py-2 rounded text-xs font-semibold flex items-center justify-between transition-all cursor-pointer ${
                activeTab === 'dashboard'
                  ? 'bg-emerald-600 text-white shadow-md font-bold'
                  : 'text-slate-350 hover:bg-slate-900 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2">
                <LayoutDashboard className="w-4 h-4 text-emerald-400" />
                <span>Dashboard Overview</span>
              </div>
              {activeTab === 'dashboard' && (
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
              )}
            </button>
          )}

          {hasTabAccess('bookings') && (
            <button
              onClick={() => { setActiveTab('bookings'); setEditingBooking(null); }}
              className={`w-full text-left px-3 py-2 rounded text-xs font-semibold flex items-center justify-between transition-all cursor-pointer ${
                activeTab === 'bookings'
                  ? 'bg-emerald-600 text-white shadow-md font-bold'
                  : 'text-slate-350 hover:bg-slate-900 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-400" />
                <span>Booking Directory</span>
              </div>
              {activeTab === 'bookings' && (
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
              )}
            </button>
          )}

          {hasTabAccess('booking-form') && (
            <button
              onClick={() => { setEditingBooking(null); setActiveTab('booking-form'); }}
              className={`w-full text-left px-3 py-2 rounded text-xs font-semibold flex items-center justify-between transition-all cursor-pointer ${
                activeTab === 'booking-form'
                  ? 'bg-emerald-600 text-white shadow-md font-bold'
                  : 'text-slate-350 hover:bg-slate-900 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-450" />
                <span>New Booking Entry</span>
              </div>
              {activeTab === 'booking-form' && (
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
              )}
            </button>
          )}

          {hasTabAccess('challans') && (
            <button
              onClick={() => setActiveTab('challans')}
              className={`w-full text-left px-3 py-2 rounded text-xs font-semibold flex items-center justify-between transition-all cursor-pointer ${
                activeTab === 'challans'
                  ? 'bg-emerald-600 text-white shadow-md font-bold'
                  : 'text-slate-350 hover:bg-slate-900 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-emerald-400" />
                <span>Delivery Challans</span>
              </div>
              {activeTab === 'challans' && (
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
              )}
            </button>
          )}

          {hasTabAccess('pis') && (
            <button
              onClick={() => setActiveTab('pis')}
              className={`w-full text-left px-3 py-2 rounded text-xs font-semibold flex items-center justify-between transition-all cursor-pointer ${
                activeTab === 'pis'
                  ? 'bg-emerald-600 text-white shadow-md font-bold'
                  : 'text-slate-350 hover:bg-slate-900 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                <span>Proforma Invoices (PI)</span>
              </div>
              {activeTab === 'pis' && (
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
              )}
            </button>
          )}

          {hasTabAccess('invoice-bill') && (
            <button
              onClick={() => setActiveTab('invoice-bill')}
              className={`w-full text-left px-3 py-2 rounded text-xs font-semibold flex items-center justify-between transition-all cursor-pointer ${
                activeTab === 'invoice-bill'
                  ? 'bg-emerald-600 text-white shadow-md font-bold'
                  : 'text-slate-350 hover:bg-slate-900 hover:text-white'
              }`}
              id="invoice-bill-tab-btn"
            >
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-emerald-450" />
                <span>Invoice / Bill Name</span>
              </div>
              {activeTab === 'invoice-bill' && (
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
              )}
            </button>
          )}

          {hasTabAccess('products-catalogue') && (
            <button
              onClick={() => setActiveTab('products-catalogue')}
              className={`w-full text-left px-3 py-2 rounded text-xs font-semibold flex items-center justify-between transition-all cursor-pointer ${
                activeTab === 'products-catalogue'
                  ? 'bg-emerald-600 text-white shadow-md font-bold'
                  : 'text-slate-350 hover:bg-slate-900 hover:text-white'
              }`}
              id="product-catalogue-tab-btn"
            >
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-emerald-400" />
                <span>Product Catalogue</span>
              </div>
              {activeTab === 'products-catalogue' && (
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
              )}
            </button>
          )}

          {hasTabAccess('customer-profiles') && (
            <button
              onClick={() => setActiveTab('customer-profiles')}
              className={`w-full text-left px-3 py-2 rounded text-xs font-semibold flex items-center justify-between transition-all cursor-pointer ${
                activeTab === 'customer-profiles'
                  ? 'bg-emerald-600 text-white shadow-md font-bold'
                  : 'text-slate-350 hover:bg-slate-900 hover:text-white'
              }`}
              id="customer-profiles-tab-btn"
            >
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-400" />
                <span>Customer Profiles</span>
              </div>
              {activeTab === 'customer-profiles' && (
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
              )}
            </button>
          )}

          {hasTabAccess('banks') && (
            <button
              onClick={() => setActiveTab('banks')}
              className={`w-full text-left px-3 py-2 rounded text-xs font-semibold flex items-center justify-between transition-all cursor-pointer ${
                activeTab === 'banks'
                  ? 'bg-emerald-600 text-white shadow-md font-bold'
                  : 'text-slate-350 hover:bg-slate-900 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2">
                <Landmark className="w-4 h-4 text-emerald-400" />
                <span>Corporate Banks</span>
              </div>
              {activeTab === 'banks' && (
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
              )}
            </button>
          )}

          {hasTabAccess('suppliers') && (
            <button
              onClick={() => setActiveTab('suppliers')}
              className={`w-full text-left px-3 py-2 rounded text-xs font-semibold flex items-center justify-between transition-all cursor-pointer ${
                activeTab === 'suppliers'
                  ? 'bg-emerald-600 text-white shadow-md font-bold'
                  : 'text-slate-355 hover:bg-slate-900 hover:text-white'
              }`}
              id="supplier-tab-btn"
            >
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-emerald-450" />
                <span>Supplier Hub</span>
              </div>
              {activeTab === 'suppliers' && (
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
              )}
            </button>
          )}

          {hasTabAccess('conveyance') && (
            <button
              onClick={() => setActiveTab('conveyance')}
              className={`w-full text-left px-3 py-2 rounded text-xs font-semibold flex items-center justify-between transition-all cursor-pointer ${
                activeTab === 'conveyance'
                  ? 'bg-emerald-600 text-white shadow-md font-bold'
                  : 'text-slate-350 hover:bg-slate-900 hover:text-white'
              }`}
              id="conveyance-tab-btn"
            >
              <div className="flex items-center gap-2">
                <Coins className="w-4 h-4 text-emerald-400" />
                <span>Conveyance Hub</span>
              </div>
              {activeTab === 'conveyance' && (
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
              )}
            </button>
          )}

          <span className="block text-[9px] uppercase font-bold text-slate-500 tracking-wider mb-2 mt-4 px-2.5">Finance &amp; HR Ops</span>

          {hasTabAccess('job-cards') && (
            <button
              onClick={() => setActiveTab('job-cards')}
              className={`w-full text-left px-3 py-2 rounded text-xs font-semibold flex items-center justify-between transition-all cursor-pointer ${
                activeTab === 'job-cards'
                  ? 'bg-emerald-600 text-white shadow-md font-bold'
                  : 'text-slate-350 hover:bg-slate-900 hover:text-white'
              }`}
              id="jobcard-tab-btn"
            >
              <div className="flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-emerald-400" />
                <span>Production Job Cards</span>
              </div>
              {activeTab === 'job-cards' && (
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
              )}
            </button>
          )}

          {hasTabAccess('lc-documents') && (
            <button
              onClick={() => setActiveTab('lc-documents')}
              className={`w-full text-left px-3 py-2 rounded text-xs font-semibold flex items-center justify-between transition-all cursor-pointer ${
                activeTab === 'lc-documents'
                  ? 'bg-emerald-600 text-white shadow-md font-bold'
                  : 'text-slate-350 hover:bg-slate-900 hover:text-white'
              }`}
              id="lc-documents-tab-btn"
            >
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-450" />
                <span className="font-extrabold text-[11px] text-emerald-300">📜 LC Documents Pack</span>
              </div>
              {activeTab === 'lc-documents' && (
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
              )}
            </button>
          )}

          {hasTabAccess('quote-builder') && (
            <button
              onClick={() => setActiveTab('quote-builder')}
              className={`w-full text-left px-3 py-2 rounded text-xs font-semibold flex items-center justify-between transition-all cursor-pointer ${
                activeTab === 'quote-builder'
                  ? 'bg-emerald-600 text-white shadow-md font-bold'
                  : 'text-slate-350 hover:bg-slate-900 hover:text-white'
              }`}
              id="quote-builder-tab-btn"
            >
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-400" />
                <span className="font-extrabold text-[11px] text-amber-300">💰 Price Quotation</span>
              </div>
              {activeTab === 'quote-builder' && (
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
              )}
            </button>
          )}

          {hasTabAccess('party-ledger') && (
            <button
              onClick={() => setActiveTab('party-ledger')}
              className={`w-full text-left px-3 py-2 rounded text-xs font-semibold flex items-center justify-between transition-all cursor-pointer ${
                activeTab === 'party-ledger'
                  ? 'bg-emerald-600 text-white shadow-md font-bold'
                  : 'text-slate-350 hover:bg-slate-900 hover:text-white'
              }`}
              id="party-ledger-tab-btn"
            >
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-emerald-450" />
                <span>Party Ledger &amp; Due Aging</span>
              </div>
              {activeTab === 'party-ledger' && (
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
              )}
            </button>
          )}

          {hasTabAccess('payroll') && (
            <button
              onClick={() => setActiveTab('payroll')}
              className={`w-full text-left px-3 py-2 rounded text-xs font-semibold flex items-center justify-between transition-all cursor-pointer ${
                activeTab === 'payroll'
                  ? 'bg-emerald-600 text-white shadow-md font-bold'
                  : 'text-slate-350 hover:bg-slate-900 hover:text-white'
              }`}
              id="payroll-tab-btn"
            >
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-400" />
                <span>Corporate Staff Payroll</span>
              </div>
              {activeTab === 'payroll' && (
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
              )}
            </button>
          )}

          {hasTabAccess('money-receipts') && (
            <button
              onClick={() => setActiveTab('money-receipts')}
              className={`w-full text-left px-3 py-2 rounded text-xs font-semibold flex items-center justify-between transition-all cursor-pointer ${
                activeTab === 'money-receipts'
                  ? 'bg-emerald-600 text-white shadow-md font-bold'
                  : 'text-slate-350 hover:bg-slate-900 hover:text-white'
              }`}
              id="money-receipts-tab-btn"
            >
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-emerald-450 animate-pulse" />
                <span className="font-extrabold text-[11px] text-emerald-300">💵 Money Receipt Gen</span>
              </div>
              {activeTab === 'money-receipts' && (
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
              )}
            </button>
          )}

          {hasTabAccess('careers-erp') && (
            <button
              onClick={() => setActiveTab('careers-erp')}
              className={`w-full text-left px-3 py-2 rounded text-xs font-semibold flex items-center justify-between transition-all cursor-pointer ${
                activeTab === 'careers-erp'
                  ? 'bg-emerald-600 text-white shadow-md font-bold'
                  : 'text-slate-350 hover:bg-slate-900 hover:text-white'
              }`}
              id="careers-erp-tab-btn"
            >
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-emerald-400" />
                <span>Careers &amp; Recruiting</span>
              </div>
              {activeTab === 'careers-erp' && (
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
              )}
            </button>
          )}

          {hasTabAccess('attendance-logs') && (
            <button
              onClick={() => setActiveTab('attendance-logs')}
              className={`w-full text-left px-3 py-2 rounded text-xs font-semibold flex items-center justify-between transition-all cursor-pointer ${
                activeTab === 'attendance-logs'
                  ? 'bg-emerald-600 text-white shadow-md font-bold'
                  : 'text-slate-350 hover:bg-slate-900 hover:text-white'
              }`}
              id="attendance-logs-tab-btn"
            >
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-emerald-400" />
                <span>Biometric Attendance Link</span>
              </div>
              {activeTab === 'attendance-logs' && (
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
              )}
            </button>
          )}

          {hasTabAccess('profile-updates') && (
            <button
              onClick={() => setActiveTab('profile-updates')}
              className={`w-full text-left px-3 py-2 rounded text-xs font-semibold flex items-center justify-between transition-all cursor-pointer ${
                activeTab === 'profile-updates'
                  ? 'bg-emerald-600 text-white shadow-md font-bold'
                  : 'text-slate-350 hover:bg-slate-900 hover:text-white'
              }`}
              id="profile-updates-tab-btn"
            >
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400 animate-pulse" />
                <span>System Profile Updates</span>
              </div>
              {activeTab === 'profile-updates' && (
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
              )}
            </button>
          )}

          {(hasTabAccess('website-pages') || sessionUser?.isMasterAdmin) && (
            <button
              onClick={() => setActiveTab('website-pages')}
              className={`w-full text-left px-3 py-2 rounded text-xs font-semibold flex items-center justify-between transition-all cursor-pointer ${
                activeTab === 'website-pages'
                  ? 'bg-emerald-600 text-white shadow-md font-bold'
                  : 'text-slate-350 hover:bg-slate-900 hover:text-white'
              }`}
              id="website-pages-tab-btn"
            >
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-emerald-400" />
                <span>Website Pages</span>
              </div>
              {activeTab === 'website-pages' && (
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
              )}
            </button>
          )}

          <div className="pt-6 border-t border-slate-900 space-y-1.5">
            <span className="block text-[9px] uppercase font-bold text-slate-500 tracking-wider mb-2 px-2.5">Operator Command</span>
            
            {sessionUser && (
              <button
                type="button"
                onClick={() => {
                  setViewMode('website');
                }}
                className="w-full text-left px-3 py-2 rounded text-[10px] font-bold text-emerald-400 hover:bg-emerald-950/40 hover:text-emerald-300 transition-all uppercase tracking-wider flex items-center gap-2 shrink-0 cursor-pointer"
              >
                <Globe className="w-3.5 h-3.5 shrink-0 text-emerald-450" />
                <span>🌐 Go to Public Website</span>
              </button>
            )}

            {sessionUser && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm("Are you sure you want to log out from this ERP operator terminal?")) {
                    localStorage.removeItem('acoola_session_user');
                    setSessionUser(null);
                  }
                }}
                className="w-full text-left px-3 py-2 rounded text-[10px] font-bold text-yellow-500 hover:bg-yellow-950/40 hover:text-yellow-400 transition-all uppercase tracking-wider flex items-center gap-2 shrink-0 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5 shrink-0" />
                <span>Sign Out Terminals</span>
              </button>
            )}

            {sessionUser?.isMasterAdmin && (
              <button
                type="button"
                onClick={handleResetDatabase}
                className="w-full text-left px-3 py-2 rounded text-[10px] font-bold text-rose-455 hover:bg-rose-955/40 hover:text-rose-350 transition-all uppercase tracking-wider flex items-center gap-2"
              >
                <RotateCcw className="w-3.5 h-3.5 shrink-0 text-rose-500" />
                <span>Reset System Data</span>
              </button>
            )}
          </div>
        </nav>

        {/* Dense Sidebar Static Specifications Info */}
        <div className="p-4 bg-slate-950 text-[10px] text-slate-500 border-t border-slate-900 space-y-1">
          <p className="font-mono">BIN: {COMPANY_PROFILE.bin}</p>
          <p className="font-mono">HS Code: {COMPANY_PROFILE.defaultHsCode}</p>
          <p className="text-[9px] text-slate-600 mt-1">ISO 9001:2015 Approved Facility</p>
        </div>
      </aside>

      {/* Main Content Area - Density Structured */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#f1f5f9] relative md:h-full md:overflow-hidden">
        
        {/* Top Header Navigation Trail & Actions */}
        <header className="h-14 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 print:hidden shadow-xs">
          <div className="flex items-center gap-3">
            <span className="text-xs font-black text-slate-700 tracking-wider uppercase font-display">
              DASHBOARD / {activeTab === 'booking-form' ? 'NEW BOOKING ENTRY' : activeTab.replace('-', ' ').toUpperCase()}
            </span>
            <div className="h-4 w-[1px] bg-slate-300"></div>
            <span className="text-xs text-slate-400 font-mono hidden sm:inline">
              Server Time: May 23, 2026
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Global Spotlight Search Button */}
            <button
              onClick={() => setShowGlobalSearch(true)}
              className="px-3 py-1.5 border border-slate-300 hover:bg-slate-55 text-slate-700 text-xs font-bold uppercase tracking-wider rounded flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer bg-white"
              title="Search everything (Ctrl+K)"
            >
              <Search className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden md:inline">Search...</span>
            </button>

            {/* Dark Mode Toggle */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-1.5 border border-slate-300 hover:bg-slate-55 text-slate-700 rounded flex items-center justify-center shadow-sm transition-colors cursor-pointer bg-white"
              title={darkMode ? "Switch to Light Mode" : "Switch to Dark/Eye-safe Mode"}
            >
              {darkMode ? (
                <Sun className="w-4 h-4 text-amber-500" />
              ) : (
                <Moon className="w-4 h-4 text-indigo-600" />
              )}
            </button>

            {/* Install PWA Button */}
            <button
              onClick={handleInstallApp}
              className="px-3 py-1.5 border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold uppercase tracking-wider rounded flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer bg-white"
              title="Install this ERP App on this Computer/Phone"
            >
              <RefreshCw className="w-3.5 h-3.5 text-[#007d46] animate-spin" style={{ animationDuration: '6s' }} />
              <span>Install App</span>
            </button>

            {/* Google Drive Status Button */}
            {currentUser ? (
              <button
                type="button"
                onClick={() => setShowCloudModal(true)}
                className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold uppercase tracking-wider rounded flex items-center gap-1.5 shadow-sm border border-emerald-200 transition-colors cursor-pointer"
                title="Google Drive connected! Open sync panel."
              >
                <Cloud className="w-3.5 h-3.5 text-emerald-650 animate-pulse" />
                <span>Drive Synced</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowCloudModal(true)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold uppercase tracking-wider rounded flex items-center gap-1.5 shadow-sm border border-slate-200 transition-colors cursor-pointer"
                title="Log in with Google to enable permanent auto-saving to your Google Drive!"
              >
                <CloudOff className="w-3.5 h-3.5 text-slate-400" />
                <span>Google Drive Cloud Disk</span>
              </button>
            )}

            {activeTab !== 'booking-form' && activeTab !== 'doc-builder' && (
              <button
                type="button"
                onClick={() => { setEditingBooking(null); setActiveTab('booking-form'); }}
                className="px-3 py-1.5 bg-[#007d46] hover:bg-[#006438] text-white text-xs font-bold uppercase tracking-wider rounded flex items-center gap-1 shadow-sm transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Confirm New Booking
              </button>
            )}
          </div>
        </header>

        {/* Main interactive panel workspace container */}
        <div className="flex-1 p-4 pb-20 md:overflow-y-auto">
          <div className="bg-white border border-slate-250 rounded-lg p-5 shadow-sm max-w-7xl mx-auto min-h-[400px]">
            
            {activeTab === 'dashboard' && (
              <DashboardTab
                bookings={bookings}
                challans={challans}
                pis={pis}
                banks={banks}
                suppliers={suppliers}
                workOrders={workOrders}
                payments={payments}
                conveyances={conveyances}
                products={products}
                manualBills={manualBills}
                activeBankShortForms={activeBankShortForms}
                totalBookingsValue={totalBookingsValue}
                totalDeliveredValue={totalDeliveredValue}
                totalInvoicedValue={totalInvoicedValue}
                activePisCount={activePisCount}
                totalSuppliersOutstandingDue={totalSuppliersOutstandingDue}
                conveyanceStats={conveyanceStats}
                onNavigate={(tab) => {
                  if (tab === 'booking-form') setEditingBooking(null);
                  setActiveTab(tab);
                }}
              />
            )}

            {activeTab === 'bookings' && (
              <BookingList
                bookings={bookings}
                onEditBooking={handleEditBookingClick}
                onDeleteBooking={handleDeleteBooking}
                onDuplicateBooking={handleDuplicateBooking}
                onStartBookingDoc={handleStartDocBuild}
                onAddNewClick={() => { setEditingBooking(null); setActiveTab('booking-form'); }}
                onUpdateBookingStatus={handleUpdateBookingStatus}
                canEdit={hasWriteAccess('bookings')}
              />
            )}

            {activeTab === 'booking-form' && (
              <BookingForm
                editingBooking={editingBooking}
                onSaveBooking={handleSaveBooking}
                onCancel={() => { setEditingBooking(null); setActiveTab('bookings'); }}
                prevGarments={autoGarments}
                prevBuyers={autoBuyers}
                prevPos={autoPos}
                prevStyles={autoStyles}
                prevAddresses={autoAddresses}
              />
            )}

            {activeTab === 'doc-builder' && docBuilderConfig && (
              <CreateDocument
                bookings={docBuilderConfig.bookings}
                docType={docBuilderConfig.type}
                allPis={pis}
                allChallans={challans}
                banks={banks}
                onGeneratePi={handleGeneratePi}
                onGenerateChallan={handleGenerateChallan}
                onCancel={() => { setDocBuilderConfig(null); setActiveTab('bookings'); }}
              />
            )}

            {activeTab === 'challans' && (
              <ChallanList
                challans={challans}
                onDeleteChallan={handleDeleteChallan}
                onUpdateChallanStatus={handleUpdateChallanStatus}
                onUpdateChallan={handleUpdateChallan}
                onAddChallan={handleAddChallan}
                canEdit={hasWriteAccess('challans')}
              />
            )}

            {activeTab === 'pis' && (
              <PiList
                pis={pis}
                banks={banks}
                onDeletePi={handleDeletePi}
                onUpdatePiItems={handleUpdatePiItems}
                onTogglePurchasePi={handleTogglePurchasePi}
                onAddPi={handleGeneratePi}
                canEdit={hasWriteAccess('pis')}
              />
            )}

            {activeTab === 'products-catalogue' && (
              <ProductCatalogue
                products={products}
                onAddProduct={handleAddProduct}
                onUpdateProduct={handleUpdateProduct}
                onDeleteProduct={handleDeleteProduct}
                onGenerateChallanFromProducts={(c) => {
                  setChallans(prev => [c, ...prev]);
                  setActiveTab('challans');
                }}
                onGenerateBillFromProducts={(i) => {
                  setManualBills(prev => [i, ...prev]);
                  setActiveTab('invoice-bill');
                }}
                canEdit={hasWriteAccess('products-catalogue')}
              />
            )}

            {activeTab === 'invoice-bill' && (
              <InvoiceBillManager
                bills={manualBills}
                onAddBill={handleAddManualBill}
                onUpdateBillStatus={handleUpdateManualBillStatus}
                onDeleteBill={handleDeleteManualBill}
                onUpdateBill={handleUpdateManualBill}
                buyerSuggestions={Array.from(new Set(autoBuyers)).filter(Boolean) as string[]}
                banks={banks}
                canEdit={hasWriteAccess('invoice-bill')}
              />
            )}

            {activeTab === 'banks' && (
              <BankManager
                banks={banks}
                onAddBank={handleAddBank}
                onUpdateBank={handleUpdateBank}
                onDeleteBank={handleDeleteBank}
                canEdit={hasWriteAccess('banks')}
              />
            )}

            {activeTab === 'customer-profiles' && (
              <div className="bg-white rounded-3xl border p-6 shadow-sm space-y-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b pb-4">
                  <div>
                    <h2 className="text-sm font-black text-slate-900 uppercase">Customer Profile Registry</h2>
                    <p className="text-[10px] text-slate-400 font-bold mt-0.5">Secure, read-only view of authenticated client directory synced with live portals.</p>
                  </div>
                  <div className="bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 max-w-md">
                    <ShieldCheck className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                    <span>Read Only: Changes can only be committed by clients via Client Portal.</span>
                  </div>
                </div>

                {/* Filter and stats row */}
                <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search customers by name, company, or email..."
                      className="w-full pl-9 pr-4 py-2 border rounded-xl text-xs font-semibold text-slate-700 bg-slate-50 focus:bg-white focus:outline-none focus:border-emerald-500 transition-all"
                      id="customer-profile-search"
                      onChange={(e) => {
                        (window as any)._customerSearchQuery = e.target.value;
                        // Force rerender
                        setActiveTab('customer-profiles');
                      }}
                    />
                  </div>
                  <div className="bg-slate-50 border rounded-xl px-4 py-2 flex items-center gap-2 text-xs font-bold text-slate-600">
                    <span>Total Customers Registered:</span>
                    <span className="font-mono text-emerald-600 font-black">{registeredClients.length}</span>
                  </div>
                </div>

                {/* Grid */}
                {(() => {
                  const query = ((window as any)._customerSearchQuery || '').toLowerCase().trim();
                  const filtered = registeredClients.filter(c => 
                    !query || 
                    c.name?.toLowerCase().includes(query) || 
                    c.email?.toLowerCase().includes(query) || 
                    c.companyName?.toLowerCase().includes(query) || 
                    c.phone?.toLowerCase().includes(query)
                  );

                  if (filtered.length === 0) {
                    return (
                      <div className="text-center py-12 border rounded-2xl bg-slate-50/50">
                        <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="text-xs text-slate-400 font-bold">No registered customer profiles found matching your search.</p>
                      </div>
                    );
                  }

                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {filtered.map((client: any) => (
                        <div key={client.id || client.email} className="border rounded-2xl p-4 bg-slate-50/30 hover:bg-slate-50 transition-all flex flex-col justify-between hover:shadow-xs group">
                          <div className="space-y-2">
                            <div className="flex justify-between items-start">
                              <div>
                                <span className="text-xs font-black text-slate-900 group-hover:text-emerald-600 transition-colors">{client.name}</span>
                                {client.companyName && (
                                  <span className="block text-[10px] text-slate-500 font-bold">{client.companyName}</span>
                                )}
                              </div>
                              <span className="bg-slate-100 border text-slate-500 text-[8px] font-black px-2 py-0.5 rounded-full uppercase">Client ID: {client.id ? client.id.slice(-6) : 'N/A'}</span>
                            </div>

                            <div className="border-t pt-2 space-y-1 text-[11px] font-semibold text-slate-600">
                              <div className="flex items-center gap-2">
                                <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span className="font-mono">{client.email}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span className="font-mono">{client.phone || 'No phone number provided'}</span>
                              </div>
                            </div>
                          </div>

                          <div className="border-t mt-4 pt-2 flex justify-between items-center text-[9px] text-slate-400 font-bold">
                            <span>Joined Date: {client.joinedAt ? new Date(client.joinedAt).toLocaleDateString() : 'N/A'}</span>
                            <span className="text-emerald-600 flex items-center gap-0.5">
                              ● Active Portal
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            )}

            {activeTab === 'suppliers' && (
              <SupplierManager
                suppliers={suppliers}
                workOrders={workOrders}
                payments={payments}
                onAddSupplier={handleAddSupplier}
                onUpdateSupplier={handleUpdateSupplier}
                onDeleteSupplier={handleDeleteSupplier}
                onAddWorkOrder={handleAddWorkOrder}
                onUpdateWorkOrder={handleUpdateWorkOrder}
                onDeleteWorkOrder={handleDeleteWorkOrder}
                onAddPayment={handleAddPayment}
                onDeletePayment={handleDeletePayment}
                companyProfile={companyProfile}
                canEdit={hasWriteAccess('suppliers')}
              />
            )}

            {activeTab === 'conveyance' && (
              <ConveyanceManager
                conveyances={conveyances}
                onAddConveyance={handleAddConveyance}
                onUpdateConveyance={handleUpdateConveyance}
                onDeleteConveyance={handleDeleteConveyance}
                sessionUser={sessionUser}
                canEdit={hasWriteAccess('conveyance')}
              />
            )}

            {activeTab === 'job-cards' && (
              <JobCardManager 
                bookings={bookings} 
                jobCards={jobCards}
                onAddJobCard={handleAddJobCard}
                onUpdateJobCard={handleUpdateJobCard}
                onDeleteJobCard={handleDeleteJobCard}
                canEdit={hasWriteAccess('job-cards')}
              />
            )}

            {activeTab === 'lc-documents' && (
              <LcDocumentGenerator 
                pis={pis} 
                initialHistory={lcHistory}
                onHistoryChange={setLcHistory}
                canEdit={hasWriteAccess('lc-documents')}
              />
            )}

            {activeTab === 'quote-builder' && (
              <PriceQuotation 
                initialQuotes={quotations}
                onQuotesChange={setQuotations}
                sessionUser={sessionUser}
                canEdit={hasWriteAccess('quote-builder')}
              />
            )}

            {activeTab === 'party-ledger' && (
              <PartyLedgerAgeing 
                pis={pis} 
                commercialInvoices={commercialInvoices}
                initialPayments={buyerPayments}
                onPaymentsChange={setBuyerPayments}
                canEdit={hasWriteAccess('party-ledger')}
              />
            )}

            {activeTab === 'payroll' && (
              <PayrollManager 
                initialEmployees={employees}
                onEmployeesChange={setEmployees}
                initialPayrolls={payrolls}
                onPayrollsChange={setPayrolls}
                canEdit={hasWriteAccess('payroll')}
              />
            )}

            {activeTab === 'profile-updates' && (
              <SystemProfileManager 
                onProfileUpdated={() => window.location.reload()} 
                canEdit={hasWriteAccess('profile-updates')}
              />
            )}

            {activeTab === 'website-pages' && (
              <WebsitePagesManager 
                canEdit={hasWriteAccess('website-pages')} 
                pages={websitePages}
                onPagesChange={setWebsitePages}
              />
            )}

            {activeTab === 'attendance-logs' && (
              <BiometricAttendance employees={employees} canEdit={hasWriteAccess('attendance-logs')} />
            )}

            {activeTab === 'careers-erp' && (
              <CareersTabManager
                jobOpportunities={jobOpportunities}
                jobApplications={jobApplications}
                onAddJobOpportunity={handleAddJobOpportunity}
                onDeleteJobOpportunity={handleDeleteJobOpportunity}
                onDeleteJobApplication={handleDeleteJobApplication}
                canEdit={hasWriteAccess('careers-erp')}
              />
            )}

            {activeTab === 'money-receipts' && (
              <MoneyReceiptGenerator
                pis={pis}
                manualBills={manualBills}
                companyProfile={companyProfile}
                onMarkPiAsPaid={(refNoOrId) => {
                  setPis(prev => prev.map(p => (p.id === refNoOrId || p.invoiceNo === refNoOrId) ? { ...p, isPurchased: true } : p));
                  setTimeout(() => {
                    const savedPis = localStorage.getItem('acoola_pis');
                    if (savedPis) {
                      try {
                        const parsed = JSON.parse(savedPis);
                        const updated = parsed.map((p: any) => (p.id === refNoOrId || p.invoiceNo === refNoOrId) ? { ...p, isPurchased: true } : p);
                        localStorage.setItem('acoola_pis', JSON.stringify(updated));
                      } catch(e) {}
                    }
                  }, 100);
                }}
                onMarkManualBillAsPaid={(refNoOrId) => {
                  setManualBills(prev => prev.map(b => (b.id === refNoOrId || b.invoiceNo === refNoOrId) ? { ...b, paymentStatus: 'Paid' } : b));
                  setTimeout(() => {
                    const savedBills = localStorage.getItem('acoola_manual_bills');
                    if (savedBills) {
                      try {
                        const parsed = JSON.parse(savedBills);
                        const updated = parsed.map((b: any) => (b.id === refNoOrId || b.invoiceNo === refNoOrId) ? { ...b, paymentStatus: 'Paid' } : b);
                        localStorage.setItem('acoola_manual_bills', JSON.stringify(updated));
                      } catch(e) {}
                    }
                  }, 100);
                }}
                canEdit={hasWriteAccess('money-receipts')}
              />
            )}

          </div>
        </div>

        {/* Solid Corporate High-Density Status Footer */}
        <footer className="h-8 bg-white border-t border-slate-200 px-6 flex items-center justify-between text-[10px] font-bold text-slate-500 shrink-0 absolute bottom-0 left-0 w-full print:hidden">
          <div className="flex gap-4">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Database Operational
            </span>
            <span className="text-slate-300">|</span>
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
              Identity: Admin Manager
            </span>
          </div>
          <div className="flex gap-4 items-center">
            <span className="font-semibold text-slate-400">{COMPANY_PROFILE.name} ERP</span>
            <span className="text-slate-300">|</span>
            <span className="font-extrabold text-slate-800">Hotline: {COMPANY_PROFILE.phones[0]}</span>
          </div>
        </footer>

      </main>

      {/* Corporate custom confirmation alert popup */}
      {showResetConfirmModal && sessionUser?.isMasterAdmin && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 print:hidden animate-fade-in" id="reset-confirm-modal">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full shadow-2xl p-6 relative animate-scale-in">
            <div className="flex items-center gap-3 text-rose-600 mb-4">
              <div className="p-3 bg-rose-50 rounded-full shrink-0">
                <RotateCcw className="w-6 h-6 animate-spin" style={{ animationDuration: '4s' }} />
              </div>
              <div>
                <h3 className="text-lg font-black uppercase text-slate-950 tracking-tight leading-none">Confirm System Data Reset?</h3>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-1">Permission Required</p>
              </div>
            </div>

            <div className="space-y-3 text-xs text-slate-600 font-medium leading-relaxed">
              <p>
                আপনি কি নিশ্চিত যে আপনি সিস্টেমের সমস্ত ডাটা মুছে ফেলতে চান? এটি বুকিং, চালান এবং পিআই (PI) সহ এন্টার করা সকল রেকর্ড চিরতরে মুছে ফেলবে।
              </p>
              <p className="bg-amber-50 border border-amber-200 text-amber-900 px-3.5 py-2.5 rounded-lg text-[10.5px] font-semibold leading-normal">
                <strong>WARNING:</strong> Wiping system data sets all registries to completely blank (empty tables). This cannot be undone.
              </p>
            </div>

            <div className="mt-6 flex flex-col sm:flex-row gap-2.5 justify-end">
              <button
                type="button"
                onClick={() => setShowResetConfirmModal(false)}
                className="w-full sm:w-auto px-4 py-2 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs uppercase tracking-wider rounded-lg transition-colors cursor-pointer"
              >
                No, Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReset}
                className="w-full sm:w-auto px-5 py-2 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-extrabold text-xs uppercase tracking-wider rounded-lg shadow-md hover:shadow-lg transition-all cursor-pointer"
              >
                Yes, Clear All Data
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Google Drive Cloud Sync Center modal popup */}
      {showCloudModal && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 print:hidden animate-fade-in" id="cloud-sync-modal">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full shadow-2xl p-6 relative animate-scale-in overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-50 text-emerald-700 rounded-lg shrink-0">
                  <Cloud className="w-5 h-5 animate-bounce" style={{ animationDuration: '3s' }} />
                </div>
                <div>
                  <h3 className="text-base font-black uppercase text-slate-950 tracking-tight leading-none">Cloud Sync Center</h3>
                  <p className="text-[9.5px] text-emerald-600 font-bold uppercase tracking-widest mt-1 font-mono">Google Drive Secure Storage</p>
                </div>
              </div>
              <button 
                onClick={() => setShowCloudModal(false)}
                className="p-1 rounded hover:bg-slate-100 text-slate-450 hover:text-slate-700 text-xs font-bold font-mono"
              >
                ✕ Close
              </button>
            </div>

            {/* Error Message Alert */}
            {cloudErrorMsg && (
              <div className="mb-4 space-y-2.5">
                <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3.5 rounded-lg flex items-start gap-2 text-xs">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                  <div className="w-full">
                    <p className="font-bold">Error Occurred</p>
                    <p className="text-[11px] leading-normal">{cloudErrorMsg}</p>
                    {/* Direct suggestion for auth/internal-error or domain issues */}
                    {(cloudErrorMsg.includes('auth/internal-error') || cloudErrorMsg.includes('unauthorized-domain') || window.location.hostname !== 'localhost') && (
                      <div className="mt-2 text-[10.5px] border-t border-rose-200/50 pt-2 text-rose-900 font-medium leading-normal">
                        💡 <strong>Netlify বা লোকাল কম্পিউটারে লগইন ইরর?</strong> এটি সাধারণত গুগল ফায়ারবেস (Firebase Auth Settings) এ ডোমেন অথরাইজেশন না করার কারণে হয়ে থাকে। নিচের <strong>"লাইভ হোস্ট ডোমেন সেটআপ নির্দেশিকা"</strong> বাটনে ক্লিক করে ১ মিনিটে সমাধান করে নিন।
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Loading / Status overlay during write */}
            {(syncStatus === 'syncing' || syncStatus === 'restoring') && (
              <div className="absolute inset-0 bg-white/80 backdrop-blur-xs flex flex-col items-center justify-center p-4 z-10 animate-fade-in">
                <Loader2 className="w-10 h-10 text-emerald-600 animate-spin" />
                <p className="font-bold text-xs uppercase tracking-widest text-slate-800 mt-3 font-mono">
                  {syncStatus === 'syncing' ? 'Publishing Backup to Drive...' : 'Restoring Database Records...'}
                </p>
                <p className="text-[10px] text-gray-500 mt-1">Please do not close this window</p>
              </div>
            )}

            {/* Main Interactive Sync interface */}
            {!currentUser ? (
              /* Signed Out View */
              <div className="space-y-4 py-2">
                <div className="p-4 bg-slate-50 border border-slate-150 rounded-xl">
                  <h4 className="text-xs font-bold text-slate-800 mb-1.5 font-sans">ক্লাউড রিপ্লিকেশন সুবিধা সমূহ:</h4>
                  <ul className="text-[11.5px] text-slate-600 space-y-1.5 list-disc pl-4 font-medium leading-relaxed">
                    <li>আপনার এন্টারপ্রাইজ রিসিট, বুকিং এবং চালানসমূহ 100% সুরক্ষিত থাকবে।</li>
                    <li>কম্পিউটার নষ্ট হলেও ডাটা মুছে যাবে না।</li>
                    <li>একটি জিমেইল অ্যাকাউন্ট কানেক্ট করে সমস্ত ডাটা ব্যাকআপ রাখতে পারবেন।</li>
                    <li>অন্য যেকোনো ডিভাইস বা উইন্ডোজ/মোবাইল অ্যাপ থেকে সহজেই ডাটা রিস্টোর করতে পারবেন।</li>
                  </ul>
                </div>

                {/* Domain Warning for Netlify / Custom Domain Deployments */}
                {(window.location.hostname !== 'localhost' && !window.location.hostname.endsWith('.run.app')) && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-950 text-xs">
                    <p className="font-bold text-amber-950 flex items-center gap-1 mb-1">
                      <span>⚠️</span>
                      <span>Netlify ডোমেন ডিটেক্টেড!</span>
                    </p>
                    <p className="text-[10.5px] leading-normal font-medium text-amber-800">
                      গুগল ড্রাইভ ব্যাকআপ ব্যবহার করার জন্য আপনাকে আপনার নেটলিফাই ডোমেনটি (<strong className="text-amber-950">{window.location.hostname}</strong>) ফায়ারবেস অথেন্টিকেশনে অনুমোদন করতে হবে।
                    </p>
                  </div>
                )}

                {/* Toggleable Live Domain Troubleshooting accordian */}
                <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                  <button
                    type="button"
                    onClick={() => setShowAuthTroubleshoot(!showAuthTroubleshoot)}
                    className="w-full flex items-center justify-between px-3.5 py-2.5 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
                  >
                    <div className="flex items-center gap-1.5 text-xs text-neutral-800 font-extrabold">
                      <span>🛠️</span>
                      <span>লাইভ হোস্ট ডোমেন সেটআপ নির্দেশিকা</span>
                    </div>
                    <span className="text-neutral-500 font-mono text-xs font-bold">
                      {showAuthTroubleshoot ? '▲' : '▼'}
                    </span>
                  </button>

                  {showAuthTroubleshoot && (
                    <div className="p-3.5 space-y-3.5 border-t border-slate-200 bg-white text-[11px] text-slate-600 leading-relaxed font-sans font-medium">
                      <p className="text-rose-800 font-bold bg-rose-50/50 p-2 rounded-lg border border-rose-100 leading-normal">
                        গুগল ও ফায়ারবেস সিকিউরিটির নিয়মানুযায়ী ডোমেইনটি (যেমন Netlify) Firebase এ <strong>"Authorized Domains"</strong> তালিকায় যুক্ত করতে হয়। তা না করলে `auth/internal-error` দেখাবে।
                      </p>

                      <div className="space-y-2">
                        <p className="font-extrabold text-neutral-900">👇 ধাপে ধাপে সমাধান করার নিয়মাবলী:</p>
                        <ol className="list-decimal pl-4.5 space-y-2 text-slate-700">
                          <li>
                            আপনার ফায়ারবেস কনসোলে যান: <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-extrabold">Firebase Console ↗</a>
                          </li>
                          <li>
                            আপনার প্রোজেক্ট (যা <strong className="text-neutral-950 font-extrabold">{firebaseConfig.projectId}</strong>) এটি ওপেন করুন।
                          </li>
                          <li>
                            বামদিকের মেনু থেকে <strong className="text-neutral-900 font-extrabold">Authentication</strong> এ ক্লিক করে উপরে ডানপাশে থাকা <strong className="text-neutral-900 font-extrabold">Settings</strong> ট্যাবটি সিলেক্ট করুন।
                          </li>
                          <li>
                            একটু নিচে স্ক্রল করে <strong className="text-neutral-900 font-extrabold">Authorized Domains</strong> তালিকাটি পাবেন। সেখানে <strong className="text-emerald-700 font-extrabold">"Add domain"</strong> বাটনে ক্লিক করুন।
                          </li>
                          <li>
                            নিচের বাটনে ক্লিক করে কপি করা আপনার ডোমেনটি পেস্ট করে যুক্ত (Add) করুন:
                            <div className="mt-2 flex items-center gap-2 max-w-sm">
                              <span className="px-2.5 py-1 bg-slate-100 font-mono text-neutral-800 font-bold rounded border border-slate-200 truncate select-all">{window.location.hostname}</span>
                              <button
                                type="button"
                                onClick={handleCopyDomain}
                                className="px-3 py-1 bg-neutral-800 text-white rounded text-[10px] font-extrabold uppercase hover:bg-neutral-900 active:bg-neutral-950 transition-colors flex items-center gap-1 cursor-pointer shrink-0"
                              >
                                {copiedDomain ? 'Copied! ✅' : 'Copy Domain 📋'}
                              </button>
                            </div>
                          </li>
                          <li>
                            ডাবল সিকিউরিটি হিসেবে <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-bold">Google Cloud Console ↗</a> এ গিয়ে আপনার ও-অথ ক্লায়েন্ট (OAuth credentials) এর <strong>Authorized javascript origins</strong> এবং <strong>redirect URIs</strong> এ আপনার নেটলিফাই লিংকটি যুক্ত করে দিন!
                          </li>
                        </ol>
                      </div>
                      <p className="text-[10px] text-emerald-800 italic font-bold">
                        * এটি যুক্ত করার সাথে সাথেই আপনার এই নতুন সাইটে গুগল লগইন ও অটো ১-মিনিট ব্যাকআপ শতভাগ চমৎকারভাবে কাজ করবে।
                      </p>
                    </div>
                  )}
                </div>

                <div className="pt-2 text-center">
                  <button
                    onClick={handleCloudLogin}
                    className="w-full py-3 bg-[#0a844b] hover:bg-[#076639] active:bg-[#054c2a] text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12.24 10.285V13.4h6.887C18.2 15.614 15.645 18 12.24 18 8.442 18 5.38 14.913 5.38 11.115c0-3.798 3.062-6.885 6.86-6.885 1.7 0 3.255.615 4.475 1.78l2.455-2.453C17.48 1.94 15.04 1 12.24 1 6.58 1 2 5.58 2 11.235c0 5.655 4.58 10.235 10.24 10.235 5.9 0 9.805-4.136 9.805-9.975 0-.67-.06-1.3-.175-1.92H12.24z"/>
                    </svg>
                    <span>Google অ্যাকাউন্ট যুক্ত করুন</span>
                  </button>
                  <p className="text-[9px] text-gray-400 mt-2 font-mono uppercase tracking-wider">OAuth verification by Google Identity Services</p>
                </div>
              </div>
            ) : (
              /* Signed In View */
              <div className="space-y-4">
                {/* User Info Frame */}
                <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-150 rounded-xl">
                  {currentUser.photoURL ? (
                    <img referrerPolicy="no-referrer" src={currentUser.photoURL} className="w-10 h-10 rounded-full border border-slate-200" alt={currentUser.displayName || ''} />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-emerald-700 text-white flex items-center justify-center font-bold text-sm">
                      {currentUser.displayName ? currentUser.displayName[0].toUpperCase() : 'A'}
                    </div>
                  )}
                  <div>
                    <h4 className="text-xs font-extrabold text-slate-900 leading-tight">{currentUser.displayName || 'Acoola ERP Operator'}</h4>
                    <p className="text-[10px] font-mono text-slate-500 font-bold">{currentUser.email}</p>
                  </div>
                  <span className="ml-auto text-[8.5px] px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-sm font-black uppercase tracking-wider block border border-emerald-200">
                    Linked
                  </span>
                </div>

                {/* Cloud Disk Sync Settings Frame */}
                <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                  <div className="bg-slate-50 border-b border-slate-200 px-3.5 py-2 font-black uppercase text-[9px] text-slate-500 tracking-wider">
                    Google Drive Backup Status
                  </div>
                  <div className="p-3.5 space-y-2.5">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 font-medium">Backup Storage Target:</span>
                      <span className="font-mono font-bold text-slate-900">acoola_trims_erp_backup.json</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 font-medium">Google Drive File Status:</span>
                      {cloudFileInfo ? (
                        <span className="font-mono text-[10.5px] bg-sky-50 text-sky-800 border border-sky-100 px-2 py-0.5 rounded font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-sky-600" /> Detected (ID: {cloudFileInfo.id.substring(0, 10)}...)
                        </span>
                      ) : (
                        <span className="font-mono text-[10.5px] bg-amber-50 text-amber-800 border border-amber-100 px-2 py-0.5 rounded font-semibold">
                          Not Setup Yet / কোন ফাইল পাওয়া যায়নি
                        </span>
                      )}
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-slate-500 font-medium">Last Local Backup Session:</span>
                      <span className="font-mono font-extrabold text-[#007d46]">{lastSyncTime || 'Never (No Backup Yet)'}</span>
                    </div>
                  </div>
                </div>

                {/* Real-time Auto-Sync Status & Settings */}
                <div className="bg-emerald-50/50 border border-emerald-200/80 rounded-xl p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <div className="relative flex h-2.5 w-2.5 shrink-0">
                        {autoSyncEnabled && cloudToken ? (
                          <>
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                          </>
                        ) : (
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-slate-350"></span>
                        )}
                      </div>
                      <span className="text-[11.5px] font-extrabold text-neutral-800 tracking-tight">১-মিনিট অটো ক্লাউড ব্যাকআপ (Auto Live Match)</span>
                    </div>
                    {/* Toggle Switch */}
                    <label className="relative inline-flex items-center cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={autoSyncEnabled}
                        onChange={(e) => setAutoSyncEnabled(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-8 h-4.5 bg-slate-200 rounded-full peer peer-checked:after:translate-x-[14px] after:content-[''] after:absolute after:top-[4.5px] after:left-[4px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-emerald-600"></div>
                    </label>
                  </div>

                  <p className="text-[10px] leading-relaxed text-slate-650">
                    {autoSyncEnabled 
                      ? 'সক্রিয়: প্রতি ৬০ সেকেন্ডে আপনি যদি নতুন কোনো বুকিং, পেমেন্ট বা বিল এডিট/সাবমিট করেন, তা স্বয়ংক্রিয়ভাবে ব্যাকগ্রাউন্ডে গুগল ড্রাইভের সাথে ক্লাউডে ব্যাকআপ হয়ে যাবে।' 
                      : 'নিষ্ক্রিয়: স্বয়ংক্রিয় ব্যাকআপ বন্ধ রয়েছে। ডাটা ক্লাউডে পাঠাতে ম্যানুয়ালি ব্যাকআপ বাটনে ক্লিক করুন।'}
                  </p>

                  {/* Silent Live status */}
                  {autoSyncStatus !== 'idle' && (
                    <div className="flex items-center gap-1.5 text-[10px] text-emerald-800 font-bold bg-white border border-emerald-100 rounded-lg px-2.5 py-1 justify-center">
                      <Loader2 className={`w-3.5 h-3.5 text-emerald-600 ${autoSyncStatus === 'syncing' ? 'animate-spin' : ''}`} />
                      <span>
                        {autoSyncStatus === 'syncing' && 'স্বয়ংক্রিয় ব্যাকআপ হচ্ছে... অনুগ্রহ করে ক্লোজ করবেন না।'}
                        {autoSyncStatus === 'success' && 'আজকের অটো-ব্যাকআপ সম্পন্ন হয়েছে!'}
                        {autoSyncStatus === 'error' && 'অটো-সিঙ্ক কানেকশন ইরর, পরবর্তীতে চেষ্টা করা হবে।'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Status Notice */}
                <p className="text-[10.5px] leading-relaxed text-slate-500 font-medium bg-slate-50 border border-slate-150 p-2.5 rounded-lg">
                  <strong>হিল্লোল রিডার টিপস:</strong> ১-মিনিট ডিরেক্ট অটো-ব্যাকআপ সক্রিয় করা থাকলে আপনি যখনই কোনো ডাটা ইনপুট করবেন তা ৬০ সেকেন্ড পর পর গুগলে নিজে থেকেই সেভ হবে। যেকোনো নতুন কম্পিউটারে লগইন করে <strong className="text-neutral-900 font-heavy">"ড্রাইভ থেকে রিস্টোর"</strong> ক্লিক করলেই ডাটা স্বয়ংক্রিয় চলে আসবে।
                </p>

                {/* Core Sync Action Panel Buttons */}
                <div className="grid grid-cols-2 gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={handleBackupToCloud}
                    className="py-2.5 bg-[#007d46] hover:bg-[#006035] active:bg-[#004e2b] text-white font-extrabold text-xs uppercase tracking-wider rounded-lg shadow-sm hover:shadow flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <CloudUpload className="w-4 h-4 shrink-0" />
                    <span>গুগলে ব্যাকআপ করুন</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleRestoreFromCloud}
                    disabled={!cloudFileInfo}
                    className={`py-2.5 font-extrabold text-xs uppercase tracking-wider rounded-lg shadow-sm flex items-center justify-center gap-1.5 transition-all ${
                      cloudFileInfo 
                        ? 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white cursor-pointer' 
                        : 'bg-slate-100 text-slate-350 border border-slate-200 cursor-not-allowed'
                    }`}
                  >
                    <CloudDownload className="w-4 h-4 shrink-0" />
                    <span>ড্রাইভ থেকে রিস্টোর</span>
                  </button>
                </div>

                {/* Sign out indicator */}
                <div className="pt-2 border-t border-slate-100 flex justify-between items-center">
                  <span className="text-[9px] text-gray-400 font-mono font-bold uppercase">Google Drive API v3 Integrated</span>
                  <button
                    type="button"
                    onClick={handleCloudLogout}
                    className="text-[10px] text-red-500 hover:text-red-700 font-bold uppercase tracking-wider hover:underline"
                  >
                    লগআউট / অ্যাকাউন্ট পরিবর্তন করুন
                  </button>
                </div>
              </div>
            )}
            
            {/* Sync success toast inline notification */}
            {syncStatus === 'success' && (
              <div className="mt-4 bg-emerald-50 border border-emerald-200 text-emerald-800 p-2.5 rounded-lg flex items-center gap-1.5 text-xs font-semibold animate-bounce">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>অপারেশনটি সফলভাবে সম্পন্ন হয়েছে!</span>
              </div>
            )}

          </div>
        </div>
      )}

      {/* Install PWA Guide Modal styled as a Windows-style Setup Wizard (Setup.exe Style) */}
      {showInstallModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 print:hidden animate-fade-in" id="pwa-install-modal">
          <div className="bg-slate-100 border-2 border-slate-400 rounded-lg shadow-2xl max-w-2xl w-full overflow-hidden select-none font-sans text-slate-800 animate-scale-in">
            
            {/* Windows Window Titlebar */}
            <div className="bg-[#007d46] text-white px-3 py-1.5 flex items-center justify-between font-bold text-xs select-none">
              <div className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-emerald-100" />
                <span>Acoola Trims ERP Corporation Setup (v1.0.0-PRO)</span>
              </div>
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => setShowInstallModal(false)}
                  className="px-2 py-0.5 hover:bg-red-650 rounded text-white text-[10px] font-mono transition-colors font-bold"
                  title="Cancel Install"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Main Installer Frame Columns */}
            <div className="flex flex-col md:flex-row h-[380px] bg-white">
              
              {/* Left Column Graphic Sidebar (Classic Setup look) */}
              <div className="w-full md:w-48 bg-gradient-to-b from-[#005e35] to-[#01351e] p-5 text-white flex flex-col justify-between shrink-0 border-r border-slate-300">
                <div className="space-y-4">
                  <div className="w-12 h-12 rounded-lg bg-white/10 flex items-center justify-center border border-white/20">
                    <Layers className="w-7 h-7 text-emerald-350 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="font-black text-sm uppercase tracking-wide leading-tight">Acoola Trims</h3>
                    <p className="text-[10px] text-emerald-350 font-bold tracking-widest font-mono">ERP ENTERPRISE</p>
                  </div>
                </div>
                
                <div className="space-y-1.5 border-t border-white/10 pt-4 hidden md:block">
                  <div className={`text-[10px] font-bold uppercase tracking-wider ${installStep === 1 ? 'text-white font-black' : 'text-slate-400'}`}>1. Welcome</div>
                  <div className={`text-[10px] font-bold uppercase tracking-wider ${installStep === 2 ? 'text-white font-black' : 'text-slate-400'}`}>2. Agreement</div>
                  <div className={`text-[10px] font-bold uppercase tracking-wider ${installStep === 3 ? 'text-white font-black' : 'text-slate-400'}`}>3. Target Path</div>
                  <div className={`text-[10px] font-bold uppercase tracking-wider ${installStep === 4 ? 'text-white font-black' : 'text-slate-400'}`}>4. Installation</div>
                  <div className={`text-[10px] font-bold uppercase tracking-wider ${installStep === 5 ? 'text-white font-black' : 'text-slate-400'}`}>5. Complete</div>
                </div>
              </div>

              {/* Right Column Content Pages */}
              <div className="flex-1 p-6 flex flex-col justify-between overflow-y-auto">
                
                {/* STEP 1: WELCOME SCREEN */}
                {installStep === 1 && (
                  <div className="space-y-3 animate-fade-in">
                    <h2 className="text-lg font-black text-slate-950 uppercase tracking-tight">Acoola Trims ERP সেটআপ উইজার্ড এ স্বাগতম</h2>
                    <p className="text-xs text-slate-650 leading-relaxed">
                      এই সফটওয়্যার সেটআপ উইজার্ডটি আপনার ব্রাউজার ও ডিভাইসে <strong>"Acoola Trims Corporation ERP Application"</strong> ইনস্টল করতে সহায়তা করবে।
                    </p>
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded text-xs text-slate-600 space-y-1">
                      <p>• <strong>রিলিজ সংস্করণ:</strong> v1.0.0 (Enterprise Edition)</p>
                      <p>• <strong>ডেভেলপার:</strong> Acoola Soft Engineering Team</p>
                      <p>• <strong>প্রয়োজনীয় স্পেস:</strong> ~৫ মেগাবাইট (সার্ভিস ওয়ার্কার ক্যাশে)</p>
                    </div>
                    <p className="text-[11px] text-slate-500 font-bold italic">
                      ইনস্টলেশন শুরু করতে অনুগ্রহ করে "Next &gt;" বাটনে ক্লিক করুন।
                    </p>
                  </div>
                )}

                {/* STEP 2: END-USER LICENSE AGREEMENT */}
                {installStep === 2 && (
                  <div className="space-y-2 animate-fade-in flex flex-col h-full justify-between">
                    <div>
                      <h2 className="text-sm font-black text-slate-950 uppercase tracking-tight mb-1">এন্ড-ইউজার লাইসেন্স চুক্তিমালা (EULA)</h2>
                      <p className="text-[11px] text-slate-500 mb-2">ইনস্টল করার পূর্বে নিচের ব্যবহারের নিয়মাবলী মনোযোগ সহকারে রিভিউ করুন:</p>
                    </div>
                    
                    {/* EULA text box simulation */}
                    <div className="flex-1 h-32 overflow-y-auto border border-slate-350 p-2.5 bg-slate-50 rounded text-[10.5px] text-slate-600 font-mono leading-relaxed select-text space-y-2">
                      <p className="font-bold text-slate-950">১. ডাটা প্রাইভেসী এবং অফলাইন সুরক্ষা পলিসি:</p>
                      <p>এই বুকিং, চালান ও ফাইন্যান্স ই আর পি সফটওয়্যারের সমস্ত ডাটা আপনার লোকাল ব্রাউজারের "LocalStorage" ফোল্ডারে সম্পূর্ণ সুনিপুণভাবে সেভ থাকে। আপনার সম্মতি ব্যতীত ডাটা সার্ভারে ট্রান্সফার হয় না।</p>
                      <p className="font-bold text-slate-950">২. গুগল ড্রাইভ ইন্টিগ্রেশন নিয়মাবলি:</p>
                      <p>ক্লাউডে সেভ রাখার জন্য জিমেইল ব্যাকআপ অপশন ব্যবহার করতে হবে। ব্যাকআপ নেওয়ার সাথে সাথে আপনার গুগল ড্রাইভের ক্লাউড ডিস্কে ব্যাকআপ ডট জেসন ফাইল অটো সেভ হবে।</p>
                      <p className="font-bold text-slate-950">৩. ব্যবহারের শর্তাবলী:</p>
                      <p>এই অ্যাপ্লিকেশনটি শুধুমাত্র Acoola Trims Corporation এর বুকিং ও চালান মেইনটেইনের জন্য প্রাতিষ্ঠানিকভাবে অনুমোদিত।</p>
                    </div>

                    <div className="mt-2 flex items-center gap-2">
                      <input 
                        type="checkbox" 
                        id="eula-check" 
                        checked={eulaAccepted} 
                        onChange={(e) => setEulaAccepted(e.target.checked)}
                        className="w-4 h-4 text-[#007d46] focus:ring-[#007d46] cursor-pointer"
                      />
                      <label htmlFor="eula-check" className="text-[11px] font-extrabold text-slate-950 cursor-pointer select-none">
                        আমি উক্ত সমস্ত লাইসেন্স ও শর্তাবলী মেনে নিচ্ছি (I accept the agreement)
                      </label>
                    </div>
                  </div>
                )}

                {/* STEP 3: DESTINATION FOLDER SELECTION */}
                {installStep === 3 && (
                  <div className="space-y-4 animate-fade-in animate-duration-150">
                    <div>
                      <h2 className="text-sm font-black text-slate-950 uppercase tracking-tight mb-1">ইনস্টলেশন ডিরেক্টরি লোকেশন সিলেক্ট করুন</h2>
                      <p className="text-[11px] text-slate-500">সেটআপ উইজার্ডটি নিচের উইন্ডোজ বা এন্ড্রয়েড পাথ ফোল্ডারে রিসোর্স ফাইল সমূহ এক্সট্রাক্ট করবে:</p>
                    </div>

                    <div className="space-y-2 bg-slate-50 border border-slate-200 p-4 rounded-xl">
                      <label className="text-[10px] font-extrabold uppercase text-slate-500 font-mono">INSTALLATION PATH TARGET:</label>
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          value={installFolder} 
                          onChange={(e) => setInstallFolder(e.target.value)}
                          className="flex-1 px-3 py-1.5 border border-slate-350 rounded bg-white text-xs font-mono font-bold text-slate-800 focus:outline-[#007d46]"
                        />
                      </div>
                      <p className="text-[9.5px] text-gray-500">
                        * আপনি চাইলে পাথ পরিবর্তন করতে পারেন। ডিফল্টরূপে এই পাথের অধীনেই আপনার অফলাইন ক্যাশে ডাটাবেজ লিংক স্থাপন করা হবে।
                      </p>
                    </div>
                  </div>
                )}

                {/* STEP 4: INSTALLATION PROGRESS SCREEN (COPYING FILES) */}
                {installStep === 4 && (
                  <div className="space-y-5 py-4 animate-fade-in animate-duration-150">
                    <div className="space-y-1">
                      <h2 className="text-sm font-black text-slate-950 uppercase tracking-tight flex items-center gap-1.5 font-sans">
                        <Loader2 className="w-4 h-4 text-[#007d46] animate-spin" />
                        <span>রিসোর্স ফাইলস ইনস্টল হচ্ছে...</span>
                      </h2>
                      <p className="text-[11px] text-slate-500 font-medium">ফাইলসমূহ ডিরেক্টরিতে এক্সট্রাক্ট ও ম্যাপ করা হচ্ছে, অনুগ্রহ করে অপেক্ষা করুন।</p>
                    </div>

                    {/* Progress engine UI wrapper */}
                    <div className="space-y-2">
                      <div className="w-full bg-slate-200 h-5 rounded-md overflow-hidden border border-slate-300 relative">
                        <div 
                          className="bg-gradient-to-r from-[#009b57] to-[#007d46] h-full transition-all duration-75 flex items-center justify-end pr-2 text-[10px] font-black text-white font-mono"
                          style={{ width: `${installProgress}%` }}
                        >
                          {installProgress}%
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-[10.5px] font-mono text-slate-650">
                        <span className="truncate max-w-[285px]">Status: {installingText}</span>
                        <span className="shrink-0 text-emerald-800 font-extrabold">{installProgress} / 100</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 5: INSTALLATION COMPLETE */}
                {installStep === 5 && (
                  <div className="space-y-4 animate-fade-in animate-duration-150">
                    <div className="flex items-center gap-2 text-[#007d46]">
                      <CheckCircle2 className="w-7 h-7 animate-bounce" />
                      <div>
                        <h2 className="text-base font-black uppercase tracking-tight">ইনস্টলেশন সফলভাবে সম্পন্ন হয়েছে!</h2>
                        <p className="text-[9px] font-bold text-emerald-700 font-mono tracking-widest uppercase">SETUP FILE EXECUTED SUCCESSFULLY</p>
                      </div>
                    </div>

                    <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl space-y-2 text-xs text-slate-700">
                      <p className="font-bold leading-normal text-slate-900">
                        🎉 অভিনন্দন! Acoola Trims Corporation ERP সেটআপ সম্পন্ন হয়েছে।
                      </p>
                      <p className="leading-relaxed">
                        গুগল ক্রোম বা মাইক্রোসফট এজ ব্রাউজার দিয়ে অফলাইনে এবং ডেক্সটপ অ্যাপ বা হোমস্ক্রিন উইজেট হিসেবে ১-ক্লিকে রান করার জন্য আপনি প্রস্তুত।
                      </p>
                    </div>

                    <div className="space-y-2.5 bg-slate-50 border border-slate-200 p-3 rounded-lg">
                      <p className="text-[11px] font-extrabold text-[#007d46] flex items-center gap-1">
                        <span>💻</span>
                        <span>১-ক্লিকে আসল উইন্ডোজ ডেক্সটপ (.EXE) এক্সপেরিয়েন্স:</span>
                      </p>
                      
                      <button
                        type="button"
                        onClick={handleDownloadBat}
                        className="inline-flex w-full items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-extrabold text-[11px] uppercase tracking-wider rounded shadow-sm transition-colors cursor-pointer text-center"
                      >
                        <span>ডাউনলোড উইন্ডোজ লঞ্চার (.BAT) 📥</span>
                      </button>

                      <p className="text-[9.5px] leading-relaxed text-slate-500">
                        * এটি ডাউনলোড করে ডেক্সটপে সংরক্ষণ করুন। ডাবল ক্লিক করলেই ব্রাউজার ফ্রেম ছাড়া একটি স্বতন্ত্র <strong>উইন্ডোজ ডেক্সটপ সফটওয়্যারের মতো</strong> ওপেন হবে!
                      </p>

                      <div className="border-t border-slate-200/60 my-2 pt-2">
                        <p className="text-[10.5px] font-extrabold text-[#007d46]">💡 ব্রাউজার আইফ্রেম সুরক্ষায় ফুল উইন্ডো ওপেন:</p>
                        <p className="text-[10px] leading-relaxed text-slate-650">
                          আইফ্রেম সুরক্ষার কারণে কাজ না করলে, আপনার Chrome ব্রাউজারের ডানদিকের ওপরে থাকা <strong>"Open in a new tab ↗"</strong> লিংকে ক্লিক করে নতুন ফুল ট্যাবে নিয়ে নিন:
                        </p>
                        
                        <div className="pt-2">
                          <a 
                            href="https://ais-dev-4rq64ijmkajmhmqedlxezz-65798366455.asia-southeast1.run.app" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex w-full items-center justify-center gap-1.5 px-3 py-1.5 bg-[#007d46] hover:bg-[#006035] text-white font-extrabold text-[10.5px] uppercase tracking-wider rounded shadow-xs transition-colors cursor-pointer text-center"
                          >
                            <span>রিয়েল ডেভলপমেন্ট লিঙ্ক ওপেন করুন (নতুন ট্যাব) ↗</span>
                          </a>
                        </div>
                      </div>

                      <div className="border-t border-slate-200/60 pt-2 text-[9.5px] text-slate-500 leading-normal">
                        * আসল Installer .EXE ফাইলে প্যাকেজ করার জন্য আপনার প্রোজেক্ট রুটে <strong>DESKTOP_BUILD_GUIDE.md</strong> ফাইলটি তৈরি করা হয়েছে।
                      </div>
                    </div>
                  </div>
                )}

              </div>
            </div>

            {/* Installer Bottom Wizard Buttons Footer */}
            <div className="bg-slate-200 px-6 py-4.5 border-t border-slate-350 flex justify-between items-center shrink-0">
              <span className="text-[9.5px] font-mono text-slate-500 font-bold uppercase">Setup.msi Integrated engine</span>
              
              <div className="flex gap-2">
                {/* Back Button */}
                {installStep > 1 && installStep < 4 && (
                  <button
                    onClick={() => setInstallStep(installStep - 1)}
                    className="px-3.5 py-1.5 bg-white border border-slate-350 hover:bg-slate-50 text-slate-800 font-extrabold text-xs uppercase tracking-wider rounded cursor-pointer shadow-xs"
                  >
                    &lt; Back
                  </button>
                )}

                {/* Cancel Button */}
                {installStep < 4 && (
                  <button
                    onClick={() => setShowInstallModal(false)}
                    className="px-3.5 py-1.5 bg-white border border-slate-350 hover:bg-slate-50 text-slate-800 font-extrabold text-xs uppercase tracking-wider rounded cursor-pointer shadow-xs"
                  >
                    Cancel
                  </button>
                )}

                {/* Next Button (Step 1) */}
                {installStep === 1 && (
                  <button
                    onClick={() => setInstallStep(2)}
                    className="px-4 py-1.5 bg-[#007d46] hover:bg-[#006035] text-white font-extrabold text-xs uppercase tracking-wider rounded cursor-pointer shadow-xs flex items-center gap-1"
                  >
                    <span>Next &gt;</span>
                  </button>
                )}

                {/* Next Button (Step 2 - License) */}
                {installStep === 2 && (
                  <button
                    onClick={() => setInstallStep(3)}
                    disabled={!eulaAccepted}
                    className={`px-4 py-1.5 font-extrabold text-xs uppercase tracking-wider rounded shadow-xs flex items-center gap-1 ${
                      eulaAccepted
                        ? 'bg-[#007d46] hover:bg-[#006035] text-white cursor-pointer'
                        : 'bg-slate-300 text-slate-450 border border-slate-350 cursor-not-allowed'
                    }`}
                  >
                    <span>Next &gt;</span>
                  </button>
                )}

                {/* Next Button (Step 3 - Destination Path -> Trigger Install progress) */}
                {installStep === 3 && (
                  <button
                    onClick={startInstallationAnim}
                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs uppercase tracking-wider rounded cursor-pointer shadow-xs flex items-center gap-1"
                  >
                    <span>Install &gt;</span>
                  </button>
                )}

                {/* Next/Finalize Button (Step 5 - Completion Screen Close) */}
                {installStep === 5 && (
                  <button
                    onClick={() => {
                      setShowInstallModal(false);
                      triggerNativeInstall();
                    }}
                    className="px-5 py-1.5 bg-[#007d46] hover:bg-[#006035] text-white font-extrabold text-xs uppercase tracking-wider rounded cursor-pointer shadow-md"
                  >
                    Finish
                  </button>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Global Spotlight Search Modal Overlay */}
      {showGlobalSearch && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-start justify-center pt-[10vh] px-4 z-50 print:hidden animate-fade-in" id="global-search-overlay" onClick={() => { setShowGlobalSearch(false); setGlobalSearchQuery(''); }}>
          <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[75vh]" onClick={e => e.stopPropagation()}>
            {/* Search Input Box */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
              <Search className="w-5 h-5 text-slate-400 shrink-0" />
              <input
                type="text"
                autoFocus
                placeholder="Search bookings, PIs, challans, products, suppliers, direct bills..."
                value={globalSearchQuery}
                onChange={e => setGlobalSearchQuery(e.target.value)}
                className="w-full text-sm bg-transparent border-0 outline-hidden placeholder-slate-450 dark:placeholder-slate-500 text-slate-900 dark:text-slate-100 font-medium focus:ring-0"
              />
              <button 
                onClick={() => {
                  setShowGlobalSearch(false);
                  setGlobalSearchQuery('');
                }}
                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-850 dark:hover:bg-slate-800 rounded text-slate-500 text-xs font-semibold cursor-pointer"
              >
                ESC
              </button>
            </div>

            {/* Results Display Pane */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {!globalSearchQuery.trim() ? (
                <div className="p-8 text-center text-slate-400 text-xs space-y-2">
                  <p className="font-medium font-mono text-[10px] text-slate-500 uppercase tracking-widest">ACOOLA RAPID COMMAND MATRIX</p>
                  <p className="text-slate-450 text-[11px]">Type something above (e.g. buyer name, PO, invoice or style number) to look up instantly across all modules.</p>
                  <div className="flex flex-wrap justify-center gap-2 pt-2">
                    <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded font-mono text-[9.5px] text-slate-500">Buyer &amp; PO</span>
                    <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded font-mono text-[9.5px] text-slate-500">Challan / Spec No</span>
                    <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded font-mono text-[9.5px] text-slate-500">Supplier &amp; Products</span>
                  </div>
                </div>
              ) : globalSearchResults.length === 0 ? (
                <div className="p-8 text-center text-slate-450 text-xs">
                  <p className="font-bold text-slate-600 dark:text-slate-400 font-display">No matching enterprise records found.</p>
                  <p className="text-[11px] text-slate-400 mt-1 font-sans">Check keyword spellings or query variables.</p>
                </div>
              ) : (
                <div className="space-y-3 pb-4">
                  {/* Group items by category for pristine layout */}
                  {Array.from(new Set(globalSearchResults.map(r => r.category))).map(catName => (
                    <div key={catName} className="space-y-1 px-2 pt-1">
                      <div className="text-[9px] font-bold text-[#007d46] uppercase tracking-wider pl-1 mb-1 font-mono">{catName}</div>
                      {globalSearchResults.filter(r => r.category === catName).map(item => (
                        <button
                          key={item.id}
                          onClick={() => {
                            setActiveTab(item.tab as any);
                            setShowGlobalSearch(false);
                            setGlobalSearchQuery('');
                          }}
                          className="w-full text-left p-2.5 rounded-lg border border-transparent hover:border-slate-200 dark:hover:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 flex flex-col gap-1 transition-all group cursor-pointer"
                        >
                          <div className="flex justify-between items-center w-full">
                            <span className="font-extrabold text-xs text-slate-850 dark:text-white group-hover:text-[#007d46] transition-colors">{item.title}</span>
                            <span className="text-[9px] font-mono font-bold bg-[#f1f5f9] dark:bg-slate-850 px-1.5 py-0.5 rounded text-slate-500 dark:text-slate-400 group-hover:bg-[#007d46] group-hover:text-white transition-all uppercase">Open Tab ↗</span>
                          </div>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-1 leading-normal">{item.subtitle}</span>
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer Guidance helper */}
            <div className="px-4 py-2 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 text-[9.5px] text-slate-400 flex justify-between items-center font-bold">
              <span>Press ESC to exit search</span>
              <span className="font-mono text-[#007d46]">ACOOLA ERP SYSTEM</span>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Intelligent Copilot */}
      <AIChatbot 
        contextData={{
          bookingsCount: bookings?.length || 0,
          pisCount: pis?.length || 0,
          challansCount: challans?.length || 0,
          productsCount: products?.length || 0,
          activeTab: activeTab || 'dashboard'
        }}
      />

    </div>
  );
}
