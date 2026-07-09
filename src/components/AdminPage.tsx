import React, { useState, useEffect } from "react";
import { 
  Users, Search, CheckCircle, ShieldAlert, UserCheck, Trash2, Shield, 
  UserX, Key, Mail, Sparkles, RefreshCw, ArrowLeft, Clock, FileText, 
  Image, Check, X, ShieldCheck, User, Eye, Download, Camera, Settings, Linkedin
} from "lucide-react";
import { UserAccount, UserRole, UserStatus, Photographer, Photo } from "../types";
import { dialogService } from "../lib/dialog";

interface AdminPageProps {
  currentUser: UserAccount;
  photographers: Photographer[];
  onRefreshPhotographers: () => void;
  photos: Photo[];
  onApprovePhoto: (id: string) => Promise<void>;
  onDeletePhoto: (id: string) => Promise<void>;
  onBack: () => void;
  linkedInUrl?: string;
  embedCode?: string;
  onSaveLinkedInUrl?: (url: string, code: string) => Promise<boolean>;
}

interface ActionLog {
  id: string;
  userId: string;
  userEmail: string;
  action: "upload" | "delete" | "approve" | "new_cover";
  details: string;
  timestamp: string;
}

export default function AdminPage({
  currentUser,
  photographers = [],
  onRefreshPhotographers,
  photos = [],
  onApprovePhoto,
  onDeletePhoto,
  onBack,
  linkedInUrl = "",
  embedCode = "",
  onSaveLinkedInUrl
}: AdminPageProps) {
  // Navigation tabs inside Admin Panel
  // 1 = Accounts & Photographers, 2 = Action Logs, 3 = High-Res Requests, 4 = Photo Approvals, 5 = Settings
  const [activeTab, setActiveTab] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [accountsSubTab, setAccountsSubTab] = useState<"users" | "photographers" | "deleted">("users");

  // Safety correction for role-based tab access
  useEffect(() => {
    if (currentUser.role !== "super_admin" && (activeTab === 2 || activeTab === 5)) {
      setActiveTab(1);
    }
  }, [currentUser.role, activeTab]);

  const [adminLinkedInUrl, setAdminLinkedInUrl] = useState(linkedInUrl);
  const [adminEmbedCode, setAdminEmbedCode] = useState(embedCode);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  useEffect(() => {
    if (linkedInUrl) {
      setAdminLinkedInUrl(linkedInUrl);
    }
  }, [linkedInUrl]);

  useEffect(() => {
    if (embedCode !== undefined) {
      setAdminEmbedCode(embedCode);
    }
  }, [embedCode]);

  // State collections
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [actionLogs, setActionLogs] = useState<ActionLog[]>([]);
  const [highResRequests, setHighResRequests] = useState<any[]>([]);
  const [requestDurations, setRequestDurations] = useState<Record<string, number>>({});
  const [searchQuery, setSearchQuery] = useState("");
  
  // Loading & feedback states
  const [isLoading, setIsLoading] = useState(false);
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");

  // Photographer form state
  const [editingPhotographerId, setEditingPhotographerId] = useState<string | null>(null);
  const [isAddingPhotographer, setIsAddingPhotographer] = useState(false);
  const [phName, setPhName] = useState("");
  const [phAvatarUrl, setPhAvatarUrl] = useState("");
  const [phCoverUrl, setPhCoverUrl] = useState("");
  const [phBio, setPhBio] = useState("");

  // Data Fetching
  const fetchUsers = async () => {
    setIsLoading(true);
    setActionError("");
    try {
      const res = await fetch("/api/users");
      if (!res.ok) throw new Error("Failed to load user directory.");
      const data = await res.json();
      setUsers(data);
    } catch (err: any) {
      setActionError(err.message || "Could not retrieve user directory.");
    } finally {
      setIsLoading(false);
    }
  };

  const [deletedLogs, setDeletedLogs] = useState<UserAccount[]>([]);
  const fetchDeletedLogs = async () => {
    try {
      const res = await fetch("/api/users/deleted-logs");
      if (res.ok) {
        const data = await res.json();
        setDeletedLogs(data);
      }
    } catch (e) {
      console.error("Error fetching deleted logs:", e);
    }
  };

  const fetchActionLogs = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/action-logs");
      if (res.ok) {
        const data = await res.json();
        setActionLogs(data);
      }
    } catch (e) {
      console.error("Error fetching action logs:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchHighResRequests = async () => {
    try {
      const res = await fetch("/api/requests/fullres");
      if (res.ok) {
        const data = await res.json();
        setHighResRequests(data);
      }
    } catch (e) {
      console.error("Error fetching high-res requests:", e);
    }
  };

  // Initial load & Tab switching fetch
  useEffect(() => {
    if (activeTab === 1) {
      fetchUsers();
      fetchDeletedLogs();
    } else if (activeTab === 2) {
      fetchActionLogs();
    } else if (activeTab === 3) {
      fetchHighResRequests();
    }
  }, [activeTab]);

  // Helper trigger to refresh active data
  const handleRefreshData = () => {
    if (activeTab === 1) {
      fetchUsers();
      fetchDeletedLogs();
      onRefreshPhotographers();
    } else if (activeTab === 2) {
      fetchActionLogs();
    } else if (activeTab === 3) {
      fetchHighResRequests();
    }
  };

  // Action Handlers
  const handleUpdateStatus = async (userId: string, status: UserStatus) => {
    setActionError("");
    setActionSuccess("");
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed to update user status.");
      const data = await res.json();
      
      setUsers(prev => prev.map(u => u.id === userId ? data.user : u));
      setActionSuccess(`Successfully updated account status to ${status}.`);
      setTimeout(() => setActionSuccess(""), 3000);
    } catch (err: any) {
      setActionError(err.message || "Failed to update user status.");
    }
  };

  const handleUpdateRole = async (userId: string, role: UserRole) => {
    setActionError("");
    setActionSuccess("");
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (!res.ok) throw new Error("Failed to update user role.");
      const data = await res.json();
      
      setUsers(prev => prev.map(u => u.id === userId ? data.user : u));
      setActionSuccess(`Successfully updated role to ${role}.`);
      setTimeout(() => setActionSuccess(""), 3000);
    } catch (err: any) {
      setActionError(err.message || "Failed to update user role.");
    }
  };

  const handleTogglePhotographer = async (userId: string, currentIsPhotographer: boolean) => {
    setActionError("");
    setActionSuccess("");
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPhotographer: !currentIsPhotographer }),
      });
      if (!res.ok) throw new Error("Failed to update photographer status.");
      const data = await res.json();
      
      setUsers(prev => prev.map(u => u.id === userId ? data.user : u));
      onRefreshPhotographers(); // Refresh parent lists
      setActionSuccess(`Successfully ${!currentIsPhotographer ? "promoted user to" : "removed user as"} photographer.`);
      setTimeout(() => setActionSuccess(""), 3000);
    } catch (err: any) {
      setActionError(err.message || "Failed to update photographer status.");
    }
  };

  const handleDeleteUser = async (userId: string, userEmail: string) => {
    if (userId === currentUser.id) {
      setActionError("You cannot delete your own administrator account.");
      return;
    }

    const confirmed = await dialogService.confirm(
      `Are you sure you want to delete user account: ${userEmail}?`,
      {
        title: "Delete User Account",
        variant: "danger",
        confirmText: "Delete Account",
      }
    );
    if (!confirmed) return;

    setActionError("");
    setActionSuccess("");
    try {
      const res = await fetch(`/api/users/${userId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete user");
      
      setUsers(prev => prev.filter(u => u.id !== userId));
      setActionSuccess("User account soft-deleted. Logged successfully.");
      fetchDeletedLogs();
      setTimeout(() => setActionSuccess(""), 3000);
    } catch (err: any) {
      setActionError(err.message || "Failed to delete user account.");
    }
  };

  // High-Res Downloads Handlers
  const handleApproveRequest = async (id: string, durationHours: number = 6) => {
    setActionError("");
    setActionSuccess("");
    try {
      const res = await fetch(`/api/requests/fullres/${id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ durationHours })
      });
      if (!res.ok) throw new Error("Failed to approve request.");
      setActionSuccess(`High-resolution download request approved for ${durationHours} hours.`);
      fetchHighResRequests();
      setTimeout(() => setActionSuccess(""), 3000);
    } catch (err: any) {
      setActionError(err.message || "Failed to approve request.");
    }
  };

  const handleRejectRequest = async (id: string) => {
    setActionError("");
    setActionSuccess("");
    try {
      const res = await fetch(`/api/requests/fullres/${id}/reject`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to reject request.");
      setActionSuccess("High-resolution download request rejected.");
      fetchHighResRequests();
      setTimeout(() => setActionSuccess(""), 3000);
    } catch (err: any) {
      setActionError(err.message || "Failed to reject request.");
    }
  };

  // Photographer Database Handlers
  const handleAddPhotographer = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError("");
    setActionSuccess("");
    if (!phName || !phAvatarUrl || !phCoverUrl || !phBio) {
      setActionError("All photographer profile fields are required.");
      return;
    }
    try {
      const res = await fetch("/api/photographers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: phName, avatarUrl: phAvatarUrl, coverUrl: phCoverUrl, bio: phBio }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create photographer profile.");
      setActionSuccess("Photographer profile created successfully.");
      setPhName("");
      setPhAvatarUrl("");
      setPhCoverUrl("");
      setPhBio("");
      setIsAddingPhotographer(false);
      onRefreshPhotographers();
      setTimeout(() => setActionSuccess(""), 3000);
    } catch (err: any) {
      setActionError(err.message);
    }
  };

  const handleEditPhotographer = (ph: Photographer) => {
    setEditingPhotographerId(ph.id);
    setPhName(ph.name);
    setPhAvatarUrl(ph.avatarUrl);
    setPhCoverUrl(ph.coverUrl);
    setPhBio(ph.bio);
  };

  const handleUpdatePhotographer = async (id: string) => {
    setActionError("");
    setActionSuccess("");
    try {
      const res = await fetch(`/api/photographers/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: phName, avatarUrl: phAvatarUrl, coverUrl: phCoverUrl, bio: phBio }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update photographer profile.");
      setActionSuccess("Photographer profile updated successfully.");
      setEditingPhotographerId(null);
      setPhName("");
      setPhAvatarUrl("");
      setPhCoverUrl("");
      setPhBio("");
      onRefreshPhotographers();
      setTimeout(() => setActionSuccess(""), 3000);
    } catch (err: any) {
      setActionError(err.message);
    }
  };

  const handleApprovePhotographer = async (id: string) => {
    setActionError("");
    setActionSuccess("");
    try {
      const res = await fetch(`/api/photographers/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "Approved" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to approve photographer profile.");
      setActionSuccess("Photographer request approved successfully.");
      onRefreshPhotographers();
      setTimeout(() => setActionSuccess(""), 3000);
    } catch (err: any) {
      setActionError(err.message);
    }
  };

  const handleDeletePhotographer = async (id: string, name: string) => {
    const confirmed = await dialogService.confirm(
      `Are you sure you want to delete photographer profile "${name}"? Linked photos will not be deleted, but the profile reference will be removed.`,
      {
        title: "Delete Photographer Profile",
        variant: "danger",
        confirmText: "Delete Profile",
      }
    );
    if (!confirmed) return;

    setActionError("");
    setActionSuccess("");
    try {
      const res = await fetch(`/api/photographers/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete photographer profile.");
      setActionSuccess("Photographer profile deleted successfully.");
      onRefreshPhotographers();
      setTimeout(() => setActionSuccess(""), 3000);
    } catch (err: any) {
      setActionError(err.message);
    }
  };

  // Photo Approvals Handlers
  const handleApprovePhotoAction = async (id: string) => {
    try {
      await onApprovePhoto(id);
      setActionSuccess("Photo approved and published successfully!");
      setTimeout(() => setActionSuccess(""), 3000);
    } catch (err: any) {
      setActionError("Failed to approve photo.");
    }
  };

  const handleDeletePhotoAction = async (id: string) => {
    const confirmed = await dialogService.confirm(
      "Are you sure you want to reject and permanently delete this pending submission?",
      {
        title: "Reject Pending Photo",
        variant: "danger",
        confirmText: "Reject & Delete"
      }
    );
    if (!confirmed) return;

    try {
      await onDeletePhoto(id);
      setActionSuccess("Pending photo rejected and deleted.");
      setTimeout(() => setActionSuccess(""), 3000);
    } catch (err: any) {
      setActionError("Failed to reject and delete photo.");
    }
  };

  // Filters for lists based on active tab & query
  const query = searchQuery.toLowerCase().trim();

  const filteredUsersList = users.filter(u => 
    u.name.toLowerCase().includes(query) || 
    u.email.toLowerCase().includes(query) || 
    u.role.toLowerCase().includes(query) || 
    u.status.toLowerCase().includes(query)
  );

  const filteredPhotographersList = photographers.filter(p => 
    p.name.toLowerCase().includes(query) || 
    p.bio.toLowerCase().includes(query)
  );

  const filteredDeletedLogs = deletedLogs.filter(d => 
    d.name.toLowerCase().includes(query) || 
    d.email.toLowerCase().includes(query)
  );

  const filteredActionLogs = actionLogs.filter(l => 
    l.userEmail.toLowerCase().includes(query) || 
    l.action.toLowerCase().includes(query) || 
    l.details.toLowerCase().includes(query)
  );

  const filteredRequests = highResRequests.filter(r => 
    r.userEmail.toLowerCase().includes(query) || 
    r.photoTitle.toLowerCase().includes(query) || 
    r.purpose.toLowerCase().includes(query)
  );

  const pendingPhotos = photos.filter(p => p.status === "Pending");
  const filteredPendingPhotos = pendingPhotos.filter(p => 
    p.title.toLowerCase().includes(query) || 
    p.photographer.toLowerCase().includes(query) || 
    p.uploadedBy?.toLowerCase().includes(query)
  );

  return (
    <div className="w-full min-h-screen bg-gray-50 dark:bg-zinc-950 text-gray-800 dark:text-zinc-100 flex flex-col font-sans animate-fade-in" id="admin-panel-container">
      {/* Header Panel */}
      <header className="bg-white dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="p-2 bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 rounded-lg text-gray-600 dark:text-zinc-300 transition-all cursor-pointer flex items-center justify-center"
              title="Return to Catalog"
              id="admin-back-btn"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Shield className="w-4 h-4 text-[#be1f24]" />
                Administrative Control Center
              </h1>
              <p className="text-[10px] text-gray-500 dark:text-zinc-400 font-medium">
                Manage accounts, role policies, photographer archives, and system operations.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefreshData}
              className="p-2 text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 transition-all cursor-pointer flex items-center gap-1 text-[11px] font-bold"
              title="Refresh Data"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>
            <button
              onClick={onBack}
              className="px-3.5 py-1.5 text-xs font-bold text-white bg-zinc-900 dark:bg-zinc-800 hover:bg-zinc-800 dark:hover:bg-zinc-700 rounded-lg shadow-sm transition-all cursor-pointer"
            >
              Back to Archive
            </button>
          </div>
        </div>
      </header>

      {/* Main Panel Content Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 flex flex-col md:flex-row gap-8 w-full">
        {/* Navigation Sidebar Panel */}
        <aside className="w-full md:w-64 shrink-0 flex flex-col gap-2">
          <h2 className="text-[10px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-widest px-3 mb-2">Primary Tabs</h2>
          
          <button
            onClick={() => { setActiveTab(1); setSearchQuery(""); }}
            className={`w-full text-left px-4 py-3 text-xs font-bold rounded-xl transition-all flex items-center justify-between cursor-pointer ${
              activeTab === 1 
                ? "bg-[#be1f24] text-white shadow-md shadow-red-900/10" 
                : "bg-white dark:bg-zinc-900 hover:bg-gray-100 dark:hover:bg-zinc-850 border border-gray-200/60 dark:border-zinc-800/80 text-gray-700 dark:text-zinc-300"
            }`}
            id="tab-accounts-btn"
          >
            <div className="flex items-center gap-2.5">
              <Users className="w-4 h-4" />
              <span>Accounts & Photographers</span>
            </div>
          </button>

          {currentUser.role === "super_admin" && (
            <button
              onClick={() => { setActiveTab(2); setSearchQuery(""); }}
              className={`w-full text-left px-4 py-3 text-xs font-bold rounded-xl transition-all flex items-center justify-between cursor-pointer ${
                activeTab === 2 
                  ? "bg-[#be1f24] text-white shadow-md shadow-red-900/10" 
                  : "bg-white dark:bg-zinc-900 hover:bg-gray-100 dark:hover:bg-zinc-850 border border-gray-200/60 dark:border-zinc-800/80 text-gray-700 dark:text-zinc-300"
              }`}
              id="tab-logs-btn"
            >
              <div className="flex items-center gap-2.5">
                <FileText className="w-4 h-4" />
                <span>Action Logs</span>
              </div>
            </button>
          )}

          <button
            onClick={() => { setActiveTab(3); setSearchQuery(""); }}
            className={`w-full text-left px-4 py-3 text-xs font-bold rounded-xl transition-all flex items-center justify-between cursor-pointer ${
              activeTab === 3 
                ? "bg-[#be1f24] text-white shadow-md shadow-red-900/10" 
                : "bg-white dark:bg-zinc-900 hover:bg-gray-100 dark:hover:bg-zinc-850 border border-gray-200/60 dark:border-zinc-800/80 text-gray-700 dark:text-zinc-300"
            }`}
            id="tab-requests-btn"
          >
            <div className="flex items-center gap-2.5">
              <Download className="w-4 h-4" />
              <span>High-Res Requests</span>
            </div>
            {highResRequests.filter(r => r.status === "Pending").length > 0 && (
              <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full animate-pulse ${activeTab === 3 ? "bg-white text-red-600" : "bg-red-500 text-white"}`}>
                {highResRequests.filter(r => r.status === "Pending").length}
              </span>
            )}
          </button>

          <button
            onClick={() => { setActiveTab(4); setSearchQuery(""); }}
            className={`w-full text-left px-4 py-3 text-xs font-bold rounded-xl transition-all flex items-center justify-between cursor-pointer ${
              activeTab === 4 
                ? "bg-[#be1f24] text-white shadow-md shadow-red-900/10" 
                : "bg-white dark:bg-zinc-900 hover:bg-gray-100 dark:hover:bg-zinc-850 border border-gray-200/60 dark:border-zinc-800/80 text-gray-700 dark:text-zinc-300"
            }`}
            id="tab-approvals-btn"
          >
            <div className="flex items-center gap-2.5">
              <Image className="w-4 h-4" />
              <span>Photo Approvals</span>
            </div>
            {pendingPhotos.length > 0 && (
              <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full animate-pulse ${activeTab === 4 ? "bg-white text-red-600" : "bg-[#be1f24] text-white"}`}>
                {pendingPhotos.length}
              </span>
            )}
          </button>

          {currentUser.role === "super_admin" && (
            <button
              onClick={() => { setActiveTab(5); setSearchQuery(""); }}
              className={`w-full text-left px-4 py-3 text-xs font-bold rounded-xl transition-all flex items-center justify-between cursor-pointer ${
                activeTab === 5 
                  ? "bg-[#be1f24] text-white shadow-md shadow-red-900/10" 
                  : "bg-white dark:bg-zinc-900 hover:bg-gray-100 dark:hover:bg-zinc-850 border border-gray-200/60 dark:border-zinc-800/80 text-gray-700 dark:text-zinc-300"
              }`}
              id="tab-settings-btn"
            >
              <div className="flex items-center gap-2.5">
                <Settings className="w-4 h-4" />
                <span>App Settings</span>
              </div>
            </button>
          )}

          <div className="mt-6 p-4 bg-gray-100 dark:bg-zinc-900 border border-gray-200/60 dark:border-zinc-800/65 rounded-2xl flex flex-col gap-2.5">
            <h3 className="text-[9px] font-black text-gray-500 dark:text-zinc-400 uppercase tracking-wider">Your Identity</h3>
            <div className="flex items-center gap-2.5">
              <img 
                src={currentUser.avatarUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80"} 
                className="w-7 h-7 rounded-full object-cover border border-gray-200 dark:border-zinc-700" 
                alt="Me"
              />
              <div className="truncate">
                <p className="text-[11px] font-black text-gray-800 dark:text-zinc-200 truncate">{currentUser.name}</p>
                <p className="text-[9px] text-[#be1f24] font-bold uppercase tracking-wider">{currentUser.role}</p>
              </div>
            </div>
          </div>
        </aside>

        {/* Dynamic Display Panel */}
        <main className="flex-1 bg-white dark:bg-zinc-900 border border-gray-200/80 dark:border-zinc-850/90 rounded-2xl flex flex-col overflow-hidden shadow-2xs">
          
          {/* Internal Banner for alerts */}
          {actionError && (
            <div className="bg-red-50 dark:bg-red-950/40 border-b border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 text-xs py-3 px-6 font-semibold flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{actionError}</span>
            </div>
          )}

          {actionSuccess && (
            <div className="bg-emerald-50 dark:bg-emerald-950/40 border-b border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-xs py-3 px-6 font-semibold flex items-center gap-2">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>{actionSuccess}</span>
            </div>
          )}

          {/* Search Header for active list */}
          <div className="px-6 py-4 border-b border-gray-100 dark:border-zinc-850/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3.5 top-3 w-4 h-4 text-gray-400 dark:text-zinc-500" />
                <input
                  type="text"
                  placeholder={
                    activeTab === 1
                      ? accountsSubTab === "photographers"
                        ? "Search photographers by name or bio..."
                        : accountsSubTab === "deleted"
                          ? "Search soft-deleted account logs..."
                          : "Search active user accounts by name, email, role..."
                      : activeTab === 2
                        ? "Search action logs by user, action, details..."
                        : activeTab === 3
                          ? "Search high-res requests by title, email, reason..."
                          : "Search pending photos by title, photographer, uploader..."
                  }
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-xs bg-gray-50 dark:bg-zinc-950/80 border border-gray-200 dark:border-zinc-800 text-gray-800 dark:text-zinc-100 rounded-xl focus:outline-none focus:bg-white dark:focus:bg-zinc-950 focus:border-[#be1f24] transition-all"
                />
              </div>
            </div>
            
            {/* Sub-tabs for Accounts & Photographers */}
            {activeTab === 1 && (
              <div className="flex items-center gap-1.5 p-1 bg-gray-50 dark:bg-zinc-950/80 border border-gray-200/50 dark:border-zinc-800/80 rounded-xl shrink-0 self-start sm:self-auto">
                <button
                  onClick={() => { setAccountsSubTab("users"); setSearchQuery(""); }}
                  className={`px-3 py-1.5 text-[10px] font-black rounded-lg uppercase tracking-wider cursor-pointer transition-all ${
                    accountsSubTab === "users"
                      ? "bg-white dark:bg-zinc-800 text-gray-900 dark:text-white shadow-3xs border border-gray-100 dark:border-zinc-700/55"
                      : "text-gray-500 dark:text-zinc-400 hover:text-gray-900"
                  }`}
                >
                  Active Users
                </button>
                <button
                  onClick={() => { setAccountsSubTab("photographers"); setSearchQuery(""); }}
                  className={`px-3 py-1.5 text-[10px] font-black rounded-lg uppercase tracking-wider cursor-pointer transition-all ${
                    accountsSubTab === "photographers"
                      ? "bg-white dark:bg-zinc-800 text-gray-900 dark:text-white shadow-3xs border border-gray-100 dark:border-zinc-700/55"
                      : "text-gray-500 dark:text-zinc-400 hover:text-gray-900"
                  }`}
                >
                  Photographers ({photographers.length})
                </button>
                {currentUser.role === "super_admin" && (
                  <button
                    onClick={() => { setAccountsSubTab("deleted"); setSearchQuery(""); }}
                    className={`px-3 py-1.5 text-[10px] font-black rounded-lg uppercase tracking-wider cursor-pointer transition-all ${
                      accountsSubTab === "deleted"
                        ? "bg-white dark:bg-zinc-800 text-gray-900 dark:text-white shadow-3xs border border-gray-100 dark:border-zinc-700/55"
                        : "text-gray-500 dark:text-zinc-400 hover:text-gray-900"
                    }`}
                  >
                    Archive
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Active Tab Screen Area */}
          <div className="flex-1 overflow-y-auto p-6 min-h-[400px]">
            {isLoading ? (
              <div className="h-64 flex flex-col items-center justify-center gap-3">
                <RefreshCw className="w-6 h-6 text-[#be1f24] animate-spin" />
                <span className="text-xs text-gray-500 dark:text-zinc-400 font-bold">Synchronizing archive catalog states...</span>
              </div>
            ) : activeTab === 1 ? (
              /* TAB 1: ACCOUNTS & PHOTOGRAPHERS */
              accountsSubTab === "users" ? (
                /* USER ACCOUNTS TABLE */
                <div className="flex flex-col gap-4">
                  <div className="flex justify-between items-center bg-gray-50/65 dark:bg-zinc-950/40 p-4 rounded-xl border border-gray-200/60 dark:border-zinc-800/80">
                    <div>
                      <h3 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider">User Directory Management</h3>
                      <p className="text-[10px] text-gray-500 dark:text-zinc-400 mt-0.5">Approved users are authorized to browse, request, or curate digital catalog files.</p>
                    </div>
                  </div>

                  <div className="border border-gray-100 dark:border-zinc-850/80 rounded-xl overflow-hidden">
                    <table className="w-full border-collapse text-left text-xs">
                      <thead>
                        <tr className="bg-gray-50/70 dark:bg-zinc-950/40 border-b border-gray-100 dark:border-zinc-850/80 text-[10px] uppercase font-black text-gray-500 dark:text-zinc-400 tracking-wider">
                          <th className="py-3 px-4">User Info</th>
                          <th className="py-3 px-4">Joined Date</th>
                          <th className="py-3 px-4">Current Status</th>
                          <th className="py-3 px-4">Workspace Role</th>
                          <th className="py-3 px-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-zinc-850/80 font-medium">
                        {filteredUsersList.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-8 text-center text-gray-400 dark:text-zinc-500 font-semibold">
                              No matching user accounts found.
                            </td>
                          </tr>
                        ) : (
                          filteredUsersList.map((u) => (
                            <tr key={u.id} className="hover:bg-gray-50/40 dark:hover:bg-zinc-850/20">
                              <td className="py-3 px-4 flex items-center gap-3">
                                <img 
                                  src={u.avatarUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80"} 
                                  className="w-8 h-8 rounded-full object-cover border border-gray-200/65 dark:border-zinc-700/65" 
                                  alt=""
                                />
                                <div className="truncate max-w-[180px]">
                                  <div className="flex items-center gap-1.5">
                                    <p className="font-extrabold text-gray-900 dark:text-white truncate">{u.name}</p>
                                    {u.isPhotographer && (
                                      <span className="inline-flex items-center px-1 py-0.5 rounded bg-red-50 dark:bg-red-950/30 text-[8px] font-black uppercase text-[#be1f24] dark:text-red-400 border border-red-100 dark:border-red-900/30 tracking-wider">
                                        📷 Photographer
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[10px] text-gray-400 dark:text-zinc-500 truncate">{u.email}</p>
                                </div>
                              </td>
                              <td className="py-3 px-4 text-gray-500 dark:text-zinc-400 font-mono text-[11px]">
                                {u.createdAt || "N/A"}
                              </td>
                              <td className="py-3 px-4">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                  u.status === "Approved" 
                                    ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-800/40" 
                                    : u.status === "Pending"
                                      ? "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-200/50 dark:border-amber-800/40"
                                      : "bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 border border-red-200/50 dark:border-red-800/40"
                                }`}>
                                  {u.status}
                                </span>
                              </td>
                              <td className="py-3 px-4">
                                <span className="font-bold text-gray-700 dark:text-zinc-300 font-mono capitalize">
                                  {u.role}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  {u.status !== "Approved" && (
                                    <button
                                      onClick={() => handleUpdateStatus(u.id, "Approved")}
                                      className="p-1.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-lg hover:opacity-90 cursor-pointer"
                                      title="Approve User"
                                    >
                                      <UserCheck className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                  {u.status !== "Rejected" && u.id !== currentUser.id && (
                                    <button
                                      onClick={() => handleUpdateStatus(u.id, "Rejected")}
                                      className="p-1.5 bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 rounded-lg hover:opacity-90 cursor-pointer"
                                      title="Suspend/Reject User"
                                    >
                                      <UserX className="w-3.5 h-3.5" />
                                    </button>
                                  )}

                                  {/* Promote / toggle photographer badge */}
                                  <button
                                    onClick={() => handleTogglePhotographer(u.id, !!u.isPhotographer)}
                                    className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                                      u.isPhotographer 
                                        ? "bg-red-50 dark:bg-red-950/40 text-[#be1f24] dark:text-red-400 border border-red-200/50 dark:border-red-900/40" 
                                        : "bg-gray-50 dark:bg-zinc-900 text-gray-400 hover:text-gray-600 dark:hover:text-zinc-300 border border-gray-200 dark:border-zinc-800"
                                    }`}
                                    title={u.isPhotographer ? "Remove Photographer Badge" : "Mark as Photographer"}
                                  >
                                    <Camera className="w-3.5 h-3.5" />
                                  </button>
                                  
                                  {/* Role changer dropdown */}
                                  <select
                                    value={u.role}
                                    onChange={(e) => handleUpdateRole(u.id, e.target.value as UserRole)}
                                    className="text-[10px] font-black bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-lg py-1 px-2 focus:outline-none focus:border-[#be1f24] cursor-pointer"
                                    title="Modify Role Policy"
                                    disabled={
                                      u.id === currentUser.id ||
                                      (currentUser.role === "archive_manager" && (u.role === "super_admin" || u.role === "archive_manager"))
                                    }
                                  >
                                    {currentUser.role === "super_admin" ? (
                                      <>
                                        <option value="super_admin">super_admin</option>
                                        <option value="archive_manager">archive_manager</option>
                                        <option value="photographer">photographer</option>
                                        <option value="internal_member">internal_member</option>
                                        <option value="external_user">external_user</option>
                                      </>
                                    ) : (
                                      <>
                                        {u.role !== "photographer" && u.role !== "internal_member" && (
                                          <option value={u.role}>{u.role}</option>
                                        )}
                                        <option value="photographer">photographer</option>
                                        <option value="internal_member">internal_member</option>
                                      </>
                                    )}
                                  </select>

                                  {currentUser.role === "super_admin" && (
                                    <button
                                      onClick={() => handleDeleteUser(u.id, u.email)}
                                      disabled={u.id === currentUser.id}
                                      className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg disabled:opacity-30 cursor-pointer"
                                      title="Delete Account Profile"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : accountsSubTab === "photographers" ? (
                /* PHOTOGRAPHERS PROFILE TAB */
                <div className="flex flex-col gap-6 font-sans">
                  <div className="flex justify-between items-center bg-gray-50/65 dark:bg-zinc-950/40 p-4 rounded-xl border border-gray-200/60 dark:border-zinc-800/80">
                    <div>
                      <h3 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider">Registered Photographers Database</h3>
                      <p className="text-[10px] text-gray-500 dark:text-zinc-400 mt-0.5">Every photo in the system must be cataloged under one of these verified photographer identities.</p>
                    </div>
                    {!isAddingPhotographer && (
                      <button
                        onClick={() => {
                          setIsAddingPhotographer(true);
                          setPhName("");
                          setPhBio("");
                        }}
                        className="bg-[#be1f24] hover:bg-[#a81a1e] text-white text-[10px] font-black px-3.5 py-1.5 rounded-lg shadow-3xs transition-all uppercase tracking-wider cursor-pointer flex items-center gap-1"
                      >
                        <Camera className="w-3.5 h-3.5" />
                        Add Photographer
                      </button>
                    )}
                  </div>

                  {/* Simplified Add Photographer Form */}
                  {isAddingPhotographer && (
                    <form 
                      onSubmit={(e) => {
                        e.preventDefault();
                        const normalizeName = (name: string): string => {
                          return name.trim().toLowerCase().replace(/[\s\-_.]+/g, " ");
                        };

                        const normNew = normalizeName(phName);

                        // Check duplicates
                        const exists = photographers.some(p => normalizeName(p.name) === normNew);
                        if (exists) {
                          setActionError(`"${phName}" is already registered as a photographer (duplicate check sensitive to FARES BADAWI / Fares_Badawi etc.).`);
                          return;
                        }

                        const doAdd = async () => {
                          try {
                            const res = await fetch("/api/photographers", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ 
                                name: phName.trim(),
                                bio: phBio.trim() || "Verified photographer identity."
                              }),
                            });
                            const data = await res.json();
                            if (!res.ok) throw new Error(data.error || "Failed to add photographer.");
                            
                            setActionSuccess(`Photographer "${phName.trim()}" successfully registered!`);
                            setPhName("");
                            setPhBio("");
                            setIsAddingPhotographer(false);
                            onRefreshPhotographers();
                            setTimeout(() => setActionSuccess(""), 3000);
                          } catch (err: any) {
                            setActionError(err.message || "Failed to add photographer.");
                          }
                        };
                        doAdd();
                      }}
                      className="bg-gray-50/50 dark:bg-zinc-900/30 border border-gray-250 dark:border-zinc-800 rounded-xl p-5 flex flex-col gap-4"
                    >
                      <div className="flex justify-between items-center">
                        <h4 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider">
                          Register Photographer Profile
                        </h4>
                        <button
                          type="button"
                          onClick={() => {
                            setIsAddingPhotographer(false);
                            setPhName("");
                            setPhBio("");
                          }}
                          className="text-gray-400 hover:text-gray-600 dark:hover:text-white"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-[9px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-wider">Photographer Name</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Fares Badawi"
                          value={phName}
                          onChange={(e) => setPhName(e.target.value)}
                          className="bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-850 rounded-lg p-2.5 text-xs focus:outline-none focus:border-[#be1f24]"
                        />
                        <p className="text-[10px] text-gray-400 dark:text-zinc-500 mt-1">
                          The system enforces strict, insensitive duplicate checks so variations like Fares Badawi, FARES BADAWI, or Fares_Badawi are kept clean and unique.
                        </p>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-[9px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-wider">Biography & Field Focus</label>
                        <textarea
                          placeholder="Describe their role, local coverages or participating programs..."
                          value={phBio}
                          onChange={(e) => setPhBio(e.target.value)}
                          rows={3}
                          className="bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-850 rounded-lg p-2.5 text-xs focus:outline-none focus:border-[#be1f24] resize-none"
                        />
                      </div>

                      <div className="flex justify-end gap-2.5 mt-2">
                        <button
                          type="button"
                          onClick={() => {
                            setIsAddingPhotographer(false);
                            setPhName("");
                            setPhBio("");
                          }}
                          className="px-3.5 py-1.5 border border-gray-250 dark:border-zinc-800 hover:bg-gray-100 dark:hover:bg-zinc-800 text-xs font-bold rounded-lg transition-all"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="px-4 py-1.5 bg-[#be1f24] text-white text-xs font-black rounded-lg transition-all uppercase tracking-wider"
                        >
                          Register Photographer
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Photographers Profiles Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {filteredPhotographersList.length === 0 ? (
                      <div className="col-span-2 py-8 text-center text-gray-400 dark:text-zinc-500 font-bold">
                        No photographers matched your search query.
                      </div>
                    ) : (
                      filteredPhotographersList.map((ph: any) => (
                        <div key={ph.id} className="border border-gray-250 dark:border-zinc-850 rounded-2xl overflow-hidden bg-white dark:bg-zinc-950 flex flex-col hover:border-gray-300 dark:hover:border-zinc-800 transition-all">
                          {/* Banner background */}
                          <div className="h-16 bg-cover bg-center relative" style={{ backgroundImage: `url(${ph.coverUrl})` }}>
                            <div className="absolute inset-0 bg-black/40" />
                          </div>
                          
                          {/* Body details */}
                          <div className="p-4 flex-1 flex flex-col relative pt-8">
                            {/* Floating avatar */}
                            <img 
                              src={ph.avatarUrl} 
                              className="w-10 h-10 rounded-full border-2 border-white dark:border-zinc-950 absolute -top-5 left-4 object-cover" 
                              alt=""
                            />

                            <div className="flex justify-between items-start gap-2 mb-2">
                              <div>
                                <h4 className="font-extrabold text-gray-900 dark:text-white text-sm">{ph.name}</h4>
                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                  <span className={`inline-flex px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                                    ph.status === "Approved"
                                      ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 border border-emerald-100 dark:border-emerald-900/10"
                                      : "bg-amber-50 dark:bg-amber-950/20 text-amber-600 border border-amber-100 dark:border-amber-900/10"
                                  }`}>
                                    {ph.status || "Approved"}
                                  </span>

                                  {ph.isUserAccount ? (
                                    <span className="inline-flex px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-sky-50 dark:bg-sky-950/20 text-sky-600 border border-sky-100 dark:border-sky-900/10">
                                      👤 Promoted User
                                    </span>
                                  ) : (
                                    <span className="inline-flex px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-zinc-50 dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 border border-zinc-150 dark:border-zinc-800">
                                      🎫 Registered Identity
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                {ph.status !== "Approved" && (
                                  <button
                                    onClick={() => handleApprovePhotographer(ph.id)}
                                    className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-all cursor-pointer flex items-center justify-center"
                                    title="Approve Photographer"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                <button
                                  onClick={() => handleDeletePhotographer(ph.id, ph.name)}
                                  className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-all cursor-pointer flex items-center justify-center"
                                  title={ph.isUserAccount ? "Remove Photographer Badge" : "Delete Photographer Identity"}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                            {ph.bio && (
                              <p className="text-[11px] text-gray-600 dark:text-zinc-400 mt-2 line-clamp-2 leading-normal">
                                {ph.bio}
                              </p>
                            )}

                            <p className="text-[10px] text-gray-400 dark:text-zinc-500 mt-auto pt-2 font-mono">
                              ID: {ph.id}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ) : (
                /* TAB 1 SUB-TAB: DELETION ARCHIVE (SOFT-DELETED USER ACCOUNTS) */
                <div className="flex flex-col gap-4 font-sans">
                  <div className="bg-red-50/20 dark:bg-red-950/10 border border-red-200/50 dark:border-red-900/30 p-4 rounded-xl">
                    <h3 className="text-xs font-black text-red-700 dark:text-red-400 uppercase tracking-wider flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4" />
                      Administrator Soft Deletion Log
                    </h3>
                    <p className="text-[10px] text-gray-500 dark:text-zinc-400 mt-1">
                      This log represents all permanently deactivated or removed user account profiles, retained securely for verification.
                    </p>
                  </div>

                  <div className="border border-gray-100 dark:border-zinc-850/80 rounded-xl overflow-hidden bg-white dark:bg-zinc-950">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-gray-50 dark:bg-zinc-900/60 text-gray-500 dark:text-zinc-400 text-[10px] uppercase font-black tracking-wider border-b border-gray-100 dark:border-zinc-850/80">
                          <th className="py-3 px-4">Profile Name</th>
                          <th className="py-3 px-4">Email Address</th>
                          <th className="py-3 px-4">Historical Role</th>
                          <th className="py-3 px-4 text-right">Archived Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-zinc-850/80 font-mono text-[11px]">
                        {filteredDeletedLogs.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="py-8 text-center text-gray-400 dark:text-zinc-500 font-sans font-semibold">
                              No archived user accounts found.
                            </td>
                          </tr>
                        ) : (
                          filteredDeletedLogs.map((log) => (
                            <tr key={log.id} className="hover:bg-gray-50/30 dark:hover:bg-zinc-850/10">
                              <td className="py-3 px-4 font-sans font-bold text-gray-900 dark:text-white">
                                {log.name}
                              </td>
                              <td className="py-3 px-4 text-gray-500 dark:text-zinc-400">
                                {log.email}
                              </td>
                              <td className="py-3 px-4 font-sans font-medium text-gray-700 dark:text-zinc-300">
                                {log.role}
                              </td>
                              <td className="py-3 px-4 text-right text-gray-400 dark:text-zinc-500 font-medium">
                                {log.createdAt || "N/A"}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )
            ) : activeTab === 2 ? (
              /* TAB 2: SYSTEM ACTION LOGS */
              <div className="flex flex-col gap-4 font-sans">
                <div className="bg-gray-50 dark:bg-zinc-950/40 p-4 rounded-xl border border-gray-250 dark:border-zinc-800">
                  <h3 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#be1f24]" />
                    Audit Log for System Actions
                  </h3>
                  <p className="text-[10px] text-gray-500 dark:text-zinc-400 mt-1">
                    Real-time auditing of catalog actions: uploads, deletions, cover featured swaps, and photo approvals.
                  </p>
                </div>

                <div className="border border-gray-100 dark:border-zinc-850/80 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-zinc-900/60 text-[10px] uppercase font-black text-gray-500 dark:text-zinc-400 tracking-wider border-b border-gray-100 dark:border-zinc-850/80">
                        <th className="py-3 px-4">Timestamp (UTC)</th>
                        <th className="py-3 px-4">Agent / Operator</th>
                        <th className="py-3 px-4">Event Category</th>
                        <th className="py-3 px-4">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-zinc-850/80 font-medium">
                      {filteredActionLogs.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-8 text-center text-gray-400 dark:text-zinc-500 font-semibold">
                            No matching system action logs found.
                          </td>
                        </tr>
                      ) : (
                        filteredActionLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-gray-50/20 dark:hover:bg-zinc-850/10">
                            <td className="py-3 px-4 text-[11px] font-mono text-gray-400 dark:text-zinc-500 whitespace-nowrap">
                              {new Date(log.timestamp).toLocaleString()}
                            </td>
                            <td className="py-3 px-4 text-gray-700 dark:text-zinc-200 font-bold truncate max-w-[160px]">
                              {log.userEmail}
                            </td>
                            <td className="py-3 px-4">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider ${
                                log.action === "upload"
                                  ? "bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400"
                                  : log.action === "approve"
                                    ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400"
                                    : log.action === "new_cover"
                                      ? "bg-purple-50 dark:bg-purple-950/20 text-purple-700 dark:text-purple-400"
                                      : "bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400"
                              }`}>
                                {log.action.replace("_", " ")}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-gray-600 dark:text-zinc-400 text-[11px] font-mono">
                              {log.details}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : activeTab === 3 ? (
              /* TAB 3: HIGH-RES DOWNLOAD REQUESTS */
              <div className="flex flex-col gap-4 font-sans">
                <div className="bg-gray-50 dark:bg-zinc-950/40 p-4 rounded-xl border border-gray-250 dark:border-zinc-800">
                  <h3 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider">High-Resolution Resource Download Requests</h3>
                  <p className="text-[10px] text-gray-500 dark:text-zinc-400 mt-1">
                    Pending security access requests for catalog raw original source documents.
                  </p>
                </div>

                <div className="border border-gray-100 dark:border-zinc-850/80 rounded-xl overflow-hidden bg-white dark:bg-zinc-950">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-zinc-900/60 text-gray-500 dark:text-zinc-400 text-[10px] uppercase font-black tracking-wider border-b border-gray-100 dark:border-zinc-850/80">
                        <th className="py-3 px-4">User Requestor</th>
                        <th className="py-3 px-4">Target Photo Asset</th>
                        <th className="py-3 px-4">Purpose / Intent</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Decisions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-zinc-850/80 font-medium">
                      {filteredRequests.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-gray-400 dark:text-zinc-500 font-semibold">
                            No active high-resolution download requests found.
                          </td>
                        </tr>
                      ) : (
                        filteredRequests.map((req) => (
                          <tr key={req.id} className="hover:bg-gray-50/20 dark:hover:bg-zinc-850/10">
                            <td className="py-3 px-4">
                              <p className="font-extrabold text-gray-900 dark:text-white">{req.userName || "Contributor"}</p>
                              <p className="text-[10px] text-gray-400 dark:text-zinc-500 font-mono">{req.userEmail}</p>
                            </td>
                            <td className="py-3 px-4 truncate max-w-[150px]">
                              <p className="font-bold text-gray-800 dark:text-zinc-200 truncate">{req.photoTitle}</p>
                              <p className="text-[9px] text-gray-400 dark:text-zinc-500 truncate font-mono">ID: {req.photoId}</p>
                              <div className="flex flex-wrap gap-1 mt-1">
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-purple-50 dark:bg-purple-950/20 text-purple-600 border border-purple-100 dark:border-purple-800/30">
                                  Size: {req.requestedSize || "original"}
                                </span>
                                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                                  req.withWatermark 
                                    ? "bg-blue-50 dark:bg-blue-950/20 text-blue-600 border border-blue-100 dark:border-blue-800/30" 
                                    : "bg-red-50 dark:bg-red-950/20 text-red-600 border border-red-100 dark:border-red-800/30"
                                }`}>
                                  {req.withWatermark ? "With Watermark" : "No Watermark"}
                                </span>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-gray-500 dark:text-zinc-400 leading-normal max-w-[200px] whitespace-normal text-[11px]">
                              {req.purpose}
                            </td>
                            <td className="py-3 px-4">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                req.status === "Approved"
                                  ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 border border-emerald-100 dark:border-emerald-800/30"
                                  : req.status === "Rejected"
                                    ? "bg-red-50 dark:bg-red-950/20 text-red-600 border border-red-100 dark:border-red-800/30"
                                    : "bg-amber-50 dark:bg-amber-950/20 text-amber-600 border border-amber-100 dark:border-amber-800/30 animate-pulse"
                              }`}>
                                {req.status === "Approved" ? `Approved (${req.durationHours || 6}h)` : req.status}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              {req.status === "Pending" ? (
                                <div className="flex items-center justify-end gap-1.5 flex-wrap">
                                  {/* Duration Selector */}
                                  <div className="flex items-center gap-1 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg px-2 py-1 shadow-3xs">
                                    <span className="text-[9px] font-black text-gray-400 dark:text-zinc-500 uppercase tracking-wider">Time:</span>
                                    <input
                                      type="number"
                                      min={1}
                                      max={168}
                                      value={requestDurations[req.id] ?? 6}
                                      onChange={(e) => {
                                        const val = parseInt(e.target.value, 10);
                                        setRequestDurations(prev => ({
                                          ...prev,
                                          [req.id]: isNaN(val) || val <= 0 ? 6 : val
                                        }));
                                      }}
                                      className="w-10 bg-transparent text-[11px] font-black text-center text-gray-800 dark:text-zinc-200 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                      title="Approved Duration in Hours"
                                    />
                                    <span className="text-[9px] font-black text-gray-400 dark:text-zinc-500 uppercase">hrs</span>
                                  </div>
                                  
                                  <button
                                    onClick={() => handleApproveRequest(req.id, requestDurations[req.id] ?? 6)}
                                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 cursor-pointer shadow-3xs transition-all hover:scale-[1.02]"
                                    title="Grant Custom Duration Access"
                                  >
                                    <Check className="w-3 h-3" />
                                    <span>Approve</span>
                                  </button>
                                  <button
                                    onClick={() => handleRejectRequest(req.id)}
                                    className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 cursor-pointer shadow-3xs transition-all hover:scale-[1.02]"
                                    title="Deny Access"
                                  >
                                    <X className="w-3 h-3" />
                                    <span>Reject</span>
                                  </button>
                                </div>
                              ) : (
                                <span className="text-[10px] text-gray-400 dark:text-zinc-500 font-mono uppercase font-bold bg-gray-50 dark:bg-zinc-900/60 border border-gray-100 dark:border-zinc-850 px-2.5 py-1 rounded-md">
                                  {req.status === "Approved" ? `Granted ${req.durationHours || 6} hrs` : "Rejected"}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : activeTab === 4 ? (
              /* TAB 4: PHOTO APPROVALS */
              <div className="flex flex-col gap-4 font-sans">
                <div className="bg-amber-50/20 dark:bg-amber-950/15 border border-amber-200/55 dark:border-amber-900/30 p-4 rounded-xl flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-black text-amber-800 dark:text-amber-400 uppercase tracking-wider flex items-center gap-2">
                      <Image className="w-4 h-4" />
                      Pending Photos Approval Queue ({pendingPhotos.length})
                    </h3>
                    <p className="text-[10px] text-gray-500 dark:text-zinc-400 mt-1">
                      Review uploaded catalog assets. Approved assets are published live into the digital photo catalog instantly.
                    </p>
                  </div>
                </div>

                {filteredPendingPhotos.length === 0 ? (
                  <div className="py-12 border-2 border-dashed border-gray-250 dark:border-zinc-800 rounded-2xl text-center text-gray-400 dark:text-zinc-500 flex flex-col items-center justify-center gap-2.5">
                    <ShieldCheck className="w-8 h-8 text-emerald-500" />
                    <p className="font-extrabold text-sm text-gray-700 dark:text-zinc-300">Approval Queue Empty</p>
                    <p className="text-[10px] text-gray-500 max-w-[280px] leading-relaxed font-medium">All uploaded photos are approved and visible on the public website catalog.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredPendingPhotos.map((photo) => (
                      <div 
                        key={photo.id} 
                        className="bg-white dark:bg-zinc-950 border border-gray-250 dark:border-zinc-850 rounded-2xl overflow-hidden shadow-2xs hover:border-gray-300 dark:hover:border-zinc-800 transition-all flex flex-col"
                      >
                        {/* Image Preview Container */}
                        <div className="h-40 relative group bg-zinc-100 dark:bg-zinc-900 overflow-hidden">
                          <img 
                            src={photo.url} 
                            alt={photo.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute top-2.5 left-2.5 bg-black/60 backdrop-blur-3xs text-[9px] font-black text-white py-0.5 px-2 rounded-md uppercase tracking-wider font-mono">
                            {photo.serialNumber || "PENDING"}
                          </div>
                        </div>

                        {/* Metadata Details */}
                        <div className="p-4 flex-1 flex flex-col gap-2">
                          <div>
                            <h4 className="font-extrabold text-gray-900 dark:text-white text-xs truncate" title={photo.title}>
                              {photo.title}
                            </h4>
                            <p className="text-[10px] text-[#be1f24] font-black uppercase mt-0.5">{photo.photographer}</p>
                          </div>

                          <div className="text-[10px] text-gray-500 dark:text-zinc-400 flex flex-col gap-1 font-medium bg-gray-50/50 dark:bg-zinc-900/30 p-2.5 rounded-lg border border-gray-100 dark:border-zinc-850/60">
                            <p className="truncate">
                              <span className="font-bold text-gray-400 uppercase">Uploader:</span> {photo.uploaderName || photo.uploadedBy}
                            </p>
                            <p className="font-mono text-[9px] truncate">
                              <span className="font-bold text-gray-400 uppercase">Email:</span> {photo.uploadedBy}
                            </p>
                            <p className="text-[9px]">
                              <span className="font-bold text-gray-400 uppercase">Created:</span> {photo.dateCreated}
                            </p>
                            {photo.collection && (
                              <p className="truncate text-indigo-600 dark:text-indigo-400 font-bold">
                                <span className="font-bold text-gray-400 uppercase">Collection:</span> {photo.collection}
                              </p>
                            )}
                          </div>

                          <p className="text-[10px] text-gray-600 dark:text-zinc-400 italic line-clamp-2 leading-relaxed">
                            "{photo.caption || "No caption provided."}"
                          </p>

                          {photo.altText && (
                            <p className="text-[9px] text-teal-600 dark:text-teal-400 bg-teal-500/5 px-2 py-1 rounded-md border border-teal-500/10 font-medium">
                              <span className="font-extrabold">Alt text:</span> {photo.altText}
                            </p>
                          )}

                          {/* Quick decision footer buttons */}
                          <div className="flex gap-2 mt-2 pt-2 border-t border-gray-100 dark:border-zinc-850/80">
                            <button
                              onClick={() => handleApprovePhotoAction(photo.id)}
                              className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black py-2 rounded-xl transition-all uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer shadow-3xs"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span>Approve</span>
                            </button>
                            <button
                              onClick={() => handleDeletePhotoAction(photo.id)}
                              className="bg-red-50 hover:bg-red-100 dark:bg-red-950/20 text-red-600 dark:text-red-400 text-[10px] font-black px-3.5 py-2 rounded-xl transition-all uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer"
                              title="Reject & Delete Asset"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Reject</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* TAB 5: APP SETTINGS */
              <div className="flex flex-col gap-6 font-sans animate-fade-in w-full">
                <div className="bg-gray-50 dark:bg-zinc-950/40 p-5 rounded-xl border border-gray-250 dark:border-zinc-800">
                  <h3 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-wider">Application & Site Configuration</h3>
                  <p className="text-[10px] text-gray-500 dark:text-zinc-400 mt-1">
                    Manage site-wide integrations, social feeds, widgets, and dynamic configurations.
                  </p>
                </div>

                <div className="bg-white dark:bg-zinc-900 border border-gray-200/60 dark:border-zinc-800/85 rounded-xl p-6 shadow-3xs flex flex-col gap-5">
                  <div className="flex items-center gap-2.5 border-b border-gray-100 dark:border-zinc-850/60 pb-4">
                    <div className="w-8 h-8 rounded-lg bg-[#0077b5]/10 flex items-center justify-center text-[#0077b5]">
                      <Linkedin className="w-5 h-5 fill-current" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-gray-900 dark:text-white uppercase tracking-tight">LinkedIn Integration Page</h4>
                      <p className="text-[10px] text-gray-500 dark:text-zinc-400 mt-0.5">Specify the official company account or organization profile to sync all user widgets.</p>
                    </div>
                  </div>
                  
                  <div className="bg-amber-500/5 border border-amber-500/10 p-4 rounded-xl flex flex-col gap-2">
                    <h5 className="text-[11px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                      <span>Why can't we pull live posts automatically?</span>
                    </h5>
                    <p className="text-[10px] text-gray-600 dark:text-zinc-400 leading-relaxed font-normal">
                      LinkedIn employs strict access rules to protect company and personal data. Fetching live posts directly via API requires an <strong>official LinkedIn Developer App</strong>, an enterprise-level API token, and a verified admin login. 
                    </p>
                    <p className="text-[10px] text-gray-600 dark:text-zinc-400 leading-relaxed font-normal">
                      To display your real-time live posts in this widget without complex API credential setups, you can paste a <strong>Free Widget Embed HTML</strong> (from services like <em>SociableKIT</em>, <em>Elfsight</em>, <em>Juicer</em>, or standard LinkedIn post embed codes) in the field below. If left empty, our custom-designed high-fidelity interactive preview feed will display.
                    </p>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider">LinkedIn URL Target</label>
                    <input
                      type="url"
                      value={adminLinkedInUrl}
                      onChange={(e) => setAdminLinkedInUrl(e.target.value)}
                      placeholder="https://sy.linkedin.com/company/hcsyria"
                      className="w-full text-xs px-3.5 py-2.5 bg-gray-50 dark:bg-zinc-950 text-gray-950 dark:text-white rounded-lg border border-gray-250 dark:border-zinc-800 focus:ring-1 focus:ring-[#be1f24] focus:outline-none placeholder-gray-400"
                    />
                    <p className="text-[9px] text-gray-400 leading-normal">
                      Example: <span className="font-mono bg-gray-100 dark:bg-zinc-950 px-1 py-0.5 rounded">https://sy.linkedin.com/company/hcsyria</span>
                    </p>
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider flex items-center justify-between">
                      <span>Live Feed Embed HTML (Optional)</span>
                      <span className="text-[8px] text-emerald-650 bg-emerald-500/10 px-1.5 py-0.5 rounded font-bold uppercase">Bypass Login Wall</span>
                    </label>
                    <textarea
                      value={adminEmbedCode}
                      onChange={(e) => setAdminEmbedCode(e.target.value)}
                      placeholder="Paste <iframe> or widget script code here..."
                      rows={4}
                      className="w-full text-xs font-mono p-3 bg-gray-50 dark:bg-zinc-950 text-gray-950 dark:text-white rounded-lg border border-gray-250 dark:border-zinc-800 focus:ring-1 focus:ring-[#be1f24] focus:outline-none placeholder-gray-400"
                    />
                    <p className="text-[9px] text-gray-400 leading-normal">
                      Accepts safe <code>&lt;iframe&gt;</code> tags or embedding scripts.
                    </p>
                  </div>

                  <div className="flex gap-2.5 justify-end pt-3 border-t border-gray-50 dark:border-zinc-850/30">
                    <a 
                      href={adminLinkedInUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-700 dark:text-zinc-300 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>Test Target Link</span>
                    </a>
                    
                    <button
                      onClick={async () => {
                        if (!onSaveLinkedInUrl) return;
                        setIsSavingSettings(true);
                        try {
                          const ok = await onSaveLinkedInUrl(adminLinkedInUrl, adminEmbedCode);
                          if (ok) {
                            dialogService.alert("Site settings saved successfully. LinkedIn widgets have been updated.", {
                              title: "Settings Saved",
                              variant: "success"
                            });
                          }
                        } catch (err) {
                          dialogService.alert("Failed to write settings to network storage.", {
                            title: "Save Failed",
                            variant: "danger"
                          });
                        } finally {
                          setIsSavingSettings(false);
                        }
                      }}
                      disabled={isSavingSettings}
                      className="px-4 py-2.5 bg-[#be1f24] hover:bg-[#a1161a] disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-sm transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      {isSavingSettings ? (
                        <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      ) : (
                        <Check className="w-3.5 h-3.5" />
                      )}
                      <span>Save Settings</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
