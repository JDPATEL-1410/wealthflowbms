
import React, { useState, useMemo } from 'react';
import { Users, Search, Plus, Edit2, X, UserCheck, Shield, ChevronRight, Tags, Database, Save, Key, Copy, Check, Mail, Trash2, UserPlus } from 'lucide-react';
import { Client, TeamMember, Role } from '../types';
import { useData } from '../contexts/DataContext';

interface ClientsAndHierarchyProps {
    currentUser: TeamMember;
}

export const ClientsAndHierarchy: React.FC<ClientsAndHierarchyProps> = ({ currentUser }) => {
  const { clients, updateClients, deleteClient, team, updateTeam, deleteTeamMember, globalConfig, amcMappings, schemeMappings, updateAmcMappings, updateSchemeMappings } = useData();
  
  const isAdmin = currentUser.role === Role.ADMIN;
  const [activeTab, setActiveTab] = useState<'hierarchy' | 'clients' | 'standardize'>(isAdmin ? 'hierarchy' : 'clients');
  
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

  const filteredClients = useMemo(() => {
    return clients.filter(c => {
      let hasAccess = false;
      if (isAdmin || currentUser.level === 0 || currentUser.level === 1) {
        hasAccess = true;
      } else {
        const h = c.hierarchy;
        const userLevelKey = `level${currentUser.level}Id` as keyof typeof h;
        hasAccess = h[userLevelKey] === currentUser.id;
      }
      if (!hasAccess) return false;
      return c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
             c.pan.toLowerCase().includes(searchTerm.toLowerCase());
    });
  }, [clients, searchTerm, currentUser, isAdmin]);

  const openTeamModal = (member?: TeamMember) => {
    if (!isAdmin) return;
    if (member) {
      setEditingMember(member);
      setMemberForm(member);
    } else {
      setEditingMember(null);
      setMemberForm({ name: '', code: '', role: Role.OPS, level: 6, email: '', password: 'user@123' });
    }
    setIsTeamModalOpen(true);
  };

  const saveTeamMember = () => {
    if (!memberForm.name || !memberForm.code || !memberForm.email || !memberForm.password) {
        alert("Required fields missing.");
        return;
    }
    if (editingMember) {
      updateTeam(team.map(m => m.id === editingMember.id ? { ...m, ...memberForm } as TeamMember : m));
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
      updateTeam([...team, newMember]);
    }
    setIsTeamModalOpen(false);
  };

  const openClientModal = (client?: Client) => {
    if (!isAdmin) return;
    if (client) {
      setEditingClient(client);
      setClientForm(client);
    } else {
      setEditingClient(null);
      setClientForm({ name: '', pan: '', folios: [] });
    }
    setIsClientModalOpen(true);
  };

  const saveClient = () => {
    if (!clientForm.name || !clientForm.pan) {
        alert("Required fields missing.");
        return;
    }
    if (editingClient) {
      updateClients(clients.map(c => c.id === editingClient.id ? { ...c, ...clientForm } as Client : c));
    } else {
      const newClient: Client = {
        ...clientForm as Client,
        id: `c_${Date.now()}`,
        folios: clientForm.folios || [],
        hierarchy: {
            level6Id: '', level5Id: '', level4Id: '', level3Id: '', level2Id: '', level1Id: 'admin_root', level0Id: ''
        }
      };
      updateClients([...clients, newClient]);
    }
    setIsClientModalOpen(false);
  };

  const handleCopyCredentials = (member: TeamMember) => {
      const text = `System Access:\nEmail: ${member.email}\nPassword: ${member.password}`;
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{isAdmin ? 'Enterprise Management' : 'Linked Portfolios'}</h1>
          <p className="text-slate-500 mt-1 font-medium">
             {isAdmin ? 'System-wide client mapping and hierarchy control.' : 'Your active investors and mapped schemes.'}
          </p>
        </div>
        <div className="flex space-x-2 bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
           {isAdmin && (
             <button onClick={() => setActiveTab('hierarchy')} className={`flex items-center px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition ${activeTab === 'hierarchy' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-900'}`}><Shield className="w-3.5 h-3.5 mr-2" />Hierarchy</button>
           )}
           <button onClick={() => setActiveTab('clients')} className={`flex items-center px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition ${activeTab === 'clients' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-900'}`}><Users className="w-3.5 h-3.5 mr-2" />Clients</button>
        </div>
      </div>

      {activeTab === 'hierarchy' && isAdmin && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Active System Accounts</h3>
                <button onClick={() => openTeamModal()} className="bg-blue-600 text-white px-5 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-700 flex items-center shadow-lg shadow-blue-50 transition"><UserPlus className="w-3.5 h-3.5 mr-2" />New User Account</button>
            </div>
            <table className="w-full text-sm text-left">
              <thead className="bg-white text-slate-400 font-black border-b border-slate-200 uppercase tracking-widest text-[9px]">
                  <tr>
                      <th className="px-6 py-4">User Details</th>
                      <th className="px-6 py-4">Role & Level</th>
                      <th className="px-6 py-4">Credentials</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                  {team.sort((a,b) => (a.level) - (b.level)).map((member) => (
                  <tr key={member.id} className="hover:bg-slate-50 transition">
                      <td className="px-6 py-4">
                          <div className="font-bold text-slate-900">{member.name}</div>
                          <div className="text-xs text-slate-500">{member.email}</div>
                      </td>
                      <td className="px-6 py-4">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-black uppercase bg-slate-100 text-slate-600 border border-slate-200 mr-2">{member.role}</span>
                          <span className="font-bold text-slate-600">L{member.level}</span>
                      </td>
                      <td className="px-6 py-4">
                          <button onClick={() => handleCopyCredentials(member)} className={`flex items-center px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition border ${copiedId === member.id ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-100'}`}>
                              {copiedId === member.id ? <Check className="w-3 h-3 mr-2" /> : <Copy className="w-3 h-3 mr-2" />}
                              Copy Access
                          </button>
                      </td>
                      <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end space-x-2">
                              <button onClick={() => openTeamModal(member)} className="p-2 text-slate-400 hover:text-blue-600"><Edit2 className="w-4 h-4" /></button>
                              <button onClick={() => deleteTeamMember(member.id)} disabled={member.id === currentUser.id} className="p-2 text-slate-400 hover:text-red-600 disabled:opacity-20"><Trash2 className="w-4 h-4" /></button>
                          </div>
                      </td>
                  </tr>
                  ))}
              </tbody>
            </table>
        </div>
      )}

      {activeTab === 'clients' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col h-[calc(100vh-14rem)]">
          <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row gap-4 justify-between bg-slate-50">
             <div className="relative w-full sm:max-w-md">
                <Search className="absolute left-3 top-2.5 text-slate-400 w-4 h-4" />
                <input type="text" placeholder="Search portfolios..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10 pr-4 py-2 w-full border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 bg-white font-bold" />
             </div>
             {isAdmin && (
                <button onClick={() => openClientModal()} className="bg-blue-600 text-white px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-700 shadow-lg shadow-blue-50 transition flex items-center"><Plus className="w-4 h-4 mr-2" /> Add Client</button>
             )}
          </div>
          <div className="overflow-auto flex-1">
            <table className="w-full text-sm text-left">
                <thead className="bg-white text-slate-400 font-black border-b border-slate-200 sticky top-0 z-10 uppercase tracking-widest text-[9px]">
                <tr>
                    <th className="px-6 py-4">Investor Identity</th>
                    <th className="px-6 py-4">PAN / Folios</th>
                    {isAdmin && <th className="px-6 py-4">Assigned Manager (L6)</th>}
                    <th className="px-6 py-4 text-right">Action</th>
                </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                {filteredClients.map((client) => {
                    const l6 = team.find(t => t.id === client.hierarchy.level6Id);
                    return (
                    <tr key={client.id} className="hover:bg-slate-50 transition">
                        <td className="px-6 py-4">
                           <div className="font-bold text-slate-900">{client.name}</div>
                           <div className="text-[10px] text-blue-500 font-black uppercase tracking-tighter mt-0.5">{client.pan}</div>
                        </td>
                        <td className="px-6 py-4">
                            <div className="text-xs text-slate-500 font-bold truncate max-w-[200px]">{client.folios.join(', ')}</div>
                            <div className="text-[9px] text-slate-400 uppercase font-black tracking-widest mt-0.5">{client.folios.length} Linked Folios</div>
                        </td>
                        {isAdmin && <td className="px-6 py-4 text-slate-700 font-bold">{l6 ? l6.name : <span className="text-amber-500 italic">Unassigned</span>}</td>}
                        <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end space-x-2">
                                {isAdmin && (
                                    <button onClick={() => openMappingModal(client)} className="text-blue-600 hover:text-blue-800 font-black text-[9px] uppercase tracking-widest border border-blue-200 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition flex items-center shadow-sm"><UserCheck className="w-3.5 h-3.5 mr-2" /> Map Account</button>
                                )}
                                <button onClick={() => openClientModal(client)} className={`p-2 text-slate-400 hover:text-blue-600 ${!isAdmin && 'hidden'}`}><Edit2 className="w-4 h-4" /></button>
                                <button onClick={() => deleteClient(client.id)} className={`p-2 text-slate-400 hover:text-red-600 ${!isAdmin && 'hidden'}`}><Trash2 className="w-4 h-4" /></button>
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

      {/* Mapping Modal */}
      {isAdmin && isMappingModalOpen && selectedClientForMapping && mappingForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95">
            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-white">
              <div className="flex flex-col">
                <h3 className="font-black text-xl text-slate-900 tracking-tighter uppercase">Hierarchy Mapping</h3>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">{selectedClientForMapping.name}</p>
              </div>
              <button onClick={() => setIsMappingModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full"><X className="w-6 h-6 text-slate-400" /></button>
            </div>
            <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/50 max-h-[60vh] overflow-y-auto">
                {[0, 1, 2, 3, 4, 5, 6].map((level) => (
                    <div key={level} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                        <label className="block text-[10px] font-black uppercase text-slate-400 mb-3 tracking-widest">L{level} - {globalConfig.levelNames[level as keyof typeof globalConfig.levelNames]}</label>
                        <select
                            value={mappingForm[`level${level}Id` as keyof typeof mappingForm] || ''}
                            onChange={(e) => setMappingForm({ ...mappingForm, [`level${level}Id`]: e.target.value } as any)}
                            className="w-full border border-slate-200 rounded-xl text-sm px-4 py-3 font-bold text-slate-700 bg-slate-50/50 outline-none"
                        >
                            <option value="">-- No Assignment --</option>
                            {team.filter(t => t.level === level).map(u => (
                                <option key={u.id} value={u.id}>{u.name} ({u.code})</option>
                            ))}
                        </select>
                    </div>
                ))}
            </div>
            <div className="px-8 py-6 bg-white border-t border-slate-100 flex justify-end space-x-3">
              <button onClick={() => setIsMappingModalOpen(false)} className="px-6 py-3 text-sm font-black uppercase tracking-widest text-slate-400 hover:text-slate-600">Cancel</button>
              <button onClick={saveMapping} className="px-10 py-3 bg-blue-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-blue-700 shadow-xl shadow-blue-100 transition">Save Mapping</button>
            </div>
          </div>
        </div>
      )}

      {/* Team Modal (Admin Only) */}
      {isAdmin && isTeamModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95">
                  <div className="px-8 py-6 border-b border-slate-100 bg-white flex justify-between items-center">
                    <h3 className="font-black text-xl text-slate-900 tracking-tighter uppercase">{editingMember ? 'Edit User Account' : 'Provision User'}</h3>
                    <button onClick={() => setIsTeamModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition"><X className="w-6 h-6 text-slate-400" /></button>
                  </div>
                  <div className="p-8 space-y-4 bg-slate-50/50">
                      <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Full Name</label>
                          <input type="text" value={memberForm.name} onChange={e => setMemberForm({...memberForm, name: e.target.value})} className="w-full border border-slate-200 p-4 rounded-2xl mt-1.5 font-bold outline-none" placeholder="John Doe" />
                      </div>
                      <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Access Email</label>
                          <input type="email" value={memberForm.email} onChange={e => setMemberForm({...memberForm, email: e.target.value})} className="w-full border border-slate-200 p-4 rounded-2xl mt-1.5 font-bold outline-none" placeholder="john@wealthflow.com" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">System Level</label>
                              <select value={memberForm.level} onChange={e => setMemberForm({...memberForm, level: Number(e.target.value)})} className="w-full border border-slate-200 p-4 rounded-2xl mt-1.5 font-bold bg-white outline-none">
                                  {[0,1,2,3,4,5,6].map(l => <option key={l} value={l}>Level {l}</option>)}
                              </select>
                          </div>
                          <div>
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Account Password</label>
                              <input type="text" value={memberForm.password} onChange={e => setMemberForm({...memberForm, password: e.target.value})} className="w-full border border-slate-200 p-4 rounded-2xl mt-1.5 font-bold outline-none" />
                          </div>
                      </div>
                  </div>
                  <div className="px-8 py-6 bg-white border-t border-slate-100 flex justify-end space-x-3">
                      <button onClick={() => setIsTeamModalOpen(false)} className="px-6 py-3 text-xs font-black uppercase text-slate-400 hover:text-slate-600">Cancel</button>
                      <button onClick={saveTeamMember} className="px-10 py-3 bg-blue-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-blue-700 shadow-xl shadow-blue-100 transition">Save Account</button>
                  </div>
              </div>
          </div>
      )}

      {/* Client Modal (Admin Only) */}
      {isAdmin && isClientModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in">
              <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95">
                  <div className="px-8 py-6 border-b border-slate-100 bg-white flex justify-between items-center">
                    <h3 className="font-black text-xl text-slate-900 tracking-tighter uppercase">{editingClient ? 'Edit Investor' : 'New Investor Profile'}</h3>
                    <button onClick={() => setIsClientModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition"><X className="w-6 h-6 text-slate-400" /></button>
                  </div>
                  <div className="p-8 space-y-4 bg-slate-50/50">
                      <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Investor Name</label>
                          <input type="text" value={clientForm.name} onChange={e => setClientForm({...clientForm, name: e.target.value})} className="w-full border border-slate-200 p-4 rounded-2xl mt-1.5 font-bold outline-none" />
                      </div>
                      <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">PAN Number</label>
                          <input type="text" value={clientForm.pan} onChange={e => setClientForm({...clientForm, pan: e.target.value.toUpperCase()})} className="w-full border border-slate-200 p-4 rounded-2xl mt-1.5 font-bold outline-none uppercase" placeholder="ABCDE1234F" />
                      </div>
                      <div>
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Linked Folios (Comma separated)</label>
                          <textarea 
                              value={clientForm.folios?.join(', ')} 
                              onChange={e => setClientForm({...clientForm, folios: e.target.value.split(',').map(f => f.trim()).filter(f => f)})} 
                              className="w-full border border-slate-200 p-4 rounded-2xl mt-1.5 font-bold outline-none min-h-[100px]" 
                          />
                      </div>
                  </div>
                  <div className="px-8 py-6 bg-white border-t border-slate-100 flex justify-end space-x-3">
                      <button onClick={() => setIsClientModalOpen(false)} className="px-6 py-3 text-xs font-black uppercase text-slate-400 hover:text-slate-600">Cancel</button>
                      <button onClick={saveClient} className="px-10 py-3 bg-blue-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-blue-100 hover:bg-blue-700 transition">Save Profile</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
