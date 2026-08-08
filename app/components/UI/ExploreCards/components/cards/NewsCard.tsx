import React, { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  Button,
  ButtonBaseSize,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import Routes from '../../../../../constants/navigation/Routes';
import type { WhatsHappeningItem } from '../../../WhatsHappening/types';
import { WhatsHappeningSource } from '../../../WhatsHappening/constants';
import { strings } from '../../../../../../locales/i18n';
import CardFrame from '../CardFrame';
import { trackExploreCardsCta } from '../../utils/exploreCardsAnalytics';

const IMPACT_STYLES: Record<string, { container: string; text: TextColor }> = {
  positive: { container: 'bg-success-muted', text: TextColor.SuccessDefault },
  negative: { container: 'bg-error-muted', text: TextColor.ErrorDefault },
  neutral: { container: 'bg-muted', text: TextColor.TextAlternative },
};

const MAX_RELATED_ASSETS = 4;

export interface NewsCardProps {
  item: WhatsHappeningItem;
  /** Index within the What's Happening feed for the detail carousel. */
  feedIndex: number;
  rank: number;
}

/** Text-first news card (What's Happening items carry no hero image). */
const NewsCard: React.FC<NewsCardProps> = ({ item, feedIndex, rank }) => {
  const navigation = useNavigation<AppNavigationProp>();

  const openDetail = useCallback(() => {
    navigation.navigate(Routes.WHATS_HAPPENING_DETAIL, {
      initialIndex: feedIndex,
      source: WhatsHappeningSource.Explore,
    });
  }, [navigation, feedIndex]);

  const handleReadMore = useCallback(() => {
    trackExploreCardsCta('news', 'read', item.id);
    openDetail();
  }, [openDetail, item.id]);

  const impactStyle = item.impact ? IMPACT_STYLES[item.impact] : undefined;
  const relatedAssets = item.relatedAssets.slice(0, MAX_RELATED_ASSETS);

  return (
    <CardFrame
      type="news"
      rank={rank}
      onBodyPress={openDetail}
      testID={`explore-card-news-${item.id}`}
      cta={
        <Button size={ButtonBaseSize.Lg} isFullWidth onPress={handleReadMore}>
          {strings('explore_cards.cta_read_more')}
        </Button>
      }
    >
      <Box twClassName="flex-1 justify-center gap-3">
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          twClassName="gap-2"
        >
          {item.category ? (
            <Box twClassName="rounded-full px-3 py-1 bg-muted">
              <Text
                variant={TextVariant.BodyXs}
                fontWeight={FontWeight.Medium}
                color={TextColor.TextAlternative}
              >
                {item.category.toUpperCase()}
              </Text>
            </Box>
          ) : null}
          {item.impact && impactStyle ? (
            <Box
              twClassName={`rounded-full px-3 py-1 ${impactStyle.container}`}
            >
              <Text
                variant={TextVariant.BodyXs}
                fontWeight={FontWeight.Medium}
                color={impactStyle.text}
              >
                {item.impact.toUpperCase()}
              </Text>
            </Box>
          ) : null}
        </Box>
        <Text
          variant={TextVariant.HeadingMd}
          fontWeight={FontWeight.Bold}
          numberOfLines={4}
        >
          {item.title}
        </Text>
        {/* Full-height cards leave room for a generous description. */}
        <Text
          variant={TextVariant.BodyMd}
          color={TextColor.TextAlternative}
          numberOfLines={6}
        >
          {item.description}
        </Text>
        {relatedAssets.length > 0 && (
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            twClassName="gap-2 flex-wrap"
          >
            {relatedAssets.map((asset) => (
              <Box
                key={asset.symbol}
                twClassName="rounded-full px-3 py-1 border border-muted"
              >
                <Text
                  variant={TextVariant.BodyXs}
                  fontWeight={FontWeight.Medium}
                >
                  {asset.symbol}
                </Text>
              </Box>
            ))}
          </Box>
        )}
      </Box>
    </CardFrame>
  );
};

export default NewsCard;
