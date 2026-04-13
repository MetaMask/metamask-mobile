import { useSelector } from 'react-redux';
import {
  selectBridgeControllerState,
  selectBridgeQuotes,
  selectSourceToken,
} from '../../../../../core/redux/slices/bridge';
import { useEffect, useMemo } from 'react';
import Engine from '../../../../../core/Engine';
import {
  getQuotesReceivedProperties,
  isNonEvmChainId,
  QuoteWarning,
  UnifiedSwapBridgeEventName,
} from '@metamask/bridge-controller';
import { Hex, isCaipChainId } from '@metamask/utils';
import { selectCurrencyRates } from '../../../../../selectors/currencyRateController';
import { selectTokenMarketData } from '../../../../../selectors/tokenRatesController';
import { selectNetworkConfigurations } from '../../../../../selectors/networkController';
import {
  selectMultichainAssetsRates,
  selectMultichainBalances,
} from '../../../../../selectors/multichain';
import { selectSelectedInternalAccountAddress } from '../../../../../selectors/accountsController';
import { selectSelectedInternalAccountByScope } from '../../../../../selectors/multichainAccounts/accounts';
import { selectTokensBalances } from '../../../../../selectors/tokenBalancesController';
import { fromTokenMinimalUnitString } from '../../../../../util/number';
import {
  calcTokenFiatValue,
  calcUsdAmountFromFiat,
} from '../../utils/exchange-rates';

/**
 * Hook for publishing the QuotesReceived event.
 * Location is automatically injected by the bridge controller via setLocation().
 */
export const useBridgeQuoteEvents = ({
  hasInsufficientBalance,
  hasNoQuotesAvailable,
  hasInsufficientGas,
  hasTxAlert,
  isSubmitDisabled,
  isPriceImpactWarningVisible,
}: {
  hasInsufficientBalance: boolean;
  hasNoQuotesAvailable: boolean;
  hasInsufficientGas: boolean;
  hasTxAlert: boolean;
  isSubmitDisabled: boolean;
  isPriceImpactWarningVisible: boolean;
}) => {
  const { quoteFetchError, quotesRefreshCount } = useSelector(
    selectBridgeControllerState,
  );
  const { activeQuote, recommendedQuote, isLoading } =
    useSelector(selectBridgeQuotes);

  const sourceToken = useSelector(selectSourceToken);
  const evmMultiChainMarketData = useSelector(selectTokenMarketData);
  const evmMultiChainCurrencyRates = useSelector(selectCurrencyRates);
  const networkConfigurationsByChainId = useSelector(
    selectNetworkConfigurations,
  );
  const nonEvmMultichainAssetRates = useSelector(selectMultichainAssetsRates);

  const getAccountByScope = useSelector(selectSelectedInternalAccountByScope);
  const selectedAccountAddress = useSelector(
    selectSelectedInternalAccountAddress,
  );
  const tokenBalances = useSelector(selectTokensBalances);
  const multichainBalances = useSelector(selectMultichainBalances);

  const resolvedBalance = useMemo(() => {
    if (!sourceToken) return undefined;

    if (
      isCaipChainId(sourceToken.chainId) &&
      isNonEvmChainId(sourceToken.chainId)
    ) {
      const scopedAccount = getAccountByScope(sourceToken.chainId);
      if (!scopedAccount) return undefined;
      return multichainBalances?.[scopedAccount.id]?.[sourceToken.address]
        ?.amount;
    }

    const hexBalance =
      tokenBalances?.[selectedAccountAddress as Hex]?.[
        sourceToken.chainId as Hex
      ]?.[sourceToken.address as Hex];
    if (!hexBalance) return undefined;
    try {
      return fromTokenMinimalUnitString(hexBalance, sourceToken.decimals);
    } catch {
      return undefined;
    }
  }, [
    sourceToken,
    tokenBalances,
    selectedAccountAddress,
    multichainBalances,
    getAccountByScope,
  ]);

  const fromTokenBalanceInUsd = useMemo(() => {
    const balanceFiat = calcTokenFiatValue({
      token: sourceToken ?? undefined,
      amount: resolvedBalance,
      evmMultiChainMarketData,
      networkConfigurationsByChainId,
      evmMultiChainCurrencyRates,
      nonEvmMultichainAssetRates,
    });
    if (!balanceFiat) return undefined;
    return calcUsdAmountFromFiat({
      tokenFiatValue: balanceFiat,
      chainId: sourceToken?.chainId,
      networkConfigurationsByChainId,
      evmMultiChainCurrencyRates,
    });
  }, [
    resolvedBalance,
    sourceToken,
    evmMultiChainMarketData,
    networkConfigurationsByChainId,
    evmMultiChainCurrencyRates,
    nonEvmMultichainAssetRates,
  ]);

  const warnings = useMemo(() => {
    const latestWarnings: QuoteWarning[] = [];

    hasNoQuotesAvailable && latestWarnings.push('no_quotes');
    hasInsufficientGas &&
      latestWarnings.push('insufficient_gas_for_selected_quote');
    hasInsufficientBalance && latestWarnings.push('insufficient_balance');
    hasTxAlert && latestWarnings.push('tx_alert');
    isPriceImpactWarningVisible && latestWarnings.push('price_impact');

    return latestWarnings;
  }, [
    hasNoQuotesAvailable,
    hasInsufficientGas,
    hasInsufficientBalance,
    hasTxAlert,
    isPriceImpactWarningVisible,
  ]);

  // Emit QuotesReceived event each time quotes are fetched successfully
  useEffect(() => {
    if (!isLoading && quotesRefreshCount > 0 && !quoteFetchError) {
      Engine.context.BridgeController.trackUnifiedSwapBridgeEvent(
        UnifiedSwapBridgeEventName.QuotesReceived,
        getQuotesReceivedProperties(
          activeQuote,
          warnings,
          !isSubmitDisabled,
          recommendedQuote,
          fromTokenBalanceInUsd,
        ),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quotesRefreshCount]);
};
