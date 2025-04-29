import { getPersistentState } from '@metamask/base-controller';
import { Json } from '@metamask/utils';

/**
 * Filters controller states to only include properties that should be persisted.
 * Uses the controller's metadata to determine which properties should be persisted.
 * Properties with metadata.persist set to true will be included in the returned state.
 *
 * @param controllers - Object containing controller states and their metadata
 * @returns Filtered object containing only the persistent properties of each controller state
 * @example
 * ```typescript
 * const controllers = {
 *   controller1: {
 *     metadata: { a: { persist: true }, b: { persist: false } },
 *     state: { a: 'value1', b: 'value2' }
 *   }
 * };
 * const filtered = filterPersistableControllers(controllers);
 * // Result: { controller1: { a: 'value1' } }
 * ```
 */
export const filterPersistableControllers = (
  controllers: Record<string, unknown>,
): Record<string, unknown> =>
  Object.entries(controllers).reduce(
    (acc, [controllerName, controllerState]) => {
      // If the controller doesn't have both metadata and state, return it unchanged
      if (
        !controllerState ||
        typeof controllerState !== 'object' ||
        !('metadata' in controllerState) ||
        !('state' in controllerState) ||
        !controllerState.metadata ||
        !controllerState.state
      ) {
        acc[controllerName] = controllerState;
        return acc;
      }

      // Cast the state to a type that satisfies StateConstraint
      const state = controllerState.state as Record<string, Json>;
      // Use getPersistentState to get the subset of state that should be persisted
      const filteredState = getPersistentState(
        state,
        controllerState.metadata as Record<
          string,
          { persist: boolean; anonymous: boolean }
        >,
      );

      // Return just the filtered state
      acc[controllerName] = filteredState;
      return acc;
    },
    {} as Record<string, unknown>,
  );
