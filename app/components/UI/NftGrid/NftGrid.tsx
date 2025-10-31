import React, {
  useMemo,
  useState,
  useRef,
  useEffect,
  useCallback,
} from 'react';
import { FlashList } from '@shopify/flash-list';
import { useSelector } from 'react-redux';
import { RefreshTestId } from './constants';
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
import NftGridSkeleton from './NftGridSkeleton';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { MetaMetricsEvents, useMetrics } from '../../hooks/useMetrics';
import { CollectiblesEmptyState } from '../CollectiblesEmptyState';
import { WalletViewSelectorsIDs } from '../../../../e2e/selectors/wallet/WalletView.selectors';
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
  <Box twClassName="flex-row gap-3 mb-3">
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

  const nftRowList =
    !isFullView && isHomepageRedesignV1Enabled ? (
      <Box>
        <NftGridHeader />
        <Box twClassName="gap-3">
          {groupedCollectibles.map((items, index) => (
            <NftRow
              key={`nft-row-${index}`}
              items={items}
              onLongPress={setLongPressedCollectible}
            />
          ))}
        </Box>
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
        contentContainerStyle={isFullView ? tw`px-4` : undefined}
        scrollEnabled
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
      {isNftFetchingProgress ? (
        <NftGridSkeleton />
      ) : allFilteredCollectibles.length > 0 ? (
        nftRowList
      ) : (
        <CollectiblesEmptyState
          onAction={goToAddCollectible}
          actionButtonProps={{
            testID: WalletViewSelectorsIDs.IMPORT_NFT_BUTTON,
            isDisabled: !isAddNFTEnabled,
          }}
          twClassName="mx-auto mt-4"
          testID="collectibles-empty-state"
        />
      )}
      {/* View all NFTs button - shown when there are more items than maxItems */}
      {maxItems && allFilteredCollectibles.length > maxItems && (
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
      <NftGridItemActionSheet
        actionSheetRef={actionSheetRef}
        longPressedCollectible={longPressedCollectible}
      />
    </>
  );
};

export default NftGrid;
