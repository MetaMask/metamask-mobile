import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, ScrollView } from 'react-native';
import { Box } from '@metamask/design-system-react-native';
import type { CaipChainId } from '@metamask/utils';
import HeaderCompactStandard from '../../../../../component-library/components-temp/HeaderCompactStandard';
import ListItemSelect from '../../../../../component-library/components/List/ListItemSelect';
import ListItemColumn, {
  WidthType,
} from '../../../../../component-library/components/List/ListItemColumn';
import Text, {
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import type { Provider, Quote } from '@metamask/ramps-controller';
import { strings } from '../../../../../../locales/i18n';
import { useRampsController } from '../../hooks/useRampsController';
import useRampAccountAddress from '../../hooks/useRampAccountAddress';
import { formatCurrency, formatTokenAmount } from '../../utils/formatCurrency';
import { Skeleton } from '../../../../../component-library/components/Skeleton';
import QuoteDisplay from './QuoteDisplay';
import PaymentSelectionAlert from './PaymentSelectionAlert';
import { BannerAlertSeverity } from '../../../../../component-library/components/Banners/Banner/variants/BannerAlert/BannerAlert.types';

const SKELETON_ROW_COUNT = 3;
const SKELETON_NAME_WIDTH = 120;
const SKELETON_NAME_HEIGHT = 20;

const styles = StyleSheet.create({
  skeleton: {
    borderRadius: 4,
  },
  scrollView: {
    flex: 1,
    minHeight: 0,
  },
});

interface ProviderSelectionProps {
  onBack: () => void;
  onProviderSelect: (provider: Provider) => void;
  amount: number;
}

const ProviderSelection: React.FC<ProviderSelectionProps> = ({
  onBack,
  onProviderSelect,
  amount,
}) => {
  const {
    userRegion,
    selectedToken,
    paymentMethods,
    selectedPaymentMethod,
    getQuotes,
    setSelectedQuote,
    selectedProvider,
    providers,
    quotes,
    quotesError,
    quotesLoading,
  } = useRampsController();

  console.log('RAMP - PROVIDER SELECTION quotes', quotes);

  const walletAddress = useRampAccountAddress(
    (selectedToken?.chainId as CaipChainId) ?? null,
  );

  useEffect(() => {
    console.log('RAMP - PROVIDER SELECTION useEffect', walletAddress);
    if (!walletAddress) {
      return;
    }

    console.log('RAMP - PROVIDER SELECTION selectedPaymentMethod?.id', selectedPaymentMethod?.id);

    getQuotes({
      amount,
      walletAddress,
      paymentMethods: [selectedPaymentMethod?.id ?? ''],
    })
  }, [
    getQuotes,
    amount,
    selectedPaymentMethod?.id,
    walletAddress,
  ]);

  const handleQuotePress = useCallback(
    (quote: Quote) => {
      setSelectedQuote(quote);
      const provider = providers.find((p) => p.id === quote.provider);
      if (provider) {
        onProviderSelect(provider);
      }
    },
    [providers, setSelectedQuote, onProviderSelect],
  );

  const providerIds = useMemo(
    () => new Set(providers.map((p) => p.id)),
    [providers],
  );

  
  const filteredQuotes = useMemo(() => {
    return quotes?.success?.filter((quote) => providerIds.has(quote.provider));
  }, [quotes, providerIds]);

  const currency = userRegion?.country?.currency ?? 'USD';
  const symbol = selectedToken?.symbol ?? '';

  if (quotesLoading) {
    return (
      <Box twClassName="flex-1 min-h-0">
        <HeaderCompactStandard
          title={strings('fiat_on_ramp.providers')}
          onBack={onBack}
        />
        <ScrollView style={styles.scrollView}>
          {Array.from({ length: SKELETON_ROW_COUNT }).map((_, index) => (
            <ListItemSelect
              key={`skeleton-${index}`}
              isSelected={false}
              onPress={undefined}
              accessibilityRole="button"
              accessible
            >
              <ListItemColumn widthType={WidthType.Fill}>
                <Skeleton
                  width={SKELETON_NAME_WIDTH}
                  height={SKELETON_NAME_HEIGHT}
                  style={styles.skeleton}
                />
              </ListItemColumn>
              <ListItemColumn widthType={WidthType.Auto}>
                <QuoteDisplay cryptoAmount="" fiatAmount={null} isLoading />
              </ListItemColumn>
            </ListItemSelect>
          ))}
        </ScrollView>
      </Box>
    );
  }

  if (quotesError) {
    return (
      <Box twClassName="flex-1 min-h-0">
        <HeaderCompactStandard
          title={strings('fiat_on_ramp.providers')}
          onBack={onBack}
        />
        <ScrollView style={styles.scrollView}>
          <PaymentSelectionAlert
            message={quotesError}
            severity={BannerAlertSeverity.Error}
          />
        </ScrollView>
      </Box>
    );
  }

  if (filteredQuotes?.length === 0) {
    return (
      <Box twClassName="flex-1 min-h-0">
        <HeaderCompactStandard
          title={strings('fiat_on_ramp.providers')}
          onBack={onBack}
        />
        <ScrollView style={styles.scrollView}>
          <PaymentSelectionAlert
            message={strings('fiat_on_ramp.no_quotes_available')}
            severity={BannerAlertSeverity.Error}
          />
        </ScrollView>
      </Box>
    );
  }

  return (
    <Box twClassName="flex-1 min-h-0">
      <HeaderCompactStandard
        title={strings('fiat_on_ramp.providers')}
        onBack={onBack}
      />
      <ScrollView style={styles.scrollView}>
        {filteredQuotes?.map((quote) => {
          const provider = providers.find((p) => p.id === quote.provider);
          const amountOut = quote.quote?.amountOut;
          const cryptoAmount =
            amountOut != null && symbol
              ? formatTokenAmount(amountOut, symbol)
              : '';
          const fiatAmount =
            quote.quote?.amountOutInFiat != null
              ? formatCurrency(quote.quote.amountOutInFiat, currency)
              : null;
          const isSelected = selectedProvider?.id === quote.provider;

          return (
            <ListItemSelect
              key={quote.provider}
              isSelected={isSelected}
              onPress={() => handleQuotePress(quote)}
              accessibilityRole="button"
              accessible
            >
              <ListItemColumn widthType={WidthType.Fill}>
                <Text variant={TextVariant.BodyLGMedium}>{provider?.name}</Text>
              </ListItemColumn>
              <ListItemColumn widthType={WidthType.Auto}>
                <QuoteDisplay
                  cryptoAmount={cryptoAmount}
                  fiatAmount={fiatAmount}
                />
              </ListItemColumn>
            </ListItemSelect>
          );
        })}
      </ScrollView>
    </Box>
  );
};

export default ProviderSelection;
