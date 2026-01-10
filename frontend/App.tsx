
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
import { authFetch } from './config/apiConfig';

const AppContent: React.FC = () => {
  const { team, loading, setCurrentUser: setContextUser, refreshDashboard } = useData();
  const [activePage, setActivePage] = useState('dashboard');
  const [currentUser, setCurrentUser] = useState<TeamMember | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [sessionRestored, setSessionRestored] = useState(false);


  // Check authentication status with JWT on app load
  useEffect(() => {
    if (sessionRestored) return;

    const checkAuthStatus = async () => {
      try {
        const token = localStorage.getItem('wealthflow_token');
        if (!token) {
          console.log('ℹ️ No token found');
          localStorage.removeItem('wealthflow_user');
          setSessionRestored(true);
          return;
        }

        console.log('🔍 Verifying authentication token...');

        const response = await authFetch('/api/auth/me');
        const data = await response.json();

        if (response.ok && data.success && data.user) {
          console.log('✅ Token verified:', data.user);

          const teamMember: TeamMember = {
            id: data.user.id,
            name: data.user.name || data.user.fullName,
            code: data.user.code || data.user.employeeCode || '',
            role: data.user.role,
            level: data.user.level || data.user.hierarchyLevel,
            email: data.user.email,
            password: '',
            bankDetails: data.user.bankDetails || {
              accountName: '',
              accountNumber: '',
              bankName: '',
              ifscCode: ''
            }
          };

          setCurrentUser(teamMember);
          setContextUser(teamMember);
          setIsLoggedIn(true);
          localStorage.setItem('wealthflow_user', JSON.stringify(teamMember));
        } else {
          console.log('❌ Token invalid or expired');
          localStorage.removeItem('wealthflow_token');
          localStorage.removeItem('wealthflow_user');
        }
      } catch (error) {
        console.error('❌ Auth verification failed:', error);
      } finally {
        setSessionRestored(true);
      }
    };

    if (!loading) {
      checkAuthStatus();
    }
  }, [loading, sessionRestored, setContextUser]);

  // Update current user when team data changes
  useEffect(() => {
    if (currentUser) {
      const updatedUser = team.find(t => t.id === currentUser.id);
      if (updatedUser) {
        setCurrentUser(updatedUser);
        localStorage.setItem('wealthflow_user', JSON.stringify(updatedUser));
      }
    }
  }, [team]);

  const handleLogin = (user: TeamMember) => {
    setCurrentUser(user);
    setContextUser(user);
    setIsLoggedIn(true);
    setActivePage('dashboard');
    localStorage.setItem('wealthflow_user', JSON.stringify(user));
    refreshDashboard(user);
  };

  const handleLogout = async () => {
    try {
      console.log('🚪 Logging out...');
      await authFetch('/api/auth/logout', { method: 'POST' });
    } catch (error) {
      console.error('❌ Logout error:', error);
    } finally {
      setCurrentUser(null);
      setContextUser(null);
      setIsLoggedIn(false);
      localStorage.removeItem('wealthflow_token');
      localStorage.removeItem('wealthflow_user');
    }
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
