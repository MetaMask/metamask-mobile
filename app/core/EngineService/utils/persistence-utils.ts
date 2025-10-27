import type {
  StateConstraint,
  StateMetadata,
  StatePropertyMetadata,
} from '@metamask/base-controller';
import type { Json } from '@metamask/utils';

/**
 * Checks if a controller has any properties marked for persistence.
 *
 * This utility examines the controller's state metadata to determine if any properties
 * are configured to be persisted to storage. A property is considered persistent if:
 * - It has `persist: true` set in its metadata
 * - It has a `persist` function defined in its metadata
 *
 * @param metadata - The controller's state metadata
 * @returns true if the controller has properties marked for persistence, false otherwise
 *
 * @example
 * ```typescript
 * const metadata = {
 *   field1: { persist: true, anonymous: false },
 *   field2: { persist: false, anonymous: true },
 * };
 * hasPersistedState(metadata); // returns true
 * ```
 */
export const hasPersistedState = (
  metadata: StateMetadata<StateConstraint> | undefined,
): boolean => {
  if (!metadata) {
    return false;
  }

  return Object.values(metadata).some(
    (propertyMetadata: StatePropertyMetadata<Json>) => {
      if (!propertyMetadata) {
        return false;
      }
      // Check if the property has persist: true or a persist function
      const persistProperty = propertyMetadata.persist;
      return typeof persistProperty === 'function' || persistProperty === true;
    },
  );
};
