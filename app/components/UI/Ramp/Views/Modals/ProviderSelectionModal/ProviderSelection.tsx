import React, { useCallback, useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { FlatList } from 'react-native-gesture-handler';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Text,
  TextVariant,
  TextColor,
  FontWeight,
} from '@metamask/design-system-react-native';
import { PaymentType } from '@consensys/on-ramp-sdk';
import HeaderCompactStandard from '../../../../../../component-library/components-temp/HeaderCompactStandard';
import ListItemSelect from '../../../../../../component-library/components/List/ListItemSelect';
import ListItemColumn, {
  WidthType,
} from '../../../../../../component-library/components/List/ListItemColumn';
import { Skeleton } from '../../../../../../component-library/components/Skeleton';
import type {
  Provider,
  Quote,
  QuotesResponse,
} from '@metamask/ramps-controller';
import { strings } from '../../../../../../../locales/i18n';
import { useRampsController } from '../../../hooks/useRampsController';
import { useFormatters } from '../../../../../hooks/useFormatters';
import QuoteDisplay from '../PaymentSelectionModal/QuoteDisplay';
import PaymentSelectionAlert from '../PaymentSelectionModal/PaymentSelectionAlert';
import PaymentMethodIcon from '../../../Aggregator/components/PaymentMethodIcon';
import { BannerAlertSeverity } from '../../../../../../component-library/components/Banners/Banner/variants/BannerAlert/BannerAlert.types';
import { useTheme } from '../../../../../../util/theme';

const SKELETON_ROW_COUNT = 5;
const SKELETON_NAME_WIDTH = 120;
const SKELETON_NAME_HEIGHT = 18;

const styles = StyleSheet.create({
  list: { flex: 1, minHeight: 0 },
  skeleton: { borderRadius: 4 },
});

interface ProviderSelectionProps {
  providers?: Provider[];
  quotes: QuotesResponse | null;
  quotesLoading: boolean;
  quotesError: string | null;
  showQuotes?: boolean;
  showBackButton?: boolean;
  ordersProviders?: string[];
  onBack: () => void;
  onProviderSelect: (provider: Provider) => void;
}

type ProviderListItem =
  | { type: 'provider'; provider: Provider }
  | { type: 'separator' };

const ICON_CIRCLE_SIZE = 36;

const PaymentMethodBanner: React.FC<{
  paymentMethodName: string;
  paymentType?: string;
}> = ({ paymentMethodName, paymentType }) => {
  const { colors } = useTheme();

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      twClassName="mx-4 mt-1 mb-2 rounded-lg bg-background-muted px-3 py-3"
    >
      <Box
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Center}
        twClassName="mr-3 rounded-full bg-background-muted"
        style={{ width: ICON_CIRCLE_SIZE, height: ICON_CIRCLE_SIZE }}
      >
        <PaymentMethodIcon
          paymentMethodType={paymentType as PaymentType}
          size={18}
          color={colors.icon.default}
        />
      </Box>
      <Text variant={TextVariant.BodyMd}>
        {strings('fiat_on_ramp.quotes_displayed_for', {
          paymentMethodName,
        })}
      </Text>
    </Box>
  );
};

const ProviderListSkeleton: React.FC = () => (
  <>
    {Array.from({ length: SKELETON_ROW_COUNT }).map((_, index) => (
      <ListItemSelect
        key={`provider-skeleton-${index}`}
        isSelected={false}
        isDisabled
        onPress={undefined}
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
  </>
);

const SeparatorItem: React.FC = () => (
  <Box twClassName="px-4 py-3">
    <Text
      variant={TextVariant.BodySm}
      color={TextColor.TextAlternative}
      fontWeight={FontWeight.Medium}
    >
      {strings('fiat_on_ramp.other_options')}
    </Text>
  </Box>
);

function getProviderTag(
  providerId: string,
  matchedQuote: Quote | null,
  ordersProviders: string[],
): string | null {
  if (ordersProviders.includes(providerId)) {
    return strings('fiat_on_ramp.previously_used');
  }
  if (matchedQuote?.metadata?.tags?.isMostReliable) {
    return strings('fiat_on_ramp.most_reliable');
  }
  if (matchedQuote?.metadata?.tags?.isBestRate) {
    return strings('fiat_on_ramp.best_rate');
  }
  return null;
}

const ProviderSelection: React.FC<ProviderSelectionProps> = ({
  providers: providersOverride,
  quotes,
  quotesLoading,
  quotesError,
  showQuotes = true,
  showBackButton = true,
  ordersProviders = [],
  onBack,
  onProviderSelect,
}) => {
  const {
    userRegion,
    selectedToken,
    selectedProvider,
    selectedPaymentMethod,
    providers: controllerProviders,
  } = useRampsController();

  const providers = providersOverride ?? controllerProviders;
  const { formatToken, formatCurrency } = useFormatters();

  const currency = userRegion?.country?.currency ?? 'USD';
  const symbol = selectedToken?.symbol ?? '';

  const hasSuccessfulQuotes = (quotes?.success?.length ?? 0) > 0;
  const displayQuotes = showQuotes && (quotesLoading || hasSuccessfulQuotes);

  const sortedListItems = useMemo((): ProviderListItem[] => {
    if (!displayQuotes || !quotes || quotesLoading) {
      return providers.map((provider) => ({ type: 'provider', provider }));
    }

    const sortOrder =
      quotes.sorted?.find((s) => s.sortBy === 'reliability')?.ids ??
      quotes.sorted?.[0]?.ids;

    const providersWithQuotes: Provider[] = [];
    const providersWithoutQuotes: Provider[] = [];

    for (const provider of providers) {
      const hasQuote = quotes.success?.some((q) => q.provider === provider.id);
      if (hasQuote) {
        providersWithQuotes.push(provider);
      } else {
        providersWithoutQuotes.push(provider);
      }
    }

    if (sortOrder) {
      const orderMap = new Map(sortOrder.map((id, index) => [id, index]));
      providersWithQuotes.sort(
        (a, b) =>
          (orderMap.get(a.id) ?? sortOrder.length) -
          (orderMap.get(b.id) ?? sortOrder.length),
      );
    }

    providersWithoutQuotes.sort((a, b) => a.name.localeCompare(b.name));

    const items: ProviderListItem[] = providersWithQuotes.map((provider) => ({
      type: 'provider',
      provider,
    }));

    if (providersWithQuotes.length > 0 && providersWithoutQuotes.length > 0) {
      items.push({ type: 'separator' });
    }

    for (const provider of providersWithoutQuotes) {
      items.push({ type: 'provider', provider });
    }

    return items;
  }, [providers, quotes, quotesLoading, displayQuotes]);

  const handleProviderSelect = useCallback(
    (provider: Provider, _matchedQuote: Quote | null) => {
      onProviderSelect(provider);
    },
    [onProviderSelect],
  );

  const renderItem = useCallback(
    ({ item }: { item: ProviderListItem }) => {
      if (item.type === 'separator') {
        return <SeparatorItem />;
      }

      const { provider } = item;
      const isCustomActionQuote = (q: Quote) =>
        Boolean((q.quote as { isCustomAction?: boolean })?.isCustomAction);
      const matchedQuote =
        quotes?.success?.find(
          (q) =>
            q.provider === provider.id &&
            (!selectedPaymentMethod ||
              q.quote?.paymentMethod === selectedPaymentMethod.id) &&
            !isCustomActionQuote(q),
        ) ??
        quotes?.success?.find(
          (q) => q.provider === provider.id && !isCustomActionQuote(q),
        ) ??
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
      const tag = displayQuotes
        ? getProviderTag(provider.id, matchedQuote, ordersProviders)
        : null;

      return (
        <ListItemSelect
          isSelected={isSelected}
          onPress={() => handleProviderSelect(provider, matchedQuote)}
          accessibilityRole="button"
          accessible
        >
          <ListItemColumn widthType={WidthType.Fill}>
            <Text variant={TextVariant.BodyLg} fontWeight={FontWeight.Medium}>
              {provider.name}
            </Text>
            {tag ? (
              <Text
                variant={TextVariant.BodySm}
                color={TextColor.TextAlternative}
              >
                {tag}
              </Text>
            ) : null}
          </ListItemColumn>
          {displayQuotes && matchedQuote ? (
            <ListItemColumn widthType={WidthType.Auto}>
              <QuoteDisplay
                cryptoAmount={cryptoAmount}
                fiatAmount={fiatAmount}
              />
            </ListItemColumn>
          ) : null}
        </ListItemSelect>
      );
    },
    [
      quotes,
      symbol,
      currency,
      selectedProvider,
      selectedPaymentMethod,
      displayQuotes,
      ordersProviders,
      handleProviderSelect,
      formatToken,
      formatCurrency,
    ],
  );

  const keyExtractor = useCallback(
    (item: ProviderListItem, index: number) =>
      item.type === 'separator' ? `separator-${index}` : item.provider.id,
    [],
  );

  if (providers.length === 0) {
    return (
      <Box twClassName="flex-1 min-h-0">
        <HeaderCompactStandard
          title={strings('fiat_on_ramp.providers')}
          onBack={showBackButton ? onBack : undefined}
        />
        <Box twClassName="flex-1 px-4">
          <PaymentSelectionAlert
            message={
              showQuotes
                ? strings('fiat_on_ramp.no_quotes_available')
                : strings('fiat_on_ramp_aggregator.no_providers_available')
            }
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
        onBack={showBackButton ? onBack : undefined}
      />
      {displayQuotes && selectedPaymentMethod ? (
        <PaymentMethodBanner
          paymentMethodName={selectedPaymentMethod.name}
          paymentType={selectedPaymentMethod.paymentType}
        />
      ) : null}
      {quotesError ? (
        <Box twClassName="px-4">
          <PaymentSelectionAlert
            message={quotesError}
            severity={BannerAlertSeverity.Error}
          />
        </Box>
      ) : null}
      {displayQuotes && quotesLoading ? (
        <ProviderListSkeleton />
      ) : (
        <FlatList
          style={styles.list}
          data={sortedListItems}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          keyboardDismissMode="none"
          keyboardShouldPersistTaps="always"
        />
      )}
    </Box>
  );
};

export default ProviderSelection;
