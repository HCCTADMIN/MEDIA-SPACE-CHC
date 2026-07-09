import React, { useState } from "react";
import { X, Copy, Check, Twitter, Mail, Link2, MessageSquare } from "lucide-react";
import { Photo } from "../types";
import { dialogService } from "../lib/dialog";

interface ShareDialogProps {
  photo: Photo | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function ShareDialog({
  photo,
  isOpen,
  onClose,
}: ShareDialogProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !photo) return null;

  const shareUrl = `${window.location.origin}/archive/${photo.id}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      await dialogService.alert("Failed to copy link. Here is the link: " + shareUrl, {
        title: "Copy Link Failed",
        variant: "warning"
      });
    }
  };

  const shareTwitter = () => {
    const text = `Check out this powerful humanitarian documentary photo from the Christian Hope Center: "${photo.title}"`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`, "_blank");
  };

  const shareEmail = () => {
    const subject = `Humanitarian Photo Archive: ${photo.title}`;
    const body = `Hi,\n\nI found this beautiful, high-quality photograph from the Christian Hope Center Media Space:\n\nTitle: ${photo.title}\nDescription: ${photo.caption}\nLocation: ${photo.location}\n\nView and download the full resolution photo here: ${shareUrl}\n\nHope and relief, told in pictures.`;
    window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
      <div className="relative bg-white dark:bg-zinc-950 w-full max-w-md rounded-2xl overflow-hidden shadow-2xl border border-gray-100 dark:border-zinc-850 p-6 flex flex-col gap-6">
        
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Heading */}
        <div className="flex flex-col gap-1 pr-6">
          <h2 className="font-display font-bold text-base text-gray-900 dark:text-zinc-50">
            Share Archival Photograph
          </h2>
          <p className="text-xs text-gray-500 dark:text-zinc-450">
            Share links or download details for catalog referencing.
          </p>
        </div>

        {/* Selected Thumbnail Preview */}
        <div className="flex items-center gap-4 bg-gray-50 dark:bg-zinc-900 p-3 rounded-xl border border-gray-200/50 dark:border-zinc-800">
          <img
            src={photo.url}
            alt={photo.title}
            referrerPolicy="no-referrer"
            className="w-16 h-16 rounded-lg object-cover border border-gray-200 dark:border-zinc-800 bg-neutral-900"
          />
          <div className="flex-1 overflow-hidden">
            <h3 className="font-sans font-bold text-xs text-gray-900 dark:text-zinc-100 truncate uppercase">
              {photo.title}
            </h3>
            <p className="text-[10px] text-gray-400 dark:text-zinc-500 truncate mt-0.5">
              By {photo.photographer} • {photo.location}
            </p>
          </div>
        </div>

        {/* Direct Link Copy Bar */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-mono uppercase tracking-wider text-gray-400 dark:text-zinc-500 font-semibold">
            Archival Catalog Share Link
          </label>
          <div className="flex items-center gap-1.5">
            <input
              id="share-link-input"
              type="text"
              readOnly
              value={shareUrl}
              className="flex-1 bg-gray-50 dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-xs text-gray-600 dark:text-zinc-300 focus:outline-none"
            />
            <button
              onClick={handleCopy}
              className={`p-2.5 rounded-lg border transition-all cursor-pointer ${
                copied
                  ? "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-900 text-green-700 dark:text-green-400"
                  : "bg-white dark:bg-zinc-950 hover:bg-gray-50 dark:hover:bg-zinc-800 border-gray-200 dark:border-zinc-800 text-gray-700 dark:text-zinc-300"
              }`}
              title="Copy share URL to clipboard"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
          {copied && (
            <span className="text-[10px] font-semibold text-green-700 dark:text-green-400 animate-pulse block">
              Share link successfully copied to clipboard!
            </span>
          )}
        </div>

        {/* Quick Social Shares */}
        <div className="flex flex-col gap-2">
          <span className="text-[10px] font-mono uppercase tracking-wider text-gray-400 dark:text-zinc-500 font-semibold">
            Quick Shares
          </span>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={shareTwitter}
              className="flex items-center justify-center gap-2 border border-gray-200 dark:border-zinc-800 hover:bg-neutral-50 dark:hover:bg-zinc-900 p-2.5 rounded-lg text-xs font-semibold text-gray-700 dark:text-zinc-300 transition-colors cursor-pointer"
            >
              <Twitter className="w-4 h-4 text-sky-500" />
              <span>Share on X</span>
            </button>

            <button
              onClick={shareEmail}
              className="flex items-center justify-center gap-2 border border-gray-200 dark:border-zinc-800 hover:bg-neutral-50 dark:hover:bg-zinc-900 p-2.5 rounded-lg text-xs font-semibold text-gray-700 dark:text-zinc-300 transition-colors cursor-pointer"
            >
              <Mail className="w-4 h-4 text-red-500" />
              <span>Email Referencing</span>
            </button>
          </div>
        </div>

        {/* QR Code Mockup */}
        <div className="flex flex-col items-center gap-3 border-t border-gray-100 dark:border-zinc-800 pt-5">
          <span className="text-[10px] font-mono uppercase tracking-wider text-gray-400 dark:text-zinc-500 font-semibold text-center">
            Printable Catalog Reference QR
          </span>
          <div className="w-28 h-28 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-2.5 shadow-sm flex items-center justify-center relative">
            {/* Elegant SVG Mock QR Code */}
            <svg
              className="w-full h-full text-neutral-800 dark:text-zinc-200"
              viewBox="0 0 100 100"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path fill="currentColor" d="M0 0h28v28H0zm6 6v16h16V6zm6 6h4v4h-4zM72 0h28v28H72zm6 6v16h16V6zm6 6h4v4h-4zm-84 72h28v28H0zm6 6v16h16V18H6zm6 6h4v4h-4zm42-60h6v6h-6zm6 6h6v6h-6zm-6 6h6v6h-6zm12-12h6v6h-6zm12 12h6v6H84zm-6 6h6v6H78zm-18 12h6v6h-6zm12 6h6v6h-6zm6-6h6v6H78zm-6 18h6v6h-6zm-12-6h6v6h-6zm0 12h6v6h-6zm18 6h6v6H72zm6-6h6v6H78zm6-6h6v6H84zm-12 18h6v6H72zm12-6h6v6H84zM42 42h6v6h-6zm12 6h6v6h-6zm-12 6h6v6h-6zm12 12h6v6h-6zm-6-18h6v6h-6zm18 18h6v6H66zm6-6h6v6H72zm12-12h6v6H84zm-6 6h6v6H78z" />
              {/* Inner Heart Brand Overlay for high-fidelity brand aesthetic */}
              <circle cx="50" cy="50" r="12" fill="white" className="dark:fill-zinc-900" />
              <path
                d="M50 46.5c-.83-.8-1.66-1.74-1.66-2.98 0-1.25.96-2.02 2.16-2.02.98 0 1.66.5 2.16 1.1.5-.6 1.18-1.1 2.16-1.1 1.2 0 2.16.77 2.16 2.02 0 1.24-.83 2.18-1.66 2.98l-2.66 2.5Z"
                fill="#be1f24"
                transform="scale(0.8) translate(12, 12)"
              />
            </svg>
          </div>
          <span className="text-[10px] text-gray-400 dark:text-zinc-500 font-semibold font-mono">
            REF-{photo.id.toUpperCase()}
          </span>
        </div>

      </div>
    </div>
  );
}
