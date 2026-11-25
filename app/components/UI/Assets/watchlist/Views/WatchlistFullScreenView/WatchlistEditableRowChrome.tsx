import React, { useCallback, useMemo } from 'react';
import {
  Pressable,
  View,
  type AccessibilityActionEvent,
  type AccessibilityActionInfo,
} from 'react-native';
import {
  ButtonIcon,
  ButtonIconSize,
  Icon,
  IconColor,
  IconName,
  IconSize,
} from '@metamask/design-system-react-native';
import { useReorderableDrag } from 'react-native-reorderable-list';
import { useStyles } from '../../../../../../component-library/hooks';
import { fireImpact, ImpactMoment } from '../../../../../../util/haptics';
import { strings } from '../../../../../../../locales/i18n';
import { WatchlistFullScreenViewSelectorsIDs } from './WatchlistFullScreenView.testIds';
import styleSheet from './WatchlistFullScreenView.styles';

interface WatchlistEditableRowChromeProps {
  isEditMode: boolean;
  onRemove: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  rowTestID?: string;
  children: React.ReactNode;
}

/**
 * Shared edit-mode chrome for reorderable watchlist rows.
 * In edit mode the whole row (except the trash control) long-presses to drag;
 * the drag-grid icon is a visual affordance only so a small left-edge hit
 * target doesn't conflict with Android's system back gesture.
 */
const WatchlistEditableRowChrome = ({
  isEditMode,
  onRemove,
  onMoveUp,
  onMoveDown,
  rowTestID,
  children,
}: WatchlistEditableRowChromeProps): React.JSX.Element => {
  const { styles } = useStyles(styleSheet, {});
  const drag = useReorderableDrag();

  const handleLongPress = useCallback(() => {
    fireImpact(ImpactMoment.SliderGrip);
    drag();
  }, [drag]);

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

  const rowBody = (
    <>
      <View
        style={isEditMode ? styles.dragHandle : styles.editControlHidden}
        pointerEvents="none"
      >
        <Icon
          name={IconName.Menu}
          size={IconSize.Md}
          color={IconColor.IconMuted}
        />
      </View>

      <View
        style={styles.editableRowContent}
        pointerEvents={isEditMode ? 'none' : 'auto'}
      >
        {children}
      </View>
    </>
  );

  return (
    <View style={styles.editableRow} testID={rowTestID}>
      {isEditMode ? (
        <Pressable
          style={styles.dragArea}
          onLongPress={handleLongPress}
          delayLongPress={300}
          testID={WatchlistFullScreenViewSelectorsIDs.DRAG_HANDLE}
          accessibilityRole="button"
          accessibilityLabel="Drag to reorder"
          accessibilityActions={accessibilityActions}
          onAccessibilityAction={handleAccessibilityAction}
        >
          {rowBody}
        </Pressable>
      ) : (
        <View style={styles.dragArea}>{rowBody}</View>
      )}

      {isEditMode ? (
        <View style={styles.unwatchStar}>
          <ButtonIcon
            iconName={IconName.Trash}
            size={ButtonIconSize.Md}
            onPress={onRemove}
            testID={WatchlistFullScreenViewSelectorsIDs.UNWATCH_STAR}
            accessibilityLabel="Remove from watchlist"
          />
        </View>
      ) : null}
    </View>
  );
};

export default WatchlistEditableRowChrome;
