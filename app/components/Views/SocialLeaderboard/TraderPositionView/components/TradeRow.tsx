import React from 'react';
import { Image } from 'react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  Text,
  TextVariant,
  TextColor,
  FontWeight,
  BoxFlexDirection,
  BoxAlignItems,
  AvatarBase,
  AvatarBaseSize,
} from '@metamask/design-system-react-native';
import type { Trade } from '@metamask/social-controllers';
import { strings } from '../../../../../../locales/i18n';
import { formatUsd, formatTradeDate } from '../../utils/formatters';
import PerpBadges from '../../components/PerpBadges';
import { getPerpTradeDirection, isPerpTrade } from '../../utils/perp';

export interface TradeRowProps {
  trade: Trade;
  traderName: string;
  traderImageUrl?: string;
}

const TradeRow: React.FC<TradeRowProps> = ({
  trade,
  traderName,
  traderImageUrl,
}) => {
  const tw = useTailwind();
  const isEntry = trade.intent === 'enter';
  const isPerp = isPerpTrade(trade);
  const perpDirection = getPerpTradeDirection(trade);

  // Perp fills read as "opened"/"closed" (vs spot "bought"/"sold").
  const actionLabel = isPerp
    ? isEntry
      ? strings('social_leaderboard.trader_position.opened', {
          name: traderName,
        })
      : strings('social_leaderboard.trader_position.closed_action', {
          name: traderName,
        })
    : isEntry
      ? strings('social_leaderboard.trader_position.bought', {
          name: traderName,
        })
      : strings('social_leaderboard.trader_position.sold', {
          name: traderName,
        });

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
        {traderImageUrl ? (
          <Image
            source={{ uri: traderImageUrl }}
            style={tw.style('w-[32px] h-[32px] rounded-full bg-muted')}
            resizeMode="cover"
          />
        ) : (
          <AvatarBase
            size={AvatarBaseSize.Md}
            fallbackText={traderName.charAt(0).toUpperCase()}
          />
        )}
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
