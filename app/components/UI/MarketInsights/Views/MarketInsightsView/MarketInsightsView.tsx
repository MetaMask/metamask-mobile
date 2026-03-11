import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ScrollView,
  Linking,
  Pressable,
  Animated,
  useColorScheme,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import AlternateBackgroundAnimation from './AlternateBackgroundAnimation';
// import Rive, { Fit, Alignment } from 'rive-react-native';
// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires, import/no-commonjs
// const MarketInsightsBackgroundAnimationLight = require('../../animations/market-insights-background-light.riv');
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Hex, CaipChainId } from '@metamask/utils';
import {
  Box,
  Text,
  TextVariant,
  TextColor,
  Button,
  ButtonVariant,
  ButtonSize,
  Icon,
  IconName,
  IconSize,
  IconColor,
  BoxFlexDirection,
  BoxAlignItems,
  FontWeight,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import Routes from '../../../../../constants/navigation/Routes';
import { useMarketInsights } from '../../hooks/useMarketInsights';
import MarketInsightsTrendItem from '../../components/MarketInsightsTrendItem';
import MarketInsightsTweetCard from '../../components/MarketInsightsTweetCard';
import MarketInsightsTrendSourcesBottomSheet from '../../components/MarketInsightsTrendSourcesBottomSheet';
import { MarketInsightsSelectorsIDs } from '../../MarketInsights.testIds';
import { isSafeUrl } from '../../utils/marketInsightsFormatting';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import {
  useSwapBridgeNavigation,
  SwapBridgeNavigationLocation,
} from '../../../Bridge/hooks/useSwapBridgeNavigation';
import { NATIVE_SWAPS_TOKEN_ADDRESS } from '../../../../../constants/bridge';
import type {
  MarketInsightsTweet,
  MarketInsightsTrend,
} from '@metamask/ai-controllers';
import { selectMarketInsightsEnabled } from '../../../../../selectors/featureFlagController/marketInsights';
import { endTrace, TraceName } from '../../../../../util/trace';
import { MetaMetricsEvents } from '../../../../hooks/useMetrics';
import MarketInsightsViewSkeleton from './MarketInsightsViewSkeleton';
import MarketInsightsViewHeader from './MarketInsightsViewHeader';
import {
  ToastContext,
  ToastVariants,
} from '../../../../../component-library/components/Toast';
import { IconName as ComponentLibraryIconName } from '../../../../../component-library/components/Icons/Icon';
import { useAppThemeFromContext } from '../../../../../util/theme';
import { colorWithOpacity } from '../../../../../util/colors/colorWithOpacity';
import MarketInsightsFeedbackBottomSheet, {
  MarketInsightsFeedbackReason,
} from '../../components/MarketInsightsFeedbackBottomSheet';

const LOADING_SKELETON_DELAY_MS = 150;
const SECTION_ANIMATION_DURATION_MS = 300;
const SECTION_VERTICAL_OFFSET = 25;
const BACKGROUND_ANIMATION_HEIGHT = 77;
const BACKGROUND_FADE_HEIGHT = 36;
const SCROLL_CONTENT_FADE_HEIGHT = 32;
const SECTION_ANIMATION_DELAYS_MS = {
  topArticle: 50,
  closerLook: 130,
  whatsBeingSaid: 210,
};
interface AnimatedSectionProps {
  children: React.ReactNode;
  delay?: number;
}

const AnimatedSection: React.FC<AnimatedSectionProps> = ({
  children,
  delay = 0,
}) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(
    new Animated.Value(SECTION_VERTICAL_OFFSET),
  ).current;

  useEffect(() => {
    opacity.setValue(0);
    translateY.setValue(SECTION_VERTICAL_OFFSET);

    const animation = Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: SECTION_ANIMATION_DURATION_MS,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: SECTION_ANIMATION_DURATION_MS,
        delay,
        useNativeDriver: true,
      }),
    ]);

    animation.start();

    return () => {
      animation.stop();
    };
  }, [delay, opacity, translateY]);

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      {children}
    </Animated.View>
  );
};

interface MarketInsightsRouteParams {
  assetSymbol: string;
  caip19Id: string;
  tokenImageUrl?: string;
  /** Token address for swap navigation */
  tokenAddress?: string;
  /** Token decimals for swap navigation */
  tokenDecimals?: number;
  /** Token name for swap navigation */
  tokenName?: string;
  /** Token chainId for swap navigation */
  tokenChainId?: string;
}

/**
 * MarketInsightsView is the full-page Market Insights screen.
 * It displays the AI-generated market report including:
 * - Headline and summary
 * - "A closer look" trends section
 * - Consolidated trends sources pill
 * - "What's being said" social section
 * - Feedback row with thumbs actions
 * - Trade CTA button (navigates to Swaps with asset pre-filled)
 */
const MarketInsightsView: React.FC = () => {
  const tw = useTailwind();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const isMarketInsightsEnabled = useSelector(selectMarketInsightsEnabled);
  const route =
    useRoute<RouteProp<{ params: MarketInsightsRouteParams }, 'params'>>();
  const {
    assetSymbol,
    caip19Id,
    tokenImageUrl,
    tokenAddress,
    tokenDecimals,
    tokenName,
    tokenChainId,
  } = route.params;

  const { report, isLoading, error } = useMarketInsights(
    caip19Id,
    isMarketInsightsEnabled,
  );

  const isDarkMode = useColorScheme() === 'dark';

  const { trackEvent, createEventBuilder } = useAnalytics();
  const { toastRef } = useContext(ToastContext);
  const theme = useAppThemeFromContext();
  const hasTrackedViewRef = useRef(false);
  const [selectedTrend, setSelectedTrend] =
    useState<MarketInsightsTrend | null>(null);
  const [showLoadingSkeleton, setShowLoadingSkeleton] = useState(false);
  const loadingSkeletonTimeoutRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const [isFeedbackSheetVisible, setIsFeedbackSheetVisible] = useState(false);

  // Build BridgeToken from route params for swap navigation
  const sourceToken = useMemo(() => {
    if (!tokenChainId) return undefined;
    return {
      address: tokenAddress ?? NATIVE_SWAPS_TOKEN_ADDRESS,
      symbol: assetSymbol,
      name: tokenName,
      image: tokenImageUrl,
      decimals: tokenDecimals ?? 18,
      chainId: tokenChainId as Hex | CaipChainId,
    };
  }, [
    assetSymbol,
    tokenAddress,
    tokenDecimals,
    tokenName,
    tokenImageUrl,
    tokenChainId,
  ]);

  const { goToSwaps } = useSwapBridgeNavigation({
    location: SwapBridgeNavigationLocation.TokenView,
    sourcePage: 'MarketInsightsView',
    sourceToken,
  });

  // Collect all tweets from all trends for the "What people are saying" section
  const allTweets: MarketInsightsTweet[] = useMemo(() => {
    if (!report) return [];
    return report.trends.flatMap((trend) => trend.tweets).slice(0, 4);
  }, [report]);
  const handleBackPress = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleTweetPress = useCallback((url: string) => {
    if (isSafeUrl(url)) {
      Linking.openURL(url);
    }
  }, []);

  const handleTradePress = useCallback(() => {
    const event = createEventBuilder(
      MetaMetricsEvents.MARKET_INSIGHTS_INTERACTION,
    )
      .addProperties({
        caip19: caip19Id,
        interaction_type: 'trade',
      })
      .build();
    trackEvent(event);

    goToSwaps();
  }, [goToSwaps, trackEvent, createEventBuilder, caip19Id]);

  const handleTrendPress = useCallback((trend: MarketInsightsTrend) => {
    const hasArticles = trend.articles.length > 0;
    const hasTweets = (trend.tweets?.length ?? 0) > 0;
    if (!hasArticles && !hasTweets) {
      return;
    }
    setSelectedTrend(trend);
  }, []);

  const handleCloseTrendSources = useCallback(() => {
    setSelectedTrend(null);
  }, []);

  useEffect(() => {
    if (loadingSkeletonTimeoutRef.current) {
      clearTimeout(loadingSkeletonTimeoutRef.current);
      loadingSkeletonTimeoutRef.current = null;
    }

    if (isLoading && !report) {
      loadingSkeletonTimeoutRef.current = setTimeout(() => {
        setShowLoadingSkeleton(true);
      }, LOADING_SKELETON_DELAY_MS);
      return;
    }

    setShowLoadingSkeleton(false);
  }, [isLoading, report, error]);

  useEffect(
    () => () => {
      if (loadingSkeletonTimeoutRef.current) {
        clearTimeout(loadingSkeletonTimeoutRef.current);
      }
    },
    [],
  );
  const trackMarketInsightsInteraction = useCallback(
    (
      interactionType: 'thumbs_up' | 'thumbs_down' | 'source_click',
      options?: {
        source?: string;
        feedbackReason?: MarketInsightsFeedbackReason;
        feedbackText?: string;
      },
    ) => {
      const properties = {
        caip19: caip19Id,
        interaction_type: interactionType,
        ...(options?.source ? { source: options.source } : {}),
        ...(options?.feedbackReason
          ? { feedback_reason: options.feedbackReason }
          : {}),
        ...(options?.feedbackText
          ? { feedback_text: options.feedbackText }
          : {}),
      };
      const event = createEventBuilder(
        MetaMetricsEvents.MARKET_INSIGHTS_INTERACTION,
      )
        .addProperties(properties)
        .build();
      trackEvent(event);
    },
    [trackEvent, createEventBuilder, caip19Id],
  );

  const showFeedbackSubmittedToast = useCallback(() => {
    toastRef?.current?.showToast({
      variant: ToastVariants.Icon,
      iconName: ComponentLibraryIconName.Confirmation,
      iconColor: theme.colors.success.default,
      backgroundColor: theme.colors.background.section,
      labelOptions: [{ label: strings('market_insights.feedback_submitted') }],
      hasNoTimeout: false,
    });
  }, [toastRef, theme.colors.success.default, theme.colors.background.section]);

  useEffect(() => {
    hasTrackedViewRef.current = false;
  }, [caip19Id]);

  const handleThumbsUpPress = useCallback(() => {
    trackMarketInsightsInteraction('thumbs_up');
    showFeedbackSubmittedToast();
  }, [trackMarketInsightsInteraction, showFeedbackSubmittedToast]);

  const handleThumbsDownPress = useCallback(() => {
    setIsFeedbackSheetVisible(true);
  }, []);

  const handleCloseFeedbackSheet = useCallback(() => {
    setIsFeedbackSheetVisible(false);
  }, []);

  const handleFeedbackSubmit = useCallback(
    ({
      reason,
      feedbackText,
    }: {
      reason: MarketInsightsFeedbackReason;
      feedbackText?: string;
    }) => {
      trackMarketInsightsInteraction('thumbs_down', {
        feedbackReason: reason,
        ...(feedbackText ? { feedbackText } : {}),
      });
      setIsFeedbackSheetVisible(false);
      showFeedbackSubmittedToast();
    },
    [trackMarketInsightsInteraction, showFeedbackSubmittedToast],
  );

  const handleSourcePress = useCallback(
    (url: string) => {
      if (!isSafeUrl(url)) {
        return;
      }
      trackMarketInsightsInteraction('source_click', { source: url });
      navigation.navigate(
        Routes.BROWSER.HOME as never,
        {
          screen: Routes.BROWSER.VIEW,
          params: {
            newTabUrl: url,
            timestamp: Date.now(),
            fromTrending: true,
          },
        } as never,
      );
    },
    [trackMarketInsightsInteraction, navigation],
  );

  useEffect(() => {
    if (!report || hasTrackedViewRef.current) {
      return;
    }

    endTrace({ name: TraceName.MarketInsightsViewLoad });

    const event = createEventBuilder(MetaMetricsEvents.MARKET_INSIGHTS_VIEWED)
      .addProperties({
        caip19: caip19Id,
      })
      .build();
    trackEvent(event);
    hasTrackedViewRef.current = true;
  }, [report, caip19Id, trackEvent, createEventBuilder]);

  if (showLoadingSkeleton && !report && !error) {
    return (
      <MarketInsightsViewSkeleton
        insets={insets}
        onBackPress={handleBackPress}
      />
    );
  }

  if (!report || error) {
    return null;
  }

  return (
    <Box
      twClassName="flex-1 bg-default"
      testID={MarketInsightsSelectorsIDs.VIEW_CONTAINER}
    >
      <Box
        twClassName={`absolute top-0 left-0 right-0 overflow-hidden h-[${insets.top + BACKGROUND_ANIMATION_HEIGHT}px]`}
      >
        {isDarkMode ? (
          <AlternateBackgroundAnimation
            testID={MarketInsightsSelectorsIDs.BACKGROUND_ANIMATION}
          />
        ) : null}
        <LinearGradient
          pointerEvents="none"
          colors={[
            colorWithOpacity(theme.colors.background.default, 0),
            theme.colors.background.default,
          ]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={tw.style(
            `absolute bottom-0 left-0 right-0 h-[${BACKGROUND_FADE_HEIGHT}px]`,
          )}
        />
        {/*
        <Rive
          source={MarketInsightsBackgroundAnimationLight}
          style={tw.style('w-full h-full')}
          fit={Fit.Cover}
          alignment={Alignment.TopCenter}
          autoplay
          testID={MarketInsightsSelectorsIDs.BACKGROUND_ANIMATION}
        />
        */}
      </Box>

      <Box twClassName={`pt-[${insets.top}px]`}>
        <MarketInsightsViewHeader onBackPress={handleBackPress} />
      </Box>

      <Box twClassName="flex-1">
        <ScrollView
          style={tw.style('flex-1 bg-default')}
          contentContainerStyle={tw.style(`pt-4 pb-4`)}
          showsVerticalScrollIndicator={false}
        >
          <AnimatedSection delay={SECTION_ANIMATION_DELAYS_MS.topArticle}>
            <Box twClassName="px-4 pt-4 pb-3">
              <Text variant={TextVariant.HeadingMd}>{report.headline}</Text>
            </Box>

            <Box twClassName="px-4 pb-3">
              <Text
                variant={TextVariant.BodyMd}
                color={TextColor.TextAlternative}
              >
                {report.summary}
              </Text>
            </Box>
          </AnimatedSection>

          <AnimatedSection delay={SECTION_ANIMATION_DELAYS_MS.closerLook}>
            {/* "A closer look" section */}
            <Box twClassName="pb-6">
              {report.trends.map((trend, index) => (
                <MarketInsightsTrendItem
                  key={`trend-${index}`}
                  trend={trend}
                  onPress={() => handleTrendPress(trend)}
                  testID={`${MarketInsightsSelectorsIDs.TREND_ITEM}-${index}`}
                />
              ))}
            </Box>
          </AnimatedSection>

          {/* "What's being said" section */}
          {allTweets.length > 0 && (
            <AnimatedSection delay={SECTION_ANIMATION_DELAYS_MS.whatsBeingSaid}>
              <Box twClassName="h-4 border-t border-muted" />
              <Box twClassName="pb-6">
                <Box twClassName="px-4 py-4">
                  <Text
                    variant={TextVariant.HeadingMd}
                    fontWeight={FontWeight.Bold}
                  >
                    {strings('market_insights.whats_being_said')}
                  </Text>
                </Box>

                <Box twClassName="px-4" gap={3}>
                  {allTweets.map((tweet, index) => (
                    <MarketInsightsTweetCard
                      key={`tweet-${index}`}
                      tweet={tweet}
                      onPress={() => handleTweetPress(tweet.url)}
                      testID={`${MarketInsightsSelectorsIDs.TWEET_CARD}-${index}`}
                    />
                  ))}
                </Box>
              </Box>
            </AnimatedSection>
          )}

          <Box
            alignItems={BoxAlignItems.Center}
            twClassName="border-t border-muted px-4 pt-4"
            testID={MarketInsightsSelectorsIDs.SOURCES_FOOTER}
          >
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
            >
              <Pressable
                onPress={handleThumbsUpPress}
                style={({ pressed }) =>
                  tw.style(
                    'h-12 w-12 items-center justify-center',
                    pressed && 'opacity-70',
                  )
                }
                testID={MarketInsightsSelectorsIDs.THUMBS_UP_BUTTON}
              >
                <Icon
                  name={IconName.ThumbUp}
                  size={IconSize.Lg}
                  color={IconColor.IconAlternative}
                />
              </Pressable>
              <Pressable
                onPress={handleThumbsDownPress}
                style={({ pressed }) =>
                  tw.style(
                    'h-12 w-12 items-center justify-center',
                    pressed && 'opacity-70',
                  )
                }
                testID={MarketInsightsSelectorsIDs.THUMBS_DOWN_BUTTON}
              >
                <Icon
                  name={IconName.ThumbDown}
                  size={IconSize.Lg}
                  color={IconColor.IconAlternative}
                />
              </Pressable>
            </Box>
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.TextAlternative}
              twClassName="pt-1"
            >
              {strings('market_insights.helpful_prompt')}
            </Text>
          </Box>
        </ScrollView>

        <LinearGradient
          pointerEvents="none"
          colors={[
            theme.colors.background.default,
            colorWithOpacity(theme.colors.background.default, 0),
          ]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={tw.style(
            `absolute top-0 left-0 right-0 h-[${SCROLL_CONTENT_FADE_HEIGHT}px]`,
          )}
        />
      </Box>

      <Box
        twClassName={`border-t border-muted bg-default px-4 pt-4 pb-[${insets.bottom + 8}px]`}
      >
        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          isFullWidth
          onPress={handleTradePress}
          testID={MarketInsightsSelectorsIDs.TRADE_BUTTON}
        >
          {strings('market_insights.trade_button')}
        </Button>
        <Box twClassName="pt-3" alignItems={BoxAlignItems.Center}>
          <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
            {strings('market_insights.footer_disclaimer')}
          </Text>
        </Box>
      </Box>

      {selectedTrend ? (
        <MarketInsightsTrendSourcesBottomSheet
          isVisible
          onClose={handleCloseTrendSources}
          articles={selectedTrend.articles}
          tweets={selectedTrend.tweets ?? []}
          onSourcePress={handleSourcePress}
        />
      ) : null}

      {isFeedbackSheetVisible ? (
        <MarketInsightsFeedbackBottomSheet
          isVisible
          onClose={handleCloseFeedbackSheet}
          onSubmit={handleFeedbackSubmit}
        />
      ) : null}
    </Box>
  );
};

export default MarketInsightsView;
