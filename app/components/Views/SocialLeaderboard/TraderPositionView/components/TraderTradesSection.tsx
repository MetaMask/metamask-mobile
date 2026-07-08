import React from 'react';
import {
  Box,
  Text,
  TextVariant,
  TextColor,
  FontWeight,
} from '@metamask/design-system-react-native';
import type { Trade } from '@metamask/social-controllers';
import { strings } from '../../../../../../locales/i18n';
import TradeRow from './TradeRow';

export interface TraderTradesSectionProps {
  trades: Trade[];
  traderImageUrl?: string;
  traderAddress?: string;
}

const TraderTradesSection: React.FC<TraderTradesSectionProps> = ({
  trades,
  traderImageUrl,
  traderAddress,
}) => (
  <>
    <Box twClassName="px-4 mt-5">
      <Box twClassName="self-start pb-2">
        <Text
          variant={TextVariant.BodyMd}
          fontWeight={FontWeight.Bold}
          color={TextColor.TextDefault}
        >
          {strings('social_leaderboard.trader_position.trades')}
        </Text>
      </Box>
      <Box twClassName="h-px bg-muted" />
    </Box>

    {trades.length > 0 ? (
      trades.map((trade) => (
        <TradeRow
          key={trade.transactionHash}
          trade={trade}
          traderImageUrl={traderImageUrl}
          traderAddress={traderAddress}
        />
      ))
    ) : (
      <Box twClassName="px-4 py-6 items-center">
        <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
          {strings('social_leaderboard.trader_position.no_trades')}
        </Text>
      </Box>
    )}
  </>
);

export default TraderTradesSection;
