import { useState, useCallback, useRef } from 'react';

interface UseFormOptions<T> {
  initialValues: T;
  onSubmit: (values: T) => Promise<void> | void;
  validate?: (values: T) => Record<string, string>;
}

interface UseFormReturn<T> {
  values: T;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  isSubmitting: boolean;
  isDirty: boolean;
  setValues: (values: T | ((prev: T) => T)) => void;
  setFieldValue: (field: keyof T, value: unknown) => void;
  setFieldError: (field: string, error: string) => void;
  setFieldTouched: (field: string, touched: boolean) => void;
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  handleBlur: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
  resetForm: () => void;
}

/**
 * useForm - Lightweight form state management hook
 */
export function useForm<T extends Record<string, unknown>>(
  options: UseFormOptions<T>
): UseFormReturn<T> {
  const { initialValues, onSubmit, validate } = options;

  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const initialValuesRef = useRef(initialValues);
  const isDirtyRef = useRef(false);

  // Check if form is dirty
  const isDirty = JSON.stringify(values) !== JSON.stringify(initialValuesRef.current);

  // Update field value
  const setFieldValue = useCallback((field: keyof T, value: unknown) => {
    setValues((prev) => ({ ...prev, [field]: value }));
  }, []);

  // Set field error
  const setFieldError = useCallback((field: string, error: string) => {
    setErrors((prev) => ({ ...prev, [field]: error }));
  }, []);

  // Mark field as touched
  const setFieldTouched = useCallback((field: string, touched: boolean) => {
    setTouched((prev) => ({ ...prev, [field]: touched }));
  }, []);

  // Handle input change
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;

    if (type === 'checkbox') {
      setFieldValue(name as keyof T, (e.target as HTMLInputElement).checked);
    } else if (type === 'number') {
      setFieldValue(name as keyof T, value ? Number(value) : '');
    } else {
      setFieldValue(name as keyof T, value);
    }
  }, [setFieldValue]);

  // Handle field blur
  const handleBlur = useCallback((e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name } = e.target;
    setFieldTouched(name, true);

    // Validate on blur
    if (validate) {
      const fieldErrors = validate(values);
      if (fieldErrors[name]) {
        setFieldError(name, fieldErrors[name]);
      } else {
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[name];
          return newErrors;
        });
      }
    }
  }, [values, validate, setFieldTouched, setFieldError]);

  // Handle form submission
  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      // Validate all fields
      if (validate) {
        const newErrors = validate(values);
        setErrors(newErrors);

        if (Object.keys(newErrors).length > 0) {
          return;
        }
      }

      setIsSubmitting(true);

      try {
        await onSubmit(values);
        isDirtyRef.current = false;
      } finally {
        setIsSubmitting(false);
      }
    },
    [values, validate, onSubmit]
  );

  // Reset form
  const resetForm = useCallback(() => {
    setValues(initialValuesRef.current);
    setErrors({});
    setTouched({});
    setIsSubmitting(false);
    isDirtyRef.current = false;
  }, []);

  return {
    values,
    errors,
    touched,
    isSubmitting,
    isDirty,
    setValues,
    setFieldValue,
    setFieldError,
    setFieldTouched,
    handleChange,
    handleBlur,
    handleSubmit,
    resetForm,
  };
}
