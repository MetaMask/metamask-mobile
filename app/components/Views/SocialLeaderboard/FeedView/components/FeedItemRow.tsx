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
import React, { useCallback } from 'react';
import { strings } from '../../../../../../locales/i18n';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import TraderAvatar from '../../../Homepage/Sections/TopTraders/components/TraderAvatar';
import PerpBadges from '../../components/PerpBadges';
import type { FeedItem } from '../types';
import { formatFeedTimestamp } from '../../utils/formatters';
import {
  getFeedItemTestId,
  getFeedTradeButtonTestId,
} from '../FeedView.testIds';
import FeedTokenIcon from './FeedTokenIcon';

const AVATAR_SIZE = 24;

export interface FeedItemRowProps {
  item: FeedItem;
  onTradePress: (item: FeedItem) => void;
}

/**
 * A single trader-activity feed row: trader identity + action + time on top,
 * with an indented detail card (token, perp badges, sub-header, value, P&L)
 * and a Trade CTA.
 */
const FeedItemRow: React.FC<FeedItemRowProps> = ({ item, onTradePress }) => {
  const handleTradePress = useCallback(() => {
    onTradePress(item);
  }, [item, onTradePress]);

  const actionLabel = strings(`social_leaderboard.feed.action.${item.action}`);
  const timeLabel = formatFeedTimestamp(item.timestamp);
  const symbol = item.type === 'spot' ? item.tokenSymbol : item.marketSymbol;

  return (
    <Box twClassName="px-4 py-3 gap-4" testID={getFeedItemTestId(item.id)}>
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        justifyContent={BoxJustifyContent.Between}
        gap={3}
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

        <Button
          variant={ButtonVariant.Primary}
          size={ButtonSize.Sm}
          onPress={handleTradePress}
          testID={getFeedTradeButtonTestId(item.id)}
        >
          {strings('social_leaderboard.feed.trade')}
        </Button>
      </Box>

      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        gap={3}
        twClassName="bg-muted rounded-2xl p-3"
      >
        <FeedTokenIcon
          symbol={symbol}
          chainIdHex={item.type === 'spot' ? item.chainIdHex : undefined}
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

        <Box alignItems={BoxAlignItems.End}>
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            color={
              item.hasValueData
                ? TextColor.TextDefault
                : TextColor.TextAlternative
            }
            numberOfLines={1}
          >
            {item.valueLabel}
          </Text>
          <Text
            variant={TextVariant.BodySm}
            color={item.hasPnlData ? undefined : TextColor.TextAlternative}
            twClassName={
              item.hasPnlData
                ? item.isPnlPositive
                  ? 'text-success-default'
                  : 'text-error-default'
                : undefined
            }
            numberOfLines={1}
          >
            {item.pnlLabel}
          </Text>
        </Box>
      </Box>
    </Box>
  );
};

export default React.memo(FeedItemRow);
