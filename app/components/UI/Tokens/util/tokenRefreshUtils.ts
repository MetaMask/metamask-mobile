import { Hex, KnownCaipNamespace } from '@metamask/utils';
import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';

const REFRESH_TIMEOUT_MS = 5000; // 5 second timeout

/**
 * Wraps a promise with a timeout. Resolves with the result or rejects if timeout is exceeded.
 */
const withTimeout = <T>(
  promise: Promise<T>,
  timeoutMs: number,
  operationName: string,
): Promise<T> =>
  Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(
        () =>
          reject(new Error(`${operationName} timed out after ${timeoutMs}ms`)),
        timeoutMs,
      ),
    ),
  ]);

/**
 * Refreshes token-specific data (detection, balances, rates).
 * Does NOT refresh account balance - use performEvmRefresh for that.
 */
export const performEvmTokenRefresh = async (
  evmNetworkConfigurationsByChainId: Record<
    string,
    { chainId: Hex; nativeCurrency: string }
  >,
) => {
  const {
    TokenDetectionController,
    TokenRatesController,
    TokenBalancesController,
    NetworkEnablementController,
  } = Engine.context;

  const chainIds = Object.entries(
    NetworkEnablementController.state.enabledNetworkMap[
      KnownCaipNamespace.Eip155
    ] || {},
  )
    .filter(([, isEnabled]) => isEnabled === true)
    .map(([chainId]) => chainId as Hex);

  const actions = [
    TokenDetectionController.detectTokens({
      chainIds,
    }),
    TokenBalancesController.updateBalances({
      chainIds,
    }),
    TokenRatesController.updateExchangeRates(
      chainIds
        .filter((chainId) => {
          const config = evmNetworkConfigurationsByChainId[chainId];
          return config?.chainId && config?.nativeCurrency;
        })
        .map((c) => evmNetworkConfigurationsByChainId[c]),
    ),
  ];

  try {
    await withTimeout(
      Promise.allSettled(actions),
      REFRESH_TIMEOUT_MS,
      'performEvmTokenRefresh',
    );
  } catch (error) {
    Logger.error(error as Error, 'Error while refreshing tokens');
  }
};

/**
 * Refreshes both token data AND account balance/currency rates.
 * Use this for full refresh that includes native balance.
 */
export const performEvmRefresh = async (
  evmNetworkConfigurationsByChainId: Record<
    string,
    { chainId: Hex; nativeCurrency: string }
  >,
  nativeCurrencies: string[],
) => {
  const {
    AccountTrackerController,
    CurrencyRateController,
    NetworkController,
    NetworkEnablementController,
  } = Engine.context;

  const networkConfigurations =
    NetworkController.state.networkConfigurationsByChainId;

  const chainIds = Object.entries(
    NetworkEnablementController.state.enabledNetworkMap[
      KnownCaipNamespace.Eip155
    ] || {},
  )
    .filter(([, isEnabled]) => isEnabled === true)
    .map(([chainId]) => chainId as Hex);

  const networkClientIds = chainIds
    .map((c) => {
      const config = networkConfigurations[c];
      if (!config) {
        return undefined;
      }

      return config?.rpcEndpoints?.[config?.defaultRpcEndpointIndex]
        ?.networkClientId;
    })
    .filter((c: string | undefined): c is string => Boolean(c));

  await Promise.all([
    performEvmTokenRefresh(evmNetworkConfigurationsByChainId),
    AccountTrackerController.refresh(networkClientIds),
    CurrencyRateController.updateExchangeRate(nativeCurrencies),
  ]).catch((error) => {
    Logger.error(error, 'Error while refreshing tokens');
  });
};
