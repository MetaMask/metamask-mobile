import { useState, useEffect, useCallback } from 'react';
import StorageWrapper from './storage-wrapper';

interface UseStorageValueOptions {
  defaultValue?: string | null;
}

interface UseStorageValueReturn {
  /** Current value from storage */
  value: string | null;
  /** Whether the initial load is in progress */
  loading: boolean;
  /** Function to update the storage value */
  setValue: (newValue: string) => Promise<void>;
  /** Any error that occurred during operations */
  error: Error | null;
}

/**
 * Hook to manage a storage value with automatic updates when the value changes
 * @param key - Storage key to watch
 * @param options - Configuration options
 * @returns Object with value, loading state, and update functions
 *
 * @example
 * function UserProfile() {
 *   const { value, loading, setValue, error } = useStorageValue('user_id', {
 *     defaultValue: null,
 *   });
 *
 *   if (loading) return ...
 *   if (error) return ...
 *
 *   // Has value to work with
 *   return ...
 * }
 */
export function useStorageValue(
  key: string,
  options: UseStorageValueOptions = {},
): UseStorageValueReturn {
  const { defaultValue = null } = options;

  const [value, setValue] = useState<string | null>(defaultValue);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const reload = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const storedValue = await StorageWrapper.getItem(key);
      setValue(storedValue);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err : new Error('Failed to load storage value');
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [key]);

  const updateValue = useCallback(
    async (newValue: string) => {
      try {
        setError(null);
        await StorageWrapper.setItem(key, newValue);
        // Value will be updated via the subscription
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err
            : new Error('Failed to update storage value');
        setError(errorMessage);
        throw errorMessage; // Re-throw so caller can handle it
      }
    },
    [key],
  );

  useEffect(() => {
    // Initial load
    reload();

    // Subscribe to changes for this specific key
    const unsubscribe = StorageWrapper.onKeyChange(key, (event) => {
      setValue(event.value);
      setError(null); // Clear any previous errors when value updates successfully
    });

    return () => {
      unsubscribe();
    };
  }, [key, reload]);

  return {
    value,
    loading,
    setValue: updateValue,
    error,
  };
}
