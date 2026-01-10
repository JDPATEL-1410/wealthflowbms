
import React, { useState } from 'react';
import { PieChart, Mail, Lock, Key, ArrowRight, ShieldCheck, RefreshCw, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { TeamMember } from '../types';
import { useData } from '../contexts/DataContext';

interface LoginProps {
  onLogin: (user: TeamMember) => void;
}

type AuthView = 'LOGIN' | 'FORGOT' | 'OTP' | 'RESET';

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const { isOnline, loading } = useData();
  const [view, setView] = useState<AuthView>('LOGIN');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // Forgot Password States
  const [otp, setOtp] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState('');

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsAuthenticating(true);

    try {
      console.log('🔐 Attempting login...');

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: identifier.trim(),
          password: password.trim()
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      if (data.success && data.token && data.user) {
        console.log('✅ Login successful:', data.user);

        // Store JWT token
        localStorage.setItem('wealthflow_token', data.token);

        // Create TeamMember object from authenticated user
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

        // Call parent onLogin with authenticated user
        onLogin(teamMember);
      } else {
        setError('Login failed. Please try again.');
      }
    } catch (error: any) {
      console.error('❌ Login error:', error);
      setError(error.message || 'Unable to connect to authentication service. Please try again.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    // OTP recovery is currently simulated
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(code);
    console.log(`[AUTH SERVICE] Recovery OTP for ${identifier}: ${code}`);
    alert(`Recovery code has been simulated for ${identifier}. Check console for OTP: ${code}`);
    setView('OTP');
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (otp === generatedOtp) {
      alert('Password reset functionality is currently restricted. Please contact Administrator.');
      setView('LOGIN');
    } else {
      setError('Invalid code.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center space-x-3 mb-8">
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-xl shadow-blue-200">
            <PieChart className="w-7 h-7 text-white" />
          </div>
          <span className="text-3xl font-black text-slate-900 tracking-tighter uppercase">WealthFlow</span>
        </div>

        <div className="bg-white rounded-3xl shadow-2xl shadow-slate-200 overflow-hidden border border-slate-100">
          <div className="p-8">
            {view === 'LOGIN' && (
              <form onSubmit={handleLoginSubmit} className="space-y-6">
                <div className="text-center mb-8">
                  <h1 className="text-2xl font-bold text-slate-900">Sign In</h1>
                  <p className="text-slate-500 text-sm mt-1">Authorized Access Only</p>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-100 text-red-600 p-3 rounded-xl text-xs font-bold flex items-center animate-in fade-in slide-in-from-top-1">
                    <AlertCircle className="w-4 h-4 mr-2" /> {error}
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Employee ID or Email</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        required
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition font-medium"
                        placeholder="ID or registered email"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Password</label>
                      <button
                        type="button"
                        onClick={() => setView('FORGOT')}
                        className="text-[10px] font-bold text-blue-600 hover:text-blue-700 uppercase tracking-wider"
                      >
                        Recovery?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-12 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition font-medium"
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-3.5 text-slate-400 hover:text-slate-600"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  id="login-btn"
                  type="submit"
                  disabled={isAuthenticating}
                  className="w-full bg-blue-600 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-100 hover:bg-blue-700 transition flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  {isAuthenticating ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <span>Secure Access</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}

            {view === 'FORGOT' && (
              <form onSubmit={handleSendOtp} className="space-y-6">
                <div className="text-center mb-8">
                  <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Key className="w-8 h-8 text-blue-600" />
                  </div>
                  <h1 className="text-2xl font-bold text-slate-900">Reset Access</h1>
                  <p className="text-slate-500 text-sm mt-1">Enter ID or email for recovery</p>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-100 text-red-600 p-3 rounded-xl text-xs font-bold flex items-center">
                    <AlertCircle className="w-4 h-4 mr-2" /> {error}
                  </div>
                )}

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">ID or Email</label>
                  <input
                    type="text"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition font-medium"
                  />
                </div>

                <div className="flex flex-col space-y-3">
                  <button type="submit" className="w-full bg-blue-600 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-100 hover:bg-blue-700 transition">Request Code</button>
                  <button type="button" onClick={() => setView('LOGIN')} className="w-full text-slate-500 font-bold py-2 text-sm hover:text-slate-900 transition">Back to Sign In</button>
                </div>
              </form>
            )}

            {view === 'OTP' && (
              <form onSubmit={handleVerifyOtp} className="space-y-6">
                <div className="text-center mb-8">
                  <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <ShieldCheck className="w-8 h-8 text-blue-600" />
                  </div>
                  <h1 className="text-2xl font-bold text-slate-900">Verify Code</h1>
                  <p className="text-slate-500 text-sm mt-1">Check your registered email</p>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-100 text-red-600 p-3 rounded-xl text-xs font-bold flex items-center">
                    <AlertCircle className="w-4 h-4 mr-2" /> {error}
                  </div>
                )}

                <div className="flex justify-center">
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    className="w-48 text-center tracking-[0.5em] text-2xl font-black py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition"
                    placeholder="000000"
                  />
                </div>

                <div className="flex flex-col space-y-3 text-center">
                  <button type="submit" className="w-full bg-blue-600 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-100 hover:bg-blue-700 transition">Verify Code</button>
                  <p className="text-xs text-slate-400">Didn't receive it? <button type="button" onClick={handleSendOtp} className="text-blue-600 font-bold">Resend</button></p>
                </div>
              </form>
            )}
          </div>

          <div className="bg-slate-50 p-4 border-t border-slate-100 text-center flex flex-col items-center">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest flex items-center justify-center mb-1">
              <ShieldCheck className="w-3 h-3 mr-1.5" /> Secure Enterprise System
            </p>
            <p className="text-[9px] text-slate-300 font-bold uppercase tracking-tight">
              {loading ? 'Initializing...' : isOnline ? 'System Live' : 'Maintenance Mode'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
