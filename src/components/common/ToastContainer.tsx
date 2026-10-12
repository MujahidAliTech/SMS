import React from 'react';
import { useApp } from '../../context/AppContext';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useApp();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none no-print">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-lg shadow-lg border text-sm backdrop-blur transition-all duration-300 animate-slideIn ${
            t.type === 'success'
              ? 'bg-emerald-950/90 text-emerald-100 border-emerald-700/50'
              : t.type === 'error'
              ? 'bg-rose-950/90 text-rose-100 border-rose-700/50'
              : 'bg-slate-900/90 text-slate-100 border-slate-700/50'
          }`}
        >
          {t.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />}
          {t.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />}
          {t.type === 'info' && <Info className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />}
          <div className="flex-1 text-xs leading-relaxed">{t.message}</div>
          <button
            onClick={() => removeToast(t.id)}
            className="text-slate-400 hover:text-white shrink-0 ml-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};
