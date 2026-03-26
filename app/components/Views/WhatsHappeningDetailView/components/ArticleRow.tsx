import React, { useCallback } from 'react';
import { Image, Pressable } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  FontWeight,
  Icon,
  IconColor,
  IconName,
  IconSize,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import type { Article } from '@metamask/ai-controllers';
import {
  formatRelativeTime,
  getFaviconUrl,
} from '../../../UI/MarketInsights/utils/marketInsightsFormatting';

interface ArticleRowProps {
  article: Article;
  onPress: (url: string) => void;
  isLastItem?: boolean;
}

/**
 * A single article row for the What's Happening sources bottom sheet.
 * Displays the article title, favicon, source domain, relative date, and an
 * export icon. Tapping the row calls onPress with the article URL.
 */
const ArticleRow: React.FC<ArticleRowProps> = ({
  article,
  onPress,
  isLastItem,
}) => {
  const tw = useTailwind();

  const handlePress = useCallback(() => {
    onPress(article.url);
  }, [onPress, article.url]);

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="link"
      style={({ pressed }) =>
        tw.style(
          'flex-row items-start py-3',
          !isLastItem && 'border-b border-muted',
          pressed && 'opacity-70',
        )
      }
    >
      <Box twClassName="flex-1">
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Start}
          twClassName="pr-1"
        >
          <Text
            variant={TextVariant.BodyMd}
            color={TextColor.TextDefault}
            twClassName="flex-1 pr-2"
          >
            {article.title}
          </Text>
          <Box paddingTop={1}>
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
          twClassName="pt-3"
        >
          <Box twClassName="w-4 h-4 rounded-full overflow-hidden mr-2">
            <Image
              source={{ uri: getFaviconUrl(article.url || article.source) }}
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
  );
};

export default ArticleRow;
