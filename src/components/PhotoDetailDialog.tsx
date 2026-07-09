import React, { useState, useEffect } from "react";
import { X, Calendar, MapPin, User, Camera, Layers, Edit, Save, Trash2, Check, Download, Eye, Clock, Compass, ArrowUpCircle, Sliders, ChevronDown, ChevronUp, Sparkles, Loader2, ThumbsUp, Heart, Lightbulb, Lock, Star, Folder, AlertCircle, ArrowUpDown } from "lucide-react";
import { Photo, UserAccount, Photographer } from "../types";
import { dialogService } from "../lib/dialog";

interface PhotoDetailDialogProps {
  photo: Photo | null;
  isOpen: boolean;
  onClose: () => void;
  isAdmin: boolean;
  currentUser?: UserAccount | null;
  viewAsMode?: "admin" | "user" | "guest";
  onSavePhoto: (updatedPhoto: Photo) => Promise<void>;
  onDeletePhoto: (id: string) => void;
  onPhotoViewed?: (id: string) => void;
  onPhotoDownloaded?: (id: string) => void;
  onApprovePhoto?: (id: string) => Promise<void>;
  onFeaturePhoto?: (id: string, feature: boolean) => Promise<void>;
  onApplySmartFilter?: (filterType: "photographer" | "camera" | "collection", value: string) => void;
  onReactPhoto?: (
    id: string, 
    reactions: { like: number; love: number; inspiring: number }, 
    userReactions: { like?: string[]; love?: string[]; inspiring?: string[] }
  ) => void;
  availableCollections?: string[];
  onAddCollection?: (name: string, description: string) => Promise<boolean>;
  onVisitProfile?: (type: "photographer" | "user", value: string) => void;
  photographers?: Photographer[];
}

export default function PhotoDetailDialog({
  photo,
  isOpen,
  onClose,
  isAdmin,
  currentUser,
  viewAsMode,
  onSavePhoto,
  onDeletePhoto,
  onPhotoViewed,
  onPhotoDownloaded,
  onApprovePhoto,
  onFeaturePhoto,
  onApplySmartFilter,
  onReactPhoto,
  availableCollections = [],
  onAddCollection,
  onVisitProfile,
  photographers = [],
}: PhotoDetailDialogProps) {
  const isPrivileged = currentUser?.role === "super_admin" || currentUser?.role === "archive_manager";
  const needsApproval = !isPrivileged;

  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [photographer, setPhotographer] = useState("");
  const [location, setLocation] = useState("");
  const [city, setCity] = useState("");
  const [dateCreated, setDateCreated] = useState("");
  const [timeCreated, setTimeCreated] = useState("");
  const [dateUploaded, setDateUploaded] = useState("");
  const [keywords, setKeywords] = useState<string[]>([]);
  const [newKeyword, setNewKeyword] = useState("");
  const [areKeywordsExpanded, setAreKeywordsExpanded] = useState(false);
  const [collection, setCollection] = useState("");
  
  // Inline collection manager states
  const [isAddingToCollection, setIsAddingToCollection] = useState(false);
  const [isCollectionExpanded, setIsCollectionExpanded] = useState(false);
  const [selectedColToAssign, setSelectedColToAssign] = useState("");
  const [newColToCreate, setNewColToCreate] = useState("");
  const [newColDesc, setNewColDesc] = useState("");
  
  // Camera settings
  const [camera, setCamera] = useState("");
  const [lens, setLens] = useState("");
  const [focalLength, setFocalLength] = useState("");
  const [iso, setIso] = useState("");
  const [aperture, setAperture] = useState("");
  const [shutterSpeed, setShutterSpeed] = useState("");

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isLandscape, setIsLandscape] = useState(true);
  const [isReframing, setIsReframing] = useState(false);
  const [tempCoverOffsetY, setTempCoverOffsetY] = useState<number>(50);

  // Local synced reactions state
  const [localReactions, setLocalReactions] = useState<{ like: number; love: number; inspiring: number }>({
    like: 0,
    love: 0,
    inspiring: 0,
  });
  const [localUserReactions, setLocalUserReactions] = useState<{ like?: string[]; love?: string[]; inspiring?: string[] }>({
    like: [],
    love: [],
    inspiring: [],
  });

  // Download export state variables
  const [downloadSize, setDownloadSize] = useState<"small" | "medium" | "original">("original");
  const [withWatermark, setWithWatermark] = useState<boolean>(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDownloadExpanded, setIsDownloadExpanded] = useState(false);

  const [requestStatus, setRequestStatus] = useState<"None" | "Pending" | "Approved" | "Rejected" | "Expired">("None");
  const [requestReason, setRequestReason] = useState("");
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);
  const [approvedAtTime, setApprovedAtTime] = useState<string | null>(null);
  const [approvedDurationHours, setApprovedDurationHours] = useState<number>(6);
  const [timeLeftStr, setTimeLeftStr] = useState<string>("");

  const fetchMyRequestStatus = async () => {
    if (!currentUser?.id || !photo?.id) return;
    try {
      const res = await fetch("/api/requests/fullres");
      if (res.ok) {
        const data = await res.json();
        const myReq = data.find((r: any) => 
          r.userId === currentUser.id && 
          r.photoId === photo.id &&
          (r.requestedSize || "original") === downloadSize &&
          (r.withWatermark ?? false) === withWatermark
        );
        if (myReq) {
          const customHours = typeof myReq.durationHours === "number" ? myReq.durationHours : 6;
          setApprovedDurationHours(customHours);
          if (myReq.status === "Approved") {
            const approvedTime = myReq.approvedAt ? new Date(myReq.approvedAt).getTime() : new Date(myReq.createdAt).getTime();
            const now = Date.now();
            const elapsedMs = now - approvedTime;
            const limitMs = customHours * 60 * 60 * 1000;
            if (elapsedMs >= limitMs) {
              setRequestStatus("Expired");
              setApprovedAtTime(null);
            } else {
              setRequestStatus("Approved");
              setApprovedAtTime(myReq.approvedAt || myReq.createdAt);
            }
          } else {
            setRequestStatus(myReq.status);
            setApprovedAtTime(null);
          }
        } else {
          setRequestStatus("None");
          setApprovedAtTime(null);
          setApprovedDurationHours(6);
        }
      }
    } catch (e) {
      console.error("Error fetching request status:", e);
    }
  };

  useEffect(() => {
    if (requestStatus !== "Approved" || !approvedAtTime) {
      setTimeLeftStr("");
      return;
    }

    const updateTimer = () => {
      const approvedTime = new Date(approvedAtTime).getTime();
      const now = Date.now();
      const elapsedMs = now - approvedTime;
      const limitMs = approvedDurationHours * 60 * 60 * 1000;
      const remainingMs = limitMs - elapsedMs;

      if (remainingMs <= 0) {
        setTimeLeftStr("Expired");
        setRequestStatus("Expired");
      } else {
        const remainingHours = Math.floor(remainingMs / (1000 * 60 * 60));
        const remainingMinutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
        const remainingSeconds = Math.floor((remainingMs % (1000 * 60)) / 1000);
        
        let str = "";
        if (remainingHours > 0) {
          str += `${remainingHours}h `;
        }
        str += `${remainingMinutes}m ${remainingSeconds}s`;
        setTimeLeftStr(str);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [requestStatus, approvedAtTime, approvedDurationHours]);

  const handleSubmitRequest = async () => {
    if (!requestReason.trim()) {
      await dialogService.alert("Please specify a reason for your download request.", {
        title: "Reason Required",
        variant: "warning"
      });
      return;
    }
    setIsSubmittingRequest(true);
    try {
      const res = await fetch("/api/requests/fullres", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          photoId: photo!.id,
          photoTitle: photo!.title,
          photoUrl: photo!.url,
          userId: currentUser!.id,
          userName: currentUser!.name,
          userEmail: currentUser!.email,
          reason: requestReason.trim(),
          purpose: requestReason.trim(),
          requestedSize: downloadSize,
          withWatermark: withWatermark
        })
      });
      if (res.ok) {
        setRequestStatus("Pending");
        setRequestReason("");
        await dialogService.alert("Special request submitted successfully! Staff will notify you upon approval.", {
          title: "Request Submitted",
          variant: "success"
        });
      } else {
        await dialogService.alert("Failed to submit request. Please try again later.", {
          title: "Submission Failed",
          variant: "danger"
        });
      }
    } catch (e) {
      console.error(e);
      await dialogService.alert("Error submitting request.", {
        title: "Error",
        variant: "danger"
      });
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  // Sync state when photo changes
  useEffect(() => {
    if (photo) {
      setTitle(photo.title);
      setCaption(photo.caption);
      setPhotographer(photo.photographer);
      setLocation(photo.location);
      setCity(photo.city || "");
      setDateCreated(photo.dateCreated);
      setTimeCreated(photo.timeCreated || "");
      setDateUploaded(photo.dateUploaded || "");
      setKeywords([...photo.keywords]);
      setCamera(photo.cameraSettings.camera || "");
      setLens(photo.cameraSettings.lens || "");
      setFocalLength(photo.cameraSettings.focalLength || "");
      setIso(String(photo.cameraSettings.iso || ""));
      setAperture(photo.cameraSettings.aperture || "");
      setShutterSpeed(photo.cameraSettings.shutterSpeed || "");
      setCollection(photo.collection || "");
      setIsEditing(false);
      setTempCoverOffsetY(photo.coverOffsetY !== undefined ? photo.coverOffsetY : 50);
      setIsReframing(false);

      setLocalReactions({
        like: photo.reactions?.like || 0,
        love: photo.reactions?.love || 0,
        inspiring: photo.reactions?.inspiring || 0,
      });

      setLocalUserReactions(photo.userReactions || {
        like: [],
        love: [],
        inspiring: [],
      });

      // Reset download size to default based on approval requirements
      const isPrivilegedUser = currentUser?.role === "super_admin" || currentUser?.role === "archive_manager";
      if (!isPrivilegedUser) {
        setDownloadSize("small");
      } else {
        setDownloadSize("original");
      }

      // Detect orientation of the photo
      if (photo.url) {
        const img = new Image();
        img.src = photo.url;
        img.onload = () => {
          setIsLandscape(img.naturalWidth > img.naturalHeight);
        };
      }
    }
  }, [photo, currentUser]);

  // Sync request status on load
  useEffect(() => {
    if (isOpen && photo?.id && currentUser) {
      fetchMyRequestStatus();
    }
  }, [isOpen, photo?.id, currentUser, downloadSize, withWatermark]);

  // Increment view count when photo detail dialog is opened
  useEffect(() => {
    if (isOpen && photo?.id) {
      fetch(`/api/images/${photo.id}/view`, { method: "POST" })
        .then(res => {
          if (res.ok && onPhotoViewed) {
            onPhotoViewed(photo.id);
          }
        })
        .catch(err => console.error("Error registering photo view:", err));
    }
  }, [isOpen, photo?.id]);

  if (!isOpen || !photo) return null;

  const handleReactionClick = async (type: "like" | "love" | "inspiring") => {
    if (!currentUser?.email) return;
    const email = currentUser.email.toLowerCase().trim();
    const hasReacted = localUserReactions[type]?.includes(email);

    // Optimistic update
    setLocalReactions((prev) => ({
      ...prev,
      [type]: Math.max(0, prev[type] + (hasReacted ? -1 : 1)),
    }));

    setLocalUserReactions((prev) => {
      const currentList = prev[type] || [];
      return {
        ...prev,
        [type]: hasReacted
          ? currentList.filter((e) => e !== email)
          : [...currentList, email],
      };
    });

    try {
      const res = await fetch(`/api/images/${photo.id}/react`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, userEmail: email }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.reactions) {
          setLocalReactions(data.reactions);
          setLocalUserReactions(data.userReactions || {});
          if (onReactPhoto) {
            onReactPhoto(photo.id, data.reactions, data.userReactions || {});
          }
        }
      }
    } catch (err) {
      console.error("Failed to post photo reaction:", err);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    const updatedPhoto: Photo = {
      ...photo,
      title,
      caption,
      altText: caption,
      photographer,
      location,
      city,
      dateCreated,
      timeCreated,
      dateUploaded,
      keywords,
      collection,
      cameraSettings: {
        camera,
        lens,
        focalLength,
        iso,
        aperture,
        shutterSpeed,
      },
    };

    try {
      await onSavePhoto(updatedPhoto);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
      setIsEditing(false);
    } catch (error) {
      await dialogService.alert("Failed to save changes. Please try again.", {
        title: "Save Failed",
        variant: "danger"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveReframe = async () => {
    if (!photo) return;
    setIsSaving(true);
    const updatedPhoto = {
      ...photo,
      coverOffsetY: tempCoverOffsetY,
    };
    try {
      await onSavePhoto(updatedPhoto);
      setIsReframing(false);
    } catch (error) {
      await dialogService.alert("Failed to save cover layout alignment.", {
        title: "Alignment Save Failed",
        variant: "danger"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const addKeyword = () => {
    if (newKeyword.trim() && !keywords.includes(newKeyword.trim())) {
      setKeywords([...keywords, newKeyword.trim()]);
      setNewKeyword("");
    }
  };

  const removeKeyword = (kw: string) => {
    setKeywords(keywords.filter((k) => k !== kw));
  };

  const isOwnerOrAdmin = currentUser?.role === "super_admin" || 
                         currentUser?.role === "archive_manager" || 
                         (currentUser && photo?.uploadedBy && photo.uploadedBy.toLowerCase() === currentUser.email.toLowerCase());

  const checkCombinationNeedsApproval = (size: "small" | "medium" | "original", wmark: boolean) => {
    if (isOwnerOrAdmin) return false;
    // Small or Medium with watermark can be downloaded directly
    if ((size === "small" || size === "medium") && wmark) return false;
    // Everything else needs approval!
    return true;
  };

  const triggerDownload = async () => {
    if (isDownloading) return;

    const needsApproval = checkCombinationNeedsApproval(downloadSize, withWatermark);
    let isApproved = requestStatus === "Approved";

    if (isApproved && approvedAtTime && needsApproval) {
      const approvedTime = new Date(approvedAtTime).getTime();
      const elapsedMs = Date.now() - approvedTime;
      const limitMs = approvedDurationHours * 60 * 60 * 1000;
      if (elapsedMs >= limitMs) {
        isApproved = false;
        setRequestStatus("Expired");
        await dialogService.alert(`Your ${approvedDurationHours}-hour temporary download access has expired. Please submit a new request.`, {
          title: "Access Expired",
          variant: "warning"
        });
        return;
      }
    }

    if (needsApproval && !isApproved) {
      await dialogService.alert("You do not have permission to download this configuration directly. Please request approval first.", {
        title: "Access Denied",
        variant: "danger"
      });
      return;
    }

    setIsDownloading(true);
    
    const sizeLabels = {
      small: "800px_Preview",
      medium: "1600px_Medium",
      original: "Original"
    };
    
    const shouldWatermark = withWatermark;

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
      } catch (e) {
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

    const filename = `${baseName}_${sizeLabels[downloadSize]}${shouldWatermark ? "_watermarked" : ""}.jpg`;
    
    // If it's a data url or blob, use it directly. Otherwise use CORS proxy
    const proxyUrl = photo.url.startsWith("data:") || photo.url.startsWith("blob:")
      ? photo.url
      : `${window.location.origin}/api/proxy-image?url=${encodeURIComponent(photo.url)}`;

    try {
      const img = new Image();
      img.crossOrigin = "anonymous";
      
      const logoImg = new Image();
      logoImg.crossOrigin = "anonymous";

      await new Promise<void>((resolve, reject) => {
        let loadedCount = 0;
        const checkDone = () => {
          loadedCount++;
          if (loadedCount === 2) {
            onAllLoaded();
          }
        };

        img.onload = checkDone;
        img.onerror = () => reject(new Error("Failed to load main image"));

        logoImg.onload = checkDone;
        logoImg.onerror = () => {
          console.warn("Failed to load white logo SVG, drawing text fallback");
          checkDone();
        };

        img.src = proxyUrl;
        logoImg.src = "/logo_white.svg";

        function onAllLoaded() {
          try {
            let width = img.naturalWidth;
            let height = img.naturalHeight;

            if (downloadSize === "small") {
              const maxDim = 800;
              if (width > maxDim || height > maxDim) {
                if (width > height) {
                  height = Math.round((height * maxDim) / width);
                  width = maxDim;
                } else {
                  width = Math.round((width * maxDim) / height);
                  height = maxDim;
                }
              }
            } else if (downloadSize === "medium") {
              const maxDim = 1600;
              if (width > maxDim || height > maxDim) {
                if (width > height) {
                  height = Math.round((height * maxDim) / width);
                  width = maxDim;
                } else {
                  width = Math.round((width * maxDim) / height);
                  height = maxDim;
                }
              }
            }

            const canvas = document.createElement("canvas");
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext("2d");
            if (!ctx) {
              reject(new Error("Could not get canvas context"));
              return;
            }

            ctx.drawImage(img, 0, 0, width, height);

            if (shouldWatermark) {
              const isGuest = !currentUser || 
                              currentUser.role === "external_user" || 
                              viewAsMode === "guest";

              if (isGuest) {
                // Tiled diagonal pattern watermark across the entire image
                ctx.save();
                
                // Set text properties
                const text = "HCSYRIA.ORG";
                const fontSize = Math.max(16, Math.round(Math.min(width, height) * 0.035));
                ctx.font = `bold ${fontSize}px "Inter", system-ui, -apple-system, sans-serif`;
                
                // Rotated grid implementation
                ctx.translate(width / 2, height / 2);
                ctx.rotate(-25 * Math.PI / 180); // Rotate -25 degrees
                ctx.translate(-width / 2, -height / 2);

                // Use a wider grid to cover bounds after rotation
                const stepX = fontSize * 7;
                const stepY = fontSize * 4;
                const startX = -width * 0.5;
                const endX = width * 1.5;
                const startY = -height * 0.5;
                const endY = height * 1.5;

                for (let x = startX; x < endX; x += stepX) {
                  for (let y = startY; y < endY; y += stepY) {
                    // Shift alternate rows for a staggered layout
                    const xOffset = (Math.floor(y / stepY) % 2 === 0) ? 0 : stepX / 2;
                    
                    // Shadow layer for dark areas
                    ctx.fillStyle = "rgba(0, 0, 0, 0.15)";
                    ctx.fillText(text, x + xOffset + 1, y + 1);
                    
                    // Main white layer for light areas
                    ctx.fillStyle = "rgba(255, 255, 255, 0.25)";
                    ctx.fillText(text, x + xOffset, y);
                  }
                }
                
                ctx.restore();
              } else {
                const logoWidthNatural = logoImg.naturalWidth || 180;
                const logoHeightNatural = logoImg.naturalHeight || 40;
                const logoAspect = logoWidthNatural / logoHeightNatural;

                const logoHeight = Math.max(24, Math.round(height * 0.055));
                const logoWidth = logoHeight * logoAspect;

                const marginX = Math.max(16, Math.round(width * 0.035));
                const marginY = Math.max(16, Math.round(height * 0.035));

                // Apply drop shadow for the logo
                ctx.save();
                ctx.shadowColor = "rgba(0, 0, 0, 0.65)";
                ctx.shadowBlur = Math.max(4, Math.round(logoHeight * 0.12));
                ctx.shadowOffsetX = Math.max(1, Math.round(logoHeight * 0.04));
                ctx.shadowOffsetY = Math.max(1, Math.round(logoHeight * 0.04));

                if (logoImg.naturalWidth) {
                  ctx.drawImage(logoImg, marginX, marginY, logoWidth, logoHeight);
                } else {
                  // Fallback to text watermark in top-left
                  ctx.font = `bold ${Math.max(14, Math.round(logoHeight * 0.6))}px "Inter", system-ui, -apple-system, sans-serif`;
                  ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
                  ctx.fillText("HCSYRIA.ORG", marginX, marginY + logoHeight);
                }
                ctx.restore();
              }
            }

            canvas.toBlob((blob) => {
              if (blob) {
                const blobUrl = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.href = blobUrl;
                link.download = filename;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(blobUrl);

                // Increment download count on server and local state
                fetch(`/api/images/${photo.id}/download`, { method: "POST" })
                  .then(res => {
                    if (res.ok && onPhotoDownloaded) {
                      onPhotoDownloaded(photo.id);
                    }
                  })
                  .catch(err => console.error("Error registering download:", err));

                resolve();
              } else {
                reject(new Error("Canvas toBlob failed"));
              }
            }, "image/jpeg", 0.92);

          } catch (err) {
            reject(err);
          }
        }
      });
    } catch (err) {
      console.error("Canvas download error, falling back to direct download:", err);
      // Fallback
      const link = document.createElement("a");
      link.href = photo.url;
      link.download = filename;
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Increment download count on server and local state
      fetch(`/api/images/${photo.id}/download`, { method: "POST" })
        .then(res => {
          if (res.ok && onPhotoDownloaded) {
            onPhotoDownloaded(photo.id);
          }
        })
        .catch(err => console.error("Error registering download:", err));
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs animate-fade-in">
      {/* Container - adapts depending on whether it is landscape or portrait */}
      <div 
        className={`relative bg-white dark:bg-zinc-950 w-full rounded-2xl overflow-hidden shadow-2xl flex border border-gray-100 dark:border-zinc-900 transition-all duration-300 ${
          isLandscape 
            ? "flex-col h-auto max-h-[92vh] max-w-4xl" 
            : "flex-col md:flex-row h-[85vh] max-w-5xl"
        }`}
      >
        
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-50 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Left/Top Side: Photo View */}
        <div 
          className={`relative bg-neutral-950 flex items-center justify-center overflow-hidden border-gray-100 dark:border-zinc-900 transition-all duration-300 ${
            isLandscape
              ? "w-full h-auto border-b"
              : "w-full md:w-[65%] h-[55%] md:h-full border-b md:border-b-0 md:border-r"
          }`}
        >
          {isReframing ? (
            <div className="w-full p-4 md:p-6 flex flex-col gap-4 items-center justify-center select-none">
              <div className="flex flex-col gap-1 w-full text-left">
                <span className="text-xs font-bold text-amber-500 uppercase tracking-wider">Cover Layout Reframe</span>
                <span className="text-[11px] text-gray-400">Position offset for top main banner alignment</span>
              </div>
              
              <div 
                className="relative w-full h-[240px] sm:h-[320px] rounded-xl overflow-hidden border border-white/10 bg-zinc-900 cursor-ns-resize touch-none group/reframe select-none"
                onPointerDown={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const containerHeight = rect.height;
                  const startY = e.clientY;
                  const startOffset = tempCoverOffsetY;
                  
                  const handlePointerMove = (moveEvent: PointerEvent) => {
                    const deltaY = moveEvent.clientY - startY;
                    const deltaPct = (deltaY / containerHeight) * 100;
                    const newOffset = Math.max(0, Math.min(100, startOffset - deltaPct));
                    setTempCoverOffsetY(newOffset);
                  };
                  
                  const handlePointerUp = () => {
                    window.removeEventListener("pointermove", handlePointerMove);
                    window.removeEventListener("pointerup", handlePointerUp);
                  };
                  
                  window.addEventListener("pointermove", handlePointerMove);
                  window.addEventListener("pointerup", handlePointerUp);
                }}
              >
                <div 
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    backgroundImage: `url(${photo.url})`,
                    backgroundSize: "cover",
                    backgroundPosition: `50% ${tempCoverOffsetY}%`
                  }}
                />
                
                {/* Visual guidelines overlay */}
                <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 border-t border-b border-dashed border-white/30 h-10 pointer-events-none flex items-center justify-center bg-black/10">
                  <span className="text-[9px] font-mono text-white/50 tracking-widest uppercase">Center Line Anchor</span>
                </div>

                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-black/60 pointer-events-none flex flex-col justify-between p-4">
                  <div className="bg-black/85 backdrop-blur-xs text-[10px] text-amber-400 border border-amber-500/20 px-2.5 py-1 rounded-lg self-start flex items-center gap-1.5 font-semibold">
                    <ArrowUpDown className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                    <span>Drag inside to reframe cover: {Math.round(tempCoverOffsetY)}%</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="text-[9px] text-white/60 font-mono">
                      Simulated Front-page Crop
                    </div>
                    <div className="text-xs text-white font-bold truncate drop-shadow-xs">
                      {photo.title || "Cover Mockup Title"}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Range slider for ultra fine tuning */}
              <div className="w-full flex items-center gap-3 bg-white/5 dark:bg-zinc-900/50 p-2.5 rounded-lg border border-gray-200 dark:border-zinc-800">
                <span className="text-[10px] font-mono uppercase text-gray-500 dark:text-zinc-500">0% (Top)</span>
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  value={tempCoverOffsetY} 
                  onChange={(e) => setTempCoverOffsetY(Number(e.target.value))}
                  className="flex-1 accent-red-600 h-1.5 bg-gray-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                />
                <span className="text-[10px] font-mono uppercase text-gray-500 dark:text-zinc-500">100% (Bottom)</span>
              </div>
            </div>
          ) : (
            <img
              src={photo.url}
              alt={photo.caption || photo.title}
              referrerPolicy="no-referrer"
              className={`${
                isLandscape 
                  ? "w-full h-auto max-h-[50vh] md:max-h-[55vh] object-contain" 
                  : "max-w-full max-h-full object-contain"
              }`}
            />
          )}
        </div>

        {/* Right/Bottom Side: Metadata Panel */}
        <div 
          className={`overflow-y-auto p-6 md:p-8 bg-white dark:bg-zinc-950 transition-all duration-300 ${
            isLandscape
              ? "w-full h-auto md:flex-1 min-h-0"
              : "w-full md:w-[35%] h-[45%] md:h-full"
          }`}
        >
          
          {/* Action Row - Full Width */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-gray-100 dark:border-zinc-800 mb-6">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-gray-400 dark:text-zinc-500 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 px-2.5 py-1 rounded">
                Archival ID: {photo.id}
              </span>
              <span className="text-[10px] font-mono uppercase tracking-wider text-gray-500 dark:text-zinc-400 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 px-2.5 py-1 rounded flex items-center gap-1" title="Total page visits">
                <Eye className="w-3.5 h-3.5 text-gray-400" />
                <span>{(photo.views || 0)} visits</span>
              </span>
              <span className="text-[10px] font-mono uppercase tracking-wider text-gray-500 dark:text-zinc-400 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 px-2.5 py-1 rounded flex items-center gap-1" title="Total downloads">
                <Download className="w-3.5 h-3.5 text-gray-400" />
                <span>{(photo.downloads || 0)} downloads</span>
              </span>
              {photo.status && (
                <span className={`text-[10px] font-mono uppercase tracking-wider px-2.5 py-1 rounded font-bold border ${
                  photo.status === "Approved"
                    ? "text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-900"
                    : "text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900 animate-pulse"
                }`}>
                  {photo.status}
                </span>
              )}
            </div>

            {isAdmin && (
              <div className="flex flex-wrap items-center gap-2">
                {isReframing ? (
                  <>
                    <button
                      onClick={handleSaveReframe}
                      disabled={isSaving}
                      className="flex items-center gap-1.5 text-xs text-white bg-green-700 hover:bg-green-800 px-3.5 py-1.5 rounded-lg font-bold transition-all shadow-sm cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{isSaving ? "Saving Alignment..." : "Save Cover Layout"}</span>
                    </button>
                    <button
                      onClick={() => {
                        setIsReframing(false);
                        setTempCoverOffsetY(photo.coverOffsetY !== undefined ? photo.coverOffsetY : 50);
                      }}
                      className="text-xs text-gray-500 dark:text-zinc-400 hover:text-gray-850 dark:hover:text-zinc-200 bg-gray-100 dark:bg-zinc-900 px-3.5 py-1.5 rounded-lg font-medium transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    {photo.status === "Pending" && onApprovePhoto && (
                      <button
                        onClick={async () => {
                          const confirmed = await dialogService.confirm(
                            "Approve this photo and publish it to the humanitarian archive?",
                            {
                              title: "Approve and Publish",
                              variant: "success",
                              confirmText: "Approve & Publish",
                            }
                          );
                          if (confirmed) {
                            await onApprovePhoto(photo.id);
                          }
                        }}
                        className="flex items-center gap-1.5 text-xs text-white bg-green-700 hover:bg-green-800 px-3.5 py-1.5 rounded-lg font-bold transition-all shadow-sm cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Approve Photo</span>
                      </button>
                    )}

                    {photo.status === "Approved" && onFeaturePhoto && (
                      photo.isFeatured ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={async () => {
                              const confirmed = await dialogService.confirm(
                                "Remove this photo from being the Main Cover?",
                                {
                                  title: "Remove Cover Feature",
                                  variant: "warning",
                                  confirmText: "Remove Cover",
                                }
                              );
                              if (confirmed) {
                                await onFeaturePhoto(photo.id, false);
                              }
                            }}
                            className="flex items-center gap-1.5 text-xs text-white bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-zinc-200 px-3.5 py-1.5 rounded-lg font-bold transition-all shadow-sm cursor-pointer border border-zinc-900 dark:border-zinc-100"
                            title="This photo is currently set as the top main cover banner"
                          >
                            <Star className="w-3.5 h-3.5 fill-current mr-1" />
                            <span>Featured Cover</span>
                          </button>
                          
                          <button
                            onClick={() => {
                              setTempCoverOffsetY(photo.coverOffsetY !== undefined ? photo.coverOffsetY : 50);
                              setIsReframing(true);
                            }}
                            className="flex items-center gap-1.5 text-xs text-gray-700 dark:text-zinc-200 bg-white dark:bg-zinc-900 hover:bg-gray-50 dark:hover:bg-zinc-800 border border-gray-300 dark:border-zinc-800 px-3.5 py-1.5 rounded-lg font-bold transition-all shadow-xs cursor-pointer"
                            title="Adjust how this image fits and positions as the top main banner"
                          >
                            <Sliders className="w-3.5 h-3.5 text-[#be1f24]" />
                            <span>Reframe Cover</span>
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={async () => {
                            const confirmed = await dialogService.confirm(
                              "Set this photo as the Main Cover and adjust its positioning?",
                              {
                                        title: "Set Main Cover",
                                variant: "info",
                                confirmText: "Set Cover & Reframe",
                              }
                            );
                            if (confirmed) {
                              await onFeaturePhoto(photo.id, true);
                              // Immediately trigger reframing mode!
                              setTempCoverOffsetY(photo.coverOffsetY !== undefined ? photo.coverOffsetY : 50);
                              setIsReframing(true);
                            }
                          }}
                          className="flex items-center gap-1.5 text-xs text-gray-700 dark:text-zinc-200 bg-white dark:bg-zinc-900 hover:bg-gray-50 dark:hover:bg-zinc-800 border border-gray-300 dark:border-zinc-800 px-3.5 py-1.5 rounded-lg font-semibold transition-all shadow-xs cursor-pointer"
                          title="Set this photo as the top main cover banner"
                        >
                          <Star className="w-3.5 h-3.5 text-gray-400 dark:text-zinc-500 mr-1" />
                          <span>Make Cover</span>
                        </button>
                      )
                    )}

                    {isEditing ? (
                      <>
                        <button
                          onClick={handleSave}
                          disabled={isSaving}
                          className="flex items-center gap-1 text-xs text-white bg-green-700 hover:bg-green-800 px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer"
                        >
                          {isSaving ? "Saving..." : saveSuccess ? "Saved!" : "Save Changes"}
                          {saveSuccess && <Check className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={() => setIsEditing(false)}
                          className="text-xs text-gray-500 dark:text-zinc-400 hover:text-gray-850 dark:hover:text-zinc-200 bg-gray-100 dark:bg-zinc-900 px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => setIsEditing(true)}
                          className="flex items-center gap-1 text-xs text-gray-700 dark:text-zinc-200 bg-gray-100 dark:bg-zinc-900 hover:bg-gray-200 dark:hover:bg-zinc-800 px-3 py-1.5 rounded-lg font-medium transition-colors border border-gray-200 dark:border-zinc-800 cursor-pointer"
                        >
                          <Edit className="w-3.5 h-3.5 text-[#be1f24]" />
                          <span>Edit Info</span>
                        </button>
                        <button
                          onClick={async () => {
                            const confirmed = await dialogService.confirm(
                              `Are you sure you want to delete this photo from the library?`,
                              {
                                title: "Delete Photo",
                                variant: "danger",
                                confirmText: "Delete",
                              }
                            );
                            if (confirmed) {
                              onDeletePhoto(photo.id);
                              onClose();
                            }
                          }}
                          className="flex items-center gap-1 text-xs text-gray-700 dark:text-zinc-200 hover:text-white hover:bg-[#be1f24] hover:border-[#be1f24] bg-gray-100 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 px-3 py-1.5 rounded-lg font-medium transition-all cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                      </>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Photographer self-editing metadata section */}
            {!isAdmin && currentUser?.role === "photographer" && photo.uploadedBy && currentUser && photo.uploadedBy.toLowerCase() === currentUser.email.toLowerCase() && (
              <div className="flex flex-wrap items-center gap-2">
                {isEditing ? (
                  <>
                    <button
                      onClick={handleSave}
                      disabled={isSaving}
                      className="flex items-center gap-1 text-xs text-white bg-green-700 hover:bg-green-800 px-3.5 py-1.5 rounded-lg font-medium transition-colors cursor-pointer"
                    >
                      {isSaving ? "Saving..." : saveSuccess ? "Saved!" : "Save Changes"}
                      {saveSuccess && <Check className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={() => setIsEditing(false)}
                      className="text-xs text-gray-500 dark:text-zinc-400 hover:text-gray-800 dark:hover:text-zinc-200 bg-gray-100 dark:bg-zinc-900 px-3.5 py-1.5 rounded-lg font-medium transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center gap-1 text-xs text-gray-700 dark:text-zinc-200 bg-gray-100 dark:bg-zinc-900 hover:bg-gray-200 dark:hover:bg-zinc-800 px-3 py-1.5 rounded-lg font-medium transition-colors border border-gray-200 dark:border-zinc-800 cursor-pointer"
                  >
                    <Edit className="w-3.5 h-3.5 text-[#be1f24]" />
                    <span>Edit Info</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Full Width Header: Title & Caption */}
          <div className="mb-6 flex flex-col gap-3.5 border-b border-gray-150 dark:border-zinc-800 pb-5">
            {isEditing ? (
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-mono font-semibold text-gray-500 dark:text-zinc-400 uppercase">Catalog Title</label>
                  <input
                    id="edit-title-input"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full text-base font-bold bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded px-2.5 py-1.5 focus:outline-none focus:border-[#be1f24] focus:bg-white dark:focus:bg-zinc-950 text-gray-900 dark:text-zinc-100"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-mono font-semibold text-gray-500 dark:text-zinc-400 uppercase">Collection Name (Optional)</label>
                  <input
                    id="edit-collection-input"
                    type="text"
                    placeholder="e.g. Emergency Relief 2026"
                    value={collection}
                    onChange={(e) => setCollection(e.target.value)}
                    className="w-full text-xs bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded px-2.5 py-1.5 focus:outline-none focus:border-[#be1f24] focus:bg-white dark:focus:bg-zinc-950 text-gray-900 dark:text-zinc-100"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-mono font-semibold text-gray-500 dark:text-zinc-400 uppercase">Caption</label>
                  <textarea
                    id="edit-caption-textarea"
                    rows={3}
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    className="w-full text-sm text-gray-700 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded p-2.5 focus:outline-none focus:bg-white dark:focus:bg-zinc-950 text-gray-900 dark:text-zinc-100 resize-none focus:border-[#be1f24]"
                  />
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                <h2 className="font-display font-extrabold text-xl md:text-2xl text-gray-900 dark:text-zinc-50 tracking-tight leading-tight uppercase">
                  {title}
                </h2>
                <div className="flex flex-col gap-1">
                  <h3 className="font-display font-bold text-xs uppercase tracking-wider text-[#be1f24]">
                    Caption
                  </h3>
                  <p className="text-sm md:text-base text-gray-600 dark:text-zinc-300 leading-relaxed font-sans">
                    {caption}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className={isLandscape ? "grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 items-start" : "flex flex-col gap-6"}>
            
            {/* COLUMN 1: Basic Identifiers, Photographer, Dates, Locations, Reactions */}
            <div className="flex flex-col gap-5">
              {!isEditing && (
                <div className="flex items-center gap-2 bg-gray-50 dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-lg p-2.5 w-full sm:w-fit shadow-3xs">
                  {(() => {
                    const userEmailClean = currentUser?.email?.toLowerCase().trim() || "";
                    const hasLiked = !!(userEmailClean && localUserReactions.like?.includes(userEmailClean));
                    const hasLoved = !!(userEmailClean && localUserReactions.love?.includes(userEmailClean));
                    const hasInspired = !!(userEmailClean && localUserReactions.inspiring?.includes(userEmailClean));

                    return (
                      <>
                        <button
                          onClick={() => handleReactionClick("like")}
                          className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-md transition-all cursor-pointer shadow-3xs group active:scale-95 border ${
                            hasLiked 
                              ? "bg-gray-100 dark:bg-zinc-800 border-gray-400 dark:border-zinc-500 text-gray-850 dark:text-zinc-100" 
                              : "bg-white dark:bg-zinc-950 hover:bg-neutral-105 dark:hover:bg-zinc-800 border-gray-200 dark:border-zinc-800 text-gray-600 dark:text-zinc-350"
                          }`}
                          title={hasLiked ? "Liked (Click to remove)" : "Like this photo"}
                        >
                          <ThumbsUp className={`w-3.5 h-3.5 group-hover:scale-110 transition-transform ${hasLiked ? "text-gray-700 dark:text-zinc-200 fill-gray-400 dark:fill-zinc-500" : "text-gray-400 dark:text-zinc-500"}`} />
                          <span className={`text-[10px] font-bold rounded-full px-1.5 py-0.5 ml-0.5 ${hasLiked ? "bg-gray-200 dark:bg-zinc-750 text-gray-800 dark:text-zinc-200" : "bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400"}`}>
                            {localReactions.like}
                          </span>
                        </button>

                        <button
                          onClick={() => handleReactionClick("love")}
                          className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-md transition-all cursor-pointer shadow-3xs group active:scale-95 border ${
                            hasLoved 
                              ? "bg-red-50 dark:bg-red-950/20 border-[#be1f24] text-[#be1f24]" 
                              : "bg-white dark:bg-zinc-950 hover:bg-neutral-105 dark:hover:bg-zinc-800 border-gray-200 dark:border-zinc-800 text-gray-600 dark:text-zinc-350"
                          }`}
                          title={hasLoved ? "Loved (Click to remove)" : "Love this photo"}
                        >
                          <Heart className={`w-3.5 h-3.5 group-hover:scale-110 transition-transform ${hasLoved ? "text-[#be1f24] fill-[#be1f24]" : "text-gray-400 dark:text-zinc-500"}`} />
                          <span className={`text-[10px] font-bold rounded-full px-1.5 py-0.5 ml-0.5 ${hasLoved ? "bg-[#be1f24] text-white" : "bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400"}`}>
                            {localReactions.love}
                          </span>
                        </button>

                        <button
                          onClick={() => handleReactionClick("inspiring")}
                          className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-md transition-all cursor-pointer shadow-3xs group active:scale-95 border ${
                            hasInspired 
                              ? "bg-gray-100 dark:bg-zinc-800 border-gray-400 dark:border-zinc-500 text-gray-850 dark:text-zinc-100" 
                              : "bg-white dark:bg-zinc-950 hover:bg-neutral-105 dark:hover:bg-zinc-800 border-gray-200 dark:border-zinc-800 text-gray-600 dark:text-zinc-350"
                          }`}
                          title={hasInspired ? "Inspired (Click to remove)" : "Inspire this photo"}
                        >
                          <Lightbulb className={`w-3.5 h-3.5 group-hover:scale-110 transition-transform ${hasInspired ? "text-gray-700 dark:text-zinc-200 fill-gray-300 dark:fill-zinc-600" : "text-gray-400 dark:text-zinc-500"}`} />
                          <span className={`text-[10px] font-bold rounded-full px-1.5 py-0.5 ml-0.5 ${hasInspired ? "bg-gray-200 dark:bg-zinc-750 text-gray-800 dark:text-zinc-200" : "bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400"}`}>
                            {localReactions.inspiring}
                          </span>
                        </button>
                      </>
                    );
                  })()}
                </div>
              )}

              <div className="flex flex-col gap-3.5 text-xs text-gray-500 dark:text-zinc-400 mt-1">
                {isEditing ? (
                  <div className="flex flex-col gap-3.5 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-3 shadow-3xs">
                    {/* Photographer Edit */}
                    <span className="flex items-center gap-2">
                      <User className="w-4 h-4 text-[#be1f24]" />
                      <div className="flex flex-col">
                        <span className="text-[9px] text-gray-400 dark:text-zinc-500 font-bold uppercase">Photographer</span>
                        <select
                          id="edit-photographer-input"
                          value={photographer}
                          onChange={(e) => setPhotographer(e.target.value)}
                          className="bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded px-1.5 py-0.5 text-xs text-gray-900 dark:text-zinc-100 focus:outline-none focus:border-[#be1f24]"
                        >
                          {photographers.map((p) => (
                            <option key={p.id} value={p.name}>
                              {p.name}
                            </option>
                          ))}
                          {photographers.length === 0 && (
                            <option value="Sarah Jenkins">Sarah Jenkins</option>
                          )}
                        </select>
                      </div>
                    </span>

                    {/* Location Edit */}
                    <span className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-[#be1f24]" />
                      <div className="flex flex-col">
                        <span className="text-[9px] text-gray-400 dark:text-zinc-500 font-bold uppercase">Location / Country</span>
                        <input
                          id="edit-location-input"
                          type="text"
                          value={location}
                          onChange={(e) => setLocation(e.target.value)}
                          className="bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded px-1.5 py-0.5 text-xs text-gray-900 dark:text-zinc-100 focus:outline-none focus:border-[#be1f24]"
                        />
                      </div>
                    </span>

                    {/* City Edit */}
                    <span className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-[#be1f24]" />
                      <div className="flex flex-col">
                        <span className="text-[9px] text-gray-400 dark:text-zinc-500 font-bold uppercase">City</span>
                        <input
                          id="edit-city-input"
                          type="text"
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          className="bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded px-1.5 py-0.5 text-xs text-gray-900 dark:text-zinc-100 focus:outline-none focus:border-[#be1f24]"
                        />
                      </div>
                    </span>

                    {/* Date Edit */}
                    <span className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-[#be1f24]" />
                      <div className="flex flex-col">
                        <span className="text-[9px] text-gray-400 dark:text-zinc-500 font-bold uppercase">Date of Take</span>
                        <input
                          id="edit-date-input"
                          type="date"
                          value={dateCreated}
                          onChange={(e) => setDateCreated(e.target.value)}
                          className="bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded px-1.5 py-0.5 text-xs text-gray-900 dark:text-zinc-100 focus:outline-none focus:border-[#be1f24]"
                        />
                      </div>
                    </span>

                    {/* Time Edit */}
                    <span className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-[#be1f24]" />
                      <div className="flex flex-col">
                        <span className="text-[9px] text-gray-400 dark:text-zinc-500 font-bold uppercase">Time of Take</span>
                        <input
                          id="edit-timecreated-input"
                          type="text"
                          placeholder="HH:MM"
                          value={timeCreated}
                          onChange={(e) => setTimeCreated(e.target.value)}
                          className="bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded px-1.5 py-0.5 text-xs text-gray-900 dark:text-zinc-100 focus:outline-none focus:border-[#be1f24]"
                        />
                      </div>
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2.5 w-full bg-gray-50 dark:bg-zinc-900 border border-gray-200/60 dark:border-zinc-800 rounded-xl p-3 shadow-3xs">
                    {/* Photographer Row */}
                    <div className="flex items-center gap-2 border-b border-gray-200/40 dark:border-zinc-800 pb-2.5">
                      <User className="w-4 h-4 text-[#be1f24]" />
                      <div className="flex flex-col">
                        <span className="text-[9px] text-gray-400 dark:text-zinc-500 font-bold uppercase">Photographer</span>
                        <span 
                          onClick={() => onVisitProfile?.("photographer", photographer)}
                          className="font-bold text-gray-900 dark:text-zinc-100 hover:text-[#be1f24] dark:hover:text-[#be1f24] hover:underline cursor-pointer transition-colors"
                        >
                          {photographer}
                        </span>
                      </div>
                    </div>

                    {/* Uploader Row */}
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-400" />
                      <div className="flex flex-col">
                        <span className="text-[9px] text-gray-400 dark:text-zinc-500 font-bold uppercase">Uploaded By</span>
                        <span 
                          onClick={() => onVisitProfile?.("user", photo.uploadedBy || "archive.staff@chcsyria.org")}
                          className="font-bold text-gray-900 dark:text-zinc-100 hover:text-[#be1f24] dark:hover:text-[#be1f24] hover:underline cursor-pointer transition-colors"
                        >
                          {photo.uploadedBy || "archive.staff@chcsyria.org"}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            </div>

            {/* COLUMN 2: Keywords, Camera Settings */}
            <div className="flex flex-col gap-5">
              {/* Keywords / Tags */}
              <div className="flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <h3 className="font-display font-semibold text-xs uppercase tracking-wider text-gray-400">
                    Keywords & Categorization
                  </h3>
                  {!isEditing && keywords.length > 8 && (
                    <button
                      type="button"
                      onClick={() => setAreKeywordsExpanded(!areKeywordsExpanded)}
                      className="text-[10px] font-semibold uppercase tracking-wider text-[#be1f24] hover:opacity-85 transition-opacity cursor-pointer select-none"
                    >
                      {areKeywordsExpanded ? "Collapse" : `Expand (${keywords.length})`}
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5 items-center">
                  {(areKeywordsExpanded || isEditing ? keywords : keywords.slice(0, 8)).map((kw, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 text-xs text-gray-700 dark:text-zinc-200 bg-gray-100 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 px-2.5 py-1 rounded-full font-medium"
                    >
                      <span>{kw}</span>
                      {isEditing && (
                        <button
                          onClick={() => removeKeyword(kw)}
                          className="text-gray-400 hover:text-red-700 font-bold ml-1 text-[10px]"
                        >
                          ×
                        </button>
                      )}
                    </span>
                  ))}

                  {!areKeywordsExpanded && !isEditing && keywords.length > 8 && (
                    <button
                      type="button"
                      onClick={() => setAreKeywordsExpanded(true)}
                      className="inline-flex items-center text-xs text-[#be1f24] hover:underline font-semibold px-2 py-1 cursor-pointer select-none"
                    >
                      +{keywords.length - 8} more...
                    </button>
                  )}

                  {isEditing && (
                    <div className="flex items-center gap-1 ml-1">
                      <input
                        id="add-keyword-input"
                        type="text"
                        placeholder="New..."
                        value={newKeyword}
                        onChange={(e) => setNewKeyword(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && addKeyword()}
                        className="text-xs bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-full px-2.5 py-1 focus:outline-none focus:border-[#be1f24] focus:bg-white dark:focus:bg-zinc-950 text-gray-900 dark:text-zinc-100 w-16"
                      />
                      <button
                        onClick={addKeyword}
                        className="text-xs text-[#be1f24] hover:opacity-85 font-bold"
                      >
                        +
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Collection Section (Collapsible under keywords) */}
              {!isEditing && (
                <div className="bg-neutral-50/60 dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 rounded-xl p-4 flex flex-col gap-3">
                  <button
                    type="button"
                    onClick={() => setIsCollectionExpanded(!isCollectionExpanded)}
                    className="w-full flex items-center justify-between border-b border-neutral-200/60 dark:border-zinc-800 pb-2 cursor-pointer focus:outline-none select-none text-left"
                  >
                    <div className="flex items-center gap-2 text-gray-800 dark:text-zinc-200">
                      <Layers className="w-4 h-4 text-[#be1f24]" />
                      <h3 className="font-display font-bold text-xs uppercase tracking-wider text-gray-700 dark:text-zinc-300">
                        Collection
                      </h3>
                    </div>
                    {isCollectionExpanded ? (
                      <ChevronUp className="w-4 h-4 text-gray-500" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-500" />
                    )}
                  </button>

                  {isCollectionExpanded && (
                    <div className="flex flex-col gap-2.5 animate-fade-in mt-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-gray-700 dark:text-zinc-300">
                          Current:{" "}
                          {collection ? (
                            <strong
                              className="text-[#be1f24] hover:underline hover:opacity-90 cursor-pointer inline-flex items-center gap-0.5 transition-colors"
                              onClick={() => onApplySmartFilter?.("collection", collection)}
                              title="Filter by this Collection"
                            >
                              {collection}
                            </strong>
                          ) : (
                            <span className="text-gray-400 italic font-medium">None</span>
                          )}
                        </span>
                        <button
                          onClick={() => {
                            setSelectedColToAssign(collection || "");
                            setIsAddingToCollection(!isAddingToCollection);
                          }}
                          className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#be1f24] hover:opacity-80 px-2 py-0.5 rounded-md hover:bg-neutral-100 dark:hover:bg-zinc-800 border border-transparent hover:border-neutral-200 dark:hover:border-zinc-700 transition-all cursor-pointer"
                        >
                          {isAddingToCollection ? "Close" : collection ? "Change" : "Add to Collection"}
                        </button>
                      </div>

                      {isAddingToCollection && (
                        <div className="mt-2.5 pt-2.5 border-t border-gray-200/60 dark:border-zinc-800 flex flex-col gap-2.5">
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-mono font-bold text-gray-500 dark:text-zinc-400 uppercase">Select Collection</label>
                            <select
                              value={selectedColToAssign}
                              onChange={(e) => setSelectedColToAssign(e.target.value)}
                              className="w-full text-xs bg-white dark:bg-zinc-950 text-gray-900 dark:text-zinc-100 border border-gray-250 dark:border-zinc-800 rounded px-2 py-1.5 focus:outline-none focus:border-[#be1f24]"
                            >
                              <option value="">-- No Collection / Remove --</option>
                              {availableCollections.map((colName) => (
                                <option key={colName} value={colName}>{colName}</option>
                              ))}
                              <option value="__NEW__">+ Create New Collection...</option>
                            </select>
                          </div>

                          {selectedColToAssign === "__NEW__" && (
                            <div className="flex flex-col gap-2 bg-white dark:bg-zinc-950 border border-gray-150 dark:border-zinc-800 p-2.5 rounded-lg">
                              <div className="flex flex-col gap-1">
                                <label className="text-[9px] font-mono font-bold text-gray-400 dark:text-zinc-500 uppercase">New Collection Name</label>
                                <input
                                  type="text"
                                  placeholder="e.g. Damascus Healthcare 2026"
                                  value={newColToCreate}
                                  onChange={(e) => setNewColToCreate(e.target.value)}
                                  className="w-full text-xs bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded px-2 py-1 focus:outline-none focus:border-[#be1f24] focus:bg-white dark:focus:bg-zinc-950 text-gray-900 dark:text-zinc-100"
                                />
                              </div>
                              <div className="flex flex-col gap-1">
                                <label className="text-[9px] font-mono font-bold text-gray-400 dark:text-zinc-500 uppercase">Description (Optional)</label>
                                <input
                                  type="text"
                                  placeholder="Describe the purpose of this collection..."
                                  value={newColDesc}
                                  onChange={(e) => setNewColDesc(e.target.value)}
                                  className="w-full text-[11px] bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded px-2 py-1 focus:outline-none focus:border-[#be1f24] focus:bg-white dark:focus:bg-zinc-950 text-gray-900 dark:text-zinc-100"
                                />
                              </div>
                            </div>
                          )}

                          <button
                            onClick={async () => {
                              let finalColName = selectedColToAssign;
                              if (selectedColToAssign === "__NEW__") {
                                if (!newColToCreate.trim()) {
                                  await dialogService.alert("Please enter a collection name.", {
                                    title: "Collection Name Required",
                                    variant: "warning"
                                  });
                                  return;
                                }
                                const success = onAddCollection ? await onAddCollection(newColToCreate.trim(), newColDesc.trim()) : false;
                                if (!success) return;
                                finalColName = newColToCreate.trim();
                              }
                              
                              const updatedPhoto: Photo = {
                                  ...photo!,
                                  collection: finalColName || undefined
                              };
                              await onSavePhoto(updatedPhoto);
                              setIsAddingToCollection(false);
                              setNewColToCreate("");
                              setNewColDesc("");
                            }}
                            className="w-full text-center text-xs text-white bg-[#be1f24] hover:opacity-90 font-bold py-1.5 rounded-lg shadow-3xs transition-all active:scale-95 cursor-pointer"
                          >
                            Confirm Collection Assignment
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {isEditing && (
                <>
                  <hr className="border-gray-100" />

                  {/* Camera Settings / Technical Info Card */}
                  <div className="bg-gray-50 dark:bg-zinc-900 border border-gray-200/50 dark:border-zinc-800 rounded-xl p-4 flex flex-col gap-3">
                    <div className="flex items-center gap-2 text-gray-800 dark:text-zinc-200 border-b border-gray-200 dark:border-zinc-800 pb-2">
                      <Camera className="w-4 h-4 text-[#be1f24]" />
                      <h3 className="font-display font-bold text-xs uppercase tracking-wider">
                        EXIF Metadata / Gear Profile
                      </h3>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] uppercase font-mono tracking-wider text-gray-400 dark:text-zinc-500">Camera Body</span>
                        <input
                          id="edit-camera-input"
                          type="text"
                          value={camera}
                          onChange={(e) => setCamera(e.target.value)}
                          className="bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded px-1.5 py-0.5 text-xs text-gray-800 dark:text-zinc-200 focus:outline-none focus:border-[#be1f24]"
                        />
                      </div>

                      <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] uppercase font-mono tracking-wider text-gray-400 dark:text-zinc-500">Lens Profile</span>
                        <input
                          id="edit-lens-input"
                          type="text"
                          value={lens}
                          onChange={(e) => setLens(e.target.value)}
                          className="bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded px-1.5 py-0.5 text-xs text-gray-800 dark:text-zinc-200 focus:outline-none focus:border-[#be1f24]"
                        />
                      </div>

                      {/* Focal Length */}
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] uppercase font-mono tracking-wider text-gray-400 dark:text-zinc-500">Focal Length</span>
                        <input
                          id="edit-focal-input"
                          type="text"
                          placeholder="e.g. 50mm"
                          value={focalLength}
                          onChange={(e) => setFocalLength(e.target.value)}
                          className="bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded px-1.5 py-0.5 text-xs text-gray-800 dark:text-zinc-200 focus:outline-none focus:border-[#be1f24]"
                        />
                      </div>

                      <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] uppercase font-mono tracking-wider text-gray-400 dark:text-zinc-500">Sensitivity (ISO)</span>
                        <input
                          id="edit-iso-input"
                          type="text"
                          value={iso}
                          onChange={(e) => setIso(e.target.value)}
                          className="bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded px-1.5 py-0.5 text-xs text-gray-800 dark:text-zinc-200 focus:outline-none focus:border-[#be1f24]"
                        />
                      </div>

                      <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] uppercase font-mono tracking-wider text-gray-400 dark:text-zinc-500">Aperture (f)</span>
                        <input
                          id="edit-aperture-input"
                          type="text"
                          placeholder="f/2.8"
                          value={aperture}
                          onChange={(e) => setAperture(e.target.value)}
                          className="bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded px-1.5 py-0.5 text-xs text-gray-800 dark:text-zinc-200 focus:outline-none focus:border-[#be1f24]"
                        />
                      </div>

                      <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] uppercase font-mono tracking-wider text-gray-400 dark:text-zinc-500">Shutter Speed</span>
                        <input
                          id="edit-shutter-input"
                          type="text"
                          placeholder="1/250s"
                          value={shutterSpeed}
                          onChange={(e) => setShutterSpeed(e.target.value)}
                          className="bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded px-1.5 py-0.5 text-xs text-gray-800 dark:text-zinc-200 focus:outline-none focus:border-[#be1f24]"
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* COLUMN 3: Secure Archival Download options */}
            <div className="flex flex-col gap-5">
              {/* Download & Export Section */}
              <div className="bg-neutral-50/60 dark:bg-zinc-900 border border-neutral-200 dark:border-zinc-800 rounded-xl p-4 flex flex-col gap-3">
                <button
                  type="button"
                  onClick={() => setIsDownloadExpanded(!isDownloadExpanded)}
                  className="w-full flex items-center justify-between border-b border-neutral-200/60 dark:border-zinc-800 pb-2 cursor-pointer focus:outline-none select-none text-left"
                >
                  <div className="flex items-center gap-2 text-gray-800 dark:text-zinc-250">
                    <Download className="w-4 h-4 text-[#be1f24]" />
                    <h3 className="font-display font-bold text-xs uppercase tracking-wider text-gray-700 dark:text-zinc-300">
                      Secure Archival Download
                    </h3>
                  </div>
                  {isDownloadExpanded ? (
                    <ChevronUp className="w-4 h-4 text-gray-500" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  )}
                </button>

                {/* Size Options */}
                {isDownloadExpanded && (
                  <div className="flex flex-col gap-1.5 animate-fade-in">
                    <span className="text-[10px] uppercase font-mono tracking-wider text-gray-400 dark:text-zinc-500">Select Resolution</span>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setDownloadSize("small")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all text-center cursor-pointer ${
                          downloadSize === "small"
                            ? "bg-[#be1f24] text-white border-[#be1f24]"
                            : "bg-white dark:bg-zinc-950 text-gray-600 dark:text-zinc-300 border-gray-200 dark:border-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-800"
                        }`}
                      >
                        <div className="font-bold flex items-center justify-center gap-0.5">
                          <span>Small</span>
                          {checkCombinationNeedsApproval("small", withWatermark) && requestStatus !== "Approved" && (
                            <span title="Locked (Approval required)">
                              <Lock className="w-3 h-3 text-gray-400 dark:text-zinc-500 inline ml-1" />
                            </span>
                          )}
                        </div>
                        <div className="text-[9px] opacity-75 font-mono">800px max</div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setDownloadSize("medium")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all text-center cursor-pointer ${
                          downloadSize === "medium"
                            ? "bg-[#be1f24] text-white border-[#be1f24]"
                            : "bg-white dark:bg-zinc-950 text-gray-600 dark:text-zinc-300 border-gray-200 dark:border-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-800"
                        }`}
                      >
                        <div className="font-bold flex items-center justify-center gap-0.5">
                          <span>Medium</span>
                          {checkCombinationNeedsApproval("medium", withWatermark) && requestStatus !== "Approved" && (
                            <span title="Locked (Approval required)">
                              <Lock className="w-3 h-3 text-gray-400 dark:text-zinc-500 inline ml-1" />
                            </span>
                          )}
                        </div>
                        <div className="text-[9px] opacity-75 font-mono">1600px max</div>
                      </button>
                      <button
                        type="button"
                        onClick={() => setDownloadSize("original")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all text-center cursor-pointer ${
                          downloadSize === "original"
                            ? "bg-[#be1f24] text-white border-[#be1f24]"
                            : "bg-white dark:bg-zinc-950 text-gray-600 dark:text-zinc-300 border-gray-200 dark:border-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-800"
                        }`}
                      >
                        <div className="font-bold flex items-center justify-center gap-0.5">
                          <span>Original</span>
                          {checkCombinationNeedsApproval("original", withWatermark) && requestStatus !== "Approved" && (
                            <span title="Locked (Approval required)">
                              <Lock className="w-3 h-3 text-gray-400 dark:text-zinc-500 inline ml-1" />
                            </span>
                          )}
                        </div>
                        <div className="text-[9px] opacity-75 font-mono">High Res</div>
                      </button>
                    </div>

                    {/* Watermark Selector */}
                    <div className="flex flex-col gap-1.5 mt-2.5">
                      <span className="text-[10px] uppercase font-mono tracking-wider text-gray-400 dark:text-zinc-500">Watermark Configuration</span>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setWithWatermark(true)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all text-center cursor-pointer ${
                            withWatermark
                              ? "bg-[#be1f24] text-white border-[#be1f24]"
                              : "bg-white dark:bg-zinc-950 text-gray-600 dark:text-zinc-300 border-gray-200 dark:border-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-800"
                          }`}
                        >
                          With Watermark
                        </button>
                        <button
                          type="button"
                          onClick={() => setWithWatermark(false)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all text-center cursor-pointer ${
                            !withWatermark
                              ? "bg-[#be1f24] text-white border-[#be1f24]"
                              : "bg-white dark:bg-zinc-950 text-gray-600 dark:text-zinc-300 border-gray-200 dark:border-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-800"
                          }`}
                        >
                          No Watermark
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Info about Watermarking rules */}
                {isDownloadExpanded && (
                  <div className="mt-1.5 px-1 text-[11px] text-gray-500 dark:text-zinc-400 font-sans leading-relaxed flex flex-col gap-1.5">
                    <span className={withWatermark ? "text-amber-600 dark:text-amber-400 font-medium" : "text-emerald-600 dark:text-emerald-400 font-semibold"}>
                      {withWatermark ? (
                        (!currentUser || currentUser.role === "external_user" || viewAsMode === "guest")
                          ? "⚠ Watermark pattern overlay will be applied over the entire downloaded image (external user mode)."
                          : "⚠ White watermark logo will be applied on the top-left of the downloaded image (internal user mode)."
                      ) : (
                        "✓ Clean download is free of any watermarks."
                      )}
                    </span>
                    {requestStatus === "Approved" && timeLeftStr && (
                      <span className="text-amber-700 dark:text-amber-400 font-medium text-[11px] mt-1 bg-amber-50 dark:bg-amber-950/20 border border-amber-200/30 px-2 py-1 rounded flex items-center gap-1.5 self-start shadow-3xs">
                        <Clock className="w-3.5 h-3.5 text-amber-500 animate-pulse shrink-0" />
                        <span>{approvedDurationHours}-Hour Temporary Access Active. Expires in: <strong className="font-mono text-xs font-bold">{timeLeftStr}</strong></span>
                      </span>
                    )}
                  </div>
                )}

                {/* Submit / Special Request area */}
                {isDownloadExpanded && (
                  checkCombinationNeedsApproval(downloadSize, withWatermark) && requestStatus !== "Approved" ? (
                    /* Request Area */
                    <div className="mt-2 p-3 bg-neutral-100 dark:bg-zinc-950 border border-neutral-200 dark:border-zinc-850 rounded-lg flex flex-col gap-2 animate-fade-in">
                      <div className="text-xs font-bold text-gray-700 dark:text-zinc-300 flex items-center gap-1">
                        <span>Request {downloadSize === "small" ? "Small" : downloadSize === "medium" ? "Medium" : "Original"} Resolution Download ({withWatermark ? "With Watermark" : "No Watermark"})</span>
                      </div>
                      {requestStatus === "Pending" ? (
                        <div className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 border border-amber-250/30 p-2.5 rounded-lg text-center font-semibold leading-relaxed flex items-center justify-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          <span>Your request is currently pending review by archival staff.</span>
                        </div>
                      ) : requestStatus === "Rejected" ? (
                        <div className="flex flex-col gap-2">
                          <div className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20 border border-red-200/50 p-2 rounded text-center font-semibold flex items-center justify-center gap-1.5">
                            <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                            <span>Prior request was declined.</span>
                          </div>
                          <textarea
                            placeholder="Re-specify reason for request..."
                            rows={2}
                            value={requestReason}
                            onChange={(e) => setRequestReason(e.target.value)}
                            className="w-full text-xs bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded p-1.5 focus:outline-none focus:border-[#be1f24] text-gray-900 dark:text-zinc-100"
                          />
                          <button
                            type="button"
                            onClick={handleSubmitRequest}
                            disabled={isSubmittingRequest}
                            className="w-full text-center text-xs text-white bg-[#be1f24] hover:opacity-90 font-bold py-1.5 rounded transition-all cursor-pointer"
                          >
                            {isSubmittingRequest ? "Submitting..." : "Submit New Request"}
                          </button>
                        </div>
                      ) : requestStatus === "Expired" ? (
                        <div className="flex flex-col gap-2">
                          <div className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 border border-amber-250/30 p-2 rounded text-center font-semibold flex items-center justify-center gap-1.5 leading-relaxed">
                            <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0 animate-pulse" />
                            <span>Your previous approval has expired (valid for {approvedDurationHours} hours only).</span>
                          </div>
                          <textarea
                            placeholder="Specify reason for a new download request..."
                            rows={2}
                            value={requestReason}
                            onChange={(e) => setRequestReason(e.target.value)}
                            className="w-full text-xs bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded p-1.5 focus:outline-none focus:border-[#be1f24] text-gray-900 dark:text-zinc-100"
                          />
                          <button
                            type="button"
                            onClick={handleSubmitRequest}
                            disabled={isSubmittingRequest}
                            className="w-full text-center text-xs text-white bg-[#be1f24] hover:opacity-90 font-bold py-1.5 rounded transition-all cursor-pointer"
                          >
                            {isSubmittingRequest ? "Submitting..." : "Submit New Request"}
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2">
                          <textarea
                            placeholder="Specify reason (e.g. Humanitarian outreach, report publication)..."
                            rows={2}
                            value={requestReason}
                            onChange={(e) => setRequestReason(e.target.value)}
                            className="w-full text-xs bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded p-1.5 focus:outline-none focus:border-[#be1f24] text-gray-900 dark:text-zinc-100"
                          />
                          <button
                            type="button"
                            onClick={handleSubmitRequest}
                            disabled={isSubmittingRequest}
                            className="w-full text-center text-xs text-white bg-[#be1f24] hover:opacity-90 font-bold py-1.5 rounded transition-all cursor-pointer"
                          >
                            {isSubmittingRequest ? "Submitting..." : "Submit Special Request"}
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Standard Download Button */
                    <button
                      type="button"
                      onClick={triggerDownload}
                      disabled={isDownloading}
                      className="mt-1 w-full flex items-center justify-center gap-2 text-xs text-white bg-[#be1f24] hover:opacity-90 disabled:bg-gray-400 py-2.5 rounded-lg font-bold transition-all shadow-sm cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      <span>
                        {isDownloading 
                          ? "Generating File..." 
                          : `Download ${downloadSize === "small" ? "Small" : downloadSize === "medium" ? "Medium" : "Original"}`}
                      </span>
                    </button>
                  )
                )}
              </div>
            </div>

            {/* METADATA HIGHLIGHTS CARD */}
            {!isEditing && (
              <div className="md:col-span-3 mt-4 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-4 flex flex-col gap-3 shadow-3xs">
                <h3 className="font-display font-bold text-xs uppercase tracking-wider text-gray-400 dark:text-zinc-500">
                  Technical & Administrative Metadata
                </h3>
                <div className="flex flex-wrap gap-x-6 gap-y-4 items-center">
                  {/* Location Info */}
                  <div className="flex items-center gap-2 group cursor-help" title="Location of the photo">
                    <MapPin className="w-4 h-4 text-[#be1f24]" />
                    <div className="flex flex-col">
                      <span className="text-[9px] text-gray-400 dark:text-zinc-500 uppercase font-mono leading-none">Location</span>
                      <span className="text-xs font-semibold text-gray-800 dark:text-zinc-200 leading-tight">
                        {location || "Unknown Location"} {city ? `(${city})` : ""}
                      </span>
                    </div>
                  </div>

                  {/* Taken Date Info */}
                  <div className="flex items-center gap-2 group cursor-help" title="Date the photo was taken">
                    <Calendar className="w-4 h-4 text-[#be1f24]" />
                    <div className="flex flex-col">
                      <span className="text-[9px] text-gray-400 dark:text-zinc-500 uppercase font-mono leading-none">Taken</span>
                      <span className="text-xs font-semibold text-gray-800 dark:text-zinc-200 leading-tight">
                        {dateCreated || "Unknown Date"} {timeCreated ? `at ${timeCreated}` : ""}
                      </span>
                    </div>
                  </div>

                  {/* Upload Date Info */}
                  <div className="flex items-center gap-2 group cursor-help" title="Date the photo was uploaded">
                    <ArrowUpCircle className="w-4 h-4 text-gray-500" />
                    <div className="flex flex-col">
                      <span className="text-[9px] text-gray-400 dark:text-zinc-500 uppercase font-mono leading-none">Uploaded</span>
                      <span className="text-xs font-semibold text-gray-800 dark:text-zinc-200 leading-tight">
                        {dateUploaded || dateCreated}
                      </span>
                    </div>
                  </div>

                  {/* Camera Info */}
                  {camera && (
                    <div className="flex items-center gap-2 group cursor-help" title="Camera used">
                      <Camera className="w-4 h-4 text-[#be1f24]" />
                      <div className="flex flex-col">
                        <span className="text-[9px] text-gray-400 dark:text-zinc-500 uppercase font-mono leading-none">Camera</span>
                        <span className="text-xs font-semibold text-gray-800 dark:text-zinc-200 leading-tight">{camera}</span>
                      </div>
                    </div>
                  )}

                  {/* Lens Info */}
                  {lens && (
                    <div className="flex items-center gap-2 group cursor-help" title="Lens used">
                      <Compass className="w-4 h-4 text-gray-500" />
                      <div className="flex flex-col">
                        <span className="text-[9px] text-gray-400 dark:text-zinc-500 uppercase font-mono leading-none">Lens</span>
                        <span className="text-xs font-semibold text-gray-800 dark:text-zinc-200 leading-tight">{lens}</span>
                      </div>
                    </div>
                  )}

                  {/* Focal Length Info */}
                  {focalLength && (
                    <div className="flex items-center gap-2 group cursor-help" title="Focal Length">
                      <Sliders className="w-4 h-4 text-gray-500" />
                      <div className="flex flex-col">
                        <span className="text-[9px] text-gray-400 dark:text-zinc-500 uppercase font-mono leading-none">Focal Length</span>
                        <span className="text-xs font-semibold text-gray-800 dark:text-zinc-200 leading-tight">{focalLength}</span>
                      </div>
                    </div>
                  )}

                  {/* ISO Info */}
                  {iso && (
                    <div className="flex items-center gap-2 group cursor-help" title="ISO Sensitivity">
                      <div className="w-4 h-4 rounded bg-gray-100 dark:bg-zinc-850 flex items-center justify-center font-mono text-[8px] font-black tracking-tighter text-gray-600 dark:text-zinc-400 border border-gray-300 dark:border-zinc-700">
                        ISO
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[9px] text-gray-400 dark:text-zinc-500 uppercase font-mono leading-none">ISO</span>
                        <span className="text-xs font-semibold text-gray-800 dark:text-zinc-200 leading-tight">{iso}</span>
                      </div>
                    </div>
                  )}

                  {/* Aperture Info */}
                  {aperture && (
                    <div className="flex items-center gap-2 group cursor-help" title="Aperture Value">
                      <div className="w-4 h-4 rounded bg-gray-100 dark:bg-zinc-850 flex items-center justify-center font-serif text-xs font-bold text-gray-600 dark:text-zinc-400 border border-gray-300 dark:border-zinc-700">
                        ƒ
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[9px] text-gray-400 dark:text-zinc-500 uppercase font-mono leading-none">Aperture</span>
                        <span className="text-xs font-semibold text-gray-800 dark:text-zinc-200 leading-tight">{aperture}</span>
                      </div>
                    </div>
                  )}

                  {/* Shutter Speed Info */}
                  {shutterSpeed && (
                    <div className="flex items-center gap-2 group cursor-help" title="Shutter Speed">
                      <Clock className="w-4 h-4 text-gray-500" />
                      <div className="flex flex-col">
                        <span className="text-[9px] text-gray-400 dark:text-zinc-500 uppercase font-mono leading-none">Shutter Speed</span>
                        <span className="text-xs font-semibold text-gray-800 dark:text-zinc-200 leading-tight">{shutterSpeed}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>

        </div>
      </div>
    </div>
  );
}
