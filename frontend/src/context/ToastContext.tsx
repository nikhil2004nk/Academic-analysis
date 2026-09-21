"use client";

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

interface ToastMessage {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const toast = (message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-lg shadow-xl border animate-in slide-in-from-right-5 fade-in duration-300 min-w-[300px]",
              t.type === 'success' && "bg-green-500/10 border-green-500/20 text-green-400",
              t.type === 'error' && "bg-red-500/10 border-red-500/20 text-red-400",
              t.type === 'info' && "bg-blue-500/10 border-blue-500/20 text-blue-400"
            )}
          >
            {t.type === 'success' && <CheckCircle className="h-5 w-5" />}
            {t.type === 'error' && <AlertCircle className="h-5 w-5" />}
            {t.type === 'info' && <Info className="h-5 w-5" />}
            
            <span className="text-sm font-medium flex-1">{t.message}</span>
            
            <button onClick={() => removeToast(t.id)} className="opacity-70 hover:opacity-100 transition-opacity">
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
