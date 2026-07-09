import React, { useState, useEffect, useRef } from "react";
import { AlertTriangle, CheckCircle2, Info, HelpCircle, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { dialogService, DialogOptions } from "../lib/dialog";

export default function CustomDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [type, setType] = useState<"alert" | "confirm">("confirm");
  const [options, setOptions] = useState<DialogOptions>({ message: "" });
  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  useEffect(() => {
    dialogService.setListener((dialogType, dialogOptions, resolve) => {
      setType(dialogType);
      setOptions(dialogOptions);
      resolverRef.current = resolve;
      setIsOpen(true);
    });

    return () => {
      dialogService.removeListener();
    };
  }, []);

  const handleConfirm = () => {
    if (resolverRef.current) {
      resolverRef.current(true);
    }
    setIsOpen(false);
  };

  const handleCancel = () => {
    if (resolverRef.current) {
      resolverRef.current(false);
    }
    setIsOpen(false);
  };

  // Keyboard shortcut support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === "Escape") {
        e.preventDefault();
        handleCancel();
      } else if (e.key === "Enter") {
        e.preventDefault();
        handleConfirm();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const getIcon = () => {
    const iconSize = "w-10 h-10";
    switch (options.variant) {
      case "danger":
        return <AlertTriangle className={`${iconSize} text-[#be1f24]`} />;
      case "warning":
        return <AlertTriangle className={`${iconSize} text-amber-500`} />;
      case "success":
        return <CheckCircle2 className={`${iconSize} text-emerald-500`} />;
      case "info":
      default:
        return type === "confirm" ? (
          <HelpCircle className={`${iconSize} text-sky-500`} />
        ) : (
          <Info className={`${iconSize} text-[#be1f24]`} />
        );
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleCancel}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Dialog Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: "spring", duration: 0.3 }}
            className="relative w-full max-w-md bg-white dark:bg-zinc-950 border border-gray-150 dark:border-zinc-850 rounded-2xl shadow-2xl p-6 flex flex-col gap-4 overflow-hidden"
          >
            {/* Top Close Button (only for confirmation) */}
            {type === "confirm" && (
              <button
                onClick={handleCancel}
                className="absolute top-4 right-4 text-gray-400 dark:text-zinc-500 hover:text-gray-700 dark:hover:text-zinc-300 transition-colors rounded p-1 cursor-pointer"
                title="Cancel"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            {/* Layout: Icon + Title/Message */}
            <div className="flex gap-4 items-start pt-2">
              <div className="p-2 bg-gray-50 dark:bg-zinc-900 rounded-xl flex-shrink-0 border border-gray-100 dark:border-zinc-800">
                {getIcon()}
              </div>
              <div className="flex-1 flex flex-col gap-1.5 min-w-0">
                <h3 className="text-sm font-bold text-gray-900 dark:text-zinc-100 tracking-tight">
                  {options.title}
                </h3>
                <p className="text-xs text-gray-600 dark:text-zinc-300 leading-relaxed break-words">
                  {options.message}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2.5 mt-2 border-t border-gray-100 dark:border-zinc-900 pt-4">
              {type === "confirm" && (
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-gray-600 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-900 border border-gray-200 dark:border-zinc-800 transition-colors cursor-pointer"
                >
                  {options.cancelText || "Cancel"}
                </button>
              )}
              <button
                type="button"
                onClick={handleConfirm}
                className={`px-5 py-2 rounded-lg text-xs font-bold text-white transition-opacity hover:opacity-95 cursor-pointer ${
                  options.variant === "danger"
                    ? "bg-[#be1f24]"
                    : "bg-[#be1f24]"
                }`}
              >
                {options.confirmText || "OK"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
