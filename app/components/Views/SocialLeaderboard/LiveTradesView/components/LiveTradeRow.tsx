import { Box } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import React, { useCallback } from 'react';
import { Pressable, View } from 'react-native';
import { useLiveCardHeader } from '../../../../UI/SocialFeed/live/useLiveCardHeader';
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

  const header = useLiveCardHeader(item.id, item.live, {
    priceLabel: item.subtitleLabel,
    pnlLabel: item.pnlLabel,
    pnlValueLabel: item.pnlValueLabel,
    isPnlPositive: item.isPnlPositive,
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
    ? item.valueLabel || item.pnlLabel || item.pnlValueLabel
      ? item.isPnlPositive
        ? 'positive'
        : 'negative'
      : 'neutral'
    : 'neutral';

  return (
    <Box twClassName="px-4 py-3" testID={getLiveTradeRowTestId(item.id)}>
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
      >
        <Pressable
          onPress={handlePositionPress}
          accessibilityRole="button"
          accessibilityLabel={item.symbol}
          testID={getLiveTradeCardTestId(item.id)}
          style={({ pressed }) => tw.style(pressed && 'opacity-60')}
        >
          <PositionCardShell tone={tone}>
            <View ref={header.trackRef} collapsable={false}>
              <PositionCardHeader
                layout={item.isClosed ? 'closed' : 'open'}
                avatar={item.avatar}
                symbol={item.symbol}
                valueLabel={item.valueLabel}
                pnlLabel={header.pnlLabel}
                pnlValueLabel={header.pnlValueLabel}
                isPnlPositive={header.isPnlPositive}
                direction={item.direction}
                leverageLabel={item.leverageLabel}
                side={item.side}
                subtitleLabel={header.priceLabel}
                closedAgeLabel={closedAgeLabel(item.closedAtMs, now)}
                live={header.live}
                testID={getLiveTradeHeaderTestId(item.id)}
              />
            </View>
          </PositionCardShell>
        </Pressable>
      </SocialTraderIdentityRow>
      {optionsSheet}
    </Box>
  );
};

export default React.memo(LiveTradeRow);
