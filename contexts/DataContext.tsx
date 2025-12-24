
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Client, TeamMember, BrokerageTransaction, SharingConfig, ImportBatch, MappingEntry } from '../types';
import { MOCK_CLIENTS, MOCK_TEAM, GLOBAL_CONFIG, MOCK_BATCHES } from '../services/mockData';

interface DataContextType {
  clients: Client[];
  updateClients: (clients: Client[]) => void;
  upsertClients: (newClients: Client[]) => void;
  team: TeamMember[];
  updateTeam: (team: TeamMember[]) => void;
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

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const results = await Promise.allSettled([
        fetch('/api/data?type=clients').then(res => res.json()),
        fetch('/api/data?type=team').then(res => res.json()),
        fetch('/api/data?type=batches').then(res => res.json()),
        fetch('/api/data?type=transactions').then(res => res.json()),
        fetch('/api/data?type=amc_mappings').then(res => res.json()),
        fetch('/api/data?type=scheme_mappings').then(res => res.json()),
        fetch('/api/data?type=config').then(res => res.json()),
      ]);

      const [c, t, b, tx, amc, sch, cfg] = results.map(r => r.status === 'fulfilled' ? r.value : []);

      setClients(c.length ? c : MOCK_CLIENTS);
      setTeam(t.length ? t : MOCK_TEAM);
      setBatches(b.length ? b : MOCK_BATCHES);
      setTransactions(tx);
      setAmcMappings(amc);
      setSchemeMappings(sch);
      if (cfg.length) setGlobalConfig(cfg[0]);
      
      setIsOnline(true);
    } catch (err) {
      console.error("Failed to fetch from MongoDB, checking offline status", err);
      setIsOnline(false);
      // Fallback to defaults
      setTeam(MOCK_TEAM);
      setGlobalConfig(GLOBAL_CONFIG);
    } finally {
      setLoading(false);
    }
  }, []);

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

  const updateTeam = (newTeam: TeamMember[]) => {
    setTeam(newTeam);
    saveToDb('team', newTeam, 'id');
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

  const refreshDashboard = () => fetchData();

  const clearAllData = () => {
    if (window.confirm("Delete all data from MongoDB 'wealthflow' database?")) {
      setLoading(true);
      fetch('/api/data?action=reset', { method: 'DELETE' })
        .then(() => window.location.reload())
        .catch(() => {
          alert("Failed to reset database. Check connection.");
          setLoading(false);
        });
    }
  };

  return (
    <DataContext.Provider value={{
      clients,
      updateClients,
      upsertClients,
      team,
      updateTeam,
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
