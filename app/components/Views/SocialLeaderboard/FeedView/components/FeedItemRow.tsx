import {
  AvatarTokenSize,
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
import React, { useCallback } from 'react';
import { Pressable, StyleSheet, TouchableOpacity } from 'react-native';
import { strings } from '../../../../../../locales/i18n';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import TraderAvatar from '../../../Homepage/Sections/TopTraders/components/TraderAvatar';
import PerpBadges from '../../components/PerpBadges';
import PositionTokenAvatar from '../../components/PositionTokenAvatar';
import type { FeedItem } from '../types';
import { formatFeedTimestamp } from '../../utils/formatters';
import {
  getFeedItemTestId,
  getFeedNewPositionTestId,
  getFeedTradeButtonTestId,
  getFeedTradeCardTestId,
  getFeedTraderTestId,
} from '../FeedView.testIds';

const AVATAR_SIZE = 24;

const styles = StyleSheet.create({
  // Keep the tappable trader identity flexible so the Trade button retains its
  // width and the username still truncates.
  traderIdentity: {
    flex: 1,
    minWidth: 0,
  },
});

export interface FeedItemRowProps {
  item: FeedItem;
  onTradePress: (item: FeedItem) => void;
  onPositionPress: (item: FeedItem) => void;
  onTraderPress: (item: FeedItem) => void;
}

/**
 * A single trader-activity feed row: trader identity + action + time on top,
 * with an indented detail card (token, perp badges, sub-header, value, P&L)
 * and a Trade CTA. Tapping the trader identity opens their profile.
 */
const FeedItemRow: React.FC<FeedItemRowProps> = ({
  item,
  onTradePress,
  onPositionPress,
  onTraderPress,
}) => {
  const handleTradePress = useCallback(() => {
    onTradePress(item);
  }, [item, onTradePress]);

  const handlePositionPress = useCallback(() => {
    onPositionPress(item);
  }, [item, onPositionPress]);

  const handleTraderPress = useCallback(() => {
    onTraderPress(item);
  }, [item, onTraderPress]);

  const actionLabel = strings(`social_leaderboard.feed.action.${item.action}`);
  const timeLabel = formatFeedTimestamp(item.timestamp);
  const symbol = item.type === 'spot' ? item.tokenSymbol : item.marketSymbol;

  // For open rows whose value/P&L hasn't arrived yet, surface an intentional
  // state label ("Holding" for spot, "Open" for perps) instead of a blank right
  // column. The row is an entry that hasn't been exited, so there's no realized
  // P&L to show yet. Only open actions have a label; closed rows (`sold`/`closed`)
  // stay blank when empty.
  const newPositionLabelKey =
    item.action === 'bought'
      ? 'social_leaderboard.feed.new_position.bought'
      : item.action === 'opened'
        ? 'social_leaderboard.feed.new_position.opened'
        : null;

  return (
    <Box twClassName="px-4 py-3 gap-4" testID={getFeedItemTestId(item.id)}>
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Between}
        gap={3}
      >
        <TouchableOpacity
          onPress={handleTraderPress}
          accessibilityRole="button"
          testID={getFeedTraderTestId(item.id)}
          style={styles.traderIdentity}
        >
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            gap={2}
            twClassName="flex-1 min-w-0"
          >
            <TraderAvatar
              imageUrl={item.avatarUri}
              address={item.traderAddress}
              size={AVATAR_SIZE}
              recyclingKey={item.id}
            />
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.TextAlternative}
              numberOfLines={1}
              twClassName="flex-1 min-w-0"
            >
              <Text
                variant={TextVariant.BodySm}
                fontWeight={FontWeight.Medium}
                color={TextColor.TextDefault}
              >
                {item.username}
              </Text>
              <Text variant={TextVariant.BodySm} color={TextColor.TextDefault}>
                {` ${actionLabel}`}
              </Text>
              {` \u00b7 ${timeLabel}`}
            </Text>
          </Box>
        </TouchableOpacity>

        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Sm}
          onPress={handleTradePress}
          testID={getFeedTradeButtonTestId(item.id)}
        >
          {strings('social_leaderboard.feed.trade')}
        </Button>
      </Box>

      <Pressable
        onPress={handlePositionPress}
        accessibilityRole="button"
        accessibilityLabel={symbol}
        testID={getFeedTradeCardTestId(item.id)}
        style={({ pressed }) => (pressed ? { opacity: 0.6 } : undefined)}
      >
        <Box
          flexDirection={BoxFlexDirection.Row}
          alignItems={BoxAlignItems.Center}
          gap={3}
          twClassName="bg-muted rounded-2xl p-3"
        >
          <PositionTokenAvatar
            position={item.tokenAvatar}
            size={AvatarTokenSize.Md}
            showChainBadge
          />

          <Box twClassName="flex-1 min-w-0">
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              gap={1}
            >
              <Text
                variant={TextVariant.BodyMd}
                fontWeight={FontWeight.Medium}
                color={TextColor.TextDefault}
                numberOfLines={1}
                twClassName="shrink"
              >
                {symbol}
              </Text>
              {item.type === 'perps' ? (
                <PerpBadges
                  direction={item.direction}
                  leverage={item.leverage}
                  testID={`feed-item-perp-badges-${item.id}`}
                />
              ) : null}
            </Box>
            <Text
              variant={TextVariant.BodySm}
              color={TextColor.TextAlternative}
              numberOfLines={1}
            >
              {item.subHeader}
            </Text>
          </Box>

          {item.hasValueData || item.hasPnlData ? (
            <Box alignItems={BoxAlignItems.End}>
              {item.hasValueData ? (
                <Text
                  variant={TextVariant.BodyMd}
                  fontWeight={FontWeight.Medium}
                  color={TextColor.TextDefault}
                  numberOfLines={1}
                >
                  {item.valueLabel}
                </Text>
              ) : null}
              {item.hasPnlData ? (
                <Text
                  variant={TextVariant.BodySm}
                  twClassName={
                    item.isPnlPositive
                      ? 'text-success-default'
                      : 'text-error-default'
                  }
                  numberOfLines={1}
                >
                  {item.pnlLabel}
                </Text>
              ) : null}
            </Box>
          ) : newPositionLabelKey ? (
            <Box alignItems={BoxAlignItems.End}>
              <Text
                variant={TextVariant.BodySm}
                color={TextColor.TextAlternative}
                numberOfLines={1}
                testID={getFeedNewPositionTestId(item.id)}
              >
                {strings(newPositionLabelKey)}
              </Text>
            </Box>
          ) : null}
        </Box>
      </Pressable>
    </Box>
  );
};

export default React.memo(FeedItemRow);
