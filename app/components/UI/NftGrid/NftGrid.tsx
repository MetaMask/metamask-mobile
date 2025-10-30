import React, {
  useMemo,
  useState,
  useRef,
  useEffect,
  useCallback,
} from 'react';
import { FlashList } from '@shopify/flash-list';
import { useSelector } from 'react-redux';
import { RefreshTestId, SpinnerTestId } from './constants';
import { endTrace, trace, TraceName } from '../../../util/trace';
import { Nft } from '@metamask/assets-controllers';
import {
  isNftFetchingProgressSelector,
  multichainCollectiblesByEnabledNetworksSelector,
} from '../../../reducers/collectibles';
import NftGridRefreshControl from './NftGridRefreshControl';
import NftGridItem from './NftGridItem';
import ActionSheet from '@metamask/react-native-actionsheet';
import NftGridItemActionSheet from './NftGridItemActionSheet';
import NftGridHeader from './NftGridHeader';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { MetaMetricsEvents, useMetrics } from '../../hooks/useMetrics';
import { CollectiblesEmptyState } from '../CollectiblesEmptyState';
import { WalletViewSelectorsIDs } from '../../../../e2e/selectors/wallet/WalletView.selectors';
import { ActivityIndicator, Dimensions } from 'react-native';
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
import { selectHomepageRedesignV1Enabled } from '../../../selectors/featureFlagController/homepage';

interface NFTNavigationParamList {
  AddAsset: { assetType: string };
  [key: string]: undefined | object;
}

interface NftGridProps {
  isFullView?: boolean;
}

const NftRow = ({
  items,
  onLongPress,
}: {
  items: Nft[];
  onLongPress: (nft: Nft) => void;
}) => (
  <Box twClassName="flex-row justify-between gap-3 mb-3">
    {items.map((item, index) => {
      // Create a truly unique key combining multiple identifiers
      const uniqueKey = `${item.address}-${item.tokenId}-${item.chainId}-${index}`;
      return (
        <Box key={uniqueKey} twClassName="flex-1">
          <NftGridItem item={item} onLongPress={onLongPress} />
        </Box>
      );
    })}
    {/* Fill remaining slots if less than 3 items */}
    {items.length < 3 &&
      Array.from({ length: 3 - items.length }).map((_, index) => (
        <Box key={`empty-${index}`} twClassName="flex-1" />
      ))}
  </Box>
);

const NftGrid = ({ isFullView = false }: NftGridProps) => {
  const navigation =
    useNavigation<StackNavigationProp<NFTNavigationParamList, 'AddAsset'>>();
  const { trackEvent, createEventBuilder } = useMetrics();
  const [isAddNFTEnabled, setIsAddNFTEnabled] = useState(true);
  const [longPressedCollectible, setLongPressedCollectible] =
    useState<Nft | null>(null);
  const tw = useTailwind();

  const isNftFetchingProgress = useSelector(isNftFetchingProgressSelector);
  const isHomepageRedesignV1Enabled = useSelector(
    selectHomepageRedesignV1Enabled,
  );

  const actionSheetRef = useRef<typeof ActionSheet>();

  const collectiblesByEnabledNetworks: Record<string, Nft[]> = useSelector(
    multichainCollectiblesByEnabledNetworksSelector,
  );

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

  const groupedCollectibles: Nft[][] = useMemo(() => {
    const groups: Nft[][] = [];
    const itemsToProcess = maxItems
      ? allFilteredCollectibles.slice(0, maxItems)
      : allFilteredCollectibles;

    for (let i = 0; i < itemsToProcess.length; i += 3) {
      groups.push(itemsToProcess.slice(i, i + 3));
    }
    return groups;
  }, [allFilteredCollectibles, maxItems]);

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

  const additionalButtons = (
    <ButtonIcon
      testID={WalletViewSelectorsIDs.IMPORT_TOKEN_BUTTON}
      size={ButtonIconSizes.Lg}
      onPress={goToAddCollectible}
      iconName={IconName.Add}
    />
  );

  const handleViewAllNfts = useCallback(() => {
    navigation.navigate(Routes.WALLET.NFTS_FULL_VIEW);
  }, [navigation]);

  // Determine if we should show the "View all NFTs" button
  const shouldShowViewAllButton =
    maxItems && allFilteredCollectibles.length > maxItems;

  // Memoize grid layout calculations to avoid recalculating on every render
  const gridDimensions = useMemo(() => {
    const screenWidth = Dimensions.get('window').width;
    const horizontalPadding = 32;
    const gapBetweenItems = 24;
    const availableWidth = screenWidth - horizontalPadding;
    const itemWidth = (availableWidth - gapBetweenItems) / 3;
    const textHeight = 44;
    const rowMarginBottom = 12;
    const estimatedRowHeight = itemWidth + textHeight + rowMarginBottom;

    return { estimatedRowHeight };
  }, []);

  const { estimatedRowHeight } = gridDimensions;

  const shouldUseAutoHeight = !isFullView && isHomepageRedesignV1Enabled;

  const calculatedListHeight = useMemo(() => {
    if (!shouldUseAutoHeight) return undefined;

    const rowCount = groupedCollectibles.length;
    const emptyStateHeight = rowCount === 0 && !isNftFetchingProgress ? 250 : 0;
    const contentHeight = rowCount > 0 ? rowCount * estimatedRowHeight : 0;
    const spinnerHeight = isNftFetchingProgress ? 60 : 0;
    const padding = 20;

    return emptyStateHeight + contentHeight + spinnerHeight + padding;
  }, [
    shouldUseAutoHeight,
    groupedCollectibles.length,
    estimatedRowHeight,
    isNftFetchingProgress,
  ]);

  const mergedFlashListProps = useMemo(() => {
    if (isFullView) {
      return {
        contentContainerStyle: tw`px-4`,
        scrollEnabled: true,
      };
    }

    if (isHomepageRedesignV1Enabled) {
      return {
        scrollEnabled: false,
        estimatedItemSize: estimatedRowHeight,
      };
    }

    return {
      scrollEnabled: true,
    };
  }, [isFullView, isHomepageRedesignV1Enabled, tw, estimatedRowHeight]);

  const flashListContent = shouldUseAutoHeight ? (
    <Box
      style={
        calculatedListHeight ? { height: calculatedListHeight } : undefined
      }
    >
      <FlashList
        ListHeaderComponent={<NftGridHeader />}
        data={groupedCollectibles}
        renderItem={({ item }) => (
          <NftRow items={item} onLongPress={setLongPressedCollectible} />
        )}
        keyExtractor={(_, index) => `nft-row-${index}`}
        testID={RefreshTestId}
        decelerationRate="fast"
        refreshControl={<NftGridRefreshControl />}
        ListEmptyComponent={
          !isNftFetchingProgress ? (
            <CollectiblesEmptyState
              onAction={goToAddCollectible}
              actionButtonProps={{
                testID: WalletViewSelectorsIDs.IMPORT_NFT_BUTTON,
                isDisabled: !isAddNFTEnabled,
              }}
              twClassName="mx-auto mt-4"
              testID="collectibles-empty-state"
            />
          ) : null
        }
        ListFooterComponent={
          <>
            {isNftFetchingProgress && (
              <ActivityIndicator size="large" testID={SpinnerTestId} />
            )}
          </>
        }
        {...mergedFlashListProps}
      />
    </Box>
  ) : (
    <FlashList
      ListHeaderComponent={<NftGridHeader />}
      data={groupedCollectibles}
      renderItem={({ item }) => (
        <NftRow items={item} onLongPress={setLongPressedCollectible} />
      )}
      keyExtractor={(_, index) => `nft-row-${index}`}
      testID={RefreshTestId}
      decelerationRate="fast"
      refreshControl={<NftGridRefreshControl />}
      ListEmptyComponent={
        !isNftFetchingProgress ? (
          <CollectiblesEmptyState
            onAction={goToAddCollectible}
            actionButtonProps={{
              testID: WalletViewSelectorsIDs.IMPORT_NFT_BUTTON,
              isDisabled: !isAddNFTEnabled,
            }}
            twClassName="mx-auto mt-4"
            testID="collectibles-empty-state"
          />
        ) : null
      }
      ListFooterComponent={
        <>
          {isNftFetchingProgress && (
            <ActivityIndicator size="large" testID={SpinnerTestId} />
          )}
        </>
      }
      {...mergedFlashListProps}
    />
  );

  return (
    <>
      <BaseControlBar
        networkFilterTestId={WalletViewSelectorsIDs.TOKEN_NETWORK_FILTER}
        useEvmSelectionLogic={false}
        customWrapper={'outer'}
        additionalButtons={additionalButtons}
        hideSort
        style={isFullView ? tw`px-4 pb-4` : tw`pb-3`}
      />
      {flashListContent}

      <NftGridItemActionSheet
        actionSheetRef={actionSheetRef}
        longPressedCollectible={longPressedCollectible}
      />

      {/* View all NFTs button - shown when there are more items than maxItems */}
      {shouldShowViewAllButton && (
        <Box twClassName="pt-5 pb-7">
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
    </>
  );
};

export default NftGrid;
