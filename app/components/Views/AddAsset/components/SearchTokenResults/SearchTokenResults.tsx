import React from 'react';
import ListItemMultiSelect from '../../../../../component-library/components/List/ListItemMultiSelect';
import { Image } from 'react-native';
import Badge, {
  BadgeVariant,
} from '../../../../../component-library/components/Badges/Badge';
import BadgeWrapper, {
  BadgePosition,
} from '../../../../../component-library/components/Badges/BadgeWrapper';
import AssetIcon from '../../../../UI/AssetIcon';
import { strings } from '../../../../../../locales/i18n';
import { ImportTokenViewSelectorsIDs } from '../../ImportAssetView.testIds';
import { NetworkBadgeSource } from '../../../../UI/AssetOverview/Balance/Balance';
import { BridgeToken } from '../../../../UI/Bridge/types';
import { FlashList } from '@shopify/flash-list';
import { Skeleton } from '../../../../../component-library/components/Skeleton';
import { useAssetFromTheme } from '../../../../../util/theme';
import emptyStateDefiLight from '../../../../../images/empty-state-defi-light.png';
import emptyStateDefiDark from '../../../../../images/empty-state-defi-dark.png';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  Text,
  TextVariant,
  TextColor,
} from '@metamask/design-system-react-native';

interface Props {
  /**
   * Array of assets objects returned from the search
   */
  searchResults: BridgeToken[];
  /**
   * Callback triggered when a token is selected
   */
  handleSelectAsset: (asset: BridgeToken) => void;
  /**
   * Object of the currently-selected token
   */
  selectedAsset: BridgeToken[];
  /**
   * Search query that generated "searchResults"
   */
  searchQuery: string;
  /**
   * ChainID of the network
   */
  chainId: string;
  /**
   * Symbol of the network
   */
  ticker?: string;
  /**
   * Name of the network
   */
  networkName?: string;
  /**
   * Set of already added token addresses (lowercase)
   */
  alreadyAddedTokens?: Set<string>;
  /**
   * Whether the search results are loading
   */
  isLoading?: boolean;
}

const TokenSkeleton = () => {
  const tw = useTailwind();

  return (
    <ListItemMultiSelect isDisabled style={tw.style('flex-1')}>
      <Box twClassName="flex-col items-start px-0.5">
        <Skeleton width={40} height={40} style={tw.style('rounded-[20px]')} />
      </Box>
      <Box twClassName="flex-1 justify-center px-1">
        <Skeleton width={120} height={20} style={tw.style('mb-2')} />
        <Skeleton width={60} height={16} />
      </Box>
    </ListItemMultiSelect>
  );
};

const SearchTokenResults = ({
  searchResults,
  handleSelectAsset,
  selectedAsset,
  searchQuery,
  networkName,
  alreadyAddedTokens,
  isLoading = false,
}: Props) => {
  const tw = useTailwind();
  const tokensImage = useAssetFromTheme(
    emptyStateDefiLight,
    emptyStateDefiDark,
  );

  // Show skeleton loaders when loading
  if (isLoading) {
    return (
      <FlashList
        data={Array(5).fill(null)}
        renderItem={() => <TokenSkeleton />}
        keyExtractor={(_, index) => `skeleton-${index}`}
      />
    );
  }

  if (searchResults.length === 0) {
    return (
      <Box twClassName="flex-1 justify-center items-center px-[30px]">
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
      </Box>
    );
  }

  return (
    <FlashList
      data={searchResults}
      renderItem={({ item, index }) => {
        const { symbol, name, address, image } = item || {};
        const isOnSelected = selectedAsset.some(
          (token) => token.address === address,
        );
        const isSelected = selectedAsset && isOnSelected;

        // Check if token is already added
        const isAlreadyAdded = alreadyAddedTokens?.has(address.toLowerCase());
        const isDisabled = isAlreadyAdded;

        return (
          <ListItemMultiSelect
            isSelected={isSelected || isAlreadyAdded}
            isDisabled={isDisabled}
            style={tw.style('flex-1')}
            key={`search-result-${index}`}
            onPress={() => !isDisabled && handleSelectAsset(item)}
            testID={ImportTokenViewSelectorsIDs.SEARCH_TOKEN_RESULT}
          >
            <Box twClassName="flex-col items-start px-0.5">
              <BadgeWrapper
                badgePosition={BadgePosition.BottomRight}
                badgeElement={
                  <Badge
                    variant={BadgeVariant.Network}
                    imageSource={NetworkBadgeSource(
                      item?.chainId as `0x${string}`,
                    )}
                    name={networkName}
                  />
                }
              >
                {image && (
                  <AssetIcon
                    address={address}
                    logo={image}
                    customStyle={tw.style('w-8 h-8')}
                  />
                )}
              </BadgeWrapper>
            </Box>
            <Box twClassName="flex-1 justify-center px-1">
              <Text variant={TextVariant.BodyLg}>{name}</Text>
              <Text variant={TextVariant.BodyMd}>{symbol}</Text>
            </Box>
          </ListItemMultiSelect>
        );
      }}
      keyExtractor={(_, index) => `token-search-row-${index}`}
    />
  );
};

export default SearchTokenResults;
