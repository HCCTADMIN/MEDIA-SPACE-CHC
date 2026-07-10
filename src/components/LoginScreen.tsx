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
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [organization, setOrganization] = useState("");
  const [roleSelection, setRoleSelection] = useState<UserRole>("external_user");
  
  const [error, setError] = useState("");
  const [infoMessage, setInfoMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Verification state
  const [step, setStep] = useState<"login" | "verify">("login");
  const [verificationEmail, setVerificationEmail] = useState("");
  const [verificationCodeInput, setVerificationCodeInput] = useState("");
  const [simulatedCode, setSimulatedCode] = useState("");

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError("Please enter an email address.");
      return;
    }
    if (!password) {
      setError("Please enter a password.");
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
            password,
            name, 
            role: roleSelection,
            organization 
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Failed to register account.");
        }

        // Auto-navigate to verify step and show simulated code
        setVerificationEmail(email);
        setSimulatedCode(data.verificationCode || "");
        setStep("verify");
        setError("");
        setInfoMessage("Registration successful! We have simulated sending a verification email below. Please enter the 6-digit code to verify your email address.");
      } else {
        // Log in
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });

        const data = await res.json();
        if (!res.ok) {
          // If unverified email, allow verifying immediately
          if (data.code === "EMAIL_NOT_VERIFIED") {
            setVerificationEmail(data.email || email);
            setSimulatedCode(data.verificationCode || "");
            setStep("verify");
            setError("Email is not verified yet. Please enter the 6-digit verification code below.");
            return;
          }
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

  const handleVerifyEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verificationCodeInput) {
      setError("Please enter the 6-digit verification code.");
      return;
    }

    setError("");
    setInfoMessage("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: verificationEmail, code: verificationCodeInput.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Email verification failed.");
      }

      setStep("login");
      setIsSignUp(false);
      setVerificationCodeInput("");
      setSimulatedCode("");
      setError("");
      setInfoMessage("Email address verified successfully! Your account is now pending approval by the owner (ct.aleppo2@gmail.com). You can sign in once approved.");
    } catch (err: any) {
      setError(err.message || "An error occurred during verification.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOwnerAccessDirect = async () => {
    setError("");
    setInfoMessage("");
    setIsLoading(true);
    setStep("login");
    setIsSignUp(false);
    
    // Fill credentials
    setEmail("ct.aleppo2@gmail.com");
    setPassword("hccthcct");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "ct.aleppo2@gmail.com",
          password: "hccthcct"
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to log in as owner.");
      }

      onLoginSuccess(data.user);
    } catch (err: any) {
      setError(err.message || "An error occurred during owner access.");
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

        {step === "login" ? (
          <>
            {/* Tab Selection */}
            <div className="grid grid-cols-2 bg-gray-100 dark:bg-zinc-900 p-1 rounded-lg">
              <button
                type="button"
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
                type="button"
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
                  <label className="text-xs font-semibold text-gray-600 dark:text-zinc-400">Full NameLabel</label>
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

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-600 dark:text-zinc-400">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 w-4 h-4 text-gray-400 dark:text-zinc-500" />
                  <input
                    type="password"
                    required
                    placeholder="Enter account password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
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
                  "Sign In with Password"
                )}
              </button>
            </form>
          </>
        ) : (
          /* Verification Screen */
          <div className="flex flex-col gap-4">
            <div className="text-center flex flex-col gap-1.5">
              <h2 className="text-sm font-bold text-gray-900 dark:text-zinc-100">Verify Your Email</h2>
              <p className="text-xs text-gray-500 dark:text-zinc-400">
                A 6-digit confirmation code was sent to <strong className="text-gray-700 dark:text-zinc-200">{verificationEmail}</strong>.
              </p>
            </div>

            {/* Simulated Email Box */}
            {simulatedCode && (
              <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 rounded-xl p-3.5 text-xs text-blue-900 dark:text-blue-200 flex flex-col gap-1.5 font-mono shadow-xs">
                <span className="font-bold text-[10px] tracking-wider uppercase text-blue-800 dark:text-blue-300">📧 Sandbox Email Simulator</span>
                <div className="text-[11px]">
                  Subject: <span className="underline">CHC Verification Code</span>
                  <br />
                  Code: <strong className="text-sm text-[#be1f24] bg-white dark:bg-zinc-900 px-2 py-0.5 rounded-md border border-gray-150 dark:border-zinc-800">{simulatedCode}</strong>
                </div>
              </div>
            )}

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

            <form onSubmit={handleVerifyEmail} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-600 dark:text-zinc-400">6-Digit Verification Code</label>
                <input
                  type="text"
                  maxLength={6}
                  required
                  placeholder="e.g. 123456"
                  value={verificationCodeInput}
                  onChange={(e) => setVerificationCodeInput(e.target.value.replace(/\D/g, ""))}
                  className="w-full text-center tracking-[0.5em] font-mono font-black text-lg py-2 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:bg-white dark:focus:bg-zinc-950 focus:border-[#be1f24] text-gray-800 dark:text-zinc-100"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#be1f24] hover:opacity-90 active:scale-98 text-white py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Verify Email Code"
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setStep("login");
                  setError("");
                  setInfoMessage("");
                }}
                className="text-xs text-gray-500 hover:text-gray-800 dark:hover:text-zinc-350 underline text-center cursor-pointer transition-all"
              >
                Back to Sign In / Sign Up
              </button>
            </form>
          </div>
        )}

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
        <div className="border-t border-gray-100 dark:border-zinc-900 pt-5 mt-1 flex flex-col gap-2.5">
          <span className="text-[10px] font-mono uppercase tracking-wider text-gray-400 font-semibold block text-center">
            Quick Sandbox Access
          </span>
          <button
            type="button"
            onClick={handleOwnerAccessDirect}
            className="w-full px-2.5 py-1.5 border border-[#be1f24]/20 bg-neutral-50 dark:bg-zinc-900 hover:bg-neutral-100 dark:hover:bg-zinc-800 text-center text-[10px] font-bold text-[#be1f24] rounded-lg cursor-pointer transition-all flex items-center justify-center gap-1.5"
          >
            👑 Enter as System Owner (ct.aleppo2)
          </button>
        </div>

      </div>

    </div>
  );
}
