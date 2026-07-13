import React, { useState, useEffect } from "react";
import { Mail, User, ShieldAlert, Loader2, Sparkles, CheckCircle, ChevronRight, Lock, HelpCircle, Briefcase, Eye, Inbox, X } from "lucide-react";
import { UserAccount, UserRole } from "../types";

interface LoginScreenProps {
  onLoginSuccess: (user: UserAccount) => void;
}

interface SimulatedEmail {
  id: string;
  to: string;
  subject: string;
  body: string;
  code: string;
  timestamp: string;
  read: boolean;
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
  const [step, setStep] = useState<"login" | "verify" | "forgot" | "reset">("login");
  const [verificationEmail, setVerificationEmail] = useState("");
  const [verificationCodeInput, setVerificationCodeInput] = useState("");

  // Forgot password state
  const [forgotEmail, setForgotEmail] = useState("");
  const [resetCodeInput, setResetCodeInput] = useState("");
  const [newPassword, setNewPassword] = useState("");

  // Simulated mailbox state
  const [simulatedEmails, setSimulatedEmails] = useState<SimulatedEmail[]>(() => {
    const saved = localStorage.getItem("chc_simulated_emails");
    return saved ? JSON.parse(saved) : [];
  });
  const [isMailboxOpen, setIsMailboxOpen] = useState(false);
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem("chc_simulated_emails", JSON.stringify(simulatedEmails));
  }, [simulatedEmails]);

  const addSimulatedEmail = (toEmail: string, code: string) => {
    if (!code) return;
    const newMail: SimulatedEmail = {
      id: `mail_${Date.now()}`,
      to: toEmail,
      subject: "🔑 CHC Archive Verification Code",
      body: `Hi there,\n\nThank you for registering at Christian Hope Center Syria Media Space.\n\nYour account is almost ready. Please use the following 6-digit code to verify your email address:\n\nVerification Code: ${code}\n\nOnce verified, an Archive Manager or Administrator will review your account registration.\n\nBest regards,\nChristian Hope Center Admin`,
      code,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      read: false
    };
    setSimulatedEmails((prev) => [newMail, ...prev]);
    setIsMailboxOpen(true);
    setSelectedEmailId(newMail.id);
  };

  const addSimulatedResetEmail = (toEmail: string, code: string) => {
    if (!code) return;
    const newMail: SimulatedEmail = {
      id: `mail_${Date.now()}`,
      to: toEmail,
      subject: "🔒 CHC Password Reset Code",
      body: `Hi there,\n\nYou have requested a password reset for your Christian Hope Center Media Space account.\n\nPlease use the following 6-digit code to complete your password reset:\n\nReset Code: ${code}\n\nIf you did not request this reset, please ignore this email.\n\nBest regards,\nChristian Hope Center Admin`,
      code,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      read: false
    };
    setSimulatedEmails((prev) => [newMail, ...prev]);
    setIsMailboxOpen(true);
    setSelectedEmailId(newMail.id);
  };

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

        setIsSignUp(false);
        setError("");
        setInfoMessage("Registration successful! Your account has been registered and is now pending approval by the owner (ct.aleppo2@gmail.com). You can sign in once approved.");
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
            setStep("verify");
            if (data.emailSent) {
              setError("Email is not verified yet. A verification code has been sent to your real email address. Please check your inbox (and spam folder).");
            } else {
              setError("Email is not verified yet. Real SMTP email delivery is not configured on the server, so we have routed the code to the Sandbox Mailbox widget at the bottom right.");
            }
            if (data.verificationCode) {
              addSimulatedEmail(data.email || email, data.verificationCode);
            }
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
      setError("");
      setInfoMessage("Email address verified successfully! Your account is now pending approval by the owner (ct.aleppo2@gmail.com). You can sign in once approved.");
    } catch (err: any) {
      setError(err.message || "An error occurred during verification.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail) {
      setError("Please enter your email address.");
      return;
    }

    setError("");
    setInfoMessage("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to generate password reset code.");
      }

      // Add simulated email
      if (data.resetCode) {
        addSimulatedResetEmail(data.email || forgotEmail, data.resetCode);
      }

      // Switch to reset step
      setStep("reset");
      setVerificationEmail(data.email || forgotEmail);
      setError("");
      setInfoMessage("A password reset code has been sent. Please check the Sandbox Mailbox widget at the bottom right.");
    } catch (err: any) {
      setError(err.message || "An error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetCodeInput) {
      setError("Please enter the 6-digit reset code.");
      return;
    }
    if (!newPassword) {
      setError("Please enter a new password.");
      return;
    }

    setError("");
    setInfoMessage("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: verificationEmail.trim() || forgotEmail.trim(),
          code: resetCodeInput.trim(),
          newPassword: newPassword.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to reset password.");
      }

      setStep("login");
      setIsSignUp(false);
      setResetCodeInput("");
      setNewPassword("");
      setError("");
      setInfoMessage("Your password has been reset successfully! You can now log in with your new password.");
    } catch (err: any) {
      setError(err.message || "An error occurred.");
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

        {step === "login" && (
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

              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-gray-600 dark:text-zinc-400">Password</label>
                  {!isSignUp && (
                    <button
                      type="button"
                      onClick={() => {
                        setStep("forgot");
                        setError("");
                        setInfoMessage("");
                        setForgotEmail(email);
                      }}
                      className="text-[11px] text-[#be1f24] hover:underline cursor-pointer"
                    >
                      Forgot Password?
                    </button>
                  )}
                </div>
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
        )}

        {step === "verify" && (
          /* Verification Screen */
          <div className="flex flex-col gap-4">
            <div className="text-center flex flex-col gap-1.5">
              <h2 className="text-sm font-bold text-gray-900 dark:text-zinc-100">Verify Your Email</h2>
              <p className="text-xs text-gray-500 dark:text-zinc-400">
                A 6-digit confirmation code was sent to <strong className="text-gray-700 dark:text-zinc-200">{verificationEmail}</strong>.
              </p>
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

        {step === "forgot" && (
          /* Forgot Password Screen */
          <div className="flex flex-col gap-4">
            <div className="text-center flex flex-col gap-1.5">
              <h2 className="text-sm font-bold text-gray-900 dark:text-zinc-100">Forgot Password</h2>
              <p className="text-xs text-gray-500 dark:text-zinc-400">
                Enter your registered email address below, and we will generate a 6-digit password reset code for you.
              </p>
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

            <form onSubmit={handleForgotPassword} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-600 dark:text-zinc-400">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 w-4 h-4 text-gray-400 dark:text-zinc-500" />
                  <input
                    type="email"
                    required
                    placeholder="e.g. researcher@hopecenter.org"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    className="w-full text-xs pl-10 pr-3 py-2.5 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:bg-white dark:focus:bg-zinc-950 focus:border-[#be1f24] text-gray-800 dark:text-zinc-100"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#be1f24] hover:opacity-90 active:scale-98 text-white py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Generate Reset Code"
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
                Back to Sign In
              </button>
            </form>
          </div>
        )}

        {step === "reset" && (
          /* Reset Password Screen */
          <div className="flex flex-col gap-4">
            <div className="text-center flex flex-col gap-1.5">
              <h2 className="text-sm font-bold text-gray-900 dark:text-zinc-100">Reset Password</h2>
              <p className="text-xs text-gray-500 dark:text-zinc-400">
                Enter the 6-digit reset code and your desired new password below.
              </p>
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

            <form onSubmit={handleResetPassword} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-600 dark:text-zinc-400">6-Digit Reset Code</label>
                <input
                  type="text"
                  maxLength={6}
                  required
                  placeholder="e.g. 123456"
                  value={resetCodeInput}
                  onChange={(e) => setResetCodeInput(e.target.value.replace(/\D/g, ""))}
                  className="w-full text-center tracking-[0.5em] font-mono font-black text-lg py-2 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:bg-white dark:focus:bg-zinc-950 focus:border-[#be1f24] text-gray-800 dark:text-zinc-100"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-gray-600 dark:text-zinc-400">New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 w-4 h-4 text-gray-400 dark:text-zinc-500" />
                  <input
                    type="password"
                    required
                    placeholder="Enter your new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full text-xs pl-10 pr-3 py-2.5 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:bg-white dark:focus:bg-zinc-950 focus:border-[#be1f24] text-gray-800 dark:text-zinc-100"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#be1f24] hover:opacity-90 active:scale-98 text-white py-2.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Reset Password"
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
                Back to Sign In
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

      </div>

      {/* Floating Sandbox Mailbox Simulator Widget */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end">
        {/* Mailbox toggle button */}
        <button
          type="button"
          onClick={() => {
            setIsMailboxOpen(!isMailboxOpen);
          }}
          className="relative flex items-center gap-2 bg-[#be1f24] hover:bg-[#a1161a] active:scale-95 text-white font-sans text-xs font-black px-4 py-3 rounded-full shadow-lg transition-all border border-[#be1f24]/20 cursor-pointer"
        >
          <Inbox className="w-4 h-4 animate-pulse" />
          <span>📧 Sandbox Mailbox</span>
          
          {/* Notification badge */}
          {simulatedEmails.filter(m => !m.read).length > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-yellow-500 text-neutral-950 font-black text-[9px] w-5 h-5 rounded-full flex items-center justify-center border-2 border-white dark:border-zinc-950 animate-bounce">
              {simulatedEmails.filter(m => !m.read).length}
            </span>
          )}
        </button>

        {/* Mailbox Drawer / Popover */}
        {isMailboxOpen && (
          <div className="w-80 md:w-96 h-96 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl shadow-2xl mt-3 flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 duration-200">
            {/* Header */}
            <div className="bg-[#be1f24] text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Inbox className="w-4 h-4" />
                <span className="text-xs font-black tracking-wider uppercase">Sandbox Mail Inboxes</span>
              </div>
              <button
                type="button"
                onClick={() => setIsMailboxOpen(false)}
                className="text-white/80 hover:text-white transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content area split: List vs Detail */}
            <div className="flex-1 overflow-y-auto flex flex-col">
              {selectedEmailId ? (
                /* Email Detail View */
                (() => {
                  const email = simulatedEmails.find(m => m.id === selectedEmailId);
                  if (!email) return null;
                  return (
                    <div className="p-4 flex flex-col gap-3 h-full">
                      <button
                        type="button"
                        onClick={() => setSelectedEmailId(null)}
                        className="text-[10px] font-mono uppercase tracking-wider text-gray-400 hover:text-gray-600 dark:hover:text-zinc-200 text-left cursor-pointer mb-1 underline"
                      >
                        ← Back to Inbox
                      </button>
                      <div className="border-b border-gray-100 dark:border-zinc-800 pb-2 flex flex-col gap-1">
                        <div className="text-[10px] font-mono text-gray-550">
                          <strong>To:</strong> {email.to}
                        </div>
                        <div className="text-[10px] font-mono text-gray-555">
                          <strong>Time:</strong> {email.timestamp}
                        </div>
                        <div className="text-xs font-bold text-gray-900 dark:text-zinc-100">
                          {email.subject}
                        </div>
                      </div>
                      <div className="flex-1 font-mono text-[11px] text-gray-700 dark:text-zinc-300 whitespace-pre-wrap leading-relaxed bg-gray-50 dark:bg-zinc-950 p-3 rounded-lg border border-gray-150 dark:border-zinc-900 overflow-y-auto">
                        {email.body}
                        
                        {/* Highlighted verification code */}
                        <div className="mt-4 p-3 bg-[#be1f24]/10 dark:bg-[#be1f24]/20 border border-[#be1f24]/30 rounded-lg text-center">
                          <span className="text-[10px] font-bold text-[#be1f24] uppercase block mb-1">Your Verification Code</span>
                          <span className="text-lg font-black tracking-widest text-[#be1f24]">{email.code}</span>
                        </div>
                      </div>
                    </div>
                  );
                })()
              ) : (
                /* Email List View */
                simulatedEmails.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-gray-400 dark:text-zinc-500">
                    <Inbox className="w-8 h-8 stroke-1 mb-2 opacity-50" />
                    <span className="text-xs font-bold">No simulated emails</span>
                    <p className="text-[10px] max-w-[200px] mt-1 leading-relaxed">
                      Verification emails for registration or unverified sign-in will show up here.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100 dark:divide-zinc-800">
                    {simulatedEmails.map((mail) => (
                      <button
                        key={mail.id}
                        type="button"
                        onClick={() => {
                          // Mark as read
                          setSimulatedEmails(prev => prev.map(m => m.id === mail.id ? { ...m, read: true } : m));
                          setSelectedEmailId(mail.id);
                        }}
                        className={`w-full text-left p-3.5 flex flex-col gap-1 transition-all hover:bg-gray-50 dark:hover:bg-zinc-800/50 cursor-pointer ${
                          !mail.read ? "bg-red-50/30 dark:bg-[#be1f24]/5" : ""
                        }`}
                      >
                        <div className="flex items-center justify-between text-[10px] font-mono text-gray-400">
                          <span className="truncate max-w-[150px]">{mail.to}</span>
                          <span>{mail.timestamp}</span>
                        </div>
                        <div className={`text-xs truncate ${!mail.read ? "font-black text-gray-900 dark:text-white" : "text-gray-600 dark:text-zinc-400"}`}>
                          {mail.subject}
                        </div>
                        <div className="text-[10px] text-gray-400 truncate">
                          Code: {mail.code} • Click to read email
                        </div>
                      </button>
                    ))}
                  </div>
                )
              )}
            </div>
            
            {/* Clear button footer */}
            {simulatedEmails.length > 0 && (
              <div className="bg-gray-50 dark:bg-zinc-950 p-2 border-t border-gray-150 dark:border-zinc-800 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setSimulatedEmails([]);
                    setSelectedEmailId(null);
                  }}
                  className="text-[10px] font-mono uppercase tracking-wider text-[#be1f24] hover:underline cursor-pointer"
                >
                  Clear Mailbox
                </button>
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
}
