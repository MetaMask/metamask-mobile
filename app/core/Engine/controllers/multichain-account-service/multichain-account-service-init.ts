import {
  MultichainAccountService,
  MultichainAccountServiceMessenger,
  BtcAccountProvider,
  TrxAccountProvider,
  AccountProviderWrapper,
} from '@metamask/multichain-account-service';
import { ControllerInitFunction } from '../../types';

/**
 * Initialize the multichain account service.
 *
 * @param request - The request object.
 * @param request.controllerMessenger - The messenger to use for the service.
 * @returns The initialized service.
 */
export const multichainAccountServiceInit: ControllerInitFunction<
  MultichainAccountService,
  MultichainAccountServiceMessenger
> = ({ controllerMessenger }) => {
  /// BEGIN:ONLY_INCLUDE_IF(bitcoin)
  // Create Bitcoin provider wrapped for feature flag control
  const btcProvider = new AccountProviderWrapper(
    controllerMessenger,
    new BtcAccountProvider(controllerMessenger),
  );
  /// END:ONLY_INCLUDE_IF

  /// BEGIN:ONLY_INCLUDE_IF(tron)
  const trxProvider = new TrxAccountProvider(controllerMessenger);
  /// END:ONLY_INCLUDE_IF

  const providers = [
    /// BEGIN:ONLY_INCLUDE_IF(bitcoin)
    btcProvider,
    /// END:ONLY_INCLUDE_IF
    /// BEGIN:ONLY_INCLUDE_IF(tron)
    trxProvider,
    /// END:ONLY_INCLUDE_IF
  ].filter(Boolean);

  const controller = new MultichainAccountService({
    messenger: controllerMessenger,
    providers,
  });

  /// BEGIN:ONLY_INCLUDE_IF(bitcoin)
  // Get initial Bitcoin feature flag state
  const remoteFeatureFlagsState = controllerMessenger.call(
    'RemoteFeatureFlagController:getState',
  );
  
  // Set initial state based on addBitcoinAccount feature flag
  const initialBitcoinEnabled = Boolean(
    remoteFeatureFlagsState?.remoteFeatureFlags?.addBitcoinAccount,
  );
  
  btcProvider.setEnabled(initialBitcoinEnabled);

  // Subscribe to RemoteFeatureFlagsController:stateChange for runtime control
  controllerMessenger.subscribe(
    'RemoteFeatureFlagController:stateChange',
    (state: unknown) => {
      const addBitcoinAccountEnabled = Boolean(
        (state as { remoteFeatureFlags?: { addBitcoinAccount?: boolean } })
          ?.remoteFeatureFlags?.addBitcoinAccount,
      );

      // Enable/disable Bitcoin provider based on feature flag
      btcProvider.setEnabled(addBitcoinAccountEnabled);

      // Trigger wallet sync to update account visibility
      const wallets = controller.getMultichainAccountWallets();
      for (const wallet of wallets) {
        wallet.sync();
      }
    },
  );
  /// END:ONLY_INCLUDE_IF

  return { controller, memStateKey: null, persistedStateKey: null };
};
