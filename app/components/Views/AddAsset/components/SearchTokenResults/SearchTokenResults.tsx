import React, { useCallback, useMemo } from 'react';
import { Image } from 'react-native';
import { strings } from '../../../../../../locales/i18n';
import { ImportTokenViewSelectorsIDs } from '../../ImportAssetView.testIds';
import { FlashList, ListRenderItem } from '@shopify/flash-list';
import { Skeleton } from '../../../../../component-library/components-temp/Skeleton';
import { useAssetFromTheme } from '../../../../../util/theme';
import emptyStateDefiLight from '../../../../../images/empty-state-defi-light.png';
import emptyStateDefiDark from '../../../../../images/empty-state-defi-dark.png';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  AvatarToken,
  AvatarTokenSize,
  BadgeNetwork,
  BadgeWrapper,
  BadgeWrapperPosition,
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  ContentVariant,
  FontWeight,
  ListItemMultiSelect,
  Text,
  TextVariant,
  TextButton,
  TextColor,
} from '@metamask/design-system-react-native';
import { NetworkBadgeSource } from '../../../../UI/AssetOverview/Balance/Balance';
import { getImportAssetKey, ImportAsset } from '../../utils/utils';
import { NATIVE_SWAPS_TOKEN_ADDRESS } from '../../../../../constants/bridge';

interface Props {
  /**
   * Array of assets objects returned from the search
   */
  searchResults: ImportAsset[];
  /**
   * Callback triggered when a token is selected
   */
  handleSelectAsset: (asset: ImportAsset) => void;
  /**
   * Object of the currently-selected token
   */
  selectedAsset: ImportAsset[];
  /**
   * Search query that generated "searchResults"
   */
  searchQuery: string;
  /**
   * Name of the network
   */
  networkName?: string;
  /**
   * Set of already added tokens, keyed with `getImportAssetKey`
   */
  alreadyAddedTokens?: Set<string>;
  /**
   * Whether the search results are loading
   */
  isLoading?: boolean;
  /**
   * When provided, the empty state offers to add a custom token
   */
  onAddCustomToken?: () => void;
}

interface SearchTokenResultRowProps {
  item: ImportAsset;
  isSelected: boolean;
  isAlreadyAdded: boolean;
  networkName?: string;
  onSelect: (asset: ImportAsset) => void;
}

const getTokenSearchRowKey = (token: ImportAsset) =>
  `${token.chainId}-${token.address.toLowerCase()}`;

const TokenAvatar = ({
  asset,
  networkName,
}: {
  asset: ImportAsset;
  networkName?: string;
}) => (
  <BadgeWrapper
    position={BadgeWrapperPosition.BottomRight}
    badge={
      <BadgeNetwork
        src={NetworkBadgeSource(asset.chainId as `0x${string}`)}
        name={networkName}
        twClassName="h-5 w-5"
      />
    }
  >
    {asset.image ? (
      <AvatarToken
        name={asset.symbol}
        src={{ uri: asset.image }}
        size={AvatarTokenSize.Lg}
      />
    ) : null}
  </BadgeWrapper>
);

const SearchTokenResultRow = React.memo(
  ({
    item,
    isSelected,
    isAlreadyAdded,
    networkName,
    onSelect,
  }: SearchTokenResultRowProps) => {
    const isChecked = isSelected || isAlreadyAdded;

    return (
      <ListItemMultiSelect
        variant={ContentVariant.TwoLines}
        isSelected={isChecked}
        disabled={isAlreadyAdded}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: isChecked, disabled: isAlreadyAdded }}
        onPress={() => onSelect(item)}
        testID={ImportTokenViewSelectorsIDs.SEARCH_TOKEN_RESULT}
        avatar={<TokenAvatar asset={item} networkName={networkName} />}
        title={item.name}
        titleProps={{
          fontWeight: FontWeight.Medium,
          numberOfLines: 1,
        }}
        description={item.symbol}
        descriptionProps={{
          fontWeight: FontWeight.Medium,
          numberOfLines: 1,
        }}
      />
    );
  },
);
SearchTokenResultRow.displayName = 'SearchTokenResultRow';

const TokenSkeleton = () => (
  <Box
    flexDirection={BoxFlexDirection.Row}
    alignItems={BoxAlignItems.Center}
    twClassName="w-full min-h-[72px] px-4 py-3"
  >
    <Box twClassName="relative">
      <Skeleton width={40} height={40} twClassName="rounded-full" />
      <Skeleton
        width={20}
        height={20}
        twClassName="absolute -bottom-1 -right-1 rounded-full"
      />
    </Box>
    <Box twClassName="flex-1 ml-4 justify-center">
      <Skeleton width={160} height={20} twClassName="rounded-md" />
      <Skeleton width={64} height={16} twClassName="mt-1 rounded-md" />
    </Box>
    <Skeleton width={22} height={22} twClassName="ml-3 rounded-full" />
  </Box>
);

const SearchTokenResults = ({
  searchResults,
  handleSelectAsset,
  selectedAsset,
  searchQuery,
  networkName,
  alreadyAddedTokens,
  isLoading = false,
  onAddCustomToken,
}: Props) => {
  const tw = useTailwind();
  const tokensImage = useAssetFromTheme(
    emptyStateDefiLight,
    emptyStateDefiDark,
  );

  const selectedKeys = useMemo(
    () =>
      new Set(
        selectedAsset.map((token) =>
          getImportAssetKey(token.chainId, token.address),
        ),
      ),
    [selectedAsset],
  );

  const keyExtractor = useCallback(
    (item: ImportAsset) => getTokenSearchRowKey(item),
    [],
  );

  const renderItem = useCallback<ListRenderItem<ImportAsset>>(
    ({ item }) => {
      const { address, chainId } = item;
      const assetKey = getImportAssetKey(chainId, address);
      const isSelected = selectedKeys.has(assetKey);
      // Native tokens are inherent to their chain, so they are always "added".
      const isAlreadyAdded =
        address.toLowerCase() === NATIVE_SWAPS_TOKEN_ADDRESS.toLowerCase() ||
        (alreadyAddedTokens?.has(assetKey) ?? false);

      return (
        <SearchTokenResultRow
          item={item}
          isSelected={isSelected}
          isAlreadyAdded={isAlreadyAdded}
          networkName={networkName}
          onSelect={handleSelectAsset}
        />
      );
    },
    [selectedKeys, alreadyAddedTokens, networkName, handleSelectAsset],
  );

  // Show skeleton loaders when loading
  if (isLoading) {
    return (
      <FlashList
        data={Array(5).fill(null)}
        renderItem={() => <TokenSkeleton />}
        keyExtractor={(_, index) => `skeleton-${index}`}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
      />
    );
  }

  if (searchResults.length === 0) {
    return (
      <Box twClassName="flex-1 justify-center items-center px-8">
        <Image
          source={tokensImage}
          resizeMode="contain"
          style={tw.style('w-[72px] h-[72px]')}
        />
        <Text
          variant={TextVariant.BodyMd}
          color={TextColor.TextAlternative}
          twClassName="text-center"
        >
          {searchQuery?.length === 0
            ? strings('token.tokens_empty_description')
            : strings('token.no_tokens_found')}
        </Text>
        {onAddCustomToken && searchQuery.trim().length > 0 ? (
          <TextButton
            onPress={onAddCustomToken}
            twClassName="mt-2 text-center"
            testID={ImportTokenViewSelectorsIDs.EMPTY_STATE_CUSTOM_TOKEN_BUTTON}
          >
            {strings('add_asset.add_custom_token_cta')}
          </TextButton>
        ) : null}
      </Box>
    );
  }

  return (
    <FlashList
      data={searchResults}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      keyboardDismissMode="on-drag"
      keyboardShouldPersistTaps="handled"
    />
  );
};

export default SearchTokenResults;
