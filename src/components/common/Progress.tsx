import React from 'react';
import type { ProgressProps } from '../../types';

/**
 * Progress bar component with optional label
 */
export const Progress: React.FC<ProgressProps> = ({
  current,
  total,
  label,
}) => {
  const percentage = Math.round((current / total) * 100);

  return (
    <div className="flex flex-col gap-2">
      {label && (
        <div className="flex justify-between items-center text-sm">
          <span className="font-medium">{label}</span>
          <span className="text-gray-600">
            {current} / {total}
          </span>
        </div>
      )}

      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
        <div
          className="bg-primary h-full rounded-full transition-all duration-300 ease-out"
          style={{ width: `${percentage}%` }}
          role="progressbar"
          aria-valuenow={percentage}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>

      {!label && (
        <span className="text-xs text-gray-600 text-right">
          {percentage}%
        </span>
      )}
    </div>
  );
};
