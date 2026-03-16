import {
  ComplianceController,
  type ComplianceControllerMessenger,
} from '@metamask/compliance-controller';
import type { ControllerInitFunction } from '../../types';
import type { ComplianceControllerInitMessenger } from '../../messengers/compliance/compliance-controller-messenger';
import { FeatureFlagNames } from '../../../../constants/featureFlags';
import Logger from '../../../../util/Logger';
import { validatedVersionGatedFeatureFlag } from '../../../../util/remoteFeatureFlag';

/**
 * Initialize the ComplianceController.
 *
 * The controller is always instantiated so its state slot exists, but
 * `init()` (which fetches the blocked wallets list) only runs when the
 * `complianceEnabled` feature flag is true.
 *
 * @param request - The request object.
 * @param request.controllerMessenger - The messenger for the controller.
 * @param request.initMessenger - The messenger for reading feature flags.
 * @param request.persistedState - Persisted state to hydrate from.
 * @returns The initialized ComplianceController.
 */
export const complianceControllerInit: ControllerInitFunction<
  ComplianceController,
  ComplianceControllerMessenger,
  ComplianceControllerInitMessenger
> = ({ controllerMessenger, initMessenger, persistedState }) => {
  const controller = new ComplianceController({
    messenger: controllerMessenger,
    state: persistedState.ComplianceController,
  });

  const isComplianceEnabled = (): boolean => {
    const remoteState = initMessenger.call(
      'RemoteFeatureFlagController:getState',
    );
    const localOverride =
      remoteState?.localOverrides?.[FeatureFlagNames.complianceEnabled];
    if (localOverride !== undefined) {
      return Boolean(localOverride);
    }

    const remoteFlag =
      remoteState?.remoteFeatureFlags?.[FeatureFlagNames.complianceEnabled];
    return validatedVersionGatedFeatureFlag(remoteFlag) ?? false;
  };

  if (isComplianceEnabled()) {
    controller
      .init()
      .then(() => {
        Logger.log('ComplianceController initialized');
      })
      .catch((error: unknown) =>
        Logger.error(
          error instanceof Error ? error : new Error(String(error)),
          'ComplianceController init failed — sanctions blocklist may be empty',
        ),
      );
  } else {
    Logger.log('ComplianceController disabled via feature flag');
  }

  return { controller };
};
