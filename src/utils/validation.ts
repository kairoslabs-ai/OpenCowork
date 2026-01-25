import type { TaskCreateFormValues } from '../types';

/**
 * Validation utilities for forms
 */

export function validateTaskForm(
  values: TaskCreateFormValues
): Partial<TaskCreateFormValues> {
  const errors: Partial<TaskCreateFormValues> = {};

  // Goal validation
  if (!values.goal || values.goal.trim().length === 0) {
    errors.goal = 'Goal is required';
  } else if (values.goal.length < 5) {
    errors.goal = 'Goal must be at least 5 characters';
  } else if (values.goal.length > 500) {
    errors.goal = 'Goal must be less than 500 characters';
  }

  // Description validation (optional)
  if (values.description && values.description.length > 2000) {
    errors.description = 'Description must be less than 2000 characters';
  }

  return errors;
}

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate URL format
 */
export function validateUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}
