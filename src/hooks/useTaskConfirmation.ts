import { useState, useCallback } from 'react';
import { useTask } from './useTask';

interface ConfirmationRequest {
  taskId: string;
  message: string;
  isDangerous?: boolean;
}

/**
 * useTaskConfirmation - Manages task confirmation workflow
 * Displays confirmation dialog and submits user response to backend
 */
export const useTaskConfirmation = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [pending, setPending] = useState<ConfirmationRequest | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { confirmTask } = useTask();

  const openConfirmation = useCallback(
    (taskId: string, message: string, isDangerous = false) => {
      setPending({ taskId, message, isDangerous });
      setIsOpen(true);
    },
    []
  );

  const closeConfirmation = useCallback(() => {
    setIsOpen(false);
    setPending(null);
  }, []);

  const submit = useCallback(
    async (confirmed: boolean) => {
      if (!pending) return;

      setIsSubmitting(true);
      try {
        await confirmTask(pending.taskId, confirmed);
        closeConfirmation();
      } catch (error) {
        console.error('Failed to submit confirmation:', error);
      } finally {
        setIsSubmitting(false);
      }
    },
    [pending, confirmTask, closeConfirmation]
  );

  return {
    isOpen,
    pending,
    isSubmitting,
    openConfirmation,
    closeConfirmation,
    submit,
  };
};
