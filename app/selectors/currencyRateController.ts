import { createSelector, weakMapMemoize } from 'reselect';
import { CurrencyRateState } from '@metamask/assets-controllers';
import { RootState } from '../reducers';
import {
  selectEvmChainId,
  selectNativeCurrencyByChainId,
  selectEvmTicker,
  selectNetworkConfigurationByChainId,
} from './networkController';
import { isTestNet } from '../../app/util/networks';
import { createDeepEqualSelector } from './util';
import { Hex } from '@metamask/utils';

// TODO Unified Assets Controller State Access (1)
// CurrencyRateController: currencyRates, currentCurrency
// References
// app/selectors/currencyRateController.ts (6)
const selectCurrencyRateControllerState = (state: RootState) =>
  state?.engine?.backgroundState?.CurrencyRateController;

// TODO Unified Assets Controller State Access (1)
// CurrencyRateController: currencyRates
// References
// app/selectors/multichain/evm.ts (2)
// app/core/GasPolling/GasPolling.ts (1)
// app/components/Views/Asset/index.js (1)
// app/components/UI/Earn/Views/EarnWithdrawInputView/EarnWithdrawInputView.tsx (1)
// app/components/UI/Earn/Views/EarnInputView/EarnInputView.tsx (1)
// app/components/UI/Swaps/index.js (1)
// app/components/UI/Swaps/components/TokenSelectModal.js (1)
// app/components/UI/Swaps/components/GasEditModal.js (1)
// app/components/UI/Swaps/QuotesView.js (1)
// app/components/UI/Ramp/Aggregator/hooks/useBalance.ts (1)
// app/components/Views/TransactionsView/index.js (1)
// app/components/Views/NftDetails/NftDetails.tsx (1)
// app/components/UI/PaymentRequest/index.js (1)
// app/components/UI/Notification/TransactionNotification/index.js (1)
// app/components/UI/AccountInfoCard/index.js (1)
// app/components/Views/GasEducationCarousel/index.js (1)
// app/components/UI/Swaps/components/QuotesModal.js (1)
export const selectConversionRate = createSelector(
  selectCurrencyRateControllerState,
  selectEvmChainId,
  selectEvmTicker,
  (state: RootState) => state.settings.showFiatOnTestnets,
  (
    currencyRateControllerState: CurrencyRateState,
    chainId: string,
    ticker: string,
    showFiatOnTestnets,
  ) => {
    if (chainId && isTestNet(chainId) && !showFiatOnTestnets) {
      return undefined;
    }
    return ticker
      ? currencyRateControllerState?.currencyRates?.[ticker]?.conversionRate
      : undefined;
  },
);

// TODO Unified Assets Controller State Access (1)
// CurrencyRateController: currencyRates
// References
// app/selectors/currencyRateController.ts (3)
// app/selectors/assets/assets-list.ts (1)
// app/selectors/earnController/earn/index.ts (1)
// app/selectors/multichain/evm.ts (2)
// app/selectors/assets/balances.ts (1)
// app/components/UI/Bridge/hooks/useUnifiedSwapBridgeContext/index.ts (1)
// app/components/UI/AssetOverview/AssetOverview.tsx (1)
// app/components/Views/confirmations/hooks/useTokenAmount.ts (1)
// app/components/Views/confirmations/hooks/tokens/useTokenFiatRates.ts (1)
// app/components/UI/Bridge/hooks/useTokensWithBalance/index.ts (1)
// app/components/UI/Bridge/components/TokenInputArea/index.tsx (1)
// app/components/UI/Stake/hooks/useBalance.ts (1)
// app/components/hooks/useGetTotalFiatBalanceCrossChains.tsx (1)
// app/components/UI/Earn/components/Earnings/EarningsHistory/EarningsHistory.tsx (1)
// app/components/hooks/useGetFormattedTokensPerChain.tsx (1)
// app/components/Views/DetectedTokens/components/Token.tsx (1)
export const selectCurrencyRates = createDeepEqualSelector(
  selectCurrencyRateControllerState,
  (currencyRateControllerState: CurrencyRateState) =>
    currencyRateControllerState?.currencyRates,
);

export const selectCurrencyRateForChainId = createSelector(
  [
    selectCurrencyRates,
    (_state: RootState, chainId: Hex) => chainId,
    (state: RootState, chainId: Hex) =>
      selectNetworkConfigurationByChainId(state, chainId),
  ],
  (currencyRates, _chainId, networkConfig): number =>
    (networkConfig?.nativeCurrency &&
      currencyRates?.[networkConfig.nativeCurrency]?.conversionRate) ||
    0,
  {
    memoize: weakMapMemoize,
    argsMemoize: weakMapMemoize,
  },
);

// TODO Unified Assets Controller State Access (1)
// CurrencyRateController: currentCurrency
// References
// app/selectors/currencyRateController.ts (1)
// app/selectors/tokenSearchDiscoveryDataController.ts (1)
// app/selectors/assets/assets-list.ts (1)
// app/selectors/earnController/earn/index.ts (1)
// app/selectors/multichain/evm.ts (3)
// app/selectors/assets/balances.ts (1)
// app/core/GasPolling/GasPolling.ts (1)
// app/components/Views/confirmations/legacy/SendFlow/Amount/index.js (1)
// app/components/Views/confirmations/components/gas/gas-fee-token-list-item/gas-fee-token-list-item.tsx (1)
// app/components/Views/AssetDetails/index.tsx (1)
// app/components/Views/Asset/index.js (1)
// app/components/UI/Tokens/TokenSortBottomSheet/TokenSortBottomSheet.tsx (1)
// app/components/UI/AssetOverview/AssetOverview.tsx (1)
// app/components/UI/Transactions/index.js (1)
// app/components/UI/Earn/hooks/useInput.ts (1)
// app/components/UI/Bridge/components/BridgeSourceNetworkSelector/index.tsx (1)
// app/components/UI/UrlAutocomplete/index.tsx (1)
// app/components/UI/Swaps/index.js (1)
// app/components/UI/Swaps/components/TokenSelectModal.js (1)
// app/components/UI/Swaps/components/GasEditModal.js (1)
// app/components/UI/Swaps/QuotesView.js (1)
// app/components/UI/Ramp/Aggregator/hooks/useBalance.ts (1)
// app/components/UI/Earn/hooks/useEarnTokens.ts (1)
// app/components/UI/Card/hooks/useAssetBalances.tsx (1)
// app/components/UI/Bridge/components/TokenInsightsSheet/TokenInsightsSheet.tsx (1)
// app/components/UI/AccountOverview/index.js (1)
// app/components/hooks/useMultichainBalances/useSelectedAccountMultichainBalances.ts (1)
// app/components/Views/confirmations/legacy/components/TransactionReview/index.js (1)
// app/components/Views/confirmations/legacy/components/TransactionReview/TransactionReviewInformation/index.js (1)
// app/components/Views/confirmations/legacy/SendFlow/Confirm/index.js (1)
// app/components/Views/confirmations/legacy/ApproveView/Approve/index.js (1)
// app/components/Views/confirmations/legacy/Approve/index.js (1)
// app/components/Views/confirmations/hooks/tokens/useTokenFiatRates.ts (1)
// app/components/Views/confirmations/hooks/send/useCurrencyConversions.ts (1)
// app/components/Views/confirmations/hooks/send/useAccountTokens.ts (1)
// app/components/Views/confirmations/components/transactions/custom-amount/custom-amount.tsx (1)
// app/components/Views/UnifiedTransactionsView/UnifiedTransactionsView.tsx (1)
// app/components/Views/TransactionsView/index.js (1)
// app/components/Views/NftDetails/NftDetails.tsx (1)
// app/components/UI/TransactionElement/TransactionDetails/index.js (1)
// app/components/UI/PaymentRequest/index.js (1)
// app/components/UI/Notification/TransactionNotification/index.js (1)
// app/components/UI/Earn/Views/EarnLendingDepositConfirmationView/index.tsx (1)
// app/components/UI/Bridge/hooks/useTokensWithBalance/index.ts (1)
// app/components/UI/Bridge/components/TokenInputArea/index.tsx (1)
// app/components/UI/AssetOverview/TokenDetails/TokenDetails.tsx (1)
// app/components/UI/AccountInfoCard/index.js (1)
// app/components/Views/confirmations/legacy/Approval/components/TransactionEditor/index.js (1)
// app/components/Views/confirmations/hooks/useAccountInfo.ts (1)
// app/components/Views/Settings/GeneralSettings/index.js (1)
// app/components/Views/MultichainAccounts/WalletDetails/hooks/useWalletBalances.ts (1)
// app/components/Views/GasEducationCarousel/index.js (1)
// app/components/UI/SimulationDetails/useBalanceChanges.ts (1)
// app/component-library/components-temp/Price/AggregatedPercentage/AggregatedPercentageCrossChains.tsx (1)
// app/components/UI/UrlAutocomplete/Result.tsx (1)
// app/components/Views/confirmations/hooks/useEthFiatAmount.tsx (1)
// app/components/UI/SimulationDetails/FiatDisplay/useFiatFormatter.ts (1)
// app/components/UI/Stake/hooks/useBalance.ts (1)
// app/components/hooks/useGetTotalFiatBalanceCrossChains.tsx (1)
// app/component-library/components-temp/Price/AggregatedPercentage/NonEvmAggregatedPercentage.tsx (1)
// app/components/Views/confirmations/legacy/components/TransactionReview/TransactionReviewData/index.js (1)
// app/components/UI/Swaps/components/QuotesModal.js (1)
// app/components/UI/Earn/hooks/useEarnToken.ts (1)
// app/components/UI/Earn/components/Earnings/EarningsHistory/EarningsHistory.tsx (1)
// app/components/hooks/useGetFormattedTokensPerChain.tsx (1)
// app/components/Snaps/SnapUIAssetSelector/useSnapAssetDisplay.tsx (1)
// app/components/UI/Bridge/hooks/useBridgeExchangeRates/index.ts (1)
// app/components/Views/DetectedTokens/components/Token.tsx (1)
// app/component-library/components-temp/Price/AggregatedPercentage/AggregatedPercentage.tsx (1)
export const selectCurrentCurrency = createDeepEqualSelector(
  selectCurrencyRateControllerState,
  (currencyRateControllerState: CurrencyRateState) =>
    currencyRateControllerState?.currentCurrency,
);

// TODO Unified Assets Controller State Access (1)
// CurrencyRateController: currencyRates
// References
// app/components/UI/Perps/hooks/usePerpsPortfolioBalance.ts (1)
export const selectConversionRateBySymbol = createSelector(
  selectCurrencyRateControllerState,
  (_: RootState, symbol: string) => symbol,
  (currencyRateControllerState: CurrencyRateState, symbol: string) =>
    symbol
      ? currencyRateControllerState?.currencyRates?.[symbol]?.conversionRate ||
        0
      : 0,
);

// TODO Unified Assets Controller State Access (1)
// CurrencyRateController: currencyRates
// References
// app/selectors/currencyRateController.ts (1)
export const selectConversionRateFoAllChains = createSelector(
  selectCurrencyRateControllerState,
  (currencyRateControllerState: CurrencyRateState) =>
    currencyRateControllerState?.currencyRates,
);

export const selectConversionRateByChainId = createSelector(
  selectConversionRateFoAllChains,
  (_state: RootState, chainId: string) => chainId,
  (state: RootState) => state.settings.showFiatOnTestnets,
  selectNativeCurrencyByChainId,
  (_state: RootState, _chainId: string, skipTestNetCheck?: boolean) =>
    skipTestNetCheck,
  (
    currencyRates: CurrencyRateState['currencyRates'],
    chainId,
    showFiatOnTestnets,
    nativeCurrency,
    skipTestNetCheck = false,
  ) => {
    if (isTestNet(chainId) && !showFiatOnTestnets && !skipTestNetCheck) {
      return undefined;
    }

    return currencyRates?.[nativeCurrency]?.conversionRate;
  },
);

export const selectUsdConversionRate = createSelector(
  selectCurrencyRates,
  selectCurrentCurrency,
  (currencyRates, currentCurrency) =>
    currencyRates?.[currentCurrency]?.usdConversionRate,
);

export const selectUSDConversionRateByChainId = createSelector(
  [
    selectCurrencyRates,
    (_state: RootState, chainId: string) => chainId,
    (state: RootState, chainId: string) =>
      selectNetworkConfigurationByChainId(state, chainId),
  ],
  (currencyRates, _chainId, networkConfiguration) => {
    if (!networkConfiguration) {
      return undefined;
    }
    const { nativeCurrency } = networkConfiguration;
    return currencyRates?.[nativeCurrency]?.usdConversionRate;
  },
);
