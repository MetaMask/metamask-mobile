import React, { useMemo } from 'react';
import { startCase } from 'lodash';
import { BigNumber } from 'bignumber.js';
import {
  Box,
  BoxAlignItems,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useSelector } from 'react-redux';
import { selectCurrentCurrency } from '../../../../../../../selectors/currencyRateController';
import { fromTokenMinimalUnit } from '../../../../../../../util/number/bigint';
import formatFiat from '../../../../../../../util/formatFiat';
import { isGaslessQuote } from '../../../../../../UI/Bridge/utils/isGaslessQuote';
import { QuoteRow } from '../../../../../../UI/Bridge/components/QuoteSelectorView/QuoteRow';
import type { EnrichedQuickBuyQuote } from '../useQuickBuyQuotes';
import { selectDestToken } from '../../../../../../../core/redux/slices/bridge';

interface QuickBuySelectQuoteProps {
  sortedQuotes: EnrichedQuickBuyQuote[];
  selectedQuoteRequestId: string | undefined;
  isLoading: boolean;
  onSelectQuote: (requestId: string) => void;
}

const QuickBuySelectQuote: React.FC<QuickBuySelectQuoteProps> = ({
  sortedQuotes,
  selectedQuoteRequestId,
  isLoading,
  onSelectQuote,
}) => {
  const currency = useSelector(selectCurrentCurrency);
  const destToken = useSelector(selectDestToken);
  const bestQuote = sortedQuotes[0];

  const rows = useMemo(
    () =>
      sortedQuotes.map((quote) => ({
        formattedTotalCost: formatFiat(
          new BigNumber(quote.sentAmount?.valueInCurrency ?? '0').plus(
            isGaslessQuote(quote.quote)
              ? (quote.includedTxFees?.valueInCurrency ?? '0')
              : (quote.totalNetworkFee?.valueInCurrency ??
                  quote.gasFee?.effective?.valueInCurrency ??
                  '0'),
          ),
          currency,
        ),
        receiveAmount: destToken
          ? fromTokenMinimalUnit(
              quote.quote.destTokenAmount,
              destToken.decimals,
            )
          : undefined,
        provider: {
          name: startCase(quote.quote.bridges[0]),
        },
        quoteRequestId: quote.quote.requestId,
        onPress: onSelectQuote,
        loading: isLoading,
        isLowestCost: quote.quote.requestId === bestQuote?.quote.requestId,
        selected:
          !isLoading &&
          (!selectedQuoteRequestId
            ? quote.quote.requestId === bestQuote?.quote.requestId
            : quote.quote.requestId === selectedQuoteRequestId),
      })),
    [
      sortedQuotes,
      bestQuote,
      currency,
      destToken,
      isLoading,
      onSelectQuote,
      selectedQuoteRequestId,
    ],
  );

  if (!isLoading && sortedQuotes.length === 0) {
    return (
      <Box twClassName="px-4 py-8" alignItems={BoxAlignItems.Center}>
        <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
          No quotes available
        </Text>
      </Box>
    );
  }

  return (
    <Box twClassName="pb-4">
      {rows.map((rowProps) => (
        <QuoteRow key={rowProps.quoteRequestId} {...rowProps} />
      ))}
    </Box>
  );
};

export default QuickBuySelectQuote;
