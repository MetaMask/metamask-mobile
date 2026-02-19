import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
} from 'react';
import { TouchableOpacity, Image, View } from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useTheme } from '../../../../../util/theme';
import {
  Box,
  Text,
  BoxFlexDirection,
  BoxAlignItems,
  BoxJustifyContent,
  TextVariant,
  TextColor,
  BoxBackgroundColor,
  FontWeight,
} from '@metamask/design-system-react-native';
import SectionTitle from '../../components/SectionTitle';
import SectionRow from '../../components/SectionRow';
import Routes from '../../../../../constants/navigation/Routes';
import { useOwnedNfts } from './hooks';
import NftGridItem from '../../../../UI/NftGrid/NftGridItem';
import { useNftRefresh } from '../../../../UI/NftGrid/useNftRefresh';
import { SectionRefreshHandle } from '../../types';
import { strings } from '../../../../../../locales/i18n';
import { isNftFetchingProgressSelector } from '../../../../../reducers/collectibles';
import gemIcon from './assets/gem.png';

const MAX_NFTS_DISPLAYED = 6;
const NFTS_PER_ROW = 3;

/**
 * Controls behavior when user has no NFTs:
 * - true: Show discovery/empty state content
 * - false: Hide the entire section (return null)
 */
const SHOW_EMPTY_STATE = true;

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

  const handleImportNfts = useCallback(() => {
    navigation.navigate('AddAsset', { assetType: 'collectible' });
  }, [navigation]);

  // Hide section entirely if no NFTs and empty state is disabled
  if (!hasNfts && !SHOW_EMPTY_STATE) {
    return null;
  }

  return (
    <Box gap={3}>
      <SectionTitle title={title} onPress={handleViewAllNfts} />
      {isNftFetchingProgress ? (
        <SectionRow>
          <NftSkeletonRow />
        </SectionRow>
      ) : hasNfts ? (
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
      ) : (
        <SectionRow>
          <TouchableOpacity onPress={handleImportNfts} activeOpacity={0.7}>
            <Box
              flexDirection={BoxFlexDirection.Row}
              alignItems={BoxAlignItems.Center}
              backgroundColor={BoxBackgroundColor.BackgroundMuted}
              padding={4}
              gap={4}
              twClassName="rounded-xl"
            >
              <Box
                alignItems={BoxAlignItems.Center}
                justifyContent={BoxJustifyContent.Center}
                twClassName="w-10 h-10"
              >
                <Image
                  source={gemIcon}
                  // eslint-disable-next-line react-native/no-inline-styles
                  style={{ width: 40, height: 40 }}
                  resizeMode="contain"
                />
              </Box>
              <Box twClassName="flex-1">
                <Text
                  variant={TextVariant.BodyMd}
                  fontWeight={FontWeight.Medium}
                  color={TextColor.TextDefault}
                >
                  {strings('homepage.sections.import_nfts')}
                </Text>
                <Text
                  variant={TextVariant.BodySm}
                  color={TextColor.TextAlternative}
                >
                  {strings('homepage.sections.import_nfts_description')}
                </Text>
              </Box>
            </Box>
          </TouchableOpacity>
        </SectionRow>
      )}
    </Box>
  );
});

export default NFTsSection;
