import { ControllerInitFunction } from '../../types';
import {
  RampsController,
  RampsControllerMessenger,
  getDefaultRampsControllerState,
} from '@metamask/ramps-controller';

/**
 * Initialize the ramps controller.
 *
 * @param request - The request object.
 * @param request.controllerMessenger - The messenger to use for the controller.
 * @param request.persistedState - The persisted state.
 * @returns The initialized controller.
 */
export const rampsControllerInit: ControllerInitFunction<
  RampsController,
  RampsControllerMessenger
> = ({ controllerMessenger, persistedState }) => {
  const rampsControllerState =
    persistedState.RampsController ?? getDefaultRampsControllerState();

  const controller = new RampsController({
    messenger: controllerMessenger,
    state: rampsControllerState,
  });

  // Initialize controller at app startup (non-blocking)
  // Defer to next tick to avoid affecting initial state snapshot
  Promise.resolve().then(() => {
    controller.init().catch(() => {
      // Initialization failed - error state will be available via selectors
    });
  });

  return {
    controller,
  };
};
