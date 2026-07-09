import React, { useState } from "react";
import { Download, Eye, Share2, Trash2, MapPin, ThumbsUp, Heart, Lightbulb, Folder } from "lucide-react";
import { Photo } from "../types";
import { dialogService } from "../lib/dialog";

interface PhotoCardProps {
  photo: Photo;
  isAdmin: boolean;
  onViewDetails: (photo: Photo) => void;
  onShare: (photo: Photo) => void;
  onDelete: (id: string) => void | Promise<void>;
}

export default function PhotoCard({
  photo,
  isAdmin,
  onViewDetails,
  onShare,
  onDelete,
}: PhotoCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [aspectClass, setAspectClass] = useState("aspect-4/5"); // default layout

  // Stable pseudo-random shuffle index based on photo ID to ensure deterministic sizing without flashing
  const shuffleIndex = React.useMemo(() => {
    let hash = 0;
    const idStr = photo.id || "";
    for (let i = 0; i < idStr.length; i++) {
      hash = idStr.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash) % 3; // 0, 1, or 2
  }, [photo.id]);

  // Detect image orientation dynamically and apply dynamic, shuffled size classes
  React.useEffect(() => {
    if (photo.url) {
      const img = new Image();
      img.src = photo.url;
      img.onload = () => {
        const isLandscape = img.naturalWidth > img.naturalHeight;
        if (isLandscape) {
          // Shuffled Landscape options
          if (shuffleIndex === 0) {
            setAspectClass("aspect-[16/10]"); // Slightly taller landscape
          } else if (shuffleIndex === 1) {
            setAspectClass("aspect-[4/3]"); // Standard landscape
          } else {
            setAspectClass("aspect-[16/9]"); // Cinematic wide landscape
          }
        } else {
          // Shuffled Portrait/Vertical options
          if (shuffleIndex === 0) {
            setAspectClass("aspect-[2/3] md:aspect-[3/5]"); // Super tall vertical (Bigger!)
          } else if (shuffleIndex === 1) {
            setAspectClass("aspect-[3/4]"); // Standard portrait
          } else {
            setAspectClass("aspect-[1/1]"); // Square ratio (Shorter, contrasting!)
          }
        }
      };
    }
  }, [photo.url, shuffleIndex]);

  // Trigger high-res download
  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Use original file name of the photo as the downloaded filename
    let originalFileStr = photo?.originalFileName || "";
    // Fallback to URL's filename if originalFileName is missing or empty
    if (!originalFileStr && photo?.url) {
      try {
        const urlParts = photo.url.split('/');
        const lastPart = urlParts[urlParts.length - 1];
        if (lastPart && !lastPart.startsWith("data:") && !lastPart.startsWith("blob:")) {
          originalFileStr = lastPart.split('?')[0];
        }
      } catch (err) {
        // Ignore fallback errors
      }
    }

    if (!originalFileStr) {
      originalFileStr = photo?.title || "photo";
    }

    // Get the base name without extension
    let baseName = originalFileStr;
    const lastDotIndex = originalFileStr.lastIndexOf('.');
    if (lastDotIndex > 0) {
      baseName = originalFileStr.substring(0, lastDotIndex);
    }

    // Replace spaces with underscores
    baseName = baseName.replace(/\s+/g, "_");

    const link = document.createElement("a");
    link.href = photo.url;
    link.download = `${baseName}_Original.jpg`;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div
      id={`photo-card-${photo.id}`}
      className="group relative flex flex-col bg-white dark:bg-zinc-950 rounded-xl overflow-hidden border border-gray-100 dark:border-zinc-900/80 hover:shadow-lg dark:hover:shadow-black/20 transition-all duration-300 h-full cursor-pointer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onViewDetails(photo)}
    >
      {/* Image Container */}
      <div className={`relative ${aspectClass} w-full bg-gray-50 dark:bg-zinc-900 overflow-hidden`}>
        <img
          src={photo.url}
          alt={photo.altText || photo.title}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />

        {/* Location tag on image */}
        <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md text-white px-2.5 py-1 rounded-full text-[10px] font-medium flex items-center gap-1 border border-white/10">
          <MapPin className="w-3 h-3 text-[#be1f24]" />
          <span>{photo.location.split(",")[0]}</span>
        </div>

        {/* Delete button for Admin on image */}
        {isAdmin && (
          <button
            onClick={async (e) => {
              e.stopPropagation();
              const confirmed = await dialogService.confirm(
                `Are you sure you want to delete "${photo.title}" from the humanitarian archive?`,
                {
                  title: "Delete From Archive",
                  variant: "danger",
                  confirmText: "Delete",
                }
              );
              if (confirmed) {
                onDelete(photo.id);
              }
            }}
            className="absolute top-3 right-3 p-1.5 rounded-full bg-white/90 dark:bg-zinc-900/90 text-red-700 hover:bg-red-700 hover:text-white shadow-sm transition-colors cursor-pointer z-10"
            title="Delete photo from archive"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}


      </div>

      {/* Catalog Info - Clean text and beautiful padding */}
      <div className="p-4 flex-1 flex flex-col justify-between gap-3 bg-white dark:bg-zinc-950">
        <div>
          {/* Photographer and Views line */}
          <div className="flex items-center justify-between text-[10px] font-mono text-gray-450 dark:text-zinc-500 font-medium">
            <span>By {photo.photographer} • {photo.dateCreated}</span>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 text-gray-500 dark:text-zinc-400" title={`${photo.views || 0} visits`}>
                <Eye className="w-3.5 h-3.5 text-gray-400 dark:text-zinc-500" />
                <span>{photo.views || 0}</span>
              </span>
              <span className="flex items-center gap-1 text-gray-500 dark:text-zinc-400" title={`${photo.downloads || 0} downloads`}>
                <Download className="w-3.5 h-3.5 text-gray-400 dark:text-zinc-500" />
                <span>{photo.downloads || 0}</span>
              </span>
            </div>
          </div>
          {/* Title */}
          <h3 className="font-sans font-black text-sm text-gray-950 dark:text-zinc-100 line-clamp-1 mt-1 leading-snug group-hover:text-[#be1f24] dark:group-hover:text-[#be1f24] transition-colors" title={photo.title}>
            {photo.title}
          </h3>

          {/* Reaction counts and Collection details */}
          <div className="flex flex-wrap items-center gap-2.5 mt-2 text-[11px] text-gray-500 dark:text-zinc-400 font-medium select-none">
            <span className="flex items-center gap-1" title="Likes">
              <ThumbsUp className="w-3.5 h-3.5 text-gray-400 dark:text-zinc-500" /> {photo.reactions?.like || 0}
            </span>
            <span className="flex items-center gap-1" title="Loves">
              <Heart className="w-3.5 h-3.5 text-[#be1f24] fill-[#be1f24]" /> {photo.reactions?.love || 0}
            </span>
            <span className="flex items-center gap-1" title="Inspirational reactions">
              <Lightbulb className="w-3.5 h-3.5 text-gray-400 dark:text-zinc-500" /> {photo.reactions?.inspiring || 0}
            </span>
            {photo.collection && (
              <span className="text-[10px] text-[#be1f24] font-black bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded px-1.5 py-0.5 max-w-[150px] truncate flex items-center gap-1" title={`Collection: ${photo.collection}`}>
                <Folder className="w-3 h-3 text-[#be1f24] shrink-0" /> {photo.collection}
              </span>
            )}
          </div>
        </div>

        {/* Badges/Tags matching Screenshot 1 exactly */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1.5">
            {photo.keywords.slice(0, 3).map((tag, i) => (
              <span
                key={`${photo.id}-tag-${i}`}
                className="text-[10px] font-medium text-gray-600 dark:text-zinc-300 bg-gray-100 dark:bg-zinc-900 border border-gray-200/50 dark:border-zinc-800/50 px-2 py-0.5 rounded"
              >
                {tag}
              </span>
            ))}
          </div>

          {/* Show pending badge on the card for admins/creators */}
          {photo.status === "Pending" && (
            <span className="text-[9px] font-bold tracking-wider font-mono text-amber-700 bg-amber-50 dark:text-amber-400 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 px-1.5 py-0.5 rounded animate-pulse shrink-0">
              PENDING
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
