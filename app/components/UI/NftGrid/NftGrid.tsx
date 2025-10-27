import React, {
  useMemo,
  useState,
  useRef,
  useEffect,
  useCallback,
} from 'react';
import { FlashList, FlashListProps } from '@shopify/flash-list';
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
import { ActivityIndicator } from 'react-native';
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

interface NFTNavigationParamList {
  AddAsset: { assetType: string };
  [key: string]: undefined | object;
}

interface NftGridProps {
  flashListProps?: Partial<FlashListProps<Nft[]>>;
  maxItems?: number;
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

const NftGrid = ({
  flashListProps,
  maxItems,
  isFullView = false,
}: NftGridProps) => {
  const navigation =
    useNavigation<StackNavigationProp<NFTNavigationParamList, 'AddAsset'>>();
  const { trackEvent, createEventBuilder } = useMetrics();
  const [isAddNFTEnabled, setIsAddNFTEnabled] = useState(true);
  const [longPressedCollectible, setLongPressedCollectible] =
    useState<Nft | null>(null);
  const tw = useTailwind();

  const isNftFetchingProgress = useSelector(isNftFetchingProgressSelector);

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

  // Default flashListProps for full view
  const defaultFullViewProps = useMemo(
    () => ({
      contentContainerStyle: tw`px-4`,
      scrollEnabled: true,
    }),
    [tw],
  );

  // Merge default props with passed props
  const mergedFlashListProps = useMemo(() => {
    if (isFullView) {
      return { ...defaultFullViewProps, ...flashListProps };
    }
    return flashListProps;
  }, [isFullView, defaultFullViewProps, flashListProps]);

  return (
    <>
      <BaseControlBar
        networkFilterTestId={WalletViewSelectorsIDs.TOKEN_NETWORK_FILTER}
        useEvmSelectionLogic={false}
        customWrapper={'outer'}
        additionalButtons={additionalButtons}
        hideSort
        style={isFullView ? tw`px-4` : tw`pb-3`}
      />
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

      <NftGridItemActionSheet
        actionSheetRef={actionSheetRef}
        longPressedCollectible={longPressedCollectible}
      />

      {/* View all NFTs button - shown when there are more items than maxItems */}
      {shouldShowViewAllButton && (
        <Box twClassName="pt-3 pb-9">
          <Button
            variant={ButtonVariant.Secondary}
            onPress={handleViewAllNfts}
            isFullWidth
          >
            {strings('wallet.view_all_nfts')}
          </Button>
        </Box>
      )}
    </>
  );
};

export default NftGrid;
