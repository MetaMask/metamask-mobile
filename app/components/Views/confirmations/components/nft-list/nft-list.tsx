import React, { useCallback, useState } from 'react';
import {
  Box,
  Button,
  ButtonVariant,
} from '@metamask/design-system-react-native';

import Routes from '../../../../../constants/navigation/Routes';
import { Nft } from '../../types/token';
import { useSendContext } from '../../context/send-context';
import { useSendScreenNavigation } from '../../hooks/send/useSendScreenNavigation';
import { useAssetSelectionMetrics } from '../../hooks/send/metrics/useAssetSelectionMetrics';
import { Nft as NftComponent } from '../UI/nft';

const NFT_COUNT_PER_PAGE = 5;

interface NftListProps {
  nfts: Nft[];
}

export function NftList({ nfts }: NftListProps) {
  const { gotToSendScreen } = useSendScreenNavigation();
  const {
    updateAsset,
    asset: existingSelectedAsset,
    updateTo,
  } = useSendContext();
  const { captureAssetSelected } = useAssetSelectionMetrics();
  const [visibleNftCount, setVisibleNftCount] = useState(NFT_COUNT_PER_PAGE);

  const handleNftPress = useCallback(
    (nft: Nft) => {
      const position = nfts.findIndex(
        ({ address, tokenId }) =>
          address === nft.address && tokenId === nft.tokenId,
      );
      captureAssetSelected(nft, position.toString());
      updateAsset(nft);

      // Reset the to address when a new asset is selected
      if (existingSelectedAsset) {
        updateTo('');
      }

      if (nft.standard === 'ERC1155') {
        gotToSendScreen(Routes.SEND.AMOUNT);
      } else {
        gotToSendScreen(Routes.SEND.RECIPIENT);
      }
    },
    [
      captureAssetSelected,
      existingSelectedAsset,
      gotToSendScreen,
      nfts,
      updateAsset,
      updateTo,
    ],
  );

  const handleShowMore = useCallback(() => {
    setVisibleNftCount((prev) => prev + NFT_COUNT_PER_PAGE);
  }, []);

  const visibleNfts = nfts.slice(0, visibleNftCount);
  const hasMoreNfts = nfts.length > visibleNftCount;

  return (
    <Box twClassName="mb-8">
      <Box>
        {visibleNfts.map((nft) => (
          <NftComponent
            key={`${nft.chainId}-${nft.address}-${nft.tokenId}`}
            asset={nft}
            onPress={handleNftPress}
          />
        ))}
      </Box>
      {hasMoreNfts && (
        <Button
          variant={ButtonVariant.Tertiary}
          onPress={handleShowMore}
          twClassName="mb-4"
        >
          Show more NFTs
        </Button>
      )}
    </Box>
  );
}
