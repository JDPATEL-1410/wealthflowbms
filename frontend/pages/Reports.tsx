

import React, { useState, useMemo } from 'react';
import { Download, Filter, IndianRupee, Clock, FileText, Briefcase, Layers, Landmark, ShieldCheck, Printer, Search, Calendar, ChevronDown, CheckCircle, FileDown, Trash2 } from 'lucide-react';
import { TeamMember, Role, InvoiceStatus, PayoutInvoice, TransactionStatus, BrokerageTransaction } from '../types';
import { useData } from '../contexts/DataContext';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

interface ReportsProps {
    currentUser: TeamMember;
}

export const Reports: React.FC<ReportsProps> = ({ currentUser }) => {
    const { transactions, clients, team, globalConfig, invoices, addInvoice, updateInvoice, deleteInvoice, deleteTransaction } = useData();

    const [activeTab, setActiveTab] = useState<'overview' | 'monthly' | 'client-summary' | 'transaction' | 'invoices' | 'approvals'>('overview');
    const [transactionSearch, setTransactionSearch] = useState('');

    const isAdmin = currentUser.role === Role.ADMIN;
    const isSuperUser = isAdmin || currentUser.level === 0 || currentUser.level === 1;

    // DEBUG LOG
    console.log('Reports Debug:', {
        totalTransactions: transactions.length,
        isAdmin,
        isSuperUser,
        currentUserId: currentUser.id
    });

    const [showFilters, setShowFilters] = useState(false);
    const [filters, setFilters] = useState({
        month: 'All',
        year: 'All'
    });

    const yearsList = useMemo(() => {
        const years = new Set<string>();
        transactions.forEach(tx => {
            const year = (tx.brokeragePeriod || tx.transactionDate).split('-')[0];
            if (year && year.length === 4) years.add(year);
        });
        return Array.from(years).sort().reverse();
    }, [transactions]);

    /**
     * Core Calculation: Get specific share for the logged in user
     */
    const calculateUserShare = (tx: BrokerageTransaction, member: TeamMember) => {
        if (tx.breakdown) {
            return tx.breakdown.levelPayouts[member.level as keyof typeof tx.breakdown.levelPayouts] || 0;
        }

        const expenseAmount = tx.grossAmount * (globalConfig.companyExpensePct / 100);
        const netPool = tx.grossAmount - expenseAmount;

        const userPct = member.customLevels?.[member.level as keyof typeof member.customLevels]
            ?? globalConfig.levels[member.level as keyof typeof globalConfig.levels]
            ?? 0;

        return netPool * (userPct / 100);
    };

    /**
     * Filter Transactions based on hierarchy and date filters
     */
    const { visibleTransactions } = useMemo(() => {
        const filtered = transactions.filter(tx => {
            // Date filtering
            // Date filtering
            const dateStr = tx.brokeragePeriod || tx.transactionDate || '';
            const txYear = dateStr.includes('-') ? dateStr.split('-')[0] : '';
            const txMonth = dateStr.includes('-') ? dateStr.split('-')[1] : '';

            if (filters.year !== 'All' && txYear !== filters.year) return false;
            if (filters.month !== 'All' && txMonth !== filters.month) return false;

            // Hierarchy filtering - ONLY for non-admin users
            if (!isSuperUser) {
                const client = clients.find(c => c.id === tx.mappedClientId);
                if (!client) return false;

                const userLevelKey = `level${currentUser.level}Id` as keyof typeof client.hierarchy;
                if (client.hierarchy[userLevelKey] !== currentUser.id) return false;
            }
            // Admin/Super users see ALL transactions

            return true;
        });

        return { visibleTransactions: [...filtered].sort((a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime()) };
    }, [currentUser, transactions, clients, filters, isSuperUser]);

    const totalMyNetAllTime = useMemo(() => {
        return visibleTransactions.reduce((acc, tx) => acc + calculateUserShare(tx, currentUser), 0);
    }, [visibleTransactions, currentUser, globalConfig]);

    const monthlySummary = useMemo(() => {
        const summary: Record<string, { month: string, count: number, myShare: number, gross: number }> = {};

        visibleTransactions.forEach(tx => {
            const month = tx.brokeragePeriod || tx.transactionDate.substring(0, 7);
            if (!summary[month]) summary[month] = { month, count: 0, myShare: 0, gross: 0 };

            summary[month].count += 1;
            summary[month].gross += tx.grossAmount;
            summary[month].myShare += calculateUserShare(tx, currentUser);
        });

        return Object.values(summary).sort((a, b) => b.month.localeCompare(a.month)).map(item => {
            // Find existing invoice for this user and this specific month
            const invoice = invoices.find(inv => inv.month === item.month && inv.userId === currentUser.id);
            return { ...item, invoice };
        });
    }, [visibleTransactions, currentUser, invoices]);

    const clientWiseSummary = useMemo(() => {
        const summary: Record<string, { id: string, name: string, pan: string, count: number, gross: number, myShare: number }> = {};

        visibleTransactions.forEach(tx => {
            const clientId = tx.mappedClientId || 'Unmapped';
            const clientName = tx.investorName || 'Unknown';
            const pan = tx.pan || 'N/A';

            if (!summary[clientId]) {
                summary[clientId] = { id: clientId, name: clientName, pan, count: 0, gross: 0, myShare: 0 };
            }

            summary[clientId].count += 1;
            summary[clientId].gross += tx.grossAmount;
            summary[clientId].myShare += calculateUserShare(tx, currentUser);
        });

        return Object.values(summary).sort((a, b) => b.myShare - a.myShare);
    }, [visibleTransactions, currentUser]);

    const handleRaiseInvoice = (monthItem: any) => {
        if (!currentUser.bankDetails || !currentUser.bankDetails.accountNumber) {
            alert("Missing Bank Information: Please update your Profile in Settings first.");
            return;
        }
        if (monthItem.myShare <= 0) {
            alert("No brokerage amount available to invoice for this month.");
            return;
        }

        const roleName = globalConfig.levelNames[currentUser.level as keyof typeof globalConfig.levelNames] || `Level ${currentUser.level}`;
        const newInvoice: PayoutInvoice = {
            id: `INV-${Date.now()}`,
            userId: currentUser.id,
            userName: currentUser.name,
            userRole: roleName,
            month: monthItem.month,
            amount: parseFloat(monthItem.myShare.toFixed(2)),
            status: InvoiceStatus.SUBMITTED,
            submittedDate: new Date().toISOString().split('T')[0],
            transactionCount: monthItem.count,
            bankSnapshot: currentUser.bankDetails,
            addressSnapshot: currentUser.address
        };

        addInvoice(newInvoice);
        alert(`Success: Your invoice for ₹${newInvoice.amount.toLocaleString()} has been submitted for approval.`);
    };

    const handleApproveInvoice = (inv: PayoutInvoice) => {
        if (!window.confirm(`Mark invoice ${inv.id} as PAID?`)) return;
        const updatedInvoice: PayoutInvoice = {
            ...inv,
            status: InvoiceStatus.PAID,
            paidDate: new Date().toISOString().split('T')[0]
        };
        updateInvoice(updatedInvoice);
    };

    const generateInvoicePDF = (inv: PayoutInvoice) => {
        const doc = new jsPDF();

        // Header
        doc.setFillColor(37, 99, 235);
        doc.rect(0, 0, 210, 40, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.text("WEALTHFLOW BMS", 15, 20);
        doc.setFontSize(10);
        doc.text("BROKERAGE PAYOUT INVOICE", 15, 28);

        // Summary Info
        doc.setTextColor(30, 41, 59);
        doc.setFontSize(12);
        doc.text(`Invoice ID: ${inv.id}`, 140, 50);
        doc.text(`Period: ${inv.month}`, 140, 58);
        doc.text(`Date: ${inv.submittedDate || 'N/A'}`, 140, 66);

        doc.setFontSize(10);
        doc.text("ISSUED TO:", 15, 50);
        doc.setFont("helvetica", "bold");
        doc.text("WealthFlow Financial Services", 15, 56);
        doc.setFont("helvetica", "normal");
        doc.text("Corporate Accounting Office", 15, 61);

        doc.text("PAYEE DETAILS:", 15, 75);
        doc.setFont("helvetica", "bold");
        doc.text(inv.userName, 15, 81);
        doc.setFont("helvetica", "normal");
        doc.text(inv.userRole, 15, 86);
        doc.text(`A/C: ${inv.bankSnapshot?.accountNumber || 'N/A'}`, 15, 91);
        doc.text(`IFSC: ${inv.bankSnapshot?.ifscCode || 'N/A'}`, 15, 96);

        autoTable(doc, {
            startY: 105,
            head: [['Description', 'Transaction Count', 'Net Payable (INR)']],
            body: [[
                `Brokerage Commission Sharing - Settlement Period ${inv.month}`,
                inv.transactionCount,
                `INR ${inv.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
            ]],
            theme: 'grid',
            headStyles: { fillColor: [30, 41, 59] },
            styles: { fontSize: 10, cellPadding: 6 }
        });

        const finalY = (doc as any).lastAutoTable.finalY + 15;
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text(`TOTAL PAYABLE: ₹ ${inv.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 120, finalY);

        doc.save(`WealthFlow_Invoice_${inv.id}_${inv.month}.pdf`);
    };

    const handleDeleteTransaction = (tx: BrokerageTransaction) => {
        if (!isAdmin) {
            alert("Only administrators can delete transactions.");
            return;
        }
        if (window.confirm(`Are you sure you want to delete transaction for ${tx.investorName}? This action cannot be undone.`)) {
            deleteTransaction(tx.id);
        }
    };

    const handleDeleteInvoice = (inv: PayoutInvoice) => {
        if (!isAdmin && inv.userId !== currentUser.id) {
            alert("You can only delete your own invoices.");
            return;
        }
        if (window.confirm(`Are you sure you want to delete invoice ${inv.id}? This action cannot be undone.`)) {
            deleteInvoice(inv.id);
        }
    };

    const exportToExcel = (data: any[], filename: string, sheetName: string) => {
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, sheetName);
        XLSX.writeFile(wb, `${filename}.xlsx`);
    };

    const exportMonthlyReport = () => {
        const data = monthlySummary.map(m => ({
            'Settlement Period': m.month,
            'Transactions': m.count,
            ...(isAdmin ? { 'Gross Amount (₹)': m.gross.toFixed(2) } : {}),
            'My Net Share (₹)': m.myShare.toFixed(2),
            'Invoice Status': m.invoice ? m.invoice.status : 'Not Raised'
        }));
        exportToExcel(data, `Monthly_Payout_Report_${currentUser.name}_${new Date().toISOString().split('T')[0]}`, 'Monthly Payouts');
    };

    const exportClientWiseReport = () => {
        const data = clientWiseSummary.map(c => ({
            'Investor Name': c.name,
            'PAN': c.pan,
            'Transactions': c.count,
            ...(isAdmin ? { 'Gross Business (₹)': c.gross.toFixed(2) } : {}),
            'My Net Share (₹)': c.myShare.toFixed(2)
        }));
        exportToExcel(data, `Client_Wise_Report_${currentUser.name}_${new Date().toISOString().split('T')[0]}`, 'Client Summary');
    };

    const exportTransactionAudit = () => {
        const data = visibleTransactions
            .filter(tx => tx.investorName.toLowerCase().includes(transactionSearch.toLowerCase()))
            .map(tx => ({
                'Date': tx.transactionDate,
                'Investor Name': tx.investorName,
                'PAN': tx.pan,
                'Folio': tx.folio,
                'Scheme': tx.schemeName,
                'AMC': tx.amcName,
                ...(isAdmin ? { 'Gross Amount (₹)': tx.grossAmount.toFixed(2) } : {}),
                'My Net Share (₹)': calculateUserShare(tx, currentUser).toFixed(2)
            }));
        exportToExcel(data, `Transaction_Audit_${currentUser.name}_${new Date().toISOString().split('T')[0]}`, 'Transactions');
    };

    const exportAllReports = () => {
        const wb = XLSX.utils.book_new();

        // Monthly Summary Sheet
        const monthlyData = monthlySummary.map(m => ({
            'Settlement Period': m.month,
            'Transactions': m.count,
            ...(isAdmin ? { 'Gross Amount (₹)': m.gross.toFixed(2) } : {}),
            'My Net Share (₹)': m.myShare.toFixed(2),
            'Invoice Status': m.invoice ? m.invoice.status : 'Not Raised'
        }));
        const ws1 = XLSX.utils.json_to_sheet(monthlyData);
        XLSX.utils.book_append_sheet(wb, ws1, 'Monthly Payouts');

        // Client-wise Sheet
        const clientData = clientWiseSummary.map(c => ({
            'Investor Name': c.name,
            'PAN': c.pan,
            'Transactions': c.count,
            ...(isAdmin ? { 'Gross Business (₹)': c.gross.toFixed(2) } : {}),
            'My Net Share (₹)': c.myShare.toFixed(2)
        }));
        const ws2 = XLSX.utils.json_to_sheet(clientData);
        XLSX.utils.book_append_sheet(wb, ws2, 'Client Summary');

        // Transactions Sheet
        const txData = visibleTransactions.map(tx => ({
            'Date': tx.transactionDate,
            'Investor Name': tx.investorName,
            'PAN': tx.pan,
            'Folio': tx.folio,
            'Scheme': tx.schemeName,
            'AMC': tx.amcName,
            ...(isAdmin ? { 'Gross Amount (₹)': tx.grossAmount.toFixed(2) } : {}),
            'My Net Share (₹)': calculateUserShare(tx, currentUser).toFixed(2)
        }));
        const ws3 = XLSX.utils.json_to_sheet(txData);
        XLSX.utils.book_append_sheet(wb, ws3, 'Transactions');

        XLSX.writeFile(wb, `Complete_Report_${currentUser.name}_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Brokerage Settlements</h1>
                    <p className="text-slate-500 mt-1">
                        {isAdmin ? 'System-wide brokerage and payout control.' : 'Track your personal receivable brokerage and raise invoices.'}
                    </p>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => setShowFilters(!showFilters)} className={`flex items-center px-4 py-2 text-sm font-medium rounded-lg border transition ${showFilters ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'}`}>
                        <Filter className="w-4 h-4 mr-2" /> Month Filter
                    </button>
                    {activeTab === 'monthly' && (
                        <button onClick={exportMonthlyReport} className="flex items-center px-4 py-2 text-sm font-medium rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition">
                            <Download className="w-4 h-4 mr-2" /> Export Monthly
                        </button>
                    )}
                    {activeTab === 'client-summary' && (
                        <button onClick={exportClientWiseReport} className="flex items-center px-4 py-2 text-sm font-medium rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition">
                            <Download className="w-4 h-4 mr-2" /> Export Clients
                        </button>
                    )}
                    {activeTab === 'transaction' && (
                        <button onClick={exportTransactionAudit} className="flex items-center px-4 py-2 text-sm font-medium rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition">
                            <Download className="w-4 h-4 mr-2" /> Export Transactions
                        </button>
                    )}
                    {(activeTab === 'overview' || activeTab === 'monthly') && (
                        <button onClick={exportAllReports} className="flex items-center px-4 py-2 text-sm font-medium rounded-lg border border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 transition">
                            <Download className="w-4 h-4 mr-2" /> Export All
                        </button>
                    )}
                </div>
            </div>

            {showFilters && (
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm animate-in fade-in">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Financial Year</label>
                            <select value={filters.year} onChange={e => setFilters({ ...filters, year: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 font-bold">
                                <option value="All">All Years</option>
                                {yearsList.map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Month</label>
                            <select value={filters.month} onChange={e => setFilters({ ...filters, month: e.target.value })} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 font-bold">
                                <option value="All">All Months</option>
                                {["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"].map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                        </div>
                    </div>
                </div>
            )}

            <div className="border-b border-slate-200">
                <nav className="-mb-px flex space-x-6 overflow-x-auto">
                    {[
                        { id: 'overview', label: 'Summary', icon: Layers },
                        { id: 'monthly', label: 'Monthly Payouts', icon: Clock },
                        { id: 'client-summary', label: 'Client-wise', icon: Briefcase },
                        { id: 'transaction', label: 'Audit Log', icon: FileText },
                        { id: 'invoices', label: 'My Invoices', icon: Landmark },
                        isAdmin && { id: 'approvals', label: 'Approvals Queue', icon: ShieldCheck },
                    ].filter(Boolean).map((tab: any) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center transition-all ${activeTab === tab.id ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                                }`}
                        >
                            <tab.icon className="w-4 h-4 mr-2" />
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            {activeTab === 'overview' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {isAdmin && (
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                            <h3 className="text-slate-500 font-medium text-sm">System Gross Volume</h3>
                            <p className="text-3xl font-bold text-slate-900 mt-2">
                                ₹ {visibleTransactions.reduce((a, b) => a + b.grossAmount, 0).toLocaleString()}
                            </p>
                        </div>
                    )}
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                        <h3 className="text-slate-500 font-medium text-sm">My Net Receivable Share</h3>
                        <p className="text-3xl font-bold text-emerald-600 mt-2">
                            ₹ {totalMyNetAllTime.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </p>
                    </div>
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                        <h3 className="text-slate-500 font-medium text-sm">Folios Mapped</h3>
                        <p className="text-3xl font-bold text-slate-900 mt-2">{visibleTransactions.length}</p>
                    </div>
                </div>
            )}

            {activeTab === 'monthly' && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase tracking-widest text-[10px]">
                            <tr>
                                <th className="px-6 py-4">Settlement Period</th>
                                <th className="px-6 py-4 text-center">Transactions</th>
                                {isAdmin && <th className="px-6 py-4 text-right">Gross Amount</th>}
                                <th className="px-6 py-4 text-right">My Net Share</th>
                                <th className="px-6 py-4 text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {monthlySummary.map(m => (
                                <tr key={m.month} className="hover:bg-slate-50 transition">
                                    <td className="px-6 py-4 font-black text-slate-700">{m.month}</td>
                                    <td className="px-6 py-4 text-center text-slate-500">{m.count}</td>
                                    {isAdmin && <td className="px-6 py-4 text-right text-slate-400">₹ {m.gross.toLocaleString()}</td>}
                                    <td className="px-6 py-4 text-right font-black text-emerald-600 text-base">₹ {m.myShare.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                    <td className="px-6 py-4 text-center">
                                        {m.invoice ? (
                                            <div className="flex items-center justify-center space-x-2">
                                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase border ${m.invoice.status === 'PAID' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>{m.invoice.status}</span>
                                                <button onClick={() => generateInvoicePDF(m.invoice!)} className="p-1.5 text-slate-400 hover:text-blue-600 bg-slate-50 rounded-md transition" title="Download Invoice"><Printer className="w-4 h-4" /></button>
                                            </div>
                                        ) : (
                                            <button onClick={() => handleRaiseInvoice(m)} className="text-blue-600 hover:bg-blue-600 hover:text-white transition font-bold text-xs border border-blue-200 px-4 py-1.5 rounded-lg flex items-center mx-auto shadow-sm">
                                                <FileDown className="w-3 h-3 mr-2" /> Raise Invoice
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {monthlySummary.length === 0 && (
                                <tr><td colSpan={5} className="py-20 text-center text-slate-400">No data found for this period.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {activeTab === 'invoices' && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase tracking-widest text-[10px]">
                            <tr>
                                <th className="px-6 py-4">ID</th>
                                <th className="px-6 py-4">Month</th>
                                <th className="px-6 py-4 text-right">Amount</th>
                                <th className="px-6 py-4 text-center">Status</th>
                                <th className="px-6 py-4 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {invoices.filter(i => i.userId === currentUser.id).map(inv => (
                                <tr key={inv.id} className="hover:bg-slate-50 transition">
                                    <td className="px-6 py-4 font-mono text-xs text-slate-400">{inv.id}</td>
                                    <td className="px-6 py-4 font-bold text-slate-900">{inv.month}</td>
                                    <td className="px-6 py-4 text-right font-black text-emerald-600">₹ {inv.amount.toLocaleString()}</td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase border ${inv.status === 'PAID' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>{inv.status}</span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <button onClick={() => generateInvoicePDF(inv)} className="p-2 text-slate-400 hover:text-blue-600 bg-slate-50 rounded-lg transition" title="Download PDF"><Download className="w-4 h-4" /></button>
                                            <button onClick={() => handleDeleteInvoice(inv)} className="p-2 text-slate-400 hover:text-red-600 bg-slate-50 rounded-lg transition" title="Delete Invoice"><Trash2 className="w-4 h-4" /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {invoices.filter(i => i.userId === currentUser.id).length === 0 && (
                                <tr><td colSpan={5} className="py-20 text-center text-slate-400">No invoices raised yet.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {activeTab === 'approvals' && isAdmin && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-4 bg-amber-50 border-b border-amber-100 flex items-center justify-between">
                        <div>
                            <h3 className="font-bold text-amber-900">Pending Approvals</h3>
                            <p className="text-[10px] text-amber-700 uppercase font-black tracking-widest">Review and settle team invoices</p>
                        </div>
                    </div>
                    <table className="w-full text-sm text-left">
                        <thead className="bg-white text-slate-500 font-bold border-b border-slate-200 uppercase tracking-widest text-[10px]">
                            <tr>
                                <th className="px-6 py-4">User</th>
                                <th className="px-6 py-4">Period</th>
                                <th className="px-6 py-4 text-right">Amount</th>
                                <th className="px-6 py-4 text-center">Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {invoices.filter(i => i.status === InvoiceStatus.SUBMITTED).map(inv => (
                                <tr key={inv.id} className="hover:bg-slate-50 transition">
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-slate-900">{inv.userName}</div>
                                        <div className="text-[10px] text-slate-400 uppercase font-bold">{inv.userRole}</div>
                                    </td>
                                    <td className="px-6 py-4 font-medium">{inv.month}</td>
                                    <td className="px-6 py-4 text-right font-black text-blue-600">₹ {inv.amount.toLocaleString()}</td>
                                    <td className="px-6 py-4 text-center">
                                        <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase border bg-amber-50 text-amber-700 border-amber-200">Pending</span>
                                    </td>
                                    <td className="px-6 py-4 text-right flex items-center justify-end space-x-3">
                                        <button onClick={() => generateInvoicePDF(inv)} className="p-2 text-slate-400 hover:text-blue-600 bg-slate-50 rounded-lg transition" title="Download for Review"><Download className="w-4 h-4" /></button>
                                        <button onClick={() => handleApproveInvoice(inv)} className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-emerald-700 transition shadow-lg shadow-emerald-50">Settle & Mark Paid</button>
                                    </td>
                                </tr>
                            ))}
                            {invoices.filter(i => i.status === InvoiceStatus.SUBMITTED).length === 0 && (
                                <tr><td colSpan={5} className="py-20 text-center text-slate-400">No pending invoices for review.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {activeTab === 'client-summary' && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase tracking-widest text-[10px]">
                            <tr>
                                <th className="px-6 py-4">Investor Name</th>
                                <th className="px-6 py-4">PAN</th>
                                <th className="px-6 py-4 text-center">Txs</th>
                                {isAdmin && <th className="px-6 py-4 text-right">Gross Business</th>}
                                <th className="px-6 py-4 text-right">My Net Share</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {clientWiseSummary.map(c => (
                                <tr key={c.id} className="hover:bg-slate-50 transition">
                                    <td className="px-6 py-4 font-bold text-slate-900">{c.name}</td>
                                    <td className="px-6 py-4 font-mono text-xs text-slate-500">{c.pan}</td>
                                    <td className="px-6 py-4 text-center text-slate-500">{c.count}</td>
                                    {isAdmin && <td className="px-6 py-4 text-right text-slate-400">₹ {c.gross.toLocaleString()}</td>}
                                    <td className="px-6 py-4 text-right font-black text-emerald-600">₹ {c.myShare.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {activeTab === 'transaction' && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-4 border-b bg-slate-50 flex items-center justify-between">
                        <h3 className="font-bold text-slate-900 text-sm">Transaction Level Audit</h3>
                        <div className="relative">
                            <Search className="absolute left-3 top-2 w-4 h-4 text-slate-400" />
                            <input type="text" placeholder="Search investor..." value={transactionSearch} onChange={e => setTransactionSearch(e.target.value)} className="pl-9 pr-4 py-1.5 border rounded-lg text-xs" />
                        </div>
                    </div>
                    <table className="w-full text-sm text-left">
                        <thead className="bg-white text-slate-500 font-bold border-b border-slate-200 uppercase tracking-widest text-[10px]">
                            <tr>
                                <th className="px-6 py-4">Date</th>
                                <th className="px-6 py-4">Investor</th>
                                <th className="px-6 py-4 text-right">My Net Share</th>
                                {isAdmin && <th className="px-6 py-4 text-center">Action</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {visibleTransactions.filter(tx => tx.investorName.toLowerCase().includes(transactionSearch.toLowerCase())).slice(0, 100).map(tx => (
                                <tr key={tx.id} className="hover:bg-slate-50 transition">
                                    <td className="px-6 py-4 text-slate-500">{tx.transactionDate}</td>
                                    <td className="px-6 py-4 font-bold text-slate-900">{tx.investorName}</td>
                                    <td className="px-6 py-4 text-right font-black text-emerald-600">₹ {calculateUserShare(tx, currentUser).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                    {isAdmin && (
                                        <td className="px-6 py-4 text-center">
                                            <button onClick={() => handleDeleteTransaction(tx)} className="p-2 text-slate-400 hover:text-red-600 bg-slate-50 rounded-lg transition" title="Delete Transaction"><Trash2 className="w-4 h-4" /></button>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};
