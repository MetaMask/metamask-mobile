import {
  SnapInterfaceController,
  SnapInterfaceControllerMessenger,
  SnapInterfaceControllerState,
} from '@metamask/snaps-controllers';
import Logger from '../../../../util/Logger';

export const defaultSnapInterfaceControllerState: SnapInterfaceControllerState =
  { interfaces: {} };

/**
 * Creates instance of SnapInterfaceController
 *
 * @param options.messenger - Controller messenger instance
 * @param options.initialState - Initial state of SnapInterfaceController
 * @returns - SnapInterfaceController instance
 */
export const createSnapInterfaceController = ({
  messenger,
  initialState,
}: {
  messenger: SnapInterfaceControllerMessenger;
  initialState?: SnapInterfaceControllerState;
}): SnapInterfaceController => {
  try {
    const snapInterfaceController = new SnapInterfaceController({
      messenger,
      state: initialState ?? defaultSnapInterfaceControllerState,
    });
    return snapInterfaceController;
  } catch (error) {
    Logger.error(
      error as Error,
      'Failed to initialize SnapInterfaceController',
    );
    throw error;
  }
};
