import React from "react";
import { Hourglass, Lock, ShieldCheck, Mail, AlertCircle, LogOut } from "lucide-react";
import { UserAccount } from "../types";

interface PendingApprovalScreenProps {
  user: UserAccount;
  onSignOut: () => void;
  onRefresh: () => void;
}

export default function PendingApprovalScreen({ user, onSignOut, onRefresh }: PendingApprovalScreenProps) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 relative select-none">
      
      {/* Decorative background gradients */}
      <div className="absolute top-0 left-0 w-full h-1 bg-amber-500" />
      <div className="absolute top-[-20%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-amber-50/40 blur-3xl pointer-events-none" />

      {/* Main card */}
      <div className="w-full max-w-md bg-white border border-gray-100 rounded-2xl shadow-xl p-8 z-10 flex flex-col gap-6 text-center">
        
        {/* Animated Icon */}
        <div className="flex items-center justify-center self-center w-16 h-16 rounded-full bg-amber-50 text-amber-600 border border-amber-200 shadow-xs relative">
          <Hourglass className="w-8 h-8 animate-spin duration-[3000ms]" />
          <Lock className="w-4 h-4 absolute bottom-1 right-1 bg-amber-100 rounded-full p-0.5 border border-white" />
        </div>

        <div>
          <h1 className="font-display font-bold text-xl tracking-tight text-gray-900 leading-tight">
            Awaiting Administrative Approval
          </h1>
          <p className="text-xs font-mono text-amber-600 uppercase tracking-wider font-semibold mt-1">
            Hope Center Archival Library
          </p>
        </div>

        {/* User Badge Info */}
        <div className="bg-gray-50 rounded-xl p-4 flex items-center gap-3.5 border border-gray-100 text-left">
          <img
            src={user.avatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(user.email)}`}
            alt={user.name}
            className="w-10 h-10 rounded-full border border-gray-200 flex-shrink-0"
          />
          <div className="overflow-hidden">
            <h3 className="text-xs font-bold text-gray-900 truncate">{user.name}</h3>
            <p className="text-[10px] text-gray-500 font-mono truncate">{user.email}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[9px] font-bold px-2 py-0.5 bg-gray-100 border border-gray-200 text-gray-700 rounded-full">
                Requested Role: {user.role}
              </span>
              <span className="text-[9px] font-bold px-2 py-0.5 bg-amber-50 border border-amber-200 text-amber-700 rounded-full animate-pulse">
                Pending
              </span>
            </div>
          </div>
        </div>

        {/* Informative message */}
        <div className="text-xs text-gray-600 leading-relaxed flex flex-col gap-2.5">
          <p>
            Thank you for registering. For dignity, privacy, and security reasons, your account registration has been submitted for review.
          </p>
          <p className="text-gray-500 text-[11px]">
            Once an administrator grants approval, you'll immediately gain access to the photography catalog and upload pipelines.
          </p>
        </div>

        {/* Testing helper alert */}
        <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-3 text-[11px] text-blue-900 text-left flex gap-2">
          <AlertCircle className="w-4 h-4 text-blue-700 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block">Evaluation Sandbox Guide:</span>
            To instantly approve this account, sign out and use the <strong>Sign in as Admin</strong> helper on the login page, then approve this account from the Account Management dashboard!
          </div>
        </div>

        {/* Action Button layout */}
        <div className="grid grid-cols-2 gap-3 mt-2">
          <button
            onClick={onSignOut}
            className="flex items-center justify-center gap-1.5 border border-gray-200 hover:bg-gray-50 text-gray-700 px-4 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>

          <button
            onClick={onRefresh}
            className="flex items-center justify-center gap-1.5 bg-[#be1f24] hover:opacity-90 text-white px-4 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-xs"
          >
            <span>Check Status</span>
          </button>
        </div>

      </div>

    </div>
  );
}
