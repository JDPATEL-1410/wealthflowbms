
import React, { useState } from 'react';
import { LayoutDashboard, Upload, Users, Settings, PieChart, FileText, Menu, X, Bell, LogOut, ChevronUp, Cloud, CloudOff, RefreshCw } from 'lucide-react';
import { TeamMember, Role } from '../types';
import { useData } from '../contexts/DataContext';

interface LayoutProps {
  children: React.ReactNode;
  activePage: string;
  onNavigate: (page: string) => void;
  currentUser: TeamMember;
  onSwitchUser: (user: TeamMember) => void;
  onLogout: () => void;
}

const SidebarItem = ({ icon: Icon, label, active, onClick }: any) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center space-x-3 px-4 py-3 text-sm font-medium transition-colors ${
      active 
        ? 'bg-blue-50 text-blue-700 border-r-4 border-blue-600' 
        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
    }`}
  >
    <Icon className="w-5 h-5" />
    <span>{label}</span>
  </button>
);

export const Layout: React.FC<LayoutProps> = ({ children, activePage, onNavigate, currentUser, onSwitchUser, onLogout }) => {
  const { team, globalConfig, isOnline, isSyncing } = useData();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const isAdmin = currentUser.role === Role.ADMIN;

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 transform transition-transform duration-200 ease-in-out ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0`}>
        <div className="h-16 flex items-center px-6 border-b border-slate-200">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <PieChart className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold text-slate-800">WealthFlow</span>
          </div>
          <button className="md:hidden ml-auto" onClick={() => setIsMobileMenuOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="mt-6 space-y-1">
          <SidebarItem 
            icon={LayoutDashboard} 
            label="Dashboard" 
            active={activePage === 'dashboard'} 
            onClick={() => onNavigate('dashboard')} 
          />
          
          {isAdmin && (
            <SidebarItem 
              icon={Upload} 
              label="Imports & Data" 
              active={activePage === 'imports'} 
              onClick={() => onNavigate('imports')} 
            />
          )}

          <SidebarItem 
            icon={Users} 
            label={isAdmin ? "Clients & Map" : "My Clients"} 
            active={activePage === 'clients'} 
            onClick={() => onNavigate('clients')} 
          />
          <SidebarItem 
            icon={FileText} 
            label="Reports" 
            active={activePage === 'reports'} 
            onClick={() => onNavigate('reports')} 
          />
          {isAdmin && (
            <SidebarItem 
              icon={Settings} 
              label="Configuration" 
              active={activePage === 'settings'} 
              onClick={() => onNavigate('settings')} 
            />
          )}
        </nav>
        
        <div className="absolute bottom-0 w-full border-t border-slate-200 bg-white">
            {showUserMenu && (
                <div className="absolute bottom-full left-0 w-full bg-white border-t border-r border-slate-200 shadow-2xl max-h-96 overflow-y-auto animate-in slide-in-from-bottom-2">
                    <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Dev Tool: Switch Context</span>
                        <X className="w-3 h-3 text-slate-400 cursor-pointer" onClick={() => setShowUserMenu(false)} />
                    </div>
                    {team.map(member => (
                        <button
                            key={member.id}
                            onClick={() => {
                                onSwitchUser(member);
                                setShowUserMenu(false);
                                onNavigate('dashboard');
                            }}
                            className={`w-full text-left px-4 py-3 text-sm hover:bg-blue-50 flex items-center transition ${currentUser.id === member.id ? 'bg-blue-50 text-blue-700' : 'text-slate-700 border-b border-slate-50'}`}
                        >
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs mr-3 font-bold ${currentUser.id === member.id ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                {member.name.charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="font-bold truncate">{member.name}</div>
                                <div className="text-[10px] text-slate-500 uppercase font-medium">
                                    {member.role} • {globalConfig.levelNames[member.level as keyof typeof globalConfig.levelNames] || `Level ${member.level}`}
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            )}
            
          <button 
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition"
          >
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold ring-2 ring-white">
                {currentUser.name.charAt(0)}
              </div>
              <div className="text-left">
                <p className="text-sm font-bold text-slate-900 truncate max-w-[120px]">{currentUser.name}</p>
                <p className="text-[10px] text-slate-500 uppercase tracking-tighter font-semibold">{currentUser.role}</p>
              </div>
            </div>
            <ChevronUp className={`w-4 h-4 text-slate-400 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 lg:px-8">
          <button className="md:hidden" onClick={() => setIsMobileMenuOpen(true)}>
            <Menu className="w-6 h-6 text-slate-500" />
          </button>
          
          <div className="flex items-center ml-4 space-x-3">
             <span className="hidden md:inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                {isAdmin ? 'Full System Authority' : 'Restricted Access'}
             </span>
             
             {/* MongoDB Connection Status */}
             <div className="flex items-center space-x-2 px-3 py-1 bg-slate-50 border border-slate-100 rounded-full">
                {isSyncing ? (
                  <RefreshCw className="w-3 h-3 text-blue-600 animate-spin" />
                ) : isOnline ? (
                  <Cloud className="w-3 h-3 text-emerald-500" />
                ) : (
                  <CloudOff className="w-3 h-3 text-red-500" />
                )}
                <span className={`text-[10px] font-black uppercase tracking-tighter ${isOnline ? 'text-emerald-700' : 'text-red-700'}`}>
                   {isSyncing ? 'Syncing...' : isOnline ? 'Live Cloud' : 'Offline'}
                </span>
             </div>
          </div>

          <div className="flex items-center space-x-4 ml-auto">
             <button className="p-2 text-slate-400 hover:text-slate-500 relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
            <div className="h-8 w-px bg-slate-200 mx-2 hidden sm:block"></div>
            <button onClick={onLogout} className="hidden sm:flex items-center space-x-2 text-slate-500 hover:text-red-600 transition">
              <LogOut className="w-4 h-4" />
              <span className="text-sm font-medium">Logout</span>
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
};
