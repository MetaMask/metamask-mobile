import { useCallback, useMemo } from 'react';
import type {
  AccessibilityActionEvent,
  AccessibilityActionInfo,
} from 'react-native';
import { useReorderableDrag } from 'react-native-reorderable-list';
import { fireImpact, ImpactMoment } from '../../../../../../util/haptics';
import { strings } from '../../../../../../../locales/i18n';

interface UseWatchlistRowReorderOptions {
  enabled?: boolean;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}

export const useWatchlistRowReorder = ({
  enabled = true,
  onMoveUp,
  onMoveDown,
}: UseWatchlistRowReorderOptions) => {
  const drag = useReorderableDrag();

  const handleLongPress = useCallback(() => {
    if (!enabled) {
      return;
    }
    fireImpact(ImpactMoment.SliderGrip);
    drag();
  }, [drag, enabled]);

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

  return {
    handleLongPress,
    accessibilityActions,
    handleAccessibilityAction,
  };
};
