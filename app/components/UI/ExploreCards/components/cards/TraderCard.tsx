import React, { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import {
  Box,
  Button,
  ButtonBaseSize,
  ButtonVariant,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import type { AppNavigationProp } from '../../../../../core/NavigationService/types';
import Routes from '../../../../../constants/navigation/Routes';
import type { TopTrader } from '../../../../Views/Homepage/Sections/TopTraders/types';
import TraderAvatar from '../../../../Views/Homepage/Sections/TopTraders/components/TraderAvatar';
import { useFollowToggle } from '../../../../hooks/useFollowToggle';
import { useHaptics } from '../../../../../util/haptics';
import { strings } from '../../../../../../locales/i18n';
import CardFrame from '../CardFrame';
import { trackExploreCardsCta } from '../../utils/exploreCardsAnalytics';
import { formatCompactUsd } from '../../utils/formatCompactUsd';

export interface TraderCardProps {
  trader: TopTrader;
  rank: number;
}

/**
 * Top trader card. The Follow CTA is the one deck CTA that does not navigate
 * away — it flips optimistically in place so the user can keep swiping.
 */
const TraderCard: React.FC<TraderCardProps> = ({ trader, rank }) => {
  const navigation = useNavigation<AppNavigationProp>();
  const { isFollowing, toggleFollow } = useFollowToggle(trader.id);
  const { playSuccessNotification } = useHaptics();

  const handleBodyPress = useCallback(() => {
    navigation.navigate(Routes.SOCIAL_LEADERBOARD.PROFILE, {
      traderId: trader.id,
      traderName: trader.username,
      traderAddress: trader.address,
      source: 'home_carousel',
      traderRank: trader.rank,
    });
  }, [navigation, trader]);

  const handleFollow = useCallback(() => {
    trackExploreCardsCta(
      'trader',
      isFollowing ? 'unfollow' : 'follow',
      trader.id,
    );
    const wasFollowing = isFollowing;
    void toggleFollow().then(() => {
      if (!wasFollowing) {
        void playSuccessNotification();
      }
    });
  }, [toggleFollow, isFollowing, trader.id, playSuccessNotification]);

  const roi = trader.percentageChange;
  const roiColor =
    roi > 0
      ? TextColor.SuccessDefault
      : roi < 0
        ? TextColor.ErrorDefault
        : TextColor.TextAlternative;
  const roiLabel = `${roi > 0 ? '+' : ''}${roi.toFixed(2)}%`;
  const pnlLabel = `${trader.pnlValue >= 0 ? '+' : '-'}${formatCompactUsd(
    Math.abs(trader.pnlValue),
  )}`;

  return (
    <CardFrame
      type="trader"
      rank={rank}
      onBodyPress={handleBodyPress}
      testID={`explore-card-trader-${trader.id}`}
      cta={
        <Button
          size={ButtonBaseSize.Lg}
          isFullWidth
          variant={
            isFollowing ? ButtonVariant.Secondary : ButtonVariant.Primary
          }
          onPress={handleFollow}
        >
          {isFollowing
            ? strings('explore_cards.cta_following')
            : strings('explore_cards.cta_follow')}
        </Button>
      }
    >
      <Box twClassName="flex-1 items-center justify-center gap-1">
        <TraderAvatar
          imageUrl={trader.avatarUri}
          address={trader.address}
          size={72}
          recyclingKey={trader.id}
        />
        <Text
          variant={TextVariant.HeadingMd}
          fontWeight={FontWeight.Bold}
          numberOfLines={1}
          twClassName="mt-3"
        >
          {trader.username}
        </Text>
        <Box twClassName="rounded-full px-3 py-1 bg-muted mt-1">
          <Text
            variant={TextVariant.BodyXs}
            fontWeight={FontWeight.Medium}
            color={TextColor.TextAlternative}
          >
            {strings('explore_cards.trader_rank_badge', {
              rank: trader.rank,
            })}
          </Text>
        </Box>
        <Text
          variant={TextVariant.DisplayMd}
          fontWeight={FontWeight.Bold}
          color={roiColor}
          twClassName="mt-2"
        >
          {roiLabel}
        </Text>
        <Text variant={TextVariant.BodyXs} color={TextColor.TextAlternative}>
          {strings('explore_cards.stat_roi_7d')}
        </Text>
        <Box twClassName="items-center mt-2">
          <Text variant={TextVariant.BodySm}>{pnlLabel}</Text>
          <Text variant={TextVariant.BodyXs} color={TextColor.TextAlternative}>
            {strings('explore_cards.stat_pnl_7d')}
          </Text>
        </Box>
      </Box>
    </CardFrame>
  );
};

export default TraderCard;
