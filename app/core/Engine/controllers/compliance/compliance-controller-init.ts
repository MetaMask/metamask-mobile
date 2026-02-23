import {
  ComplianceController,
  type ComplianceControllerMessenger,
} from '@metamask/compliance-controller';
import type { ControllerInitFunction } from '../../types';
import type { ComplianceControllerInitMessenger } from '../../messengers/compliance/compliance-controller-messenger';
import {
  DEFAULT_FEATURE_FLAG_VALUES,
  FeatureFlagNames,
} from '../../../../constants/featureFlags';
import Logger from '../../../../util/Logger';

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
    return Boolean(
      remoteState?.remoteFeatureFlags?.[FeatureFlagNames.complianceEnabled] ??
        DEFAULT_FEATURE_FLAG_VALUES[FeatureFlagNames.complianceEnabled],
    );
  };

  if (isComplianceEnabled()) {
    controller
      .init()
      .then(() => {
        Logger.log('ComplianceController initialized');
      })
      .catch((error: unknown) =>
        Logger.log('ComplianceController init failed: ', error),
      );
  } else {
    Logger.log('ComplianceController disabled via feature flag');
  }

  return { controller };
};
