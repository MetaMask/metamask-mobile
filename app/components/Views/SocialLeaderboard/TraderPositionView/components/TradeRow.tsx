import React from 'react';
import {
  Box,
  Text,
  TextVariant,
  TextColor,
  FontWeight,
  BoxFlexDirection,
  BoxAlignItems,
} from '@metamask/design-system-react-native';
import type { Trade } from '@metamask/social-controllers';
import { strings } from '../../../../../../locales/i18n';
import { formatUsd, formatTradeDate } from '../../utils/formatters';
import PerpBadges from '../../components/PerpBadges';
import { getPerpTradeDirection, isPerpTrade } from '../../utils/perp';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import TraderAvatar from '../../../Homepage/Sections/TopTraders/components/TraderAvatar';

const AVATAR_SIZE = 32;

export interface TradeRowProps {
  trade: Trade;
  traderImageUrl?: string;
  traderAddress?: string;
}

const TradeRow: React.FC<TradeRowProps> = ({
  trade,
  traderImageUrl,
  traderAddress,
}) => {
  const isEntry = trade.intent === 'enter';
  const isPerp = isPerpTrade(trade);
  const perpDirection = getPerpTradeDirection(trade);

  // Perp fills read as "opened"/"closed" (vs spot "bought"/"sold").
  const actionLabel = isPerp
    ? isEntry
      ? strings('social_leaderboard.trader_position.opened')
      : strings('social_leaderboard.trader_position.closed_action')
    : isEntry
      ? strings('social_leaderboard.trader_position.bought')
      : strings('social_leaderboard.trader_position.sold');

  return (
    <Box
      flexDirection={BoxFlexDirection.Row}
      alignItems={BoxAlignItems.Center}
      twClassName="px-4 py-3"
      testID={`trade-row-${trade.transactionHash}`}
    >
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        gap={4}
        twClassName="flex-1 min-w-0 mr-3"
      >
        <TraderAvatar
          imageUrl={traderImageUrl}
          address={traderAddress}
          size={AVATAR_SIZE}
        />
        <Box twClassName="flex-1 min-w-0">
          <Box
            flexDirection={BoxFlexDirection.Row}
            alignItems={BoxAlignItems.Center}
            gap={2}
          >
            <Text
              variant={TextVariant.BodyMd}
              fontWeight={FontWeight.Medium}
              color={TextColor.TextDefault}
              numberOfLines={1}
              twClassName="shrink"
            >
              {actionLabel}
            </Text>
            {perpDirection ? (
              <PerpBadges
                direction={perpDirection}
                leverage={trade.perpLeverage}
                testID={`trade-row-perp-badges-${trade.transactionHash}`}
              />
            ) : null}
          </Box>
          <Text
            variant={TextVariant.BodySm}
            color={TextColor.TextAlternative}
            numberOfLines={1}
          >
            {formatTradeDate(trade.timestamp)}
          </Text>
        </Box>
      </Box>

      <Box alignItems={BoxAlignItems.End}>
        <Text
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Medium}
          twClassName={isEntry ? 'text-success-default' : 'text-error-default'}
        >
          {formatUsd(
            isEntry ? Math.abs(trade.usdCost) : -Math.abs(trade.usdCost),
          )}
        </Text>
      </Box>
    </Box>
  );
};

export default TradeRow;
