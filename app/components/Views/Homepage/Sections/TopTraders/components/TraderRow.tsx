import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  BoxJustifyContent,
  Button,
  ButtonSize,
  ButtonVariant,
  FontWeight,
  Text,
  TextColor,
  TextVariant,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { strings } from '../../../../../../../locales/i18n';
import { RankMedal, isTopRank } from '../topRank';
import type { TopTrader } from '../types';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import { formatSignedUsd } from '../../../../SocialLeaderboard/utils/formatters';
import TraderAvatar from './TraderAvatar';

const AVATAR_SIZE = 40;
// Fixed row height so the skeleton placeholder can match it exactly without
// drifting due to font-scale or button-size differences.
export const TRADER_ROW_HEIGHT = 71;

export interface TraderRowProps {
  trader: TopTrader;
  onFollowPress: (traderId: string) => void;
  onTraderPress?: (
    traderId: string,
    traderName: string,
    /* Used downstream for podium decoration */
    overallRank: number,
  ) => void;
  testID?: string;
}

/**
 * TraderRow -- a single row in the Top Traders leaderboard.
 *
 * Displays the trader's avatar (with a podium medal badge for ranks 1–3),
 * username, 30D PnL, and a Follow / Following toggle button.
 */
const TraderRow: React.FC<TraderRowProps> = ({
  trader,
  onFollowPress,
  onTraderPress,
  testID,
}) => {
  const tw = useTailwind();

  const pnlText = formatSignedUsd(trader.pnlValue);
  const isPnlPositive = trader.pnlValue >= 0;
  const showMedal = isTopRank(trader.rank);

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      justifyContent={BoxJustifyContent.Between}
      twClassName="px-4"
      style={{ height: TRADER_ROW_HEIGHT }}
      testID={testID ?? `trader-row-${trader.id}`}
    >
      <TouchableOpacity
        activeOpacity={onTraderPress ? 0.7 : 1}
        onPress={
          onTraderPress
            ? () =>
                onTraderPress(trader.id, trader.username, trader.overallRank)
            : undefined
        }
        style={tw.style('flex-1 min-w-0 mr-3')}
        disabled={!onTraderPress}
      >
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          gap={4}
        >
          <View>
            <TraderAvatar
              imageUrl={trader.avatarUri}
              address={trader.address}
              size={AVATAR_SIZE}
              recyclingKey={trader.id}
            />
            {showMedal ? (
              // Offset so the medal bottom (incl. its 2px border) sits ~10px
              // below the avatar's bottom edge.
              <View style={tw.style('absolute -bottom-[10px] -right-2')}>
                <RankMedal rank={trader.rank} />
              </View>
            ) : null}
          </View>

          <Box twClassName="flex-1 min-w-0">
            <Text
              variant={TextVariant.BodyMd}
              fontWeight={FontWeight.Medium}
              color={TextColor.TextDefault}
              numberOfLines={1}
            >
              {trader.username}
            </Text>
            <Text
              variant={TextVariant.BodySm}
              fontWeight={FontWeight.Medium}
              numberOfLines={1}
              twClassName={
                isPnlPositive ? 'text-success-default' : 'text-error-default'
              }
            >
              {pnlText}
            </Text>
          </Box>
        </Box>
      </TouchableOpacity>

      <Button
        variant={
          trader.isFollowing ? ButtonVariant.Secondary : ButtonVariant.Primary
        }
        size={ButtonSize.Sm}
        onPress={() => onFollowPress(trader.id)}
        twClassName="self-center min-w-[60px] px-2"
      >
        {trader.isFollowing
          ? strings('social_leaderboard.following')
          : strings('social_leaderboard.follow')}
      </Button>
    </Box>
  );
};

export default React.memo(TraderRow);
