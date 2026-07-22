import React, { useMemo } from 'react';
import { View } from 'react-native';
import type { TrendingAsset } from '@metamask/assets-controllers';
import type { CaipAssetType } from '@metamask/utils';
import { useStyles } from '../../../../../../component-library/hooks';
import { TokenSearchRowItem } from '../../../../../Views/TrendingView/feeds/tokens/TokenRowItem';
import { TokenDetailsSource } from '../../../../TokenDetails/constants/constants';
import WatchlistStarButton from '../WatchlistStarButton';
import styleSheet from './WatchlistSearchRowItem.styles';
import { WatchlistSearchRowItemTestIds } from './WatchlistSearchRowItem.testIds';

const getWatchlistAssetType = (assetId: string): 'native' | 'erc20' =>
  assetId.includes('/erc20:') ? 'erc20' : 'native';

interface WatchlistSearchRowItemProps {
  token: TrendingAsset;
  index: number;
}

const WatchlistSearchRowItem: React.FC<WatchlistSearchRowItemProps> = ({
  token,
  index,
}) => {
  const { styles } = useStyles(styleSheet, {});
  const assetId = String(token.assetId);
  const assetType = useMemo(() => getWatchlistAssetType(assetId), [assetId]);

  return (
    <View style={styles.row} testID={WatchlistSearchRowItemTestIds.ROW}>
      <View style={styles.rowContent}>
        <TokenSearchRowItem
          token={token}
          index={index}
          tokenDetailsSource={TokenDetailsSource.WatchlistFullscreenSearch}
        />
      </View>
      <View style={styles.starContainer}>
        <WatchlistStarButton
          assetId={token.assetId as CaipAssetType}
          assetType={assetType}
          source="watchlist_fullscreen_search"
        />
      </View>
    </View>
  );
};

export default WatchlistSearchRowItem;
