import React, { useCallback } from 'react';
import { Pressable, View } from 'react-native';
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
import TrendingTokenRowItem from '../../../../Trending/components/TrendingTokenRowItem/TrendingTokenRowItem';
import { TokenDetailsSource } from '../../../../TokenDetails/constants/constants';
import { WatchlistFullScreenViewSelectorsIDs } from './WatchlistFullScreenView.testIds';
import styleSheet from './WatchlistFullScreenView.styles';
import type { TrendingAsset } from '@metamask/assets-controllers';

interface WatchlistEditableRowProps {
  token: TrendingAsset;
  position: number;
  isEditMode: boolean;
  onRemoveFromDraft?: (assetId: string) => void;
}

/**
 * In edit mode the whole row (except the trash control) long-presses to drag.
 * The drag-grid icon is a visual affordance only — a small left-edge hit target
 * conflicts with Android's system back gesture.
 */
const WatchlistEditableRow = ({
  token,
  position,
  isEditMode,
  onRemoveFromDraft,
}: WatchlistEditableRowProps): React.JSX.Element => {
  const { styles } = useStyles(styleSheet, {});
  const drag = useReorderableDrag();

  const handleUnwatch = useCallback(() => {
    onRemoveFromDraft?.(String(token.assetId));
  }, [onRemoveFromDraft, token.assetId]);

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
        <TrendingTokenRowItem
          token={token}
          position={position}
          tokenDetailsSource={TokenDetailsSource.WatchlistFullscreen}
          twClassName={isEditMode ? undefined : '-mx-4 w-auto px-4'}
        />
      </View>
    </>
  );

  return (
    <View
      style={styles.editableRow}
      testID={WatchlistFullScreenViewSelectorsIDs.EDITABLE_ROW}
    >
      {isEditMode ? (
        <Pressable
          style={styles.dragArea}
          onLongPress={drag}
          delayLongPress={300}
          testID={WatchlistFullScreenViewSelectorsIDs.DRAG_HANDLE}
          accessibilityRole="button"
          accessibilityLabel="Drag to reorder"
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
            onPress={handleUnwatch}
            testID={WatchlistFullScreenViewSelectorsIDs.UNWATCH_STAR}
            accessibilityLabel="Remove from watchlist"
          />
        </View>
      ) : null}
    </View>
  );
};

export default WatchlistEditableRow;
