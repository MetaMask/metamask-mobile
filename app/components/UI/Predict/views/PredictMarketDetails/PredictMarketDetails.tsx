import {
  NavigationProp,
  RouteProp,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import React, { useMemo, useState, useEffect, useCallback } from 'react';
import {
  Image,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
} from 'react-native';
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
import { formatVolume, estimateLineCount } from '../../utils/format';
import Engine from '../../../../../core/Engine';
import { PredictMarketDetailsSelectorsIDs } from '../../../../../../e2e/selectors/Predict/Predict.selectors';
import {
  Box,
  BoxFlexDirection,
  BoxAlignItems,
  BoxJustifyContent,
  ButtonSize as ButtonSizeHero,
} from '@metamask/design-system-react-native';
import Icon, {
  IconName,
  IconSize,
} from '../../../../../component-library/components/Icons/Icon';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import PredictDetailsChart, {
  ChartSeries,
} from '../../components/PredictDetailsChart/PredictDetailsChart';
import PredictPositionDetail from '../../components/PredictPositionDetail';
import { usePredictMarket } from '../../hooks/usePredictMarket';
import { usePredictPriceHistory } from '../../hooks/usePredictPriceHistory';
import {
  PredictPriceHistoryInterval,
  PredictMarketStatus,
  PredictOutcome,
  PredictOutcomeToken,
} from '../../types';
import PredictMarketOutcome from '../../components/PredictMarketOutcome';
import { usePredictPositions } from '../../hooks/usePredictPositions';
import { usePredictClaim } from '../../hooks/usePredictClaim';
import { usePredictActionGuard } from '../../hooks/usePredictActionGuard';
import ButtonHero from '../../../../../component-library/components-temp/Buttons/ButtonHero';

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

// Use theme tokens instead of hex values for multi-series charts

interface PredictMarketDetailsProps {}

const PredictMarketDetails: React.FC<PredictMarketDetailsProps> = () => {
  const navigation =
    useNavigation<NavigationProp<PredictNavigationParamList>>();
  const { colors } = useTheme();
  const { claim } = usePredictClaim();
  const route =
    useRoute<RouteProp<PredictNavigationParamList, 'PredictMarketDetails'>>();
  const tw = useTailwind();
  const [selectedTimeframe, setSelectedTimeframe] =
    useState<PredictPriceHistoryInterval>(PredictPriceHistoryInterval.ONE_DAY);
  const [activeTab, setActiveTab] = useState<number | null>(null);
  const [userSelectedTab, setUserSelectedTab] = useState<boolean>(false);
  const insets = useSafeAreaInsets();
  const [isResolvedExpanded, setIsResolvedExpanded] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const { marketId, entryPoint, title, image } = route.params || {};
  const resolvedMarketId = marketId;
  const providerId = 'polymarket';

  const { executeGuardedAction } = usePredictActionGuard({
    providerId,
    navigation,
  });

  const {
    market,
    isFetching: isMarketFetching,
    refetch: refetchMarket,
  } = usePredictMarket({
    id: resolvedMarketId,
    providerId,
    enabled: Boolean(resolvedMarketId),
  });

  const titleLineCount = useMemo(
    () => estimateLineCount(title ?? market?.title),
    [title, market?.title],
  );

  const claimable = market?.status === PredictMarketStatus.CLOSED;

  const {
    positions,
    isLoading: isPositionsLoading,
    loadPositions,
  } = usePredictPositions({
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

  // Tabs become ready when both market and positions queries have resolved
  const tabsReady = useMemo(
    () => !isMarketFetching && !isPositionsLoading,
    [isMarketFetching, isPositionsLoading],
  );

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
  const multipleOpenOutcomesPartiallyResolved =
    loadedOutcomeTokenIds.length > 1 &&
    !!market?.outcomes?.some(
      (outcome) => outcome.resolutionStatus === 'resolved',
    );

  const selectedFidelity = DEFAULT_FIDELITY_BY_INTERVAL[selectedTimeframe];
  const {
    priceHistories,
    isFetching: isPriceHistoryFetching,
    errors,
    refetch: refetchPriceHistory,
  } = usePredictPriceHistory({
    marketIds: loadedOutcomeTokenIds,
    interval: selectedTimeframe,
    providerId,
    fidelity: selectedFidelity,
    enabled: hasAnyOutcomeToken,
  });

  // Transform data for the unified chart component
  const chartData: ChartSeries[] = useMemo(() => {
    const palette = [
      colors.primary.default,
      colors.error.default,
      colors.success.default,
    ];
    return loadedOutcomeTokenIds.map((_tokenId, index) => ({
      label:
        outcomeSlices[index]?.groupItemTitle ||
        outcomeSlices[index]?.title ||
        `Outcome ${index + 1}`,
      color:
        loadedOutcomeTokenIds.length === 1
          ? colors.success.default
          : (palette[index] ?? colors.success.default),
      data: (priceHistories[index] ?? []).map((point) => ({
        timestamp: point.timestamp,
        value: Number((point.price * 100).toFixed(2)),
      })),
    }));
  }, [
    loadedOutcomeTokenIds,
    outcomeSlices,
    priceHistories,
    colors.primary.default,
    colors.error.default,
    colors.success.default,
  ]);

  const chartEmptyLabel = hasAnyOutcomeToken
    ? (errors.find(Boolean) ?? undefined)
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

  const handleBuyPress = (token: PredictOutcomeToken) => {
    executeGuardedAction(
      () => {
        navigation.navigate(Routes.PREDICT.MODALS.ROOT, {
          screen: Routes.PREDICT.MODALS.BUY_PREVIEW,
          params: {
            market,
            outcome: market?.outcomes?.[0],
            outcomeToken: token,
            entryPoint: PredictEventValues.ENTRY_POINT.PREDICT_MARKET_DETAILS,
          },
        });
      },
      { checkBalance: true },
    );
  };

  const handleClaimPress = async () => {
    await executeGuardedAction(async () => {
      await claim();
    });
  };

  const handleTabPress = (tabIndex: number) => {
    if (!tabsReady) return;
    setUserSelectedTab(true);
    setActiveTab(tabIndex);
  };

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await Promise.allSettled([
      refetchMarket(),
      refetchPriceHistory(),
      loadPositions({ isRefresh: true }),
    ]);
    setIsRefreshing(false);
  }, [loadPositions, refetchMarket, refetchPriceHistory]);

  type TabKey = 'positions' | 'outcomes' | 'about';

  const trackMarketDetailsOpened = useCallback(
    (tabKey: TabKey) => {
      if (!market) return;

      Engine.context.PredictController.trackMarketDetailsOpened({
        marketId: market.id,
        marketTitle: market.title,
        marketCategory: market.category,
        marketTags: market.tags,
        entryPoint: entryPoint || PredictEventValues.ENTRY_POINT.PREDICT_FEED,
        marketDetailsViewed: tabKey,
      });
    },
    [market, entryPoint],
  );
  const tabs = useMemo(() => {
    const result: { label: string; key: TabKey }[] = [];
    // positions first if user has any
    if (positions.length > 0) {
      result.push({
        label: strings('predict.tabs.positions'),
        key: 'positions',
      });
    }
    // outcomes next if market has multiple outcomes or is closed
    if (multipleOutcomes || market?.status === PredictMarketStatus.CLOSED) {
      result.push({ label: strings('predict.tabs.outcomes'), key: 'outcomes' });
    }
    // about last (always present)
    result.push({ label: strings('predict.tabs.about'), key: 'about' });
    return result;
  }, [positions.length, multipleOutcomes, market?.status]);

  useEffect(() => {
    if (!tabsReady) return;

    const outcomesIndex = tabs.findIndex((t) => t.key === 'outcomes');

    // for closed markets, display 'outcomes' by default until the user selects a tab
    if (market?.status === PredictMarketStatus.CLOSED) {
      if (!userSelectedTab) {
        setActiveTab(outcomesIndex >= 0 ? outcomesIndex : 0);
        return;
      }
      // if user selected but current index is out of bounds after tabs change
      if (activeTab !== null && activeTab >= tabs.length) {
        setActiveTab(outcomesIndex >= 0 ? outcomesIndex : 0);
      }
      return;
    }

    // non-closed markets: initialize to first tab if not set yet
    if (activeTab === null) {
      setActiveTab(0);
      return;
    }

    // Guard against out-of-bounds when tabs change
    if (activeTab >= tabs.length) {
      setActiveTab(0);
    }
  }, [tabsReady, tabs, activeTab, market?.status, userSelectedTab]);

  // Track market details opened on initial load and tab changes
  useEffect(() => {
    if (!tabsReady || activeTab === null || !market) return;

    const tabKey = tabs[activeTab]?.key;
    if (tabKey) {
      trackMarketDetailsOpened(tabKey);
    }
  }, [market, tabsReady, activeTab, tabs, trackMarketDetailsOpened]);

  const renderCustomTabBar = () => (
    <Box
      twClassName="bg-default border-b border-muted pt-4"
      testID={PredictMarketDetailsSelectorsIDs.TAB_BAR}
    >
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        twClassName="px-3"
      >
        {tabs.map((tab, index) => (
          <Pressable
            key={tab.key}
            onPress={() => handleTabPress(index)}
            style={tw.style(
              'w-1/3 py-3',
              activeTab === index ? 'border-b-2 border-default' : '',
            )}
            testID={`${PredictMarketDetailsSelectorsIDs.TAB_BAR}-tab-${index}`}
          >
            <Text
              variant={TextVariant.BodyMDMedium}
              color={
                activeTab === index ? TextColor.Default : TextColor.Alternative
              }
              style={tw.style('text-center')}
            >
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </Box>
    </Box>
  );

  const renderHeader = () => (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Start}
      twClassName="gap-3 pb-4"
      style={{ paddingTop: insets.top + 12 }}
    >
      <Box twClassName="flex-row items-center gap-3 px-1">
        <Pressable
          onPress={handleBackPress}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={strings('back')}
          style={tw.style('items-center justify-center rounded-full')}
          testID={PredictMarketDetailsSelectorsIDs.BACK_BUTTON}
        >
          <Icon
            name={IconName.ArrowLeft}
            size={IconSize.Lg}
            color={colors.icon.default}
          />
        </Pressable>
        <Box twClassName="w-10 h-10 rounded-lg bg-muted overflow-hidden">
          {image || market?.image ? (
            <Image
              source={{ uri: image || market?.image }}
              style={tw.style('w-full h-full')}
              resizeMode="cover"
            />
          ) : (
            <Box twClassName="w-full h-full bg-muted" />
          )}
        </Box>
      </Box>
      <Box
        twClassName="flex-1 min-h-[40px]"
        justifyContent={
          titleLineCount >= 2 ? undefined : BoxJustifyContent.Center
        }
        style={titleLineCount >= 2 ? tw.style('mt-[-5px]') : undefined}
      >
        <Text variant={TextVariant.HeadingMD} color={TextColor.Default}>
          {title ||
            market?.title ||
            (isMarketFetching ? strings('predict.loading') : '')}
        </Text>
      </Box>
    </Box>
  );

  const renderMarketStatus = () => (
    <Box twClassName="gap-2">
      <Box flexDirection={BoxFlexDirection.Column} twClassName="gap-2">
        {winningOutcomeToken && !multipleOpenOutcomesPartiallyResolved && (
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
    if (positions.length > 0 && market) {
      return (
        <Box twClassName="space-y-4">
          {positions.map((position) => (
            <PredictPositionDetail
              key={position.id}
              position={position}
              market={market}
              marketStatus={market?.status as PredictMarketStatus}
            />
          ))}
        </Box>
      );
    }

    return (
      <Box twClassName="space-y-4">
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
        twClassName="gap-3 mb-2"
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
            {strings('predict.market_details.resolution_details')}
          </Text>
        </Box>
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          twClassName="gap-2"
        >
          <Pressable
            onPress={() => {
              Linking.openURL(
                'https://docs.polymarket.com/polymarket-learn/markets/how-are-markets-resolved',
              );
            }}
          >
            <Text
              variant={TextVariant.BodyMDMedium}
              color={colors.primary.default}
            >
              Polymarket
            </Text>
          </Pressable>
          <Icon
            name={IconName.Export}
            size={IconSize.Sm}
            color={colors.primary.default}
          />
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

  // see if there are any positions with positive percentPnl
  const hasPositivePnl = positions.some((position) => position.percentPnl > 0);

  const closedOutcomes = useMemo(
    () =>
      market?.outcomes?.filter((outcome) => outcome.status === 'closed') ?? [],
    [market?.outcomes],
  );
  const openOutcomes = useMemo(
    () =>
      market?.outcomes?.filter((outcome) => outcome.status === 'open') ?? [],
    [market?.outcomes],
  );

  const renderActionButtons = () => (
    <>
      {(() => {
        if (market?.status === PredictMarketStatus.CLOSED && hasPositivePnl) {
          return (
            <ButtonHero
              size={ButtonSizeHero.Lg}
              style={tw.style('w-full')}
              onPress={handleClaimPress}
            >
              <Text
                variant={TextVariant.BodyMDMedium}
                style={tw.style('text-white')}
              >
                {strings('confirm.predict_claim.button_label')}
              </Text>
            </ButtonHero>
          );
        }

        if (
          market?.status === PredictMarketStatus.OPEN &&
          singleOutcomeMarket
        ) {
          return (
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
                    {strings('predict.market_details.yes')} •{' '}
                    {getYesPercentage()}¢
                  </Text>
                }
                onPress={() => handleBuyPress(market?.outcomes[0].tokens[0])}
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
                onPress={() => handleBuyPress(market?.outcomes[0].tokens[1])}
              />
            </Box>
          );
        }

        return null;
      })()}
    </>
  );

  const renderTabContent = () => {
    if (activeTab === null || !tabsReady) {
      return null;
    }
    const currentKey = tabs[activeTab]?.key;
    if (currentKey === 'about') {
      return (
        <Box
          twClassName="px-3 pt-4 pb-8"
          testID={PredictMarketDetailsSelectorsIDs.ABOUT_TAB}
        >
          {renderAboutSection()}
        </Box>
      );
    }
    if (currentKey === 'positions') {
      return (
        <Box
          twClassName="px-3 pt-4 pb-8"
          testID={PredictMarketDetailsSelectorsIDs.POSITIONS_TAB}
        >
          {renderPositionsSection()}
        </Box>
      );
    }
    if (currentKey === 'outcomes') {
      return (
        <Box
          twClassName="px-3 pt-4 pb-8"
          testID={PredictMarketDetailsSelectorsIDs.OUTCOMES_TAB}
        >
          {market?.status === PredictMarketStatus.CLOSED &&
          singleOutcomeMarket ? (
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
          ) : market?.status === PredictMarketStatus.OPEN &&
            multipleOutcomes &&
            multipleOpenOutcomesPartiallyResolved ? (
            <Box>
              {openOutcomes.map((outcome) => (
                <PredictMarketOutcome
                  key={outcome.id}
                  market={market}
                  outcome={outcome}
                />
              ))}
              <Pressable
                onPress={() => setIsResolvedExpanded((prev) => !prev)}
                style={({ pressed }) =>
                  tw.style(
                    'w-full rounded-xl bg-default px-4 py-3 mt-2 mb-4 bg-muted',
                    pressed && 'bg-pressed',
                  )
                }
                accessibilityRole="button"
              >
                <Box
                  flexDirection={BoxFlexDirection.Row}
                  alignItems={BoxAlignItems.Center}
                  justifyContent={BoxJustifyContent.Between}
                  twClassName="gap-3"
                >
                  <Box
                    flexDirection={BoxFlexDirection.Row}
                    alignItems={BoxAlignItems.Center}
                    twClassName="gap-2"
                  >
                    <Text
                      variant={TextVariant.BodyMDMedium}
                      color={TextColor.Default}
                    >
                      {strings('predict.resolved_outcomes')}
                    </Text>
                    <Box twClassName="px-2 py-0.5 rounded bg-muted">
                      <Text
                        variant={TextVariant.BodySM}
                        color={TextColor.Alternative}
                      >
                        {closedOutcomes.length}
                      </Text>
                    </Box>
                  </Box>
                  <Icon
                    name={
                      isResolvedExpanded ? IconName.ArrowUp : IconName.ArrowDown
                    }
                    size={IconSize.Md}
                    color={colors.text.alternative}
                  />
                </Box>
                {isResolvedExpanded &&
                  closedOutcomes.map((outcome) => (
                    <Box key={outcome.id} twClassName="pt-2">
                      <Box
                        flexDirection={BoxFlexDirection.Row}
                        justifyContent={BoxJustifyContent.Between}
                        alignItems={BoxAlignItems.Center}
                        twClassName="gap-2"
                      >
                        <Box
                          flexDirection={BoxFlexDirection.Column}
                          twClassName="gap-1 mb-2"
                        >
                          <Text
                            variant={TextVariant.BodyMDMedium}
                            color={TextColor.Default}
                            numberOfLines={1}
                            ellipsizeMode="tail"
                          >
                            {outcome.groupItemTitle}
                          </Text>
                          <Text
                            variant={TextVariant.BodySMMedium}
                            color={TextColor.Alternative}
                          >
                            ${formatVolume(outcome.volume)}{' '}
                            {strings('predict.volume_abbreviated')}
                          </Text>
                        </Box>
                        <Box
                          flexDirection={BoxFlexDirection.Row}
                          alignItems={BoxAlignItems.Center}
                          twClassName="gap-1"
                        >
                          <Text
                            variant={TextVariant.BodyMDMedium}
                            color={
                              outcome.tokens[0].price > outcome.tokens[1].price
                                ? TextColor.Default
                                : TextColor.Alternative
                            }
                          >
                            {outcome.tokens[0].price > outcome.tokens[1].price
                              ? outcome.tokens[0].title
                              : outcome.tokens[1].price >
                                  outcome.tokens[0].price
                                ? outcome.tokens[1].title
                                : 'draw'}
                          </Text>
                          {outcome.tokens[0].price >
                            outcome.tokens[1].price && (
                            <Icon
                              name={IconName.Confirmation}
                              size={IconSize.Md}
                              color={TextColor.Success}
                            />
                          )}
                        </Box>
                      </Box>
                    </Box>
                  ))}
              </Pressable>
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
        </Box>
      );
    }
    return null;
  };

  return (
    <SafeAreaView
      style={tw.style('flex-1 bg-default')}
      edges={['left', 'right', 'bottom']}
      testID={PredictMarketDetailsSelectorsIDs.SCREEN}
    >
      <Box twClassName="px-3 gap-4">{renderHeader()}</Box>
      <ScrollView
        testID={PredictMarketDetailsSelectorsIDs.SCROLLABLE_TAB_VIEW}
        stickyHeaderIndices={[1]}
        showsVerticalScrollIndicator={false}
        style={tw.style('flex-1')}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary.default}
            colors={[colors.primary.default]}
          />
        }
      >
        {/* Header content - scrollable */}
        <Box twClassName="px-3 gap-4">
          {renderMarketStatus()}
          {!multipleOpenOutcomesPartiallyResolved && (
            <PredictDetailsChart
              data={chartData}
              timeframes={PRICE_HISTORY_TIMEFRAMES}
              selectedTimeframe={selectedTimeframe}
              onTimeframeChange={handleTimeframeChange}
              isLoading={isPriceHistoryFetching}
              emptyLabel={chartEmptyLabel}
            />
          )}
        </Box>

        {/* Sticky tab bar */}
        {renderCustomTabBar()}

        {/* Tab content */}
        {renderTabContent()}
      </ScrollView>

      <Box twClassName="px-3 bg-default border-t border-muted">
        {renderActionButtons()}
      </Box>
    </SafeAreaView>
  );
};

export default PredictMarketDetails;
