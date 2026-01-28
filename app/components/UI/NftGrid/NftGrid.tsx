import React, {
  useMemo,
  useState,
  useRef,
  useEffect,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from 'react';
import { RefreshControl } from 'react-native';
import type { TabRefreshHandle } from '../../Views/Wallet/types';
import { useNftRefresh } from './useNftRefresh';
import { FlashList } from '@shopify/flash-list';
import { useSelector } from 'react-redux';
import { RefreshTestId } from './constants';
import { endTrace, trace, TraceName } from '../../../util/trace';
import { Nft } from '@metamask/assets-controllers';
import {
  isNftFetchingProgressSelector,
  multichainCollectiblesByEnabledNetworksSelector,
} from '../../../reducers/collectibles';
import NftGridItem from './NftGridItem';
import ActionSheet from '@metamask/react-native-actionsheet';
import NftGridItemActionSheet from './NftGridItemActionSheet';
import NftGridHeader from './NftGridHeader';
import NftGridSkeleton from './NftGridSkeleton';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { MetaMetricsEvents, useMetrics } from '../../hooks/useMetrics';
import { CollectiblesEmptyState } from '../CollectiblesEmptyState';
import { WalletViewSelectorsIDs } from '../../Views/Wallet/WalletView.testIds';
import {
  Box,
  Button,
  ButtonVariant,
} from '@metamask/design-system-react-native';
import Routes from '../../../constants/navigation/Routes';
import { strings } from '../../../../locales/i18n';
import BaseControlBar from '../shared/BaseControlBar';
import ButtonIcon, {
  ButtonIconSizes,
} from '../../../component-library/components/Buttons/ButtonIcon';
import { IconName } from '../../../component-library/components/Icons/Icon';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import { useTheme } from '../../../util/theme';
import { selectHomepageRedesignV1Enabled } from '../../../selectors/featureFlagController/homepage';
import { useNftDetection } from '../../hooks/useNftDetection';

interface NFTNavigationParamList {
  AddAsset: { assetType: string };
  [key: string]: undefined | object;
}

interface NftGridProps {
  isFullView?: boolean;
}

const NftGridContent = ({
  allFilteredCollectibles,
  nftRowList,
  goToAddCollectible,
  isAddNFTEnabled,
}: {
  allFilteredCollectibles: Nft[];
  nftRowList: React.ReactNode;
  goToAddCollectible: () => void;
  isAddNFTEnabled: boolean;
}) => {
  const isNftFetchingProgress = useSelector(isNftFetchingProgressSelector);

  if (allFilteredCollectibles.length > 0) {
    return <>{nftRowList}</>;
  }

  if (isNftFetchingProgress) {
    return <NftGridSkeleton />;
  }

  return (
    <CollectiblesEmptyState
      onAction={goToAddCollectible}
      actionButtonProps={{
        testID: WalletViewSelectorsIDs.IMPORT_NFT_BUTTON,
        isDisabled: !isAddNFTEnabled,
      }}
      twClassName="mx-auto mt-4"
      testID="collectibles-empty-state"
    />
  );
};

const NftGrid = forwardRef<TabRefreshHandle, NftGridProps>(
  ({ isFullView = false }, ref) => {
    const navigation =
      useNavigation<StackNavigationProp<NFTNavigationParamList, 'AddAsset'>>();
    const { trackEvent, createEventBuilder } = useMetrics();
    const [isAddNFTEnabled, setIsAddNFTEnabled] = useState(true);
    const [longPressedCollectible, setLongPressedCollectible] =
      useState<Nft | null>(null);
    const tw = useTailwind();
    const { colors } = useTheme();
    const { refreshing, onRefresh } = useNftRefresh();

    useImperativeHandle(ref, () => ({
      refresh: onRefresh,
    }));

    const isHomepageRedesignV1Enabled = useSelector(
      selectHomepageRedesignV1Enabled,
    );

    const actionSheetRef = useRef<typeof ActionSheet>();

    const nftSource = isFullView ? 'mobile-nft-list-page' : 'mobile-nft-list';

    const collectiblesByEnabledNetworks: Record<string, Nft[]> = useSelector(
      multichainCollectiblesByEnabledNetworksSelector,
    );

    const { detectNfts, chainIdsToDetectNftsFor } = useNftDetection();

    const isInitialMount = useRef(true);

    const allFilteredCollectibles: Nft[] = useMemo(() => {
      trace({ name: TraceName.LoadCollectibles });

      const source = Object.values(collectiblesByEnabledNetworks).flat();
      const owned = source.filter((c) => c.isCurrentlyOwned);

      endTrace({ name: TraceName.LoadCollectibles });
      return owned;
    }, [collectiblesByEnabledNetworks]);

    const maxItems = useMemo(() => {
      if (isFullView) {
        return undefined;
      }
      return isHomepageRedesignV1Enabled ? 18 : undefined;
    }, [isFullView, isHomepageRedesignV1Enabled]);

    const collectiblesToRender: Nft[] = useMemo(() => {
      const itemsToProcess = maxItems
        ? allFilteredCollectibles.slice(0, maxItems)
        : allFilteredCollectibles;

      return itemsToProcess;
    }, [allFilteredCollectibles, maxItems]);

    // Trigger NFT detection when enabled networks change (after initial mount)
    useEffect(() => {
      if (isInitialMount.current) {
        isInitialMount.current = false;
        return;
      }

      detectNfts();
    }, [chainIdsToDetectNftsFor, detectNfts]);

    // Trigger NFT detection when the full view is focused
    useFocusEffect(
      useCallback(() => {
        if (isFullView) {
          detectNfts(false); // Fetch all pages for full view
        }
      }, [isFullView, detectNfts]),
    );

    useEffect(() => {
      if (longPressedCollectible) {
        actionSheetRef.current.show();
      }
    }, [longPressedCollectible]);

    const goToAddCollectible = useCallback(() => {
      setIsAddNFTEnabled(false);
      navigation.push('AddAsset', { assetType: 'collectible' });
      trackEvent(
        createEventBuilder(MetaMetricsEvents.WALLET_ADD_COLLECTIBLES).build(),
      );
      setIsAddNFTEnabled(true);
    }, [navigation, trackEvent, createEventBuilder]);

    const handleLongPress = useCallback((nft: Nft) => {
      setLongPressedCollectible(nft);
    }, []);

    const handleViewAllNfts = useCallback(() => {
      trackEvent(
        createEventBuilder(MetaMetricsEvents.VIEW_ALL_ASSETS_CLICKED)
          .addProperties({ asset_type: 'NFT' })
          .build(),
      );
      navigation.navigate(Routes.WALLET.NFTS_FULL_VIEW);
    }, [navigation, trackEvent, createEventBuilder]);

    const nftRowList = useMemo(
      () => (
        <FlashList
          data={collectiblesToRender}
          renderItem={({ item, index }) => (
            <Box twClassName={['pr-2', 'px-1', 'pl-2'][index % 3]}>
              <NftGridItem
                item={item}
                onLongPress={handleLongPress}
                source={nftSource}
              />
            </Box>
          )}
          keyExtractor={(_, index) => `nft-row-${index}`}
          testID={RefreshTestId}
          decelerationRate="fast"
          refreshControl={
            !isHomepageRedesignV1Enabled ? (
              <RefreshControl
                colors={[colors.primary.default]}
                tintColor={colors.icon.default}
                refreshing={refreshing}
                onRefresh={onRefresh}
              />
            ) : undefined
          }
          contentContainerStyle={!isFullView ? undefined : tw`px-4`}
          scrollEnabled={isFullView || !isHomepageRedesignV1Enabled}
          numColumns={3}
        />
      ),
      [
        collectiblesToRender,
        isFullView,
        isHomepageRedesignV1Enabled,
        handleLongPress,
        nftSource,
        tw,
        colors,
        refreshing,
        onRefresh,
      ],
    );

    return (
      <>
        <BaseControlBar
          networkFilterTestId={WalletViewSelectorsIDs.TOKEN_NETWORK_FILTER}
          useEvmSelectionLogic={false}
          customWrapper={'outer'}
          additionalButtons={
            <ButtonIcon
              testID={WalletViewSelectorsIDs.IMPORT_TOKEN_BUTTON}
              size={ButtonIconSizes.Lg}
              onPress={goToAddCollectible}
              iconName={IconName.Add}
            />
          }
          hideSort
          style={isFullView ? tw`px-4 pb-4` : tw`pb-3`}
        />

        <NftGridHeader />

        <NftGridContent
          allFilteredCollectibles={allFilteredCollectibles}
          nftRowList={nftRowList}
          goToAddCollectible={goToAddCollectible}
          isAddNFTEnabled={isAddNFTEnabled}
        />

        {/* View all NFTs button - shown when there are more items than maxItems */}
        {maxItems && allFilteredCollectibles.length > maxItems && (
          <Box twClassName="pt-3 pb-9">
            <Button
              variant={ButtonVariant.Secondary}
              onPress={handleViewAllNfts}
              isFullWidth
              testID="view-all-nfts-button"
            >
              {strings('wallet.view_all_nfts')}
            </Button>
          </Box>
        )}
        <NftGridItemActionSheet
          actionSheetRef={actionSheetRef}
          longPressedCollectible={longPressedCollectible}
        />
      </>
    );
  },
);

NftGrid.displayName = 'NftGrid';

export default NftGrid;
