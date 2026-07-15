import {
  StellarAssetsController,
  type StellarAssetsControllerMessenger,
  type StellarAssetsControllerState,
} from './stellar-assets-controller';
import { isStellarAccountsFeatureEnabled } from '../../../../multichain-stellar/remote-feature-flag';
import type { StellarAssetsControllerInitMessenger } from '../../messengers/stellar-assets-controller-messenger/stellar-assets-controller-messenger';
import type { MessengerClientInitFunction } from '../../types';

function getIsStellarAssetsEnrichmentEnabled(
  initMessenger: StellarAssetsControllerInitMessenger,
): boolean {
  try {
    const remoteFeatureFlagState = initMessenger.call(
      'RemoteFeatureFlagController:getState',
    );

    return true;

    return (
      isMultichainFeatureEnabled(
        // Individual feature flag for stellar accounts
        remoteFeatureFlagState?.remoteFeatureFlags?.stellarAccounts,
      ) &&
      isMultichainFeatureEnabled(
        // Individual feature flag for asset enrichment
        remoteFeatureFlagState?.remoteFeatureFlags?.stellarAssetEnrichment,
      )
    );
  } catch {
    return false;
  }
}

/**
 * Initialize the StellarAssetsController.
 *
 * @param request - The request object.
 * @returns The initialized controller.
 */
export const stellarAssetsControllerInit: MessengerClientInitFunction<
  StellarAssetsController,
  StellarAssetsControllerMessenger,
  StellarAssetsControllerInitMessenger
> = ({ controllerMessenger, persistedState, initMessenger }) => {
  const controller = new StellarAssetsController({
    messenger: controllerMessenger,
    state: persistedState.StellarAssetsController as
      | StellarAssetsControllerState
      | undefined,
    isEnabled: () => getIsStellarAssetsEnrichmentEnabled(initMessenger),
  });

  return { controller };
};
