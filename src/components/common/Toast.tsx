import React, { useEffect } from 'react';
import type { ToastProps } from '../../types';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

/**
 * Toast notification component with auto-dismiss
 */
export const Toast: React.FC<ToastProps> = ({
  id,
  type,
  message,
  duration = 5000,
  onClose,
}) => {
  useEffect(() => {
    if (duration) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const typeConfig = {
    success: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      icon: <CheckCircle className="text-success" size={20} />,
      text: 'text-green-800',
    },
    error: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      icon: <AlertCircle className="text-error" size={20} />,
      text: 'text-red-800',
    },
    warning: {
      bg: 'bg-yellow-50',
      border: 'border-yellow-200',
      icon: <AlertCircle className="text-warning" size={20} />,
      text: 'text-yellow-800',
    },
    info: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      icon: <Info className="text-primary" size={20} />,
      text: 'text-blue-800',
    },
  };

  const config = typeConfig[type];

  return (
    <div
      className={`
        flex items-start gap-3 p-4 rounded-lg border animate-slide-in-right
        ${config.bg} ${config.border} ${config.text}
      `}
      role="alert"
    >
      {config.icon}
      <p className="flex-1 text-sm font-medium">{message}</p>
      <button
        onClick={onClose}
        className="flex-shrink-0 hover:opacity-75 transition-opacity"
        aria-label="Close notification"
      >
        <X size={16} />
      </button>
    </div>
  );
};
