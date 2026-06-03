import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Box, BoxFlexDirection } from '@metamask/design-system-react-native';
import SectionHeader from '../../../../../component-library/components-temp/SectionHeader';
import SectionRow from '../../components/SectionRow';
import Routes from '../../../../../constants/navigation/Routes';
import { useOwnedNfts } from './hooks';
import NftGridItem from '../../../../UI/NftGrid/NftGridItem';
import NftGridItemBottomSheet from '../../../../UI/NftGrid/NftGridItemBottomSheet';
import { useNftRefresh } from '../../../../UI/NftGrid/useNftRefresh';
import { SectionRefreshHandle } from '../../types';
import { strings } from '../../../../../../locales/i18n';
import useHomeViewedEvent, {
  HomeSectionNames,
} from '../../hooks/useHomeViewedEvent';
import { useSectionPerformance } from '../../hooks/useSectionPerformance';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import { WalletViewSelectorsIDs } from '../../../Wallet/WalletView.testIds';
import { Nft } from '@metamask/assets-controllers';

const MAX_NFTS_DISPLAYED = 6;
const NFTS_PER_ROW = 3;

const styles = StyleSheet.create({
  sectionGap: { gap: 12 },
  flex1: { flex: 1 },
});

interface NFTsSectionProps {
  sectionIndex: number;
  totalSectionsLoaded: number;
}

const NFTsSection = forwardRef<SectionRefreshHandle, NFTsSectionProps>(
  ({ sectionIndex, totalSectionsLoaded }, ref) => {
    const sectionViewRef = useRef<View>(null);
    const navigation = useNavigation();
    const ownedNfts = useOwnedNfts();
    const hasNfts = ownedNfts.length > 0;
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

    const [longPressedNft, setLongPressedNft] = useState<Nft | null>(null);

    const handleLongPress = useCallback((nft: Nft) => {
      setLongPressedNft(nft);
    }, []);

    const { onLayout } = useHomeViewedEvent({
      sectionRef: hasNfts ? sectionViewRef : null,
      isLoading: false,
      sectionName: HomeSectionNames.NFTS,
      sectionIndex,
      totalSectionsLoaded,
      isEmpty: !hasNfts,
      itemCount: ownedNfts.length,
      fireImmediateWhenNoView: false,
    });

    useSectionPerformance({
      sectionId: HomeSectionNames.NFTS,
      contentReady: hasNfts,
      isEmpty: !hasNfts,
      isLoading: false,
      enabled: hasNfts,
    });

    if (!hasNfts) {
      return null;
    }

    return (
      <View ref={sectionViewRef} onLayout={onLayout} style={styles.sectionGap}>
        <SectionHeader
          title={title}
          onPress={handleViewAllNfts}
          testID={WalletViewSelectorsIDs.HOMEPAGE_SECTION_TITLE('nfts')}
        />
        <SectionRow gap={3}>
          {nftRows.map((row, rowIndex) => (
            <Box
              key={`nft-row-${rowIndex}`}
              flexDirection={BoxFlexDirection.Row}
              gap={3}
            >
              {row.map((nft) => (
                <View
                  key={`${nft.address}-${nft.tokenId}`}
                  style={styles.flex1}
                >
                  <NftGridItem
                    item={nft}
                    onLongPress={handleLongPress}
                    source="mobile-nft-list"
                  />
                </View>
              ))}
              {/* Add empty boxes to maintain grid alignment for incomplete rows */}
              {row.length < NFTS_PER_ROW &&
                Array.from({ length: NFTS_PER_ROW - row.length }).map(
                  (__, i) => (
                    <Box key={`empty-${rowIndex}-${i}`} twClassName="flex-1" />
                  ),
                )}
            </Box>
          ))}
        </SectionRow>
        <NftGridItemBottomSheet
          isVisible={longPressedNft !== null}
          onClose={() => setLongPressedNft(null)}
          nft={longPressedNft}
        />
      </View>
    );
  },
);

export default NFTsSection;
