import React, {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Animated,
  ScrollView,
  RefreshControl,
  Pressable,
  useWindowDimensions,
  View,
} from 'react-native';
import Svg, { Defs, Rect, Stop, RadialGradient } from 'react-native-svg';
import {
  Box,
  Text,
  TextVariant,
  TextColor,
  BoxAlignItems,
  BoxJustifyContent,
  BoxFlexDirection,
  Icon,
  IconName,
  IconSize,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useNavigation } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import { useAnalytics } from '../../hooks/useAnalytics/useAnalytics';
import { useTheme } from '../../../util/theme';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { useBalanceBreakdown } from './hooks/useBalanceBreakdown';
import BreakdownDonutChart from './components/BreakdownDonutChart/BreakdownDonutChart';
import BreakdownHeroValue from './components/BreakdownHeroValue/BreakdownHeroValue';
import BreakdownLegend from './components/BreakdownLegend/BreakdownLegend';
import BreakdownDrilldownList from './components/BreakdownDrilldownList/BreakdownDrilldownList';
import BreakdownActionFooter from './components/BreakdownActionFooter/BreakdownActionFooter';
import { predictQueries } from '../../UI/Predict/queries';
import { getEvmAccountFromSelectedAccountGroup } from '../../UI/Predict/utils/accounts';
import Engine from '../../../core/Engine';
import type { SliceKey } from './types';
import { BalanceBreakdownTestIds } from './BalanceBreakdown.testIds';
import { getBalanceBreakdownSliceColors } from './utils/getBalanceBreakdownSliceColors';
import {
  balanceBreakdownViewStyles,
  balanceBreakdownTopGlowContainerStyle,
  balanceBreakdownDrillContentAnimStyle,
  balanceBreakdownDrillHeaderSwatchStyle,
  topGlowSvgLayerFill,
} from './BalanceBreakdownView.styles';
import {
  DONUT_CHART_SIZE,
  DONUT_RADIUS,
  DONUT_STROKE_WIDTH,
  DRILLDOWN_CONTENT_ENTER_MS,
  DRILLDOWN_CONTENT_EXIT_MS,
  DRILLDOWN_CONTENT_OFFSET_Y,
  DRILLDOWN_GLOW_CROSSFADE_MS,
  getBalanceBreakdownHeroValueMaxWidth,
} from './constants';

/** Radial glow radius as a fraction of screen width (smaller = tighter spotlight at top center). */
const TOP_GLOW_RADIUS_X_SCREEN = 0.7;

interface TopGlowLayerProps {
  color: string;
  gradientId: string;
  width: number;
  height: number;
  cx: number;
  r: number;
  opacityStyle: {
    opacity: Animated.Value | Animated.AnimatedInterpolation<number>;
  };
}

const TopGlowSvgLayer: React.FC<TopGlowLayerProps> = ({
  color,
  gradientId,
  width,
  height,
  cx,
  r,
  opacityStyle,
}) => (
  <Animated.View
    pointerEvents="none"
    style={[topGlowSvgLayerFill, opacityStyle]}
  >
    <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <Defs>
        <RadialGradient
          id={gradientId}
          gradientUnits="userSpaceOnUse"
          cx={cx}
          cy={0}
          r={r}
          fx={cx}
          fy={0}
        >
          <Stop offset="0" stopColor={color} stopOpacity={0.44} />
          <Stop offset="0.55" stopColor={color} stopOpacity={0.1} />
          <Stop offset="1" stopColor={color} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Rect width={width} height={height} fill={`url(#${gradientId})`} />
    </Svg>
  </Animated.View>
);

const BalanceBreakdownView: React.FC = () => {
  const tw = useTailwind();
  const { colors } = useTheme();
  const glowIdBase = useId().replace(/:/g, '');
  const { height: windowHeight, width: windowWidth } = useWindowDimensions();
  const navigation = useNavigation();
  const queryClient = useQueryClient();

  const [selectedSlice, setSelectedSlice] = useState<SliceKey | 'all'>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const themeSliceColors = useMemo(
    () => getBalanceBreakdownSliceColors(colors),
    [colors],
  );

  const [drillDisplayKey, setDrillDisplayKey] = useState<SliceKey | null>(null);
  const [glowBottom, setGlowBottom] = useState(themeSliceColors.tokens);
  const [glowTop, setGlowTop] = useState(themeSliceColors.tokens);

  const drillOpacity = useRef(new Animated.Value(1)).current;
  const drillTy = useRef(new Animated.Value(0)).current;
  const legendOpacity = useRef(new Animated.Value(1)).current;
  const legendTy = useRef(new Animated.Value(0)).current;
  const drillAnimSession = useRef(0);
  const prevSelectedSliceRef = useRef<SliceKey | 'all'>('all');

  const glowBlendAnim = useRef(new Animated.Value(1)).current;
  const prevGlowColorRef = useRef<string | null>(null);
  const glowAnimSession = useRef(0);

  const glowBottomOpacity = glowBlendAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });
  const glowTopOpacity = glowBlendAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const { hero, slices, warnings } = useBalanceBreakdown();
  const { trackEvent, createEventBuilder } = useAnalytics();

  useEffect(() => {
    trackEvent(
      createEventBuilder(MetaMetricsEvents.BALANCE_BREAKDOWN_OPENED).build(),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSlicePress = useCallback(
    (key: SliceKey) => {
      setSelectedSlice((prev) => {
        const next = prev === key ? 'all' : key;
        if (next !== 'all') {
          trackEvent(
            createEventBuilder(MetaMetricsEvents.BALANCE_BREAKDOWN_SLICE_TAPPED)
              .addProperties({
                slice: key,
                value_fiat: slices[key]?.valueFiat,
                percent_of_total: slices[key]?.percentOfTotal,
              })
              .build(),
          );
        }
        return next;
      });
    },
    [createEventBuilder, slices, trackEvent],
  );

  const handleLegendPress = useCallback(
    (key: SliceKey | 'all') => {
      setSelectedSlice(key);
      if (key !== 'all') {
        trackEvent(
          createEventBuilder(MetaMetricsEvents.BALANCE_BREAKDOWN_SLICE_TAPPED)
            .addProperties({
              slice: key,
              source: 'legend',
              value_fiat: slices[key]?.valueFiat,
              percent_of_total: slices[key]?.percentOfTotal,
            })
            .build(),
        );
      }
    },
    [createEventBuilder, slices, trackEvent],
  );

  const handleCloseDrilldown = useCallback(() => {
    setSelectedSlice('all');
  }, []);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await Engine.context.DeFiPositionsController?._executePoll?.().catch(
        () => undefined,
      );

      const evmAccount = getEvmAccountFromSelectedAccountGroup();
      const address = evmAccount?.address ?? '0x0';
      await Promise.allSettled([
        queryClient.invalidateQueries({
          queryKey: predictQueries.balance.options({ address }).queryKey,
        }),
        queryClient.invalidateQueries({
          queryKey: predictQueries.positions.options({ address }).queryKey,
        }),
        queryClient.invalidateQueries({
          queryKey: predictQueries.unrealizedPnL.options({ address }).queryKey,
        }),
      ]);
    } finally {
      setIsRefreshing(false);
    }
  }, [queryClient]);

  const selectedSliceData =
    selectedSlice !== 'all' ? slices[selectedSlice] : undefined;

  const showDrilldown = selectedSlice !== 'all' && selectedSliceData;
  const showMultiEvmWarning = warnings.includes('multi_evm_undercount');

  useEffect(() => {
    if (!showDrilldown) {
      const t = themeSliceColors.tokens;
      setGlowBottom(t);
      setGlowTop(t);
    }
  }, [showDrilldown, themeSliceColors.tokens]);

  const topGlowHeight = Math.min(300, Math.round(windowHeight * 0.4));
  const glowR = windowWidth * TOP_GLOW_RADIUS_X_SCREEN;
  const glowCx = windowWidth / 2;

  const drillRenderKey: SliceKey | null =
    selectedSlice === 'all'
      ? drillDisplayKey
      : drillDisplayKey ?? selectedSlice;

  const drillRenderSlice =
    drillRenderKey !== null ? slices[drillRenderKey] : undefined;

  /** Legend only participates in flex layout on the overview screen (matches pre-animation behavior). */
  const legendReservesLayoutSpace =
    selectedSlice === 'all' && drillDisplayKey === null;

  const isDrillBootstrap =
    selectedSlice !== 'all' &&
    drillDisplayKey === null &&
    drillRenderKey !== null;

  useLayoutEffect(() => {
    const prev = prevSelectedSliceRef.current;
    const cur = selectedSlice;
    prevSelectedSliceRef.current = cur;

    if (cur === 'all' && prev !== 'all') {
      drillAnimSession.current += 1;
      const session = drillAnimSession.current;
      drillOpacity.stopAnimation();
      drillTy.stopAnimation();
      legendOpacity.stopAnimation();
      legendTy.stopAnimation();
      Animated.parallel([
        Animated.timing(drillOpacity, {
          toValue: 0,
          duration: DRILLDOWN_CONTENT_EXIT_MS,
          useNativeDriver: true,
        }),
        Animated.timing(drillTy, {
          toValue: -DRILLDOWN_CONTENT_OFFSET_Y,
          duration: DRILLDOWN_CONTENT_EXIT_MS,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (!finished || session !== drillAnimSession.current) {
          return;
        }
        setDrillDisplayKey(null);
        drillTy.setValue(0);
        drillOpacity.setValue(1);
        legendOpacity.setValue(0);
        legendTy.setValue(DRILLDOWN_CONTENT_OFFSET_Y);
        Animated.parallel([
          Animated.timing(legendOpacity, {
            toValue: 1,
            duration: DRILLDOWN_CONTENT_ENTER_MS,
            useNativeDriver: true,
          }),
          Animated.timing(legendTy, {
            toValue: 0,
            duration: DRILLDOWN_CONTENT_ENTER_MS,
            useNativeDriver: true,
          }),
        ]).start();
      });
      return;
    }

    if (cur !== 'all' && prev === 'all') {
      drillAnimSession.current += 1;
      drillOpacity.stopAnimation();
      drillTy.stopAnimation();
      legendOpacity.stopAnimation();
      legendTy.stopAnimation();
      setDrillDisplayKey(cur);
      drillOpacity.setValue(0);
      drillTy.setValue(DRILLDOWN_CONTENT_OFFSET_Y);
      Animated.parallel([
        Animated.timing(legendOpacity, {
          toValue: 0,
          duration: DRILLDOWN_CONTENT_EXIT_MS,
          useNativeDriver: true,
        }),
        Animated.timing(legendTy, {
          toValue: -DRILLDOWN_CONTENT_OFFSET_Y,
          duration: DRILLDOWN_CONTENT_EXIT_MS,
          useNativeDriver: true,
        }),
      ]).start();
      Animated.parallel([
        Animated.timing(drillOpacity, {
          toValue: 1,
          duration: DRILLDOWN_CONTENT_ENTER_MS,
          useNativeDriver: true,
        }),
        Animated.timing(drillTy, {
          toValue: 0,
          duration: DRILLDOWN_CONTENT_ENTER_MS,
          useNativeDriver: true,
        }),
      ]).start();
      return;
    }

    if (cur !== 'all' && prev !== 'all' && cur !== prev) {
      drillAnimSession.current += 1;
      const session = drillAnimSession.current;
      drillOpacity.stopAnimation();
      drillTy.stopAnimation();
      Animated.parallel([
        Animated.timing(drillOpacity, {
          toValue: 0,
          duration: DRILLDOWN_CONTENT_EXIT_MS,
          useNativeDriver: true,
        }),
        Animated.timing(drillTy, {
          toValue: -DRILLDOWN_CONTENT_OFFSET_Y,
          duration: DRILLDOWN_CONTENT_EXIT_MS,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (!finished || session !== drillAnimSession.current) {
          return;
        }
        setDrillDisplayKey(cur);
        drillOpacity.setValue(0);
        drillTy.setValue(DRILLDOWN_CONTENT_OFFSET_Y);
        Animated.parallel([
          Animated.timing(drillOpacity, {
            toValue: 1,
            duration: DRILLDOWN_CONTENT_ENTER_MS,
            useNativeDriver: true,
          }),
          Animated.timing(drillTy, {
            toValue: 0,
            duration: DRILLDOWN_CONTENT_ENTER_MS,
            useNativeDriver: true,
          }),
        ]).start();
      });
    }
  }, [
    selectedSlice,
    drillOpacity,
    drillTy,
    legendOpacity,
    legendTy,
  ]);

  useLayoutEffect(() => {
    if (!showDrilldown || !selectedSliceData) {
      prevGlowColorRef.current = null;
      glowAnimSession.current += 1;
      glowBlendAnim.stopAnimation();
      glowBlendAnim.setValue(1);
      return;
    }

    const next = selectedSliceData.color;
    const prev = prevGlowColorRef.current;

    if (prev === null) {
      prevGlowColorRef.current = next;
      setGlowBottom(next);
      setGlowTop(next);
      glowBlendAnim.setValue(1);
      return;
    }

    if (prev === next) {
      return;
    }

    glowAnimSession.current += 1;
    const session = glowAnimSession.current;
    glowBlendAnim.stopAnimation();
    setGlowBottom(prev);
    setGlowTop(next);
    glowBlendAnim.setValue(0);
    prevGlowColorRef.current = next;

    Animated.timing(glowBlendAnim, {
      toValue: 1,
      duration: DRILLDOWN_GLOW_CROSSFADE_MS,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (!finished || session !== glowAnimSession.current) {
        return;
      }
      setGlowBottom(next);
      setGlowTop(next);
    });
  }, [showDrilldown, selectedSliceData, glowBlendAnim]);

  return (
    <Box
      twClassName="flex-1 bg-default"
      testID={BalanceBreakdownTestIds.CONTAINER}
    >
      <Box style={balanceBreakdownViewStyles.mainLayer}>
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          justifyContent={BoxJustifyContent.Between}
          twClassName="pt-12 px-4 pb-2"
        >
          <Pressable
            onPress={handleBack}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Icon name={IconName.ArrowLeft} size={IconSize.Md} />
          </Pressable>
          <Box twClassName="flex-1" />
          <Box twClassName="w-6" />
        </Box>

        <ScrollView
          contentContainerStyle={tw.style('pb-8')}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          <Box
            alignItems={BoxAlignItems.Center}
            justifyContent={BoxJustifyContent.Center}
            twClassName="relative my-6"
          >
            <BreakdownDonutChart
              slices={slices}
              selectedSlice={selectedSlice}
              onSlicePress={handleSlicePress}
              size={DONUT_CHART_SIZE}
              radius={DONUT_RADIUS}
              strokeWidth={DONUT_STROKE_WIDTH}
            />

            <Box
              twClassName="absolute"
              alignItems={BoxAlignItems.Center}
              justifyContent={BoxJustifyContent.Center}
            >
              <Pressable
                onPress={() => setSelectedSlice('all')}
                accessibilityRole="button"
                accessibilityLabel="Reset to total balance"
                testID={BalanceBreakdownTestIds.RESET_OVERVIEW}
              >
                <BreakdownHeroValue
                  hero={hero}
                  selectedSlice={selectedSlice}
                  selectedSliceData={selectedSliceData}
                  maxValueWidth={getBalanceBreakdownHeroValueMaxWidth()}
                />
              </Pressable>
            </Box>
          </Box>

          {showMultiEvmWarning && (
            <Box
              twClassName="mx-4 mb-4 px-3 py-2 rounded-lg bg-warning-muted"
              testID={BalanceBreakdownTestIds.WARNING_BANNER}
            >
              <Text
                variant={TextVariant.BodySm}
                color={TextColor.WarningDefault}
              >
                Showing primary account only. Some balances may be incomplete.
              </Text>
            </Box>
          )}

          {drillRenderKey !== null && drillRenderSlice ? (
            <Animated.View
              style={[
                balanceBreakdownViewStyles.drillAnimWrap,
                balanceBreakdownViewStyles.drillContentLayer,
                isDrillBootstrap
                  ? balanceBreakdownViewStyles.drillBootstrap
                  : balanceBreakdownDrillContentAnimStyle(drillOpacity, drillTy),
              ]}
            >
              <Box
                flexDirection={BoxFlexDirection.Row}
                alignItems={BoxAlignItems.Center}
                justifyContent={BoxJustifyContent.Between}
                twClassName="px-4 mb-4"
              >
                <Box
                  flexDirection={BoxFlexDirection.Row}
                  alignItems={BoxAlignItems.Center}
                  gap={2}
                  twClassName="flex-1 min-w-0"
                >
                  <Box
                    twClassName="w-3 h-3 rounded-sm shrink-0"
                    style={balanceBreakdownDrillHeaderSwatchStyle(
                      drillRenderSlice.color,
                    )}
                  />
                  <Text
                    variant={TextVariant.HeadingSm}
                    numberOfLines={1}
                    twClassName="flex-1 min-w-0"
                  >
                    {drillRenderSlice.label}
                  </Text>
                </Box>
                <Box
                  flexDirection={BoxFlexDirection.Row}
                  alignItems={BoxAlignItems.Center}
                  gap={4}
                >
                  <Icon name={IconName.Coin} size={IconSize.Md} />
                  <Pressable
                    onPress={handleCloseDrilldown}
                    accessibilityRole="button"
                    accessibilityLabel="Back to portfolio breakdown"
                  >
                    <Icon name={IconName.Close} size={IconSize.Md} />
                  </Pressable>
                </Box>
              </Box>

              <Box twClassName="px-4">
                <BreakdownDrilldownList
                  slice={drillRenderSlice}
                  hero={hero}
                />
              </Box>

              <Box twClassName="mt-4">
                <BreakdownActionFooter selectedSlice={drillRenderKey} />
              </Box>
            </Animated.View>
          ) : null}

          <Animated.View
            style={[
              balanceBreakdownViewStyles.drillAnimWrap,
              balanceBreakdownDrillContentAnimStyle(legendOpacity, legendTy),
              !legendReservesLayoutSpace &&
                balanceBreakdownViewStyles.legendZeroLayout,
            ]}
            pointerEvents={legendReservesLayoutSpace ? 'auto' : 'none'}
          >
            <Box twClassName="px-4">
              <BreakdownLegend
                slices={slices}
                hero={hero}
                selectedSlice={selectedSlice}
                onSlicePress={handleLegendPress}
              />
            </Box>

            <Box twClassName="mt-4">
              <BreakdownActionFooter selectedSlice="all" />
            </Box>
          </Animated.View>
        </ScrollView>
      </Box>

      {showDrilldown && selectedSliceData ? (
        <View
          pointerEvents="none"
          testID={BalanceBreakdownTestIds.DRILLDOWN_TOP_GLOW}
          style={balanceBreakdownTopGlowContainerStyle(topGlowHeight)}
        >
          <TopGlowSvgLayer
            color={glowBottom}
            gradientId={`${glowIdBase}-glow-a`}
            width={windowWidth}
            height={topGlowHeight}
            cx={glowCx}
            r={glowR}
            opacityStyle={{ opacity: glowBottomOpacity }}
          />
          <TopGlowSvgLayer
            color={glowTop}
            gradientId={`${glowIdBase}-glow-b`}
            width={windowWidth}
            height={topGlowHeight}
            cx={glowCx}
            r={glowR}
            opacityStyle={{ opacity: glowTopOpacity }}
          />
        </View>
      ) : null}
    </Box>
  );
};

export default BalanceBreakdownView;
