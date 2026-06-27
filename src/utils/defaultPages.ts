export interface WebPageConfig {
  id: string;
  title: string;
  heroTitle: string;
  heroSubtitle: string;
  customHtmlCode: string;
  customDesignEnabled: boolean;
  isCustomPage?: boolean;
  isHidden?: boolean;
}

export const DEFAULT_WEBSITE_PAGES: WebPageConfig[] = [
  {
    id: 'home',
    title: 'Home',
    heroTitle: 'Acoola Trims Certified Garments Trims Manufacturer',
    heroSubtitle: 'Innovative Apparel Accessories & Trims supporting sustainable fashion brands worldwide with quick lead times and premium workmanship.',
    customDesignEnabled: false,
    customHtmlCode: `<!-- HOME CUSTOM LAYOUT CODE -->
<div class="space-y-12 py-6">
  <!-- Interactive Intro Hero -->
  <div class="relative bg-gradient-to-tr from-[#022c22] to-[#064e3b] text-white rounded-3xl p-8 sm:p-12 shadow-xl overflow-hidden">
    <div class="relative z-10 max-w-3xl space-y-4 text-left">
      <span class="text-[10px] uppercase font-black tracking-widest bg-emerald-500 text-white px-3 py-1 rounded-full">Sustainably Crafted</span>
      <h1 class="text-3xl sm:text-5xl font-black tracking-tight leading-tight uppercase">Green Accessories Shaping Premium Global Brands</h1>
      <p class="text-xs sm:text-base text-slate-350 font-semibold leading-relaxed"> বাংলাদেশে নির্মিত বিশ্বমানের ও আন্তর্জাতিক মানসম্পন্ন ট্রিমস এবং গার্মেন্টস এক্সেসরিজ ম্যানুফ্যাকচারার ও বিশ্বস্ত সরবরাহকারী কারখানার স্বয়ংক্রিয় সংযোগ ও সমন্বয় সমাধান।</p>
      <div class="pt-4 flex flex-wrap gap-3">
        <a href="#quote" class="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all">Submit Price Inquiry</a>
        <a href="#quality" class="bg-white/10 hover:bg-white/20 text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider backdrop-blur-xs transition-all">Download Certificate Specs</a>
      </div>
    </div>
    <div class="absolute right-0 bottom-0 top-0 w-1/3 opacity-15 hidden md:block select-none">
      <div class="w-full h-full border-[18px] border-emerald-400 rotate-12 translate-x-24 translate-y-12 rounded-full"></div>
    </div>
  </div>

  <!-- Highlights Bento Cards -->
  <div class="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
    <div class="bg-white border rounded-2xl p-6 space-y-3 shadow-xs">
      <div class="text-2xl">🌱</div>
      <h3 class="text-xs font-black text-slate-900 uppercase tracking-widest">Oeko-Tex Standard 100</h3>
      <p class="text-[11px] text-slate-550 leading-relaxed font-semibold">100% toxic-free labels, threads & drawcords constructed using organic and recyled raw materials matching European export directives.</p>
    </div>
    
    <div class="bg-white border rounded-2xl p-6 space-y-3 shadow-xs">
      <div class="text-2xl">⚡</div>
      <h3 class="text-xs font-black text-slate-900 uppercase tracking-widest">Rapid Prototyping</h3>
      <p class="text-[11px] text-slate-550 leading-relaxed font-semibold">Get bespoke sampling printed with detailed digital sizing layout and delivered for production approval in as fast as 48 hours.</p>
    </div>

    <div class="bg-white border rounded-2xl p-6 space-y-3 shadow-xs">
      <div class="text-2xl">🎯</div>
      <h3 class="text-xs font-black text-slate-900 uppercase tracking-widest">Global Export Grade</h3>
      <p class="text-[11px] text-slate-550 leading-relaxed font-semibold">Certified premium high contrast, wash-fast and tension-tested clothing accessories trusted by international retail buyers.</p>
    </div>
  </div>
</div>`
  },
  {
    id: 'about',
    title: 'About Us',
    heroTitle: 'Pioneering Apparel Trims Technology In Bangladesh & Beyond',
    heroSubtitle: 'Unwavering dedication to material standards, zero waste production pipelines, and flawless lead-time matching.',
    customDesignEnabled: false,
    customHtmlCode: `<!-- ABOUT US CUSTOM LAYOUT CODE -->
<div class="max-w-4xl mx-auto px-4 py-12 space-y-12 animate-fade-in">
  <div class="text-center space-y-3">
    <h1 class="text-3xl font-black text-slate-900 uppercase">Executive Corporate Statement</h1>
    <p class="text-xs uppercase font-extrabold text-emerald-600 tracking-wider">The Foundation and Strength of Acoola Trims Corporation</p>
  </div>

  <div class="bg-white border rounded-2xl p-6 sm:p-8 shadow-sm space-y-6 text-left">
    <div class="flex flex-col md:flex-row gap-6 items-start">
      <div class="w-24 h-24 bg-gradient-to-br from-emerald-600 to-teal-800 text-white rounded-2xl flex flex-col justify-center items-center shadow-md shrink-0">
        <span class="text-xl font-black leading-none">MD</span>
        <span class="text-[10px] font-bold mt-1 uppercase">Akbar</span>
      </div>
      <div class="space-y-3 text-xs leading-relaxed text-slate-700">
        <h3 class="text-sm font-black text-slate-900 uppercase">Message from the Managing Director (MD's Message)</h3>
        <p class="font-bold text-slate-700">
          "The backbone of the apparel industry is high-quality accessories and trims. Since 1998, we have been manufacturing and supplying world-class garment accessories with high efficiency across the nation. Our patrons' complete trust has been the only key to our long journey."
        </p>
        <p class="font-mono text-[10px] font-extrabold text-slate-400">MD Akbar Hossain — CEO & Managing Director, Acoola Trims Corp.</p>
      </div>
    </div>

    <div class="border-t pt-6 space-y-4">
      <h3 class="text-sm font-black text-slate-900 uppercase">Our Factory & Production Unit</h3>
      <p class="text-xs text-slate-600 leading-relaxed">
        Our main Factory Unit is located in Motijheel, Arambag, equipped with advanced facilities. It operates high-tech swing label weavers, ribbon seal printers, and offset printing machines seamlessly. Our corporate headquarters is situated at Tongi I/A, Gazipur, Dhaka, which handles general customer communications, marketing, and registration operations.
      </p>
    </div>
  </div>
</div>`
  },
  {
    id: 'products',
    title: 'Products & Solutions',
    heroTitle: 'Complete Customized Garments Accessories Catalog',
    heroSubtitle: 'Direct export-ready accessories spanning Labels, Tags, Polybags, Drawcords, Zippers, and Eco Packagings.',
    customDesignEnabled: false,
    customHtmlCode: `<!-- PRODUCTS & SOLUTIONS CUSTOM LAYOUT CODE -->
<div class="space-y-10 py-2">
  <div class="text-center max-w-xl mx-auto space-y-3">
    <span class="text-[10px] font-black uppercase text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full font-mono">Dynamic Web Component Mode</span>
    <h2 class="text-xl font-black text-slate-950 uppercase tracking-tight">Main Trims Category Groups</h2>
    <p class="text-[11px] text-slate-550 font-semibold leading-relaxed">নিচে দেওয়া ৪টি মূল ক্যাটাগরি কার্ডের মাধ্যমে আমাদের মেম্বার গার্মেন্টস বা বায়াররা সরাসরি প্রয়োজনীয় ডাইনামিক সাব-ক্যাটাগরি এবং লাইভ কাস্টম সামগ্রী এক্সেস করতে পারবেন।</p>
  </div>
  
  <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 text-left">
    <div class="bg-white border text-slate-800 border-slate-200 p-6 rounded-2xl flex flex-col justify-between hover:scale-[1.01] hover:border-emerald-500 hover:shadow-lg transition-all duration-200">
      <div class="space-y-4">
        <div class="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-lg">🗂️</div>
        <h3 class="text-xs font-black uppercase tracking-tight text-slate-900">Labels & Tags</h3>
        <p class="text-[11px] text-slate-550 leading-normal font-semibold">Premium woven collars labels, micro-weave wash instruction satin care ribbons, tags & barcoded price boards.</p>
      </div>
      <button class="text-[10px] font-extrabold text-emerald-600 underline hover:text-emerald-700 mt-6 text-left block" onclick="window.viewCategorySubcategories('Labels & Tags')">
        View All 9 Sub-Categories →
      </button>
    </div>

    <div class="bg-white border text-slate-800 border-slate-200 p-6 rounded-2xl flex flex-col justify-between hover:scale-[1.01] hover:border-amber-500 hover:shadow-lg transition-all duration-200">
      <div class="space-y-4">
        <div class="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-lg">📦</div>
        <h3 class="text-xs font-black uppercase tracking-tight text-slate-900">Packaging & Finishing</h3>
        <p class="text-[11px] text-slate-550 leading-normal font-semibold">Biodegradable polybags, heavy density shipping cartons, folding backboards, acid-free wrappers and hangers.</p>
      </div>
      <button class="text-[10px] font-extrabold text-amber-600 underline hover:text-amber-700 mt-6 text-left block" onclick="window.viewCategorySubcategories('Packaging & Finishing')">
        View All 10 Sub-Categories →
      </button>
    </div>

    <div class="bg-white border text-slate-800 border-slate-200 p-6 rounded-2xl flex flex-col justify-between hover:scale-[1.01] hover:border-indigo-500 hover:shadow-lg transition-all duration-200">
      <div class="space-y-4">
        <div class="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-lg">🧵</div>
        <h3 class="text-xs font-black uppercase tracking-tight text-slate-900">Sewing & Construction Accessories</h3>
        <p class="text-[11px] text-slate-550 leading-normal font-semibold">Spun polyester threads, twill tapes, braided elastic webbings, drawcords, zipper gliders & interlining cuffs.</p>
      </div>
      <button class="text-[10px] font-extrabold text-indigo-600 underline hover:text-indigo-700 mt-6 text-left block" onclick="window.viewCategorySubcategories('Sewing & Construction Accessories')">
        View All 9 Sub-Categories →
      </button>
    </div>

    <div class="bg-white border text-slate-800 border-slate-200 p-6 rounded-2xl flex flex-col justify-between hover:scale-[1.01] hover:border-pink-500 hover:shadow-lg transition-all duration-200">
      <div class="space-y-4">
        <div class="w-10 h-10 bg-pink-50 rounded-xl flex items-center justify-center text-lg">🔩</div>
        <h3 class="text-xs font-black uppercase tracking-tight text-slate-900">Metal & Plastic Accessories</h3>
        <p class="text-[11px] text-slate-550 leading-normal font-semibold">Brass metal buckles, signature badge plates, snapping button systems, composite buttons & eyelets.</p>
      </div>
      <button class="text-[10px] font-extrabold text-pink-600 underline hover:text-pink-700 mt-6 text-left block" onclick="window.viewCategorySubcategories('Metal & Plastic Accessories')">
        View All 11 Sub-Categories →
      </button>
    </div>
  </div>
</div>`
  },
  {
    id: 'sustainability',
    title: 'Sustainability',
    heroTitle: 'Redefining Green Apparel Trims and Zero Harm Ecology',
    heroSubtitle: 'Active waste recovery, solar energy sourcing, and recycled polyester blends powering carbon-neutral apparel supply grids.',
    customDesignEnabled: false,
    customHtmlCode: `<!-- SUSTAINABILITY CUSTOM LAYOUT CODE -->
<div class="max-w-4xl mx-auto px-4 py-12 space-y-12 animate-fade-in text-left">
  <div class="text-center space-y-3">
    <h1 class="text-3xl font-black text-slate-900 uppercase">Green Commitments & Eco-Labels</h1>
    <p class="text-xs uppercase font-extrabold text-emerald-600 tracking-wider">Climate-friendly certified garment accessories production</p>
  </div>

  <div class="bg-white border rounded-2xl p-6 sm:p-8 shadow-sm space-y-8">
    <p class="text-xs text-slate-700 leading-relaxed text-center max-w-2xl mx-auto font-semibold">
      Acoola Trims is strongly dedicated to maintaining a sustainable ecological balance. We utilize strictly certified organic yarns and food-grade raw materials acknowledged by global apparel groups.
    </p>

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4">
      <div class="bg-emerald-50/50 p-4 rounded-xl border border-emerald-300/10 space-y-1">
        <div class="text-lg text-emerald-600 font-bold">✓</div>
        <h3 class="text-xs font-black text-slate-900 uppercase mt-2">OEKO-TEX® Standard 100 Class I</h3>
        <p class="text-[11px] text-slate-600 leading-relaxed font-bold font-medium">Our woven brand labels are certified skin-friendly, chemical-free, and hypoallergenic, making them 100% safe for infants.</p>
      </div>
      <div class="bg-emerald-50/50 p-4 rounded-xl border border-emerald-300/10 space-y-1">
        <div class="text-lg text-emerald-600 font-bold">✓</div>
        <h3 class="text-xs font-black text-slate-900 uppercase mt-2">GRS (Global Recycled Standard)</h3>
        <p class="text-[11px] text-slate-600 leading-relaxed font-bold font-medium">We manufacture yarn utilizing GRS-certified recycled polyester, contributing actively to worldwide ocean plastic reductions.</p>
      </div>
      <div class="bg-emerald-50/50 p-4 rounded-xl border border-emerald-300/10 space-y-1">
        <div class="text-lg text-emerald-600 font-bold">✓</div>
        <h3 class="text-xs font-black text-slate-900 uppercase mt-2">FSC Certified Craft Boards</h3>
        <p class="text-[11px] text-slate-600 leading-relaxed font-bold font-medium">Our paper materials are obtained purely from sustainably sourced FSC-certified forests, reducing unnecessary deforestation.</p>
      </div>
      <div class="bg-emerald-50/50 p-4 rounded-xl border border-emerald-300/10 space-y-1">
        <div class="text-lg text-emerald-600 font-bold">✓</div>
        <h3 class="text-xs font-black text-slate-900 uppercase mt-2">Eco-Pigment Flexo Graphic Printing</h3>
        <p class="text-[11px] text-slate-600 leading-relaxed font-bold font-medium">High-performance flexo graphic printing utilizing water-based organic dyes, eliminating environmental degradation risks.</p>
      </div>
    </div>
  </div>
</div>`
  },
  {
    id: 'careers',
    title: 'Careers',
    heroTitle: 'Join the Vanguard of Apparel Trims Technologists',
    heroSubtitle: 'Thrive alongside precision chemists, high density programmers, and world class merchandiser squads at our central research unit.',
    customDesignEnabled: false,
    customHtmlCode: `<!-- CAREERS CUSTOM LAYOUT CODE -->
<div class="max-w-4xl mx-auto px-4 py-12 space-y-12 animate-fade-in text-left">
  <div class="text-center space-y-3">
    <h1 class="text-3xl font-black text-slate-900 uppercase">We Are Hiring (Career Opportunities)</h1>
    <p class="text-xs text-slate-500 font-bold">Become a valued member of our dynamic expert clothing accessories team!</p>
  </div>

  <div class="bg-white border rounded-2xl p-6 sm:p-8 shadow-sm space-y-4">
    <h3 class="text-sm font-black text-slate-900 uppercase">A Workplace Focused on Skill Upgrades</h3>
    <p class="text-xs text-slate-600 leading-relaxed font-semibold">
      আমরা বিশ্বাস করি টিম মেম্বারদের সৃজনশীল শক্তি ও প্রযুক্তিগত দক্ষতাই আমাদের মূল সম্পদ। তাই আমাদের আধুনিক ওয়ার্কস্পেসে নিয়মিত টেকনিক্যাল ট্রেনিং এবং আকর্ষণীয় আর্থিক সুবিধা প্রদান করা হয়।
    </p>
  </div>
</div>`
  },
  {
    id: 'contact',
    title: 'Contact',
    heroTitle: 'Get Instant Technical Quotation Support',
    heroSubtitle: 'Chat with our active sample merchandising support specialists or book physical audits of our central green production units.',
    customDesignEnabled: false,
    customHtmlCode: `<!-- CONTACT CUSTOM LAYOUT CODE -->
<div class="max-w-4xl mx-auto px-4 py-12 space-y-12 animate-fade-in text-left">
  <div class="text-center space-y-3">
    <h1 class="text-3xl font-black text-slate-900 uppercase">Get Instant Technical Quotation Support</h1>
    <p class="text-xs text-slate-500 font-bold">Chat with our active sample merchandising support specialists or book physical audits of our central green production units.</p>
  </div>

  <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
    <div class="bg-white border rounded-2xl p-5 space-y-2 shadow-xs">
      <span class="text-[9px] uppercase font-bold text-emerald-600 block">General Inquiries</span>
      <p class="text-xs font-black text-slate-900">Email: sales@acoolatrims.com</p>
      <p class="text-[11px] text-slate-550 font-semibold">Phone: +880-1711-002233</p>
    </div>
    <div class="bg-white border rounded-2xl p-5 space-y-2 shadow-xs">
      <span class="text-[9px] uppercase font-bold text-emerald-600 block">Tech Setup Support</span>
      <p class="text-xs font-black text-slate-900">Address: Plot-28, Sector-03, Tongi I/A, Gazipur, Dhaka</p>
      <p class="text-[11px] text-slate-550 font-semibold">Hours: Saturday - Thursday, 9:00 AM - 6:00 PM</p>
    </div>
  </div>
</div>`
  }
];
