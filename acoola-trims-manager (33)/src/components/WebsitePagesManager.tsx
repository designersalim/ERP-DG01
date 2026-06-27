import React, { useState } from 'react';
import { sanitizeHtmlWithStyles } from '../lib/utils';
import { 
  Globe, Plus, Trash2, Save, FileText, CheckCircle2, AlertCircle, Code2, Eye,
  ArrowUp, ArrowDown, GripVertical
} from 'lucide-react';
import { DEFAULT_WEBSITE_PAGES, WebPageConfig } from '../utils/defaultPages';

interface WebsitePagesManagerProps {
  canEdit?: boolean;
  pages?: WebPageConfig[];
  onPagesChange?: (pages: WebPageConfig[]) => void;
}

export default function WebsitePagesManager({ 
  canEdit = true,
  pages: propsPages,
  onPagesChange
}: WebsitePagesManagerProps) {
  const [localPages, setLocalPages] = useState<WebPageConfig[]>(() => {
    try {
      const saved = localStorage.getItem('acoola_website_pages');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        }
      }
    } catch {}
    return DEFAULT_WEBSITE_PAGES.map((p, idx) => ({ ...p, order: idx }));
  });

  const pages = (propsPages || localPages).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const setPages = (val: WebPageConfig[] | ((prev: WebPageConfig[]) => WebPageConfig[])) => {
    const rawUpdated = typeof val === 'function' ? val(pages) : val;
    const updated = rawUpdated.map((p, idx) => ({ ...p, order: idx }));
    if (onPagesChange) {
      onPagesChange(updated);
    } else {
      setLocalPages(updated);
    }
    try {
      localStorage.setItem('acoola_website_pages', JSON.stringify(updated));
    } catch (e) {
      console.error("Error writing pages to localStorage:", e);
    }
  };

  const [activePageId, setActivePageId] = useState<string>('home');
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Drag and Drop helpers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const reordered = [...pages];
    const [draggedItem] = reordered.splice(draggedIndex, 1);
    reordered.splice(index, 0, draggedItem);
    
    setPages(reordered);
    saveToLocalStorage(reordered);
    setDraggedIndex(null);
  };

  // Up/Down button helpers
  const movePage = (index: number, direction: 'up' | 'down') => {
    const nextIndex = direction === 'up' ? index - 1 : index + 1;
    if (nextIndex < 0 || nextIndex >= pages.length) return;

    const reordered = [...pages];
    const [item] = reordered.splice(index, 1);
    reordered.splice(nextIndex, 0, item);

    setPages(reordered);
    saveToLocalStorage(reordered);
  };

  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  
  // States to add new dynamic page
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPageId, setNewPageId] = useState('');
  const [newPageTitle, setNewPageTitle] = useState('');

  const [headerSubtitle, setHeaderSubtitle] = useState(() => {
    return localStorage.getItem('acoola_header_subtitle') || 'GARMENTS TRIMS & ACCESSORIES';
  });

  // Auto-save pages array to global state / localStorage
  const saveToLocalStorage = (updatedPages: WebPageConfig[]) => {
    try {
      setPages(updatedPages);
      setSuccessMsg('Website pages & customized layouts updated successfully! Head back to the corporate website tab to view the live responsive updates.');
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch {
      setErrorMsg('Failed to save configurations.');
    }
  };

  const activePage = pages.find(p => p.id === activePageId) || pages[0] || DEFAULT_WEBSITE_PAGES[0];

  const handleUpdatePageField = (field: keyof WebPageConfig, value: any) => {
    const updated = pages.map(p => {
      if (p.id === activePageId) {
        return { ...p, [field]: value };
      }
      return p;
    });
    setPages(updated);
  };

  const handleCreatePage = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = newPageId.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
    if (!cleanId) {
      alert('Please enter a valid lowercase alphanumeric page ID.');
      return;
    }
    if (pages.some(p => p.id === cleanId)) {
      alert('A webpage with this route ID already exists.');
      return;
    }

    const newPage: WebPageConfig = {
      id: cleanId,
      title: newPageTitle.trim() || cleanId.toUpperCase(),
      heroTitle: `Welcome to our custom ${newPageTitle.trim()} dynamic page`,
      heroSubtitle: 'Tailor-made garments trim integrations designed for modern apparel ecosystems.',
      customHtmlCode: `<div class="py-12 text-center text-slate-700 bg-white border border-dashed rounded-3xl p-6 max-w-lg mx-auto space-y-4">
  <p class="text-3xl">✨</p>
  <h2 class="text-xl font-bold uppercase tracking-tight text-slate-900">${newPageTitle.trim()}</h2>
  <p class="text-xs leading-relaxed font-semibold">Your premium bespoke crafted website page is ready! You can swap page layouts or write dynamic Tailwind CSS designs directly inside the ERP design console.</p>
</div>`,
      customDesignEnabled: false,
      isCustomPage: true
    };

    const updated = [...pages, newPage];
    setPages(updated);
    saveToLocalStorage(updated);
    setActivePageId(cleanId);
    setShowAddModal(false);
    setNewPageId('');
    setNewPageTitle('');
  };

  const handleDeletePage = (idToDelete: string) => {
    if (['home', 'about', 'products', 'sustainability', 'careers', 'contact'].includes(idToDelete)) {
      alert('Cannot delete default system website pages. You can disable or customize them instead!');
      return;
    }
    if (!confirm('Are you absolutely sure you want to permanently delete this custom webpage route? All layouts will be lost.')) {
      return;
    }
    const updated = pages.filter(p => p.id !== idToDelete);
    setPages(updated);
    saveToLocalStorage(updated);
    setActivePageId('home');
  };

  const handleSaveChanges = () => {
    saveToLocalStorage(pages);
  };

  return (
    <div className="space-y-6" id="website-pages-module-root">
      
      {/* Upper Brand Info Dashboard header */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden shadow-md">
        <div className="space-y-2 z-10 text-left">
          <span className="text-[9.5px] uppercase font-black tracking-widest bg-emerald-600 text-white px-3 py-1 rounded-full">
            CMS Website Studio
          </span>
          <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight">
            Live Website Pages &amp; Layout Manager
          </h2>
          <p className="text-[11px] text-slate-355 max-w-2xl font-semibold leading-relaxed">
            কোনো কোডিং নলেজ ছাড়াই আপনার কর্পোরেট ওয়েবসাইটের পেজগুলোর কন্টেন্ট ডাইনামিকলি এডিট করুন। প্রতিটি পেজের জন্য আলাদা আলাদা ট্যাব রয়েছে, যেখানে আপনি হিরো টেক্সট, স্লোগান পরিবর্তন করতে পারেন এবং কাস্টম কোড (Tailwind CSS এবং HTML) দিয়ে পুরো পেজের ডিজাইন রিসেট করতে পারেন।
          </p>
        </div>
        {canEdit && (
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold uppercase px-4 py-2.5 rounded-xl text-[10.5px] tracking-wider transition-all flex items-center gap-1.5 shrink-0 z-10 cursor-pointer shadow-lg shadow-emerald-950/20"
          >
            <Plus className="w-4 h-4" />
            <span>Add Custom Page</span>
          </button>
        )}
        <div className="absolute right-0 top-0 bottom-0 w-1/4 bg-emerald-950/20 pointer-events-none rounded-r-2xl hidden md:block select-none"></div>
      </div>

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-950 p-4 rounded-xl text-xs font-bold flex items-center gap-2.5 shadow-xs shadow-emerald-50">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="bg-red-50 border border-red-200 text-red-950 p-4 rounded-xl text-xs font-bold flex items-center gap-2.5">
          <AlertCircle className="w-5 h-5 text-red-650 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 text-xs">
        
        {/* LEFT COLUMN: PAGE NAVIGATION TABS */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4.5 space-y-4 shadow-xs self-start" id="pages-navigation">
          <div className="border-b pb-2">
            <h3 className="font-extrabold text-[11px] text-slate-400 uppercase tracking-widest text-left">Active Web Pages List</h3>
          </div>
          <div className="flex flex-col gap-1.5">
            {pages.map((page, index) => {
              const isDefault = ['home', 'about', 'products', 'sustainability', 'careers', 'contact'].includes(page.id);
              return (
                <div 
                  key={page.id}
                  draggable={canEdit}
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={() => setDraggedIndex(null)}
                  className={`group w-full flex items-center justify-between rounded-xl p-2 transition-all text-left border ${
                    activePageId === page.id 
                      ? 'bg-emerald-50 border border-emerald-250 text-emerald-950 font-bold' 
                      : draggedIndex === index
                        ? 'bg-slate-100 border-slate-300 opacity-50'
                        : 'bg-white border border-slate-100 hover:bg-slate-50 text-slate-650 hover:text-slate-900 hover:border-slate-200'
                  } ${canEdit ? 'cursor-grab active:cursor-grabbing' : ''}`}
                >
                  <div className="flex items-center gap-1.5 flex-1 min-w-0">
                    {canEdit && (
                      <GripVertical className="w-3.5 h-3.5 text-slate-400 shrink-0 select-none cursor-grab" />
                    )}
                    <button
                      onClick={() => setActivePageId(page.id)}
                      className="flex-1 flex items-center gap-2 font-bold cursor-pointer text-xs uppercase min-w-0 text-left py-1"
                    >
                      <Globe className={`w-3.5 h-3.5 shrink-0 ${activePageId === page.id ? 'text-emerald-600' : 'text-slate-400'}`} />
                      <span className="truncate">{page.title}</span>
                      {page.customDesignEnabled && (
                        <span className="text-[7px] uppercase font-black tracking-widest bg-yellow-500 text-white px-1 py-0.2 rounded shrink-0">HTML Active</span>
                      )}
                    </button>
                  </div>
                  
                  {/* Sorting Controls & Deletion actions */}
                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    {canEdit && (
                      <>
                        <button
                          disabled={index === 0}
                          onClick={(e) => { e.stopPropagation(); movePage(index, 'up'); }}
                          title="Move Page Up"
                          className={`p-1 rounded hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-all cursor-pointer ${index === 0 ? 'opacity-20 cursor-not-allowed' : ''}`}
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          disabled={index === pages.length - 1}
                          onClick={(e) => { e.stopPropagation(); movePage(index, 'down'); }}
                          title="Move Page Down"
                          className={`p-1 rounded hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-all cursor-pointer ${index === pages.length - 1 ? 'opacity-20 cursor-not-allowed' : ''}`}
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}

                    {!isDefault && canEdit && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeletePage(page.id); }}
                        title="Delete Custom Page"
                        className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-all cursor-pointer shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Global Header Subtitle Setting */}
          <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl space-y-2.5 text-left">
            <span className="font-black text-slate-800 block uppercase tracking-wider text-[9.5px]">
              ⚙️ Global Header Settings
            </span>
            <div className="space-y-1">
              <label className="block text-[8.5px] font-bold text-slate-500 uppercase tracking-wide">Company Header Subtitle</label>
              <input
                type="text"
                value={headerSubtitle}
                onChange={(e) => {
                  setHeaderSubtitle(e.target.value);
                  localStorage.setItem('acoola_header_subtitle', e.target.value);
                  window.dispatchEvent(new Event('storage'));
                }}
                placeholder="GARMENTS TRIMS & ACCESSORIES"
                className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-[10.5px] font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-850"
              />
              <p className="text-[8.5px] text-slate-400 font-semibold leading-normal">
                Updates the tagline below the company name in the website header in real-time.
              </p>
            </div>
          </div>
          
          <div className="bg-slate-50 border border-slate-150 p-3.5 rounded-xl space-y-2 text-[10px] leading-relaxed text-slate-500 text-left font-medium">
            <span className="font-extrabold text-slate-700 block uppercase tracking-wider">💡 Tips and Guidance:</span>
            <span>এখানে তৈরি ও এডিট করা পেজগুলো কর্পোরেট ওয়েবসাইটের মেন্যুতে স্বয়ংক্রিয়ভাবে উপস্থিত হয়ে যাবে। নতুন পেজে কাস্টম ডিজাইন চালু করলে আপনি আপনার পছন্দমত পুরো পেজটি ও তার লে-আউট এইচটিএমএল (Tailwind সাপোর্টেড) দিয়ে সাজাতে পারবেন।</span>
          </div>
        </div>

        {/* RIGHT COLUMNS: PAGE EDITOR WORKSPACE */}
        <div className="lg:col-span-3 bg-white border border-slate-200 rounded-2xl p-6 space-y-6 shadow-xs text-left" id="pages-workspace">
          
          {/* Header section with page detail stats */}
          <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase text-emerald-600 flex items-center gap-1 font-mono">
                <FileText className="w-3.5 h-3.5" />
                <span>Web Router ID: /{activePage.id}</span>
              </span>
              <h3 className="text-base font-black text-slate-900 uppercase">
                Customize Settings: "{activePage.title}" Page
              </h3>
            </div>

            {/* Quick Toggle component for Custom Design override & Hiding Page */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2.5 bg-slate-50 border p-2 py-1.5 rounded-xl">
                <span className="font-extrabold text-[10.5px] text-slate-700">Custom HTML Overrides:</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={activePage.customDesignEnabled} 
                    onChange={(e) => handleUpdatePageField('customDesignEnabled', e.target.checked)}
                    className="sr-only peer" 
                  />
                  <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-650"></div>
                </label>
                <span className={`text-[9.5px] font-black uppercase tracking-wider ${activePage.customDesignEnabled ? 'text-emerald-700' : 'text-slate-400'}`}>
                  {activePage.customDesignEnabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>

              <div className="flex items-center gap-2.5 bg-slate-50 border p-2 py-1.5 rounded-xl">
                <span className="font-extrabold text-[10.5px] text-slate-700">Hide from Website Menu:</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={!!activePage.isHidden} 
                    onChange={(e) => handleUpdatePageField('isHidden', e.target.checked)}
                    className="sr-only peer" 
                  />
                  <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-red-650"></div>
                </label>
                <span className={`text-[9.5px] font-black uppercase tracking-wider ${activePage.isHidden ? 'text-red-600' : 'text-slate-400'}`}>
                  {activePage.isHidden ? 'Hidden' : 'Visible'}
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1">
              <label className="block font-bold text-slate-700">Web Page Visible Name (Title)</label>
              <input
                type="text"
                required
                value={activePage.title}
                onChange={(e) => handleUpdatePageField('title', e.target.value)}
                placeholder="Product & Solutions / Sustainability"
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 font-bold focus:ring-1 focus:ring-emerald-500 focus:outline-none text-xs text-slate-900"
              />
            </div>

            <div className="space-y-1">
              <label className="block font-bold text-slate-700">Hero Section Heading (Primary Title)</label>
              <input
                type="text"
                required
                value={activePage.heroTitle}
                onChange={(e) => handleUpdatePageField('heroTitle', e.target.value)}
                placeholder="Premium Quality Manufactured Trims"
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 font-bold focus:ring-1 focus:ring-emerald-500 focus:outline-none text-xs text-slate-900"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block font-bold text-slate-700">Hero Section Subtitle &amp; Slogan Description</label>
            <textarea
              required
              rows={2}
              value={activePage.heroSubtitle}
              onChange={(e) => handleUpdatePageField('heroSubtitle', e.target.value)}
              placeholder="Unwavering dedication to superior apparel accessories standards supporting brands across European territories..."
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 font-bold focus:ring-1 focus:ring-emerald-500 focus:outline-none text-xs text-slate-900 leading-relaxed"
            />
          </div>

          {/* CODE EDITOR BOX BLOCK FOR RAW CUSTOM CODE */}
          <div className="space-y-2 border-t pt-5">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-1">
              <div className="space-y-0.5 text-left">
                <span className="font-black text-slate-950 uppercase flex items-center gap-1.5 text-[10.5px]">
                  <Code2 className="w-4 h-4 text-emerald-600" />
                  <span>Custom Design Code &amp; Layout Area (HTML / Tailwind CSS)</span>
                </span>
                <p className="text-[10px] text-slate-400 font-medium">Write standards-compliant responsive template layout using HTML and tailwind utility classes.</p>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-[9.5px] uppercase font-bold text-emerald-600 bg-emerald-50/50 border border-emerald-200/50 px-2 py-0.5 rounded">Tailwind v4 Compliant</span>
              </div>
            </div>

            <div className="relative border border-slate-200 rounded-xl overflow-hidden shadow-xs bg-slate-900">
              {/* Code Editor Header mimic */}
              <div className="bg-slate-950 px-4 py-2 flex items-center justify-between border-b border-slate-800 text-[10px] select-none text-slate-400 font-mono">
                <div className="flex items-center gap-1.5 font-bold">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500/80"></span>
                  <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80"></span>
                  <span className="w-2.5 h-2.5 rounded-full bg-green-500/80"></span>
                  <span className="ml-2 text-slate-400 text-[9px] uppercase tracking-wide">layout_template_{activePage.id}.html</span>
                </div>
                <span>LINES: {activePage.customHtmlCode?.split('\n').length || 0}</span>
              </div>
              
              {/* Code input Area */}
              <textarea
                value={activePage.customHtmlCode || ''}
                onChange={(e) => handleUpdatePageField('customHtmlCode', e.target.value)}
                rows={16}
                className="w-full bg-slate-900 text-emerald-400 dark:bg-slate-900 dark:text-emerald-400 p-4 font-mono text-[10.5px] leading-relaxed select-text focus:outline-none resize-y border-none block focus:ring-0 font-medium"
                style={{ tabSize: 2 }}
                placeholder="<!-- Write custom HTML layout template -->"
              />
            </div>
            
            <p className="text-[10.5px] text-amber-700 bg-amber-50/40 border border-amber-200/40 p-3 rounded-xl font-medium leading-relaxed">
              <strong>⚠️ বিশেষ টীকা (Products &amp; Solutions):</strong> "Products &amp; Solutions" ক্যাটাগরি ও সাব-ক্যাটাগরি গ্রুপ অনুযায়ী সম্পূর্ণ লেআউটটি উপরে ইন্টারেক্টিভ কাস্টম এইচটিএমএল কোড আকারে দেওয়া আছে। আপনি যদি এখানে ডিজাইন পছন্দমত এডিট করেন বা কোনো বাটন/মেনু পরিবর্তন করেন, তবে তা সরাসরি ওয়েবসাইটে আপডেট হবে। ৪টি মূল ক্যাটাগরিতে ক্লিক করলে যে পপআপ বা সাব-ক্যাডাস্ট্রো তৈরি হবে তার সম্পূর্ণ কোর্ডও এখানে এডিটেবল দেওয়া আছে।
            </p>
          </div>

          {/* Action buttons footer */}
          <div className="border-t pt-5 flex items-center justify-between">
            <div className="text-[10px] text-slate-400 leading-snug font-medium max-w-sm">
              * পরিবর্তনগুলো সেভ করতে অবশ্যই নিচের সবুজ বাটনে ক্লিক করুন। সেভ করার সাথে সাথে ব্রাউজারের ওভাররাইড ক্যাশে আপডেট হয়ে যাবে।
            </div>
            {canEdit && (
              <button
                onClick={handleSaveChanges}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold uppercase text-xs tracking-wider px-5 py-3 rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer duration-200"
              >
                <Save className="w-4.5 h-4.5 text-emerald-300" />
                <span>Save custom page design</span>
              </button>
            )}
          </div>

          {/* LIVE INSTANT VISUAL CONTAINER PREVIEW */}
          <div className="border-t pt-6 space-y-3">
            <h4 className="font-black text-slate-800 uppercase flex items-center gap-1.5 text-[10.5px]">
              <Eye className="w-4 h-4 text-indigo-600" />
              <span>Instant Visual Preview (As rendering inside live viewport)</span>
            </h4>
            <p className="text-[9.5px] text-slate-400 font-semibold">This is the rendered visual markup of your customized code block combined with responsive styling guidelines.</p>
            
            <div className="border border-slate-200 rounded-2xl p-0 bg-white relative min-h-[150px] overflow-x-hidden max-w-full">
              <div 
                dangerouslySetInnerHTML={{ 
                  __html: sanitizeHtmlWithStyles(activePage.customHtmlCode || '')
                }}
              />
            </div>
          </div>

        </div>

      </div>

      {/* DYNAMICS ROUTER ADDING POPUP DIALOG */}
      {showAddModal && (
        <div className="fixed inset-0 z-[999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border max-w-md w-full shadow-2xl p-6 space-y-5 animate-scale-up text-left">
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase text-emerald-600 tracking-wider font-mono">CMS Web Router</span>
              <h3 className="text-sm font-black text-slate-900 uppercase">Create New Web Router Page</h3>
            </div>
            
            <form onSubmit={handleCreatePage} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-700">Router unique route path alias (Lower-case alphanumeric without spaces)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-slate-400 font-bold text-xs">/</span>
                  <input
                    type="text"
                    required
                    value={newPageId}
                    onChange={(e) => setNewPageId(e.target.value)}
                    placeholder="solutions-exclusive"
                    className="w-full bg-white border border-slate-300 rounded-xl pl-6 pr-3 py-2 text-xs font-bold focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-700">Web Page User facing Label Title</label>
                <input
                  type="text"
                  required
                  value={newPageTitle}
                  onChange={(e) => setNewPageTitle(e.target.value)}
                  placeholder="Solutions Exclusive"
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold uppercase py-2.5 rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold uppercase py-2.5 rounded-xl transition-all cursor-pointer shadow-md"
                >
                  Create Page
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
