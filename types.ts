
export enum Role {
  ADMIN = 'ADMIN',
  FINANCE = 'FINANCE',
  OPS = 'OPS',
  VIEWER = 'VIEWER'
}

export enum TransactionSource {
  CAMS = 'CAMS',
  KFINTECH = 'KFINTECH'
}

export enum TransactionStatus {
  DRAFT = 'DRAFT',
  VALIDATED = 'VALIDATED',
  APPROVED = 'APPROVED',
  PAID = 'PAID'
}

export enum InvoiceStatus {
  UNBILLED = 'UNBILLED',
  SUBMITTED = 'SUBMITTED', // Raised to Admin
  PAID = 'PAID',
  REJECTED = 'REJECTED'
}

export interface BankDetails {
  accountName: string;
  accountNumber: string;
  bankName: string;
  ifscCode: string;
  accountType: 'Savings' | 'Current' | 'NRE' | 'NRO';
  branch?: string;
}

export interface Address {
  street: string;
  city: string;
  state: string;
  pincode: string;
  country: string;
}

export interface TeamMember {
  id: string;
  name: string;
  code: string; // ARN or Emp Code
  role: Role;
  level: number; // 1-6
  email?: string;
  password?: string; // Mock password
  bankDetails?: BankDetails;
  address?: Address;
  customLevels?: { // User-specific sharing override
    1?: number;
    2?: number;
    3?: number;
    4?: number;
    5?: number;
    6?: number;
  };
}

export interface SharingConfig {
  id: string;
  name: string;
  companyExpensePct: number; // e.g. 15 for 15%
  levels: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
    6: number;
  };
  // Added Level 6 to levelNames to match business logic and mock data
  levelNames: {
    1: string;
    2: string;
    3: string;
    4: string;
    5: string;
    6: string;
  };
  scope: 'GLOBAL' | 'CLIENT' | 'CATEGORY' | 'USER';
  scopeId?: string; // ClientID or CategoryID or UserID
}

export interface Client {
  id: string;
  pan: string;
  name: string;
  folios: string[];
  hierarchy: {
    level1Id: string;
    level2Id: string;
    level3Id: string;
    level4Id: string;
    level5Id: string;
    level6Id: string;
  };
}

export interface MappingEntry {
  original: string;
  standard: string;
}

export interface PayoutBreakdown {
  gross: number;
  expenseAmount: number;
  netPool: number;
  levelPayouts: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
    6: number;
  };
}

export interface BrokerageTransaction {
  id: string;
  batchId: string;
  source: TransactionSource;
  uploadDate: string;
  transactionDate: string;
  brokeragePeriod: string; // Format: "YYYY-MM"
  folio: string;
  pan: string;
  investorName: string;
  amcName: string;
  schemeName: string;
  category: string; // Equity, Debt
  grossAmount: number;
  currentValue?: number;
  brokerageRate?: number;
  mappedClientId?: string; // Null if unmapped
  status: TransactionStatus;
  breakdown?: PayoutBreakdown;
  remarks?: string;
}

export interface ImportBatch {
  id: string;
  fileName: string;
  uploadDate: string;
  status: TransactionStatus;
  totalLines: number;
  totalGross: number;
  unmappedCount: number;
}

export interface PayoutInvoice {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  month: string; // YYYY-MM
  amount: number;
  status: InvoiceStatus;
  submittedDate?: string;
  paidDate?: string;
  transactionCount: number;
}