import React, { useCallback, useEffect, useRef } from 'react';
import { Image, Linking, Pressable, ScrollView } from 'react-native';
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
  BoxJustifyContent,
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
import { getFaviconUrl } from '../utils/marketInsightsFormatting';

interface MarketInsightsTrendSourcesBottomSheetProps {
  isVisible: boolean;
  onClose: () => void;
  trendTitle: string;
  articles: MarketInsightsArticle[];
  tweets?: MarketInsightsTweet[];
}

const MarketInsightsTrendSourcesBottomSheet: React.FC<
  MarketInsightsTrendSourcesBottomSheetProps
> = ({ isVisible, onClose, trendTitle, articles, tweets = [] }) => {
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

  const handleSourcePress = useCallback((url: string) => {
    Linking.openURL(url);
  }, []);

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
                'flex-row items-center py-3 border-b border-muted',
                pressed && 'opacity-70',
              )
            }
          >
            <Box twClassName="w-8 h-8 rounded-full overflow-hidden mr-3">
              <Image
                source={{ uri: getFaviconUrl(article.source) }}
                style={tw.style('w-8 h-8 rounded-full')}
              />
            </Box>
            <Box twClassName="flex-1">
              <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
                {article.source}
              </Text>
              <Text
                variant={TextVariant.BodyXs}
                color={TextColor.TextAlternative}
                numberOfLines={2}
              >
                {article.title}
              </Text>
            </Box>
            <Icon
              name={IconName.Export}
              size={IconSize.Sm}
              color={IconColor.IconAlternative}
            />
          </Pressable>
        ))}

        {tweets.map((tweet) => (
          <Pressable
            key={tweet.url}
            onPress={() => handleSourcePress(tweet.url)}
            style={({ pressed }) =>
              tw.style(
                'flex-row items-center py-3 border-b border-muted',
                pressed && 'opacity-70',
              )
            }
          >
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              justifyContent={BoxJustifyContent.Center}
              twClassName="w-8 h-8 rounded-full bg-muted mr-3"
            >
              <Icon
                name={IconName.X}
                size={IconSize.Sm}
                color={IconColor.IconAlternative}
              />
            </Box>
            <Box twClassName="flex-1">
              <Text variant={TextVariant.BodyMd} fontWeight={FontWeight.Medium}>
                @{tweet.author}
              </Text>
              <Text
                variant={TextVariant.BodyXs}
                color={TextColor.TextAlternative}
                numberOfLines={2}
              >
                {tweet.contentSummary}
              </Text>
            </Box>
            <Icon
              name={IconName.Export}
              size={IconSize.Sm}
              color={IconColor.IconAlternative}
            />
          </Pressable>
        ))}
      </ScrollView>
    </BottomSheet>
  );
};

export default MarketInsightsTrendSourcesBottomSheet;
