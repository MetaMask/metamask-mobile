import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useSelector } from 'react-redux';
import { debounce } from 'lodash';
import BigNumber from 'bignumber.js';
import {
  FeatureId,
  formatAddressToAssetId,
  isNativeAddress,
  sumAmounts,
} from '@metamask/bridge-controller';
import type { BigNumber as EthersBigNumber } from 'ethers';
import type { CaipAssetType } from '@metamask/utils';

import Engine from '../../../../../core/Engine';
import { selectBatchSellTrades } from '../../../../../core/redux/slices/bridge';
import { selectCurrentCurrency } from '../../../../../selectors/currencyRateController';
import { selectShouldUseSmartTransaction } from '../../../../../selectors/smartTransactionsController';
import formatFiat from '../../../../../util/formatFiat';
import Logger from '../../../../../util/Logger';
import { getMaybeHexChainId } from '../../../../../util/bridge';
import type { RootState } from '../../../../../reducers';
import { formatTokenBalance } from '../../utils';
import { getBatchSellSlippage } from '../../components/SlippageModal/utils';
import { getSecurityWarnings } from '../../utils/tokenSecurityUtils';
import type { BridgeToken } from '../../types';
import { BRIDGE_QUOTES_DEBOUNCE_MS, useBridgeQuotes } from '../useBridgeQuotes';

const UNKNOWN_DESTINATION_TOKEN_SYMBOL = 'UNKNOWN';
const QUOTE_DETAILS_PLACEHOLDER_AMOUNT = '--';
const BATCH_SELL_TRADES_REQUEST_KEY_SEPARATOR = '|';

export const getBatchSellSourceTokenAmount = (
  token: BridgeToken,
  percent: number,
) => {
  if (percent <= 0) return '0';
  if (!token.balance) return undefined;

  const sourceAmount = new BigNumber(token.balance).times(percent).div(100);

  if (!sourceAmount.isFinite()) return undefined;

  return sourceAmount.toFixed();
};

export const getBatchSellAtomicSourceAmount = (
  token: BridgeToken,
  sourceAmount: string | undefined,
) => {
  if (!sourceAmount) return undefined;

  const atomicAmount = new BigNumber(sourceAmount)
    .times(new BigNumber(10).pow(token.decimals))
    .integerValue(BigNumber.ROUND_DOWN);

  if (!atomicAmount.isFinite() || atomicAmount.lte(0)) return undefined;

  return atomicAmount.toFixed(0);
};

export const hasValidBatchSellSourceAmounts = (
  sourceTokens: BridgeToken[],
  batchSellSourceTokenAmounts: Record<string, string | undefined>,
  destToken: BridgeToken | undefined,
) => {
  if (!destToken) return false;

  return sourceTokens.some((token) => {
    const assetId = formatAddressToAssetId(token.address, token.chainId);

    if (!assetId) return false;

    return (
      getBatchSellAtomicSourceAmount(
        token,
        batchSellSourceTokenAmounts[assetId],
      ) !== undefined
    );
  });
};

const getBatchSellUsdAmountSource = (
  token: BridgeToken,
  sourceAmount: string,
) => {
  const balance = token.balance ? Number(token.balance) : 0;
  const numericSourceAmount = Number(sourceAmount);

  if (!Number.isFinite(numericSourceAmount) || balance <= 0) return 0;

  return ((token.tokenFiatAmount ?? 0) * numericSourceAmount) / balance;
};

const formatTokenAmountWithSymbol = (
  amount: string | undefined,
  symbol: string | undefined,
) => {
  const tokenSymbol = symbol ? ` ${symbol}` : '';

  if (amount === undefined)
    return `${QUOTE_DETAILS_PLACEHOLDER_AMOUNT}${tokenSymbol}`;

  return `${formatTokenBalance(amount)}${tokenSymbol}`;
};

const formatQuoteDisplayValue = ({
  amount,
  valueInCurrency,
  symbol,
  currency,
}: {
  amount: string | undefined;
  valueInCurrency: string | null | undefined;
  symbol: string | undefined;
  currency: string;
}) => {
  const hasTokenAmount = amount !== undefined;
  const hasNonZeroTokenAmount = hasTokenAmount && new BigNumber(amount).gt(0);
  const hasMissingDisplayValue =
    !valueInCurrency ||
    (new BigNumber(valueInCurrency).isZero() && hasNonZeroTokenAmount);

  if (hasMissingDisplayValue && hasTokenAmount) {
    return formatTokenAmountWithSymbol(amount, symbol);
  }

  if (!valueInCurrency) return '-';

  return formatFiat(new BigNumber(valueInCurrency), currency);
};

const formatCurrencyDisplayValue = (
  valueInCurrency: string | null | undefined,
  currency: string,
) => {
  if (!valueInCurrency) return '-';

  return formatFiat(new BigNumber(valueInCurrency), currency);
};

const getBatchSellTradesRequestKey = (
  recommendedQuotes: NonNullable<
    ReturnType<typeof useBridgeQuotes>['recommendedQuote']
  >[],
) =>
  recommendedQuotes
    .map((quote) => quote.quoteId ?? quote.quote.requestId ?? '')
    .join(BATCH_SELL_TRADES_REQUEST_KEY_SEPARATOR);

const getBatchSellMetamaskFeePercent = (
  recommendedQuotes: NonNullable<
    ReturnType<typeof useBridgeQuotes>['recommendedQuote']
  >[],
) => {
  const quoteBpsFee = recommendedQuotes
    .map((recommendedQuote) => {
      const fee = recommendedQuote.quote.feeData?.metabridge?.[0]?.quoteBpsFee;

      return fee as number | string | null | undefined;
    })
    .find((fee): fee is number | string => fee !== undefined && fee !== null);
  const parsedQuoteBpsFee =
    quoteBpsFee === undefined ? undefined : new BigNumber(quoteBpsFee);

  if (!parsedQuoteBpsFee?.isFinite() || parsedQuoteBpsFee.lte(0))
    return undefined;

  return parsedQuoteBpsFee.div(100).toString();
};

export const buildBatchSellQuoteRows = ({
  sourceTokens,
  destToken,
  sourceTokenAmounts,
  slippages,
  walletAddress,
  smartTransactionsEnabled,
  latestSourceAtomicBalances,
}: {
  sourceTokens: BridgeToken[];
  destToken?: BridgeToken;
  sourceTokenAmounts: Partial<Record<CaipAssetType, string | undefined>>;
  slippages: Partial<Record<CaipAssetType, string | undefined>>;
  walletAddress?: string;
  smartTransactionsEnabled: boolean;
  latestSourceAtomicBalances?: Partial<
    Record<CaipAssetType, EthersBigNumber | undefined>
  >;
}) => {
  if (!destToken || !walletAddress) return [];

  const securityWarnings = getSecurityWarnings(destToken);
  const rows = sourceTokens.reduce<
    {
      assetId: CaipAssetType;
      config: Parameters<typeof useBridgeQuotes>[0]['config'];
    }[]
  >((quoteRows, sourceToken) => {
    const assetId = formatAddressToAssetId(
      sourceToken.address,
      sourceToken.chainId,
    );
    const sourceAmount = assetId ? sourceTokenAmounts[assetId] : undefined;
    const srcTokenAmount = getBatchSellAtomicSourceAmount(
      sourceToken,
      sourceAmount,
    );

    if (!assetId || !sourceAmount || !srcTokenAmount) return quoteRows;

    const slippage = getBatchSellSlippage(slippages, assetId);
    const slippageNumber =
      slippage === undefined ? undefined : Number(slippage);

    quoteRows.push({
      assetId,
      config: {
        sourceToken,
        destToken,
        srcTokenAmount: sourceAmount,
        slippage:
          slippageNumber === undefined || Number.isNaN(slippageNumber)
            ? undefined
            : slippageNumber,
        walletAddress,
        destWalletAddress: walletAddress,
        quoteRequestIndex: quoteRows.length,
        quoteRequestCount: 1,
        analyticsContext: {
          stx_enabled: smartTransactionsEnabled,
          token_symbol_source: sourceToken.symbol,
          token_symbol_destination: destToken.symbol,
          token_security_type_destination: destToken.securityData?.type ?? null,
          security_warnings: securityWarnings,
          usd_amount_source: getBatchSellUsdAmountSource(
            sourceToken,
            sourceAmount,
          ),
          feature_id: FeatureId.BATCH_SELL,
        },
        ...(latestSourceAtomicBalances && assetId in latestSourceAtomicBalances
          ? {
              latestSourceAtomicBalance: latestSourceAtomicBalances[assetId],
            }
          : {}),
      },
    });

    return quoteRows;
  }, []);

  return rows.map((row) => ({
    ...row,
    config: {
      ...row.config,
      quoteRequestCount: rows.length,
    },
  }));
};

export const useBatchSellQuotes = ({
  config,
  quotesByAssetId,
  orderedAssetIds,
}: {
  config: {
    sourceTokens: BridgeToken[];
    destToken?: BridgeToken;
    sourceTokenAmounts: Partial<Record<CaipAssetType, string | undefined>>;
    slippages: Partial<Record<CaipAssetType, string | undefined>>;
    walletAddress?: string;
    shouldUpdateBatchSellTrades?: boolean;
    latestSourceAtomicBalances?: Partial<
      Record<CaipAssetType, EthersBigNumber | undefined>
    >;
  };
  quotesByAssetId: Partial<
    Record<CaipAssetType, ReturnType<typeof useBridgeQuotes>>
  >;
  orderedAssetIds: CaipAssetType[];
}) => {
  const {
    sourceTokens,
    destToken,
    sourceTokenAmounts,
    shouldUpdateBatchSellTrades = true,
  } = config;
  const batchSellTrades = useSelector(selectBatchSellTrades);
  const currentCurrency = useSelector(selectCurrentCurrency);
  const batchSellChainId = getMaybeHexChainId(sourceTokens[0]?.chainId);
  const isSmartTransaction = useSelector((state: RootState) =>
    selectShouldUseSmartTransaction(state, batchSellChainId),
  );
  const quotesByAssetIdRef = useRef(quotesByAssetId);
  const orderedAssetIdsRef = useRef(orderedAssetIds);
  quotesByAssetIdRef.current = quotesByAssetId;
  orderedAssetIdsRef.current = orderedAssetIds;

  const destinationTokenSymbol =
    destToken?.symbol ?? UNKNOWN_DESTINATION_TOKEN_SYMBOL;
  const recommendedQuotes = useMemo(
    () =>
      orderedAssetIds
        .map((assetId) => quotesByAssetId[assetId]?.recommendedQuote)
        .filter(
          (
            quote,
          ): quote is NonNullable<
            ReturnType<typeof useBridgeQuotes>['recommendedQuote']
          > => Boolean(quote),
        ),
    [orderedAssetIds, quotesByAssetId],
  );
  const lastBatchSellTradesRequestKey = useRef<string | undefined>(undefined);
  const hasValidSourceAmounts = hasValidBatchSellSourceAmounts(
    sourceTokens,
    sourceTokenAmounts,
    destToken,
  );
  const hasStaleDestinationQuotes = orderedAssetIds.some((assetId) => {
    const row = quotesByAssetId[assetId];

    return Boolean(
      row?.recommendedQuote && !row.isActiveQuoteForCurrentTokenPair,
    );
  });
  const hasAnyQuote = recommendedQuotes.length > 0;
  const isLoading = orderedAssetIds.some(
    (assetId) => quotesByAssetId[assetId]?.isLoading,
  );
  const hasPendingQuoteRows = orderedAssetIds.some((assetId) => {
    const row = quotesByAssetId[assetId];

    return Boolean(
      row && !row.recommendedQuote && (row.isLoading || isLoading),
    );
  });
  const needsNewQuote = orderedAssetIds.some(
    (assetId) => quotesByAssetId[assetId]?.needsNewQuote,
  );
  const canDisplayAggregatedQuoteData =
    hasAnyQuote && !hasStaleDestinationQuotes;
  const isSummaryLoading =
    hasValidSourceAmounts &&
    (!hasAnyQuote || hasStaleDestinationQuotes) &&
    isLoading;
  const totalNetworkFee = batchSellTrades.totalNetworkFee;
  const isBatchSellTradesLoading = Boolean(batchSellTrades.isLoading);
  const isNetworkFeeUnavailable = !isBatchSellTradesLoading && !totalNetworkFee;
  const isGasless =
    hasAnyQuote &&
    Boolean(
      totalNetworkFee?.asset && !isNativeAddress(totalNetworkFee.asset.address),
    );
  const {
    normalizedAmount,
    valueInCurrency,
    minAmountNormalized,
    minAmountValueInCurrency,
  } = sumAmounts(recommendedQuotes.map((quote) => quote.quote.dest)) ?? {};
  const totalReceivedAmount = canDisplayAggregatedQuoteData
    ? normalizedAmount
    : undefined;
  const totalReceivedValueInCurrency = canDisplayAggregatedQuoteData
    ? valueInCurrency
    : undefined;
  const minimumReceivedAmount = canDisplayAggregatedQuoteData
    ? minAmountNormalized
    : undefined;
  const totalNetworkFeeAmount = canDisplayAggregatedQuoteData
    ? totalNetworkFee?.amount
    : undefined;
  const batchSellTradesRequestKey = useMemo(
    () => getBatchSellTradesRequestKey(recommendedQuotes),
    [recommendedQuotes],
  );
  const quotePercentFee = useMemo(
    () => getBatchSellMetamaskFeePercent(recommendedQuotes),
    [recommendedQuotes],
  );

  const updateQuoteParams = useCallback(async () => {
    for (const assetId of orderedAssetIdsRef.current) {
      await quotesByAssetIdRef.current[assetId]?.updateQuoteParams();
    }
  }, []);

  const updateBatchSellQuoteParams = useMemo(
    () => debounce(updateQuoteParams, BRIDGE_QUOTES_DEBOUNCE_MS),
    [updateQuoteParams],
  );

  const getNewQuote = useCallback(() => {
    Engine.context.BridgeController?.resetState?.();
    updateBatchSellQuoteParams();
  }, [updateBatchSellQuoteParams]);

  useEffect(() => {
    if (
      !shouldUpdateBatchSellTrades ||
      !hasAnyQuote ||
      hasPendingQuoteRows ||
      hasStaleDestinationQuotes
    ) {
      return;
    }

    if (lastBatchSellTradesRequestKey.current === batchSellTradesRequestKey) {
      return;
    }

    lastBatchSellTradesRequestKey.current = batchSellTradesRequestKey;

    Engine.context.BridgeController.updateBatchSellTrades(
      recommendedQuotes,
      isSmartTransaction,
    ).catch((error) => {
      Logger.error(error, 'Failed to update Batch Sell trades');
    });
  }, [
    batchSellTradesRequestKey,
    hasAnyQuote,
    hasPendingQuoteRows,
    hasStaleDestinationQuotes,
    isSmartTransaction,
    recommendedQuotes,
    shouldUpdateBatchSellTrades,
  ]);

  useEffect(
    () => () => {
      updateBatchSellQuoteParams.cancel();
    },
    [updateBatchSellQuoteParams],
  );

  return {
    quotesByAssetId,
    updateBatchSellQuoteParams,
    getNewQuote,
    needsNewQuote,
    totalReceived: {
      amount: totalReceivedAmount,
      valueInCurrency: totalReceivedValueInCurrency,
      formatted: formatTokenAmountWithSymbol(
        totalReceivedAmount,
        destinationTokenSymbol,
      ),
      formattedFiat: canDisplayAggregatedQuoteData
        ? formatQuoteDisplayValue({
            amount: totalReceivedAmount,
            valueInCurrency: totalReceivedValueInCurrency,
            symbol: destinationTokenSymbol,
            currency: currentCurrency,
          })
        : '-',
    },
    minimumReceived: {
      amount: minimumReceivedAmount,
      valueInCurrency: canDisplayAggregatedQuoteData
        ? minAmountValueInCurrency
        : undefined,
      formatted: formatTokenAmountWithSymbol(
        minimumReceivedAmount,
        destinationTokenSymbol,
      ),
    },
    networkFee: {
      amount: totalNetworkFeeAmount,
      usd: canDisplayAggregatedQuoteData ? totalNetworkFee?.usd : undefined,
      valueInCurrency: canDisplayAggregatedQuoteData
        ? totalNetworkFee?.valueInCurrency
        : undefined,
      asset: totalNetworkFee?.asset,
      formatted: formatTokenAmountWithSymbol(
        totalNetworkFeeAmount,
        totalNetworkFee?.asset.symbol,
      ),
      formattedFiat: canDisplayAggregatedQuoteData
        ? formatCurrencyDisplayValue(
            totalNetworkFee?.valueInCurrency,
            currentCurrency,
          )
        : '-',
    },
    quotePercentFee,
    recommendedQuotes,
    isLoading: hasValidSourceAmounts && isLoading,
    isSummaryLoading,
    isGasless,
    isBatchSellTradeAvailable: batchSellTrades.isBatchSellTradeAvailable,
    isBatchSellTradesLoading,
    isNetworkFeeUnavailable,
    hasAnyQuote,
    hasPendingQuoteRows,
  };
};
