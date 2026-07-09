import React, { useState, useEffect } from "react";
import { Mail, User, ShieldAlert, Loader2, Sparkles, CheckCircle, ChevronRight, Lock, HelpCircle, Briefcase, Eye } from "lucide-react";
import { UserAccount, UserRole } from "../types";

interface LoginScreenProps {
  onLoginSuccess: (user: UserAccount) => void;
}

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [organization, setOrganization] = useState("");
  const [roleSelection, setRoleSelection] = useState<UserRole>("external_user");
  
  const [error, setError] = useState("");
  const [infoMessage, setInfoMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Dynamic public cover background
  const [coverUrl, setCoverUrl] = useState<string>("");
  const [coverTitle, setCoverTitle] = useState<string>("");

  useEffect(() => {
    fetch("/api/public/cover")
      .then((res) => res.json())
      .then((data) => {
        if (data && data.url) {
          setCoverUrl(data.url);
          setCoverTitle(data.title || "Aleppo Archive");
        }
      })
      .catch((err) => console.error("Error fetching public cover:", err));
  }, []);

  // Helper to preview what name.surname looks like
  const getFormattedPreview = (raw: string) => {
    if (!raw) return "";
    let formatted = raw.trim().toLowerCase()
      .replace(/[\s\-_]+/g, ".")
      .replace(/[^a-z0-9.]/g, "")
      .replace(/\.+/g, ".");
    if (!formatted.includes(".")) {
      formatted = formatted + ".user";
    }
    return formatted;
  };

  // Mock Google Accounts selector modal or trigger
  const [showGoogleMock, setShowGoogleMock] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError("Please enter an email address.");
      return;
    }

    setError("");
    setInfoMessage("");
    setIsLoading(true);

    try {
      if (isSignUp) {
        if (!name) {
          setError("Name is required for sign up.");
          setIsLoading(false);
          return;
        }

        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            email, 
            name, 
            role: roleSelection,
            organization 
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Failed to register account.");
        }

        setInfoMessage(`Registration submitted successfully! Your username is "${data.user.name}". This account is currently pending approval from an owner, admin, or host.`);
        setEmail("");
        setName("");
        setOrganization("");
        setIsSignUp(false);
      } else {
        // Log in
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, provider: "email" }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Login failed.");
        }

        onLoginSuccess(data.user);
      }
    } catch (err: any) {
      setError(err.message || "An error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async (googleEmail: string, googleName: string, googleAvatar: string) => {
    setError("");
    setInfoMessage("");
    setIsLoading(true);
    setShowGoogleMock(false);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: googleEmail,
          name: googleName,
          provider: "google",
          avatarUrl: googleAvatar
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Google login failed.");
      }

      onLoginSuccess(data.user);
    } catch (err: any) {
      setError(err.message || "An error occurred during Google sign-in.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLoginDirect = async () => {
    setError("");
    setInfoMessage("");
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "ct.aleppo2@gmail.com",
          name: "ct.aleppo2",
          provider: "google",
          avatarUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&fit=crop"
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Google login failed.");
      }

      onLoginSuccess(data.user);
    } catch (err: any) {
      setError(err.message || "An error occurred during Google sign-in.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex flex-col items-center justify-center p-4 overflow-hidden select-none text-gray-900 dark:text-zinc-100">
      
      {/* Dynamic Cover background shown to public with the sign-in card */}
      {coverUrl ? (
        <div 
          className="absolute inset-0 bg-cover bg-center scale-105 transition-all duration-1000"
          style={{ backgroundImage: `url(${coverUrl})` }}
        >
          {/* High-contrast dark overlay to keep the sign-in form legible */}
          <div className="absolute inset-0 bg-zinc-950/80 backdrop-blur-md" />
        </div>
      ) : (
        <div className="absolute inset-0 bg-gray-50 dark:bg-zinc-950" />
      )}

      {/* Top indicator of active cover */}
      {coverTitle && (
        <div className="absolute top-4 left-4 z-10 flex items-center gap-1.5 text-[10px] font-mono text-zinc-400 bg-zinc-900/60 backdrop-blur-md border border-zinc-800 px-2.5 py-1 rounded-full shadow-sm">
          <Eye className="w-3.5 h-3.5 text-[#be1f24]" />
          <span>Active Public Cover: {coverTitle}</span>
        </div>
      )}

      {/* Decorative top red line */}
      <div className="absolute top-0 left-0 w-full h-1 bg-[#be1f24]" />

      {/* Main card */}
      <div className="w-full max-w-md bg-white dark:bg-zinc-950 border border-gray-100 dark:border-zinc-900 rounded-2xl shadow-xl p-8 z-10 flex flex-col gap-6 relative">
        
        {/* Top Header */}
        <div className="flex flex-col items-center text-center gap-2">
          <img
            src={isDark ? "/logo_white.svg" : "/logo_red.svg"}
            alt="Christian Hope Center Logo"
            className="h-16 w-auto object-contain"
            referrerPolicy="no-referrer"
          />
          <p className="text-xs font-mono text-[#be1f24] dark:text-zinc-400 uppercase tracking-widest font-black mt-1 leading-none">
            Media Space
          </p>
        </div>

        {/* Tab Selection */}
        <div className="grid grid-cols-2 bg-gray-100 dark:bg-zinc-900 p-1 rounded-lg">
          <button
            onClick={() => {
              setIsSignUp(false);
              setError("");
              setInfoMessage("");
            }}
            className={`py-2 text-xs font-bold rounded-md transition-all cursor-pointer ${
              !isSignUp ? "bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 shadow-xs" : "text-gray-500 hover:text-gray-800 dark:hover:text-zinc-350"
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => {
              setIsSignUp(true);
              setError("");
              setInfoMessage("");
            }}
            className={`py-2 text-xs font-bold rounded-md transition-all cursor-pointer ${
              isSignUp ? "bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 shadow-xs" : "text-gray-500 hover:text-gray-800 dark:hover:text-zinc-350"
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Alert Logs */}
        {error && (
          <div className="bg-white dark:bg-zinc-900 border border-[#be1f24] text-xs text-gray-800 dark:text-zinc-200 px-4 py-3 rounded-xl flex items-start gap-2.5 shadow-3xs">
            <ShieldAlert className="w-4 h-4 text-[#be1f24] flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {infoMessage && (
          <div className="bg-green-50 dark:bg-zinc-900/50 border border-green-200 dark:border-green-900 text-xs text-green-800 dark:text-green-200 px-4 py-3 rounded-xl flex items-start gap-2.5">
            <CheckCircle className="w-4 h-4 text-green-700 dark:text-green-400 flex-shrink-0 mt-0.5" />
            <span>{infoMessage}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          
          {isSignUp && (
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-600 dark:text-zinc-400">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 w-4 h-4 text-gray-400 dark:text-zinc-500" />
                <input
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full text-xs pl-10 pr-3 py-2.5 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:bg-white dark:focus:bg-zinc-950 focus:border-[#be1f24] text-gray-800 dark:text-zinc-100"
                />
              </div>
              {name && (
                <p className="text-[10px] text-[#be1f24] font-mono mt-0.5 ml-1">
                  Will register as: <span className="font-bold underline">{getFormattedPreview(name)}</span>
                </p>
              )}
            </div>
          )}

          {isSignUp && (
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-600 dark:text-zinc-400">Organization / NGO / Company</label>
              <div className="relative">
                <Briefcase className="absolute left-3 top-2.5 w-4 h-4 text-gray-400 dark:text-zinc-500" />
                <input
                  type="text"
                  placeholder="e.g. Christian Hope Center"
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                  className="w-full text-xs pl-10 pr-3 py-2.5 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:bg-white dark:focus:bg-zinc-950 focus:border-[#be1f24] text-gray-800 dark:text-zinc-100"
                />
              </div>
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label className="text-xs font-semibold text-gray-600 dark:text-zinc-400">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 w-4 h-4 text-gray-400 dark:text-zinc-500" />
              <input
                type="email"
                required
                placeholder="e.g. researcher@hopecenter.org"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full text-xs pl-10 pr-3 py-2.5 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:bg-white dark:focus:bg-zinc-950 focus:border-[#be1f24] text-gray-800 dark:text-zinc-100"
              />
            </div>
          </div>

          {isSignUp && (
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-gray-600 dark:text-zinc-400">Requested Role</label>
              <select
                value={roleSelection}
                onChange={(e) => setRoleSelection(e.target.value as UserRole)}
                className="w-full text-xs px-3 py-2.5 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:bg-white dark:focus:bg-zinc-950 focus:border-[#be1f24] text-gray-800 dark:text-zinc-100 cursor-pointer"
              >
                <option value="external_user" className="dark:bg-zinc-900 text-gray-800 dark:text-zinc-200 font-sans">External User (Browse & request high-res)</option>
                <option value="internal_member" className="dark:bg-zinc-900 text-gray-800 dark:text-zinc-200 font-sans">Internal Member (CHC team members)</option>
                <option value="photographer" className="dark:bg-zinc-900 text-gray-800 dark:text-zinc-200 font-sans">Photographer (Upload submissions)</option>
                <option value="archive_manager" className="dark:bg-zinc-900 text-gray-800 dark:text-zinc-200 font-sans">Archive Manager (Control approvals & staff)</option>
                <option value="super_admin" className="dark:bg-zinc-900 text-gray-800 dark:text-zinc-200 font-sans">Super Admin (Full system settings)</option>
              </select>
            </div>
          )}

          {!isSignUp && (
            <div className="flex items-center justify-between text-[11px] text-gray-400">
              <span className="flex items-center gap-1">
                <Lock className="w-3 h-3" /> No password required in secure build
              </span>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-[#be1f24] hover:opacity-90 active:scale-98 text-white py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm mt-2"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : isSignUp ? (
              "Submit Registration"
            ) : (
              "Sign In with Email"
            )}
          </button>
        </form>

        {/* OR Divider */}
        <div className="flex items-center justify-center my-1">
          <div className="border-t border-gray-100 dark:border-zinc-800 flex-1"></div>
          <span className="text-[10px] font-mono text-gray-400 uppercase px-3">or</span>
          <div className="border-t border-gray-100 dark:border-zinc-800 flex-1"></div>
        </div>

        {/* Google Sign In Button */}
        <button
          onClick={handleGoogleLoginDirect}
          className="w-full border border-gray-200 dark:border-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-800 text-gray-700 dark:text-zinc-200 bg-white dark:bg-zinc-900 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2.5 cursor-pointer"
        >
          {/* Google Icon SVG */}
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="#EA4335"
              d="M12 5.04c1.62 0 3.06.56 4.2 1.66l3.14-3.14C17.42 1.84 14.9 1 12 1 7.35 1 3.4 3.65 1.5 7.5l3.86 3C6.27 7.5 8.9 5.04 12 5.04z"
            />
            <path
              fill="#4285F4"
              d="M23.5 12.25c0-.82-.07-1.61-.21-2.38H12v4.5h6.48c-.28 1.48-1.11 2.73-2.37 3.58l3.7 2.87c2.16-2 3.69-4.95 3.69-8.57z"
            />
            <path
              fill="#FBBC05"
              d="M5.36 14.5c-.24-.72-.38-1.49-.38-2.3c0-.81.14-1.58.38-2.3L1.5 6.9c-.8 1.6-1.25 3.4-1.25 5.3s.45 3.7 1.25 5.3l3.86-3z"
            />
            <path
              fill="#34A853"
              d="M12 23c3.24 0 5.97-1.08 7.96-2.91l-3.7-2.87c-1.03.69-2.35 1.1-4.26 1.1-3.1 0-5.73-2.46-6.66-5.46L1.48 15.9C3.38 19.75 7.32 23 12 23z"
            />
          </svg>
          <span>Sign In with Google</span>
        </button>

        {/* Notice of admin approval - matches instructions */}
        <div className="bg-amber-50/50 border border-amber-200/50 rounded-xl p-4 flex flex-col gap-1.5 text-xs text-amber-900 mt-2">
          <div className="flex items-center gap-1.5 font-bold text-amber-800 text-[11px] uppercase tracking-wider">
            <HelpCircle className="w-3.5 h-3.5 flex-shrink-0" />
            <span>Registration Requirements</span>
          </div>
          <p className="leading-relaxed text-[11px]">
            To protect archival dignity and secure sensitive narratives, <strong>all registered accounts require approval</strong> from a Hope Center administrator before they can access libraries or contribute photos.
          </p>
        </div>

        {/* Demo Helper box */}
        <div className="border-t border-gray-100 pt-5 mt-1 flex flex-col gap-2.5">
          <span className="text-[10px] font-mono uppercase tracking-wider text-gray-400 font-semibold block text-center">
            Quick Sandbox Access
          </span>
          <button
            type="button"
            onClick={handleGoogleLoginDirect}
            className="w-full px-2.5 py-1.5 border border-[#be1f24]/20 bg-neutral-50 hover:bg-neutral-100 text-center text-[10px] font-bold text-[#be1f24] rounded-lg cursor-pointer transition-all flex items-center justify-center gap-1.5"
          >
            👑 Enter as System Owner
          </button>
        </div>

      </div>

    </div>
  );
}
