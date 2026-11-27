import React from 'react';
import { Pressable, View } from 'react-native';
import {
  ButtonIcon,
  ButtonIconSize,
  Icon,
  IconColor,
  IconName,
  IconSize,
} from '@metamask/design-system-react-native';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { WatchlistFullScreenViewSelectorsIDs } from './WatchlistFullScreenView.testIds';
import { useWatchlistRowReorder } from './useWatchlistRowReorder';

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
  const tw = useTailwind();
  const { handleLongPress, accessibilityActions, handleAccessibilityAction } =
    useWatchlistRowReorder({ enabled: isEditMode, onMoveUp, onMoveDown });

  const rowBody = (
    <>
      <View
        style={tw.style(
          isEditMode
            ? 'h-10 mt-2 items-center justify-center pr-3'
            : 'w-0 overflow-hidden',
        )}
        pointerEvents="none"
      >
        <Icon
          name={IconName.Menu}
          size={IconSize.Md}
          color={IconColor.IconMuted}
        />
      </View>

      <View
        style={tw.style('flex-1 min-w-0')}
        pointerEvents={isEditMode ? 'none' : 'auto'}
      >
        {children}
      </View>
    </>
  );

  return (
    <View style={tw.style('flex-row items-start')} testID={rowTestID}>
      {isEditMode ? (
        <Pressable
          style={tw.style('flex-1 flex-row items-start min-w-0')}
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
        <View style={tw.style('flex-1 flex-row items-start min-w-0')}>
          {rowBody}
        </View>
      )}

      {isEditMode ? (
        <View
          style={tw.style('h-10 mt-2 items-center justify-center pl-4 z-1')}
        >
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
