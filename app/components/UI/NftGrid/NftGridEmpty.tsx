import React from 'react';
import { CollectiblesEmptyState } from '../CollectiblesEmptyState';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { WalletViewSelectorsIDs } from '../../../../e2e/selectors/wallet/WalletView.selectors';

const NftGridEmpty = ({
  isAddNFTEnabled,
  goToAddCollectible,
}: {
  isAddNFTEnabled: boolean;
  goToAddCollectible: () => void;
}) => {
  const tw = useTailwind();

  return (
    <CollectiblesEmptyState
      onDiscoverCollectibles={goToAddCollectible}
      actionButtonProps={{
        testID: WalletViewSelectorsIDs.IMPORT_NFT_BUTTON,
        isDisabled: !isAddNFTEnabled,
      }}
      style={tw.style('mx-auto')}
    />
  );
};

export default NftGridEmpty;
