
import React, { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Users, TrendingUp, Landmark, Briefcase } from 'lucide-react';
import { TeamMember, Role, BrokerageTransaction } from '../types';
import { useData } from '../contexts/DataContext';

interface DashboardProps {
  currentUser: TeamMember;
}

const StatCard = ({ title, value, sub, icon: Icon, color }: any) => (
  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
    <div className="flex items-center justify-between mb-4">
      <div className={`p-2 rounded-lg ${color}`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <span className="text-[10px] font-black text-slate-400 bg-slate-100 px-2 py-1 rounded-full uppercase tracking-widest">Live Sync</span>
    </div>
    <h3 className="text-slate-500 text-sm font-medium">{title}</h3>
    <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
    <p className="text-sm text-slate-500 mt-1 font-medium">{sub}</p>
  </div>
);

export const Dashboard: React.FC<DashboardProps> = ({ currentUser }) => {
  const { transactions, clients, globalConfig } = useData();

  const isAdmin = currentUser.role === Role.ADMIN;
  const isSuperUser = isAdmin || currentUser.level === 0 || currentUser.level === 1;

  const calculateUserShare = (tx: BrokerageTransaction) => {
    if (tx.breakdown) {
      return tx.breakdown.levelPayouts[currentUser.level as keyof typeof tx.breakdown.levelPayouts] || 0;
    }
    const expenseAmount = tx.grossAmount * (globalConfig.companyExpensePct / 100);
    const netPool = tx.grossAmount - expenseAmount;
    const userPct = currentUser.customLevels?.[currentUser.level as keyof typeof currentUser.customLevels] 
                    ?? globalConfig.levels[currentUser.level as keyof typeof globalConfig.levels] 
                    ?? 0;
    return netPool * (userPct / 100);
  };

  const stats = useMemo(() => {
    const myClientIds = clients.filter(c => {
      if (isSuperUser) return true;
      const userLevelKey = `level${currentUser.level}Id` as keyof typeof c.hierarchy;
      return c.hierarchy[userLevelKey] === currentUser.id;
    }).map(c => c.id);

    const visibleTransactions = transactions.filter(tx => {
      if (isSuperUser) return true;
      return tx.mappedClientId && myClientIds.includes(tx.mappedClientId);
    });

    let totalMyNet = 0;
    let totalGrossVolume = 0;
    const monthlyAgg: Record<string, {name: string, myNet: number}> = {};
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
      const sorted = Object.entries(agg).sort((a,b) => b[1] - a[1]);
      return sorted[0] ? { name: sorted[0][0], val: sorted[0][1] } : { name: 'None', val: 0 };
    };

    return {
      totalTx: visibleTransactions.length,
      totalMyNet,
      totalGrossVolume,
      myClientsCount: myClientIds.length,
      monthlyData: chartData.length > 0 ? chartData : [{name: 'No Data', myNet: 0}],
      topAmc: getTop(amcAgg),
      topClient: getTop(clientAgg),
      topScheme: getTop(schemeAgg)
    };
  }, [currentUser, transactions, clients, globalConfig, isSuperUser]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">System Performance</h1>
          <p className="text-slate-500 text-sm mt-1 font-medium">
            {isAdmin ? 'Real-time analytics across all hierarchies.' : `Earnings dashboard for ${currentUser.name}.`}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isAdmin && (
          <StatCard 
            title="Enterprise Gross Volume" 
            value={`₹${(stats.totalGrossVolume).toLocaleString()}`} 
            sub="Aggregated Brokerage" 
            icon={TrendingUp} 
            color="bg-blue-600" 
          />
        )}
        <StatCard 
          title={isAdmin ? "Total Payout Pool" : "My Net Receivable"} 
          value={`₹${stats.totalMyNet.toLocaleString(undefined, { minimumFractionDigits: 2 })}`} 
          sub="Realized Earnings" 
          icon={Landmark} 
          color="bg-emerald-600" 
        />
        <StatCard 
          title="Portfolio Count" 
          value={stats.myClientsCount} 
          sub={`${stats.totalTx} Active Transactions`} 
          icon={Users} 
          color="bg-indigo-600" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Revenue Growth</h3>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Net Monthly Share Trends (INR)</p>
            </div>
          </div>

          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.monthlyData}>
                <defs>
                  <linearGradient id="colorMyNet" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 700}} tickFormatter={(val) => `₹${(val/1000).toFixed(0)}k`} />
                <Tooltip 
                  formatter={(value: number) => [`₹${value.toLocaleString()}`, 'Commission']}
                  contentStyle={{backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)'}}
                  labelStyle={{fontWeight: 800, color: '#1e293b'}}
                />
                <Area type="monotone" dataKey="myNet" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorMyNet)" name="Net Share" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
          <h3 className="text-lg font-bold text-slate-900 mb-1">Top Producers</h3>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-6">Real-time Performance</p>
          
          <div className="flex-1 space-y-5">
            {[
              { label: 'Asset Management', data: stats.topAmc, icon: Landmark, color: 'text-blue-600', bg: 'bg-blue-50' },
              { label: 'Key Investor', data: stats.topClient, icon: Users, color: 'text-emerald-600', bg: 'bg-emerald-50' },
              { label: 'Prime Scheme', data: stats.topScheme, icon: Briefcase, color: 'text-indigo-600', bg: 'bg-indigo-50' }
            ].map((item, idx) => (
              <div key={idx} className={`${item.bg} p-4 rounded-xl border border-slate-100 flex flex-col`}>
                <div className="flex items-center space-x-2 mb-2">
                  <item.icon className={`w-4 h-4 ${item.color}`} />
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.label}</span>
                </div>
                <div className="flex justify-between items-end">
                  <span className="text-sm font-bold text-slate-700 truncate max-w-[140px]">{item.data.name}</span>
                  <span className={`text-base font-black ${item.color}`}>₹{item.data.val.toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
