
import React, { useState, useMemo } from 'react';
import { Users, Search, Plus, Edit2, X, UserCheck, Shield, ChevronRight, Tags, Building, Database, Save, AlertCircle, Key, Copy, Check, Mail, Trash2, RefreshCcw, UserPlus } from 'lucide-react';
import { Client, TeamMember, Role, MappingEntry } from '../types';
import { useData } from '../contexts/DataContext';

interface ClientsAndHierarchyProps {
  currentUser: TeamMember;
}

export const ClientsAndHierarchy: React.FC<ClientsAndHierarchyProps> = ({ currentUser }) => {
  const { clients, updateClients, deleteClient, team, updateTeam, deleteTeamMember, globalConfig, transactions, amcMappings, schemeMappings, updateAmcMappings, updateSchemeMappings } = useData();

  const isAdmin = currentUser.role === Role.ADMIN;
  const [activeTab, setActiveTab] = useState<'hierarchy' | 'clients' | 'standardize'>(isAdmin ? 'hierarchy' : 'clients');
  const [standardizeType, setStandardizeType] = useState<'amc' | 'scheme'>('amc');

  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [memberForm, setMemberForm] = useState<Partial<TeamMember>>({
    name: '', code: '', role: Role.OPS, level: 6, email: '', password: ''
  });

  const [clientForm, setClientForm] = useState<Partial<Client>>({
    name: '', pan: '', folios: []
  });

  const [isMappingModalOpen, setIsMappingModalOpen] = useState(false);
  const [selectedClientForMapping, setSelectedClientForMapping] = useState<Client | null>(null);
  const [mappingForm, setMappingForm] = useState<Client['hierarchy'] | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // --- Data Standardizer Logic ---
  const uniqueNamesFound = useMemo(() => {
    const amcs = new Set<string>();
    const schemes = new Set<string>();

    transactions.forEach(tx => {
      if (tx.amcName) amcs.add(tx.amcName);
      if (tx.schemeName) schemes.add(tx.schemeName);
    });

    amcMappings.forEach(m => amcs.add(m.original));
    schemeMappings.forEach(m => schemes.add(m.original));

    return {
      amcs: Array.from(amcs).sort(),
      schemes: Array.from(schemes).sort()
    };
  }, [transactions, amcMappings, schemeMappings]);

  const [localAmcMappings, setLocalAmcMappings] = useState<Record<string, string>>({});
  const [localSchemeMappings, setLocalSchemeMappings] = useState<Record<string, string>>({});

  React.useEffect(() => {
    const amcMap: Record<string, string> = {};
    amcMappings.forEach(m => amcMap[m.original] = m.standard);
    setLocalAmcMappings(amcMap);

    const schemeMap: Record<string, string> = {};
    schemeMappings.forEach(m => schemeMap[m.original] = m.standard);
    setLocalSchemeMappings(schemeMap);
  }, [amcMappings, schemeMappings, activeTab]);

  const handleSaveStandardization = () => {
    const amcs: MappingEntry[] = Object.entries(localAmcMappings).map(([original, standard]) => ({
      original,
      standard: (standard as string).trim() || original
    }));
    const schemes: MappingEntry[] = Object.entries(localSchemeMappings).map(([original, standard]) => ({
      original,
      standard: (standard as string).trim() || original
    }));
    updateAmcMappings(amcs);
    updateSchemeMappings(schemes);
    alert('Success: Standardization rules have been updated and applied.');
  };

  const filteredClients = useMemo(() => {
    return clients.filter(c => {
      let hasAccess = false;
      if (isAdmin || currentUser.level === 0 || currentUser.level === 1) {
        hasAccess = true;
      } else {
        const h = c.hierarchy;
        hasAccess = h.level6Id === currentUser.id ||
          h.level5Id === currentUser.id ||
          h.level4Id === currentUser.id ||
          h.level3Id === currentUser.id ||
          h.level2Id === currentUser.id;
      }
      if (!hasAccess) return false;
      return c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.pan.toLowerCase().includes(searchTerm.toLowerCase());
    });
  }, [clients, searchTerm, currentUser, isAdmin]);

  const teamByLevel = useMemo(() => {
    const levels: Record<number, TeamMember[]> = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
    team.forEach(m => {
      if (levels[m.level]) levels[m.level].push(m);
    });
    return levels;
  }, [team]);

  const openTeamModal = (member?: TeamMember) => {
    if (!isAdmin) return;
    if (member) {
      setEditingMember(member);
      setMemberForm(member);
    } else {
      setEditingMember(null);
      setMemberForm({ name: '', code: '', role: Role.OPS, level: 6, email: '', password: '' });
    }
    setIsTeamModalOpen(true);
  };

  const saveTeamMember = async () => {
    // Validation
    if (!memberForm.name || !memberForm.code) {
      alert("❌ Name and Code are required.");
      return;
    }

    // Check for login credentials if creating new user
    if (!editingMember) {
      if (!memberForm.email || !memberForm.password) {
        const confirm = window.confirm(
          "⚠️ No login credentials provided!\n\n" +
          "Email and Password are required for the user to sign in.\n\n" +
          "Do you want to continue anyway? (User won't be able to log in)"
        );
        if (!confirm) return;
      }
    }

    try {
      if (editingMember) {
        await updateTeam(team.map(m => m.id === editingMember.id ? { ...m, ...memberForm } as TeamMember : m));
        alert(`✅ User "${memberForm.name}" updated successfully!`);
      } else {
        const newMember: TeamMember = {
          id: `tm_${Date.now()}`,
          name: memberForm.name!,
          code: memberForm.code!,
          role: memberForm.role || Role.OPS,
          level: memberForm.level ?? 6,
          email: memberForm.email,
          password: memberForm.password
        };

        console.log('Creating new user:', newMember);
        await updateTeam([...team, newMember]);
        console.log('User saved to database');

        // Success message with login credentials
        const loginInfo = memberForm.email && memberForm.password
          ? `\n\n📧 Login Email: ${memberForm.email}\n🔑 Password: ${memberForm.password}\n\n✅ User can now sign in!\n\n💾 User has been saved to database and will persist across refreshes.`
          : `\n\n⚠️ No login credentials set - user cannot sign in yet.`;

        alert(`✅ User "${memberForm.name}" created successfully!${loginInfo}`);
      }
      setIsTeamModalOpen(false);
    } catch (error: any) {
      console.error('Error saving team member:', error);
      alert(`❌ Failed to save user: ${error.message || 'Please try again.'}`);
    }
  };

  const handleDeleteTeamMember = (member: TeamMember) => {
    if (member.id === currentUser.id) {
      alert("Error: You cannot delete your own account.");
      return;
    }

    const isUsedInClients = clients.some(c => Object.values(c.hierarchy).includes(member.id));
    const message = isUsedInClients
      ? `Warning: ${member.name} is mapped to active clients. Deleting them will leave those layers unassigned. Are you sure?`
      : `Permanently delete ${member.name}?`;

    if (window.confirm(message)) {
      deleteTeamMember(member.id);
    }
  };

  const openClientModal = (client?: Client) => {
    if (client) {
      setEditingClient(client);
      setClientForm({ ...client });
    } else {
      setEditingClient(null);
      setClientForm({ name: '', pan: '', folios: [] });
    }
    setIsClientModalOpen(true);
  };

  const saveClient = () => {
    if (!clientForm.name || !clientForm.pan) {
      alert("❌ Name and PAN are required.");
      return;
    }

    if (editingClient) {
      updateClients(clients.map(c => c.id === editingClient.id ? { ...c, ...clientForm } as Client : c));
      alert(`✅ Client "${clientForm.name}" updated successfully!`);
    } else {
      const hierarchy = {
        level0Id: '', level1Id: '', level2Id: '', level3Id: '', level4Id: '', level5Id: '', level6Id: ''
      };

      // Auto-assign hierarchy for non-admins based on their login level
      if (!isAdmin) {
        const userLevelKey = `level${currentUser.level}Id` as keyof typeof hierarchy;
        hierarchy[userLevelKey] = currentUser.id;
        hierarchy.level1Id = 'tm1'; // Default house
      }

      const newClient: Client = {
        id: `cl_${Date.now()}`,
        name: clientForm.name!,
        pan: clientForm.pan!.toUpperCase(),
        folios: clientForm.folios || [],
        hierarchy
      };
      updateClients([...clients, newClient]);
      alert(`✅ Client "${clientForm.name}" created successfully!\n\n📋 PAN: ${clientForm.pan!.toUpperCase()}\n📁 Folios: ${clientForm.folios?.length || 0}`);
    }
    setIsClientModalOpen(false);
  };

  const handleDeleteClient = (client: Client) => {
    if (window.confirm(`Are you sure you want to delete client "${client.name}"?`)) {
      deleteClient(client.id);
    }
  };

  const handleCopyCredentials = (member: TeamMember) => {
    const text = `WealthFlow BMS Credentials\n--------------------------\nUser: ${member.name}\nLogin ID: ${member.email || member.code}\nPassword: ${member.password || 'Not Set'}\nLink: wealthflow.bms.app/login`;
    navigator.clipboard.writeText(text);
    setCopiedId(member.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const openMappingModal = (client: Client) => {
    if (!isAdmin) return;
    setSelectedClientForMapping(client);
    setMappingForm({ ...client.hierarchy });
    setIsMappingModalOpen(true);
  };

  const saveMapping = () => {
    if (selectedClientForMapping && mappingForm) {
      updateClients(clients.map(c =>
        c.id === selectedClientForMapping.id ? { ...c, hierarchy: mappingForm } : c
      ));
      setIsMappingModalOpen(false);
    }
  };

  const getLevelLabel = (level: number) => {
    const name = globalConfig.levelNames[level as keyof typeof globalConfig.levelNames];
    return name ? `Level ${level} (${name})` : `Level ${level}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{isAdmin ? 'Clients & Hierarchy' : 'My Mapped Clients'}</h1>
          <p className="text-slate-500 mt-1">
            {isAdmin
              ? 'Manage global team structure and client mapping.'
              : `Viewing ${filteredClients.length} clients mapped to your profile.`}
          </p>
        </div>
        <div className="flex space-x-2 self-start">
          {activeTab === 'clients' && (
            <button onClick={() => openClientModal()} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 flex items-center shadow-lg shadow-blue-100 transition">
              <Plus className="w-4 h-4 mr-2" /> New Client
            </button>
          )}
          {isAdmin && (
            <div className="flex space-x-2 bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
              <button onClick={() => setActiveTab('hierarchy')} className={`flex items-center px-4 py-2 text-sm font-bold rounded-md transition ${activeTab === 'hierarchy' ? 'bg-blue-100 text-blue-700' : 'text-slate-600 hover:text-slate-900'}`}><Shield className="w-4 h-4 mr-2" />Hierarchy</button>
              <button onClick={() => setActiveTab('clients')} className={`flex items-center px-4 py-2 text-sm font-bold rounded-md transition ${activeTab === 'clients' ? 'bg-blue-100 text-blue-700' : 'text-slate-600 hover:text-slate-900'}`}><Users className="w-4 h-4 mr-2" />Clients</button>
              <button onClick={() => setActiveTab('standardize')} className={`flex items-center px-4 py-2 text-sm font-bold rounded-md transition ${activeTab === 'standardize' ? 'bg-blue-100 text-blue-700' : 'text-slate-600 hover:text-slate-900'}`}><Tags className="w-4 h-4 mr-2" />Standardizer</button>
            </div>
          )}
        </div>
      </div>

      {isAdmin && activeTab === 'hierarchy' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50">
            <h3 className="text-lg font-bold text-slate-900">Team Structure</h3>
            <button onClick={() => openTeamModal()} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-700 flex items-center shadow-lg shadow-blue-100 transition"><UserPlus className="w-4 h-4 mr-2" />Add New User</button>
          </div>
          <table className="w-full text-sm text-left">
            <thead className="bg-white text-slate-500 font-bold border-b border-slate-200 uppercase tracking-widest text-[10px]">
              <tr>
                <th className="px-6 py-4">Name & Login ID</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Hierarchy Level</th>
                <th className="px-6 py-4">Credentials</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {team.sort((a, b) => (a.level) - (b.level)).map((member) => (
                <tr key={member.id} className="hover:bg-slate-50 group transition">
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-900">{member.name}</div>
                    <div className="text-xs text-slate-500 font-medium">{member.email || member.code}</div>
                  </td>
                  <td className="px-6 py-4"><span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black uppercase bg-slate-100 text-slate-800 border border-slate-200">{member.role}</span></td>
                  <td className="px-6 py-4 font-medium text-slate-600">{getLevelLabel(member.level)}</td>
                  <td className="px-6 py-4">
                    {member.password ? (
                      <button
                        onClick={() => handleCopyCredentials(member)}
                        className={`flex items-center px-2 py-1 rounded-md text-xs font-bold transition ${copiedId === member.id ? 'bg-green-100 text-green-700' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}`}
                      >
                        {copiedId === member.id ? <Check className="w-3 h-3 mr-1" /> : <Copy className="w-3 h-3 mr-1" />}
                        {copiedId === member.id ? 'Copied' : 'Share Login'}
                      </button>
                    ) : (
                      <span className="text-[10px] text-slate-400 font-bold uppercase italic tracking-tighter">No Pwd Set</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end space-x-1">
                      <button onClick={() => openTeamModal(member)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition" title="Edit User"><Edit2 className="w-4 h-4" /></button>
                      <button
                        onClick={() => handleDeleteTeamMember(member)}
                        disabled={member.id === currentUser.id}
                        className={`p-2 rounded-full transition ${member.id === currentUser.id ? 'text-slate-200 cursor-not-allowed' : 'text-slate-400 hover:text-red-600 hover:bg-red-50'}`}
                        title={member.id === currentUser.id ? "Cannot delete yourself" : "Delete User"}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'clients' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col h-[calc(100vh-12rem)]">
          <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row gap-4 justify-between bg-slate-50">
            <div className="relative w-full sm:max-w-md">
              <Search className="absolute left-3 top-2.5 text-slate-400 w-4 h-4" />
              <input type="text" placeholder="Search my clients..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 pr-4 py-2 w-full border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 shadow-inner bg-white font-medium" />
            </div>
          </div>
          <div className="overflow-auto flex-1">
            <table className="w-full text-sm text-left">
              <thead className="bg-white text-slate-500 font-bold border-b border-slate-200 sticky top-0 z-10 uppercase tracking-widest text-[10px]">
                <tr>
                  <th className="px-6 py-4">Client Name</th>
                  <th className="px-6 py-4">PAN</th>
                  {!isAdmin && <th className="px-6 py-4">Folios</th>}
                  {isAdmin && <th className="px-6 py-4">Current L6</th>}
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredClients.map((client) => {
                  const l6 = team.find(t => t.id === client.hierarchy.level6Id);
                  return (
                    <tr key={client.id} className="hover:bg-slate-50 transition">
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900">{client.name}</div>
                        {!isAdmin && <div className="text-[10px] text-blue-500 uppercase font-black tracking-tighter mt-0.5">Assigned to Me</div>}
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-slate-500">{client.pan}</td>
                      {!isAdmin && <td className="px-6 py-4 text-slate-500 text-xs font-medium truncate max-w-[200px]">{client.folios.join(', ')}</td>}
                      {isAdmin && <td className="px-6 py-4 text-slate-700 font-medium">{l6 ? l6.name : <span className="text-red-400 italic">Unassigned</span>}</td>}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          {isAdmin && (
                            <button onClick={() => openMappingModal(client)} className="text-blue-600 hover:text-blue-800 font-bold text-xs border border-blue-200 hover:bg-blue-50 px-3 py-1.5 rounded-md transition flex items-center shadow-sm"><UserCheck className="w-3 h-3 mr-1.5" /> Map</button>
                          )}
                          <button onClick={() => openClientModal(client)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition" title="Edit Client"><Edit2 className="w-4 h-4" /></button>
                          <button onClick={() => handleDeleteClient(client)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition" title="Delete Client"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {isAdmin && activeTab === 'standardize' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1 bg-white rounded-xl border border-slate-200 shadow-sm p-4 h-fit">
            <h3 className="font-bold text-slate-900 mb-4 flex items-center uppercase tracking-wider text-xs"><Database className="w-4 h-4 mr-2 text-blue-600" /> Options</h3>
            <div className="space-y-2">
              <button onClick={() => setStandardizeType('amc')} className={`w-full text-left px-4 py-3 rounded-lg text-sm font-bold transition ${standardizeType === 'amc' ? 'bg-blue-50 text-blue-700 border border-blue-100 shadow-sm shadow-blue-50' : 'hover:bg-slate-50 text-slate-600'}`}>Map AMCs</button>
              <button onClick={() => setStandardizeType('scheme')} className={`w-full text-left px-4 py-3 rounded-lg text-sm font-bold transition ${standardizeType === 'scheme' ? 'bg-blue-50 text-blue-700 border border-blue-100 shadow-sm shadow-blue-50' : 'hover:bg-slate-50 text-slate-600'}`}>Map Schemes</button>
            </div>
            <div className="mt-6 pt-6 border-t border-slate-100">
              <button onClick={handleSaveStandardization} className="w-full bg-blue-600 text-white px-4 py-2.5 rounded-lg text-sm font-bold flex items-center justify-center hover:bg-blue-700 transition shadow-lg shadow-blue-100">
                <Save className="w-4 h-4 mr-2" /> Save Grouping Rules
              </button>
            </div>
          </div>

          <div className="lg:col-span-3 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[calc(100vh-12rem)]">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <h3 className="font-black text-slate-900 uppercase tracking-tighter text-sm">Standardize {standardizeType === 'amc' ? 'AMC' : 'Scheme'} Names</h3>
              <div className="text-xs font-bold text-slate-500 bg-white border border-slate-200 px-3 py-1.5 rounded-full shadow-sm">
                {standardizeType === 'amc' ? uniqueNamesFound.amcs.length : uniqueNamesFound.schemes.length} Names Found
              </div>
            </div>

            <div className="p-4 bg-emerald-50 border-b border-emerald-100 flex items-start">
              <RefreshCcw className="w-4 h-4 text-emerald-600 mr-3 mt-0.5 animate-spin-slow" />
              <p className="text-xs text-emerald-700 leading-relaxed font-bold uppercase tracking-tight">
                Auto-Mapping Active: Newly discovered names are automatically registered. Use this table only for custom grouping or name corrections.
              </p>
            </div>

            <div className="overflow-auto flex-1">
              <table className="w-full text-sm text-left">
                <thead className="bg-white border-b border-slate-200 sticky top-0 z-10">
                  <tr>
                    <th className="px-6 py-4 text-slate-500 font-bold uppercase tracking-widest text-[10px]">Imported Name (Original)</th>
                    <th className="px-6 py-4 text-slate-500 font-bold uppercase tracking-widest text-[10px]">Standardized Payout Name</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(standardizeType === 'amc' ? uniqueNamesFound.amcs : uniqueNamesFound.schemes).map((name) => (
                    <tr key={name} className="hover:bg-slate-50 transition">
                      <td className="px-6 py-4 font-bold text-slate-700 truncate max-w-xs" title={name}>{name}</td>
                      <td className="px-6 py-4">
                        <input
                          type="text"
                          placeholder={name}
                          value={(standardizeType === 'amc' ? localAmcMappings[name] : localSchemeMappings[name]) || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (standardizeType === 'amc') {
                              setLocalAmcMappings(prev => ({ ...prev, [name]: val }));
                            } else {
                              setLocalSchemeMappings(prev => ({ ...prev, [name]: val }));
                            }
                          }}
                          className="w-full border border-slate-200 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-blue-500 bg-white font-bold text-blue-700 placeholder:text-slate-300 placeholder:font-normal"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Admin Mapping Modal */}
      {isAdmin && isMappingModalOpen && selectedClientForMapping && mappingForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95">
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-white">
              <h3 className="font-black text-xl text-slate-900 tracking-tighter uppercase">Map Hierarchy: {selectedClientForMapping.name}</h3>
              <button onClick={() => setIsMappingModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition"><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/50 max-h-[70vh] overflow-y-auto">
              {[0, 1, 2, 3, 4, 5, 6].sort((a, b) => a - b).map((level) => (
                <div key={level} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm transition-all hover:shadow-md">
                  <label className="block text-[10px] font-black uppercase text-slate-400 mb-2 tracking-widest">{getLevelLabel(level)}</label>
                  <select
                    value={mappingForm[`level${level}Id` as keyof typeof mappingForm] || ''}
                    onChange={(e) => setMappingForm({ ...mappingForm, [`level${level}Id`]: e.target.value } as any)}
                    className="w-full border border-slate-200 rounded-lg text-sm px-4 py-2.5 font-bold text-slate-700 bg-slate-50/30 focus:ring-2 focus:ring-blue-500 transition"
                  >
                    <option value="">-- Select Authority --</option>
                    {(teamByLevel[level] || []).map(u => (
                      <option key={u.id} value={u.id}>{u.name} ({u.code})</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
            <div className="px-6 py-5 bg-white border-t border-slate-100 flex justify-end space-x-3">
              <button onClick={() => setIsMappingModalOpen(false)} className="px-5 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-50 rounded-lg transition">Cancel</button>
              <button onClick={saveMapping} className="px-6 py-2.5 text-sm bg-blue-600 text-white rounded-lg font-bold shadow-lg shadow-blue-100 hover:bg-blue-700 transition">Confirm Mapping</button>
            </div>
          </div>
        </div>
      )}

      {/* Team Member Modal */}
      {isAdmin && isTeamModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-0 overflow-hidden animate-in zoom-in-95">
            <div className="px-6 py-5 border-b border-slate-100 bg-white flex justify-between items-center">
              <h3 className="font-black text-xl text-slate-900 tracking-tighter uppercase">{editingMember ? 'Update Profile' : 'Create New User'}</h3>
              <button onClick={() => setIsTeamModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition"><X className="w-5 h-5 text-slate-400" /></button>
            </div>

            <div className="p-8 space-y-6 bg-slate-50/50">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 sm:col-span-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Full Name</label>
                  <input type="text" placeholder="John Doe" value={memberForm.name} onChange={e => setMemberForm({ ...memberForm, name: e.target.value })} className="w-full border border-slate-200 p-3 rounded-xl mt-1.5 font-bold focus:ring-2 focus:ring-blue-500 transition" />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Internal ID / Code</label>
                  <input type="text" placeholder="EMP-001" value={memberForm.code} onChange={e => setMemberForm({ ...memberForm, code: e.target.value })} className="w-full border border-slate-200 p-3 rounded-xl mt-1.5 font-bold focus:ring-2 focus:ring-blue-500 transition uppercase" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                <div className="col-span-2 sm:col-span-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">System Role</label>
                  <select value={memberForm.role} onChange={e => setMemberForm({ ...memberForm, role: e.target.value as Role })} className="w-full border border-slate-200 p-3 rounded-xl mt-1.5 font-bold focus:ring-2 focus:ring-blue-500 transition bg-white">
                    <option value={Role.ADMIN}>ADMIN</option>
                    <option value={Role.OPS}>OPS</option>
                    <option value={Role.FINANCE}>FINANCE</option>
                    <option value={Role.VIEWER}>VIEWER</option>
                  </select>
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Hierarchy Layer</label>
                  <select value={memberForm.level} onChange={e => setMemberForm({ ...memberForm, level: Number(e.target.value) })} className="w-full border border-slate-200 p-3 rounded-xl mt-1.5 font-bold focus:ring-2 focus:ring-blue-500 transition bg-white">
                    {[0, 1, 2, 3, 4, 5, 6].map(l => <option key={l} value={l}>Level {l}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-slate-100">
                <h4 className="flex items-center text-xs font-black text-blue-600 uppercase tracking-widest"><Key className="w-4 h-4 mr-2" /> Login Credentials</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center"><Mail className="w-3 h-3 mr-1" /> Login ID / Email</label>
                    <input type="email" placeholder="user@company.com" value={memberForm.email || ''} onChange={e => setMemberForm({ ...memberForm, email: e.target.value })} className="w-full border border-slate-200 p-3 rounded-xl mt-1.5 font-bold text-sm" />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center"><Shield className="w-3 h-3 mr-1" /> Password</label>
                    <input type="text" placeholder="Set Password" value={memberForm.password || ''} onChange={e => setMemberForm({ ...memberForm, password: e.target.value })} className="w-full border border-slate-200 p-3 rounded-xl mt-1.5 font-bold text-sm" />
                  </div>
                </div>
              </div>
            </div>

            <div className="px-8 py-6 bg-white border-t border-slate-100 flex justify-end space-x-3">
              <button onClick={() => setIsTeamModalOpen(false)} className="px-5 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-50 rounded-xl transition">Discard</button>
              <button onClick={saveTeamMember} className="px-8 py-2.5 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-100 hover:bg-blue-700 transition">Save User Profile</button>
            </div>
          </div>
        </div>
      )}

      {/* Client Modal */}
      {isClientModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-0 overflow-hidden animate-in zoom-in-95">
            <div className="px-6 py-5 border-b border-slate-100 bg-white flex justify-between items-center">
              <h3 className="font-black text-xl text-slate-900 tracking-tighter uppercase">{editingClient ? 'Edit Client' : 'Add New Client'}</h3>
              <button onClick={() => setIsClientModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition"><X className="w-5 h-5 text-slate-400" /></button>
            </div>

            <div className="p-8 space-y-6 bg-slate-50/50">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Investor/Company Name</label>
                <input type="text" placeholder="Aditya Birla Group" value={clientForm.name || ''} onChange={e => setClientForm({ ...clientForm, name: e.target.value })} className="w-full border border-slate-200 p-3 rounded-xl mt-1.5 font-bold focus:ring-2 focus:ring-blue-500 transition" />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">PAN Number</label>
                <input type="text" placeholder="ABCDE1234F" value={clientForm.pan || ''} onChange={e => setClientForm({ ...clientForm, pan: e.target.value })} className="w-full border border-slate-200 p-3 rounded-xl mt-1.5 font-bold focus:ring-2 focus:ring-blue-500 transition uppercase" />
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Folios (comma separated)</label>
                <input
                  type="text"
                  placeholder="1001001, 1001002"
                  value={clientForm.folios?.join(', ') || ''}
                  onChange={e => setClientForm({ ...clientForm, folios: e.target.value.split(',').map(f => f.trim()).filter(f => f) })}
                  className="w-full border border-slate-200 p-3 rounded-xl mt-1.5 font-bold focus:ring-2 focus:ring-blue-500 transition"
                />
              </div>
              {!isAdmin && (
                <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl flex items-start">
                  <AlertCircle className="w-4 h-4 text-blue-600 mr-3 mt-0.5" />
                  <p className="text-[10px] text-blue-700 font-bold uppercase tracking-tight">
                    Note: This client will be automatically mapped to your hierarchy level for brokerage tracking.
                  </p>
                </div>
              )}
            </div>

            <div className="px-8 py-6 bg-white border-t border-slate-100 flex justify-end space-x-3">
              <button onClick={() => setIsClientModalOpen(false)} className="px-5 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-50 rounded-xl transition">Cancel</button>
              <button onClick={saveClient} className="px-8 py-2.5 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-100 hover:bg-blue-700 transition">Save Client</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
