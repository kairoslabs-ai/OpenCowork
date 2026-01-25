import React from 'react';
import type { InputProps } from '../../types';

/**
 * Input component with error display and validation states
 */
export const Input: React.FC<
  InputProps & React.InputHTMLAttributes<HTMLInputElement>
> = ({
  type = 'text',
  placeholder,
  value,
  onChange,
  error,
  disabled = false,
  required = false,
  className = '',
  ...props
}) => {
  return (
    <div className="flex flex-col gap-1">
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        required={required}
        className={`
          px-3 py-2 border rounded text-base
          focus:outline-none focus:ring-2 focus:ring-primary
          disabled:bg-gray-100 disabled:cursor-not-allowed
          ${error ? 'border-error focus:ring-error' : 'border-gray-300'}
          ${className}
        `}
        {...props}
      />
      {error && <span className="text-sm text-error">{error}</span>}
    </div>
  );
};
