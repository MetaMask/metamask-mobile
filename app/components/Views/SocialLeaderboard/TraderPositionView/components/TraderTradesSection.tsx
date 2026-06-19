import React from 'react';
import type { ReactElement } from 'react';
import { ScrollView } from 'react-native-gesture-handler';
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
import { TraderTradesSectionSelectorsIDs } from './TraderTradesSection.testIds';

export interface TraderTradesSectionProps {
  trades: Trade[];
  traderImageUrl?: string;
  traderAddress?: string;
  onTradePress?: (trade: Trade) => void;
  /** When true, only the trade rows scroll; the section title stays pinned. */
  scrollable?: boolean;
  refreshControl?: ReactElement;
}

const TradesTitle = () => (
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
);

const TradeRows = ({
  trades,
  traderImageUrl,
  traderAddress,
  onTradePress,
}: Pick<
  TraderTradesSectionProps,
  'trades' | 'traderImageUrl' | 'traderAddress' | 'onTradePress'
>) => {
  if (trades.length === 0) {
    return (
      <Box twClassName="px-4 py-6 items-center">
        <Text variant={TextVariant.BodySm} color={TextColor.TextAlternative}>
          {strings('social_leaderboard.trader_position.no_trades')}
        </Text>
      </Box>
    );
  }

  return (
    <>
      {trades.map((trade) => (
        <TradeRow
          key={trade.transactionHash}
          trade={trade}
          traderImageUrl={traderImageUrl}
          traderAddress={traderAddress}
          onPress={onTradePress}
        />
      ))}
    </>
  );
};

const TraderTradesSection: React.FC<TraderTradesSectionProps> = ({
  trades,
  traderImageUrl,
  traderAddress,
  onTradePress,
  scrollable = false,
  refreshControl,
}) => {
  if (!scrollable) {
    return (
      <>
        <TradesTitle />
        <TradeRows
          trades={trades}
          traderImageUrl={traderImageUrl}
          traderAddress={traderAddress}
          onTradePress={onTradePress}
        />
      </>
    );
  }

  return (
    <Box twClassName="flex-1 min-h-0">
      <TradesTitle />
      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        refreshControl={refreshControl}
        testID={TraderTradesSectionSelectorsIDs.SCROLL_VIEW}
      >
        <TradeRows
          trades={trades}
          traderImageUrl={traderImageUrl}
          traderAddress={traderAddress}
          onTradePress={onTradePress}
        />
      </ScrollView>
    </Box>
  );
};

export default TraderTradesSection;
