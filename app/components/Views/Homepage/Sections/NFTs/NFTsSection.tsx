import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { StyleSheet, View } from 'react-native';
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import {
  Box,
  BoxFlexDirection,
  SectionDivider,
  SectionHeader,
} from '@metamask/design-system-react-native';
import SectionRow from '../../components/SectionRow';
import Routes from '../../../../../constants/navigation/Routes';
import { useOwnedNfts } from './hooks';
import NftGridItem from '../../../../UI/NftGrid/NftGridItem';
import NftGridItemBottomSheet from '../../../../UI/NftGrid/NftGridItemBottomSheet';
import NftSkeletonCell from '../../../../UI/NftGrid/NftSkeletonCell';
import { isNftFetchingProgressSelector } from '../../../../../reducers/collectibles';
import { selectSelectedInternalAccountFormattedAddress } from '../../../../../selectors/accountsController';
import { useNftRefresh } from '../../../../UI/NftGrid/useNftRefresh';
import { useNftDetection } from '../../../../hooks/useNftDetection';
import { SectionRefreshHandle } from '../../types';
import { strings } from '../../../../../../locales/i18n';
import useHomeViewedEvent, {
  HomeSectionNames,
} from '../../hooks/useHomeViewedEvent';
import { useSectionPerformance } from '../../hooks/useSectionPerformance';
import useSectionViewportVisible from '../../hooks/useSectionViewportVisible';
import { useHomepageScrollContext } from '../../context/HomepageScrollContext';
// eslint-disable-next-line import-x/no-restricted-paths -- TODO(ADR-0020): route-isolation backlog
import { WalletViewSelectorsIDs } from '../../../Wallet/WalletView.testIds';
import { Nft } from '@metamask/assets-controllers';

const NFT_DETECTION_THROTTLE_MS = 300_000; // 5 minutes

const MAX_NFTS_DISPLAYED = 6;
const NFTS_PER_ROW = 3;

const styles = StyleSheet.create({
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
    const isDetecting = useSelector(isNftFetchingProgressSelector);
    const selectedAddress = useSelector(
      selectSelectedInternalAccountFormattedAddress,
    );
    const { onRefresh } = useNftRefresh();
    const { detectNfts } = useNftDetection();
    const detectNftsRef = useRef(detectNfts);
    detectNftsRef.current = detectNfts;

    const title = strings('homepage.sections.nfts');

    useImperativeHandle(ref, () => ({ refresh: onRefresh }), [onRefresh]);

    // Track whether this section is scrolled into the viewport (≥30% visible).
    // Detection is deferred until the user actually scrolls down to this section.
    const { isVisible, onLayout: onViewportLayout } = useSectionViewportVisible(
      sectionViewRef,
      { isLoading: false },
    );
    const { visitId } = useHomepageScrollContext();

    const lastDetectionRef = useRef<number | null>(null);
    const prevAddressRef = useRef(selectedAddress);
    // Read via refs to avoid making them deps of the detection effect, which would
    // cause the effect to re-run when NFTs load in and reset the throttle prematurely.
    const hasNftsRef = useRef(hasNfts);
    hasNftsRef.current = hasNfts;
    const onViewportLayoutRef = useRef(onViewportLayout);
    onViewportLayoutRef.current = onViewportLayout;
    const [hasDetected, setHasDetected] = useState(hasNfts);

    // TODO(ASSETS-3660): Replace with a proper polling mechanism in NftDetectionController.
    // Deferred detection — only runs when the section has scrolled into the viewport.
    // selectedAddress is in deps so an account switch immediately clears the throttle
    // and re-checks visibility (in case the section is already in view after switching).
    // visitId re-evaluates on re-focus when the section is already visible.
    useEffect(() => {
      if (prevAddressRef.current !== selectedAddress) {
        prevAddressRef.current = selectedAddress;
        lastDetectionRef.current = null;
        setHasDetected(hasNftsRef.current);
        onViewportLayoutRef.current();
      }

      if (!isVisible) {
        return;
      }

      const now = Date.now();
      if (
        lastDetectionRef.current !== null &&
        now - lastDetectionRef.current < NFT_DETECTION_THROTTLE_MS
      ) {
        return;
      }

      lastDetectionRef.current = now;
      setHasDetected(true);
      detectNftsRef.current(true, false).catch(() => {
        // detection errors are non-fatal
      });
    }, [isVisible, visitId, selectedAddress]);

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

    const { onLayout: onViewedLayout } = useHomeViewedEvent({
      sectionRef: hasNfts ? sectionViewRef : null,
      isLoading: isDetecting,
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
      isLoading: isDetecting,
      enabled: true,
    });

    const onLayout = useCallback(() => {
      onViewportLayout();
      onViewedLayout();
    }, [onViewportLayout, onViewedLayout]);

    // Hide only after detection has run and found nothing.
    // Before detection runs, keep the View mounted so useSectionViewportVisible
    // can measure it and trigger detection.
    if (!hasNfts && hasDetected && !isDetecting) {
      return null;
    }

    const isLoading = !hasNfts;

    return (
      <View ref={sectionViewRef} onLayout={onLayout}>
        <Box paddingBottom={3}>
          <SectionDivider />
          <SectionHeader
            title={title}
            isInteractive={hasNfts}
            onPress={hasNfts ? handleViewAllNfts : undefined}
            testID={WalletViewSelectorsIDs.HOMEPAGE_SECTION_TITLE('nfts')}
          />
          <SectionRow gap={3}>
            {isLoading ? (
              <Box flexDirection={BoxFlexDirection.Row} gap={3}>
                <NftSkeletonCell />
                <NftSkeletonCell />
                <NftSkeletonCell />
              </Box>
            ) : (
              nftRows.map((row, rowIndex) => (
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
                  {/* Empty boxes maintain grid alignment for incomplete rows */}
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
              ))
            )}
          </SectionRow>
        </Box>
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
