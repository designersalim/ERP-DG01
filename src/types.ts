/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface SizeEntry {
  size: string;
  quantity: number;
}

export interface StyleBreakdown {
  id: string;
  styleNumber: string;
  color?: string;
  sizeWise: boolean;
  sizes: SizeEntry[];
  quantity?: number;
  sizeUnit?: string; // unit used when entering size quantities (e.g. 'Pcs', 'Dzn')
}

export interface Booking {
  id: string;
  factoryName: string;      // The Garments / Factory Name
  buyerName: string;
  poNumber: string;
  styleNumber: string;
  itemName: string;         // Product / Item Name
  ref: string;
  unit: 'Pcs' | 'Dzn' | 'Set' | 'Yds' | 'Roll' | 'Cone' | 'Kg' | 'Mtr' | 'Ctn';
  unitPrice: number;
  details: string;
  sizeWise: boolean;        // true if size-wise entry is enabled
  sizes: SizeEntry[];       // Size entries (XS-6XL or custom)
  deliveryAddress: string;  // Can be selected or typed
  quantity?: number;        // Flat quantity when sizeWise is false
  styleBreakdowns?: StyleBreakdown[];
  createdAt: string;
  status?: 'Pending' | 'Delivered';
}

export interface BankDetails {
  id: string;
  bankName: string;
  branch: string;
  accountName: string;
  accountNo: string;
  routingNo: string;
  swiftCode: string;
  address?: string;
}

export interface DocumentItem {
  id: string; // generated item id or unique id
  bookingId: string; // reference to original booking
  poNumber: string;
  styleNumber: string;
  itemName: string;
  unit: 'Pcs' | 'Dzn' | 'Set' | 'Yds' | 'Roll' | 'Cone' | 'Kg' | 'Mtr' | 'Ctn';
  unitPrice: number;
  totalQuantity: number;
  sizeWise: boolean;
  sizes: SizeEntry[];
  details: string;
  styleBreakdowns?: StyleBreakdown[];
}

export interface ProformaInvoice {
  id: string;
  invoiceNo: string; // Computed as {3-letter code}-{count} starting 101
  factoryName: string;
  factoryAddress?: string; // Delivery or billing address of the factory
  buyerName: string; // Comma separated if multiple items have different buyers
  ref: string;       // Comma separated if multiple items have different references
  date: string;
  bankDetails: BankDetails;
  items: DocumentItem[];
  netWeight: string;   // Input from form
  grossWeight: string; // Input from form
  hsCode: string;      // "6217.10.00" by default
  terms: string[];
  createdAt: string;
  isPurchased?: boolean;
}

export interface DeliveryChallan {
  id: string;
  challanNo: string; // Computed as [Buyer Abbreviation]-ATC-[Increment]
  factoryName: string;
  buyerName: string;
  ref: string;
  date: string;
  deliveryAddress: string;
  items: DocumentItem[];
  hsCode: string; // "6217.10.00"
  status: 'Pending' | 'Delivered';
  createdAt: string;
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  createdAt: string;
}

export interface WorkOrderItem {
  id: string;
  itemName: string;
  quantity: number;
  unitPrice: number;
  unit: 'Pcs' | 'Dzn' | 'Set' | 'Yds' | 'Roll' | 'Kg' | 'Mtr';
  amount: number;
}

export interface SupplierWorkOrder {
  id: string;
  workOrderNo: string; // e.g., "ATC-WO-101"
  supplierId: string;
  supplierName: string;
  date: string; // "YYYY-MM-DD" style
  items: WorkOrderItem[];
  totalAmount: number;
  notes?: string;
  deliveryTerms?: string;
  createdAt: string;
}

export interface SupplierPayment {
  id: string;
  supplierId: string;
  supplierName: string;
  date: string; // "YYYY-MM-DD" style
  amount: number;
  paymentMethod: string; // 'Cash' | 'Bank Transfer' | 'Mobile Banking' | 'Check' | 'Other'
  referenceNo?: string;
  remarks?: string;
  createdAt: string;
}

export interface ConveyanceEntry {
  id: string;
  employeeName: string;
  date: string; // "YYYY-MM-DD" style
  amount: number;
  type: 'Due' | 'Joma'; // 'Due' = বকেয়া/ব্যয়, 'Joma' = অগ্রিম জমার বিবরণ বা সমন্বয়
  purpose: string;
  createdAt: string;
  createdBy?: string; // email of creator
}

export interface JobCard {
  id: string;
  bookingId: string;
  jobCardNo: string; // e.g., "JC-2026-1001"
  createdAt: string;
  status: 'Pending' | 'In Progress' | 'Completed' | 'Delivered';
  factoryName: string;
  buyerName: string;
  poNumber: string;
  styleNumber: string;
  itemName: string;
  quantity: number;
  unit: string;
  sizeWise: boolean;
  sizes: SizeEntry[];
  materialDetails: string; // Materials used (e.g. "Polyester Ribbon", "Zinc Alloy Buckle")
  colorDetails: string;    // Colors used (e.g. "Royal Blue dyed matching color")
  machineNo?: string;
  remarks?: string;
  targetDate?: string;
}

export interface GatePass {
  id: string;
  gatePassNo: string; // e.g., "GP-2026-1001"
  challanNo: string;
  challanId: string;
  date: string;
  factoryName: string;
  buyerName: string;
  vehicleNo: string;
  driverName: string;
  driverPhone?: string;
  securityCheckedBy: string;
  verifiedTime?: string;
  status: 'Draft' | 'Issued' | 'Checked & Out';
  items: {
    itemName: string;
    quantity: number;
    unit: string;
    remarks?: string;
  }[];
  createdAt: string;
}

export interface CommercialInvoice {
  id: string;
  invoiceNo: string; // e.g., "ATC-CI-2026-1001"
  piNo: string;
  piId: string;
  date: string;
  challanNos: string[]; // referenced delivery challans
  factoryName: string;
  factoryAddress?: string;
  buyerName: string;
  items: {
    itemName: string;
    poNumber: string;
    styleNumber: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    amount: number;
  }[];
  totalAmount: number;
  bankDetails: BankDetails;
  hsCode: string;
  lcNo?: string;
  lcDate?: string;
  expNo?: string;
  expDate?: string;
  truckNo?: string;
  grossWeight?: string;
  netWeight?: string;
  totalCartons?: number;
  packingList: {
    cartonNo: string;
    itemName: string;
    poNumber: string;
    styleNumber: string;
    sizes: SizeEntry[];
    quantity: number;
    unit: string;
    netWeight?: string;
    grossWeight?: string;
  }[];
  createdAt: string;
}

export interface Employee {
  id: string; // e.g. "EMP-1001"
  name: string;
  designation: string;
  basicSalary: number;
  mobile?: string;
  joiningDate?: string;
  department?: string;
}

export interface PayrollPeriod {
  id: string; // e.g., "2026-05"
  month: string; // "01" - "12"
  year: string;  // "2026"
  status: 'Draft' | 'Approved';
  processedAt?: string;
  items: PayrollItem[];
}

export interface PayrollItem {
  id: string;
  employeeId: string;
  employeeName: string;
  designation: string;
  basicSalary: number;
  presentDays: number;
  absentDays: number;
  unpaidLeaveDeduction: number; // formula: Basic Salary / 30 * Absent Days
  conveyanceBill: number;       // manual
  extraDutyFee: number;         // manual
  epf: number;                  // default 0, custom if enabled
  healthInsurance: number;      // default 0, custom if enabled
  professionalTax: number;      // default 0, custom if enabled
  netPayable: number;           // formula: (Basic Salary - Unpaid Leave) + Conveyance + Extra Duty - Deductions
  isApproved: boolean;
  grossSalary?: number;
  totalWorkingDays?: number;
  paidDays?: number;
  calculatedBasicSalary?: number;
  houseRentAllowance?: number;
  conveyanceAllowance?: number;
  medicalAllowance?: number;
  specialAllowance?: number;
  mobileSnackBill?: number;
  advance?: number;
  department?: string;
}

export interface ProductColorImage {
  color: string;
  image: string; // base64 or URL
}

export interface ProductItemCatalog {
  id: string;
  name: string;
  code: string;
  category: string;
  subcategory?: string;
  unit: string;
  unitPrice?: number;
  currency?: 'USD' | 'BDT';
  moq?: number;
  moqUnit?: string;
  image: string; // base64 or URL
  colorImages?: ProductColorImage[];
  description?: string;
  createdAt: string;
}

export interface JobOpportunity {
  id: string;
  title: string;
  dept: string;
  deadline: string;
  education: string;
  experience: string;
  additionalRequirements: string;
  responsibilities: string;
  skills: string;
  benefits: string;
  workplace: string;
  employmentStatus: string;
  jobLocation: string;
  createdAt: string;
}

export interface JobApplication {
  id: string;
  jobId: string;
  jobTitle: string;
  name: string;
  email: string;
  phone: string;
  coverLetter: string;
  cvFileName?: string;
  cvFileData?: string; // base64 representation
  createdAt: string;
}

export interface MoneyReceipt {
  id: string;
  receiptNo: string;
  date: string;
  type: 'PI' | 'Invoice';
  referenceNo: string;
  originalAmount: number;
  originalCurrency: 'USD' | 'BDT';
  conversionRate?: number;
  totalAmountBDT: number;
  receivedAmount: number;
  isFullyPaid: boolean;
  balanceAmountBDT: number;
  receivedFrom: string;
  remarks?: string;
  createdAt: string;
}

export interface BillItem {
  id: string;
  name: string;
  code: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  amount: number;
  currency?: 'USD' | 'BDT';
}

export interface ManualInvoiceBill {
  id: string;
  invoiceNo: string; // e.g. "INV-2026-101"
  clientName: string;
  clientAddress?: string;
  buyerName?: string;
  date: string; // "YYYY-MM-DD" style
  items: BillItem[];
  totalAmount: number;
  paymentStatus: 'Paid' | 'Unpaid' | 'Partial';
  currency?: 'USD' | 'BDT';
  notes?: string;
  createdAt: string;
  bankDetails?: import('./types').BankDetails;
}

export interface UserAccount {
  id: string;
  email: string;
  passwordHash: string; // SHA-256 hex
  allowedTabs: string[]; // List of tab codes, e.g. ['dashboard', 'bookings']
  writeAccess: Record<string, boolean>; // map of tabCode -> boolean (has edit/write access)
  createdAt: string;
  name?: string;
  designation?: string;
  signatureUrl?: string;
  department?: string;
}

export interface DatabaseHostingConfig {
  id: string; // 'current_config'
  appName: string;
  liveAppUrl: string;
  dbHost: string;
  dbName: string;
  dbUser: string;
  dbPassword?: string;
  updatedAt: string;
  fbApiKey?: string;
  fbAuthDomain?: string;
  fbProjectId?: string;
  fbStorageBucket?: string;
  fbMessagingSenderId?: string;
  fbAppId?: string;
  fbFirestoreDatabaseId?: string;
}

export interface PaymentReceived {
  id: string;
  factoryName: string;
  date: string;
  amount: number;
  paymentMethod: string;
  bankRef?: string;
}

export interface QuoteItem {
  id: string;
  itemName: string;
  description?: string;
  styleNumber?: string;
  quantity: number;
  unit: 'Pcs' | 'Dzn' | 'Set' | 'Yds' | 'Roll';
  unitPrice: number;
  itemImage?: string;
}

export interface Quotation {
  id: string;
  quoteNo: string;
  quoteDate: string;
  clientName: string;
  clientAddress?: string;
  validity?: string;
  deliveryTerms?: string;
  paymentTerms?: string;
  vatTaxStr?: string;
  contactPerson?: string;
  items: QuoteItem[];
  totalAmount: number;
  updatedAt: string;
}

export interface LcAmendment {
  id: string;
  amendmentNo: string;
  amendmentDate: string;
  amendedClauses: string;
  updatedAmount: number;
}

export interface LcDocumentPack {
  lcNo: string;
  lcDate: string;
  lcBankName: string;
  lcBranch: string;
  lcAddress: string;
  exportScNo: string;
  exportScDate: string;
  truckNo: string;
  truckChallanNo: string;
  totalPackages: string;
  grossWeight: string;
  netWeight: string;
  driverName: string;
  selectedPiNo: string;
  totalAmount: number;
  currency: string;
  billOfExchange1Text: string;
  billOfExchange2Text: string;
  deliveryChallanText: string;
  packingListText: string;
  commercialInvoiceText: string;
  weightMeasurementText: string;
  beneficiaryCertText: string;
  certificateOfOriginText: string;
  purchaseAppText: string;
  truckChallanText: string;
  lcTerms?: string;
}

export interface LcHistoryEntry {
  id: string;
  lcNo: string;
  piNo: string;
  generationDateTime: string;
  beneficiaryName: string;
  totalAmount: number;
  currency: string;
  packData: LcDocumentPack;
  amendments: LcAmendment[];
}

export const PRODUCT_CATEGORIES_MAP: Record<string, string[]> = {
  "Labels & Tags": [
    "Woven Label",
    "Care Label",
    "Composition Label",
    "Heat Transfer Label",
    "Printed Label",
    "Hang Tag",
    "Barcode/Price Sticker",
    "Rubber / PVC Patch",
    "Flag Label / Side Label"
  ],
  "Packaging & Finishing": [
    "Poly Bag",
    "Carton Box",
    "Backboard / Insert Board",
    "Tissue Paper",
    "Photo Board",
    "Header Card",
    "Banderole/Cascade",
    "Packaging Tape",
    "Hanger",
    "Tag Pin & String"
  ],
  "Sewing & Construction Accessories": [
    "Sewing Thread",
    "Jacquard & Normal Elastic",
    "Twill Tape / Bias Tape",
    "Drawstring & Drawcord",
    "Zipper",
    "Cotton & Sateen Tape",
    "Narrow Fabrics",
    "Hook & Loop (Velcro)",
    "Interlining (Fusing)"
  ],
  "Metal & Plastic Accessories": [
    "Metal Buckle",
    "Metal Badge / Plate",
    "Metal Rivet",
    "Snap Button / Press Button",
    "Shank Button",
    "Plastic Button",
    "Plastic Stopper",
    "Plastic Clip",
    "Plastic Adjuster",
    "Eyelet & D-Ring"
  ]
};




