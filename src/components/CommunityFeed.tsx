import React, { useState, useEffect } from "react";
import { Photo, UserAccount } from "../types";
import { Loader2, Heart, ThumbsUp, Lightbulb, MessageSquare, Image as ImageIcon, Calendar, User } from "lucide-react";

interface CommunityFeedProps {
  photos: Photo[];
  currentUser: UserAccount;
  onReactPhoto: (
    id: string,
    reactions: { like: number; love: number; inspiring: number },
    userReactions: { like?: string[]; love?: string[]; inspiring?: string[] }
  ) => void;
  onViewPhoto: (photo: Photo) => void;
}

export default function CommunityFeed({
  photos,
  currentUser,
  onReactPhoto,
  onViewPhoto,
}: CommunityFeedProps) {
  // Only show approved photos in the feed
  const approvedPhotos = [...photos]
    .filter((p) => p.status === "Approved")
    .sort((a, b) => {
      const dateA = new Date(a.dateCreated).getTime() || 0;
      const dateB = new Date(b.dateCreated).getTime() || 0;
      return dateB - dateA; // Newest first
    });

  // Infinite Scroll / Progressive Loading
  const [visibleCount, setVisibleCount] = useState(5);
  const [isReactingId, setIsReactingId] = useState<string | null>(null);

  // Monitor scrolling to load more (oldest) photos
  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 120
      ) {
        if (visibleCount < approvedPhotos.length) {
          setVisibleCount((prev) => Math.min(prev + 5, approvedPhotos.length));
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [visibleCount, approvedPhotos.length]);

  const handleReactionClick = async (photo: Photo, type: "like" | "love" | "inspiring") => {
    if (!currentUser?.email || isReactingId === photo.id) return;
    const email = currentUser.email.toLowerCase().trim();
    
    // Get current lists or fallback
    const currentLikeList = photo.userReactions?.like || [];
    const currentLoveList = photo.userReactions?.love || [];
    const currentInspiringList = photo.userReactions?.inspiring || [];

    const hasReacted = photo.userReactions?.[type]?.includes(email);

    // Build optimistic state
    const updatedReactions = {
      like: photo.reactions?.like || 0,
      love: photo.reactions?.love || 0,
      inspiring: photo.reactions?.inspiring || 0,
    };
    updatedReactions[type] = Math.max(0, updatedReactions[type] + (hasReacted ? -1 : 1));

    const updatedUserReactions = {
      like: currentLikeList,
      love: currentLoveList,
      inspiring: currentInspiringList,
    };
    updatedUserReactions[type] = hasReacted
      ? updatedUserReactions[type].filter((e) => e !== email)
      : [...updatedUserReactions[type], email];

    // Trigger optimistic update locally in App state
    onReactPhoto(photo.id, updatedReactions, updatedUserReactions);

    try {
      setIsReactingId(photo.id);
      const res = await fetch(`/api/images/${photo.id}/react`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, userEmail: email }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.reactions) {
          onReactPhoto(photo.id, data.reactions, data.userReactions || {});
        }
      }
    } catch (e) {
      console.error("Failed to submit reaction in feed:", e);
    } finally {
      setIsReactingId(null);
    }
  };

  const visiblePhotos = approvedPhotos.slice(0, visibleCount);

  return (
    <div className="w-full flex flex-col gap-8 py-4 animate-fade-in">
      {visiblePhotos.length === 0 ? (
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl flex flex-col items-center justify-center p-12 text-center shadow-sm">
          <ImageIcon className="w-12 h-12 text-gray-350 dark:text-zinc-650 mb-3" />
          <h3 className="font-display font-bold text-gray-900 dark:text-zinc-100 text-base">
            No approved feed posts yet
          </h3>
          <p className="text-xs text-gray-500 dark:text-zinc-400 max-w-sm mt-1 leading-relaxed">
            Upload new photos and approve them from the admin panel to populate the community feed.
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-8">
            {visiblePhotos.map((photo) => {
              const emailClean = currentUser?.email?.toLowerCase().trim() || "";
              const hasLiked = !!photo.userReactions?.like?.includes(emailClean);
              const hasLoved = !!photo.userReactions?.love?.includes(emailClean);
              const hasInspired = !!photo.userReactions?.inspiring?.includes(emailClean);

              const formattedDate = photo.dateCreated 
                ? new Date(photo.dateCreated).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "long",
                    day: "numeric"
                  })
                : "Unknown date";

              return (
                <div
                  key={photo.id}
                  className="bg-white dark:bg-zinc-900/60 border border-gray-200/65 dark:border-zinc-800/80 rounded-2xl p-5 md:p-6 shadow-sm transition-all hover:shadow-md flex flex-col gap-4"
                >
                  {/* Before the photo: User Name Posted */}
                  <div className="flex items-center justify-between border-b border-gray-100 dark:border-zinc-800/60 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-red-50 dark:bg-red-950/20 text-[#be1f24] dark:text-red-400 flex items-center justify-center font-bold text-xs">
                        <User className="w-4 h-4" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs text-gray-500 dark:text-zinc-400">
                          <span className="font-bold text-gray-900 dark:text-zinc-100 hover:underline cursor-pointer">
                            {photo.uploaderName || photo.creator || "Staff Photographer"}
                          </span>{" "}
                          posted:
                        </span>
                        <span className="text-[10px] text-gray-400 dark:text-zinc-500 flex items-center gap-1 mt-0.5">
                          <Calendar className="w-3 h-3" />
                          {formattedDate}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Title of the image: shown above the image */}
                  <div className="flex flex-col">
                    <h3 
                      onClick={() => onViewPhoto(photo)}
                      className="font-display font-black text-base md:text-lg text-gray-900 dark:text-zinc-100 hover:text-[#be1f24] dark:hover:text-red-400 cursor-pointer transition-colors leading-snug"
                    >
                      {photo.title}
                    </h3>
                  </div>

                  {/* Image: shown under the title */}
                  <div 
                    onClick={() => onViewPhoto(photo)}
                    className="relative w-full rounded-xl overflow-hidden border border-gray-150/80 dark:border-zinc-800/80 bg-gray-50 dark:bg-zinc-950 aspect-[4/3] sm:aspect-[16/10] cursor-pointer group"
                  >
                    <img
                      src={photo.url}
                      alt={photo.caption || photo.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-[1.01] transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                      <span className="bg-black/60 backdrop-blur-xs text-white text-xs px-3 py-1.5 rounded-full font-bold shadow-sm">
                        View archival details
                      </span>
                    </div>
                  </div>

                  {/* Caption: shown under the photo */}
                  {photo.caption && (
                    <div className="text-sm text-gray-700 dark:text-zinc-300 leading-relaxed bg-gray-50/50 dark:bg-zinc-950/20 p-3 rounded-lg border border-gray-100 dark:border-zinc-900">
                      {photo.caption}
                    </div>
                  )}

                  {/* Reaction controls: interact with it */}
                  <div className="flex items-center gap-2 pt-2 border-t border-gray-100 dark:border-zinc-800/40">
                    {/* Thumbs Up Reaction */}
                    <button
                      onClick={() => handleReactionClick(photo, "like")}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        hasLiked
                          ? "bg-red-50 text-[#be1f24] dark:bg-red-950/20 dark:text-red-400 border border-red-100 dark:border-red-950"
                          : "bg-gray-50 hover:bg-gray-100 text-gray-600 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 border border-gray-150 dark:border-zinc-800"
                      }`}
                      title={hasLiked ? "Unlike post" : "Like post"}
                    >
                      <ThumbsUp className={`w-3.5 h-3.5 ${hasLiked ? "fill-current" : ""}`} />
                      <span>{photo.reactions?.like || 0}</span>
                    </button>

                    {/* Heart Reaction */}
                    <button
                      onClick={() => handleReactionClick(photo, "love")}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        hasLoved
                          ? "bg-red-50 text-rose-600 dark:bg-rose-950/20 dark:text-rose-400 border border-rose-100 dark:border-rose-950"
                          : "bg-gray-50 hover:bg-gray-100 text-gray-600 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 border border-gray-150 dark:border-zinc-800"
                      }`}
                      title={hasLoved ? "Unlove post" : "Love post"}
                    >
                      <Heart className={`w-3.5 h-3.5 ${hasLoved ? "fill-rose-500" : ""}`} />
                      <span>{photo.reactions?.love || 0}</span>
                    </button>

                    {/* Inspiring Reaction */}
                    <button
                      onClick={() => handleReactionClick(photo, "inspiring")}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        hasInspired
                          ? "bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400 border border-amber-100 dark:border-amber-950"
                          : "bg-gray-50 hover:bg-gray-100 text-gray-600 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 border border-gray-150 dark:border-zinc-800"
                      }`}
                      title={hasInspired ? "Remove inspiring tag" : "Inspiring photo"}
                    >
                      <Lightbulb className={`w-3.5 h-3.5 ${hasInspired ? "fill-amber-400" : ""}`} />
                      <span>{photo.reactions?.inspiring || 0}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Scrolling Load More Indicators */}
          {visibleCount < approvedPhotos.length && (
            <div className="flex justify-center py-4">
              <button
                onClick={() => setVisibleCount((prev) => Math.min(prev + 5, approvedPhotos.length))}
                className="inline-flex items-center gap-2 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-800 text-xs font-bold text-gray-700 dark:text-zinc-300 px-5 py-2.5 rounded-xl shadow-3xs cursor-pointer transition-all active:scale-95"
              >
                <span>Show Older Posts</span>
              </button>
            </div>
          )}

          {visibleCount >= approvedPhotos.length && approvedPhotos.length > 0 && (
            <div className="text-center text-xs text-gray-400 dark:text-zinc-500 py-6 font-mono">
              Reached the very oldest post in archive.
            </div>
          )}
        </>
      )}
    </div>
  );
}
