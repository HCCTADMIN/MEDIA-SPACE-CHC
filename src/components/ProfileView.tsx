import React from "react";
import { ArrowLeft, Camera, User, Eye, Download, Mail, Shield, Calendar, Image as ImageIcon } from "lucide-react";
import { Photo, UserAccount, Photographer } from "../types";
import PhotoCard from "./PhotoCard";

interface ProfileViewProps {
  type: "photographer" | "user";
  slug: string;
  photos: Photo[];
  users: UserAccount[];
  photographers?: Photographer[];
  isAdmin: boolean;
  onViewDetails: (photo: Photo) => void;
  onShare: (photo: Photo) => void;
  onDelete: (id: string) => void;
  onBack: () => void;
}

export default function ProfileView({
  type,
  slug,
  photos,
  users,
  photographers = [],
  isAdmin,
  onViewDetails,
  onShare,
  onDelete,
  onBack,
}: ProfileViewProps) {
  // 1. Resolve photographer or user info
  let displayName = "";
  let subTitle = "";
  let bio = "";
  let roleLabel = "";
  let avatarInitials = "";
  let emailText = "";
  let memberSince = "";
  let profilePhotos: Photo[] = [];
  let customAvatarUrl = "";
  let customCoverUrl = "";

  if (type === "photographer") {
    // Find photos matching photographer slug
    profilePhotos = photos.filter((p) => {
      if (!p.photographer) return false;
      const phSlug = p.photographer.toLowerCase().trim().replace(/[^a-z0-9]+/g, ".");
      return phSlug === slug;
    });

    // Find actual photographer object by matching slug
    const matchingPh = (photographers || []).find((ph) => {
      const phSlug = ph.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, ".");
      return phSlug === slug;
    });

    if (matchingPh) {
      displayName = matchingPh.name;
      bio = matchingPh.bio;
      customAvatarUrl = matchingPh.avatarUrl;
      customCoverUrl = matchingPh.coverUrl;
      memberSince = matchingPh.joinedDate || "2026-01-01";
    } else {
      const foundName = profilePhotos[0]?.photographer;
      displayName = foundName || slug.split(".").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
      bio = `Registered documentary photographer for Christian Hope Center (CHC) Syria. Specialized in field capturing, relief aid dispatches, and community reporting.`;
      memberSince = profilePhotos[0]?.dateCreated || "2026-01-01";
    }

    subTitle = "CHC Staff Photographer";
    roleLabel = "Photographer";
    avatarInitials = displayName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  } else {
    // Find photos uploaded by user matching slug
    profilePhotos = photos.filter((p) => {
      const uploaderEmail = p.uploadedBy || "archive.staff@chcsyria.org";
      const uploaderSlug = uploaderEmail.split("@")[0].toLowerCase().trim().replace(/[^a-z0-9]+/g, ".");
      return uploaderSlug === slug;
    });

    // Find actual user obj from registered users
    const matchingUser = users.find((u) => {
      const userSlug = u.email.split("@")[0].toLowerCase().trim().replace(/[^a-z0-9]+/g, ".");
      return userSlug === slug;
    });

    if (matchingUser) {
      displayName = matchingUser.name;
      emailText = matchingUser.email;
      subTitle = `${matchingUser.role} Account`;
      bio = matchingUser.bio || `Contributor member at Christian Hope Center Syria, supporting digital media curation, catalog tagging, and historical archiving.`;
      roleLabel = matchingUser.role;
      avatarInitials = displayName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
      memberSince = matchingUser.createdAt ? matchingUser.createdAt.split("T")[0] : "2026-01-01";
    } else {
      // Fallback if user is not in list but uploaded photos
      const fallbackEmail = profilePhotos[0]?.uploadedBy || `${slug}@chcsyria.org`;
      displayName = slug.split(".").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
      emailText = fallbackEmail;
      subTitle = "Contributor Account";
      bio = "Active catalog contributor specializing in high-impact humanitarian journalism and emergency aid uploads.";
      roleLabel = "Contributor";
      avatarInitials = displayName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
      memberSince = "2026-01-01";
    }
  }

  // 2. Statistics calculation
  const totalPhotos = profilePhotos.length;
  const totalViews = profilePhotos.reduce((sum, p) => sum + (p.views || 0), 0);
  const totalDownloads = profilePhotos.reduce((sum, p) => sum + (p.downloads || 0), 0);

  // Status Badge styling
  const roleColors: Record<string, string> = {
    Admin: "text-[#be1f24] bg-neutral-100 border-neutral-300 dark:bg-neutral-900/30 dark:border-neutral-800",
    Contributor: "text-indigo-700 bg-indigo-50 border-indigo-200 dark:text-indigo-400 dark:bg-indigo-950/30 dark:border-indigo-900",
    Photographer: "text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-950/30 dark:border-emerald-900",
    Guest: "text-gray-700 bg-gray-50 border-gray-200 dark:text-zinc-400 dark:bg-zinc-900/40 dark:border-zinc-800",
  };

  const currentRoleColor = roleColors[roleLabel] || "text-gray-700 bg-gray-50 border-gray-200";

  return (
    <div className="flex-1 bg-neutral-50 dark:bg-zinc-950 flex flex-col min-h-screen text-gray-900 dark:text-zinc-100">
      {/* Dynamic Profile Header / Banner */}
      <div className="relative bg-gray-950 dark:bg-zinc-950 text-white overflow-hidden py-10 md:py-14 px-6 md:px-12 border-b border-gray-900 dark:border-zinc-950 shadow-inner">
        {/* Absolute dynamic background texture */}
        {customCoverUrl ? (
          <div 
            className="absolute inset-0 bg-cover bg-center opacity-30 select-none pointer-events-none"
            style={{ backgroundImage: `url(${customCoverUrl})` }}
          />
        ) : (
          <div className="absolute inset-0 bg-radial-gradient from-neutral-900 to-zinc-950 opacity-90" />
        )}
        <div className="absolute inset-0 bg-zinc-950/40" />
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.03] pointer-events-none" />

        {/* Back Button */}
        <div className="relative z-10 max-w-7xl mx-auto mb-6">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-gray-400 hover:text-white bg-white/10 hover:bg-white/15 px-3.5 py-2 rounded-lg border border-white/10 backdrop-blur-xs transition-all active:scale-95 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Archival Library</span>
          </button>
        </div>

        {/* Hero Bio Content */}
        <div className="relative z-10 max-w-7xl mx-auto flex flex-col md:flex-row items-center md:items-start gap-6 md:gap-10">
          {/* Custom high-contrast dynamic Avatar */}
          {customAvatarUrl ? (
            <img 
              src={customAvatarUrl} 
              alt={displayName} 
              className="w-20 h-20 md:w-24 md:h-24 rounded-2xl object-cover shadow-lg border border-white/15"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-gradient-to-br from-[#be1f24] to-red-950 flex items-center justify-center font-display font-black text-2xl md:text-3xl text-white shadow-lg border border-white/15 uppercase tracking-tighter">
              {avatarInitials || "PH"}
            </div>
          )}

          {/* Core Info */}
          <div className="flex-1 text-center md:text-left flex flex-col gap-2">
            <div className="flex flex-col md:flex-row items-center md:items-baseline gap-2.5">
              <h1 className="font-display font-black text-2xl md:text-3xl tracking-tight uppercase">
                {displayName}
              </h1>
              <span className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${currentRoleColor}`}>
                {roleLabel}
              </span>
            </div>

            <p className="text-xs text-gray-400 font-mono flex items-center justify-center md:justify-start gap-1.5 leading-none">
              {type === "photographer" ? (
                <>
                  <Camera className="w-3.5 h-3.5 text-[#be1f24]" />
                  <span>Documentary Artist Profile</span>
                </>
              ) : (
                <>
                  <User className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Curator Portfolio • {emailText || `${slug}@chcsyria.org`}</span>
                </>
              )}
            </p>

            <p className="text-xs md:text-sm text-gray-300 max-w-2xl mt-1.5 leading-relaxed">
              {bio}
            </p>

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mt-2 text-[10px] font-mono text-gray-400">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-gray-500" />
                <span>ACTIVE SINCE {memberSince}</span>
              </span>
            </div>
          </div>

          {/* Stats Badges Dashboard */}
          <div className="grid grid-cols-3 gap-2.5 w-full md:w-auto md:min-w-[340px] mt-2 md:mt-0">
            <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center backdrop-blur-xs flex flex-col items-center justify-center">
              <ImageIcon className="w-4 h-4 text-[#be1f24] mb-1" />
              <span className="text-sm font-black tracking-tight leading-none text-white font-mono">
                {totalPhotos}
              </span>
              <span className="text-[9px] text-gray-400 font-mono uppercase tracking-wider mt-1 leading-none">
                Photos
              </span>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center backdrop-blur-xs flex flex-col items-center justify-center">
              <Eye className="w-4 h-4 text-emerald-400 mb-1" />
              <span className="text-sm font-black tracking-tight leading-none text-white font-mono">
                {totalViews}
              </span>
              <span className="text-[9px] text-gray-400 font-mono uppercase tracking-wider mt-1 leading-none">
                Views
              </span>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center backdrop-blur-xs flex flex-col items-center justify-center">
              <Download className="w-4 h-4 text-indigo-400 mb-1" />
              <span className="text-sm font-black tracking-tight leading-none text-white font-mono">
                {totalDownloads}
              </span>
              <span className="text-[9px] text-gray-400 font-mono uppercase tracking-wider mt-1 leading-none">
                Downloads
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Photo Portfolio Grid */}
      <div className="max-w-7xl w-full mx-auto p-6 md:p-8 flex flex-col gap-6 flex-1">
        <div className="border-b border-gray-200 dark:border-zinc-900 pb-3 flex items-center justify-between">
          <h2 className="font-display font-black text-sm uppercase tracking-wider text-gray-500 dark:text-zinc-500 flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-[#be1f24]" />
            <span>Archival Contributions ({totalPhotos})</span>
          </h2>
        </div>

        {profilePhotos.length === 0 ? (
          <div className="bg-white dark:bg-zinc-950 border border-gray-150 dark:border-zinc-900 rounded-2xl p-12 text-center shadow-3xs flex flex-col items-center justify-center">
            <ImageIcon className="w-10 h-10 text-gray-300 mb-3" />
            <h3 className="font-display font-bold text-gray-800 dark:text-zinc-200">No photos published yet</h3>
            <p className="text-xs text-gray-400 mt-1 max-w-sm">
              Photos uploaded by this curator or taken by this photographer require administrator approval before publication.
            </p>
          </div>
        ) : (
          <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-4 space-y-4">
            {profilePhotos.map((photo) => (
              <div key={photo.id} className="break-inside-avoid mb-4">
                <PhotoCard
                  photo={photo}
                  isAdmin={isAdmin}
                  onViewDetails={onViewDetails}
                  onShare={onShare}
                  onDelete={onDelete}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
