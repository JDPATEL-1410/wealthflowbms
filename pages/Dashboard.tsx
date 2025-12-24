
import React, { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { ArrowUpRight, DollarSign, Users, AlertCircle, Table, BarChart2 } from 'lucide-react';
import { TeamMember, Role } from '../types';
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

  // --- Filter Logic ---
  const { totalGross, myClientsCount, unmappedCount, monthlyData, payoutData } = useMemo(() => {
    // 1. Identify which clients belong to this user
    let myClientIds: string[] = [];
    
    if (currentUser.role === Role.ADMIN || currentUser.level === 1) {
      // Admin sees everything
      myClientIds = clients.map(c => c.id);
    } else {
      // Hierarchy based filter
      const levelKey = `level${currentUser.level}Id` as keyof typeof clients[0]['hierarchy'];
      myClientIds = clients
        .filter(c => c.hierarchy[levelKey] === currentUser.id)
        .map(c => c.id);
    }

    // 2. Filter transactions based on visible clients
    const visibleTransactions = transactions.filter(tx => {
        if (!tx.mappedClientId) return currentUser.role === Role.ADMIN; // Only admin sees unmapped
        return myClientIds.includes(tx.mappedClientId);
    });

    // 3. Calculate stats
    const gross = visibleTransactions.reduce((sum, tx) => sum + tx.grossAmount, 0);
    const unmapped = transactions.filter(tx => !tx.mappedClientId).length;
    
    // 4. Monthly Aggregation
    const monthlyAgg: Record<string, {name: string, gross: number, net: number}> = {};
    visibleTransactions.forEach(tx => {
        // Use brokeragePeriod for chart aggregation
        const monthKey = tx.brokeragePeriod || tx.transactionDate.substring(0, 7);
        if (!monthlyAgg[monthKey]) {
            const [y, m] = monthKey.split('-');
            const date = new Date(parseInt(y), parseInt(m) - 1);
            const label = date.toLocaleString('default', { month: 'short', year: '2-digit' });
            monthlyAgg[monthKey] = { name: label, gross: 0, net: 0 };
        }
        monthlyAgg[monthKey].gross += tx.grossAmount;
        monthlyAgg[monthKey].net += (tx.grossAmount * (1 - globalConfig.companyExpensePct/100));
    });

    const chartData = Object.entries(monthlyAgg)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([_, data]) => data);

    // 5. Dynamic Payout Data based on Global Config
    const payoutChartData = [
        { name: `L6 (${globalConfig.levelNames[6]})`, value: globalConfig.levels[6] },
        { name: `L5 (${globalConfig.levelNames[5]})`, value: globalConfig.levels[5] },
        { name: `L1 (${globalConfig.levelNames[1]})`, value: globalConfig.levels[1] },
        { name: 'Expense', value: globalConfig.companyExpensePct },
    ];

    return {
        totalGross: gross,
        myClientsCount: myClientIds.length,
        unmappedCount: currentUser.role === Role.ADMIN ? unmapped : 0,
        monthlyData: chartData.length > 0 ? chartData : [{name: 'No Data', gross: 0, net: 0}],
        payoutData: payoutChartData
    };
  }, [currentUser, transactions, clients, globalConfig]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between">
        <div>
            <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
            <p className="text-slate-500 text-sm mt-1">
                Overview for {currentUser.name} 
                {currentUser.role !== Role.ADMIN && ` (Level ${currentUser.level})`}
            </p>
        </div>
        <div className="flex space-x-3 mt-4 md:mt-0">
          <select className="bg-white border border-slate-300 text-slate-700 text-sm rounded-lg p-2.5">
            <option>Last 6 Months</option>
            <option>FY 2023-24</option>
          </select>
          <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition">
            Export Report
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="My Gross Brokerage" 
          value={`₹ ${(totalGross / 1000).toFixed(1)} K`} 
          sub="FY 2023-24 YTD" 
          icon={DollarSign} 
          color="bg-blue-500" 
        />
        <StatCard 
          title="Net Payout Pool" 
          value={`₹ ${(totalGross * (1 - globalConfig.companyExpensePct/100) / 1000).toFixed(1)} K`} 
          sub="Estimated Shareable" 
          icon={ArrowUpRight} 
          color="bg-emerald-500" 
        />
        <StatCard 
          title="My Mapped Clients" 
          value={myClientsCount} 
          sub="Active Portfolios" 
          icon={Users} 
          color="bg-violet-500" 
        />
        {currentUser.role === Role.ADMIN && (
            <StatCard 
            title="Unmapped Lines" 
            value={unmappedCount} 
            sub="Requires Action" 
            icon={AlertCircle} 
            color="bg-amber-500" 
            />
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-900">Brokerage Trend (Period Wise)</h3>
            <div className="flex bg-slate-100 rounded-lg p-1">
                <button 
                  onClick={() => setTrendView('chart')} 
                  className={`p-1.5 rounded-md transition flex items-center space-x-1 ${trendView === 'chart' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                  title="Chart View"
                >
                    <BarChart2 className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setTrendView('table')} 
                  className={`p-1.5 rounded-md transition flex items-center space-x-1 ${trendView === 'table' ? 'bg-white shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                  title="Table View"
                >
                    <Table className="w-4 h-4" />
                </button>
            </div>
          </div>

          <div className="h-80">
            {trendView === 'chart' ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyData}>
                  <defs>
                    <linearGradient id="colorGross" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorNet" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b'}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b'}} />
                  <Tooltip 
                    contentStyle={{backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0'}}
                    itemStyle={{color: '#1e293b'}}
                  />
                  <Area type="monotone" dataKey="gross" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorGross)" name="Gross Received" />
                  <Area type="monotone" dataKey="net" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorNet)" name="Net Pool" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="overflow-auto h-full pr-2">
                <table className="w-full text-sm text-left">
                     <thead className="bg-slate-50 text-slate-500 font-medium sticky top-0 z-10">
                         <tr>
                             <th className="px-4 py-3 border-b">Period</th>
                             <th className="px-4 py-3 text-right border-b">Gross Amount</th>
                             <th className="px-4 py-3 text-right border-b">Net Pool (Est.)</th>
                         </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100">
                         {monthlyData.map((d) => (
                             <tr key={d.name} className="hover:bg-slate-50">
                                 <td className="px-4 py-3 text-slate-900 font-medium">{d.name}</td>
                                 <td className="px-4 py-3 text-right text-blue-600">₹{d.gross.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                 <td className="px-4 py-3 text-right text-emerald-600 font-semibold">₹{d.net.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                             </tr>
                         ))}
                     </tbody>
                 </table>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-6">Avg. Payout Split</h3>
          <div className="h-64">
             <ResponsiveContainer width="100%" height="100%">
              <BarChart data={payoutData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={80} tick={{fill: '#475569', fontSize: 12}} />
                <Tooltip cursor={{fill: 'transparent'}} />
                <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 text-center text-sm text-slate-500">
            Based on Default Sharing Rule (Global)
          </div>
        </div>
      </div>
    </div>
  );
};
