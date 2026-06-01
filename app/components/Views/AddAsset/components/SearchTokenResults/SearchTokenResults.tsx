import React from 'react';
import ListItemMultiSelect from '../../../../../component-library/components/List/ListItemMultiSelect';
import { Image } from 'react-native';
import { strings } from '../../../../../../locales/i18n';
import { ImportTokenViewSelectorsIDs } from '../../ImportAssetView.testIds';
import { FlashList } from '@shopify/flash-list';
import { Skeleton } from '../../../../../component-library/components-temp/Skeleton';
import { useAssetFromTheme } from '../../../../../util/theme';
import emptyStateDefiLight from '../../../../../images/empty-state-defi-light.png';
import emptyStateDefiDark from '../../../../../images/empty-state-defi-dark.png';
import { useTailwind } from '@metamask/design-system-twrnc-preset';
import {
  Box,
  BoxAlignItems,
  BoxFlexDirection,
  Text,
  TextVariant,
  TextColor,
} from '@metamask/design-system-react-native';
import { ImportAsset } from '../../utils/utils';
import AddAssetTokenRow from '../AddAssetTokenRow/AddAssetTokenRow';

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
    <ListItemMultiSelect isDisabled gap={20} style={tw.style('flex-1 py-0')}>
      <Box
        flexDirection={BoxFlexDirection.Row}
        alignItems={BoxAlignItems.Center}
        twClassName="flex-1 h-16"
      >
        <Box twClassName="relative">
          <Skeleton width={40} height={40} style={tw.style('rounded-[20px]')} />
          <Skeleton
            width={20}
            height={20}
            style={tw.style('absolute -bottom-1 -right-1 rounded-[10px]')}
          />
        </Box>
        <Box twClassName="flex-1 ml-5 justify-center">
          <Skeleton width={160} height={20} style={tw.style('rounded-md')} />
          <Skeleton
            width={64}
            height={16}
            style={tw.style('mt-1 rounded-md')}
          />
        </Box>
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
        const { address } = item || {};
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
            gap={20}
            style={tw.style('flex-1 py-0')}
            key={`search-result-${index}`}
            onPress={() => !isDisabled && handleSelectAsset(item)}
            testID={ImportTokenViewSelectorsIDs.SEARCH_TOKEN_RESULT}
          >
            <AddAssetTokenRow asset={item} networkName={networkName} />
          </ListItemMultiSelect>
        );
      }}
      keyExtractor={(_, index) => `token-search-row-${index}`}
    />
  );
};

export default SearchTokenResults;
