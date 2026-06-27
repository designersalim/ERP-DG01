import React, { useState, useEffect } from 'react';
import { db } from '../lib/driveSync';
import { collection, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { UserAccount, DatabaseHostingConfig } from '../types';
import { sha256 } from '../lib/crypto';
import { 
  ShieldCheck, Lock, CheckCircle2, AlertTriangle, Building, Mail, Phone, Hash, Image, 
  Users, Database, Key, Trash2, Plus, Shield, ToggleLeft, ToggleRight, CheckSquare, Square, Save, ArrowRight,
  Eye, EyeOff
} from 'lucide-react';

const compressImage = (base64Str: string, maxDimension = 500, quality = 0.7): Promise<string> => {
  if (!base64Str || base64Str.startsWith('data:image/svg+xml')) {
    return Promise.resolve(base64Str);
  }
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let width = img.width;
      let height = img.height;

      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      } else {
        resolve(base64Str);
      }
    };
    img.onerror = () => {
      resolve(base64Str);
    };
    img.src = base64Str;
  });
};

interface SystemProfileManagerProps {
  onProfileUpdated: () => void;
  canEdit?: boolean;
}

const AVAILABLE_TABS = [
  { id: 'dashboard', label: 'Dashboard Overview' },
  { id: 'bookings', label: 'Booking Directory' },
  { id: 'booking-form', label: 'New Booking Entry' },
  { id: 'challans', label: 'Delivery Challans' },
  { id: 'pis', label: 'Proforma Invoices (PI)' },
  { id: 'invoice-bill', label: 'Invoice & Bill Operations' },
  { id: 'products-catalogue', label: 'Product Catalogue' },
  { id: 'banks', label: 'Corporate Bank Details' },
  { id: 'suppliers', label: 'Supplier Hub' },
  { id: 'conveyance', label: 'Conveyance Hub' },
  { id: 'job-cards', label: 'Production Job Cards' },
  { id: 'commercial-invoices', label: 'Local Commercial Invoice & Packing List' },
  { id: 'lc-documents', label: 'L/C Documents Pack' },
  { id: 'quote-builder', label: 'Price Quotation Builder' },
  { id: 'party-ledger', label: 'Party Ledger & Due Aging' },
  { id: 'payroll', label: 'Corporate Staff Payroll' },
  { id: 'money-receipts', label: 'Money Receipt Generator' },
  { id: 'careers-erp', label: 'Careers & Recruiting Portal' },
  { id: 'website-pages', label: 'Website Pages Manager' },
  { id: 'attendance-logs', label: 'Biometric Attendance Logs' },
  { id: 'profile-updates', label: 'System Settings & Profile' }
];

export default function SystemProfileManager({ onProfileUpdated, canEdit = true }: SystemProfileManagerProps) {
  const [passwordInput, setPasswordInput] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'profile' | 'users' | 'db_settings'>('profile');

  // Loaded state initialized directly from template or localStorage
  const getInitialProfile = () => {
    const defaultProfile = {
      name: "Acoola Trims Corporation",
      emails: ["acoolatrims@gmail.com", "acoola.manager.bd@gmail.com"],
      phones: ["01778262909", "01406122678"],
      addresses: {
        office: "House No-03, Road No-07, Block-C, Mirpur-13, Dhaka-1216, Bangladesh.",
        factory: "135/5, Arambagh, Motijheel, Dhaka-1000, Bangladesh."
      },
      bin: "002903407-0202",
      defaultHsCode: "6217.10.00",
      tin: "028374192083",
      ownerName: "MD Akbar Hossain",
      logo: "",
      useLogoInLc: true,
      useLogoInHeader: true,
      headerTitleImg: "",
      footerImg: "",
      useFooterImg: false,
      line1Color: "#007D46",
      line1Active: true,
      line2Color: "#ed1c24",
      line2Active: true,
      tagline: "All Kinds of Garments Accessories Manufacturer & Supplier",
      firstColor: "#007D46",
      secondColor: "#ed1c24",
      companyItems: "GARMENTS ACCESSORIES",
      websiteIntro: "We manufacture certified superior trim styles for garments exporters. Standard quality labels, barcodes, offset tags, boxes, and accessories from our central unit in Motijheel Arambagh.",
      embedMapCode: ""
    };

    try {
      const saved = localStorage.getItem('acoola_profile');
      if (saved) {
        return { ...defaultProfile, ...JSON.parse(saved) };
      }
    } catch {}
    return defaultProfile;
  };

  const [profile, setProfile] = useState(getInitialProfile);
  const [successMsg, setSuccessMsg] = useState('');

  // Firestore Real-time subscriptions
  const [userAccounts, setUserAccounts] = useState<UserAccount[]>([]);
  const [dbConfig, setDbConfig] = useState<Partial<DatabaseHostingConfig>>({
    appName: 'Acoola Trims ERP',
    liveAppUrl: window.location.origin,
    dbHost: 'localhost',
    dbName: 'acoola_main_db',
    dbUser: 'admin',
    dbPassword: ''
  });

  // Local Form state for user management
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [showNewUserPassword, setShowNewUserPassword] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);
  const [newUserAllowedTabs, setNewUserAllowedTabs] = useState<string[]>(['dashboard']);
  const [newUserWriteAccess, setNewUserWriteAccess] = useState<Record<string, boolean>>({
    dashboard: false
  });
  const [newUserDesignation, setNewUserDesignation] = useState('');
  const [newUserDepartment, setNewUserDepartment] = useState('');
  const [newUserSignatureUrl, setNewUserSignatureUrl] = useState('');
  const [userError, setUserError] = useState('');
  const [userSuccess, setUserSuccess] = useState('');

  // Local state for Database settings tab
  const [dbSuccess, setDbSuccess] = useState('');

  useEffect(() => {
    if (!isUnlocked) return;

    // 1. Subscribe to User Accounts
    const usersCol = collection(db, 'erp_company_data', 'shared_workspace', 'user_accounts');
    const unsubUsers = onSnapshot(usersCol, (snap) => {
      const accs: UserAccount[] = [];
      snap.forEach(d => {
        accs.push(d.data() as UserAccount);
      });
      setUserAccounts(accs);
    });

    // 2. Subscribe to DB Configs
    const configDoc = doc(db, 'erp_company_data', 'shared_workspace', 'db_configs', 'current_config');
    const unsubConfig = onSnapshot(configDoc, (snap) => {
      if (snap.exists()) {
        setDbConfig(snap.data() as DatabaseHostingConfig);
      }
    });

    return () => {
      unsubUsers();
      unsubConfig();
    };
  }, [isUnlocked]);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setAuthError('Error: Please choose a logo image under 2MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = async () => {
        const compressed = await compressImage(reader.result as string);
        setProfile((prev) => ({
          ...prev,
          logo: compressed
        }));
        setAuthError('');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleHeaderTitleImgChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setAuthError('Error: Please choose a header title image/SVG under 2MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = async () => {
        const compressed = await compressImage(reader.result as string);
        setProfile((prev) => ({
          ...prev,
          headerTitleImg: compressed
        }));
        setAuthError('');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFooterImgChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setAuthError('Error: Please choose a footer graphic/SVG under 2MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = async () => {
        const compressed = await compressImage(reader.result as string);
        setProfile((prev) => ({
          ...prev,
          footerImg: compressed
        }));
        setAuthError('');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError('');
    try {
      const response = await fetch('/api/auth/login-staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'salim@ayra.com', password: passwordInput })
      });
      if (response.ok) {
        setIsUnlocked(true);
        setAuthError('');
      } else {
        setAuthError('Incorrect system authorization key. Access denied.');
      }
    } catch (err) {
      setAuthError('Authorization server error. Please try again.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      localStorage.setItem('acoola_profile', JSON.stringify(profile));
      setSuccessMsg('Corporate profile variables saved and synchronized successfully!');
      setTimeout(() => setSuccessMsg(''), 4000);
      onProfileUpdated();
    } catch {
      setAuthError('Failed to persist corporate profile variables. Storage full.');
    }
  };

  // User Accounts (RBAC) CRUD handlers
  const handleToggleTabAllowed = (tabId: string) => {
    if (newUserAllowedTabs.includes(tabId)) {
      setNewUserAllowedTabs(prev => prev.filter(t => t !== tabId));
      // Reset write access
      const updatedWrite = { ...newUserWriteAccess };
      delete updatedWrite[tabId];
      setNewUserWriteAccess(updatedWrite);
    } else {
      setNewUserAllowedTabs(prev => [...prev, tabId]);
      setNewUserWriteAccess(prev => ({ ...prev, [tabId]: false })); // Default to read-only (false)
    }
  };

  const handleToggleTabWriteAccess = (tabId: string) => {
    setNewUserWriteAccess(prev => ({
      ...prev,
      [tabId]: !prev[tabId]
    }));
  };

  const handleLoadUserEdit = (acc: UserAccount) => {
    setEditingUser(acc);
    setNewUserEmail(acc.email);
    setNewUserName(acc.name || '');
    setNewUserPassword(''); // blank means no change
    setNewUserAllowedTabs(acc.allowedTabs || ['dashboard']);
    setNewUserWriteAccess(acc.writeAccess || { dashboard: false });
    setNewUserDesignation(acc.designation || '');
    setNewUserDepartment(acc.department || '');
    setNewUserSignatureUrl(acc.signatureUrl || '');
  };

  const handleCancelUserEdit = () => {
    setEditingUser(null);
    setNewUserEmail('');
    setNewUserName('');
    setNewUserPassword('');
    setNewUserAllowedTabs(['dashboard']);
    setNewUserWriteAccess({ dashboard: false });
    setNewUserDesignation('');
    setNewUserDepartment('');
    setNewUserSignatureUrl('');
  };

  const handleAddUserAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserError('');
    setUserSuccess('');

    const emailNorm = newUserEmail.trim().toLowerCase();
    if (!emailNorm) {
      setUserError('Email is required.');
      return;
    }

    if (!editingUser && !newUserPassword.trim()) {
      setUserError('Password is required for new accounts.');
      return;
    }

    if (newUserAllowedTabs.length === 0) {
      setUserError('Must grant access to at least 1 tab.');
      return;
    }

    try {
      let passHash = editingUser ? editingUser.passwordHash : '';
      if (newUserPassword.trim()) {
        const hashRes = await fetch('/api/auth/hash-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: newUserPassword, email: emailNorm })
        });
        const hashData = await hashRes.json();
        if (!hashRes.ok) {
          throw new Error(hashData.error || 'Failed to securely hash password.');
        }
        passHash = hashData.hash;
      }

      const userId = editingUser ? editingUser.id : emailNorm;
      const docRef = doc(db, 'erp_company_data', 'shared_workspace', 'user_accounts', userId);

      const accountPayload: UserAccount = {
        id: userId,
        email: emailNorm,
        passwordHash: passHash,
        allowedTabs: newUserAllowedTabs,
        writeAccess: newUserWriteAccess,
        createdAt: editingUser ? editingUser.createdAt : new Date().toISOString()
      };

      if (newUserName.trim()) accountPayload.name = newUserName.trim();
      if (newUserDesignation.trim()) accountPayload.designation = newUserDesignation.trim();
      if (newUserDepartment.trim()) accountPayload.department = newUserDepartment.trim();
      if (newUserSignatureUrl.trim()) accountPayload.signatureUrl = newUserSignatureUrl.trim();

      await setDoc(docRef, accountPayload);

      // Reset Form fields
      setNewUserEmail('');
      setNewUserPassword('');
      setNewUserName('');
      setNewUserDesignation('');
      setNewUserDepartment('');
      setNewUserSignatureUrl('');
      setEditingUser(null);
      setNewUserAllowedTabs(['dashboard']);
      setNewUserWriteAccess({ dashboard: false });

      setUserSuccess(
        editingUser 
          ? 'User account updated and synchronized in real-time across all sessions!'
          : 'User account registered and synchronized across all active sessions successfully!'
      );
      setTimeout(() => setUserSuccess(''), 5000);
    } catch (err: any) {
      setUserError('Failed to save user account: ' + (err.message || String(err)));
      console.error(err);
    }
  };

  const handleDeleteUserAccount = async (userId: string) => {
    if (!window.confirm('Are you absolutely sure you want to revoke and delete this operator credentials? They will be signed-out instantly.')) return;
    try {
      const docRef = doc(db, 'erp_company_data', 'shared_workspace', 'user_accounts', userId);
      await deleteDoc(docRef);
      setUserSuccess('Operator credentials revoked successfully.');
      setTimeout(() => setUserSuccess(''), 3000);
    } catch (err) {
      setUserError('Failed to delete operator. Connection error.');
    }
  };

  // Database and Hosting Config Handlers
  const handleSaveDbConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setDbSuccess('');
    try {
      const payload: DatabaseHostingConfig = {
        id: 'current_config',
        appName: dbConfig.appName || 'Acoola Trims ERP',
        liveAppUrl: dbConfig.liveAppUrl || window.location.origin,
        dbHost: dbConfig.dbHost || 'localhost',
        dbName: dbConfig.dbName || 'acoola_main_db',
        dbUser: dbConfig.dbUser || 'admin',
        dbPassword: dbConfig.dbPassword || '',
        updatedAt: new Date().toISOString(),
        fbApiKey: dbConfig.fbApiKey || '',
        fbAuthDomain: dbConfig.fbAuthDomain || '',
        fbProjectId: dbConfig.fbProjectId || '',
        fbStorageBucket: dbConfig.fbStorageBucket || '',
        fbMessagingSenderId: dbConfig.fbMessagingSenderId || '',
        fbAppId: dbConfig.fbAppId || '',
        fbFirestoreDatabaseId: dbConfig.fbFirestoreDatabaseId || ''
      };

      // Try saving to the active firestore database if accessible
      try {
        const docRef = doc(db, 'erp_company_data', 'shared_workspace', 'db_configs', 'current_config');
        await setDoc(docRef, payload);
      } catch (dbErr) {
        console.warn('Could not sync config payload to remote Firestore. Saving locally.', dbErr);
      }
      
      // Save locally as cache
      localStorage.setItem('acoola_db_hosting_config', JSON.stringify(payload));

      // Handle Firebase overrides
      if (payload.fbApiKey?.trim() && payload.fbProjectId?.trim()) {
        const customFbConfig = {
          apiKey: payload.fbApiKey.trim(),
          authDomain: payload.fbAuthDomain?.trim() || `${payload.fbProjectId.trim()}.firebaseapp.com`,
          projectId: payload.fbProjectId.trim(),
          storageBucket: payload.fbStorageBucket?.trim() || `${payload.fbProjectId.trim()}.firebasestorage.app`,
          messagingSenderId: payload.fbMessagingSenderId?.trim() || '',
          appId: payload.fbAppId?.trim() || '',
          firestoreDatabaseId: payload.fbFirestoreDatabaseId?.trim() || ''
        };
        localStorage.setItem('custom_firebase_config', JSON.stringify(customFbConfig));
        alert('নতুন Firebase ডেটাবেজ কনফিগারেশন সেট করা হয়েছে! সিস্টেম পৃষ্ঠাটি রিলোড দেওয়া হচ্ছে যাতে নতুন ডেটাবেজে সরাসরি সিঙ্ক শুরু হয়।');
        window.location.reload();
      } else {
        // If they cleared the API key, remove the local override
        if (localStorage.getItem('custom_firebase_config')) {
          localStorage.removeItem('custom_firebase_config');
          alert('কাস্টম ডেটাবেজ কনফিগারেশন ক্লিয়ার করা হয়েছে! ডিফল্ট অ্যাপ ফায়ারবেসে রিটার্ন করতে পৃষ্ঠা রিলোড হচ্ছে।');
          window.location.reload();
        } else {
          setDbSuccess('ডেটাবেজ ও হোস্টিং কনফিগারেশন সফলভাবে আপডেট হয়েছে!');
          setTimeout(() => setDbSuccess(''), 5000);
        }
      }
    } catch (err) {
      alert('Error updating database connection details.');
    }
  };

  if (!isUnlocked) {
    return (
      <div className="max-w-md mx-auto my-12 bg-white border border-slate-205 rounded-2xl p-8 shadow-md font-sans">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-slate-100 rounded-full mb-3 text-slate-700">
            <Lock className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-black text-slate-900 tracking-tight">System Profile Authorization Gateway</h2>
          <p className="text-[11px] text-slate-505 mt-1 animate-none">
            Updating the factory address, operator accounts, and database configurations requires system executive authority.
          </p>
        </div>

        <form onSubmit={handleUnlock} className="space-y-4">
          <div className="space-y-1.5 text-left">
            <label className="block text-xs font-black text-slate-700 uppercase tracking-wider">Access Security Key</label>
            <input
              type="password"
              placeholder="Enter security password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm font-bold focus:bg-white text-center tracking-widest focus:ring-1 focus:ring-slate-550 focus:outline-none"
              autoFocus
            />
          </div>

          {authError && (
            <div className="bg-amber-50 border border-amber-200 text-amber-900 p-3 rounded-lg text-[10.5px] font-bold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
              <span>{authError}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={authLoading}
            className="w-full bg-slate-950 text-white font-extrabold text-xs py-3 rounded-xl hover:bg-slate-900 tracking-wider transition-all uppercase select-none cursor-pointer shadow-sm flex items-center justify-center gap-1.5 h-11 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {authLoading ? 'Authorizing...' : 'Authorize System Access'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto bg-white border border-slate-200 rounded-2xl p-6 shadow-sm font-sans text-left space-y-6">
      
      {/* Tab Navigation header */}
      <div className="border-b border-slate-200 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-650" /> System Control Dashboard
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Global terminal settings, Role-Based Access Control list, and external database pointers.
          </p>
        </div>

        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl self-start md:self-auto shrink-0 select-none">
          <button
            onClick={() => setActiveSubTab('profile')}
            className={`px-3 py-1.5 rounded-lg text-xs font-extrabold tracking-tight transition-all cursor-pointer ${
              activeSubTab === 'profile' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Company Profile
          </button>
          <button
            onClick={() => setActiveSubTab('users')}
            className={`px-3 py-1.5 rounded-lg text-xs font-extrabold tracking-tight transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'users' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-indigo-500" />
            <span>User Accounts (RBAC)</span>
          </button>
          <button
            onClick={() => setActiveSubTab('db_settings')}
            className={`px-3 py-1.5 rounded-lg text-xs font-extrabold tracking-tight transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'db_settings' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Database className="w-3.5 h-3.5 text-emerald-500" />
            <span>Hosting &amp; DB</span>
          </button>
        </div>
      </div>

      {/* SUB-TAB A: COMPANY PROFILE */}
      {activeSubTab === 'profile' && (
        <div className="space-y-6">
          {successMsg && (
            <div className="bg-emerald-50 border border-emerald-205 text-emerald-900 p-4 rounded-xl text-xs font-bold flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSaveProfile} className="space-y-5 text-xs font-sans">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="block font-bold text-slate-700">Corporate Registered Name *</label>
                <input
                  type="text"
                  required
                  value={profile.name}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-bold focus:bg-white text-xs text-slate-900"
                />
                <p className="text-[9px] text-slate-400">Global registered name locked behind master security key.</p>
              </div>

              <div className="space-y-1">
                <label className="block font-bold text-slate-700">Business Identification No (BIN)</label>
                <div className="relative">
                  <Hash className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={profile.bin}
                    onChange={(e) => setProfile({ ...profile, bin: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-8 pr-3 py-2 font-bold focus:bg-white text-xs font-mono text-slate-900"
                  />
                </div>
                <p className="text-[9px] text-slate-400">Corporate BIN used for VAT & Customs.</p>
              </div>

              <div className="space-y-1">
                <label className="block font-bold text-slate-705">Corporate / LC TIN Number</label>
                <div className="relative">
                  <Hash className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={profile.tin || ''}
                    onChange={(e) => setProfile({ ...profile, tin: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-8 pr-3 py-2 font-bold focus:bg-white text-xs font-mono text-slate-900"
                    placeholder="028374192083"
                  />
                </div>
                <p className="text-[9px] text-slate-400">Taxpayers Identification Number (TIN) for LC Packets.</p>
              </div>

              <div className="space-y-1">
                <label className="block font-bold text-slate-705">Owner Name (for Certificate of Origin)</label>
                <div className="relative">
                  <Building className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={profile.ownerName || ''}
                    onChange={(e) => setProfile({ ...profile, ownerName: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-8 pr-3 py-2 font-bold focus:bg-white text-xs text-slate-900"
                    placeholder="e.g. Salim Reza"
                  />
                </div>
                <p className="text-[9px] text-slate-400">Owner Name dynamically printed at Certificate of Origin footer.</p>
              </div>
            </div>

            <div className="space-y-3 border-t border-slate-100 pt-4">
              <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Image className="w-4 h-4 text-slate-500" /> Corporate Logo &amp; Branding Settings
              </h3>
              
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row gap-4 items-center">
                {profile.logo ? (
                  <div className="relative w-24 h-24 bg-white border border-slate-200 rounded-lg flex items-center justify-center p-1 overflow-hidden shrink-0 animate-none">
                    <img src={profile.logo} alt="Company Logo" className="max-w-full max-h-full object-contain cursor-default" />
                    <button
                      type="button"
                      onClick={() => setProfile({ ...profile, logo: '' })}
                      className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold cursor-pointer transition-colors"
                      title="Remove Logo"
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <div className="w-24 h-24 bg-slate-100 border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center text-slate-400 shrink-0">
                    <Image className="w-6 h-6 mb-1" />
                    <span className="text-[8px] uppercase tracking-wider font-bold">No Logo</span>
                  </div>
                )}
                
                <div className="flex-1 space-y-1.5 w-full text-left">
                  <label className="block font-bold text-slate-705">Upload Logo Image (PNG / JPG)</label>
                  <input
                    type="file"
                    accept="image/png, image/jpeg, image/jpg"
                    onChange={handleLogoChange}
                    className="w-full text-[11px] text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-[11px] file:font-bold file:bg-slate-950 file:text-white hover:file:bg-slate-900 file:cursor-pointer"
                  />
                  <p className="text-[10px] text-slate-450 leading-normal mb-2">
                    This logo automatically synchronizes as the header brand signoff and as a central watermark (faded layer) across all templates.
                  </p>
                  
                  <div className="flex flex-col gap-2.5">
                    <div className="flex items-center gap-2 bg-white p-2.5 rounded-lg border border-slate-200 shadow-sm shadow-slate-100/40">
                      <input
                        id="useLogoInLc"
                        type="checkbox"
                        checked={!!profile.useLogoInLc}
                        onChange={(e) => setProfile({ ...profile, useLogoInLc: e.target.checked })}
                        className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500 cursor-pointer"
                      />
                      <label htmlFor="useLogoInLc" className="text-[10px] font-extrabold text-slate-700 select-none cursor-pointer">
                        Yes, authorize and use this logo as a Central Watermark / Jolchap in documents
                      </label>
                    </div>

                    <div className="flex items-center gap-2 bg-white p-2.5 rounded-lg border border-slate-200 shadow-sm shadow-slate-100/40">
                      <input
                        id="useLogoInHeader"
                        type="checkbox"
                        checked={!!profile.useLogoInHeader}
                        onChange={(e) => setProfile({ ...profile, useLogoInHeader: e.target.checked })}
                        className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500 cursor-pointer"
                      />
                      <label htmlFor="useLogoInHeader" className="text-[10px] font-extrabold text-slate-700 select-none cursor-pointer">
                        Yes, authorize and display this corporate logo inside the printed Document Header
                      </label>
                    </div>
                  </div>

                  {/* Company Tagline */}
                  <div className="space-y-1 mt-4">
                    <label className="block font-bold text-slate-750">Company Tag Line</label>
                    <input
                      type="text"
                      value={profile.tagline || ''}
                      onChange={(e) => setProfile({ ...profile, tagline: e.target.value })}
                      placeholder="All Kinds of Garments Accessories Manufacturer & Supplier"
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 font-bold focus:ring-1 focus:ring-emerald-500 text-xs text-slate-900"
                    />
                  </div>

                  {/* Company Manufactured Items */}
                  <div className="space-y-1 mt-4">
                    <label className="block font-bold text-slate-750">Company Manufactured Items (LC Documents)</label>
                    <input
                      type="text"
                      value={profile.companyItems || ''}
                      onChange={(e) => setProfile({ ...profile, companyItems: e.target.value })}
                      placeholder="GARMENTS ACCESSORIES / PRINTING & PACKAGING"
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 font-bold focus:ring-1 focus:ring-emerald-500 text-xs text-slate-900"
                    />
                    <p className="text-[10px] text-slate-450">
                      Used dynamically inside Beneficiary Certificate, Certificate of Origin, Bill of Exchange, etc.
                    </p>
                  </div>

                  {/* Corporate Landing Website Intro */}
                  <div className="space-y-1 mt-4">
                    <label className="block font-bold text-slate-750">Corporate Landing Website - Introduction (Website Intro Text)</label>
                    <textarea
                      rows={3}
                      value={profile.websiteIntro || ''}
                      onChange={(e) => setProfile({ ...profile, websiteIntro: e.target.value })}
                      placeholder="We manufacture certified superior trim styles for garments exporters..."
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 font-bold focus:ring-1 focus:ring-emerald-500 text-xs text-slate-900 leading-normal"
                    />
                    <p className="text-[10px] text-slate-450">
                      This text appears in the hero description and bottom branding column on the public landing page.
                    </p>
                  </div>
                </div>
              </div>

              {/* Upload Header Title Banner Image */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row gap-4 items-center mt-3">
                {profile.headerTitleImg ? (
                  <div className="relative w-full max-w-[200px] h-16 bg-white border border-slate-200 rounded-lg flex items-center justify-center p-1 overflow-hidden shrink-0">
                    <img src={profile.headerTitleImg} alt="Header Title Banner" className="max-w-full max-h-full object-contain" />
                    <button
                      type="button"
                      onClick={() => setProfile({ ...profile, headerTitleImg: '' })}
                      className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold cursor-pointer transition-colors"
                      title="Remove Banner"
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <div className="w-full max-w-[200px] h-16 bg-slate-100 border border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center text-slate-400 shrink-0">
                    <Image className="w-5 h-5 mb-1" />
                    <span className="text-[7px] uppercase tracking-wider font-extrabold">No Banner Image</span>
                  </div>
                )}
                
                <div className="flex-1 space-y-1.5 w-full text-left">
                  <label className="block font-bold text-slate-705">Upload Header Title Banner Image (SVG / PNG / JPG)</label>
                  <input
                    type="file"
                    accept="image/png, image/jpeg, image/jpg, image/svg+xml"
                    onChange={handleHeaderTitleImgChange}
                    className="w-full text-[11px] text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-[11px] file:font-bold file:bg-slate-950 file:text-white hover:file:bg-slate-900 file:cursor-pointer"
                  />
                  <p className="text-[9px] text-slate-450 leading-relaxed">
                    A banner image containing the company typographic brand or logo elements to use at the center-header of PIs and commercial letters.
                  </p>
                </div>
              </div>

              {/* Upload Printable Footer Image/SVG */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col sm:flex-row gap-4 items-center mt-3">
                {profile.footerImg ? (
                  <div className="relative w-full max-w-[200px] h-16 bg-white border border-slate-200 rounded-lg flex items-center justify-center p-1 overflow-hidden shrink-0">
                    <img src={profile.footerImg} alt="Corporate Footer Graphic" className="max-w-full max-h-full object-contain" />
                    <button
                      type="button"
                      onClick={() => setProfile({ ...profile, footerImg: '', useFooterImg: false })}
                      className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold cursor-pointer transition-colors"
                      title="Remove Footer"
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <div className="w-full max-w-[200px] h-16 bg-slate-100 border border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center text-slate-400 shrink-0">
                    <Image className="w-5 h-5 mb-1" />
                    <span className="text-[7px] uppercase tracking-wider font-extrabold">No Footer Image</span>
                  </div>
                )}
                
                <div className="flex-1 space-y-1.5 w-full text-left">
                  <label className="block font-bold text-slate-705">Upload Footer Image / SVG (Full-Width, Edge-to-Edge)</label>
                  <input
                    type="file"
                    accept="image/png, image/jpeg, image/jpg, image/svg+xml"
                    onChange={handleFooterImgChange}
                    className="w-full text-[11px] text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-[11px] file:font-bold file:bg-slate-950 file:text-white hover:file:bg-slate-900 file:cursor-pointer"
                  />
                  <p className="text-[9px] text-slate-450 leading-relaxed">
                    Upload an SVG or high-resolution banner image to be used as a full-width, edge-to-edge footer in LC Documents and Price Quotations.
                  </p>
                  
                  {profile.footerImg && (
                    <div className="flex items-center gap-2 bg-white p-2.5 rounded-lg border border-slate-200 shadow-sm shadow-slate-100/40 mt-2">
                      <input
                        id="useFooterImg"
                        type="checkbox"
                        checked={!!profile.useFooterImg}
                        onChange={(e) => setProfile({ ...profile, useFooterImg: e.target.checked })}
                        className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500 cursor-pointer"
                      />
                      <label htmlFor="useFooterImg" className="text-[10px] font-extrabold text-slate-700 select-none cursor-pointer">
                        Use this uploaded Image/SVG as the Footer in LC Documents & Price Quotation (removes standard text footer)
                      </label>
                    </div>
                  )}
                </div>
              </div>

              {/* Header bottom lines styling */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide">Header Dividing Lines &amp; Brand Gradients</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white border p-3 rounded-lg border-slate-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-extrabold text-slate-700">Upper divider Line</span>
                      <input
                        type="checkbox"
                        checked={!!profile.line1Active}
                        onChange={(e) => setProfile({ ...profile, line1Active: e.target.checked })}
                      />
                    </div>
                    <input
                      type="color"
                      disabled={!profile.line1Active}
                      value={profile.line1Color || '#007D46'}
                      onChange={(e) => setProfile({ ...profile, line1Color: e.target.value, firstColor: e.target.value })}
                      className="w-full h-8 rounded cursor-pointer disabled:opacity-50"
                    />
                  </div>

                  <div className="bg-white border p-3 rounded-lg border-slate-200">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-extrabold text-slate-700">Lower divider Line</span>
                      <input
                        type="checkbox"
                        checked={!!profile.line2Active}
                        onChange={(e) => setProfile({ ...profile, line2Active: e.target.checked })}
                      />
                    </div>
                    <input
                      type="color"
                      disabled={!profile.line2Active}
                      value={profile.line2Color || '#ed1c24'}
                      onChange={(e) => setProfile({ ...profile, line2Color: e.target.value, secondColor: e.target.value })}
                      className="w-full h-8 rounded cursor-pointer disabled:opacity-50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                  <div className="bg-white border p-3 rounded-lg border-slate-200">
                    <label className="block text-slate-700 font-bold mb-1.5">Fallback Color 1</label>
                    <input
                      type="color"
                      value={profile.firstColor || '#007D46'}
                      onChange={(e) => setProfile({ ...profile, firstColor: e.target.value })}
                      className="w-full h-8 rounded cursor-pointer"
                    />
                  </div>

                  <div className="bg-white border p-3 rounded-lg border-slate-200">
                    <label className="block text-slate-700 font-bold mb-1.5">Fallback Color 2</label>
                    <input
                      type="color"
                      value={profile.secondColor || '#ed1c24'}
                      onChange={(e) => setProfile({ ...profile, secondColor: e.target.value })}
                      className="w-full h-8 rounded cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Sub-section: Administrative Contacts */}
            <div className="space-y-3 border-t border-slate-100 pt-4">
              <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Mail className="w-4 h-4 text-slate-500" /> Administrative Contacts &amp; Hotline Directory
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 border border-slate-200 p-4 rounded-xl">
                <div className="space-y-1">
                  <label className="block font-bold text-slate-700">Primary Corporate Email</label>
                  <input
                    type="email"
                    value={profile.emails[0] || ''}
                    onChange={(e) => {
                      const updated = [...(profile.emails || [])];
                      updated[0] = e.target.value;
                      setProfile({ ...profile, emails: updated });
                    }}
                    placeholder="email@company.com"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 font-bold focus:ring-1 focus:ring-emerald-500 text-xs text-slate-900"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block font-bold text-slate-700">Backup Contact Email</label>
                  <input
                    type="email"
                    value={profile.emails[1] || ''}
                    onChange={(e) => {
                      const updated = [...(profile.emails || [])];
                      updated[1] = e.target.value;
                      setProfile({ ...profile, emails: updated });
                    }}
                    placeholder="backup@company.com"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 font-bold focus:ring-1 focus:ring-emerald-500 text-xs text-slate-900"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block font-bold text-slate-700">Operational Telephone (Hotline)</label>
                  <input
                    type="text"
                    value={profile.phones[0] || ''}
                    onChange={(e) => {
                      const updated = [...(profile.phones || [])];
                      updated[0] = e.target.value;
                      setProfile({ ...profile, phones: updated });
                    }}
                    placeholder="e.g. 01778262909"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 font-bold focus:ring-1 focus:ring-emerald-500 text-xs text-slate-900"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block font-bold text-slate-700">Representative Cell Phone</label>
                  <input
                    type="text"
                    value={profile.phones[1] || ''}
                    onChange={(e) => {
                      const updated = [...(profile.phones || [])];
                      updated[1] = e.target.value;
                      setProfile({ ...profile, phones: updated });
                    }}
                    placeholder="e.g. 01406122678"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 font-bold focus:ring-1 focus:ring-emerald-500 text-xs text-slate-900"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3 border-t border-slate-100 pt-4">
              <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Building className="w-4 h-4 text-slate-500" /> Warehouse &amp; Factory Address
              </h3>
              
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="block font-bold text-slate-700">Office Headquarters Address</label>
                  <input
                    type="text"
                    value={profile.addresses.office}
                    onChange={(e) => setProfile({
                      ...profile,
                      addresses: { ...profile.addresses, office: e.target.value }
                    })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-bold focus:bg-white text-xs text-slate-900"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block font-bold text-slate-700">Manufacturing Plant (Factory) Address</label>
                  <input
                    type="text"
                    value={profile.addresses.factory}
                    onChange={(e) => setProfile({
                      ...profile,
                      addresses: { ...profile.addresses, factory: e.target.value }
                    })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-bold focus:bg-white text-xs text-slate-900"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block font-bold text-slate-705">Embed Map HTML Code / Google Map URL (ঐচ্ছিক)</label>
                  <textarea
                    rows={2}
                    value={profile.embedMapCode || ''}
                    onChange={(e) => setProfile({
                      ...profile,
                      embedMapCode: e.target.value
                    })}
                    placeholder='Google Maps-এর "Share > Embed a map" থেকে প্রাপ্ত সম্পূর্ণ <iframe src="..." ...></iframe> কোডটি অথবা ডিরেক্ট ম্যাপ লিংকটি এখানে পেস্ট করুন।'
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 font-bold focus:bg-white text-xs text-slate-900 leading-relaxed font-mono"
                  />
                </div>
              </div>
            </div>

            {canEdit && (
              <div className="border-t border-slate-100 pt-5 flex justify-end gap-3">
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-slate-950 text-white font-extrabold text-xs rounded-xl hover:bg-slate-900 transition-all uppercase tracking-wider cursor-pointer shadow-sm flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Profile &amp; Sync</span>
                </button>
              </div>
            )}
          </form>
        </div>
      )}

      {/* SUB-TAB B: USER ACCOUNTS (RBAC ROLE LIST) */}
      {activeSubTab === 'users' && (
        <div className="space-y-6">
          <div className="border-b border-indigo-100 pb-3">
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <Shield className="w-4.5 h-4.5 text-indigo-600" />
              <span>Role-Based Access Control (RBAC) Console</span>
            </h3>
            <p className="text-[11px] text-slate-500 mt-1">
              Add user accounts, limit Tab Access, and toggle write permissions. Only approved credentials can bypass the login portal in real-time.
            </p>
          </div>

          {userSuccess && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-950 p-4 rounded-xl text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{userSuccess}</span>
            </div>
          )}

          {userError && (
            <div className="bg-amber-50 border border-amber-205 text-amber-950 p-4 rounded-xl text-xs font-bold flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
              <span>{userError}</span>
            </div>
          )}

          {/* Form to Create Sub-users */}
          <form onSubmit={handleAddUserAccount} className="bg-slate-50 border border-slate-200 p-5 rounded-xl space-y-4 text-xs">
            <h4 className="font-black text-[11px] text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-200 pb-2">
              {editingUser ? (
                <>
                  <Shield className="w-4 h-4 text-amber-500" />
                  <span>Edit Operator Credentials ({editingUser.email})</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 text-indigo-500" />
                  <span>Provision New User Terminal Credentials</span>
                </>
              )}
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="block font-bold text-slate-700">Operator Full Name (নাম)</label>
                <div className="relative">
                  <Users className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    placeholder="e.g. Salim Al Deen"
                    className="w-full bg-white border border-slate-300 rounded-lg pl-8 pr-3 py-2 font-bold focus:ring-1 focus:ring-indigo-500 focus:outline-none text-xs text-slate-900"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block font-bold text-slate-700">Account Email Address *</label>
                <div className="relative">
                  <Mail className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    placeholder="operator@acoolatrims.com"
                    className="w-full bg-white border border-slate-300 rounded-lg pl-8 pr-3 py-2 font-bold focus:ring-1 focus:ring-indigo-500 focus:outline-none text-xs text-slate-900"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block font-bold text-slate-700">
                  Secure Password Key {editingUser ? '(Optional)' : '*'}
                </label>
                <div className="relative">
                  <Key className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type={showNewUserPassword ? "text" : "password"}
                    required={!editingUser}
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    placeholder={editingUser ? "Leave blank to keep current" : "Set simple password (e.g., Ayra.Sub002)"}
                    className="w-full bg-white border border-slate-300 rounded-lg pl-8 pr-10 py-2 font-bold focus:ring-1 focus:ring-indigo-500 focus:outline-none text-xs text-slate-900"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewUserPassword(!showNewUserPassword)}
                    className="absolute right-3 top-2 w-5 h-5 text-slate-400 hover:text-slate-600 focus:outline-none flex items-center justify-center cursor-pointer"
                    title={showNewUserPassword ? "Hide password" : "Show password"}
                  >
                    {showNewUserPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-slate-200/50 pt-4">
              <div className="space-y-1">
                <label className="block font-bold text-slate-700">Designation / Role (পদবী)</label>
                <input
                  type="text"
                  value={newUserDesignation}
                  onChange={(e) => setNewUserDesignation(e.target.value)}
                  placeholder="e.g. Sales Executive / Manager"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 font-bold focus:ring-1 focus:ring-indigo-500 focus:outline-none text-xs text-slate-900"
                />
              </div>

              <div className="space-y-1">
                <label className="block font-bold text-slate-700">Department (বিভাগ)</label>
                <input
                  type="text"
                  value={newUserDepartment}
                  onChange={(e) => setNewUserDepartment(e.target.value)}
                  placeholder="e.g. Marketing / Accounts"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 font-bold focus:ring-1 focus:ring-indigo-500 focus:outline-none text-xs text-slate-900"
                />
              </div>

              <div className="space-y-1">
                <label className="block font-bold text-slate-700">Signature Image/SVG (স্বাক্ষর)</label>
                <div className="flex gap-2">
                  <input
                    type="file"
                    accept="image/*,image/svg+xml"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        if (file.size > 500 * 1024) {
                          setUserError('Error: Please choose a signature image/SVG under 500kb.');
                          return;
                        }
                        const reader = new FileReader();
                        reader.onloadend = async () => {
                          const compressed = await compressImage(reader.result as string);
                          setNewUserSignatureUrl(compressed);
                          setUserError('');
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="hidden"
                    id="user-signature-upload"
                  />
                  <label htmlFor="user-signature-upload" className="bg-white border border-slate-300 rounded-lg px-3 py-2 font-bold hover:bg-slate-100 flex-1 text-center cursor-pointer text-xs flex items-center justify-center gap-1.5 min-h-[34px] border-dashed border-indigo-300">
                    <Image className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />
                    <span>{newUserSignatureUrl ? 'Change Signature' : 'Upload Signature'}</span>
                  </label>
                  {newUserSignatureUrl && (
                    <div className="relative flex items-center justify-center bg-white border border-slate-300 rounded-lg p-1 w-12 h-[34px]">
                      <img src={newUserSignatureUrl} alt="Signature Preview" className="max-h-full max-w-full object-contain" />
                      <button
                        type="button"
                        onClick={() => setNewUserSignatureUrl('')}
                        className="absolute -top-1 -right-1 bg-rose-500 text-white rounded-full leading-none flex items-center justify-center font-bold text-[8px]"
                        style={{ width: '13px', height: '13px' }}
                      >
                        ×
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Micro Tab Access Grid */}
            <div className="space-y-2 pt-2">
              <label className="block font-black text-slate-750 uppercase tracking-wider text-[10px]">
                Granular Permissions Matrix &amp; Allowed Modules
              </label>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 bg-white border border-slate-200 rounded-xl p-4 max-h-[220px] overflow-y-auto">
                {AVAILABLE_TABS.map(tab => {
                  const isChecked = newUserAllowedTabs.includes(tab.id);
                  const isWrite = newUserWriteAccess[tab.id] || false;

                  return (
                    <div 
                      key={tab.id} 
                      className={`p-2.5 rounded-lg border transition-all flex flex-col justify-between items-start gap-1.5 select-none ${
                        isChecked ? 'bg-indigo-50/40 border-indigo-200' : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => handleToggleTabAllowed(tab.id)}
                        className="flex items-center gap-2 text-left cursor-pointer font-bold w-full"
                      >
                        {isChecked ? (
                          <CheckSquare className="w-4 h-4 text-indigo-650 shrink-0" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-400 shrink-0" />
                        )}
                        <span className="text-[10.5px] text-slate-800 leading-tight block">{tab.label}</span>
                      </button>

                      {isChecked && (
                        <button
                          type="button"
                          onClick={() => handleToggleTabWriteAccess(tab.id)}
                          className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider cursor-pointer mt-1 self-end transition-all text-white bg-slate-950"
                        >
                          {isWrite ? (
                            <span className="text-emerald-400 flex items-center gap-0.5">
                              <ToggleRight className="w-4 h-4 text-emerald-400 inline" /> WRITE/EDIT
                            </span>
                          ) : (
                            <span className="text-amber-400 flex items-center gap-0.5">
                              <ToggleLeft className="w-4 h-4 text-amber-500 inline" /> READ-ONLY
                            </span>
                          )}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end items-center gap-2 pt-1">
              {editingUser && (
                <button
                  type="button"
                  onClick={handleCancelUserEdit}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-900 font-bold rounded-lg transition-all cursor-pointer text-xs"
                >
                  Cancel Edit
                </button>
              )}
              <button
                type="submit"
                className={`px-5 py-2 text-white font-extrabold rounded-lg tracking-wider transition-all cursor-pointer flex items-center gap-1.5 text-xs shadow-sm ${
                  editingUser 
                    ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-200' 
                    : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'
                }`}
              >
                {editingUser ? (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Save User Credentials Update</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    <span>Register User Credentials</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* User Account Registry Table */}
          <div className="space-y-2 mt-4">
            <h4 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
              <span>Active Operator Accounts list ({userAccounts.length})</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            </h4>

            {userAccounts.length === 0 ? (
              <div className="border border-dashed border-slate-300 p-8 rounded-xl text-center text-slate-400 font-bold">
                No sub-user terminals configured. Only Master Admin credentials (salim@ayra.com / Salim@Ayra.CL0001) can authenticate.
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-left text-xs text-slate-900 font-sans">
                  <thead className="bg-slate-100 uppercase tracking-wider font-extrabold text-[9px] border-b border-slate-200 text-slate-700 select-none">
                    <tr>
                      <th className="p-3">Operator Profile</th>
                      <th className="p-3">Allowed Tabs & Permissions</th>
                      <th className="p-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userAccounts.map(account => (
                      <tr key={account.id} className="border-b last:border-0 border-slate-200 hover:bg-slate-50 transition-colors">
                        <td className="p-3 select-all">
                          {account.name && (
                            <div className="font-extrabold text-slate-950 text-xs flex items-center gap-1">
                              <Users className="w-3.5 h-3.5 text-slate-500" />
                              <span>{account.name}</span>
                            </div>
                          )}
                          <div className="font-semibold text-blue-900 text-[11px] select-all">{account.email}</div>
                          {account.designation && (
                            <div className="text-[10px] text-slate-600 font-bold mt-0.5">
                              {account.designation} {account.department ? `| ${account.department}` : ''}
                            </div>
                          )}
                          {account.signatureUrl && (
                            <div className="mt-1">
                              <img src={account.signatureUrl} alt="Signature preview" className="h-6 object-contain border border-slate-200 rounded p-0.5 bg-white" />
                            </div>
                          )}
                        </td>
                        <td className="p-3">
                          <div className="flex flex-wrap gap-1">
                            {account.allowedTabs?.map(tabId => {
                              const tabDetails = AVAILABLE_TABS.find(t => t.id === tabId);
                              const pathLabel = tabDetails ? tabDetails.label : tabId;
                              const isWrite = account.writeAccess?.[tabId] || false;
                              return (
                                <span 
                                  key={tabId} 
                                  className={`text-[8.5px] font-extrabold px-1.5 py-0.5 rounded flex items-center gap-1 ${
                                    isWrite ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-slate-100 text-slate-850'
                                  }`}
                                  title={`${pathLabel} (${isWrite ? 'Writable' : 'Read-Only'})`}
                                >
                                  <span>{pathLabel.split(' ')[0]}</span>
                                  {isWrite && <span className="text-[7.5px] bg-emerald-500 text-white rounded px-0.5">W</span>}
                                </span>
                              );
                            })}
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleLoadUserEdit(account)}
                              className="p-1 px-2 text-indigo-700 hover:bg-indigo-50 text-[10px] font-extrabold rounded-md flex items-center gap-1 cursor-pointer border border-indigo-200 shadow-sm"
                              title="Edit operator settings"
                            >
                              <Save className="w-3 h-3 text-indigo-650" />
                              <span>Edit</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteUserAccount(account.id)}
                              className="p-1 px-2 text-rose-650 hover:bg-rose-50 text-[10px] font-extrabold rounded-md flex items-center gap-1 cursor-pointer border border-rose-200 shadow-sm shadow-rose-100"
                              title="Revoke and delete credentials"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Revoke</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB C: DATABASE & HOSTING CONFIG */}
      {activeSubTab === 'db_settings' && (
        <div className="space-y-6">
          <div className="border-b border-emerald-100 pb-3">
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <Database className="w-4.5 h-4.5 text-emerald-650" />
              <span>Database &amp; Active Hosting Configuration Pointers</span>
            </h3>
            <p className="text-[11px] text-slate-500 mt-1">
              Dynamically switch pointers to live SQL/Firestore database nodes and override default application namespaces safely.
            </p>
          </div>

          {dbSuccess && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-950 p-4 rounded-xl text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{dbSuccess}</span>
            </div>
          )}

          {/* Bengali Verbatim Instruction Panel */}
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-950 p-6 rounded-2xl space-y-4 font-sans shadow-xs shadow-emerald-100">
            <h4 className="font-black text-xs text-emerald-850 border-b border-emerald-200/60 pb-2 flex items-center gap-1.5 uppercase">
              <span>📋 সহজ বাংলায় ডেটাবেজ ও হোস্টিং সেটআপ নির্দেশিকাঃ</span>
            </h4>
            <ul className="list-decimal list-inside space-y-2 text-[11.5px] leading-relaxed text-emerald-900 font-bold select-none">
              <li>অ্যাপ্লিকেশন বা সিস্টেমের সফল ও নিরাপদ লাইভ অপারেশনের জন্য সঠিক নোড ডোমেইন বা হোস্টিং লিংক সেট করুন।</li>
              <li>হোস্টিং প্রোভাইডার থেকে প্রাপ্ত ডেটাবেজ হোস্ট এড্রেস (DB Host, DB Name, DB User, DB Password) সাবধানে এন্ট্রি দিন।</li>
              <li>ভুল ডেটা এন্ট্রি ডেটাবেজ সংযোগ বিচ্ছিন্ন করতে পারে, যার ফলে ডেটা রিড/রাইট সাময়িকভাবে বন্ধ হয়ে যেতে পারে।</li>
              <li>সফলভাবে পরিবর্তনের পর আপনার লাইভ কন্টেইনার স্বয়ংক্রিয়ভাবে নতুন কেন্দ্রীয় সিস্টেমে রি-লিঙ্ক হয়ে ডেটা সিঙ্ক সম্পন্ন করবে।</li>
            </ul>

            <div className="bg-white/85 border border-emerald-200/60 p-4 rounded-xl space-y-3 mt-3">
              <span className="font-extrabold text-xs text-emerald-950 block">🔑 প্রতিটি ফিল্ড যেভাবে পূরণ করবেন ও ডেটা যেভাবে সংগ্রহ করবেন:</span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[11px] text-slate-700 leading-relaxed font-semibold">
                <div className="space-y-1.5">
                  <p><strong className="text-slate-900 font-black">১. Application Name:</strong> এটি সফটওয়্যারের মূল ব্র্যান্ড নাম। নতুন প্রজেক্টের জন্য নিজের কাস্টম ব্র্যান্ড বা কোম্পানির নাম লিখুন (যেমন: <code className="bg-slate-100 px-1 rounded font-mono">My Brand ERP</code>)।</p>
                  <p><strong className="text-slate-900 font-black">২. Live App URL:</strong> আপনি যেখানে সফটওয়্যার বা ওয়েবসাইট হোস্ট করেছেন, তার মূল ডোমেন লিংক (যেমন: <code className="bg-slate-100 px-1 rounded font-mono">https://new-domain.com</code>)।</p>
                  <p><strong className="text-slate-900 font-black">৩. Database Host (DB Host):</strong> হোস্টিং প্রোভাইডার থেকে প্রাপ্ত ডেটাবেজ হোস্ট আইপি বা অ্যাড্রেস। বেশিরভাগ সাধারণ সিপ্যানেল বা শেয়ার্ড হোস্টিংয়ে এটি <code className="bg-slate-100 px-1 rounded font-mono">localhost</code> বা <code className="bg-slate-100 px-1 rounded font-mono">127.0.0.1</code> হয়ে থাকে।</p>
                </div>
                <div className="space-y-1.5">
                  <p><strong className="text-slate-900 font-black">৪. Database Name (DB Name):</strong> আপনার সিপ্যানেল বা ডেডিকেটেড হোস্টিং প্যানেলে "MySQL Database Wizard/Creator" ব্যবহার করে যে ডেটাবেজটি তৈরি করেছেন তার হুবহু নাম।</p>
                  <p><strong className="text-slate-900 font-black">৫. Database Username (DB User):</strong> ডাটাবেজের সাথে সংযুক্ত করার জন্য আপনার তৈরি করা অ্যাক্সেস ইউজারের নাম।</p>
                  <p><strong className="text-slate-900 font-black">৬. Database Password (DB Password):</strong> ডেটাবেজ ইউজার মেম্বার অ্যাকাউন্ট ক্রিয়েট করার সময় সেট করা সিকিউর মূল পাসওয়ার্ড।</p>
                </div>
              </div>
            </div>
          </div>

          <form onSubmit={handleSaveDbConfig} className="bg-slate-50 border border-slate-205 p-5 rounded-xl space-y-4 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block font-bold text-slate-700">Application Name (Namespace / Brand)</label>
                <input
                  type="text"
                  required
                  value={dbConfig.appName || ''}
                  onChange={(e) => setDbConfig({ ...dbConfig, appName: e.target.value })}
                  placeholder="Acoola Trims ERP"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 font-bold focus:ring-1 focus:ring-emerald-500 focus:outline-none text-xs text-slate-900"
                />
              </div>

              <div className="space-y-1">
                <label className="block font-bold text-slate-700">Live App URL (Domain Address)</label>
                <input
                  type="text"
                  required
                  value={dbConfig.liveAppUrl || ''}
                  onChange={(e) => setDbConfig({ ...dbConfig, liveAppUrl: e.target.value })}
                  placeholder="https://acoola-trims.live"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 font-bold focus:ring-1 focus:ring-emerald-500 focus:outline-none text-xs text-slate-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block font-bold text-slate-700">Database Host (DB Host Address)</label>
                <input
                  type="text"
                  required
                  value={dbConfig.dbHost || ''}
                  onChange={(e) => setDbConfig({ ...dbConfig, dbHost: e.target.value })}
                  placeholder="localhost"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 font-bold focus:ring-1 focus:ring-emerald-500 focus:outline-none text-xs text-slate-900"
                />
              </div>

              <div className="space-y-1">
                <label className="block font-bold text-slate-700">Database Name (DB Name)</label>
                <input
                  type="text"
                  required
                  value={dbConfig.dbName || ''}
                  onChange={(e) => setDbConfig({ ...dbConfig, dbName: e.target.value })}
                  placeholder="acoola_main_db"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 font-bold focus:ring-1 focus:ring-emerald-500 focus:outline-none text-xs text-slate-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-b border-slate-200 pb-4">
              <div className="space-y-1">
                <label className="block font-bold text-slate-700">Database Username (DB User)</label>
                <input
                  type="text"
                  required
                  value={dbConfig.dbUser || ''}
                  onChange={(e) => setDbConfig({ ...dbConfig, dbUser: e.target.value })}
                  placeholder="admin"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 font-bold focus:ring-1 focus:ring-emerald-500 focus:outline-none text-xs text-slate-900"
                />
              </div>

              <div className="space-y-1">
                <label className="block font-bold text-slate-705">Database Password (DB Password)</label>
                <input
                  type="password"
                  value={dbConfig.dbPassword || ''}
                  onChange={(e) => setDbConfig({ ...dbConfig, dbPassword: e.target.value })}
                  placeholder="••••••••••••"
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 font-bold focus:ring-1 focus:ring-emerald-500 focus:outline-none text-xs tracking-wider text-slate-900"
                />
              </div>
            </div>

            {/* Step-by-Step Firebase Creation Guideline */}
            <div className="bg-gradient-to-br from-indigo-50/70 to-emerald-50/70 border border-emerald-100 p-5 rounded-xl space-y-3.5 text-[11px] text-slate-800 leading-relaxed font-sans shadow-xs select-text">
              <p className="font-black text-emerald-950 border-b border-slate-200/50 pb-2 text-xs flex items-center gap-1.5 leading-relaxed uppercase">
                <span>🆕 নতুন Firebase ডেটাবেজ প্রজেক্ট সেটআপ ও সংযোগ করার সহজ গাইডলাইন (Step-by-Step Guide):</span>
              </p>
              <div className="space-y-2.5 font-medium text-slate-700">
                <p>আপনার সিস্টেমের ডাটা সম্পূর্ণ আলাদা ও কাস্টম ডেটাবেজে সংরক্ষণ করতে গুগল ফায়ারবেস সেটআপ করতে নিচের সহজ ধাপগুলো অনুসরণ করুন:</p>
                <ol className="list-decimal list-inside space-y-2 pl-1 text-[10.5px]">
                  <li>
                    <strong className="text-slate-955 font-extrabold">ধাপ ১: Firebase Console এ প্রবেশ করুন</strong>
                    <br />
                    <span className="text-slate-550 block pl-4">ডিভাইস ব্রাউজারে <a href="https://console.firebase.google.com" target="_blank" rel="noopener noreferrer" className="text-emerald-700 underline font-bold hover:text-emerald-800">console.firebase.google.com</a> লিখে গুগল আইডি দিয়ে সাইন-ইন করুন।</span>
                  </li>
                  <li>
                    <strong className="text-slate-955 font-extrabold">ধাপ ২: একটি নতুন প্রজেক্ট তৈরি করুন</strong>
                    <br />
                    <span className="text-slate-550 block pl-4">"Add Project" বোতামে ক্লিক করে প্রজেক্টের নাম (যেমনঃ <span className="font-mono">acoola-erp-prod</span>) দিয়ে পরবর্তী ধাপগুলো সম্পন্ন করুন।</span>
                  </li>
                  <li>
                    <strong className="text-slate-955 font-extrabold">ধাপ ৩: Firestore Database এবং Email Auth সক্রিয় করুন</strong>
                    <br />
                    <span className="text-slate-550 block pl-4">Build মেনু থেকে Firestore Database এবং Authentication সেন্ট্রাল প্যানেলে সেট করে রুলস চালু করে নিন।</span>
                  </li>
                  <li>
                    <strong className="text-slate-955 font-extrabold">ধাপ ৪: Web App রেজিস্টার করে Config সংগ্রহ করা</strong>
                    <br />
                    <span className="text-slate-550 block pl-4">ফায়ারবেস প্রজেক্টের প্রধান ড্যাশবোর্ডে ফিরে আসুন এবং <strong className="text-indigo-650">Web ( &lt;/&gt; )</strong> আইকনে ক্লিক করে যেকোনো ডাকনাম (যেমন: <span className="font-mono">acoola-web</span>) দিয়ে অ্যাপটি রেজিস্টার করুন। সাথে সাথে স্ক্রিনে একটি জাভাস্ক্রিপ্ট কোড ব্লক ভেসে উঠবে যার মাঝে <span className="font-mono bg-slate-100 text-indigo-700 font-bold border rounded px-1.5 py-0.5">const firebaseConfig = &#123; ... &#125;;</span> লেখাটি শো করবে।</span>
                  </li>
                  <li>
                    <strong className="text-slate-955 font-extrabold">ধাপ ৫: প্রাপ্ত অবজেক্টের কীগুলো নিচের নির্দিষ্ট ফর্মে বসানো (Mapping Keys)</strong>
                    <br />
                    <span className="text-slate-550 block pl-4">প্রাপ্ত <span className="font-mono font-bold text-indigo-900">firebaseConfig</span> কোড থেকে নিচের কীগুলো দেখে দেখে কপি করে আমাদের এই ফর্মের নির্দিষ্ট ঘরে বসান:</span>
                    <ul className="list-disc list-inside pl-6 mt-1.5 space-y-1 text-[10px] text-slate-650 bg-white/70 p-2.5 rounded-lg border border-slate-200">
                      <li><span className="font-mono font-bold text-indigo-700">apiKey</span> এর দীর্ঘ কোডটি কপি করে বসবে এই ফর্মের <strong className="text-slate-955">Firebase API Key (apiKey)</strong> এর ঘরে।</li>
                      <li><span className="font-mono font-bold text-indigo-700">projectId</span> এর মান যেমন <span className="font-mono">"acoola-erp-prod"</span> বসবে <strong className="text-slate-955">Firebase Project ID</strong> এর ঘরে।</li>
                      <li><span className="font-mono font-bold text-indigo-700">authDomain</span>, <span className="font-mono font-bold text-indigo-700">storageBucket</span>, <span className="font-mono font-bold text-indigo-700">messagingSenderId</span> এবং <span className="font-mono font-bold text-indigo-700">appId</span> এর সোজাসুজি মানগুলো কপি করে সংশ্লিষ্ট এন্ট্রি ফিল্ডে ইনপুট দিন।</li>
                    </ul>
                  </li>
                  <li>
                    <strong className="text-slate-955 font-extrabold">ধাপ ৬: পরিবর্তন সেভ করতে "Save Database settings &amp; sync" বাটনে চাপ দিন</strong>
                    <br />
                    <span className="text-slate-550 block pl-4">সমস্ত ডাটা নির্ভুলভাবে পূরণ করার পর নিচের সবুজ <strong className="text-emerald-700">"Save Database settings &amp; sync"</strong> বাটনে ক্লিক করুন। ব্রাউজারটি স্বয়ংক্রিয়ভাবে রিলোড নিয়ে সম্পূর্ণ নতুন সেটআপকৃত Firebase প্রজেক্টে ডেটা লাইভ করা শুরু করবে!</span>
                  </li>
                  <li>
                    <strong className="text-slate-955 font-extrabold">ধাপ ৭: কোম্পানির নাম পরিবর্তন করুন (Whitelabel Basic Profile)</strong>
                    <br />
                    <span className="text-slate-550 block pl-4">সিস্টেমের যেকোনো পৃষ্ঠা, ব্যানার বা মানি রিসিটে নতুন ব্র্যান্ডের নাম প্রদর্শন করতে এই পেজের প্রথম সাব-ট্যাব <strong className="text-emerald-700">"Company Profile"</strong> এ যান। সেখানে গিয়ে কোম্পানির নাম, লোগো, মনোগ্রাম, অফিস ও ফ্যাক্টরী ঠিকানা, ইমেইল এবং ফোন এন্ট্রি করে সেভ করলেই সম্পূর্ণ সফটওয়্যারটির সকল চালানের প্রিন্টিং বয়ান শতভাগ ডাইনামিকভাবে পরিবর্তিত হয়ে যাবে।</span>
                  </li>
                  <li>
                    <strong className="text-slate-955 font-extrabold">ধাপ ৮: গুগল ড্রাইভ ক্লাউড ব্যাকআপ সিঙ্ক (Google Drive API Console integration)</strong>
                    <br />
                    <span className="text-slate-550 block pl-4">সম্পূর্ণ ডাটাবেজ ব্যাকআপ গুগল ড্রাইভে অটো-সেভ করতে নিচের গাইডলাইন অনুযায়ী গুগল ক্লাউড ইন্টিগ্রেট করুন:</span>
                    <ul className="list-disc list-inside pl-6 mt-1.5 space-y-1 text-[10px] text-slate-650 bg-white/70 p-2.5 rounded-lg border border-slate-200">
                      <li>গুগল ক্লাউড অ্যাকাউন্ট থেকে <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" className="text-emerald-700 underline font-bold hover:text-emerald-850">console.cloud.google.com</a> এ প্রবেশ করুন এবং আপনার উক্ত ফায়ারবেস প্রজেক্টটি সিলেক্ট করুন।</li>
                      <li>বামপাশের নেভিগেশন মেন্যুর <strong className="text-slate-805">"APIs & Services" &gt; "Library"</strong> তে ক্লিক করুন। সার্চ বক্সে লিখুন <strong className="font-mono text-indigo-750">"Google Drive API"</strong> এবং সেটি সিলেক্ট করে <strong className="text-emerald-700">"Enable"</strong> বোতামে চাপুন।</li>
                      <li>এরপর <strong className="text-slate-805">"OAuth Consent Screen"</strong> এ গিয়ে আপনার অ্যাপ নাম এবং সাপোর্ট ইমেইল দিয়ে সেভ করুন।</li>
                      <li>স্কোপস (Scopes) নির্ধারণ করার সময় <span className="font-mono bg-slate-100 text-indigo-750 text-[9px] px-1 rounded">https://www.googleapis.com/auth/drive.file</span> স্কোপটি সংযুক্ত নিশ্চিত করুন।</li>
                      <li>পাবলিশিং স্ট্যাটাস "Testing" রাখা অবস্থায় <strong className="text-slate-805">"Test Users"</strong> সেকশনে আপনার ব্যাকআপ ব্যবহারকারী মেইল অ্যাকাউন্টগুলো (যেমন: `youraccount@gmail.com` বা `admin@yourdomain.com`) টাইপ করে দিন।</li>
                      <li>ব্যস! এবার সাইডবারের ক্লাউড আইকন থেকে ১-ক্লিকেই ড্রাইভে ব্যাকআপ ড্রপ করতে বা রি-স্টোর করতে পারবেন সরাসরি নতুন ড্রাইভ কানেক্টিভিটিতে!</li>
                    </ul>
                  </li>
                </ol>
              </div>
            </div>
            {/* CENTRAL FIRESTORE OVERRIDE CONFIG */}
            <div className="border-t border-slate-205 pt-5 mt-4 space-y-4">
              <h4 className="font-extrabold text-[11px] text-emerald-850 flex items-center gap-1.5 uppercase tracking-wider">
                <Database className="w-4 h-4 text-emerald-600" />
                <span>ফায়ারস্টোর ডাইনামিক ডেটাবেজ সংযোগ (Firebase Central Overrides)</span>
              </h4>
              <p className="text-[10px] text-slate-550 leading-relaxed font-medium">
                ভিন্ন নামে বা অন্য হোস্টিংয়ে আলাদাভাবে এই সিস্টেমটি চালাতে চাইলে তার নিজস্ব Firebase প্রোজেক্টের ক্রেডেন্সিয়ালস এখানে এন্ট্রি দিন। এটি সেট করলে ডোমেইন বা হোস্টিং আলাদা হলেও কোনো ডেটা কনফ্লিক্ট হবে না। ফাঁকা থাকলে ডিফল্ট ডেটাবেজে কানেক্ট থাকবে।
              </p>

              {/* Domain & Hosting Relocation & Whitelabel Guide */}
              <div className="bg-amber-50/50 border border-amber-200/50 p-4 rounded-xl text-[10.5px] text-slate-800 space-y-2.5 font-sans">
                <p className="font-extrabold text-amber-950 uppercase tracking-wide flex items-center gap-1">
                  🌐 নতুন ডোমেইন, হোস্টিং ও সম্পূর্ণ আলাদা ডাটাবেজে রিলোকেট করার শতভাগ নিরাপদ গাইডলাইন (Data Isolation Guide):
                </p>
                <p className="leading-relaxed font-semibold text-slate-700">
                  সিস্টেমটির ডাটা আইসোলেশন (Data Isolation) শতভাগ সুরক্ষিত রাখতে নিচের সহজ নিয়মটি ফলো করুন:
                </p>
                <ul className="list-disc list-inside space-y-1.5 pl-2 font-medium text-slate-600">
                  <li>
                    <strong className="text-slate-900">১. কোম্পানির প্রোফাইল ব্র্যান্ডিং পরিবর্তন:</strong> এই পেজের প্রথম সাব-ট্যাব <strong className="text-emerald-700">"Company Profile"</strong>-এ গিয়ে আপনার নতুন কোম্পানির নাম, লোগো, মনোগ্রাম, ফোন ও ইমেইল সংরক্ষণ করুন। এটি করার সাথে সাথে মানি রিসিট, চালান, পিআই, ওয়ার্ক অর্ডার সহ সমস্ত পেজ শতভাগ ডাইনামিকভাবে পরিবর্তিত হয়ে যাবে।
                  </li>
                  <li>
                    <strong className="text-slate-900">২. সম্পূর্ণ ইউনিক নতুন ফায়ারবেস ডেটাবেজ সংযোগ:</strong> নিচে দেওয়া <strong className="text-emerald-700">Firebase Central Overrides</strong> ফরমের ক্রেডেন্সিয়ালসগুলো পূরণ করে সেভ করুন। এটি সেভ করার সাথে সাথে ব্রাউজারের লোকাল স্টোরেজ সম্পূর্ণ রি-রাউট হয়ে সম্পূর্ণ নতুন প্রজেক্ট ডেটাবেজে কানেক্ট হয়ে যাবে। এর ফলে রানিং কোম্পানির ডেটার সাথে নতুন কোম্পানির ডেটার কোনো কনফ্লিক্ট বা যোগাযোগ থাকবে না।
                  </li>
                  <li>
                    <strong className="text-slate-900">৩. নতুন ডোমেইন বা হোস্টিংয়ে আপলোড করার নিয়ম:</strong> এই পুরো কোডটি জিপ (ZIP) আকারে এক্সপোর্ট করে যেকোনো স্ট্যান্ডঅ্যালোন নোড/রিয়্যাক্ট হোস্টিংয়ে সরাসরি হোস্ট করতে পারবেন। ডোমেন আলাদা হলে ডেটাবেজের কালেকশন সম্পূর্ণ নিরাপদ অবস্থানে নতুন হোস্টিংএ আইসোলেটেড থাকবে।
                  </li>
                </ul>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-slate-700 font-bold">Firebase API Key (apiKey)</label>
                  <input
                    type="text"
                    value={dbConfig.fbApiKey || ''}
                    onChange={(e) => setDbConfig({ ...dbConfig, fbApiKey: e.target.value })}
                    placeholder="e.g. AIzaSyB..."
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 font-mono text-[10px] text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-slate-700 font-bold">Firebase Project ID (projectId)</label>
                  <input
                    type="text"
                    value={dbConfig.fbProjectId || ''}
                    onChange={(e) => setDbConfig({ ...dbConfig, fbProjectId: e.target.value })}
                    placeholder="e.g. ayra-erp-production"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 font-mono text-[10px] text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="block text-slate-705 font-bold">Auth Domain (authDomain)</label>
                  <input
                    type="text"
                    value={dbConfig.fbAuthDomain || ''}
                    onChange={(e) => setDbConfig({ ...dbConfig, fbAuthDomain: e.target.value })}
                    placeholder="e.g. ayra-erp.firebaseapp.com"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 font-mono text-[10px] text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-slate-700 font-bold">Storage Bucket (storageBucket)</label>
                  <input
                    type="text"
                    value={dbConfig.fbStorageBucket || ''}
                    onChange={(e) => setDbConfig({ ...dbConfig, fbStorageBucket: e.target.value })}
                    placeholder="e.g. ayra-erp.firebasestorage.app"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 font-mono text-[10px] text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-slate-700 font-bold">Messaging Sender ID</label>
                  <input
                    type="text"
                    value={dbConfig.fbMessagingSenderId || ''}
                    onChange={(e) => setDbConfig({ ...dbConfig, fbMessagingSenderId: e.target.value })}
                    placeholder="e.g. 58190028154"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 font-mono text-[10px] text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-slate-700 font-bold">App ID (appId)</label>
                  <input
                    type="text"
                    value={dbConfig.fbAppId || ''}
                    onChange={(e) => setDbConfig({ ...dbConfig, fbAppId: e.target.value })}
                    placeholder="e.g. 1:5819028154:web:ab..."
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 font-mono text-[10px] text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-slate-700 font-bold">Firestore Database ID</label>
                  <input
                    type="text"
                    value={dbConfig.fbFirestoreDatabaseId || ''}
                    onChange={(e) => setDbConfig({ ...dbConfig, fbFirestoreDatabaseId: e.target.value })}
                    placeholder="defaults to (default)"
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 font-mono text-[10px] text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {localStorage.getItem('custom_firebase_config') && (
                <div className="pt-2 flex justify-start">
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm('আপনি কি ডিফল্ট ফায়ারবেস ডেটাবেজে ফিরে যেতে চান?')) {
                        localStorage.removeItem('custom_firebase_config');
                        alert('ডিফল্ট ডেটাবেজ রিস্টোর করা হয়েছে! রিলোড করা হচ্ছে...');
                        window.location.reload();
                      }
                    }}
                    className="px-4 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 border border-red-300 font-extrabold rounded-lg text-[10px] tracking-wider transition-all cursor-pointer flex items-center gap-1 shrink-0"
                  >
                    <span>ডিফল্ট ডেটাবেজে ব্যাক করুন (Reset to App Default DB)</span>
                  </button>
                </div>
              )}

              {/* Google & Facebook Authentication Setup Guidelines */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-4 text-xs text-slate-700 leading-relaxed text-left">
                <div className="flex items-center gap-2 border-b pb-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
                  <h4 className="font-extrabold text-slate-900 uppercase text-[11px] tracking-wider">Google &amp; Facebook সামাজিক লগইন ও কনফিগারেশন গাইডলাইন (New Company Name Setup)</h4>
                </div>
                
                <p className="font-semibold text-slate-600">
                  আপনি যদি নতুন নামে কোম্পানি বা ভিন্ন কোনো ফায়ারবেস প্রজেক্টের আন্ডারে এই এপ্লিকেশনটি চালাতে চান, তবে নিচে দেওয়া পদ্ধতিগুলো অনুসরণ করে খুব সহজেই গুগল ও ফেসবুক অথেন্টিকেশন সেটআপ করতে পারবেন:
                </p>

                <div className="space-y-3.5">
                  <div className="space-y-1">
                    <p className="font-extrabold text-slate-900">১. ফায়ারবেস প্রজেক্ট তৈরি ও কনফিগারেশন:</p>
                    <ul className="list-disc pl-4 space-y-1 font-medium text-slate-600">
                      <li>Firebase Console (console.firebase.google.com) এ গিয়ে একটি নতুন প্রজেক্ট তৈরি করুন।</li>
                      <li>প্রজেক্টের আন্ডারে একটি <strong>Web App</strong> রেজিস্ট্রেশন করুন এবং প্রাপ্ত কনফিগারেশন কীগুলো (apiKey, projectId, appId ইত্যাদি) উপরে সঠিক ইনপুট বক্সে পেস্ট করে সংরক্ষণ করুন।</li>
                    </ul>
                  </div>

                  <div className="space-y-1">
                    <p className="font-extrabold text-slate-900">২. গুগল লগইন সক্রিয়করণ (Google Sign-In Provider):</p>
                    <ul className="list-disc pl-4 space-y-1 font-medium text-slate-600">
                      <li>ফায়ারবেস কনসোলের বাম পাশের মেনু থেকে <strong>Build &gt; Authentication</strong> সেকশনে যান।</li>
                      <li><strong>Sign-in method</strong> ট্যাবে ক্লিক করুন এবং <strong>Google</strong> প্রোভাইডারটি বেছে নিয়ে Enable বাটন অন করে দিন।</li>
                      <li>প্রজেক্ট সাপোর্ট ইমেইল সিলেক্ট করে সেভ করুন।</li>
                    </ul>
                  </div>

                  <div className="space-y-1">
                    <p className="font-extrabold text-slate-900">৩. ফেসবুক লগইন সক্রিয়করণ (Facebook Login Provider):</p>
                    <ul className="list-disc pl-4 space-y-1 font-medium text-slate-600">
                      <li>Facebook Developers Portal (developers.facebook.com) এ গিয়ে একটি নতুন ডেভলপার একাউন্ট ও অ্যাপ তৈরি করুন।</li>
                      <li>অ্যাপ ড্যাশবোর্ড থেকে <strong>Facebook Login</strong> প্রোডাক্টটি যুক্ত করুন।</li>
                      <li>ফায়ারবেস কনসোল অথেন্টিকেশন সেকশনে <strong>Facebook</strong> প্রোভাইডারটি সিলেক্ট করুন এবং সেখানে ফেসবুক থেকে প্রাপ্ত <strong>App ID</strong> এবং <strong>App Secret</strong> প্রদান করে সেভ করুন।</li>
                      <li>ফায়ারবেস যে <strong>OAuth redirect URI</strong> টি দেবে, সেটি ফেসবুক ডেভেলপার পোর্টালে (Facebook Login &gt; Settings) এর <em>Valid OAuth Redirect URIs</em> ফিল্ডে পেস্ট করে দিন।</li>
                    </ul>
                  </div>

                  <div className="space-y-1">
                    <p className="font-extrabold text-slate-900">৪. অথরাইজড ডোমেইন তালিকাভুক্ত করা (Whitelisting Domains):</p>
                    <ul className="list-disc pl-4 space-y-1 font-medium text-slate-600">
                      <li>Firebase Authentication &gt; Settings &gt; <strong>Authorized domains</strong> এ আপনার ওয়েবসাইটের ডোমেইন বা আইপি এড্রেসটি অবশ্যই যুক্ত করতে হবে। অন্যথায় গুগল ও ফেসবুক লগইন করার সময় ডোমেইন ব্লকের সম্মুখীন হতে পারেন।</li>
                    </ul>
                  </div>
                </div>

                <div className="bg-emerald-50 border border-emerald-200/50 rounded-lg p-3 text-[11px] font-bold text-emerald-800">
                  💡 আমাদের সিস্টেমটিতে অত্যন্ত আধুনিক ও সুরক্ষিত অফলাইন/অনলাইন অথেন্টিকেশন মেকানিজম ব্যবহার করা হয়েছে। আইফ্রেম সিকিউরিটি পলিসি বা ফায়ারবেস সেটআপের সমস্যার ক্ষেত্রে কাস্টমারদের লগইন সুবিধা সচল রাখতে সিস্টেমটি স্বয়ংক্রিয়ভাবে একটি নিরাপদ ফলব্যাক সিগন্যাল ড্যাশবোর্ড পপআপ প্রদান করে।
                </div>
              </div>
            </div>

            {canEdit && (
              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-lg tracking-wider transition-all cursor-pointer flex items-center gap-1.5 text-xs shadow-sm shadow-emerald-250"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Database settings &amp; sync</span>
                </button>
              </div>
            )}
          </form>
        </div>
      )}

    </div>
  );
}
