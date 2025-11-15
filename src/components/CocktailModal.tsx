"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

type CocktailModalProps = {
  children: ReactNode;
  onClose?: () => void;
  showCloseButton?: boolean;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl";
};

const maxWidthClasses = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
  "3xl": "max-w-3xl",
  "4xl": "max-w-4xl",
};

export function CocktailModal({ 
  children, 
  onClose, 
  showCloseButton = true,
  maxWidth = "3xl" 
}: CocktailModalProps) {
  const router = useRouter();
  const [isClosing, setIsClosing] = useState(false);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      if (onClose) {
        onClose();
      } else {
        router.back();
      }
    }, 200); // Match animation duration
  };

  // Handle ESC key press
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center px-4 py-6 overflow-y-auto bg-gradient-to-br from-[#1b1c1f]/95 via-[#1b1c1f]/90 to-[#25262a]/95 transition-opacity duration-200 ${isClosing ? 'opacity-0' : 'opacity-100 animate-fadeIn'}`}
      onClick={handleClose}
    >
      <div 
        className={`w-full ${maxWidthClasses[maxWidth]} rounded-xl border border-white/10 bg-[#1b1c1f] p-6 text-white shadow-2xl my-auto transition-all duration-200 ${isClosing ? 'scale-95 opacity-0' : 'animate-scaleIn'}`}
        onClick={(e) => e.stopPropagation()}
      >
        {showCloseButton && (
          <button
            type="button"
            onClick={handleClose}
            className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full border border-white/20 text-white/70 transition hover:border-white/40 hover:bg-white/10 hover:text-white"
            aria-label="Sluiten"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
        {children}
      </div>
    </div>
  );
}
