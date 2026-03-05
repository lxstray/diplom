'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (type: ToastMessage['type'], message: string) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, type, message }]);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      removeToast(id);
    }, 5000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const success = (message: string) => addToast('success', message);
  const error = (message: string) => addToast('error', message);
  const info = (message: string) => addToast('info', message);

  return { toasts, success, error, info, removeToast };
}

export function ToastContainer({ toasts, removeToast }: { toasts: ToastMessage[]; removeToast: (id: string) => void }) {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border ${
            toast.type === 'success'
              ? 'bg-green-500/10 border-green-500/20 text-green-500'
              : toast.type === 'error'
              ? 'bg-destructive/10 border-destructive/20 text-destructive'
              : 'bg-blue-500/10 border-blue-500/20 text-blue-500'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="h-5 w-5" />
          ) : toast.type === 'error' ? (
            <AlertCircle className="h-5 w-5" />
          ) : (
            <AlertCircle className="h-5 w-5" />
          )}
          <span className="text-sm font-medium">{toast.message}</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 hover:bg-transparent"
            onClick={() => removeToast(toast.id)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}
    </div>
  );
}
