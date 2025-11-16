"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getSupabaseBrowserClient } from "@/lib/supabase-client";
import { Spinner } from "@/components/Spinner";
import { useLanguage } from "@/lib/language-context";

export default function RegisterPage() {
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [restaurantName, setRestaurantName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Live validation states
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmPasswordError, setConfirmPasswordError] = useState<string | null>(null);
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [confirmPasswordTouched, setConfirmPasswordTouched] = useState(false);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password: string) => {
    if (password.length < 8) {
      return "Wachtwoord moet minimaal 8 karakters zijn";
    }
    if (!/[A-Z]/.test(password)) {
      return "Wachtwoord moet minimaal één hoofdletter bevatten";
    }
    if (!/[a-z]/.test(password)) {
      return "Wachtwoord moet minimaal één kleine letter bevatten";
    }
    if (!/[0-9]/.test(password)) {
      return "Wachtwoord moet minimaal één cijfer bevatten";
    }
    return null;
  };

  // Live validation handlers
  const handleEmailChange = (value: string) => {
    setEmail(value);
    if (emailTouched && value) {
      setEmailError(!validateEmail(value) ? "Voer een geldig e-mailadres in" : null);
    }
  };

  const handlePasswordChange = (value: string) => {
    setPassword(value);
    if (passwordTouched && value) {
      setPasswordError(validatePassword(value));
    }
    if (confirmPasswordTouched && confirmPassword) {
      setConfirmPasswordError(value !== confirmPassword ? "Wachtwoorden komen niet overeen" : null);
    }
  };

  const handleConfirmPasswordChange = (value: string) => {
    setConfirmPassword(value);
    if (confirmPasswordTouched && value) {
      setConfirmPasswordError(password !== value ? "Wachtwoorden komen niet overeen" : null);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Email validation
    if (!validateEmail(email)) {
      setError("Voer een geldig e-mailadres in");
      setLoading(false);
      return;
    }

    // Password validation
    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError("Wachtwoorden komen niet overeen");
      setLoading(false);
      return;
    }

    if (!restaurantName.trim()) {
      setError("Voer een team naam in");
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: {
          restaurant_name: restaurantName,
          role: "admin",
        },
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      // Successfully registered - redirect to home (session should be active)
      router.push("/");
      router.refresh();
    }
  };

  const handleGoogleSignup = async () => {
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#1b1c1f] px-4 py-12">
      <div className="w-full max-w-md space-y-8 rounded-2xl border border-white/10 bg-[#202226] p-8 shadow-2xl shadow-black/20 animate-scaleIn backdrop-blur-sm">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white tracking-tight mb-2">ctbase</h1>
          <p className="text-lg text-white/60 mb-6">Create your account</p>
          <p className="mt-3 text-sm text-white/60 leading-relaxed">
            Begin met het beheren van je cocktail recepten
          </p>
        </div>

        <form onSubmit={handleRegister} className="mt-8 space-y-6">
          {error && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400 animate-fadeIn">
              {error}
            </div>
          )}

          <div className="space-y-5">
            <div>
              <label htmlFor="restaurant" className="block text-sm font-semibold text-white/80 mb-2">
                {t("auth.register.teamName")}
              </label>
              <input
                id="restaurant"
                name="restaurant"
                type="text"
                required
                value={restaurantName}
                onChange={(e) => setRestaurantName(e.target.value)}
                className="block w-full rounded-lg border border-white/10 bg-[#1b1c1f] px-4 py-2.5 text-white placeholder:text-white/50 focus:border-[#c62828]/50 focus:outline-none focus:ring-2 focus:ring-[#c62828]/20 transition-all"
                placeholder="Your Team"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-white/80 mb-2">
                {t("auth.register.email")}
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => handleEmailChange(e.target.value)}
                onBlur={() => setEmailTouched(true)}
                className={`block w-full rounded-lg border ${
                  emailError && emailTouched ? "border-red-500/50" : "border-white/10"
                } bg-[#1b1c1f] px-4 py-3 text-white placeholder:text-white/40 ${
                  emailError && emailTouched ? "focus:border-red-500/50 focus:ring-red-500/20" : "focus:border-[#c62828]/50 focus:ring-[#c62828]/20"
                } focus:outline-none focus:ring-2 transition-all`}
                placeholder="you@email.com"
              />
              {emailError && emailTouched && (
                <p className="mt-2 text-xs text-red-400 animate-fadeIn">{emailError}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-white/80 mb-2">
                {t("auth.register.password")}
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => handlePasswordChange(e.target.value)}
                onBlur={() => setPasswordTouched(true)}
                className={`block w-full rounded-lg border ${
                  passwordError && passwordTouched ? "border-red-500/50" : "border-white/10"
                } bg-[#1b1c1f] px-4 py-3 text-white placeholder:text-white/40 ${
                  passwordError && passwordTouched ? "focus:border-red-500/50 focus:ring-red-500/20" : "focus:border-[#c62828]/50 focus:ring-[#c62828]/20"
                } focus:outline-none focus:ring-2 transition-all`}
                placeholder="••••••••"
              />
              {passwordError && passwordTouched && (
                <p className="mt-2 text-xs text-red-400 animate-fadeIn">{passwordError}</p>
              )}
              {!passwordError && passwordTouched && password && (
                <p className="mt-2 text-xs text-green-400 animate-fadeIn flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Strong password
                </p>
              )}
            </div>

            <div>
              <label htmlFor="confirm-password" className="block text-sm font-semibold text-white/80 mb-2">
                {t("auth.register.confirmPassword")}
              </label>
              <input
                id="confirm-password"
                name="confirm-password"
                type="password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => handleConfirmPasswordChange(e.target.value)}
                onBlur={() => setConfirmPasswordTouched(true)}
                className={`block w-full rounded-lg border ${
                  confirmPasswordError && confirmPasswordTouched ? "border-red-500/50" : "border-white/10"
                } bg-[#1b1c1f] px-4 py-3 text-white placeholder:text-white/40 ${
                  confirmPasswordError && confirmPasswordTouched ? "focus:border-red-500/50 focus:ring-red-500/20" : "focus:border-[#c62828]/50 focus:ring-[#c62828]/20"
                } focus:outline-none focus:ring-2 transition-all`}
                placeholder="••••••••"
              />
              {confirmPasswordError && confirmPasswordTouched && (
                <p className="mt-2 text-xs text-red-400 animate-fadeIn">{confirmPasswordError}</p>
              )}
              {!confirmPasswordError && confirmPasswordTouched && confirmPassword && (
                <p className="mt-2 text-xs text-green-400 animate-fadeIn flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Passwords match
                </p>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center rounded-lg bg-[#c62828] px-4 py-3.5 text-base font-bold text-white transition-all hover:bg-[#d32f2f] hover:shadow-lg hover:shadow-[#c62828]/20 focus:outline-none focus:ring-2 focus:ring-[#c62828] focus:ring-offset-2 focus:ring-offset-[#202226] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-[0.98]"
          >
            {loading ? <Spinner /> : t("auth.register.button")}
          </button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/10" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-[#202226] px-2 text-white/50">Of</span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleGoogleSignup}
          disabled={loading}
          className="flex w-full items-center justify-center gap-3 rounded-lg border border-white/20 bg-white px-4 py-3 text-sm font-semibold text-gray-900 transition-all hover:bg-gray-50 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-[#202226] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-[0.98]"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Registreren met Google
        </button>

        <p className="text-center text-sm text-white/70">
          Al een account?{" "}
          <Link href="/login" className="font-semibold text-[#c62828] hover:text-[#d32f2f] transition-colors">
            Inloggen
          </Link>
        </p>
      </div>
    </div>
  );
}
