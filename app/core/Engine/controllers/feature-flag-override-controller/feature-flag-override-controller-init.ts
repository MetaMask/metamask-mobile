import { ControllerInitFunction } from '../../types';
import {
  FeatureFlagOverrideController,
  getDefaultFeatureFlagOverrideControllerState,
  type FeatureFlagOverrideControllerMessenger,
} from './FeatureFlagOverrideController';

/**
 * Initialize the FeatureFlagOverrideController.
 *
 * @param request - The request object.
 * @returns The FeatureFlagOverrideController.
 */
export const featureFlagOverrideControllerInit: ControllerInitFunction<
  FeatureFlagOverrideController,
  FeatureFlagOverrideControllerMessenger
> = ({ controllerMessenger, persistedState }) => {
  const controllerState =
    persistedState.FeatureFlagOverrideController ??
    getDefaultFeatureFlagOverrideControllerState();

  const controller = new FeatureFlagOverrideController({
    messenger: controllerMessenger,
    state: controllerState,
  });

  return {
    controller,
  };
};
