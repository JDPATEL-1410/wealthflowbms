
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Client, TeamMember, BrokerageTransaction, SharingConfig, ImportBatch, MappingEntry, PayoutInvoice, Role } from '../types';
import { MOCK_CLIENTS, MOCK_TEAM, GLOBAL_CONFIG, MOCK_BATCHES, MOCK_TRANSACTIONS, MOCK_INVOICES } from '../services/mockData';

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
  refreshDashboard: (currentUser?: TeamMember) => void;
  clearAllData: () => void;
  loading: boolean;
  isOnline: boolean;
  isSyncing: boolean;
  setCurrentUser: (user: TeamMember | null) => void;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

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

  const fetchData = useCallback(async (user?: TeamMember) => {
    setLoading(true);
    try {
      const activeUser = user || currentUser;
      const userId = activeUser?.id || '';
      const isAdmin = activeUser?.role === Role.ADMIN;

      // Build query params for user-specific filtering
      const buildUrl = (type: string) => {
        const params = new URLSearchParams({ type });
        if (userId) params.append('userId', userId);
        if (isAdmin !== undefined) params.append('isAdmin', isAdmin.toString());
        return `/api/data?${params.toString()}`;
      };

      const results = await Promise.allSettled([
        fetch(buildUrl('clients')).then(res => res.json()),
        fetch(buildUrl('team')).then(res => res.json()),
        fetch(buildUrl('batches')).then(res => res.json()),
        fetch(buildUrl('transactions')).then(res => res.json()),
        fetch(buildUrl('amc_mappings')).then(res => res.json()),
        fetch(buildUrl('scheme_mappings')).then(res => res.json()),
        fetch(buildUrl('config')).then(res => res.json()),
        fetch(buildUrl('invoices')).then(res => res.json()),
      ]);

      const [c, t, b, tx, amc, sch, cfg, inv] = results.map(r =>
        (r.status === 'fulfilled' && Array.isArray(r.value)) ? r.value : []
      );

      setClients(c);
      setTeam(t.length > 0 ? t : MOCK_TEAM);
      setBatches(b);
      setTransactions(tx);
      setAmcMappings(amc);
      setSchemeMappings(sch);
      setInvoices(inv);

      const configVal = results[6].status === 'fulfilled' ? results[6].value : null;
      if (Array.isArray(configVal) && configVal.length > 0) {
        setGlobalConfig(configVal[0]);
      } else {
        setGlobalConfig(GLOBAL_CONFIG);
      }

      setIsOnline(true);
    } catch (err) {
      console.error("Critical: Backend API unavailable.", err);
      setIsOnline(false);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const saveToDb = async (collection: string, payload: any, upsertField?: string) => {
    setIsSyncing(true);
    try {
      const response = await fetch('/api/data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collection, payload, upsertField })
      });
      if (!response.ok) throw new Error('API request failed');
      setIsOnline(true);
    } catch (e) {
      console.error(`Failed to save ${collection} to MongoDB`, e);
      setIsOnline(false);
    } finally {
      setIsSyncing(false);
    }
  };

  const deleteFromDb = async (collection: string, id: string) => {
    setIsSyncing(true);
    try {
      const response = await fetch(`/api/data?type=${collection}&id=${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Delete API request failed');
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

  const refreshDashboard = (user?: TeamMember) => fetchData(user);

  const clearAllData = () => {
    if (window.confirm("CRITICAL: Delete all data from MongoDB? This cannot be undone.")) {
      setLoading(true);
      fetch('/api/data?action=reset', { method: 'DELETE' })
        .then(() => window.location.reload())
        .catch(() => {
          alert("Failed to reset database.");
          setLoading(false);
        });
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
      isSyncing,
      setCurrentUser
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
