
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


  // Check authentication status with Passport.js on app load
  useEffect(() => {
    if (sessionRestored) return;

    const checkAuthStatus = async () => {
      try {
        console.log('🔍 Checking authentication status...');

        // Check if user is authenticated via Passport session
        const response = await fetch('/api/auth/status', {
          credentials: 'include' // IMPORTANT: Send session cookie
        });

        const data = await response.json();

        if (data.authenticated && data.user) {
          console.log('✅ User authenticated:', data.user);

          // Create TeamMember object from authenticated user
          const teamMember: TeamMember = {
            id: data.user.id,
            name: data.user.name,
            code: data.user.code || '',
            role: data.user.role,
            level: data.user.level,
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

          // Also save to localStorage for backward compatibility
          localStorage.setItem('wealthflow_user', JSON.stringify(teamMember));
        } else {
          console.log('ℹ️ No active session');
          // Clear any old localStorage data
          localStorage.removeItem('wealthflow_user');
        }
      } catch (error) {
        console.error('❌ Auth check failed:', error);
        localStorage.removeItem('wealthflow_user');
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

  const handleLogout = async () => {
    try {
      console.log('🚪 Logging out...');

      // Call Passport.js logout endpoint
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include' // IMPORTANT: Send session cookie
      });

      console.log('✅ Logout successful');
    } catch (error) {
      console.error('❌ Logout error:', error);
    } finally {
      // Clear frontend state regardless of API call result
      setCurrentUser(null);
      setContextUser(null);
      setIsLoggedIn(false);
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
