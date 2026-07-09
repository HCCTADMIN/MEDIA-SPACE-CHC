import React, { useState } from "react";
import { Search, Upload, User, ChevronDown, Globe, Users, LogOut, Shield, Sun, Moon, Home, Bell, Eye, CheckCheck } from "lucide-react";
import { UserAccount, Photo } from "../types";

interface HeaderProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  currentUser: UserAccount;
  onSignOut: () => void;
  onAdminUsersClick: () => void;
  onUploadClick: () => void;
  onProfileClick: () => void;
  photos?: Photo[];
  onSelectKeyword?: (kw: string) => void;
  onSelectLocation?: (loc: string) => void;
  onSelectPhotographer?: (ph: string) => void;
  onSelectCollection?: (col: string) => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  onGoHome: () => void;
  onUpdateProfile?: (updated: UserAccount) => void;
  onViewPhotoById?: (photoId: string) => void;
  viewAsMode?: "admin" | "user" | "guest";
  onViewAsModeChange?: (mode: "admin" | "user" | "guest") => void;
}

export default function Header({
  searchQuery,
  setSearchQuery,
  currentUser,
  onSignOut,
  onAdminUsersClick,
  onUploadClick,
  onProfileClick,
  photos = [],
  onSelectKeyword,
  onSelectLocation,
  onSelectPhotographer,
  onSelectCollection,
  isDarkMode,
  onToggleDarkMode,
  onGoHome,
  onUpdateProfile,
  onViewPhotoById,
  viewAsMode = "admin",
  onViewAsModeChange,
}: HeaderProps) {
  const actualIsAdmin = currentUser.role === "super_admin" || currentUser.role === "archive_manager";
  const isAdmin = actualIsAdmin && viewAsMode === "admin";
  const isGuest = currentUser.role === "external_user" || currentUser.role === "internal_member" || viewAsMode === "guest";
  const canUpload = (currentUser.role === "super_admin" || currentUser.role === "archive_manager" || currentUser.role === "photographer") && viewAsMode !== "guest";
  const [isFocused, setIsFocused] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  const unreadCount = currentUser.notifications?.filter((n) => !n.read).length || 0;

  const handleMarkAllRead = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/users/${currentUser.id}/notifications/read`, {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.user) {
          onUpdateProfile?.(data.user);
        }
      }
    } catch (err) {
      console.error("Failed to mark all notifications read:", err);
    }
  };

  const handleMarkSingleRead = async (notificationId: string) => {
    try {
      const res = await fetch(`/api/users/${currentUser.id}/notifications/read`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.user) {
          onUpdateProfile?.(data.user);
        }
      }
    } catch (err) {
      console.error("Failed to mark notification read:", err);
    }
  };

  const handleNotificationClick = async (notif: any) => {
    if (!notif.read) {
      await handleMarkSingleRead(notif.id);
    }
    setIsNotificationsOpen(false);

    // Take action
    if (notif.photoId) {
      onViewPhotoById?.(notif.photoId);
    } else if (
      notif.message.toLowerCase().includes("registration") ||
      notif.message.toLowerCase().includes("download request")
    ) {
      onAdminUsersClick();
    }
  };

  const getSuggestions = () => {
    if (!searchQuery) return [];
    const query = searchQuery.toLowerCase().trim();
    if (query.length < 1) return [];
    
    const matchedKeywords = new Set<string>();
    const matchedLocations = new Set<string>();
    const matchedPhotographers = new Set<string>();
    const matchedCollections = new Set<string>();

    photos.forEach((photo) => {
      // check keywords
      if (photo.keywords) {
        photo.keywords.forEach((kw) => {
          if (kw.toLowerCase().includes(query)) {
            matchedKeywords.add(kw);
          }
        });
      }
      // check locations
      if (photo.location && photo.location.toLowerCase().includes(query)) {
        matchedLocations.add(photo.location);
      }
      if (photo.city && photo.city.toLowerCase().includes(query)) {
        matchedLocations.add(photo.city);
      }
      // check photographers
      if (photo.photographer && photo.photographer.toLowerCase().includes(query)) {
        matchedPhotographers.add(photo.photographer);
      }
      // check collections
      if (photo.collection && photo.collection.toLowerCase().includes(query)) {
        matchedCollections.add(photo.collection);
      }
    });

    const list: { type: "keyword" | "location" | "photographer" | "collection"; value: string }[] = [];
    
    Array.from(matchedKeywords).slice(0, 3).forEach(kw => {
      list.push({ type: "keyword", value: kw });
    });
    Array.from(matchedLocations).slice(0, 3).forEach(loc => {
      list.push({ type: "location", value: loc });
    });
    Array.from(matchedPhotographers).slice(0, 3).forEach(ph => {
      list.push({ type: "photographer", value: ph });
    });
    Array.from(matchedCollections).slice(0, 3).forEach(col => {
      list.push({ type: "collection", value: col });
    });

    return list;
  };

  const suggestions = getSuggestions();

  return (
    <header className="sticky top-0 z-40 w-full bg-white/70 dark:bg-zinc-950/80 backdrop-blur-md border-b border-gray-200/50 dark:border-zinc-900 shadow-[0_4px_20px_0_rgba(0,0,0,0.03)] px-6 py-3 flex flex-col md:flex-row items-center justify-between gap-4 transition-all">
      {/* Brand Logo and Title */}
      <div 
        onClick={onGoHome}
        className="flex items-center gap-3 self-start md:self-auto cursor-pointer hover:opacity-95 select-none group/logo transition-all"
        title="Go back to Home"
      >
        <img
          src={isDarkMode ? "/logo_white.svg" : "/logo_red.svg"}
          alt="Christian Hope Center Logo"
          className="h-10 md:h-11 w-auto object-contain group-hover/logo:scale-102 transition-transform duration-300"
          referrerPolicy="no-referrer"
        />
        <div className="border-l border-gray-200 dark:border-zinc-800 pl-3 py-1 hidden sm:block">
          <p className="text-[10px] font-mono text-[#be1f24] dark:text-zinc-400 uppercase tracking-widest font-black leading-none">
            Media Space
          </p>
        </div>
      </div>

      {/* Main Search Bar */}
      <div className="relative flex-1 max-w-2xl w-full">
        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-gray-400">
          <Search className="w-4 h-4" />
        </div>
        <input
          id="main-search-input"
          type="text"
          placeholder="Search keywords, photographer, location, title, collection..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => {
            // Delay to allow suggestion click
            setTimeout(() => setIsFocused(false), 200);
          }}
          className="w-full pl-10 pr-12 py-2 bg-gray-50/50 dark:bg-zinc-900/40 border border-gray-200 dark:border-zinc-800 rounded-lg text-sm placeholder-gray-400 dark:placeholder-zinc-500 focus:outline-none focus:bg-white dark:focus:bg-zinc-950 focus:border-[#be1f24] focus:ring-1 focus:ring-[#be1f24] dark:text-zinc-100 transition-all"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-950 dark:hover:text-zinc-100 font-sans font-medium"
          >
            Clear
          </button>
        )}

        {/* Smart Suggestion Overlay */}
        {isFocused && suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1.5 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-lg border border-gray-200 dark:border-zinc-800 rounded-xl shadow-xl z-50 overflow-hidden py-1.5 animate-fade-in divide-y divide-gray-50 dark:divide-zinc-900 max-h-[300px] overflow-y-auto">
            <div className="px-3 py-1.5 text-[10px] font-mono font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider">
              Smart Matches
            </div>
            {suggestions.map((item, idx) => (
              <button
                key={idx}
                onMouseDown={(e) => {
                  e.preventDefault();
                  if (item.type === "keyword" && onSelectKeyword) {
                    onSelectKeyword(item.value);
                  } else if (item.type === "location" && onSelectLocation) {
                    onSelectLocation(item.value);
                  } else if (item.type === "photographer" && onSelectPhotographer) {
                    onSelectPhotographer(item.value);
                  } else if (item.type === "collection" && onSelectCollection) {
                    onSelectCollection(item.value);
                  }
                  setSearchQuery("");
                  setIsFocused(false);
                }}
                className="w-full text-left px-4 py-2 hover:bg-gray-50 dark:hover:bg-zinc-900 flex items-center justify-between text-xs transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2 text-gray-700 dark:text-zinc-300">
                  {item.type === "keyword" && <span className="text-[#be1f24] font-black">#</span>}
                  {item.type === "location" && <span className="text-gray-500">📍</span>}
                  {item.type === "photographer" && <span className="text-gray-500">📷</span>}
                  {item.type === "collection" && <span className="text-gray-500">📁</span>}
                  <span className="font-medium text-gray-800 dark:text-zinc-200">{item.value}</span>
                </div>
                <span className="text-[10px] uppercase tracking-wider font-mono text-gray-450 dark:text-zinc-500 font-bold bg-gray-100 dark:bg-zinc-900 px-2 py-0.5 rounded-full">
                  {item.type}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Actions: Upload, Admin Tools, Account Info, Sign Out */}
      <div className="flex items-center gap-3 w-full md:w-auto justify-end">
        
        {/* Home Button */}
        <button
          onClick={onGoHome}
          className="p-2.5 bg-white dark:bg-zinc-900 border border-gray-250 dark:border-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-800 rounded-lg transition-all cursor-pointer shadow-3xs text-gray-700 dark:text-zinc-200 flex items-center justify-center shrink-0"
          title="Go to Home"
        >
          <Home className="w-4 h-4 text-[#be1f24]" />
        </button>

        {/* Account Management Control Panel (Only for Admins) */}
        {isAdmin && (
          <button
            onClick={onAdminUsersClick}
            className="p-2.5 bg-white dark:bg-zinc-900 border border-gray-250 dark:border-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-800 rounded-lg transition-all cursor-pointer shadow-3xs text-gray-700 dark:text-zinc-200 flex items-center justify-center shrink-0"
            title="Manage user accounts, roles, and pending signups"
          >
            <Users className="w-4 h-4 text-[#be1f24]" />
          </button>
        )}

        {/* Upload Image Button (Creator / Admin / Owner Only) */}
        {canUpload ? (
          <button
            id="header-upload-btn"
            onClick={onUploadClick}
            className="p-2.5 bg-[#be1f24] hover:opacity-90 active:scale-95 text-white rounded-lg shadow-3xs transition-all cursor-pointer flex items-center justify-center shrink-0"
            title="Upload Image"
          >
            <Upload className="w-4 h-4" />
          </button>
        ) : (
          <span 
            className="p-2.5 text-gray-500 dark:text-zinc-400 bg-gray-100 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg flex items-center justify-center shrink-0 shadow-3xs select-none"
            title="Read-Only View-Only Access"
          >
            <Shield className="w-4 h-4 text-gray-400 dark:text-zinc-500" />
          </span>
        )}

        {/* Notification Bell Icon & Floating Center */}
        <div className="relative">
          <button
            onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
            className="p-2.5 bg-white dark:bg-zinc-900 border border-gray-250 dark:border-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-800 rounded-lg transition-all cursor-pointer shadow-3xs text-gray-700 dark:text-zinc-200 flex items-center justify-center shrink-0 relative"
            title="View alerts and notifications"
          >
            <Bell className="w-4 h-4 text-[#be1f24]" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-[#be1f24] text-white text-[9px] font-bold h-4 w-4 rounded-full flex items-center justify-center border-2 border-white dark:border-zinc-900 animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {isNotificationsOpen && (
            <div className="absolute right-0 mt-2 w-80 md:w-96 bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl shadow-lg z-50 overflow-hidden animate-fade-in text-left">
              <div className="p-3 bg-gray-50 dark:bg-zinc-900/60 border-b border-gray-150 dark:border-zinc-800 flex justify-between items-center">
                <span className="text-xs font-black uppercase text-gray-800 dark:text-zinc-200 tracking-wider flex items-center gap-1.5">
                  <Bell className="w-3.5 h-3.5 text-[#be1f24]" />
                  <span>Alerts ({unreadCount})</span>
                </span>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-[10px] font-black uppercase text-[#be1f24] hover:underline flex items-center gap-1"
                  >
                    <CheckCheck className="w-3 h-3" />
                    <span>Mark all read</span>
                  </button>
                )}
              </div>

              <div className="max-h-[320px] overflow-y-auto divide-y divide-gray-100 dark:divide-zinc-900">
                {!currentUser.notifications || currentUser.notifications.length === 0 ? (
                  <div className="p-8 text-center flex flex-col items-center justify-center text-gray-400 dark:text-zinc-500 gap-1.5">
                    <Bell className="w-6 h-6 text-gray-300 dark:text-zinc-700" />
                    <span className="text-[11px] font-bold text-gray-750 dark:text-zinc-300">All caught up!</span>
                    <p className="text-[10px] text-gray-400 dark:text-zinc-500">No recent notifications or actions needed.</p>
                  </div>
                ) : (
                  currentUser.notifications.map((notif) => {
                    let badgeLabel = "Alert";
                    let badgeColor = "bg-gray-100 text-gray-600 dark:bg-zinc-900 dark:text-zinc-400";
                    
                    const msgLower = notif.message.toLowerCase();
                    if (msgLower.includes("action needed") || msgLower.includes("pending")) {
                      badgeLabel = "Action Needed";
                      badgeColor = "bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400 border border-amber-100 dark:border-amber-950";
                    } else if (msgLower.includes("new image drop") || msgLower.includes("live")) {
                      badgeLabel = "New Drop";
                      badgeColor = "bg-sky-50 text-sky-700 dark:bg-sky-950/20 dark:text-sky-400 border border-sky-100 dark:border-sky-950";
                    } else if (msgLower.includes("approved")) {
                      badgeLabel = "Approved";
                      badgeColor = "bg-green-50 text-green-700 dark:bg-green-950/20 dark:text-green-400 border border-green-100 dark:border-green-950";
                    } else if (msgLower.includes("declined") || msgLower.includes("rejected")) {
                      badgeLabel = "Declined";
                      badgeColor = "bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400 border border-red-100 dark:border-red-950";
                    }

                    return (
                      <div
                        key={notif.id}
                        onClick={() => handleNotificationClick(notif)}
                        className={`p-3 text-xs text-left cursor-pointer transition-all flex flex-col gap-1 hover:bg-gray-50/80 dark:hover:bg-zinc-900/60 relative ${
                          notif.read ? "opacity-65" : "bg-neutral-50/40 dark:bg-zinc-900/10 font-medium"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            {!notif.read && (
                              <span className="w-1.5 h-1.5 rounded-full bg-[#be1f24] inline-block shrink-0 animate-pulse" />
                            )}
                            <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded tracking-wider ${badgeColor}`}>
                              {badgeLabel}
                            </span>
                          </div>
                          <span className="text-[9px] text-gray-400 dark:text-zinc-500 font-mono">
                            {new Date(notif.timestamp).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit"
                            })}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-700 dark:text-zinc-300 leading-normal mt-0.5">
                          {notif.message}
                        </p>
                        {notif.photoId && (
                          <div className="mt-1 flex items-center gap-1 text-[10px] text-[#be1f24] font-bold">
                            <Eye className="w-3 h-3" />
                            <span>Click to view photo details</span>
                          </div>
                        )}
                        {(msgLower.includes("registration") || msgLower.includes("download request")) && (
                          <div className="mt-1 flex items-center gap-1 text-[10px] text-[#be1f24] font-bold">
                            <Users className="w-3 h-3" />
                            <span>Click to open admin console</span>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Profile Card, Theme Switch, and Log Out */}
        <div className="flex items-center gap-3 border-l border-gray-200 dark:border-zinc-800 pl-3">
          <button
            onClick={onProfileClick}
            className="flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-zinc-900 p-1 rounded-lg transition-all text-left cursor-pointer border border-transparent hover:border-gray-150 dark:hover:border-zinc-800"
            title="View personal profile and notifications"
          >
            <img
              src={currentUser.avatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(currentUser.email)}`}
              alt={currentUser.name}
              className="w-8 h-8 rounded-full border border-gray-200 dark:border-zinc-800 shadow-3xs"
            />
            <div className="hidden lg:flex flex-col text-left">
              <span className="text-xs font-bold text-gray-950 dark:text-zinc-100 leading-none block max-w-[120px] truncate">
                {currentUser.name}
              </span>
              <span className="text-[9px] font-mono font-bold text-gray-450 dark:text-zinc-500 uppercase leading-none mt-1">
                {currentUser.role}
              </span>
            </div>
          </button>

          {/* Simulation mode selector (Only for owners/admins) */}
          {actualIsAdmin && (
            <button
              onClick={() => onViewAsModeChange?.(viewAsMode === "admin" ? "guest" : "admin")}
              className={`p-2.5 border rounded-lg transition-all cursor-pointer shadow-3xs flex items-center justify-center shrink-0 relative group ${
                viewAsMode === "admin"
                  ? "bg-red-50/50 hover:bg-red-50 dark:bg-red-950/20 dark:hover:bg-red-950/30 border-red-200 dark:border-red-900/40 text-[#be1f24] dark:text-red-400"
                  : "bg-gray-50/50 hover:bg-gray-100 dark:bg-zinc-950/50 dark:hover:bg-zinc-800 border-gray-250 dark:border-zinc-800 text-gray-500 dark:text-zinc-400"
              }`}
              title={viewAsMode === "admin" ? "Simulating Owner/Admin (Click to simulate Guest View)" : "Simulating Guest View (Click to restore Admin View)"}
              id="view-as-mode-switch"
            >
              {viewAsMode === "admin" ? (
                <Shield className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4 text-amber-500" />
              )}
              
              {/* Active status indicator dot */}
              <span className={`absolute top-1 right-1 w-1.5 h-1.5 rounded-full ${
                viewAsMode === "admin" ? "bg-emerald-500" : "bg-amber-500 animate-pulse"
              }`} />
            </button>
          )}

          {/* Dark Mode Switch - Placed to the right beside the profile icon */}
          <button
            onClick={onToggleDarkMode}
            className="p-2.5 bg-white dark:bg-zinc-900 border border-gray-250 dark:border-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-800 rounded-lg transition-all cursor-pointer shadow-3xs text-gray-700 dark:text-zinc-200 flex items-center justify-center shrink-0"
            title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {isDarkMode ? (
              <Sun className="w-4 h-4 text-amber-500 fill-amber-500/25" />
            ) : (
              <Moon className="w-4 h-4 text-slate-700" />
            )}
          </button>

          <button
            onClick={onSignOut}
            className="p-2 text-gray-400 hover:text-[#be1f24] dark:text-zinc-500 dark:hover:text-[#be1f24] hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg border border-transparent transition-all cursor-pointer flex items-center justify-center shrink-0"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>

      </div>
    </header>
  );
}
