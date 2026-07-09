import React, { useState, useEffect } from "react";
import { X, Edit2, Check, User, Mail, Shield, Bell, Image as ImageIcon, Sparkles, Upload } from "lucide-react";
import { UserAccount, Photo } from "../types";
import { dialogService } from "../lib/dialog";

interface UserProfileDialogProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserAccount;
  onUpdateProfile: (updated: UserAccount) => void;
  photos: Photo[];
  onViewPhoto: (photo: Photo) => void;
}

export default function UserProfileDialog({
  isOpen,
  onClose,
  currentUser,
  onUpdateProfile,
  photos,
  onViewPhoto,
}: UserProfileDialogProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [bio, setBio] = useState(currentUser.bio || "No biography provided yet. Write something inspiring!");
  const [avatarUrl, setAvatarUrl] = useState(currentUser.avatarUrl || "");
  const [coverUrl, setCoverUrl] = useState(currentUser.coverUrl || "");
  const [coverOffsetY, setCoverOffsetY] = useState(currentUser.coverOffsetY !== undefined ? currentUser.coverOffsetY : 50);
  const [isSaving, setIsSaving] = useState(false);

  // Drag states for repositioning cover
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);
  const [startOffsetY, setStartOffsetY] = useState(50);

  // Sync state with current user changes
  useEffect(() => {
    if (currentUser) {
      setBio(currentUser.bio || "No biography provided yet. Write something inspiring!");
      setAvatarUrl(currentUser.avatarUrl || "");
      setCoverUrl(currentUser.coverUrl || "");
      setCoverOffsetY(currentUser.coverOffsetY !== undefined ? currentUser.coverOffsetY : 50);
    }
  }, [currentUser]);

  if (!isOpen) return null;

  // Filter photos uploaded by this user
  const userUploadedPhotos = photos.filter(
    (p) => p.uploadedBy === currentUser.email || p.photographer === currentUser.name
  );

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`/api/users/${currentUser.id}/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bio, avatarUrl, coverUrl, coverOffsetY }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.user) {
          onUpdateProfile(data.user);
          setIsEditing(false);
        }
      }
    } catch (err) {
      console.error("Failed to update user profile:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleMarkNotificationsRead = async () => {
    try {
      const res = await fetch(`/api/users/${currentUser.id}/notifications/read`, {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.user) {
          onUpdateProfile(data.user);
        }
      }
    } catch (err) {
      console.error("Failed to read notifications:", err);
    }
  };

  // Resize and compress images to keep payload size tiny (solving QuotaExceededError in localStorage)
  const resizeImage = (file: File, maxWidth: number, maxHeight: number): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let width = img.width;
          let height = img.height;

          // Calculate new dimensions keeping aspect ratio
          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            // Convert to JPEG with medium-high compression (75% quality)
            resolve(canvas.toDataURL("image/jpeg", 0.75));
          } else {
            resolve(e.target?.result as string || "");
          }
        };
        img.onerror = () => resolve(e.target?.result as string || "");
        img.src = e.target?.result as string;
      };
      reader.onerror = () => resolve("");
      reader.readAsDataURL(file);
    });
  };

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      await dialogService.alert("Please select a valid image file (PNG, JPG, WEBP).", {
        title: "Invalid File Format",
        variant: "warning"
      });
      return;
    }

    try {
      const compressed = await resizeImage(file, 160, 160);
      if (compressed) {
        setAvatarUrl(compressed);
      }
    } catch (err) {
      console.error("Failed to compress avatar image:", err);
    }
  };

  const handleCoverFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      await dialogService.alert("Please select a valid image file (PNG, JPG, WEBP).", {
        title: "Invalid File Format",
        variant: "warning"
      });
      return;
    }

    try {
      const compressed = await resizeImage(file, 800, 266);
      if (compressed) {
        setCoverUrl(compressed);
      }
    } catch (err) {
      console.error("Failed to compress cover image:", err);
    }
  };

  const unreadNotifications = currentUser.notifications?.filter((n) => !n.read) || [];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
      {/* Overlay Backdrop */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity" onClick={onClose} />

      {/* Modal Container */}
      <div className="relative bg-white dark:bg-zinc-950 w-full max-w-3xl rounded-2xl overflow-hidden shadow-2xl border border-gray-100 dark:border-zinc-850 z-10 max-h-[90vh] flex flex-col animate-fade-in select-none">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 rounded-full bg-black/40 text-white hover:bg-black/60 transition-all cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="overflow-y-auto flex-1 flex flex-col">
          {/* 3:1 Cover Image */}
          <div
            className={`relative aspect-[3/1] w-full bg-gradient-to-r from-neutral-800 to-neutral-950 overflow-hidden ${
              isEditing ? "cursor-ns-resize select-none" : ""
            }`}
            onMouseDown={(e) => {
              if (!isEditing || !coverUrl) return;
              e.preventDefault();
              setIsDragging(true);
              setStartY(e.clientY);
              setStartOffsetY(coverOffsetY);
            }}
            onMouseMove={(e) => {
              if (!isDragging || !coverUrl) return;
              const height = e.currentTarget.clientHeight || 150;
              const deltaY = e.clientY - startY;
              const percentDelta = (deltaY / height) * 100;
              let newOffset = startOffsetY + percentDelta;
              if (newOffset < 0) newOffset = 0;
              if (newOffset > 100) newOffset = 100;
              setCoverOffsetY(Math.round(newOffset));
            }}
            onMouseUp={() => setIsDragging(false)}
            onMouseLeave={() => setIsDragging(false)}
          >
            {coverUrl ? (
              <img
                src={coverUrl}
                alt="Profile Cover"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover opacity-85 pointer-events-none"
                style={{ objectPosition: `center ${coverOffsetY}%` }}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-white/15 select-none font-display font-extrabold text-2xl uppercase tracking-widest p-4">
                christian hope center
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
            
            {isEditing && (
              <div className="absolute top-4 left-4 z-20">
                <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-white bg-black/60 hover:bg-black/80 border border-white/25 px-3 py-1.5 rounded-lg cursor-pointer transition-all shadow-sm">
                  <ImageIcon className="w-3.5 h-3.5 text-gray-300" />
                  <span>Upload Cover File</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleCoverFileChange}
                    className="hidden"
                  />
                </label>
              </div>
            )}

            {isEditing && coverUrl && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none">
                <span className="bg-black/60 text-white text-[10px] font-semibold px-2.5 py-1 rounded-full border border-white/10 uppercase tracking-wider font-mono">
                  {isDragging ? "Repositioning..." : "Drag image up/down to reposition"}
                </span>
              </div>
            )}
          </div>

          {/* User Details Area */}
          <div className="relative px-6 pb-6 pt-16 flex flex-col gap-5 border-b border-gray-100 dark:border-zinc-850">
            {/* Avatar overlay overlapping cover */}
            <div className="absolute -top-12 left-6 group">
              <div className="relative w-24 h-24 rounded-full border-4 border-white dark:border-zinc-950 bg-gray-100 dark:bg-zinc-800 shadow-md overflow-hidden">
                <img
                  src={avatarUrl || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(currentUser.email)}`}
                  alt={currentUser.name}
                  className="w-full h-full object-cover"
                />
                
                {isEditing && (
                  <label
                    htmlFor="avatar-file-upload"
                    className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white cursor-pointer hover:bg-black/75 transition-all text-[10px] font-bold uppercase tracking-wider text-center p-1"
                  >
                    <Edit2 className="w-3.5 h-3.5 mb-1 text-gray-300" />
                    <span>Upload</span>
                    <input
                      id="avatar-file-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarFileChange}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>

            {/* Title & Actions Row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex flex-col">
                <h2 className="font-display font-extrabold text-xl text-gray-950 dark:text-zinc-50 tracking-tight flex items-center gap-2">
                  <span>{currentUser.name}</span>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full uppercase bg-gray-100 dark:bg-zinc-900 text-[#be1f24] dark:text-red-400 border border-gray-200 dark:border-zinc-800">
                    {currentUser.role}
                  </span>
                </h2>
                <div className="flex items-center gap-1 text-xs text-gray-400 dark:text-zinc-500 mt-1">
                  <Mail className="w-3.5 h-3.5" />
                  <span>{currentUser.email}</span>
                </div>
              </div>

              {/* Edit Buttons */}
              <div className="flex items-center gap-2 self-start sm:self-auto">
                {isEditing ? (
                  <>
                    <button
                      onClick={handleSaveProfile}
                      disabled={isSaving}
                      className="flex items-center gap-1 text-xs text-white bg-green-700 hover:bg-green-800 px-3.5 py-2 rounded-lg font-bold shadow-sm transition-colors cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{isSaving ? "Saving..." : "Save Profile"}</span>
                    </button>
                    <button
                      onClick={() => {
                        setIsEditing(false);
                        setBio(currentUser.bio || "");
                        setAvatarUrl(currentUser.avatarUrl || "");
                        setCoverUrl(currentUser.coverUrl || "");
                      }}
                      className="text-xs text-gray-500 hover:text-gray-800 dark:text-zinc-400 dark:hover:text-zinc-200 bg-gray-100 dark:bg-zinc-900 px-3.5 py-2 rounded-lg font-bold transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center gap-1 text-xs text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 px-3.5 py-2 rounded-lg font-bold transition-all cursor-pointer shadow-3xs dark:bg-zinc-900 dark:hover:bg-zinc-800 dark:text-zinc-200 dark:border-zinc-800"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-[#be1f24]" />
                    <span>Edit Profile</span>
                  </button>
                )}
              </div>
            </div>

            {/* Biography Profile Content */}
            <div className="bg-gray-50/50 dark:bg-zinc-900/40 rounded-xl border border-gray-100 dark:border-zinc-850 p-4 mt-2">
              <span className="text-[10px] uppercase font-mono tracking-wider font-bold text-gray-400 dark:text-zinc-500 block mb-1.5">
                Biography & Mission
              </span>
              {isEditing ? (
                <div className="flex flex-col gap-3">
                  <textarea
                    rows={3}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className="w-full text-sm text-gray-700 dark:text-zinc-200 bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-lg p-2.5 focus:outline-none focus:border-[#be1f24] resize-none"
                    placeholder="Tell the community about your photographic journey or humanitarian missions..."
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-mono uppercase font-bold text-gray-400 dark:text-zinc-500">Avatar Image</label>
                      <label className="flex items-center justify-center gap-2 w-full bg-white dark:bg-zinc-950 hover:bg-gray-50 dark:hover:bg-zinc-900 text-gray-700 dark:text-zinc-200 border border-gray-200 dark:border-zinc-800 rounded-lg py-2.5 px-4 text-xs font-bold transition-all cursor-pointer shadow-3xs hover:border-[#be1f24] focus-within:border-[#be1f24]">
                        <Upload className="w-4 h-4 text-[#be1f24]" />
                        <span>{avatarUrl ? "Replace Avatar" : "Upload Avatar"}</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleAvatarFileChange}
                          className="hidden"
                        />
                      </label>
                      {avatarUrl && (
                        <div className="flex items-center gap-2 mt-1 px-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                          <span className="text-[10px] text-gray-500 dark:text-zinc-400 font-medium truncate">Avatar uploaded</span>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-mono uppercase font-bold text-gray-400 dark:text-zinc-500">3:1 Cover Image</label>
                      <label className="flex items-center justify-center gap-2 w-full bg-white dark:bg-zinc-950 hover:bg-gray-50 dark:hover:bg-zinc-900 text-gray-700 dark:text-zinc-200 border border-gray-200 dark:border-zinc-800 rounded-lg py-2.5 px-4 text-xs font-bold transition-all cursor-pointer shadow-3xs hover:border-[#be1f24] focus-within:border-[#be1f24]">
                        <ImageIcon className="w-4 h-4 text-[#be1f24]" />
                        <span>{coverUrl ? "Replace Cover" : "Upload Cover"}</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleCoverFileChange}
                          className="hidden"
                        />
                      </label>
                      {coverUrl && (
                        <div className="flex items-center gap-2 mt-1 px-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                          <span className="text-[10px] text-gray-500 dark:text-zinc-400 font-medium truncate">Cover uploaded</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-600 dark:text-zinc-300 leading-relaxed font-sans italic">
                  "{bio}"
                </p>
              )}
            </div>
          </div>

          {/* Lower Dynamic Panels: Gallery & Notifications */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6">
            {/* Left/Middle Panels: User's Uploaded Photo Gallery */}
            <div className="md:col-span-2 flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-zinc-850 pb-2">
                <div className="flex items-center gap-1.5 text-gray-800 dark:text-zinc-200">
                  <ImageIcon className="w-4 h-4 text-[#be1f24]" />
                  <h3 className="font-display font-bold text-xs uppercase tracking-wider text-gray-700 dark:text-zinc-300">
                    My Uploaded Photos ({userUploadedPhotos.length})
                  </h3>
                </div>
              </div>

              {userUploadedPhotos.length === 0 ? (
                <div className="bg-gray-50/40 dark:bg-zinc-900/40 rounded-xl p-8 border border-dashed border-gray-200 dark:border-zinc-800 text-center flex flex-col items-center justify-center">
                  <ImageIcon className="w-8 h-8 text-gray-300 dark:text-zinc-700 mb-2" />
                  <span className="text-xs text-gray-500 dark:text-zinc-400 font-medium">No photos uploaded yet</span>
                  <span className="text-[10px] text-gray-400 dark:text-zinc-500 mt-1">Uploaded files will display in this portfolio.</span>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-1">
                  {userUploadedPhotos.map((photo) => (
                    <div
                      key={photo.id}
                      onClick={() => {
                        onViewPhoto(photo);
                        onClose();
                      }}
                      className="group relative aspect-16/9 rounded-lg overflow-hidden border border-gray-100 dark:border-zinc-850 bg-gray-100 dark:bg-zinc-900 cursor-pointer shadow-3xs"
                    >
                      <img
                        src={photo.url}
                        alt={photo.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-2">
                        <span className="text-white text-[11px] font-bold truncate max-w-full">
                          {photo.title}
                        </span>
                      </div>
                      {photo.status === "Pending" && (
                        <span className="absolute bottom-1.5 left-1.5 text-[8px] font-mono font-extrabold bg-[#be1f24] text-white px-1.5 py-0.5 rounded shadow-2xs">
                          PENDING
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right Panel: Notification Feed */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-zinc-850 pb-2">
                <div className="flex items-center gap-1.5 text-gray-800 dark:text-zinc-200">
                  <Bell className="w-4 h-4 text-[#be1f24]" />
                  <h3 className="font-display font-bold text-xs uppercase tracking-wider text-gray-700 dark:text-zinc-300">
                    Notifications ({unreadNotifications.length})
                  </h3>
                </div>
                {unreadNotifications.length > 0 && (
                  <button
                    onClick={handleMarkNotificationsRead}
                    className="text-[10px] font-bold text-[#be1f24] hover:underline"
                  >
                    Clear All
                  </button>
                )}
              </div>

              <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-1">
                {!currentUser.notifications || currentUser.notifications.length === 0 ? (
                  <div className="bg-gray-50/40 dark:bg-zinc-900/40 rounded-xl p-6 border border-dashed border-gray-200 dark:border-zinc-800 text-center flex flex-col items-center justify-center">
                    <Bell className="w-6 h-6 text-gray-300 dark:text-zinc-700 mb-2" />
                    <span className="text-[11px] text-gray-400 dark:text-zinc-500">All caught up! No recent alerts.</span>
                  </div>
                ) : (
                  currentUser.notifications.map((notif) => (
                    <div
                      key={notif.id}
                      className={`p-2.5 rounded-lg border text-left transition-colors flex flex-col gap-1 ${
                        notif.read
                          ? "bg-gray-50 dark:bg-zinc-900/40 border-gray-100 dark:border-zinc-900 opacity-60"
                          : "bg-neutral-50/60 dark:bg-zinc-900 border-neutral-200 dark:border-zinc-800"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[11px] font-bold text-gray-800 dark:text-zinc-200 flex items-center gap-1">
                          {!notif.read && <span className="w-1.5 h-1.5 rounded-full bg-[#be1f24] inline-block animate-pulse"></span>}
                          <span>Approval Alert</span>
                        </span>
                        <span className="text-[9px] text-gray-400 dark:text-zinc-500 font-mono">
                          {new Date(notif.timestamp).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-600 dark:text-zinc-450 leading-normal">
                        {notif.message}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
