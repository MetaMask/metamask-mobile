import { useState, useCallback } from 'react';

interface UseFormOptions<T> {
  initialFormData: T;
  validateForm: (data: T) => Record<string, string>;
}

interface UseFormReturn<T> {
  formData: T;
  errors: Record<string, string>;
  handleChange: (field: keyof T, value: string) => void;
  validateFormData: () => boolean;
  resetForm: () => void;
}

/**
 * A custom hook for managing form state, validation, and actions
 *
 * @param options - Configuration options for the form
 * @param options.initialFormData - Initial state of the form
 * @param options.validateForm - Validation function that returns error messages
 * @returns Object containing form state and methods
 */
export const useForm = <T extends Record<string, any>>({
  initialFormData,
  validateForm,
}: UseFormOptions<T>): UseFormReturn<T> => {
  const [formData, setFormData] = useState<T>(initialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});

  /**
   * Updates a specific field in the form data
   */
  const handleChange = useCallback(
    (field: keyof T, value: string) => {
      setFormData((prevData) => ({
        ...prevData,
        [field]: value,
      }));

      // Clear the error for this field when user starts typing
      if (errors[field as string]) {
        setErrors((prevErrors) => ({
          ...prevErrors,
          [field]: '',
        }));
      }
    },
    [errors],
  );

  /**
   * Validates the entire form and updates error state
   * @returns boolean indicating if form is valid (true = valid, no errors)
   */
  const validateFormData = useCallback((): boolean => {
    const newErrors = validateForm(formData);
    setErrors(newErrors);

    // Form is valid if there are no errors (empty object)
    return Object.keys(newErrors).length === 0;
  }, [formData, validateForm]);

  /**
   * Resets the form to its initial state
   */
  const resetForm = useCallback(() => {
    setFormData(initialFormData);
    setErrors({});
  }, [initialFormData]);

  return {
    formData,
    errors,
    handleChange,
    validateFormData,
    resetForm,
  };
};
