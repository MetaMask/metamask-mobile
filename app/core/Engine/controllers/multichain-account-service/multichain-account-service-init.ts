import {
  AccountProviderWrapper,
  MultichainAccountService,
  MultichainAccountServiceMessenger,
  SOL_ACCOUNT_PROVIDER_NAME,
  BTC_ACCOUNT_PROVIDER_NAME,
  TRX_ACCOUNT_PROVIDER_NAME,
} from '@metamask/multichain-account-service';
import { XlmAccountProvider } from './XlmAccountProvider';
import { MessengerClientInitFunction } from '../../types';
import { MultichainAccountServiceInitMessenger } from '../../messengers/multichain-account-service-messenger/multichain-account-service-messenger';

/**
 * Initialize the multichain account service.
 *
 * @param request - The request object.
 * @param request.controllerMessenger - The messenger to use for the service.
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
      batched: true,
    },
    resyncAccounts: {
      autoRemoveExtraSnapAccounts: false,
    },
  };

  const stellarSnapAccountProviderConfig = {
    ...snapAccountProviderConfig,
    createAccounts: {
      ...snapAccountProviderConfig.createAccounts,
      batched: true,
      timeoutMs: 10000,
    },
  };

  const controller = new MultichainAccountService({
    messenger: controllerMessenger,
    providers: [
      new AccountProviderWrapper(
        controllerMessenger,
        new XlmAccountProvider(
          controllerMessenger,
          stellarSnapAccountProviderConfig,
        ),
      ),
    ],
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

  return { controller, memStateKey: null, persistedStateKey: null };
};
