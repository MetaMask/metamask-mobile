import React, { useCallback, useMemo } from 'react';
import { ScrollView, Linking, Pressable } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  AvatarToken,
  AvatarTokenSize,
  BoxFlexDirection,
  BoxAlignItems,
  FontWeight,
} from '@metamask/design-system-react-native';
import { strings } from '../../../../../../locales/i18n';
import { useMarketInsights } from '../../hooks/useMarketInsights';
import MarketInsightsTrendItem from '../../components/MarketInsightsTrendItem';
import MarketInsightsTweetCard from '../../components/MarketInsightsTweetCard';
import MarketInsightsSourcesFooter from '../../components/MarketInsightsSourcesFooter';
import { MarketInsightsSelectorsIDs } from '../../MarketInsights.testIds';
import type { MarketInsightsTweet } from '../../types/marketInsights';

type MarketInsightsRouteParams = {
  MarketInsightsView: {
    assetSymbol: string;
    tokenImageUrl?: string;
    pricePercentChange1d?: number;
    onTrade?: () => void;
  };
};

/**
 * MarketInsightsView is the full-page Market Insights screen.
 * It displays the AI-generated market report including:
 * - Price change indicator with token logo
 * - Headline and summary
 * - "What's driving the price?" trends section
 * - "What people are saying" social section
 * - Sources footer with feedback buttons
 * - Trade CTA button
 */
const MarketInsightsView: React.FC = () => {
  const tw = useTailwind();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const route =
    useRoute<RouteProp<MarketInsightsRouteParams, 'MarketInsightsView'>>();
  const { assetSymbol, tokenImageUrl, pricePercentChange1d, onTrade } =
    route.params;

  const { report } = useMarketInsights(assetSymbol);

  // Determine if price change is positive or negative
  const isPricePositive = (pricePercentChange1d ?? 0) >= 0;
  const formattedPercentChange = pricePercentChange1d != null
    ? `${isPricePositive ? '+' : ''}${pricePercentChange1d.toFixed(2)}%`
    : null;

  // Collect all tweets from all trends for the "What people are saying" section
  const allTweets: MarketInsightsTweet[] = useMemo(() => {
    if (!report) return [];
    return report.trends.flatMap((trend) => trend.tweets).slice(0, 4);
  }, [report]);

  const handleBackPress = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleTweetPress = useCallback((url: string) => {
    Linking.openURL(url);
  }, []);

  const handleTradePress = useCallback(() => {
    if (onTrade) {
      onTrade();
    } else {
      navigation.goBack();
    }
  }, [onTrade, navigation]);

  if (!report) {
    return null;
  }

  return (
    <Box
      twClassName={`flex-1 bg-default pt-[${insets.top}px]`}
      testID={MarketInsightsSelectorsIDs.VIEW_CONTAINER}
    >
      {/* Header */}
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
        {/* Right spacer to center the title */}
        <Box twClassName="w-10" />
      </Box>

      <ScrollView
        contentContainerStyle={tw.style(`pb-[${insets.bottom + 80}px]`)}
        showsVerticalScrollIndicator={false}
      >
        {/* Price change tag with token logo */}
        <Box twClassName="px-4 pt-4 pb-3">
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            twClassName={`self-start rounded-full px-2 py-1 ${
              isPricePositive ? 'bg-success-muted' : 'bg-error-muted'
            }`}
            gap={1}
          >
            {tokenImageUrl ? (
              <AvatarToken
                name={report.asset.toUpperCase()}
                src={{ uri: tokenImageUrl }}
                size={AvatarTokenSize.Xs}
              />
            ) : null}
            {formattedPercentChange ? (
              <Text
                variant={TextVariant.BodySm}
                fontWeight={FontWeight.Medium}
                color={
                  isPricePositive
                    ? TextColor.SuccessDefault
                    : TextColor.ErrorDefault
                }
              >
                {formattedPercentChange}
              </Text>
            ) : null}
            <Icon
              name={isPricePositive ? IconName.Arrow2Up : IconName.Arrow2Down}
              size={IconSize.Sm}
              color={
                isPricePositive
                  ? IconColor.SuccessDefault
                  : IconColor.ErrorDefault
              }
            />
          </Box>
        </Box>

        {/* Headline */}
        <Box twClassName="px-4 pb-3">
          <Text variant={TextVariant.HeadingLg}>{report.headline}</Text>
        </Box>

        {/* Summary */}
        <Box twClassName="px-4 pb-6">
          <Text variant={TextVariant.BodyMd} color={TextColor.TextAlternative}>
            {report.summary}
          </Text>
        </Box>

        {/* "What's driving the price?" section */}
        <Box twClassName="pb-6">
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            gap={2}
            twClassName="px-4 py-4"
          >
            <Icon
              name={IconName.TrendUp}
              size={IconSize.Md}
              color={IconColor.IconAlternative}
            />
            <Text
              variant={TextVariant.BodySm}
              fontWeight={FontWeight.Medium}
              color={TextColor.TextAlternative}
            >
              {strings('market_insights.whats_driving_price')}
            </Text>
          </Box>

          {report.trends.map((trend, index) => (
            <MarketInsightsTrendItem
              key={`trend-${index}`}
              trend={trend}
              testID={`${MarketInsightsSelectorsIDs.TREND_ITEM}-${index}`}
            />
          ))}
        </Box>

        {/* "What people are saying" section */}
        {allTweets.length > 0 && (
          <Box twClassName="pb-6">
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              gap={2}
              twClassName="px-4 py-4"
            >
              <Icon
                name={IconName.Messages}
                size={IconSize.Md}
                color={IconColor.IconAlternative}
              />
              <Text
                variant={TextVariant.BodySm}
                fontWeight={FontWeight.Medium}
                color={TextColor.TextAlternative}
              >
                {strings('market_insights.what_people_saying')}
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
        )}

        {/* Sources footer */}
        <MarketInsightsSourcesFooter
          sources={report.sources}
          testID={MarketInsightsSelectorsIDs.SOURCES_FOOTER}
        />
      </ScrollView>

      {/* Fixed bottom Trade button */}
      <Box
        twClassName={`absolute bottom-0 left-0 right-0 bg-default px-4 pt-4 pb-[${insets.bottom + 8}px]`}
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
      </Box>
    </Box>
  );
};

export default MarketInsightsView;
