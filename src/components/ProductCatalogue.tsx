import React, { useState, useMemo } from 'react';
import { ProductItemCatalog, DeliveryChallan, ManualInvoiceBill, DocumentItem, SizeEntry, ProductColorImage, PRODUCT_CATEGORIES_MAP } from '../types';
import { COMPANY_PROFILE } from '../data';
import { 
  Plus, 
  Trash, 
  Edit2, 
  Search, 
  Image as ImageIcon, 
  Printer, 
  Check, 
  Minus, 
  Truck, 
  FileText, 
  X, 
  ShoppingBag, 
  Tag, 
  Grid,
  Sparkles,
  CheckCircle,
  FolderPlus
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

interface ProductCatalogueProps {
  products: ProductItemCatalog[];
  onAddProduct: (prod: ProductItemCatalog) => void;
  onUpdateProduct: (prod: ProductItemCatalog) => void;
  onDeleteProduct: (id: string) => void;
  onGenerateChallanFromProducts: (challan: DeliveryChallan) => void;
  onGenerateBillFromProducts: (bill: ManualInvoiceBill) => void;
  canEdit?: boolean;
}

export default function ProductCatalogue({
  products,
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
  onGenerateChallanFromProducts,
  onGenerateBillFromProducts,
  canEdit = true
}: ProductCatalogueProps) {
  // Navigation & filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  // Form states (Add/Edit)
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductItemCatalog | null>(null);

  // Advanced Category setup
  const [isNewCategory, setIsNewCategory] = useState(false);
  const [customCategoryInput, setCustomCategoryInput] = useState('');

  const [colorImages, setColorImages] = useState<ProductColorImage[]>([]);
  const [cardImageOverrides, setCardImageOverrides] = useState<Record<string, string>>({});

  // Local React state for adding color choose to prevent document.getElementById failures
  const [newColorChoiceName, setNewColorChoiceName] = useState('');
  const [newColorChoiceFile, setNewColorChoiceFile] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    category: 'Labels & Tags',
    subcategory: 'Woven Label',
    unit: 'Pcs',
    moq: 1000,
    moqUnit: 'Pcs',
    image: '',
    description: ''
  });

  // Predefined default categories
  const PRESET_CATEGORIES = useMemo(() => Object.keys(PRODUCT_CATEGORIES_MAP), []);

  // Unique Categories computed dynamically combining presets & any other entered categories safely
  const categoriesList = useMemo(() => {
    const list = new Set([...PRESET_CATEGORIES, ...products.map(p => p.category)]);
    return Array.from(list).filter(Boolean);
  }, [products, PRESET_CATEGORIES]);

  // Checklist mode for generating documents
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedQuantities, setSelectedQuantities] = useState<Record<string, number>>({});

  // Generation prompt overlays
  const [showChallanPrompt, setShowChallanPrompt] = useState(false);
  const [showBillPrompt, setShowBillPrompt] = useState(false);

  // Challan generation input state
  const [challanMeta, setChallanMeta] = useState({
    factoryName: '',
    buyerName: '',
    ref: '',
    deliveryAddress: '',
    challanNo: ''
  });

  // Bill generation input state
  const [billMeta, setBillMeta] = useState({
    clientName: '',
    clientAddress: '',
    invoiceNo: '',
    paymentStatus: 'Unpaid' as 'Paid' | 'Unpaid' | 'Partial',
    notes: ''
  });

  // Image upload handling
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const compressed = await compressImage(reader.result as string);
        setFormData(prev => ({ ...prev, image: compressed }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Pre-choose simple placeholder images
  const setPlaceholderImage = (color: string) => {
    // Generate a simple colored SVG base64 placeholder
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200">
      <rect width="100%" height="100%" fill="${color}"/>
      <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="24" font-weight="bold" fill="#ffffff">
        PRODUCT
      </text>
    </svg>`;
    const base64 = `data:image/svg+xml;base64,${btoa(svg)}`;
    setFormData(prev => ({ ...prev, image: base64 }));
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      category: 'Labels & Tags',
      subcategory: 'Woven Label',
      unit: 'Pcs',
      moq: 1000,
      moqUnit: 'Pcs',
      image: '',
      description: ''
    });
    setColorImages([]);
    setEditingProduct(null);
    setIsNewCategory(false);
    setCustomCategoryInput('');
    setNewColorChoiceName('');
    setNewColorChoiceFile('');
  };

  // Open Add Modal
  const openAddModal = () => {
    resetForm();
    setColorImages([]);
    setShowFormModal(true);
  };

  // Open Edit Modal
  const openEditModal = (prod: ProductItemCatalog) => {
    setEditingProduct(prod);
    const firstSub = PRODUCT_CATEGORIES_MAP[prod.category]?.[0] || '';
    setFormData({
      name: prod.name,
      code: prod.code,
      category: prod.category,
      subcategory: prod.subcategory || firstSub,
      unit: prod.unit,
      moq: prod.moq || 1000,
      moqUnit: prod.moqUnit || prod.unit || 'Pcs',
      image: prod.image,
      description: prod.description || ''
    });
    setColorImages(prod.colorImages || []);
    
    // Check if the product's category exists in standard/predefined presets
    const isPreset = PRESET_CATEGORIES.includes(prod.category);
    setIsNewCategory(!isPreset && prod.category !== '');
    if (!isPreset) {
      setCustomCategoryInput(prod.category);
    }
    setShowFormModal(true);
  };

  // Helper validation: Check if current SKU code is redundant/taken
  const isSkuDuplicate = useMemo(() => {
    const checkCode = formData.code.trim().toUpperCase();
    if (!checkCode) return false;
    return products.some(p => p.code.toUpperCase() === checkCode && p.id !== editingProduct?.id);
  }, [formData.code, products, editingProduct]);

  // Automatic Unique SKU Generator matching user spec
  const handleAutoGenerateSKU = () => {
    if (!formData.name) {
      alert("Please fill in the Product Name/Title first to generate a contextual SKU code.");
      return;
    }

    const currentCatGroup = isNewCategory ? (customCategoryInput.trim() || 'GEN') : formData.category;
    // Extract acronym from category name
    const catAcronym = currentCatGroup.trim().replace(/[^a-zA-Z0-9]/g, '').slice(0, 3).toUpperCase() || 'CAT';
    
    // Extract acronym from product name words or character sequence
    const nameWords = formData.name.trim().split(/\s+/);
    let nameAcronym = '';
    if (nameWords.length >= 2) {
      nameAcronym = nameWords.map(w => w[0]).join('').replace(/[^a-zA-Z0-9]/g, '').slice(0, 3).toUpperCase();
    } else {
      nameAcronym = formData.name.trim().replace(/[^a-zA-Z0-9]/g, '').slice(0, 3).toUpperCase();
    }
    if (!nameAcronym) nameAcronym = 'PRD';

    const basePrefix = `${catAcronym}-${nameAcronym}`;

    // Incremental validation of SKU sequence
    let index = 101;
    let computedSku = `${basePrefix}-${index}`;
    const takenSKUs = new Set(products.map(p => p.code.toUpperCase().trim()));

    while (takenSKUs.has(computedSku)) {
      index++;
      computedSku = `${basePrefix}-${index}`;
    }

    setFormData(prev => ({ ...prev, code: computedSku }));
  };

  // Submit Product Add/Update
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      alert("Please fill in the Product Name.");
      return;
    }

    const finalCategory = isNewCategory 
      ? (customCategoryInput.trim() || 'General') 
      : formData.category;

    const finalCode = formData.code.trim().toUpperCase();
    if (!finalCode) {
      alert("Product SKU Code is required. Please write or use 'Auto-Generate' feature.");
      return;
    }

    if (isSkuDuplicate) {
      alert("Error: This SKU Code is already active on another product catalog entry! Ensure every SKU code is uniquely allocated.");
      return;
    }

    const imageToSave = formData.image || `data:image/svg+xml;base64,${btoa(`<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="100%" height="100%" fill="#10b981"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="20" font-weight="bold" fill="#ffffff">${finalCode}</text></svg>`)}`;

    if (editingProduct) {
      onUpdateProduct({
        ...editingProduct,
        name: formData.name,
        code: finalCode,
        category: finalCategory,
        subcategory: formData.subcategory,
        unit: formData.unit,
        moq: Number(formData.moq),
        moqUnit: formData.moqUnit,
        image: imageToSave,
        colorImages: colorImages,
        description: formData.description
      });
    } else {
      onAddProduct({
        id: `prod-${Date.now()}`,
        name: formData.name,
        code: finalCode,
        category: finalCategory,
        subcategory: formData.subcategory,
        unit: formData.unit,
        moq: Number(formData.moq),
        moqUnit: formData.moqUnit,
        image: imageToSave,
        colorImages: colorImages,
        description: formData.description,
        createdAt: new Date().toISOString()
      });
    }

    setShowFormModal(false);
    resetForm();
  };

  // Filtering Products
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (p.description || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchCategory = categoryFilter ? p.category === categoryFilter : true;
      return matchSearch && matchCategory;
    });
  }, [products, searchTerm, categoryFilter]);

  // Toggle selection state
  const toggleSelection = (prodId: string) => {
    setSelectedQuantities(prev => {
      const copy = { ...prev };
      if (copy[prodId] !== undefined) {
        delete copy[prodId];
      } else {
        copy[prodId] = 1;
      }
      return copy;
    });
  };

  // Adjust quantity
  const updateQuantity = (prodId: string, val: number) => {
    setSelectedQuantities(prev => ({
      ...prev,
      [prodId]: Math.max(1, val)
    }));
  };

  // Trigger Challan Creation Modal
  const handleOpenChallanPrompt = () => {
    const selectedIds = Object.keys(selectedQuantities);
    if (selectedIds.length === 0) {
      alert("Please select at least one product first.");
      return;
    }
    setChallanMeta({
      factoryName: '',
      buyerName: '',
      ref: 'DIRECT-CATALOG-REF',
      deliveryAddress: '',
      challanNo: `CH-CAT-${Date.now().toString().slice(-6)}`
    });
    setShowChallanPrompt(true);
  };

  // Confirm Challan Creation
  const handleConfirmChallan = () => {
    if (!challanMeta.factoryName || !challanMeta.buyerName) {
      alert("Please fill in Factory Name and Buyer Name.");
      return;
    }

    // Convert selection quantities to DocumentItem representation
    const docItems: DocumentItem[] = Object.keys(selectedQuantities).map(prodId => {
      const prod = products.find(p => p.id === prodId)!;
      return {
        id: `item-${Date.now()}-${Math.random().toString(36).substring(4, 8)}`,
        bookingId: `direct-booking-${Date.now()}`,
        poNumber: 'N/A',
        styleNumber: prod.code,
        itemName: prod.name,
        unit: prod.unit as any || 'Pcs',
        unitPrice: prod.unitPrice,
        totalQuantity: selectedQuantities[prodId],
        sizeWise: false,
        sizes: [] as SizeEntry[],
        details: prod.description || `Catalog Product Item code: ${prod.code}`
      };
    });

    const finalChallan: DeliveryChallan = {
      id: `ch-${Date.now()}`,
      challanNo: challanMeta.challanNo,
      factoryName: challanMeta.factoryName,
      buyerName: challanMeta.buyerName,
      ref: challanMeta.ref,
      date: new Date().toLocaleDateString('en-CA'),
      deliveryAddress: challanMeta.deliveryAddress || challanMeta.factoryName,
      items: docItems,
      hsCode: "6217.10.00",
      status: 'Pending',
      createdAt: new Date().toISOString()
    };

    onGenerateChallanFromProducts(finalChallan);
    setShowChallanPrompt(false);
    setSelectedQuantities({});
    setSelectionMode(false);
    alert("Delivery Challan successfully created and added to directory!");
  };

  // Trigger Bill Creation Modal
  const handleOpenBillPrompt = () => {
    const selectedIds = Object.keys(selectedQuantities);
    if (selectedIds.length === 0) {
      alert("Please select at least one product first.");
      return;
    }
    setBillMeta({
      clientName: '',
      clientAddress: '',
      invoiceNo: `BILL-${Date.now().toString().slice(-6)}`,
      paymentStatus: 'Unpaid',
      notes: 'Generated from systems product catalogue list'
    });
    setShowBillPrompt(true);
  };

  // Confirm Bill Creation
  const handleConfirmBill = () => {
    if (!billMeta.clientName) {
      alert("Please fill in client/customer name.");
      return;
    }

    const firstSelectedProdId = Object.keys(selectedQuantities)[0];
    const firstSelectedProd = products.find(p => p.id === firstSelectedProdId);
    const dominantCurrency = firstSelectedProd?.currency || 'USD';

    const items = Object.keys(selectedQuantities).map(prodId => {
      const prod = products.find(p => p.id === prodId)!;
      const qty = selectedQuantities[prodId];
      return {
        id: `billitem-${Date.now()}-${Math.random().toString(36).slice(-6)}`,
        name: prod.name,
        code: prod.code,
        quantity: qty,
        unit: prod.unit,
        unitPrice: prod.unitPrice,
        amount: qty * prod.unitPrice,
        currency: prod.currency || 'USD'
      };
    });

    const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);

    const manualBill: ManualInvoiceBill = {
      id: `mb-${Date.now()}`,
      invoiceNo: billMeta.invoiceNo,
      clientName: billMeta.clientName,
      clientAddress: billMeta.clientAddress,
      date: new Date().toLocaleDateString('en-CA'),
      items,
      totalAmount,
      paymentStatus: billMeta.paymentStatus,
      currency: dominantCurrency,
      notes: billMeta.notes,
      createdAt: new Date().toISOString()
    };

    onGenerateBillFromProducts(manualBill);
    setShowBillPrompt(false);
    setSelectedQuantities({});
    setSelectionMode(false);
    alert("New direct Invoice/Bill generated and successfully added to register!");
  };

  // Print single item specs
  const printProductSpecs = (prod: ProductItemCatalog) => {
    const printIframe = document.createElement('iframe');
    printIframe.style.position = 'fixed';
    printIframe.style.right = '0';
    printIframe.style.bottom = '0';
    printIframe.style.width = '0';
    printIframe.style.height = '0';
    printIframe.style.border = '0';
    document.body.appendChild(printIframe);

    const printDoc = printIframe.contentWindow ? printIframe.contentWindow.document : printIframe.contentDocument;
    if (!printDoc) {
      alert("Could not access printing frame.");
      return;
    }

    printDoc.write(`
      <html>
        <head>
          <title>Product Specifications Sheet - ${prod.code}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=Inter:wght@400;600;800&family=JetBrains+Mono&display=swap');
            body { font-family: 'Inter', sans-serif; margin: 0; padding: 40px; background-color: #ffffff; color: #1e293b; }
            .spec-card { border: 2px solid #e2e8f0; border-radius: 16px; padding: 30px; max-width: 600px; margin: 0 auto; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.05); }
            .header { display: flex; align-items: center; justify-between: space-between; border-bottom: 2px solid #f1f5f9; padding-bottom: 20px; margin-bottom: 20px; }
            .logo-placeholder { font-family: 'Space Grotesk', sans-serif; font-weight: 800; font-size: 18px; color: #007d46; }
            .prod-title { font-size: 24px; font-weight: 800; color: #0f172a; margin: 0 0 4px 0; }
            .prod-code { font-family: 'JetBrains Mono', monospace; font-size: 12px; color: #64748b; background: #f8fafc; padding: 4px 8px; border-radius: 4px; display: inline-block; }
            .image-box { text-align: center; margin: 25px 0; background: #f8fafc; border-radius: 12px; padding: 15px; border: 1px solid #f1f5f9; }
            .image-box img { max-width: 240px; max-height: 240px; border-radius: 8px; object-fit: contain; }
            .specs-grid { display: grid; grid-template-cols: 1fr 1fr; gap: 15px; margin-bottom: 25px; }
            .spec-item { border-bottom: 1px solid #f1f5f9; padding-bottom: 8px; }
            .spec-label { font-size: 10px; text-transform: uppercase; font-weight: 700; color: #94a3b8; margin-bottom: 2px; }
            .spec-value { font-size: 13px; font-weight: 600; color: #334155; }
            .desc-box { background: #f8fafc; padding: 15px; border-radius: 8px; border-left: 4px solid #007d46; font-size: 12px; line-height: 1.6; color: #475569; }
            .footer-notes { text-align: center; font-size: 9px; color: #94a3b8; margin-top: 30px; font-family: 'JetBrains Mono', monospace; }
            @media print { .no-print { display: none; } }
          </style>
        </head>
        <body>
          <div class="spec-card">
            <div class="header">
              <div>
                <h1 class="prod-title">${prod.name}</h1>
                <span class="prod-code">SKU CODE: ${prod.code}</span>
              </div>
              <div class="logo-placeholder">ACOOLA TRIMS</div>
            </div>
            <div class="image-box">
              <img src="${prod.image}" alt="Product Preview" />
            </div>
            <div class="specs-grid">
              <div class="spec-item">
                <div class="spec-label">Category Group</div>
                <div class="spec-value">${prod.category}</div>
              </div>
              <div class="spec-item">
                <div class="spec-label">Billing unit</div>
                <div class="spec-value">${prod.unit}</div>
              </div>
              <div class="spec-item">
                <div class="spec-label">Minimum Order (MOQ)</div>
                <div class="spec-value">${prod.moq || 1000} ${prod.moqUnit || prod.unit || 'Pcs'}</div>
              </div>
              <div class="spec-item font-mono">
                <div class="spec-label">Generated Date</div>
                <div class="spec-value">${new Date(prod.createdAt).toLocaleDateString()}</div>
              </div>
            </div>
            ${prod.description ? `
            <div class="desc-box">
              <strong>Product Description / Quality Specs:</strong><br />
              ${prod.description}
            </div>` : ''}
            <div class="footer-notes">
              This document is generated dynamically from ACOOLA TRIMS Corp ERP System.
            </div>
          </div>
          <script>
            window.onload = function() {
              window.focus();
              setTimeout(function() {
                window.print();
              }, 500);
            }
          </script>
        </body>
      </html>
    `);
    printDoc.close();

    // Safe container cleanup
    setTimeout(() => {
      try {
        if (printIframe && printIframe.parentNode) {
          printIframe.parentNode.removeChild(printIframe);
        }
      } catch (err) {
        console.error("Iframe cleanup error:", err);
      }
    }, 15000);
  };

  // Print all elements
  const printEntireCatalogue = () => {
    const printIframe = document.createElement('iframe');
    printIframe.style.position = 'fixed';
    printIframe.style.right = '0';
    printIframe.style.bottom = '0';
    printIframe.style.width = '0';
    printIframe.style.height = '0';
    printIframe.style.border = '0';
    document.body.appendChild(printIframe);

    const printDoc = printIframe.contentWindow ? printIframe.contentWindow.document : printIframe.contentDocument;
    if (!printDoc) {
      alert("Could not access printing frame.");
      return;
    }

    printDoc.write(`
      <html>
        <head>
          <title>${COMPANY_PROFILE.name} - Master Product Catalogue</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;850&family=JetBrains+Mono&display=swap');
            body { font-family: 'Inter', sans-serif; margin: 30px; color: #1e293b; background-color: #ffffff; }
            .header-container { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 24px; }
            .company { font-size: 20px; font-weight: 850; letter-spacing: -0.5px; color: #000000; margin: 0; line-height: 1.1; }
            .tagline { font-size: 8px; font-weight: 900; color: #475569; letter-spacing: 1.5px; text-transform: uppercase; margin: 4px 0 6px 0; line-height: 1; }
            .office-info { font-size: 9px; color: #334155; line-height: 1.4; margin: 0; }
            .right-block { text-align: right; font-size: 9px; color: #334155; line-height: 1.35; }
            .title { font-size: 13.5px; font-weight: 900; color: #007d46; text-transform: uppercase; margin: 0 0 4px 0; letter-spacing: 0.5px; }
            
            /* 2 column layout with 3 or 4 rows per grid */
            .catalog-grid { display: grid; grid-template-cols: repeat(2, 1fr); gap: 16px; width: 100%; }
            @media print {
              .catalog-grid {
                display: grid !important;
                grid-template-cols: 1fr 1fr !important;
                gap: 16px !important;
              }
              .catalog-item {
                page-break-inside: avoid !important;
                break-inside: avoid !important;
              }
            }
            .catalog-item { border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; display: flex; flex-direction: column; overflow: hidden; page-break-inside: avoid; background-color: #ffffff; min-height: 200px; justify-content: space-between; }
            .img-container { height: 110px; display: flex; align-items: center; justify-content: center; background: #f8fafc; border-radius: 4px; margin-bottom: 10px; border: 1px solid #f1f5f9; }
            .img-container img { max-width: 105px; max-height: 105px; object-fit: contain; }
            .p-name { font-size: 12px; font-weight: 850; color: #0f172a; margin-bottom: 4px; line-height: 1.25; }
            .p-sku { font-family: 'JetBrains Mono', monospace; font-size: 9px; color: #475569; background: #f1f5f9; padding: 2px 6px; border-radius: 3px; display: inline-block; margin-bottom: 6px; font-weight: bold; border: 1px solid #e2e8f0; }
            .p-grid { display: grid; grid-template-cols: 1fr 1fr; gap: 6px; font-size: 10.5px; margin-top: auto; border-top: 1px solid #f1f5f9; padding-top: 6px; }
            .p-label { color: #94a3b8; font-size: 8.5px; font-weight: bold; text-transform: uppercase; margin-bottom: 1px; }
            .p-val { color: #1e293b; font-weight: bold; }
            
            .color-box { margin-top: 8px; border-top: 1px dashed #cbd5e1; padding-top: 6px; }
            .color-title { font-size: 7.5px; font-weight: 900; color: #64748b; text-transform: uppercase; margin-bottom: 4px; letter-spacing: 0.5px; }
            .color-thumbnails { display: flex; gap: 6px; flex-wrap: wrap; }
            .color-item { display: flex; flex-direction: column; align-items: center; border: 1px solid #e2e8f0; padding: 1.5px; border-radius: 4px; background: #fff; text-align: center; width: 34px; box-sizing: border-box; }
            .color-img-frame { width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; background: #f8fafc; border-radius: 2px; }
            .color-img-frame img { max-width: 100%; max-height: 100%; object-fit: contain; }
            .color-label { font-size: 6px; font-weight: 800; color: #1e293b; margin-top: 1.5px; width: 100%; text-overflow: ellipsis; white-space: nowrap; overflow: hidden; display: block; }

            .p-footer { text-align: center; margin-top: 36px; font-size: 9px; color: #94a3b8; border-top: 1px solid #cbd5e1; padding-top: 10px; font-family: 'JetBrains Mono', monospace; }
          </style>
        </head>
        <body>
          <div class="header-container">
            <div style="text-align: left; max-width: 60%;">
              <h1 class="company">${COMPANY_PROFILE.name}</h1>
              <p class="tagline">${COMPANY_PROFILE.tagline.toUpperCase()}</p>
              <div class="office-info">
                <p style="margin: 0;"><span style="font-weight: bold;">Office:</span> ${COMPANY_PROFILE.addresses.office}</p>
                <p style="margin: 2px 0 0 0;"><span style="font-weight: bold;">Factory:</span> ${COMPANY_PROFILE.addresses.factory}</p>
              </div>
            </div>
            <div class="right-block">
              <h2 class="title">Product Catalogue</h2>
              <p style="margin: 0;"><span style="font-weight: bold;">BIN :</span> ${COMPANY_PROFILE.bin}</p>
              <p style="margin: 2px 0 0 0;"><span style="font-weight: bold;">Mob :</span> ${COMPANY_PROFILE.phones.join(', ')}</p>
              <p style="margin: 2px 0 0 0;"><span style="font-weight: bold;">Email :</span> ${COMPANY_PROFILE.emails[0]}</p>
              <p style="margin: 4px 0 0 0; font-family: 'JetBrains Mono', monospace; font-size: 8px; color: #64748b; font-weight: bold;">Total Items: ${filteredProducts.length}</p>
            </div>
          </div>

          <div class="catalog-grid">
            ${filteredProducts.map(p => `
              <div class="catalog-item">
                <div>
                  <div class="img-container">
                    <img src="${p.image}" alt="" />
                  </div>
                  <div class="p-name">${p.name}</div>
                  <div><span class="p-sku">${p.code}</span></div>
                  
                  ${p.colorImages && p.colorImages.length > 0 ? `
                    <div class="color-box">
                      <div class="color-title">Color-Wise Media:</div>
                      <div class="color-thumbnails">
                        ${p.colorImages.slice(0, 8).map(ci => `
                          <div class="color-item">
                            <div class="color-img-frame">
                              <img src="${ci.image}" alt="" />
                            </div>
                            <span class="color-label" title="${ci.color}">${ci.color}</span>
                          </div>
                        `).join('')}
                      </div>
                    </div>
                  ` : ''}
                </div>

                <div class="p-grid">
                  <div>
                    <div class="p-label">Category Group</div>
                    <div class="p-val">${p.category}</div>
                  </div>
                  <div>
                    <div class="p-label">Unit Price (${p.currency || 'USD'})</div>
                    <div class="p-val">${p.currency === 'BDT' ? '৳' : '$'}${p.unitPrice.toFixed(4)} <span style="font-size: 8px; font-weight: normal; color: #64748b;">/${p.unit}</span></div>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>

          <div class="p-footer">
            Generated automatically by ${COMPANY_PROFILE.name} ERP System. Certification ISO Bangladesh.
          </div>
          <script>
            window.onload = function() {
              window.focus();
              setTimeout(function() {
                window.print();
              }, 500);
            }
          </script>
        </body>
      </html>
    `);
    printDoc.close();

    // Safe container cleanup
    setTimeout(() => {
      try {
        if (printIframe && printIframe.parentNode) {
          printIframe.parentNode.removeChild(printIframe);
        }
      } catch (err) {
        console.error("Iframe cleanup error:", err);
      }
    }, 15000);
  };

  const getSelectionCount = Object.keys(selectedQuantities).length;

  return (
    <div className="space-y-6 font-sans">
      
      {/* Header action block */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-550 border-b border-slate-100 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-emerald-600" />
            <h2 className="text-lg font-black uppercase text-slate-800 tracking-tight">Product Catalogue (প্রোডাক্ট ক্যাটালগ)</h2>
          </div>
          <p className="text-[11px] text-slate-550 mt-1">Manage system product list, print spec cards, and select products to generate instantly Delivery Challan & Direct Invoice Bills manually.</p>
        </div>
        
        <div className="flex items-center gap-2.5 shrink-0 self-start md:self-auto">
          {/* Document selection mode toggle */}
          <button
            type="button"
            onClick={() => {
              setSelectionMode(!selectionMode);
              setSelectedQuantities({});
            }}
            className={`px-3 py-1.5 rounded text-xs font-bold uppercase transition-colors flex items-center gap-1 cursor-pointer select-none ${
              selectionMode 
                ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-sm'
                : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-750 border border-indigo-200'
            }`}
          >
            <CheckCircle className="w-3.5 h-3.5" />
            <span>{selectionMode ? "Cancel Select Mode" : "Select Items Mode"}</span>
          </button>

          <button
            type="button"
            onClick={printEntireCatalogue}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-705 border border-slate-300 rounded text-xs font-bold uppercase tracking-wider flex items-center gap-1 transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-slate-600" />
            <span>Print Entire Catalog</span>
          </button>

          {canEdit && (
            <button
              type="button"
              onClick={openAddModal}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-750 text-white rounded text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add New Product</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search products by title, SKU, category, or notes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-slate-300 rounded-lg pl-8 pr-3 py-1.5 text-xs focus:ring-1 focus:ring-emerald-500 font-medium"
          />
        </div>

        <div className="flex gap-2">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-bold focus:ring-1 focus:ring-emerald-500 cursor-pointer"
          >
            <option value="">All Categories (সকল ক্যাটাগরি)</option>
            <option value="Labels">Labels (লেবেল)</option>
            <option value="Satin Ribbon">Satin Ribbon (রিবন)</option>
            <option value="Sticker">Sticker (স্টিকার)</option>
            <option value="Cartoon">Cartons (কার্টুন)</option>
            <option value="Elastic">Elastic (ইলাস্টিক)</option>
            <option value="Sewing Thread">Sewing Thread (সুতা)</option>
            {categoriesList.filter(c => !["Labels", "Satin Ribbon", "Sticker", "Cartoon", "Elastic", "Sewing Thread"].includes(c)).map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          {categoryFilter || searchTerm ? (
            <button
              onClick={() => {
                setSearchTerm('');
                setCategoryFilter('');
              }}
              className="px-2.5 py-1 text-xs text-rose-600 font-bold uppercase tracking-wider hover:bg-rose-50 rounded"
            >
              Reset Filters
            </button>
          ) : null}
        </div>
      </div>

      {/* Selection Mode status bar */}
      {selectionMode && (
        <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md animate-none">
          <div className="flex items-center gap-2.5 text-center sm:text-left">
            <div className="p-1.5 bg-amber-100 rounded-lg text-amber-700">
              <Sparkles className="w-4 h-4 animate-bounce" />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-wide leading-none">Standard Selection Mode Activated</p>
              <p className="text-[10px] text-amber-800 font-semibold mt-1">Select each catalogue item to check &amp; adjust quantity manually to formulate instant documents.</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-amber-200 text-amber-950 font-black text-xs rounded-full">
              {getSelectionCount} Products Checked
            </span>

            <button
              onClick={handleOpenChallanPrompt}
              disabled={getSelectionCount === 0}
              className="px-3 py-1.5 bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-emerald-750 text-white rounded text-xs font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-all"
            >
              <Truck className="w-3.5 h-3.5" />
              <span>Make Challan</span>
            </button>

            <button
              onClick={handleOpenBillPrompt}
              disabled={getSelectionCount === 0}
              className="px-3 py-1.5 bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-indigo-750 text-white rounded text-xs font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-all"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Generate Direct Bill</span>
            </button>
          </div>
        </div>
      )}

      {/* Product List Grid */}
      {filteredProducts.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-slate-300 rounded-2xl bg-white">
          <ImageIcon className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-bold text-slate-700">No products found holding criteria.</p>
          <p className="text-[10.5px] text-slate-400 font-medium mt-0.5">Create your brand first direct product to initialize.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4" id="catalogue-items-grid">
          {filteredProducts.map(prod => {
            const isChecked = selectedQuantities[prod.id] !== undefined;
            const currentQty = selectedQuantities[prod.id] || 1;

            return (
              <div 
                key={prod.id} 
                className={`bg-white border rounded-xl overflow-hidden shadow-sm flex flex-col relative transition-all ${
                  isChecked 
                    ? 'border-emerald-500 ring-2 ring-emerald-500/20 shadow-emerald-50 shadow-md' 
                    : 'border-slate-200 hover:border-slate-350 hover:shadow-md'
                }`}
              >
                {/* Image block */}
                <div 
                  onClick={() => selectionMode && toggleSelection(prod.id)}
                  className={`h-40 bg-slate-50 border-b border-slate-100 flex items-center justify-center relative p-2 ${
                    selectionMode ? 'cursor-pointer' : ''
                  }`}
                >
                  <img 
                    src={cardImageOverrides[prod.id] || prod.image} 
                    alt={prod.name} 
                    className="max-h-full max-w-full object-contain mix-blend-multiply rounded-md" 
                    referrerPolicy="no-referrer"
                  />

                  {/* Color Swatch Overlays */}
                  {prod.colorImages && prod.colorImages.length > 0 && (
                    <div className="absolute bottom-2 left-2 right-2 flex gap-1.5 justify-center bg-white/95 backdrop-blur-xs py-1 px-1.5 rounded-full border border-slate-200 shadow-xs z-10">
                      {/* Main original image choice swatch */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCardImageOverrides(prev => {
                            const copy = { ...prev };
                            delete copy[prod.id];
                            return copy;
                          });
                        }}
                        className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center text-[5.5px] font-black transition-all hover:scale-110 shrink-0 ${
                          !(cardImageOverrides[prod.id]) ? 'border-emerald-600 ring-1 ring-emerald-500 bg-emerald-100' : 'border-slate-300'
                        }`}
                        title="Default Product Photo"
                      >
                        ●
                      </button>
                      {prod.colorImages.map((ci, itemIdx) => (
                        <button
                          key={itemIdx}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setCardImageOverrides(prev => ({ ...prev, [prod.id]: ci.image }));
                          }}
                          className={`w-3.5 h-3.5 rounded-full border transition-all hover:scale-110 shrink-0 relative ${
                            cardImageOverrides[prod.id] === ci.image ? 'border-indigo-650 ring-2 ring-indigo-300' : 'border-slate-300'
                          }`}
                          style={{ backgroundColor: ci.color.toLowerCase() }}
                          title={ci.color}
                        >
                          <span className="sr-only">{ci.color}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Badges / Selection overlays */}
                  <div className="absolute top-2 left-2">
                    <span className="text-[9px] font-black uppercase bg-slate-900/85 backdrop-blur-xs text-white px-2 py-0.5 rounded-full tracking-wider font-mono">
                      {prod.code}
                    </span>
                  </div>

                  <div className="absolute top-2 right-2 flex gap-1">
                    <span className="text-[9px] font-bold uppercase bg-emerald-50 text-emerald-805 px-1.5 py-0.5 rounded border border-emerald-250 max-w-[150px] truncate" title={`${prod.category}${prod.subcategory ? ` > ${prod.subcategory}` : ''}`}>
                      {prod.category}{prod.subcategory ? ` › ${prod.subcategory}` : ''}
                    </span>
                  </div>

                  {selectionMode && (
                    <div className="absolute inset-0 bg-emerald-950/5 flex items-center justify-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                        isChecked 
                          ? 'bg-emerald-600 text-white scale-110 shadow-lg' 
                          : 'bg-white border border-slate-300 shadow-sm text-slate-400 hover:text-slate-600 hover:scale-105'
                      }`}>
                        <Check className="w-5 h-5 font-black" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Info summary */}
                <div className="p-3.5 flex-1 flex flex-col justify-between">
                  <div>
                    <h4 className="text-[12.5px] font-extrabold text-slate-900 tracking-tight leading-tight block mb-1">
                      {prod.name}
                    </h4>
                    {prod.description && (
                      <p className="text-[10px] text-slate-500 line-clamp-2 leading-relaxed mb-3">
                        {prod.description}
                      </p>
                    )}
                  </div>

                  <div className="mt-auto space-y-2.5">
                    {/* Specifications detail block */}
                    <div className="flex items-center justify-between text-[11px] border-t border-slate-100 pt-2.5 font-mono">
                      <div>
                        <span className="text-[8.5px] text-slate-400 uppercase font-black block leading-none mb-0.5">Minimum Order (MOQ)</span>
                        <span className="text-slate-900 font-extrabold text-xs">{prod.moq || 1000} <span className="text-[9px] text-slate-500 font-normal">{prod.moqUnit || prod.unit || 'Pcs'}</span></span>
                      </div>
                      
                      {!selectionMode && (
                        <div className="flex gap-1.5">
                          <button
                            type="button"
                            onClick={() => printProductSpecs(prod)}
                            className="p-1 px-1.5 hover:bg-slate-100 border border-slate-200 rounded text-slate-600 cursor-pointer flex items-center gap-0.5"
                            title="Print Single product spec sheet"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                          
                          {canEdit && (
                            <>
                              <button
                                type="button"
                                onClick={() => openEditModal(prod)}
                                className="p-1 px-1.5 hover:bg-blue-50 border border-blue-200 rounded text-blue-600 cursor-pointer flex items-center gap-0.5"
                                title="Edit specs"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              
                              <button
                                type="button"
                                onClick={() => {
                                  if (confirm(`Are you sure you want to delete Product "${prod.name}"?`)) {
                                    onDeleteProduct(prod.id);
                                  }
                                }}
                                className="p-1 px-1.5 hover:bg-rose-50 border border-rose-200 rounded text-rose-600 cursor-pointer flex items-center gap-0.5"
                                title="Delete product"
                              >
                                <Trash className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Quantity Selector Overlay if selected */}
                    {selectionMode && isChecked && (
                      <div className="bg-slate-50 p-2 rounded-lg border border-slate-200 flex items-center justify-between gap-1.5">
                        <span className="text-[10px] uppercase font-bold text-slate-500">Qty ({prod.unit}):</span>
                        <div className="flex items-center bg-white border border-slate-350 rounded-md overflow-hidden">
                          <button
                            type="button"
                            onClick={() => updateQuantity(prod.id, currentQty - 1)}
                            className="p-1 px-2.5 hover:bg-slate-100 text-slate-650 font-bold transition-colors"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          
                          <input
                            type="number"
                            value={currentQty}
                            min="1"
                            onChange={(e) => updateQuantity(prod.id, parseInt(e.target.value) || 1)}
                            className="w-12 text-center text-[11px] font-black font-mono border-0 p-0 focus:ring-0"
                          />

                          <button
                            type="button"
                            onClick={() => updateQuantity(prod.id, currentQty + 1)}
                            className="p-1 px-2.5 hover:bg-slate-100 text-[#007d46] font-bold transition-colors"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ================= ADD / EDIT PRODUCT MODAL ================= */}
      {showFormModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 print:hidden animate-none">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-3xl w-full shadow-2xl p-5 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => { setShowFormModal(false); resetForm(); }}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-sm font-black uppercase text-slate-800 tracking-tight flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
              <FolderPlus className="w-4 h-4 text-emerald-600" />
              <span>{editingProduct ? "Edit Product Details" : "Add New Corporate Product"}</span>
            </h3>

            <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block font-bold text-slate-705">Product Title / Name (প্রোডাক্ট নাম) *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full bg-slate-55 border border-slate-300 rounded-lg p-2 font-bold focus:ring-1 focus:ring-emerald-500"
                    placeholder="e.g. Satin Care Label"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="block font-bold text-slate-705">Product SKU / Code *</label>
                    <button
                      type="button"
                      onClick={handleAutoGenerateSKU}
                      className="text-[10px] font-black text-emerald-700 hover:text-emerald-900 flex items-center gap-0.5"
                      title="Auto-generate a completely unique SKU code"
                    >
                      <Sparkles className="w-3 h-3 text-emerald-600" />
                      <span>Auto-Generate</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                    className={`w-full border rounded-lg p-2 font-mono font-bold focus:ring-1 ${
                      isSkuDuplicate 
                        ? 'border-rose-455 bg-rose-50/50 text-rose-800' 
                        : 'border-slate-300 bg-slate-55'
                    }`}
                    placeholder="e.g. LAB-SAT-101"
                  />
                  {isSkuDuplicate && (
                    <p className="text-[10px] font-bold text-rose-600 mt-0.5">
                      ⚠️ SKU already taken! Every product must hold a unique SKU code.
                    </p>
                  )}
                </div>
              </div>

              {/* Dynamic Category Group Selection */}
              <div className="bg-slate-50 border border-slate-205 p-3 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="block font-black text-slate-750">Category Group (ক্যাটাগরি গ্রুপ) *</label>
                  <label className="flex items-center gap-1.5 cursor-pointer text-slate-600 hover:text-slate-800">
                    <input
                      type="checkbox"
                      checked={isNewCategory}
                      onChange={(e) => setIsNewCategory(e.target.checked)}
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                    <span className="font-bold text-[10.5px]">Add Brand New Group (+ নতুন গ্রুপ লিখুন)</span>
                  </label>
                </div>

                {isNewCategory ? (
                  <div className="space-y-1">
                    <label className="block font-bold text-slate-500 text-[10px] uppercase">New Category Group Name *</label>
                    <input
                      type="text"
                      required
                      value={customCategoryInput}
                      onChange={(e) => setCustomCategoryInput(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg p-2 font-bold text-slate-800 focus:ring-1 focus:ring-emerald-500"
                      placeholder="e.g. Zipper, Button, Polybag..."
                    />
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="block font-bold text-slate-500 text-[10px] uppercase">Select Registered Category</label>
                      <select
                        value={formData.category}
                        onChange={(e) => {
                          const cat = e.target.value;
                          const subs = PRODUCT_CATEGORIES_MAP[cat] || [];
                          setFormData(prev => ({ ...prev, category: cat, subcategory: subs[0] || '' }));
                        }}
                        className="w-full bg-white border border-slate-300 rounded-lg p-2 font-bold cursor-pointer text-slate-800 focus:ring-1 focus:ring-emerald-500"
                      >
                        {categoriesList.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="block font-bold text-slate-500 text-[10px] uppercase">Select Subcategory *</label>
                      <select
                        value={formData.subcategory}
                        onChange={(e) => setFormData(prev => ({ ...prev, subcategory: e.target.value }))}
                        className="w-full bg-white border border-slate-300 rounded-lg p-2 font-bold cursor-pointer text-slate-800 focus:ring-1 focus:ring-emerald-500"
                      >
                        {(PRODUCT_CATEGORIES_MAP[formData.category] || []).map(sub => (
                          <option key={sub} value={sub}>{sub}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="block font-bold text-slate-705">Default Billing Unit</label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData(prev => ({ ...prev, unit: e.target.value }))}
                    className="w-full bg-slate-55 border border-slate-300 rounded-lg p-2 font-bold cursor-pointer text-xs"
                  >
                    <option value="Pcs">Pcs (পিস)</option>
                    <option value="Dzn">Dzn (ডজন)</option>
                    <option value="Set">Set (সেট)</option>
                    <option value="Yds">Yds (গজ)</option>
                    <option value="Roll">Roll (রোল)</option>
                    <option value="Kg">Kg (কেজি)</option>
                    <option value="Mtr">Mtr (মিটার)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block font-bold text-slate-705">Minimum Order (MOQ) *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.moq}
                    onChange={(e) => setFormData(prev => ({ ...prev, moq: Number(e.target.value) }))}
                    className="w-full bg-slate-55 border border-slate-300 rounded-lg p-2 font-bold font-mono text-xs"
                    placeholder="e.g. 1000"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block font-bold text-slate-705">MOQ Unit *</label>
                  <select
                    value={formData.moqUnit}
                    onChange={(e) => setFormData(prev => ({ ...prev, moqUnit: e.target.value }))}
                    className="w-full bg-slate-55 border border-slate-300 rounded-lg p-2 font-bold cursor-pointer text-xs"
                  >
                    <option value="Pcs">Pcs (পিস)</option>
                    <option value="Dzn">Dzn (ডজন)</option>
                    <option value="Set">Set (সেট)</option>
                    <option value="Yds">Yds (গজ)</option>
                    <option value="Roll">Roll (রোল)</option>
                    <option value="Kg">Kg (কেজি)</option>
                    <option value="Mtr">Mtr (মিটার)</option>
                  </select>
                </div>
              </div>

              {/* Image Input Segment */}
              <div className="space-y-2 border border-slate-200 p-3 rounded-xl bg-slate-50">
                <label className="block font-black text-slate-700">Product Photographic Assets</label>
                <div className="flex gap-4 items-center">
                  <div className="w-20 h-20 bg-white border border-slate-300 rounded-lg flex items-center justify-center p-1 overflow-hidden shrink-0">
                    {formData.image ? (
                      <img src={formData.image} alt="Preview" className="max-h-full max-w-full object-contain" />
                    ) : (
                      <ImageIcon className="w-8 h-8 text-slate-300" />
                    )}
                  </div>
                  
                  <div className="space-y-2 flex-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="block w-full text-xs text-slate-550 file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 file:cursor-pointer"
                    />
                    
                    <div className="flex gap-2">
                      <span className="text-[10px] text-slate-400 font-medium">Or pick instant generic colors:</span>
                      <button type="button" onClick={() => setPlaceholderImage('#047857')} className="w-4 h-4 rounded-full bg-emerald-700 border" title="Green" />
                      <button type="button" onClick={() => setPlaceholderImage('#1d4ed8')} className="w-4 h-4 rounded-full bg-blue-700 border" title="Indigo" />
                      <button type="button" onClick={() => setPlaceholderImage('#dc2626')} className="w-4 h-4 rounded-full bg-red-600 border" title="Crimson" />
                      <button type="button" onClick={() => setPlaceholderImage('#4b5563')} className="w-4 h-4 rounded-full bg-gray-600 border" title="Slate" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Color Wise Images Section */}
              <div className="space-y-3 border border-slate-200 p-3 rounded-xl bg-emerald-50/45 text-xs">
                <div className="flex justify-between items-center">
                  <label className="block font-black text-slate-800">Color Wise Product Images (রঙ অনুযায়ী প্রোডাক্ট ছবি)</label>
                  <span className="text-[10px] text-emerald-800 font-bold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">Optional Section</span>
                </div>
                
                {/* List of currently added color images */}
                {colorImages.length > 0 && (
                  <div className="grid grid-cols-2 gap-2">
                    {colorImages.map((ci, index) => (
                      <div key={index} className="flex items-center gap-2 bg-white border border-slate-200 p-1.5 rounded-lg shadow-2xs">
                        <div className="w-8 h-8 rounded border overflow-hidden flex items-center justify-center shrink-0">
                          <img src={ci.image} className="max-h-full max-w-full object-contain" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-extrabold text-[10.5px] truncate text-slate-705 flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full inline-block border border-slate-400 shrink-0" style={{ backgroundColor: ci.color.toLowerCase() }}></span>
                            {ci.color}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setColorImages(prev => prev.filter((_, idx) => idx !== index))}
                          className="text-rose-500 hover:text-rose-700 font-bold text-xs px-1.5 py-0.5 rounded hover:bg-rose-50"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Addition Form for next color image */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-2 bg-white p-2.5 rounded-xl border border-dashed border-slate-300">
                  <div className="space-y-1 flex-1">
                    <label className="text-[9px] font-extrabold text-slate-500 uppercase">1. Color Choice Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Red, Blue, Black..."
                      value={newColorChoiceName}
                      onChange={(e) => setNewColorChoiceName(e.target.value)}
                      className="w-full bg-slate-55 border border-slate-300 rounded p-1 font-bold text-xs placeholder:font-normal focus:ring-1 focus:ring-emerald-500 text-slate-800"
                    />
                  </div>
                  <div className="space-y-1 flex-1">
                    <label className="text-[9px] font-extrabold text-slate-500 uppercase">2. Color Image Asset</label>
                    <input
                      type="file"
                      id="new-color-choice-file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = async () => {
                            const compressed = await compressImage(reader.result as string);
                            setNewColorChoiceFile(compressed);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="block w-full text-[10px] text-slate-500 file:mr-2 file:py-0.5 file:px-2 file:rounded file:border-0 file:text-[10px] file:font-semibold file:bg-slate-100 file:text-slate-700 file:cursor-pointer"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (!newColorChoiceName.trim()) {
                        alert("Please enter a color name (e.g., Red) first.");
                        return;
                      }
                      if (!newColorChoiceFile) {
                        alert("Please select an image file for this color.");
                        return;
                      }
                      setColorImages(prev => [...prev, { color: newColorChoiceName.trim(), image: newColorChoiceFile }]);
                      setNewColorChoiceName('');
                      setNewColorChoiceFile('');
                      const fileInputEl = document.getElementById('new-color-choice-file') as HTMLInputElement;
                      if (fileInputEl) fileInputEl.value = '';
                    }}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs shrink-0 self-center cursor-pointer transition-colors"
                  >
                    + Add Color Photo
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block font-bold text-slate-705">Quality Specs / Remarks Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full bg-slate-55 border border-slate-300 rounded-lg p-2 font-medium h-20"
                  placeholder="Insert material structure, GSM metrics, printing instructions or packing properties here."
                />
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowFormModal(false); resetForm(); }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-205 text-slate-700 rounded-lg font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#007d46] hover:bg-[#006438] text-white rounded-lg font-bold transition-colors"
                >
                  Confirm Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= CHALLAN METADATA PROMPT OVERLAY ================= */}
      {showChallanPrompt && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 print:hidden animate-none">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full shadow-2xl p-6 relative">
            <button
              onClick={() => setShowChallanPrompt(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-sm font-black uppercase text-slate-800 tracking-tight flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
              <Truck className="w-4 h-4 text-emerald-600" />
              <span>Challan Context formulation</span>
            </h3>

            <div className="space-y-4 text-xs font-sans">
              <div className="space-y-1">
                <label className="block font-bold text-slate-705">Custom Challan No</label>
                <input
                  type="text"
                  value={challanMeta.challanNo}
                  onChange={(e) => setChallanMeta(prev => ({ ...prev, challanNo: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-mono font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="block font-bold text-slate-750">Client / Factory Consignee *</label>
                <input
                  type="text"
                  required
                  value={challanMeta.factoryName}
                  onChange={(e) => setChallanMeta(prev => ({ ...prev, factoryName: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-extrabold"
                  placeholder="e.g. Rupa Garments Ltd."
                />
              </div>

              <div className="space-y-1">
                <label className="block font-bold text-slate-750">Buyer Affiliation *</label>
                <input
                  type="text"
                  required
                  value={challanMeta.buyerName}
                  onChange={(e) => setChallanMeta(prev => ({ ...prev, buyerName: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-bold"
                  placeholder="e.g. H&M / ZARA"
                />
              </div>

              <div className="space-y-1">
                <label className="block font-bold text-slate-750">Internal Reference (P.O. / S.C.)</label>
                <input
                  type="text"
                  value={challanMeta.ref}
                  onChange={(e) => setChallanMeta(prev => ({ ...prev, ref: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="block font-bold text-slate-750">Delivery Premise Destination</label>
                <textarea
                  value={challanMeta.deliveryAddress}
                  onChange={(e) => setChallanMeta(prev => ({ ...prev, deliveryAddress: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-medium h-16"
                  placeholder="Leave empty to fallback to Factory Registered Address."
                />
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setShowChallanPrompt(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-205 text-slate-700 rounded-lg font-bold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmChallan}
                  className="px-5 py-2 bg-emerald-650 hover:bg-emerald-750 text-white rounded-lg font-bold"
                >
                  Submit &amp; Route Challan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= BILL / INVOICE METADATA PROMPT OVERLAY ================= */}
      {showBillPrompt && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 print:hidden animate-none">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full shadow-2xl p-6 relative">
            <button
              onClick={() => setShowBillPrompt(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-sm font-black uppercase text-slate-800 tracking-tight flex items-center gap-2 border-b border-slate-100 pb-3 mb-4">
              <FileText className="w-4 h-4 text-indigo-600" />
              <span>Manual Bill formulation</span>
            </h3>

            <div className="space-y-4 text-xs font-sans">
              <div className="space-y-1">
                <label className="block font-bold text-slate-705">Invoice / Bill Serial No</label>
                <input
                  type="text"
                  value={billMeta.invoiceNo}
                  onChange={(e) => setBillMeta(prev => ({ ...prev, invoiceNo: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-mono font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="block font-bold text-slate-750">Client / Buyer Enterprise Name *</label>
                <input
                  type="text"
                  required
                  value={billMeta.clientName}
                  onChange={(e) => setBillMeta(prev => ({ ...prev, clientName: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-extrabold"
                  placeholder="e.g. Apex Apparel Ltd."
                />
              </div>

              <div className="space-y-1">
                <label className="block font-bold text-slate-750">Client office Billing Address</label>
                <textarea
                  value={billMeta.clientAddress}
                  onChange={(e) => setBillMeta(prev => ({ ...prev, clientAddress: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-medium h-16"
                  placeholder="Enter invoice delivery address details"
                />
              </div>

              <div className="space-y-1">
                <label className="block font-bold text-slate-750">Current payment Settlement Status</label>
                <select
                  value={billMeta.paymentStatus}
                  onChange={(e) => setBillMeta(prev => ({ ...prev, paymentStatus: e.target.value as any }))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-bold cursor-pointer"
                >
                  <option value="Unpaid">Unpaid / Outstanding (বকেয়া)</option>
                  <option value="Paid">Fully Paid (পরিশোধিত)</option>
                  <option value="Partial">Partial Settlement (আংশিক পেইড)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block font-bold text-slate-750">Bill Remarks Notes</label>
                <input
                  type="text"
                  value={billMeta.notes}
                  onChange={(e) => setBillMeta(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2"
                  placeholder="e.g. Deliver original draft copy to accounts department"
                />
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setShowBillPrompt(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-205 text-slate-700 rounded-lg font-bold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmBill}
                  className="px-5 py-2 bg-indigo-650 hover:bg-indigo-750 text-white rounded-lg font-bold"
                >
                  Generate Invoice/Bill
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
