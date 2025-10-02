import React from 'react';
import { CollectiblesEmptyState } from '../CollectiblesEmptyState';
import { WalletViewSelectorsIDs } from '../../../../e2e/selectors/wallet/WalletView.selectors';
import { isNftFetchingProgressSelector } from '../../../reducers/collectibles';
import { useSelector } from 'react-redux';

const NftGridEmpty = ({
  isAddNFTEnabled,
  goToAddCollectible,
}: {
  isAddNFTEnabled: boolean;
  goToAddCollectible: () => void;
}) => {
  const isNftFetchingProgress = useSelector(isNftFetchingProgressSelector);

  return (
    !isNftFetchingProgress && (
      <CollectiblesEmptyState
        onAction={goToAddCollectible}
        actionButtonProps={{
          testID: WalletViewSelectorsIDs.IMPORT_NFT_BUTTON,
          isDisabled: !isAddNFTEnabled,
        }}
        twClassName="mx-auto mt-4"
        testID="collectibles-empty-state"
      />
    )
  );
};

export default NftGridEmpty;
