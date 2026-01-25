import React from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';

interface ConfirmationDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'primary' | 'danger' | 'warning';
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

/**
 * ConfirmationDialog Component - Generic confirmation modal for user actions
 */
export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'primary',
  onConfirm,
  onCancel,
  isLoading = false,
}) => {
  const handleConfirm = async () => {
    await onConfirm();
  };

  return (
    <Modal isOpen={isOpen} title={title} onClose={onCancel}>
      <div className="space-y-6">
        {/* Message */}
        <p className="text-gray-700">{message}</p>

        {/* Actions */}
        <div className="flex gap-3 justify-end pt-4 border-t">
          <Button variant="secondary" onClick={onCancel} disabled={isLoading}>
            {cancelText}
          </Button>
          <Button
            variant={variant === 'primary' ? 'primary' : 'danger'}
            onClick={handleConfirm}
            disabled={isLoading}
            loading={isLoading}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmationDialog;
