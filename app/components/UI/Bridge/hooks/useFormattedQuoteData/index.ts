import { useSelector } from 'react-redux';

import { type QuoteResponse } from '@metamask/bridge-controller';
import { useMemo } from 'react';

import type { BridgeToken } from '../../types';
import {
  selectBridgeFeatureFlags,
  selectSlippage,
} from '../../../../../core/redux/slices/bridge';
// eslint-disable-next-line import-x/no-restricted-paths
import { fromTokenMinimalUnit } from '../../../../../util/number';
import AppConstants from '../../../../../core/AppConstants';
import { parsePriceImpact } from '../../utils/getPriceImpactViewData';
import { getIntlNumberFormatter } from '../../../../../util/intl';
import { useFormattedNetworkFee } from '../useFormattedNetworkFee';
import { usePriceImpactFiat } from '../usePriceImpactFiat';
import I18n from '../../../../../../locales/i18n';

export const useFormattedQuoteData = ({
  activeQuote,
  isActiveQuoteForCurrentTokenPair,
  quoteParams,
}: {
  activeQuote?: QuoteResponse | null;
  isActiveQuoteForCurrentTokenPair: boolean;
  quoteParams: {
    srcAmount?: string;
    srcToken?: BridgeToken;
    destToken?: BridgeToken;
    walletAddress?: string;
    destWalletAddress?: string;
    slippage?: string;
  };
}) => {
  const bridgeFeatureFlags = useSelector(selectBridgeFeatureFlags);

  // Pair mismatch must not zero out formattedQuoteData (expired cache still renders).
  const destTokenAmount =
    activeQuote && quoteParams.destToken && isActiveQuoteForCurrentTokenPair
      ? fromTokenMinimalUnit(
          activeQuote.quote.dest.amount,
          quoteParams.destToken.decimals,
        )
      : undefined;

  const priceImpactFiat = usePriceImpactFiat(activeQuote);
  const networkFee = useFormattedNetworkFee(activeQuote);
  const slippage = useSelector(selectSlippage);
  // TODO use swapRate metadata
  // const quoteRate = activeQuote?.quote.priceData?.swapRate
  //   ? Number(activeQuote.quote.priceData.swapRate)
  //   : undefined;
  const quoteRate =
    Number(quoteParams.srcAmount) === 0
      ? undefined
      : Number(destTokenAmount) / Number(quoteParams.srcAmount);

  const locale = I18n.locale;

  const formattedQuoteData = useMemo(() => {
    if (!activeQuote) return undefined;

    const { quote, estimatedProcessingTimeInSeconds } = activeQuote;

    const priceImpact = quote.priceData?.priceImpact?.amount;
    let priceImpactPercentage;

    if (priceImpact) {
      priceImpactPercentage = `${(Number(priceImpact) * 100).toFixed(2)}%`;
    }

    // Formats quote rate to show an appropriate number of decimal places
    // For numbers greater than 1, we show 2 decimal places. Example: 1.23456 -> 1.23
    // For numbers less than 1, we show 3 significant digits. Example: 0.00012345 -> 0.000123
    const quoteRateFormatter = getIntlNumberFormatter(locale, {
      ...(quoteRate && quoteRate > 1
        ? { minimumFractionDigits: 1, maximumFractionDigits: 2 }
        : { minimumSignificantDigits: 2, maximumSignificantDigits: 3 }),
    });
    const formattedQuoteRate = quoteRateFormatter.format(quoteRate ?? 0);
    const rate = quoteRate
      ? `1 ${quoteParams.srcToken?.symbol} = ${formattedQuoteRate} ${quoteParams.destToken?.symbol}`
      : '--';

    return {
      networkFee,
      estimatedTime:
        estimatedProcessingTimeInSeconds >= 60
          ? `${Math.ceil(estimatedProcessingTimeInSeconds / 60)} min`
          : `${
              estimatedProcessingTimeInSeconds >= 1
                ? `${estimatedProcessingTimeInSeconds} seconds`
                : '< 1 second'
            }`,
      rate,
      priceImpact: priceImpactPercentage,
      priceImpactFiat,
      slippage: slippage ? `${slippage}%` : 'Auto',
    };
  }, [
    activeQuote,
    quoteRate,
    quoteParams.srcToken?.symbol,
    quoteParams.destToken?.symbol,
    slippage,
    locale,
    networkFee,
    priceImpactFiat,
  ]);

  const shouldShowPriceImpactWarning = Boolean(
    activeQuote?.quote.priceData?.priceImpact?.amount !== undefined &&
      bridgeFeatureFlags?.priceImpactThreshold &&
      parsePriceImpact(activeQuote?.quote.priceData?.priceImpact?.amount) >=
        (bridgeFeatureFlags.priceImpactThreshold.warning ??
          AppConstants.BRIDGE.PRICE_IMPACT_WARNING_THRESHOLD),
  );

  return useMemo(
    () => ({
      destTokenAmount,
      formattedQuoteData,
      shouldShowPriceImpactWarning,
    }),
    [destTokenAmount, formattedQuoteData, shouldShowPriceImpactWarning],
  );
};
