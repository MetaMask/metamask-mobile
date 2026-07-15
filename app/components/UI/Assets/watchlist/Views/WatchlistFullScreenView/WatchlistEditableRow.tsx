import React, { useCallback } from 'react';
import { View } from 'react-native';
import type { CaipAssetType } from '@metamask/utils';
import {
  ButtonIcon,
  ButtonIconSize,
  IconName,
} from '@metamask/design-system-react-native';
import Icon, {
  IconColor,
  IconName as LocalIconName,
  IconSize,
} from '../../../../../../component-library/components/Icons/Icon';
import { useStyles } from '../../../../../../component-library/hooks';
import { useTokenWatchlistRemoveItemMutation } from '../../hooks/useTokenWatchlistMutations';
import TrendingTokenRowItem from '../../../../Trending/components/TrendingTokenRowItem/TrendingTokenRowItem';
import { TokenDetailsSource } from '../../../../TokenDetails/constants/constants';
import { WatchlistFullScreenViewSelectorsIDs } from './WatchlistFullScreenView.testIds';
import styleSheet from './WatchlistFullScreenView.styles';
import type { TrendingAsset } from '@metamask/assets-controllers';

interface WatchlistEditableRowProps {
  token: TrendingAsset;
  position: number;
}

const WatchlistEditableRow = ({
  token,
  position,
}: WatchlistEditableRowProps) => {
  const { styles } = useStyles(styleSheet, {});
  const removeMutation = useTokenWatchlistRemoveItemMutation();

  const handleUnwatch = useCallback(() => {
    removeMutation.mutate(token.assetId as CaipAssetType);
  }, [removeMutation, token.assetId]);

  return (
    <View
      style={styles.editableRow}
      testID={WatchlistFullScreenViewSelectorsIDs.EDITABLE_ROW}
    >
      <View
        style={styles.dragHandle}
        testID={WatchlistFullScreenViewSelectorsIDs.DRAG_HANDLE}
      >
        <Icon
          name={LocalIconName.DragGrid}
          size={IconSize.Md}
          color={IconColor.Muted}
        />
      </View>

      <View style={styles.editableRowContent} pointerEvents="none">
        <TrendingTokenRowItem
          token={token}
          position={position}
          tokenDetailsSource={TokenDetailsSource.WatchlistFullscreen}
        />
      </View>

      <View style={styles.unwatchStar}>
        <ButtonIcon
          iconName={IconName.StarFilled}
          size={ButtonIconSize.Md}
          onPress={handleUnwatch}
          testID={WatchlistFullScreenViewSelectorsIDs.UNWATCH_STAR}
          accessibilityLabel="Remove from watchlist"
        />
      </View>
    </View>
  );
};

export default WatchlistEditableRow;
