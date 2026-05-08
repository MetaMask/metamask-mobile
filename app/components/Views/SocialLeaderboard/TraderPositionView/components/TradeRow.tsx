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
          <Text
            variant={TextVariant.BodyMd}
            fontWeight={FontWeight.Medium}
            color={TextColor.TextDefault}
            numberOfLines={1}
          >
            {isEntry
              ? strings('social_leaderboard.trader_position.bought', {
                  name: traderName,
                })
              : strings('social_leaderboard.trader_position.sold', {
                  name: traderName,
                })}
          </Text>
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
