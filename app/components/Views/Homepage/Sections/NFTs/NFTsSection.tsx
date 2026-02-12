import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
} from 'react';
import { useNavigation } from '@react-navigation/native';
import {
  Box,
  Text,
  BoxFlexDirection,
} from '@metamask/design-system-react-native';
import SectionTitle from '../../components/SectionTitle';
import SectionCard from '../../components/SectionCard';
import SectionRow from '../../components/SectionRow';
import Routes from '../../../../../constants/navigation/Routes';
import { useOwnedNfts } from './hooks';
import NftGridItem from '../../../../UI/NftGrid/NftGridItem';
import { SectionRefreshHandle } from '../../types';

const MAX_NFTS_DISPLAYED = 3;

/**
 * Controls behavior when user has no NFTs:
 * - true: Show discovery/empty state content
 * - false: Hide the entire section (return null)
 */
const SHOW_EMPTY_STATE = false;

// No-op for long press since we don't need action sheet in homepage section
const noop = () => undefined;

const NFTsSection = forwardRef<SectionRefreshHandle>((_, ref) => {
  const navigation = useNavigation();
  const ownedNfts = useOwnedNfts();
  const hasNfts = ownedNfts.length > 0;

  const refresh = useCallback(async () => {
    // TODO: Implement NFT refresh logic
  }, []);

  useImperativeHandle(ref, () => ({ refresh }), [refresh]);

  const displayNfts = useMemo(
    () => ownedNfts.slice(0, MAX_NFTS_DISPLAYED),
    [ownedNfts],
  );

  const handleViewAllNfts = useCallback(() => {
    navigation.navigate(Routes.WALLET.NFTS_FULL_VIEW);
  }, [navigation]);

  // Hide section entirely if no NFTs and empty state is disabled
  if (!hasNfts && !SHOW_EMPTY_STATE) {
    return null;
  }

  const title = hasNfts ? 'NFTs' : 'Discover NFTs';

  return (
    <Box gap={3}>
      <SectionTitle title={title} onPress={handleViewAllNfts} />
      {hasNfts ? (
        <SectionRow>
          <Box flexDirection={BoxFlexDirection.Row} gap={3}>
            {displayNfts.map((nft) => (
              <Box key={`${nft.address}-${nft.tokenId}`} twClassName="flex-1">
                <NftGridItem
                  item={nft}
                  onLongPress={noop}
                  source="mobile-nft-list"
                />
              </Box>
            ))}
          </Box>
        </SectionRow>
      ) : (
        <SectionRow>
          <SectionCard>
            <Text>NFT discovery content placeholder :)</Text>
          </SectionCard>
        </SectionRow>
      )}
    </Box>
  );
});

export default NFTsSection;
