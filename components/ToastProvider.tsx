"use client";

import { createContext, useCallback, useContext, useState, ReactNode } from "react";

type ToastType = "success" | "error";
type Toast = { id: number; message: string; type: ToastType };

type ToastContextValue = {
  showToast: (message: string, type?: ToastType) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = "success") => {
    const id = nextId++;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 1500);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {/* Toast stack, bottom-center, above everything else */}
      <div className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex flex-col items-center gap-2 px-4">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`animate-toast-in pointer-events-auto rounded-full border px-4 py-2 text-sm font-medium shadow-[0_0_30px_rgba(0,0,0,0.4)] backdrop-blur ${
              t.type === "success"
                ? "border-cyan-300/30 bg-neutral-900/95 text-cyan-200"
                : "border-red-500/30 bg-neutral-900/95 text-red-300"
            }`}
          >
            {t.type === "success" ? "✓ " : "! "}
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return ctx;
}
