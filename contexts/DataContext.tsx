
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Client, TeamMember, BrokerageTransaction, SharingConfig, ImportBatch, MappingEntry, PayoutInvoice } from '../types';
import { MOCK_TEAM, GLOBAL_CONFIG, MOCK_CLIENTS, MOCK_TRANSACTIONS, MOCK_BATCHES } from '../services/mockData';

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
  batches: ImportBatch[];
  addBatch: (batch: ImportBatch) => void;
  globalConfig: SharingConfig;
  updateConfig: (config: SharingConfig) => void;
  amcMappings: MappingEntry[];
  schemeMappings: MappingEntry[];
  updateAmcMappings: (mappings: MappingEntry[]) => void;
  updateSchemeMappings: (mappings: MappingEntry[]) => void;
  invoices: PayoutInvoice[];
  addInvoice: (invoice: PayoutInvoice) => void;
  updateInvoice: (invoice: PayoutInvoice) => void;
  refreshDashboard: () => void;
  clearAllData: () => void;
  loading: boolean;
  isOnline: boolean;
  isSyncing: boolean;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
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

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Attempt to fetch from API
      const results = await Promise.allSettled([
        fetch('/api/data?type=clients').then(r => { if(!r.ok) throw new Error(r.statusText); return r.json() }),
        fetch('/api/data?type=team').then(r => { if(!r.ok) throw new Error(r.statusText); return r.json() }),
        fetch('/api/data?type=batches').then(r => { if(!r.ok) throw new Error(r.statusText); return r.json() }),
        fetch('/api/data?type=transactions').then(r => { if(!r.ok) throw new Error(r.statusText); return r.json() }),
        fetch('/api/data?type=amc_mappings').then(r => { if(!r.ok) throw new Error(r.statusText); return r.json() }),
        fetch('/api/data?type=scheme_mappings').then(r => { if(!r.ok) throw new Error(r.statusText); return r.json() }),
        fetch('/api/data?type=config').then(r => { if(!r.ok) throw new Error(r.statusText); return r.json() }),
        fetch('/api/data?type=invoices').then(r => { if(!r.ok) throw new Error(r.statusText); return r.json() }),
      ]);

      // Helper to extract value or default
      const getValue = <T,>(result: PromiseSettledResult<T>, defaultVal: T): T => {
        return (result.status === 'fulfilled') ? result.value : defaultVal;
      };

      const hasTeam = results[1].status === 'fulfilled' && Array.isArray(results[1].value) && results[1].value.length > 0;

      if (!hasTeam && results[1].status === 'rejected') {
         throw new Error("API unreachable");
      }

      setClients(getValue(results[0], []));
      
      const fetchedTeam = getValue(results[1], []);
      if (fetchedTeam.length === 0 && results[1].status === 'fulfilled') {
        // DB is reachable but empty, seed it
        setTeam(MOCK_TEAM);
        saveToDb('team', MOCK_TEAM, 'id');
      } else {
        setTeam(fetchedTeam);
      }
      
      setBatches(getValue(results[2], []));
      setTransactions(getValue(results[3], []));
      setAmcMappings(getValue(results[4], []));
      setSchemeMappings(getValue(results[5], []));
      
      const configVal = getValue(results[6], []);
      if (Array.isArray(configVal) && configVal.length > 0) {
        setGlobalConfig(configVal[0]);
      } else {
        setGlobalConfig(GLOBAL_CONFIG);
      }

      setInvoices(getValue(results[7], []));
      setIsOnline(true);

    } catch (err) {
      console.warn("Backend API unavailable. Switching to Offline Mode.", err);
      setIsOnline(false);
      
      // Fallback to Mock Data
      setTeam(MOCK_TEAM);
      setClients(MOCK_CLIENTS);
      setTransactions(MOCK_TRANSACTIONS);
      setBatches(MOCK_BATCHES);
      setGlobalConfig(GLOBAL_CONFIG);
      setAmcMappings([]);
      setSchemeMappings([]);
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const saveToDb = async (collection: string, payload: any, upsertField?: string) => {
    // If offline, just resolve (data is already updated in state)
    if (!isOnline) return;

    setIsSyncing(true);
    try {
      const response = await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collection, payload, upsertField })
      });
      if (!response.ok) throw new Error('API request failed');
    } catch (e) {
      console.error(`Failed to save ${collection} to MongoDB`, e);
      // Don't set isOnline(false) here to avoid flickering UI, just log error
    } finally {
      setIsSyncing(false);
    }
  };

  const deleteFromDb = async (collection: string, id: string) => {
    if (!isOnline) return;

    setIsSyncing(true);
    try {
      const response = await fetch(`/api/data?type=${collection}&id=${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Delete API request failed');
    } catch (e) {
      console.error(`Failed to delete from ${collection} in MongoDB`, e);
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
          const combinedFolios = Array.from(new Set([...existing.folios, ...match.folios]));
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

  const updateTeam = (newTeam: TeamMember[]) => {
    setTeam(newTeam);
    saveToDb('team', newTeam, 'id');
  };

  const deleteTeamMember = (memberId: string) => {
    setTeam(prev => prev.filter(t => t.id !== memberId));
    deleteFromDb('team', memberId);
  };
  
  const addTransactions = (newTxs: BrokerageTransaction[]) => {
    setTransactions(prev => {
      const updated = [...prev, ...newTxs];
      saveToDb('transactions', newTxs);
      return updated;
    });
  };

  const addBatch = (batch: ImportBatch) => {
    setBatches(prev => {
      const updated = [batch, ...prev];
      saveToDb('batches', batch);
      return updated;
    });
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
    setInvoices(prev => prev.map(inv => inv.id === updatedInvoice.id ? updatedInvoice : inv));
    saveToDb('invoices', updatedInvoice, 'id');
  };

  const refreshDashboard = () => fetchData();

  const clearAllData = () => {
    if (window.confirm("CRITICAL: Delete all data? This cannot be undone.")) {
      setLoading(true);
      if (isOnline) {
        fetch('/api/data?action=reset', { method: 'DELETE' })
        .then(() => window.location.reload())
        .catch(() => window.location.reload());
      } else {
        // If offline, we can't really clear server DB, but we can reload to reset mock state
        window.location.reload();
      }
    }
  };

  return (
    <DataContext.Provider value={{
      clients,
      updateClients,
      upsertClients,
      deleteClient,
      team,
      updateTeam,
      deleteTeamMember,
      transactions,
      addTransactions,
      batches,
      addBatch,
      globalConfig,
      updateConfig,
      amcMappings,
      schemeMappings,
      updateAmcMappings,
      updateSchemeMappings,
      invoices,
      addInvoice,
      updateInvoice,
      refreshDashboard,
      clearAllData,
      loading,
      isOnline,
      isSyncing
    }}>
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
