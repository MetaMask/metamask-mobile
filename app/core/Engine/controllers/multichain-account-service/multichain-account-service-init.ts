import {
  MultichainAccountService,
  MultichainAccountServiceMessenger,
  BtcAccountProvider,
  TrxAccountProvider,
  AccountProviderWrapper,
  SOL_ACCOUNT_PROVIDER_NAME,
} from '@metamask/multichain-account-service';
import { ControllerInitFunction } from '../../types';
import Engine from '../../Engine';
import { forwardSelectedAccountGroupToSnapKeyring } from '../../../SnapKeyring/utils/forwardSelectedAccountGroupToSnapKeyring';
import { MultichainAccountServiceInitMessenger } from '../../messengers/multichain-account-service-messenger/multichain-account-service-messenger';
import { isBitcoinAccountsFeatureEnabled } from '../../../../multichain-bitcoin/remote-feature-flag';
import { RemoteFeatureFlagControllerState } from '@metamask/remote-feature-flag-controller';

/**
 * Initialize the multichain account service.
 *
 * @param request - The request object.
 * @param request.controllerMessenger - The messenger to use for the service.
 * @returns The initialized service.
 */
export const multichainAccountServiceInit: ControllerInitFunction<
  MultichainAccountService,
  MultichainAccountServiceMessenger,
  MultichainAccountServiceInitMessenger
> = ({ controllerMessenger, initMessenger }) => {
  const snapAccountProviderConfig = {
    // READ THIS CAREFULLY:
    // We using 1 to prevent any concurrent `keyring_createAccount` requests, that make sure
    // we prevent any desync between Snap's accounts and Metamask's accounts.
    maxConcurrency: 1,
    // Re-use the default config for the rest:
    discovery: {
      timeoutMs: 2000,
      maxAttempts: 3,
      backOffMs: 1000,
    },
    createAccounts: {
      timeoutMs: 3000,
    },
  };

  /// BEGIN:ONLY_INCLUDE_IF(bitcoin)
  // Create Bitcoin provider wrapped for feature flag control
  const btcProvider = new AccountProviderWrapper(
    controllerMessenger,
    new BtcAccountProvider(controllerMessenger, snapAccountProviderConfig),
  );
  /// END:ONLY_INCLUDE_IF

  /// BEGIN:ONLY_INCLUDE_IF(tron)
  const trxProvider = new TrxAccountProvider(
    controllerMessenger,
    snapAccountProviderConfig,
  );
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
    providerConfigs: {
      [SOL_ACCOUNT_PROVIDER_NAME]: snapAccountProviderConfig,
    },
  });

  /// BEGIN:ONLY_INCLUDE_IF(bitcoin)
  // Handle Bitcoin provider feature flag
  const initialRemoteFeatureFlagsState = initMessenger.call(
    'RemoteFeatureFlagController:getState',
  );

  // Set initial state based on bitcoinAccounts feature flag
  const initialBitcoinEnabled = isBitcoinAccountsFeatureEnabled(
    initialRemoteFeatureFlagsState.remoteFeatureFlags.bitcoinAccounts,
  );

  // We need to set the initial state, so if it's
  // - enabled: new accounts will get created and existing accounts will also appear on the account tree.
  // - disabled: no new accounts will get created
  btcProvider.setEnabled(initialBitcoinEnabled);

  if (initialBitcoinEnabled) {
    // Trigger wallet alignment when Bitcoin accounts are enabled
    controller.alignWallets().catch((error) => {
      console.error(
        'Failed to align wallets after enabling Bitcoin provider:',
        error,
      );
    });
  }

  // Subscribe to RemoteFeatureFlagController:stateChange for runtime control
  let currentBitcoinEnabled = initialBitcoinEnabled;
  initMessenger.subscribe(
    'RemoteFeatureFlagController:stateChange',
    (state: RemoteFeatureFlagControllerState) => {
      const bitcoinAccountsEnabled = isBitcoinAccountsFeatureEnabled(
        state.remoteFeatureFlags.bitcoinAccounts,
      );

      // Only react if the flag actually changed
      if (bitcoinAccountsEnabled !== currentBitcoinEnabled) {
        currentBitcoinEnabled = bitcoinAccountsEnabled;

        // Enable/disable Bitcoin provider based on feature flag
        btcProvider.setEnabled(bitcoinAccountsEnabled);

        // Trigger wallet alignment when Bitcoin accounts are enabled
        // This will create Bitcoin accounts for existing wallets
        if (bitcoinAccountsEnabled) {
          controller.alignWallets().catch((error) => {
            console.error(
              'Failed to align wallets after enabling Bitcoin provider:',
              error,
            );
          });
        }
        // Note: When disabled, no action needed as the provider won't create new accounts
      }
    },
  );
  /// END:ONLY_INCLUDE_IF

  // TODO: Move this logic to the SnapKeyring directly.
  initMessenger.subscribe(
    'MultichainAccountService:multichainAccountGroupUpdated',
    (group) => {
      const { AccountTreeController } = Engine.context;

      // If the current group gets updated, then maybe there are more accounts being "selected"
      // now, so we have to forward them to the Snap keyring too!
      if (AccountTreeController.getSelectedAccountGroup() === group.id) {
        // eslint-disable-next-line no-void
        void forwardSelectedAccountGroupToSnapKeyring(group.id);
      }
    },
  );

  return { controller, memStateKey: null, persistedStateKey: null };
};
