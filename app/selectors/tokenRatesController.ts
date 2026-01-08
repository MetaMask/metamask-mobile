/* eslint-disable import/prefer-default-export */
import { createSelector, weakMapMemoize } from 'reselect';
import { TokenRatesControllerState } from '@metamask/assets-controllers';
import { RootState } from '../reducers';
import { selectEvmChainId } from './networkController';
import { Hex } from '@metamask/utils';
import { createDeepEqualSelector } from './util';

/**
 * utility similar to lodash.mapValues.
 * provides a clean abstraction for us to reconfigure this large marketData object
 * @param obj - object to reconfigure
 * @param fn - callback to configure each entry in this object
 * @returns - newly reconfigured object
 */
const mapValues = <K extends string, T, U>(
  obj: Record<K, T>,
  fn: (value: T) => U,
): Record<K, U> =>
  Object.fromEntries(
    Object.entries(obj ?? {}).map(([key, value]) => [key, fn(value as T)]),
  ) as Record<K, U>;

// TODO Unified Assets Controller State Access (1)
// TokenRatesController: marketData
// References
// app/selectors/tokenRatesController.ts (3)
const selectTokenRatesControllerState = (state: RootState) =>
  state.engine.backgroundState.TokenRatesController;

// TODO Unified Assets Controller State Access (1)
// TokenRatesController: marketData
// References
// app/components/UI/Swaps/index.js (1)
// app/components/UI/Swaps/components/TokenSelectModal.js (1)
// app/components/UI/Ramp/Aggregator/hooks/useBalance.ts (1)
// app/core/GasPolling/GasPolling.ts (1)
// app/components/UI/PaymentRequest/index.js (1)
// app/components/UI/Notification/TransactionNotification/index.js (1)
export const selectContractExchangeRates = createSelector(
  selectEvmChainId,
  selectTokenRatesControllerState,
  (chainId: Hex, tokenRatesControllerState: TokenRatesControllerState) =>
    tokenRatesControllerState.marketData[chainId],
);

// TODO Unified Assets Controller State Access (1)
// TokenRatesController: marketData
// References
// app/components/Views/confirmations/hooks/useTokenAmount.ts (1)
// app/components/Views/confirmations/hooks/send/useCurrencyConversions.ts (1)
export const selectContractExchangeRatesByChainId = createSelector(
  selectTokenRatesControllerState,
  (_state: RootState, chainId: Hex) => chainId,
  (tokenRatesControllerState: TokenRatesControllerState, chainId: Hex) =>
    tokenRatesControllerState.marketData[chainId],
);

// TODO Unified Assets Controller State Access (1)
// TokenRatesController: marketData
// References
// app/selectors/tokenRatesController.ts (4)
// app/selectors/earnController/earn/index.ts (1)
// app/selectors/multichain/evm.ts (2)
// app/selectors/assets/balances.ts (1)
// app/components/UI/Tokens/hooks/useTokenPricePercentageChange.ts (1)
// app/components/UI/Bridge/hooks/useUnifiedSwapBridgeContext/index.ts (1)
// app/components/UI/AssetOverview/AssetOverview.tsx (1)
// app/components/Views/confirmations/hooks/tokens/useTokenFiatRates.ts (1)
// app/components/UI/Bridge/hooks/useTokensWithBalance/index.ts (1)
// app/components/UI/Bridge/components/TokenInputArea/index.tsx (1)
// app/component-library/components-temp/Price/AggregatedPercentage/AggregatedPercentageCrossChains.tsx (1)
// app/components/UI/Earn/components/Earnings/EarningsHistory/EarningsHistory.tsx (1)
// app/components/UI/Bridge/hooks/useBridgeExchangeRates/index.ts (1)
// app/components/Views/DetectedTokens/components/Token.tsx (1)
export const selectTokenMarketData = createSelector(
  selectTokenRatesControllerState,
  (tokenRatesControllerState: TokenRatesControllerState) =>
    tokenRatesControllerState.marketData,
);

// TODO Unified Assets Controller State Access (2)
// Uses: selectTokenMarketData
// References
// app/components/UI/AssetOverview/Balance/Balance.tsx (1)
export function selectPricePercentChange1d(
  state: RootState,
  chainId: Hex,
  tokenAddress: Hex,
) {
  const marketData = selectTokenMarketData(state);
  const pricePercentage1d: number | undefined =
    marketData?.[chainId]?.[tokenAddress]?.pricePercentChange1d;
  return pricePercentage1d;
}

// TODO Unified Assets Controller State Access (2)
// Uses: selectTokenMarketData
// References
// app/components/UI/Earn/hooks/useEarnings.ts (1)
export const selectSingleTokenPriceMarketData = createSelector(
  [
    (state: RootState, chainId: Hex, tokenAddress: Hex) => {
      const marketData = selectTokenMarketData(state);
      const price = marketData?.[chainId]?.[tokenAddress]?.price;
      return price;
    },
    (_state: RootState, chainId: Hex) => chainId,
    (_state: RootState, _chainId: Hex, tokenAddress: Hex) => tokenAddress,
  ],
  (price, _chainId, address) => (price ? { [address]: { price } } : {}),
  {
    memoize: weakMapMemoize,
    argsMemoize: weakMapMemoize,
  },
);

// TODO Unified Assets Controller State Access (2)
// Uses: selectTokenMarketData
// References
// app/components/hooks/useGetFormattedTokensPerChain.tsx (1)
export const selectTokenMarketPriceData = createDeepEqualSelector(
  [selectTokenMarketData],
  (marketData) => {
    const marketPriceData = mapValues(marketData, (tokenData) =>
      mapValues(tokenData, (tokenInfo) => ({ price: tokenInfo?.price })),
    );

    return marketPriceData;
  },
);

// TODO Unified Assets Controller State Access (2)
// Uses: selectTokenMarketData
// References
// app/components/Views/AssetDetails/index.tsx (1)
export const selectTokenMarketDataByChainId = createSelector(
  [selectTokenMarketData, (_state: RootState, chainId: Hex) => chainId],
  (marketData, chainId) => marketData?.[chainId] || {},
);
