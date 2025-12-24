
import React, { useState, useMemo, useEffect } from 'react';
import { Download, FileText, Briefcase, Filter, Layers, IndianRupee, CheckCircle, Clock, AlertCircle, Calculator, X, Calendar, Search, RefreshCw, ChevronDown, ChevronUp, Info, Building2 } from 'lucide-react';
import { TeamMember, Role, InvoiceStatus, PayoutInvoice, TransactionStatus, BrokerageTransaction } from '../types';
import { useData } from '../contexts/DataContext';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ReportsProps {
    currentUser: TeamMember;
}

export const Reports: React.FC<ReportsProps> = ({ currentUser }) => {
    const { transactions, clients, globalConfig, team, amcMappings, schemeMappings } = useData();

    const [activeTab, setActiveTab] = useState<'overview' | 'monthly' | 'client' | 'amc' | 'scheme' | 'transaction' | 'payouts'>('overview');

    const isAdmin = currentUser.role === Role.ADMIN;

    const [showFilters, setShowFilters] = useState(false);
    const [filters, setFilters] = useState({
        startDate: '',
        endDate: '',
        scheme: '',
        category: 'All',
        status: 'All',
        amc: ''
    });

    const [invoices, setInvoices] = useState<PayoutInvoice[]>([]);

    // Helper to get standardized name
    const getStandardName = (original: string, mappings: { original: string, standard: string }[]) => {
        const match = mappings.find(m => m.original === original);
        return match && match.standard ? match.standard : original;
    };

    const { visibleTransactions, unmappedVisibleCount } = useMemo(() => {
        const myClientIds = clients.filter(c => {
            if (isAdmin) return true;
            const levelKey = `level${currentUser.level}Id` as keyof typeof c.hierarchy;
            return c.hierarchy[levelKey] === currentUser.id;
        }).map(c => c.id);

        let unmappedCount = 0;

        const filtered = transactions.filter(tx => {
            let isAccessible = false;
            if (isAdmin) {
                isAccessible = true;
            } else {
                isAccessible = !!(tx.mappedClientId && myClientIds.includes(tx.mappedClientId));
            }

            if (!isAccessible) return false;

            if (!tx.mappedClientId) unmappedCount++;

            // Apply standardizers for filtering
            const stdAmc = getStandardName(tx.amcName, amcMappings);
            const stdScheme = getStandardName(tx.schemeName, schemeMappings);

            if (filters.startDate && new Date(tx.transactionDate) < new Date(filters.startDate)) return false;
            if (filters.endDate && new Date(tx.transactionDate) > new Date(filters.endDate)) return false;
            if (filters.scheme && !stdScheme.toLowerCase().includes(filters.scheme.toLowerCase())) return false;
            if (filters.amc && !stdAmc.toLowerCase().includes(filters.amc.toLowerCase())) return false;
            if (filters.category !== 'All' && tx.category !== filters.category) return false;
            if (filters.status !== 'All' && tx.status !== filters.status) return false;

            return true;
        });

        const sorted = [...filtered].sort((a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime());

        return { visibleTransactions: sorted, unmappedVisibleCount: unmappedCount };
    }, [currentUser, transactions, clients, filters, isAdmin, amcMappings, schemeMappings]);

    const totals = useMemo(() => {
        return visibleTransactions.reduce((acc, tx) => ({
            gross: acc.gross + tx.grossAmount,
            aum: acc.aum + (tx.currentValue || 0),
            count: acc.count + 1
        }), { gross: 0, aum: 0, count: 0 });
    }, [visibleTransactions]);

    const clientSummary = useMemo(() => {
        const summary: Record<string, { name: string, pan: string, gross: number, txCount: number }> = {};
        visibleTransactions.forEach(tx => {
            const key = tx.mappedClientId || `unmapped_${tx.pan}`;
            if (!summary[key]) {
                summary[key] = {
                    name: tx.investorName,
                    pan: tx.pan,
                    gross: 0,
                    txCount: 0
                };
            }
            summary[key].gross += tx.grossAmount;
            summary[key].txCount += 1;
        });
        return Object.values(summary).sort((a, b) => b.gross - a.gross);
    }, [visibleTransactions]);

    const amcSummary = useMemo(() => {
        const summary: Record<string, { name: string, gross: number, txCount: number, aum: number }> = {};
        visibleTransactions.forEach(tx => {
            const standardAmc = getStandardName(tx.amcName || 'Unknown AMC', amcMappings).trim();
            if (!summary[standardAmc]) {
                summary[standardAmc] = { name: standardAmc, gross: 0, txCount: 0, aum: 0 };
            }
            summary[standardAmc].gross += tx.grossAmount;
            summary[standardAmc].txCount += 1;
            summary[standardAmc].aum += tx.currentValue || 0;
        });
        return Object.values(summary).sort((a, b) => b.gross - a.gross);
    }, [visibleTransactions, amcMappings]);

    const schemeSummary = useMemo(() => {
        const summary: Record<string, { name: string, gross: number, category: string, amc: string }> = {};
        visibleTransactions.forEach(tx => {
            const standardScheme = getStandardName(tx.schemeName || 'Unknown Scheme', schemeMappings).trim();
            const standardAmc = getStandardName(tx.amcName || 'Unknown AMC', amcMappings).trim();

            if (!summary[standardScheme]) {
                summary[standardScheme] = {
                    name: standardScheme,
                    gross: 0,
                    category: tx.category,
                    amc: standardAmc
                };
            }
            summary[standardScheme].gross += tx.grossAmount;
        });

        // User sharing rule lookup
        const userLevelPct = currentUser.customLevels?.[currentUser.level as keyof typeof currentUser.customLevels]
            ?? globalConfig.levels[currentUser.level as keyof typeof globalConfig.levels]
            ?? 0;

        const expensePct = globalConfig.companyExpensePct;

        return Object.values(summary).sort((a, b) => b.gross - a.gross).map(s => {
            const netPool = s.gross * (1 - (expensePct / 100));
            const myNetShare = netPool * (userLevelPct / 100);
            return { ...s, myNetShare };
        });
    }, [visibleTransactions, currentUser, globalConfig, amcMappings, schemeMappings]);

    const monthlySummary = useMemo(() => {
        const summary: Record<string, { month: string, gross: number, count: number }> = {};

        visibleTransactions.forEach(tx => {
            const month = tx.brokeragePeriod || tx.transactionDate.substring(0, 7);
            if (!summary[month]) {
                summary[month] = { month, gross: 0, count: 0 };
            }
            summary[month].gross += tx.grossAmount;
            summary[month].count += 1;
        });

        const userLevelPct = currentUser.customLevels?.[currentUser.level as keyof typeof currentUser.customLevels]
            ?? globalConfig.levels[currentUser.level as keyof typeof globalConfig.levels]
            ?? 0;

        const expensePct = globalConfig.companyExpensePct;

        return Object.values(summary)
            .sort((a, b) => b.month.localeCompare(a.month))
            .map(item => {
                const netPool = item.gross * (1 - (expensePct / 100));
                const myShare = netPool * (userLevelPct / 100);
                const invoice = invoices.find(inv => inv.month === item.month && inv.userId === currentUser.id);
                return { ...item, myShare, invoice };
            });
    }, [visibleTransactions, currentUser, invoices, globalConfig]);

    const totalMyShare = useMemo(() => {
        return monthlySummary.reduce((acc, curr) => acc + curr.myShare, 0);
    }, [monthlySummary]);

    const handleRaiseInvoice = (monthItem: any) => {
        const roleName = globalConfig.levelNames[currentUser.level as keyof typeof globalConfig.levelNames] || `Level ${currentUser.level}`;
        const newInvoice: PayoutInvoice = {
            id: `inv_${Date.now()}`,
            userId: currentUser.id,
            userName: currentUser.name,
            userRole: roleName,
            month: monthItem.month,
            amount: monthItem.myShare,
            status: InvoiceStatus.SUBMITTED,
            submittedDate: new Date().toISOString().split('T')[0],
            transactionCount: monthItem.count
        };
        setInvoices([newInvoice, ...invoices]);
        alert(`Invoice raised successfully for ${monthItem.month}!`);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Reports & Analytics</h1>
                    <p className="text-slate-500 mt-1">
                        {isAdmin ? 'Complete System Analytics' : `Personal Portfolio Analysis`}
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`flex items-center px-4 py-2 text-sm font-medium rounded-lg border transition ${showFilters ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'}`}
                    >
                        <Filter className="w-4 h-4 mr-2" />
                        Filters
                    </button>
                    <button className="bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 flex items-center">
                        <Download className="w-4 h-4 mr-2" />
                        Export
                    </button>
                </div>
            </div>

            {showFilters && (
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm animate-in fade-in slide-in-from-top-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">Start Date</label>
                            <input type="date" value={filters.startDate} onChange={e => setFilters({ ...filters, startDate: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">End Date</label>
                            <input type="date" value={filters.endDate} onChange={e => setFilters({ ...filters, endDate: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">AMC Search</label>
                            <input type="text" placeholder="Search AMC..." value={filters.amc} onChange={e => setFilters({ ...filters, amc: e.target.value })} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                        </div>
                        <div className="flex items-end">
                            <button onClick={() => setFilters({ startDate: '', endDate: '', scheme: '', category: 'All', status: 'All', amc: '' })} className="text-xs text-blue-600 font-bold hover:underline">Clear Filters</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex items-center justify-between border-b border-slate-200">
                <div className="flex space-x-6 overflow-x-auto pb-px">
                    {[
                        { id: 'overview', label: 'Overview' },
                        { id: 'monthly', label: 'Month Wise' },
                        { id: 'client', label: 'Client Wise' },
                        { id: 'amc', label: 'AMC Wise' },
                        { id: 'scheme', label: 'Scheme Wise' },
                        { id: 'transaction', label: 'Transaction Log' },
                        { id: 'payouts', label: 'Payouts' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`pb-4 text-sm font-bold transition-all border-b-2 px-1 whitespace-nowrap ${activeTab === tab.id
                                ? 'border-blue-600 text-blue-600'
                                : 'border-transparent text-slate-500 hover:text-slate-900'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden min-h-[500px]">
                {activeTab === 'overview' && (
                    <div className="p-8">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                            <div className="p-6 bg-blue-50 rounded-xl border border-blue-100 flex items-center space-x-4">
                                <div className="p-3 bg-blue-600 rounded-lg"><IndianRupee className="w-6 h-6 text-white" /></div>
                                <div>
                                    <p className="text-xs font-bold text-blue-600 uppercase">Brokerage</p>
                                    <p className="text-2xl font-black text-blue-900">₹ {totals.gross.toLocaleString()}</p>
                                </div>
                            </div>
                            <div className="p-6 bg-slate-50 rounded-xl border border-slate-200 flex items-center space-x-4">
                                <div className="p-3 bg-slate-600 rounded-lg"><Building2 className="w-6 h-6 text-white" /></div>
                                <div>
                                    <p className="text-xs font-bold text-slate-500 uppercase">Active AMCs</p>
                                    <p className="text-2xl font-black text-slate-900">{amcSummary.length}</p>
                                </div>
                            </div>
                            <div className="p-6 bg-slate-50 rounded-xl border border-slate-200 flex items-center space-x-4">
                                <div className="p-3 bg-slate-600 rounded-lg"><Layers className="w-6 h-6 text-white" /></div>
                                <div>
                                    <p className="text-xs font-bold text-slate-500 uppercase">Schemes</p>
                                    <p className="text-2xl font-black text-slate-900">{schemeSummary.length}</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
                            <h3 className="font-bold text-slate-900 mb-4 flex items-center"><Info className="w-4 h-4 mr-2" /> Dashboard Insights</h3>
                            <p className="text-sm text-slate-600 leading-relaxed">
                                Data is aggregated based on the <strong>Brokerage Period</strong> selected during import. Standardized names defined in <strong>Clients &amp; Map &gt; Standardizer</strong> are used for grouping.
                                RMs only see clients mapped in their hierarchy.
                            </p>
                        </div>
                    </div>
                )}

                {activeTab === 'amc' && (
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase tracking-tighter text-[10px]">
                            <tr>
                                <th className="px-6 py-4">AMC Name (Standardized)</th>
                                <th className="px-6 py-4 text-center">Transactions</th>
                                <th className="px-6 py-4 text-right">AUM / Value (₹)</th>
                                <th className="px-6 py-4 text-right bg-blue-50 text-blue-700">Brokerage (₹)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {amcSummary.map((a, idx) => (
                                <tr key={idx} className="hover:bg-slate-50">
                                    <td className="px-6 py-4 font-bold text-slate-900 uppercase">{a.name}</td>
                                    <td className="px-6 py-4 text-center text-slate-500">{a.txCount}</td>
                                    <td className="px-6 py-4 text-right font-mono text-slate-600">₹{a.aum.toLocaleString()}</td>
                                    <td className="px-6 py-4 text-right font-black font-mono text-blue-700 bg-blue-50/20">₹{a.gross.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                </tr>
                            ))}
                            {amcSummary.length === 0 && (
                                <tr><td colSpan={4} className="text-center py-20 text-slate-400">No AMC data found.</td></tr>
                            )}
                        </tbody>
                        {amcSummary.length > 0 && (
                            <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-300">
                                <tr>
                                    <td className="px-6 py-4 uppercase text-slate-900">Grand Total</td>
                                    <td className="px-6 py-4 text-center text-slate-900">{totals.count}</td>
                                    <td className="px-6 py-4 text-right text-slate-900 font-mono">₹{totals.aum.toLocaleString()}</td>
                                    <td className="px-6 py-4 text-right text-blue-700 bg-blue-100/50 font-mono">₹{totals.gross.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                )}

                {activeTab === 'monthly' && (
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase tracking-tighter text-[10px]">
                            <tr>
                                <th className="px-6 py-4">Brokerage Period</th>
                                <th className="px-6 py-4 text-center">Txns</th>
                                <th className="px-6 py-4 text-right">Gross (₹)</th>
                                <th className="px-6 py-4 text-right text-emerald-600 bg-emerald-50">My Share (₹)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {monthlySummary.map((m, idx) => (
                                <tr key={idx} className="hover:bg-slate-50">
                                    <td className="px-6 py-4 font-bold text-slate-900">{m.month}</td>
                                    <td className="px-6 py-4 text-center text-slate-500">{m.count}</td>
                                    <td className="px-6 py-4 text-right font-mono">₹{m.gross.toLocaleString()}</td>
                                    <td className="px-6 py-4 text-right font-black font-mono text-emerald-700 bg-emerald-50/30">₹{m.myShare.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                </tr>
                            ))}
                        </tbody>
                        {monthlySummary.length > 0 && (
                            <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-300">
                                <tr>
                                    <td className="px-6 py-4 uppercase text-slate-900">Grand Total</td>
                                    <td className="px-6 py-4 text-center text-slate-900">{totals.count}</td>
                                    <td className="px-6 py-4 text-right text-slate-900 font-mono">₹{totals.gross.toLocaleString()}</td>
                                    <td className="px-6 py-4 text-right text-emerald-700 bg-emerald-100/50 font-mono">₹{totalMyShare.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                )}

                {activeTab === 'client' && (
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase tracking-tighter text-[10px]">
                            <tr>
                                <th className="px-6 py-4">Investor</th>
                                <th className="px-6 py-4">PAN</th>
                                <th className="px-6 py-4 text-center">Txns</th>
                                <th className="px-6 py-4 text-right">Total Brokerage (₹)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {clientSummary.map((c, idx) => (
                                <tr key={idx} className="hover:bg-slate-50">
                                    <td className="px-6 py-4 font-bold text-slate-900">{c.name}</td>
                                    <td className="px-6 py-4 font-mono text-xs text-slate-500">{c.pan}</td>
                                    <td className="px-6 py-4 text-center text-slate-500">{c.txCount}</td>
                                    <td className="px-6 py-4 text-right font-black">₹{c.gross.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                </tr>
                            ))}
                        </tbody>
                        {clientSummary.length > 0 && (
                            <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-300">
                                <tr>
                                    <td className="px-6 py-4 uppercase text-slate-900" colSpan={2}>Grand Total</td>
                                    <td className="px-6 py-4 text-center text-slate-900">{totals.count}</td>
                                    <td className="px-6 py-4 text-right text-slate-900 font-mono">₹{totals.gross.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                )}

                {activeTab === 'transaction' && (
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs text-left">
                            <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase tracking-tighter">
                                <tr>
                                    <th className="px-4 py-3">Date</th>
                                    <th className="px-4 py-3">Investor / AMC (Std)</th>
                                    <th className="px-4 py-3">Scheme (Std)</th>
                                    <th className="px-4 py-3 text-right">Rate</th>
                                    <th className="px-4 py-3 text-right">Gross (₹)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {visibleTransactions.slice(0, 500).map((tx) => {
                                    const stdAmc = getStandardName(tx.amcName || 'Unknown AMC', amcMappings);
                                    const stdScheme = getStandardName(tx.schemeName || 'Unknown Scheme', schemeMappings);
                                    return (
                                        <tr key={tx.id} className="hover:bg-slate-50">
                                            <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{tx.transactionDate}</td>
                                            <td className="px-4 py-3">
                                                <div className="font-bold text-slate-900">{tx.investorName}</div>
                                                <div className="text-[9px] text-blue-500 uppercase truncate max-w-[150px]" title={stdAmc}>{stdAmc}</div>
                                            </td>
                                            <td className="px-4 py-3 text-slate-600 truncate max-w-[180px]" title={stdScheme}>{stdScheme}</td>
                                            <td className="px-4 py-3 text-right text-slate-400">{tx.brokerageRate ? `${tx.brokerageRate}%` : '-'}</td>
                                            <td className="px-4 py-3 text-right font-bold text-slate-900">₹{tx.grossAmount.toLocaleString()}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                            {visibleTransactions.length > 0 && (
                                <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-300">
                                    <tr>
                                        <td className="px-4 py-3 uppercase text-slate-900" colSpan={4}>Grand Total</td>
                                        <td className="px-4 py-3 text-right text-slate-900 font-mono">₹{totals.gross.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    </div>
                )}

                {activeTab === 'scheme' && (
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase tracking-tighter text-[10px]">
                            <tr>
                                <th className="px-6 py-4">Scheme Name (Standardized)</th>
                                <th className="px-6 py-4">AMC (Standardized)</th>
                                <th className="px-6 py-4 text-right">Total Gross (₹)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {schemeSummary.map((s, idx) => (
                                <tr key={idx} className="hover:bg-slate-50">
                                    <td className="px-6 py-4 font-bold text-slate-900">{s.name}</td>
                                    <td className="px-6 py-4 text-xs text-slate-500 uppercase">{s.amc}</td>
                                    <td className="px-6 py-4 text-right font-mono">₹{s.gross.toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                        {schemeSummary.length > 0 && (
                            <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-300">
                                <tr>
                                    <td className="px-6 py-4 uppercase text-slate-900" colSpan={2}>Grand Total</td>
                                    <td className="px-6 py-4 text-right text-slate-900 font-mono">₹{totals.gross.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                )}

                {activeTab === 'payouts' && (
                    <div className="p-6">
                        <table className="w-full text-sm text-left border rounded-xl overflow-hidden">
                            <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 text-[10px] uppercase">
                                <tr>
                                    <th className="px-6 py-4">Brokerage Period</th>
                                    <th className="px-6 py-4 text-right">My Share</th>
                                    <th className="px-6 py-4 text-center">Status</th>
                                    <th className="px-6 py-4 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {monthlySummary.map((item, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50">
                                        <td className="px-6 py-4 font-black text-slate-900">{item.month}</td>
                                        <td className="px-6 py-4 text-right font-bold text-blue-700">₹{item.myShare.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                        <td className="px-6 py-4 text-center">
                                            {item.invoice ? (
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-tighter ${item.invoice.status === InvoiceStatus.PAID ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                                                    }`}>{item.invoice.status}</span>
                                            ) : (
                                                <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">NO REQUEST</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            {!item.invoice && (
                                                <button onClick={() => handleRaiseInvoice(item)} className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-blue-700 transition">Raise Invoice</button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            {monthlySummary.length > 0 && (
                                <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-300">
                                    <tr>
                                        <td className="px-6 py-4 uppercase text-slate-900">Grand Total</td>
                                        <td className="px-6 py-4 text-right text-blue-700 font-mono">₹{totalMyShare.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                        <td colSpan={2}></td>
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};
