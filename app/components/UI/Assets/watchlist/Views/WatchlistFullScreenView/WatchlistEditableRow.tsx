import React, { useCallback } from 'react';
import TrendingTokenRowItem from '../../../../Trending/components/TrendingTokenRowItem/TrendingTokenRowItem';
import { TokenDetailsSource } from '../../../../TokenDetails/constants/constants';
import { WatchlistFullScreenViewSelectorsIDs } from './WatchlistFullScreenView.testIds';
import WatchlistEditableRowChrome from './WatchlistEditableRowChrome';
import type { TrendingAsset } from '@metamask/assets-controllers';

interface WatchlistEditableRowProps {
  token: TrendingAsset;
  position: number;
  isEditMode: boolean;
  onRemoveFromDraft?: (assetId: string) => void;
}

const WatchlistEditableRow = ({
  token,
  position,
  isEditMode,
  onRemoveFromDraft,
}: WatchlistEditableRowProps): React.JSX.Element => {
  const handleUnwatch = useCallback(() => {
    onRemoveFromDraft?.(String(token.assetId));
  }, [onRemoveFromDraft, token.assetId]);

  return (
    <WatchlistEditableRowChrome
      isEditMode={isEditMode}
      onRemove={handleUnwatch}
      rowTestID={WatchlistFullScreenViewSelectorsIDs.EDITABLE_ROW}
    >
      <TrendingTokenRowItem
        token={token}
        position={position}
        tokenDetailsSource={TokenDetailsSource.WatchlistFullscreen}
        twClassName={isEditMode ? undefined : '-mx-4 w-auto px-4'}
      />
    </WatchlistEditableRowChrome>
  );
};

export default WatchlistEditableRow;
