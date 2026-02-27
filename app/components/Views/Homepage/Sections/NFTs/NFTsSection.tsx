import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useState,
} from 'react';
import { View } from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useTheme } from '../../../../../util/theme';
import { Box, BoxFlexDirection } from '@metamask/design-system-react-native';
import SectionTitle from '../../components/SectionTitle';
import SectionRow from '../../components/SectionRow';
import Routes from '../../../../../constants/navigation/Routes';
import { useOwnedNfts } from './hooks';
import NftGridItem from '../../../../UI/NftGrid/NftGridItem';
import { useNftRefresh } from '../../../../UI/NftGrid/useNftRefresh';
import { CollectiblesEmptyState } from '../../../../UI/CollectiblesEmptyState/CollectiblesEmptyState';
import { SectionRefreshHandle } from '../../types';
import { strings } from '../../../../../../locales/i18n';
import { isNftFetchingProgressSelector } from '../../../../../reducers/collectibles';

const MAX_NFTS_DISPLAYED = 6;
const NFTS_PER_ROW = 3;

// No-op for long press since we don't need action sheet in homepage section
const noop = () => undefined;

const NftSkeletonRow = () => {
  const { colors } = useTheme();
  const tw = useTailwind();

  return (
    <SkeletonPlaceholder
      backgroundColor={colors.background.section}
      highlightColor={colors.background.subsection}
    >
      <View style={tw.style('flex-row gap-3')}>
        {Array.from({ length: NFTS_PER_ROW }, (_, index) => (
          <View key={index} style={tw.style('flex-1')}>
            <View style={tw.style('w-full aspect-square rounded-xl mb-3')} />
            <View>
              <View style={tw.style('h-4 rounded-lg mb-1 w-[60%]')} />
              <View style={tw.style('h-3.5 rounded-md w-full')} />
            </View>
          </View>
        ))}
      </View>
    </SkeletonPlaceholder>
  );
};

const NFTsSection = forwardRef<SectionRefreshHandle>((_, ref) => {
  const navigation = useNavigation();
  const ownedNfts = useOwnedNfts();
  const hasNfts = ownedNfts.length > 0;
  const isNftFetchingProgress = useSelector(isNftFetchingProgressSelector);
  const { onRefresh } = useNftRefresh();

  const title = strings('homepage.sections.nfts');

  useImperativeHandle(ref, () => ({ refresh: onRefresh }), [onRefresh]);

  const displayNfts = useMemo(
    () => ownedNfts.slice(0, MAX_NFTS_DISPLAYED),
    [ownedNfts],
  );

  // Split NFTs into rows of NFTS_PER_ROW
  const nftRows = useMemo(() => {
    const rows: (typeof displayNfts)[] = [];
    for (let i = 0; i < displayNfts.length; i += NFTS_PER_ROW) {
      rows.push(displayNfts.slice(i, i + NFTS_PER_ROW));
    }
    return rows;
  }, [displayNfts]);

  const handleViewAllNfts = useCallback(() => {
    navigation.navigate(Routes.WALLET.NFTS_FULL_VIEW);
  }, [navigation]);

  const [isAddNFTEnabled, setIsAddNFTEnabled] = useState(true);

  const handleImportNfts = useCallback(() => {
    setIsAddNFTEnabled(false);
    navigation.navigate('AddAsset', { assetType: 'collectible' });
    setTimeout(() => setIsAddNFTEnabled(true), 1000);
  }, [navigation]);

  return (
    <Box gap={3}>
      <SectionTitle title={title} onPress={handleViewAllNfts} />
      {hasNfts ? (
        <SectionRow>
          <Box gap={3}>
            {nftRows.map((row, rowIndex) => (
              <Box
                key={`nft-row-${rowIndex}`}
                flexDirection={BoxFlexDirection.Row}
                gap={3}
              >
                {row.map((nft) => (
                  <Box
                    key={`${nft.address}-${nft.tokenId}`}
                    twClassName="flex-1"
                  >
                    <NftGridItem
                      item={nft}
                      onLongPress={noop}
                      source="mobile-nft-list"
                    />
                  </Box>
                ))}
                {/* Add empty boxes to maintain grid alignment for incomplete rows */}
                {row.length < NFTS_PER_ROW &&
                  Array.from({ length: NFTS_PER_ROW - row.length }).map(
                    (__, i) => (
                      <Box
                        key={`empty-${rowIndex}-${i}`}
                        twClassName="flex-1"
                      />
                    ),
                  )}
              </Box>
            ))}
          </Box>
        </SectionRow>
      ) : isNftFetchingProgress ? (
        <SectionRow>
          <NftSkeletonRow />
        </SectionRow>
      ) : (
        <CollectiblesEmptyState
          onAction={handleImportNfts}
          actionButtonProps={{ isDisabled: !isAddNFTEnabled }}
          twClassName="mx-auto mt-2"
        />
      )}
    </Box>
  );
});

export default NFTsSection;
