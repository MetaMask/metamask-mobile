import React, { useCallback } from 'react';
import { View } from 'react-native';
import type { ReorderableListReorderEvent } from 'react-native-reorderable-list';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import type { PerpsMarketData } from '@metamask/perps-controller';
import PerpsMarketRowItem from '../../../../Perps/components/PerpsMarketRowItem/PerpsMarketRowItem';
import WatchlistTokenRowItem from '../../../../Watchlist/WatchlistTokenRowItem';
import WatchlistUnavailablePerpRow from '../../../../Watchlist/WatchlistUnavailablePerpRow';
import type { UnifiedWatchlistItem } from '../../../../Watchlist/types';
import { WatchlistFullScreenViewSelectorsIDs } from './WatchlistFullScreenView.testIds';
import { useWatchlistRowReorder } from './useWatchlistRowReorder';

interface WatchlistReorderableRowProps {
  item: UnifiedWatchlistItem;
  position: number;
  itemCount: number;
  isDragEnabled: boolean;
  canUseLivePerpsPrices: boolean;
  onPerpPress: (market: PerpsMarketData) => void;
  onRemoveFromWatchlist: (item: UnifiedWatchlistItem) => void;
  onReorder: (event: ReorderableListReorderEvent) => void;
}

const WatchlistReorderableRow = ({
  item,
  position,
  itemCount,
  isDragEnabled,
  canUseLivePerpsPrices,
  onPerpPress,
  onRemoveFromWatchlist,
  onReorder,
}: WatchlistReorderableRowProps): React.JSX.Element => {
  const tw = useTailwind();

  const handleRemove = useCallback(() => {
    onRemoveFromWatchlist(item);
  }, [item, onRemoveFromWatchlist]);

  const handleMoveUp = useCallback(() => {
    onReorder({ from: position, to: position - 1 });
  }, [onReorder, position]);

  const handleMoveDown = useCallback(() => {
    onReorder({ from: position, to: position + 1 });
  }, [onReorder, position]);

  const { handleLongPress, accessibilityActions, handleAccessibilityAction } =
    useWatchlistRowReorder({
      enabled: isDragEnabled,
      onMoveUp: isDragEnabled && position > 0 ? handleMoveUp : undefined,
      onMoveDown:
        isDragEnabled && position < itemCount - 1 ? handleMoveDown : undefined,
    });

  const renderRowContent = (): React.JSX.Element => {
    if (item.kind === 'token') {
      return (
        <WatchlistTokenRowItem
          token={item.token}
          position={position}
          onLongPress={isDragEnabled ? handleLongPress : undefined}
          onWatchlistPress={handleRemove}
          isWatchlisted
          showTypeTag
          twClassName="px-4"
          accessibilityActions={accessibilityActions}
          onAccessibilityAction={handleAccessibilityAction}
        />
      );
    }

    if (item.status === 'resolved') {
      return (
        <PerpsMarketRowItem
          market={item.market}
          compact
          showBadge={false}
          showTypeTag
          twClassName="px-4"
          enableLivePrices={canUseLivePerpsPrices}
          onLongPress={isDragEnabled ? handleLongPress : undefined}
          onWatchlistPress={handleRemove}
          isWatchlisted
          accessibilityActions={accessibilityActions}
          onAccessibilityAction={handleAccessibilityAction}
          onPress={onPerpPress}
        />
      );
    }

    return (
      <WatchlistUnavailablePerpRow
        item={item}
        onLongPress={isDragEnabled ? handleLongPress : undefined}
        onRemove={handleRemove}
        showTypeTag
        twClassName="px-4 py-2 min-h-0"
        accessibilityActions={accessibilityActions}
        onAccessibilityAction={handleAccessibilityAction}
      />
    );
  };

  return (
    <View
      style={tw.style('flex-row items-center')}
      testID={WatchlistFullScreenViewSelectorsIDs.ROW}
    >
      <View style={tw.style('min-w-0 flex-1 flex-row items-center')}>
        {renderRowContent()}
      </View>
    </View>
  );
};

export default React.memo(WatchlistReorderableRow);
