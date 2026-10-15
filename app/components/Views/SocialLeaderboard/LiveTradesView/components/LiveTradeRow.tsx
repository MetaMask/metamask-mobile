import { Box } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import React, { useCallback } from 'react';
import { Pressable } from 'react-native';
import { useSocialEntryOptions } from '../../../../UI/SocialFeed/components/SocialEntryOptionsBottomSheet';
import { getSocialEntryOptionsTriggerTestId } from '../../../../UI/SocialFeed/components/SocialEntryOptionsBottomSheet.testIds';
import PositionCardHeader from '../../../../UI/SocialFeed/components/PositionCardHeader';
import PositionCardShell from '../../../../UI/SocialFeed/components/PositionCardShell';
import { closedAgeLabel } from '../../../../UI/SocialFeed/components/SocialFeedPositionCard';
import SocialTraderIdentityRow from '../../../../UI/SocialFeed/components/SocialTraderIdentityRow';
import type { LiveTradeRowModel } from '../types';
import {
  getLiveTradeCardTestId,
  getLiveTradeHeaderTestId,
  getLiveTradeRowTestId,
} from './LiveTradeRow.testIds';

/** Lines the card up with the identity text: avatar (32) plus its gap-2 (8). */
const CARD_INDENT_CLASSNAME = 'ml-10';

export interface LiveTradeRowProps {
  item: LiveTradeRowModel;
  onPositionPress: (item: LiveTradeRowModel) => void;
  onTraderPress: (item: LiveTradeRowModel) => void;
  now?: number;
}

/**
 * Compact Social V1 Live trades row: shared trader identity plus the feed's
 * position header, without the stats. An open trade shows running P&L on a
 * neutral card; a closing one takes the tone of its realized result.
 */
const LiveTradeRow: React.FC<LiveTradeRowProps> = ({
  item,
  onPositionPress,
  onTraderPress,
  now,
}) => {
  const tw = useTailwind();
  const {
    open: openOptions,
    sheet: optionsSheet,
    isHidden,
  } = useSocialEntryOptions({
    postId: item.id,
    authorId: item.traderId,
    authorHandle: item.authorHandle,
  });

  const handlePositionPress = useCallback(() => {
    onPositionPress(item);
  }, [item, onPositionPress]);

  const handleTraderPress = useCallback(() => {
    onTraderPress(item);
  }, [item, onTraderPress]);

  if (isHidden) {
    return null;
  }

  const tone = item.isClosed
    ? item.isPnlPositive
      ? 'positive'
      : 'negative'
    : 'neutral';

  return (
    <Box twClassName="px-4 py-3 gap-3" testID={getLiveTradeRowTestId(item.id)}>
      <SocialTraderIdentityRow
        author={item.author}
        handle={item.authorHandle}
        imageUrl={item.authorImageUrl}
        timestampMs={item.timestampMs}
        recyclingKey={item.id}
        onMorePress={openOptions}
        onIdentityPress={handleTraderPress}
        now={now}
        testIDs={{
          more: getSocialEntryOptionsTriggerTestId(item.id),
          identityPress: `live-trade-trader-${item.id}`,
        }}
      />
      <Pressable
        onPress={handlePositionPress}
        accessibilityRole="button"
        accessibilityLabel={item.symbol}
        testID={getLiveTradeCardTestId(item.id)}
        style={({ pressed }) =>
          tw.style(CARD_INDENT_CLASSNAME, pressed && 'opacity-60')
        }
      >
        <PositionCardShell tone={tone}>
          <PositionCardHeader
            layout={item.isClosed ? 'closed' : 'open'}
            avatar={item.avatar}
            symbol={item.symbol}
            valueLabel={item.valueLabel}
            pnlLabel={item.pnlLabel}
            pnlValueLabel={item.pnlValueLabel}
            isPnlPositive={item.isPnlPositive}
            direction={item.direction}
            leverageLabel={item.leverageLabel}
            side={item.side}
            subtitleLabel={item.subtitleLabel}
            closedAgeLabel={closedAgeLabel(item.closedAtMs)}
            showChainBadge
            testID={getLiveTradeHeaderTestId(item.id)}
          />
        </PositionCardShell>
      </Pressable>
      {optionsSheet}
    </Box>
  );
};

export default React.memo(LiveTradeRow);
