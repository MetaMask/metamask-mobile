import {
  NavigationProp,
  RouteProp,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import React, { useMemo, useState } from 'react';
import { Image, Pressable, ScrollView } from 'react-native';
import ScrollableTabView from '@tommasini/react-native-scrollable-tab-view';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { strings } from '../../../../../../locales/i18n';
import Button, {
  ButtonVariants,
  ButtonSize,
  ButtonWidthTypes,
} from '../../../../../component-library/components/Buttons/Button';
import Text, {
  TextColor,
  TextVariant,
} from '../../../../../component-library/components/Texts/Text';
import Routes from '../../../../../constants/navigation/Routes';
import { useTheme } from '../../../../../util/theme';
import { PredictNavigationParamList } from '../../types/navigation';
import { formatPrice, formatVolume } from '../../utils/format';
import {
  Box,
  BoxFlexDirection,
  BoxAlignItems,
  BoxJustifyContent,
} from '@metamask/design-system-react-native';
import Icon, {
  IconName,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import PredictDetailsChart, {
  ChartSeries,
} from '../../components/PredictDetailsChart/PredictDetailsChart';
import { usePredictMarket } from '../../hooks/usePredictMarket';
import { usePredictPriceHistory } from '../../hooks/usePredictPriceHistory';
import { PredictPosition, PredictPriceHistoryInterval } from '../../types';
import PredictMarketOutcome from '../../components/PredictMarketOutcome';
import TabBar from '../../../../Base/TabBar';

const PRICE_HISTORY_TIMEFRAMES: PredictPriceHistoryInterval[] = [
  PredictPriceHistoryInterval.ONE_HOUR,
  PredictPriceHistoryInterval.SIX_HOUR,
  PredictPriceHistoryInterval.ONE_DAY,
  PredictPriceHistoryInterval.ONE_WEEK,
  PredictPriceHistoryInterval.ONE_MONTH,
  PredictPriceHistoryInterval.MAX,
];

const DEFAULT_FIDELITY_BY_INTERVAL: Partial<
  Record<PredictPriceHistoryInterval, number>
> = {
  [PredictPriceHistoryInterval.ONE_WEEK]: 30, // 30-minute resolution for 7-day window
  [PredictPriceHistoryInterval.ONE_MONTH]: 120, // 2-hour resolution for month-long window
};

const MULTI_CHART_COLORS = ['#4459FF', '#CA3542', '#F0B034'] as const;

interface PredictMarketDetailsProps {}

const PredictMarketDetails: React.FC<PredictMarketDetailsProps> = () => {
  const navigation =
    useNavigation<NavigationProp<PredictNavigationParamList>>();
  const { colors } = useTheme();
  const { navigate } = useNavigation();
  const route =
    useRoute<RouteProp<PredictNavigationParamList, 'PredictMarketDetails'>>();
  const tw = useTailwind();
  const [selectedTimeframe, setSelectedTimeframe] =
    useState<PredictPriceHistoryInterval>(PredictPriceHistoryInterval.ONE_DAY);
  const insets = useSafeAreaInsets();

  const { marketId } = route.params || {};

  const position: PredictPosition[] = [];
  const currentPosition = position[0];
  const resolvedMarketId = marketId;
  const providerId = 'polymarket';

  const { market, isFetching: isMarketFetching } = usePredictMarket({
    id: resolvedMarketId,
    providerId,
    enabled: Boolean(resolvedMarketId),
  });

  const outcomeSlices = useMemo(
    () => (market?.outcomes ?? []).slice(0, 3),
    [market?.outcomes],
  );

  const outcomeTokenIds = useMemo(
    () =>
      [0, 1, 2].map(
        (index) => outcomeSlices[index]?.tokens?.[0]?.id ?? undefined,
      ),
    [outcomeSlices],
  );

  const loadedOutcomeTokenIds = useMemo(
    () =>
      outcomeTokenIds.filter((tokenId): tokenId is string => Boolean(tokenId)),
    [outcomeTokenIds],
  );

  const hasAnyOutcomeToken = loadedOutcomeTokenIds.length > 0;
  const multipleOutcomes = loadedOutcomeTokenIds.length > 1;
  const singleOutcomeMarket = loadedOutcomeTokenIds.length === 1;

  const selectedFidelity = DEFAULT_FIDELITY_BY_INTERVAL[selectedTimeframe];

  // Use the updated hook with multiple market IDs
  const { priceHistories, isFetching, errors } = usePredictPriceHistory({
    marketIds: loadedOutcomeTokenIds,
    interval: selectedTimeframe,
    providerId,
    fidelity: selectedFidelity,
    enabled: hasAnyOutcomeToken,
  });

  // Transform data for the unified chart component
  const chartData: ChartSeries[] = useMemo(
    () =>
      loadedOutcomeTokenIds.map((_tokenId, index) => ({
        label:
          outcomeSlices[index]?.groupItemTitle ||
          outcomeSlices[index]?.title ||
          `Outcome ${index + 1}`,
        color:
          loadedOutcomeTokenIds.length === 1
            ? colors.success.default
            : MULTI_CHART_COLORS[index] ?? colors.success.default,
        data: (priceHistories[index] ?? []).map((point) => ({
          timestamp: point.timestamp,
          value: Number((point.price * 100).toFixed(2)),
        })),
      })),
    [
      loadedOutcomeTokenIds,
      outcomeSlices,
      priceHistories,
      colors.success.default,
    ],
  );

  const chartEmptyLabel = hasAnyOutcomeToken
    ? errors.find(Boolean) ?? undefined
    : '';

  const handleTimeframeChange = (timeframe: string) => {
    if (
      PRICE_HISTORY_TIMEFRAMES.includes(
        timeframe as PredictPriceHistoryInterval,
      )
    ) {
      setSelectedTimeframe(timeframe as PredictPriceHistoryInterval);
    }
  };

  const onCashOut = () => {
    navigate(Routes.PREDICT.MODALS.ROOT, {
      screen: Routes.PREDICT.MODALS.CASH_OUT,
      params: { position: currentPosition },
    });
  };

  const handleBackPress = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      // If we can't go back, navigate to the main predict screen
      navigation.navigate(Routes.PREDICT.ROOT);
    }
  };

  const getYesPercentage = (): number => {
    const firstOutcomePrice = market?.outcomes?.[0]?.tokens?.[0]?.price;
    if (typeof firstOutcomePrice === 'number') {
      return Math.round(firstOutcomePrice * 100);
    }
    return 0;
  };

  const renderHeader = () => (
    <Box twClassName="flex-row items-center gap-3 mb-6">
      <Pressable
        onPress={handleBackPress}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel={strings('back')}
        style={tw.style('items-center justify-center rounded-full w-10 h-10')}
      >
        <Icon
          name={IconName.ArrowLeft}
          size={IconSize.Md}
          color={colors.icon.default}
        />
      </Pressable>
      <Box twClassName="w-12 h-12 rounded-lg bg-muted overflow-hidden">
        {market?.image ? (
          <Image
            source={{ uri: market?.image }}
            style={tw.style('w-full h-full')}
            resizeMode="cover"
          />
        ) : (
          <Box twClassName="w-full h-full bg-muted" />
        )}
      </Box>
      <Box twClassName="flex-1">
        <Text
          variant={TextVariant.HeadingMD}
          color={TextColor.Default}
          style={tw.style('mb-1')}
        >
          {market?.title ||
            (isMarketFetching ? 'Loading...' : 'Market title unavailable')}
        </Text>
      </Box>
    </Box>
  );

  const renderCurrentPrediction = () => (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Between}
    >
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        twClassName="gap-2"
      >
        <Icon
          name={IconName.Flash}
          size={IconSize.Md}
          color={colors.text.muted}
        />
        <Text variant={TextVariant.BodyMDMedium} color={TextColor.Default}>
          Yes has a {getYesPercentage()}% chance of winning
        </Text>
      </Box>
      <Text variant={TextVariant.BodyMDMedium} color={TextColor.Success}>
        TBD
      </Text>
    </Box>
  );

  const renderPositionsSection = () =>
    position.length > 0 ? (
      <Box twClassName="space-y-4">
        {/* Cash Out Section */}
        <Box
          twClassName="bg-muted rounded-lg p-4"
          flexDirection={BoxFlexDirection.Column}
        >
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            twClassName="gap-3 mb-3"
          >
            <Box twClassName="w-8 h-8 rounded-lg bg-muted overflow-hidden">
              {currentPosition?.icon ? (
                <Image
                  source={{ uri: currentPosition?.icon }}
                  style={tw.style('w-full h-full')}
                  resizeMode="cover"
                />
              ) : (
                <Box twClassName="w-full h-full bg-muted" />
              )}
            </Box>
            <Box twClassName="flex-1">
              <Box
                flexDirection={BoxFlexDirection.Row}
                justifyContent={BoxJustifyContent.Between}
                alignItems={BoxAlignItems.Center}
                twClassName="mb-1"
              >
                <Text variant={TextVariant.BodyMD} color={TextColor.Default}>
                  ${currentPosition?.amount} on {currentPosition?.outcome}
                </Text>
                <Text variant={TextVariant.BodyMD} color={TextColor.Default}>
                  {formatPrice(currentPosition?.currentValue || 0, {
                    maximumDecimals: 2,
                  })}
                </Text>
              </Box>
              <Box
                flexDirection={BoxFlexDirection.Row}
                justifyContent={BoxJustifyContent.Between}
                alignItems={BoxAlignItems.Center}
              >
                <Text
                  variant={TextVariant.BodySM}
                  color={TextColor.Alternative}
                >
                  {currentPosition?.outcome} at{' '}
                  {formatPrice(currentPosition?.price || 0, {
                    maximumDecimals: 2,
                  })}{' '}
                  • 30 seconds ago
                </Text>
                <Text
                  variant={TextVariant.BodySM}
                  color={
                    (currentPosition?.percentPnl || 0) >= 0
                      ? TextColor.Success
                      : TextColor.Error
                  }
                >
                  {(currentPosition?.percentPnl || 0) >= 0 ? '+' : ''}
                  {(currentPosition?.percentPnl || 0).toFixed(1)}%
                </Text>
              </Box>
            </Box>
          </Box>
          <Button
            variant={ButtonVariants.Primary}
            size={ButtonSize.Lg}
            width={ButtonWidthTypes.Full}
            label="Cash out"
            onPress={onCashOut}
            style={tw.style('mt-3')}
          />
        </Box>
      </Box>
    ) : (
      <Box twClassName="space-y-4 p-4">
        <Text variant={TextVariant.BodyMDMedium} color={TextColor.Alternative}>
          No positions found.
        </Text>
      </Box>
    );

  const renderAboutSection = () => (
    <Box twClassName="space-y-6">
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Between}
        twClassName="gap-3 my-2"
      >
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          twClassName="gap-3"
        >
          <Icon
            name={IconName.Chart}
            size={IconSize.Md}
            color={colors.text.muted}
          />
          <Text variant={TextVariant.BodyMDMedium} color={TextColor.Default}>
            Volume
          </Text>
        </Box>
        <Text variant={TextVariant.BodyMDMedium} color={TextColor.Default}>
          ${formatVolume(market?.outcomes[0].volume || 0)}
        </Text>
      </Box>

      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Between}
        twClassName="gap-3 my-2"
      >
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          twClassName="gap-3"
        >
          <Icon
            name={IconName.Clock}
            size={IconSize.Md}
            color={colors.text.muted}
          />
          <Text variant={TextVariant.BodyMDMedium} color={TextColor.Default}>
            End date
          </Text>
        </Box>
        <Text variant={TextVariant.BodyMDMedium} color={TextColor.Default}>
          {market?.endDate
            ? new Date(market?.endDate).toLocaleDateString()
            : 'N/A'}
        </Text>
      </Box>

      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Between}
        twClassName="gap-3 my-2"
      >
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          twClassName="gap-3"
        >
          <Icon
            name={IconName.Bank}
            size={IconSize.Md}
            color={colors.text.muted}
          />
          <Text variant={TextVariant.BodyMDMedium} color={TextColor.Default}>
            Resolver
          </Text>
          <Text variant={TextVariant.BodyMDMedium} color={TextColor.Error}>
            UMA
          </Text>
        </Box>
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          twClassName="gap-2"
        >
          <Pressable>
            <Text variant={TextVariant.BodyMD} color={TextColor.Primary}>
              0x157...672
            </Text>
          </Pressable>
          <Icon
            name={IconName.Export}
            size={IconSize.Sm}
            color={colors.primary.default}
          />
        </Box>
      </Box>

      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Between}
        twClassName="gap-3 my-2"
      >
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          twClassName="gap-3"
        >
          <Icon
            name={IconName.Apps}
            size={IconSize.Md}
            color={colors.text.muted}
          />
          <Text variant={TextVariant.BodyMDMedium} color={TextColor.Default}>
            Powered by
          </Text>
        </Box>
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          twClassName="gap-2"
        >
          <Text variant={TextVariant.BodyMD} color={TextColor.Default}>
            {market?.providerId}
          </Text>
        </Box>
      </Box>
    </Box>
  );

  const renderActionButtons = () => (
    <Box
      flexDirection={BoxFlexDirection.Row}
      justifyContent={BoxJustifyContent.Between}
      alignItems={BoxAlignItems.Center}
      twClassName="w-full mt-4 gap-3"
    >
      <Button
        variant={ButtonVariants.Secondary}
        size={ButtonSize.Lg}
        width={ButtonWidthTypes.Full}
        style={tw.style('flex-1 bg-success-muted')}
        label={
          <Text style={tw.style('font-bold')} color={TextColor.Success}>
            Yes • {getYesPercentage()}¢
          </Text>
        }
        onPress={() => {
          // Navigate to buy flow
        }}
      />
      <Button
        variant={ButtonVariants.Secondary}
        size={ButtonSize.Lg}
        width={ButtonWidthTypes.Full}
        style={tw.style('flex-1 bg-error-muted')}
        label={
          <Text style={tw.style('font-bold')} color={TextColor.Error}>
            No • {100 - getYesPercentage()}¢
          </Text>
        }
        onPress={() => {
          // Navigate to buy flow
        }}
      />
    </Box>
  );

  return (
    <SafeAreaView
      style={tw.style('flex-1 bg-default')}
      edges={['left', 'right', 'bottom']}
      testID="predict-market-details-screen"
    >
      <ScrollView
        style={tw.style('flex-1')}
        contentContainerStyle={[
          tw.style('px-3 pb-8 gap-4'),
          { paddingTop: insets.top + 12 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {renderHeader()}
        {singleOutcomeMarket && renderCurrentPrediction()}
        <PredictDetailsChart
          data={chartData}
          timeframes={PRICE_HISTORY_TIMEFRAMES}
          selectedTimeframe={selectedTimeframe}
          onTimeframeChange={handleTimeframeChange}
          isLoading={isFetching}
          emptyLabel={chartEmptyLabel}
        />
        <ScrollableTabView
          renderTabBar={() => (
            <TabBar textStyle={tw.style('text-base font-bold text-center')} />
          )}
          style={tw.style('mt-2')}
          initialPage={0}
        >
          <Box key="about" {...{ tabLabel: 'About' }} twClassName="pt-4">
            {renderAboutSection()}
          </Box>
          <Box
            key="positions"
            {...{ tabLabel: 'Positions' }}
            twClassName="pt-4"
          >
            {renderPositionsSection()}
          </Box>
          {multipleOutcomes && (
            <Box
              key="outcomes"
              {...{ tabLabel: 'Outcomes' }}
              twClassName="pt-4"
            >
              <Box>
                {market?.outcomes?.map((outcome, index) => (
                  <PredictMarketOutcome
                    key={
                      outcome?.id ??
                      outcome?.tokens?.[0]?.id ??
                      outcome?.title ??
                      `outcome-${index}`
                    }
                    outcome={outcome}
                  />
                ))}
              </Box>
            </Box>
          )}
        </ScrollableTabView>
      </ScrollView>
      <Box twClassName="px-3 bg-default border-t border-muted">
        {singleOutcomeMarket && renderActionButtons()}
      </Box>
    </SafeAreaView>
  );
};

export default PredictMarketDetails;
