import { StateConstraint, StateMetadata } from '@metamask/base-controller';
import { Json } from '@metamask/utils';
import { captureException } from '@sentry/react-native';

/**! IMPORTANT: THIS IS MEANT TO BE TEMPORARY, WE SHOULD NOT USE THIS AND USE THE VERSION IN BASE-CONTROLLER INSTEAD.
 * The reason why we are using this now, it's because we have controllers state without metadata.
 * An epic will be created to add the metadata to the controllers state without it.
 * As an example of a property without metadata: "swapsTransactions" in TransactionController
 */

/**
 * Returns the subset of state that should be persisted.
 *
 * @param state - The controller state.
 * @param metadata - The controller state metadata, which describes which pieces of state should be persisted.
 * @returns The subset of controller state that should be persisted.
 */
export function getPersistentState<ControllerState extends StateConstraint>(
  state: ControllerState,
  metadata: StateMetadata<ControllerState>,
): Record<keyof ControllerState, Json> {
  return deriveStateFromMetadata(state, metadata, 'persist');
}

/**
 * Use the metadata to derive state according to the given metadata property.
 *
 * @param state - The full controller state.
 * @param metadata - The controller metadata.
 * @param metadataProperty - The metadata property to use to derive state.
 * @returns The metadata-derived controller state.
 */
function deriveStateFromMetadata<ControllerState extends StateConstraint>(
  state: ControllerState,
  metadata: StateMetadata<ControllerState>,
  metadataProperty:
    | 'includeInDebugSnapshot'
    | 'persist'
    | 'includeInStateLogs'
    | 'usedInUi',
): Record<keyof ControllerState, Json> {
  return (Object.keys(state) as (keyof ControllerState)[]).reduce<
    Record<keyof ControllerState, Json>
  >((derivedState, key) => {
    try {
      const stateMetadata = metadata[key];
      if (!stateMetadata) {
        throw new Error(`No metadata found for '${String(key)}'`);
      }
      const propertyMetadata = stateMetadata[metadataProperty];
      const stateProperty = state[key];
      if (typeof propertyMetadata === 'function') {
        derivedState[key] = propertyMetadata(stateProperty);
      } else if (propertyMetadata) {
        derivedState[key] = stateProperty;
      }
      return derivedState;
    } catch (error) {
      // This is what change from the original base controller implementation
      // This is a temporary solution to capture the error for extraneous data that we did not detect
      captureException(error as unknown as Error);

      return derivedState;
    }
  }, {} as never);
}
