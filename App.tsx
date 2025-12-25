
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
  const [sessionRestored, setSessionRestored] = useState(false);

  // Restore user session from localStorage on app load
  useEffect(() => {
    const savedUser = localStorage.getItem('wealthflow_user');
    if (savedUser && !loading && team.length > 0) {
      try {
        const parsedUser = JSON.parse(savedUser);
        // Verify user still exists in team
        const userExists = team.find(t => t.id === parsedUser.id);
        if (userExists) {
          setCurrentUser(userExists);
          setContextUser(userExists);
          setIsLoggedIn(true);
          refreshDashboard(userExists);
        } else {
          // User no longer exists, clear session
          localStorage.removeItem('wealthflow_user');
        }
      } catch (error) {
        console.error('Failed to restore session:', error);
        localStorage.removeItem('wealthflow_user');
      }
      setSessionRestored(true);
    } else if (!loading) {
      setSessionRestored(true);
    }
  }, [loading, team]);

  // Update current user when team data changes
  useEffect(() => {
    if (currentUser) {
      const updatedUser = team.find(t => t.id === currentUser.id);
      if (updatedUser) {
        setCurrentUser(updatedUser);
        // Update localStorage with latest user data
        localStorage.setItem('wealthflow_user', JSON.stringify(updatedUser));
      }
    }
  }, [team]);

  const handleLogin = (user: TeamMember) => {
    setCurrentUser(user);
    setContextUser(user); // Set user in DataContext
    setIsLoggedIn(true);
    setActivePage('dashboard');
    // Save user session to localStorage
    localStorage.setItem('wealthflow_user', JSON.stringify(user));
    // Refresh data with user-specific filtering
    refreshDashboard(user);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setContextUser(null); // Clear user from DataContext
    setIsLoggedIn(false);
    // Clear user session from localStorage
    localStorage.removeItem('wealthflow_user');
  };

  if (loading || !sessionRestored) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <RefreshCcw className="w-10 h-10 text-blue-600 animate-spin mb-4" />
        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">
          {loading ? 'Connecting to MongoDB WealthFlow...' : 'Restoring session...'}
        </p>
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
