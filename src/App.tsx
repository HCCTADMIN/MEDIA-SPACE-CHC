import React, { useState, useEffect, useRef } from "react";
import { motion } from "motion/react";
import Header from "./components/Header";
import SidebarFilters from "./components/SidebarFilters";
import PhotoCard from "./components/PhotoCard";
import PhotoDetailDialog from "./components/PhotoDetailDialog";
import UploadModal from "./components/UploadModal";
import ShareDialog from "./components/ShareDialog";
import LoginScreen from "./components/LoginScreen";
import PendingApprovalScreen from "./components/PendingApprovalScreen";
import UserProfileDialog from "./components/UserProfileDialog";
import ProfileView from "./components/ProfileView";
import AdminPage from "./components/AdminPage";
import CustomDialog from "./components/CustomDialog";
import CommunityFeed from "./components/CommunityFeed";
import { dialogService } from "./lib/dialog";
import { auth } from "./lib/firebase.ts";
import { onAuthStateChanged } from "firebase/auth";
import { Photo, UserAccount, Photographer } from "./types";
import { Loader2, Globe, Heart, Compass, ShieldAlert, ChevronRight, ChevronLeft, SlidersHorizontal, ArrowUpDown, Eye, Search } from "lucide-react";

const DEFAULT_ADMIN_USER: UserAccount = {
  id: "user_owner1",
  email: "ct.aleppo2@gmail.com",
  emailVerified: true,
  name: "ct.aleppo2",
  role: "super_admin",
  status: "Approved",
  createdAt: "2026-07-02",
  provider: "email",
  avatarUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&auto=format&fit=crop&q=80",
  coverUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&auto=format&fit=crop&q=80",
  bio: "Main System Owner & Administrator.",
  organization: "Christian Hope Center Aleppo",
  notifications: []
};

export default function App() {
  // Click prevention ref during vertical drag-reframing
  const preventClickRef = useRef(false);

  // User Authentication State
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // 1. Firebase Auth state listener and local session recovery
  useEffect(() => {
    let active = true;

    async function checkLocalSession(): Promise<boolean> {
      const localToken = sessionStorage.getItem("firebase_id_token");
      if (localToken && localToken.startsWith("local_")) {
        try {
          const res = await fetch("/api/users/me");
          if (res.ok && active) {
            const dbUser = await res.json();
            setCurrentUser(dbUser);
            setAuthLoading(false);
            return true;
          }
        } catch (err) {
          console.error("[AUTH] Failed checking local session:", err);
        }
      }
      return false;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          const idToken = await firebaseUser.getIdToken();
          sessionStorage.setItem("firebase_id_token", idToken);

          // Get full synced user account from our SQL backend
          const res = await fetch("/api/users/me");
          if (res.ok && active) {
            const dbUser = await res.json();
            setCurrentUser(dbUser);
          } else if (active) {
            console.error("[AUTH] Failed to fetch current user profile from PostgreSQL");
            setCurrentUser(null);
          }
        } else {
          // If there's a custom local token in sessionStorage, check and restore it instead of clearing
          const isLocal = await checkLocalSession();
          if (!isLocal && active) {
            sessionStorage.removeItem("firebase_id_token");
            setCurrentUser(null);
          }
        }
      } catch (err) {
        console.error("[AUTH] Error checking auth status:", err);
        if (active) setCurrentUser(null);
      } finally {
        if (active) setAuthLoading(false);
      }
    });

    // Run local session check immediately
    checkLocalSession();

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  // View mode simulation state (for admins/owners)
  const [viewAsMode, setViewAsMode] = useState<"admin" | "user" | "guest">("admin");

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [collections, setCollections] = useState<{ name: string; description: string }[]>([]);
  const [photographers, setPhotographers] = useState<Photographer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"archive" | "feed">("archive");
  const [linkedInUrl, setLinkedInUrl] = useState<string>("https://sy.linkedin.com/company/hcsyria");
  const [embedCode, setEmbedCode] = useState<string>("");

  // Dark Mode State & Local Storage Synchronization
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem("theme");
    return saved === "dark" || (!saved && window.matchMedia("(prefers-color-scheme: dark)").matches);
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [isDarkMode]);
  
  // Router Sync State & Routing Helpers
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const [users, setUsers] = useState<UserAccount[]>([]);

  const navigateTo = (path: string) => {
    window.history.pushState({}, "", path);
    setCurrentPath(path);
  };

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Lock all photos to prevent right-click downloads and inspections
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "IMG" || 
        target.closest("#featured-main-cover") || 
        target.closest(".photo-card") ||
        target.closest("[data-testid='photo-container']")
      ) {
        e.preventDefault();
      }
    };

    const handleDragStart = (e: DragEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "IMG") {
        e.preventDefault();
      }
    };

    const showScreenshotWarning = () => {
      try {
        navigator.clipboard.writeText("Copyright Protected Content - HCSYRIA.ORG");
      } catch (e) {
        // clipboard permission might be disabled, ignore
      }

      // Check if overlay already exists
      if (document.getElementById("anti-screenshot-overlay")) return;

      const overlay = document.createElement("div");
      overlay.id = "anti-screenshot-overlay";
      overlay.style.position = "fixed";
      overlay.style.top = "0";
      overlay.style.left = "0";
      overlay.style.width = "100vw";
      overlay.style.height = "100vh";
      overlay.style.backgroundColor = "#1a1a1a";
      overlay.style.color = "#ffffff";
      overlay.style.display = "flex";
      overlay.style.flexDirection = "column";
      overlay.style.alignItems = "center";
      overlay.style.justifyContent = "center";
      overlay.style.zIndex = "999999";
      overlay.style.fontFamily = "system-ui, -apple-system, sans-serif";
      overlay.style.padding = "20px";
      overlay.style.textAlign = "center";

      overlay.innerHTML = `
        <div style="background: rgba(255, 255, 255, 0.05); padding: 40px; border-radius: 20px; border: 1px solid rgba(255, 255, 255, 0.1); max-width: 500px; box-shadow: 0 20px 50px rgba(0,0,0,0.5);">
          <div style="color: #be1f24; font-size: 50px; margin-bottom: 20px;">🛡️</div>
          <h2 style="font-size: 24px; font-weight: 800; margin-bottom: 12px; letter-spacing: -0.5px; color: #ffffff;">SCREENSHOT BLOCKED</h2>
          <p style="font-size: 14px; color: #a0a0a0; line-height: 1.6; margin-bottom: 0;">
            To protect photographer copyright, capturing screenshots, screen recordings, or prints of this catalog is strictly prohibited. Please request approval for high-resolution original file downloads.
          </p>
        </div>
      `;

      document.body.appendChild(overlay);

      setTimeout(() => {
        overlay.remove();
      }, 3000);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Print screen key
      if (e.key === "PrintScreen" || e.keyCode === 44) {
        showScreenshotWarning();
        e.preventDefault();
        return false;
      }

      if (e.keyCode === 123) { // F12
        e.preventDefault();
        return false;
      }

      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;
      const optOrAlt = e.altKey;
      const shift = e.shiftKey;

      // Mac Screenshot: Cmd + Shift + 3, 4, 5
      if (cmdOrCtrl && shift && (e.key === "3" || e.key === "4" || e.key === "5")) {
        showScreenshotWarning();
        e.preventDefault();
        return false;
      }

      // Windows Screenshot: Win + Shift + S
      if (e.key?.toLowerCase() === 's' && cmdOrCtrl && shift) {
        showScreenshotWarning();
        e.preventDefault();
        return false;
      }

      // Ctrl+Shift+I / Cmd+Opt+I (Inspect)
      if (cmdOrCtrl && (isMac ? optOrAlt : shift) && e.key?.toLowerCase() === 'i') {
        e.preventDefault();
        return false;
      }

      // Ctrl+Shift+C (Inspect Selector)
      if (cmdOrCtrl && shift && e.key?.toLowerCase() === 'c') {
        e.preventDefault();
        return false;
      }

      // Ctrl+Shift+J / Cmd+Opt+J (Console)
      if (cmdOrCtrl && (isMac ? optOrAlt : shift) && e.key?.toLowerCase() === 'j') {
        e.preventDefault();
        return false;
      }

      // Ctrl+U / Cmd+Opt+U (View Source)
      if (cmdOrCtrl && (isMac ? optOrAlt : false) && e.key?.toLowerCase() === 'u') {
        e.preventDefault();
        return false;
      }

      // Ctrl+S / Cmd+S (Save)
      if (cmdOrCtrl && e.key?.toLowerCase() === 's') {
        e.preventDefault();
        return false;
      }
    };


    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("dragstart", handleDragStart);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("dragstart", handleDragStart);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Admin page path guard
  useEffect(() => {
    if (currentPath === "/admin" && currentUser) {
      const realIsAdmin = currentUser.role === "super_admin" || currentUser.role === "archive_manager";
      if (!realIsAdmin) {
        navigateTo("/");
      }
    }
  }, [currentPath, currentUser]);

  const handleVisitProfile = (type: "photographer" | "user", value: string) => {
    let cleanName = value;
    if (type === "user" && value.includes("@")) {
      cleanName = value.split("@")[0];
    }
    const slug = cleanName.toLowerCase().trim().replace(/[^a-z0-9]+/g, ".");
    
    // Close detail dialog
    setSelectedPhotoForDetails(null);
    
    // Navigate to profile slug
    navigateTo(`/${type}/${slug}`);
  };

  const syncWithBackend = async () => {
    try {
      const localUsersJson = localStorage.getItem("chc_users");
      const localPhotosJson = localStorage.getItem("chc_photos");
      const localPhotographersJson = localStorage.getItem("chc_photographers");
      const localRequestsJson = localStorage.getItem("chc_requests");
      const localLogsJson = localStorage.getItem("chc_logs");

      const localUsers = localUsersJson ? JSON.parse(localUsersJson) : [];
      const localPhotos = localPhotosJson ? JSON.parse(localPhotosJson) : [];
      const localPhotographers = localPhotographersJson ? JSON.parse(localPhotographersJson) : [];
      const localRequests = localRequestsJson ? JSON.parse(localRequestsJson) : [];
      const localLogs = localLogsJson ? JSON.parse(localLogsJson) : [];

      if (
        localUsers.length > 0 ||
        localPhotos.length > 0 ||
        localPhotographers.length > 0 ||
        localRequests.length > 0 ||
        localLogs.length > 0
      ) {
        console.log("[SYNC] Local data found. Synchronizing with backend server...");
        const res = await fetch("/api/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            users: localUsers,
            photos: localPhotos,
            photographers: localPhotographers,
            requests: localRequests,
            logs: localLogs
          })
        });

        if (res.ok) {
          const data = await res.json();
          console.log("[SYNC] Synchronized with backend successfully.", data);
          if (data.users) localStorage.setItem("chc_users", JSON.stringify(data.users));
          if (data.photos) localStorage.setItem("chc_photos", JSON.stringify(data.photos));
          if (data.photographers) localStorage.setItem("chc_photographers", JSON.stringify(data.photographers));
          if (data.fullResRequests) localStorage.setItem("chc_requests", JSON.stringify(data.fullResRequests));
          if (data.actionLogs) localStorage.setItem("chc_logs", JSON.stringify(data.actionLogs));
        }
      }
    } catch (err) {
      console.warn("[SYNC] Connection failed during synchronization, using local fallback:", err);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (err) {
      console.error("Error fetching user list:", err);
    }
  };

  // Modal Account control state
  const [isAdminUsersOpen, setIsAdminUsersOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // Safe storage helper to prevent QuotaExceededError crashes
  const safeSaveUserToLocalStorage = (user: UserAccount | null) => {
    if (!user) {
      localStorage.removeItem("chc_current_user");
      return;
    }
    try {
      localStorage.setItem("chc_current_user", JSON.stringify(user));
    } catch (e) {
      console.warn("Storage quota exceeded or storage error, could not cache current user locally:", e);
    }
  };

  // Sync current user if account is modified by Admin in list
  useEffect(() => {
    if (currentUser) {
      const checkStatusInterval = setInterval(async () => {
        try {
          const res = await fetch(`/api/users/${currentUser.id}`);
          if (res.ok) {
            const updated: UserAccount = await res.json();
            if (updated && JSON.stringify(updated) !== JSON.stringify(currentUser)) {
              setCurrentUser(updated);
              safeSaveUserToLocalStorage(updated);
            }
          }
        } catch (err) {
          console.warn("Could not background check account status:", err);
        }
      }, 5000); // Check every 5s for reactive approval updates in sandbox

      return () => clearInterval(checkStatusInterval);
    }
  }, [currentUser]);

  const handleLoginSuccess = (user: UserAccount) => {
    setCurrentUser(user);
    safeSaveUserToLocalStorage(user);
  };

  const handleSignOut = async () => {
    try {
      const { signOut: firebaseSignOut } = await import("firebase/auth");
      await firebaseSignOut(auth);
    } catch (e) {
      console.error("Firebase signOut failed:", e);
    }
    setCurrentUser(null);
    sessionStorage.removeItem("firebase_id_token");
    localStorage.removeItem("chc_current_user");
    setIsAdminUsersOpen(false);
  };

  const handleRefreshStatus = async () => {
    if (!currentUser) return;
    try {
      const res = await fetch("/api/users");
      if (res.ok) {
        const usersList: UserAccount[] = await res.json();
        const updated = usersList.find(u => u.id === currentUser.id);
        if (updated) {
          setCurrentUser(updated);
          safeSaveUserToLocalStorage(updated);
        }
      }
    } catch (err) {
      console.error("Refresh status error:", err);
    }
  };

  // Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [coverSearch, setCoverSearch] = useState("");
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);
  const [metadataGrouping, setMetadataGrouping] = useState<string | null>(null);
  
  const [selectedPhotographer, setSelectedPhotographer] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("");
  const [selectedCamera, setSelectedCamera] = useState("");
  const [selectedCollection, setSelectedCollection] = useState("");
  const [searchTarget, setSearchTarget] = useState<"all" | "keywords" | "location">("all");
  
  const [titleFilter, setTitleFilter] = useState("");
  const [captionFilter, setCaptionFilter] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Sorting / View Type choices states (Request 3)
  const [sortType, setSortType] = useState<"newest" | "oldest" | "high views" | "high react" | "most downloaded">("newest");
  const [isOppositeWay, setIsOppositeWay] = useState<boolean>(false);

  // Modals / Dialogs States
  const [selectedPhotoForDetails, setSelectedPhotoForDetails] = useState<Photo | null>(null);
  const [selectedPhotoForShare, setSelectedPhotoForShare] = useState<Photo | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  // Fetch collections
  const fetchCollections = async () => {
    try {
      const res = await fetch("/api/collections");
      if (res.ok) {
        const data = await res.json();
        setCollections(data);
      }
    } catch (err) {
      console.error("Error fetching collections:", err);
    }
  };

  const handleCreateCollection = async (name: string, description: string) => {
    try {
      const res = await fetch("/api/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description }),
      });
      if (res.ok) {
        await fetchCollections();
        return true;
      } else {
        const data = await res.json();
        await dialogService.alert(data.error || "Failed to create collection.", {
          title: "Create Collection Failed",
          variant: "danger"
        });
        return false;
      }
    } catch (err) {
      console.error("Error creating collection:", err);
      return false;
    }
  };

  // Fetch photos on load
  const fetchPhotos = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/images");
      if (response.ok) {
        const data = await response.json();
        setPhotos(data);
      } else {
        console.error("Failed to fetch photos from library backend.");
      }
    } catch (err) {
      console.error("Connection error fetching images:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch photographers on load
  const fetchPhotographers = async () => {
    try {
      const response = await fetch("/api/photographers");
      if (response.ok) {
        const data = await response.json();
        setPhotographers(data);
      }
    } catch (err) {
      console.error("Error fetching photographers:", err);
    }
  };

  // Fetch application settings (LinkedIn URL & Embed Code) on load
  const fetchSettings = async () => {
    try {
      const response = await fetch("/api/settings");
      if (response.ok) {
        const data = await response.json();
        if (data.linkedInUrl) {
          setLinkedInUrl(data.linkedInUrl);
        }
        if (data.embedCode !== undefined) {
          setEmbedCode(data.embedCode);
        }
      }
    } catch (err) {
      console.error("Error fetching settings:", err);
    }
  };

  // Save updated LinkedIn URL & Embed Code
  const handleSaveLinkedInUrl = async (url: string, code: string = ""): Promise<boolean> => {
    try {
      const response = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ linkedInUrl: url, embedCode: code })
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.settings) {
          setLinkedInUrl(data.settings.linkedInUrl || "");
          setEmbedCode(data.settings.embedCode || "");
          return true;
        }
      }
      return false;
    } catch (err) {
      console.error("Error saving LinkedIn URL:", err);
      return false;
    }
  };

  useEffect(() => {
    const initializeData = async () => {
      await syncWithBackend();
      fetchPhotos();
      fetchCollections();
      fetchUsers();
      fetchPhotographers();
      fetchSettings();
    };
    initializeData();
  }, []);

  // Sync details dialog photo if updated
  useEffect(() => {
    if (selectedPhotoForDetails) {
      const updated = photos.find((p) => p.id === selectedPhotoForDetails.id);
      if (updated) {
        setSelectedPhotoForDetails(updated);
      }
    }
  }, [photos, selectedPhotoForDetails]);

  // Dynamic filter helpers extracted from the photos array
  const availablePhotographers = (Array.from(
    new Set(photos.map((p) => p.photographer).filter(Boolean))
  ) as string[]).sort();

  const availableLocations = (Array.from(
    new Set(photos.map((p) => p.location).filter(Boolean))
  ) as string[]).sort();

  const availableCameras = (Array.from(
    new Set(photos.map((p) => p.cameraSettings?.camera).filter(Boolean))
  ) as string[]).sort();

  const availableCollections = (Array.from(
    new Set([...photos.map((p) => p.collection), ...collections.map((c) => c.name)].filter(Boolean))
  ) as string[]).sort();

  // Clear all filters
  const handleClearFilters = () => {
    setSearchQuery("");
    setCoverSearch("");
    setSelectedKeywords([]);
    setMetadataGrouping(null);
    setSelectedPhotographer("");
    setSelectedLocation("");
    setSelectedCamera("");
    setSelectedCollection("");
    setSearchTarget("all");
    setTitleFilter("");
    setCaptionFilter("");
  };

  const handleApplySmartFilter = (type: "photographer" | "camera" | "collection", value: string) => {
    // Enable metadata grouping for this type
    setMetadataGrouping(type === "camera" ? "cameraSettings" : type);
    
    // Set the specific select value
    if (type === "photographer") {
      setSelectedPhotographer(value);
    } else if (type === "camera") {
      setSelectedCamera(value);
    } else if (type === "collection") {
      setSelectedCollection(value);
    }
    
    // Close the detail dialog to show the filtered grid
    setSelectedPhotoForDetails(null);
  };

  const handleReactPhoto = (
    id: string, 
    reactions: { like: number; love: number; inspiring: number }, 
    userReactions: { like?: string[]; love?: string[]; inspiring?: string[] }
  ) => {
    setPhotos((prev) =>
      prev.map((p) => {
        if (p.id === id) {
          return {
            ...p,
            reactions,
            userReactions,
          };
        }
        return p;
      })
    );
  };

  // Toggle keyword selection
  const handleToggleKeyword = (kw: string) => {
    if (selectedKeywords.includes(kw)) {
      setSelectedKeywords(selectedKeywords.filter((k) => k !== kw));
    } else {
      setSelectedKeywords([...selectedKeywords, kw]);
    }
  };

  // Trigger Save Photo metadata update
  const handleSavePhoto = async (updatedPhoto: Photo) => {
    try {
      const response = await fetch(`/api/images/${updatedPhoto.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedPhoto),
      });

      if (response.ok) {
        setPhotos(
          photos.map((p) => (p.id === updatedPhoto.id ? updatedPhoto : p))
        );
      } else {
        throw new Error("Failed to update on server");
      }
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  // Trigger Delete Photo
  const handleDeletePhoto = async (id: string) => {
    try {
      const response = await fetch(`/api/images/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setPhotos(photos.filter((p) => p.id !== id));
        if (selectedPhotoForDetails?.id === id) {
          setSelectedPhotoForDetails(null);
        }
      } else {
        await dialogService.alert("Failed to delete photo from catalog.", {
          title: "Delete Failed",
          variant: "danger"
        });
      }
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  // Handle successful photo upload callback
  const handlePhotoUploaded = (newPhoto: Photo) => {
    // Add immediately to the beginning of local state list
    setPhotos([newPhoto, ...photos]);
  };

  // Trigger Approve Photo
  const handleApprovePhoto = async (id: string) => {
    try {
      const response = await fetch(`/api/images/${id}/approve`, {
        method: "POST",
      });

      if (response.ok) {
        setPhotos(prevPhotos =>
          prevPhotos.map((p) => (p.id === id ? { ...p, status: "Approved" } : p))
        );
      } else {
        await dialogService.alert("Failed to approve photo.", {
          title: "Approval Failed",
          variant: "danger"
        });
      }
    } catch (err) {
      console.error("Approval error:", err);
    }
  };

  // Increment local state views for immediate reactive UI update
  const handlePhotoViewed = (id: string) => {
    setPhotos(prevPhotos =>
      prevPhotos.map((p) => (p.id === id ? { ...p, views: (p.views || 0) + 1 } : p))
    );
  };

  // Increment local state downloads for immediate reactive UI update
  const handlePhotoDownloaded = (id: string) => {
    setPhotos(prevPhotos =>
      prevPhotos.map((p) => (p.id === id ? { ...p, downloads: (p.downloads || 0) + 1 } : p))
    );
  };

  // Trigger Feature/Unfeature Cover Photo (Admins only)
  const handleFeaturePhoto = async (id: string, feature: boolean) => {
    try {
      const response = await fetch(`/api/images/${id}/feature`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ feature }),
      });

      if (response.ok) {
        // Update all photos in local state
        setPhotos(prevPhotos =>
          prevPhotos.map((p) => {
            if (feature) {
              // If we are setting this one as featured, unset all others
              return { ...p, isFeatured: p.id === id };
            } else {
              // Just unset this one
              return p.id === id ? { ...p, isFeatured: false } : p;
            }
          })
        );
      } else {
        await dialogService.alert("Failed to update cover feature status.", {
          title: "Feature Update Failed",
          variant: "danger"
        });
      }
    } catch (err) {
      console.error("Feature error:", err);
    }
  };

  // Dynamic Filtering Logic
  const filteredPhotos = photos.filter((photo) => {
    // 0. Pending photos should not shown on main page to any user or admin till approved
    if (photo.status && photo.status !== "Approved") {
      return false;
    }

    // External users and guest simulation can only browse public approved photos
    if ((currentUser?.role === "external_user" || viewAsMode === "guest") && photo.isPublic === false) {
      return false;
    }

    // 1. Text Search Box (with options: keywords, or all text, location)
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (searchTarget === "keywords") {
        const matchTags = photo.keywords.some((kw) =>
          kw.toLowerCase().includes(query)
        );
        if (!matchTags) return false;
      } else if (searchTarget === "location") {
        const matchLoc = photo.location.toLowerCase().includes(query) || 
                         (photo.city && photo.city.toLowerCase().includes(query));
        if (!matchLoc) return false;
      } else {
        // "all" text search: matches title, photographer, caption, location, city, collection name, keywords/tags
        const matchTitle = photo.title.toLowerCase().includes(query);
        const matchCaption = photo.caption.toLowerCase().includes(query);
        const matchLoc = photo.location.toLowerCase().includes(query) || 
                         (photo.city && photo.city.toLowerCase().includes(query));
        const matchPhoto = photo.photographer.toLowerCase().includes(query);
        const matchCol = photo.collection?.toLowerCase().includes(query);
        const matchTags = photo.keywords.some((kw) =>
          kw.toLowerCase().includes(query)
        );

        if (!matchTitle && !matchCaption && !matchLoc && !matchPhoto && !matchTags && !matchCol) {
          return false;
        }
      }
    }

    // 2. Keywords checkbox list (matches ANY of selected tags, or ALL of them. Let's do ANY so clicking multiple acts as expanding filter)
    if (selectedKeywords.length > 0) {
      const hasMatchingKeyword = selectedKeywords.some((kw) =>
        photo.keywords.includes(kw)
      );
      if (!hasMatchingKeyword) return false;
    }

    // 3. Metadata Grouping Filters
    if (metadataGrouping === "photographer" && selectedPhotographer) {
      if (photo.photographer !== selectedPhotographer) return false;
    }

    if (metadataGrouping === "location" && selectedLocation) {
      if (photo.location !== selectedLocation) return false;
    }

    if (metadataGrouping === "cameraSettings" && selectedCamera) {
      if (photo.cameraSettings?.camera !== selectedCamera) return false;
    }

    if (metadataGrouping === "collection" && selectedCollection) {
      if (photo.collection !== selectedCollection) return false;
    }

    // 4. Sidebar Title input
    if (titleFilter) {
      if (!photo.title.toLowerCase().includes(titleFilter.toLowerCase())) {
        return false;
      }
    }

    // 5. Sidebar Caption input
    if (captionFilter) {
      if (!photo.caption.toLowerCase().includes(captionFilter.toLowerCase())) {
        return false;
      }
    }

    return true;
  });

  // Sort the filteredPhotos per User Request #3
  const sortedPhotos = [...filteredPhotos].sort((a, b) => {
    let comparison = 0;
    
    if (sortType === "newest" || sortType === "oldest") {
      // Sort by dateCreated
      const dateA = new Date(a.dateCreated).getTime() || 0;
      const dateB = new Date(b.dateCreated).getTime() || 0;
      comparison = dateA - dateB;
    } else if (sortType === "high views") {
      const viewsA = a.views || 0;
      const viewsB = b.views || 0;
      comparison = viewsA - viewsB;
    } else if (sortType === "high react") {
      const reactA = (a.reactions?.like || 0) + (a.reactions?.love || 0) + (a.reactions?.inspiring || 0);
      const reactB = (b.reactions?.like || 0) + (b.reactions?.love || 0) + (b.reactions?.inspiring || 0);
      comparison = reactA - reactB;
    } else if (sortType === "most downloaded") {
      const downloadsA = a.downloads || 0;
      const downloadsB = b.downloads || 0;
      comparison = downloadsA - downloadsB;
    }

    let finalOrder = comparison;
    if (sortType === "newest") {
      finalOrder = -comparison; // Newest first by default
    } else if (sortType === "high views") {
      finalOrder = -comparison; // High views first by default
    } else if (sortType === "high react") {
      finalOrder = -comparison; // High react first by default
    } else if (sortType === "most downloaded") {
      finalOrder = -comparison; // Most downloaded first by default
    } else if (sortType === "oldest") {
      finalOrder = comparison;  // Oldest first by default
    }

    if (isOppositeWay) {
      finalOrder = -finalOrder;
    }

    return finalOrder;
  });

  // --- AUTHENTICATION GATES ---
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 text-[#be1f24] animate-spin" />
        <span className="text-xs font-bold text-gray-500 dark:text-zinc-400 font-sans tracking-wide uppercase animate-pulse">Christian Hope Center Syria Media Space</span>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <LoginScreen
        onLoginSuccess={(user) => {
          setCurrentUser(user);
        }}
      />
    );
  }

  if (currentUser.status === "Pending" || currentUser.status === "Rejected") {
    return (
      <PendingApprovalScreen
        user={currentUser}
        onRefresh={handleRefreshStatus}
        onSignOut={handleSignOut}
      />
    );
  }

  const actualIsAdmin = currentUser.role === "super_admin" || currentUser.role === "archive_manager";
  const isAdmin = actualIsAdmin && viewAsMode === "admin";
  const photographerMatch = currentPath.match(/^\/photographer\/([^/]+)$/);
  const userMatch = currentPath.match(/^\/user\/([^/]+)$/);
  const isProfileRoute = !!photographerMatch || !!userMatch;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 text-gray-900 dark:text-zinc-100 flex flex-col font-sans select-none antialiased transition-colors duration-300">
      {/* Header Panel */}
      <Header
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        currentUser={currentUser}
        onSignOut={handleSignOut}
        onAdminUsersClick={() => navigateTo("/admin")}
        onUploadClick={() => setIsUploadOpen(true)}
        onProfileClick={() => setIsProfileOpen(true)}
        photos={photos}
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode(prev => !prev)}
        viewAsMode={viewAsMode}
        onViewAsModeChange={setViewAsMode}
        onGoHome={() => {
          handleClearFilters();
          navigateTo("/");
        }}
        onSelectKeyword={(kw) => {
          handleToggleKeyword(kw);
          setIsSidebarOpen(true);
        }}
        onSelectLocation={(loc) => {
          setSelectedLocation(loc);
          setIsSidebarOpen(true);
        }}
        onSelectPhotographer={(ph) => {
          setSelectedPhotographer(ph);
          setIsSidebarOpen(true);
        }}
        onSelectCollection={(col) => {
          setSelectedCollection(col);
          setIsSidebarOpen(true);
        }}
        onUpdateProfile={(updatedUser) => {
          setCurrentUser(updatedUser);
          safeSaveUserToLocalStorage(updatedUser);
        }}
        onViewPhotoById={(photoId) => {
          const photo = photos.find((p) => p.id === photoId);
          if (photo) {
            setSelectedPhotoForDetails(photo);
          }
        }}
      />

      {/* Main Body */}
      {currentPath === "/admin" ? (
        <AdminPage
          currentUser={currentUser}
          photographers={photographers}
          onRefreshPhotographers={fetchPhotographers}
          photos={photos}
          onApprovePhoto={handleApprovePhoto}
          onDeletePhoto={handleDeletePhoto}
          onBack={() => navigateTo("/")}
          linkedInUrl={linkedInUrl}
          embedCode={embedCode}
          onSaveLinkedInUrl={handleSaveLinkedInUrl}
        />
      ) : isProfileRoute ? (
        <ProfileView
          type={photographerMatch ? "photographer" : "user"}
          slug={(photographerMatch || userMatch)![1]}
          photos={photos}
          users={users}
          photographers={photographers}
          isAdmin={isAdmin}
          onViewDetails={setSelectedPhotoForDetails}
          onShare={setSelectedPhotoForShare}
          onDelete={handleDeletePhoto}
          onBack={() => navigateTo("/")}
        />
      ) : (
        <>
          {/* Mobile Filter Toggle Button */}
          {!isSidebarOpen && (
            <div className="lg:hidden px-6 py-3 bg-white/50 backdrop-blur-md border-b border-gray-200 flex items-center justify-between">
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="flex items-center gap-2 text-xs font-black text-gray-800 bg-gray-50 hover:bg-gray-100 px-3 py-2 rounded-lg border border-gray-200 cursor-pointer transition-all active:scale-95"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-[#be1f24]" />
                <span>Show Filters & Archive</span>
              </button>
            </div>
          )}

          <div className="flex-1 flex flex-col lg:flex-row w-full relative">
            {/* Sidebar Filter Controls */}
            {isSidebarOpen && (
              <SidebarFilters
                selectedKeywords={selectedKeywords}
                toggleKeyword={handleToggleKeyword}
                metadataGrouping={metadataGrouping}
                setMetadataGrouping={setMetadataGrouping}
                titleFilter={titleFilter}
                setTitleFilter={setTitleFilter}
                captionFilter={captionFilter}
                setCaptionFilter={setCaptionFilter}
                availablePhotographers={availablePhotographers}
                availableLocations={availableLocations}
                availableCameras={availableCameras}
                availableCollections={availableCollections}
                selectedPhotographer={selectedPhotographer}
                setSelectedPhotographer={setSelectedPhotographer}
                selectedLocation={selectedLocation}
                setSelectedLocation={setSelectedLocation}
                selectedCamera={selectedCamera}
                setSelectedCamera={setSelectedCamera}
                selectedCollection={selectedCollection}
                setSelectedCollection={setSelectedCollection}
                searchTarget={searchTarget}
                setSearchTarget={setSearchTarget}
                onClearAll={handleClearFilters}
                onToggleSidebar={() => setIsSidebarOpen(false)}
                onCreateCollection={handleCreateCollection}
                sortType={sortType}
                setSortType={setSortType}
                isOppositeWay={isOppositeWay}
                setIsOppositeWay={setIsOppositeWay}
              />
            )}

            {/* Floating Fixed Sidebar Toggle Arrow (Always Shown on Scroll) */}
            <div 
              className={`fixed top-1/3 z-50 transition-all duration-300 ${
                isSidebarOpen ? "left-[288px] hidden lg:block" : "left-0 block"
              }`}
            >
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="bg-white hover:bg-neutral-100 text-[#be1f24] hover:text-[#a1161a] border-y border-r border-gray-200 shadow-md py-4 px-2 rounded-r-xl transition-all active:scale-95 flex items-center justify-center cursor-pointer border-r-2"
                title={isSidebarOpen ? "Hide Filter Sidebar" : "Show Filter Sidebar"}
              >
                {isSidebarOpen ? (
                  <ChevronLeft className="w-5 h-5 stroke-[3]" />
                ) : (
                  <ChevronRight className="w-5 h-5 stroke-[3]" />
                )}
              </button>
            </div>

            {/* Catalog Grid Area */}
            <main className="flex-1 pt-6 pb-6 pr-6 pl-14 lg:pt-8 lg:pb-8 lg:pr-8 lg:pl-16 flex flex-col gap-6 transition-all duration-300">
              {/* Active Filter Indicators */}
              {(selectedKeywords.length > 0 || metadataGrouping || searchQuery || titleFilter || captionFilter) && (
                <div className="flex flex-wrap items-center gap-2 bg-white/40 backdrop-blur-md border border-gray-200/60 p-3 rounded-xl shadow-3xs">
                  <span className="text-[10px] font-mono font-black text-gray-500 uppercase mr-1">
                    Active Queries:
                  </span>
                  
                  {searchQuery && (
                    <span className="text-xs text-[#be1f24] bg-white px-2.5 py-1 rounded-md border border-gray-200 font-black">
                      Search: "{searchQuery}"
                    </span>
                  )}

                  {titleFilter && (
                    <span className="text-xs text-[#be1f24] bg-white px-2.5 py-1 rounded-md border border-gray-200 font-black">
                      Title: "{titleFilter}"
                    </span>
                  )}

                  {captionFilter && (
                    <span className="text-xs text-[#be1f24] bg-white px-2.5 py-1 rounded-md border border-gray-200 font-black">
                      Caption: "{captionFilter}"
                    </span>
                  )}

                  {selectedKeywords.map((kw) => (
                    <span
                      key={`indicator-${kw}`}
                      className="text-xs text-gray-900 bg-gray-50 px-2.5 py-1 rounded-md border border-gray-250 font-black"
                    >
                      Tag: {kw}
                    </span>
                  ))}

                  {metadataGrouping === "photographer" && selectedPhotographer && (
                    <span className="text-xs text-gray-900 bg-gray-50 px-2.5 py-1 rounded-md border border-gray-250 font-black">
                      By: {selectedPhotographer}
                    </span>
                  )}

                  {metadataGrouping === "location" && selectedLocation && (
                    <span className="text-xs text-gray-900 bg-gray-50 px-2.5 py-1 rounded-md border border-gray-250 font-black">
                      In: {selectedLocation}
                    </span>
                  )}

                  {metadataGrouping === "cameraSettings" && selectedCamera && (
                    <span className="text-xs text-gray-900 bg-gray-50 px-2.5 py-1 rounded-md border border-gray-250 font-black">
                      Camera: {selectedCamera}
                    </span>
                  )}

                  {metadataGrouping === "collection" && selectedCollection && (
                    <span className="text-xs text-gray-900 bg-gray-50 px-2.5 py-1 rounded-md border border-gray-250 font-black">
                      Collection: {selectedCollection}
                    </span>
                  )}

                  <button
                    onClick={handleClearFilters}
                    className="text-xs font-black text-[#be1f24] hover:opacity-80 underline ml-auto pl-2 cursor-pointer"
                  >
                    Clear all
                  </button>
                </div>
              )}



               {/* Main Cover for featured best photos, Curated By Admin (Always visible on top of tabs) */}
              {!isLoading && (() => {
                const featuredPhoto = photos.find(p => p.isFeatured && p.status === "Approved") || photos.find(p => p.id === "photo_2" && p.status === "Approved");
                const hasActiveFilters = selectedKeywords.length > 0 || !!metadataGrouping || !!searchQuery || !!titleFilter || !!captionFilter;
                
                if (!featuredPhoto || hasActiveFilters) return null;
                
                return (
                  <motion.div 
                    id="featured-main-cover"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    onClick={() => {
                      setSelectedPhotoForDetails(featuredPhoto);
                    }}
                    className="relative w-full h-[450px] sm:h-[550px] md:h-[650px] rounded-2xl overflow-hidden shadow-md cursor-pointer group transition-all duration-300 hover:shadow-lg border border-gray-100 flex flex-col justify-between p-6 md:p-8 mb-6 select-none"
                    style={{
                      backgroundImage: `url(${featuredPhoto.url})`,
                      backgroundSize: "cover",
                      backgroundPosition: `50% ${featuredPhoto.coverOffsetY !== undefined ? featuredPhoto.coverOffsetY : 50}%`
                    }}
                  >
                    {/* Overlay Gradient for absolute clarity of typography & forms on hover */}
                    <div className="absolute inset-0 bg-black/45 bg-gradient-to-t from-black/80 via-black/40 to-black/50 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none" />
                    
                    {/* Empty top item to allow justify-between spacing */}
                    <div className="hidden md:block" />
 
                    {/* Center Content: Title, subtitle and Search Bar - Visible on Hover */}
                    <div 
                      className="relative z-10 w-full max-w-2xl mx-auto flex flex-col items-center text-center gap-4 py-4 opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 pointer-events-none group-hover:pointer-events-auto transition-all duration-300 ease-out"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex flex-col gap-1 md:gap-2">
                        <h2 className="font-display font-black text-2xl md:text-4xl text-white tracking-tight drop-shadow-md">
                          CHC SYRIA | MEDIA SPACE
                        </h2>
                        <p className="text-xs md:text-sm text-gray-200 font-medium max-w-md mx-auto drop-shadow-xs">
                          Explore our Photo Archive. Search thousands of organized photos, locations, and digital assets.
                        </p>
                      </div>
 
                      <form 
                        onSubmit={(e) => {
                          e.preventDefault();
                          setSearchQuery(coverSearch);
                        }}
                        className="w-full max-w-lg mt-2 relative flex items-center group/form"
                      >
                        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-gray-400 group-focus-within/form:text-[#be1f24] transition-colors">
                          <Search className="w-5 h-5" />
                        </div>
                        <input
                          type="text"
                          placeholder="Search keywords, photographer, location..."
                          value={coverSearch}
                          onChange={(e) => setCoverSearch(e.target.value)}
                          className="w-full pl-12 pr-28 py-3.5 bg-white/95 backdrop-blur-md hover:bg-white text-gray-950 font-sans text-sm rounded-xl transition-all focus:ring-2 focus:ring-[#be1f24] focus:outline-none placeholder-gray-500 shadow-lg border border-white/20"
                        />
                        <button
                          type="submit"
                          className="absolute right-2 top-1/2 -translate-y-1/2 bg-[#be1f24] hover:bg-[#a1161a] text-white text-xs font-black px-4 py-2 rounded-lg cursor-pointer transition-all active:scale-95 shadow-sm uppercase tracking-wider"
                        >
                          Search
                        </button>
                      </form>
                    </div>
 
                    {/* Photographer name shown in small size on bottom right - Always Visible */}
                    <div className="relative z-10 self-end mt-4 md:mt-0 pointer-events-none">
                      <div className="text-[10px] md:text-xs text-white/95 font-semibold tracking-wide bg-black/60 backdrop-blur-xs px-3 py-1.5 rounded-lg border border-white/10 flex items-center gap-1 shadow-sm">
                        <span>© {featuredPhoto.photographer}</span>
                      </div>
                    </div>
                  </motion.div>
                );
              })()}

              {/* Archive / Feed View Toggle Tabs */}
              <div className="flex items-center gap-6 border-b border-gray-200 dark:border-zinc-800 pb-2.5 mb-6">
                <button
                  onClick={() => setActiveTab("archive")}
                  className={`pb-2.5 text-sm font-black tracking-tight border-b-2 transition-all cursor-pointer ${
                    activeTab === "archive"
                      ? "border-[#be1f24] text-[#be1f24] dark:border-red-400 dark:text-red-400 font-extrabold"
                      : "border-transparent text-gray-500 hover:text-gray-855 dark:text-zinc-400 dark:hover:text-zinc-200"
                  }`}
                >
                  Grid
                </button>
                <button
                  onClick={() => setActiveTab("feed")}
                  className={`pb-2.5 text-sm font-black tracking-tight border-b-2 transition-all cursor-pointer ${
                    activeTab === "feed"
                      ? "border-[#be1f24] text-[#be1f24] dark:border-red-400 dark:text-red-400 font-extrabold"
                      : "border-transparent text-gray-500 hover:text-gray-855 dark:text-zinc-400 dark:hover:text-zinc-200"
                  }`}
                >
                  Feed
                </button>
              </div>

              {/* Loading States */}
              {isLoading ? (
                <div className="flex-1 flex flex-col items-center justify-center p-12 min-h-[400px]">
                  <Loader2 className="w-10 h-10 animate-spin text-[#be1f24]" />
                  <h3 className="font-display font-black text-gray-900 mt-4">
                    Loading CHC SYRIA | Media Space...
                  </h3>
                  <p className="text-xs text-gray-500 mt-1 font-mono">
                    Fetching catalog index and archival data.
                  </p>
                </div>
              ) : activeTab === "feed" ? (
                /* Community Feed Tab */
                <CommunityFeed
                  photos={photos}
                  currentUser={currentUser}
                  onReactPhoto={handleReactPhoto}
                  onViewPhoto={setSelectedPhotoForDetails}
                />
              ) : filteredPhotos.length === 0 ? (
                /* Empty State */
                <div className="flex-1 bg-white dark:bg-zinc-900 border border-gray-150 dark:border-zinc-800 rounded-2xl flex flex-col items-center justify-center p-12 text-center min-h-[400px] shadow-xs">
                  <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-zinc-950 text-[#be1f24] flex items-center justify-center mb-4">
                    <Compass className="w-8 h-8" />
                  </div>
                  <h3 className="font-display font-black text-gray-900 dark:text-zinc-100 text-base">
                    No matching archival photos found
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-zinc-400 max-w-sm mt-1 leading-relaxed">
                    Try widening your search keywords, clearing metadata grouping checkmarks, or upload a new photo to index.
                  </p>
                  <button
                    onClick={handleClearFilters}
                    className="mt-5 text-xs text-white bg-[#be1f24] hover:opacity-90 font-black px-4 py-2 rounded-lg shadow-sm transition-colors cursor-pointer uppercase tracking-wider"
                  >
                    Reset Filter Settings
                  </button>
                </div>
              ) : (
                /* Photos Grid - Complex Dynamic Masonry Layout */
                <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4 space-y-4">
                  {sortedPhotos.map((photo) => (
                    <div key={photo.id} className="break-inside-avoid mb-4">
                      <PhotoCard
                        photo={photo}
                        isAdmin={isAdmin}
                        onViewDetails={setSelectedPhotoForDetails}
                        onShare={setSelectedPhotoForShare}
                        onDelete={handleDeletePhoto}
                      />
                    </div>
                  ))}
                </div>
              )}
            </main>
          </div>
        </>
      )}

      {/* Grayscale Brand Footer - Sleek, professional Liquid Glass aesthetic */}
      <footer className="bg-gray-950 text-white py-6 px-8 flex flex-col md:flex-row items-center justify-between gap-4 border-t border-gray-900">
        <div className="flex items-center gap-3">
          {/* Footer Logo */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-5 h-5 text-[#be1f24]"
          >
            <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
          </svg>
          <span className="text-xs font-black tracking-tight font-mono uppercase">
            © 2026 CHC Syria
          </span>
        </div>
        <p className="text-xs font-mono tracking-wide text-gray-400">
          Stories of hope, told in pictures.
        </p>
      </footer>

      {/* Dialog overlays */}
      <PhotoDetailDialog
        photo={selectedPhotoForDetails}
        isOpen={selectedPhotoForDetails !== null}
        onClose={() => setSelectedPhotoForDetails(null)}
        isAdmin={isAdmin}
        currentUser={currentUser}
        viewAsMode={viewAsMode}
        onSavePhoto={handleSavePhoto}
        onDeletePhoto={handleDeletePhoto}
        onPhotoViewed={handlePhotoViewed}
        onPhotoDownloaded={handlePhotoDownloaded}
        onApprovePhoto={handleApprovePhoto}
        onFeaturePhoto={handleFeaturePhoto}
        onApplySmartFilter={handleApplySmartFilter}
        onReactPhoto={handleReactPhoto}
        availableCollections={availableCollections}
        onAddCollection={handleCreateCollection}
        onVisitProfile={handleVisitProfile}
        photographers={photographers}
      />

      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onPhotoUploaded={handlePhotoUploaded}
        currentUser={currentUser}
        photographers={photographers}
      />

      <ShareDialog
        photo={selectedPhotoForShare}
        isOpen={selectedPhotoForShare !== null}
        onClose={() => setSelectedPhotoForShare(null)}
      />

      <UserProfileDialog
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        currentUser={currentUser}
        onUpdateProfile={(updatedUser) => {
          setCurrentUser(updatedUser);
          safeSaveUserToLocalStorage(updatedUser);
        }}
        photos={photos}
        onViewPhoto={setSelectedPhotoForDetails}
      />

      {/* Floating view simulation banner */}
      {actualIsAdmin && viewAsMode !== "admin" && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-amber-600 dark:bg-amber-700 text-white font-sans text-[11px] font-black px-4 py-2.5 rounded-full shadow-lg flex items-center gap-3 border border-amber-500 animate-bounce uppercase tracking-wider">
          <span>Viewing as: Guest / Public View</span>
          <button
            onClick={() => setViewAsMode("admin")}
            className="bg-white text-amber-700 hover:bg-amber-50 px-2.5 py-1 rounded-full font-black transition-all cursor-pointer"
          >
            Reset to Admin
          </button>
        </div>
      )}

      <CustomDialog />
    </div>
  );
}
