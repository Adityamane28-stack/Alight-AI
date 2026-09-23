import React, { useState, useEffect, useRef } from 'react';
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
  ExternalLink,
  ChevronLeft,
  KeyRound,
  CheckCircle2,
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
  const [isConfiguringGoogle, setIsConfiguringGoogle] = useState(false);
  const [inputClientId, setInputClientId] = useState('');
  const [savingClientId, setSavingClientId] = useState(false);

  const googlePopupRef = useRef<Window | null>(null);

  useEffect(() => {
    // 1. Fetch Google OAuth configuration from backend
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

    // 2. Check for redirect token in URL hash (standard OAuth 2.0 redirect flow)
    const hash = window.location.hash;
    if (hash && (hash.includes('access_token=') || hash.includes('id_token='))) {
      const params = new URLSearchParams(hash.substring(1));
      const accessToken = params.get('access_token');
      const idToken = params.get('id_token');

      if (accessToken || idToken) {
        window.history.replaceState(null, '', window.location.pathname);
        setIsLoading(true);
        loginWithGoogle({
          accessToken: accessToken || undefined,
          credential: idToken || undefined,
        })
          .catch((err) => setError(err.message || 'Google sign-in failed'))
          .finally(() => setIsLoading(false));
      }
    }
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
      setError(err.message || 'Authentication failed. Please verify your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  // Launch the REAL Google OAuth Account Chooser & Permissions window
  const launchRealGoogleOAuth = (clientId: string) => {
    setError(null);
    setIsLoading(true);

    const redirectUri = window.location.origin;
    const scope = encodeURIComponent('openid email profile');
    const googleUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(
      clientId
    )}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&response_type=token&scope=${scope}&prompt=select_account%20consent`;

    const width = 500;
    const height = 650;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    const popup = window.open(
      googleUrl,
      'GoogleOAuthWindow',
      `width=${width},height=${height},left=${left},top=${top},status=no,toolbar=no,menubar=no`
    );

    googlePopupRef.current = popup;

    if (!popup) {
      // If popup blocker intervened, do a full redirect
      window.location.href = googleUrl;
      return;
    }

    // Monitor popup URL for return with token
    const pollInterval = setInterval(async () => {
      try {
        if (!popup || popup.closed) {
          clearInterval(pollInterval);
          setIsLoading(false);
          return;
        }

        const currentUrl = popup.location.href;
        if (currentUrl && currentUrl.startsWith(redirectUri)) {
          clearInterval(pollInterval);
          const hash = popup.location.hash;
          popup.close();

          if (hash && hash.includes('access_token=')) {
            const params = new URLSearchParams(hash.substring(1));
            const token = params.get('access_token');
            if (token) {
              await loginWithGoogle({ accessToken: token });
            }
          } else {
            setError('Google sign-in was canceled or encountered an issue.');
          }
          setIsLoading(false);
        }
      } catch {
        // Cross-origin restriction while popup is on accounts.google.com (expected until it redirects back)
      }
    }, 400);
  };

  // When user clicks "Continue with Google"
  const handleContinueWithGoogle = () => {
    setError(null);

    // If GOOGLE_CLIENT_ID is already configured, launch the real Google login window immediately!
    if (googleClientId && googleClientId.trim()) {
      launchRealGoogleOAuth(googleClientId.trim());
      return;
    }

    // If not yet configured, show the Google OAuth setup prompt so the user can connect
    setIsConfiguringGoogle(true);
  };

  // Save the Google Client ID and launch real Google OAuth
  const handleSaveClientIdAndConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = inputClientId.trim();
    if (!cleanId) {
      setError('Please paste your Google OAuth Client ID.');
      return;
    }

    setSavingClientId(true);
    setError(null);

    try {
      await api.setGoogleClientId(cleanId);
      setGoogleClientId(cleanId);
      setIsConfiguringGoogle(false);
      setSavingClientId(false);

      // Launch real Google OAuth window immediately!
      launchRealGoogleOAuth(cleanId);
    } catch (err: any) {
      setError(err.message || 'Failed to save Google Client ID');
      setSavingClientId(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md">
        {/* Radiant Ambient Glow Halo Behind Card */}
        <div className="absolute -inset-1 rounded-[32px] bg-gradient-to-r from-amber-500/25 via-orange-500/20 to-yellow-500/25 blur-xl opacity-75 animate-pulse-slow pointer-events-none" />

        <div
          className={`relative w-full rounded-3xl shadow-2xl overflow-hidden p-7 sm:p-8 border transition-all duration-300 ${
            theme === 'dark'
              ? 'bg-[#10121B] border-[#222538] text-stone-100 shadow-black/90'
              : 'bg-white border-stone-200 text-stone-900 shadow-xl'
          }`}
        >
          {/* ============================================================== */}
          {/* GOOGLE CLIENT ID SETUP SCREEN (Only shown if Client ID not set) */}
          {/* ============================================================== */}
          {isConfiguringGoogle ? (
            <div className="animate-fade-in">
              {/* Header */}
              <div className="text-center mb-5">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-white shadow-md p-2.5 mb-3 border border-stone-200">
                  <svg className="w-full h-full" viewBox="0 0 24 24">
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
                <h2 className="text-xl font-bold tracking-tight">Connect Real Google Accounts</h2>
                <p className="text-xs text-stone-400 mt-1 max-w-xs mx-auto leading-relaxed">
                  To view and pick your actual system accounts directly on Google's login page, Google requires a free <strong>OAuth Client ID</strong>.
                </p>
              </div>

              {/* Instructions Pill */}
              <div className="p-3.5 rounded-2xl bg-stone-900/60 border border-stone-800 text-xs text-stone-300 space-y-2 mb-4 leading-relaxed">
                <p className="font-semibold text-amber-400 flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>30-Second Google Cloud Setup:</span>
                </p>
                <ol className="list-decimal list-inside space-y-1 text-stone-400 text-[11px]">
                  <li>
                    Open{' '}
                    <a
                      href="https://console.cloud.google.com/apis/credentials"
                      target="_blank"
                      rel="noreferrer"
                      className="text-amber-400 hover:underline inline-flex items-center gap-0.5 font-medium"
                    >
                      Google Cloud Credentials <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </li>
                  <li>
                    Create <strong>OAuth Client ID</strong> → <strong>Web application</strong>
                  </li>
                  <li>
                    Add Authorized JavaScript origin:{' '}
                    <code className="text-amber-300 bg-stone-800 px-1 py-0.5 rounded">
                      {window.location.origin}
                    </code>
                  </li>
                  <li>Copy and paste your Client ID below:</li>
                </ol>
              </div>

              {error && (
                <div className="mb-4 p-3 rounded-xl bg-red-950/60 border border-red-800 flex items-center gap-2 text-xs text-red-300">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{error}</span>
                </div>
              )}

              {/* Form to submit Google Client ID */}
              <form onSubmit={handleSaveClientIdAndConnect} className="space-y-3.5">
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-stone-400 mb-1">
                    Google OAuth Client ID
                  </label>
                  <input
                    type="text"
                    required
                    autoFocus
                    value={inputClientId}
                    onChange={(e) => setInputClientId(e.target.value)}
                    placeholder="1234567890-abcdefgh.apps.googleusercontent.com"
                    className="w-full px-3.5 py-2.5 rounded-xl text-xs font-mono bg-[#161826] border border-[#25283E] text-white placeholder-stone-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition"
                  />
                </div>

                <button
                  type="submit"
                  disabled={savingClientId}
                  className="w-full py-3 px-4 bg-gradient-to-r from-[#D4890A] via-[#E8A520] to-[#F9CF66] hover:brightness-110 text-stone-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/25 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {savingClientId ? (
                    <Loader2 className="w-4 h-4 animate-spin text-stone-950" />
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Save & Open Real Google Sign-In</span>
                    </>
                  )}
                </button>
              </form>

              <div className="mt-4 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setIsConfiguringGoogle(false);
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
            /* ============================================================== */
            /* STANDARD SIGN IN & SIGN UP FORM */
            /* ============================================================== */
            <>
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
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
                ) : (
                  <>
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
                  </>
                )}
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
            </>
          )}
        </div>
      </div>
    </div>
  );
};
