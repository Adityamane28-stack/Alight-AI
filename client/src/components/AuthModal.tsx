import React, { useState, useEffect } from 'react';
import {
  Zap,
  Mail,
  Lock,
  User as UserIcon,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  ArrowRight,
  Shield,
  Check,
  ChevronLeft,
  Plus,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { api } from '../services/api';

declare global {
  interface Window {
    google?: any;
  }
}

interface AuthModalProps {
  isOpen: boolean;
  onClose?: () => void;
}

interface GoogleAccountOption {
  name: string;
  email: string;
  avatarBg: string;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen }) => {
  const { login, register, loginWithGoogle } = useAuth();
  const { theme } = useTheme();

  // Mode: 'signin' | 'signup'
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Google OAuth flow state
  const [googleClientId, setGoogleClientId] = useState<string>('');
  const [isGoogleModalOpen, setIsGoogleModalOpen] = useState(false);
  const [googleStep, setGoogleStep] = useState<'select-account' | 'permissions' | 'custom-email'>('select-account');
  const [selectedGoogleAccount, setSelectedGoogleAccount] = useState<GoogleAccountOption | null>(null);
  const [customGoogleEmail, setCustomGoogleEmail] = useState('');
  const [customGoogleName, setCustomGoogleName] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);

  // Sample Google accounts for user selection
  const [googleAccounts, setGoogleAccounts] = useState<GoogleAccountOption[]>([
    {
      name: 'Aditya Mane',
      email: 'adityamane@gmail.com',
      avatarBg: 'bg-indigo-600',
    },
    {
      name: 'Aditya (Work)',
      email: 'aditya.alight@gmail.com',
      avatarBg: 'bg-emerald-600',
    },
  ]);

  useEffect(() => {
    // Check if backend has GOOGLE_CLIENT_ID configured
    const checkGoogleConfig = async () => {
      try {
        const config = await api.getGoogleConfig();
        if (config.clientId) {
          setGoogleClientId(config.clientId);
        }
      } catch (err) {
        console.warn('Could not fetch Google config:', err);
      }
    };
    checkGoogleConfig();
  }, []);

  if (!isOpen) return null;

  // Standard Email / Password Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanEmail = email.trim();
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setError('Please enter a valid email address.');
      return;
    }

    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (authMode === 'signup' && password !== confirmPassword) {
      setError('Passwords do not match. Please re-enter your password.');
      return;
    }

    setIsLoading(true);

    try {
      if (authMode === 'signup') {
        await register(cleanEmail, password, name.trim());
      } else {
        await login(cleanEmail, password);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  // Google button clicked
  const handleContinueWithGoogle = async () => {
    setError(null);

    // If Google Identity Services (GSI) Client ID is configured in server/.env
    if (googleClientId && window.google?.accounts?.oauth2) {
      setIsLoading(true);
      try {
        const tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: googleClientId,
          scope: 'https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email openid',
          prompt: 'select_account consent',
          callback: async (tokenResponse: any) => {
            if (tokenResponse.error) {
              setError(`Google authentication failed: ${tokenResponse.error}`);
              setIsLoading(false);
              return;
            }
            try {
              await loginWithGoogle({ accessToken: tokenResponse.access_token });
            } catch (err: any) {
              setError(err.message || 'Failed to authenticate Google user');
            } finally {
              setIsLoading(false);
            }
          },
        });
        tokenClient.requestAccessToken();
        return;
      } catch (gErr) {
        console.warn('GSI failed, opening interactive Google account picker:', gErr);
        setIsLoading(false);
      }
    }

    // Open the Google Account Chooser & Permissions dialog
    setIsGoogleModalOpen(true);
    setGoogleStep('select-account');
  };

  // User selects an account in the Google Chooser
  const handleSelectGoogleAccount = (account: GoogleAccountOption) => {
    setSelectedGoogleAccount(account);
    setGoogleStep('permissions');
  };

  // User submits a custom Google email
  const handleCustomEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = customGoogleEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setError('Please enter a valid Google email address.');
      return;
    }

    const derivedName = customGoogleName.trim() || cleanEmail.split('@')[0].replace(/[._]/g, ' ');
    const formattedName = derivedName.charAt(0).toUpperCase() + derivedName.slice(1);

    const newAccount: GoogleAccountOption = {
      name: formattedName,
      email: cleanEmail,
      avatarBg: 'bg-blue-600',
    };

    setGoogleAccounts((prev) => [newAccount, ...prev.filter((a) => a.email !== cleanEmail)]);
    setSelectedGoogleAccount(newAccount);
    setGoogleStep('permissions');
  };

  // User allows permissions on the Google Consent Screen
  const handleAllowGooglePermissions = async () => {
    if (!selectedGoogleAccount) return;
    setGoogleLoading(true);
    setError(null);

    try {
      await loginWithGoogle({
        email: selectedGoogleAccount.email,
        name: selectedGoogleAccount.name,
      });
      setIsGoogleModalOpen(false);
    } catch (err: any) {
      setError(err.message || 'Google authentication failed.');
      setGoogleLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      {/* ============================================================== */}
      {/* GOOGLE SIGN-IN MODAL (Account Selection & Permissions Screen) */}
      {/* ============================================================== */}
      {isGoogleModalOpen ? (
        <div className="relative w-full max-w-[450px] bg-white text-stone-900 rounded-3xl shadow-2xl overflow-hidden border border-stone-200 animate-in fade-in zoom-in-95 duration-200">
          {/* Google Top Header Bar */}
          <div className="px-8 pt-8 pb-4 text-center">
            {/* Google Logo */}
            <div className="flex justify-center mb-4">
              <svg className="w-8 h-8" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
            </div>

            {googleStep === 'select-account' && (
              <>
                <h2 className="text-xl font-medium text-stone-800 tracking-tight">Choose an account</h2>
                <p className="text-sm text-stone-500 mt-1">to continue to <span className="font-semibold text-stone-700">Alight</span></p>
              </>
            )}

            {googleStep === 'custom-email' && (
              <>
                <h2 className="text-xl font-medium text-stone-800 tracking-tight">Sign in with Google</h2>
                <p className="text-sm text-stone-500 mt-1">Enter your Google Account email</p>
              </>
            )}

            {googleStep === 'permissions' && selectedGoogleAccount && (
              <>
                <h2 className="text-xl font-medium text-stone-800 tracking-tight">Sign in to Alight</h2>
                <div className="inline-flex items-center gap-2 mt-2 px-3 py-1 bg-stone-100 rounded-full text-xs text-stone-700">
                  <div className={`w-4 h-4 rounded-full ${selectedGoogleAccount.avatarBg} text-white flex items-center justify-center font-bold text-[9px]`}>
                    {selectedGoogleAccount.name.charAt(0)}
                  </div>
                  <span>{selectedGoogleAccount.email}</span>
                </div>
              </>
            )}
          </div>

          {/* Error inside Google modal */}
          {error && (
            <div className="mx-8 mb-3 p-3 rounded-xl bg-red-50 border border-red-200 flex items-center gap-2 text-xs text-red-600">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          {/* STEP 1: CHOOSE AN ACCOUNT */}
          {googleStep === 'select-account' && (
            <div className="px-6 pb-6">
              <div className="divide-y divide-stone-100 border-t border-b border-stone-200">
                {googleAccounts.map((acc, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleSelectGoogleAccount(acc)}
                    className="w-full py-3.5 px-3 flex items-center gap-3.5 text-left hover:bg-stone-50 transition cursor-pointer group"
                  >
                    <div className={`w-9 h-9 rounded-full ${acc.avatarBg} text-white flex items-center justify-center font-semibold text-sm shadow-xs group-hover:scale-105 transition-transform`}>
                      {acc.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-stone-800 truncate">{acc.name}</p>
                      <p className="text-xs text-stone-500 truncate">{acc.email}</p>
                    </div>
                  </button>
                ))}

                {/* Use another account button */}
                <button
                  type="button"
                  onClick={() => {
                    setGoogleStep('custom-email');
                    setError(null);
                  }}
                  className="w-full py-3.5 px-3 flex items-center gap-3.5 text-left hover:bg-stone-50 transition cursor-pointer group"
                >
                  <div className="w-9 h-9 rounded-full bg-stone-100 text-stone-600 flex items-center justify-center font-medium text-sm border border-stone-200 group-hover:bg-stone-200 transition">
                    <Plus className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-stone-700">Use another account</p>
                  </div>
                </button>
              </div>

              <div className="mt-6 flex justify-between items-center text-xs text-stone-500">
                <button
                  type="button"
                  onClick={() => setIsGoogleModalOpen(false)}
                  className="text-stone-500 hover:text-stone-800 transition"
                >
                  Cancel
                </button>
                <span>Google LLC</span>
              </div>
            </div>
          )}

          {/* STEP 1.5: CUSTOM GOOGLE EMAIL INPUT */}
          {googleStep === 'custom-email' && (
            <div className="px-8 pb-8">
              <form onSubmit={handleCustomEmailSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-stone-600 mb-1">
                    Google Email
                  </label>
                  <input
                    type="email"
                    required
                    autoFocus
                    value={customGoogleEmail}
                    onChange={(e) => setCustomGoogleEmail(e.target.value)}
                    placeholder="example@gmail.com"
                    className="w-full px-3.5 py-2.5 rounded-xl text-sm border border-stone-300 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-stone-600 mb-1">
                    Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={customGoogleName}
                    onChange={(e) => setCustomGoogleName(e.target.value)}
                    placeholder="Your Name"
                    className="w-full px-3.5 py-2.5 rounded-xl text-sm border border-stone-300 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
                  />
                </div>

                <div className="flex items-center justify-between pt-3">
                  <button
                    type="button"
                    onClick={() => {
                      setGoogleStep('select-account');
                      setError(null);
                    }}
                    className="text-xs text-stone-500 hover:text-stone-800 transition flex items-center gap-1"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>Back</span>
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-[#1a73e8] hover:bg-[#1557b0] text-white text-xs font-medium rounded-xl transition shadow-xs cursor-pointer"
                  >
                    Next
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* STEP 2: GOOGLE PERMISSIONS & CONSENT SCREEN */}
          {googleStep === 'permissions' && selectedGoogleAccount && (
            <div className="px-8 pb-8">
              <div className="p-4 bg-stone-50 rounded-2xl border border-stone-100 mb-5">
                <p className="text-xs font-semibold text-stone-700 uppercase tracking-wider mb-2.5">
                  Alight wants access to:
                </p>
                <div className="space-y-2.5 text-xs text-stone-600">
                  <div className="flex items-start gap-2.5">
                    <div className="p-1 rounded bg-blue-50 text-[#1a73e8] mt-0.5">
                      <Mail className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <p className="font-medium text-stone-800">View your email address</p>
                      <p className="text-[11px] text-stone-500">{selectedGoogleAccount.email}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <div className="p-1 rounded bg-blue-50 text-[#1a73e8] mt-0.5">
                      <Shield className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <p className="font-medium text-stone-800">View your basic profile info</p>
                      <p className="text-[11px] text-stone-500">Name and Google account picture</p>
                    </div>
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-stone-500 leading-relaxed mb-6">
                By clicking <strong>Allow</strong>, you permit <strong>Alight</strong> to link with your Google profile to sign you in securely. You can manage or revoke access at any time in your Google Account settings.
              </p>

              {/* Action Buttons: Cancel or Allow */}
              <div className="flex items-center justify-between gap-3 pt-2 border-t border-stone-100">
                <button
                  type="button"
                  disabled={googleLoading}
                  onClick={() => {
                    setGoogleStep('select-account');
                    setError(null);
                  }}
                  className="px-4 py-2.5 text-xs font-medium text-stone-600 hover:text-stone-800 hover:bg-stone-100 rounded-xl transition"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  disabled={googleLoading}
                  onClick={handleAllowGooglePermissions}
                  className="px-6 py-2.5 bg-[#1a73e8] hover:bg-[#1557b0] text-white text-xs font-semibold rounded-xl shadow-md transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70"
                >
                  {googleLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Signing in...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Allow & Continue</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ============================================================== */
        /* STANDARD ALIGHT SIGN IN & SIGN UP FORM */
        /* ============================================================== */
        <div className="relative w-full max-w-md">
          {/* Radiant Ambient Glow Halo Behind Card */}
          <div className="absolute -inset-1 rounded-[32px] bg-gradient-to-r from-amber-500/25 via-orange-500/20 to-yellow-500/25 blur-xl opacity-75 animate-pulse-slow pointer-events-none" />

          <div className={`relative w-full rounded-3xl shadow-2xl overflow-hidden p-7 sm:p-8 border transition-all duration-300 ${
            theme === 'dark'
              ? 'bg-[#10121B] border-[#222538] text-stone-100 shadow-black/90'
              : 'bg-white border-stone-200 text-stone-900 shadow-xl'
          }`}>
            {/* Header Brand */}
            <div className="text-center mb-6">
              <div className="relative inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#D4890A] via-[#E8A520] to-[#F9CF66] text-white shadow-xl shadow-amber-500/25 mb-3 group">
                <Zap className="w-7 h-7 fill-white drop-shadow group-hover:scale-110 transition-transform" />
              </div>
              <h1 className="text-2xl font-extrabold tracking-tight">
                {authMode === 'signup' ? 'Create Your Account' : 'Welcome to Alight'}
              </h1>
              <p className="text-xs sm:text-sm text-stone-400 mt-1 max-w-xs mx-auto">
                {authMode === 'signup'
                  ? 'Sign up with your email and password to start chatting'
                  : 'Sign in with your email and password to continue'}
              </p>
            </div>

            {/* Segmented Switcher: Sign In vs Sign Up */}
            <div className="flex p-1 mb-5 rounded-xl bg-[#161826] border border-[#25283E]">
              <button
                type="button"
                onClick={() => {
                  setAuthMode('signin');
                  setError(null);
                }}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all duration-200 ${
                  authMode === 'signin'
                    ? 'bg-gradient-to-r from-[#D4890A] to-[#E8A520] text-stone-950 font-bold shadow-md'
                    : 'text-stone-400 hover:text-white'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode('signup');
                  setError(null);
                }}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all duration-200 ${
                  authMode === 'signup'
                    ? 'bg-gradient-to-r from-[#D4890A] to-[#E8A520] text-stone-950 font-bold shadow-md'
                    : 'text-stone-400 hover:text-white'
                }`}
              >
                Sign Up
              </button>
            </div>

            {/* Error Alert */}
            {error && (
              <div className="mb-4 p-3 rounded-xl bg-red-950/60 border border-red-800 flex items-center gap-2.5 text-xs text-red-300 animate-fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{error}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-3.5">
              {authMode === 'signup' && (
                <div className="animate-fade-up">
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-400 mb-1">
                    Full Name (Optional)
                  </label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 absolute left-3.5 top-3.5 text-stone-500" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your Name"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm bg-[#161826] border border-[#25283E] text-white placeholder-stone-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-400 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-3.5 text-stone-500" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm bg-[#161826] border border-[#25283E] text-white placeholder-stone-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-400 mb-1">
                  Password (min. 6 characters)
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-stone-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl text-sm bg-[#161826] border border-[#25283E] text-white placeholder-stone-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-stone-400 hover:text-white p-0.5 rounded transition cursor-pointer"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {authMode === 'signup' && (
                <div className="animate-fade-up">
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-400 mb-1">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3.5 top-3.5 text-stone-500" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm bg-[#161826] border border-[#25283E] text-white placeholder-stone-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition"
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-[#D4890A] via-[#E8A520] to-[#F9CF66] hover:brightness-110 text-stone-950 font-bold text-sm rounded-xl shadow-lg shadow-amber-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 active:scale-[0.99]"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-stone-950" />
                ) : (
                  <>
                    <span>{authMode === 'signup' ? 'Sign Up & Continue' : 'Sign In & Continue'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Social Divider */}
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-stone-800" />
              </div>
              <div className="relative flex justify-center text-[11px] uppercase">
                <span className="px-3 bg-[#10121B] text-stone-500 font-medium">
                  Or continue with
                </span>
              </div>
            </div>

            {/* Continue with Google Action */}
            <button
              type="button"
              onClick={handleContinueWithGoogle}
              disabled={isLoading}
              className="w-full py-2.5 px-4 bg-[#161826] hover:bg-[#1E2032] border border-[#2A2E45] hover:border-amber-500/60 text-stone-200 font-medium text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-60 group"
            >
              <svg className="w-4 h-4 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>

            {/* Mode Switcher Footer */}
            <div className="mt-5 text-center">
              <button
                type="button"
                onClick={() => {
                  setAuthMode(authMode === 'signin' ? 'signup' : 'signin');
                  setError(null);
                }}
                className="text-xs text-stone-400 hover:text-amber-400 transition"
              >
                {authMode === 'signup' ? (
                  <>Already have an account? <span className="font-semibold text-amber-400 underline decoration-amber-500/50">Sign In</span></>
                ) : (
                  <>Don't have an account yet? <span className="font-semibold text-amber-400 underline decoration-amber-500/50">Sign Up</span></>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
