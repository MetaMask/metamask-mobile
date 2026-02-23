import React, { useCallback } from 'react';
import { StyleSheet } from 'react-native';
import { FlatList } from 'react-native-gesture-handler';
import { Box } from '@metamask/design-system-react-native';
import HeaderCompactStandard from '../../../../../../component-library/components-temp/HeaderCompactStandard';
import ListItemSelect from '../../../../../../component-library/components/List/ListItemSelect';
import ListItemColumn, {
  WidthType,
} from '../../../../../../component-library/components/List/ListItemColumn';
import Text, {
  TextVariant,
} from '../../../../../../component-library/components/Texts/Text';
import type {
  Provider,
  Quote,
  QuotesResponse,
} from '@metamask/ramps-controller';
import { strings } from '../../../../../../../locales/i18n';
import { useRampsController } from '../../../hooks/useRampsController';
import { useFormatters } from '../../../../../hooks/useFormatters';
import QuoteDisplay from './QuoteDisplay';
import PaymentSelectionAlert from './PaymentSelectionAlert';
import { BannerAlertSeverity } from '../../../../../../component-library/components/Banners/Banner/variants/BannerAlert/BannerAlert.types';

const styles = StyleSheet.create({
  list: { flex: 1, minHeight: 0 },
});

interface ProviderSelectionProps {
  quotes: QuotesResponse | null;
  quotesLoading: boolean;
  quotesError: string | null;
  onBack: () => void;
  onProviderSelect: (provider: Provider) => void;
}

const ProviderSelection: React.FC<ProviderSelectionProps> = ({
  quotes,
  quotesLoading,
  quotesError,
  onBack,
  onProviderSelect,
}) => {
  const {
    userRegion,
    selectedToken,
    selectedProvider,
    selectedPaymentMethod,
    providers,
  } = useRampsController();
  const { formatToken, formatCurrency } = useFormatters();

  const currency = userRegion?.country?.currency ?? 'USD';
  const symbol = selectedToken?.symbol ?? '';

  const handleProviderSelect = useCallback(
    (provider: Provider, _matchedQuote: Quote | null) => {
      onProviderSelect(provider);
    },
    [onProviderSelect],
  );

  const renderItem = useCallback(
    ({ item: provider }: { item: Provider }) => {
      const matchedQuote =
        quotes?.success?.find(
          (q) =>
            q.provider === provider.id &&
            (!selectedPaymentMethod ||
              q.quote?.paymentMethod === selectedPaymentMethod.id),
        ) ??
        quotes?.success?.find((q) => q.provider === provider.id) ??
        null;
      const amountOut = matchedQuote?.quote?.amountOut;
      const cryptoAmount =
        amountOut != null && symbol
          ? formatToken(Number(amountOut), symbol, {
              maximumFractionDigits: 6,
              minimumFractionDigits: 0,
            })
          : '';
      const fiatAmount =
        matchedQuote?.quote?.amountOutInFiat != null
          ? formatCurrency(Number(matchedQuote.quote.amountOutInFiat), currency)
          : null;
      const isSelected = selectedProvider?.id === provider.id;

      return (
        <ListItemSelect
          isSelected={isSelected}
          onPress={() => handleProviderSelect(provider, matchedQuote)}
          accessibilityRole="button"
          accessible
        >
          <ListItemColumn widthType={WidthType.Fill}>
            <Text variant={TextVariant.BodyLGMedium}>{provider.name}</Text>
          </ListItemColumn>
          <ListItemColumn widthType={WidthType.Auto}>
            {quotesLoading ? (
              <QuoteDisplay cryptoAmount="" fiatAmount={null} isLoading />
            ) : matchedQuote ? (
              <QuoteDisplay
                cryptoAmount={cryptoAmount}
                fiatAmount={fiatAmount}
              />
            ) : (
              <QuoteDisplay
                cryptoAmount=""
                fiatAmount={null}
                quoteUnavailable
              />
            )}
          </ListItemColumn>
        </ListItemSelect>
      );
    },
    [
      quotes,
      symbol,
      currency,
      selectedProvider,
      selectedPaymentMethod,
      quotesLoading,
      handleProviderSelect,
      formatToken,
      formatCurrency,
    ],
  );

  const keyExtractor = useCallback((item: Provider) => item.id, []);

  if (providers.length === 0) {
    return (
      <Box twClassName="flex-1 min-h-0">
        <HeaderCompactStandard
          title={strings('fiat_on_ramp.providers')}
          onBack={onBack}
        />
        <Box twClassName="flex-1 px-4">
          <PaymentSelectionAlert
            message={strings('fiat_on_ramp.no_quotes_available')}
            severity={BannerAlertSeverity.Error}
          />
        </Box>
      </Box>
    );
  }

  return (
    <Box twClassName="flex-1 min-h-0">
      <HeaderCompactStandard
        title={strings('fiat_on_ramp.providers')}
        onBack={onBack}
      />
      {quotesError ? (
        <Box twClassName="px-4">
          <PaymentSelectionAlert
            message={quotesError}
            severity={BannerAlertSeverity.Error}
          />
        </Box>
      ) : null}
      <FlatList
        style={styles.list}
        data={providers}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        keyboardDismissMode="none"
        keyboardShouldPersistTaps="always"
      />
    </Box>
  );
};

export default ProviderSelection;
