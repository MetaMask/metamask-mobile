import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { StyleSheet, View } from 'react-native';
import { useSelector } from 'react-redux';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import SkeletonPlaceholder from 'react-native-skeleton-placeholder';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useTheme } from '../../../../../util/theme';
import { Box, BoxFlexDirection } from '@metamask/design-system-react-native';
import SectionHeader from '../../../../../component-library/components-temp/SectionHeader';
import SectionRow from '../../components/SectionRow';
import Routes from '../../../../../constants/navigation/Routes';
import { useOwnedNfts } from './hooks';
import NftGridItem from '../../../../UI/NftGrid/NftGridItem';
import NftGridItemBottomSheet from '../../../../UI/NftGrid/NftGridItemBottomSheet';
import { useNftRefresh } from '../../../../UI/NftGrid/useNftRefresh';
import { CollectiblesEmptyState } from '../../../../UI/CollectiblesEmptyState/CollectiblesEmptyState';
import { useNftDetection } from '../../../../hooks/useNftDetection';
import { SectionRefreshHandle } from '../../types';
import { strings } from '../../../../../../locales/i18n';
import { isNftFetchingProgressSelector } from '../../../../../reducers/collectibles';
import useHomeViewedEvent, {
  HomeSectionNames,
} from '../../hooks/useHomeViewedEvent';
import { useSectionPerformance } from '../../hooks/useSectionPerformance';
import { Nft } from '@metamask/assets-controllers';
import { MetaMetricsEvents } from '../../../../../core/Analytics';
import { useAnalytics } from '../../../../hooks/useAnalytics/useAnalytics';

const MAX_NFTS_DISPLAYED = 6;
const NFTS_PER_ROW = 3;

const styles = StyleSheet.create({
  sectionGap: { gap: 12 },
});

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
            <View style={tw.style('h-4 rounded-lg mb-1 w-[60%]')} />
            <View style={tw.style('h-3.5 rounded-md w-full')} />
          </View>
        ))}
      </View>
    </SkeletonPlaceholder>
  );
};

interface NFTsSectionProps {
  sectionIndex: number;
  totalSectionsLoaded: number;
}

const NFTsSection = forwardRef<SectionRefreshHandle, NFTsSectionProps>(
  ({ sectionIndex, totalSectionsLoaded }, ref) => {
    const sectionViewRef = useRef<View>(null);
    const navigation = useNavigation();
    const { trackEvent, createEventBuilder } = useAnalytics();
    const ownedNfts = useOwnedNfts();
    const hasNfts = ownedNfts.length > 0;
    const isNftFetchingProgress = useSelector(isNftFetchingProgressSelector);
    const { onRefresh } = useNftRefresh();
    const { detectNfts, abortDetection } = useNftDetection();
    const hasLoadedOnceRef = useRef(false);
    const isSilentDetectionRef = useRef(false);

    useFocusEffect(
      useCallback(() => {
        isSilentDetectionRef.current = hasLoadedOnceRef.current;

        detectNfts()
          .catch(() => {
            // AbortError is expected when detection is cancelled on blur
          })
          .finally(() => {
            hasLoadedOnceRef.current = true;
            isSilentDetectionRef.current = false;
          });

        return () => {
          abortDetection();
          isSilentDetectionRef.current = false;
        };
      }, [detectNfts, abortDetection]),
    );

    const showSkeleton = isNftFetchingProgress && !isSilentDetectionRef.current;

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

    const [isAddNFTEnabled, setIsAddNFTEnabled] = useState(true);

    const handleImportNfts = useCallback(() => {
      setIsAddNFTEnabled(false);
      navigation.navigate('AddAsset', { assetType: 'collectible' });
      trackEvent(
        createEventBuilder(MetaMetricsEvents.WALLET_ADD_COLLECTIBLES)
          .addProperties({ action: 'Wallet View', name: 'Add Collectibles' })
          .build(),
      );
      setTimeout(() => setIsAddNFTEnabled(true), 1000);
    }, [navigation, trackEvent, createEventBuilder]);

    // Pass null while loading so the hook uses the immediate-fire path and
    // does not fire from viewport visibility with stale itemCount/isEmpty.
    const isLoadingSection = isNftFetchingProgress && !hasNfts;
    const willRender = !isLoadingSection;

    const { onLayout } = useHomeViewedEvent({
      sectionRef: willRender ? sectionViewRef : null,
      isLoading: isLoadingSection,
      sectionName: HomeSectionNames.NFTS,
      sectionIndex,
      totalSectionsLoaded,
      isEmpty: !hasNfts,
      itemCount: ownedNfts.length,
    });

    useSectionPerformance({
      sectionId: HomeSectionNames.NFTS,
      contentReady: !isLoadingSection,
      isEmpty: !hasNfts,
      isLoading: isLoadingSection,
    });

    return (
      <View ref={sectionViewRef} onLayout={onLayout} style={styles.sectionGap}>
        <SectionHeader title={title} onPress={handleViewAllNfts} />
        {hasNfts ? (
          <SectionRow gap={3}>
            {nftRows.map((row, rowIndex) => (
              <Box
                key={`nft-row-${rowIndex}`}
                flexDirection={BoxFlexDirection.Row}
                gap={3}
              >
                {row.map((nft) => (
                  <NftGridItem
                    key={`${nft.address}-${nft.tokenId}`}
                    item={nft}
                    onLongPress={handleLongPress}
                    source="mobile-nft-list"
                    twClassName="flex-1"
                  />
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
          </SectionRow>
        ) : showSkeleton ? (
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
