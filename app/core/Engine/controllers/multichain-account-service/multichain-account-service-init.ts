import {
  MultichainAccountService,
  MultichainAccountServiceMessenger,
  SOL_ACCOUNT_PROVIDER_NAME,
  BTC_ACCOUNT_PROVIDER_NAME,
  TRX_ACCOUNT_PROVIDER_NAME,
  XLM_ACCOUNT_PROVIDER_NAME,
  AccountProviderWrapper,
  XlmAccountProvider,
} from '@metamask/multichain-account-service';
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

  const xlmProvider = new AccountProviderWrapper(
    controllerMessenger,
    new XlmAccountProvider(controllerMessenger, snapAccountProviderConfig),
  );

  const controller = new MultichainAccountService({
    messenger: controllerMessenger,
    providers: [
      /// BEGIN:ONLY_INCLUDE_IF(stellar)
      xlmProvider
      /// END:ONLY_INCLUDE_IF
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
