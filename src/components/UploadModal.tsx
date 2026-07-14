import React, { useState, useRef } from "react";
import { X, Upload, CheckCircle2, AlertTriangle, Cpu, Loader2, Sparkles, Trash2, Plus, Lock } from "lucide-react";
import ExifReader from "exifreader";
import { Photo, UserAccount, Photographer } from "../types";
import { dialogService } from "../lib/dialog";

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPhotoUploaded: (newPhoto: Photo) => void;
  currentUser?: UserAccount | null;
  photographers?: Photographer[];
  onRefreshPhotographers?: () => void;
}

interface PendingMultiPhoto {
  id: string;
  file: File;
  preview: string;
  title: string;
  caption: string;
  collection: string;
  keywords: string[];
  photographer: string;
  location: string;
  city: string;
  dateCreated: string;
  timeCreated: string;
  camera: string;
  lens: string;
  focalLength: string;
  iso: string;
  aperture: string;
  shutterSpeed: string;
  isExtracting: boolean;
  status: "pending" | "extracting" | "ready" | "uploading" | "success" | "error";
  error?: string;
}

const formatTimeToAMPM = (time24: string): string => {
  if (!time24) return "";
  const clean = time24.trim();
  if (clean.toUpperCase().includes("AM") || clean.toUpperCase().includes("PM")) {
    return clean;
  }
  const parts = clean.split(":");
  let hours = parseInt(parts[0], 10);
  let minutes = parts[1] || "00";
  let seconds = parts[2] || "00";
  if (isNaN(hours)) return clean;
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  hours = hours ? hours : 12; // 0 becomes 12
  const strHours = String(hours).padStart(2, "0");
  const strMinutes = String(minutes).padStart(2, "0").substring(0, 2);
  const strSeconds = String(seconds).padStart(2, "0").substring(0, 2);
  return `${strHours}:${strMinutes}:${strSeconds} ${ampm}`;
};

const getCountryFromCity = (city: string): string => {
  if (!city) return "Syria";
  const c = city.toLowerCase().trim();
  if (c.includes("aleppo") || c.includes("homs") || c.includes("damascus") || c.includes("latakia") || c.includes("tartus") || c.includes("hama") || c.includes("idleb")) {
    return "Syria";
  }
  if (c.includes("beirut") || c.includes("sidon") || c.includes("tripoli") || c.includes("byblos") || c.includes("tyre")) {
    return "Lebanon";
  }
  if (c.includes("amman") || c.includes("zarqa") || c.includes("irbid")) {
    return "Jordan";
  }
  if (c.includes("cairo") || c.includes("alexandria") || c.includes("giza")) {
    return "Egypt";
  }
  if (c.includes("baghdad") || c.includes("mosul") || c.includes("erbil")) {
    return "Iraq";
  }
  return "Syria"; // Default fallback
};

const generateAltTextFromMetadata = (title: string, caption: string, location: string, keywords: string[]): string => {
  let cleanedCaption = caption || "";
  
  // Strip narrative prefixes/suffixes
  cleanedCaption = cleanedCaption
    .replace(/,?\s*(highlighting|showing|depicting|documenting|reflecting|illustrating|capturing|symbolizing)\s+.*$/i, "")
    .replace(/\.\s*(This|The photo|The image|It)\s*(highlights|shows|depicts|documents|reflects|illustrates|captures|symbolizes|aims to|serves as).*$/i, "")
    .trim();

  if (cleanedCaption && cleanedCaption !== "Uploaded photographic print." && cleanedCaption !== "Uploaded photographic print documenting relief dispatches.") {
    if (!cleanedCaption.endsWith(".")) cleanedCaption += ".";
    if (cleanedCaption.toLowerCase() === (caption || "").toLowerCase()) {
      return `Visual composition showing: ${cleanedCaption}`;
    }
    return cleanedCaption;
  }

  const city = location && location !== "Unspecified" ? location.split(",")[0]?.trim() : "";
  const filteredKeywords = keywords ? keywords.filter(k => !["Archival", "Local Upload", "Bulk Upload"].includes(k)) : [];
  const keywordStr = filteredKeywords.length > 0 ? ` featuring elements of ${filteredKeywords.slice(0, 3).join(", ").toLowerCase()}` : "";
  const locationStr = city ? ` captured in ${city}` : "";
  
  let generated = `A documentary photograph`;
  if (title && !title.match(/\.(jpe?g|png|gif|webp)$/i) && !title.startsWith("HCS-")) {
    generated = `Photograph depicting ${title.toLowerCase().replace(/_/g, " ")}${locationStr}${keywordStr}.`;
  } else {
    generated = `Documentary photograph${locationStr}${keywordStr}.`;
  }
  
  return generated;
};

// Global helper to parse EXIF metadata using ExifReader
const parseFileMetadata = async (file: File) => {
  let tags: any = {};
  try {
    tags = await ExifReader.load(file);
  } catch (exifErr) {
    console.warn("Could not read EXIF data from this image format:", exifErr);
  }

  const getTagValue = (tagName: string, defaultValue: string = ""): string => {
    const tag = tags[tagName];
    if (!tag) return defaultValue;
    if (typeof tag.description === "string") return tag.description;
    if (tag.value !== undefined && tag.value !== null) {
      if (Array.isArray(tag.value)) {
        return tag.value.map((v: any) => typeof v === "object" ? v.description || String(v) : String(v)).join(", ");
      }
      return String(tag.value);
    }
    return defaultValue;
  };

  const title = getTagValue("title") || 
                getTagValue("Title") || 
                getTagValue("ObjectName") || 
                getTagValue("DocumentName") || 
                file.name;

  const caption = getTagValue("ImageDescription") || 
                  getTagValue("Description") || 
                  getTagValue("UserComment") || 
                  getTagValue("caption") || 
                  "Uploaded photographic print.";

  const photographer = getTagValue("Artist") || 
                        getTagValue("by-line") || 
                        getTagValue("Creator") || 
                        "Staff Photographer";

  let parsedCity = getTagValue("City") || getTagValue("sub-location") || "";
  const fileNameUpper = file.name.toUpperCase();
  if (fileNameUpper.includes("_ALP_")) {
    parsedCity = "Aleppo";
  } else if (fileNameUpper.includes("_HMS_")) {
    parsedCity = "Homs";
  } else if (fileNameUpper.includes("_DMS_")) {
    parsedCity = "Damascus";
  } else if (fileNameUpper.includes("_LAT_")) {
    parsedCity = "Latakia";
  } else if (fileNameUpper.includes("_TAR_")) {
    parsedCity = "Tartus";
  } else if (fileNameUpper.includes("_HMA_")) {
    parsedCity = "Hama";
  } else if (fileNameUpper.includes("_IDL_")) {
    parsedCity = "Idleb";
  } else if (fileNameUpper.includes("_ALWADI_")) {
    parsedCity = "Homs Country Side";
  }

  let autoCollection = "";
  if (fileNameUpper.startsWith("002MP_")) {
    autoCollection = "Micro Projects";
  } else if (fileNameUpper.startsWith("003RLF_")) {
    autoCollection = "Relief";
  } else if (fileNameUpper.startsWith("004S2S_")) {
    autoCollection = "School to School";
  } else if (fileNameUpper.startsWith("005DISC_")) {
    autoCollection = "DISC";
  } else if (fileNameUpper.startsWith("006SZ_")) {
    autoCollection = "Study Zone";
  } else if (fileNameUpper.startsWith("008CU_")) {
    autoCollection = "Children University";
  } else if (fileNameUpper.startsWith("009CYG")) {
    autoCollection = "CYG";
  } else if (fileNameUpper.startsWith("010LEAP")) {
    autoCollection = "LEAP";
  }

  const state = getTagValue("Province-State") || getTagValue("Province/State");
  const country = getTagValue("Country-PrimaryLocationName") || getTagValue("Country");
  
  let location = "Unspecified";
  if (parsedCity || state || country) {
    location = [parsedCity, state, country].filter(Boolean).join(", ");
  } else if (tags["GPSLatitude"] && tags["GPSLongitude"]) {
    const lat = getTagValue("GPSLatitude");
    const latRef = getTagValue("GPSLatitudeRef") || "";
    const lon = getTagValue("GPSLongitude");
    const lonRef = getTagValue("GPSLongitudeRef") || "";
    location = `GPS: ${lat} ${latRef}, ${lon} ${lonRef}`;
  }

  // Camera
  const make = getTagValue("Make");
  const model = getTagValue("Model");
  let camera = "";
  if (make && model) {
    camera = model.startsWith(make) ? model : `${make} ${model}`;
  } else if (model) {
    camera = model;
  } else if (make) {
    camera = make;
  } else {
    camera = "N/A";
  }

  const lens = getTagValue("LensModel") || getTagValue("Lens") || "N/A";
  const focalLength = getTagValue("FocalLength") || "";
  const iso = getTagValue("ISOSpeedRatings") || getTagValue("ISO") || "N/A";

  let aperture = getTagValue("FNumber") || getTagValue("ApertureValue") || "N/A";
  if (aperture !== "N/A" && !aperture.startsWith("f/")) {
    aperture = `f/${aperture}`;
  }

  const shutterSpeed = getTagValue("ExposureTime") || getTagValue("ShutterSpeedValue") || "N/A";

  let dateCreated = "";
  let timeCreated = "";
  const dateTime = getTagValue("DateTimeOriginal") || getTagValue("DateTime");
  if (dateTime && dateTime.includes(" ")) {
    const parts = dateTime.split(" ");
    dateCreated = parts[0].replace(/:/g, "-");
    timeCreated = formatTimeToAMPM(parts[1]);
  } else {
    dateCreated = new Date().toISOString().split("T")[0];
    timeCreated = formatTimeToAMPM(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }));
  }

  let keywords: string[] = [];
  for (const key of Object.keys(tags)) {
    const keyLower = key.toLowerCase();
    if (
      keyLower.includes("keyword") || 
      keyLower === "subject" || 
      keyLower.endsWith(":subject") || 
      keyLower === "tags" || 
      keyLower.endsWith(":tags") || 
      keyLower === "tag" || 
      keyLower.includes("category") || 
      keyLower.includes("categories")
    ) {
      const t = tags[key];
      if (!t) continue;
      
      let list: string[] = [];
      if (Array.isArray(t.value)) {
        list = t.value.map((v: any) => (v && typeof v === "object" ? v.description || v.value || String(v) : String(v)));
      } else if (typeof t.description === "string") {
        list = t.description.split(/[,;]/).map((s: string) => s.trim()).filter(Boolean);
      } else if (t.value !== undefined && t.value !== null) {
        list = String(t.value).split(/[,;]/).map((s: string) => s.trim()).filter(Boolean);
      }
      
      for (const kw of list) {
        const trimmed = kw.trim();
        if (trimmed && !keywords.includes(trimmed)) {
          keywords.push(trimmed);
        }
      }
    }
  }

  if (keywords.length === 0) {
    keywords = ["Archival", "Local Upload"];
  }

  const copyright = getTagValue("Copyright") || getTagValue("Copyrights") || "HCSyria Media Space";
  const creator = getTagValue("Creator") || getTagValue("by-line") || getTagValue("Artist") || "";
  
  return {
    title,
    caption,
    photographer,
    city: parsedCity || location.split(",")[0]?.trim() || "Unspecified",
    collection: autoCollection,
    location,
    camera,
    lens,
    focalLength: focalLength || (lens.match(/\d+mm/)?.[0] || "N/A"),
    iso,
    aperture,
    shutterSpeed,
    dateCreated,
    timeCreated,
    keywords,
    copyright,
    creator
  };
};

export default function UploadModal({
  isOpen,
  onClose,
  onPhotoUploaded,
  currentUser,
  photographers = [],
  onRefreshPhotographers,
}: UploadModalProps) {
  const [activeTab, setActiveTab] = useState<"single" | "multi">("single");

  // Filter approved photographers
  const approvedPhotographers = photographers.filter(p => !p.status || p.status === "Approved");

  // New photographer request states
  const [showRequestPhotographerModal, setShowRequestPhotographerModal] = useState(false);
  const [reqPhName, setReqPhName] = useState("");
  const [reqPhBio, setReqPhBio] = useState("");
  const [reqPhSubmitting, setReqPhSubmitting] = useState(false);
  const [reqPhSuccess, setReqPhSuccess] = useState("");
  const [reqPhError, setReqPhError] = useState("");

  const handlePhotographerChange = (value: string, setter: (val: string) => void, previousVal: string) => {
    if (value === "__ADD_NEW__") {
      setShowRequestPhotographerModal(true);
      setter(previousVal);
    } else {
      setter(value);
    }
  };

  const handleRequestPhotographerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reqPhName.trim() || !reqPhBio.trim()) {
      setReqPhError("All fields are required.");
      return;
    }
    setReqPhSubmitting(true);
    setReqPhError("");
    setReqPhSuccess("");

    try {
      const res = await fetch("/api/photographers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: reqPhName.trim(),
          bio: reqPhBio.trim(),
          status: "Pending" // requests need approval from archive_manager, super_admin
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit request.");
      }
      setReqPhSuccess("Your photographer approval request has been submitted successfully! Once approved by an archive manager or super admin, they will appear in the selection list.");
      setReqPhName("");
      setReqPhBio("");
      onRefreshPhotographers?.();
    } catch (err: any) {
      setReqPhError(err.message || "An error occurred.");
    } finally {
      setReqPhSubmitting(false);
    }
  };

  // Determine fallback default photographer
  const defaultPhotographer = approvedPhotographers.length > 0 ? approvedPhotographers[0].name : "Sarah Jenkins";

  // Single upload states
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>("");
  const [base64Data, setBase64Data] = useState<string>("");
  
  // Progress states
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [statusText, setStatusText] = useState("");
  const [errorText, setErrorText] = useState("");

  // Extracted metadata states (Single)
  const [title, setTitle] = useState("");
  const [caption, setCaption] = useState("");
  const [keywords, setKeywords] = useState<string[]>([]);
  const [photographer, setPhotographer] = useState(defaultPhotographer);
  const [location, setLocation] = useState("Unspecified");
  const [city, setCity] = useState("");
  const [collection, setCollection] = useState("");
  const [timeCreated, setTimeCreated] = useState("");
  const [dateCreated, setDateCreated] = useState("");
  
  // Additional requested states (Single)
  const [originalFileName, setOriginalFileName] = useState("");
  const [countryOrRegion, setCountryOrRegion] = useState("Syria");
  const [originalKeywords, setOriginalKeywords] = useState<string[]>([]);
  const [customKeywords, setCustomKeywords] = useState<string[]>([]);
  const [kwInput, setKwInput] = useState("");
  const [copyright, setCopyright] = useState("");
  const [creator, setCreator] = useState("");
  const [serialNumber, setSerialNumber] = useState("");

  // Camera settings (Single)
  const [camera, setCamera] = useState("");
  const [lens, setLens] = useState("");
  const [focalLength, setFocalLength] = useState("");
  const [iso, setIso] = useState("");
  const [aperture, setAperture] = useState("");
  const [shutterSpeed, setShutterSpeed] = useState("");
  const [isExtracted, setIsExtracted] = useState(false);
  const [coverOffsetY, setCoverOffsetY] = useState<number>(50);

  // Multi-photo upload states
  const [multiPhotos, setMultiPhotos] = useState<PendingMultiPhoto[]>([]);
  const [bulkCollection, setBulkCollection] = useState("");
  const [bulkPhotographer, setBulkPhotographer] = useState(defaultPhotographer);
  const [bulkKeywords, setBulkKeywords] = useState("Archival, Syrian Context");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const multiFileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Extract rich metadata directly from file using ExifReader (Single)
  const extractFileMetadata = async (file: File) => {
    setStatusText("Reading EXIF metadata from file...");
    setUploadProgress(60);
    
    try {
      setOriginalFileName(file.name);
      const meta = await parseFileMetadata(file);
      
      setTitle(meta.title || file.name);
      setCaption(meta.caption);
      
      const registeredNames = photographers.map(p => p.name);
      let parsedPhotographer = meta.photographer;
      if (!registeredNames.includes(parsedPhotographer)) {
        parsedPhotographer = defaultPhotographer;
      }
      setPhotographer(parsedPhotographer);

      setCity(meta.city);
      setCountryOrRegion(getCountryFromCity(meta.city || meta.location));
      setCollection(meta.collection);
      setLocation(meta.location);
      setCamera(meta.camera);
      setLens(meta.lens);
      setFocalLength(meta.focalLength);
      setIso(meta.iso);
      setAperture(meta.aperture);
      setShutterSpeed(meta.shutterSpeed);
      setDateCreated(meta.dateCreated);
      setTimeCreated(meta.timeCreated);
      
      setOriginalKeywords(meta.keywords || []);
      setCustomKeywords([]);
      setCopyright(meta.copyright || "HCSyria Media Space");
      setCreator(meta.creator || "");

      // Generate secure unique non-duplicable serial number
      const cleanDate = (meta.dateCreated || new Date().toISOString().split("T")[0]).replace(/-/g, "");
      const randHex = Math.floor(100000 + Math.random() * 900000).toString(16).toUpperCase();
      const sNum = `HCS-${cleanDate}-${randHex}`;
      setSerialNumber(sNum);

      setUploadProgress(100);
      setStatusText("File metadata extracted successfully!");

      setTimeout(() => {
        setIsUploading(false);
        setIsExtracted(true);
      }, 400);

    } catch (err: any) {
      console.error("Metadata extraction error:", err);
      setErrorText("Failed to read metadata from the file.");
      setIsUploading(false);
    }
  };

  // Process selected file (Single)
  const handleFileChange = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setErrorText("Please upload an image file (PNG, JPG, WEBP).");
      return;
    }

    setErrorText("");
    setIsUploading(true);
    setUploadProgress(10);
    setStatusText("Reading file from disk...");

    const reader = new FileReader();
    reader.onloadstart = () => {
      setUploadProgress(20);
      setStatusText("Reading image content...");
    };
    reader.onprogress = (e) => {
      if (e.lengthComputable) {
        const percent = Math.round((e.loaded / e.total) * 20) + 20; // 20% to 40%
        setUploadProgress(percent);
      }
    };
    reader.onload = async () => {
      const result = reader.result as string;
      setImagePreview(result);
      setMimeType(file.type);
      
      const base64Str = result.split(",")[1];
      setBase64Data(base64Str);

      await extractFileMetadata(file);
    };
    reader.readAsDataURL(file);
  };

  // Process multiple selected files (Multi)
  const handleMultiFileChange = async (files: FileList) => {
    setErrorText("");
    setIsUploading(true);
    setUploadProgress(10);
    setStatusText(`Processing ${files.length} images...`);

    const newPendingList: PendingMultiPhoto[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith("image/")) continue;
      
      const id = `pending_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 5)}`;
      
      // Read file data URL for local display/upload
      const preview = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });

      const pendingItem: PendingMultiPhoto = {
        id,
        file,
        preview,
        title: file.name,
        caption: "Uploaded photographic print documenting relief dispatches.",
        collection: "",
        keywords: ["Archival", "Bulk Upload"],
        photographer: "Staff Photographer",
        location: "Syria",
        city: "Aleppo",
        dateCreated: new Date().toISOString().split("T")[0],
        timeCreated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
        camera: "N/A",
        lens: "N/A",
        focalLength: "N/A",
        iso: "N/A",
        aperture: "N/A",
        shutterSpeed: "N/A",
        isExtracting: true,
        status: "extracting"
      };

      newPendingList.push(pendingItem);
    }

    if (newPendingList.length === 0) {
      setIsUploading(false);
      return;
    }

    setMultiPhotos(prev => [...prev, ...newPendingList]);
    setUploadProgress(50);
    setStatusText("Extracting EXIF metadata for files...");

    // Process EXIF metadata in background for each
    let completedCount = 0;
    for (const item of newPendingList) {
      try {
        const meta = await parseFileMetadata(item.file);
        setMultiPhotos(prev => prev.map(p => p.id === item.id ? {
          ...p,
          ...meta,
          isExtracting: false,
          status: "ready"
        } : p));
      } catch (err: any) {
        console.error("EXIF extraction error in bulk for file:", item.file.name, err);
        setMultiPhotos(prev => prev.map(p => p.id === item.id ? {
          ...p,
          isExtracting: false,
          status: "ready"
        } : p));
      }
      completedCount++;
      setUploadProgress(Math.min(95, 50 + Math.round((completedCount / newPendingList.length) * 45)));
    }

    setIsUploading(false);
    setUploadProgress(0);
    setStatusText("");
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDropSingle = (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileChange(files[0]);
    }
  };

  const handleDropMulti = (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleMultiFileChange(files);
    }
  };

  // Apply bulk settings to all pending photos
  const handleBulkApply = () => {
    setMultiPhotos(prev => prev.map(p => ({
      ...p,
      collection: bulkCollection ? bulkCollection : p.collection,
      photographer: bulkPhotographer ? bulkPhotographer : p.photographer,
      keywords: bulkKeywords ? bulkKeywords.split(",").map(s => s.trim()).filter(Boolean) : p.keywords
    })));
  };

  const handleRemoveMultiItem = (id: string) => {
    setMultiPhotos(prev => prev.filter(p => p.id !== id));
  };

  const handleUpdateMultiField = (id: string, field: keyof PendingMultiPhoto, value: any) => {
    setMultiPhotos(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  // Submit Single Photo to library
  const handleSubmitSingle = async () => {
    if (!title) {
      setErrorText("Catalog title is required.");
      return;
    }

    setIsUploading(true);
    setErrorText("");
    setStatusText("Preparing catalog database payload...");
    setUploadProgress(10);

    const estBytes = base64Data ? Math.round(base64Data.length * 3 / 4) : 0;
    const sizeStr = estBytes > 1024 * 1024 
      ? `${(estBytes / (1024 * 1024)).toFixed(2)} MB` 
      : `${(estBytes / 1024).toFixed(1)} KB`;

    const progressSteps = [
      { progress: 20, text: "Optimizing record metadata fields..." },
      { progress: 45, text: `Transmitting image asset payload (${sizeStr})...` },
      { progress: 70, text: "Registering archive catalog records..." },
      { progress: 88, text: "Generating search catalog index parameters..." },
      { progress: 95, text: "Confirming final database handshake..." }
    ];

    let currentStep = 0;
    const progressInterval = setInterval(() => {
      if (currentStep < progressSteps.length) {
        const step = progressSteps[currentStep];
        setUploadProgress(step.progress);
        setStatusText(step.text);
        currentStep++;
      }
    }, 550);

    try {
      const combinedKeywords = Array.from(new Set([...originalKeywords, ...customKeywords])).filter(Boolean);

      const newPhotoObj: Photo = {
        id: `photo_${Date.now()}`,
        url: imagePreview || "",
        title,
        caption,
        keywords: combinedKeywords,
        photographer,
        location,
        city: city || location.split(",")[0]?.trim() || "Unspecified",
        countryOrRegion: countryOrRegion || getCountryFromCity(city || location),
        originalFileName: originalFileName || "Unknown",
        originalKeywords: originalKeywords,
        copyright: copyright || "HCSyria Media Space",
        creator: creator || "",
        altText: caption || "",
        serialNumber: serialNumber || `HCS-${Date.now()}`,
        uploaderName: currentUser?.name || currentUser?.email || "Contributor",
        collection: collection || "",
        dateCreated: dateCreated || new Date().toISOString().split("T")[0],
        timeCreated: timeCreated || formatTimeToAMPM(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })),
        dateUploaded: new Date().toISOString().split("T")[0],
        uploadedBy: currentUser?.email || "archive.staff@chcsyria.org",
        status: "Pending", // Admin approval required
        views: 0,
        downloads: 0,
        coverOffsetY,
        cameraSettings: {
          camera: camera || "N/A",
          lens: lens || "N/A",
          iso: iso || "N/A",
          aperture: aperture || "N/A",
          shutterSpeed: shutterSpeed || "N/A",
          focalLength: focalLength || (lens.match(/\d+mm/)?.[0] || "N/A"),
        },
      };

      const res = await fetch("/api/images", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newPhotoObj),
      });

      if (!res.ok) {
        let errMsg = "Failed to save uploaded image in photo library backend.";
        try {
          const errData = await res.json();
          if (errData && errData.error) {
            errMsg = errData.error;
          }
        } catch (e) {}
        throw new Error(errMsg);
      }

      const resData = await res.json();
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      setStatusText("Catalog submission successful!");

      // Small delay before closing so user can see completion
      await new Promise((resolve) => setTimeout(resolve, 400));

      onPhotoUploaded(resData.photo);
      onClose();
      resetForm();
    } catch (err: any) {
      clearInterval(progressInterval);
      setIsUploading(false);
      setErrorText(err.message || "Failed to submit photo.");
    }
  };

  // Submit Multi Photos in Bulk
  const handleSubmitMulti = async () => {
    if (multiPhotos.length === 0) {
      setErrorText("No photos selected for bulk upload.");
      return;
    }

    setIsUploading(true);
    setErrorText("");
    setStatusText(`Packing batch payload for ${multiPhotos.length} photos...`);
    setUploadProgress(10);

    const totalBytes = multiPhotos.reduce((acc, curr) => acc + (curr.preview ? curr.preview.length * 3/4 : 0), 0);
    const totalSizeFormatted = totalBytes > 1024 * 1024 
      ? `${(totalBytes / (1024 * 1024)).toFixed(2)} MB` 
      : `${(totalBytes / 1024).toFixed(1)} KB`;

    const progressSteps = [
      { progress: 25, text: `Preparing batch transmission payload (${totalSizeFormatted})...` },
      { progress: 45, text: `Transmitting multi-image assets to server...` },
      { progress: 65, text: `Creating ${multiPhotos.length} archival database records...` },
      { progress: 85, text: `Indexing catalog fields and generating deep search tokens...` },
      { progress: 95, text: `Awaiting final server confirmation...` }
    ];

    let currentStep = 0;
    const progressInterval = setInterval(() => {
      if (currentStep < progressSteps.length) {
        const step = progressSteps[currentStep];
        setUploadProgress(step.progress);
        setStatusText(step.text);
        currentStep++;
      }
    }, 800);

    try {
      const photosToUpload: Photo[] = multiPhotos.map((p, index) => ({
        id: `photo_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 5)}`,
        url: p.preview,
        title: p.title || p.file.name,
        caption: p.caption,
        altText: p.caption || "",
        keywords: p.keywords,
        photographer: p.photographer,
        location: p.location,
        city: p.city || p.location.split(",")[0]?.trim() || "Unspecified",
        collection: p.collection || "",
        dateCreated: p.dateCreated,
        timeCreated: p.timeCreated,
        dateUploaded: new Date().toISOString().split("T")[0],
        uploadedBy: currentUser?.email || "archive.staff@chcsyria.org",
        status: (currentUser?.role === "super_admin" || currentUser?.role === "archive_manager") ? "Approved" : "Pending", // Direct approval for admins/managers, pending for others
        views: 0,
        downloads: 0,
        cameraSettings: {
          camera: p.camera,
          lens: p.lens,
          iso: p.iso,
          aperture: p.aperture,
          shutterSpeed: p.shutterSpeed,
          focalLength: p.focalLength,
        }
      }));

      const res = await fetch("/api/images/bulk", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(photosToUpload)
      });

      if (!res.ok) {
        let errMsg = "Failed to save bulk uploads on the server.";
        try {
          const text = await res.text();
          try {
            const parsed = JSON.parse(text);
            if (parsed && parsed.error) {
              errMsg = `Server error: ${parsed.error}`;
            } else if (parsed && parsed.message) {
              errMsg = `Server error: ${parsed.message}`;
            } else {
              errMsg = `Server returned status ${res.status}: ${text.substring(0, 150)}`;
            }
          } catch (_) {
            if (text) {
              errMsg = `Server returned: ${text.substring(0, 150)}`;
            } else {
              errMsg = `Server returned status ${res.status}`;
            }
          }
        } catch (readErr: any) {
          errMsg = `Network or response reading error: ${readErr.message || readErr}`;
        }
        throw new Error(errMsg);
      }

      const resData = await res.json();
      
      clearInterval(progressInterval);
      setUploadProgress(95);
      setStatusText("Indexing uploaded photos...");

      if (resData.photos && Array.isArray(resData.photos)) {
        resData.photos.forEach((ph: Photo) => {
          onPhotoUploaded(ph);
        });
      }

      setUploadProgress(100);
      setStatusText("Bulk upload completed successfully!");

      await new Promise((resolve) => setTimeout(resolve, 600));
      onClose();
      resetForm();

    } catch (err: any) {
      clearInterval(progressInterval);
      setErrorText(err.message || "Failed to submit bulk photos.");
      setIsUploading(false);
    }
  };

  const resetForm = () => {
    setImagePreview(null);
    setMimeType("");
    setBase64Data("");
    setIsUploading(false);
    setUploadProgress(0);
    setStatusText("");
    setErrorText("");
    setIsExtracted(false);
    setTitle("");
    setCaption("");
    setKeywords([]);
    setPhotographer("Staff Photographer");
    setLocation("Unspecified");
    setCity("");
    setCollection("");
    setTimeCreated("");
    setDateCreated("");
    setCamera("");
    setLens("");
    setFocalLength("");
    setIso("");
    setAperture("");
    setShutterSpeed("");
    setCoverOffsetY(50);

    // Reset additional requested states
    setOriginalFileName("");
    setCountryOrRegion("Syria");
    setOriginalKeywords([]);
    setCustomKeywords([]);
    setKwInput("");
    setCopyright("");
    setCreator("");
    setSerialNumber("");

    // Clear bulk upload states
    setMultiPhotos([]);
    setBulkCollection("");
    setBulkPhotographer("Staff Photographer");
    setBulkKeywords("Archival, Syrian Context");
  };

  const handleSelectClick = () => {
    fileInputRef.current?.click();
  };

  const handleSelectMultiClick = () => {
    multiFileInputRef.current?.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-xs animate-fade-in">
      <div className="relative bg-white dark:bg-zinc-950 w-full max-w-4xl max-h-[92vh] rounded-2xl overflow-hidden shadow-2xl border border-gray-100 dark:border-zinc-850 flex flex-col">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-gray-100 dark:border-zinc-800 flex items-center justify-between bg-gray-50/60 dark:bg-zinc-900/60 backdrop-blur-md">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <Upload className="w-5 h-5 text-[#be1f24]" />
              <h2 className="font-display font-black text-base text-gray-950 dark:text-zinc-50 uppercase tracking-tight">
                Media Space Catalog Submissions
              </h2>
            </div>
            {/* Tabs Selector */}
            <div className="flex gap-4 mt-2 border-b border-transparent">
              <button
                type="button"
                onClick={() => {
                  if (!isUploading) {
                    setActiveTab("single");
                    setErrorText("");
                  }
                }}
                className={`pb-1 text-xs font-bold uppercase tracking-wider cursor-pointer transition-all border-b-2 ${
                  activeTab === "single"
                    ? "text-[#be1f24] border-[#be1f24]"
                    : "text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-zinc-300 border-transparent"
                }`}
                disabled={isUploading}
              >
                Single Photo Upload
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!isUploading) {
                    setActiveTab("multi");
                    setErrorText("");
                  }
                }}
                className={`pb-1 text-xs font-bold uppercase tracking-wider cursor-pointer transition-all border-b-2 ${
                  activeTab === "multi"
                    ? "text-[#be1f24] border-[#be1f24]"
                    : "text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-zinc-300 border-transparent"
                }`}
                disabled={isUploading}
              >
                Multi-Photos Upload (Bulk)
              </button>
            </div>
          </div>
          <button
            onClick={() => {
              onClose();
              resetForm();
            }}
            className="p-1.5 rounded-full hover:bg-gray-200 dark:hover:bg-zinc-800 text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 bg-white dark:bg-zinc-950">
          
          {errorText && (
            <div className="flex items-start gap-3 bg-white dark:bg-zinc-900 border border-[#be1f24] p-4 rounded-xl text-xs text-gray-800 dark:text-zinc-200 shadow-3xs">
              <AlertTriangle className="w-4 h-4 text-[#be1f24] flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-bold">Extraction / Upload Issue</p>
                <p className="mt-1 leading-relaxed">{errorText}</p>
                <p className="mt-2 text-[10px] text-gray-500 dark:text-zinc-400">
                  Tip: Ensure your photos are valid image files (JPG, PNG, WEBP). Bulk uploads support EXIF reading too.
                </p>
              </div>
            </div>
          )}

          {/* Progress Indicator for loading/saving */}
          {isUploading && (
            <div className="bg-gray-50 dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-xl p-5 flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 text-xs font-semibold text-gray-800 dark:text-zinc-200">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#be1f24]" />
                    <span>{statusText}</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-zinc-800 h-2 rounded-full overflow-hidden mt-2.5">
                    <div
                      className="bg-[#be1f24] h-full rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                  <span className="text-[10px] font-mono text-gray-500 dark:text-zinc-400 block mt-1">
                    {uploadProgress}% complete
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 1: SINGLE PHOTO UPLOAD */}
          {activeTab === "single" && (
            <>
              {/* Drag & Drop Box */}
              {!imagePreview && (
                <div
                  onDragOver={handleDragOver}
                  onDrop={handleDropSingle}
                  onClick={handleSelectClick}
                  className="border-2 border-dashed border-gray-300 dark:border-zinc-800 hover:border-[#be1f24] bg-gray-50/50 dark:bg-zinc-900/30 hover:bg-gray-100/50 dark:hover:bg-zinc-900/60 rounded-2xl p-10 flex flex-col items-center justify-center text-center gap-4 cursor-pointer transition-all min-h-[220px]"
                >
                  <div className="w-14 h-14 rounded-full bg-gray-100 dark:bg-zinc-800 text-[#be1f24] flex items-center justify-center shadow-inner">
                    <Upload className="w-7 h-7" />
                  </div>
                  <div>
                    <p className="font-sans font-bold text-gray-800 dark:text-zinc-200 text-base">
                      Drag and drop a photo here
                    </p>
                    <p className="text-xs text-gray-500 dark:text-zinc-400 mt-1">
                      or click to select from computer
                    </p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => e.target.files && handleFileChange(e.target.files[0])}
                    className="hidden"
                  />
                </div>
              )}

              {/* Data Form Panel */}
              {imagePreview && isExtracted && (
                <div className="flex flex-col gap-5 border border-gray-200/60 dark:border-zinc-800 rounded-xl p-5 bg-neutral-50/50 dark:bg-zinc-900/30">
                  <div className="flex items-center justify-between border-b border-gray-200 dark:border-zinc-800 pb-3">
                    <div className="flex items-center gap-2">
                      <Cpu className="w-4.5 h-4.5 text-[#be1f24]" />
                      <h3 className="font-display font-black text-xs uppercase tracking-wider text-gray-800 dark:text-zinc-200">
                        Extracted Catalog Data
                      </h3>
                    </div>
                    <span className="flex items-center gap-1 text-[10px] text-green-700 bg-green-50 dark:bg-green-950/30 px-2.5 py-1 rounded-full border border-green-200 dark:border-green-900 font-semibold">
                      <Cpu className="w-3 h-3" />
                      <span>EXIF Extracted Successfully</span>
                    </span>
                  </div>

                  {/* Form fields & image preview */}
                  <div className="flex flex-col md:flex-row gap-5">
                    <div className="w-full md:w-1/3 flex flex-col gap-3">
                      <div className="flex flex-col gap-1">
                        <span className="text-xs font-semibold text-gray-700 dark:text-zinc-300">Image Asset Preview</span>
                        <div className="aspect-square w-full rounded-lg overflow-hidden border border-gray-200 dark:border-zinc-800 bg-black">
                          <img
                            src={imagePreview}
                            alt="Extracted preview"
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-contain"
                          />
                        </div>
                      </div>

                      {/* Main Cover Reframe Preview */}
                      {imagePreview && (
                        <div className="flex flex-col gap-1">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-semibold text-gray-700 dark:text-zinc-300">Cover Reframe Preview</span>
                            <span className="text-[9px] font-mono font-bold text-gray-400 dark:text-zinc-500">Drag to reframe: {Math.round(coverOffsetY)}%</span>
                          </div>
                          <div 
                            className="relative w-full h-[120px] rounded-lg overflow-hidden border border-gray-200 dark:border-zinc-800 bg-zinc-900 cursor-ns-resize group select-none touch-none"
                            onPointerDown={(e) => {
                              const rect = e.currentTarget.getBoundingClientRect();
                              const containerHeight = rect.height;
                              const startY = e.clientY;
                              const startOffset = coverOffsetY;
                              
                              const handlePointerMove = (moveEvent: PointerEvent) => {
                                const deltaY = moveEvent.clientY - startY;
                                const deltaPct = (deltaY / containerHeight) * 100;
                                const newOffset = Math.max(0, Math.min(100, startOffset - deltaPct));
                                setCoverOffsetY(newOffset);
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
                              className="absolute inset-0 transition-all pointer-events-none"
                              style={{
                                backgroundImage: `url(${imagePreview})`,
                                backgroundSize: "cover",
                                backgroundPosition: `50% ${coverOffsetY}%`
                              }}
                            />
                            {/* Dark tint overlay */}
                            <div className="absolute inset-0 bg-black/40 pointer-events-none flex flex-col justify-between p-3">
                              <div className="text-[8px] bg-black/50 text-white border border-white/10 px-1.5 py-0.5 rounded self-start">
                                ↕️ Drag Up/Down to Reframe
                              </div>
                              <div className="text-[10px] text-white font-bold drop-shadow-xs truncate">
                                {title || "Featured Cover Mockup"}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      <button
                        onClick={resetForm}
                        className="text-center text-[10px] text-[#be1f24] hover:underline font-semibold cursor-pointer py-1"
                      >
                        Change photo / Start Over
                      </button>
                    </div>

                    <div className="flex-1 flex flex-col gap-4">
                      {/* Title */}
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-semibold text-gray-700 dark:text-zinc-300">
                          Title <span className="text-[#be1f24] font-bold">*</span>
                        </label>
                        <input
                          type="text"
                          value={title}
                          onChange={(e) => setTitle(e.target.value)}
                          placeholder="Original filename or specific metadata title"
                          className="w-full text-xs bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded px-2.5 py-2 text-gray-800 dark:text-zinc-100 focus:outline-none focus:border-[#be1f24]"
                        />
                      </div>
      
                      {/* Collection */}
                      <div className="flex flex-col gap-1">
                        <div className="flex justify-between items-center">
                          <label className="text-xs font-semibold text-gray-700 dark:text-zinc-300">Collection / Project</label>
                          <span className="text-[9px] font-mono font-bold text-gray-400 dark:text-zinc-500">Optional</span>
                        </div>
                        <input
                          type="text"
                          value={collection}
                          onChange={(e) => setCollection(e.target.value)}
                          placeholder="e.g. Micro Projects, Relief, etc."
                          className="w-full text-xs bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded px-2.5 py-2 text-gray-800 dark:text-zinc-100 focus:outline-none focus:border-[#be1f24]"
                        />
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {["Micro Projects", "Relief", "School to School", "DISC", "Study Zone", "Children University", "CYG", "LEAP"].map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => setCollection(preset)}
                              className={`text-[9px] font-bold px-2 py-0.5 rounded border transition-all cursor-pointer ${
                                collection === preset
                                  ? "bg-[#be1f24] text-white border-[#be1f24]"
                                  : "bg-gray-50 dark:bg-zinc-900 text-gray-500 dark:text-zinc-400 border-gray-150 dark:border-zinc-800 hover:bg-gray-100 dark:hover:bg-zinc-800"
                              }`}
                            >
                              {preset}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Caption */}
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-semibold text-gray-700 dark:text-zinc-300">Caption / Narrative Description</label>
                        <textarea
                          rows={3}
                          value={caption}
                          onChange={(e) => setCaption(e.target.value)}
                          placeholder="Provide a narrative description of the photograph, event, and subjects..."
                          className="w-full text-xs bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded p-2.5 text-gray-800 dark:text-zinc-100 focus:outline-none resize-none focus:border-[#be1f24]"
                        />
                      </div>

                      {/* Keywords & Tags Section */}
                      <div className="flex flex-col gap-2 border border-gray-150 dark:border-zinc-800 p-3 rounded-lg bg-white dark:bg-zinc-950/40">
                        <label className="text-xs font-bold text-gray-700 dark:text-zinc-300 flex items-center gap-1.5">
                          <span>Keywords & Metadata Tags</span>
                        </label>
                        
                        {/* Original Keywords (Protected) */}
                        {originalKeywords.length > 0 && (
                          <div className="flex flex-col gap-1">
                            <span className="text-[9px] uppercase tracking-wider font-bold text-gray-400 dark:text-zinc-500 flex items-center gap-1">
                              <Lock className="w-2.5 h-2.5" /> Original Tags (Protected / Read-Only)
                            </span>
                            <div className="flex flex-wrap gap-1.5 p-1.5 bg-gray-50 dark:bg-zinc-900/60 rounded border border-gray-100 dark:border-zinc-800">
                              {originalKeywords.map((tag) => (
                                <span key={tag} className="inline-flex items-center gap-1 text-[10px] bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400 px-2 py-0.5 rounded border border-gray-200 dark:border-zinc-700">
                                  <Lock className="w-2 h-2 text-gray-400" />
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Custom Keywords */}
                        <div className="flex flex-col gap-1">
                          <span className="text-[9px] uppercase tracking-wider font-bold text-gray-400 dark:text-zinc-500">
                            Custom Tags
                          </span>
                          <div className="flex flex-wrap gap-1.5 min-h-[30px] p-1.5 bg-white dark:bg-zinc-950 rounded border border-gray-100 dark:border-zinc-850">
                            {customKeywords.length === 0 ? (
                              <span className="text-[10px] text-gray-400 italic">No custom tags added yet. Use field below.</span>
                            ) : (
                              customKeywords.map((tag) => (
                                <span key={tag} className="inline-flex items-center gap-1 text-[10px] bg-red-50 dark:bg-red-950/20 text-[#be1f24] dark:text-red-400 px-2 py-0.5 rounded border border-red-100 dark:border-red-900/30 font-bold">
                                  {tag}
                                  <button
                                    type="button"
                                    onClick={() => setCustomKeywords(prev => prev.filter(t => t !== tag))}
                                    className="hover:text-red-800 dark:hover:text-red-200 font-bold cursor-pointer"
                                  >
                                    <X className="w-2.5 h-2.5" />
                                  </button>
                                </span>
                              ))
                            )}
                          </div>
                        </div>

                        {/* Custom Tag Input */}
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={kwInput}
                            onChange={(e) => setKwInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                const clean = kwInput.trim();
                                if (clean && !originalKeywords.includes(clean) && !customKeywords.includes(clean)) {
                                  setCustomKeywords(prev => [...prev, clean]);
                                }
                                setKwInput("");
                              }
                            }}
                            placeholder="Add tag (Press Enter or click +)"
                            className="flex-1 text-xs bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-850 rounded px-2.5 py-1.5 text-gray-800 dark:text-zinc-100 focus:outline-none focus:border-[#be1f24]"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const clean = kwInput.trim();
                              if (clean && !originalKeywords.includes(clean) && !customKeywords.includes(clean)) {
                                setCustomKeywords(prev => [...prev, clean]);
                              }
                              setKwInput("");
                            }}
                            className="bg-[#be1f24] text-white px-3 py-1.5 rounded text-xs font-bold hover:opacity-95 transition-opacity cursor-pointer flex items-center gap-1"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add</span>
                          </button>
                        </div>
                      </div>

                    </div>
                  </div>

                  {/* Comprehensive Metadata Workspace (Locked and Editable Columns) */}
                  <div className="border-t border-gray-200 dark:border-zinc-800 pt-5 flex flex-col gap-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      
                      {/* Left: Editable Catalog Attributes & Rights */}
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center gap-2 border-b border-gray-150 dark:border-zinc-800 pb-2">
                          <Sparkles className="w-4 h-4 text-[#be1f24]" />
                          <h4 className="text-xs font-black uppercase text-gray-800 dark:text-zinc-200 tracking-wider">
                            Editable Catalog Fields
                          </h4>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {/* Photographer Selection */}
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">Photographer</label>
                            <select
                              value={photographer}
                              onChange={(e) => handlePhotographerChange(e.target.value, setPhotographer, photographer)}
                              className="bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded px-2.5 py-1.5 text-xs text-gray-700 dark:text-zinc-200 focus:outline-none focus:border-[#be1f24] cursor-pointer"
                            >
                              {approvedPhotographers.map((p) => (
                                <option key={p.id} value={p.name}>
                                  {p.name}
                                </option>
                              ))}
                              {approvedPhotographers.length === 0 && (
                                <option value="Sarah Jenkins">Sarah Jenkins</option>
                              )}
                              <option value="__ADD_NEW__" className="text-[#be1f24] font-semibold">+ Add Photographer Request</option>
                            </select>
                          </div>

                          {/* Country / Region */}
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">Country or Region</label>
                            <input
                              type="text"
                              value={countryOrRegion}
                              onChange={(e) => setCountryOrRegion(e.target.value)}
                              className="bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded px-2.5 py-1.5 text-xs text-gray-700 dark:text-zinc-200 focus:outline-none focus:border-[#be1f24]"
                              placeholder="Syria, Lebanon, etc."
                            />
                          </div>

                          {/* Specific Location Description */}
                          <div className="flex flex-col gap-1 sm:col-span-2">
                            <label className="text-[10px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">Location Details (Specific Place)</label>
                            <input
                              type="text"
                              value={location}
                              onChange={(e) => setLocation(e.target.value)}
                              className="bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded px-2.5 py-1.5 text-xs text-gray-700 dark:text-zinc-200 focus:outline-none focus:border-[#be1f24]"
                              placeholder="e.g. Al-Jamiliah neighborhood, Aleppo"
                            />
                          </div>

                          {/* Copyright */}
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">Copyright Owner</label>
                            <input
                              type="text"
                              value={copyright}
                              onChange={(e) => setCopyright(e.target.value)}
                              className="bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded px-2.5 py-1.5 text-xs text-gray-700 dark:text-zinc-200 focus:outline-none focus:border-[#be1f24]"
                            />
                          </div>

                          {/* Creator */}
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">Creator / Creator Agency</label>
                            <input
                              type="text"
                              value={creator}
                              onChange={(e) => setCreator(e.target.value)}
                              className="bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded px-2.5 py-1.5 text-xs text-gray-700 dark:text-zinc-200 focus:outline-none focus:border-[#be1f24]"
                              placeholder="e.g. Hope Center Syria"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Right: Non-Editable Original Camera, EXIF, & Registry Log */}
                      <div className="flex flex-col gap-3">
                        <div className="flex items-center gap-2 border-b border-gray-150 dark:border-zinc-800 pb-2">
                          <Lock className="w-4 h-4 text-gray-400 dark:text-zinc-500" />
                          <h4 className="text-xs font-black uppercase text-gray-400 dark:text-zinc-500 tracking-wider flex items-center gap-1">
                            Protected Metadata (Read-Only)
                          </h4>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 bg-gray-50/70 dark:bg-zinc-900/40 border border-gray-100 dark:border-zinc-800/80 rounded-xl text-[11px]">
                          {/* Original Filename */}
                          <div className="flex flex-col gap-0.5 sm:col-span-2">
                            <span className="font-bold text-gray-400 uppercase text-[9px] tracking-wider flex items-center gap-1">Original Filename 🔒</span>
                            <span className="font-mono text-gray-600 dark:text-zinc-300 truncate bg-white/40 dark:bg-black/20 p-1 rounded border border-black/5 dark:border-white/5">{originalFileName || "N/A"}</span>
                          </div>

                          {/* Serial Number */}
                          <div className="flex flex-col gap-0.5">
                            <span className="font-bold text-gray-400 uppercase text-[9px] tracking-wider flex items-center gap-1">Serial Code 🔒</span>
                            <span className="font-mono text-gray-600 dark:text-zinc-300 select-all truncate bg-white/40 dark:bg-black/20 p-1 rounded border border-black/5 dark:border-white/5">{serialNumber || "N/A"}</span>
                          </div>

                          {/* Date of Upload */}
                          <div className="flex flex-col gap-0.5">
                            <span className="font-bold text-gray-400 uppercase text-[9px] tracking-wider flex items-center gap-1">Upload Date 🔒</span>
                            <span className="text-gray-600 dark:text-zinc-300 truncate bg-white/40 dark:bg-black/20 p-1 rounded border border-black/5 dark:border-white/5">{new Date().toISOString().split("T")[0]}</span>
                          </div>

                          {/* Date Created */}
                          <div className="flex flex-col gap-0.5">
                            <span className="font-bold text-gray-400 uppercase text-[9px] tracking-wider flex items-center gap-1">Date Taken 🔒</span>
                            <span className="text-gray-600 dark:text-zinc-300 truncate bg-white/40 dark:bg-black/20 p-1 rounded border border-black/5 dark:border-white/5">{dateCreated || "N/A"}</span>
                          </div>

                          {/* Time Created */}
                          <div className="flex flex-col gap-0.5">
                            <span className="font-bold text-gray-400 uppercase text-[9px] tracking-wider flex items-center gap-1">Time Taken 🔒</span>
                            <span className="font-mono text-gray-600 dark:text-zinc-300 truncate bg-white/40 dark:bg-black/20 p-1 rounded border border-black/5 dark:border-white/5">{timeCreated || "N/A"}</span>
                          </div>

                          {/* Camera */}
                          <div className="flex flex-col gap-0.5">
                            <span className="font-bold text-gray-400 uppercase text-[9px] tracking-wider flex items-center gap-1">Camera Body 🔒</span>
                            <span className="text-gray-600 dark:text-zinc-300 truncate bg-white/40 dark:bg-black/20 p-1 rounded border border-black/5 dark:border-white/5" title={camera}>{camera || "N/A"}</span>
                          </div>

                          {/* Lens */}
                          <div className="flex flex-col gap-0.5">
                            <span className="font-bold text-gray-400 uppercase text-[9px] tracking-wider flex items-center gap-1">Lens Model 🔒</span>
                            <span className="text-gray-600 dark:text-zinc-300 truncate bg-white/40 dark:bg-black/20 p-1 rounded border border-black/5 dark:border-white/5" title={lens}>{lens || "N/A"}</span>
                          </div>

                          {/* Focal Length */}
                          <div className="flex flex-col gap-0.5">
                            <span className="font-bold text-gray-400 uppercase text-[9px] tracking-wider flex items-center gap-1">Focal Length 🔒</span>
                            <span className="font-mono text-gray-600 dark:text-zinc-300 truncate bg-white/40 dark:bg-black/20 p-1 rounded border border-black/5 dark:border-white/5">{focalLength || "N/A"}</span>
                          </div>

                          {/* ISO */}
                          <div className="flex flex-col gap-0.5">
                            <span className="font-bold text-gray-400 uppercase text-[9px] tracking-wider flex items-center gap-1">ISO Speed 🔒</span>
                            <span className="font-mono text-gray-600 dark:text-zinc-300 truncate bg-white/40 dark:bg-black/20 p-1 rounded border border-black/5 dark:border-white/5">{iso || "N/A"}</span>
                          </div>

                          {/* Shutter Speed */}
                          <div className="flex flex-col gap-0.5">
                            <span className="font-bold text-gray-400 uppercase text-[9px] tracking-wider flex items-center gap-1">Shutter Speed 🔒</span>
                            <span className="font-mono text-gray-600 dark:text-zinc-300 truncate bg-white/40 dark:bg-black/20 p-1 rounded border border-black/5 dark:border-white/5">{shutterSpeed || "N/A"}</span>
                          </div>

                          {/* Aperture */}
                          <div className="flex flex-col gap-0.5">
                            <span className="font-bold text-gray-400 uppercase text-[9px] tracking-wider flex items-center gap-1">Aperture 🔒</span>
                            <span className="font-mono text-gray-600 dark:text-zinc-300 truncate bg-white/40 dark:bg-black/20 p-1 rounded border border-black/5 dark:border-white/5">{aperture || "N/A"}</span>
                          </div>

                          {/* Uploader Name */}
                          <div className="flex flex-col gap-0.5">
                            <span className="font-bold text-gray-400 uppercase text-[9px] tracking-wider flex items-center gap-1">Uploader 🔒</span>
                            <span className="text-gray-600 dark:text-zinc-300 truncate bg-white/40 dark:bg-black/20 p-1 rounded border border-black/5 dark:border-white/5">{currentUser?.name || currentUser?.email || "Contributor"}</span>
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* TAB 2: MULTI-PHOTOS BULK UPLOAD */}
          {activeTab === "multi" && (
            <div className="flex flex-col gap-6">
              
              {/* Drag and Drop Box for Multi-Photos */}
              <div
                onDragOver={handleDragOver}
                onDrop={handleDropMulti}
                onClick={handleSelectMultiClick}
                className="border-2 border-dashed border-gray-300 dark:border-zinc-800 hover:border-[#be1f24] bg-gray-50/50 dark:bg-zinc-900/30 hover:bg-gray-100/50 dark:hover:bg-zinc-900/60 rounded-2xl p-8 flex flex-col items-center justify-center text-center gap-3 cursor-pointer transition-all min-h-[160px]"
              >
                <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-zinc-800 text-[#be1f24] flex items-center justify-center shadow-inner">
                  <Plus className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-sans font-bold text-gray-800 dark:text-zinc-200 text-sm">
                    Drag and drop multiple photos here
                  </p>
                  <p className="text-[11px] text-gray-500 dark:text-zinc-400 mt-0.5">
                    or click to select several files at once
                  </p>
                </div>
                <input
                  ref={multiFileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => e.target.files && handleMultiFileChange(e.target.files)}
                  className="hidden"
                />
              </div>

              {/* Bulk Apply Assistant Bar (Apply values to all selected items at once!) */}
              {multiPhotos.length > 0 && (
                <div className="bg-amber-50/25 dark:bg-amber-950/10 border border-amber-200/50 dark:border-amber-900/40 p-4 rounded-xl flex flex-col gap-3">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-500 animate-pulse" />
                    <span className="text-xs font-extrabold text-amber-900 dark:text-amber-400 uppercase tracking-wider">
                      Bulk Editing Assistant ({multiPhotos.length} Photos Selected)
                    </span>
                  </div>
                  <p className="text-[11px] text-amber-850 dark:text-zinc-400 leading-relaxed">
                    Set a value here and click "Apply to All" to instantly update every photo in your current queue. This is great for assigning the same project collection or keywords in one click!
                  </p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-gray-500 dark:text-zinc-400 uppercase">Bulk Collection</label>
                      <input
                        type="text"
                        placeholder="e.g. Relief"
                        value={bulkCollection}
                        onChange={(e) => setBulkCollection(e.target.value)}
                        className="w-full text-xs bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded px-2 py-1.5 text-gray-800 dark:text-zinc-200 focus:outline-none focus:border-[#be1f24]"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-gray-500 dark:text-zinc-400 uppercase">Bulk Photographer</label>
                      <select
                        value={bulkPhotographer}
                        onChange={(e) => handlePhotographerChange(e.target.value, setBulkPhotographer, bulkPhotographer)}
                        className="w-full text-xs bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded px-2 py-1.5 text-gray-800 dark:text-zinc-200 focus:outline-none focus:border-[#be1f24]"
                      >
                        {approvedPhotographers.map((p) => (
                          <option key={p.id} value={p.name}>
                            {p.name}
                          </option>
                        ))}
                        {approvedPhotographers.length === 0 && (
                          <option value="Sarah Jenkins">Sarah Jenkins</option>
                        )}
                        <option value="__ADD_NEW__" className="text-[#be1f24] font-semibold">+ add photographer</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-gray-500 dark:text-zinc-400 uppercase">Bulk Keywords (commas)</label>
                      <input
                        type="text"
                        placeholder="e.g. Community, Aleppo"
                        value={bulkKeywords}
                        onChange={(e) => setBulkKeywords(e.target.value)}
                        className="w-full text-xs bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded px-2 py-1.5 text-gray-800 dark:text-zinc-200 focus:outline-none focus:border-[#be1f24]"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 mt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setBulkCollection("");
                        setBulkPhotographer(defaultPhotographer);
                        setBulkKeywords("Archival, Syrian Context");
                      }}
                      className="text-[10px] font-bold text-gray-500 hover:underline px-2.5 py-1.5 cursor-pointer"
                    >
                      Reset Fields
                    </button>
                    <button
                      type="button"
                      onClick={handleBulkApply}
                      className="bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-black px-4 py-1.5 rounded-lg shadow-sm transition-all uppercase tracking-wider cursor-pointer"
                    >
                      Apply to All Photos
                    </button>
                  </div>
                </div>
              )}

              {/* List of Pending Multi-Photos */}
              {multiPhotos.length > 0 ? (
                <div className="flex flex-col gap-4">
                  <h3 className="font-display font-black text-xs uppercase tracking-wider text-gray-800 dark:text-zinc-200 border-b border-gray-100 dark:border-zinc-850 pb-2">
                    Pending Batch Uploads Queue
                  </h3>

                  <div className="flex flex-col gap-4 max-h-[50vh] overflow-y-auto pr-1">
                    {multiPhotos.map((item, index) => (
                      <div
                        key={item.id}
                        className="relative flex flex-col md:flex-row gap-4 border border-gray-200/80 dark:border-zinc-850 p-4 rounded-xl bg-gray-50/30 dark:bg-zinc-900/10 hover:border-gray-300 dark:hover:border-zinc-800 transition-all"
                      >
                        {/* Remove item button */}
                        <button
                          type="button"
                          onClick={() => handleRemoveMultiItem(item.id)}
                          className="absolute top-3 right-3 text-gray-400 hover:text-red-600 p-1 rounded-full hover:bg-gray-150/40 transition-all cursor-pointer"
                          title="Remove from batch"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>

                        {/* Left: preview and status */}
                        <div className="w-full md:w-[150px] flex flex-col gap-2">
                          <div className="aspect-square w-full rounded-lg overflow-hidden border border-gray-200 dark:border-zinc-800 bg-neutral-900 flex items-center justify-center">
                            <img
                              src={item.preview}
                              alt="Item preview"
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-contain"
                            />
                          </div>
                          
                          {/* Status Badge */}
                          <div className="flex items-center justify-center gap-1.5 py-1 px-2.5 rounded-md border text-[10px] font-bold">
                            {item.isExtracting ? (
                              <div className="flex items-center gap-1 text-amber-700 dark:text-amber-500">
                                <Loader2 className="w-3 h-3 animate-spin" />
                                <span>Reading EXIF...</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 text-green-700 dark:text-green-500">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Metadata Extracted</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Right: Editable Fields for this single item in the batch */}
                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3 pr-6">
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold text-gray-500 dark:text-zinc-400 uppercase">Title / Filename</label>
                            <input
                              type="text"
                              value={item.title}
                              onChange={(e) => handleUpdateMultiField(item.id, "title", e.target.value)}
                              className="w-full text-xs bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded px-2 py-1.5 text-gray-800 dark:text-zinc-200 focus:outline-none focus:border-[#be1f24]"
                            />
                          </div>

                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold text-gray-500 dark:text-zinc-400 uppercase">Collection / Project</label>
                            <input
                              type="text"
                              placeholder="e.g. Relief"
                              value={item.collection}
                              onChange={(e) => handleUpdateMultiField(item.id, "collection", e.target.value)}
                              className="w-full text-xs bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded px-2 py-1.5 text-gray-800 dark:text-zinc-200 focus:outline-none focus:border-[#be1f24]"
                            />
                          </div>

                          <div className="flex flex-col gap-1 sm:col-span-2">
                            <label className="text-[10px] font-bold text-gray-500 dark:text-zinc-400 uppercase">Caption / Narrative Description</label>
                            <textarea
                              rows={2}
                              value={item.caption}
                              onChange={(e) => handleUpdateMultiField(item.id, "caption", e.target.value)}
                              placeholder="Respectful description of subjects and campaign..."
                              className="w-full text-xs bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded p-2 text-gray-800 dark:text-zinc-200 focus:outline-none resize-none focus:border-[#be1f24]"
                            />
                          </div>

                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold text-gray-500 dark:text-zinc-400 uppercase">Photographer</label>
                            <select
                              value={item.photographer}
                              onChange={(e) => handlePhotographerChange(e.target.value, (val) => handleUpdateMultiField(item.id, "photographer", val), item.photographer)}
                              className="w-full text-xs bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded px-2 py-1.5 text-gray-800 dark:text-zinc-200 focus:outline-none focus:border-[#be1f24]"
                            >
                              {approvedPhotographers.map((p) => (
                                <option key={p.id} value={p.name}>
                                  {p.name}
                                </option>
                              ))}
                              {approvedPhotographers.length === 0 && (
                                <option value="Sarah Jenkins">Sarah Jenkins</option>
                              )}
                              <option value="__ADD_NEW__" className="text-[#be1f24] font-semibold">+ add photographer</option>
                            </select>
                          </div>

                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-bold text-gray-500 dark:text-zinc-400 uppercase">Location</label>
                            <input
                              type="text"
                              value={item.location}
                              onChange={(e) => handleUpdateMultiField(item.id, "location", e.target.value)}
                              className="w-full text-xs bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded px-2 py-1.5 text-gray-800 dark:text-zinc-200 focus:outline-none focus:border-[#be1f24]"
                            />
                          </div>

                          <div className="flex flex-col gap-1 sm:col-span-2">
                            <label className="text-[10px] font-bold text-gray-500 dark:text-zinc-400 uppercase">Keywords (Comma separated)</label>
                            <input
                              type="text"
                              value={item.keywords.join(", ")}
                              onChange={(e) => handleUpdateMultiField(item.id, "keywords", e.target.value.split(",").map((s: string) => s.trim()).filter(Boolean))}
                              className="w-full text-xs bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded px-2 py-1.5 text-gray-800 dark:text-zinc-200 focus:outline-none focus:border-[#be1f24]"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-between items-center bg-gray-50 dark:bg-zinc-900 border border-gray-150 dark:border-zinc-850 p-4 rounded-xl">
                    <span className="text-[11px] font-mono text-gray-500 dark:text-zinc-400">
                      Total: <strong>{multiPhotos.length} photos</strong> ready to bulk process.
                    </span>
                    <button
                      type="button"
                      onClick={() => setMultiPhotos([])}
                      className="text-xs font-bold text-[#be1f24] hover:underline cursor-pointer"
                    >
                      Clear Batch Queue
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-10 border border-dashed border-gray-200 dark:border-zinc-800 rounded-2xl bg-gray-50/10 text-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-zinc-800 flex items-center justify-center text-gray-400">
                    <Upload className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-xs text-gray-800 dark:text-zinc-200 uppercase tracking-wider">Queue is Empty</h3>
                    <p className="text-[11px] text-gray-400 max-w-xs mt-1">
                      Drag files above or use the click dialog to drop in multiple photos to start.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-gray-100 dark:border-zinc-800 flex items-center justify-end gap-3 bg-gray-50 dark:bg-zinc-900">
          <button
            onClick={() => {
              onClose();
              resetForm();
            }}
            className="px-4 py-2 border border-gray-200 dark:border-zinc-800 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg text-sm font-medium text-gray-700 dark:text-zinc-300 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          
          {activeTab === "single" ? (
            <button
              id="extracted-submit-btn"
              disabled={!imagePreview || !isExtracted || isUploading}
              onClick={handleSubmitSingle}
              className={`px-5 py-2 rounded-lg text-sm font-black flex items-center gap-1.5 transition-colors cursor-pointer uppercase tracking-wider ${
                imagePreview && isExtracted && !isUploading
                  ? "bg-[#be1f24] hover:opacity-90 text-white shadow-sm"
                  : "bg-zinc-200 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-600 cursor-not-allowed"
              }`}
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Uploading...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Submit to Archive</span>
                </>
              )}
            </button>
          ) : (
            <button
              disabled={multiPhotos.length === 0 || isUploading}
              onClick={handleSubmitMulti}
              className={`px-5 py-2 rounded-lg text-sm font-black flex items-center gap-1.5 transition-colors cursor-pointer uppercase tracking-wider ${
                multiPhotos.length > 0 && !isUploading
                  ? "bg-[#be1f24] hover:opacity-90 text-white shadow-sm"
                  : "bg-zinc-200 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-600 cursor-not-allowed"
              }`}
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Processing {multiPhotos.length} Files...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Submit {multiPhotos.length} Photos</span>
                </>
              )}
            </button>
          )}
        </div>

      </div>

      {/* Request New Photographer Modal (Need Approval) */}
      {showRequestPhotographerModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in select-none">
          <div className="bg-white dark:bg-zinc-950 border border-gray-150 dark:border-zinc-850 rounded-2xl w-full max-w-md shadow-2xl p-6 flex flex-col gap-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-sm font-black text-gray-900 dark:text-zinc-100 uppercase tracking-tight flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-[#be1f24]" />
                  Request New Photographer
                </h3>
                <p className="text-[10px] text-gray-500 dark:text-zinc-400 mt-1">
                  New photographers must be approved by an archive manager or super admin before being listed.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowRequestPhotographerModal(false);
                  setReqPhSuccess("");
                  setReqPhError("");
                  setReqPhName("");
                  setReqPhBio("");
                }}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {reqPhSuccess ? (
              <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 p-4 rounded-xl text-xs text-emerald-800 dark:text-emerald-200 flex flex-col gap-3">
                <p className="font-medium">{reqPhSuccess}</p>
                <button
                  type="button"
                  onClick={() => {
                    setShowRequestPhotographerModal(false);
                    setReqPhSuccess("");
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black px-4 py-1.5 rounded-lg shadow-sm self-end uppercase tracking-wider transition-all cursor-pointer"
                >
                  Close Window
                </button>
              </div>
            ) : (
              <form onSubmit={handleRequestPhotographerSubmit} className="flex flex-col gap-4">
                {reqPhError && (
                  <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 p-3 rounded-lg text-xs text-red-800 dark:text-red-200">
                    {reqPhError}
                  </div>
                )}

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-gray-500 dark:text-zinc-400 uppercase">Photographer Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Fares Badawi"
                    value={reqPhName}
                    onChange={(e) => setReqPhName(e.target.value)}
                    className="w-full text-xs bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 text-gray-800 dark:text-zinc-200 rounded-lg px-3 py-2 focus:outline-none focus:bg-white dark:focus:bg-zinc-950 focus:border-[#be1f24]"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-gray-500 dark:text-zinc-400 uppercase">Biography & Field Focus</label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Describe their role, local coverages or participating programs..."
                    value={reqPhBio}
                    onChange={(e) => setReqPhBio(e.target.value)}
                    className="w-full text-xs bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 text-gray-800 dark:text-zinc-200 rounded-lg p-3 focus:outline-none focus:bg-white dark:focus:bg-zinc-950 focus:border-[#be1f24] resize-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-zinc-850 mt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setShowRequestPhotographerModal(false);
                      setReqPhError("");
                    }}
                    className="bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-700 dark:text-zinc-300 text-[10px] font-bold px-3 py-1.5 rounded-lg cursor-pointer transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={reqPhSubmitting}
                    className="bg-[#be1f24] hover:opacity-90 disabled:opacity-50 text-white text-[10px] font-black px-4 py-1.5 rounded-lg shadow-sm transition-all uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
                  >
                    {reqPhSubmitting ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>Submitting...</span>
                      </>
                    ) : (
                      <span>Submit Request</span>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
