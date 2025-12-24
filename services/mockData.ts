
import { Client, ImportBatch, SharingConfig, TeamMember, TransactionSource, TransactionStatus, BrokerageTransaction, Role, PayoutInvoice, InvoiceStatus } from '../types';

export const MOCK_TEAM: TeamMember[] = [
  {
    id: 'tm6',
    name: 'Frank Admin',
    code: 'AD001',
    role: Role.ADMIN,
    level: 1,
    email: 'admin@wealthflow.com',
    password: 'admin123',
    bankDetails: {
      accountName: 'Frank Admin',
      accountNumber: '1122334455',
      bankName: 'HDFC Bank',
      ifscCode: 'HDFC0001234',
      accountType: 'Savings'
    }
  }
];

export const MOCK_CLIENTS: Client[] = [];

export const GLOBAL_CONFIG: SharingConfig = {
  id: 'global_1',
  name: 'Default FY24 Structure',
  companyExpensePct: 15,
  levels: {
    6: 40, // RM
    5: 10, // ZM
    4: 5,  // RH
    3: 5,  // Partner
    2: 5,  // Associate
    1: 35  // Corp/House
  },
  levelNames: {
    6: 'Relationship Manager (RM)',
    5: 'Zonal Manager (ZM)',
    4: 'Regional Head (RH)',
    3: 'Partner',
    2: 'Associate',
    1: 'Corporate / House'
  },
  scope: 'GLOBAL'
};

export const MOCK_BATCHES: ImportBatch[] = [];

export const MOCK_INVOICES: PayoutInvoice[] = [];

// Returning an empty array to ensure no dummy data is generated on startup
export const generateTransactions = (batchId: string, count: number): BrokerageTransaction[] => {
  return [];
};
