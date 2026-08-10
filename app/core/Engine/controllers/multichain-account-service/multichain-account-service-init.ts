import {
  MultichainAccountService,
  MultichainAccountServiceMessenger,
  SOL_ACCOUNT_PROVIDER_NAME,
  BTC_ACCOUNT_PROVIDER_NAME,
  TRX_ACCOUNT_PROVIDER_NAME,
  AccountProviderWrapper,
  XlmAccountProvider,
} from '@metamask/multichain-account-service';
import type { RemoteFeatureFlagControllerState } from '@metamask/remote-feature-flag-controller';
import { MessengerClientInitFunction } from '../../types';
import { MultichainAccountServiceInitMessenger } from '../../messengers/multichain-account-service-messenger/multichain-account-service-messenger';
import { isStellarAccountsFeatureEnabled } from '../../../../multichain-stellar/remote-feature-flag';
import { previousValueComparator } from '../../../../util/value-comparator';

const mergedFlags = (state: RemoteFeatureFlagControllerState) => ({
  ...state.remoteFeatureFlags,
  ...(state.localOverrides ?? {}),
});

/**
 * Initialize the multichain account service.
 *
 * @param request - The request object.
 * @param request.controllerMessenger - The messenger to use for the service.
 * @param request.initMessenger - The messenger to use for initialization.
 * @returns The initialized service.
 */
export const multichainAccountServiceInit: MessengerClientInitFunction<
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
    resyncAccounts: {
      autoRemoveExtraSnapAccounts: false,
    },
  };

  const xlmProvider = new AccountProviderWrapper(
    controllerMessenger,
    new XlmAccountProvider(controllerMessenger, snapAccountProviderConfig),
  );

  // initialize Stellar provider based on feature flag
  const initialRemoteFeatureFlagsState = initMessenger.call(
    'RemoteFeatureFlagController:getState',
  );

  const initialStellarEnabled = isStellarAccountsFeatureEnabled(
    mergedFlags(initialRemoteFeatureFlagsState).stellarAccounts,
  );

  xlmProvider.setEnabled(initialStellarEnabled);

  const controller = new MultichainAccountService({
    messenger: controllerMessenger,
    // TODO: Once stellar is officially supported,
    // move it to the providers array via `XLM_ACCOUNT_PROVIDER_NAME`.
    providers: [xlmProvider],
    providerConfigs: {
      [SOL_ACCOUNT_PROVIDER_NAME]: snapAccountProviderConfig,
      /// BEGIN:ONLY_INCLUDE_IF(bitcoin)
      [BTC_ACCOUNT_PROVIDER_NAME]: snapAccountProviderConfig,
      /// END:ONLY_INCLUDE_IF
      /// BEGIN:ONLY_INCLUDE_IF(tron)
      [TRX_ACCOUNT_PROVIDER_NAME]: snapAccountProviderConfig,
      /// END:ONLY_INCLUDE_IF
    },
  });


  // Subscribe to feature flag changes to enable Stellar provider.
  // Note: Disable Stellar provider from enable may result abnormal behavior.
  initMessenger.subscribe(
    'RemoteFeatureFlagController:stateChange',
    previousValueComparator((prevState, currState) => {
      const prevStellarEnabled = isStellarAccountsFeatureEnabled(
        mergedFlags(prevState).stellarAccounts,
      );
      const currStellarEnabled = isStellarAccountsFeatureEnabled(
        mergedFlags(currState).stellarAccounts,
      );

      // Only handle the case when Stellar provider is enabled.
      // Disable after enable may result in abnormal behavior.
      if (prevStellarEnabled !== currStellarEnabled && currStellarEnabled) {
        xlmProvider.setEnabled(currStellarEnabled);
        // Trigger wallet alignment when Stellar accounts are enabled
        // This will create Stellar accounts for existing wallets
        controller.alignWallets().catch((error) => {
          console.error(
            'Failed to align wallets after enabling Stellar provider:',
            error,
          );
        });
      }

      return true;
    }, initialRemoteFeatureFlagsState),
  );

  return { controller, memStateKey: null, persistedStateKey: null };
};
