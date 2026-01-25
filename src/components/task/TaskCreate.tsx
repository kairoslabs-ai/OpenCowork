import React, { useState } from 'react';
import type { TaskCreateFormValues, TaskCreateProps } from '../../types';
import { Button, Input } from '../common';
import { validateTaskForm } from '../../utils/validation';

/**
 * TaskCreate component - Form for creating new tasks
 */
export const TaskCreate: React.FC<TaskCreateProps> = ({
  onSubmit,
  isLoading = false,
}) => {
  const [values, setValues] = useState<TaskCreateFormValues>({
    goal: '',
    description: '',
  });

  const [errors, setErrors] = useState<Partial<TaskCreateFormValues>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof TaskCreateFormValues, boolean>>>({});

  const handleChange = (
    field: keyof TaskCreateFormValues,
    value: string
  ) => {
    setValues((prev) => ({ ...prev, [field]: value }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleBlur = (field: keyof TaskCreateFormValues) => {
    setTouched((prev) => ({ ...prev, [field]: true }));

    // Validate on blur
    const fieldErrors = validateTaskForm(values);
    if (fieldErrors[field]) {
      setErrors((prev) => ({ ...prev, [field]: fieldErrors[field] }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate all fields
    const formErrors = validateTaskForm(values);
    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      setTouched({
        goal: true,
        description: true,
      });
      return;
    }

    try {
      await onSubmit({
        goal: values.goal,
        description: values.description || undefined,
      });

      // Reset form on success
      setValues({ goal: '', description: '' });
      setErrors({});
      setTouched({});
    } catch (error) {
      console.error('Failed to create task:', error);
    }
  };

  const examples = [
    'Organize my documents by date and type',
    'Create a summary of the Q4 meeting notes',
    'Generate a monthly report from sales data',
  ];

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold mb-6">Create New Task</h2>

        {/* Goal Input */}
        <div className="mb-6">
          <label htmlFor="goal" className="block text-sm font-medium mb-2">
            What would you like to accomplish? <span className="text-error">*</span>
          </label>
          <Input
            id="goal"
            type="text"
            placeholder="e.g., Organize my documents..."
            value={values.goal}
            onChange={(value) => handleChange('goal', value)}
            onBlur={() => handleBlur('goal')}
            error={touched.goal ? errors.goal : undefined}
            disabled={isLoading}
            required
          />
        </div>

        {/* Description Textarea */}
        <div className="mb-6">
          <label htmlFor="description" className="block text-sm font-medium mb-2">
            Additional details (optional)
          </label>
          <textarea
            id="description"
            placeholder="Add more context about what you want to do..."
            value={values.description}
            onChange={(e) => handleChange('description', e.target.value)}
            onBlur={() => handleBlur('description')}
            disabled={isLoading}
            className={`
              w-full px-3 py-2 border rounded text-base
              focus:outline-none focus:ring-2 focus:ring-primary
              disabled:bg-gray-100 disabled:cursor-not-allowed
              ${errors.description ? 'border-error focus:ring-error' : 'border-gray-300'}
              min-h-[100px] resize-none
            `}
          />
          {touched.description && errors.description && (
            <span className="text-sm text-error">{errors.description}</span>
          )}
        </div>

        {/* Examples */}
        <div className="mb-6">
          <p className="text-sm font-medium text-gray-600 mb-2">Examples:</p>
          <div className="space-y-2">
            {examples.map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => handleChange('goal', example)}
                disabled={isLoading}
                className="
                  block w-full text-left text-sm p-3 rounded border border-gray-200
                  hover:bg-gray-50 transition-colors disabled:opacity-50
                "
              >
                {example}
              </button>
            ))}
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex gap-3">
          <Button
            type="submit"
            variant="primary"
            loading={isLoading}
            disabled={isLoading}
            className="flex-1"
          >
            Create Task & Generate Plan
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setValues({ goal: '', description: '' });
              setErrors({});
              setTouched({});
            }}
            disabled={isLoading}
          >
            Clear
          </Button>
        </div>
      </div>
    </form>
  );
};
