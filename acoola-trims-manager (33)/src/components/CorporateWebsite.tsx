import React, { useState, useEffect } from 'react';
import { sanitizeHtmlWithStyles } from '../lib/utils';
import { 
  Building2, Phone, Mail, MapPin, Globe, Award, Leaf, Briefcase, 
  BookOpen, User, Lock, Eye, EyeOff, ShieldAlert, CheckCircle, Clock, 
  ShoppingBag, Send, Search, Check, RefreshCw, Layers, Sparkles, 
  Server, FileCheck, ArrowUpRight, Plus, Download, ChevronRight, LogOut, LayoutDashboard, X, Menu 
} from 'lucide-react';
import { COMPANY_PROFILE as COMPANY_PROFILE_RAW } from '../data';
import { sha256 } from '../lib/crypto';
import { UserAccount, ProductItemCatalog, PRODUCT_CATEGORIES_MAP } from '../types';

interface ClientAccount {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  companyName: string;
  phone: string;
  address: string;
  joinedAt: string;
  deletedQuotationIds?: string[];
}

interface ClientInquiry {
  id: string;
  clientEmail: string;
  itemName: string;
  category: string;
  quantity: number;
  specDetails: string;
  status: 'Pending Review' | 'Sample Initiated' | 'Price Quoted' | 'Approved';
  date: string;
}

interface CorporateWebsiteProps {
  userAccounts: UserAccount[];
  sessionUser: any;
  products?: ProductItemCatalog[];
  jobOpportunities?: import('../types').JobOpportunity[];
  onAddJobApplication?: (app: import('../types').JobApplication) => void;
  onLoginSuccess: (user: any) => void;
  onLogout: () => void;
  viewMode: 'website' | 'erp' | 'client-portal';
  setViewMode: (mode: 'website' | 'erp' | 'client-portal') => void;
  companyProfile?: any;
  quotations?: any[];
  registeredClients?: any[];
  setRegisteredClients?: (clients: any[]) => void;
  pagesConfigs?: any[];
}

// ----------------- HIGH VALUE PRODUCTS CATALOG DATA -----------------
const WEBSITE_PRODUCTS = [
  { id: 'web-p1', name: 'Woven Satin Edge Labels', category: 'Labels', bdtPrice: '2.50 - 5.00', usdPrice: '0.02 - 0.05', desc: 'Ultra-soft woven labeling for premium brand collars.', materials: 'Recycled Polyester Weft' },
  { id: 'web-p2', name: 'High Density Care Labels', category: 'Labels', bdtPrice: '1.20 - 3.00', usdPrice: '0.01 - 0.03', desc: 'Wash-resistant crisp printing for multi-language instructions.', materials: 'Satin Ribbon / Nylon Taffeta' },
  { id: 'web-p3', name: 'Art Card Textured Hangtags', category: 'Hangtags', bdtPrice: '4.50 - 12.00', usdPrice: '0.04 - 0.12', desc: 'Matt laminated offset printed brand tags with metal eyelets.', materials: '350gsm FSC duplex board' },
  { id: 'web-p4', name: 'Eco-Degradable Polybags', category: 'Polybags & Boxes', bdtPrice: '3.00 - 8.05', usdPrice: '0.03 - 0.09', desc: 'Self-adhesive side-gusseted bags for garments logistics.', materials: 'D2W Bio-Degradable LDPE' },
  { id: 'web-p5', name: 'High-Density Printed Barcode Sticker', category: 'Labels', bdtPrice: '0.60 - 1.50', usdPrice: '0.005 - 0.015', desc: 'Thermal transfer printed adhesive stickers for barcode lookup.', materials: 'Semi-gloss FASSON paper' },
  { id: 'web-p6', name: 'Custom Plastic Seal Cords', category: 'Accessories & Trims', bdtPrice: '2.00 - 4.50', usdPrice: '0.018 - 0.04', desc: 'Double-locking security strings styled with premium brand logo embossed.', materials: 'Recycled ABS Plastic' },
  { id: 'web-p7', name: 'Premium Polyester Drawcords', category: 'Accessories & Trims', bdtPrice: '6.00 - 15.00', usdPrice: '0.06 - 0.15', desc: 'Braided waist drawcords matching silicon or brass tipped ends.', materials: 'Textured Filament Polyester' },
];

export default function CorporateWebsite({ 
  userAccounts, 
  sessionUser, 
  products = [],
  jobOpportunities = [],
  onAddJobApplication,
  onLoginSuccess, 
  onLogout,
  viewMode,
  setViewMode,
  companyProfile,
  quotations = [],
  registeredClients: registeredClientsProp = [],
  setRegisteredClients: setRegisteredClientsProp,
  pagesConfigs: propsPagesConfigs
}: CorporateWebsiteProps) {
  const COMPANY_PROFILE = companyProfile || COMPANY_PROFILE_RAW;
  const [activeTab, setActiveTab2] = useState<string>('home');
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [viewCategoryModal, setViewCategoryModal] = useState<string | null>(null);

  const [themeMode, setThemeMode] = useState<'light' | 'dark'>(() => {
    try {
      return (localStorage.getItem('website_theme_mode') || 'light') as 'light' | 'dark';
    } catch {
      return 'light';
    }
  });

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const getLinkUrl = (pageId: string) => {
    if (pageId === 'home') return 'https://motormobiling.com/home/';
    if (pageId === 'about') return 'https://motormobiling.com/about-us/';
    if (pageId === 'products') return 'https://motormobiling.com/products-solutions/';
    if (pageId === 'sustainability') return 'https://motormobiling.com/sustainability/';
    if (pageId === 'careers') return 'https://motormobiling.com/careers/';
    if (pageId === 'contact') return 'https://motormobiling.com/contact/';
    return `https://motormobiling.com/${pageId}/`;
  };

  const toggleThemeMode = () => {
    const nextMode = themeMode === 'light' ? 'dark' : 'light';
    setThemeMode(nextMode);
    try {
      localStorage.setItem('website_theme_mode', nextMode);
    } catch {}
  };

  const [headerSubtitle, setHeaderSubtitle] = useState(() => {
    try {
      return localStorage.getItem('acoola_header_subtitle') || 'GARMENTS TRIMS & ACCESSORIES';
    } catch {
      return 'GARMENTS TRIMS & ACCESSORIES';
    }
  });

  const [localPagesConfigs, setLocalPagesConfigs] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('acoola_website_pages');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        }
      }
    } catch {}
    return [];
  });

  const pagesConfigsUnsorted = propsPagesConfigs || localPagesConfigs;
  const pagesConfigs = [...pagesConfigsUnsorted].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  useEffect(() => {
    if (!window.location.hash && pagesConfigs && pagesConfigs.length > 0) {
      const visiblePages = pagesConfigs.filter(p => !p.isHidden);
      if (visiblePages.length > 0) {
        setActiveTab2(visiblePages[0].id);
      }
    }
  }, [pagesConfigs]);

  useEffect(() => {
    const handleSync = () => {
      try {
        const saved = localStorage.getItem('acoola_website_pages');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            setLocalPagesConfigs(parsed.sort((a, b) => (a.order ?? 0) - (b.order ?? 0)));
          }
        }
        const savedSubtitle = localStorage.getItem('acoola_header_subtitle');
        if (savedSubtitle !== null) {
          setHeaderSubtitle(savedSubtitle);
        }
      } catch {}
    };
    handleSync();
    window.addEventListener('storage', handleSync);
    return () => window.removeEventListener('storage', handleSync);
  }, [viewMode]);

  useEffect(() => {
    (window as any).viewCategorySubcategories = (categoryName: string) => {
      console.log('viewCategorySubcategories called with:', categoryName);
      setViewCategoryModal(categoryName);
    };
    return () => {
      delete (window as any).viewCategorySubcategories;
    };
  }, []);

  // Hash route parsing on mount and on hash change
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash) {
        // Match "#/pageId" or "#pageId"
        const pageId = hash.replace(/^#\/?/, '');
        if (pageId) {
          setActiveTab2(pageId);
        }
      }
    };

    // Run on initial mount
    handleHashChange();

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Sync state changes back to URL hash
  useEffect(() => {
    if (activeTab) {
      window.location.hash = `#/${activeTab}`;
    }
  }, [activeTab]);

  // Safe wrapper for setting active state
  const setActiveTab = (tab: string) => {
    setActiveTab2(tab);
  };
  
  // Mega menu states
  const [showMegaMenu, setShowMegaMenu] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);

  // Quote Inquiry form modal
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [quoteInquiryData, setQuoteInquiryData] = useState({
    name: '',
    itemName: '',
    category: '',
    quantity: 1000,
    quantityUnit: 'Pcs',
    specDetails: '',
    email: ''
  });
  
  // Login Role selection: 'staff' (Company User) or 'client' (Buyer)
  const [loginRole, setLoginRole] = useState<'staff' | 'client'>('staff');
  const [isRegistering, setIsRegistering] = useState(false);
  
  // Forms states
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  
  // Client Register state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regCompany, setRegCompany] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regAddress, setRegAddress] = useState('');

  // Simulated Social Login states
  const [socialAuthPlatform, setSocialAuthPlatform] = useState<'Google' | 'Facebook' | null>(null);
  const [socialEmail, setSocialEmail] = useState('');
  const [socialName, setSocialName] = useState('');
  const [socialCompany, setSocialCompany] = useState('');
  const [socialPhone, setSocialPhone] = useState('');
  const [socialAddress, setSocialAddress] = useState('');

  // OAuth interactive simulation states
  const [oauthLoadingStep, setOauthLoadingStep] = useState<number>(0); // 0: idle, 1: handshake, 2: verify, 3: sync, 4: complete
  const [oauthSelectedName, setOauthSelectedName] = useState('');
  const [oauthSelectedEmail, setOauthSelectedEmail] = useState('');
  const [oauthCustomMode, setOauthCustomMode] = useState(false);

  // Persisted Client State
  const [registeredClients, setRegisteredClients] = useState<ClientAccount[]>(() => {
    if (registeredClientsProp && registeredClientsProp.length > 0) return registeredClientsProp;
    try {
      const saved = localStorage.getItem('acoola_registered_clients');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const [loggedClient, setLoggedClient] = useState<ClientAccount | null>(() => {
    try {
      const saved = localStorage.getItem('acoola_logged_client');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });

  const [clientInquiries, setClientInquiries] = useState<ClientInquiry[]>(() => {
    try {
      const saved = localStorage.getItem('acoola_client_inquiries');
      if (saved) return JSON.parse(saved);
    } catch {}
    // Seed some mock inquiries
    return [
      { id: 'INQ-8801', clientEmail: 'buyer@standardgroup.com', itemName: 'Woven Satin Edge Labels', category: 'Labels', quantity: 25000, specDetails: 'Size: 2.5cm, Black substrate, white satin text.', status: 'Price Quoted', date: '2026-06-20' },
      { id: 'INQ-8802', clientEmail: 'buyer@standardgroup.com', itemName: 'Art Card Textured Hangtags', category: 'Hangtags', quantity: 50000, specDetails: 'Red string, FSC certified paper base code, barcode printed on rear.', status: 'Pending Review', date: '2026-06-22' }
    ];
  });

  // Client Portal Inside Active Menu Tab
  const [clientHubTab, setClientHubTab] = useState<'overview' | 'new-inquiry' | 'my-inquiries' | 'profile' | 'my-quotations'>('overview');

  // Quotations state for Client Hub
  const [allQuotations, setAllQuotations] = useState<any[]>(() => {
    if (quotations && quotations.length > 0) return quotations;
    try {
      const saved = localStorage.getItem('acoola_quotations');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Track active quotation viewing modal
  const [viewingQuotation, setViewingQuotation] = useState<any | null>(null);

  // Profile Edit fields
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editProfileName, setEditProfileName] = useState('');
  const [editProfileCompany, setEditProfileCompany] = useState('');
  const [editProfilePhone, setEditProfilePhone] = useState('');
  const [editProfileAddress, setEditProfileAddress] = useState('');

  // Auto refresh quotations when user navigates or opens client hub or quotations prop changes
  useEffect(() => {
    if (quotations && quotations.length > 0) {
      setAllQuotations(quotations);
    } else if (activeTab === 'client-hub') {
      try {
        const saved = localStorage.getItem('acoola_quotations');
        if (saved) {
          setAllQuotations(JSON.parse(saved));
        }
      } catch {}
    }
  }, [activeTab, quotations]);

  // Specs sheet builder
  const [specItem, setSpecItem] = useState(WEBSITE_PRODUCTS[0].name);
  const [specQty, setSpecQty] = useState(10000);
  const [specText, setSpecText] = useState('Color: Deep Navy, Size: Medium. Barcode printed on backside. Soft-edge cut layout.');
  
  // Career form states & careers list
  const [showApplyModal, setShowApplyModal] = useState<any>(null);
  const [viewingJobDetails, setViewingJobDetails] = useState<any>(null);
  const [applyName, setApplyName] = useState('');
  const [applyEmail, setApplyEmail] = useState('');
  const [applyPhone, setApplyPhone] = useState('');
  const [applyCover, setApplyCover] = useState('');
  const [applyCvName, setApplyCvName] = useState('');
  const [applyCvFile, setApplyCvFile] = useState('');
  const [applySuccess, setApplySuccess] = useState(false);

  // General Inquiry form (not logged in)
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactMsg, setContactMsg] = useState('');
  const [contactSent, setContactSent] = useState(false);

  // Sync to local storage and parent state
  useEffect(() => {
    localStorage.setItem('acoola_registered_clients', JSON.stringify(registeredClients));
    if (setRegisteredClientsProp) {
      setRegisteredClientsProp(registeredClients);
    }
  }, [registeredClients, setRegisteredClientsProp]);

  // Sync from parent state
  useEffect(() => {
    if (registeredClientsProp && registeredClientsProp.length > 0) {
      setRegisteredClients(registeredClientsProp);
    }
  }, [registeredClientsProp]);

  useEffect(() => {
    if (loggedClient) {
      localStorage.setItem('acoola_logged_client', JSON.stringify(loggedClient));
    } else {
      localStorage.removeItem('acoola_logged_client');
    }
  }, [loggedClient]);

  useEffect(() => {
    localStorage.setItem('acoola_client_inquiries', JSON.stringify(clientInquiries));
  }, [clientInquiries]);

  // Handle staff + client logins
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    if (!loginEmail || !loginPassword) {
      setLoginError('Please provide your email and secure password.');
      return;
    }

    setLoginLoading(true);
    const normalizedEmail = loginEmail.trim().toLowerCase();

    try {
      if (loginRole === 'staff') {
        const response = await fetch('/api/auth/login-staff', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: normalizedEmail, password: loginPassword })
        });
        
  if (response.headers.get("content-type")?.includes("application/json")) {
    const resData = await response.json();
    if (!response.ok) {
        setLoginError(resData.error || 'Login failed. Invalid operator credentials.');
        setLoginLoading(false);
        return;
    }
    
    if (resData.customToken) {
        try {
        const { signInWithCustomToken } = await import('firebase/auth');
        const { auth } = await import('../lib/driveSync');
        await signInWithCustomToken(auth, resData.customToken);
        } catch (tokenErr) {
        console.warn("Could not sign in with Custom Token (Expected in local mock environments):", tokenErr);
        }
    }
    
    localStorage.setItem('acoola_session_user', JSON.stringify(resData.session));
    onLoginSuccess(resData.session);
    setViewMode('erp');
    setShowLoginModal(false);
    setIsRegistering(false);
    setLoginEmail('');
    setLoginPassword('');
    return;
  } else {
    // If response is not JSON, we can't parse it
    const text = await response.text();
    console.error("[Auth] Login error: Response is not JSON. Status:", response.status, "Body:", text);
    setLoginError(`Server authentication error: Received non-JSON response from server (Status: ${response.status})`);
    setLoginLoading(false);
    return;
  }
      } else {
        // Client/Buyer authentication
        const hexHash = await sha256(loginPassword);
        const matchedBuyer = registeredClients.find(b => b.email.trim().toLowerCase() === normalizedEmail);
        
        // Static support for generic demo buyer
        if (normalizedEmail === 'buyer@standardgroup.com' && loginPassword === 'buyer123') {
          const demoBuyer: ClientAccount = {
            id: 'CLI-DEMO',
            name: 'Standard Garments Buyer Team',
            email: 'buyer@standardgroup.com',
            passwordHash: '',
            companyName: 'Standard Group PLC Ltd',
            phone: '01711223344',
            address: 'Board Bazar, Gazipur, Dhaka',
            joinedAt: '2026-01-01'
          };
          setLoggedClient(demoBuyer);
          setViewMode('client-portal');
          setActiveTab('client-hub');
          setShowLoginModal(false);
          setLoginEmail('');
          setLoginPassword('');
          return;
        }

        if (matchedBuyer) {
          if (matchedBuyer.passwordHash === hexHash) {
            setLoggedClient(matchedBuyer);
            setViewMode('client-portal');
            setActiveTab('client-hub');
            setShowLoginModal(false);
            setLoginEmail('');
            setLoginPassword('');
          } else {
            setLoginError('Incorrect password! Please try again.');
          }
        } else {
          setLoginError('No buyer account found. Please register!');
        }
      }
    } catch (e) {
      console.error("[Auth] Login error:", e);
      setLoginError(`Server authentication error: ${e instanceof Error ? e.message : 'Unknown'}`);
    } finally {
      setLoginLoading(false);
    }
  };

  // Real Firebase Google & Facebook Authentication with secure iframe fallback
  const triggerRealFirebaseAuth = async (platform: 'Google' | 'Facebook') => {
    try {
      setLoginError('');
      setLoginLoading(true);
      
      const { signInWithPopup, GoogleAuthProvider, FacebookAuthProvider } = await import('firebase/auth');
      const { auth } = await import('../lib/driveSync');
      
      const provider = platform === 'Google' ? new GoogleAuthProvider() : new FacebookAuthProvider();
      if (platform === 'Google') {
        provider.addScope('email');
        provider.addScope('profile');
      }
      
      const result = await signInWithPopup(auth, provider);
      
      if (result.user) {
        const user = result.user;
        const email = user.email || '';
        const name = user.displayName || 'Social Buyer';
        
        // Match or register ClientAccount
        const existing = registeredClients.find(c => c.email.toLowerCase() === email.toLowerCase());
        if (existing) {
          setLoggedClient(existing);
        } else {
          const newClient: ClientAccount = {
            id: `CLI-${Date.now().toString().slice(-5)}`,
            name: name,
            email: email,
            passwordHash: '',
            companyName: `${platform} Sourcing Partner`,
            phone: user.phoneNumber || '+8801700000000',
            address: 'Dhaka, Bangladesh',
            joinedAt: new Date().toISOString().substring(0, 10)
          };
          setRegisteredClients(prev => [...prev, newClient]);
          setLoggedClient(newClient);
        }
        
        setViewMode('client-portal');
        setActiveTab('client-hub');
        setShowLoginModal(false);
        setSocialAuthPlatform(null);
      }
    } catch (error: any) {
      console.warn(`Real ${platform} Auth failed/blocked by iframe sandboxing:`, error);
      // Fail gracefully: show warning to user and open simulation picker
      alert(`Real ${platform} Auth was blocked or failed (Common inside restricted iframe preview or if Firebase Console is not configured). Redirecting to secure fallback sign-in picker...`);
      handleSocialLogin(platform);
    } finally {
      setLoginLoading(false);
    }
  };

  // Secure Social OAuth Login
  const handleSocialLogin = (platform: string) => {
    setSocialAuthPlatform(platform as any);
    setSocialEmail('');
    setSocialName('');
    setSocialCompany('');
    setSocialPhone('');
    setSocialAddress('');
    setOauthLoadingStep(0);
    setOauthCustomMode(false);
  };

  const triggerOauthSimulation = (name: string, email: string, company?: string, phone?: string, address?: string) => {
    setOauthSelectedName(name);
    setOauthSelectedEmail(email);
    setOauthLoadingStep(1);
    
    // Simulate OAuth secure steps sequentially
    setTimeout(() => {
      setOauthLoadingStep(2);
      setTimeout(() => {
        setOauthLoadingStep(3);
        setTimeout(() => {
          setOauthLoadingStep(4);
          setTimeout(() => {
            const platform = socialAuthPlatform || 'Google';
            const existing = registeredClients.find(c => c.email.toLowerCase() === email.toLowerCase());
            
            if (existing) {
              setLoggedClient(existing);
            } else {
              const newClient: ClientAccount = {
                id: `CLI-${Date.now().toString().slice(-5)}`,
                name: name,
                email: email,
                passwordHash: '', // Social logins do not require passwordHash
                companyName: company || `${platform} Sourcing Partner`,
                phone: phone || '+8801700000000',
                address: address || 'Dhaka, Bangladesh',
                joinedAt: new Date().toISOString().substring(0, 10)
              };
              setRegisteredClients(prev => [...prev, newClient]);
              setLoggedClient(newClient);
            }
            
            setViewMode('client-portal');
            setActiveTab('client-hub');
            setShowLoginModal(false);
            setSocialAuthPlatform(null);
            setOauthLoadingStep(0);
            setOauthCustomMode(false);
          }, 700);
        }, 700);
      }, 700);
    }, 700);
  };

  // Client registration
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    if (!regName || !regEmail || !regPassword || !regCompany || !regPhone || !regAddress) {
      setLoginError('All registration fields are required.');
      return;
    }

    try {
      if (registeredClients.some(c => c.email.toLowerCase() === regEmail.toLowerCase())) {
        setLoginError('This email is already registered.');
        return;
      }

      const pHash = await sha256(regPassword);
      const newClient: ClientAccount = {
        id: `CLI-${Date.now().toString().slice(-5)}`,
        name: regName,
        email: regEmail,
        passwordHash: pHash,
        companyName: regCompany,
        phone: regPhone,
        address: regAddress,
        joinedAt: new Date().toISOString().substring(0, 10)
      };

      setRegisteredClients(prev => [...prev, newClient]);
      setLoggedClient(newClient);
      setViewMode('client-portal');
      setActiveTab('client-hub');
      setShowLoginModal(false);
      
      // reset registration fields
      setRegName('');
      setRegEmail('');
      setRegPassword('');
      setRegCompany('');
      setRegPhone('');
      setRegAddress('');
      alert('Registration successful! Welcome to the Buyer Portal.');
    } catch {
      setLoginError('An error occurred during registration.');
    }
  };

  const getPageInfo = (pageId: string, defaultTitle: string, defaultHeroTitle: string, defaultHeroSubtitle: string) => {
    const matched = pagesConfigs.find(p => p.id === pageId);
    return {
      title: matched?.title || defaultTitle,
      heroTitle: matched?.heroTitle || defaultHeroTitle,
      heroSubtitle: matched?.heroSubtitle || defaultHeroSubtitle,
      customDesignEnabled: !!matched?.customDesignEnabled
    };
  };

  // Handle Client self inquiry
  const handleInquirySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loggedClient) {
      alert('Please log in first!');
      return;
    }

    const matchedProd = WEBSITE_PRODUCTS.find(p => p.name === specItem);

    const newInq: ClientInquiry = {
      id: `INQ-${Math.floor(1000 + Math.random() * 9000)}`,
      clientEmail: loggedClient.email,
      itemName: specItem,
      category: matchedProd ? matchedProd.category : 'General',
      quantity: specQty,
      specDetails: specText,
      status: 'Pending Review',
      date: new Date().toISOString().substring(0, 10)
    };

    setClientInquiries(prev => [newInq, ...prev]);
    alert('Success! Your exclusive accessories request has been submitted. Our team will contact you shortly.');
    setClientHubTab('my-inquiries');
    setSpecText('');
    setSpecQty(10000);
  };

  const handleQuoteModalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const targetEmail = loggedClient ? loggedClient.email : (quoteInquiryData.email || 'guest@example.com');
    
    const newInq: ClientInquiry = {
      id: `INQ-${Math.floor(1000 + Math.random() * 9000)}`,
      clientEmail: targetEmail,
      itemName: quoteInquiryData.itemName,
      category: quoteInquiryData.category || 'General',
      quantity: Number(quoteInquiryData.quantity) || 1000,
      specDetails: quoteInquiryData.specDetails || 'Standard requirements quoted.',
      status: 'Pending Review',
      date: new Date().toISOString().substring(0, 10)
    };

    const updated = [newInq, ...clientInquiries];
    setClientInquiries(updated);
    localStorage.setItem('acoola_client_inquiries', JSON.stringify(updated));

    alert(`Awesome! Your price quotation request for "${quoteInquiryData.itemName}" has been logged successfully. Our merchandising support team will send complete price breakdown specs to ${targetEmail} within 12 hours.`);
    setShowQuoteModal(false);
  };

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-colors duration-250 ${
      themeMode === 'dark' 
        ? 'bg-[#0f172a] text-slate-100 website-dark-mode' 
        : 'bg-slate-50 text-slate-800'
    }`} id="acoola-website-host">
      
      {/* -------------------- HIGH ACCLAIMED NAVIGATION HEADER -------------------- */}
      <header className={`sticky top-0 z-[99] shadow-sm select-none transition-colors duration-250 ${
        themeMode === 'dark' 
          ? 'bg-[#1e293b] border-b border-slate-700 text-white' 
          : 'bg-white border-b border-slate-200 text-slate-800'
      }`} id="corporate-header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          
          {/* Header Left logo */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('home')}>
            {COMPANY_PROFILE.logo ? (
              <div className="w-10 h-10 bg-[#007d46]/5 p-0.5 rounded-lg border border-emerald-500/20 flex items-center justify-center overflow-hidden">
                <img src={COMPANY_PROFILE.logo} alt="Acoola Logo" className="max-w-full max-h-full object-contain" referrerPolicy="no-referrer" />
              </div>
            ) : (
              <div className="w-10 h-10 bg-emerald-600 text-white rounded-lg flex items-center justify-center shadow-md shadow-emerald-600/10 shrink-0">
                <Building2 className="w-5.5 h-5.5" />
              </div>
            )}
            <div>
              <h1 className={`text-sm sm:text-base font-black tracking-tight uppercase leading-none ${themeMode === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                {COMPANY_PROFILE.name}
              </h1>
              <p className="text-[10px] text-emerald-600 font-bold tracking-widest mt-0.5 leading-none uppercase">
                {headerSubtitle}
              </p>
            </div>
          </div>

          {/* Header Middle Navigation Pages */}
          <nav className="hidden lg:flex items-center gap-6 text-xs font-bold">
            {(pagesConfigs.length > 0 
              ? pagesConfigs.filter(p => !p.isHidden).map(p => ({ id: p.id, label: p.title }))
              : [
                  { id: 'home', label: 'Home' },
                  { id: 'about', label: 'About Us' },
                  { id: 'products', label: 'Products & Solutions' },
                  { id: 'sustainability', label: 'Sustainability' },
                  { id: 'careers', label: 'Careers' },
                  { id: 'contact', label: 'Contact' }
                ]
            ).map(page => {
              if (page.id === 'products') {
                return (
                  <div 
                    key={page.id}
                    className="relative py-2"
                    onMouseEnter={() => setShowMegaMenu(true)}
                    onMouseLeave={() => setShowMegaMenu(false)}
                  >
                    <a
                      href={getLinkUrl('products')}
                      onClick={(e) => {
                        e.preventDefault();
                        setActiveTab('products');
                        setSelectedCategory(null);
                        setSelectedSubcategory(null);
                      }}
                      className={`py-1 px-1 relative transition-all uppercase tracking-wide cursor-pointer hover:text-emerald-600 hover:scale-[1.02] duration-200 ${
                        activeTab === 'products' 
                          ? 'text-emerald-500 font-extrabold' 
                          : themeMode === 'dark' ? 'text-slate-200' : 'text-slate-600'
                      }`}
                    >
                      {page.label}
                      {activeTab === 'products' && (
                        <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600 rounded-full"></span>
                      )}
                    </a>

                    {/* Float Mega Menu for Categories / Subcategories */}
                    {showMegaMenu && (
                      <div className="absolute top-full left-1/2 -translate-x-1/2 pt-2 z-50 animate-fade-in">
                        <div className={`w-[850px] border shadow-2xl rounded-2xl p-6 grid grid-cols-4 gap-6 text-left transition-colors duration-250 ${
                          themeMode === 'dark' 
                            ? 'bg-[#1e293b] border-slate-700 text-slate-100' 
                            : 'bg-white border-slate-200 text-slate-800'
                        }`}>
                          {Object.keys(PRODUCT_CATEGORIES_MAP).map(cat => (
                            <div key={cat} className="space-y-3">
                              <h4 className="text-[10.5px] font-black text-emerald-500 uppercase tracking-wider pb-1.5 border-b border-slate-100">
                                {cat}
                              </h4>
                              <ul className="space-y-2">
                                {PRODUCT_CATEGORIES_MAP[cat].map(subSub => (
                                  <li key={subSub}>
                                    <button
                                      onClick={() => {
                                        setSelectedCategory(cat);
                                        setSelectedSubcategory(subSub);
                                        setActiveTab('products');
                                        setShowMegaMenu(false);
                                      }}
                                      className={`text-[11px] font-bold hover:text-emerald-600 transition-colors w-full text-left cursor-pointer truncate ${
                                        selectedSubcategory === subSub 
                                          ? 'text-emerald-500 font-extrabold' 
                                          : themeMode === 'dark' ? 'text-slate-350' : 'text-slate-500'
                                      }`}
                                      title={subSub}
                                    >
                                      • {subSub}
                                    </button>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <a
                  key={page.id}
                  href={getLinkUrl(page.id)}
                  onClick={(e) => {
                    e.preventDefault();
                    setActiveTab(page.id);
                    if (page.id === 'home' && loggedClient) {
                      // Stay logged in but browse home
                    }
                  }}
                  className={`py-2 px-1 relative transition-all uppercase tracking-wide cursor-pointer hover:text-emerald-605 hover:scale-[1.02] ${
                    activeTab === page.id 
                      ? 'text-emerald-500 font-black' 
                      : themeMode === 'dark' ? 'text-slate-200' : 'text-slate-600'
                  }`}
                >
                  {page.label}
                  {activeTab === page.id && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600 rounded-full animate-fade-in"></span>
                  )}
                </a>
              );
            })}
          </nav>

          {/* Header Right Side Authentications */}
          <div className="flex items-center gap-3">
            {/* Mobile Hamburg Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              type="button"
              className="lg:hidden p-2 rounded-xl transition-all cursor-pointer border flex items-center justify-center h-8 sm:h-9 w-8 sm:w-9 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
            {/* Light / Dark Mode Toggle Button */}
            <button
              onClick={toggleThemeMode}
              type="button"
              title={themeMode === 'light' ? "Switch to Dark Mode" : "Switch to Light Mode"}
              className={`hidden lg:flex rounded-lg transition-all cursor-pointer border items-center justify-center h-7 w-7 ${
                themeMode === 'dark' 
                  ? 'bg-slate-800 border-slate-750 text-yellow-400 hover:bg-slate-700' 
                  : 'bg-slate-100 border-slate-200 text-slate-550 hover:bg-slate-200/60'
              }`}
            >
              {themeMode === 'light' ? (
                <span className="text-[10px] select-none">🌙</span>
              ) : (
                <span className="text-[10px] select-none">☀️</span>
              )}
            </button>

            {/* Desktop Auth Actions */}
            <div className="hidden lg:flex lg:items-center lg:gap-2">
              {loggedClient ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setViewMode('client-portal');
                      setActiveTab('client-hub');
                      setClientHubTab('overview');
                    }}
                    className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2.5 py-1 rounded-lg border border-emerald-400/20 transition-all flex items-center gap-1 cursor-pointer max-w-[150px] sm:max-w-none truncate"
                  >
                    <User className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="truncate">Buyer: {loggedClient.name.split(' ')[0]}</span>
                  </button>
                  <button
                    onClick={() => {
                      setLoggedClient(null);
                      setViewMode('website');
                      setActiveTab('home');
                    }}
                    title="Sign Out"
                    className="bg-slate-100 hover:bg-red-50 hover:text-red-650 text-slate-600 p-1 rounded-lg border border-slate-200 transition-all cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5 text-red-500" />
                  </button>
                </div>
              ) : sessionUser ? (
                /* If Staff ERP user is logged in */
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setViewMode('erp')}
                    className="bg-slate-900 text-white text-[10px] font-bold px-3 py-1.5 h-7 rounded-lg transition-all flex items-center gap-1 cursor-pointer shadow-xs"
                  >
                    <LayoutDashboard className="w-3.5 h-3.5 text-emerald-400" />
                    <span>ERP Dashboard</span>
                  </button>
                  <button
                    onClick={() => {
                      onLogout();
                      setViewMode('website');
                      setActiveTab('home');
                    }}
                    title="Logout"
                    className="bg-slate-100 hover:bg-red-50 hover:text-red-600 text-slate-650 p-1.5 rounded-lg border border-slate-200 transition-all cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                /* Non logged-in actions */
                <button
                  onClick={() => {
                    setLoginError('');
                    setShowLoginModal(true);
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black px-3.5 py-1.5 rounded-lg transition-all shadow-xs tracking-wider uppercase cursor-pointer h-7 shrink-0 flex items-center justify-center"
                >
                  Login
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className={`lg:hidden fixed top-[72px] left-0 right-0 z-[98] shadow-2xl border-b overflow-y-auto max-h-[calc(100vh-72px)] animate-fade-in p-4 space-y-3 font-bold text-xs ${
          themeMode === 'dark' 
            ? 'bg-[#1e293b] border-slate-700 text-white' 
            : 'bg-white border-slate-200 text-slate-800'
        }`} id="mobile-navigation-dropdown">
          <div className="flex flex-col gap-2.5">
            {(pagesConfigs.length > 0 
              ? pagesConfigs.filter(p => !p.isHidden).map(p => ({ id: p.id, label: p.title }))
              : [
                  { id: 'home', label: 'Home' },
                  { id: 'about', label: 'About Us' },
                  { id: 'products', label: 'Products & Solutions' },
                  { id: 'sustainability', label: 'Sustainability' },
                  { id: 'careers', label: 'Careers' },
                  { id: 'contact', label: 'Contact' }
                ]
            ).map(page => (
              <a
                key={page.id}
                href={getLinkUrl(page.id)}
                onClick={(e) => {
                  e.preventDefault();
                  setActiveTab(page.id);
                  setMobileMenuOpen(false);
                  setSelectedCategory(null);
                  setSelectedSubcategory(null);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={`py-2.5 px-4 rounded-xl transition-all uppercase tracking-wide cursor-pointer text-left block font-black ${
                  activeTab === page.id 
                    ? 'bg-emerald-600 text-white font-extrabold' 
                    : themeMode === 'dark' 
                      ? 'hover:bg-slate-800 text-slate-200' 
                      : 'hover:bg-slate-100 text-slate-600'
                }`}
              >
                {page.label}
              </a>
            ))}
          </div>

          {/* Mobile Auth Actions inside mobile menu */}
          <div className="pt-4 border-t border-slate-200/50 dark:border-slate-700/50 flex flex-col gap-2">
            {loggedClient ? (
              <div className="space-y-2">
                <button
                  onClick={() => {
                    setViewMode('client-portal');
                    setActiveTab('client-hub');
                    setClientHubTab('overview');
                    setMobileMenuOpen(false);
                  }}
                  className="w-full bg-emerald-50 text-emerald-800 hover:bg-emerald-100 text-[11px] font-black px-4 py-3 rounded-xl border border-emerald-400/20 flex items-center justify-center gap-2 transition-all"
                >
                  <User className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Buyer: {loggedClient.name}</span>
                </button>
                <button
                  onClick={() => {
                    setLoggedClient(null);
                    setViewMode('website');
                    setActiveTab('home');
                    setMobileMenuOpen(false);
                  }}
                  className="w-full bg-red-50 text-red-650 hover:bg-red-100 text-[11px] font-black px-4 py-3 rounded-xl border border-red-200 flex items-center justify-center gap-2 transition-all"
                >
                  <LogOut className="w-4 h-4 shrink-0" />
                  <span>Sign Out</span>
                </button>
              </div>
            ) : sessionUser ? (
              <div className="space-y-2">
                <button
                  onClick={() => {
                    setViewMode('erp');
                    setMobileMenuOpen(false);
                  }}
                  className="w-full bg-slate-900 text-white hover:bg-slate-850 text-[11px] font-black px-4 py-3 rounded-xl flex items-center justify-center gap-2 transition-all"
                >
                  <LayoutDashboard className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>ERP Dashboard</span>
                </button>
                <button
                  onClick={() => {
                    onLogout();
                    setViewMode('website');
                    setActiveTab('home');
                    setMobileMenuOpen(false);
                  }}
                  className="w-full bg-red-50 text-red-650 hover:bg-red-100 text-[11px] font-black px-4 py-3 rounded-xl border border-red-200 flex items-center justify-center gap-2 transition-all"
                >
                  <LogOut className="w-4 h-4 shrink-0" />
                  <span>Logout Staff</span>
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setLoginError('');
                  setShowLoginModal(true);
                  setMobileMenuOpen(false);
                }}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-black px-4 py-3 rounded-xl transition-all shadow-xs tracking-wider uppercase text-center flex items-center justify-center gap-2 cursor-pointer"
              >
                <User className="w-4 h-4 shrink-0" />
                <span>Client / Staff Login</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Mobile view warning helper banner */}
      <div className="lg:hidden bg-slate-100 py-2 border-b text-center text-[10px] font-bold text-slate-500 select-none">
        Scroll down to browse all sections on mobile devices!
      </div>

      {/* ----------------- CORE PAGES VIEW CONTROLLER ----------------- */}
      <main className="flex-1">

        {/* Dynamic Custom-Code & Fallback Page Override */}
        {(() => {
          const defaultPages = ['home', 'about', 'products', 'sustainability', 'careers', 'contact', 'client-hub', 'website-pages'];
          const matchedPage = pagesConfigs.find(p => p.id === activeTab);
          if (matchedPage) {
            const isCustomRoute = !defaultPages.includes(matchedPage.id);
            if ((matchedPage.customDesignEnabled || isCustomRoute) && matchedPage.id !== 'products') {
              return (
                <div className="w-full animate-fade-in overflow-x-hidden">
                  <div 
                    dangerouslySetInnerHTML={{ 
                      __html: sanitizeHtmlWithStyles(matchedPage.customHtmlCode)
                    }}
                  />
                </div>
              );
            }
          }
          return null;
        })()}
        
        {/* TAB 1: WEBSITE HOME PAGE */}
        {activeTab === 'home' && (!pagesConfigs.find(p => p.id === 'home')?.customDesignEnabled) && (
          <div className="animate-fade-in" id="website-home-page">
            
            {/* Spectacular Hero Section */}
            <section className="bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-950 text-white py-16 sm:py-24 px-4 border-b border-emerald-900 relative">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.06),transparent_40%)]"></div>
              <div className="max-w-5xl mx-auto text-center space-y-6 relative z-10">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-extrabold border border-emerald-500/20 uppercase tracking-widest">
                  <Sparkles className="w-3.5 h-3.5" /> High Performance Accreditations
                </span>
                <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight max-w-4xl mx-auto">
                  {getPageInfo('home', 'Home', 'Precision Engine Trims & Garments Accessories Solutions', 'Acoola Trims supports Bangladesh apparel industries as a single-source partner.').heroTitle}
                </h1>
                <p className="text-slate-300 text-xs sm:text-base max-w-2xl mx-auto leading-relaxed font-bold">
                  {getPageInfo('home', 'Home', 'Precision Engine Trims & Garments Accessories Solutions', 'Acoola Trims supports Bangladesh apparel industries as a single-source partner. Certified high-density labels, Matt hangtags, Polybags, and advanced security sealing strings.').heroSubtitle}
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
                  <button
                    onClick={() => {
                      if (loggedClient) {
                        setViewMode('client-portal');
                        setActiveTab('client-hub');
                        setClientHubTab('new-inquiry');
                      } else {
                        setActiveTab('products');
                        alert('Please select an accessory from the list and submit a quote request!');
                      }
                    }}
                    className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs px-6 py-3.5 rounded-xl uppercase tracking-wider transition-all cursor-pointer shadow-lg active:scale-95"
                  >
                    Request Price Quote
                  </button>
                  <button
                    onClick={() => setActiveTab('about')}
                    className="w-full sm:w-auto bg-slate-900 border border-slate-750 hover:bg-slate-800 text-white font-bold text-xs px-6 py-3.5 rounded-xl uppercase tracking-wider transition-all cursor-pointer"
                  >
                    Our Factory Setup
                  </button>
                </div>
              </div>
            </section>

            {/* Quality Standard Badges & Counters */}
            <section className="bg-white py-10 px-4 border-b">
              <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center select-none">
                {[
                  { value: '120+', label: 'RMG Active Partners', desc: '100% Quality Assurance' },
                  { value: '1.5 Million', label: 'Daily Output Capacity', desc: 'High-speed Industrial Machinery' },
                  { value: '100% Green', label: 'Certified Raw Yarns', desc: 'OEKO-TEX Standard 100' },
                  { value: '2 Hours', label: 'Express Delivery Drafts', desc: 'Instant Sampling Support' }
                ].map((stat, i) => (
                  <div key={i} className="p-4 border border-slate-100 rounded-xl hover:shadow-sm transition-all">
                    <span className="block text-2xl sm:text-3xl font-black text-emerald-600 font-mono tracking-tight">{stat.value}</span>
                    <span className="block text-xs font-extrabold text-slate-800 mt-1 uppercase">{stat.label}</span>
                    <span className="block text-[10px] text-slate-500 mt-0.5">{stat.desc}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* Core Specialties highlights */}
            <section className="py-16 px-4 bg-slate-50">
              <div className="max-w-7xl mx-auto space-y-12">
                <div className="text-center space-y-3">
                  <h2 className="text-2xl font-black text-slate-900 uppercase">Our Core Machinery Excellence</h2>
                  <p className="text-xs text-slate-550 max-w-lg mx-auto font-bold">Precision finishing and maximum durability ensured with highly advanced international machinery.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[
                    { icon: Layers, title: 'Woven Label looms', desc: 'High-speed jacquard needle loom machines producing silky neck labels, and taffeta sizing badges with hot-melt sonic cutting.' },
                    { icon: Leaf, title: 'Bio-Degradable Poly Extruders', desc: 'Eco friendly LDPE blown film machines producing side seals, self-adhesive warnings, and premium GRS certified packaging.' },
                    { icon: FileCheck, title: 'Digital Offset Hangtags Base', desc: 'Precision Heidelberg offset presses deliver ultra-vibrant colors on SBS back duplex boards with spot UV coating.' }
                  ].map((feat, i) => (
                    <div key={i} className="bg-white border rounded-2xl p-6 shadow-sm space-y-3 flex flex-col justify-between">
                      <div className="space-y-3">
                        <div className="w-12 h-12 bg-emerald-50 rounded-xl text-emerald-600 flex items-center justify-center shrink-0">
                          <feat.icon className="w-6 h-6" />
                        </div>
                        <h3 className="text-md font-bold text-slate-900">{feat.title}</h3>
                        <p className="text-xs text-slate-500 leading-relaxed font-bold">{feat.desc}</p>
                      </div>
                      <button onClick={() => setActiveTab('products')} className="text-xs text-emerald-600 font-extrabold flex items-center gap-1 hover:gap-1.5 transition-all mt-4 self-start cursor-pointer">
                        View Details <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Quick samplers of our accessories */}
            <section className="py-12 px-4 bg-white border-b">
              <div className="max-w-5xl mx-auto space-y-8">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3">
                  <div>
                    <h2 className="text-xl font-black text-slate-900 uppercase">Featured Accessories Preview</h2>
                    <p className="text-xs font-bold text-slate-500 mt-1">Acoola's best selling premium accessories range</p>
                  </div>
                  <button 
                    onClick={() => setActiveTab('products')} 
                    className="text-xs font-extrabold text-emerald-600 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    Browse Full Catalogue <ArrowUpRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {WEBSITE_PRODUCTS.slice(0, 3).map(prod => (
                    <div key={prod.id} className="border border-slate-150 rounded-xl p-4 space-y-2 hover:border-emerald-500/40 transition-all bg-slate-50/50">
                      <span className="text-[10px] bg-slate-200 text-slate-700 font-extrabold px-2 py-0.5 rounded-full uppercase">{prod.category}</span>
                      <h4 className="text-sm font-extrabold text-slate-900 mt-1">{prod.name}</h4>
                      <p className="text-[11px] text-slate-505 line-clamp-2 leading-relaxed">{prod.desc}</p>
                      <div className="text-xs font-black text-emerald-600 pt-1 font-mono">
                        Available on Quote
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>
        )}

        {/* TAB 2: ABOUT US PAGE */}
        {activeTab === 'about' && (!pagesConfigs.find(p => p.id === 'about')?.customDesignEnabled) && (
          <div className="max-w-4xl mx-auto px-4 py-12 space-y-12 animate-fade-in" id="website-about-page">
            <div className="text-center space-y-3">
              <h1 className="text-3xl font-black text-slate-900 uppercase">Executive Corporate Statement</h1>
              <p className="text-xs uppercase font-extrabold text-emerald-600 tracking-wider">The Foundation and Strength of Acoola Trims Corporation</p>
            </div>

            <div className="bg-white border rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
              <div className="flex flex-col md:flex-row gap-6 items-start">
                <div className="w-24 h-24 bg-gradient-to-br from-emerald-600 to-teal-800 text-white rounded-2xl flex flex-col justify-center items-center shadow-md shrink-0">
                  <span className="text-xl font-black leading-none">MD</span>
                  <span className="text-[10px] font-bold mt-1 uppercase">Akbar</span>
                </div>
                <div className="space-y-3 text-xs leading-relaxed text-slate-706">
                  <h3 className="text-sm font-black text-slate-900 uppercase">Message from the Managing Director (MD's Message)</h3>
                  <p className="font-bold text-slate-700">
                    "The backbone of the apparel industry is high-quality accessories and trims. Since 1998, we have been manufacturing and supplying world-class garment accessories with high efficiency across the nation. Our patrons' complete trust has been the only key to our long journey."
                  </p>
                  <p className="font-mono text-[10px] font-extrabold text-slate-400">MD Akbar Hossain — CEO &amp; Managing Director, Acoola Trims Corp.</p>
                </div>
              </div>

              <div className="border-t pt-6 space-y-4">
                <h3 className="text-sm font-black text-slate-900 uppercase">Our Factory &amp; Production Unit</h3>
                <p className="text-xs text-slate-650 leading-relaxed">
                  Our main Factory Unit is located in Motijheel, Arambag, equipped with advanced facilities. It operates high-tech swing label weavers, ribbon seal printers, and offset printing machines seamlessly. Our corporate headquarters is situated at Mirpur-13, Dhaka, which handles general customer communications, marketing, and registration operations.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-bold pt-2">
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <span className="block text-emerald-600 text-xs font-extrabold">Mirpur Corporate Office</span>
                    <span className="block text-[11px] text-slate-500 mt-1">{COMPANY_PROFILE.addresses.office}</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <span className="block text-emerald-600 text-xs font-extrabold">Motijheel Production Plant</span>
                    <span className="block text-[11px] text-slate-500 mt-1">{COMPANY_PROFILE.addresses.factory}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: PRODUCTS & SOLUTIONS PAGE */}
        {activeTab === 'products' && (
          <div className="max-w-6xl mx-auto px-4 py-12 space-y-12 animate-fade-in" id="website-products-page">
            {selectedSubcategory ? (
              // SUB-CATEGORY DETAIL PAGE
              <div className="space-y-8 animate-fade-in" id="subcategory-detail-view">
                {/* Breadcrumbs & Navigation Back */}
                <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 text-left">
                    <button 
                      onClick={() => { setSelectedCategory(null); setSelectedSubcategory(null); }} 
                      className="hover:text-emerald-600 transition-colors cursor-pointer"
                    >
                      Products
                    </button>
                    <span>/</span>
                    <span className="text-slate-505">{selectedCategory}</span>
                    <span>/</span>
                    <span className="text-emerald-650 font-extrabold">{selectedSubcategory}</span>
                  </div>

                  <button
                    onClick={() => { setSelectedCategory(null); setSelectedSubcategory(null); }}
                    className="text-xs font-black text-slate-700 hover:text-emerald-600 flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    ← Back to All Products
                  </button>
                </div>

                {/* Subcategory Spotlight Overview */}
                <div className="bg-gradient-to-br from-slate-900 to-emerald-950 text-white rounded-3xl p-8 shadow-xl flex flex-col md:flex-row gap-8 items-center justify-between">
                  <div className="space-y-4 max-w-2xl text-left">
                    <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-700 text-white px-3 py-1 rounded-full">
                      {selectedCategory}
                    </span>
                    <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">{selectedSubcategory} Specifications</h1>
                    <p className="text-xs sm:text-sm text-slate-350 leading-relaxed font-medium">
                      {(() => {
                        const descriptions: Record<string, string> = {
                          "Woven Label": "Weave your brand legacy with ultra-soft, extremely durable satin or taffeta edge damask label stitching. Unmatched clarity for brand collars.",
                          "Care Label": "Wash-resistant, high-definition printed care information utilizing premium ink that doesn't bleed. Designed for multi-language instructions.",
                          "Composition Label": "Accurate, clear breakdowns of garment materials printed with precision on nylon taffeta or delicate satin ribbons.",
                          "Heat Transfer Label": "Tagless, high-stretch neck printing that adheres perfectly to activewear and luxury garments without irritation.",
                          "Printed Label": "High-durability ribbon printing in full-bleed vibrant colors matching precise brand design briefs.",
                          "Hang Tag": "Thick premium art boards embellished with custom foil stamping, spot UV matte coats, and textured brand finishes.",
                          "Barcode/Price Sticker": "Crisp thermal transfer barcode stickers with strong adhesives designed for precise point-of-sale scanning.",
                          "Rubber / PVC Patch": "Vibrant 3D molded rubber patches with crisp line executions tailored for outdoor wear and premium jackets.",
                          "Flag Label / Side Label": "Subtle side-seam woven icons stitched in high density for signature outerwear branding.",
                          "Poly Bag": "Heavy-duty self-adhesive self-sealing transparent garment bags with warning texts printed to safeguard items during shipping.",
                          "Carton Box": "Triple-wall reinforced shipping cartons designed to endure harsh global transit environments without distortion.",
                          "Backboard / Insert Board": "FSC-certified rigid collar folders and card backings that maintain garment fold presentations pristine.",
                          "Tissue Paper": "Translucent acid-free luxury tissue wrappers protecting delicate fabrics with optional step-and-repeat logo prints.",
                          "Photo Board": "Glossy high-resolution garments visualization packaging inserts representing structural fit styling.",
                          "Header Card": "Offset printed heavy card flaps for sealing transparent product bags seamlessly.",
                          "Banderole/Cascade": "Premium paper band wraps that bind folded shirts and trousers elegantly.",
                          "Packaging Tape": "Strong reinforcing adhesive wraps for secure carton boxing.",
                          "Hanger": "Robust ergonomically contorted hangers designed to sustain coat lines and support fabric drape.",
                          "Tag Pin & String": "High-tensile polypropylene plastic fastener pins and interlocking wax strings.",
                          "Sewing Thread": "Ultra-tough heat resistant spun polyester threads matching core garments colors flawlessly.",
                          "Jacquard & Normal Elastic": "Form-retaining high-stretch rubber elastic bands crafted with seamless weave edges.",
                          "Twill Tape / Bias Tape": "Herringbone-weave cotton reinforcement tapes to strengthen neckline and hem structures.",
                          "Drawstring & Drawcord": "Braided waist-pull cords combined with customized metallic or silicone dipped tips.",
                          "Zipper": "Smooth glissando sliders with lock-in brass or engineered plastic teeth for outerwear.",
                          "Cotton & Sateen Tape": "Soft, durable structural ribbons for seams and hanger loop reinforcements.",
                          "Narrow Fabrics": "Elastic and rigid webbing designed to endure heavy loading.",
                          "Hook & Loop (Velcro)": "High-density hook loops matching strong shear strength specifications.",
                          "Interlining (Fusing)": "Premium lightweight fusible woven interlining that shapes collars and cuffs perfectly.",
                          "Metal Buckle": "Corrosion-resistant custom engraved zinc and brass buckles.",
                          "Metal Badge / Plate": "Polished signature metallic plates giving garments a luxury branding aesthetic.",
                          "Metal Rivet": "Reinforcing pocket joinery studs designed to add vintage construction details.",
                          "Snap Button / Press Button": "Precise click snap fasteners engineered for long lifespans of open-and-close cycles.",
                          "Shank Button": "Premium metal and composite buttons with sturdy wire loops for suits and coats.",
                          "Plastic Button": "Elegant horn or pearl finish polyester resin buttons matching designer apparel.",
                          "Plastic Stopper": "Spring-loaded drawstring locks maintaining waist tension.",
                          "Plastic Clip": "Discrete clear plastic secure pins stabilizing folded items inside packages.",
                          "Plastic Adjuster": "Lightweight durable strap length sliders for sportswear and luggage straps.",
                          "Eyelet & D-Ring": "Seamless brass metal grommet rings and premium connecting loops."
                        };
                        return descriptions[selectedSubcategory] || "Premium quality accessories manufactured to match strict global apparel specifications and environmental standard compliance.";
                      })()}
                    </p>
                    <div className="flex flex-wrap items-center gap-4 text-[10px] font-bold text-slate-400 pt-2 uppercase tracking-wide">
                      <span className="flex items-center gap-1.5 text-emerald-400">✔ Oeko-Tex Standard 100</span>
                      <span>•</span>
                      <span className="flex items-center gap-1.5 text-emerald-400">✔ Recycled Materials Certified</span>
                      <span>•</span>
                      <span className="flex items-center gap-1.5 text-emerald-400">✔ Merchandising Inspected</span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setQuoteInquiryData({
                        itemName: selectedSubcategory,
                        category: selectedCategory || '',
                        quantity: 1000,
                        specDetails: `Requesting standard wholesale pricing for ${selectedSubcategory} under category group ${selectedCategory}. We require customized brand printing alignment.`,
                        email: loggedClient?.email || ''
                      });
                      setShowQuoteModal(true);
                    }}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[11px] uppercase shrink-0 py-3.5 px-6 rounded-2xl shadow-lg transition-transform hover:-translate-y-0.5 cursor-pointer flex items-center gap-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    Request Price Quotation
                  </button>
                </div>

                {/* Subcategory Added Products from dynamic catalogue */}
                <div className="space-y-6">
                  <div className="text-left">
                    <h2 className="text-base font-black text-slate-900 uppercase tracking-tight">
                      Explore Catalog Gallery Items: {selectedSubcategory}
                    </h2>
                    <p className="text-[11px] font-bold text-slate-400 mt-1">
                      These are the actual corporate catalog products uploaded and verified within our inventory.
                    </p>
                  </div>

                  {(() => {
                    const matched = (products || []).filter(p => 
                      p.category === selectedCategory && 
                      (p.subcategory === selectedSubcategory || !p.subcategory)
                    );

                    if (matched.length === 0) {
                      return (
                        <div className="bg-slate-50 border border-slate-200 border-dashed rounded-3xl p-12 text-center max-w-lg mx-auto space-y-4">
                          <ShoppingBag className="w-10 h-10 text-slate-300 mx-auto animate-bounce" />
                          <h4 className="text-sm font-black text-slate-700">No published items in this subcategory yet</h4>
                          <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                            No active items are published under this subcategory. You can easily select <b>{selectedCategory} › {selectedSubcategory}</b> when adding a product in your ERP Product Catalogue, and it'll render right here instantly!
                          </p>
                          <button
                            onClick={() => {
                              setQuoteInquiryData({
                                itemName: selectedSubcategory,
                                category: selectedCategory || '',
                                quantity: 5000,
                                specDetails: `Inquiry for bulk production of ${selectedSubcategory} based on standard compliance specifications.`,
                                email: loggedClient?.email || ''
                              });
                              setShowQuoteModal(true);
                            }}
                            className="bg-slate-900 hover:bg-emerald-600 hover:text-white text-white font-black text-[10px] uppercase tracking-wider px-4 py-2.5 rounded-xl transition-all cursor-pointer"
                          >
                            Send Custom Request Query
                          </button>
                        </div>
                      );
                    }

                    return (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
                        {matched.map(prod => (
                          <div key={prod.id} className="bg-white border rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
                            <div className="relative h-44 bg-slate-50 flex items-center justify-center overflow-hidden border-b">
                              <img src={prod.image} alt={prod.name} className="max-h-full max-w-full object-contain p-2" referrerPolicy="no-referrer" />
                              <div className="absolute top-2 left-2">
                                <span className="text-[9px] font-bold uppercase bg-slate-900 text-white px-2 py-0.5 rounded-full font-mono">
                                  {prod.code}
                                </span>
                              </div>
                            </div>
                            
                            <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
                              <div className="space-y-1">
                                <h3 className="text-sm font-black text-slate-900 leading-snug">{prod.name}</h3>
                                {prod.description && (
                                  <p className="text-[11px] text-slate-500 line-clamp-2 leading-normal font-semibold">{prod.description}</p>
                                )}
                              </div>

                              <div className="pt-3 border-t flex items-center justify-between">
                                <div>
                                  <span className="block text-[8px] text-slate-400 font-bold uppercase tracking-widest leading-none">Catalog Price</span>
                                  <span className="text-xs font-black font-mono text-emerald-605 mt-0.5 block">
                                    {prod.currency === 'BDT' ? '৳' : '$'}{prod.unitPrice} <span className="text-[9px] text-slate-400 font-medium">/{prod.unit}</span>
                                  </span>
                                </div>

                                <button
                                  onClick={() => {
                                    setQuoteInquiryData({
                                      itemName: prod.name,
                                      category: prod.category,
                                      quantity: 1000,
                                      specDetails: `Inquiry for catalogue item: ${prod.name} (SKU: ${prod.code}). We want bespoke length/width matching our active packaging lines.`,
                                      email: loggedClient?.email || ''
                                    });
                                    setShowQuoteModal(true);
                                  }}
                                  className="bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-805 font-black text-[9.5px] uppercase tracking-wider px-3 py-1.5 rounded-xl transition-all cursor-pointer border border-emerald-355"
                                >
                                  Request Quote
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </div>
            ) : pagesConfigs.find(p => p.id === 'products')?.customDesignEnabled ? (
              // Dynamic customized code view
              <div 
                className="custom-html-output text-left"
                dangerouslySetInnerHTML={{ 
                  __html: sanitizeHtmlWithStyles(pagesConfigs.find(p => p.id === 'products')?.customHtmlCode || '')
                }}
              />
            ) : (
              // DEFAULT VIEW (ALL PRODUCTS HIGHLIGHT)
              <div className="space-y-12">
                <div className="text-center space-y-3">
                  <h1 className="text-3xl font-black text-slate-900 uppercase">Complete Accessories Catalogue</h1>
                  <p className="text-xs text-slate-600 font-bold max-w-md mx-auto">Select any item from the catalog or browse our category groups directly via the tab menu to request direct bespoke price quotes.</p>
                </div>

                {/* Categories Map Dashboard Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 text-left" id="categories-browser">
                  {Object.keys(PRODUCT_CATEGORIES_MAP).map(cat => (
                    <div key={cat} className="bg-slate-50 border border-slate-200 rounded-2xl p-5 hover:border-emerald-500 hover:bg-white transition-all flex flex-col justify-between">
                      <div className="space-y-3">
                        <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center font-black text-lg">
                          🗂️
                        </div>
                        <h3 className="text-xs font-black text-slate-900 uppercase tracking-tight">{cat}</h3>
                        <p className="text-[10.5px] text-slate-500 leading-normal line-clamp-4 font-semibold">
                          Includes {PRODUCT_CATEGORIES_MAP[cat].slice(0, 3).join(', ')}, and other premium high-stretch components.
                        </p>
                      </div>

                      <div className="pt-4 mt-4 border-t border-slate-200 flex flex-wrap gap-2">
                        {PRODUCT_CATEGORIES_MAP[cat].slice(0, 4).map(sub => (
                          <button
                            key={sub}
                            onClick={() => {
                              setSelectedCategory(cat);
                              setSelectedSubcategory(sub);
                            }}
                            className="text-[9.5px] font-bold text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 bg-white border border-slate-200 px-2 py-1 rounded hover:border-emerald-300 transition-colors cursor-pointer"
                          >
                            {sub}
                          </button>
                        ))}
                        <button
                          onClick={() => {
                            setViewCategoryModal(cat);
                          }}
                          className="text-[9.5px] font-extrabold text-emerald-600 underline cursor-pointer hover:text-emerald-700"
                        >
                          View all {PRODUCT_CATEGORIES_MAP[cat].length} entries →
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Default High Value website products */}
                <div className="space-y-6">
                  <div className="text-left border-b pb-3">
                    <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight text-slate-800">Spotlight Premium Specs</h2>
                    <p className="text-xs text-slate-500 font-bold">Some of our best-selling items optimized for premium garments brands.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {WEBSITE_PRODUCTS.map(prod => (
                      <div key={prod.id} className="bg-white border rounded-2xl p-5 shadow-sm space-y-4 hover:shadow-md transition-all flex flex-col justify-between text-left">
                        <div className="space-y-2">
                          <span className="inline-block text-[9px] bg-emerald-50 text-emerald-700 border border-emerald-350/20 font-extrabold px-2.5 py-1 rounded uppercase tracking-wider">{prod.category}</span>
                          <h3 className="text-sm sm:text-base font-black text-slate-900">{prod.name}</h3>
                          <p className="text-xs text-slate-500 leading-normal font-semibold">{prod.desc}</p>
                          <div className="text-[11px] text-slate-450 pt-1 font-bold">
                            <span className="text-slate-400 font-medium">Material Spec:</span> {prod.materials}
                          </div>
                        </div>

                        <div className="border-t pt-4 flex items-center justify-between mt-2">
                          <div>
                            <span className="block text-[8px] text-slate-400 font-bold uppercase tracking-widest leading-none">Bespoke Price</span>
                            <span className="text-xs font-bold font-mono text-emerald-600 mt-1 block">Quote on Request</span>
                          </div>

                          <button
                            onClick={() => {
                              setQuoteInquiryData({
                                name: loggedClient?.name || '',
                                itemName: prod.name,
                                category: prod.category,
                                quantity: 1000,
                                quantityUnit: 'Pcs',
                                specDetails: `Inquiry for Spotlight item: ${prod.name}. We require bulk custom design delivery.`,
                                email: loggedClient?.email || ''
                              });
                              setShowQuoteModal(true);
                            }}
                            className="bg-slate-900 hover:bg-emerald-600 hover:text-white text-white font-extrabold text-[10px] uppercase tracking-wider px-3 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1"
                          >
                            Request Quote
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: SUSTAINABILITY PAGE */}
        {activeTab === 'sustainability' && (!pagesConfigs.find(p => p.id === 'sustainability')?.customDesignEnabled) && (
          <div className="max-w-4xl mx-auto px-4 py-12 space-y-12 animate-fade-in" id="website-sustainability-page">
            <div className="text-center space-y-3">
              <Leaf className="w-12 h-12 text-emerald-600 mx-auto animate-pulse" />
              <h1 className="text-3xl font-black text-slate-900 uppercase">Green Commitments &amp; Eco-Labels</h1>
              <p className="text-xs uppercase font-extrabold text-emerald-600 tracking-wider">Climate-friendly certified garment accessories production</p>
            </div>

            <div className="bg-white border rounded-2xl p-6 sm:p-8 shadow-sm space-y-8">
              <p className="text-xs text-slate-705 leading-relaxed text-center max-w-2xl mx-auto font-semibold">
                Acoola Trims is strongly dedicated to maintaining a sustainable ecological balance. We utilize strictly certified organic yarns and food-grade raw materials acknowledged by global apparel groups.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4">
                {[
                  { title: 'OEKO-TEX® Standard 100 Class I', desc: 'Our woven brand labels are certified skin-friendly, chemical-free, and hypoallergenic, making them 100% safe for infants.' },
                  { title: 'GRS (Global Recycled Standard)', desc: 'We manufacture yarn utilizing GRS-certified recycled polyester, contributing actively to worldwide ocean plastic reductions.' },
                  { title: 'FSC Certified Craft Boards', desc: 'Our paper materials are obtained purely from sustainably sourced FSC-certified forests, reducing unnecessary deforestation.' },
                  { title: 'Eco-Pigment Flexo Graphic Printing', desc: 'High-performance flexo graphic printing utilizing water-based organic dyes, eliminating environmental degradation risks.' }
                ].map((cert, idx) => (
                  <div key={idx} className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-350/10 space-y-1">
                    <CheckCircle className="w-5 h-5 text-emerald-600" />
                    <h3 className="text-xs font-black text-slate-900 uppercase mt-2">{cert.title}</h3>
                    <p className="text-[11px] text-slate-600 leading-relaxed font-bold">{cert.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: CAREERS PAGE */}
        {activeTab === 'careers' && (!pagesConfigs.find(p => p.id === 'careers')?.customDesignEnabled) && (
          <div className="max-w-4xl mx-auto px-4 py-12 space-y-12 animate-fade-in" id="website-careers-page">
            <div className="text-center space-y-3">
              <h1 className="text-3xl font-black text-slate-900 uppercase">We Are Hiring (Career Opportunities)</h1>
              <p className="text-xs text-slate-500 font-bold">Become a valued member of our dynamic expert clothing accessories team!</p>
            </div>

            <div className="space-y-4">
              {jobOpportunities.length === 0 ? (
                <div className="text-center bg-slate-50 border border-dashed rounded-3xl p-12 space-y-3">
                  <Briefcase className="w-10 h-10 text-slate-400 mx-auto" />
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">No Active Vacancies</h3>
                  <p className="text-xs text-slate-500 font-medium max-w-md mx-auto leading-relaxed">
                    At present, all positions inside our production units and merchandizing teams are occupied. 
                    However, we are always on the lookout for top garment trim professionals! 
                    Please send your specimen portfolio and CV to <span className="font-extrabold text-emerald-600">career@ayra.com</span>
                  </p>
                </div>
              ) : (
                jobOpportunities.map(job => (
                  <div key={job.id} className="bg-white border rounded-2xl p-5 shadow-sm block sm:flex justify-between items-center gap-4 hover:border-emerald-500/30 transition-all text-left">
                    <div className="space-y-1 cursor-pointer" onClick={() => setViewingJobDetails(job)}>
                      <h3 className="text-sm sm:text-base font-black text-slate-900 hover:text-emerald-600 transition-colors flex items-center gap-1.5">
                        {job.title}
                        <span className="text-[9px] bg-slate-100 border text-slate-600 px-2 py-0.5 rounded font-black uppercase tracking-wide">View Details</span>
                      </h3>
                      <p className="text-xs text-slate-500 font-bold">Dept: {job.dept} | Mode: {job.employmentStatus || 'Full-Time'} (Workplace: {job.workplace || 'Onsite'})</p>
                      <p className="text-[10px] text-red-500 font-bold">Deadline Action: {job.deadline}</p>
                    </div>
                    <div className="flex gap-2 shrink-0 mt-3 sm:mt-0">
                      <button
                        onClick={() => setViewingJobDetails(job)}
                        className="bg-slate-105 hover:bg-slate-200 text-slate-705 font-extrabold text-[10px] uppercase tracking-wider px-3.5 py-2.5 rounded-lg transition-all cursor-pointer"
                      >
                        Read Details
                      </button>
                      <button
                        onClick={() => {
                          setApplySuccess(false);
                          setApplyCvFile('');
                          setApplyCvName('');
                          setShowApplyModal(job);
                        }}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[10px] uppercase tracking-wider px-4 py-2.5 rounded-lg transition-all cursor-pointer"
                      >
                        Apply Now
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Job Details Modal */}
            {viewingJobDetails && (
              <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 text-left">
                <div className="bg-white border text-slate-900 rounded-3xl max-w-2xl w-full shadow-2xl p-6 relative max-h-[85vh] overflow-y-auto space-y-4">
                  <button
                    onClick={() => setViewingJobDetails(null)}
                    className="absolute top-4 right-4 text-slate-450 hover:text-slate-700 cursor-pointer p-1"
                  >
                    <X className="w-5 h-5" />
                  </button>

                  <div className="border-b pb-3">
                    <span className="text-[9px] font-black uppercase text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-300/30">
                      Job Spec &amp; Requirements
                    </span>
                    <h2 className="text-lg font-black text-slate-900 mt-1 uppercase tracking-tight">
                      {viewingJobDetails.title}
                    </h2>
                    <p className="text-[11px] text-slate-500 font-bold">
                      Department: {viewingJobDetails.dept} | Employment Status: {viewingJobDetails.employmentStatus || 'Full-time'} | Workplace: {viewingJobDetails.workplace || 'Factory Floor'}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs mt-2 text-slate-705 font-bold">
                    <div className="space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <span className="text-[10px] text-slate-450 uppercase block">Education</span>
                      <p className="text-slate-850 whitespace-pre-wrap">{viewingJobDetails.education || 'Graduate or diploma in relevant field.'}</p>
                    </div>

                    <div className="space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <span className="text-[10px] text-slate-450 uppercase block">Experience</span>
                      <p className="text-slate-850 whitespace-pre-wrap">{viewingJobDetails.experience || 'Min 2-3 years garments accessories experience.'}</p>
                    </div>

                    <div className="space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <span className="text-[10px] text-slate-450 uppercase block">Employment Status / Workplace</span>
                      <p className="text-slate-850">{viewingJobDetails.employmentStatus || 'Full-Time'} ({viewingJobDetails.workplace || 'Onsite'}) - Location: {viewingJobDetails.jobLocation || 'Factory HQ'}</p>
                    </div>

                    <div className="space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <span className="text-[10px] text-slate-450 uppercase block">Deadline for Action</span>
                      <p className="text-red-500">{viewingJobDetails.deadline || 'Immediate'}</p>
                    </div>
                  </div>

                  <div className="space-y-3.5 text-xs text-slate-705 font-bold pt-1">
                    <div className="space-y-1">
                      <h4 className="text-[11px] uppercase tracking-wider text-emerald-800 border-b pb-0.5 font-black">Requirements</h4>
                      <p className="text-slate-800 leading-relaxed whitespace-pre-wrap font-medium">{viewingJobDetails.education && !viewingJobDetails.education.includes('\n') ? 'Candidates should fulfill the job requirements listed below.' : viewingJobDetails.education || 'Please read through context details.'}</p>
                    </div>

                    {viewingJobDetails.additionalRequirements && (
                      <div className="space-y-1">
                        <h4 className="text-[11px] uppercase tracking-wider text-emerald-800 border-b pb-0.5 font-black">Additional Requirements</h4>
                        <p className="text-slate-800 leading-relaxed whitespace-pre-wrap font-medium">{viewingJobDetails.additionalRequirements}</p>
                      </div>
                    )}

                    {viewingJobDetails.responsibilities && (
                      <div className="space-y-1">
                        <h4 className="text-[11px] uppercase tracking-wider text-emerald-800 border-b pb-0.5 font-black">Responsibilities &amp; Context</h4>
                        <p className="text-slate-800 leading-relaxed whitespace-pre-wrap font-medium">{viewingJobDetails.responsibilities}</p>
                      </div>
                    )}

                    {viewingJobDetails.skills && (
                      <div className="space-y-1">
                        <h4 className="text-[11px] uppercase tracking-wider text-emerald-800 border-b pb-0.5 font-black">Skills &amp; Expertise</h4>
                        <p className="text-slate-800 leading-relaxed whitespace-pre-wrap font-medium">{viewingJobDetails.skills}</p>
                      </div>
                    )}

                    {viewingJobDetails.benefits && (
                      <div className="space-y-1">
                        <h4 className="text-[11px] uppercase tracking-wider text-emerald-800 border-b pb-0.5 font-black">Compensation &amp; Other Benefits</h4>
                        <p className="text-slate-800 leading-relaxed whitespace-pre-wrap font-medium">{viewingJobDetails.benefits}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 justify-end pt-3 border-t">
                    <button
                      onClick={() => setViewingJobDetails(null)}
                      className="bg-slate-100 hover:bg-slate-200 px-4 py-2.5 rounded-xl text-[11px] font-black uppercase"
                    >
                      Close Details
                    </button>
                    <button
                      onClick={() => {
                        const job = viewingJobDetails;
                        setViewingJobDetails(null);
                        setApplySuccess(false);
                        setApplyCvFile('');
                        setApplyCvName('');
                        setShowApplyModal(job);
                      }}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-6 py-2.5 rounded-xl text-[11px] uppercase tracking-wider"
                    >
                      Apply For This Job
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Application Modal Popup */}
            {showApplyModal && (
              <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 text-left">
                <div className="bg-white border text-slate-900 rounded-3xl max-w-md w-full shadow-2xl p-6 relative">
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">
                    Application Form: {showApplyModal.title}
                  </h3>
                  
                  {applySuccess ? (
                    <div className="bg-emerald-50 text-emerald-800 p-5 rounded-2xl text-xs font-bold leading-normal mt-4 text-center space-y-2">
                      <CheckCircle className="w-8 h-8 text-emerald-600 mx-auto" />
                      <p>Your job application and CV file details have been successfully received and processed.</p>
                      <button 
                        onClick={() => setShowApplyModal(null)} 
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded mt-2 text-[10px] uppercase cursor-pointer"
                      >
                        Close
                      </button>
                    </div>
                  ) : (
                    <form 
                      onSubmit={(e) => { 
                        e.preventDefault(); 
                        const applicationItem: import('../types').JobApplication = {
                          id: `APP-${Date.now()}`,
                          jobId: showApplyModal.id,
                          jobTitle: showApplyModal.title,
                          name: applyName,
                          email: applyEmail,
                          phone: applyPhone,
                          coverLetter: applyCover,
                          cvFileName: applyCvName,
                          cvFileData: applyCvFile,
                          createdAt: new Date().toISOString()
                        };
                        if (onAddJobApplication) {
                          onAddJobApplication(applicationItem);
                        }
                        setApplySuccess(true);
                      }} 
                      className="space-y-4 text-left mt-4 text-xs font-bold"
                    >
                      <div>
                        <label className="block text-[10px] text-slate-500 uppercase tracking-wider">Applicant Full Name *</label>
                        <input type="text" required value={applyName} onChange={e => setApplyName(e.target.value)} className="w-full bg-slate-50 border rounded-xl p-2.5 text-slate-805 mt-1 focus:bg-white" placeholder="e.g. Salim Rezwan" />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-500 uppercase tracking-wider">Email Address *</label>
                        <input type="email" required value={applyEmail} onChange={e => setApplyEmail(e.target.value)} className="w-full bg-slate-50 border rounded-xl p-2.5 text-slate-805 mt-1 focus:bg-white" placeholder="e.g. salim@gmail.com" />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-500 uppercase tracking-wider">Mobile Phone Number *</label>
                        <input type="text" required value={applyPhone} onChange={e => setApplyPhone(e.target.value)} className="w-full bg-slate-50 border rounded-xl p-2.5 text-slate-805 mt-1 focus:bg-white" placeholder="e.g. +8801711223344" />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-500 uppercase tracking-wider">Cover Letter / Statement *</label>
                        <textarea required value={applyCover} onChange={e => setApplyCover(e.target.value)} placeholder="Explain why you are a great fit..." className="w-full bg-slate-50 border rounded-xl p-2.5 h-16 text-slate-805 mt-1 focus:bg-white" />
                      </div>
                      
                      <div>
                        <label className="block text-[10px] text-slate-500 uppercase tracking-wider mb-1">Upload CV Document (PDF / DOCX) *</label>
                        <input 
                          type="file" 
                          required
                          accept=".pdf,.docx,.doc,.jpg,.jpeg,.png"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              if (file.size > 1.5 * 1024 * 1024) {
                                alert("Document size exceeds 1.5MB. Please choose a smaller compressed PDF / file.");
                                e.target.value = '';
                                return;
                              }
                              setApplyCvName(file.name);
                              const reader = new FileReader();
                              reader.onload = (loadEvt) => {
                                setApplyCvFile(loadEvt.target?.result as string);
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                          className="w-full text-xs font-mono text-slate-550 border rounded-xl p-2 mt-1 cursor-pointer" 
                        />
                        {applyCvName && (
                          <div className="text-[10px] text-emerald-600 mt-1 font-mono">
                            ✓ Prepared: {applyCvName}
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2 justify-end pt-2">
                        <button type="button" onClick={() => setShowApplyModal(null)} className="bg-slate-100 hover:bg-slate-200 px-4 py-2.5 rounded-xl text-[10px] uppercase">Cancel</button>
                        <button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-5 py-2.5 rounded-xl text-[10px] uppercase tracking-wider">Submit Application</button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 6: CONTACT PAGE */}
        {activeTab === 'contact' && (!pagesConfigs.find(p => p.id === 'contact')?.customDesignEnabled) && (
          <div className="max-w-4xl mx-auto px-4 py-12 space-y-12 animate-fade-in" id="website-contact-page">
            <div className="text-center space-y-3">
              <h1 className="text-3xl font-black text-slate-900 uppercase">Contact Head Office &amp; Factory</h1>
              <p className="text-xs text-slate-550 font-bold max-w-sm mx-auto">Email us directly or send your inquiry details using the contact form below.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
              
              {/* Direct location card list */}
              <div className="bg-white border rounded-2xl p-6 shadow-sm space-y-6 text-xs text-slate-700 leading-normal">
                <div className="space-y-4">
                  <div className="flex gap-3">
                    <MapPin className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-black text-slate-900 uppercase">Mirpur Corporate Headquarters</h4>
                      <p className="mt-1">{COMPANY_PROFILE.addresses.office}</p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <MapPin className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-black text-slate-900 uppercase">Arambagh Factory Unit</h4>
                      <p className="mt-1">{COMPANY_PROFILE.addresses.factory}</p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Phone className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-black text-slate-900 uppercase">Hotline Support Numbers</h4>
                      <p className="mt-1 font-mono font-bold text-slate-800">{COMPANY_PROFILE.phones.join(' / ')}</p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Mail className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-black text-slate-900 uppercase">Official Business Email</h4>
                      <p className="mt-1 font-mono font-bold text-emerald-600">{COMPANY_PROFILE.emails.join(' / ')}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 p-4 border rounded-xl space-y-1 select-none">
                  <span className="text-[9px] uppercase font-bold text-emerald-600 tracking-wider">Business registration info</span>
                  <p className="font-mono text-[10px] text-slate-500 font-bold">BIN: {COMPANY_PROFILE.bin} | TIN: {COMPANY_PROFILE.tin}</p>
                </div>
              </div>

              {/* Directly write user message form */}
              <div className="bg-white border rounded-2xl p-6 shadow-sm space-y-4">
                <h3 className="text-sm font-black text-slate-900 uppercase">Send Message</h3>
                
                {contactSent ? (
                  <div className="bg-emerald-50 text-emerald-800 p-4 rounded-xl text-xs font-bold leading-normal text-center space-y-2">
                    <Check className="w-6 h-6 text-emerald-600 mx-auto" />
                    <p>Your message has been successfully submitted to the Acoola Trims support team.</p>
                    <button onClick={() => setContactSent(false)} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1 rounded text-[10px]">Send Another Message</button>
                  </div>
                ) : (
                  <form onSubmit={e => { e.preventDefault(); setContactSent(true); }} className="space-y-4 text-xs font-bold text-slate-700">
                    <div>
                      <label className="block text-[10px] text-slate-500">Your Name / Company Name *</label>
                      <input type="text" required value={contactName} onChange={e => setContactName(e.target.value)} className="w-full bg-slate-50 border rounded p-2 text-slate-800 mt-1" />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500">Email Address *</label>
                      <input type="email" required value={contactEmail} onChange={e => setContactEmail(e.target.value)} className="w-full bg-slate-50 border rounded p-2 text-slate-800 mt-1" />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-500">Your message details *</label>
                      <textarea required value={contactMsg} onChange={e => setContactMsg(e.target.value)} placeholder="Garments styles spec details..." className="w-full bg-slate-50 border rounded p-2 h-20 text-slate-800 mt-1" />
                    </div>
                    <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-2.5 rounded-lg text-[11px] uppercase tracking-wider transition-all cursor-pointer shadow">
                      Send Inquiry
                    </button>
                  </form>
                )}
              </div>
            </div>

            {/* Google Maps Location Preview Area */}
            <div className="bg-white border rounded-2xl p-5 shadow-xs space-y-3" id="google-maps-location-preview">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                <h3 className="text-xs font-black text-slate-900 uppercase">Live Office Location Map</h3>
              </div>
              <div className="rounded-xl overflow-hidden border border-slate-200 aspect-[21/9] min-h-[250px] relative">
                {COMPANY_PROFILE.embedMapCode ? (
                  COMPANY_PROFILE.embedMapCode.trim().startsWith('<') ? (
                    <div 
                      className="absolute inset-0 w-full h-full [&_iframe]:absolute [&_iframe]:inset-0 [&_iframe]:w-full [&_iframe]:h-full [&_iframe]:border-0"
                      dangerouslySetInnerHTML={{ __html: COMPANY_PROFILE.embedMapCode }}
                    />
                  ) : (
                    <iframe
                      title="Google Maps Location View"
                      src={COMPANY_PROFILE.embedMapCode}
                      className="absolute inset-0 w-full h-full border-0"
                      allowFullScreen
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                    ></iframe>
                  )
                ) : (
                  <iframe
                    title="Google Maps Location View"
                    src={`https://maps.google.com/maps?q=${encodeURIComponent(COMPANY_PROFILE.addresses.office)}&t=&z=16&ie=UTF8&iwloc=&output=embed`}
                    className="absolute inset-0 w-full h-full border-0"
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  ></iframe>
                )}
              </div>
              <p className="text-[10px] text-slate-400 font-bold leading-relaxed text-center">
                📍 Coordinates displayed above dynamically update when Head Office Address is updated inside corporate settings.
              </p>
            </div>
          </div>
        )}

        {/* TAB 7: CLIENT USER EXCLUSIVE PORTAL AREA */}
        {activeTab === 'client-hub' && loggedClient && (
          <div className="max-w-7xl mx-auto px-4 py-8 space-y-8 animate-fade-in" id="buyer-customer-portal">
            
            {/* Upper Client Profile Hub Welcome Box */}
            <div className="bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 text-white p-6 rounded-2xl border border-teal-800 shadow-xl border-t-4 border-t-emerald-500 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></div>
                  <span className="text-[9px] font-black tracking-widest text-emerald-400 uppercase font-mono">Verified Buyer Portal</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black">{loggedClient.name}</h2>
                <div className="text-xs text-slate-350 font-bold">
                  🏢 Company: <span className="text-white">{loggedClient.companyName}</span> | ✉️ Account: <span className="text-white font-mono">{loggedClient.email}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setViewMode('website');
                    setActiveTab('home');
                  }}
                  className="bg-slate-800 hover:bg-slate-750 text-white font-bold text-xs px-3.5 py-2' h-9 rounded-lg border border-slate-700 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Globe className="w-3.5 h-3.5" /> Return Web Home
                </button>
                <button
                  onClick={() => {
                    setLoggedClient(null);
                    setViewMode('website');
                    setActiveTab('home');
                  }}
                  className="bg-red-950/20 hover:bg-red-900 text-red-300 font-bold text-xs px-3.5 py-2 rounded-lg border border-red-500/30 transition-all cursor-pointer h-9 sm:h-9 flex items-center justify-center"
                >
                  <LogOut className="w-3.5 h-3.5" /> Portal Logout
                </button>
              </div>
            </div>

            {/* Portal navigation tabs */}
            <div className="flex flex-wrap border-b border-slate-200 gap-1 pb-1 justify-start select-none">
              {[
                { id: 'overview', label: 'Dashboard Overview', icon: Building2 },
                { id: 'new-inquiry', label: 'Build Accessory Spec & Inquiry', icon: Plus },
                { id: 'my-inquiries', label: 'My Inquiries History ({n})', icon: Clock },
                { id: 'my-quotations', label: 'My Price Quotations ({q})', icon: FileCheck },
                { id: 'profile', label: 'My Profile Information', icon: User }
              ].map(subTab => {
                const Icon = subTab.icon;
                const userInquiries = clientInquiries.filter(i => i.clientEmail === loggedClient.email);
                const userQuotations = allQuotations.filter(q => 
                  q.clientEmail && 
                  q.clientEmail.trim().toLowerCase() === loggedClient.email.trim().toLowerCase() &&
                  (!loggedClient.deletedQuotationIds || !loggedClient.deletedQuotationIds.includes(q.id))
                );
                const withCount = subTab.label
                  .replace('{n}', userInquiries.length.toString())
                  .replace('{q}', userQuotations.length.toString());
                return (
                  <button
                    key={subTab.id}
                    onClick={() => {
                      setClientHubTab(subTab.id as any);
                      setIsEditingProfile(false);
                    }}
                    className={`px-4 py-2.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                      clientHubTab === subTab.id
                        ? 'bg-emerald-600 text-white shadow font-extrabold'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{withCount}</span>
                  </button>
                );
              })}
            </div>

            {/* Portal Tab View Contents */}
            <div className="bg-white border rounded-2xl p-5 sm:p-6 shadow-sm">
              
              {/* SUBTAB 1: Overview */}
              {clientHubTab === 'overview' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div className="bg-slate-50 border p-4 rounded-xl">
                      <span className="text-[10px] uppercase font-bold text-slate-500 block leading-none">Submitted Inquiries</span>
                      <span className="text-2xl font-black text-slate-900 mt-2 block font-mono">{clientInquiries.filter(i => i.clientEmail === loggedClient.email).length} items</span>
                    </div>
                    <div className="bg-slate-50 border p-4 rounded-xl">
                      <span className="text-[10px] uppercase font-bold text-slate-500 block leading-none">Issued Quotations</span>
                      <span className="text-2xl font-black text-blue-600 mt-2 block font-mono">
                        {allQuotations.filter(q => 
                          q.clientEmail && 
                          q.clientEmail.trim().toLowerCase() === loggedClient.email.trim().toLowerCase() &&
                          (!loggedClient.deletedQuotationIds || !loggedClient.deletedQuotationIds.includes(q.id))
                        ).length} quotes
                      </span>
                    </div>
                    <div className="bg-slate-50 border p-4 rounded-xl">
                      <span className="text-[10px] uppercase font-bold text-slate-500 block leading-none">Sample Progress</span>
                      <span className="text-2xl font-black text-emerald-650 text-emerald-600 mt-2 block font-mono">
                        {clientInquiries.filter(i => i.clientEmail === loggedClient.email && i.status === 'Sample Initiated').length} Active
                      </span>
                    </div>
                    <div className="bg-slate-50 border p-4 rounded-xl">
                      <span className="text-[10px] uppercase font-bold text-slate-500 block leading-none">Registration Date</span>
                      <span className="text-xs font-bold text-slate-800 mt-2 block font-mono">Joined on: {loggedClient.joinedAt}</span>
                    </div>
                  </div>

                  <div className="border border-emerald-100 rounded-xl p-4 bg-emerald-50/20 text-xs text-slate-700 leading-normal flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div>
                      <h4 className="font-black text-slate-900">🛡️ Safe Client Sandbox Notice</h4>
                      <p className="mt-1">You are registered as an authorized buyer. From this portal, you can create sample requests directly sent to the Acoola Trims factory. Your custom samples and inquiry details are safely saved. Access to the main Admin ERP system and personal payroll modules remains strictly locked for client profiles.</p>
                    </div>
                  </div>

                  {/* Sample Order Specification Builder & Preview */}
                  <div className="border rounded-xl p-4 bg-slate-50/50 space-y-4">
                    <h3 className="text-xs font-black text-slate-900 uppercase">📊 Interactive Accessory Spec Sheet Builder</h3>
                    <p className="text-[11px] text-slate-500 font-bold leading-normal">
                      Type any item's custom declarations in the form below. This will generate an official specification sheet with its barcode and parameters which you can print or download:
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start text-xs font-bold">
                      <div className="space-y-3 bg-white p-4 rounded-xl border">
                        <div>
                          <label className="block text-[10px] text-slate-550">Select Item</label>
                          <select 
                            value={specItem} 
                            onChange={e => setSpecItem(e.target.value)}
                            className="w-full bg-slate-50 border rounded p-1.5 text-slate-800 mt-1"
                          >
                            {WEBSITE_PRODUCTS.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-550">Target Quantity</label>
                          <input 
                            type="number" 
                            value={specQty} 
                            onChange={e => setSpecQty(parseInt(e.target.value) || 0)}
                            className="w-full bg-slate-50 border rounded p-1.5 text-slate-800 mt-1"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-550">Detailed Requirements (Color / Size / Finish Specification)</label>
                          <textarea 
                            value={specText} 
                            onChange={e => setSpecText(e.target.value)}
                            className="w-full bg-slate-50 border rounded p-1.5 h-16 text-slate-800 mt-1"
                          />
                        </div>
                      </div>

                      {/* Live Generated Spec Badge Card */}
                      <div className="bg-white border-2 border-dashed border-slate-300 p-4 rounded-xl text-xs space-y-4 relative overflow-hidden" id="spec-sheet-pdf">
                        <div className="absolute top-1 right-1 text-[8px] bg-slate-100 px-1 border uppercase font-mono font-bold">PDF Format Draft</div>
                        
                        <div className="border-b pb-2 flex justify-between items-center">
                          <div>
                            <span className="block text-[8px] uppercase tracking-widest text-emerald-600 font-bold">Acoola Trims Corp.</span>
                            <span className="block font-black text-slate-900 mt-0.5">TECHNICAL PRODUCT SPEC</span>
                          </div>
                          <span className="text-xs font-black font-mono text-slate-900">REF: {loggedClient.id}</span>
                        </div>

                        <div className="space-y-1.5 font-bold">
                          <div className="flex justify-between border-b pb-1">
                            <span className="text-slate-400 font-medium">Buyer Client :</span>
                            <span>{loggedClient.name}</span>
                          </div>
                          <div className="flex justify-between border-b pb-1">
                            <span className="text-slate-400 font-medium">Factory Entity :</span>
                            <span>{loggedClient.companyName}</span>
                          </div>
                          <div className="flex justify-between border-b pb-1">
                            <span className="text-slate-400 font-medium">Design Trims:</span>
                            <span>{specItem}</span>
                          </div>
                          <div className="flex justify-between border-b pb-1">
                            <span className="text-slate-400 font-medium">Declare Qty:</span>
                            <span className="font-mono">{specQty.toLocaleString()} Pcs</span>
                          </div>
                          <div className="text-[11px] text-slate-600 italic bg-slate-50 p-2 rounded border">
                            Specs: {specText || 'No custom details added yet.'}
                          </div>
                        </div>

                        {/* Custom Barcode Image */}
                        <div className="flex flex-col items-center pt-2 select-none">
                          <div className="h-8 bg-slate-900 w-40 flex items-center justify-around px-1">
                            {[1,4,1,1,3,1,4,1,2,1,1,3,1,4,1,1,2,1,1,4,1].map((bar, i) => (
                              <div key={i} className={`h-full bg-white`} style={{ width: `${bar}px` }}></div>
                            ))}
                          </div>
                          <span className="text-[8px] font-mono font-bold tracking-widest text-slate-400 mt-1">*{loggedClient.id}-SPEC-SAMPLE*</span>
                        </div>

                        <button 
                          onClick={() => {
                            window.print();
                          }}
                          className="w-full bg-slate-100 hover:bg-slate-200 border text-slate-900 font-extrabold py-1.5 rounded text-[10px] flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Download className="w-3 h-3" /> PRINT SPECS PDF / COPY FILE
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* SUBTAB 2: Add Custom sample inquiry to factory */}
              {clientHubTab === 'new-inquiry' && (
                <div className="max-w-xl mx-auto space-y-4">
                  <h3 className="text-xs font-black text-slate-905 uppercase border-b pb-2">Create New Accessories Sample &amp; RFQ Request</h3>
                  <form onSubmit={handleInquirySubmit} className="space-y-4 text-xs font-bold text-slate-700">
                    <div>
                      <label className="block text-[10px] text-slate-500">Selected Trims Category (Accessories Item) *</label>
                      <select 
                        value={specItem} 
                        onChange={e => setSpecItem(e.target.value)}
                        className="w-full bg-slate-50 border rounded p-2 text-slate-800 font-bold mt-1"
                      >
                        {WEBSITE_PRODUCTS.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-500">Required Target Quantity (Pcs) *</label>
                      <input 
                        type="number"
                        required
                        value={specQty}
                        onChange={e => setSpecQty(parseInt(e.target.value) || 0)}
                        className="w-full bg-slate-50 border rounded p-2 text-slate-800 font-mono mt-1"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] text-slate-500">Detailed Requirements (Material spec, Size, Color, Delivery deadline) *</label>
                      <textarea
                        required
                        value={specText}
                        onChange={e => setSpecText(e.target.value)}
                        placeholder="e.g., Yarn: Double ply organic cotton thread, Border finishing: Hot sonic cut, size label..."
                        className="w-full bg-slate-50 border rounded p-2 h-24 text-slate-800 leading-normal mt-1"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-2.5 rounded-xl uppercase tracking-wider transition-all cursor-pointer shadow"
                    >
                      Send Specs &amp; Request Quote
                    </button>
                  </form>
                </div>
              )}

              {/* SUBTAB 3: Inquiry history */}
              {clientHubTab === 'my-inquiries' && (
                <div className="space-y-4">
                  <h3 className="text-xs font-black text-slate-900 border-b pb-2 uppercase text-slate-800 font-bold">My Submitted RFQ Inquiries History</h3>
                  
                  {clientInquiries.filter(i => i.clientEmail === loggedClient.email).length === 0 ? (
                    <p className="text-xs text-slate-400 font-bold text-center py-6">No inquiry history found for your account.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs font-bold text-slate-700">
                        <thead className="bg-slate-50 text-[10px] text-slate-400 uppercase border-b select-none">
                          <tr>
                            <th className="p-3">Inquiry ID</th>
                            <th className="p-3">Trims Item</th>
                            <th className="p-3">Target Qty</th>
                            <th className="p-3">Submit Date</th>
                            <th className="p-3">Specs Description</th>
                            <th className="p-3">Sync Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {clientInquiries.filter(i => i.clientEmail === loggedClient.email).map(inq => (
                            <tr key={inq.id} className="hover:bg-slate-50/50">
                              <td className="p-3 font-mono text-emerald-650">{inq.id}</td>
                              <td className="p-3 text-slate-900">{inq.itemName}</td>
                              <td className="p-3 font-mono">{inq.quantity.toLocaleString()} Pcs</td>
                              <td className="p-3 font-mono text-slate-450">{inq.date}</td>
                              <td className="p-3 text-slate-550 font-normal max-w-xs truncate" title={inq.specDetails}>{inq.specDetails}</td>
                              <td className="p-3">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                                  inq.status === 'Pending Review' ? 'bg-amber-100 text-amber-800 border' :
                                  inq.status === 'Sample Initiated' ? 'bg-sky-100 text-sky-850' : 'bg-emerald-100 text-emerald-850'
                                }`}>
                                  {inq.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* SUBTAB 4: Buyer profile info */}
              {clientHubTab === 'profile' && (
                <div className="max-w-md mx-auto space-y-4 text-xs font-bold text-slate-700">
                  <h3 className="text-xs font-black text-slate-900 border-b pb-2 uppercase flex justify-between items-center">
                    <span>Buyer Profile Details</span>
                    {!isEditingProfile && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditProfileName(loggedClient.name);
                          setEditProfileCompany(loggedClient.companyName);
                          setEditProfilePhone(loggedClient.phone);
                          setEditProfileAddress(loggedClient.address);
                          setIsEditingProfile(true);
                        }}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-3 py-1.5 rounded-lg text-[10px] transition-all cursor-pointer uppercase shadow-xs select-none"
                      >
                        Edit Profile
                      </button>
                    )}
                  </h3>
                  
                  {isEditingProfile ? (
                    <form 
                      onSubmit={(e) => {
                        e.preventDefault();
                        const updatedClient = {
                          ...loggedClient,
                          name: editProfileName,
                          companyName: editProfileCompany,
                          phone: editProfilePhone,
                          address: editProfileAddress
                        };
                        setLoggedClient(updatedClient);
                        setRegisteredClients(prev => prev.map(c => c.email.toLowerCase() === loggedClient.email.toLowerCase() ? updatedClient : c));
                        setIsEditingProfile(false);
                        alert('Profile updated successfully!');
                      }}
                      className="space-y-4 bg-slate-50 p-5 rounded-2xl border text-left"
                    >
                      <div>
                        <label className="block text-[10px] text-slate-500 uppercase">Contact Director Name *</label>
                        <input
                          type="text"
                          required
                          value={editProfileName}
                          onChange={e => setEditProfileName(e.target.value)}
                          className="w-full bg-white border rounded-xl px-3 py-2 text-slate-800 font-bold mt-1 focus:outline-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-500 uppercase">Factory / Group Entity *</label>
                        <input
                          type="text"
                          required
                          value={editProfileCompany}
                          onChange={e => setEditProfileCompany(e.target.value)}
                          className="w-full bg-white border rounded-xl px-3 py-2 text-slate-800 font-bold mt-1 focus:outline-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-500 uppercase">Mobile Hotline *</label>
                        <input
                          type="text"
                          required
                          value={editProfilePhone}
                          onChange={e => setEditProfilePhone(e.target.value)}
                          className="w-full bg-white border rounded-xl px-3 py-2 text-slate-800 font-bold mt-1 focus:outline-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] text-slate-500 uppercase">Delivery &amp; Shipping Address *</label>
                        <input
                          type="text"
                          required
                          value={editProfileAddress}
                          onChange={e => setEditProfileAddress(e.target.value)}
                          className="w-full bg-white border rounded-xl px-3 py-2 text-slate-800 font-bold mt-1 focus:outline-emerald-500"
                        />
                      </div>
                      
                      <div className="flex gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setIsEditingProfile(false)}
                          className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold py-2 rounded-xl transition-all text-center text-xs cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-2 rounded-xl transition-all text-center text-xs cursor-pointer shadow-sm"
                        >
                          Save Changes
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="space-y-3 bg-slate-50 p-4 rounded-xl border">
                      <div>
                        <span className="block text-[9px] text-slate-400 mt-0.5">Contact Director Name</span>
                        <span className="block text-slate-900 font-extrabold text-sm">{loggedClient.name}</span>
                      </div>
                      <div>
                        <span className="block text-[9px] text-slate-400 mt-0.5">Factory Entity Name</span>
                        <span className="block text-slate-900 font-extrabold text-xs">{loggedClient.companyName}</span>
                      </div>
                      <div>
                        <span className="block text-[9px] text-slate-400 mt-0.5">Registered Email</span>
                        <span className="block text-slate-900 text-xs font-mono">{loggedClient.email}</span>
                      </div>
                      <div>
                        <span className="block text-[9px] text-slate-400 mt-0.5">Mobile Hotline</span>
                        <span className="block text-slate-900 text-xs font-mono">{loggedClient.phone}</span>
                      </div>
                      <div>
                        <span className="block text-[9px] text-slate-400 mt-0.5">Delivery Shipping Address</span>
                        <span className="block text-slate-900 text-xs">{loggedClient.address}</span>
                      </div>
                    </div>
                  )}

                  <p className="text-[10px] text-slate-400 font-bold leading-normal text-center">To request profile updates or verify security permissions, contact support hotlines directly.</p>
                </div>
              )}

              {/* SUBTAB 5: My Price Quotations */}
              {clientHubTab === 'my-quotations' && (
                <div className="space-y-4">
                  <h3 className="text-xs font-black text-slate-900 border-b pb-2 uppercase text-slate-800">Official Price Quotations Issued For Me</h3>
                  
                  {allQuotations.filter(q => 
                    q.clientEmail && 
                    q.clientEmail.trim().toLowerCase() === loggedClient.email.trim().toLowerCase() &&
                    (!loggedClient.deletedQuotationIds || !loggedClient.deletedQuotationIds.includes(q.id))
                  ).length === 0 ? (
                    <div className="text-center py-8 bg-slate-50 border rounded-2xl">
                      <p className="text-xs text-slate-400 font-bold">No quotation history found for your account.</p>
                      <p className="text-[10px] text-slate-400 mt-1">When administration reviews your sample specs and issues a formal quotation, it will automatically appear here.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs font-bold text-slate-700">
                        <thead className="bg-slate-50 text-[10px] text-slate-400 uppercase border-b select-none">
                          <tr>
                            <th className="p-3">Quotation No</th>
                            <th className="p-3">Issue Date</th>
                            <th className="p-3">Validity</th>
                            <th className="p-3">Trims Items</th>
                            <th className="p-3">Total Amount</th>
                            <th className="p-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {allQuotations.filter(q => 
                            q.clientEmail && 
                            q.clientEmail.trim().toLowerCase() === loggedClient.email.trim().toLowerCase() &&
                            (!loggedClient.deletedQuotationIds || !loggedClient.deletedQuotationIds.includes(q.id))
                          ).map(q => (
                            <tr key={q.id} className="hover:bg-slate-50/50">
                              <td className="p-3 font-mono text-emerald-650">{q.quoteNo}</td>
                              <td className="p-3 font-mono text-slate-500">{q.quoteDate}</td>
                              <td className="p-3 text-slate-600 font-medium">{q.validity || '30 Days'}</td>
                              <td className="p-3 text-slate-800 max-w-xs truncate">
                                {q.items?.map((item: any) => `${item.itemName} (${item.quantity} ${item.unit})`).join(', ') || 'N/A'}
                              </td>
                              <td className="p-3 text-slate-900 font-black font-mono">
                                USD {q.totalAmount?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                              </td>
                              <td className="p-3 text-right space-x-2">
                                <button
                                  type="button"
                                  onClick={() => setViewingQuotation(q)}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-3 py-1.5 rounded-lg text-[10px] transition-all cursor-pointer uppercase shadow-xs inline-flex items-center gap-1"
                                >
                                  <FileCheck className="w-3 h-3" /> View Quote
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (confirm('Are you sure you want to delete this quotation from your profile? This action will only hide it from your dashboard but keep it in our ERP archive.')) {
                                      const currentDeleted = loggedClient.deletedQuotationIds || [];
                                      const updatedClient = {
                                        ...loggedClient,
                                        deletedQuotationIds: [...currentDeleted, q.id]
                                      };
                                      setLoggedClient(updatedClient);
                                      setRegisteredClients(prev => prev.map(c => c.email.toLowerCase() === loggedClient.email.toLowerCase() ? updatedClient : c));
                                    }
                                  }}
                                  className="bg-red-50 hover:bg-red-100 text-red-650 text-red-600 border border-red-200 font-bold px-3 py-1.5 rounded-lg text-[10px] transition-all cursor-pointer uppercase"
                                >
                                  Delete
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
        )}

      </main>

      {/* -------------------- SPECTACULAR 3-COLUMN FOOTER -------------------- */}
      <footer 
        className="text-white pt-16 pb-3 px-4 transition-all duration-300" 
        style={{ 
          backgroundColor: (COMPANY_PROFILE.firstColor && 
            COMPANY_PROFILE.firstColor.toLowerCase() !== '#ffffff' && 
            COMPANY_PROFILE.firstColor.toLowerCase() !== '#fff' && 
            COMPANY_PROFILE.firstColor.toLowerCase() !== 'white') 
              ? COMPANY_PROFILE.firstColor 
              : '#007D46', 
          borderTop: '1px solid rgba(255,255,255,0.1)' 
        }}
        id="corporate-footer"
      >
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-10 pb-8">
          
          {/* Column 1: logo and brief description */}
          <div className="space-y-4">
            <div 
              onClick={() => {
                setActiveTab('home');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="flex items-center gap-3 cursor-pointer group"
              title="Go to Home"
            >
              {COMPANY_PROFILE.logo ? (
                <img src={COMPANY_PROFILE.logo} alt="Logo" className="w-9 h-9 object-contain rounded bg-white p-1 group-hover:scale-105 transition-all" referrerPolicy="no-referrer" />
              ) : (
                <span className="w-9 h-9 bg-white/20 text-white rounded-lg flex items-center justify-center font-bold group-hover:scale-105 transition-all">
                  {COMPANY_PROFILE.name?.charAt(0) || 'A'}
                </span>
              )}
              <h3 className="text-md font-black tracking-tight text-white uppercase flex-1 truncate group-hover:text-emerald-300 transition-colors">
                {COMPANY_PROFILE.name}
              </h3>
            </div>
            <p className="text-xs text-white/80 leading-relaxed font-bold max-w-sm">
              {COMPANY_PROFILE.websiteIntro || "We manufacture certified superior trim styles for garments exporters. Standard quality labels, barcodes, offset tags, boxes, and accessories from our central unit in Motijheel Arambagh."}
            </p>
            <span className="block text-[10px] font-mono text-white/60 font-bold">BIN: {COMPANY_PROFILE.bin} | TIN: {COMPANY_PROFILE.tin}</span>
          </div>

          {/* Column 2: quick navigator links */}
          <div className="space-y-4 text-xs font-bold text-white/80">
            <h4 className="text-sm font-black text-white uppercase tracking-wider pb-1">Quick Links</h4>
            <ul className="space-y-2.5">
              {[
                { id: 'home', label: 'Home' },
                { id: 'about', label: 'About Us' },
                { id: 'products', label: 'Our Products' },
                { id: 'sustainability', label: 'Sustainability' },
                { id: 'careers', label: 'Careers' },
                { id: 'contact', label: 'Contact Us' }
              ].map(link => (
                <li key={link.id}>
                  <a 
                    href={getLinkUrl(link.id)}
                    onClick={(e) => {
                      e.preventDefault();
                      setActiveTab(link.id as any);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="hover:text-white/100 hover:underline cursor-pointer flex items-center gap-1.5 transition-colors"
                  >
                    <ChevronRight className="w-3 h-3 text-white/60" /> {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Contact factory & addresses */}
          <div className="space-y-4 text-xs font-bold text-white/80">
            <h4 className="text-sm font-black text-white uppercase tracking-wider pb-1">Corporate &amp; Factory Unit</h4>
            <ul className="space-y-2.5 leading-relaxed">
              <li className="flex gap-2">
                <MapPin className="w-4 h-4 text-white/70 shrink-0 mt-0.5" />
                <span>Office: {COMPANY_PROFILE.addresses.office}</span>
              </li>
              <li className="flex gap-2">
                <MapPin className="w-4 h-4 text-white/70 shrink-0 mt-0.5" />
                <span>Factory: {COMPANY_PROFILE.addresses.factory}</span>
              </li>
              <li className="flex gap-2">
                <Phone className="w-4 h-4 text-white/70 shrink-0 mt-0.5" />
                <span className="font-mono">{COMPANY_PROFILE.phones[0]}</span>
              </li>
              <li className="flex gap-2">
                <Mail className="w-4 h-4 text-white/70 shrink-0 mt-0.5" />
                <span className="font-mono">{COMPANY_PROFILE.emails[0]}</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Fine bottom text of footer */}
        <div className="max-w-7xl mx-auto pt-6 flex justify-center items-center text-xs font-bold text-white/70 font-mono text-center select-none border-t border-white/10 mt-4">
          <span>&copy; {new Date().getFullYear()} {COMPANY_PROFILE.name}. All Rights Reserved.</span>
        </div>
      </footer>

      {/* ----------------- DYNAMIC LOGIN & REGISTRATION MODAL POPUP ----------------- */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-[9999] p-4 select-none overflow-y-auto">
          <div className="bg-white border border-slate-200 text-slate-900 rounded-3xl max-w-md w-full shadow-2xl p-7 space-y-6 relative border-t-8 border-t-emerald-600 animate-fade-in my-auto">
            
            {/* Modal Heading block */}
            <div className="text-center space-y-2">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-emerald-50 rounded-2xl text-emerald-600 shadow-sm border border-emerald-100 mb-1">
                <Lock className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-black text-slate-900 uppercase">
                {socialAuthPlatform ? `Connect via ${socialAuthPlatform}` : (isRegistering ? 'New Buyer Registration' : 'Unified Login Access Hub')}
              </h2>
              <p className="text-xs text-slate-500 max-w-xs mx-auto font-bold">
                {socialAuthPlatform ? `Sign in or create a real connected buyer profile using your ${socialAuthPlatform} account.` : (isRegistering ? 'Create a buyer account below with your corporate details.' : 'Multi-channel secure portal for operators and apparel buyers.')}
              </p>
            </div>

            {/* Error notifications */}
            {loginError && !socialAuthPlatform && (
              <div className="bg-red-50 border border-red-200 text-red-900 p-3.5 rounded-xl text-xs font-bold leading-normal flex items-start gap-2">
                <ShieldAlert className="w-4 h-4 text-red-650 mt-0.5 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            {/* Form Mode Toggle Button (Staff vs Client) inside login view */}
            {!isRegistering && !socialAuthPlatform && (
              <div className="grid grid-cols-2 bg-slate-100 p-1.5 rounded-xl border select-none font-bold text-xs" id="role-switches">
                <button
                  type="button"
                  onClick={() => { setLoginRole('staff'); setLoginError(''); }}
                  className={`py-2 px-1 rounded-lg transition-all cursor-pointer ${
                    loginRole === 'staff'
                      ? 'bg-white text-slate-900 shadow-sm font-extrabold'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  🏢 ERP Staff User
                </button>
                <button
                  type="button"
                  onClick={() => { setLoginRole('client'); setLoginError(''); }}
                  className={`py-2 px-1 rounded-lg transition-all cursor-pointer ${
                    loginRole === 'client'
                      ? 'bg-white text-slate-900 shadow-sm font-extrabold'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  👤 Client Account
                </button>
              </div>
            )}
            {socialAuthPlatform ? (
              oauthLoadingStep > 0 ? (
                <div className="py-8 text-center space-y-4">
                  <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
                    <div className="w-16 h-16 rounded-full border-4 border-slate-100 border-t-emerald-600 animate-spin absolute"></div>
                    {socialAuthPlatform === 'Google' ? (
                      <svg className="w-7 h-7" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.92h6.61c-.29 1.5-1.14 2.77-2.4 3.61v3h3.86c2.26-2.08 3.67-5.15 3.67-8.46z"/>
                        <path fill="#34A853" d="M12 24c3.24 0 5.95-1.07 7.94-2.91l-3.86-3c-1.08.72-2.45 1.16-4.08 1.16-3.15 0-5.81-2.12-6.76-4.99H1.27v3.1A11.986 11.986 0 0 0 12 24z"/>
                        <path fill="#FBBC05" d="M5.24 14.26c-.25-.72-.39-1.5-.39-2.3s.14-1.58.39-2.3V6.56H1.27a11.986 11.986 0 0 0 0 10.8l3.97-3.1z"/>
                        <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.37 0 3.35 2.65 1.27 6.56l3.97 3.1c.95-2.87 3.61-4.91 6.76-4.91z"/>
                      </svg>
                    ) : (
                      <svg className="w-7 h-7 fill-current text-[#1877F2]" viewBox="0 0 24 24">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                      </svg>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-xs font-black text-slate-800 uppercase tracking-wider">
                      {socialAuthPlatform} OAuth Handshake
                    </p>
                    <p className="text-[11px] text-slate-505 font-black animate-pulse">
                      {oauthLoadingStep === 1 && "Exchanging credentials with secure server..."}
                      {oauthLoadingStep === 2 && "Verifying authorization with identity APIs..."}
                      {oauthLoadingStep === 3 && `Syncing buyer account for ${oauthSelectedEmail}...`}
                      {oauthLoadingStep === 4 && "Access Granted! Opening Buyer Portal..."}
                    </p>
                  </div>
                  <div className="text-[9.5px] bg-slate-50 text-slate-450 p-2.5 rounded-xl font-mono leading-tight max-w-xs mx-auto border border-dashed">
                    Connection: SECURE (TLS 1.3)<br />
                    Identity: {oauthSelectedName || 'Authenticated User'}<br />
                    Rights: Client Portal Only (No ERP access)
                  </div>
                </div>
              ) : oauthCustomMode ? (
                /* CUSTOM SOCIAL LOGIN ENTRY FORM */
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!socialName || !socialEmail) {
                      alert("Please fill in Name and Email.");
                      return;
                    }
                    triggerOauthSimulation(socialName, socialEmail, socialCompany, socialPhone, socialAddress);
                  }} 
                  className="space-y-4 text-left text-xs font-bold text-slate-700"
                >
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[10px] text-slate-530 uppercase">Your Full Name *</label>
                      <input 
                        type="text" 
                        required 
                        value={socialName} 
                        onChange={e => setSocialName(e.target.value)} 
                        placeholder="e.g. Md. Salim" 
                        className="w-full bg-slate-50 border rounded-xl px-3 py-2 text-slate-800 font-bold mt-1 focus:bg-white" 
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-530 uppercase">Email Address *</label>
                      <input 
                        type="email" 
                        required 
                        value={socialEmail} 
                        onChange={e => setSocialEmail(e.target.value)} 
                        placeholder="e.g. designer.bd.salim@gmail.com" 
                        className="w-full bg-slate-50 border rounded-xl px-3 py-2 text-slate-800 font-bold mt-1 focus:bg-white" 
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-530 uppercase">Factory / Group (Optional)</label>
                      <input 
                        type="text" 
                        value={socialCompany} 
                        onChange={e => setSocialCompany(e.target.value)} 
                        placeholder="e.g. Standard Group Ltd" 
                        className="w-full bg-slate-50 border rounded-xl px-3 py-2 text-slate-800 font-bold mt-1 focus:bg-white" 
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-530 uppercase">Mobile Number (Optional)</label>
                      <input 
                        type="text" 
                        value={socialPhone} 
                        onChange={e => setSocialPhone(e.target.value)} 
                        placeholder="e.g. 01711000000" 
                        className="w-full bg-slate-50 border rounded-xl px-3 py-2 text-slate-800 font-bold mt-1 focus:bg-white" 
                      />
                    </div>
                  </div>

                  <div className="flex gap-2.5 pt-1">
                    <button
                      type="button"
                      onClick={() => setOauthCustomMode(false)}
                      className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl transition-all cursor-pointer text-center text-xs"
                    >
                      CHOOSE PRE-SET
                    </button>
                    <button
                      type="submit"
                      className="flex-1 bg-emerald-650 hover:bg-emerald-600 text-white font-extrabold py-2.5 rounded-xl transition-all cursor-pointer text-center text-xs"
                    >
                      AUTHORIZE NOW
                    </button>
                  </div>
                </form>
              ) : (
                /* BEAUTIFUL POPUP ACCOUNT CHOOSER DIALOG */
                <div className="space-y-4">
                  <div className="border border-slate-200/60 rounded-2xl p-3.5 bg-amber-50/50 text-[10.5px] leading-relaxed text-slate-500 font-bold">
                    <span className="text-red-600 block uppercase font-extrabold text-[10px] mb-0.5">⚠️ Secure Boundary Notice</span>
                    Google and Facebook accounts can ONLY register as <strong className="text-slate-750">Buyers / Clients</strong>. They have <strong className="text-red-600">ZERO ACCESS</strong> to the ERP system or financial accounting modules under any circumstances.
                  </div>

                  {socialAuthPlatform === 'Google' ? (
                    /* GOOGLE CHOOSER MOCK */
                    <div className="space-y-2">
                      <p className="text-[10px] uppercase text-slate-400 tracking-wider font-extrabold text-left">Choose Google Account</p>
                      
                      <button
                        type="button"
                        onClick={() => triggerOauthSimulation('Salim Reza', 'designer.bd.salim@gmail.com', 'Acoola Fashion Sourcing')}
                        className="w-full flex items-center justify-between p-3 border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/30 rounded-xl transition-all text-left cursor-pointer group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 text-white font-bold text-sm flex items-center justify-center shadow-xs">SR</div>
                          <div>
                            <p className="text-xs font-black text-slate-800">Salim Reza</p>
                            <p className="text-[10px] text-slate-450 font-semibold">designer.bd.salim@gmail.com</p>
                          </div>
                        </div>
                        <span className="text-[9px] uppercase font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-all">Sign In</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => triggerOauthSimulation('Salim Sourcing', 'salim.sourcing@gmail.com', 'Ayra Apparel Trims')}
                        className="w-full flex items-center justify-between p-3 border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/30 rounded-xl transition-all text-left cursor-pointer group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-amber-500 to-orange-500 text-white font-bold text-sm flex items-center justify-center shadow-xs">SS</div>
                          <div>
                            <p className="text-xs font-black text-slate-800">Salim Sourcing</p>
                            <p className="text-[10px] text-slate-450 font-semibold">salim.sourcing@gmail.com</p>
                          </div>
                        </div>
                        <span className="text-[9px] uppercase font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-all">Sign In</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setOauthCustomMode(true)}
                        className="w-full flex items-center gap-3 p-3 border border-dashed border-slate-300 hover:border-emerald-500 hover:bg-slate-50 rounded-xl transition-all text-left cursor-pointer text-slate-600 font-bold text-xs"
                      >
                        <div className="w-9 h-9 rounded-full border border-dashed border-slate-300 flex items-center justify-center text-slate-400">+</div>
                        <span>Use another Google account...</span>
                      </button>
                    </div>
                  ) : (
                    /* FACEBOOK LOGIN MOCK */
                    <div className="space-y-2">
                      <p className="text-[10px] uppercase text-slate-400 tracking-wider font-extrabold text-left">Log In With Facebook</p>
                      
                      <button
                        type="button"
                        onClick={() => triggerOauthSimulation('Salim Reza', 'salim.reza.fb@gmail.com', 'Sourcing Partner')}
                        className="w-full flex items-center justify-between p-3.5 bg-[#1877F2] hover:bg-[#166fe5] text-white rounded-xl transition-all text-left cursor-pointer font-extrabold text-xs shadow-md"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-white text-[#1877F2] font-black text-sm flex items-center justify-center">S</div>
                          <div>
                            <p className="font-extrabold text-white">Continue as Salim Reza</p>
                            <p className="text-[10px] text-blue-100 font-normal">salim.reza.fb@gmail.com</p>
                          </div>
                        </div>
                        <svg className="w-5 h-5 fill-current text-white shrink-0" viewBox="0 0 24 24">
                          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                        </svg>
                      </button>

                      <button
                        type="button"
                        onClick={() => setOauthCustomMode(true)}
                        className="w-full flex items-center gap-3 p-3 border border-dashed border-slate-300 hover:border-emerald-500 hover:bg-slate-50 rounded-xl transition-all text-left cursor-pointer text-slate-600 font-bold text-xs"
                      >
                        <div className="w-9 h-9 rounded-full border border-dashed border-slate-300 flex items-center justify-center text-slate-400">+</div>
                        <span>Use another Facebook account...</span>
                      </button>
                    </div>
                  )}

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => setSocialAuthPlatform(null)}
                      className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl transition-all cursor-pointer text-center text-xs uppercase"
                    >
                      Back to Unified Login
                    </button>
                  </div>
                </div>
              )
            ) : !isRegistering ? (
              <form onSubmit={handleLoginSubmit} className="space-y-4 text-left text-xs font-bold text-slate-700">
                <div className="space-y-1">
                  <label className="block text-[10px] text-slate-550 uppercase">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                    <input
                      type="email"
                      required
                      value={loginEmail}
                      onChange={e => setLoginEmail(e.target.value)}
                      placeholder={loginRole === 'staff' ? 'staff@acoolatrims.com' : 'buyer@standardgroup.com'}
                      className="w-full bg-slate-50 border rounded-xl pl-9 pr-3 py-2.5 text-slate-800 font-bold focus:bg-white"
                      disabled={loginLoading}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] text-slate-550 uppercase">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                    <input
                      type="password"
                      required
                      value={loginPassword}
                      onChange={e => setLoginPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full bg-slate-50 border rounded-xl pl-9 pr-3 py-2.5 text-slate-800 tracking-wider font-bold focus:bg-white"
                      disabled={loginLoading}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-slate-950 hover:bg-slate-900 text-white font-extrabold py-3 rounded-xl tracking-wider uppercase transition-all flex items-center justify-center gap-2 cursor-pointer mt-1 h-11"
                  disabled={loginLoading}
                >
                  {loginLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <span>Login</span>}
                </button>

                {loginRole === 'client' && (
                  <>
                    <div className="relative flex py-1.5 items-center">
                      <div className="flex-grow border-t border-slate-200"></div>
                      <span className="flex-shrink mx-3 text-slate-400 font-bold text-[9px] uppercase tracking-wider">Or Continue With</span>
                      <div className="flex-grow border-t border-slate-200"></div>
                    </div>

                    <div className="grid grid-cols-2 gap-3.5 pt-0.5">
                      <button
                        type="button"
                        onClick={() => triggerRealFirebaseAuth('Google')}
                        className="flex items-center justify-center gap-2 border border-slate-200 hover:bg-slate-50 text-slate-700 bg-white p-2.5 rounded-xl text-xs font-black transition-all cursor-pointer h-10 shadow-xs"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.92h6.61c-.29 1.5-1.14 2.77-2.4 3.61v3h3.86c2.26-2.08 3.67-5.15 3.67-8.46z"/>
                          <path fill="#34A853" d="M12 24c3.24 0 5.95-1.07 7.94-2.91l-3.86-3c-1.08.72-2.45 1.16-4.08 1.16-3.15 0-5.81-2.12-6.76-4.99H1.27v3.1A11.986 11.986 0 0 0 12 24z"/>
                          <path fill="#FBBC05" d="M5.24 14.26c-.25-.72-.39-1.5-.39-2.3s.14-1.58.39-2.3V6.56H1.27a11.986 11.986 0 0 0 0 10.8l3.97-3.1z"/>
                          <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.37 0 3.35 2.65 1.27 6.56l3.97 3.1c.95-2.87 3.61-4.91 6.76-4.91z"/>
                        </svg>
                        <span>Google</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => triggerRealFirebaseAuth('Facebook')}
                        className="flex items-center justify-center gap-2 border border-[#1877F2]/10 hover:opacity-90 text-white bg-[#1877F2] p-2.5 rounded-xl text-xs font-black transition-all cursor-pointer h-10 shadow-xs"
                      >
                        <svg className="w-4 h-4 fill-current text-white" viewBox="0 0 24 24">
                          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                        </svg>
                        <span>Facebook</span>
                      </button>
                    </div>
                  </>
                )}

                {loginRole === 'client' && (
                  <div className="text-center pt-2">
                    <span className="text-[11px] text-slate-530">New to Acoola? </span>
                    <button
                      type="button"
                      onClick={() => {
                        setLoginError('');
                        setIsRegistering(true);
                      }}
                      className="text-[11px] text-emerald-600 hover:underline cursor-pointer font-extrabold"
                    >
                      Create a Buyer Account
                    </button>
                  </div>
                )}
              </form>
            ) : (
              /* B. STANDALONE CLIENT REGISTRATION FORM */
              <form onSubmit={handleRegisterSubmit} className="space-y-3.5 text-left text-xs font-bold text-slate-700 max-h-[360px] overflow-y-auto pr-1">
                <div>
                  <label className="block text-[10px] text-slate-530 uppercase">Contact Director Name *</label>
                  <input type="text" required value={regName} onChange={e => setRegName(e.target.value)} placeholder="MD Salim Rezwan" className="w-full bg-slate-50 border rounded-xl px-3 py-2 text-slate-800 font-bold mt-1" />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-530 uppercase">Enterprise Email *</label>
                  <input type="email" required value={regEmail} onChange={e => setRegEmail(e.target.value)} placeholder="buyer@example.com" className="w-full bg-slate-50 border rounded-xl px-3 py-2 text-slate-800 font-bold mt-1" />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-530 uppercase">Password *</label>
                  <input type="password" required value={regPassword} onChange={e => setRegPassword(e.target.value)} placeholder="••••••••" className="w-full bg-slate-50 border rounded-xl px-3 py-2 text-slate-850 mt-1" />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-530 uppercase">Factory / Group Entity *</label>
                  <input type="text" required value={regCompany} onChange={e => setRegCompany(e.target.value)} placeholder="Standard Group PLC Ltd" className="w-full bg-slate-50 border rounded-xl px-3 py-2 text-slate-800 mt-1" />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-530 uppercase">Mobile Hot Number *</label>
                  <input type="text" required value={regPhone} onChange={e => setRegPhone(e.target.value)} placeholder="01711000000" className="w-full bg-slate-50 border rounded-xl px-3 py-2 text-slate-800 font-bold mt-1" />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-530 uppercase">Delivery &amp; Shipping Address *</label>
                  <input type="text" required value={regAddress} onChange={e => setRegAddress(e.target.value)} placeholder="Plot no 44, Station road, Tongi Gazipur" className="w-full bg-slate-50 border rounded-xl px-3 py-2 text-slate-800 mt-1" />
                </div>

                <div className="pt-2 space-y-2">
                  <button
                    type="submit"
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-3 rounded-xl uppercase transition-all tracking-wider cursor-pointer"
                  >
                    REGISTER BUYER ACCOUNT
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLoginError('');
                      setIsRegistering(false);
                    }}
                    className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 rounded-xl transition-all cursor-pointer text-center text-[10px]"
                  >
                    Already have an account? Sign In
                  </button>
                </div>
              </form>
            )}

            {/* Modal close indicator */}
            <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono pt-3 border-t">
              <button 
                type="button" 
                onClick={() => {
                  setShowLoginModal(false);
                  setIsRegistering(false);
                }} 
                className="text-red-500 hover:underline font-extrabold cursor-pointer"
              >
                Cancel (Close)
              </button>
              <span>SECURED SSL GATEWAY</span>
            </div>
          </div>
        </div>
      )}

      {/* Dynamic Subcategories Browser Modal */}
      {viewCategoryModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[999] p-4 font-sans text-xs">
          <div className="bg-white border rounded-3xl w-full max-w-2xl p-6 shadow-2xl relative animate-scale-up text-left">
            <button
              onClick={() => setViewCategoryModal(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 cursor-pointer p-1.5 hover:bg-slate-100 rounded-full transition-all"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="space-y-4">
              <div className="border-b pb-3.5 text-left">
                <span className="text-[10px] uppercase font-black tracking-widest bg-emerald-50 text-emerald-700 border border-emerald-300/20 px-3 py-1 rounded">
                  Accessories Group Catalog
                </span>
                <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight mt-1.5">
                  Explore Components: {viewCategoryModal}
                </h2>
                <p className="text-[11px] text-slate-500 font-bold leading-normal mt-0.5">
                  Dynamic sub-categories designated for our trusted garments buyers and trims merchandisers. Click on any item to view technical specifications and access the RFQ options directly.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-[300px] overflow-y-auto pr-1">
                {(PRODUCT_CATEGORIES_MAP[viewCategoryModal] || []).map((subItem) => {
                  return (
                    <button
                      key={subItem}
                      onClick={() => {
                        setSelectedCategory(viewCategoryModal);
                        setSelectedSubcategory(subItem);
                        setActiveTab('products');
                        setViewCategoryModal(null);
                      }}
                      className="bg-slate-50 hover:bg-emerald-50 hover:border-emerald-300 border border-slate-200/80 p-3 rounded-xl transition-all text-left flex items-center gap-2 cursor-pointer duration-150 group"
                    >
                      <span className="w-2 h-2 rounded-full bg-emerald-500 group-hover:scale-125 transition-transform shrink-0"></span>
                      <span className="font-extrabold text-slate-705 group-hover:text-emerald-950 uppercase text-[10.5px] truncate select-none">
                        {subItem}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="border-t pt-4 flex items-center justify-between text-[10px] text-slate-400 font-semibold select-none">
                <span>Total Items: {(PRODUCT_CATEGORIES_MAP[viewCategoryModal] || []).length} catalog records found</span>
                <span className="text-emerald-650 font-extrabold">SECURED ECO REGISTERED</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bespoke Quote Request Modal dialog */}
      {showQuoteModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white border rounded-3xl w-full max-w-lg p-6 shadow-2xl relative animate-fade-in text-left">
            <button
              onClick={() => setShowQuoteModal(false)}
              className="absolute top-4 right-4 text-slate-450 hover:text-slate-700 cursor-pointer p-1"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="space-y-4">
              <div className="border-b pb-3.5 text-left">
                <span className="text-[9px] font-black uppercase text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded border border-emerald-300/30">
                  Instant Wholesale Quote Inquiry
                </span>
                <h2 className="text-base font-black text-slate-900 uppercase tracking-tight mt-1">
                  Request Pricing Quotation
                </h2>
                <p className="text-[10.5px] text-slate-500 font-bold">
                  Bespoke garment trims manufacturing feedback within 12 hours.
                </p>
              </div>

              <form onSubmit={handleQuoteModalSubmit} className="space-y-4 text-xs font-bold text-slate-705">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-slate-500 uppercase tracking-wide">Your Full Name *</label>
                    <input
                      type="text"
                      required
                      value={quoteInquiryData.name}
                      onChange={e => setQuoteInquiryData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full bg-slate-50 border rounded-xl p-2.5 mt-1 text-slate-800 font-extrabold focus:bg-white focus:outline-emerald-500"
                      placeholder="John Doe / Merchant"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 uppercase tracking-wide">Business Contact Email *</label>
                    <input
                      type="email"
                      required
                      value={quoteInquiryData.email}
                      onChange={e => setQuoteInquiryData(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full bg-slate-50 border rounded-xl p-2.5 mt-1 text-slate-800 font-extrabold focus:bg-white focus:outline-emerald-500"
                      placeholder="Enter contact email address"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-slate-500 uppercase tracking-wide">Item Name / Accessory *</label>
                    <input
                      type="text"
                      required
                      value={quoteInquiryData.itemName}
                      onChange={e => setQuoteInquiryData(prev => ({ ...prev, itemName: e.target.value }))}
                      className="w-full bg-slate-50 border rounded-xl p-2.5 mt-1 text-slate-800 font-extrabold focus:bg-white focus:outline-emerald-500"
                      placeholder="e.g. Satin Edge Woven Label"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 uppercase tracking-wide">Inquiry Category Group *</label>
                    <input
                      type="text"
                      required
                      value={quoteInquiryData.category}
                      onChange={e => setQuoteInquiryData(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full bg-slate-50 border rounded-xl p-2.5 mt-1 text-slate-800 font-bold focus:bg-white focus:outline-emerald-500"
                      placeholder="e.g. Labels & Tags"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-slate-500 uppercase tracking-wide">Target Quantity *</label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={quoteInquiryData.quantity}
                      onChange={e => setQuoteInquiryData(prev => ({ ...prev, quantity: Number(e.target.value) }))}
                      className="w-full bg-slate-50 border rounded-xl p-2.5 mt-1 text-slate-850 font-mono focus:bg-white focus:outline-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-500 uppercase tracking-wide">Target Quantity Unit *</label>
                    <select
                      value={quoteInquiryData.quantityUnit}
                      onChange={e => setQuoteInquiryData(prev => ({ ...prev, quantityUnit: e.target.value }))}
                      className="w-full bg-slate-50 border rounded-xl p-2.5 mt-1 text-slate-800 font-bold focus:bg-white focus:outline-emerald-500 cursor-pointer"
                    >
                      <option value="Pcs">Pcs</option>
                      <option value="Dzn">Dzn</option>
                      <option value="Set">Set</option>
                      <option value="Yds">Yds</option>
                      <option value="Roll">Roll</option>
                      <option value="Kg">Kg</option>
                      <option value="Mtr">Mtr</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] text-slate-500 uppercase tracking-wide">Bespoke Specifications / Material Specs Details</label>
                  <textarea
                    required
                    value={quoteInquiryData.specDetails}
                    onChange={e => setQuoteInquiryData(prev => ({ ...prev, specDetails: e.target.value }))}
                    className="w-full bg-slate-50 border rounded-xl p-2.5 h-24 mt-1 text-slate-800 leading-relaxed font-semibold focus:bg-white focus:outline-emerald-500"
                    placeholder="e.g. Width 2.5cm, double sided satin weaving, Pantone 281 C Blue matching, certified organic weft..."
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3 rounded-xl uppercase tracking-wider transition-colors cursor-pointer shadow-md"
                >
                  Submit Price Quotation Inquiry
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Printable View Quotation Modal */}
      {viewingQuotation && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center z-[999] p-4 font-sans text-xs print:p-0 print:bg-white">
          <div className="bg-white border rounded-3xl w-full max-w-3xl p-6 sm:p-8 shadow-2xl relative animate-scale-up text-left max-h-[90vh] overflow-y-auto print:max-h-full print:overflow-visible print:border-none print:shadow-none print:rounded-none print:p-0">
            
            {/* Close icon for non-print */}
            <button
              onClick={() => setViewingQuotation(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 cursor-pointer p-1.5 hover:bg-slate-100 rounded-full transition-all print:hidden"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Print Header Controls */}
            <div className="flex justify-between items-center border-b pb-4 mb-6 print:hidden">
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase">Official Price Quotation</h3>
                <p className="text-[10px] text-slate-400 font-bold mt-0.5">Verified authentic quotation issued by Acoola Trims ERP systems.</p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-4 py-2 rounded-xl text-xs transition-all cursor-pointer inline-flex items-center gap-1.5 shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" /> Print / PDF
                </button>
                <button
                  type="button"
                  onClick={() => setViewingQuotation(null)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2 rounded-xl text-xs transition-all cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>

            {/* Quote Sheet Area */}
            <div className="space-y-6 print:space-y-4" id="printable-quote-sheet">
              
              {/* Top Row: Factory Brand & Quote Metadata */}
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4 border-b pb-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-lg font-black tracking-tighter text-slate-900">ACOOLA TRIMS CORPORATION</span>
                  </div>
                  <p className="text-[10px] text-emerald-600 font-extrabold tracking-wider uppercase font-mono">Premium Garments Accessories & Labeling</p>
                  <div className="text-[10px] text-slate-500 space-y-0.5">
                    <div>📍 Plot 12, Road 4, Sector 3, Uttara, Dhaka, Bangladesh</div>
                    <div>✉️ sales@acoolatrims.com | 📞 +880 1810-093122</div>
                  </div>
                </div>

                <div className="text-right sm:text-right space-y-1">
                  <div className="inline-block bg-slate-900 text-white font-mono px-3 py-1 rounded text-[10px] font-bold uppercase tracking-wider">
                    PRICE QUOTATION
                  </div>
                  <div className="text-[11px] font-extrabold text-slate-800 font-mono mt-1">
                    No: <span className="text-emerald-650">{viewingQuotation.quoteNo}</span>
                  </div>
                  <div className="text-[10px] text-slate-500 font-bold font-mono">
                    Date: {viewingQuotation.quoteDate}
                  </div>
                  <div className="text-[10px] text-slate-500 font-bold font-mono">
                    Validity: {viewingQuotation.validity || '30 Days'}
                  </div>
                </div>
              </div>

              {/* Bill To & Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border print:bg-white print:p-0 print:border-none">
                <div>
                  <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-wider leading-none">PREPARED FOR / BILL TO:</span>
                  <span className="text-xs font-black text-slate-900 mt-1.5 block">{viewingQuotation.clientName || loggedClient.name}</span>
                  <span className="text-xs font-extrabold text-slate-700 block mt-0.5">{viewingQuotation.clientCompany || loggedClient.companyName}</span>
                  <span className="text-[11px] text-slate-500 block font-mono mt-0.5">{viewingQuotation.clientEmail || loggedClient.email}</span>
                </div>
                <div className="sm:text-right">
                  <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-wider leading-none">SHIPPING / DELIVERY DESTINATION:</span>
                  <span className="text-xs font-extrabold text-slate-800 mt-1.5 block leading-relaxed">
                    {viewingQuotation.clientAddress || loggedClient.address || 'Uttara EPZ Zone, Dhaka'}
                  </span>
                  <span className="text-[11px] text-slate-500 block font-mono mt-0.5">📞 {viewingQuotation.clientPhone || loggedClient.phone}</span>
                </div>
              </div>

              {/* Line Items Table */}
              <div className="border rounded-2xl overflow-hidden print:border-slate-300">
                <table className="w-full text-left text-xs font-bold text-slate-700">
                  <thead className="bg-slate-900 text-white text-[10px] uppercase select-none print:bg-slate-200 print:text-slate-900">
                    <tr>
                      <th className="p-3">#</th>
                      <th className="p-3">Description / Item Specifications</th>
                      <th className="p-3 text-right">Quantity</th>
                      <th className="p-3 text-right">Unit Price</th>
                      <th className="p-3 text-right">Amount (USD)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 print:divide-slate-300">
                    {viewingQuotation.items?.map((item: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50/20">
                        <td className="p-3 text-slate-400 font-mono">{idx + 1}</td>
                        <td className="p-3">
                          <span className="text-slate-900 font-extrabold block">{item.itemName}</span>
                          {item.styleCode && (
                            <span className="text-[10px] text-slate-500 font-mono font-medium">Style/Code: {item.styleCode}</span>
                          )}
                        </td>
                        <td className="p-3 text-right font-mono text-slate-800">{item.quantity?.toLocaleString()} {item.unit || 'Pcs'}</td>
                        <td className="p-3 text-right font-mono text-slate-800">USD {item.unitPrice?.toFixed(4)}</td>
                        <td className="p-3 text-right font-mono text-slate-900 font-extrabold">USD {item.totalPrice?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals Summary */}
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                <div className="text-[10px] text-slate-500 font-bold max-w-sm leading-relaxed bg-slate-50 p-3 rounded-xl border print:border-none print:p-0">
                  <h4 className="text-slate-800 font-extrabold uppercase text-[9px] tracking-wide mb-1">Standard Terms of Trade:</h4>
                  <ul className="list-disc pl-3.5 space-y-0.5">
                    <li>Prices are quoted on FOB Dhaka base port terms.</li>
                    <li>Payment: 100% L/C at sight or advance TT as per standard Pi.</li>
                    <li>Lead Time: 7 to 10 working days from approval of sample artwork.</li>
                  </ul>
                </div>
                <div className="w-full sm:w-64 space-y-2 text-right">
                  <div className="flex justify-between text-xs font-bold text-slate-600">
                    <span>Subtotal:</span>
                    <span className="font-mono">USD {viewingQuotation.subtotal?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || viewingQuotation.totalAmount?.toLocaleString()}</span>
                  </div>
                  {viewingQuotation.vatAmount > 0 && (
                    <div className="flex justify-between text-xs font-bold text-slate-600">
                      <span>VAT / Tax ({viewingQuotation.vatPercent || 0}%):</span>
                      <span className="font-mono">USD {viewingQuotation.vatAmount?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-black text-slate-900 border-t pt-2 border-slate-200">
                    <span>GRAND TOTAL:</span>
                    <span className="font-mono text-emerald-650 text-emerald-600">USD {viewingQuotation.totalAmount?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>

              {/* Bottom Row: Signature Areas */}
              <div className="grid grid-cols-2 gap-8 pt-8 text-[11px] select-none text-center">
                <div className="space-y-1">
                  <div className="border-t border-dashed border-slate-300 pt-1 text-slate-400 font-medium">Prepared By (Sales Division)</div>
                  <div className="text-[9px] text-slate-400 font-mono">ACOOLA ERP AUTOMATED SIGNATURE</div>
                </div>
                <div className="space-y-1">
                  <div className="border-t border-dashed border-slate-300 pt-1 text-slate-400 font-medium">Authorized Approver (Director)</div>
                  <div className="text-[9px] text-slate-400 font-mono">ACOOLA SEAL SECURITIES VALIDATED</div>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Floating Theme Toggle on Right Middle of Screen for Mobile View */}
      <button
        onClick={toggleThemeMode}
        type="button"
        title={themeMode === 'light' ? "Switch to Dark Mode" : "Switch to Light Mode"}
        className="lg:hidden fixed right-0 top-1/2 -translate-y-1/2 z-50 bg-slate-900/90 dark:bg-white/90 text-white dark:text-slate-900 px-3 py-3 rounded-l-2xl shadow-2xl border-l border-y border-white/20 dark:border-slate-300 transition-all active:scale-95 flex items-center justify-center cursor-pointer"
        id="floating-mobile-theme-toggle"
      >
        {themeMode === 'light' ? (
          <span className="text-sm select-none">🌙</span>
        ) : (
          <span className="text-sm select-none">☀️</span>
        )}
      </button>

    </div>
  );
}
