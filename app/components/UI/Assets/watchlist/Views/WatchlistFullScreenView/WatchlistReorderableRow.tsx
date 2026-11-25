import React, { useCallback, useMemo } from 'react';
import {
  View,
  type AccessibilityActionEvent,
  type AccessibilityActionInfo,
} from 'react-native';
import { useReorderableDrag } from 'react-native-reorderable-list';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import PerpsMarketRowItem from '../../../../Perps/components/PerpsMarketRowItem/PerpsMarketRowItem';
import { usePerpsNavigation } from '../../../../Perps/hooks/usePerpsNavigation';
import { PERPS_EVENT_VALUE } from '@metamask/perps-controller';
import WatchlistTokenRowItem from '../../../../Watchlist/WatchlistTokenRowItem';
import WatchlistUnavailablePerpRow from '../../../../Watchlist/WatchlistUnavailablePerpRow';
import type { UnifiedWatchlistItem } from '../../../../Watchlist/types';
import { fireImpact, ImpactMoment } from '../../../../../../util/haptics';
import { WatchlistFullScreenViewSelectorsIDs } from './WatchlistFullScreenView.testIds';
import { strings } from '../../../../../../../locales/i18n';

interface WatchlistReorderableRowProps {
  item: UnifiedWatchlistItem;
  position: number;
  isDragEnabled: boolean;
  canUseLivePerpsPrices: boolean;
  onRemoveFromWatchlist: (item: UnifiedWatchlistItem) => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}

const WatchlistReorderableRow = ({
  item,
  position,
  isDragEnabled,
  canUseLivePerpsPrices,
  onRemoveFromWatchlist,
  onMoveUp,
  onMoveDown,
}: WatchlistReorderableRowProps): React.JSX.Element => {
  const tw = useTailwind();
  const { navigateToMarketDetails } = usePerpsNavigation();
  const drag = useReorderableDrag();

  const handleLongPress = useCallback(() => {
    if (!isDragEnabled) {
      return;
    }

    fireImpact(ImpactMoment.SliderGrip);
    drag();
  }, [drag, isDragEnabled]);

  const accessibilityActions = useMemo<AccessibilityActionInfo[]>(
    () => [
      ...(onMoveUp
        ? [{ name: 'moveUp', label: strings('token_watchlist.move_up') }]
        : []),
      ...(onMoveDown
        ? [{ name: 'moveDown', label: strings('token_watchlist.move_down') }]
        : []),
    ],
    [onMoveDown, onMoveUp],
  );

  const handleAccessibilityAction = useCallback(
    (event: AccessibilityActionEvent) => {
      if (event.nativeEvent.actionName === 'moveUp') {
        onMoveUp?.();
      } else if (event.nativeEvent.actionName === 'moveDown') {
        onMoveDown?.();
      }
    },
    [onMoveDown, onMoveUp],
  );

  const rowContent =
    item.kind === 'token' ? (
      <WatchlistTokenRowItem
        token={item.token}
        position={position}
        onLongPress={isDragEnabled ? handleLongPress : undefined}
        onWatchlistPress={() => onRemoveFromWatchlist(item)}
        isWatchlisted
        twClassName="px-4"
        accessibilityActions={accessibilityActions}
        onAccessibilityAction={handleAccessibilityAction}
      />
    ) : item.status === 'resolved' ? (
      <PerpsMarketRowItem
        market={item.market}
        compact
        showBadge={false}
        twClassName="px-4"
        enableLivePrices={canUseLivePerpsPrices}
        onLongPress={isDragEnabled ? handleLongPress : undefined}
        onWatchlistPress={() => onRemoveFromWatchlist(item)}
        isWatchlisted
        accessibilityActions={accessibilityActions}
        onAccessibilityAction={handleAccessibilityAction}
        onPress={(market) =>
          navigateToMarketDetails(
            market,
            PERPS_EVENT_VALUE.SOURCE.PERPS_HOME_WATCHLIST,
          )
        }
      />
    ) : (
      <WatchlistUnavailablePerpRow
        item={item}
        onLongPress={isDragEnabled ? handleLongPress : undefined}
        onRemove={() => onRemoveFromWatchlist(item)}
        twClassName="px-4 py-2 min-h-0"
        accessibilityActions={accessibilityActions}
        onAccessibilityAction={handleAccessibilityAction}
      />
    );

  return (
    <View
      style={tw.style('flex-row items-center')}
      testID={WatchlistFullScreenViewSelectorsIDs.ROW}
    >
      <View style={tw.style('min-w-0 flex-1 flex-row items-center')}>
        {rowContent}
      </View>
    </View>
  );
};

export default React.memo(WatchlistReorderableRow);
