
import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Imports } from './pages/Imports';
import { Settings } from './pages/Settings';
import { ClientsAndHierarchy } from './pages/ClientsAndHierarchy';
import { Reports } from './pages/Reports';
import { Login } from './pages/Login';
import { TeamMember, Role } from './types';
import { DataProvider, useData } from './contexts/DataContext';
import { RefreshCcw } from 'lucide-react';

const AppContent: React.FC = () => {
  const { team, loading, setCurrentUser: setContextUser, refreshDashboard } = useData();
  const [activePage, setActivePage] = useState('dashboard');
  const [currentUser, setCurrentUser] = useState<TeamMember | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    if (currentUser) {
      const updatedUser = team.find(t => t.id === currentUser.id);
      if (updatedUser) setCurrentUser(updatedUser);
    }
  }, [team]);

  const handleLogin = (user: TeamMember) => {
    setCurrentUser(user);
    setContextUser(user); // Set user in DataContext
    setIsLoggedIn(true);
    setActivePage('dashboard');
    // Refresh data with user-specific filtering
    refreshDashboard(user);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setContextUser(null); // Clear user from DataContext
    setIsLoggedIn(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <RefreshCcw className="w-10 h-10 text-blue-600 animate-spin mb-4" />
        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Connecting to MongoDB WealthFlow...</p>
      </div>
    );
  }

  if (!isLoggedIn || !currentUser) {
    return <Login onLogin={handleLogin} />;
  }

  const isAdmin = currentUser.role === Role.ADMIN;

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':
        return <Dashboard currentUser={currentUser} />;
      case 'imports':
        return isAdmin ? <Imports currentUser={currentUser} /> : <Dashboard currentUser={currentUser} />;
      case 'clients':
        return <ClientsAndHierarchy currentUser={currentUser} />;
      case 'reports':
        return <Reports currentUser={currentUser} />;
      case 'settings':
        return <Settings currentUser={currentUser} />;
      default:
        return <Dashboard currentUser={currentUser} />;
    }
  };

  return (
    <Layout
      activePage={activePage}
      onNavigate={setActivePage}
      currentUser={currentUser}
      onSwitchUser={setCurrentUser}
      onLogout={handleLogout}
    >
      {renderPage()}
    </Layout>
  );
};

const App: React.FC = () => {
  return (
    <DataProvider>
      <AppContent />
    </DataProvider>
  );
};

export default App;
