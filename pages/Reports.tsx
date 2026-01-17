
import React, { useState, useMemo } from 'react';
import { Download, Filter, Layers, Clock, Briefcase, FileText, Landmark, ShieldCheck, Printer, X, FileDown, AlertTriangle } from 'lucide-react';
import { TeamMember, Role, InvoiceStatus, PayoutInvoice, BrokerageTransaction } from '../types';
import { useData } from '../contexts/DataContext';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ReportsProps {
  currentUser: TeamMember;
  onNavigate?: (page: string) => void;
}

export const Reports: React.FC<ReportsProps> = ({ currentUser }) => {
  const { transactions, clients, globalConfig, invoices, addInvoice, updateInvoice } = useData();
  
  const [activeTab, setActiveTab] = useState<'overview' | 'monthly' | 'client-summary' | 'invoices' | 'approvals'>('overview');
  
  const isAdmin = currentUser.role === Role.ADMIN;
  const isSuperUser = isAdmin || currentUser.level === 0 || currentUser.level === 1;

  const [filters, setFilters] = useState({
    month: 'All',
    year: new Date().getFullYear().toString()
  });

  const yearsList = useMemo(() => {
    const years = new Set<string>();
    years.add(new Date().getFullYear().toString());
    transactions.forEach(tx => {
      const year = (tx.brokeragePeriod || tx.transactionDate).split('-')[0];
      if (year && year.length === 4) years.add(year);
    });
    return Array.from(years).sort().reverse();
  }, [transactions]);

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

  const { visibleTransactions } = useMemo(() => {
    const filtered = transactions.filter(tx => {
      const client = clients.find(c => c.id === tx.mappedClientId);
      if (!isSuperUser) {
        if (!client) return false;
        const userLevelKey = `level${currentUser.level}Id` as keyof typeof client.hierarchy;
        if (client.hierarchy[userLevelKey] !== currentUser.id) return false;
      }
      const txYear = (tx.brokeragePeriod || tx.transactionDate).split('-')[0];
      const txMonth = (tx.brokeragePeriod || tx.transactionDate).split('-')[1];
      if (filters.year !== 'All' && txYear !== filters.year) return false;
      if (filters.month !== 'All' && txMonth !== filters.month) return false;
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
    return Object.values(summary).sort((a,b) => b.month.localeCompare(a.month)).map(item => {
      const invoice = invoices.find(inv => inv.month === item.month && inv.userId === currentUser.id);
      return { ...item, invoice };
    });
  }, [visibleTransactions, currentUser, invoices, globalConfig]);

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
    return Object.values(summary).sort((a,b) => b.myShare - a.myShare);
  }, [visibleTransactions, currentUser, globalConfig]);

  const handleRaiseInvoice = (monthItem: any) => {
    if (!currentUser.bankDetails || !currentUser.bankDetails.accountNumber) {
      alert("Please update your bank details in Profile settings before raising an invoice.");
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
  };

  const handleApproveInvoice = (inv: PayoutInvoice) => {
    if (!window.confirm(`Confirm Settlement: Mark invoice ${inv.id} for ₹${inv.amount.toLocaleString()} as PAID?`)) return;
    updateInvoice({ ...inv, status: InvoiceStatus.PAID, paidDate: new Date().toISOString().split('T')[0] });
  };

  const generateInvoicePDF = (inv: PayoutInvoice) => {
    const doc = new jsPDF();
    doc.setFillColor(37, 99, 235);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text("WEALTHFLOW BMS", 15, 20);
    doc.setFontSize(10);
    doc.text("BROKERAGE PAYOUT INVOICE", 15, 28);
    doc.setTextColor(30, 41, 59);
    doc.text(`Invoice ID: ${inv.id}`, 140, 50);
    doc.text(`Period: ${inv.month}`, 140, 56);
    doc.text(`Name: ${inv.userName}`, 15, 65);
    doc.text(`Bank: ${inv.bankSnapshot?.bankName || 'N/A'}`, 15, 71);
    doc.text(`A/C: ${inv.bankSnapshot?.accountNumber || 'N/A'}`, 15, 77);
    autoTable(doc, {
      startY: 85,
      head: [['Description', 'Volume (Tx)', 'Amount (₹)']],
      body: [[`Brokerage Sharing - ${inv.month}`, inv.transactionCount, `₹${inv.amount.toLocaleString()}`]],
      theme: 'grid'
    });
    doc.save(`Invoice_${inv.id}.pdf`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Brokerage Settlements</h1>
          <p className="text-slate-500 mt-1 font-medium">Financial audit and payout management.</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={filters.year} onChange={e => setFilters({...filters, year: e.target.value})} className="border border-slate-200 rounded-lg px-3 py-1.5 text-xs bg-white font-bold">
            {yearsList.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button onClick={() => setActiveTab('invoices')} className="bg-white border border-slate-200 px-4 py-1.5 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center">
            <Landmark className="w-3 h-3 mr-2 text-blue-600" /> My Invoices
          </button>
        </div>
      </div>

      <div className="border-b border-slate-200">
        <nav className="-mb-px flex space-x-6 overflow-x-auto">
          {[
            { id: 'overview', label: 'Summary', icon: Layers },
            { id: 'monthly', label: 'Monthly Payouts', icon: Clock },
            { id: 'client-summary', label: 'Client-wise', icon: Briefcase },
            isAdmin && { id: 'approvals', label: 'Approvals Queue', icon: ShieldCheck },
          ].filter(Boolean).map((tab: any) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`whitespace-nowrap py-4 px-1 border-b-2 font-black uppercase tracking-widest text-[10px] flex items-center transition-all ${activeTab === tab.id ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
              <tab.icon className="w-3.5 h-3.5 mr-2" /> {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in slide-in-from-bottom-2">
          {isAdmin && (
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">System Gross</h3>
              <p className="text-3xl font-black text-slate-900 mt-2">₹{visibleTransactions.reduce((a,b) => a + b.grossAmount, 0).toLocaleString()}</p>
            </div>
          )}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">My Net Payout</h3>
            <p className="text-3xl font-black text-emerald-600 mt-2">₹{totalMyNetAllTime.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
          </div>
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Transactions</h3>
            <p className="text-3xl font-black text-slate-900 mt-2">{visibleTransactions.length}</p>
          </div>
        </div>
      )}

      {activeTab === 'monthly' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 font-black border-b border-slate-200 uppercase tracking-widest text-[9px]">
              <tr>
                <th className="px-6 py-4">Settlement Period</th>
                <th className="px-6 py-4 text-center">Txs</th>
                <th className="px-6 py-4 text-right">My Share (₹)</th>
                <th className="px-6 py-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {monthlySummary.map(m => (
                <tr key={m.month} className="hover:bg-slate-50 transition">
                  <td className="px-6 py-4 font-bold text-slate-700">{m.month}</td>
                  <td className="px-6 py-4 text-center text-slate-500 font-bold">{m.count}</td>
                  <td className="px-6 py-4 text-right font-black text-emerald-600 text-base">₹{m.myShare.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  <td className="px-6 py-4 text-center">
                    {m.invoice ? (
                      <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase border ${m.invoice.status === 'PAID' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>{m.invoice.status}</span>
                    ) : (
                      <button onClick={() => handleRaiseInvoice(m)} className="text-blue-600 hover:bg-blue-600 hover:text-white transition font-black text-[10px] border border-blue-200 px-4 py-1.5 rounded-lg uppercase tracking-widest shadow-sm">Raise Invoice</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'invoices' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 font-black border-b border-slate-200 uppercase tracking-widest text-[9px]">
              <tr>
                <th className="px-6 py-4">Invoice ID</th>
                <th className="px-6 py-4">Period</th>
                <th className="px-6 py-4 text-right">Amount (₹)</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoices.filter(i => i.userId === currentUser.id).map(inv => (
                <tr key={inv.id} className="hover:bg-slate-50 transition">
                  <td className="px-6 py-4 font-mono text-[10px] text-slate-400">{inv.id}</td>
                  <td className="px-6 py-4 font-bold text-slate-900">{inv.month}</td>
                  <td className="px-6 py-4 text-right font-black text-emerald-600">₹{inv.amount.toLocaleString()}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase border ${inv.status === 'PAID' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>{inv.status}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button onClick={() => generateInvoicePDF(inv)} className="p-2 text-slate-400 hover:text-blue-600 bg-slate-50 rounded-lg transition" title="Download PDF"><Download className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'approvals' && isAdmin && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in">
          <div className="p-4 bg-blue-50 border-b border-blue-100 flex items-center justify-between">
            <div>
              <h3 className="font-black text-blue-900 uppercase tracking-tighter">Settlement Queue</h3>
              <p className="text-[10px] text-blue-700 uppercase font-bold tracking-widest">Admin Authorization Hub</p>
            </div>
          </div>
          <table className="w-full text-sm text-left">
            <thead className="bg-white text-slate-500 font-black border-b border-slate-200 uppercase tracking-widest text-[9px]">
              <tr>
                <th className="px-6 py-4">Payee</th>
                <th className="px-6 py-4">Period</th>
                <th className="px-6 py-4 text-right">Net Payable (₹)</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-right">Authorization</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoices.filter(i => i.status === InvoiceStatus.SUBMITTED).map(inv => (
                <tr key={inv.id} className="hover:bg-slate-50 transition">
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-900">{inv.userName}</div>
                    <div className="text-[10px] text-slate-400 uppercase font-black">{inv.userRole}</div>
                  </td>
                  <td className="px-6 py-4 font-medium text-slate-600">{inv.month}</td>
                  <td className="px-6 py-4 text-right font-black text-blue-600">₹{inv.amount.toLocaleString()}</td>
                  <td className="px-6 py-4 text-center">
                    <span className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase border bg-amber-50 text-amber-700 border-amber-200 animate-pulse">Pending</span>
                  </td>
                  <td className="px-6 py-4 text-right flex items-center justify-end space-x-2">
                    <button onClick={() => generateInvoicePDF(inv)} className="p-2 text-slate-400 hover:text-blue-600 bg-slate-50 rounded-lg transition"><Download className="w-4 h-4" /></button>
                    <button onClick={() => handleApproveInvoice(inv)} className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition shadow-lg shadow-blue-50">Settle Payout</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
