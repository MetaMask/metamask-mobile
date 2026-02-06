/**
 * Meld PoC — Quotes Screen
 *
 * Displays real-time quotes fetched directly from Meld's API.
 * Replaces the Aggregator/Views/Quotes screen.
 *
 * Key differences from the old aggregator:
 * - ONE API call returns quotes from ALL providers (Meld aggregates)
 * - Quotes include a `customerScore` for ranking (higher = better)
 * - Selecting a quote creates a widget session → opens provider WebView
 * - No need for the on-ramp SDK or on-ramp API intermediary
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  ScrollView,
  ActivityIndicator,
  Alert,
  Pressable,
  Linking,
  StyleSheet,
} from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';

const pocStyles = StyleSheet.create({
  scrollView: { flex: 1 },
});
import {
  Box,
  Text,
  TextVariant,
  BoxFlexDirection,
  BoxAlignItems,
  BoxJustifyContent,
  FontWeight,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';

import { useMeldContext } from '../../MeldProvider';
import useMeldQuotes from '../../hooks/useMeldQuotes';
import useMeldWidgetSession from '../../hooks/useMeldWidgetSession';
import { MeldQuote } from '../../types';
import Logger from '../../../../../../util/Logger';

import Button, {
  ButtonVariants,
  ButtonWidthTypes,
  ButtonSize,
} from '../../../../../../component-library/components/Buttons/Button';

// ──────────────────────────────────────────────
// Quote Card Component
// ──────────────────────────────────────────────

interface QuoteCardProps {
  quote: MeldQuote;
  isRecommended: boolean;
  onSelect: (quote: MeldQuote) => void;
  isSelected: boolean;
}

const QuoteCard: React.FC<QuoteCardProps> = ({
  quote,
  isRecommended,
  onSelect,
  isSelected,
}) => {
  const tw = useTailwind();

  return (
    <Pressable
      onPress={() => onSelect(quote)}
      style={tw.style(
        'mb-3 rounded-xl border p-4',
        isSelected
          ? 'border-primary-default bg-primary-muted'
          : 'border-muted bg-default',
      )}
    >
      {/* Provider Header */}
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Between}
        twClassName="mb-2"
      >
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
        >
          <Text variant={TextVariant.BodyLgMedium}>
            {quote.serviceProvider}
          </Text>
          {isRecommended && (
            <Box twClassName="ml-2 px-2 py-0.5 bg-success-muted rounded-full">
              <Text
                variant={TextVariant.BodySm}
                twClassName="text-success-default"
              >
                Best
              </Text>
            </Box>
          )}
          {quote.lowKyc && (
            <Box twClassName="ml-2 px-2 py-0.5 bg-info-muted rounded-full">
              <Text
                variant={TextVariant.BodySm}
                twClassName="text-info-default"
              >
                Low KYC
              </Text>
            </Box>
          )}
        </Box>
        <Text variant={TextVariant.BodySm} twClassName="text-muted">
          Score: {quote.customerScore?.toFixed(1) ?? 'N/A'}
        </Text>
      </Box>

      {/* Amounts */}
      <Box
        flexDirection={BoxFlexDirection.Row}
        justifyContent={BoxJustifyContent.Between}
        twClassName="mb-2"
      >
        <Box>
          <Text variant={TextVariant.BodySm} twClassName="text-muted">
            You pay
          </Text>
          <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
            {quote.sourceAmount.toFixed(2)} {quote.sourceCurrencyCode}
          </Text>
        </Box>
        <Box twClassName="items-end">
          <Text variant={TextVariant.BodySm} twClassName="text-muted">
            You receive
          </Text>
          <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Bold}>
            {quote.destinationAmount} {quote.destinationCurrencyCode}
          </Text>
        </Box>
      </Box>

      {/* Fee Breakdown */}
      <Box twClassName="border-t border-muted pt-2">
        <Box
          flexDirection={BoxFlexDirection.Row}
          justifyContent={BoxJustifyContent.Between}
        >
          <Text variant={TextVariant.BodySm} twClassName="text-muted">
            Total Fee
          </Text>
          <Text variant={TextVariant.BodySm}>
            {quote.totalFee?.toFixed(2)} {quote.sourceCurrencyCode}
          </Text>
        </Box>
        <Box
          flexDirection={BoxFlexDirection.Row}
          justifyContent={BoxJustifyContent.Between}
        >
          <Text variant={TextVariant.BodySm} twClassName="text-muted">
            Exchange Rate
          </Text>
          <Text variant={TextVariant.BodySm}>
            1 {quote.destinationCurrencyCode} = {quote.exchangeRate?.toFixed(2)}{' '}
            {quote.sourceCurrencyCode}
          </Text>
        </Box>
        <Box
          flexDirection={BoxFlexDirection.Row}
          justifyContent={BoxJustifyContent.Between}
        >
          <Text variant={TextVariant.BodySm} twClassName="text-muted">
            Payment
          </Text>
          <Text variant={TextVariant.BodySm}>
            {quote.paymentMethodType?.replace(/_/g, ' ')}
          </Text>
        </Box>
      </Box>
    </Pressable>
  );
};

// ──────────────────────────────────────────────
// Main Quotes Screen
// ──────────────────────────────────────────────

interface MeldQuotesRouteParams {
  MeldQuotes: { amount: string };
}

const MeldQuotes: React.FC = () => {
  const tw = useTailwind();
  const route = useRoute<RouteProp<MeldQuotesRouteParams, 'MeldQuotes'>>();
  const { amount } = route.params;

  const { selectedFiatCurrency, selectedCrypto, selectedCountry } =
    useMeldContext();

  const { quotes, isFetching, error, refetch } = useMeldQuotes(amount, {
    refreshInterval: 30000,
  });

  const {
    createSession,
    isCreating,
    error: sessionError,
  } = useMeldWidgetSession();

  const [selectedQuoteIndex, setSelectedQuoteIndex] = useState<number>(0);

  const selectedQuote = useMemo(
    () => (quotes.length > 0 ? quotes[selectedQuoteIndex] : null),
    [quotes, selectedQuoteIndex],
  );

  // ── Handle quote selection ──
  const handleSelectQuote = useCallback(
    (quote: MeldQuote) => {
      const idx = quotes.indexOf(quote);
      setSelectedQuoteIndex(idx >= 0 ? idx : 0);
    },
    [quotes],
  );

  // ── Handle "Continue" → create widget session & open WebView ──
  const handleContinue = useCallback(async () => {
    if (!selectedQuote) return;

    const session = await createSession(selectedQuote);
    if (session?.widgetUrl) {
      Logger.log('[MeldQuotes] Widget URL:', session.widgetUrl);

      // For PoC, open in external browser.
      // In production, open in an in-app WebView (like the Aggregator Checkout).
      Alert.alert(
        'Open Provider Checkout',
        `Provider: ${selectedQuote.serviceProvider}\n\nThis will open ${selectedQuote.serviceProvider}'s checkout in a browser.\n\nSession ID: ${session.id}`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Open',
            onPress: () => Linking.openURL(session.widgetUrl),
          },
        ],
      );
    }
  }, [selectedQuote, createSession]);

  return (
    <Box twClassName="flex-1 bg-default">
      {/* Header */}
      <Box twClassName="px-4 pt-4 pb-2">
        <Text variant={TextVariant.HeadingMd}>
          {isFetching && quotes.length === 0
            ? 'Finding best prices...'
            : `${quotes.length} quotes found`}
        </Text>
        <Text variant={TextVariant.BodySm} twClassName="text-muted">
          {selectedFiatCurrency?.currencyCode} {amount} →{' '}
          {selectedCrypto?.currencyName} • {selectedCountry?.countryCode}
        </Text>
      </Box>

      {/* Loading State */}
      {isFetching && quotes.length === 0 && (
        <Box twClassName="flex-1 items-center justify-center p-8">
          <ActivityIndicator size="large" />
          <Text
            variant={TextVariant.BodyMd}
            twClassName="mt-4 text-muted text-center"
          >
            Meld is fetching quotes from multiple providers...{'\n'}
            (Transak, Unlimit, Robinhood, etc.)
          </Text>
        </Box>
      )}

      {/* Error State */}
      {error && !isFetching && (
        <Box twClassName="p-4">
          <Box twClassName="p-4 bg-error-muted rounded-lg mb-4">
            <Text
              variant={TextVariant.BodyMd}
              twClassName="text-error-default mb-2"
            >
              Failed to fetch quotes
            </Text>
            <Text variant={TextVariant.BodySm}>{error.message}</Text>
          </Box>
          <Button
            variant={ButtonVariants.Secondary}
            width={ButtonWidthTypes.Full}
            size={ButtonSize.Md}
            label="Retry"
            onPress={refetch}
          />
        </Box>
      )}

      {/* Quotes List */}
      {quotes.length > 0 && (
        <ScrollView
          style={pocStyles.scrollView}
          contentContainerStyle={tw.style('px-4 pb-4')}
        >
          {/* Refresh indicator */}
          {isFetching && (
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              twClassName="mb-2"
            >
              <ActivityIndicator size="small" />
              <Text variant={TextVariant.BodySm} twClassName="ml-2 text-muted">
                Refreshing quotes...
              </Text>
            </Box>
          )}

          {quotes.map((quote, index) => (
            <QuoteCard
              key={`${quote.serviceProvider}-${quote.paymentMethodType}`}
              quote={quote}
              isRecommended={index === 0}
              onSelect={handleSelectQuote}
              isSelected={index === selectedQuoteIndex}
            />
          ))}

          {/* Comparison note */}
          <Box twClassName="mt-2 p-3 bg-muted rounded-lg">
            <Text variant={TextVariant.BodySm} twClassName="text-muted">
              Quotes ranked by Meld&apos;s customerScore, which factors in
              conversion success rate, reliability, and pricing. The old
              aggregator would make N separate API calls (one per provider);
              Meld returns all quotes in a single POST.
            </Text>
          </Box>
        </ScrollView>
      )}

      {/* Bottom Action Bar */}
      {selectedQuote && (
        <Box twClassName="p-4 border-t border-muted bg-default">
          {sessionError && (
            <Box twClassName="mb-2 p-2 bg-error-muted rounded-lg">
              <Text
                variant={TextVariant.BodySm}
                twClassName="text-error-default"
              >
                {sessionError.message}
              </Text>
            </Box>
          )}
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            justifyContent={BoxJustifyContent.Between}
            twClassName="mb-3"
          >
            <Box>
              <Text variant={TextVariant.BodySm} twClassName="text-muted">
                Best offer from
              </Text>
              <Text variant={TextVariant.BodyLgMedium}>
                {selectedQuote.serviceProvider}
              </Text>
            </Box>
            <Box twClassName="items-end">
              <Text variant={TextVariant.BodySm} twClassName="text-muted">
                You receive
              </Text>
              <Text variant={TextVariant.HeadingMd}>
                {selectedQuote.destinationAmount}{' '}
                {selectedQuote.destinationCurrencyCode}
              </Text>
            </Box>
          </Box>
          <Button
            variant={ButtonVariants.Primary}
            width={ButtonWidthTypes.Full}
            size={ButtonSize.Lg}
            label={
              isCreating
                ? 'Creating session...'
                : `Continue with ${selectedQuote.serviceProvider}`
            }
            onPress={handleContinue}
            isDisabled={isCreating}
          />
        </Box>
      )}
    </Box>
  );
};

export default MeldQuotes;
