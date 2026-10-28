"use client";
import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

interface ToastItem {
  id: string;
  message: string;
  type: "info" | "error" | "success";
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastItem["type"]) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let nextId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((message: string, type: ToastItem["type"] = "info") => {
    const id = String(nextId++);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  const typeClasses: Record<ToastItem["type"], string> = {
    info: "bg-[var(--pw-surface)] border-[var(--pw-border)]",
    error: "bg-red-900 border-red-700 text-white",
    success: "bg-green-800 border-green-600 text-white",
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Live region for screen readers */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {toasts.map((t) => t.message).join(". ")}
      </div>
      {/* Visual toasts */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 items-center pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={[
              "px-4 py-3 rounded-lg border shadow-lg text-sm animate-slide-up",
              "text-[var(--pw-text)]",
              typeClasses[toast.type],
            ].join(" ")}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}
