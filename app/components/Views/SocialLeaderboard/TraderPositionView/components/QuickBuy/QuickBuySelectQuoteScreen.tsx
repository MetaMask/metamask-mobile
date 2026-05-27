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
import { selectCurrentCurrency } from '../../../../../../selectors/currencyRateController';
import { fromTokenMinimalUnit } from '../../../../../../util/number/bigint';
import formatFiat from '../../../../../../util/formatFiat';
import { isGaslessQuote } from '../../../../../UI/Bridge/utils/isGaslessQuote';
import { QuoteRow } from '../../../../../UI/Bridge/components/QuoteSelectorView/QuoteRow';
import { selectDestToken } from '../../../../../../core/redux/slices/bridge';
import { strings } from '../../../../../../../locales/i18n';
import { useQuickBuyContext } from './useQuickBuyContext';
import QuickBuySubScreenHeader from './components/QuickBuySubScreenHeader';

const QuickBuySelectQuoteScreen: React.FC = () => {
  const {
    sortedQuotes,
    selectedQuoteRequestId,
    setSelectedQuoteRequestId,
    isQuoteLoading,
    onClose,
    setActiveScreen,
  } = useQuickBuyContext();

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
        onPress: (requestId: string) => {
          setSelectedQuoteRequestId(requestId);
          setActiveScreen('quoteDetails');
        },
        loading: isQuoteLoading,
        isLowestCost: quote.quote.requestId === bestQuote?.quote.requestId,
        selected:
          !isQuoteLoading &&
          (!selectedQuoteRequestId
            ? quote.quote.requestId === bestQuote?.quote.requestId
            : quote.quote.requestId === selectedQuoteRequestId),
      })),
    [
      sortedQuotes,
      bestQuote,
      currency,
      destToken,
      isQuoteLoading,
      selectedQuoteRequestId,
      setSelectedQuoteRequestId,
      setActiveScreen,
    ],
  );

  if (!isQuoteLoading && sortedQuotes.length === 0) {
    return (
      <Box twClassName="px-4 py-8" alignItems={BoxAlignItems.Center}>
        <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
          {strings('social_leaderboard.quick_buy.no_quotes')}
        </Text>
      </Box>
    );
  }

  return (
    <>
      <QuickBuySubScreenHeader
        title={strings('social_leaderboard.quick_buy.select_quote_title')}
        onBack={() => setActiveScreen('quoteDetails')}
        onClose={onClose}
      />
      <Box twClassName="px-4 pb-2 mb-2">
        <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
          {strings('bridge.select_quote_info')}
        </Text>
      </Box>
      <Box twClassName="pb-4">
        {rows.map((rowProps) => (
          <QuoteRow key={rowProps.quoteRequestId} {...rowProps} />
        ))}
      </Box>
    </>
  );
};

export default QuickBuySelectQuoteScreen;
