import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { ScrollView, Linking, Pressable, Animated, Image } from 'react-native';
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
import { MarketInsightsSourcesBottomSheet } from '../../components/MarketInsightsSourcesFooter';
import type { MarketInsightsSourceListItem } from '../../components/MarketInsightsSourcesFooter/MarketInsightsSourcesFooter.types';
import MarketInsightsTrendSourcesBottomSheet from '../../components/MarketInsightsTrendSourcesBottomSheet';
import { MarketInsightsSelectorsIDs } from '../../MarketInsights.testIds';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';
import {
  useSwapBridgeNavigation,
  SwapBridgeNavigationLocation,
} from '../../../Bridge/hooks/useSwapBridgeNavigation';
import { NATIVE_SWAPS_TOKEN_ADDRESS } from '../../../../../constants/bridge';
import type {
  MarketInsightsSource,
  MarketInsightsTweet,
  MarketInsightsTrend,
} from '@metamask/ai-controllers';
import { selectMarketInsightsEnabled } from '../../../../../selectors/featureFlagController/marketInsights';
import { endTrace, TraceName } from '../../../../../util/trace';
import { Skeleton } from '../../../../../component-library/components/Skeleton';
import { MetaMetricsEvents } from '../../../../hooks/useMetrics';
import {
  ToastContext,
  ToastVariants,
} from '../../../../../component-library/components/Toast';
import { IconName as ComponentLibraryIconName } from '../../../../../component-library/components/Icons/Icon';
import { useAppThemeFromContext } from '../../../../../util/theme';
import MarketInsightsFeedbackBottomSheet, {
  MarketInsightsFeedbackReason,
} from '../../components/MarketInsightsFeedbackBottomSheet';
import {
  getFaviconUrl,
  getUniqueSourcesByFavicon,
  isXSourceUrl,
} from '../../utils/marketInsightsFormatting';

const LOADING_SKELETON_DELAY_MS = 150;
const SECTION_ANIMATION_DURATION_MS = 300;
const SECTION_VERTICAL_OFFSET = 25;
const SECTION_ANIMATION_DELAYS_MS = {
  topArticle: 10,
  closerLook: 80,
  whatsBeingSaid: 160,
};
const MAX_VISIBLE_SOURCES = 3;

interface AnimatedSectionProps {
  children: React.ReactNode;
  delay?: number;
}

const TrendSourceIcon: React.FC<{
  source: MarketInsightsSource;
  index: number;
}> = ({ source, index }) => {
  const tw = useTailwind();

  return (
    <Box
      twClassName={`w-5 h-5 rounded-full bg-default border border-muted overflow-hidden ${
        index > 0 ? '-ml-2' : ''
      }`}
    >
      {isXSourceUrl(source.url) ? (
        <Box twClassName="w-5 h-5 items-center justify-center rounded-full">
          <Icon
            name={IconName.X}
            size={IconSize.Sm}
            color={IconColor.IconDefault}
          />
        </Box>
      ) : (
        <Image
          source={{ uri: getFaviconUrl(source.url) }}
          style={tw.style('w-4 h-4 rounded-full')}
        />
      )}
    </Box>
  );
};

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

interface MarketInsightsViewSkeletonProps {
  insets: { top: number; bottom: number };
  onBackPress: () => void;
}

const MarketInsightsViewSkeleton: React.FC<MarketInsightsViewSkeletonProps> = ({
  insets,
  onBackPress,
}) => {
  const tw = useTailwind();

  return (
    <Box
      twClassName={`flex-1 bg-default pt-[${insets.top}px]`}
      testID={MarketInsightsSelectorsIDs.VIEW_SKELETON}
    >
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        twClassName="px-1 py-2"
      >
        <Pressable onPress={onBackPress} style={tw.style('p-2')} hitSlop={8}>
          <Icon
            name={IconName.ArrowLeft}
            size={IconSize.Md}
            color={IconColor.IconDefault}
          />
        </Pressable>
        <Box twClassName="flex-1 items-center">
          <Text variant={TextVariant.HeadingSm} fontWeight={FontWeight.Bold}>
            {strings('market_insights.title')}
          </Text>
        </Box>
        <Box twClassName="w-10" />
      </Box>

      <ScrollView
        contentContainerStyle={tw.style(`pb-[${insets.bottom + 80}px]`)}
        showsVerticalScrollIndicator={false}
      >
        <Box twClassName="px-4 pt-4 pb-4">
          <Skeleton height={26} width={110} style={tw.style('rounded-full')} />
        </Box>

        <Box twClassName="px-4 pb-3" gap={2}>
          <Skeleton height={28} width="90%" />
          <Skeleton height={28} width="62%" />
        </Box>

        <Box twClassName="px-4 pb-6" gap={2}>
          <Skeleton height={16} width="94%" />
          <Skeleton height={16} width="85%" />
          <Skeleton height={16} width="88%" />
          <Skeleton height={16} width="56%" />
        </Box>

        <Box twClassName="pb-6">
          <Box twClassName="px-4 py-4">
            <Skeleton height={16} width={140} />
          </Box>

          <Box twClassName="px-4" gap={3}>
            <Skeleton height={64} width="100%" style={tw.style('rounded-xl')} />
            <Skeleton height={64} width="100%" style={tw.style('rounded-xl')} />
            <Skeleton height={64} width="100%" style={tw.style('rounded-xl')} />
          </Box>
        </Box>

        <Box twClassName="pb-6">
          <Box twClassName="px-4 py-4">
            <Skeleton height={16} width={150} />
          </Box>

          <Box twClassName="px-4" gap={3}>
            <Skeleton
              height={120}
              width="100%"
              style={tw.style('rounded-2xl bg-alternative')}
            />
            <Skeleton
              height={120}
              width="100%"
              style={tw.style('rounded-2xl bg-alternative')}
            />
          </Box>
        </Box>
      </ScrollView>

      <Box
        twClassName={`absolute bottom-0 left-0 right-0 bg-default px-4 pt-4 pb-[${insets.bottom + 8}px]`}
      >
        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Lg}
          isFullWidth
          isDisabled
        >
          {strings('market_insights.trade_button')}
        </Button>
      </Box>
    </Box>
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
  const [isSourcesSheetVisible, setIsSourcesSheetVisible] = useState(false);
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
  const trendArticleSources: MarketInsightsSourceListItem[] = useMemo(() => {
    if (!report) {
      return [];
    }

    return report.trends.flatMap((trend) =>
      trend.articles.map((article) => {
        const sourceSeed = article.url || article.source;
        const normalizedUrl = sourceSeed.includes('://')
          ? sourceSeed
          : `https://${sourceSeed}`;

        return {
          name: article.source || sourceSeed,
          type: 'article',
          url: normalizedUrl,
          headline: article.title,
          date: article.date,
        };
      }),
    );
  }, [report]);
  const sourcesSheetItems: MarketInsightsSourceListItem[] = useMemo(() => {
    if (trendArticleSources.length > 0) {
      return trendArticleSources;
    }

    return (report?.sources ?? []).map((source) => ({
      name: source.name,
      type: source.type,
      url: source.url,
    }));
  }, [report?.sources, trendArticleSources]);
  const trendSourcesPillSources: MarketInsightsSource[] = useMemo(
    () => getUniqueSourcesByFavicon(sourcesSheetItems),
    [sourcesSheetItems],
  );
  const visibleTrendSourceCount = Math.min(
    trendSourcesPillSources.length,
    MAX_VISIBLE_SOURCES,
  );
  const remainingTrendSourceCount = Math.max(
    trendSourcesPillSources.length - MAX_VISIBLE_SOURCES,
    0,
  );

  const handleBackPress = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleTweetPress = useCallback((url: string) => {
    Linking.openURL(url);
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
  const handleOpenSources = useCallback(() => {
    setIsSourcesSheetVisible(true);
  }, []);

  const handleCloseSources = useCallback(() => {
    setIsSourcesSheetVisible(false);
  }, []);

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
      twClassName={`flex-1 bg-default pt-[${insets.top}px]`}
      testID={MarketInsightsSelectorsIDs.VIEW_CONTAINER}
    >
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        twClassName="px-1 py-2"
        testID={MarketInsightsSelectorsIDs.VIEW_HEADER}
      >
        <Pressable
          onPress={handleBackPress}
          style={tw.style('p-2')}
          hitSlop={8}
        >
          <Icon
            name={IconName.ArrowLeft}
            size={IconSize.Md}
            color={IconColor.IconDefault}
          />
        </Pressable>
        <Box twClassName="flex-1 items-center">
          <Text variant={TextVariant.HeadingSm} fontWeight={FontWeight.Bold}>
            {strings('market_insights.title')}
          </Text>
        </Box>
        <Box twClassName="w-10" />
      </Box>

      <ScrollView
        contentContainerStyle={tw.style('pb-6')}
        showsVerticalScrollIndicator={false}
      >
        <AnimatedSection delay={SECTION_ANIMATION_DELAYS_MS.topArticle}>
          <Box twClassName="px-4 pt-4 pb-3">
            <Text variant={TextVariant.HeadingLg}>{report.headline}</Text>
          </Box>

          <Box twClassName="px-4 pb-6">
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
            {/* <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              gap={2}
              twClassName="px-4 py-4"
            >
              <Icon
                name={IconName.Description}
                size={IconSize.Md}
                color={IconColor.IconAlternative}
              />
              <Text
                variant={TextVariant.BodySm}
                fontWeight={FontWeight.Medium}
                color={TextColor.TextAlternative}
              >
                {strings('market_insights.a_closer_look')}
              </Text>
            </Box> */}

            {report.trends.map((trend, index) => (
              <MarketInsightsTrendItem
                key={`trend-${index}`}
                trend={trend}
                onPress={() => handleTrendPress(trend)}
                testID={`${MarketInsightsSelectorsIDs.TREND_ITEM}-${index}`}
              />
            ))}
            {trendSourcesPillSources.length > 0 ? (
              <Box twClassName="px-4 pt-2">
                <Pressable
                  onPress={handleOpenSources}
                  style={({ pressed }) =>
                    tw.style(
                      'self-start flex-row items-center bg-muted rounded-full px-3 py-2',
                      pressed && 'opacity-70',
                    )
                  }
                  testID="market-insights-open-sources-button"
                >
                  <Box flexDirection={BoxFlexDirection.Row} twClassName="pr-2">
                    {trendSourcesPillSources
                      .slice(0, visibleTrendSourceCount)
                      .map((source, index) => (
                        <TrendSourceIcon
                          key={`${source.name}-${source.url}`}
                          source={source}
                          index={index}
                        />
                      ))}
                  </Box>
                  {remainingTrendSourceCount > 0 ? (
                    <Text
                      variant={TextVariant.BodySm}
                      fontWeight={FontWeight.Medium}
                      color={TextColor.TextAlternative}
                    >
                      {strings('market_insights.sources_count', {
                        count: String(remainingTrendSourceCount),
                      })}
                    </Text>
                  ) : null}
                </Pressable>
              </Box>
            ) : null}
          </Box>
        </AnimatedSection>

        {/* "What's being said" section */}
        {allTweets.length > 0 && (
          <AnimatedSection delay={SECTION_ANIMATION_DELAYS_MS.whatsBeingSaid}>
            <Box twClassName="h-4 border-t-4 border-muted" />
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
      </ScrollView>

      <Box twClassName={`bg-default pb-[${insets.bottom}px]`}>
        <Box
          alignItems={BoxAlignItems.Center}
          twClassName="border-t border-muted px-4 pt-4 pb-5"
          testID={MarketInsightsSelectorsIDs.SOURCES_FOOTER}
        >
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            gap={3}
          >
            <Pressable
              onPress={handleThumbsUpPress}
              style={({ pressed }) =>
                tw.style(
                  'h-12 w-12 items-center justify-center rounded-full bg-muted',
                  pressed && 'opacity-70',
                )
              }
              testID={MarketInsightsSelectorsIDs.THUMBS_UP_BUTTON}
            >
              <Icon
                name={IconName.ThumbUp}
                size={IconSize.Md}
                color={IconColor.IconAlternative}
              />
            </Pressable>
            <Pressable
              onPress={handleThumbsDownPress}
              style={({ pressed }) =>
                tw.style(
                  'h-12 w-12 items-center justify-center rounded-full bg-muted',
                  pressed && 'opacity-70',
                )
              }
              testID={MarketInsightsSelectorsIDs.THUMBS_DOWN_BUTTON}
            >
              <Icon
                name={IconName.ThumbDown}
                size={IconSize.Md}
                color={IconColor.IconAlternative}
              />
            </Pressable>
          </Box>
          <Text
            variant={TextVariant.BodySm}
            color={TextColor.TextAlternative}
            twClassName="pt-3"
          >
            {strings('market_insights.helpful_prompt')}
          </Text>
        </Box>
        <Box twClassName="px-4">
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
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.TextAlternative}
            >
              {strings('market_insights.fixed_footer_disclaimer')}
            </Text>
          </Box>
        </Box>
      </Box>

      {selectedTrend ? (
        <MarketInsightsTrendSourcesBottomSheet
          isVisible
          onClose={handleCloseTrendSources}
          trendTitle={selectedTrend.title}
          articles={selectedTrend.articles}
          tweets={selectedTrend.tweets ?? []}
          onSourcePress={handleSourcePress}
        />
      ) : null}

      {isSourcesSheetVisible ? (
        <MarketInsightsSourcesBottomSheet
          isVisible
          onClose={handleCloseSources}
          sources={sourcesSheetItems}
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
