import React from 'react';
import type { ButtonProps } from '../../types';

/**
 * Button component with multiple variants and sizes
 */
export const Button: React.FC<
  ButtonProps & React.ButtonHTMLAttributes<HTMLButtonElement>
> = ({
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  children,
  className = '',
  ...props
}) => {
  const variantClasses = {
    primary: 'bg-primary text-white hover:bg-blue-600',
    secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300',
    danger: 'bg-error text-white hover:bg-red-600',
    ghost: 'bg-transparent text-gray-900 hover:bg-gray-100',
  };

  const sizeClasses = {
    sm: 'px-3 py-1 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  const baseClasses =
    'font-medium rounded transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed';
  const computedClasses = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`;

  return (
    <button
      disabled={disabled || loading}
      className={computedClasses}
      {...props}
    >
      {loading ? (
        <span className="flex items-center gap-2">
          <span className="animate-spin">⏳</span>
          {children}
        </span>
      ) : (
        children
      )}
    </button>
  );
};
