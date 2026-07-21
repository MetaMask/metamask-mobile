import React, { useCallback } from 'react';
import { View } from 'react-native';
import type { CaipAssetType } from '@metamask/utils';
import {
  ButtonIcon,
  ButtonIconSize,
  IconName,
} from '@metamask/design-system-react-native';
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
  isEditMode: boolean;
}

const WatchlistEditableRow = ({
  token,
  position,
  isEditMode,
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
        style={styles.editableRowContent}
        pointerEvents={isEditMode ? 'none' : 'auto'}
      >
        <TrendingTokenRowItem
          token={token}
          position={position}
          tokenDetailsSource={TokenDetailsSource.WatchlistFullscreen}
        />
      </View>

      <View
        style={isEditMode ? styles.unwatchStar : styles.editControlHidden}
        pointerEvents={isEditMode ? 'auto' : 'none'}
      >
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
