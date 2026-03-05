import ScreenView from '../../../../Base/ScreenView';
import {
  Box,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import React, { useCallback, useEffect, useMemo } from 'react';
import { strings } from '../../../../../../locales/i18n';
import { useNavigation } from '@react-navigation/native';
import { getHeaderCompactStandardNavbarOptions } from '../../../../../component-library/components-temp/HeaderCompactStandard';
import { useDispatch, useSelector } from 'react-redux';
import {
  selectDestToken,
  selectSelectedQuoteRequestId,
  selectSourceToken,
  setSelectedQuoteRequestId,
} from '../../../../../core/redux/slices/bridge';
import { useBridgeQuoteData } from '../../hooks/useBridgeQuoteData';
import { BigNumber } from 'bignumber.js';
import { QuoteList } from './QuoteList';
import { QuoteRowProps } from './QuoteRow';
import { isGaslessQuote } from '../../utils/isGaslessQuote';
import { useLatestBalance } from '../../hooks/useLatestBalance';
import { selectCurrentCurrency } from '../../../../../selectors/currencyRateController';
import formatFiat from '../../../../../util/formatFiat';
import { startCase } from 'lodash';
import { QUOTES_PLACEHOLDER_DATA } from './constants';
import { useTrackAllQuotesSortedEvent } from '../../hooks/useTrackAllQuotesSortedEvent';
import { fromTokenMinimalUnit } from '../../../../../util/number';

export const QuoteSelectorView = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const selectedQuoteRequestId = useSelector(selectSelectedQuoteRequestId);
  const currency = useSelector(selectCurrentCurrency);
  const {
    validQuotes,
    bestQuote,
    isLoading,
    blockaidError,
    quoteFetchError,
    isExpired,
    willRefresh,
  } = useBridgeQuoteData();
  const sourceToken = useSelector(selectSourceToken);
  const destToken = useSelector(selectDestToken);
  const latestSourceBalance = useLatestBalance({
    address: sourceToken?.address,
    decimals: sourceToken?.decimals,
    chainId: sourceToken?.chainId,
  });

  const trackAllQuotesSortedEvent =
    useTrackAllQuotesSortedEvent(latestSourceBalance);

  const onQuoteSelect = useCallback(
    (requestId: string) => {
      const quote = validQuotes.find(
        ({ quote: _quote }) => _quote.requestId === requestId,
      );

      if (!quote) {
        return;
      }

      trackAllQuotesSortedEvent(quote.quote);
      dispatch(setSelectedQuoteRequestId(requestId));
      navigation.goBack();
    },
    [dispatch, navigation, trackAllQuotesSortedEvent, validQuotes],
  );

  const data = useMemo(() => {
    if (validQuotes.length === 0) {
      return QUOTES_PLACEHOLDER_DATA;
    }

    return validQuotes.map(
      (quote) =>
        ({
          formattedTotalCost: formatFiat(
            new BigNumber(quote.sentAmount.usd ?? '0').plus(
              isGaslessQuote(quote.quote)
                ? (quote.includedTxFees?.usd ?? '0')
                : (quote.totalNetworkFee.usd ??
                    quote.gasFee.effective.usd ??
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
          onPress: onQuoteSelect,
          loading: isLoading,
          isLowestCost: quote.quote.requestId === bestQuote?.quote.requestId,
          selected:
            !isLoading &&
            (!selectedQuoteRequestId
              ? quote.quote.requestId === bestQuote?.quote.requestId
              : quote.quote.requestId === selectedQuoteRequestId),
        }) satisfies QuoteRowProps,
    );
  }, [
    validQuotes,
    onQuoteSelect,
    bestQuote,
    isLoading,
    currency,
    selectedQuoteRequestId,
    destToken,
  ]);

  useEffect(() => {
    navigation.setOptions(
      getHeaderCompactStandardNavbarOptions({
        title: strings('bridge.select_quote'),
        onBack: () => navigation.goBack(),
        includesTopInset: true,
      }),
    );
  }, [navigation]);

  // Go back to bridge view only if there's an error or quotes are expired
  // Don't go back while loading or just because no quotes are available.
  // If the latter is the case, then render skeleton loaders.
  useEffect(() => {
    if (quoteFetchError || blockaidError || (isExpired && !willRefresh)) {
      navigation.goBack();
    }
  }, [quoteFetchError, blockaidError, isExpired, navigation, willRefresh]);

  return (
    <ScreenView>
      <Box padding={4}>
        <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
          {strings('bridge.select_quote_info')}
        </Text>
      </Box>
      <QuoteList data={data} />
    </ScreenView>
  );
};
