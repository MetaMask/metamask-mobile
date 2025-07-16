import {
  PreferencesController,
  type PreferencesControllerMessenger,
  type PreferencesState,
  getDefaultPreferencesState,
} from '@metamask/preferences-controller';
import type { ControllerInitFunction } from '../../types';

/**
 * Initialize the PreferencesController.
 *
 * @param request - The request object.
 * @returns The PreferencesController.
 */
export const preferencesControllerInit: ControllerInitFunction<
  PreferencesController,
  PreferencesControllerMessenger
> = (request) => {
  const { controllerMessenger, persistedState } = request;

  const preferencesControllerState = (persistedState.PreferencesController ??
    getDefaultPreferencesState()) as PreferencesState;

  const controller = new PreferencesController({
    messenger: controllerMessenger,
    state: preferencesControllerState,
  });

  return { controller };
};
