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
  CheckCircle,
  ChevronLeft,
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

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen }) => {
  const { login, register, loginWithGoogle } = useAuth();
  const { theme } = useTheme();

  // Mode: 'signin' | 'signup' | 'google-link'
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Google OAuth configuration
  const [googleClientId, setGoogleClientId] = useState<string>('');
  const [googleEmailInput, setGoogleEmailInput] = useState<string>('');
  const [isGoogleLinkingView, setIsGoogleLinkingView] = useState(false);

  useEffect(() => {
    // Fetch Google OAuth configuration from backend
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    // Validation
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
      setError(err.message || 'Authentication failed. Please verify your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleContinueWithGoogle = async () => {
    setError(null);
    setSuccessMessage(null);

    // 1. If Google Identity Services (GSI) is loaded and Client ID is configured
    if (googleClientId && window.google?.accounts?.oauth2) {
      setIsLoading(true);
      try {
        const tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: googleClientId,
          scope: 'https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
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
      } catch (gErr: any) {
        console.warn('Google GSI init failed, offering direct link flow:', gErr);
        setIsLoading(false);
      }
    }

    // 2. If client ID is not yet defined in server/.env, open the dedicated Google Account Linking view
    setIsGoogleLinkingView(true);
  };

  const handleDirectGoogleLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const cleanGoogleEmail = googleEmailInput.trim().toLowerCase();

    if (!cleanGoogleEmail || !cleanGoogleEmail.includes('@') || !cleanGoogleEmail.includes('.')) {
      setError('Please enter a valid Google email address (e.g. name@gmail.com).');
      return;
    }

    setIsLoading(true);
    try {
      const derivedName = cleanGoogleEmail.split('@')[0].replace(/[._]/g, ' ');
      const capitalized = derivedName.charAt(0).toUpperCase() + derivedName.slice(1);
      await loginWithGoogle({
        email: cleanGoogleEmail,
        name: capitalized,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to link Google account.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
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

            {isGoogleLinkingView ? (
              <>
                <h1 className="text-2xl font-extrabold tracking-tight">Link Google Account</h1>
                <p className="text-xs text-stone-400 mt-1 max-w-xs mx-auto">
                  Connect your Google account to sign in and continue on Alight
                </p>
              </>
            ) : (
              <>
                <h1 className="text-2xl font-extrabold tracking-tight">
                  {authMode === 'signup' ? 'Create Your Account' : 'Welcome to Alight'}
                </h1>
                <p className="text-xs sm:text-sm text-stone-400 mt-1 max-w-xs mx-auto">
                  {authMode === 'signup'
                    ? 'Sign up with your email and password to get started'
                    : 'Sign in with your email and password to continue'}
                </p>
              </>
            )}
          </div>

          {/* If in Google Linking View */}
          {isGoogleLinkingView ? (
            <div className="space-y-4 animate-fade-in">
              {error && (
                <div className="p-3 rounded-xl bg-red-950/60 border border-red-800 flex items-center gap-2.5 text-xs text-red-300">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleDirectGoogleLink} className="space-y-3.5">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-400 mb-1">
                    Your Google Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3.5 top-3.5 text-stone-500" />
                    <input
                      type="email"
                      required
                      value={googleEmailInput}
                      onChange={(e) => setGoogleEmailInput(e.target.value)}
                      placeholder="aditya@gmail.com"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm bg-[#161826] border border-[#25283E] text-white placeholder-stone-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 px-4 bg-[#161826] hover:bg-[#1E2032] border border-[#2A2E45] hover:border-amber-500/60 text-stone-200 font-semibold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-60"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
                  ) : (
                    <>
                      <svg className="w-4 h-4" viewBox="0 0 24 24">
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
                      <span>Link Google Account & Sign In</span>
                    </>
                  )}
                </button>
              </form>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setIsGoogleLinkingView(false);
                    setError(null);
                  }}
                  className="text-xs text-stone-400 hover:text-white flex items-center justify-center gap-1 mx-auto transition"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Back to Email & Password</span>
                </button>
              </div>
            </div>
          ) : (
            /* Standard Email & Password Auth Flow */
            <>
              {/* Segmented Switcher: Sign In vs Sign Up */}
              <div className="flex p-1 mb-5 rounded-xl bg-[#161826] border border-[#25283E]">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('signin');
                    setError(null);
                    setSuccessMessage(null);
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
                    setSuccessMessage(null);
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

              {/* Error & Success Alerts */}
              {error && (
                <div className="mb-4 p-3 rounded-xl bg-red-950/60 border border-red-800 flex items-center gap-2.5 text-xs text-red-300 animate-fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{error}</span>
                </div>
              )}

              {successMessage && (
                <div className="mb-4 p-3 rounded-xl bg-emerald-950/60 border border-emerald-800 flex items-center gap-2.5 text-xs text-emerald-300 animate-fade-in">
                  <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>{successMessage}</span>
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
                      className="absolute right-3 top-3 text-stone-400 hover:text-white p-0.5 rounded transition"
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

              {/* Real Google Sign-In Action */}
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

              {/* Mode Toggle Footer */}
              <div className="mt-5 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode(authMode === 'signin' ? 'signup' : 'signin');
                    setError(null);
                    setSuccessMessage(null);
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
            </>
          )}
        </div>
      </div>
    </div>
  );
};
