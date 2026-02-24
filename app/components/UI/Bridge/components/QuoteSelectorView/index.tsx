import { View } from 'react-native';
import ScreenView from '../../../../Base/ScreenView';
import {
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import React, { useCallback, useEffect, useMemo } from 'react';
import { strings } from '../../../../../../locales/i18n';
import { useNavigation } from '@react-navigation/native';
import { getHeaderCompactStandardNavbarOptions } from '../../../../../component-library/components-temp/HeaderCompactStandard';
import { styles } from './index.style';
import { useSelector } from 'react-redux';
import { selectSourceToken } from '../../../../../core/redux/slices/bridge';
import { useBridgeQuoteData } from '../../hooks/useBridgeQuoteData';
import { BigNumber } from 'bignumber.js';
import { QuoteList } from './QuoteList';
import { QuoteRowProps } from './QuoteRow';
import { isGaslessQuote } from '../../utils/isGaslessQuote';
import { useLatestBalance } from '../../hooks/useLatestBalance';
import { formatNetworkFee } from '../../utils/formatNetworkFee';
import { selectCurrentCurrency } from '../../../../../selectors/currencyRateController';
import formatFiat from '../../../../../util/formatFiat';

export const QuoteSelectorView = () => {
  const navigation = useNavigation();
  const currency = useSelector(selectCurrentCurrency);
  const {
    validQuotes,
    bestQuote,
    isLoading,
    isNoQuotesAvailable,
    isExpired,
    willRefresh,
  } = useBridgeQuoteData();
  const sourceToken = useSelector(selectSourceToken);
  const latestSourceBalance = useLatestBalance({
    address: sourceToken?.address,
    decimals: sourceToken?.decimals,
    chainId: sourceToken?.chainId,
  });

  // TODO: loading skeletons do not render, keep the previosu values while fetching new
  // TODO: show something when no quotes are rendered
  // TODO: sort by total cost

  const loading = isLoading || isExpired || isNoQuotesAvailable || willRefresh;

  const onQuoteSelect = useCallback((_requestId: string) => {
    // console.log(requestId);
  }, []);

  const data = useMemo(
    () =>
      validQuotes.map(
        (quote) =>
          ({
            formattedTotalCost: formatFiat(
              new BigNumber(quote.sentAmount.usd ?? '0').plus(
                quote.totalNetworkFee.usd ?? '0',
              ),
              currency,
            ),
            provider: {
              name: quote.quote.bridgeId,
            },
            isGasless: isGaslessQuote(quote.quote),
            quoteGasSponsored: quote?.quote?.gasSponsored ?? false,
            quoteRequestId: quote.quote.requestId,
            onPress: onQuoteSelect,
            latestSourceBalance,
            formattedNetworkFee: formatNetworkFee(currency, quote),
            isLoading: loading,
            isLowestCost: quote.quote.requestId === bestQuote?.quote.requestId,
          }) as QuoteRowProps,
      ),
    [
      validQuotes,
      onQuoteSelect,
      latestSourceBalance,
      bestQuote,
      loading,
      currency,
    ],
  );

  useEffect(() => {
    navigation.setOptions(
      getHeaderCompactStandardNavbarOptions({
        title: strings('bridge.select_quote'),
        onBack: () => navigation.goBack(),
        includesTopInset: true,
      }),
    );
  }, [navigation]);

  return (
    <ScreenView>
      <View style={styles.infoContainer}>
        <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
          {strings('bridge.select_quote_info')}
        </Text>
      </View>
      <QuoteList data={data} />
    </ScreenView>
  );
};
