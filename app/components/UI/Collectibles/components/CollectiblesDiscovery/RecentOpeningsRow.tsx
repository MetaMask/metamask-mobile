import React, { useRef } from 'react';
import { FlatList } from 'react-native';
import { Box } from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { strings } from '../../../../../../locales/i18n';
import type {
  CollectiblesOpening,
  CollectiblesInventoryCard,
} from '../../types';
import { DiscoveryCard } from './DiscoveryCard';
import { useRecentOpeningArrival } from './useRecentOpeningArrival';

/** Replit PackPullActivity: report inspection to the feed hook; no second snapshot cache. */
export default function RecentOpeningsRow({
  cards,
  onPress,
  limit,
  active = true,
  onPause,
  onResume,
}: {
  cards: CollectiblesOpening[];
  onPress: (card: CollectiblesInventoryCard) => void;
  limit: number;
  active?: boolean;
  onPause: () => void;
  onResume: () => void;
}) {
  const tw = useTailwind();
  const offset = useRef(0);
  const arrival = useRecentOpeningArrival(cards, active);
  const hold = onPause;
  const release = () => {
    if (offset.current < 4) onResume();
  };
  return (
    <FlatList
      horizontal
      data={cards.slice(0, limit)}
      keyExtractor={(card) => card.id}
      testID="collectibles-recent-openings-row"
      onTouchStart={hold}
      onTouchEnd={release}
      onTouchCancel={release}
      onScrollBeginDrag={hold}
      onScroll={({ nativeEvent }) => {
        offset.current = nativeEvent.contentOffset.x;
        if (offset.current >= 4) onPause();
      }}
      scrollEventThrottle={16}
      onScrollEndDrag={({ nativeEvent }) => {
        offset.current = nativeEvent.contentOffset.x;
        if (nativeEvent.contentOffset.x < 4) onResume();
      }}
      onMomentumScrollEnd={({ nativeEvent }) => {
        offset.current = nativeEvent.contentOffset.x;
        if (nativeEvent.contentOffset.x < 4) onResume();
      }}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={tw.style('px-4 gap-3')}
      initialNumToRender={3}
      maxToRenderPerBatch={3}
      windowSize={3}
      renderItem={({ item }) => (
        <Box twClassName="w-40">
          <DiscoveryCard
            card={item}
            onPress={onPress}
            arrival={arrival.identity === item.id ? arrival : undefined}
            reserveCaption
            caption={[
              item.openerAddress
                ? `${item.openerAddress.slice(0, 6)}…${item.openerAddress.slice(-4)}`
                : undefined,
              strings('collectibles_discovery.opened_at', {
                date: new Date(item.openedAt).toLocaleString(),
              }),
            ]
              .filter(Boolean)
              .join(' · ')}
          />
        </Box>
      )}
    />
  );
}
