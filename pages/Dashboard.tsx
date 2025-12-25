
import React, { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { ArrowUpRight, IndianRupee, Users, AlertCircle, Table, BarChart2, TrendingUp, Wallet, Landmark, Briefcase, ChevronRight, Hash } from 'lucide-react';
import { TeamMember, Role, BrokerageTransaction } from '../types';
import { useData } from '../contexts/DataContext';

interface DashboardProps {
  currentUser: TeamMember;
}

const StatCard = ({ title, value, sub, icon: Icon, color }: any) => (
  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
    <div className="flex items-center justify-between mb-4">
      <div className={`p-2 rounded-lg ${color}`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-full">YTD</span>
    </div>
    <h3 className="text-slate-500 text-sm font-medium">{title}</h3>
    <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
    <p className="text-sm text-slate-500 mt-1">{sub}</p>
  </div>
);

export const Dashboard: React.FC<DashboardProps> = ({ currentUser }) => {
  const { transactions, clients, globalConfig } = useData();
  const [trendView, setTrendView] = useState<'chart' | 'table'>('chart');

  const isAdmin = currentUser.role === Role.ADMIN;
  const isSuperUser = isAdmin || currentUser.level === 0 || currentUser.level === 1;

  const calculateUserShare = (tx: BrokerageTransaction) => {
    if (tx.breakdown) {
      return tx.breakdown.levelPayouts[currentUser.level as keyof typeof tx.breakdown.levelPayouts] || 0;
    }
    const netPool = tx.grossAmount * (1 - (globalConfig.companyExpensePct / 100));
    const userPct = currentUser.customLevels?.[currentUser.level as keyof typeof currentUser.customLevels]
      ?? globalConfig.levels[currentUser.level as keyof typeof globalConfig.levels]
      ?? 0;
    return netPool * (userPct / 100);
  };

  const stats = useMemo(() => {
    const myClientIds = clients.filter(c => {
      if (isSuperUser) return true;
      const h = c.hierarchy;
      const userLevelKey = `level${currentUser.level}Id` as keyof typeof h;
      return h[userLevelKey] === currentUser.id;
    }).map(c => c.id);

    const visibleTransactions = transactions.filter(tx => {
      if (isSuperUser) return true;
      return tx.mappedClientId && myClientIds.includes(tx.mappedClientId);
    });

    let totalMyNet = 0;
    let totalGrossVolume = 0;
    const monthlyAgg: Record<string, { name: string, myNet: number }> = {};
    const amcAgg: Record<string, number> = {};
    const clientAgg: Record<string, number> = {};
    const schemeAgg: Record<string, number> = {};

    visibleTransactions.forEach(tx => {
      const myShare = calculateUserShare(tx);
      totalMyNet += myShare;
      totalGrossVolume += tx.grossAmount;

      const amc = tx.amcName || 'Unknown';
      amcAgg[amc] = (amcAgg[amc] || 0) + myShare;

      const clientName = tx.investorName || 'Unknown';
      clientAgg[clientName] = (clientAgg[clientName] || 0) + myShare;

      const scheme = tx.schemeName || 'Unknown';
      schemeAgg[scheme] = (schemeAgg[scheme] || 0) + myShare;

      const monthKey = tx.brokeragePeriod || tx.transactionDate.substring(0, 7);
      if (!monthlyAgg[monthKey]) {
        const [y, m] = monthKey.split('-');
        const date = new Date(parseInt(y), parseInt(m) - 1);
        const label = date.toLocaleString('default', { month: 'short', year: '2-digit' });
        monthlyAgg[monthKey] = { name: label, myNet: 0 };
      }
      monthlyAgg[monthKey].myNet += myShare;
    });

    const chartData = Object.entries(monthlyAgg)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([_, data]) => data);

    const getTop = (agg: Record<string, number>) => {
      const sorted = Object.entries(agg).sort((a, b) => b[1] - a[1]);
      return sorted[0] ? { name: sorted[0][0], val: sorted[0][1] } : { name: 'None', val: 0 };
    };

    return {
      totalTx: visibleTransactions.length,
      totalMyNet,
      totalGrossVolume,
      myClientsCount: myClientIds.length,
      monthlyData: chartData.length > 0 ? chartData : [{ name: 'No Data', myNet: 0 }],
      topAmc: getTop(amcAgg),
      topClient: getTop(clientAgg),
      topScheme: getTop(schemeAgg)
    };
  }, [currentUser, transactions, clients, globalConfig, isSuperUser]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-500 text-sm mt-1">
            {isAdmin ? 'System-wide performance overview.' : `Receivable commission tracking for ${currentUser.name}.`}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isAdmin && (
          <StatCard
            title="System Gross Volume"
            value={`₹ ${(stats.totalGrossVolume).toLocaleString()}`}
            sub="Total Brokerage Received"
            icon={IndianRupee}
            color="bg-blue-500"
          />
        )}
        <StatCard
          title={isAdmin ? "Total Payout Pool" : "My Net Receivable"}
          value={`₹ ${stats.totalMyNet.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
          sub="Realized Commission"
          icon={TrendingUp}
          color="bg-emerald-500"
        />
        <StatCard
          title="Clients & Folios"
          value={stats.myClientsCount}
          sub={`${stats.totalTx} Transactions Mapped`}
          icon={Users}
          color="bg-violet-500"
        />
        {!isAdmin && (
          <StatCard
            title="My Account Level"
            value={`L-${currentUser.level}`}
            sub={globalConfig.levelNames[currentUser.level as keyof typeof globalConfig.levelNames] || 'Member'}
            icon={Landmark}
            color="bg-slate-700"
          />
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Earnings Growth</h3>
              <p className="text-xs text-slate-400">Monthly breakdown of your personal payouts.</p>
            </div>
          </div>

          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.monthlyData}>
                <defs>
                  <linearGradient id="colorMyNet" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                <Tooltip
                  formatter={(value: number) => [`₹${value.toLocaleString()}`, 'Commission']}
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0' }}
                />
                <Area type="monotone" dataKey="myNet" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorMyNet)" name="Net Share" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
          <h3 className="text-lg font-bold text-slate-900 mb-2">My Payout Mix</h3>
          <p className="text-xs text-slate-500 mb-6">Top performing segments based on your sharing %.</p>

          <div className="flex-1 space-y-6">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                  <Landmark className="w-4 h-4" />
                </div>
                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Top AMC</span>
              </div>
              <div className="flex justify-between items-end">
                <span className="text-sm font-bold text-slate-700 truncate max-w-[120px]">{stats.topAmc.name}</span>
                <span className="text-lg font-black text-blue-600">₹{stats.topAmc.val.toLocaleString()}</span>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Top Client</span>
              </div>
              <div className="flex justify-between items-end">
                <span className="text-sm font-bold text-slate-700 truncate max-w-[120px]">{stats.topClient.name}</span>
                <span className="text-lg font-black text-emerald-600">₹{stats.topClient.val.toLocaleString()}</span>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-8 h-8 rounded-lg bg-violet-100 text-violet-600 flex items-center justify-center">
                  <Briefcase className="w-4 h-4" />
                </div>
                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Top Scheme</span>
              </div>
              <div className="flex justify-between items-end">
                <span className="text-sm font-bold text-slate-700 truncate max-w-[120px]">{stats.topScheme.name}</span>
                <span className="text-lg font-black text-violet-600">₹{stats.topScheme.val.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
