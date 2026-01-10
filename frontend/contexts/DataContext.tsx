import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  Client,
  TeamMember,
  BrokerageTransaction,
  SharingConfig,
  ImportBatch,
  MappingEntry,
  PayoutInvoice,
  Role
} from '../types';
import { GLOBAL_CONFIG } from '../services/mockData';
import { getApiUrl, authFetch } from '../config/apiConfig';

interface DataContextType {
  clients: Client[];
  updateClients: (clients: Client[]) => void;
  upsertClients: (newClients: Client[]) => void;
  deleteClient: (clientId: string) => void;

  team: TeamMember[];
  updateTeam: (team: TeamMember[]) => void;
  deleteTeamMember: (memberId: string) => void;

  transactions: BrokerageTransaction[];
  addTransactions: (txs: BrokerageTransaction[]) => void;
  deleteTransaction: (transactionId: string) => void;

  batches: ImportBatch[];
  addBatch: (batch: ImportBatch) => void;
  deleteBatch: (batchId: string) => void;

  globalConfig: SharingConfig;
  updateConfig: (config: SharingConfig) => void;

  amcMappings: MappingEntry[];
  schemeMappings: MappingEntry[];
  updateAmcMappings: (mappings: MappingEntry[]) => void;
  updateSchemeMappings: (mappings: MappingEntry[]) => void;

  invoices: PayoutInvoice[];
  addInvoice: (invoice: PayoutInvoice) => void;
  updateInvoice: (invoice: PayoutInvoice) => void;
  deleteInvoice: (invoiceId: string) => void;

  refreshDashboard: (currentUser?: TeamMember) => void;
  clearAllData: () => void;

  loading: boolean;
  isOnline: boolean;
  isSyncing: boolean;

  setCurrentUser: (user: TeamMember | null) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

async function safeJson(res: Response): Promise<any> {
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) return await res.json();
  const text = await res.text();
  return { error: text || 'Request failed' };
}

function normalizeConfig(data: any, fallback: SharingConfig): SharingConfig {
  // backend returns an array from find().toArray()
  if (!data) return fallback;
  if (Array.isArray(data) && data.length > 0) return data[0];
  if (typeof data === 'object' && !Array.isArray(data)) return data;
  return fallback;
}

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<TeamMember | null>(null);

  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  const [clients, setClients] = useState<Client[]>([]);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [globalConfig, setGlobalConfig] = useState<SharingConfig>(GLOBAL_CONFIG);
  const [batches, setBatches] = useState<ImportBatch[]>([]);
  const [transactions, setTransactions] = useState<BrokerageTransaction[]>([]);
  const [amcMappings, setAmcMappings] = useState<MappingEntry[]>([]);
  const [schemeMappings, setSchemeMappings] = useState<MappingEntry[]>([]);
  const [invoices, setInvoices] = useState<PayoutInvoice[]>([]);

  const fetchData = useCallback(
    async (user?: TeamMember) => {
      setLoading(true);

      try {
        const activeUser = user || currentUser;
        const userId = activeUser?.id || '';
        const isAdmin = activeUser?.role === Role.ADMIN;

        const buildUrl = (type: string) => {
          const params: Record<string, string> = { type };
          if (userId) params.userId = userId;
          params.isAdmin = isAdmin ? 'true' : 'false';
          return getApiUrl('/api/data', params);
        };

        // Load dashboard datasets (all are /api/data)
        const tasks: Array<Promise<any>> = [
          authFetch(buildUrl('clients')).then(safeJson),
          authFetch(buildUrl('batches')).then(safeJson),
          authFetch(buildUrl('transactions')).then(safeJson),
          authFetch(buildUrl('amc_mappings')).then(safeJson),
          authFetch(buildUrl('scheme_mappings')).then(safeJson),
          authFetch(buildUrl('config')).then(safeJson),
          authFetch(buildUrl('invoices')).then(safeJson)
        ];

        // Team should come from /api/users (admin only)
        if (isAdmin) {
          tasks.push(authFetch('/api/users').then(safeJson));
        } else {
          tasks.push(Promise.resolve([]));
        }

        const results = await Promise.all(tasks);

        const c = Array.isArray(results[0]) ? (results[0] as Client[]) : [];
        const b = Array.isArray(results[1]) ? (results[1] as ImportBatch[]) : [];
        const tx = Array.isArray(results[2]) ? (results[2] as BrokerageTransaction[]) : [];
        const amc = Array.isArray(results[3]) ? (results[3] as MappingEntry[]) : [];
        const sch = Array.isArray(results[4]) ? (results[4] as MappingEntry[]) : [];
        const cfgRaw = results[5];
        const inv = Array.isArray(results[6]) ? (results[6] as PayoutInvoice[]) : [];
        const teamRaw = results[7];

        setClients(c);
        setBatches(b);
        setTransactions(tx);
        setAmcMappings(amc);
        setSchemeMappings(sch);
        setInvoices(inv);

        const cfg = normalizeConfig(cfgRaw, GLOBAL_CONFIG);
        setGlobalConfig(cfg);

        if (isAdmin) {
          setTeam(Array.isArray(teamRaw) ? teamRaw : []);
        }

        setIsOnline(true);
      } catch (err) {
        console.error('Critical: Backend API unavailable.', err);
        setIsOnline(false);
      } finally {
        setLoading(false);
      }
    },
    [currentUser]
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const saveToDb = async (collection: string, payload: any, upsertField?: string) => {
    setIsSyncing(true);
    try {
      const response = await authFetch(getApiUrl('/api/data'), {
        method: 'POST',
        body: JSON.stringify({ collection, payload, upsertField })
      });

      if (!response.ok) {
        const data = await safeJson(response);
        throw new Error(data.error || `API request failed: ${response.status}`);
      }

      setIsOnline(true);
    } catch (e) {
      console.error(`❌ Failed to save ${collection} to MongoDB:`, e);
      setIsOnline(false);
      throw e;
    } finally {
      setIsSyncing(false);
    }
  };

  const deleteFromDb = async (collection: string, id: string) => {
    setIsSyncing(true);
    try {
      const response = await authFetch(getApiUrl('/api/data', { type: collection, id }), {
        method: 'DELETE'
      });
      if (!response.ok) {
        const data = await safeJson(response);
        throw new Error(data.error || 'Delete API request failed');
      }
      setIsOnline(true);
    } catch (e) {
      console.error(`Failed to delete from ${collection} in MongoDB`, e);
      setIsOnline(false);
    } finally {
      setIsSyncing(false);
    }
  };

  const updateClients = (newClients: Client[]) => {
    setClients(newClients);
    saveToDb('clients', newClients, 'id');
  };

  const upsertClients = (newClients: Client[]) => {
    setClients(prev => {
      const existingPans = new Set(prev.map(c => c.pan.toUpperCase()));
      const filteredNew = newClients.filter(c => !existingPans.has(c.pan.toUpperCase()));

      const updated = prev.map(existing => {
        const match = newClients.find(n => n.pan.toUpperCase() === existing.pan.toUpperCase());
        if (match) {
          const combinedFolios = Array.from(new Set([...(existing.folios || []), ...(match.folios || [])]));
          return { ...existing, folios: combinedFolios };
        }
        return existing;
      });

      const final = [...updated, ...filteredNew];
      saveToDb('clients', final, 'id');
      return final;
    });
  };

  const deleteClient = (clientId: string) => {
    setClients(prev => prev.filter(c => c.id !== clientId));
    deleteFromDb('clients', clientId);
  };

  const updateTeam = async (newTeam: TeamMember[]) => {
    console.log('📝 Local team state updated');
    setTeam(newTeam);
  };

  const deleteTeamMember = async (memberId: string) => {
    try {
      const response = await authFetch(`/api/users/${memberId}`, {
        method: 'PUT',
        body: JSON.stringify({ isActive: false })
      });

      const data = await safeJson(response);
      if (!response.ok) throw new Error(data.error || 'Failed to deactivate user');

      setTeam(prev => prev.map(u => (u.id === memberId ? { ...u, isActive: false } : u)));
      setIsOnline(true);
    } catch (e) {
      console.error('Failed to deactivate user', e);
      setIsOnline(false);
      throw e;
    }
  };

  const addTransactions = (newTxs: BrokerageTransaction[]) => {
    setTransactions(prev => {
      const updated = [...prev, ...newTxs];
      saveToDb('transactions', newTxs);
      return updated;
    });
  };

  const deleteTransaction = (transactionId: string) => {
    setTransactions(prev => prev.filter(t => t.id !== transactionId));
    deleteFromDb('transactions', transactionId);
  };

  const addBatch = (batch: ImportBatch) => {
    setBatches(prev => {
      const updated = [batch, ...prev];
      saveToDb('batches', batch);
      return updated;
    });
  };

  const deleteBatch = (batchId: string) => {
    setBatches(prev => prev.filter(b => b.id !== batchId));
    setTransactions(prev => prev.filter(t => t.batchId !== batchId));
    deleteFromDb('batches', batchId);
  };

  const updateConfig = (newConfig: SharingConfig) => {
    setGlobalConfig(newConfig);
    saveToDb('config', newConfig, 'id');
  };

  const updateAmcMappings = (mappings: MappingEntry[]) => {
    setAmcMappings(mappings);
    saveToDb('amc_mappings', mappings, 'original');
  };

  const updateSchemeMappings = (mappings: MappingEntry[]) => {
    setSchemeMappings(mappings);
    saveToDb('scheme_mappings', mappings, 'original');
  };

  const addInvoice = (invoice: PayoutInvoice) => {
    setInvoices(prev => [invoice, ...prev]);
    saveToDb('invoices', invoice, 'id');
  };

  const updateInvoice = (updatedInvoice: PayoutInvoice) => {
    setInvoices(prev => prev.map(inv => (inv.id === updatedInvoice.id ? updatedInvoice : inv)));
    saveToDb('invoices', updatedInvoice, 'id');
  };

  const deleteInvoice = (invoiceId: string) => {
    setInvoices(prev => prev.filter(inv => inv.id !== invoiceId));
    deleteFromDb('invoices', invoiceId);
  };

  const refreshDashboard = (user?: TeamMember) => fetchData(user);

  const clearAllData = () => {
    if (window.confirm('CRITICAL: Delete all data from MongoDB? This cannot be undone.')) {
      setLoading(true);
      authFetch(getApiUrl('/api/data', { action: 'reset' }), { method: 'DELETE' })
        .then(() => window.location.reload())
        .catch(() => {
          alert('Failed to reset database.');
          setLoading(false);
        });
    }
  };

  return (
    <DataContext.Provider
      value={{
        clients,
        updateClients,
        upsertClients,
        deleteClient,
        team,
        updateTeam,
        deleteTeamMember,
        transactions,
        addTransactions,
        deleteTransaction,
        batches,
        addBatch,
        deleteBatch,
        globalConfig,
        updateConfig,
        amcMappings,
        schemeMappings,
        updateAmcMappings,
        updateSchemeMappings,
        invoices,
        addInvoice,
        updateInvoice,
        deleteInvoice,
        refreshDashboard,
        clearAllData,
        loading,
        isOnline,
        isSyncing,
        setCurrentUser
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
