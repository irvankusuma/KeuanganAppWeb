import { useState, useCallback } from 'react';

/**
 * Generic form validation hook.
 *
 * @template T
 * @param {T} initialData - Initial form state
 * @param {(data: T) => Record<string, string>} validator - Validator function
 * @returns {{ data: T, setData: Function, errors: Record<string, string>, validate: () => boolean, handleChange: Function, reset: Function }}
 */
export const useFormValidation = (initialData, validator) => {
  const [data, setData] = useState(initialData);
  const [errors, setErrors] = useState({});

  /**
   * Run full validation and store error map.
   * @returns {boolean} true when no errors
   */
  const validate = useCallback(() => {
    const newErrors = validator(data);
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [data, validator]);

  /**
   * Update a single field and clear its error on change.
   * @param {string} field
   * @param {*} value
   */
  const handleChange = useCallback((field, value) => {
    setData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  }, [errors]);

  /**
   * Reset form to initial state and clear all errors.
   */
  const reset = useCallback(() => {
    setData(initialData);
    setErrors({});
  }, [initialData]);

  return { data, setData, errors, validate, handleChange, reset };
};

export default useFormValidation;
