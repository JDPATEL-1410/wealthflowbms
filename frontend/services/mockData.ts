
import { Client, ImportBatch, SharingConfig, TeamMember, BrokerageTransaction, Role, PayoutInvoice } from '../types';

/**
 * PRODUCTION SEED DATA
 * All sample clients, transactions, and batches have been removed.
 * Only a default system administrator is retained for initial setup.
 */

export const MOCK_TEAM: TeamMember[] = [
  { 
    id: 'admin_root', 
    name: 'System Administrator', 
    code: 'ADMIN-001', 
    role: Role.ADMIN, 
    level: 1, 
    email: 'admin@wealthflow.com',
    password: 'admin', // RECOMMENDED: Change this immediately after first login
    bankDetails: { 
      accountName: '', 
      accountNumber: '', 
      bankName: '', 
      ifscCode: '' 
    }
  }
];

export const GLOBAL_CONFIG: SharingConfig = {
  id: 'global_config',
  name: 'Standard Payout Rules',
  companyExpensePct: 15,
  levels: {
    1: 15,
    2: 15,
    3: 15,
    4: 15,
    5: 15,
    6: 5,
    0: 20
  },
  levelNames: {
    1: 'Corporate House',
    2: 'Partner Level 2',
    3: 'Regional Level 3',
    4: 'Zonal Level 4',
    5: 'Manager Level 5',
    6: 'Relationship Manager (L6)',
    0: 'Super Holding'
  },
  scope: 'GLOBAL'
};

export const MOCK_CLIENTS: Client[] = [];
export const MOCK_TRANSACTIONS: BrokerageTransaction[] = [];
export const MOCK_BATCHES: ImportBatch[] = [];
export const MOCK_INVOICES: PayoutInvoice[] = [];
