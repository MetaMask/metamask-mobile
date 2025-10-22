import {
  NavigationProp,
  RouteProp,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import React, { useMemo, useState, useEffect } from 'react';
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
import { PredictEventValues } from '../../constants/eventNames';
import { formatPrice, formatVolume, formatAddress } from '../../utils/format';
import { PredictMarketDetailsSelectorsIDs } from '../../../../../../e2e/selectors/Predict/Predict.selectors';
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
import {
  PredictPosition,
  PredictPriceHistoryInterval,
  PredictMarketStatus,
  PredictOutcome,
  PredictOutcomeToken,
} from '../../types';
import PredictMarketOutcome from '../../components/PredictMarketOutcome';
import TabBar from '../../../../Base/TabBar';
import { usePredictPositions } from '../../hooks/usePredictPositions';
import { usePredictBalance } from '../../hooks/usePredictBalance';
import { usePredictClaim } from '../../hooks/usePredictClaim';

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
  [PredictPriceHistoryInterval.ONE_HOUR]: 5, // 5-minute resolution for 1-hour window
  [PredictPriceHistoryInterval.SIX_HOUR]: 15, // 15-minute resolution for 6-hour window
  [PredictPriceHistoryInterval.ONE_DAY]: 60, // 1-hour resolution for 1-day window
  [PredictPriceHistoryInterval.ONE_WEEK]: 240, // 4-hour resolution for 7-day window
  [PredictPriceHistoryInterval.ONE_MONTH]: 720, // 12-hour resolution for month-long window
  [PredictPriceHistoryInterval.MAX]: 1440, // 24-hour resolution for max window
};

const MULTI_CHART_COLORS = ['#4459FF', '#CA3542', '#F0B034'] as const;

interface PredictMarketDetailsProps {}

const PredictMarketDetails: React.FC<PredictMarketDetailsProps> = () => {
  const navigation =
    useNavigation<NavigationProp<PredictNavigationParamList>>();
  const { colors } = useTheme();
  const { navigate } = useNavigation();
  const { claim } = usePredictClaim();
  const route =
    useRoute<RouteProp<PredictNavigationParamList, 'PredictMarketDetails'>>();
  const tw = useTailwind();
  const [selectedTimeframe, setSelectedTimeframe] =
    useState<PredictPriceHistoryInterval>(PredictPriceHistoryInterval.ONE_DAY);
  const insets = useSafeAreaInsets();
  const { hasNoBalance } = usePredictBalance();

  const { marketId } = route.params || {};
  const resolvedMarketId = marketId;
  const providerId = 'polymarket';

  const { market, isFetching: isMarketFetching } = usePredictMarket({
    id: resolvedMarketId,
    providerId,
    enabled: Boolean(resolvedMarketId),
  });

  const claimable = market?.status === PredictMarketStatus.CLOSED;

  const { positions } = usePredictPositions({
    marketId: resolvedMarketId,
    claimable: claimable && !isMarketFetching,
  });

  useEffect(() => {
    // if market is closed
    if (market?.status === PredictMarketStatus.CLOSED) {
      // set the setSelectedTimeframe to PredictPriceHistoryInterval.MAX
      setSelectedTimeframe(PredictPriceHistoryInterval.MAX);
    }
  }, [market?.status]);

  const { winningOutcomeToken, losingOutcomeToken, resolutionStatus } =
    useMemo(() => {
      // early return if no market or outcomes
      if (!market?.outcomes?.length) {
        return {
          winningOutcomeToken: undefined,
          losingOutcomeToken: undefined,
          resolutionStatus: undefined,
        };
      }

      let winningToken: PredictOutcomeToken | undefined;
      let losingToken: PredictOutcomeToken | undefined;
      let winningOutcome: PredictOutcome | undefined;

      // single iteration through outcomes to find winning/losing tokens and outcome
      for (const outcome of market.outcomes) {
        if (!outcome.tokens?.length) continue;

        for (const token of outcome.tokens) {
          if (token.price === 1 && !winningToken) {
            winningToken = token;
            winningOutcome = outcome;
          } else if (token.price === 0 && !losingToken) {
            losingToken = token;
          }
        }

        // early exit if we found both tokens
        if (winningToken && losingToken) break;
      }

      return {
        winningOutcomeToken: winningToken,
        losingOutcomeToken: losingToken,
        resolutionStatus: winningOutcome?.resolutionStatus,
      };
    }, [market]);

  // Determine the winning outcome (the outcome that contains the winning token)
  const winningOutcome = useMemo(
    () =>
      winningOutcomeToken
        ? market?.outcomes.find((outcome) =>
            outcome.tokens.some((token) => token.id === winningOutcomeToken.id),
          )
        : undefined,
    [market?.outcomes, winningOutcomeToken],
  );

  const losingOutcome = useMemo(
    () =>
      losingOutcomeToken
        ? market?.outcomes.find((outcome) =>
            outcome.tokens.some((token) => token.id === losingOutcomeToken.id),
          )
        : undefined,
    [market?.outcomes, losingOutcomeToken],
  );

  const position: PredictPosition[] = positions;
  const currentPosition = position[0];

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
    const outcome = market?.outcomes.find(
      (o) => o.id === currentPosition?.outcomeId,
    );
    navigate(Routes.PREDICT.MODALS.ROOT, {
      screen: Routes.PREDICT.MODALS.SELL_PREVIEW,
      params: { position: currentPosition, outcome },
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

  const handleYesPress = () => {
    if (hasNoBalance) {
      navigation.navigate(Routes.PREDICT.MODALS.ROOT, {
        screen: Routes.PREDICT.MODALS.ADD_FUNDS_SHEET,
      });
      return;
    }
    navigation.navigate(Routes.PREDICT.MODALS.ROOT, {
      screen: Routes.PREDICT.MODALS.BUY_PREVIEW,
      params: {
        market,
        outcome: market?.outcomes?.[0],
        outcomeToken: market?.outcomes?.[0]?.tokens?.[0],
        entryPoint: PredictEventValues.ENTRY_POINT.PREDICT_MARKET_DETAILS,
      },
    });
  };

  const handleNoPress = () => {
    if (hasNoBalance) {
      navigation.navigate(Routes.PREDICT.MODALS.ROOT, {
        screen: Routes.PREDICT.MODALS.ADD_FUNDS_SHEET,
      });
      return;
    }
    navigation.navigate(Routes.PREDICT.MODALS.ROOT, {
      screen: Routes.PREDICT.MODALS.BUY_PREVIEW,
      params: {
        market,
        outcome: market?.outcomes?.[0],
        outcomeToken: market?.outcomes?.[0]?.tokens?.[1],
        entryPoint: PredictEventValues.ENTRY_POINT.PREDICT_MARKET_DETAILS,
      },
    });
  };

  const handleClaimPress = async () => {
    await claim();
  };

  const renderHeader = () => (
    <Box twClassName="flex-row items-center gap-3">
      <Pressable
        onPress={handleBackPress}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel={strings('back')}
        style={tw.style('items-center justify-center rounded-full w-10 h-10')}
        testID={PredictMarketDetailsSelectorsIDs.BACK_BUTTON}
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
            (isMarketFetching ? strings('predict.loading') : '')}
        </Text>
      </Box>
    </Box>
  );

  const renderMarketStatus = () => (
    <Box twClassName="pt-4 gap-2">
      <Box flexDirection={BoxFlexDirection.Column} twClassName="gap-2">
        {winningOutcomeToken && (
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            twClassName="gap-2"
          >
            {resolutionStatus === 'resolved' ? (
              <>
                <Icon
                  name={IconName.CheckBold}
                  size={IconSize.Md}
                  color={colors.text.alternative}
                />
                <Text
                  variant={TextVariant.BodyMDMedium}
                  color={TextColor.Alternative}
                >
                  {strings('predict.market_details.market_resulted_to', {
                    outcome: winningOutcomeToken.title,
                  })}
                </Text>
              </>
            ) : (
              <>
                <Icon
                  name={IconName.CheckBold}
                  size={IconSize.Md}
                  color={colors.text.alternative}
                />
                <Text
                  variant={TextVariant.BodyMDMedium}
                  color={TextColor.Alternative}
                >
                  {strings('predict.market_details.market_ended_on', {
                    outcome: winningOutcomeToken.title,
                  })}
                </Text>
              </>
            )}
          </Box>
        )}
        {market?.status === PredictMarketStatus.CLOSED &&
          resolutionStatus !== 'resolved' && (
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              twClassName="gap-2"
            >
              <Icon
                name={IconName.Clock}
                size={IconSize.Md}
                color={colors.text.default}
              />
              <Text
                variant={TextVariant.BodyMDMedium}
                color={TextColor.Default}
              >
                {strings('predict.market_details.waiting_for_final_resolution')}
              </Text>
            </Box>
          )}
      </Box>
    </Box>
  );

  const renderPositionsSection = () => {
    const outcome = market?.outcomes.find(
      (o) => o.id === currentPosition?.outcomeId,
    );

    const outcomeTitle = outcome?.groupItemTitle
      ? outcome?.groupItemTitle
      : currentPosition?.outcome;

    return position.length > 0 ? (
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
                justifyContent={BoxJustifyContent.Start}
                alignItems={BoxAlignItems.Center}
                twClassName="mb-1 gap-2"
              >
                <Text
                  variant={TextVariant.BodyMD}
                  color={TextColor.Default}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                  style={tw.style('flex-1')}
                >
                  {formatPrice(currentPosition?.initialValue ?? 0, {
                    maximumDecimals: 2,
                  })}{' '}
                  {strings('predict.market_details.on')} {outcomeTitle}
                </Text>
                <Text
                  variant={TextVariant.BodyMD}
                  color={TextColor.Default}
                  style={tw.style('shrink-0')}
                >
                  {formatPrice(currentPosition?.currentValue ?? 0, {
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
                  {formatPrice(currentPosition?.avgPrice ?? 0, {
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
            testID={
              PredictMarketDetailsSelectorsIDs.MARKET_DETAILS_CASH_OUT_BUTTON
            }
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
          {strings('predict.market_details.no_positions_found')}
        </Text>
      </Box>
    );
  };

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
            {strings('predict.market_details.volume')}
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
            {strings('predict.market_details.end_date')}
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
            {strings('predict.market_details.resolver')}
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
              {isMarketFetching || !market?.outcomes[0]?.resolvedBy
                ? strings('predict.loading')
                : formatAddress(market.outcomes[0].resolvedBy)}
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
        twClassName="gap-3 my-2 pb-2"
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
            {strings('predict.market_details.powered_by')}
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
      <Box twClassName="w-full border-t border-muted py-2" />
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        twClassName="gap-1 p-y"
      >
        <Text variant={TextVariant.BodySM} color={TextColor.Alternative}>
          {market?.description}
        </Text>
      </Box>
    </Box>
  );

  const renderActionButtons = () => (
    <>
      {market?.status === PredictMarketStatus.CLOSED ? (
        <Box
          twClassName="w-full mt-4 gap-3"
          flexDirection={BoxFlexDirection.Row}
          justifyContent={BoxJustifyContent.Between}
          alignItems={BoxAlignItems.Center}
        >
          <Button
            variant={ButtonVariants.Secondary}
            size={ButtonSize.Lg}
            width={ButtonWidthTypes.Full}
            style={tw.style('flex-1 bg-primary-default mx-4')}
            label={strings('confirm.predict_claim.button_label')}
            onPress={handleClaimPress}
          />
        </Box>
      ) : (
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
                {strings('predict.market_details.yes')} • {getYesPercentage()}¢
              </Text>
            }
            onPress={handleYesPress}
          />
          <Button
            variant={ButtonVariants.Secondary}
            size={ButtonSize.Lg}
            width={ButtonWidthTypes.Full}
            style={tw.style('flex-1 bg-error-muted')}
            label={
              <Text style={tw.style('font-bold')} color={TextColor.Error}>
                {strings('predict.market_details.no')} •{' '}
                {100 - getYesPercentage()}¢
              </Text>
            }
            onPress={handleNoPress}
          />
        </Box>
      )}
    </>
  );

  return (
    <SafeAreaView
      style={tw.style('flex-1 bg-default')}
      edges={['left', 'right', 'bottom']}
      testID={PredictMarketDetailsSelectorsIDs.SCREEN}
    >
      <Box twClassName="flex-1">
        <Box twClassName="px-3 gap-4" style={{ paddingTop: insets.top + 12 }}>
          {renderHeader()}
          {renderMarketStatus()}
          <PredictDetailsChart
            data={chartData}
            timeframes={PRICE_HISTORY_TIMEFRAMES}
            selectedTimeframe={selectedTimeframe}
            onTimeframeChange={handleTimeframeChange}
            isLoading={isFetching}
            emptyLabel={chartEmptyLabel}
          />
        </Box>
        <ScrollableTabView
          testID={PredictMarketDetailsSelectorsIDs.SCROLLABLE_TAB_VIEW}
          renderTabBar={() => (
            <TabBar
              textStyle={tw.style('text-base font-bold text-center')}
              testID={PredictMarketDetailsSelectorsIDs.TAB_BAR}
            />
          )}
          style={tw.style('flex-1 mt-2')}
          initialPage={0}
        >
          <ScrollView
            key="about"
            {...{ tabLabel: 'About' }}
            style={tw.style('flex-1')}
            contentContainerStyle={tw.style('px-3 pt-4 pb-8')}
            showsVerticalScrollIndicator={false}
            testID={PredictMarketDetailsSelectorsIDs.ABOUT_TAB}
          >
            {renderAboutSection()}
          </ScrollView>
          <ScrollView
            key="positions"
            {...{ tabLabel: 'Positions' }}
            style={tw.style('flex-1')}
            contentContainerStyle={tw.style('px-3 pt-4 pb-8')}
            showsVerticalScrollIndicator={false}
            testID={PredictMarketDetailsSelectorsIDs.POSITIONS_TAB}
          >
            {renderPositionsSection()}
          </ScrollView>
          {/* only render outcomes tab if the market has multiple outcomes or is closed */}
          {(multipleOutcomes ||
            market?.status === PredictMarketStatus.CLOSED) && (
            <ScrollView
              key="outcomes"
              {...{ tabLabel: 'Outcomes' }}
              style={tw.style('flex-1')}
              contentContainerStyle={tw.style('px-3 pt-4 pb-8')}
              showsVerticalScrollIndicator={false}
              testID={PredictMarketDetailsSelectorsIDs.OUTCOMES_TAB}
            >
              {market?.status === PredictMarketStatus.CLOSED ? (
                <Box>
                  {winningOutcome && (
                    <PredictMarketOutcome
                      market={market}
                      outcome={winningOutcome}
                      outcomeToken={winningOutcomeToken}
                      isClosed
                    />
                  )}
                  {losingOutcome && (
                    <PredictMarketOutcome
                      market={market}
                      outcome={losingOutcome}
                      outcomeToken={losingOutcomeToken}
                      isClosed
                    />
                  )}
                </Box>
              ) : (
                <Box>
                  {market?.outcomes?.map((outcome, index) => (
                    <PredictMarketOutcome
                      key={
                        outcome?.id ??
                        outcome?.tokens?.[0]?.id ??
                        outcome?.title ??
                        `outcome-${index}`
                      }
                      market={market}
                      outcome={outcome}
                    />
                  ))}
                </Box>
              )}
            </ScrollView>
          )}
        </ScrollableTabView>
      </Box>
      <Box twClassName="px-3 bg-default border-t border-muted">
        {/* only render action buttons if the market has a single outcome */}
        {/* otherwise, it's handled via the buttons within tabs */}
        {singleOutcomeMarket && renderActionButtons()}
      </Box>
    </SafeAreaView>
  );
};

export default PredictMarketDetails;
