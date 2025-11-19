import { Hex, KnownCaipNamespace } from '@metamask/utils';
import Engine from '../../../../core/Engine';
import Logger from '../../../../util/Logger';
import { AccountSyncTracker } from '../../../../util/performance/AccountSyncTracker';

export const performEvmRefresh = async (
  evmNetworkConfigurationsByChainId: Record<
    string,
    { chainId: Hex; nativeCurrency: string }
  >,
  nativeCurrencies: string[],
) => {
  const refreshStartTime = performance.now();
  
  const {
    TokenDetectionController,
    AccountTrackerController,
    CurrencyRateController,
    TokenRatesController,
    TokenBalancesController,
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

  // Capture initial state counts for data measurement
  const initialTokensCount = Object.keys(TokenDetectionController.state.allTokens || {}).reduce(
    (sum, chainId) => sum + Object.keys(TokenDetectionController.state.allTokens[chainId] || {}).length,
    0
  );
  const initialAccountsCount = Object.keys(AccountTrackerController.state.accounts || {}).length;
  
  // Use centralized tracker instead of console.log
  AccountSyncTracker.startPhase('tokenRefresh', {
    chainCount: chainIds.length,
    networkClientCount: networkClientIds.length,
    chainIds: chainIds.join(', '),
    initialTokensCount,
    initialAccountsCount
  });

  // Measure each controller operation individually with data tracking
  AccountSyncTracker.startController('TokenDetection', { chainCount: chainIds.length });
  const tokenDetectionPromise = TokenDetectionController.detectTokens({
    chainIds,
  }).then(() => {
    const finalTokensCount = Object.keys(TokenDetectionController.state.allTokens || {}).reduce(
      (sum, chainId) => sum + Object.keys(TokenDetectionController.state.allTokens[chainId] || {}).length,
      0
    );
    const tokensDetected = finalTokensCount - initialTokensCount;
    AccountSyncTracker.endController('TokenDetection', {
      tokensDetected,
      totalTokens: finalTokensCount
    });
  });

  AccountSyncTracker.startController('TokenBalances', { chainCount: chainIds.length });
  const tokenBalancesPromise = TokenBalancesController.updateBalances({
    chainIds,
  }).then(() => {
    const balancesCount = Object.keys(TokenBalancesController.state.contractBalances || {}).length;
    AccountSyncTracker.endController('TokenBalances', {
      balancesUpdated: balancesCount
    });
  });

  AccountSyncTracker.startController('AccountTracker', { networkClientCount: networkClientIds.length });
  const accountTrackerPromise = AccountTrackerController.refresh(networkClientIds).then(() => {
    const accountsTracked = Object.keys(AccountTrackerController.state.accounts || {}).length;
    AccountSyncTracker.endController('AccountTracker', {
      accountsTracked
    });
  });

  AccountSyncTracker.startController('CurrencyRate', { currenciesCount: nativeCurrencies.length });
  const currencyRatePromise = CurrencyRateController.updateExchangeRate(nativeCurrencies).then(() => {
    AccountSyncTracker.endController('CurrencyRate', {
      currenciesUpdated: nativeCurrencies.length
    });
  });

  AccountSyncTracker.startController('TokenRates', { chainCount: chainIds.length });
  const tokenRatesPromise = TokenRatesController.updateExchangeRatesByChainId(
    chainIds
      .filter((chainId) => {
        const config = evmNetworkConfigurationsByChainId[chainId];
        return config?.chainId && config?.nativeCurrency;
      })
      .map((c) => evmNetworkConfigurationsByChainId[c]),
  ).then(() => {
    const tokenRatesCount = Object.keys(TokenRatesController.state.marketData || {}).length;
    AccountSyncTracker.endController('TokenRates', {
      tokenRatesUpdated: tokenRatesCount
    });
  });

  const actions = [
    tokenDetectionPromise,
    tokenBalancesPromise,
    accountTrackerPromise,
    currencyRatePromise,
    tokenRatesPromise,
  ];

  await Promise.all(actions).catch((error) => {
    Logger.error(error, 'Error while refreshing tokens');
  });

  // Use centralized tracker instead of console.log
  AccountSyncTracker.endPhase('tokenRefresh', {
    chainCount: chainIds.length
  });
};
