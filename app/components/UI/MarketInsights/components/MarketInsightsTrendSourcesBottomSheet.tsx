import React, { useCallback, useEffect, useRef } from 'react';
import { Image, Pressable, ScrollView } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  Text,
  TextVariant,
  TextColor,
  Icon,
  IconName,
  IconSize,
  IconColor,
  FontWeight,
  BoxFlexDirection,
  BoxAlignItems,
} from '@metamask/design-system-react-native';
import type {
  MarketInsightsArticle,
  MarketInsightsTweet,
} from '@metamask/ai-controllers';
import BottomSheet, {
  BottomSheetRef,
} from '../../../../component-library/components/BottomSheets/BottomSheet';
import BottomSheetHeader from '../../../../component-library/components/BottomSheets/BottomSheetHeader';
import { strings } from '../../../../../locales/i18n';
import {
  formatRelativeTime,
  getFaviconUrl,
  getNormalizedHandle,
} from '../utils/marketInsightsFormatting';

interface MarketInsightsTrendSourcesBottomSheetProps {
  isVisible: boolean;
  onClose: () => void;
  trendTitle: string;
  articles: MarketInsightsArticle[];
  tweets?: MarketInsightsTweet[];
  onSourcePress?: (url: string) => void;
}

const MarketInsightsTrendSourcesBottomSheet: React.FC<
  MarketInsightsTrendSourcesBottomSheetProps
> = ({
  isVisible,
  onClose,
  trendTitle,
  articles,
  tweets = [],
  onSourcePress,
}) => {
  const tw = useTailwind();
  const bottomSheetRef = useRef<BottomSheetRef>(null);

  useEffect(() => {
    const sheet = bottomSheetRef.current;
    if (isVisible) {
      sheet?.onOpenBottomSheet();
    } else {
      sheet?.onCloseBottomSheet();
    }
  }, [isVisible]);

  const handleSourcePress = useCallback(
    (url: string) => {
      onSourcePress?.(url);
    },
    [onSourcePress],
  );

  return (
    <BottomSheet
      ref={bottomSheetRef}
      shouldNavigateBack={false}
      onClose={onClose}
    >
      <BottomSheetHeader onClose={onClose}>
        <Text variant={TextVariant.HeadingSm} fontWeight={FontWeight.Bold}>
          {strings('market_insights.sources_title')}
        </Text>
      </BottomSheetHeader>

      <ScrollView
        style={tw.style('px-4')}
        contentContainerStyle={tw.style('pb-24')}
      >
        <Box twClassName="pb-2">
          <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
            {trendTitle}
          </Text>
        </Box>

        {articles.map((article) => (
          <Pressable
            key={article.url}
            onPress={() => handleSourcePress(article.url)}
            style={({ pressed }) =>
              tw.style(
                'flex-row items-start py-3 border-b border-muted',
                pressed && 'opacity-70',
              )
            }
          >
            <Box twClassName="flex-1">
              <Box
                flexDirection={BoxFlexDirection.Row}
                alignItems={BoxAlignItems.End}
                twClassName="pr-1"
              >
                <Text
                  variant={TextVariant.BodyMd}
                  color={TextColor.TextDefault}
                  twClassName="flex-1 pr-2"
                >
                  {article.title}
                </Text>
                <Box twClassName="pb-1">
                  <Icon
                    name={IconName.Export}
                    size={IconSize.Sm}
                    color={IconColor.IconAlternative}
                  />
                </Box>
              </Box>
              <Box
                flexDirection={BoxFlexDirection.Row}
                alignItems={BoxAlignItems.Center}
                twClassName="pt-1"
              >
                <Box twClassName="w-4 h-4 rounded-full overflow-hidden mr-2">
                  <Image
                    source={{
                      uri: getFaviconUrl(article.url || article.source),
                    }}
                    style={tw.style('w-4 h-4 rounded-full')}
                  />
                </Box>
                <Box
                  flexDirection={BoxFlexDirection.Row}
                  alignItems={BoxAlignItems.Center}
                  gap={1}
                >
                  <Text
                    variant={TextVariant.BodySm}
                    fontWeight={FontWeight.Medium}
                    color={TextColor.TextAlternative}
                  >
                    {article.source}
                  </Text>
                  {article.date ? (
                    <>
                      <Text
                        variant={TextVariant.BodySm}
                        color={TextColor.TextAlternative}
                      >
                        {'•'}
                      </Text>
                      <Text
                        variant={TextVariant.BodySm}
                        color={TextColor.TextAlternative}
                      >
                        {formatRelativeTime(article.date, { nowLabel: 'now' })}
                      </Text>
                    </>
                  ) : null}
                </Box>
              </Box>
            </Box>
          </Pressable>
        ))}

        {tweets.map((tweet) => (
          <Pressable
            key={tweet.url}
            onPress={() => handleSourcePress(tweet.url)}
            style={({ pressed }) =>
              tw.style(
                'flex-row items-start py-3 border-b border-muted',
                pressed && 'opacity-70',
              )
            }
          >
            <Box twClassName="flex-1">
              <Box
                flexDirection={BoxFlexDirection.Row}
                alignItems={BoxAlignItems.End}
                twClassName="pr-1"
              >
                <Text
                  variant={TextVariant.BodyMd}
                  color={TextColor.TextDefault}
                  numberOfLines={2}
                  twClassName="flex-1 pr-2"
                >
                  {tweet.contentSummary}
                </Text>
                <Box twClassName="pb-1">
                  <Icon
                    name={IconName.Export}
                    size={IconSize.Sm}
                    color={IconColor.IconAlternative}
                  />
                </Box>
              </Box>
              <Box
                flexDirection={BoxFlexDirection.Row}
                alignItems={BoxAlignItems.Center}
                twClassName="pt-1"
              >
                <Box twClassName="w-6 h-6 rounded-full items-center justify-center bg-muted mr-2">
                  <Icon
                    name={IconName.X}
                    size={IconSize.Sm}
                    color={IconColor.IconAlternative}
                  />
                </Box>
                <Box
                  flexDirection={BoxFlexDirection.Row}
                  alignItems={BoxAlignItems.Center}
                  gap={1}
                >
                  <Text
                    variant={TextVariant.BodySm}
                    fontWeight={FontWeight.Medium}
                    color={TextColor.TextAlternative}
                  >
                    {getNormalizedHandle(tweet.author)}
                  </Text>
                  {tweet.date ? (
                    <>
                      <Text
                        variant={TextVariant.BodySm}
                        color={TextColor.TextAlternative}
                      >
                        {'•'}
                      </Text>
                      <Text
                        variant={TextVariant.BodySm}
                        color={TextColor.TextAlternative}
                      >
                        {formatRelativeTime(tweet.date, { nowLabel: 'now' })}
                      </Text>
                    </>
                  ) : null}
                </Box>
              </Box>
            </Box>
          </Pressable>
        ))}
      </ScrollView>
    </BottomSheet>
  );
};

export default MarketInsightsTrendSourcesBottomSheet;
