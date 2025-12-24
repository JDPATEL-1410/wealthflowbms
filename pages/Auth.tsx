import React, { useState } from 'react';
import { PieChart, Mail, Lock, User, ArrowRight, ShieldCheck, RefreshCcw, AlertCircle, Eye, EyeOff, UserPlus, Building2, Phone } from 'lucide-react';
import { TeamMember, Role } from '../types';
import { useData } from '../contexts/DataContext';

interface AuthProps {
    onLogin: (user: TeamMember) => void;
}

type AuthView = 'LOGIN' | 'SIGNUP';

export const Auth: React.FC<AuthProps> = ({ onLogin }) => {
    const { team, updateTeam } = useData();
    const [view, setView] = useState<AuthView>('LOGIN');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    // Login States
    const [loginEmail, setLoginEmail] = useState('');
    const [loginPassword, setLoginPassword] = useState('');

    // Signup States
    const [signupName, setSignupName] = useState('');
    const [signupEmail, setSignupEmail] = useState('');
    const [signupPassword, setSignupPassword] = useState('');
    const [signupConfirmPassword, setSignupConfirmPassword] = useState('');
    const [signupPhone, setSignupPhone] = useState('');
    const [signupCompany, setSignupCompany] = useState('');

    const handleLoginSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        setTimeout(() => {
            const user = team.find(u =>
                (u.email?.toLowerCase() === loginEmail.toLowerCase() || u.code.toLowerCase() === loginEmail.toLowerCase()) &&
                u.password === loginPassword
            );

            if (user) {
                onLogin(user);
            } else {
                setError('Invalid credentials. Please check your email and password.');
            }
            setLoading(false);
        }, 800);
    };

    const handleSignupSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);
        setLoading(true);

        // Validation
        if (signupPassword !== signupConfirmPassword) {
            setError('Passwords do not match.');
            setLoading(false);
            return;
        }

        if (signupPassword.length < 6) {
            setError('Password must be at least 6 characters long.');
            setLoading(false);
            return;
        }

        // Check if email already exists
        const existingUser = team.find(u => u.email?.toLowerCase() === signupEmail.toLowerCase());
        if (existingUser) {
            setError('An account with this email already exists.');
            setLoading(false);
            return;
        }

        setTimeout(() => {
            // Create new user
            const newUser: TeamMember = {
                id: `user_${Date.now()}`,
                name: signupName,
                code: `USR${Date.now().toString().slice(-6)}`,
                role: Role.VIEWER, // Default role for new signups
                level: 6, // Default level for RM
                email: signupEmail,
                password: signupPassword,
                bankDetails: {
                    accountName: signupName,
                    accountNumber: '',
                    bankName: '',
                    ifscCode: ''
                }
            };

            // Add to team
            const updatedTeam = [...team, newUser];
            updateTeam(updatedTeam);

            setSuccess('Account created successfully! Please login with your credentials.');
            setLoading(false);

            // Clear form
            setSignupName('');
            setSignupEmail('');
            setSignupPassword('');
            setSignupConfirmPassword('');
            setSignupPhone('');
            setSignupCompany('');

            // Switch to login view after 2 seconds
            setTimeout(() => {
                setView('LOGIN');
                setLoginEmail(signupEmail);
                setSuccess(null);
            }, 2000);
        }, 1000);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-slate-50 to-indigo-50 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="flex items-center justify-center space-x-3 mb-8">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-xl shadow-blue-200">
                        <PieChart className="w-7 h-7 text-white" />
                    </div>
                    <span className="text-3xl font-black text-slate-900 tracking-tighter uppercase">WealthFlow</span>
                </div>

                <div className="bg-white rounded-3xl shadow-2xl shadow-slate-200 overflow-hidden border border-slate-100">
                    {/* Tab Switcher */}
                    <div className="flex border-b border-slate-100">
                        <button
                            onClick={() => {
                                setView('LOGIN');
                                setError(null);
                                setSuccess(null);
                            }}
                            className={`flex-1 py-4 text-sm font-bold uppercase tracking-wider transition ${view === 'LOGIN'
                                ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                                : 'text-slate-400 hover:text-slate-600'
                                }`}
                        >
                            Login
                        </button>
                        <button
                            onClick={() => {
                                setView('SIGNUP');
                                setError(null);
                                setSuccess(null);
                            }}
                            className={`flex-1 py-4 text-sm font-bold uppercase tracking-wider transition ${view === 'SIGNUP'
                                ? 'bg-blue-50 text-blue-600 border-b-2 border-blue-600'
                                : 'text-slate-400 hover:text-slate-600'
                                }`}
                        >
                            Sign Up
                        </button>
                    </div>

                    <div className="p-8">
                        {/* Login Form */}
                        {view === 'LOGIN' && (
                            <form onSubmit={handleLoginSubmit} className="space-y-6">
                                <div className="text-center mb-8">
                                    <h1 className="text-2xl font-bold text-slate-900">Welcome Back</h1>
                                    <p className="text-slate-500 text-sm mt-1">Access your brokerage management dashboard</p>
                                </div>

                                {error && (
                                    <div className="bg-red-50 border border-red-100 text-red-600 p-3 rounded-xl text-xs font-bold flex items-center animate-in fade-in slide-in-from-top-1">
                                        <AlertCircle className="w-4 h-4 mr-2" /> {error}
                                    </div>
                                )}

                                {success && (
                                    <div className="bg-green-50 border border-green-100 text-green-600 p-3 rounded-xl text-xs font-bold flex items-center animate-in fade-in slide-in-from-top-1">
                                        <ShieldCheck className="w-4 h-4 mr-2" /> {success}
                                    </div>
                                )}

                                <div className="space-y-4">
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Email or Login ID</label>
                                        <div className="relative">
                                            <Mail className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
                                            <input
                                                type="text"
                                                required
                                                value={loginEmail}
                                                onChange={(e) => setLoginEmail(e.target.value)}
                                                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition font-medium"
                                                placeholder="john@example.com"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Password</label>
                                        <div className="relative">
                                            <Lock className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
                                            <input
                                                type={showPassword ? "text" : "password"}
                                                required
                                                value={loginPassword}
                                                onChange={(e) => setLoginPassword(e.target.value)}
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
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-200 hover:shadow-xl hover:shadow-blue-300 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
                                >
                                    {loading ? (
                                        <RefreshCcw className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <>
                                            <span>Secure Login</span>
                                            <ArrowRight className="w-4 h-4" />
                                        </>
                                    )}
                                </button>
                            </form>
                        )}

                        {/* Signup Form */}
                        {view === 'SIGNUP' && (
                            <form onSubmit={handleSignupSubmit} className="space-y-6">
                                <div className="text-center mb-8">
                                    <h1 className="text-2xl font-bold text-slate-900">Create Account</h1>
                                    <p className="text-slate-500 text-sm mt-1">Join WealthFlow to manage your brokerage</p>
                                </div>

                                {error && (
                                    <div className="bg-red-50 border border-red-100 text-red-600 p-3 rounded-xl text-xs font-bold flex items-center animate-in fade-in slide-in-from-top-1">
                                        <AlertCircle className="w-4 h-4 mr-2" /> {error}
                                    </div>
                                )}

                                {success && (
                                    <div className="bg-green-50 border border-green-100 text-green-600 p-3 rounded-xl text-xs font-bold flex items-center animate-in fade-in slide-in-from-top-1">
                                        <ShieldCheck className="w-4 h-4 mr-2" /> {success}
                                    </div>
                                )}

                                <div className="space-y-4">
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Full Name</label>
                                        <div className="relative">
                                            <User className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
                                            <input
                                                type="text"
                                                required
                                                value={signupName}
                                                onChange={(e) => setSignupName(e.target.value)}
                                                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition font-medium"
                                                placeholder="John Doe"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Email Address</label>
                                        <div className="relative">
                                            <Mail className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
                                            <input
                                                type="email"
                                                required
                                                value={signupEmail}
                                                onChange={(e) => setSignupEmail(e.target.value)}
                                                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition font-medium"
                                                placeholder="john@example.com"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Password</label>
                                        <div className="relative">
                                            <Lock className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
                                            <input
                                                type={showPassword ? "text" : "password"}
                                                required
                                                value={signupPassword}
                                                onChange={(e) => setSignupPassword(e.target.value)}
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

                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Confirm Password</label>
                                        <div className="relative">
                                            <Lock className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
                                            <input
                                                type={showPassword ? "text" : "password"}
                                                required
                                                value={signupConfirmPassword}
                                                onChange={(e) => setSignupConfirmPassword(e.target.value)}
                                                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition font-medium"
                                                placeholder="••••••••"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-200 hover:shadow-xl hover:shadow-blue-300 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
                                >
                                    {loading ? (
                                        <RefreshCcw className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <>
                                            <UserPlus className="w-4 h-4" />
                                            <span>Create Account</span>
                                        </>
                                    )}
                                </button>
                            </form>
                        )}
                    </div>

                    <div className="bg-slate-50 p-4 border-t border-slate-100 text-center">
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest flex items-center justify-center">
                            <ShieldCheck className="w-3 h-3 mr-1.5" /> Secure & Encrypted System
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
