/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BankDetails, Booking, ProformaInvoice, DeliveryChallan, Supplier, SupplierWorkOrder, SupplierPayment } from './types';

function getStoredProfile() {
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
    companyItems: "GARMENTS ACCESSORIES"
  };

  if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
    try {
      const saved = window.localStorage.getItem('acoola_profile');
      if (saved) {
        return { ...defaultProfile, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.error("Error loading acoola_profile from localStorage", e);
    }
  }
  return defaultProfile;
}

export const COMPANY_PROFILE = {
  get name(): string {
    return getStoredProfile().name;
  },
  get companyItems(): string {
    return (getStoredProfile() as any).companyItems || "GARMENTS ACCESSORIES";
  },
  get emails(): string[] {
    return getStoredProfile().emails;
  },
  get phones(): string[] {
    return getStoredProfile().phones;
  },
  get addresses(): { office: string; factory: string } {
    return getStoredProfile().addresses;
  },
  get bin(): string {
    return getStoredProfile().bin;
  },
  get tin(): string {
    return getStoredProfile().tin || "028374192083";
  },
  get ownerName(): string {
    return getStoredProfile().ownerName || "MD Akbar Hossain";
  },
  get defaultHsCode(): string {
    return getStoredProfile().defaultHsCode;
  },
  get logo(): string {
    return getStoredProfile().logo || '';
  },
  get useLogoInLc(): boolean {
    return getStoredProfile().useLogoInLc !== false;
  },
  get useLogoInHeader(): boolean {
    return getStoredProfile().useLogoInHeader !== false;
  },
  get headerTitleImg(): string {
    return getStoredProfile().headerTitleImg || '';
  },
  get line1Color(): string {
    return getStoredProfile().line1Color || '#007D46';
  },
  get line1Active(): boolean {
    return getStoredProfile().line1Active !== false;
  },
  get line2Color(): string {
    return getStoredProfile().line2Color || '#ed1c24';
  },
  get line2Active(): boolean {
    return getStoredProfile().line2Active !== false;
  },
  get tagline(): string {
    return getStoredProfile().tagline || "All Kinds of Garments Accessories Manufacturer & Supplier";
  },
  get firstColor(): string {
    return getStoredProfile().firstColor || "#007D46";
  },
  get secondColor(): string {
    return getStoredProfile().secondColor || "#ed1c24";
  },
  get headerImg(): string {
    return '';
  },
  get footerImg(): string {
    return (getStoredProfile() as any).footerImg || '';
  },
  get useFooterImg(): boolean {
    return !!(getStoredProfile() as any).useFooterImg;
  },
  get truckChallanImg(): string {
    return '';
  }
};

export const DEFAULT_BANKS: BankDetails[] = [
  {
    id: "bank-1",
    bankName: "Mutual Trust Bank PLC",
    branch: "Dilkusha Branch, Dhaka, Bangladesh",
    accountName: "Acoola Trims Corporation",
    accountNo: "0012-0210034567",
    routingNo: "145260123",
    swiftCode: "MTBLBDDHxxx"
  },
  {
    id: "bank-2",
    bankName: "Dhaka Bank PLC",
    branch: "Mirpur Branch, Dhaka, Bangladesh",
    accountName: "Acoola Trims Corporation",
    accountNo: "205-100-897654",
    routingNo: "085261478",
    swiftCode: "DHKABKBDxxxxx"
  }
];

export const DEFAULT_TERMS = [
  "Payment: Payment by Irrevocable L/C at 90 Days Sight in favor of the Seller.",
  "Delivery: Delivery shall be completed within 10 days from receipt of workable L/C.",
  "Nigotation: Seller’s Delivery Challan shall be acceptable as negotiable document in lieu of Truck Receipt.",
  "Charges: All banking charges outside Seller’s bank shall be borne by the Buyer/Applicant.",
  "LC : After delivery of Swing Items, Buyer shall provide operative L/C copy for delivery of finishing and balance goods.",
  "All terms stated herein shall be binding upon both parties unless otherwise mutually agreed in writing."
];

export const SUGGESTED_SIZES = ["XS", "S", "M", "L", "X", "XL", "XXL", "XXXL", "3XL", "4XL", "5XL", "6XL"];

export const INITIAL_BOOKINGS: Booking[] = [];

export const INITIAL_CHALLANS: DeliveryChallan[] = [];

export const INITIAL_PIS: ProformaInvoice[] = [];

export const INITIAL_SUPPLIERS: Supplier[] = [];

export const INITIAL_WORK_ORDERS: SupplierWorkOrder[] = [];

export const INITIAL_SUP_PAYMENTS: SupplierPayment[] = [];

export const INITIAL_PRODUCTS: any[] = [];

export const INITIAL_MANUAL_BILLS: any[] = [];


