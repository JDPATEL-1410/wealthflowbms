

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Client, TeamMember, BrokerageTransaction, SharingConfig, ImportBatch, MappingEntry, PayoutInvoice, Role } from '../types';
import { MOCK_CLIENTS, MOCK_TEAM, GLOBAL_CONFIG, MOCK_BATCHES, MOCK_TRANSACTIONS, MOCK_INVOICES } from '../services/mockData';
import { getApiUrl } from '../config/apiConfig';

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
        const params: Record<string, string> = { type };
        if (userId) params.userId = userId;
        if (isAdmin !== undefined) params.isAdmin = isAdmin.toString();
        return getApiUrl('/api/data', params);
      };

      const results = await Promise.allSettled([
        fetch(buildUrl('clients'), { credentials: 'include' }).then(res => res.json()),
        fetch(buildUrl('team'), { credentials: 'include' }).then(res => res.json()),
        fetch(buildUrl('batches'), { credentials: 'include' }).then(res => res.json()),
        fetch(buildUrl('transactions'), { credentials: 'include' }).then(res => res.json()),
        fetch(buildUrl('amc_mappings'), { credentials: 'include' }).then(res => res.json()),
        fetch(buildUrl('scheme_mappings'), { credentials: 'include' }).then(res => res.json()),
        fetch(buildUrl('config'), { credentials: 'include' }).then(res => res.json()),
        fetch(buildUrl('invoices'), { credentials: 'include' }).then(res => res.json()),
        fetch(buildUrl('user_profiles'), { credentials: 'include' }).then(res => res.json()),
      ]);

      const [c, t, b, tx, amc, sch, cfg, inv, profiles] = results.map(r =>
        (r.status === 'fulfilled' && Array.isArray(r.value)) ? r.value : []
      );

      // Set team data - only use mock fallback if the fetch actually failed
      // If it succeeded but returned empty array, that means DB is empty (not an error)
      if (results[1].status === 'fulfilled') {
        setTeam(t);
      } else {
        console.warn("Database team fetch failed, using mock fallback");
        setTeam(MOCK_TEAM);
      }

      // Log user profiles status for debugging
      if (results[8].status === 'fulfilled') {
        console.log(`✅ Loaded ${profiles.length} user profile(s) from database`);
      } else {
        console.warn("⚠️ Failed to load user profiles");
      }

      setClients(c);
      setBatches(b);
      setTransactions(tx);
      setAmcMappings(amc);
      setSchemeMappings(sch);
      setInvoices(inv);

      const configVal = results[6].status === 'fulfilled' ? results[6].value : null;
      if (Array.isArray(configVal) && configVal.length > 0) {
        setGlobalConfig(configVal[0]);
      } else if (results[6].status === 'rejected') {
        // Only use fallback if fetch failed, not if it's just empty
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
      console.log(`💾 Saving ${collection} to database...`);
      const response = await fetch(getApiUrl('/api/data'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ collection, payload, upsertField })
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API request failed: ${response.status} - ${errorText}`);
      }
      console.log(`✅ ${collection} saved successfully`);
      setIsOnline(true);
    } catch (e) {
      console.error(`❌ Failed to save ${collection} to MongoDB:`, e);
      setIsOnline(false);
      throw e; // Re-throw to let caller handle the error
    } finally {
      setIsSyncing(false);
    }
  };

  const deleteFromDb = async (collection: string, id: string) => {
    setIsSyncing(true);
    try {
      const response = await fetch(getApiUrl('/api/data', { type: collection, id }), {
        method: 'DELETE',
        credentials: 'include'
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

  const updateTeam = async (newTeam: TeamMember[]) => {
    console.log('📝 Updating team with', newTeam.length, 'members');
    setTeam(newTeam);
    await saveToDb('team', newTeam, 'id');
    console.log('✅ Team saved to database');
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
    // Step 1: Find all transactions from this batch to identify affected clients
    const transactionsToDelete = transactions.filter(t => t.batchId === batchId);
    const affectedClientIds = [...new Set(transactionsToDelete.map(tx => tx.mappedClientId).filter(Boolean))];

    // Step 2: Remove batch from local state
    setBatches(prev => prev.filter(b => b.id !== batchId));

    // Step 3: Remove all transactions associated with this batch from local state
    setTransactions(prev => prev.filter(t => t.batchId !== batchId));

    // Step 4: Remove orphaned auto-created clients
    // Only remove clients that were auto-created and have no other transactions
    setClients(prev => {
      return prev.filter(client => {
        // Keep manually created clients
        if (!client.id.startsWith('c_auto_')) return true;

        // Keep auto-created clients that are affected but have other transactions
        if (affectedClientIds.includes(client.id)) {
          const hasOtherTransactions = transactions.some(
            tx => tx.mappedClientId === client.id && tx.batchId !== batchId
          );
          return hasOtherTransactions;
        }

        // Keep clients not affected by this batch
        return true;
      });
    });

    // Step 5: Delete from database (backend will cascade delete transactions and orphaned clients)
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
    setInvoices(prev => prev.map(inv => inv.id === updatedInvoice.id ? updatedInvoice : inv));
    saveToDb('invoices', updatedInvoice, 'id');
  };

  const deleteInvoice = (invoiceId: string) => {
    setInvoices(prev => prev.filter(inv => inv.id !== invoiceId));
    deleteFromDb('invoices', invoiceId);
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
