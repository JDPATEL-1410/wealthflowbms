
import React, { useState, useEffect, useMemo } from 'react';
import { Save, AlertCircle, Globe, User, Trash2, Shield, Lock, CreditCard, Users, Search, ChevronRight, X, RefreshCcw, AlertTriangle } from 'lucide-react';
import { SharingConfig, TeamMember, BankDetails, Address, Role } from '../types';
import { calculatePayout } from '../services/calculationService';
import { useData } from '../contexts/DataContext';

interface SettingsProps {
    currentUser: TeamMember;
}

export const Settings: React.FC<SettingsProps> = ({ currentUser }) => {
    const { globalConfig, updateConfig, team, updateTeam, clearAllData } = useData();

    const [activeTab, setActiveTab] = useState<'profile' | 'config' | 'user-sharing' | 'system'>('profile');

    const [profileForm, setProfileForm] = useState<Partial<TeamMember>>({});
    const [bankForm, setBankForm] = useState<BankDetails>({
        accountName: '', accountNumber: '', bankName: '', ifscCode: '', accountType: 'Savings', branch: ''
    });
    const [addressForm, setAddressForm] = useState<Address>({
        street: '', city: '', state: '', pincode: '', country: ''
    });

    const [editConfig, setEditConfig] = useState<SharingConfig>(globalConfig);
    const [totalShare, setTotalShare] = useState(0);
    const [testAmount, setTestAmount] = useState<number>(1000);

    // User Sharing Override State
    const [selectedUserForOverride, setSelectedUserForOverride] = useState<TeamMember | null>(null);
    const [userSearch, setUserSearch] = useState('');
    const [userOverrideLevels, setUserOverrideLevels] = useState<Record<number, number>>({});

    useEffect(() => {
        if (currentUser) {
            setProfileForm(currentUser);
            if (currentUser.bankDetails) setBankForm(currentUser.bankDetails);
            if (currentUser.address) setAddressForm(currentUser.address);
        }
        if (currentUser?.role === Role.ADMIN) setActiveTab('config');
    }, [currentUser]);

    useEffect(() => {
        setEditConfig(globalConfig);
    }, [globalConfig]);

    useEffect(() => {
        const sum = Object.values(editConfig.levels).reduce((a: number, b: number) => a + b, 0);
        setTotalShare(sum);
    }, [editConfig]);

    const handleConfigSave = () => {
        if (totalShare !== 100) return;
        updateConfig(editConfig);
        alert('Global Configuration updated successfully!');
    };

    const handleLevelChange = (level: number, val: string) => {
        const num = parseFloat(val) || 0;
        setEditConfig(prev => ({ ...prev, levels: { ...prev.levels, [level]: num } }));
    };

    const handleNameChange = (level: number, val: string) => {
        setEditConfig(prev => ({ ...prev, levelNames: { ...prev.levelNames, [level]: val } }));
    };

    const filteredTeam = useMemo(() => {
        return team.filter(m =>
            m.name.toLowerCase().includes(userSearch.toLowerCase()) ||
            m.code.toLowerCase().includes(userSearch.toLowerCase())
        ).sort((a, b) => a.level - b.level);
    }, [team, userSearch]);

    const handleSelectUserForOverride = (member: TeamMember) => {
        setSelectedUserForOverride(member);
        const initialLevels: Record<number, number> = {};
        [0, 1, 2, 3, 4, 5, 6].forEach(l => {
            initialLevels[l] = member.customLevels?.[l as keyof typeof member.customLevels] ?? globalConfig.levels[l as keyof typeof globalConfig.levels as keyof typeof member.customLevels] ?? 0;
        });
        setUserOverrideLevels(initialLevels);
    };

    const handleUserLevelChange = (level: number, val: string) => {
        const num = parseFloat(val) || 0;
        setUserOverrideLevels(prev => ({ ...prev, [level]: num }));
    };

    const handleSaveUserOverride = () => {
        if (!selectedUserForOverride) return;
        const sum = Object.values(userOverrideLevels).reduce((a, b) => a + b, 0);
        if (sum !== 100) {
            alert("Total percentage must equal 100%. Current total: " + sum + "%");
            return;
        }

        const updatedTeam = team.map(m => {
            if (m.id === selectedUserForOverride.id) {
                return { ...m, customLevels: userOverrideLevels };
            }
            return m;
        });
        updateTeam(updatedTeam);
        alert(`Sharing overrides for ${selectedUserForOverride.name} saved successfully!`);
        setSelectedUserForOverride(null);
    };

    const handleResetUserOverride = () => {
        if (!selectedUserForOverride) return;
        const updatedTeam = team.map(m => {
            if (m.id === selectedUserForOverride.id) {
                const { customLevels, ...rest } = m;
                return rest;
            }
            return m;
        });
        updateTeam(updatedTeam);
        alert(`Sharing overrides for ${selectedUserForOverride.name} reset to global defaults.`);
        setSelectedUserForOverride(null);
    };

    const handleProfileSave = () => {
        const updatedTeam = team.map(m => {
            if (m.id === currentUser.id) {
                return { ...m, bankDetails: bankForm, address: addressForm };
            }
            return m;
        });
        updateTeam(updatedTeam);
        alert('Profile updated successfully!');
    };

    const calculationPreview = calculatePayout(testAmount, editConfig);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
                    <p className="text-slate-500 mt-1">System behavior and profile management.</p>
                </div>
                <div className="flex flex-wrap gap-2 bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
                    <button onClick={() => setActiveTab('profile')} className={`flex items-center px-4 py-2 text-sm font-medium rounded-md transition ${activeTab === 'profile' ? 'bg-blue-100 text-blue-700' : 'text-slate-600 hover:text-slate-900'}`}><User className="w-4 h-4 mr-2" />Profile</button>
                    {currentUser?.role === Role.ADMIN && (
                        <>
                            <button onClick={() => setActiveTab('config')} className={`flex items-center px-4 py-2 text-sm font-medium rounded-md transition ${activeTab === 'config' ? 'bg-blue-100 text-blue-700' : 'text-slate-600 hover:text-slate-900'}`}><Shield className="w-4 h-4 mr-2" />Global Rules</button>
                            <button onClick={() => setActiveTab('user-sharing')} className={`flex items-center px-4 py-2 text-sm font-medium rounded-md transition ${activeTab === 'user-sharing' ? 'bg-blue-100 text-blue-700' : 'text-slate-600 hover:text-slate-900'}`}><Users className="w-4 h-4 mr-2" />User Sharing</button>
                            <button onClick={() => setActiveTab('system')} className={`flex items-center px-4 py-2 text-sm font-medium rounded-md transition ${activeTab === 'system' ? 'bg-red-50 text-red-700' : 'text-slate-600 hover:text-slate-900'}`}><AlertTriangle className="w-4 h-4 mr-2" />System</button>
                        </>
                    )}
                </div>
            </div>

            {activeTab === 'profile' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-20">
                    <div className="space-y-6">
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-bold text-slate-900 flex items-center"><User className="w-5 h-5 mr-2 text-slate-500" />Personal Information</h3>
                                <button onClick={handleProfileSave} className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"><Save className="w-4 h-4 mr-2" /> Save Profile</button>
                            </div>
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Display Name</label>
                                        <input type="text" value={profileForm.name || ''} readOnly className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl mt-1 font-bold text-slate-500" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Account Context</label>
                                        <input type="text" value={`${profileForm.role} - L${profileForm.level}`} readOnly className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl mt-1 font-bold text-slate-500" />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email Address</label>
                                    <input type="text" value={profileForm.email || ''} readOnly className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl mt-1 font-bold text-slate-500" />
                                </div>
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
                            <h3 className="text-lg font-bold text-slate-900 flex items-center"><CreditCard className="w-5 h-5 mr-2 text-slate-500" />Bank Details</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Account Name</label>
                                    <input
                                        type="text"
                                        value={bankForm.accountName}
                                        onChange={e => setBankForm({ ...bankForm, accountName: e.target.value })}
                                        placeholder="As per bank records"
                                        className="w-full border border-slate-200 p-3 rounded-xl mt-1 focus:ring-2 focus:ring-blue-500 outline-none transition"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Account Number</label>
                                    <input
                                        type="text"
                                        value={bankForm.accountNumber}
                                        onChange={e => setBankForm({ ...bankForm, accountNumber: e.target.value })}
                                        placeholder="00000000000"
                                        className="w-full border border-slate-200 p-3 rounded-xl mt-1 focus:ring-2 focus:ring-blue-500 outline-none transition"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Bank Name</label>
                                    <input
                                        type="text"
                                        value={bankForm.bankName}
                                        onChange={e => setBankForm({ ...bankForm, bankName: e.target.value })}
                                        placeholder="HDFC Bank"
                                        className="w-full border border-slate-200 p-3 rounded-xl mt-1 focus:ring-2 focus:ring-blue-500 outline-none transition"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">IFSC Code</label>
                                    <input
                                        type="text"
                                        value={bankForm.ifscCode}
                                        onChange={e => setBankForm({ ...bankForm, ifscCode: e.target.value })}
                                        placeholder="HDFC0001234"
                                        className="w-full border border-slate-200 p-3 rounded-xl mt-1 focus:ring-2 focus:ring-blue-500 outline-none transition uppercase"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Account Type</label>
                                    <select
                                        value={bankForm.accountType}
                                        onChange={e => setBankForm({ ...bankForm, accountType: e.target.value as any })}
                                        className="w-full border border-slate-200 p-3 rounded-xl mt-1 focus:ring-2 focus:ring-blue-500 outline-none transition bg-white font-medium"
                                    >
                                        <option value="Savings">Savings Account</option>
                                        <option value="Current">Current Account</option>
                                        <option value="NRE">NRE Account</option>
                                        <option value="NRO">NRO Account</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
                            <h3 className="text-lg font-bold text-slate-900 flex items-center"><Globe className="w-5 h-5 mr-2 text-slate-500" />Office / Residential Address</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Street Address</label>
                                    <textarea
                                        value={addressForm.street}
                                        onChange={e => setAddressForm({ ...addressForm, street: e.target.value })}
                                        placeholder="123 Business Park, MG Road"
                                        rows={2}
                                        className="w-full border border-slate-200 p-3 rounded-xl mt-1 focus:ring-2 focus:ring-blue-500 outline-none transition resize-none"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">City</label>
                                        <input
                                            type="text"
                                            value={addressForm.city}
                                            onChange={e => setAddressForm({ ...addressForm, city: e.target.value })}
                                            placeholder="Rajkot"
                                            className="w-full border border-slate-200 p-3 rounded-xl mt-1 focus:ring-2 focus:ring-blue-500 outline-none transition"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">State / UT</label>
                                        <input
                                            type="text"
                                            value={addressForm.state}
                                            onChange={e => setAddressForm({ ...addressForm, state: e.target.value })}
                                            placeholder="Gujarat"
                                            className="w-full border border-slate-200 p-3 rounded-xl mt-1 focus:ring-2 focus:ring-blue-500 outline-none transition"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pincode</label>
                                        <input
                                            type="text"
                                            value={addressForm.pincode}
                                            onChange={e => setAddressForm({ ...addressForm, pincode: e.target.value })}
                                            placeholder="360001"
                                            className="w-full border border-slate-200 p-3 rounded-xl mt-1 focus:ring-2 focus:ring-blue-500 outline-none transition"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Country</label>
                                        <input
                                            type="text"
                                            value={addressForm.country}
                                            onChange={e => setAddressForm({ ...addressForm, country: e.target.value })}
                                            placeholder="India"
                                            className="w-full border border-slate-200 p-3 rounded-xl mt-1 focus:ring-2 focus:ring-blue-500 outline-none transition"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'config' && currentUser?.role === Role.ADMIN && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-bold text-slate-900">Global Payout Rules</h2>
                            <button disabled={totalShare !== 100} onClick={handleConfigSave} className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition ${totalShare === 100 ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'bg-slate-200 text-slate-400'}`}><Save className="w-4 h-4 mr-2" /> Save Global Defaults</button>
                        </div>

                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                            <div className="flex items-start justify-between">
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900">Company Retention (%)</h3>
                                    <p className="text-xs text-slate-500">Fixed expense deducted from gross before payout pool.</p>
                                </div>
                                <input type="number" value={editConfig.companyExpensePct} onChange={(e) => setEditConfig({ ...editConfig, companyExpensePct: parseFloat(e.target.value) || 0 })} className="w-20 p-2 border rounded-lg text-right font-bold text-blue-600 focus:ring-2 focus:ring-blue-500 outline-none" />
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-bold text-slate-900">Standard Multi-Layer Split</h3>
                                <div className={`px-3 py-1 rounded-full text-sm font-bold ${totalShare === 100 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>Total Allocation: {totalShare}%</div>
                            </div>
                            <div className="space-y-3">
                                {[6, 5, 4, 3, 2, 1, 0].map((lvl) => (
                                    <div key={lvl} className="flex items-center p-3 bg-slate-50 rounded-lg border border-slate-100">
                                        <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm mr-4 bg-blue-100 text-blue-700 shadow-sm">L{lvl}</div>
                                        <input type="text" value={editConfig.levelNames?.[lvl as keyof typeof editConfig.levelNames] || ''} onChange={(e) => handleNameChange(lvl, e.target.value)} className="flex-1 bg-transparent border-b border-dashed border-slate-300 mr-4 outline-none text-sm font-medium" />
                                        <div className="flex items-center bg-white border rounded-lg overflow-hidden shadow-sm">
                                            <input type="number" value={editConfig.levels[lvl as keyof typeof editConfig.levels] || 0} onChange={(e) => handleLevelChange(lvl, e.target.value)} className="w-20 p-2 text-right text-sm font-bold" />
                                            <span className="px-2 text-slate-400 bg-slate-50 border-l">%</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-1">
                        <div className="bg-slate-900 text-white p-6 rounded-xl shadow-xl sticky top-6">
                            <h3 className="text-lg font-bold mb-4 flex items-center text-blue-400"><RefreshCcw className="w-4 h-4 mr-2" /> Real-time Simulator</h3>
                            <div className="mb-6">
                                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Testing Gross Amount</label>
                                <input type="number" value={testAmount} onChange={(e) => setTestAmount(parseFloat(e.target.value))} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white font-mono text-xl" />
                            </div>
                            <div className="space-y-3 pt-4 border-t border-slate-700">
                                <div className="flex justify-between items-center"><span className="text-slate-400 text-sm">Retention ({editConfig.companyExpensePct}%)</span><span className="text-red-400 font-mono">₹{calculationPreview.expenseAmount.toFixed(2)}</span></div>
                                <div className="flex justify-between items-center font-black text-lg py-2 border-y border-slate-800"><span className="text-emerald-400">Net Payout Pool</span><span className="font-mono text-emerald-400">₹{calculationPreview.netPool.toFixed(2)}</span></div>
                                {[6, 5, 4, 3, 2, 1, 0].map(lvl => (
                                    <div key={lvl} className="flex justify-between items-center text-sm"><span className="text-slate-400">{editConfig.levelNames[lvl as keyof typeof editConfig.levelNames]}</span><span className="font-mono">₹{(calculationPreview.levelPayouts[lvl as keyof typeof editConfig.levels] || 0).toFixed(2)}</span></div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'user-sharing' && currentUser?.role === Role.ADMIN && (
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-18rem)]">
                    <div className="lg:col-span-1 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
                        <div className="p-4 border-b border-slate-200 bg-slate-50">
                            <h3 className="font-bold text-slate-900 mb-3">Select User</h3>
                            <div className="relative">
                                <Search className="absolute left-3 top-2.5 text-slate-400 w-4 h-4" />
                                <input type="text" placeholder="Search user..." value={userSearch} onChange={e => setUserSearch(e.target.value)} className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm bg-white" />
                            </div>
                        </div>
                        <div className="overflow-y-auto flex-1 divide-y divide-slate-100">
                            {filteredTeam.map(member => (
                                <button
                                    key={member.id}
                                    onClick={() => handleSelectUserForOverride(member)}
                                    className={`w-full text-left p-4 hover:bg-blue-50 transition flex items-center justify-between group ${selectedUserForOverride?.id === member.id ? 'bg-blue-50 border-r-4 border-blue-600' : ''}`}
                                >
                                    <div>
                                        <div className="font-bold text-slate-900 text-sm">{member.name}</div>
                                        <div className="text-[10px] text-slate-500 uppercase font-medium">{member.code} • Level {member.level}</div>
                                    </div>
                                    {member.customLevels ? (
                                        <span className="text-[9px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-black uppercase">Custom</span>
                                    ) : (
                                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-400" />
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="lg:col-span-3 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
                        {selectedUserForOverride ? (
                            <>
                                <div className="p-6 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                                    <div>
                                        <h3 className="text-xl font-bold text-slate-900">Sharing Override: {selectedUserForOverride.name}</h3>
                                        <p className="text-sm text-slate-500">Customize the percentage of net brokerage this user's account receives at each level.</p>
                                    </div>
                                    <button onClick={() => setSelectedUserForOverride(null)} className="text-slate-400 hover:text-slate-600"><X className="w-6 h-6" /></button>
                                </div>
                                <div className="p-8 flex-1 overflow-y-auto space-y-8">
                                    <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg flex items-start">
                                        <AlertCircle className="w-5 h-5 text-amber-600 mr-3 mt-0.5" />
                                        <div className="text-sm text-amber-800">
                                            <p className="font-bold">Important Notice</p>
                                            <p>These values override the global defaults only for this specific user. If a level is not required for this user's deal, set it to <strong>0%</strong>. Ensure the total adds up to <strong>100%</strong>.</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-4">
                                            <h4 className="font-black text-xs uppercase text-slate-400 tracking-widest">Percentage Distribution</h4>
                                            {[6, 5, 4, 3, 2, 1, 0].map(lvl => (
                                                <div key={lvl} className="flex items-center justify-between bg-slate-50 p-4 rounded-xl border border-slate-100">
                                                    <div>
                                                        <div className="font-bold text-slate-900">Level {lvl}</div>
                                                        <div className="text-[10px] text-slate-500 uppercase">{globalConfig.levelNames[lvl as keyof typeof globalConfig.levelNames]}</div>
                                                    </div>
                                                    <div className="flex items-center bg-white border rounded-lg shadow-inner overflow-hidden">
                                                        <input
                                                            type="number"
                                                            value={userOverrideLevels[lvl] || 0}
                                                            onChange={e => handleUserLevelChange(lvl, e.target.value)}
                                                            className="w-20 p-2 text-right font-black text-blue-600 focus:outline-none"
                                                        />
                                                        <span className="px-3 bg-slate-100 border-l text-slate-400 font-bold">%</span>
                                                    </div>
                                                </div>
                                            ))}
                                            <div className="flex items-center justify-between p-4 bg-slate-900 text-white rounded-xl">
                                                <span className="font-bold">Total Allocation</span>
                                                <span className={`text-xl font-black ${Object.values(userOverrideLevels).reduce((a, b) => a + b, 0) === 100 ? 'text-emerald-400' : 'text-red-400'}`}>
                                                    {Object.values(userOverrideLevels).reduce((a, b) => a + b, 0)}%
                                                </span>
                                            </div>
                                        </div>

                                        <div className="space-y-6">
                                            <h4 className="font-black text-xs uppercase text-slate-400 tracking-widest">Active Status</h4>
                                            <div className="space-y-4">
                                                {[6, 5, 4, 3, 2, 1, 0].map(lvl => (
                                                    <div key={lvl} className="flex items-center space-x-3">
                                                        <div className={`w-3 h-3 rounded-full ${userOverrideLevels[lvl] > 0 ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-300'}`}></div>
                                                        <span className={`text-sm font-medium ${userOverrideLevels[lvl] > 0 ? 'text-slate-900' : 'text-slate-400 italic line-through'}`}>
                                                            Layer {lvl}: {userOverrideLevels[lvl] > 0 ? 'Included' : 'Bypassed / Not Required'}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>

                                            <div className="mt-8 pt-8 border-t border-slate-100 flex flex-col space-y-3">
                                                <button
                                                    onClick={handleSaveUserOverride}
                                                    className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-200 hover:bg-blue-700 transition flex items-center justify-center"
                                                >
                                                    <Save className="w-4 h-4 mr-2" /> Save Sharing Rule
                                                </button>
                                                {selectedUserForOverride.customLevels && (
                                                    <button
                                                        onClick={handleResetUserOverride}
                                                        className="w-full text-red-600 font-bold py-3 rounded-xl border border-red-100 hover:bg-red-50 transition flex items-center justify-center"
                                                    >
                                                        <Trash2 className="w-4 h-4 mr-2" /> Reset to Global Default
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center p-20 text-slate-400">
                                <Users className="w-16 h-16 mb-4 opacity-20" />
                                <h3 className="text-xl font-bold text-slate-500">Userwise Sharing</h3>
                                <p className="text-center mt-2 max-w-sm">Select a team member from the list to set custom brokerage sharing percentages that override global rules.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'system' && currentUser?.role === Role.ADMIN && (
                <div className="max-w-2xl bg-white rounded-xl border border-red-100 shadow-sm overflow-hidden">
                    <div className="p-6 bg-red-50 border-b border-red-100">
                        <h3 className="text-red-800 font-bold flex items-center"><AlertTriangle className="w-5 h-5 mr-2" /> Danger Zone</h3>
                    </div>
                    <div className="p-8">
                        <h4 className="font-bold text-slate-900 mb-2">System Reset</h4>
                        <p className="text-sm text-slate-600 mb-6">Clearing the data will permanently delete all imported transactions, clients, and custom team members from your local browser storage. This action is irreversible.</p>
                        <button onClick={clearAllData} className="bg-red-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-red-700 transition shadow-lg shadow-red-100 flex items-center"><Trash2 className="w-4 h-4 mr-2" /> Factory Reset Application</button>
                    </div>
                </div>
            )}
        </div>
    );
};
