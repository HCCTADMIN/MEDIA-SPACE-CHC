import React, { useState } from "react";
import { ChevronDown, ChevronUp, Filter, RefreshCw, Layers, ChevronLeft, ChevronRight, ArrowUpDown } from "lucide-react";
import { dialogService } from "../lib/dialog";

interface SidebarFiltersProps {
  selectedKeywords: string[];
  toggleKeyword: (kw: string) => void;
  metadataGrouping: string | null;
  setMetadataGrouping: (group: string | null) => void;
  titleFilter: string;
  setTitleFilter: (title: string) => void;
  captionFilter: string;
  setCaptionFilter: (caption: string) => void;
  availablePhotographers: string[];
  availableLocations: string[];
  availableCameras: string[];
  availableCollections: string[];
  selectedPhotographer: string;
  setSelectedPhotographer: (ph: string) => void;
  selectedLocation: string;
  setSelectedLocation: (loc: string) => void;
  selectedCamera: string;
  setSelectedCamera: (cam: string) => void;
  selectedCollection: string;
  setSelectedCollection: (col: string) => void;
  searchTarget: "all" | "keywords" | "location";
  setSearchTarget: (target: "all" | "keywords" | "location") => void;
  onClearAll: () => void;
  onToggleSidebar?: () => void;
  onCreateCollection?: (name: string, description: string) => Promise<boolean>;
  sortType: "newest" | "oldest" | "high views" | "high react" | "most downloaded";
  setSortType: (type: "newest" | "oldest" | "high views" | "high react" | "most downloaded") => void;
  isOppositeWay: boolean;
  setIsOppositeWay: (way: boolean | ((prev: boolean) => boolean)) => void;
}

export default function SidebarFilters({
  selectedKeywords,
  toggleKeyword,
  metadataGrouping,
  setMetadataGrouping,
  titleFilter,
  setTitleFilter,
  captionFilter,
  setCaptionFilter,
  availablePhotographers,
  availableLocations,
  availableCameras,
  availableCollections,
  selectedPhotographer,
  setSelectedPhotographer,
  selectedLocation,
  setSelectedLocation,
  selectedCamera,
  setSelectedCamera,
  selectedCollection,
  setSelectedCollection,
  searchTarget,
  setSearchTarget,
  onClearAll,
  onToggleSidebar,
  onCreateCollection,
  sortType,
  setSortType,
  isOppositeWay,
  setIsOppositeWay,
}: SidebarFiltersProps) {
  const [isKeywordsOpen, setIsKeywordsOpen] = useState(true);
  const [isMetadataOpen, setIsMetadataOpen] = useState(true);
  const [isSortSectionOpen, setIsSortSectionOpen] = useState(true);
  const [isCreatingCol, setIsCreatingCol] = useState(false);
  const [newColName, setNewColName] = useState("");
  const [newColDesc, setNewColDesc] = useState("");

  const keywordsList = [
    "Disaster Relief",
    "Education",
    "Healthcare",
    "Disassesment",
    "Campaigning",
    "Hope",
    "Community",
    "Relief",
  ];

  const handleMetadataCheckbox = (field: string) => {
    if (metadataGrouping === field) {
      setMetadataGrouping(null); // Deselect
    } else {
      setMetadataGrouping(field);
    }
  };

  return (
    <aside className="w-full lg:w-72 bg-white/40 dark:bg-zinc-950/30 backdrop-blur-md border-r border-gray-200/50 dark:border-zinc-900 flex-shrink-0 p-6 flex flex-col gap-6 shadow-sm lg:sticky lg:top-[69px] lg:h-[calc(100vh-69px)] lg:overflow-y-auto">
      {/* Title / Action */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-gray-800 dark:text-zinc-200">
          <Filter className="w-4 h-4 text-[#be1f24]" />
          <h2 className="font-display font-black text-xs uppercase tracking-wider">
            Filters & Archive
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onClearAll}
            className="text-xs text-[#be1f24] hover:opacity-80 font-black flex items-center gap-1 transition-colors cursor-pointer mr-1"
            title="Reset Filters"
          >
            <RefreshCw className="w-3 h-3" />
            <span className="hidden sm:inline text-[10px] uppercase font-black">Reset</span>
          </button>
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className="p-1 rounded-md text-gray-400 dark:text-zinc-500 hover:text-gray-950 dark:hover:text-zinc-100 hover:bg-gray-100/50 dark:hover:bg-zinc-850/50 transition-colors cursor-pointer"
              title="Hide filter sidebar"
            >
              <ChevronLeft className="w-4.5 h-4.5" />
            </button>
          )}
        </div>
      </div>

      <hr className="border-gray-200/40 dark:border-zinc-900" />

      {/* Search Scope options */}
      <div className="flex flex-col gap-2">
        <label className="font-display font-black text-[10px] uppercase tracking-wider text-gray-450 dark:text-zinc-500">
          Search Options
        </label>
        <div className="grid grid-cols-3 gap-1 bg-gray-100/30 dark:bg-zinc-900/30 backdrop-blur-xs p-1 rounded-lg border border-gray-200/50 dark:border-zinc-850">
          <button
            type="button"
            onClick={() => setSearchTarget("all")}
            className={`py-1.5 px-1.5 rounded-md text-[10px] font-black tracking-tight text-center transition-all cursor-pointer ${
              searchTarget === "all"
                ? "bg-[#be1f24] text-white shadow-xs"
                : "text-gray-500 hover:bg-gray-100/45 dark:hover:bg-zinc-800/40"
            }`}
          >
            All Text
          </button>
          <button
            type="button"
            onClick={() => setSearchTarget("keywords")}
            className={`py-1.5 px-1.5 rounded-md text-[10px] font-black tracking-tight text-center transition-all cursor-pointer ${
              searchTarget === "keywords"
                ? "bg-[#be1f24] text-white shadow-xs"
                : "text-gray-500 hover:bg-gray-100/45 dark:hover:bg-zinc-800/40"
            }`}
          >
            Keywords
          </button>
          <button
            type="button"
            onClick={() => setSearchTarget("location")}
            className={`py-1.5 px-1.5 rounded-md text-[10px] font-black tracking-tight text-center transition-all cursor-pointer ${
              searchTarget === "location"
                ? "bg-[#be1f24] text-white shadow-xs"
                : "text-gray-500 hover:bg-gray-100/45 dark:hover:bg-zinc-800/40"
            }`}
          >
            Location
          </button>
        </div>
      </div>

      <hr className="border-gray-100 dark:border-zinc-900" />

      {/* Sort & Order Section */}
      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={() => setIsSortSectionOpen(!isSortSectionOpen)}
          className="flex items-center justify-between text-left font-display font-semibold text-sm text-gray-800 dark:text-zinc-200 cursor-pointer"
        >
          <span>Sort & Order</span>
          {isSortSectionOpen ? (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </button>

        {isSortSectionOpen && (
          <div className="flex flex-col gap-2.5 mt-1 pl-1">
            <div className="grid grid-cols-2 gap-1.5">
              {(["newest", "oldest", "high views", "high react", "most downloaded"] as const).map((type) => (
                <button
                   key={type}
                  type="button"
                  onClick={() => setSortType(type)}
                  className={`py-1.5 px-1.5 rounded-lg text-[10px] font-black uppercase tracking-tight text-center border transition-all cursor-pointer ${
                    type === "most downloaded" ? "col-span-2" : ""
                  } ${
                    sortType === type
                      ? "bg-[#be1f24] text-white border-[#be1f24] shadow-xs"
                      : "bg-gray-50 dark:bg-zinc-900 hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-600 dark:text-zinc-350 border-gray-200/60 dark:border-zinc-850"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setIsOppositeWay((prev) => !prev)}
              className="flex items-center justify-center gap-1.5 text-[10px] font-black text-gray-700 dark:text-zinc-300 bg-gray-50 dark:bg-zinc-900 hover:bg-gray-100 dark:hover:bg-zinc-800 border border-gray-200 dark:border-zinc-800 py-1.5 rounded-lg cursor-pointer transition-all active:scale-95 hover:border-[#be1f24] dark:hover:border-[#be1f24] hover:text-[#be1f24] w-full"
            >
              <ArrowUpDown className="w-3 h-3 text-[#be1f24]" />
              <span>{isOppositeWay ? "Opposite Order" : "Standard Order"}</span>
            </button>
          </div>
        )}
      </div>

      <hr className="border-gray-100 dark:border-zinc-900" />

      {/* Keywords Filter Section */}
      <div className="flex flex-col gap-3">
        <button
          onClick={() => setIsKeywordsOpen(!isKeywordsOpen)}
          className="flex items-center justify-between text-left font-display font-semibold text-sm text-gray-800 dark:text-zinc-200 cursor-pointer"
        >
          <span>Keywords</span>
          {isKeywordsOpen ? (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </button>

        {isKeywordsOpen && (
          <div className="flex flex-col gap-2 mt-1 pl-1">
            {keywordsList.map((kw) => {
              const isChecked = selectedKeywords.includes(kw);
              return (
                <label
                  key={kw}
                  className="flex items-center gap-2.5 text-xs text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-200 cursor-pointer select-none py-0.5"
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleKeyword(kw)}
                    className="w-4 h-4 rounded-sm accent-[#be1f24] text-white border-gray-300 dark:border-zinc-700 focus:ring-[#be1f24] cursor-pointer"
                  />
                  <span className={isChecked ? "font-semibold text-gray-900 dark:text-zinc-100" : ""}>
                    {kw}
                  </span>
                </label>
              );
            })}
          </div>
        )}
      </div>

      <hr className="border-gray-100 dark:border-zinc-900" />

      {/* Metadata Dropdowns Checkbox Section */}
      <div className="flex flex-col gap-3">
        <button
          onClick={() => setIsMetadataOpen(!isMetadataOpen)}
          className="flex items-center justify-between text-left font-display font-semibold text-sm text-gray-800 dark:text-zinc-200 cursor-pointer"
        >
          <span>Metadata Filter</span>
          {isMetadataOpen ? (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </button>

        {isMetadataOpen && (
          <div className="flex flex-col gap-3 mt-1 pl-1">
            {/* Photographer checkbox and dynamic dropdown */}
            <div className="flex flex-col gap-1.5">
              <label className="flex items-center gap-2.5 text-xs text-gray-600 dark:text-zinc-400 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={metadataGrouping === "photographer"}
                  onChange={() => handleMetadataCheckbox("photographer")}
                  className="w-4 h-4 rounded-full accent-[#be1f24] text-white border-gray-300 dark:border-zinc-700 focus:ring-[#be1f24] cursor-pointer"
                />
                <span className={metadataGrouping === "photographer" ? "font-semibold text-gray-900 dark:text-zinc-100" : ""}>
                  Photographer
                </span>
              </label>
              
              {metadataGrouping === "photographer" && (
                <select
                  id="photographer-select-filter"
                  value={selectedPhotographer}
                  onChange={(e) => setSelectedPhotographer(e.target.value)}
                  className="ml-6 text-xs bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded px-2 py-1 text-gray-700 dark:text-zinc-200 focus:outline-none focus:bg-white dark:focus:bg-zinc-950 focus:border-[#be1f24] focus:ring-1 focus:ring-[#be1f24] transition-all"
                >
                  <option value="">All Photographers</option>
                  {availablePhotographers.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Location checkbox and dynamic dropdown */}
            <div className="flex flex-col gap-1.5">
              <label className="flex items-center gap-2.5 text-xs text-gray-600 dark:text-zinc-400 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={metadataGrouping === "location"}
                  onChange={() => handleMetadataCheckbox("location")}
                  className="w-4 h-4 rounded-full accent-[#be1f24] text-white border-gray-300 dark:border-zinc-700 focus:ring-[#be1f24] cursor-pointer"
                />
                <span className={metadataGrouping === "location" ? "font-semibold text-gray-900 dark:text-zinc-100" : ""}>
                  Location
                </span>
              </label>

              {metadataGrouping === "location" && (
                <select
                  id="location-select-filter"
                  value={selectedLocation}
                  onChange={(e) => setSelectedLocation(e.target.value)}
                  className="ml-6 text-xs bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded px-2 py-1 text-gray-700 dark:text-zinc-200 focus:outline-none focus:bg-white dark:focus:bg-zinc-950 focus:border-[#be1f24] focus:ring-1 focus:ring-[#be1f24] transition-all"
                >
                  <option value="">All Locations</option>
                  {availableLocations.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Camera Settings checkbox and dynamic dropdown */}
            <div className="flex flex-col gap-1.5">
              <label className="flex items-center gap-2.5 text-xs text-gray-600 dark:text-zinc-400 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={metadataGrouping === "cameraSettings"}
                  onChange={() => handleMetadataCheckbox("cameraSettings")}
                  className="w-4 h-4 rounded-full accent-[#be1f24] text-white border-gray-300 dark:border-zinc-700 focus:ring-[#be1f24] cursor-pointer"
                />
                <span className={metadataGrouping === "cameraSettings" ? "font-semibold text-gray-900 dark:text-zinc-100" : ""}>
                  Camera Gear
                </span>
              </label>

              {metadataGrouping === "cameraSettings" && (
                <select
                  id="camera-select-filter"
                  value={selectedCamera}
                  onChange={(e) => setSelectedCamera(e.target.value)}
                  className="ml-6 text-xs bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded px-2 py-1 text-gray-700 dark:text-zinc-200 focus:outline-none focus:bg-white dark:focus:bg-zinc-950 focus:border-[#be1f24] focus:ring-1 focus:ring-[#be1f24] transition-all"
                >
                  <option value="">All Cameras</option>
                  {availableCameras.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Collection checkbox and dynamic dropdown */}
            <div className="flex flex-col gap-1.5">
              <label className="flex items-center gap-2.5 text-xs text-gray-600 dark:text-zinc-400 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={metadataGrouping === "collection"}
                  onChange={() => handleMetadataCheckbox("collection")}
                  className="w-4 h-4 rounded-full accent-[#be1f24] text-white border-gray-300 dark:border-zinc-700 focus:ring-[#be1f24] cursor-pointer"
                />
                <span className={metadataGrouping === "collection" ? "font-semibold text-gray-900" : ""}>
                  Optional Collection
                </span>
              </label>

              {metadataGrouping === "collection" && (
                <div className="flex flex-col gap-2">
                  <select
                     id="collection-select-filter"
                    value={selectedCollection}
                    onChange={(e) => setSelectedCollection(e.target.value)}
                    className="ml-6 text-xs bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded px-2 py-1 text-gray-700 dark:text-zinc-200 focus:outline-none focus:bg-white dark:focus:bg-zinc-950 focus:border-[#be1f24] focus:ring-1 focus:ring-[#be1f24] transition-all"
                  >
                    <option value="">All Collections</option>
                    {availableCollections.map((col) => (
                      <option key={col} value={col}>
                        {col}
                      </option>
                    ))}
                  </select>
                  
                  <div className="ml-6">
                    {!isCreatingCol ? (
                      <button
                        onClick={() => setIsCreatingCol(true)}
                        className="text-[10px] font-mono font-bold text-[#be1f24] hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        + Create Collection
                      </button>
                    ) : (
                      <div className="flex flex-col gap-2 p-2 bg-gray-50 dark:bg-zinc-900 border border-gray-150 dark:border-zinc-800 rounded-lg animate-fade-in">
                        <input
                          type="text"
                          placeholder="Collection Name"
                          value={newColName}
                          onChange={(e) => setNewColName(e.target.value)}
                          className="w-full text-[11px] px-2 py-1 bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded focus:outline-none focus:border-[#be1f24] text-gray-800 dark:text-zinc-200"
                        />
                        <input
                          type="text"
                          placeholder="Description (Optional)"
                          value={newColDesc}
                          onChange={(e) => setNewColDesc(e.target.value)}
                          className="w-full text-[10px] px-2 py-1 bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded focus:outline-none focus:border-[#be1f24] text-gray-800 dark:text-zinc-200"
                        />
                        <div className="flex gap-1.5 justify-end">
                          <button
                            onClick={() => {
                              setIsCreatingCol(false);
                              setNewColName("");
                              setNewColDesc("");
                            }}
                            className="text-[9px] font-bold text-gray-500 hover:text-gray-700 px-2 py-1 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-750 rounded cursor-pointer text-gray-700 dark:text-zinc-300"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={async () => {
                              if (!newColName.trim()) {
                                await dialogService.alert("Please enter a collection name.", {
                                  title: "Collection Name Required",
                                  variant: "warning"
                                });
                                return;
                              }
                              if (onCreateCollection) {
                                const success = await onCreateCollection(newColName.trim(), newColDesc.trim());
                                if (success) {
                                  setSelectedCollection(newColName.trim());
                                  setIsCreatingCol(false);
                                  setNewColName("");
                                  setNewColDesc("");
                                }
                              }
                            }}
                            className="text-[9px] font-bold text-white bg-[#be1f24] hover:opacity-90 px-2 py-1 rounded cursor-pointer"
                          >
                            Create
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <hr className="border-gray-100 dark:border-zinc-900" />

      {/* Advanced Sidebar Text Inputs */}
      <div className="flex flex-col gap-4 mt-auto">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-mono font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-500">
            Search by Title
          </label>
          <input
            id="title-filter-input"
            type="text"
            placeholder="Filter catalog title..."
            value={titleFilter}
            onChange={(e) => setTitleFilter(e.target.value)}
            className="w-full text-xs bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-gray-700 dark:text-zinc-200 focus:outline-none focus:bg-white dark:focus:bg-zinc-950 focus:border-[#be1f24] focus:ring-1 focus:ring-[#be1f24] transition-all"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-mono font-semibold uppercase tracking-wider text-gray-500 dark:text-zinc-500">
            Search by Caption content
          </label>
          <textarea
            id="caption-filter-input"
            rows={3}
            placeholder="Search keywords in descriptions..."
            value={captionFilter}
            onChange={(e) => setCaptionFilter(e.target.value)}
            className="w-full text-xs bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-gray-700 dark:text-zinc-200 resize-none focus:outline-none focus:bg-white dark:focus:bg-zinc-950 focus:border-[#be1f24] focus:ring-1 focus:ring-[#be1f24] transition-all"
          />
        </div>
      </div>
    </aside>
  );
}
